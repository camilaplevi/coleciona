import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service.js'

/**
 * Global para que nenhum outro módulo precise importar o PrismaModule
 * explicitamente. É a exceção justificada ao isolamento de módulos do Nest:
 * acesso a banco é infraestrutura, não domínio.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}