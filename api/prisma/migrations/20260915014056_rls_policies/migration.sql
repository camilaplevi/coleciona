-- Políticas de segurança em nível de linha (RLS).
--
-- O Prisma não gera nem versiona RLS. Este arquivo é escrito à mão e precisa
-- viver dentro de prisma/migrations para sobreviver a um `migrate reset` —
-- se ficar solto em qualquer outra pasta, ele some no primeiro reset e as
-- tabelas voltam a ficar abertas sem ninguém perceber.

-- ---------------------------------------------------------------------------
-- Quem é o usuário da transação
-- ---------------------------------------------------------------------------
-- O backend chama set_config('app.current_user_id', <id>, TRUE) no início de
-- cada transação. O TRUE limita o valor ao escopo da transação, que é o que
-- torna isso seguro com o pool de conexões do Neon: a conexão devolvida ao
-- pool não carrega o usuário da requisição anterior.
--
-- O `true` no current_setting evita erro quando a variável ainda não existe
-- (requisição sem login, como o perfil público).

CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

-- ---------------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------------

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
-- FORCE é obrigatório no Neon: você conecta como dono das tabelas, e o dono
-- ignora RLS por padrão. Sem esta linha as políticas existem e não valem nada.
ALTER TABLE "profiles" FORCE ROW LEVEL SECURITY;

CREATE POLICY "perfil visivel" ON "profiles"
  FOR SELECT USING (is_public OR id = public.current_user_id());

CREATE POLICY "cria o proprio perfil" ON "profiles"
  FOR INSERT WITH CHECK (id = public.current_user_id());

CREATE POLICY "edita o proprio perfil" ON "profiles"
  FOR UPDATE USING (id = public.current_user_id())
  WITH CHECK (id = public.current_user_id());

CREATE POLICY "apaga o proprio perfil" ON "profiles"
  FOR DELETE USING (id = public.current_user_id());

-- ---------------------------------------------------------------------------
-- Coleção
-- ---------------------------------------------------------------------------

ALTER TABLE "collection_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "collection_items" FORCE ROW LEVEL SECURITY;

-- A sua coleção sempre; a dos outros só se o perfil estiver público.
-- É esta política que faz a mesma rota servir o dono e o visitante.
CREATE POLICY "colecao visivel" ON "collection_items"
  FOR SELECT USING (
    owner_id = public.current_user_id()
    OR EXISTS (
      SELECT 1 FROM "profiles" p
      WHERE p.id = "collection_items".owner_id AND p.is_public
    )
  );

CREATE POLICY "gerencia a propria colecao" ON "collection_items"
  FOR ALL USING (owner_id = public.current_user_id())
  WITH CHECK (owner_id = public.current_user_id());

-- ---------------------------------------------------------------------------
-- Catálogo compartilhado
-- ---------------------------------------------------------------------------
-- Artistas, álbuns, estilos e séries são de todo mundo: leitura livre,
-- escrita só para quem está autenticado. Não existe papel "authenticated"
-- aqui como havia no Supabase, então a condição é ter usuário na transação.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'artists', 'albums', 'styles', 'series',
    'album_artists', 'album_styles', 'series_albums'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);

    EXECUTE format(
      'CREATE POLICY "catalogo legivel" ON %I FOR SELECT USING (true)', t);
    EXECUTE format(
      'CREATE POLICY "catalogo editavel por autenticado" ON %I
         FOR INSERT WITH CHECK (public.current_user_id() IS NOT NULL)', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Sobre a tabela "users"
-- ---------------------------------------------------------------------------
-- Ela fica de fora do RLS de propósito. O cadastro precisa inserir uma linha
-- antes de existir usuário na sessão, e um INSERT com RLS ligado e sem
-- política falharia. Como "users" nunca é exposta pela API — só o módulo de
-- autenticação a toca, e a senha vive ali em hash — a proteção é a camada de
-- aplicação. Se um dia isso incomodar, a alternativa é uma função
-- SECURITY DEFINER dedicada ao cadastro.