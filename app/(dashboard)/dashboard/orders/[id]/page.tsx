import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { routes } from "@/lib/config";
import { getOrderForCustomer } from "@/services/orders";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ReviewControls } from "@/features/orders/components/review-controls";
import { Button } from "@/components/ui/button";
import { startPayMongoCheckoutAction } from "@/features/payments/checkout-action";
import { PaymentProofUpload } from "@/features/payments/components/payment-proof-upload";
import { isPayMongoConfigured } from "@/lib/env";
import {
  ORDER_STATUS_LABELS,
  ITEM_STATUS_LABELS,
  ITEM_KIND_LABELS,
} from "@/features/orders/labels";

export const metadata: Metadata = {
  title: "Order",
};

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { payment?: string };
}) {
  const profile = await getProfile();
  if (!profile) redirect(routes.login);

  const order = await getOrderForCustomer(profile.id, params.id);
  if (!order) notFound();
  const canPayOnline =
    isPayMongoConfigured() &&
    order.payment?.provider === "paymongo" &&
    order.payment.status === "PENDING";
  const paymentSettled =
    order.payment?.status === "CAPTURED" || order.payment?.status === "WAIVED";
  const pendingProof = order.paymentProofs.find(
    (proof) => proof.status === "PENDING",
  );

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: routes.dashboard.root },
          { label: "My Orders", href: routes.dashboard.orders },
          { label: order.reference },
        ]}
      />

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{order.reference}</h1>
        <p className="text-sm text-muted-foreground">
          {order.invitation?.title ? `${order.invitation.title} · ` : ""}
          {ORDER_STATUS_LABELS[order.status]}
        </p>
      </header>

      <section
        className="rounded-md border p-4"
        aria-labelledby="settlement-heading"
      >
        <h2 id="settlement-heading" className="font-medium">
          Payment
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {order.payment?.status === "CAPTURED"
            ? `${order.payment.currency} ${(order.payment.amountMinor / 100).toFixed(2)} verified.`
            : order.payment?.status === "WAIVED"
              ? "Payment was waived by authorized staff."
              : order.payment?.provider === "paymongo"
                ? `PHP ${(order.payment.amountMinor / 100).toFixed(2)} is awaiting payment.`
                : "Awaiting verified payment."}
        </p>
        {searchParams.payment === "submitted" ? (
          <p className="mt-3 text-sm" role="status">
            Payment was submitted. Verification can take a moment; refresh this
            page if it still shows pending.
          </p>
        ) : searchParams.payment === "cancelled" ? (
          <p className="mt-3 text-sm" role="status">
            Checkout was closed. You can continue with the same secure link.
          </p>
        ) : searchParams.payment ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            Online checkout is not available for this order yet. Please contact
            ML Printing.
          </p>
        ) : null}
        {canPayOnline ? (
          <form action={startPayMongoCheckoutAction} className="mt-4">
            <input type="hidden" name="orderId" value={order.id} />
            <Button type="submit">Pay with GCash, Maya, or QR Ph</Button>
            <p className="mt-2 text-xs text-muted-foreground">
              You will continue on PayMongo&apos;s secure checkout. ML Printing
              does not receive your wallet credentials.
            </p>
          </form>
        ) : null}
        {order.paymentProofs.length > 0 ? (
          <div className="mt-5 space-y-2 border-t pt-4">
            <h3 className="text-sm font-medium">Payment receipts</h3>
            <ul className="space-y-2 text-sm">
              {order.paymentProofs.map((proof) => (
                <li key={proof.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2">
                  <Link href={`/api/payments/proofs/${proof.id}`} target="_blank" className="max-w-[70%] truncate underline">
                    {proof.originalFilename}
                  </Link>
                  <span className={proof.status === "APPROVED" ? "text-green-700" : proof.status === "REJECTED" ? "text-destructive" : "text-amber-700"}>
                    {proof.status === "APPROVED" ? "Verified" : proof.status === "REJECTED" ? "Needs attention" : "Under review"}
                  </span>
                  {proof.reviewNote ? <p className="w-full text-xs text-muted-foreground">{proof.reviewNote}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {!paymentSettled && !pendingProof ? (
          <PaymentProofUpload orderId={order.id} />
        ) : null}
      </section>

      <ul className="space-y-4">
        {order.items.map((item) => {
          const proofReady =
            item.pdfGeneration && item.pdfGeneration.status === "READY";
          const websiteLive =
            item.kind === "WEBSITE" &&
            order.invitation?.isPublished &&
            order.invitation.slug;

          return (
            <li key={item.id} className="space-y-3 rounded-md border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {ITEM_KIND_LABELS[item.kind] ?? item.kind}
                    {item.quantity > 1 ? ` ×${item.quantity}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {ITEM_STATUS_LABELS[item.status]}
                  </p>
                </div>
              </div>

              {/* Proof: a print item shows its file, a website its live link. */}
              {proofReady ? (
                <Link
                  href={`/api/pdf/${item.pdfGeneration!.id}`}
                  className="text-sm font-medium underline"
                >
                  View proof (v{item.pdfGeneration!.version})
                </Link>
              ) : null}
              {websiteLive ? (
                <Link
                  href={routes.publicEvent(order.invitation!.slug!)}
                  className="text-sm font-medium underline"
                  target="_blank"
                >
                  View website
                </Link>
              ) : null}

              {item.status === "CUSTOMER_REVIEW" ? (
                <ReviewControls itemId={item.id} orderId={order.id} />
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
