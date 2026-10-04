import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import bcrypt from 'bcrypt'
import { createHash, randomBytes } from 'node:crypto'
import { uniqueConflictField } from '../common/prisma-errors.js'
import { MailService } from '../mail/mail.service.js'
import { PrismaService } from '../prisma/prisma.service.js'

const SALT_ROUNDS = 12
const MAX_USERNAME_ATTEMPTS = 100
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000

// Só o hash vai para o banco: o token em claro existe apenas no link do e-mail.
function newVerificationToken() {
  const token = randomBytes(32).toString('base64url')
  return {
    token,
    hash: hashToken(token),
    expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function confirmationUrl(token: string): string {
  const base = process.env.APP_URL ?? 'http://localhost:5173'
  return `${base}/confirmar-email?token=${encodeURIComponent(token)}`
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  private readonly logger = new Logger(AuthService.name)

  async register(email: string, password: string, displayName: string) {
    const normalizedEmail = email.trim().toLowerCase()

    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    })

    // Revelar que o e-mail já existe é aceitável aqui. No login, não revelamos nada.
    if (existing) {
      throw new ConflictException('Já existe uma conta com este e-mail.')
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const base = usernameBase(displayName)

    // Colisão de username só aparece no insert, então é ele quem decide. Cada tentativa é uma transação nova.
    const verification = newVerificationToken()

    for (let suffix = 0; suffix < MAX_USERNAME_ATTEMPTS; suffix += 1) {
      const username = suffix === 0 ? base : `${base}-${suffix}`

      try {
        const profile = await this.createAccount(
          normalizedEmail,
          passwordHash,
          username,
          displayName.trim(),
          verification,
        )

        // Falha de envio não desfaz o cadastro: a pessoa pode pedir outro link.
        await this.sendConfirmation(normalizedEmail, profile.displayName, verification.token)

        return {
          token: this.signToken(profile.id),
          profile: toProfilePayload(profile, false),
        }
      } catch (error) {
        const field = uniqueConflictField(error)

        if (field === 'email') {
          throw new ConflictException('Já existe uma conta com este e-mail.')
        }
        if (field !== 'username') throw error
      }
    }

    throw new ConflictException('Não foi possível gerar um endereço para o seu perfil. Tente outro nome.')
  }

  // users fica fora do RLS, então o insert passa sem sessão. profiles exige
  // app.current_user_id: o set_config vem entre os dois, na mesma transação.
  private createAccount(
    email: string,
    passwordHash: string,
    username: string,
    displayName: string,
    verification: { hash: string; expiresAt: Date },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          emailVerificationTokenHash: verification.hash,
          emailVerificationExpiresAt: verification.expiresAt,
        },
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
      select: { id: true, passwordHash: true, emailVerifiedAt: true },
    })

    // Mesma mensagem para e-mail inexistente e senha errada: não enumera contas.
    const invalid = new UnauthorizedException('E-mail ou senha incorretos.')
    if (!user) {
      // Compara com um hash descartável: o tempo de resposta não revela contas existentes.
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

    return {
      token: this.signToken(profile.id),
      profile: toProfilePayload(profile, user.emailVerifiedAt !== null),
    }
  }

  async me(userId: string) {
    const profile = await this.prisma.forUser(userId).profile.findUnique({
      where: { id: userId },
    })

    if (!profile) {
      throw new UnauthorizedException('Sessão inválida.')
    }

    return toProfilePayload(profile, await this.isEmailVerified(userId))
  }

  // UPDATE condicionado ao hash e à validade: cliques repetidos no mesmo link não competem.
  async confirmEmail(token: string): Promise<void> {
    const result = await this.prisma.user.updateMany({
      where: {
        emailVerificationTokenHash: hashToken(token),
        emailVerificationExpiresAt: { gt: new Date() },
      },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      },
    })

    if (result.count === 0) {
      throw new BadRequestException('Este link é inválido ou já expirou. Peça um novo na sua conta.')
    }
  }

  // Trocar o hash invalida o link anterior.
  async resendConfirmation(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerifiedAt: true, emailVerificationExpiresAt: true },
    })

    if (!user) throw new UnauthorizedException('Sessão inválida.')
    if (user.emailVerifiedAt) {
      throw new BadRequestException('Seu e-mail já está confirmado.')
    }

    // O prazo é de 24h desde a criação do token; menos de um minuto de vida = envio recente.
    const createdAt = user.emailVerificationExpiresAt
      ? user.emailVerificationExpiresAt.getTime() - VERIFICATION_TTL_MS
      : 0
    if (Date.now() - createdAt < RESEND_COOLDOWN_MS) {
      throw new HttpException(
        'Acabamos de enviar um e-mail. Aguarde um minuto antes de pedir outro.',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    const profile = await this.prisma.forUser(userId).profile.findUnique({
      where: { id: userId },
      select: { displayName: true },
    })

    const verification = newVerificationToken()
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationTokenHash: verification.hash,
        emailVerificationExpiresAt: verification.expiresAt,
      },
    })

    await this.sendConfirmation(user.email, profile?.displayName ?? 'Colecionador', verification.token)
  }

  // Lido do banco a cada escrita: o JWT não sabe se o e-mail foi confirmado depois do login.
  async ensureVerified(userId: string): Promise<void> {
    if (!(await this.isEmailVerified(userId))) {
      throw new HttpException(
        'Confirme seu e-mail para salvar isto. Enviamos um link quando você criou a conta.',
        HttpStatus.FORBIDDEN,
      )
    }
  }

  private async isEmailVerified(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerifiedAt: true },
    })
    return user?.emailVerifiedAt != null
  }

  // Falha de envio vira log: quem precisa do link pede outro.
  private async sendConfirmation(to: string, displayName: string, token: string): Promise<void> {
    try {
      await this.mail.sendConfirmation({
        to,
        displayName,
        confirmationUrl: confirmationUrl(token),
      })
    } catch (error) {
      this.logger.error(`Falha ao enviar confirmação para ${to}`, error as Error)
    }
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

    const updated = await db.profile.update({ where: { id: userId }, data: { username } })
    return toProfilePayload(updated, await this.isEmailVerified(userId))
  }

  private signToken(userId: string): string {
    return this.jwt.sign({ sub: userId })
  }

}

/** "Camila Pleví" → "camila-plevi". Colisões são resolvidas por quem chama. */
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
function toProfilePayload(profile: ProfileRow, emailVerified: boolean) {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    isPublic: profile.isPublic,
    // Booleano em vez da data: o front só decide entre onboarding e home.
    hasOnboarded: profile.onboardedAt !== null,
    emailVerified,
  }
}