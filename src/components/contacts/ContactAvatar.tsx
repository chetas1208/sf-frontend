"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { avatarHue, initials } from "@/lib/contacts/format";
import type { Contact } from "@/lib/contacts/types";

const SIZES = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

/** Initials bubble, tinted with a hue derived from the contact's email. */
function AvatarContent({
  contact,
}: {
  contact: Pick<Contact, "first_name" | "last_name" | "email" | "photo">;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!contact.photo || imageFailed) {
    return <span aria-hidden="true">{initials(contact)}</span>;
  }

  return (
    // Inline data URLs are the storage/API contract for this small avatar.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={contact.photo}
      alt={`${contact.first_name} ${contact.last_name} profile photo`}
      className="aspect-square h-full w-full object-cover"
      onError={() => setImageFailed(true)}
    />
  );
}

export default function ContactAvatar({
  contact,
  size = "md",
}: {
  contact: Pick<Contact, "first_name" | "last_name" | "email" | "photo">;
  size?: keyof typeof SIZES;
}) {
  const style = {
    "--avatar-hue": avatarHue(contact.email),
  } as CSSProperties;

  return (
    <span
      aria-hidden={contact.photo ? undefined : true}
      style={style}
      className={`contact-avatar inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-display font-semibold ${SIZES[size]}`}
    >
      <AvatarContent key={contact.photo ?? "initials"} contact={contact} />
    </span>
  );
}
