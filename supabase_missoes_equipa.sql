-- ═══════════════════════════════════════════════════════════════════════════
-- GreenLeague — Missões de Equipa (meta coletiva partilhada)
-- Correr no Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Marcar um desafio do catálogo como individual ou de equipa.
--    - tipo:                 'individual' (default) | 'equipa'
--    - meta_equipa:          quantidade coletiva a atingir pela equipa
--    - xp_recompensa_equipa: XP atribuído à equipa quando a meta é alcançada
ALTER TABLE public.catalogo_acoes
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS meta_equipa integer,
  ADD COLUMN IF NOT EXISTS xp_recompensa_equipa integer;

-- 2) Registo das missões de equipa já concluídas.
--    A restrição UNIQUE garante que o XP de recompensa só é atribuído uma vez
--    por equipa/missão (idempotência).
CREATE TABLE IF NOT EXISTS public.missoes_equipa_concluidas (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  equipa_id    uuid   NOT NULL REFERENCES public.equipas(id)         ON DELETE CASCADE,
  acao_id      bigint NOT NULL REFERENCES public.catalogo_acoes(id)  ON DELETE CASCADE,
  concluida_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (equipa_id, acao_id)
);
