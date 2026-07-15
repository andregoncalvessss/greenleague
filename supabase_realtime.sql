-- ═══════════════════════════════════════════════════════════════════════════
-- GreenLeague — Ativar Supabase Realtime nas tabelas usadas para live updates
-- Correr no Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Necessário para:
--  • Nome da app E cores da app mudarem em tempo real quando editados na tab
--    Aparência do backoffice (ambos guardados em configuracoes).
--  • Utilizador ser reenviado ao onboarding em tempo real quando o admin
--    remove a sua escola/curso (que lhe limpa escola_id/curso_id).
--
-- Se der erro "is already member of publication", ignora — já estava ativo.

ALTER PUBLICATION supabase_realtime ADD TABLE public.configuracoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.utilizadores;

-- Nota: sem isto, a app continua a atualizar ao voltar ao primeiro plano
-- (foreground) ou ao navegar entre ecrãs — só perde a atualização instantânea
-- enquanto está parada no mesmo ecrã.
