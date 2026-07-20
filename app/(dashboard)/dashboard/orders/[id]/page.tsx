import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { routes } from "@/lib/config";
import { getOrderForCustomer } from "@/services/orders";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ReviewControls } from "@/features/orders/components/review-controls";
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
}: {
  params: { id: string };
}) {
  const profile = await getProfile();
  if (!profile) redirect(routes.login);

  const order = await getOrderForCustomer(profile.id, params.id);
  if (!order) notFound();

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
        <p className="text-muted-foreground text-sm">
          {order.invitation?.title ? `${order.invitation.title} · ` : ""}
          {ORDER_STATUS_LABELS[order.status]}
        </p>
      </header>

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
                  <p className="text-muted-foreground text-sm">
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
