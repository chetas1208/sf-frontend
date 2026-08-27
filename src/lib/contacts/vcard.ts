import type { Contact } from "./types";

export type ShareContactData = Pick<
  Contact,
  "first_name" | "last_name" | "email" | "phone" | "company" | "job_title" | "notes" | "addresses"
>;

/** Escape a vCard text value according to RFC 6350's text rules. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function valueOrEmpty(value: string | null): string {
  return escapeText(value ?? "");
}

function addressLine(address: ShareContactData["addresses"][number]): string {
  const parts = [
    "",
    "",
    valueOrEmpty(address.address),
    valueOrEmpty(address.city),
    valueOrEmpty(address.state),
    valueOrEmpty(address.postal_code),
    valueOrEmpty(address.country),
  ];
  return `ADR;TYPE=${address.type.toUpperCase()}:${parts.join(";")}`;
}

/** Build a broadly compatible vCard 3.0 document for browser download. */
export function buildVCard(contact: ShareContactData): string {
  const fullName = `${contact.first_name} ${contact.last_name}`.trim();
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${valueOrEmpty(contact.last_name)};${valueOrEmpty(contact.first_name)};;;`,
    `FN:${escapeText(fullName)}`,
    `EMAIL;TYPE=INTERNET:${escapeText(contact.email)}`,
  ];

  if (contact.phone) lines.push(`TEL;TYPE=VOICE:${escapeText(contact.phone)}`);
  if (contact.company) lines.push(`ORG:${escapeText(contact.company)}`);
  if (contact.job_title) lines.push(`TITLE:${escapeText(contact.job_title)}`);
  for (const address of contact.addresses) lines.push(addressLine(address));
  if (contact.notes) lines.push(`NOTE:${escapeText(contact.notes)}`);

  lines.push("END:VCARD");
  return `${lines.join("\r\n")}\r\n`;
}

