"use server";

import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { routes } from "@/lib/config";
import { env, isPayMongoConfigured } from "@/lib/env";
import {
  bindOnlinePaymentReference,
  createPayMongoCheckout,
  getCustomerOnlineSettlement,
  payMongoCheckoutUrl,
} from "@/services/commerce";

function orderPaymentReturn(orderId: string, state: string) {
  const url = new URL(routes.dashboard.order(orderId), env.app.url);
  url.searchParams.set("payment", state);
  return url.toString();
}

export async function startPayMongoCheckoutAction(formData: FormData) {
  const profile = await getProfile();
  if (!profile) redirect(routes.login);
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) redirect(routes.dashboard.orders);
  if (!isPayMongoConfigured()) {
    redirect(orderPaymentReturn(orderId, "unavailable"));
  }

  const order = await getCustomerOnlineSettlement(profile.id, orderId);
  if (
    !order?.payment ||
    order.payment.provider !== "paymongo" ||
    order.payment.status !== "PENDING" ||
    order.payment.currency !== "PHP"
  ) {
    redirect(orderPaymentReturn(orderId, "not-ready"));
  }

  const existingUrl = order.payment.providerReference
    ? payMongoCheckoutUrl(order.payment.providerReference)
    : null;
  if (existingUrl) redirect(existingUrl);

  let checkout;
  try {
    checkout = await createPayMongoCheckout({
      orderId: order.id,
      orderReference: order.reference,
      amountMinor: order.payment.amountMinor,
      customerEmail: profile.email,
      successUrl: orderPaymentReturn(order.id, "submitted"),
      cancelUrl: orderPaymentReturn(order.id, "cancelled"),
    });
  } catch {
    redirect(orderPaymentReturn(orderId, "unavailable"));
  }
  const bound = await bindOnlinePaymentReference({
    profileId: profile.id,
    orderId: order.id,
    providerReference: checkout.checkoutId,
  });
  if (!bound) redirect(orderPaymentReturn(orderId, "unavailable"));
  redirect(checkout.redirectUrl);
}
