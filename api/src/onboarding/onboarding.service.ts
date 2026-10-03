// api/src/onboarding/onboarding.service.ts

import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

/** Mínimo de escolhas para a personalização valer alguma coisa. */
const MIN_STYLES = 1
const SUGGESTED_ARTISTS = 24

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Opções mostradas nas perguntas.
   *
   * Os artistas sugeridos são os que têm mais discos no catálogo — critério
   * honesto enquanto não há dados de uso. Quando a base crescer, isto vira
   * "mais adicionados às coleções".
   */
  async options(userId: string) {
    const db = this.prisma.forUser(userId)

    const [styles, artists] = await Promise.all([
      db.style.findMany({ orderBy: { name: 'asc' } }),
      db.artist.findMany({
        orderBy: { albums: { _count: 'desc' } },
        take: SUGGESTED_ARTISTS,
        select: { id: true, name: true, articleForm: true, imageUrl: true },
      }),
    ])

    return {
      styles: styles.map((style) => ({
        id: style.id,
        slug: style.slug,
        name: style.name,
      })),
      artists,
    }
  }

  /** O que a pessoa já escolheu. Permite reabrir o onboarding para editar. */
  async current(userId: string) {
    const db = this.prisma.forUser(userId)

    const [styles, artists] = await Promise.all([
      db.profileStyle.findMany({ where: { profileId: userId }, select: { styleId: true } }),
      db.profileArtist.findMany({ where: { profileId: userId }, select: { artistId: true } }),
    ])

    return {
      styleIds: styles.map((row) => row.styleId),
      artistIds: artists.map((row) => row.artistId),
    }
  }

  /**
   * Grava as preferências e marca o onboarding como concluído.
   *
   * Substitui em vez de acrescentar: a tela manda a seleção inteira, então
   * apagar e inserir de novo é mais simples e mais correto do que calcular a
   * diferença — e tudo acontece numa transação, então nunca fica meio gravado.
   */
  async complete(userId: string, styleIds: string[], artistIds: string[]) {
    const uniqueStyles = [...new Set(styleIds)]
    const uniqueArtists = [...new Set(artistIds)]

    if (uniqueStyles.length < MIN_STYLES) {
      throw new BadRequestException('Escolha pelo menos um estilo.')
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, TRUE)`

      await tx.profileStyle.deleteMany({ where: { profileId: userId } })
      await tx.profileArtist.deleteMany({ where: { profileId: userId } })

      if (uniqueStyles.length) {
        await tx.profileStyle.createMany({
          data: uniqueStyles.map((styleId) => ({ profileId: userId, styleId })),
          // Protege contra id inexistente enviado pelo cliente: a linha é
          // ignorada em vez de derrubar a transação inteira.
          skipDuplicates: true,
        })
      }

      if (uniqueArtists.length) {
        await tx.profileArtist.createMany({
          data: uniqueArtists.map((artistId) => ({ profileId: userId, artistId })),
          skipDuplicates: true,
        })
      }

      await tx.profile.update({
        where: { id: userId },
        data: { onboardedAt: new Date() },
      })
    })

    return this.current(userId)
  }

  /**
   * Pular é uma saída legítima: marca como concluído sem preferências, e a
   * home cai no comportamento padrão. Forçar a escolha só produz cliques
   * aleatórios, que envenenam a personalização em vez de alimentá-la.
   */
  async skip(userId: string) {
    await this.prisma
      .forUser(userId)
      .profile.update({ where: { id: userId }, data: { onboardedAt: new Date() } })
  }
}