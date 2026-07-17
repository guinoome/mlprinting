"use client";

import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useNotifications, notify } from "@/lib/hooks/use-toast";
import type { NotificationLevel } from "@/lib/notifications/store";

const ICONS: Record<NotificationLevel, React.ReactNode> = {
  success: <CheckCircle2 className="size-5 text-success" />,
  warning: <AlertTriangle className="size-5 text-warning" />,
  error: <XCircle className="size-5 text-destructive" />,
  info: <Info className="size-5 text-info" />,
};

/**
 * Renders the notification store — Ph1.md §7. Mounted once in the root layout.
 *
 * Errors are announced assertively so a screen reader interrupts; the rest are
 * polite. Colour alone never carries the level — each toast has an icon too.
 */
export function Toaster() {
  const notifications = useNotifications();

  return (
    <ToastProvider>
      {notifications.map(({ id, level, title, description, duration }) => (
        <Toast
          key={id}
          variant={level}
          duration={duration ?? Infinity}
          type={level === "error" ? "foreground" : "background"}
          onOpenChange={(open) => {
            if (!open) notify.dismiss(id);
          }}
        >
          <span aria-hidden="true" className="mt-0.5 shrink-0">
            {ICONS[level]}
          </span>
          <div className="grid gap-1">
            <ToastTitle>{title}</ToastTitle>
            {description ? (
              <ToastDescription>{description}</ToastDescription>
            ) : null}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
