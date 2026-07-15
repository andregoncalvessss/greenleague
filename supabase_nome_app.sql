-- ═══════════════════════════════════════════════════════════════════════════
-- GreenLeague — Nome da app editável (tab Definições do backoffice)
-- Correr no Supabase → SQL Editor (opcional: o backoffice cria via upsert)
-- ═══════════════════════════════════════════════════════════════════════════

-- Valor inicial do nome da app (o backoffice guarda aqui com upsert).
INSERT INTO public.configuracoes (chave, valor)
  VALUES ('nome_app', 'GREEN LEAGUE')
  ON CONFLICT (chave) DO NOTHING;

-- Nota: escolas e cursos já existem no schema; a tab Definições gere-as
-- diretamente (nenhuma migração necessária para essa parte).
