// api/prisma/seed.ts
//
// Popula o banco com uma coleção de demonstração.
//
// ATENÇÃO: apaga TUDO antes de inserir. É um seed de desenvolvimento, nunca
// rode isso contra dados que você queira manter.

import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

// Ids negativos para os artistas do seed: o Discogs só usa positivos, então
// um import real depois não colide com nada daqui.
const DISCOGS_SEED = { nina: -1, blakey: -2, milton: -3, mutantes: -4 }

async function main() {
  // TRUNCATE não passa pelo RLS; DELETE passaria e não apagaria nada, porque
  // as tabelas de catálogo não têm política de DELETE. CASCADE cuida das
  // tabelas dependentes.
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE users, artists, albums, styles, series RESTART IDENTITY CASCADE',
  )

  const userId = randomUUID()

  await prisma.$transaction(
    async (tx) => {
      // Sem isto, todo INSERT abaixo é recusado pelas políticas de RLS.
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, TRUE)`

      // A tabela users está fora do RLS, então esta linha entraria de qualquer
      // forma — mas precisa vir antes do profile por causa da chave estrangeira.
      await tx.user.create({
        data: {
          id: userId,
          email: 'camila@exemplo.dev',
          // Placeholder: não serve para login. O módulo de autenticação vai
          // gerar hash de verdade com bcrypt.
          passwordHash: 'seed-sem-senha',
        },
      })

      await tx.profile.create({
        data: {
          id: userId,
          username: 'camila',
          displayName: 'Camila',
          bio: 'Vinis garimpados em feira de rua desde 2019. Jazz, soul e um pouco de MPB dos anos 70.',
          isPublic: true,
        },
      })

      const [jazz, soul, mpb, tropicalia] = await Promise.all([
        tx.style.create({ data: { slug: 'jazz', name: 'Jazz' } }),
        tx.style.create({ data: { slug: 'soul', name: 'Soul' } }),
        tx.style.create({ data: { slug: 'mpb', name: 'MPB' } }),
        tx.style.create({ data: { slug: 'tropicalia', name: 'Tropicália' } }),
      ])

      const nina = await tx.artist.create({
        data: {
          discogsId: DISCOGS_SEED.nina,
          name: 'Nina Simone',
          sortName: 'Simone, Nina',
          articleForm: 'feminino',
          activeFrom: 1957,
          activeTo: 2003,
        },
      })

      const blakey = await tx.artist.create({
        data: {
          discogsId: DISCOGS_SEED.blakey,
          name: 'Art Blakey',
          sortName: 'Blakey, Art',
          articleForm: 'masculino',
        },
      })

      const milton = await tx.artist.create({
        data: {
          discogsId: DISCOGS_SEED.milton,
          name: 'Milton Nascimento',
          sortName: 'Nascimento, Milton',
          articleForm: 'masculino',
        },
      })

      // sortName sem o artigo: é o que faz "Os Mutantes" ordenar em M, e é o
      // caso que prova que o campo separado não era firula.
      const mutantes = await tx.artist.create({
        data: {
          discogsId: DISCOGS_SEED.mutantes,
          name: 'Os Mutantes',
          sortName: 'Mutantes',
          articleForm: 'banda',
        },
      })

      const series = await tx.series.create({ data: { name: 'Jazz Masters' } })

      // Discos com um artista creditado
      const simples = [
        {
          title: 'Pastel Blues',
          sortTitle: 'Pastel Blues',
          releaseYear: 1965,
          label: 'Philips',
          artistId: nina.id,
          styleIds: [soul.id, jazz.id],
          coverUrl:
            'https://i.discogs.com/qhuHrFSJyiJtO4ISu4vRAWJ-LJvGYghB5h6v7_ImiK8/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTM2NTE5/OTYtMTM1ODI1ODY3/MC03NDIxLmpwZWc.jpeg',
        },
        {
          title: 'Black Gold',
          sortTitle: 'Black Gold',
          releaseYear: 1970,
          label: 'RCA Victor',
          artistId: nina.id,
          styleIds: [soul.id],
          coverUrl:
            'https://i.discogs.com/eH0VycxWnVJOY2keSWPyZ6jkAFwh4TLGtV32HL3BYrA/rs:fit/g:sm/q:90/h:600/w:588/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTE0MDIx/MzYtMTM0NDc5MDkz/MC00MzA4LmpwZWc.jpeg',
        },
        {
          title: 'Baltimore',
          sortTitle: 'Baltimore',
          releaseYear: 1978,
          label: 'CTI Records',
          artistId: nina.id,
          styleIds: [soul.id],
          coverUrl:
            'https://i.discogs.com/IXgr7AmTzPd7L7SrJYCj5ljQ3vd_RJLnmo2VdCp82gQ/rs:fit/g:sm/q:90/h:590/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTIxMzA4/NDktMTMzMTY4OTk0/MC5qcGVn.jpeg',
        },
        {
          title: "Moanin'",
          sortTitle: 'Moanin',
          releaseYear: 1958,
          label: 'Blue Note',
          artistId: blakey.id,
          styleIds: [jazz.id],
          coverUrl:
            'https://i.discogs.com/MkycIb8asg-Qpx1M7rImg_GV11wgkSbDlZLFAlaIw-U/rs:fit/g:sm/q:90/h:587/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTE4MTUw/OTA3LTE3NTkzNzY2/MTItMjc4My5qcGVn.jpeg',
        },
        {
          title: 'A Night in Tunisia',
          sortTitle: 'Night in Tunisia, A',
          releaseYear: 1961,
          label: 'Blue Note',
          artistId: blakey.id,
          styleIds: [jazz.id],
          coverUrl:
            'https://i.discogs.com/lbish7XSJOYqF0tKyFmuA6Ycc000cXF88AtXW1vBhpo/rs:fit/g:sm/q:90/h:603/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTIyNzc3/MTctMTY4NDUxNTEx/OS0xODU2LmpwZWc.jpeg',
        },
        {
          title: 'Clube da Esquina',
          sortTitle: 'Clube da Esquina',
          releaseYear: 1972,
          label: 'EMI-Odeon',
          artistId: milton.id,
          styleIds: [mpb.id],
          coverUrl:
            'https://i.discogs.com/w-JQlpNWejqoGIuC_61m_MmvjQgy5VbE55-6WIfxcUM/rs:fit/g:sm/q:90/h:593/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTI2NDM4/ODMtMTQ0NzgyNzgx/MS0yOTI4LmpwZWc.jpeg',
        },
        {
          title: 'Os Mutantes',
          sortTitle: 'Mutantes, Os',
          releaseYear: 1968,
          label: 'Polydor',
          artistId: mutantes.id,
          styleIds: [tropicalia.id],
          coverUrl:
            'https://i.discogs.com/zvJEXkmDH2QDTijtZgxZXU2cIfkjkE-_GVFA9T5uAW8/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTEzNjUz/MDItMTY3MDk2Njgx/Ny05NDQxLmpwZWc.jpeg',
        },
      ]

      const criados: string[] = []

      for (const disco of simples) {
        const album = await tx.album.create({
          data: {
            title: disco.title,
            sortTitle: disco.sortTitle,
            releaseYear: disco.releaseYear,
            label: disco.label,
            coverUrl: disco.coverUrl,
            isCompilation: false,
            artists: {
              create: [
                { artistId: disco.artistId, role: 'principal', position: 0 },
              ],
            },
            styles: {
              create: disco.styleIds.map((styleId) => ({ styleId })),
            },
          },
        })
        criados.push(album.id)
      }

      // A coletânea: sem crédito único, dois participantes, e ligada à série.
      // É este registro que exercita o caminho "Vários artistas" no card e o
      // aparecimento do disco na página de cada artista.
      const coletanea = await tx.album.create({
        data: {
          title: 'Jazz Masters, Vol. 3',
          sortTitle: 'Jazz Masters 03',
          releaseYear: 1994,
          label: 'Verve',
          isCompilation: true,
          artists: {
            create: [
              { artistId: nina.id, role: 'participante', position: 0 },
              { artistId: blakey.id, role: 'participante', position: 1 },
            ],
          },
          styles: { create: [{ styleId: jazz.id }] },
          seriesAlbums: { create: [{ seriesId: series.id, volume: 'Vol. 3' }] },
        },
      })
      criados.push(coletanea.id)

      for (const albumId of criados) {
        await tx.collectionItem.create({
          data: { ownerId: userId, albumId, condition: 'bom' },
        })
      }

      // Disco favorito, com a nota pessoal que aparece no perfil público.
      const baltimore = await tx.collectionItem.findFirst({
        where: { ownerId: userId, album: { title: 'Baltimore' } },
        select: { id: true },
      })

      if (baltimore) {
        await tx.collectionItem.update({
          where: { id: baltimore.id },
          data: {
            notes:
              'Achei numa caixa embaixo da mesa, por quinze reais. Capa arranhada, som intacto.',
          },
        })
        await tx.profile.update({
          where: { id: userId },
          data: { favoriteItemId: baltimore.id },
        })
      }
    },
    // Padrão do Prisma é 5s. O pooler do Neon soma latência de rede a cada
    // query da transação, e a sequência de creates abaixo passa disso.
    { timeout: 20_000 },
  )

  console.log('Seed concluído. Perfil: camila')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
