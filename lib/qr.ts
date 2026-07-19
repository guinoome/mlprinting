import QRCode from "qrcode";

/**
 * QR code generation — Ph5.md §5 (Deliverable 7). A thin wrapper over the
 * `qrcode` package (MIT-licensed, free, no network call, no paid service) so
 * the route handler doesn't reach for a third-party encoder directly.
 */
export async function generateQrPng(text: string): Promise<Buffer> {
  return QRCode.toBuffer(text, {
    type: "png",
    width: 512,
    margin: 2,
  });
}
