// api/src/auth/auth.middleware.ts

import { Injectable, type NestMiddleware } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { NextFunction, Response } from 'express'
import { SESSION_COOKIE, type RequestWithUser } from './auth.types.js'

/**
 * Autenticação opcional, aplicada a todas as rotas.
 *
 * Nunca rejeita: preenche `req.user` quando há sessão válida e segue adiante
 * quando não há. Quem exige login são os controllers, com requireUser().
 *
 * É o que permite a mesma rota servir visitante e usuário logado — a home
 * carrega para qualquer um, só muda o que vem em `ownedAlbumIds`.
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly jwt: JwtService) {}

  use(req: RequestWithUser, _res: Response, next: NextFunction): void {
    const token = req.cookies?.[SESSION_COOKIE]

    if (typeof token === 'string' && token.length > 0) {
      try {
        const payload = this.jwt.verify<{ sub?: unknown }>(token)
        if (typeof payload.sub === 'string') {
          req.user = { id: payload.sub }
        }
      } catch {
        // Token expirado, adulterado ou assinado com outro segredo.
        // Tratar como visitante é o comportamento certo: a pessoa vê o
        // catálogo e só esbarra no 401 quando tenta interagir.
      }
    }

    next()
  }
}