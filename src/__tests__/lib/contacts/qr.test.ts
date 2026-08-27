import { buildQrVCard, isQrCapacityError, QR_MAX_BYTES } from "@/lib/contacts/qr";
import { buildVCard } from "@/lib/contacts/vcard";
import { makeContact } from "../../mocks/handlers";

describe("buildQrVCard", () => {
  it("keeps the complete vCard when it fits", () => {
    const contact = makeContact({ notes: "Meet at the west entrance." });

    expect(buildQrVCard(contact)).toBe(buildVCard(contact));
  });

  it("drops only the optional note when the complete vCard is too large", () => {
    const contact = makeContact({ notes: "x".repeat(10_000) });
    const qrVCard = buildQrVCard(contact);

    expect(qrVCard).not.toBeNull();
    expect(qrVCard).not.toContain("NOTE:");
    expect(qrVCard).toContain("EMAIL;TYPE=INTERNET:ada@example.com");
  });

  it("returns null when even the compact vCard exceeds capacity", () => {
    const baseAddress = makeContact().addresses[0];
    const contact = makeContact({
      notes: "x".repeat(10_000),
      addresses: Array.from({ length: 10 }, (_, index) => ({
        ...baseAddress,
        id: index + 1,
        address: "x".repeat(300),
      })),
    });

    expect(buildQrVCard(contact)).toBeNull();
    expect(QR_MAX_BYTES).toBe(2331);
  });
});

describe("isQrCapacityError", () => {
  it("recognizes deterministic encoder capacity failures", () => {
    expect(isQrCapacityError(new Error("The amount of data is too big"))).toBe(true);
    expect(isQrCapacityError(new Error("code length overflow"))).toBe(true);
    expect(isQrCapacityError(new Error("canvas unavailable"))).toBe(false);
  });
});
