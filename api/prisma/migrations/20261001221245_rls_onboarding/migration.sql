-- Políticas de RLS para as tabelas de preferências do onboarding.
--
-- Mesmo princípio das demais: escrito à mão porque o Prisma não versiona RLS,
-- e dentro de prisma/migrations para sobreviver a um `migrate reset`.

ALTER TABLE "profile_styles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profile_styles" FORCE ROW LEVEL SECURITY;

ALTER TABLE "profile_artists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profile_artists" FORCE ROW LEVEL SECURITY;

-- Leitura segue a mesma regra da coleção: as suas sempre, as dos outros só
-- se o perfil for público. Os estilos e artistas preferidos aparecem na
-- página pública, então não são segredo — mas de um perfil privado, são.
CREATE POLICY "preferencias de estilo visiveis" ON "profile_styles"
  FOR SELECT USING (
    profile_id = public.current_user_id()
    OR EXISTS (
      SELECT 1 FROM "profiles" p
      WHERE p.id = "profile_styles".profile_id AND p.is_public
    )
  );

CREATE POLICY "gerencia as proprias preferencias de estilo" ON "profile_styles"
  FOR ALL USING (profile_id = public.current_user_id())
  WITH CHECK (profile_id = public.current_user_id());

CREATE POLICY "preferencias de artista visiveis" ON "profile_artists"
  FOR SELECT USING (
    profile_id = public.current_user_id()
    OR EXISTS (
      SELECT 1 FROM "profiles" p
      WHERE p.id = "profile_artists".profile_id AND p.is_public
    )
  );

CREATE POLICY "gerencia as proprias preferencias de artista" ON "profile_artists"
  FOR ALL USING (profile_id = public.current_user_id())
  WITH CHECK (profile_id = public.current_user_id());
