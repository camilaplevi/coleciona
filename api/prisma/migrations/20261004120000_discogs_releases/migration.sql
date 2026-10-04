-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "discogs_release_id" INTEGER;

-- CreateTable
CREATE TABLE "tracks" (
    "id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "position" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "duration" TEXT,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tracks_album_id_sort_order_idx" ON "tracks"("album_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "albums_discogs_release_id_key" ON "albums"("discogs_release_id");

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Faixas são catálogo compartilhado: leitura livre, escrita só com usuário na transação.
ALTER TABLE "tracks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tracks" FORCE ROW LEVEL SECURITY;

CREATE POLICY "catalogo legivel" ON "tracks" FOR SELECT USING (true);
CREATE POLICY "catalogo editavel por autenticado" ON "tracks"
  FOR INSERT WITH CHECK (public.current_user_id() IS NOT NULL);
