import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env, isPayMongoConfigured } from "@/lib/env";
import type { PaymentProvider, VerifiedPaymentEvent } from "./types";

const API_URL = "https://api.paymongo.com";
const PAYMENT_METHODS = ["gcash", "paymaya", "qrph"] as const;

const checkoutResponseSchema = z.object({
  data: z.object({
    id: z.string().startsWith("cs_"),
    attributes: z.object({ checkout_url: z.string().url() }).passthrough(),
  }),
});

const checkoutResourceSchema = z.object({
  data: z.object({
    id: z.string().startsWith("cs_"),
    attributes: z
      .object({
        reference_number: z.string().uuid(),
        payments: z.array(
          z.object({
            id: z.string().startsWith("pay_"),
            attributes: z
              .object({
                amount: z.number().int().positive(),
                currency: z.string().length(3),
                status: z.string(),
              })
              .passthrough(),
          }),
        ),
      })
      .passthrough(),
  }),
});

const currentWebhookSchema = z.object({
  data: z.object({
    type: z.literal("checkout_session.payment.paid"),
    data: z.object({ id: z.string().startsWith("cs_") }).passthrough(),
  }),
});

const legacyWebhookSchema = z.object({
  data: z.object({
    attributes: z.object({
      type: z.literal("checkout_session.payment.paid"),
      data: z.object({ id: z.string().startsWith("cs_") }).passthrough(),
    }),
  }),
});

export class PayMongoProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "PayMongoProviderError";
  }
}

function basicAuth() {
  return `Basic ${Buffer.from(`${env.paymongo.secretKey}:`, "utf8").toString("base64")}`;
}

export interface PayMongoCheckout {
  checkoutId: string;
  redirectUrl: string;
}

export function payMongoCheckoutUrl(checkoutId: string) {
  if (!/^cs_[A-Za-z0-9]+$/.test(checkoutId)) return null;
  return `https://checkout.paymongo.com/${checkoutId}`;
}

export async function createPayMongoCheckout(
  input: {
    orderId: string;
    orderReference: string;
    amountMinor: number;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
  },
  fetcher: typeof fetch = fetch,
): Promise<PayMongoCheckout> {
  if (!isPayMongoConfigured()) {
    throw new PayMongoProviderError("PayMongo is not configured.", false);
  }
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 100) {
    throw new PayMongoProviderError("The checkout amount is invalid.", false);
  }

  const response = await fetcher(`${API_URL}/v2/checkout_sessions`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/json",
      "Idempotency-Key": `ml-dep-${input.orderId}-${input.amountMinor}`,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          billing: { email: input.customerEmail },
          cancel_url: input.cancelUrl,
          description: `ML Printing invitation order ${input.orderReference}`,
          line_items: [
            {
              name: `Invitation order ${input.orderReference}`,
              amount: input.amountMinor,
              currency: "PHP",
              quantity: 1,
            },
          ],
          metadata: { order_reference: input.orderReference },
          payment_method_types: PAYMENT_METHODS,
          reference_number: input.orderId,
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          success_url: input.successUrl,
        },
      },
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new PayMongoProviderError(
      `PayMongo could not create checkout (${response.status}).`,
      response.status >= 500 || response.status === 429,
    );
  }
  const parsed = checkoutResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new PayMongoProviderError(
      "PayMongo returned an invalid checkout response.",
      false,
    );
  }
  return {
    checkoutId: parsed.data.data.id,
    redirectUrl: parsed.data.data.attributes.checkout_url,
  };
}

export async function expirePayMongoCheckout(
  checkoutId: string,
  fetcher: typeof fetch = fetch,
) {
  if (!isPayMongoConfigured()) {
    throw new PayMongoProviderError("PayMongo is not configured.", false);
  }
  if (!payMongoCheckoutUrl(checkoutId)) {
    throw new PayMongoProviderError("The checkout reference is invalid.", false);
  }
  const response = await fetcher(
    `${API_URL}/v1/checkout_sessions/${encodeURIComponent(checkoutId)}/expire`,
    {
      method: "POST",
      headers: {
        Authorization: basicAuth(),
        "Idempotency-Key": `ml-dep-expire-${checkoutId}`,
      },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new PayMongoProviderError(
      `PayMongo could not expire checkout (${response.status}).`,
      response.status >= 500 || response.status === 429,
    );
  }
}

function signatureParts(header: string) {
  return Object.fromEntries(
    header.split(",").map((part) => {
      const [key, ...value] = part.trim().split("=");
      return [key, value.join("=")];
    }),
  );
}

export function verifyPayMongoSignature(input: {
  body: string;
  header: string;
  secret: string;
  liveMode: boolean;
  nowSeconds?: number;
}) {
  const parts = signatureParts(input.header);
  const timestamp = Number(parts.t);
  const received = input.liveMode ? parts.li : parts.te;
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (
    !Number.isSafeInteger(timestamp) ||
    Math.abs(now - timestamp) > 300 ||
    !received
  ) {
    return false;
  }
  const expected = createHmac("sha256", input.secret)
    .update(`${timestamp}.${input.body}`)
    .digest("hex");
  const expectedBytes = Buffer.from(expected, "utf8");
  const receivedBytes = Buffer.from(received, "utf8");
  return (
    expectedBytes.length === receivedBytes.length &&
    timingSafeEqual(expectedBytes, receivedBytes)
  );
}

function webhookCheckoutId(payload: unknown) {
  const current = currentWebhookSchema.safeParse(payload);
  if (current.success) return current.data.data.data.id;
  const legacy = legacyWebhookSchema.safeParse(payload);
  return legacy.success ? legacy.data.data.attributes.data.id : null;
}

async function retrieveCheckout(
  checkoutId: string,
  fetcher: typeof fetch,
): Promise<VerifiedPaymentEvent | null> {
  const response = await fetcher(
    `${API_URL}/v1/checkout_sessions/${encodeURIComponent(checkoutId)}`,
    { headers: { Authorization: basicAuth() }, cache: "no-store" },
  );
  if (!response.ok) {
    if (response.status === 400 || response.status === 404) return null;
    throw new PayMongoProviderError(
      `PayMongo checkout verification failed (${response.status}).`,
      response.status >= 500 || response.status === 429,
    );
  }
  const parsed = checkoutResourceSchema.safeParse(await response.json());
  if (!parsed.success || parsed.data.data.id !== checkoutId) return null;
  const payment = parsed.data.data.attributes.payments.find(
    (candidate) => candidate.attributes.status === "paid",
  );
  if (!payment) return null;
  return {
    provider: "paymongo",
    providerReference: checkoutId,
    orderId: parsed.data.data.attributes.reference_number,
    status: "CAPTURED",
    amountMinor: payment.attributes.amount,
    currency: payment.attributes.currency.toUpperCase(),
    verifiedAt: new Date(),
  };
}

export class PayMongoCheckoutProvider implements PaymentProvider {
  readonly id = "paymongo";

  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async verify(input: {
    body: string;
    headers: Headers;
  }): Promise<VerifiedPaymentEvent | null> {
    if (!isPayMongoConfigured()) {
      throw new PayMongoProviderError("PayMongo is not configured.", false);
    }
    let payload: unknown;
    try {
      payload = JSON.parse(input.body);
    } catch {
      return null;
    }
    const checkoutId = webhookCheckoutId(payload);
    if (!checkoutId) return null;
    const header =
      input.headers.get("paymongo-signature") ??
      input.headers.get("x-paymongo-signature") ??
      "";
    const liveMode = env.paymongo.secretKey.startsWith("sk_live_");
    if (
      !verifyPayMongoSignature({
        body: input.body,
        header,
        secret: env.paymongo.webhookSecret,
        liveMode,
      })
    ) {
      return null;
    }
    return retrieveCheckout(checkoutId, this.fetcher);
  }
}
