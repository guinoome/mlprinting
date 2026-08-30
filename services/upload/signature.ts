import "server-only";

import type { UploadKind } from "./types";

function begins(bytes: Uint8Array, expected: number[], offset = 0) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

/** Verify container magic before any untrusted bytes reach storage. */
export async function uploadSignatureMatches(file: File, kind: UploadKind) {
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const mime = file.type.toLowerCase();
  if (kind === "document")
    return mime === "application/pdf" && ascii(bytes, 0, 5) === "%PDF-";
  if (kind === "video") {
    if (mime === "video/webm") return begins(bytes, [0x1a, 0x45, 0xdf, 0xa3]);
    return mime === "video/mp4" && ascii(bytes, 4, 4) === "ftyp";
  }
  if (mime === "image/jpeg") return begins(bytes, [0xff, 0xd8, 0xff]);
  if (mime === "image/png")
    return begins(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mime === "image/webp")
    return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP";
  if (mime === "image/heic") {
    const brand = ascii(bytes, 8, 4);
    return (
      ascii(bytes, 4, 4) === "ftyp" &&
      ["heic", "heix", "hevc", "hevx", "mif1"].includes(brand)
    );
  }
  return false;
}
