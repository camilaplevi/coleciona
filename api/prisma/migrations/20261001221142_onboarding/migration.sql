-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "onboarded_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "profile_styles" (
    "profile_id" UUID NOT NULL,
    "style_id" UUID NOT NULL,

    CONSTRAINT "profile_styles_pkey" PRIMARY KEY ("profile_id","style_id")
);

-- CreateTable
CREATE TABLE "profile_artists" (
    "profile_id" UUID NOT NULL,
    "artist_id" UUID NOT NULL,

    CONSTRAINT "profile_artists_pkey" PRIMARY KEY ("profile_id","artist_id")
);

-- CreateIndex
CREATE INDEX "profile_styles_style_id_idx" ON "profile_styles"("style_id");

-- CreateIndex
CREATE INDEX "profile_artists_artist_id_idx" ON "profile_artists"("artist_id");

-- AddForeignKey
ALTER TABLE "profile_styles" ADD CONSTRAINT "profile_styles_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_styles" ADD CONSTRAINT "profile_styles_style_id_fkey" FOREIGN KEY ("style_id") REFERENCES "styles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_artists" ADD CONSTRAINT "profile_artists_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_artists" ADD CONSTRAINT "profile_artists_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
