import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'

export interface ConfirmationEmail {
  to: string
  displayName: string
  confirmationUrl: string
}

/**
 * Envio pela API do Resend. Sem RESEND_API_KEY, o link vai só para o console, o que deixa
 * o fluxo testável em desenvolvimento. Em produção a chave é obrigatória.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private readonly apiKey = process.env.RESEND_API_KEY
  private readonly from = process.env.MAIL_FROM ?? 'Coleciona <onboarding@resend.dev>'

  constructor() {
    if (!this.apiKey && process.env.NODE_ENV === 'production') {
      throw new Error('RESEND_API_KEY precisa estar definida em produção.')
    }
  }

  async sendConfirmation(email: ConfirmationEmail): Promise<void> {
    const subject = 'Confirme seu e-mail no Coleciona'
    const text = [
      `Olá, ${email.displayName}!`,
      '',
      'Falta só um passo para ativar sua conta no Coleciona. Confirme seu e-mail pelo link abaixo:',
      '',
      email.confirmationUrl,
      '',
      'O link vale por 24 horas. Se você não criou esta conta, pode ignorar este e-mail.',
    ].join('\n')

    if (!this.apiKey) {
      this.logger.warn(`RESEND_API_KEY ausente. Link de confirmação para ${email.to}: ${email.confirmationUrl}`)
      return
    }

    await axios.post(
      'https://api.resend.com/emails',
      {
        from: this.from,
        to: [email.to],
        subject,
        text,
        html: `<p>Olá, ${escapeHtml(email.displayName)}!</p>
<p>Falta só um passo para ativar sua conta no Coleciona. Confirme seu e-mail:</p>
<p><a href="${email.confirmationUrl}">Confirmar meu e-mail</a></p>
<p style="color:#6b6b66;font-size:13px">O link vale por 24 horas. Se você não criou esta conta, pode ignorar este e-mail.</p>`,
      },
      {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        timeout: 8000,
      },
    )
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
