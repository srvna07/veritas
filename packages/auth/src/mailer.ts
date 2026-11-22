import nodemailer from 'nodemailer';

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export type SmtpSettings = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

export function createSmtpMailer(settings: SmtpSettings): Mailer {
  const transport = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.port === 465,
    auth: { user: settings.user, pass: settings.pass },
  });
  return {
    async send(message) {
      await transport.sendMail({ from: settings.from, ...message });
    },
  };
}

export function createConsoleMailer(log: (line: string) => void = console.log): Mailer {
  return {
    async send(message) {
      log(`[mail] to=${message.to} subject="${message.subject}"\n${message.text}`);
    },
  };
}

export function createLazyMailer(factory: () => Mailer): Mailer {
  let instance: Mailer | undefined;
  return {
    async send(message) {
      instance ??= factory();
      await instance.send(message);
    },
  };
}

export function createMailerFromEnv(env: Record<string, string | undefined> = process.env): Mailer {
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  if (user && pass) {
    return createSmtpMailer({
      host: env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(env.SMTP_PORT) || 465,
      user,
      pass,
      from: env.MAIL_FROM || `Veritas <${user}>`,
    });
  }
  if (env.NODE_ENV === 'production') {
    throw new Error('SMTP_USER and SMTP_PASS must be set in production');
  }
  return createConsoleMailer();
}
