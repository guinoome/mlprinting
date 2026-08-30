import "server-only";

import { createHmac } from "node:crypto";
import { isDatabaseConfigured, prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export function requestAddress(input: Headers): string {
  return (
    input.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    input.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    input.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export async function enforcePublicRateLimit(input: {
  scope: string;
  address: string;
  limit: number;
  windowMs: number;
  now?: Date;
}) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32 || !isDatabaseConfigured()) {
    logger.error("Public rate limiter is not configured", {
      scope: input.scope,
    });
    return { allowed: false as const, retryAfterSeconds: 60 };
  }
  const now = input.now ?? new Date();
  const windowStart = new Date(
    Math.floor(now.getTime() / input.windowMs) * input.windowMs,
  );
  const expiresAt = new Date(windowStart.getTime() + input.windowMs * 2);
  const keyHash = createHmac("sha256", secret)
    .update(`${input.scope}\0${input.address}`)
    .digest("hex");
  try {
    const [, bucket] = await prisma.$transaction([
      prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: now } } }),
      prisma.rateLimitBucket.upsert({
        where: {
          scope_keyHash_windowStart: {
            scope: input.scope,
            keyHash,
            windowStart,
          },
        },
        update: { count: { increment: 1 }, expiresAt },
        create: { scope: input.scope, keyHash, windowStart, expiresAt },
      }),
    ]);
    return {
      allowed: bucket.count <= input.limit,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil(
          (windowStart.getTime() + input.windowMs - now.getTime()) / 1000,
        ),
      ),
    };
  } catch (error) {
    logger.report(error, { at: "enforcePublicRateLimit", scope: input.scope });
    return { allowed: false as const, retryAfterSeconds: 60 };
  }
}
