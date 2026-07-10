-- ═══════════════════════════════════════════════════════════════════════════
-- GreenLeague — Configuração por desafio: unidades permitidas + tipo de impacto
-- Correr no Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- unidades_permitidas: lista de unidades que o utilizador pode escolher ao
--                      submeter este desafio. NULL/vazia = todas permitidas.
-- impacto:             que métricas o desafio contabiliza —
--                      'co2' | 'agua' | 'ambos' (default).
ALTER TABLE public.catalogo_acoes
  ADD COLUMN IF NOT EXISTS unidades_permitidas text[],
  ADD COLUMN IF NOT EXISTS impacto text NOT NULL DEFAULT 'ambos';
