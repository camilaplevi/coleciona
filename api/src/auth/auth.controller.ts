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
import { ConfirmEmailDto, LoginDto, RegisterDto, UpdateProfileDto } from './auth.dto.js'
import { SESSION_COOKIE, type RequestWithUser } from './auth.types.js'

const SESSION_DAYS = 30

/**
 * httpOnly impede que XSS leia a sessão. Com front e API em domínios distintos,
 * sameSite precisa ser 'none' e secure, em produção.
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

  @Post('sessao')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, profile } = await this.auth.login(dto.email, dto.password)
    res.cookie(SESSION_COOKIE, token, sessionCookie())
    return profile
  }

  @Delete('sessao')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    // As opções precisam bater com as do set, ou o navegador ignora a remoção.
    res.clearCookie(SESSION_COOKIE, { ...sessionCookie(), maxAge: undefined })
  }

  // 401 para visitante é resposta esperada, não erro: o front mostra o catálogo.
  @Get('eu')
  me(@Req() req: RequestWithUser) {
    return this.auth.me(requireUser(req))
  }

  // Vem do link do e-mail; não exige sessão.
  @Post('confirmar')
  @HttpCode(204)
  async confirmEmail(@Body() dto: ConfirmEmailDto): Promise<void> {
    await this.auth.confirmEmail(dto.token)
  }

  @Post('reenviar-confirmacao')
  @HttpCode(204)
  async resendConfirmation(@Req() req: RequestWithUser): Promise<void> {
    await this.auth.resendConfirmation(requireUser(req))
  }

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