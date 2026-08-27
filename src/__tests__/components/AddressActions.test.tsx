import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddressActions from "@/components/contacts/AddressActions";
import { makeContact } from "../mocks/handlers";

describe("AddressActions", () => {
  it("links to encoded directions and copies a readable address", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const address = makeContact().addresses[0];

    render(<AddressActions address={address} />);

    expect(screen.getByRole("link", { name: /open in maps/i })).toHaveAttribute(
      "href",
      "https://www.google.com/maps/dir/?api=1&destination=San%20Francisco%2C%20CA%2C%20USA",
    );
    await userEvent.click(screen.getByRole("button", { name: /copy home address/i }));

    expect(writeText).toHaveBeenCalledWith("San Francisco, CA, USA");
    expect(screen.getByText("Copied")).toBeInTheDocument();
  });

  it("reports clipboard failures without throwing", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockRejectedValue(new Error("denied")) },
    });
    render(<AddressActions address={makeContact().addresses[0]} />);

    await userEvent.click(screen.getByRole("button", { name: /copy home address/i }));

    expect(screen.getByText("Copy failed")).toBeInTheDocument();
  });

  it("omits actions when an address has no searchable details", () => {
    render(
      <AddressActions
        address={{
          ...makeContact().addresses[0],
          address: null,
          city: null,
          state: null,
          postal_code: null,
          country: null,
        }}
      />,
    );

    expect(screen.queryByRole("link", { name: /maps/i })).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
