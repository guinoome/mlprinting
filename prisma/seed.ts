import { PrismaClient } from "@prisma/client";
import { placeholderUrl } from "../lib/placeholder-art";
import { CATEGORIES, COLLECTIONS, TEMPLATES } from "./seed-data";

/**
 * Seeds the template catalog — Ph2.md §1.
 *
 * Idempotent: every write is an upsert keyed on a slug, so running this twice
 * changes nothing the second time. A seed that duplicates its own rows is a
 * seed nobody dares run against a database that already has data.
 *
 * Deliberately does NOT seed profiles. Identities live in Supabase auth.users,
 * and inventing rows here would create profiles with no login behind them.
 */

const prisma = new PrismaClient();

/** Resolve "days ago" to an absolute date, so seeded data ages correctly relative to now. */
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/** Turn a "MM-DD" window bound into a date in the current year. */
function seasonBound(monthDay: string | null): Date | null {
  if (!monthDay) return null;
  const [month, day] = monthDay.split("-").map(Number);
  return new Date(new Date().getFullYear(), (month ?? 1) - 1, day ?? 1);
}

async function main() {
  console.log("Seeding template catalog…");

  const categoryIds = new Map<string, string>();
  for (const category of CATEGORIES) {
    const row = await prisma.templateCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
      },
      create: category,
    });
    categoryIds.set(category.slug, row.id);
  }
  console.log(`  ${CATEGORIES.length} categories`);

  const collectionIds = new Map<string, string>();
  for (const collection of COLLECTIONS) {
    const row = await prisma.templateCollection.upsert({
      where: { slug: collection.slug },
      update: {
        name: collection.name,
        description: collection.description,
        activeFrom: seasonBound(collection.activeFrom),
        activeTo: seasonBound(collection.activeTo),
      },
      create: {
        slug: collection.slug,
        name: collection.name,
        description: collection.description,
        activeFrom: seasonBound(collection.activeFrom),
        activeTo: seasonBound(collection.activeTo),
      },
    });
    collectionIds.set(collection.slug, row.id);
  }
  console.log(`  ${COLLECTIONS.length} collections`);

  for (const template of TEMPLATES) {
    const categoryId = categoryIds.get(template.category);
    if (!categoryId) {
      throw new Error(
        `Template "${template.slug}" names category "${template.category}", which is not seeded.`,
      );
    }

    const categoryName = CATEGORIES.find(
      (c) => c.slug === template.category,
    )!.name;

    // publishedDaysAgo < 0 is the "never published" sentinel — see seed-data.ts.
    const publishedAt =
      template.publishedDaysAgo < 0 ? null : daysAgo(template.publishedDaysAgo);

    const fields = {
      name: template.name,
      shortDescription: template.shortDescription,
      description: template.description,
      categoryId,
      designer: template.designer,
      tags: template.tags,
      colors: template.colors,
      styles: template.styles,
      features: template.features,
      orientation: template.orientation,
      tier: template.tier,
      printCompatible: template.printCompatible,
      websiteCompatible: template.websiteCompatible,
      isFeatured: template.isFeatured,
      publishedAt,
      useCount: template.useCount,
      coverImageUrl: placeholderUrl(
        "cover",
        template.slug,
        template.name,
        categoryName,
      ),
    };

    const row = await prisma.template.upsert({
      where: { slug: template.slug },
      update: fields,
      create: { slug: template.slug, ...fields },
    });

    // Screenshots are replaced wholesale rather than upserted: they have no
    // natural key, and generating a stable one for placeholder art would be
    // inventing identity for something that is about to be thrown away.
    await prisma.templateScreenshot.deleteMany({
      where: { templateId: row.id },
    });
    await prisma.templateScreenshot.createMany({
      data: [
        {
          templateId: row.id,
          kind: "DESKTOP" as const,
          url: placeholderUrl(
            "desktop",
            `${template.slug}-desktop`,
            template.name,
            "Desktop",
          ),
          alt: `${template.name} shown as a desktop website layout`,
          sortOrder: 0,
        },
        {
          templateId: row.id,
          kind: "MOBILE" as const,
          url: placeholderUrl(
            "mobile",
            `${template.slug}-mobile`,
            template.name,
            "Mobile",
          ),
          alt: `${template.name} shown as a mobile website layout`,
          sortOrder: 0,
        },
        {
          templateId: row.id,
          kind: "PRINT" as const,
          url: placeholderUrl(
            "print",
            `${template.slug}-print`,
            template.name,
            "Print",
          ),
          alt: `${template.name} shown as a printed invitation`,
          sortOrder: 0,
        },
      ],
    });

    for (const collectionSlug of template.collections ?? []) {
      const collectionId = collectionIds.get(collectionSlug);
      if (!collectionId) {
        throw new Error(
          `Template "${template.slug}" names collection "${collectionSlug}", which is not seeded.`,
        );
      }

      await prisma.templateOnCollection.upsert({
        where: {
          templateId_collectionId: { templateId: row.id, collectionId },
        },
        update: {},
        create: { templateId: row.id, collectionId },
      });
    }
  }

  const published = TEMPLATES.filter((t) => t.publishedDaysAgo >= 0).length;
  console.log(`  ${TEMPLATES.length} templates (${published} published)`);
  console.log("Done.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
