import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPayMongoCheckout,
  expirePayMongoCheckout,
  payMongoCheckoutUrl,
  PayMongoCheckoutProvider,
  verifyPayMongoSignature,
} from "./paymongo";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.PAYMONGO_SECRET_KEY = "sk_test_example";
  process.env.PAYMONGO_WEBHOOK_SECRET = "whsk_example";
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("PayMongo checkout", () => {
  it("creates a PHP checkout with the three requested payment methods", async () => {
    let requestedUrl = "";
    let requestedInit: RequestInit | undefined;
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      requestedUrl = String(url);
      requestedInit = init;
      return Response.json({
        data: {
          id: "cs_Example123",
          attributes: {
            checkout_url: "https://checkout.paymongo.com/cs_Example123",
          },
        },
      });
    });

    const checkout = await createPayMongoCheckout(
      {
        orderId: "126a41c2-7394-41fd-9c42-4ae14368cab4",
        orderReference: "ML-2026-0042",
        amountMinor: 125000,
        customerEmail: "customer@example.com",
        successUrl: "https://example.com/order?payment=submitted",
        cancelUrl: "https://example.com/order?payment=cancelled",
      },
      fetcher as typeof fetch,
    );

    expect(checkout.checkoutId).toBe("cs_Example123");
    expect(requestedUrl).toBe("https://api.paymongo.com/v2/checkout_sessions");
    const body = JSON.parse(String(requestedInit?.body));
    expect(body.data.attributes.payment_method_types).toEqual([
      "gcash",
      "paymaya",
      "qrph",
    ]);
    expect(body.data.attributes.line_items[0].amount).toBe(125000);
    expect(body.data.attributes.reference_number).toBe(
      "126a41c2-7394-41fd-9c42-4ae14368cab4",
    );
  });

  it("reconstructs only a valid hosted checkout URL", () => {
    expect(payMongoCheckoutUrl("cs_Example123")).toBe(
      "https://checkout.paymongo.com/cs_Example123",
    );
    expect(payMongoCheckoutUrl("https://attacker.example")).toBeNull();
  });

  it("expires an active checkout before another settlement can replace it", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 200 }));
    await expirePayMongoCheckout(
      "cs_Example123",
      fetcher as typeof fetch,
    );
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.paymongo.com/v1/checkout_sessions/cs_Example123/expire",
      expect.objectContaining({ method: "POST", cache: "no-store" }),
    );
  });
});

describe("PayMongo webhook verification", () => {
  it("checks timestamped test signatures with a timing-safe HMAC", () => {
    const body = '{"data":{"type":"checkout_session.payment.paid"}}';
    const timestamp = 1_700_000_000;
    const signature = createHmac("sha256", "whsk_example")
      .update(`${timestamp}.${body}`)
      .digest("hex");
    expect(
      verifyPayMongoSignature({
        body,
        header: `t=${timestamp},te=${signature},li=`,
        secret: "whsk_example",
        liveMode: false,
        nowSeconds: timestamp,
      }),
    ).toBe(true);
    expect(
      verifyPayMongoSignature({
        body: `${body} `,
        header: `t=${timestamp},te=${signature},li=`,
        secret: "whsk_example",
        liveMode: false,
        nowSeconds: timestamp,
      }),
    ).toBe(false);
  });

  it("retrieves the provider record before producing a captured event", async () => {
    const body = JSON.stringify({
      data: {
        type: "checkout_session.payment.paid",
        data: { id: "cs_Example123" },
      },
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", "whsk_example")
      .update(`${timestamp}.${body}`)
      .digest("hex");
    const fetcher = vi.fn(async () =>
      Response.json({
        data: {
          id: "cs_Example123",
          attributes: {
            reference_number: "126a41c2-7394-41fd-9c42-4ae14368cab4",
            payments: [
              {
                id: "pay_Example123",
                attributes: {
                  amount: 125000,
                  currency: "PHP",
                  status: "paid",
                },
              },
            ],
          },
        },
      }),
    );
    const provider = new PayMongoCheckoutProvider(fetcher as typeof fetch);
    const event = await provider.verify({
      body,
      headers: new Headers({
        "Paymongo-Signature": `t=${timestamp},te=${signature},li=`,
      }),
    });

    expect(event).toMatchObject({
      provider: "paymongo",
      providerReference: "cs_Example123",
      orderId: "126a41c2-7394-41fd-9c42-4ae14368cab4",
      status: "CAPTURED",
      amountMinor: 125000,
      currency: "PHP",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.paymongo.com/v1/checkout_sessions/cs_Example123",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});
