import "server-only";
import { env } from "../env";

export type Email = { to: string; subject: string; text: string; html: string };

export function emailConfigured() {
  return Boolean(env.resendApiKey && env.emailFrom);
}

/**
 * Sends one email through Resend. Without RESEND_API_KEY / EMAIL_FROM it
 * prints the message in development (so reset links still work locally) and
 * reports `sent: false` in production. Never throws: callers decide what a
 * failed send means for the user.
 */
export async function sendEmail(email: Email): Promise<{ sent: boolean }> {
  if (!emailConfigured()) {
    if (!env.isProd) console.info(`[email] (not sent, no RESEND_API_KEY)\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`);
    else console.warn("[email] RESEND_API_KEY / EMAIL_FROM not set; email not sent");
    return { sent: false };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.emailFrom, to: [email.to], subject: email.subject, text: email.text, html: email.html }),
    });
    if (!res.ok) {
      console.error("[email] Resend rejected the message", res.status, (await res.text().catch(() => "")).slice(0, 300));
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error("[email] send failed", err instanceof Error ? err.message : err);
    return { sent: false };
  }
}
