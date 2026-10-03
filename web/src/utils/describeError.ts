// web/src/utils/describeError.ts
//
// Traduz um erro em texto para gente. Toda mensagem de falha segue a mesma
// estrutura: o que aconteceu, de quem é o problema, e o que fazer agora.
// Nada de "Ops!", nada de código de status, nada que culpe quem está usando.

import { ApiError } from '@/services/http'
import type { StateTone } from '@/components/feedback/StateMessage.vue'

export interface ErrorCopy {
  tone: StateTone
  title: string
  description: string
}

/**
 * @param subject o que não carregou, com artigo: "o catálogo", "os resultados".
 *                Deixa o título específico sem uma função por tela.
 */
export function describeError(error: unknown, subject = 'esta página'): ErrorCopy {
  if (error instanceof ApiError) {
    switch (error.kind) {
      case 'offline':
        return {
          tone: 'offline',
          title: 'Sem conexão com o servidor',
          description: 'Confira sua internet. Quando a conexão voltar, é só tentar de novo.',
        }
      case 'not-found':
        return {
          tone: 'not-found',
          title: 'Não encontramos o que você procurava',
          // 404 traz mensagem nossa, em português, então vale mostrar.
          description: error.message,
        }
      case 'server':
        return {
          tone: 'error',
          title: `Não conseguimos carregar ${subject}`,
          description: 'O problema é do nosso lado, não seu. Tente de novo em alguns instantes.',
        }
    }
  }

  return {
    tone: 'error',
    title: `Não conseguimos carregar ${subject}`,
    description: 'Tente de novo. Se continuar acontecendo, recarregue a página.',
  }
}