// Importa discos de vinil do Discogs para o catálogo, por gênero.
//
// Uso (a partir da pasta api):
//   npm run import:discogs -- --genero Jazz --paginas 5 --email voce@exemplo.dev
//
// Opções: --genero (obrigatório), --paginas (padrão 1), --por-pagina (até 100,
// padrão 50), --email de uma conta verificada, que assina as gravações.
//
// Quem já está no banco é pulado sem chamar a API, então a execução pode ser
// interrompida e retomada. O ritmo respeita o limite do Discogs (60 req/min).

import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { DiscogsClient } from '../src/discogs/discogs.client.js'
import { toReleaseSearchResults, type RawReleaseSearchResponse } from '../src/discogs/discogs.mapper.js'
import { ReleaseImporter } from '../src/discogs/release-importer.js'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

async function main() {
  const options = parseOptions(process.argv.slice(2))
  const genre = options.get('genero')
  const email = options.get('email')
  const pages = Math.min(Number(options.get('paginas') ?? 1), 50)
  const perPage = Math.min(Number(options.get('por-pagina') ?? 50), 100)

  if (!genre || !email) {
    console.error('Uso: npm run import:discogs -- --genero Jazz --email voce@exemplo.dev [--paginas 5] [--por-pagina 50]')
    process.exitCode = 1
    return
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, emailVerifiedAt: true },
  })
  if (!user?.emailVerifiedAt) {
    console.error(`A conta ${email} não existe ou ainda não confirmou o e-mail.`)
    process.exitCode = 1
    return
  }

  const token = process.env.DISCOGS_TOKEN
  const userAgent = process.env.DISCOGS_USER_AGENT
  if (!token || !userAgent) {
    console.error('DISCOGS_TOKEN e DISCOGS_USER_AGENT precisam estar no .env.')
    process.exitCode = 1
    return
  }

  const client = new DiscogsClient(token, userAgent)
  const importer = new ReleaseImporter(prisma)
  const totals = { imported: 0, skipped: 0, failed: 0 }

  for (let page = 1; page <= pages; page += 1) {
    const raw = await client.get<RawReleaseSearchResponse>('/database/search', {
      type: 'release',
      format: 'Vinyl',
      genre,
      per_page: perPage,
      page,
    })
    const items = toReleaseSearchResults(raw)
    if (items.length === 0) break

    for (const item of items) {
      try {
        if (await importer.localAlbumId(item.discogsId)) {
          totals.skipped += 1
          continue
        }
        await importer.import(client, item.discogsId, user.id)
        totals.imported += 1
      } catch (error) {
        totals.failed += 1
        console.error(`Falhou o release ${item.discogsId} (${item.title}):`, (error as Error).message)
      }
    }

    console.log(`[${genre}] página ${page}: ${totals.imported} importados, ${totals.skipped} já existiam, ${totals.failed} com erro`)
  }

  console.log(`Concluído: ${totals.imported} importados, ${totals.skipped} já existiam, ${totals.failed} com erro.`)
}

function parseOptions(args: string[]): Map<string, string> {
  const options = new Map<string, string>()
  for (let i = 0; i < args.length; i += 1) {
    if (args[i].startsWith('--') && args[i + 1]) {
      options.set(args[i].slice(2), args[i + 1])
      i += 1
    }
  }
  return options
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
