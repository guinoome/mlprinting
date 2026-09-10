ALTER TABLE "invitations"
  ADD COLUMN "celebrantName" TEXT,
  ADD COLUMN "celebrantAge" INTEGER;

ALTER TABLE "invitations"
  ADD CONSTRAINT "invitations_celebrantAge_check"
  CHECK ("celebrantAge" IS NULL OR ("celebrantAge" BETWEEN 1 AND 120));

INSERT INTO "templates" (
  "id", "slug", "name", "shortDescription", "description", "categoryId",
  "version", "designer", "tags", "colors", "styles", "features",
  "orientation", "tier", "printCompatible", "websiteCompatible",
  "coverImageUrl", "isFeatured", "publishedAt", "useCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  'starlight-pony-dreamscape',
  'Starlight Pony Dreamscape',
  'A personal pony dreamscape for a magical birthday.',
  'A mobile-first birthday invitation built around the customer-approved celebrant portrait, with live name, age, countdown, venue, gallery, map, music, and RSVP.',
  category."id",
  '1.0.0',
  'ML Printing Studio',
  ARRAY['pony','starlight','dreamscape','children','personalized']::TEXT[],
  ARRAY['indigo','blush','gold']::TEXT[],
  ARRAY['storybook','playful','immersive']::TEXT[],
  ARRAY['rsvp','gallery','map','countdown','music']::TEXT[],
  'PORTRAIT'::"TemplateOrientation",
  'PREMIUM'::"TemplateTier",
  TRUE,
  TRUE,
  '/experiences/starlight-pony-dreamscape-catalogue.webp',
  TRUE,
  CURRENT_TIMESTAMP,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "template_categories" AS category
WHERE category."slug" = 'birthday'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "shortDescription" = EXCLUDED."shortDescription",
  "description" = EXCLUDED."description",
  "categoryId" = EXCLUDED."categoryId",
  "designer" = EXCLUDED."designer",
  "tags" = EXCLUDED."tags",
  "colors" = EXCLUDED."colors",
  "styles" = EXCLUDED."styles",
  "features" = EXCLUDED."features",
  "orientation" = EXCLUDED."orientation",
  "tier" = EXCLUDED."tier",
  "printCompatible" = EXCLUDED."printCompatible",
  "websiteCompatible" = EXCLUDED."websiteCompatible",
  "coverImageUrl" = EXCLUDED."coverImageUrl",
  "isFeatured" = EXCLUDED."isFeatured",
  "publishedAt" = COALESCE("templates"."publishedAt", EXCLUDED."publishedAt"),
  "updatedAt" = CURRENT_TIMESTAMP;
