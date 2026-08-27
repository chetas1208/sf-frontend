import { buildVCard, type ShareContactData } from "./vcard";

/** Maximum byte-mode payload for a version-40 QR at error-correction level M. */
export const QR_MAX_BYTES = 2331;

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

/**
 * Prefer the complete vCard, then omit the optional note when a QR is tight.
 * A full download/share remains available for records that cannot fit even in
 * the compact representation.
 */
export function buildQrVCard(contact: ShareContactData): string | null {
  const fullVCard = buildVCard(contact);
  if (byteLength(fullVCard) <= QR_MAX_BYTES) return fullVCard;

  const compactVCard = buildVCard({ ...contact, notes: null });
  return byteLength(compactVCard) <= QR_MAX_BYTES ? compactVCard : null;
}

/** Identify qrcode library errors that cannot be fixed by retrying. */
export function isQrCapacityError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /capacity|too (?:big|large)|code length overflow|version 40/i.test(message);
}
