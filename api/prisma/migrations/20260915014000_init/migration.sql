-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "article_form" AS ENUM ('masculino', 'feminino', 'banda');

-- CreateEnum
CREATE TYPE "condition" AS ENUM ('lacrado', 'excelente', 'bom', 'regular', 'ruim');

-- CreateEnum
CREATE TYPE "album_artist_role" AS ENUM ('principal', 'participante');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "bio" TEXT,
    "avatar_url" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "favorite_item_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artists" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sort_name" TEXT NOT NULL,
    "article_form" "article_form" NOT NULL,
    "active_from" INTEGER,
    "active_to" INTEGER,
    "image_url" TEXT,

    CONSTRAINT "artists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "albums" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "sort_title" TEXT NOT NULL,
    "release_year" INTEGER,
    "label" TEXT,
    "cover_url" TEXT,
    "is_compilation" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "album_artists" (
    "album_id" UUID NOT NULL,
    "artist_id" UUID NOT NULL,
    "role" "album_artist_role" NOT NULL DEFAULT 'principal',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "album_artists_pkey" PRIMARY KEY ("album_id","artist_id")
);

-- CreateTable
CREATE TABLE "styles" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "styles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "album_styles" (
    "album_id" UUID NOT NULL,
    "style_id" UUID NOT NULL,

    CONSTRAINT "album_styles_pkey" PRIMARY KEY ("album_id","style_id")
);

-- CreateTable
CREATE TABLE "series" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_albums" (
    "series_id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "volume" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "series_albums_pkey" PRIMARY KEY ("series_id","album_id")
);

-- CreateTable
CREATE TABLE "collection_items" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "condition" "condition",
    "notes" TEXT,
    "acquired_at" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_username_key" ON "profiles"("username");

-- CreateIndex
CREATE INDEX "artists_sort_name_idx" ON "artists"("sort_name");

-- CreateIndex
CREATE INDEX "albums_sort_title_idx" ON "albums"("sort_title");

-- CreateIndex
CREATE INDEX "albums_label_idx" ON "albums"("label");

-- CreateIndex
CREATE INDEX "albums_release_year_idx" ON "albums"("release_year");

-- CreateIndex
CREATE INDEX "album_artists_artist_id_idx" ON "album_artists"("artist_id");

-- CreateIndex
CREATE UNIQUE INDEX "styles_slug_key" ON "styles"("slug");

-- CreateIndex
CREATE INDEX "album_styles_style_id_idx" ON "album_styles"("style_id");

-- CreateIndex
CREATE INDEX "series_albums_album_id_idx" ON "series_albums"("album_id");

-- CreateIndex
CREATE INDEX "collection_items_owner_id_created_at_idx" ON "collection_items"("owner_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "collection_items_owner_id_album_id_key" ON "collection_items"("owner_id", "album_id");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_favorite_item_id_fkey" FOREIGN KEY ("favorite_item_id") REFERENCES "collection_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_artists" ADD CONSTRAINT "album_artists_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_artists" ADD CONSTRAINT "album_artists_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_styles" ADD CONSTRAINT "album_styles_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_styles" ADD CONSTRAINT "album_styles_style_id_fkey" FOREIGN KEY ("style_id") REFERENCES "styles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_albums" ADD CONSTRAINT "series_albums_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_albums" ADD CONSTRAINT "series_albums_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
