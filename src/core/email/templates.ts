/**
 * Plain, readable emails. Every message has a text part that says everything
 * the HTML part says; the HTML is a single column with one button at most.
 */

export type RenderedEmail = { subject: string; text: string; html: string };

const BRAND = "#1f5f4f";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function layout(bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1d1b18">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<div style="font-family:Georgia,serif;font-size:20px;font-weight:600;color:${BRAND};margin-bottom:24px">Home Base</div>
<div style="background:#fff;border:1px solid #e4ded4;border-radius:14px;padding:24px;font-size:15px;line-height:1.5">${bodyHtml}</div>
<p style="font-size:12px;color:#6f685e;margin-top:16px">Sent by Home Base, by HaveAnApp.</p>
</div></body></html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0 8px"><a href="${escapeHtml(href)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">${escapeHtml(label)}</a></p>`;
}

export function passwordResetEmail(opts: { name: string; url: string; minutes: number }): RenderedEmail {
  const first = opts.name.split(" ")[0] || "there";
  return {
    subject: "Reset your Home Base password",
    text: `Hi ${first},\n\nSomeone asked to reset the password for your Home Base account. If that was you, open this link to choose a new one:\n\n${opts.url}\n\nThe link works once and expires in ${opts.minutes} minutes. If you did not ask for this, ignore this email and your password stays the same.`,
    html: layout(
      `<p>Hi ${escapeHtml(first)},</p><p>Someone asked to reset the password for your Home Base account. If that was you, choose a new one below.</p>${button(opts.url, "Choose a new password")}<p style="font-size:13px;color:#6f685e">The link works once and expires in ${opts.minutes} minutes. If you did not ask for this, ignore this email and your password stays the same.</p>`,
    ),
  };
}

export function inviteEmail(opts: { inviterName: string; householdName: string; url: string; days: number }): RenderedEmail {
  return {
    subject: `${opts.inviterName} invited you to ${opts.householdName} on Home Base`,
    text: `${opts.inviterName} invited you to share ${opts.householdName} on Home Base: maintenance, inventory, documents and projects for the home.\n\nJoin here:\n\n${opts.url}\n\nThe invite expires in ${opts.days} days.`,
    html: layout(
      `<p><strong>${escapeHtml(opts.inviterName)}</strong> invited you to share <strong>${escapeHtml(opts.householdName)}</strong> on Home Base: maintenance, inventory, documents and projects for the home.</p>${button(opts.url, "Join the household")}<p style="font-size:13px;color:#6f685e">The invite expires in ${opts.days} days.</p>`,
    ),
  };
}

export type DigestLine = { title: string; when: string; href: string };

export function digestEmail(opts: {
  name: string;
  propertyName: string;
  overdue: DigestLine[];
  upcoming: DigestLine[];
  expiring: DigestLine[];
  appUrl: string;
}): RenderedEmail {
  const first = opts.name.split(" ")[0] || "there";
  const counts: string[] = [];
  if (opts.overdue.length) counts.push(`${opts.overdue.length} overdue`);
  if (opts.upcoming.length) counts.push(`${opts.upcoming.length} due this week`);
  if (opts.expiring.length) counts.push(`${opts.expiring.length} expiring`);
  const subject = `${opts.propertyName}: ${counts.join(", ")}`;

  const groups: Array<[string, DigestLine[]]> = [
    ["Overdue", opts.overdue],
    ["Due in the next 7 days", opts.upcoming],
    ["Warranties and documents expiring within 30 days", opts.expiring],
  ];
  const textGroups = groups
    .filter(([, lines]) => lines.length)
    .map(([heading, lines]) => `${heading}\n${lines.map((l) => `- ${l.title} (${l.when})`).join("\n")}`)
    .join("\n\n");
  const htmlGroups = groups
    .filter(([, lines]) => lines.length)
    .map(
      ([heading, lines]) =>
        `<h3 style="font-size:14px;margin:20px 0 6px;color:#3d3933">${escapeHtml(heading)}</h3><ul style="margin:0;padding-left:18px">${lines
          .map((l) => `<li style="margin:4px 0"><a href="${escapeHtml(l.href)}" style="color:${BRAND}">${escapeHtml(l.title)}</a> <span style="color:#6f685e">${escapeHtml(l.when)}</span></li>`)
          .join("")}</ul>`,
    )
    .join("");
  const settings = `${opts.appUrl}/settings#reminders`;
  return {
    subject,
    text: `Hi ${first},\n\nHere is what needs attention at ${opts.propertyName} this week.\n\n${textGroups}\n\nOpen Home Base: ${opts.appUrl}/home\n\nTo stop these emails, turn off the weekly email in Settings: ${settings}`,
    html: layout(
      `<p>Hi ${escapeHtml(first)},</p><p>Here is what needs attention at ${escapeHtml(opts.propertyName)} this week.</p>${htmlGroups}${button(`${opts.appUrl}/home`, "Open Home Base")}<p style="font-size:13px;color:#6f685e">To stop these emails, turn off the weekly email in <a href="${escapeHtml(settings)}" style="color:${BRAND}">Settings</a>.</p>`,
    ),
  };
}
