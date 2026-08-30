import { NextRequest, NextResponse } from "next/server";
import { routes } from "@/lib/config";
import { recordHomepageCta } from "@/services/acquisition";

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source") ?? "";
  // Count real top-level browser navigations, not prefetches or asset scanners.
  if (
    request.headers.get("sec-fetch-mode") === "navigate" &&
    request.headers.get("sec-fetch-dest") === "document"
  ) {
    await recordHomepageCta(source);
  }
  return NextResponse.redirect(new URL(routes.templates, request.url), 303);
}
