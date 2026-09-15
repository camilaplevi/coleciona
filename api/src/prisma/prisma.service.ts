import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '../generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Cliente do Prisma com escopo de usuário.
 *
 * Toda operação feita através de `forUser(id)` roda dentro de uma transação
 * que começa fixando `app.current_user_id`. É isso que faz as políticas de RLS
 * valerem: sem esse valor, o Postgres trata a requisição como anônima e só
 * devolve o que é público.
 *
 * O ganho prático é não depender de lembrar de filtrar por `ownerId` em toda
 * query. Se um dia você esquecer, o banco devolve vazio em vez de vazar.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    })
  }

  async onModuleInit(): Promise<void> {
    await this.$connect()
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }

  /**
   * @param userId id de quem está fazendo a requisição, ou null para visitante
   *               não autenticado (perfil público).
   */
  forUser(userId: string | null) {
    return this.$extends({
      query: {
        $allModels: {
          $allOperations: async ({ args, query }) => {
            // O array garante que as duas instruções usem a MESMA conexão.
            // O terceiro argumento `TRUE` do set_config limita o valor à
            // transação — sem ele, a conexão voltaria ao pool contaminada.
            const [, result] = await this.$transaction([
              this.$executeRaw`SELECT set_config('app.current_user_id', ${userId ?? ''}, TRUE)`,
              query(args),
            ])
            return result
          },
        },
      },
    })
  }
}

/** Tipo do cliente já com escopo, para injetar em serviços. */
export type ScopedPrisma = ReturnType<PrismaService['forUser']>