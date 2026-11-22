import type { MailMessage } from './mailer';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(heading: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#1c1f2a;">
    <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <h1 style="margin:0 0 16px;font-size:20px;color:#3b4cca;">Veritas</h1>
        <h2 style="margin:0 0 16px;font-size:18px;">${escapeHtml(heading)}</h2>
        ${bodyHtml}
      </td></tr>
    </table>
  </body>
</html>`;
}

export function resetPasswordEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
  ttlMinutes: number;
}): MailMessage {
  const subject = 'Reset your Veritas password';
  const text = [
    `Hi ${input.name},`,
    '',
    'We received a request to reset your Veritas password.',
    `Use the link below within ${input.ttlMinutes} minutes to choose a new one:`,
    '',
    input.resetUrl,
    '',
    'If you did not request this, you can ignore this email. Your password will not change.',
  ].join('\n');
  const html = layout(
    'Reset your password',
    `<p>Hi ${escapeHtml(input.name)},</p>
        <p>We received a request to reset your Veritas password. This link is valid for ${input.ttlMinutes} minutes.</p>
        <p style="margin:24px 0;"><a href="${escapeHtml(input.resetUrl)}" style="background:#3b4cca;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Choose a new password</a></p>
        <p style="font-size:13px;color:#5b6070;">If the button does not work, copy this link into your browser:<br>${escapeHtml(input.resetUrl)}</p>
        <p style="font-size:13px;color:#5b6070;">If you did not request this, you can ignore this email. Your password will not change.</p>`,
  );
  return { to: input.to, subject, text, html };
}

export function passwordChangedEmail(input: { to: string; name: string }): MailMessage {
  const subject = 'Your Veritas password was changed';
  const text = [
    `Hi ${input.name},`,
    '',
    'Your Veritas password was just changed and all active sessions were signed out.',
    'If this was not you, reset your password immediately and contact your administrator.',
  ].join('\n');
  const html = layout(
    'Password changed',
    `<p>Hi ${escapeHtml(input.name)},</p>
        <p>Your Veritas password was just changed and all active sessions were signed out.</p>
        <p style="font-size:13px;color:#5b6070;">If this was not you, reset your password immediately and contact your administrator.</p>`,
  );
  return { to: input.to, subject, text, html };
}
