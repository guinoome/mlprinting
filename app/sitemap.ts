import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { getCatalogPage } from "@/features/template-marketplace/repository";
import { parseCriteria } from "@/features/template-marketplace/criteria";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.app.url;
  const page = await getCatalogPage({ ...parseCriteria({}), perPage: 100 });
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/templates`, changeFrequency: "daily", priority: 0.9 },
    ...page.templates.map((template) => ({
      url: `${base}/templates/${template.slug}`,
      lastModified: template.publishedAt ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
