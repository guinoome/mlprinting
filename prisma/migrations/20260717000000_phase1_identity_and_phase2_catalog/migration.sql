-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TemplateTier" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "TemplateOrientation" AS ENUM ('PORTRAIT', 'LANDSCAPE', 'SQUARE');

-- CreateEnum
CREATE TYPE "ScreenshotKind" AS ENUM ('DESKTOP', 'MOBILE', 'PRINT');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferences" (
    "profileId" UUID NOT NULL,
    "theme" "ThemePreference" NOT NULL DEFAULT 'SYSTEM',
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "marketingEmails" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preferences_pkey" PRIMARY KEY ("profileId")
);

-- CreateTable
CREATE TABLE "template_categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_collections" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "activeFrom" TIMESTAMP(3),
    "activeTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates_on_collections" (
    "templateId" UUID NOT NULL,
    "collectionId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "templates_on_collections_pkey" PRIMARY KEY ("templateId","collectionId")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" UUID NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "designer" TEXT NOT NULL,
    "tags" TEXT[],
    "colors" TEXT[],
    "styles" TEXT[],
    "features" TEXT[],
    "orientation" "TemplateOrientation" NOT NULL DEFAULT 'PORTRAIT',
    "tier" "TemplateTier" NOT NULL DEFAULT 'FREE',
    "printCompatible" BOOLEAN NOT NULL DEFAULT true,
    "websiteCompatible" BOOLEAN NOT NULL DEFAULT true,
    "coverImageUrl" TEXT NOT NULL,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "useCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_screenshots" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "kind" "ScreenshotKind" NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "template_screenshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_favorites" (
    "profileId" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_favorites_pkey" PRIMARY KEY ("profileId","templateId")
);

-- CreateTable
CREATE TABLE "template_views" (
    "profileId" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_views_pkey" PRIMARY KEY ("profileId","templateId")
);

-- CreateTable
CREATE TABLE "template_uses" (
    "profileId" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_uses_pkey" PRIMARY KEY ("profileId","templateId")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "profiles_role_idx" ON "profiles"("role");

-- CreateIndex
CREATE UNIQUE INDEX "template_categories_slug_key" ON "template_categories"("slug");

-- CreateIndex
CREATE INDEX "template_categories_isActive_sortOrder_idx" ON "template_categories"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "template_collections_slug_key" ON "template_collections"("slug");

-- CreateIndex
CREATE INDEX "templates_on_collections_collectionId_sortOrder_idx" ON "templates_on_collections"("collectionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "templates_slug_key" ON "templates"("slug");

-- CreateIndex
CREATE INDEX "templates_publishedAt_categoryId_idx" ON "templates"("publishedAt", "categoryId");

-- CreateIndex
CREATE INDEX "templates_publishedAt_tier_idx" ON "templates"("publishedAt", "tier");

-- CreateIndex
CREATE INDEX "templates_publishedAt_isFeatured_idx" ON "templates"("publishedAt", "isFeatured");

-- CreateIndex
CREATE INDEX "templates_publishedAt_useCount_idx" ON "templates"("publishedAt", "useCount");

-- CreateIndex
CREATE INDEX "templates_publishedAt_name_idx" ON "templates"("publishedAt", "name");

-- CreateIndex
CREATE INDEX "template_screenshots_templateId_kind_sortOrder_idx" ON "template_screenshots"("templateId", "kind", "sortOrder");

-- CreateIndex
CREATE INDEX "template_favorites_profileId_createdAt_idx" ON "template_favorites"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "template_views_profileId_viewedAt_idx" ON "template_views"("profileId", "viewedAt");

-- CreateIndex
CREATE INDEX "template_uses_profileId_usedAt_idx" ON "template_uses"("profileId", "usedAt");

-- AddForeignKey
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates_on_collections" ADD CONSTRAINT "templates_on_collections_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates_on_collections" ADD CONSTRAINT "templates_on_collections_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "template_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "template_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_screenshots" ADD CONSTRAINT "template_screenshots_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_favorites" ADD CONSTRAINT "template_favorites_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_favorites" ADD CONSTRAINT "template_favorites_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_views" ADD CONSTRAINT "template_views_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_views" ADD CONSTRAINT "template_views_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_uses" ADD CONSTRAINT "template_uses_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_uses" ADD CONSTRAINT "template_uses_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

