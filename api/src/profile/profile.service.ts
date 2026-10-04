import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { uniqueConflictField } from '../common/prisma-errors.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { computeStats, type StatsInputItem } from './profile.stats.js'
import type { UpdateAccountDto } from './profile.dto.js'

/** Limite da foto depois de decodificada. Com 256px e compressão, a imagem fica bem abaixo disso. */
const MAX_AVATAR_BYTES = 100_000

/** Campos do perfil expostos à tela. O e-mail só aparece em myAccount. */
const PROFILE_SELECT = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  isPublic: true,
  createdAt: true,
} as const

/** Só o que a coleção precisa para os rankings. Sem preço, sem notas. */
const ITEM_SELECT = {
  condition: true,
  album: {
    select: {
      releaseYear: true,
      label: true,
      styles: { select: { style: { select: { slug: true, name: true } } } },
      artists: { select: { artist: { select: { id: true, name: true } } } },
    },
  },
} as const

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /** Conta da própria pessoa: inclui e-mail e estado de verificação. */
  async myAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerifiedAt: true },
    })
    const profile = await this.prisma.forUser(userId).profile.findUnique({
      where: { id: userId },
      select: PROFILE_SELECT,
    })

    if (!user || !profile) throw new UnauthorizedException('Sessão inválida.')

    return {
      ...ownProfileView(profile),
      email: user.email,
      emailVerified: user.emailVerifiedAt !== null,
    }
  }

  async updateMyAccount(userId: string, dto: UpdateAccountDto) {
    const data: Record<string, unknown> = {}
    if (dto.displayName !== undefined) data.displayName = dto.displayName.trim()
    if (dto.bio !== undefined) data.bio = dto.bio?.trim() || null
    if (dto.isPublic !== undefined) data.isPublic = dto.isPublic
    if (dto.username !== undefined) data.username = dto.username

    try {
      const profile = await this.prisma.forUser(userId).profile.update({
        where: { id: userId },
        data,
        select: PROFILE_SELECT,
      })
      return this.myAccount(profile.id)
    } catch (error) {
      // Colisão de username só aparece no update: o banco decide, não uma checagem prévia.
      if (uniqueConflictField(error) === 'username') {
        throw new ConflictException('Este endereço de perfil já está em uso.')
      }
      throw error
    }
  }

  /** Troca a foto. Confere a assinatura dos bytes: o tipo declarado pelo cliente não basta. */
  async setAvatar(userId: string, dataUrl: string) {
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl)
    if (!match) {
      throw new BadRequestException('Envie uma imagem JPEG, PNG ou WebP.')
    }

    const bytes = Buffer.from(match[2], 'base64')
    if (bytes.length > MAX_AVATAR_BYTES) {
      throw new BadRequestException('A imagem é grande demais. Escolha uma foto menor.')
    }
    if (!hasImageSignature(bytes, match[1])) {
      throw new BadRequestException('O arquivo não parece ser uma imagem JPEG, PNG ou WebP.')
    }

    await this.prisma.forUser(userId).profile.update({
      where: { id: userId },
      data: { avatarUrl: dataUrl },
    })
    return this.myAccount(userId)
  }

  async removeAvatar(userId: string) {
    await this.prisma.forUser(userId).profile.update({
      where: { id: userId },
      data: { avatarUrl: null },
    })
    return this.myAccount(userId)
  }

  // Visitante, dono e terceiros seguem o mesmo caminho; a visibilidade é checada abaixo.
  async publicProfile(username: string, viewerId: string | null) {
    const db = this.prisma.forUser(viewerId)

    const profile = await db.profile.findUnique({
      where: { username: username.toLowerCase() },
      select: PROFILE_SELECT,
    })
    // Checagem explícita: a conexão da API tem BYPASSRLS, então o RLS não esconde perfis privados.
    const isOwner = profile !== null && viewerId === profile.id
    if (!profile || (!profile.isPublic && !isOwner)) {
      throw new NotFoundException('Perfil não encontrado.')
    }

    const items = await db.collectionItem.findMany({
      where: { ownerId: profile.id },
      select: ITEM_SELECT,
    })

    return {
      profile: {
        username: profile.username,
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        memberSince: profile.createdAt.toISOString(),
        isOwner,
      },
      stats: computeStats(items as StatsInputItem[]),
    }
  }
}

function ownProfileView(profile: {
  id: string
  username: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  isPublic: boolean
  createdAt: Date
}) {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    isPublic: profile.isPublic,
    memberSince: profile.createdAt.toISOString(),
  }
}

function hasImageSignature(bytes: Buffer, mime: string): boolean {
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mime === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP'
}
