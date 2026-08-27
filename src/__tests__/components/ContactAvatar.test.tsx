import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ContactAvatar from "@/components/contacts/ContactAvatar";
import { makeContact } from "../mocks/handlers";

describe("ContactAvatar", () => {
  it("keeps the initials fallback when no photo is present", () => {
    render(<ContactAvatar contact={makeContact({ photo: null })} />);

    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders a photo with an accessible contact-based alt", () => {
    render(
      <ContactAvatar
        contact={makeContact({ photo: "data:image/jpeg;base64,/9j/4AAQ" })}
      />,
    );

    expect(screen.getByRole("img", { name: "Ada Lovelace profile photo" })).toHaveAttribute(
      "src",
      "data:image/jpeg;base64,/9j/4AAQ",
    );
  });

  it("falls back to initials when a stored photo cannot load", () => {
    render(
      <ContactAvatar
        contact={makeContact({ photo: "data:image/jpeg;base64,/9j/4AAQ" })}
      />,
    );

    fireEvent.error(screen.getByRole("img"));

    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
