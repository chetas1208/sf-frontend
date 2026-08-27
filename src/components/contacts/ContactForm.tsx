"use client";

import {
  useActionState,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, ImagePlus, Loader2, X } from "lucide-react";
import Field from "@/components/ui/Field";
import Button, { buttonClasses } from "@/components/ui/Button";
import ContactAvatar from "@/components/contacts/ContactAvatar";
import {
  CONTACT_FIELD_GROUPS,
  PHOTO_MAX_BYTES,
} from "@/lib/contacts/schema";
import {
  EMPTY_FORM_STATE,
  type Contact,
  type ContactInput,
  type FormState,
} from "@/lib/contacts/types";

export type ContactFormAction = (
  state: FormState,
  formData: FormData,
) => Promise<FormState>;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      {pending ? "Saving…" : label}
    </Button>
  );
}

/**
 * Create/edit form. The field list comes from `CONTACT_FIELD_GROUPS`, and the
 * action is a bound server action — so a submit is a plain POST that works
 * before hydration and reports errors through `useActionState`.
 */
export default function ContactForm({
  action,
  contact,
  submitLabel,
  cancelHref,
}: {
  action: ContactFormAction;
  contact?: Contact;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  const [photo, setPhoto] = useState<string | null>(contact?.photo ?? null);
  const [photoError, setPhotoError] = useState<string>();
  const photoInputRef = useRef<HTMLInputElement>(null);

  function valueFor(name: keyof ContactInput): string {
    return state.values?.[name] ?? contact?.[name] ?? "";
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoError("Choose a JPEG, PNG, or WebP image.");
      event.currentTarget.value = "";
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setPhotoError("Photo must be 2 MB or smaller.");
      event.currentTarget.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setPhotoError("That photo could not be read. Choose another file.");
        return;
      }
      setPhoto(reader.result);
      setPhotoError(undefined);
    };
    reader.onerror = () => {
      setPhotoError("That photo could not be read. Choose another file.");
    };
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhoto(null);
    setPhotoError(undefined);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  const photoFieldError = photoError ?? state.fieldErrors?.photo;
  const previewContact = {
    first_name: valueFor("first_name"),
    last_name: valueFor("last_name"),
    email: valueFor("email"),
    photo,
  };

  return (
    <form action={formAction} noValidate className="space-y-8">
      <input type="hidden" name="photo" value={photo ?? ""} readOnly />
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-foreground"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            strokeWidth={2}
            aria-hidden="true"
          />
          <span>{state.message}</span>
        </div>
      ) : null}

      <fieldset className="space-y-4">
        <legend className="sr-only">Profile photo</legend>
        <div className="border-b border-hairline pb-2">
          <h2 className="font-display text-sm font-semibold text-foreground">
            Profile photo
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Add a photo to make this contact easy to recognise.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <ContactAvatar contact={previewContact} size="lg" />
          <div className="space-y-2">
            <input
              ref={photoInputRef}
              id="photo-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handlePhotoChange}
              aria-describedby="photo-help photo-error"
            />
            <label htmlFor="photo-upload" className={buttonClasses("secondary")}>
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              {photo ? "Replace photo" : "Choose photo"}
            </label>
            <p id="photo-help" className="text-[13px] text-muted-foreground">
              JPEG, PNG or WebP · max 2 MB
            </p>
            {photo ? (
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
            {photoFieldError ? (
              <p id="photo-error" role="alert" className="text-[13px] text-destructive">
                {photoFieldError}
              </p>
            ) : null}
          </div>
        </div>
      </fieldset>

      {CONTACT_FIELD_GROUPS.map((group) => (
        <fieldset key={group.title} className="space-y-4">
          <legend className="sr-only">{group.title}</legend>

          <div className="border-b border-hairline pb-2">
            <h2 className="font-display text-sm font-semibold text-foreground">
              {group.title}
            </h2>
            <p className="text-[13px] text-muted-foreground">
              {group.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map((field) => (
              <Field
                key={field.name}
                field={field}
                defaultValue={valueFor(field.name)}
                error={state.fieldErrors?.[field.name]}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center gap-2 border-t border-hairline pt-4">
        <SubmitButton label={submitLabel} />
        <Link href={cancelHref} className={buttonClasses("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
