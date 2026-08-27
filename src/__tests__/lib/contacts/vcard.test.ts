import { buildVCard } from "@/lib/contacts/vcard";

describe("buildVCard", () => {
  it("includes contact fields and typed addresses with CRLF line endings", () => {
    const card = buildVCard({
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.com",
      phone: "+1-415-555-0101",
      company: "Analytical Engines",
      job_title: "Mathematician",
      notes: "Met at the\nhackathon.",
      addresses: [
        {
          id: 1,
          type: "Home",
          address: "123 Market St",
          city: "San Francisco",
          state: "CA",
          postal_code: "94105",
          country: "USA",
        },
        {
          id: 2,
          type: "Work",
          address: "1 Hacker Way",
          city: "Menlo Park",
          state: "CA",
          postal_code: "94025",
          country: "USA",
        },
      ],
    });

    expect(card).toContain("BEGIN:VCARD\r\nVERSION:3.0");
    expect(card).toContain("N:Lovelace;Ada;;;");
    expect(card).toContain("ADR;TYPE=HOME:;;123 Market St;San Francisco;CA;94105;USA");
    expect(card).toContain("ADR;TYPE=WORK:;;1 Hacker Way;Menlo Park;CA;94025;USA");
    expect(card).toContain("NOTE:Met at the\\nhackathon.");
    expect(card.endsWith("END:VCARD\r\n")).toBe(true);
  });

  it("escapes vCard separators in user values", () => {
    const card = buildVCard({
      first_name: "Grace",
      last_name: "Hopper",
      email: "grace@example.com",
      phone: null,
      company: "Navy, Research; Lab",
      job_title: null,
      notes: "Use \\ carefully",
      addresses: [],
    });

    expect(card).toContain("ORG:Navy\\, Research\\; Lab");
    expect(card).toContain("NOTE:Use \\\\ carefully");
  });
});
