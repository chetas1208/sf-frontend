"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import Button from "@/components/ui/Button";
import { addressLine, mapsDirectionsUrl } from "@/lib/contacts/format";
import type { Address } from "@/lib/contacts/types";

type CopyState = "idle" | "copied" | "error";

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "true");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();

  try {
    if (!document.execCommand("copy")) {
      throw new Error("Copy command was rejected");
    }
  } finally {
    input.remove();
  }
}

export default function AddressActions({ address }: { address: Address }) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const line = addressLine(address);
  const mapsUrl = mapsDirectionsUrl(address);

  if (!line) return null;
  const addressText = line;

  async function handleCopy() {
    try {
      await copyText(addressText);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {mapsUrl ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
          Open in Maps
        </a>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        aria-label={`Copy ${address.type.toLowerCase()} address`}
      >
        {copyState === "copied" ? (
          <Check className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        )}
        <span aria-live="polite">
          {copyState === "copied"
            ? "Copied"
            : copyState === "error"
              ? "Copy failed"
              : "Copy"}
        </span>
      </Button>
    </div>
  );
}
