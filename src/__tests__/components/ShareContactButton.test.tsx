import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QRCode from "qrcode";
import ShareContactButton from "@/components/contacts/ShareContactButton";
import { makeContact } from "../mocks/handlers";

jest.mock("qrcode", () => ({
  __esModule: true,
  default: { toDataURL: jest.fn() },
}));

const toDataURL = QRCode.toDataURL as unknown as jest.Mock<Promise<string>>;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

function setNavigatorMethod(name: "share" | "canShare", value: unknown) {
  Object.defineProperty(navigator, name, {
    configurable: true,
    value,
  });
}

beforeEach(() => {
  toDataURL.mockResolvedValue("data:image/png;base64,qr-code");
  setNavigatorMethod("share", undefined);
  setNavigatorMethod("canShare", undefined);
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: jest.fn(() => "blob:contact-card"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: jest.fn(),
  });
});

afterEach(() => {
  toDataURL.mockReset();
  setNavigatorMethod("share", undefined);
  setNavigatorMethod("canShare", undefined);
  if (originalCreateObjectURL) {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectURL,
    });
  } else {
    delete (URL as { createObjectURL?: unknown }).createObjectURL;
  }
  if (originalRevokeObjectURL) {
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectURL,
    });
  } else {
    delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL;
  }
});

describe("ShareContactButton", () => {
  it("opens a Contact Passport with a QR generated from the vCard", async () => {
    const user = userEvent.setup();
    render(<ShareContactButton contact={makeContact()} photo="data:image/png;base64,photo" />);

    await user.click(screen.getByRole("button", { name: "Share Contact" }));
    const dialog = await screen.findByRole("dialog", { name: /share ada lovelace/i });

    expect(within(dialog).getByText("Contact Passport")).toBeInTheDocument();
    expect(within(dialog).getByAltText("Ada Lovelace profile photo")).toBeInTheDocument();
    expect(
      await within(dialog).findByRole("img", {
        name: "QR code for Ada Lovelace contact card",
      }),
    ).toHaveAttribute("src", "data:image/png;base64,qr-code");
    expect(toDataURL).toHaveBeenCalledWith(
      expect.stringContaining("BEGIN:VCARD"),
      expect.objectContaining({ errorCorrectionLevel: "M", width: 280 }),
    );
  });

  it("downloads the same vCard payload from the passport", async () => {
    const user = userEvent.setup();
    const anchorClick = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    render(<ShareContactButton contact={makeContact()} />);

    await user.click(screen.getByRole("button", { name: "Share Contact" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Download vCard" }));

    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(anchorClick).toHaveBeenCalled();
    expect(within(dialog).getByRole("button", { name: "Downloaded vCard" })).toBeInTheDocument();
    anchorClick.mockRestore();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<ShareContactButton contact={makeContact()} />);
    const trigger = screen.getByRole("button", { name: "Share Contact" });

    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("traps keyboard focus and redirects focus that reaches the background", async () => {
    const user = userEvent.setup();
    render(<ShareContactButton contact={makeContact()} />);

    await user.click(screen.getByRole("button", { name: "Share Contact" }));
    const dialog = await screen.findByRole("dialog");
    const closeButton = within(dialog).getByRole("button", {
      name: "Close Contact Passport",
    });
    const downloadButton = within(dialog).getByRole("button", { name: "Download vCard" });

    expect(closeButton).toHaveFocus();
    await user.tab({ shift: true });
    expect(downloadButton).toHaveFocus();
    await user.tab();
    expect(closeButton).toHaveFocus();

    const backgroundButton = document.createElement("button");
    document.body.appendChild(backgroundButton);
    backgroundButton.focus();
    expect(closeButton).toHaveFocus();
    backgroundButton.remove();
  });

  it("shows a recoverable QR error", async () => {
    const user = userEvent.setup();
    toDataURL.mockRejectedValueOnce(new Error("QR unavailable"));
    render(<ShareContactButton contact={makeContact()} />);

    await user.click(screen.getByRole("button", { name: "Share Contact" }));
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "We couldn’t generate the QR code.",
    );

    await user.click(within(dialog).getByRole("button", { name: "Try again" }));
    expect(await within(dialog).findByRole("img", { name: /qr code/i })).toBeInTheDocument();
    expect(toDataURL).toHaveBeenCalledTimes(2);
  });

  it("shows a non-retryable fallback when a valid contact exceeds QR capacity", async () => {
    const user = userEvent.setup();
    const baseAddress = makeContact().addresses[0];
    const largeContact = makeContact({
      notes: "x".repeat(10_000),
      addresses: Array.from({ length: 10 }, (_, index) => ({
        ...baseAddress,
        id: index + 1,
        address: "x".repeat(300),
      })),
    });
    render(<ShareContactButton contact={largeContact} />);

    await user.click(screen.getByRole("button", { name: "Share Contact" }));
    const dialog = await screen.findByRole("dialog");

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "This contact is too large for one QR code.",
    );
    expect(within(dialog).queryByRole("button", { name: "Try again" })).toBeNull();
    expect(toDataURL).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("button", { name: "Download vCard" })).toBeInTheDocument();
  });

  it("uses native file sharing when the browser supports it", async () => {
    const user = userEvent.setup();
    const share = jest.fn().mockResolvedValue(undefined);
    setNavigatorMethod("share", share);
    setNavigatorMethod("canShare", jest.fn(() => true));
    render(<ShareContactButton contact={makeContact()} />);

    await user.click(screen.getByRole("button", { name: "Share Contact" }));
    const dialog = await screen.findByRole("dialog");
    const shareButton = await within(dialog).findByRole("button", { name: "Share" });
    await user.click(shareButton);

    await waitFor(() =>
      expect(share).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Ada Lovelace",
          files: expect.arrayContaining([expect.any(File)]),
        }),
      ),
    );
    expect(within(dialog).getByText("Shared")).toBeInTheDocument();
  });

  it("falls back to sharing vCard text when file sharing is unavailable", async () => {
    const user = userEvent.setup();
    const share = jest.fn().mockResolvedValue(undefined);
    setNavigatorMethod("share", share);
    setNavigatorMethod("canShare", jest.fn(() => false));
    render(<ShareContactButton contact={makeContact()} />);

    await user.click(screen.getByRole("button", { name: "Share Contact" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(await within(dialog).findByRole("button", { name: "Share" }));

    await waitFor(() =>
      expect(share).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Ada Lovelace",
          text: expect.stringContaining("BEGIN:VCARD"),
        }),
      ),
    );
  });

  it("reports native share failures while leaving download available", async () => {
    const user = userEvent.setup();
    const share = jest.fn().mockRejectedValue(new Error("share denied"));
    setNavigatorMethod("share", share);
    render(<ShareContactButton contact={makeContact()} />);

    await user.click(screen.getByRole("button", { name: "Share Contact" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(await within(dialog).findByRole("button", { name: "Share" }));

    expect(await within(dialog).findByText("Share failed")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Download vCard" })).toBeInTheDocument();
  });
});
