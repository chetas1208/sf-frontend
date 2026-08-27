"use client";

import { useState } from "react";
import { Check, Download } from "lucide-react";
import Button from "@/components/ui/Button";
import { buildVCard, type ShareContactData } from "@/lib/contacts/vcard";

function downloadName(contact: ShareContactData): string {
  const slug = `${contact.first_name}-${contact.last_name}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "contact"}.vcf`;
}

export default function ShareContactButton({
  contact,
}: {
  contact: ShareContactData;
}) {
  const [downloaded, setDownloaded] = useState(false);

  function downloadVCard() {
    const blob = new Blob([buildVCard(contact)], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadName(contact);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  }

  return (
    <Button type="button" variant="secondary" onClick={downloadVCard}>
      {downloaded ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Download className="h-4 w-4" aria-hidden="true" />
      )}
      <span aria-live="polite">{downloaded ? "Downloaded vCard" : "Download vCard"}</span>
    </Button>
  );
}

