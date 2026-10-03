import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common'
import type { CookieOptions, Response } from 'express'
import { AuthService } from './auth.service.js'
import { LoginDto, RegisterDto, UpdateProfileDto } from './auth.dto.js'
import { SESSION_COOKIE, type RequestWithUser } from './auth.types.js'

const SESSION_DAYS = 30

/**
 * O token vive em cookie httpOnly, nunca em localStorage: JavaScript não
 * consegue lê-lo, então um XSS não rouba a sessão.
 *
 * sameSite 'lax' basta aqui porque nenhuma ação destrutiva acontece via
 * navegação GET; em produção, com front e API em domínios diferentes, isto
 * vira 'none' e secure obrigatório.
 */
function sessionCookie(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** POST /api/auth/registro */
  @Post('registro')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, profile } = await this.auth.register(
      dto.email,
      dto.password,
      dto.displayName,
    )
    res.cookie(SESSION_COOKIE, token, sessionCookie())
    return profile
  }

  /** POST /api/auth/sessao */
  @Post('sessao')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, profile } = await this.auth.login(dto.email, dto.password)
    res.cookie(SESSION_COOKIE, token, sessionCookie())
    return profile
  }

  /** DELETE /api/auth/sessao */
  @Delete('sessao')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    // As opções precisam bater com as do set, ou o navegador ignora a remoção.
    res.clearCookie(SESSION_COOKIE, { ...sessionCookie(), maxAge: undefined })
  }

  /**
   * GET /api/auth/eu
   *
   * O front chama isto ao abrir o app para saber se há sessão. Responde 401
   * para visitante, que é informação, não erro — o front trata como "ninguém
   * logado" e mostra o catálogo.
   */
  @Get('eu')
  me(@Req() req: RequestWithUser) {
    return this.auth.me(requireUser(req))
  }

  /** PATCH /api/auth/eu — trocar o endereço do perfil público. */
  @Patch('eu')
  updateUsername(@Body() dto: UpdateProfileDto, @Req() req: RequestWithUser) {
    return this.auth.updateUsername(requireUser(req), dto.username)
  }
}

export function requireUser(req: RequestWithUser): string {
  if (!req.user) {
    throw new UnauthorizedException('Entre na sua conta para fazer isso.')
  }
  return req.user.id
}