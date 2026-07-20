import type { BoardItem } from "@/services/orders";
import { MoveControl } from "./board-column";

const KIND_LABELS: Record<string, string> = {
  INVITATION_PRINT: "Invitation print",
  WEBSITE: "Website",
  REPRINT: "Reprint",
  OTHER: "Other",
};

const PRIORITY_STYLES: Record<string, string> = {
  URGENT: "bg-destructive/10 text-destructive",
  HIGH: "bg-amber-100 text-amber-900",
  NORMAL: "bg-muted text-muted-foreground",
  LOW: "bg-muted text-muted-foreground",
};

export function ItemCard({ item }: { item: BoardItem }) {
  const customer = item.order.profile.displayName ?? item.order.profile.email;

  return (
    <article className="bg-background space-y-2 rounded-md border p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{KIND_LABELS[item.kind] ?? item.kind}</span>
        <span
          className={`rounded px-1.5 py-0.5 text-xs ${PRIORITY_STYLES[item.priority] ?? ""}`}
        >
          {item.priority.toLowerCase()}
        </span>
      </div>

      <p className="text-muted-foreground">
        {item.order.reference} · {customer}
      </p>

      {item.order.invitation ? (
        <p className="text-muted-foreground truncate">
          {item.order.invitation.title}
        </p>
      ) : null}

      <p className="text-muted-foreground text-xs">
        {item.quantity > 1 ? `×${item.quantity} · ` : ""}
        {item.dueDate ? `due ${item.dueDate.toLocaleDateString()}` : "no due date"}
        {item.assignedTo
          ? ` · ${item.assignedTo.displayName ?? item.assignedTo.email}`
          : " · unassigned"}
      </p>

      {item.notes ? <p className="text-muted-foreground">{item.notes}</p> : null}

      <MoveControl itemId={item.id} current={item.status} />
    </article>
  );
}
