import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  applyVerifiedPaymentEvent,
  PayMongoCheckoutProvider,
  PayMongoProviderError,
} from "@/services/commerce";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  const provider = new PayMongoCheckoutProvider();
  try {
    const event = await provider.verify({ body, headers: request.headers });
    if (!event) {
      return NextResponse.json(
        { received: false, error: "Invalid payment event." },
        { status: 401 },
      );
    }
    const result = await applyVerifiedPaymentEvent(event);
    if (!result.ok) {
      return NextResponse.json(
        { received: false, error: result.message },
        { status: 409 },
      );
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    logger.report(error, { at: "paymongoWebhook" });
    const retryable =
      error instanceof PayMongoProviderError && error.retryable;
    return NextResponse.json(
      { received: false, error: "Payment verification unavailable." },
      { status: retryable ? 503 : 400 },
    );
  }
}
