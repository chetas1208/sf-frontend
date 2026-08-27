"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import Button from "@/components/ui/Button";
import ContactAvatar from "@/components/contacts/ContactAvatar";
import { PHOTO_MAX_BYTES } from "@/lib/contacts/schema";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_DIMENSION = 1600;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Photo could not be read"));
    };
    reader.onerror = () => reject(new Error("Photo could not be read"));
    reader.readAsDataURL(file);
  });
}

function dataUrlBytes(dataUrl: string): number {
  const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((encoded.length * 3) / 4) - padding);
}

async function normalizePhoto(file: File): Promise<string> {
  if (typeof globalThis.createImageBitmap !== "function") {
    return readAsDataUrl(file);
  }

  const bitmap = await globalThis.createImageBitmap(file);
  try {
    const largestDimension = Math.max(bitmap.width, bitmap.height);
    if (largestDimension <= MAX_IMAGE_DIMENSION) {
      return readAsDataUrl(file);
    }

    const scale = MAX_IMAGE_DIMENSION / largestDimension;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo could not be resized");

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL(file.type, file.type === "image/jpeg" ? 0.88 : undefined);
    if (dataUrl === "data:," || dataUrlBytes(dataUrl) > PHOTO_MAX_BYTES) {
      throw new Error("Photo is too large after processing");
    }
    return dataUrl;
  } finally {
    bitmap.close();
  }
}

export default function ContactPhotoField({
  value,
  contact,
  error,
  onChange,
  onValidityChange,
}: {
  value: string | null;
  contact: {
    first_name: string;
    last_name: string;
    email: string;
  };
  error?: string;
  onChange: (photo: string | null) => void;
  onValidityChange: (isValid: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  const [clientError, setClientError] = useState<string>();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const visibleError = clientError ?? error;

  function rejectPhoto(message: string) {
    setIsProcessing(false);
    setClientError(message);
    onValidityChange(false);
  }

  async function processPhoto(file: File) {
    const requestId = ++requestRef.current;
    setClientError(undefined);
    setIsProcessing(true);
    onValidityChange(false);

    if (!ACCEPTED_TYPES.has(file.type)) {
      rejectPhoto("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      rejectPhoto("Photo must be 2 MB or smaller.");
      return;
    }

    try {
      const dataUrl = await normalizePhoto(file);
      if (requestId !== requestRef.current) return;
      onChange(dataUrl);
      setClientError(undefined);
      setIsProcessing(false);
      onValidityChange(true);
    } catch {
      if (requestId !== requestRef.current) return;
      rejectPhoto("That photo could not be decoded. Choose another file.");
    }
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void processPhoto(file);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void processPhoto(file);
  }

  function removePhoto() {
    requestRef.current += 1;
    onChange(null);
    setClientError(undefined);
    setIsProcessing(false);
    onValidityChange(true);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-3" aria-busy={isProcessing}>
      <input type="hidden" name="photo" value={value ?? ""} readOnly />
      <label
        htmlFor="photo-upload"
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer items-center gap-4 rounded-lg border border-dashed p-4 transition-colors ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-border bg-card/40 hover:border-primary/60 hover:bg-secondary/30"
        }`}
      >
        <ContactAvatar
          contact={{
            ...contact,
            photo: value,
          }}
          size="lg"
        />
        <span className="min-w-0 space-y-1">
          <span className="flex items-center gap-2 font-medium text-foreground">
            <ImagePlus className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {value ? "Replace photo" : "Drop a photo here"}
          </span>
          <span className="block text-[13px] text-muted-foreground">
            or <span className="text-primary underline-offset-2 hover:underline">choose photo</span>
          </span>
          <span className="block text-[12px] text-muted-foreground">
            JPEG, PNG or WebP · max 2 MB
          </span>
        </span>
      </label>
      <input
        ref={inputRef}
        id="photo-upload"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFile}
        aria-describedby="photo-help photo-error"
        aria-invalid={visibleError ? "true" : undefined}
      />
      <p id="photo-help" className="sr-only">
        JPEG, PNG, or WebP image, no larger than 2 megabytes. You can also drag and drop a file here.
      </p>
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={removePhoto}
          className="text-destructive hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Remove photo
        </Button>
      ) : null}
      {isProcessing ? (
        <p role="status" className="text-[13px] text-muted-foreground">
          Preparing photo…
        </p>
      ) : null}
      {visibleError ? (
        <p id="photo-error" role="alert" className="text-[13px] text-destructive">
          {visibleError}
        </p>
      ) : null}
    </div>
  );
}
