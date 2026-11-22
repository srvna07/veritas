import nodemailer from 'nodemailer';
import { getServerEnv } from '../config/env';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * Sends the password-reset email through Gmail SMTP. In development, when SMTP credentials are
 * not configured, the link is printed to the server console so the flow can be tested locally.
 */
export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<void> {
  const env = getServerEnv();

  if (!env.SMTP_USER || !env.SMTP_PASS) {
    if (env.NODE_ENV === 'production') {
      throw new Error('SMTP_USER and SMTP_PASS must be set in production');
    }
    console.info(
      `[mailer] SMTP not configured. Password reset link for ${input.to}: ${input.resetUrl}`,
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  const name = escapeHtml(input.name);
  const url = escapeHtml(input.resetUrl);

  await transporter.sendMail({
    from: env.MAIL_FROM ?? env.SMTP_USER,
    to: input.to,
    subject: 'Reset your Veritas password',
    text: [
      `Hi ${input.name},`,
      '',
      'Use the link below to reset your Veritas password. It expires in 1 hour and can be used once.',
      input.resetUrl,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: `<p>Hi ${name},</p>
<p>Use the link below to reset your Veritas password. It expires in 1 hour and can be used once.</p>
<p><a href="${url}">Reset password</a></p>
<p>If you did not request this, you can ignore this email.</p>`,
  });
}
