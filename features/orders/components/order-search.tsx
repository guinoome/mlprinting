"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "INQUIRY", label: "Inquiry" },
  { value: "QUOTATION", label: "Quotation" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "CANCELLED", label: "Cancelled" },
];

/**
 * Staff order search — Ph7.md §13. A GET form: the query lives in the URL, so a
 * filtered view is shareable and the back button behaves. Server-rendered
 * results, no client fetching.
 */
export function OrderSearch() {
  const router = useRouter();
  const params = useSearchParams();

  function update(next: URLSearchParams) {
    const query = next.toString();
    router.push(query ? `?${query}` : "?");
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    const q = String(form.get("q") ?? "").trim();
    const status = String(form.get("status") ?? "");
    if (q) next.set("q", q);
    if (status) next.set("status", status);
    update(next);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <Input
        name="q"
        defaultValue={params.get("q") ?? ""}
        placeholder="Reference or customer…"
        className="max-w-xs"
      />
      <select
        name="status"
        defaultValue={params.get("status") ?? ""}
        className="border-input bg-background h-10 rounded-md border px-3 text-sm"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="bg-primary text-primary-foreground h-10 rounded-md px-4 text-sm font-medium"
      >
        Search
      </button>
    </form>
  );
}
