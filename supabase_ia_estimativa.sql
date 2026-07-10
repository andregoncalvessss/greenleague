-- ═══════════════════════════════════════════════════════════════════════════
-- GreenLeague — Estimativa de impacto por IA (Gemini)
-- Correr no Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Colunas extra na submissão para guardar a análise da IA + a unidade escolhida.
--    - estimado_por_ia: os valores co2_atribuido/agua_atribuida vieram da IA?
--    - ia_justificacao: explicação curta devolvida pelo modelo (auditoria).
--    - unidade_medida:  unidade que o utilizador escolheu ao submeter (ex: "garrafa grande").
ALTER TABLE public.submissoes_acao
  ADD COLUMN IF NOT EXISTS estimado_por_ia boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ia_justificacao text,
  ADD COLUMN IF NOT EXISTS unidade_medida text;

-- 2) Toggle global no backoffice (mesma tabela do 'aprovacao_automatica').
--    'true'  → a app pede à IA para estimar CO₂/água ao submeter.
--    'false' → usa a estimativa manual do catálogo (comportamento original).
INSERT INTO public.configuracoes (chave, valor)
  VALUES ('ia_estimativa_ativa', 'false')
  ON CONFLICT (chave) DO NOTHING;
