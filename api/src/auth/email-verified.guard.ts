import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { requireUser } from './auth.controller.js'
import { AuthService } from './auth.service.js'
import type { RequestWithUser } from './auth.types.js'

/** Bloqueia só escritas. Navegar sem confirmação continua liberado. */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>()
    await this.auth.ensureVerified(requireUser(req))
    return true
  }
}
