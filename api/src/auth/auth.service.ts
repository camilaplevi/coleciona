import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import bcrypt from 'bcrypt'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'

const SALT_ROUNDS = 12
const MAX_USERNAME_ATTEMPTS = 100

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Cria conta e perfil na mesma transação.
   *
   * A ordem importa: `users` fica fora do RLS, então o primeiro insert passa
   * sem sessão. Já `profiles` exige `id = current_user_id()`, por isso o
   * set_config acontece entre os dois — ainda dentro da mesma transação, na
   * mesma conexão.
   */
  async register(email: string, password: string, displayName: string) {
    const normalizedEmail = email.trim().toLowerCase()

    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    })

    // Aqui a enumeração de contas é aceitável e inevitável: o cadastro
    // precisa dizer que o e-mail já existe, senão a pessoa não entende por
    // que não entrou. O login é que não revela nada (ver abaixo).
    if (existing) {
      throw new ConflictException('Já existe uma conta com este e-mail.')
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const base = usernameBase(displayName)

    // A checagem de unicidade não pode ser feita antes do insert: o RLS
    // esconde de quem está cadastrando os perfis privados alheios, então um
    // username ocupado por um perfil privado não aparece em nenhuma consulta
    // prévia. Quem decide é o próprio insert — em caso de colisão, tenta o
    // próximo sufixo. Cada tentativa é uma transação nova, então o usuário
    // da tentativa que falhou também é desfeito.
    for (let suffix = 0; suffix < MAX_USERNAME_ATTEMPTS; suffix += 1) {
      const username = suffix === 0 ? base : `${base}-${suffix}`

      try {
        const profile = await this.createAccount(
          normalizedEmail,
          passwordHash,
          username,
          displayName.trim(),
        )
        return { token: this.signToken(profile.id), profile: toProfilePayload(profile) }
      } catch (error) {
        const field = uniqueConflictField(error)

        if (field === 'email') {
          throw new ConflictException('Já existe uma conta com este e-mail.')
        }
        if (field !== 'username') throw error
        // username em conflito: segue para o próximo sufixo.
      }
    }

    throw new ConflictException('Não foi possível gerar um endereço para o seu perfil. Tente outro nome.')
  }

  private createAccount(
    email: string,
    passwordHash: string,
    username: string,
    displayName: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash },
        select: { id: true },
      })

      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${user.id}, TRUE)`

      return tx.profile.create({
        data: { id: user.id, username, displayName },
      })
    })
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, passwordHash: true },
    })

    // Mesma mensagem para e-mail inexistente e senha errada: diferenciar as
    // duas transforma o login num verificador de quem tem conta no site.
    const invalid = new UnauthorizedException('E-mail ou senha incorretos.')
    if (!user) {
      // Hash descartado de propósito, para que a resposta demore o mesmo
      // tanto com e sem conta. Sem isto, o tempo de resposta denuncia quais
      // e-mails existem.
      await bcrypt.compare(password, '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin')
      throw invalid
    }

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw invalid
    }

    const profile = await this.prisma.forUser(user.id).profile.findUnique({
      where: { id: user.id },
    })

    if (!profile) throw invalid

    return { token: this.signToken(profile.id), profile: toProfilePayload(profile) }
  }

  /** Dados da sessão atual. Alimenta o estado de autenticação do front. */
  async me(userId: string) {
    const profile = await this.prisma.forUser(userId).profile.findUnique({
      where: { id: userId },
    })

    if (!profile) {
      throw new UnauthorizedException('Sessão inválida.')
    }

    return toProfilePayload(profile)
  }

  async updateUsername(userId: string, username: string) {
    const db = this.prisma.forUser(userId)

    const taken = await db.profile.findUnique({
      where: { username },
      select: { id: true },
    })

    if (taken && taken.id !== userId) {
      throw new ConflictException('Este endereço de perfil já está em uso.')
    }

    return toProfilePayload(await db.profile.update({ where: { id: userId }, data: { username } }))
  }

  private signToken(userId: string): string {
    return this.jwt.sign({ sub: userId })
  }

}

/**
 * Deriva um endereço de perfil legível do nome ("Camila Pleví" → "camila-plevi").
 * Colisões são resolvidas por quem chama, acrescentando um número — melhor que
 * um sufixo aleatório, porque a pessoa ainda reconhece o próprio endereço.
 */
function usernameBase(displayName: string): string {
  return (
    displayName
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'colecionador'
  )
}

/**
 * Qual campo único estourou, quando o erro é de unicidade (P2002). Devolve
 * null para qualquer outro erro, que deve seguir sem ser tratado aqui.
 */
function uniqueConflictField(error: unknown): 'username' | 'email' | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return null
  }

  // Com o driver adapter, o nome da constraint vem dentro de driverAdapterError
  // e não em meta.target. Lemos os dois, senão a colisão vira 500.
  const meta = error.meta as
    | { target?: unknown; driverAdapterError?: { cause?: { constraint?: { index?: string }; originalMessage?: string } } }
    | undefined
  const cause = meta?.driverAdapterError?.cause
  const text = [meta?.target, cause?.constraint?.index, cause?.originalMessage]
    .flat()
    .filter(Boolean)
    .join(' ')

  if (text.includes('username')) return 'username'
  if (text.includes('email')) return 'email'
  return null
}

interface ProfileRow {
  id: string
  username: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  isPublic: boolean
  onboardedAt: Date | null
}

/** Nunca inclui e-mail nem hash: este objeto vai inteiro para o navegador. */
function toProfilePayload(profile: ProfileRow) {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    isPublic: profile.isPublic,
    // Booleano em vez da data: o front só precisa saber se manda para o
    // onboarding ou para a home.
    hasOnboarded: profile.onboardedAt !== null,
  }
}