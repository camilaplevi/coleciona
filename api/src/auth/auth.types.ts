// api/src/auth/auth.types.ts
//
// Formato que o middleware anexa à requisição. Os controllers já leem
// `req.user?.id` — este arquivo só dá nome ao que eles esperam.

import type { Request } from 'express'

export interface AuthenticatedUser {
  id: string
}

export interface RequestWithUser extends Request {
  user?: AuthenticatedUser
}

/** Nome do cookie de sessão. Em um lugar só, para não divergir. */
export const SESSION_COOKIE = 'coleciona_sessao'