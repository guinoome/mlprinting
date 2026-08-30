"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function LiveWallRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => router.refresh(), 15000);
    return () => window.clearInterval(timer);
  }, [enabled, router]);
  return null;
}
