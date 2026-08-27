import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactForm from "@/components/contacts/ContactForm";
import { PHOTO_MAX_BYTES } from "@/lib/contacts/schema";
import { makeContact } from "../mocks/handlers";
import type { FormState } from "@/lib/contacts/types";

function renderForm(action: jest.Mock, contact?: ReturnType<typeof makeContact>) {
  return render(
    <ContactForm
      action={action as never}
      contact={contact}
      submitLabel="Create contact"
      cancelHref="/contacts"
    />,
  );
}

describe("ContactForm", () => {
  it("renders every editable field", () => {
    renderForm(jest.fn());

    expect(screen.getByLabelText(/first name/i)).toBeRequired();
    expect(screen.getByLabelText(/last name/i)).toBeRequired();
    expect(screen.getByLabelText(/^email/i)).toBeRequired();
    expect(screen.getByLabelText(/phone/i)).not.toBeRequired();
    expect(screen.getByLabelText(/notes/i).tagName).toBe("TEXTAREA");
  });

  it("prefills from an existing contact", () => {
    renderForm(jest.fn(), makeContact());

    expect(screen.getByLabelText(/first name/i)).toHaveValue("Ada");
    expect(screen.getByLabelText(/^email/i)).toHaveValue("ada@example.com");
    expect(screen.getByRole("combobox", { name: "Type" })).toHaveValue("Home");
    expect(screen.getByLabelText("City")).toHaveValue("San Francisco");
  });

  it("previews and submits a supported photo", async () => {
    const action = jest.fn<Promise<FormState>, [FormState, FormData]>(
      async () => ({ status: "idle" }),
    );
    renderForm(action, makeContact());

    const file = new File([new Uint8Array([137, 80, 78, 71])], "avatar.png", {
      type: "image/png",
    });
    await userEvent.upload(screen.getByLabelText(/choose photo/i), file);

    expect(await screen.findByAltText("Ada Lovelace profile photo")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(String(action.mock.calls[0][1].get("photo"))).toMatch(
      /^data:image\/png;base64,/,
    );
  });

  it("accepts a supported photo dropped on the dropzone", async () => {
    renderForm(jest.fn(), makeContact());
    const file = new File([new Uint8Array([137, 80, 78, 71])], "avatar.png", {
      type: "image/png",
    });
    const dropzone = screen.getByText(/drop a photo here/i).closest("label");

    expect(dropzone).not.toBeNull();
    fireEvent.drop(dropzone!, { dataTransfer: { files: [file] } });

    expect(await screen.findByAltText("Ada Lovelace profile photo")).toBeInTheDocument();
  });

  it("rejects unsupported and oversized photos", async () => {
    renderForm(jest.fn(), makeContact());
    const user = userEvent.setup({ applyAccept: false });
    const input = screen.getByLabelText(/choose photo/i);

    const unsupported = new File(["gif"], "avatar.gif", { type: "image/gif" });
    await user.upload(input, unsupported);
    expect(await screen.findByRole("alert")).toHaveTextContent(/jpeg, png, or webp/i);

    const oversized = new File([new Uint8Array(PHOTO_MAX_BYTES + 1)], "large.png", {
      type: "image/png",
    });
    await user.upload(input, oversized);
    expect(await screen.findByRole("alert")).toHaveTextContent(/2 mb or smaller/i);
  });

  it("blocks submit after an invalid photo until it is removed or replaced", async () => {
    const action = jest.fn<Promise<FormState>, [FormState, FormData]>(
      async () => ({ status: "idle" }),
    );
    renderForm(action, makeContact({ photo: "data:image/png;base64,iVBORw0KGgo=" }));
    const user = userEvent.setup({ applyAccept: false });

    await user.upload(
      screen.getByLabelText(/choose photo/i),
      new File(["gif"], "avatar.gif", { type: "image/gif" }),
    );
    await user.click(screen.getByRole("button", { name: /create contact/i }));

    expect(action).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /remove photo/i }));
    await user.click(screen.getByRole("button", { name: /create contact/i }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(action.mock.calls[0][1].get("photo")).toBe("");
  });

  it("removes an existing photo before submit", async () => {
    const action = jest.fn<Promise<FormState>, [FormState, FormData]>(
      async () => ({ status: "idle" }),
    );
    renderForm(action, makeContact({ photo: "data:image/png;base64,iVBORw0KGgo=" }));

    expect(screen.getByAltText("Ada Lovelace profile photo")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /remove photo/i }));
    expect(screen.queryByAltText("Ada Lovelace profile photo")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(action.mock.calls[0][1].get("photo")).toBe("");
  });

  it("carries an existing photo through an unrelated edit", async () => {
    const action = jest.fn<Promise<FormState>, [FormState, FormData]>(
      async () => ({ status: "idle" }),
    );
    renderForm(action, makeContact({ photo: "data:image/jpeg;base64,/9j/4AAQ" }));

    await userEvent.clear(screen.getByLabelText(/company/i));
    await userEvent.type(screen.getByLabelText(/company/i), "Updated Engines");
    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));
    await waitFor(() => expect(action).toHaveBeenCalled());

    expect(action.mock.calls[0][1].get("photo")).toBe("data:image/jpeg;base64,/9j/4AAQ");
  });

  it("adds, edits, removes, and submits multiple addresses", async () => {
    const action = jest.fn<Promise<FormState>, [FormState, FormData]>(
      async () => ({ status: "idle" }),
    );
    renderForm(action, makeContact({ addresses: [] }));

    expect(screen.getByText("No addresses added.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /add another address/i }));
    await userEvent.click(screen.getByRole("button", { name: /add another address/i }));

    const types = screen.getAllByRole("combobox");
    expect(types).toHaveLength(2);
    await userEvent.selectOptions(types[1], "Work");
    const streets = screen.getAllByLabelText("Street address");
    await userEvent.type(streets[1], "1 Hacker Way");
    await userEvent.click(screen.getAllByRole("button", { name: /remove address/i })[0]);

    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(JSON.parse(String(action.mock.calls[0][1].get("addresses")))).toEqual([
      expect.objectContaining({ type: "Work", address: "1 Hacker Way" }),
    ]);
  });

  it("submits the entered values to the action", async () => {
    const action = jest.fn<Promise<FormState>, [FormState, FormData]>(
      async () => ({ status: "idle" }),
    );
    renderForm(action);

    await userEvent.type(screen.getByLabelText(/first name/i), "Grace");
    await userEvent.type(screen.getByLabelText(/last name/i), "Hopper");
    await userEvent.type(screen.getByLabelText(/^email/i), "grace@example.com");
    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));

    await waitFor(() => expect(action).toHaveBeenCalled());

    const formData = action.mock.calls[0][1];
    expect(formData.get("first_name")).toBe("Grace");
    expect(formData.get("email")).toBe("grace@example.com");
  });

  it("shows the summary and the per-field errors the action returns", async () => {
    const action = jest.fn(
      async (): Promise<FormState> => ({
        status: "error",
        message: "That email address is already taken.",
        fieldErrors: { email: "This email is already in use." },
        values: { first_name: "Grace" },
      }),
    );
    renderForm(action);

    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.map((node) => node.textContent)).toEqual(
      expect.arrayContaining([
        "That email address is already taken.",
        "This email is already in use.",
      ]),
    );
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("links back out without submitting", () => {
    renderForm(jest.fn());
    expect(screen.getByRole("link", { name: /cancel/i })).toHaveAttribute(
      "href",
      "/contacts",
    );
  });
});
