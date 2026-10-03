import { Global, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthController } from './auth.controller.js'
import { AuthService } from './auth.service.js'
import { AuthMiddleware } from './auth.middleware.js'

/**
 * Global porque o AuthMiddleware é aplicado no AppModule, a todas as rotas —
 * ele precisa estar disponível fora deste módulo.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET

        // Falha na subida, não na primeira requisição. Um segredo ausente
        // faria o Nest gerar tokens que ninguém consegue verificar, e o
        // sintoma seria "login funciona mas desloga sozinho".
        if (!secret || secret.length < 32) {
          throw new Error(
            'JWT_SECRET precisa estar no .env com pelo menos 32 caracteres. ' +
              'Gere um com: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
          )
        }

        return { secret, signOptions: { expiresIn: '30d' } }
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthMiddleware],
  exports: [AuthService, AuthMiddleware, JwtModule],
})
export class AuthModule {}