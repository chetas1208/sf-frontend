"use client";

import {
  useActionState,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, X } from "lucide-react";
import Field from "@/components/ui/Field";
import Button, { buttonClasses } from "@/components/ui/Button";
import ContactPhotoField from "@/components/contacts/ContactPhotoField";
import {
  CONTACT_FIELD_GROUPS,
} from "@/lib/contacts/schema";
import {
  EMPTY_FORM_STATE,
  ADDRESS_TYPES,
  type AddressInput,
  type AddressType,
  type Contact,
  type ContactInput,
  type FormState,
} from "@/lib/contacts/types";

export type ContactFormAction = (
  state: FormState,
  formData: FormData,
) => Promise<FormState>;

type AddressFormValue = AddressInput & { key: string };

const ADDRESS_CONTROL =
  "w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground transition-colors focus:border-primary focus:bg-input";

function addressFormValue(address: AddressInput, key: string): AddressFormValue {
  return { ...address, key };
}

function SubmitButton({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || disabled}>
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
  const [photoInvalid, setPhotoInvalid] = useState(false);
  const addressKeyRef = useRef(0);
  const [addresses, setAddresses] = useState<AddressFormValue[]>(() =>
    (contact?.addresses ?? []).map((address) =>
      addressFormValue(address, `existing-${address.id}`),
    ),
  );

  function valueFor(name: Exclude<keyof ContactInput, "addresses">): string {
    return state.values?.[name] ?? contact?.[name] ?? "";
  }

  function addAddress() {
    const key = `new-${addressKeyRef.current++}`;
    setAddresses((current) => [
      ...current,
      addressFormValue(
        {
          type: "Home",
          address: null,
          city: null,
          state: null,
          postal_code: null,
          country: null,
        },
        key,
      ),
    ]);
  }

  function removeAddress(key: string) {
    setAddresses((current) => current.filter((address) => address.key !== key));
  }

  function updateAddress(
    key: string,
    field: keyof AddressInput,
    value: string | AddressType | null,
  ) {
    setAddresses((current) =>
      current.map((address) =>
        address.key === key ? { ...address, [field]: value } : address,
      ),
    );
  }

  const addressPayload = addresses.map((address) => ({
    type: address.type,
    address: address.address,
    city: address.city,
    state: address.state,
    postal_code: address.postal_code,
    country: address.country,
  }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (photoInvalid) event.preventDefault();
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className="space-y-8">
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

        <ContactPhotoField
          value={photo}
          contact={{
            first_name: valueFor("first_name"),
            last_name: valueFor("last_name"),
            email: valueFor("email"),
          }}
          error={state.fieldErrors?.photo}
          onChange={setPhoto}
          onValidityChange={(isValid) => setPhotoInvalid(!isValid)}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="sr-only">Addresses</legend>
        <div className="border-b border-hairline pb-2">
          <h2 className="font-display text-sm font-semibold text-foreground">
            Addresses
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Add zero or more postal addresses for this contact.
          </p>
        </div>

        <input
          type="hidden"
          name="addresses"
          value={JSON.stringify(addressPayload)}
          readOnly
        />

        {addresses.length ? (
          <div className="space-y-4">
            {addresses.map((address, index) => (
              <div
                key={address.key}
                className="space-y-4 rounded-lg border border-border bg-card/40 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-sm font-semibold text-foreground">
                    Address {index + 1}
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAddress(address.key)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    Remove address
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`address-${address.key}-type`}
                      className="mb-1.5 block text-[13px] font-medium text-foreground"
                    >
                      Type
                    </label>
                    <select
                      id={`address-${address.key}-type`}
                      value={address.type}
                      onChange={(event) =>
                        updateAddress(
                          address.key,
                          "type",
                          event.target.value as AddressType,
                        )
                      }
                      className={ADDRESS_CONTROL}
                    >
                      {ADDRESS_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(
                    [
                      ["address", "Street address", "street-address"],
                      ["city", "City", "address-level2"],
                      ["state", "State / region", "address-level1"],
                      ["postal_code", "Postal code", "postal-code"],
                      ["country", "Country", "country-name"],
                    ] as const
                  ).map(([field, label, autoComplete]) => (
                    <div key={field} className={field === "address" ? "sm:col-span-2" : undefined}>
                      <label
                        htmlFor={`address-${address.key}-${field}`}
                        className="mb-1.5 block text-[13px] font-medium text-foreground"
                      >
                        {label}
                      </label>
                      <input
                        id={`address-${address.key}-${field}`}
                        type="text"
                        value={address[field] ?? ""}
                        maxLength={
                          field === "address"
                            ? 300
                            : field === "city" || field === "state" || field === "country"
                              ? 120
                              : 20
                        }
                        autoComplete={autoComplete}
                        onChange={(event) =>
                          updateAddress(address.key, field, event.target.value || null)
                        }
                        className={ADDRESS_CONTROL}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
            No addresses added.
          </p>
        )}

        {state.fieldErrors?.addresses ? (
          <p role="alert" className="text-[13px] text-destructive">
            {state.fieldErrors.addresses}
          </p>
        ) : null}

        <Button type="button" variant="secondary" onClick={addAddress}>
          + Add another address
        </Button>
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
        <SubmitButton label={submitLabel} disabled={photoInvalid} />
        <Link href={cancelHref} className={buttonClasses("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
