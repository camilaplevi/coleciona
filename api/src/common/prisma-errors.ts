import { Prisma } from '../generated/prisma/client.js'

/** Campo único em conflito (P2002), ou null para qualquer outro erro. */
export function uniqueConflictField(error: unknown): 'username' | 'email' | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return null
  }

  // O driver adapter não preenche meta.target: o nome da constraint vem em driverAdapterError.
  const meta = error.meta as
    | { target?: unknown; driverAdapterError?: { cause?: { constraint?: { index?: string }; originalMessage?: string } } }
    | undefined
  const cause = meta?.driverAdapterError?.cause
  const text = [meta?.target, cause?.constraint?.index, cause?.originalMessage]
    .flat()
    .filter(Boolean)
    .join(' ')

  if (text.includes('username')) return 'username'
  if (text.includes('email')) return 'email'
  return null
}
