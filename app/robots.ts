import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/templates", "/invite-preview", "/e/"],
      disallow: [
        "/admin/",
        "/dashboard/",
        "/builder/",
        "/api/",
        "/go/",
        "/login",
        "/register",
      ],
    },
    sitemap: `${env.app.url}/sitemap.xml`,
  };
}
