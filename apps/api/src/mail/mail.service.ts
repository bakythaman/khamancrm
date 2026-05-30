import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  sendWelcomeEmail(to: string, name: string, companyName: string) {
    return this.sendMail({
      to,
      subject: 'Вы зарегистрировались в Khaman CRM',
      text: `Здравствуйте, ${name}. Рабочее пространство ${companyName} создано. Теперь вы можете войти в Khaman CRM.`,
    });
  }

  sendInviteEmail(to: string, name: string, password: string) {
    return this.sendMail({
      to,
      subject: 'Вас добавили в Khaman CRM',
      text: `Здравствуйте, ${name}. Вас добавили в Khaman CRM. Логин: ${to}. Временный пароль: ${password}`,
    });
  }

  sendPasswordResetEmail(to: string, code: string) {
    return this.sendMail({
      to,
      subject: 'Код смены пароля Khaman CRM',
      text: `Ваш код для смены пароля: ${code}. Код действует 15 минут.`,
    });
  }

  private async sendMail(payload: { to: string; subject: string; text: string }) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('MAIL_FROM') ?? 'Khaman CRM <onboarding@resend.dev>';

    if (!apiKey) {
      this.logger.log(`[dev email] to=${payload.to} subject=${payload.subject} text=${payload.text}`);
      return { delivered: false, provider: 'console' };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(`Email delivery failed: ${response.status} ${body}`);
      return { delivered: false, provider: 'resend' };
    }

    return { delivered: true, provider: 'resend' };
  }
}
