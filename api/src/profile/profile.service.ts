import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { uniqueConflictField } from '../common/prisma-errors.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { computeStats, type StatsInputItem } from './profile.stats.js'
import type { UpdateAccountDto } from './profile.dto.js'

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
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl?.trim() || null
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
