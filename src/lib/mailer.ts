import { getEnv } from './env';

export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const env = getEnv();
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) {
    console.log(`[MAIL] To: ${to} | Subject: ${subject}\n${html}`);
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: env.MAIL_FROM, to, subject, html }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('Mail send failed:', res.status, txt);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Mail error:', e);
    return false;
  }
}
