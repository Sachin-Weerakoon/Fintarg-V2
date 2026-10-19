import { env } from '../config/env';
import { logger } from '../config/logger';

export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) {
    logger.warn({ to, subject }, 'Email provider is not configured');
    return false;
  }


  try{
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: env.MAIL_FROM, to, subject, html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) logger.error({ status: response.status, subject }, 'Email delivery failed');
    return response.ok;
  }catch (error){

    logger.error({ err: error, subject }, 'Email delivery error');
    return false;
  }

}