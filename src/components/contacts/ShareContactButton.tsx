"use client";

import { Check, Download, Loader2, QrCode, Share2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import Button, { buttonClasses } from "@/components/ui/Button";
import ContactAvatar from "@/components/contacts/ContactAvatar";
import { buildVCard, type ShareContactData } from "@/lib/contacts/vcard";
import { buildQrVCard, isQrCapacityError } from "@/lib/contacts/qr";

function downloadName(contact: ShareContactData): string {
  const slug = `${contact.first_name}-${contact.last_name}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "contact"}.vcf`;
}

function contactName(contact: ShareContactData): string {
  return `${contact.first_name} ${contact.last_name}`.trim() || "Contact";
}

function contactSubtitle(contact: ShareContactData): string | null {
  if (contact.job_title && contact.company) {
    return `${contact.job_title} at ${contact.company}`;
  }
  return contact.job_title ?? contact.company ?? null;
}

function isShareCancelled(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function canShareFile(file: File): boolean {
  if (typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function ContactPassportDialog({
  contact,
  photo,
  vCard,
  qrVCard,
  downloaded,
  onDownload,
  onClose,
}: {
  contact: ShareContactData;
  photo: string | null;
  vCard: string;
  qrVCard: string | null;
  downloaded: boolean;
  onDownload: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<
    "loading" | "ready" | "error" | "capacity"
  >(qrVCard ? "loading" : "capacity");
  const [qrAttempt, setQrAttempt] = useState(0);
  const [shareAvailable] = useState(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
  );
  const [shareStatus, setShareStatus] = useState<"idle" | "shared" | "error">("idle");
  const name = contactName(contact);
  const subtitle = contactSubtitle(contact);

  useEffect(() => {
    let cancelled = false;
    if (!qrVCard) {
      return () => {
        cancelled = true;
      };
    }

    QRCode.toDataURL(qrVCard, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
      color: { dark: "#111827", light: "#ffffff" },
    })
      .then((dataUrl) => {
        if (cancelled) return;
        setQrDataUrl(dataUrl);
        setQrStatus("ready");
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setQrStatus(isQrCapacityError(error) ? "capacity" : "error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [qrAttempt, qrVCard]);

  useEffect(() => {
    const dialogElement = dialogRef.current;
    const overlay = overlayRef.current;
    if (!dialogElement || !overlay) return;
    const dialog = dialogElement as HTMLDivElement;

    const previousFocus = document.activeElement as HTMLElement | null;
    type InertElement = HTMLElement & { inert: boolean };
    const background = Array.from(document.body.children)
      .filter((element) => element !== overlay)
      .map((element) => {
        const inertElement = element as InertElement;
        return { element: inertElement, inert: inertElement.inert };
      });
    background.forEach(({ element }) => {
      element.inert = true;
    });

    function focusableElements(): HTMLElement[] {
      return Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    }

    function focusFirst() {
      closeButtonRef.current?.focus();
    }

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;

      const focusable = focusableElements();
      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!dialog.contains(active)) {
        event.preventDefault();
        focusFirst();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function handleFocusIn(event: FocusEvent) {
      if (event.target instanceof Node && !dialog.contains(event.target)) {
        focusFirst();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      background.forEach(({ element, inert }) => {
        element.inert = inert;
      });
      previousFocus?.focus();
    };
  }, [onClose]);

  async function handleNativeShare() {
    if (typeof navigator.share !== "function") return;

    const file = new File([vCard], downloadName(contact), {
      type: "text/vcard;charset=utf-8",
    });

    try {
      if (canShareFile(file)) {
        await navigator.share({ title: name, files: [file] });
      } else {
        await navigator.share({ title: name, text: vCard });
      }
      setShareStatus("shared");
    } catch (error) {
      if (!isShareCancelled(error)) setShareStatus("error");
    }
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-primary">
              Contact Passport
            </p>
            <h2 id={titleId} className="mt-1 font-display text-2xl font-bold tracking-tight">
              Share {name}
            </h2>
          </div>
          <button
            type="button"
            className={buttonClasses("ghost", "sm")}
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close Contact Passport"
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <ContactAvatar contact={{ ...contact, photo }} size="lg" />
          <div>
            <p className="font-medium text-foreground">{name}</p>
            {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-white p-4 text-center">
          {qrStatus === "ready" && qrDataUrl ? (
            // The QR is generated locally from the existing vCard payload.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={`QR code for ${name} contact card`}
              className="mx-auto aspect-square w-full max-w-[280px]"
            />
          ) : qrStatus === "loading" ? (
            <div className="grid aspect-square w-full place-items-center text-muted-foreground">
              <div role="status" className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Generating QR code…
              </div>
            </div>
          ) : qrStatus === "capacity" ? (
            <div className="grid aspect-square w-full place-items-center px-6">
              <div>
                <p role="alert" className="text-sm text-destructive">
                  This contact is too large for one QR code.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Download the full vCard instead.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid aspect-square w-full place-items-center px-6">
              <div>
                <p role="alert" className="text-sm text-destructive">
                  We couldn’t generate the QR code.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setQrDataUrl(null);
                    setQrStatus("loading");
                    setQrAttempt((attempt) => attempt + 1);
                  }}
                >
                  Try again
                </Button>
              </div>
            </div>
          )}
        </div>

        <p id={descriptionId} className="mt-3 text-center text-sm text-muted-foreground">
          Scan to add this contact, or share the vCard file directly.
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button type="button" variant="secondary" onClick={onDownload}>
            {downloaded ? (
              <Check className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            )}
            <span aria-live="polite">
              {downloaded ? "Downloaded vCard" : "Download vCard"}
            </span>
          </Button>
          {shareAvailable ? (
            <Button type="button" variant="primary" onClick={handleNativeShare}>
              {shareStatus === "shared" ? (
                <Check className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <Share2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              )}
              <span aria-live="polite">
                {shareStatus === "shared"
                  ? "Shared"
                  : shareStatus === "error"
                    ? "Share failed"
                    : "Share"}
              </span>
            </Button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function ShareContactButton({
  contact,
  photo = null,
}: {
  contact: ShareContactData;
  photo?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const vCard = buildVCard(contact);
  const qrVCard = buildQrVCard(contact);

  function downloadVCard() {
    const blob = new Blob([vCard], { type: "text/vcard;charset=utf-8" });
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
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <QrCode className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        Share Contact
      </Button>
      {open ? (
        <ContactPassportDialog
          contact={contact}
          photo={photo}
          vCard={vCard}
          qrVCard={qrVCard}
          downloaded={downloaded}
          onDownload={downloadVCard}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
