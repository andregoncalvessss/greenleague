import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, FlatList, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BackofficeLayout from "../../components/BackofficeLayout";
import Pagination from "../../components/Pagination";
import { supabase } from "../../src/lib/supabase";
import { useToast } from "../../components/ToastProvider";
import { useTheme } from "../../components/ThemeProvider";
import { Type } from "../../constants/typography";

const MISSOES_EQUIPA_PER_PAGE = 8;

// SQL necessário (correr no Supabase SQL Editor):
// CREATE TABLE public.missoes_semanais (
//   id uuid NOT NULL DEFAULT gen_random_uuid(),
//   acao_id integer NOT NULL REFERENCES public.catalogo_acoes(id) ON DELETE CASCADE,
//   dia_semana smallint NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
//   xp_bonus integer DEFAULT 0,
//   ordem smallint DEFAULT 0,
//   ativa boolean DEFAULT true,
//   CONSTRAINT missoes_semanais_pkey PRIMARY KEY (id),
//   CONSTRAINT missoes_semanais_unique UNIQUE (acao_id, dia_semana)
// );

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const DIAS_CURTO = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export default function MissoesBackoffice() {
  const { colors, isDark } = useTheme();
  const C = { green: colors.primary, red: colors.red, yellow: colors.yellow, teal: colors.secondary, bg: colors.bg, card: colors.card, border: colors.border, text: colors.text, muted: colors.textMuted, dim: colors.textDim, isDark };
  const s = useMemo(() => makeStyles(C), [colors, isDark]);
  const { showToast } = useToast();
  const [diaAtivo, setDiaAtivo] = useState<number>(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1; // índice 0–6 (0=Seg)
  });
  const [missoesPorDia, setMissoesPorDia] = useState<Record<number, any[]>>({});
  const [acoesCatalogo, setAcoesCatalogo] = useState<any[]>([]);
  const [tabelaExiste, setTabelaExiste] = useState(true);
  const [modalAdicionar, setModalAdicionar] = useState(false);
  const [pesquisaModal, setPesquisaModal] = useState("");
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState<"individual" | "equipa">("individual");
  const [missoesEquipa, setMissoesEquipa] = useState<any[]>([]);
  const [totalEquipas, setTotalEquipas] = useState(0);
  const [paginaEquipa, setPaginaEquipa] = useState(0);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);

    // Só ações individuais podem ser missões semanais — as de equipa são geridas à parte
    const { data: acoes } = await supabase
      .from("catalogo_acoes")
      .select("id, titulo, xp_base, co2_estimado, categorias_acao(nome, cor_hex)")
      .eq("ativo", true)
      .neq("tipo", "equipa")
      .order("titulo");
    setAcoesCatalogo(acoes || []);

    // Missões de equipa (meta coletiva, definidas no Catálogo de Desafios)
    const { data: equipaData } = await supabase
      .from("catalogo_acoes")
      .select("id, titulo, descricao, unidade_medida, meta_equipa, xp_recompensa_equipa, ativo, categorias_acao(nome, cor_hex), missoes_equipa_concluidas(count)")
      .eq("tipo", "equipa")
      .order("id");
    setMissoesEquipa(equipaData || []);

    const { count: nEquipas } = await supabase.from("equipas").select("*", { count: "exact", head: true });
    setTotalEquipas(nEquipas || 0);

    const { data, error } = await supabase
      .from("missoes_semanais")
      .select("id, dia_semana, xp_bonus, ordem, ativa, catalogo_acoes(id, titulo, xp_base, co2_estimado, categorias_acao(nome, cor_hex))")
      .order("ordem", { ascending: true });

    if (error?.code === "42P01") {
      setTabelaExiste(false);
      setLoading(false);
      return;
    }

    setTabelaExiste(true);
    const mapa: Record<number, any[]> = {};
    for (let i = 0; i < 7; i++) mapa[i] = [];
    (data || []).forEach((m: any) => {
      const idx = m.dia_semana - 1; // DB: 1=Seg → índice 0
      if (!mapa[idx]) mapa[idx] = [];
      mapa[idx].push(m);
    });
    setMissoesPorDia(mapa);
    setLoading(false);
  }

  async function adicionarMissao(acao: any) {
    const dia = diaAtivo + 1; // índice → DB (1–7)
    const jaExiste = (missoesPorDia[diaAtivo] || []).some((m: any) => m.catalogo_acoes?.id === acao.id);
    if (jaExiste) { showToast({ type: 'warning', message: 'Esta ação já está neste dia.' }); return; }
    const ordem = (missoesPorDia[diaAtivo] || []).length;
    const { error } = await supabase.from("missoes_semanais").insert({
      acao_id: acao.id, dia_semana: dia, xp_bonus: 0, ordem, ativa: true,
    });
    if (error) { showToast({ type: 'error', message: 'Erro ao adicionar: ' + error.message }); return; }
    setModalAdicionar(false);
    setPesquisaModal("");
    carregar();
  }

  async function remover(id: string) {
    await supabase.from("missoes_semanais").delete().eq("id", id);
    carregar();
  }

  async function toggleAtiva(id: string, atual: boolean) {
    await supabase.from("missoes_semanais").update({ ativa: !atual }).eq("id", id);
    carregar();
  }

  async function alterarOrdem(id: string, diaMissoes: any[], index: number, direcao: "up" | "down") {
    const novaOrdem = [...diaMissoes];
    const swapIdx = direcao === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= novaOrdem.length) return;
    [novaOrdem[index], novaOrdem[swapIdx]] = [novaOrdem[swapIdx], novaOrdem[index]];
    await Promise.all(novaOrdem.map((m, i) =>
      supabase.from("missoes_semanais").update({ ordem: i }).eq("id", m.id)
    ));
    carregar();
  }

  // Atualiza o XP bónus localmente enquanto o admin escreve (input controlado).
  function atualizarXpBonusLocal(id: string, valor: string) {
    const digits = valor.replace(/[^0-9]/g, "");
    const xp = digits === "" ? 0 : parseInt(digits);
    setMissoesPorDia(prev => {
      const copia = { ...prev };
      copia[diaAtivo] = (copia[diaAtivo] || []).map(m => m.id === id ? { ...m, xp_bonus: xp } : m);
      return copia;
    });
  }

  // Persiste o valor atual (chamado ao sair do campo).
  async function guardarXpBonus(id: string) {
    const m = (missoesPorDia[diaAtivo] || []).find(x => x.id === id);
    if (!m) return;
    await supabase.from("missoes_semanais").update({ xp_bonus: m.xp_bonus || 0 }).eq("id", id);
  }

  async function toggleAtivaEquipa(id: number, atual: boolean) {
    await supabase.from("catalogo_acoes").update({ ativo: !atual }).eq("id", id);
    carregar();
  }

  const missoesDiaAtivo = missoesPorDia[diaAtivo] || [];
  const acoesFiltradas = acoesCatalogo.filter(a =>
    a.titulo.toLowerCase().includes(pesquisaModal.toLowerCase()) &&
    !missoesDiaAtivo.some((m: any) => m.catalogo_acoes?.id === a.id)
  );

  if (!tabelaExiste) {
    return (
      <BackofficeLayout>
        <Text style={s.title}>Missões Semanais</Text>
        <Text style={s.subtitle}>Controla quais os desafios que aparecem aos utilizadores em cada dia da semana.</Text>
        <View style={s.alertBox}>
          <Ionicons name="warning-outline" size={32} color={C.yellow} />
          <Text style={s.alertTitle}>Tabela "missoes_semanais" não existe</Text>
          <Text style={s.alertText}>Corre o seguinte SQL no Supabase SQL Editor para ativar esta funcionalidade:</Text>
          <View style={s.codeBox}>
            <Text style={s.code}>{`CREATE TABLE public.missoes_semanais (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  acao_id integer NOT NULL REFERENCES public.catalogo_acoes(id) ON DELETE CASCADE,
  dia_semana smallint NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
  xp_bonus integer DEFAULT 0,
  ordem smallint DEFAULT 0,
  ativa boolean DEFAULT true,
  CONSTRAINT missoes_semanais_pkey PRIMARY KEY (id),
  CONSTRAINT missoes_semanais_unique UNIQUE (acao_id, dia_semana)
);

ALTER TABLE public.missoes_semanais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública das missões"
  ON public.missoes_semanais FOR SELECT USING (true);
CREATE POLICY "Admins gerem missões"
  ON public.missoes_semanais FOR ALL
  USING (true) WITH CHECK (true);`}</Text>
          </View>
          <TouchableOpacity style={s.btnPrimary} onPress={carregar}>
            <Ionicons name="refresh" size={16} color={isDark ? "#000" : "#FFF"} />
            <Text style={s.btnPrimaryText}>Verificar novamente</Text>
          </TouchableOpacity>
        </View>
      </BackofficeLayout>
    );
  }

  const totalMissoes = Object.values(missoesPorDia).reduce((acc, arr) => acc + arr.length, 0);
  const diasComMissoes = Object.values(missoesPorDia).filter(arr => arr.length > 0).length;

  const totalPaginasEquipa = Math.ceil(missoesEquipa.length / MISSOES_EQUIPA_PER_PAGE);
  const missoesEquipaPagina = missoesEquipa.slice(paginaEquipa * MISSOES_EQUIPA_PER_PAGE, (paginaEquipa + 1) * MISSOES_EQUIPA_PER_PAGE);

  return (
    <BackofficeLayout>
      <View style={s.headerRow}>
        <View>
          <Text style={s.title}>{vista === "equipa" ? "Missões de Equipa" : "Missões Semanais"}</Text>
          <Text style={s.subtitle}>
            {vista === "equipa"
              ? "Metas coletivas que as equipas completam em conjunto para ganhar XP de equipa."
              : "Define quais os desafios que aparecem a todos os utilizadores em cada dia da semana."}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={s.segment}>
            <TouchableOpacity
              style={[s.segmentBtn, vista === "individual" && s.segmentBtnActive]}
              onPress={() => setVista("individual")}
            >
              <Ionicons name="person-outline" size={14} color={vista === "individual" ? (isDark ? "#000" : "#FFF") : C.muted} />
              <Text style={[s.segmentText, vista === "individual" && s.segmentTextActive]}>Individuais</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.segmentBtn, vista === "equipa" && s.segmentBtnActive]}
              onPress={() => setVista("equipa")}
            >
              <Ionicons name="people-outline" size={14} color={vista === "equipa" ? (isDark ? "#000" : "#FFF") : C.muted} />
              <Text style={[s.segmentText, vista === "equipa" && s.segmentTextActive]}>De Equipa</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.refreshBtn} onPress={carregar}>
            <Ionicons name="refresh-outline" size={18} color={C.green} />
          </TouchableOpacity>
        </View>
      </View>

      {vista === "individual" ? (
      <View style={s.statsRow}>
        <Stat title="Total Missões" value={totalMissoes} icon="ribbon" color={C.green} />
        <Stat title="Dias Configurados" value={diasComMissoes} icon="calendar" color={C.teal} />
        <Stat title="Missões Hoje" value={missoesDiaAtivo.length} icon="today" color={C.yellow} />
        <Stat title="Ativas Hoje" value={missoesDiaAtivo.filter(m => m.ativa).length} icon="checkmark-circle" color={C.green} />
      </View>
      ) : (
      <View style={s.statsRow}>
        <Stat title="Missões de Equipa" value={missoesEquipa.length} icon="people" color={C.green} />
        <Stat title="Ativas" value={missoesEquipa.filter(m => m.ativo).length} icon="checkmark-circle" color={C.green} />
        <Stat title="Conclusões" value={missoesEquipa.reduce((acc, m) => acc + (m.missoes_equipa_concluidas?.[0]?.count || 0), 0)} icon="trophy" color={C.yellow} />
        <Stat title="Equipas na Liga" value={totalEquipas} icon="shield" color={C.teal} />
      </View>
      )}

      {/* ── VISTA MISSÕES DE EQUIPA ── */}
      {vista === "equipa" && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View>
              <Text style={s.sectionTitle}>Missões de Equipa</Text>
              <Text style={s.sectionSub}>
                Criadas no Catálogo de Desafios com o tipo "Missão de Equipa". Aqui podes ativar/desativar e acompanhar conclusões.
              </Text>
            </View>
          </View>

          {missoesEquipa.length === 0 && (
            <View style={s.emptyState}>
              <Ionicons name="people-outline" size={48} color="#333" />
              <Text style={s.emptyStateText}>Nenhuma missão de equipa criada</Text>
              <Text style={s.emptyStateSub}>Vai ao Catálogo de Desafios e cria um desafio com o tipo "Missão de Equipa".</Text>
            </View>
          )}

          {missoesEquipaPagina.map((m: any) => {
            const conclusoes = m.missoes_equipa_concluidas?.[0]?.count || 0;
            const pctEquipas = totalEquipas > 0 ? Math.round((conclusoes / totalEquipas) * 100) : 0;
            return (
              <View key={m.id} style={[s.missaoCard, !m.ativo && s.missaoCardInativa]}>
                <View style={[s.catDot, { backgroundColor: m.categorias_acao?.cor_hex || "#4CFF3B" }]} />

                <View style={{ flex: 1 }}>
                  <Text style={s.missaoTitulo}>{m.titulo}</Text>
                  <View style={s.missaoMeta}>
                    <Text style={s.missaoCategoria}>{m.categorias_acao?.nome || "Sem categoria"}</Text>
                    <Text style={s.missaoCO2}>Meta: {m.meta_equipa ?? "—"} {m.unidade_medida || "unidades"}</Text>
                  </View>
                </View>

                <View style={s.xpTotalBox}>
                  <Ionicons name="trophy-outline" size={13} color={C.green} />
                  <Text style={s.xpTotal}>+{m.xp_recompensa_equipa || 0} XP</Text>
                </View>

                <View style={{ alignItems: "center", minWidth: 90 }}>
                  <Text style={{ color: C.yellow, fontSize: 16, fontWeight: "900" }}>{conclusoes}/{totalEquipas}</Text>
                  <Text style={{ color: C.dim, fontSize: 10 }}>equipas concluíram ({pctEquipas}%)</Text>
                </View>

                <View style={s.cardActions}>
                  <View style={{ alignItems: "center", gap: 4 }}>
                    <Switch
                      value={m.ativo}
                      onValueChange={() => toggleAtivaEquipa(m.id, m.ativo)}
                      trackColor={{ false: C.border, true: C.green }}
                      style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                    />
                    <Text style={[s.switchLabel, { color: m.ativo ? C.green : C.dim }]}>
                      {m.ativo ? "Ativa" : "Inativa"}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          <Pagination page={paginaEquipa} totalPages={totalPaginasEquipa} onChange={setPaginaEquipa} />
        </View>
      )}

      {vista === "individual" && (
      <>
      {/* TABS DIAS DA SEMANA */}
      <View style={s.dayTabsContainer}>
        {DIAS.map((dia, i) => {
          const count = (missoesPorDia[i] || []).length;
          const isHoje = new Date().getDay() === (i === 6 ? 0 : i + 1);
          return (
            <TouchableOpacity
              key={i}
              style={[s.dayTab, diaAtivo === i && s.dayTabActive, isHoje && s.dayTabHoje]}
              onPress={() => setDiaAtivo(i)}
            >
              <Text style={[s.dayTabText, diaAtivo === i && s.dayTabTextActive]}>{DIAS_CURTO[i]}</Text>
              {count > 0 && (
                <View style={[s.dayCount, diaAtivo === i && s.dayCountActive]}>
                  <Text style={[s.dayCountText, diaAtivo === i && s.dayCountTextActive]}>{count}</Text>
                </View>
              )}
              {isHoje && <View style={s.hojeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* PAINEL DO DIA ATIVO */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <View>
            <Text style={s.sectionTitle}>{DIAS[diaAtivo]}</Text>
            <Text style={s.sectionSub}>{missoesDiaAtivo.length} missão(ões) configurada(s)</Text>
          </View>
          <TouchableOpacity style={s.btnPrimary} onPress={() => setModalAdicionar(true)}>
            <Ionicons name="add" size={18} color={isDark ? "#000" : "#FFF"} />
            <Text style={s.btnPrimaryText}>Adicionar Missão</Text>
          </TouchableOpacity>
        </View>

        {loading && <Text style={s.emptyText}>A carregar...</Text>}

        {!loading && missoesDiaAtivo.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons name="ribbon-outline" size={48} color="#333" />
            <Text style={s.emptyStateText}>Nenhuma missão para {DIAS[diaAtivo]}</Text>
            <Text style={s.emptyStateSub}>Clica em "Adicionar Missão" para configurar este dia.</Text>
          </View>
        )}

        {missoesDiaAtivo.map((m: any, i: number) => {
          const acao = m.catalogo_acoes;
          const xpTotal = (acao?.xp_base || 0) + (m.xp_bonus || 0);
          return (
            <View key={m.id} style={[s.missaoCard, !m.ativa && s.missaoCardInativa]}>
              <View style={s.ordemBtns}>
                <TouchableOpacity onPress={() => alterarOrdem(m.id, missoesDiaAtivo, i, "up")} disabled={i === 0}>
                  <Ionicons name="chevron-up" size={18} color={i === 0 ? "#333" : "#888"} />
                </TouchableOpacity>
                <Text style={s.ordemNum}>{i + 1}</Text>
                <TouchableOpacity onPress={() => alterarOrdem(m.id, missoesDiaAtivo, i, "down")} disabled={i === missoesDiaAtivo.length - 1}>
                  <Ionicons name="chevron-down" size={18} color={i === missoesDiaAtivo.length - 1 ? "#333" : "#888"} />
                </TouchableOpacity>
              </View>

              <View style={[s.catDot, { backgroundColor: acao?.categorias_acao?.cor_hex || "#4CFF3B" }]} />

              <View style={{ flex: 1 }}>
                <Text style={s.missaoTitulo}>{acao?.titulo || "—"}</Text>
                <View style={s.missaoMeta}>
                  <Text style={s.missaoCategoria}>{acao?.categorias_acao?.nome || "Sem categoria"}</Text>
                  <Text style={s.missaoCO2}>CO₂: {acao?.co2_estimado || 0} kg/un</Text>
                </View>
              </View>

              <View style={s.xpBonusGroup}>
                <Text style={s.xpBonusLabel}>XP Bónus</Text>
                <TextInput
                  style={s.xpBonusInput}
                  value={String(m.xp_bonus ?? 0)}
                  keyboardType="numeric"
                  onChangeText={(t) => atualizarXpBonusLocal(m.id, t)}
                  onBlur={() => guardarXpBonus(m.id)}
                  selectTextOnFocus
                />
              </View>

              <View style={s.xpTotalBox}>
                <Text style={s.xpBase}>{acao?.xp_base || 0}</Text>
                <Text style={s.xpSeparator}>+</Text>
                <Text style={s.xpBonus}>{m.xp_bonus || 0}</Text>
                <Text style={s.xpEquals}>=</Text>
                <Text style={s.xpTotal}>{xpTotal} XP</Text>
              </View>

              <View style={s.cardActions}>
                <View style={{ alignItems: "center", gap: 4 }}>
                  <Switch
                    value={m.ativa}
                    onValueChange={() => toggleAtiva(m.id, m.ativa)}
                    trackColor={{ false: C.border, true: C.green }}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                  <Text style={[s.switchLabel, { color: m.ativa ? C.green : C.dim }]}>
                    {m.ativa ? "Ativa" : "Inativa"}
                  </Text>
                </View>
                <TouchableOpacity style={s.btnRemover} onPress={() => remover(m.id)}>
                  <Ionicons name="trash-outline" size={16} color={C.red} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* VISÃO GERAL SEMANAL */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Visão Geral da Semana</Text>
        <View style={s.weekGrid}>
          {DIAS.map((dia, i) => {
            const missoes = missoesPorDia[i] || [];
            const isHoje = new Date().getDay() === (i === 6 ? 0 : i + 1);
            return (
              <TouchableOpacity key={i} style={[s.weekCell, isHoje && s.weekCellHoje]} onPress={() => setDiaAtivo(i)}>
                <Text style={[s.weekDia, isHoje && s.weekDiaHoje]}>{DIAS_CURTO[i]}</Text>
                <Text style={s.weekCount}>{missoes.length}</Text>
                <Text style={s.weekLabel}>missão(ões)</Text>
                <View style={s.weekMissoesPreview}>
                  {missoes.slice(0, 3).map((m: any) => (
                    <View key={m.id} style={[s.weekMissaoDot, { backgroundColor: m.catalogo_acoes?.categorias_acao?.cor_hex || "#4CFF3B", opacity: m.ativa ? 1 : 0.3 }]} />
                  ))}
                  {missoes.length > 3 && <Text style={s.weekMais}>+{missoes.length - 3}</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      </>
      )}

      {/* MODAL ADICIONAR */}
      <Modal visible={modalAdicionar} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Adicionar Missão — {DIAS[diaAtivo]}</Text>
              <TouchableOpacity onPress={() => { setModalAdicionar(false); setPesquisaModal(""); }}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={s.modalSearch}
              value={pesquisaModal}
              onChangeText={setPesquisaModal}
              placeholder="Pesquisar desafios..."
              placeholderTextColor="#777"
              autoFocus
            />
            {acoesFiltradas.length === 0 ? (
              <Text style={s.emptyText}>
                {pesquisaModal ? "Nenhum desafio encontrado." : "Todos os desafios ativos já estão neste dia."}
              </Text>
            ) : (
              <FlatList
                data={acoesFiltradas}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity style={s.modalItem} onPress={() => adicionarMissao(item)}>
                    <View style={[s.catDotSm, { backgroundColor: item.categorias_acao?.cor_hex || "#4CFF3B" }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.modalItemTitulo}>{item.titulo}</Text>
                      <Text style={s.modalItemSub}>{item.categorias_acao?.nome || "Sem categoria"} · {item.xp_base} XP base</Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={22} color={C.green} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </BackofficeLayout>
  );
}

function Stat({ title, value, icon, color }: { title: string; value: number; icon: string; color?: string }) {
  const { colors } = useTheme();
  const c = color || colors.primary;
  return (
    <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 4 }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 6, backgroundColor: c + "18" }}>
        <Ionicons name={icon as any} size={20} color={c} />
      </View>
      <Text style={{ fontSize: 28, fontWeight: "900", color: c }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 6 }}>{title}</Text>
    </View>
  );
}

function makeStyles(C: any) { return StyleSheet.create({
  title: { ...Type.largeTitle, color: C.text },
  subtitle: { ...Type.body, color: C.muted, marginTop: 6, marginBottom: 28 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 0 },
  refreshBtn: { backgroundColor: C.green + "18", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: C.green },
  statsRow: { flexDirection: "row", gap: 16, marginBottom: 26 },
  segment: { flexDirection: "row", backgroundColor: C.bg, borderRadius: 10, padding: 4, gap: 4, borderWidth: 1, borderColor: C.border },
  segmentBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  segmentBtnActive: { backgroundColor: C.green },
  segmentText: { color: C.muted, fontWeight: "700", fontSize: 13 },
  segmentTextActive: { color: C.isDark ? "#000" : "#FFF" },

  dayTabsContainer: { flexDirection: "row", gap: 8, marginBottom: 20 },
  dayTab: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, position: "relative" },
  dayTabActive: { backgroundColor: C.green, borderColor: C.green },
  dayTabHoje: { borderColor: C.green },
  dayTabText: { color: C.muted, fontWeight: "700", fontSize: 13 },
  dayTabTextActive: { color: C.isDark ? "#000" : "#FFF" },
  dayCount: { marginTop: 4, backgroundColor: C.border, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  dayCountActive: { backgroundColor: C.isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.25)" },
  dayCountText: { color: C.green, fontSize: 11, fontWeight: "900" },
  dayCountTextActive: { color: C.isDark ? "#000" : "#FFF" },
  hojeIndicator: { position: "absolute", bottom: 6, width: 4, height: 4, borderRadius: 2, backgroundColor: C.green },

  section: { backgroundColor: C.card, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  sectionTitle: { ...Type.headline, color: C.text },
  sectionSub: { ...Type.footnote, color: C.muted, fontWeight: "400", marginTop: 2 },
  emptyText: { color: C.muted, marginTop: 12 },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyStateText: { color: C.dim, fontSize: 16, fontWeight: "700" },
  emptyStateSub: { color: C.dim, fontSize: 13 },

  missaoCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  missaoCardInativa: { opacity: 0.5 },
  ordemBtns: { alignItems: "center", gap: 2, width: 28 },
  ordemNum: { color: C.dim, fontSize: 12, fontWeight: "700" },
  catDot: { width: 12, height: 12, borderRadius: 4, flexShrink: 0 },
  catDotSm: { width: 10, height: 10, borderRadius: 3, flexShrink: 0, marginRight: 10 },
  missaoTitulo: { color: C.text, fontWeight: "800", fontSize: 14 },
  missaoMeta: { flexDirection: "row", gap: 12, marginTop: 4 },
  missaoCategoria: { color: C.muted, fontSize: 12 },
  missaoCO2: { color: C.muted, fontSize: 12 },
  xpBonusGroup: { alignItems: "center", gap: 4 },
  xpBonusLabel: { color: C.muted, fontSize: 11 },
  xpBonusInput: { backgroundColor: C.bg, color: C.text, borderRadius: 8, borderWidth: 1, borderColor: C.border, width: 56, height: 34, textAlign: "center", fontSize: 14, fontWeight: "700" },
  xpTotalBox: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.green + "22", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  xpBase: { color: C.muted, fontSize: 12, fontWeight: "700" },
  xpSeparator: { color: C.dim, fontSize: 12 },
  xpBonus: { color: C.teal, fontSize: 12, fontWeight: "700" },
  xpEquals: { color: C.dim, fontSize: 12 },
  xpTotal: { color: C.green, fontSize: 14, fontWeight: "900" },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  switchLabel: { fontSize: 10, fontWeight: "700" },
  btnRemover: { backgroundColor: C.red + "18", padding: 8, borderRadius: 8, borderWidth: 1, borderColor: C.red + "44" },

  btnPrimary: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.green, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  btnPrimaryText: { color: C.isDark ? "#000" : "#FFF", fontWeight: "900", fontSize: 14 },

  weekGrid: { flexDirection: "row", gap: 10 },
  weekCell: { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: C.border },
  weekCellHoje: { borderColor: C.green, borderWidth: 2 },
  weekDia: { color: C.muted, fontSize: 12, fontWeight: "700" },
  weekDiaHoje: { color: C.green },
  weekCount: { color: C.text, fontSize: 22, fontWeight: "900", marginTop: 6 },
  weekLabel: { color: C.dim, fontSize: 10, marginBottom: 8 },
  weekMissoesPreview: { flexDirection: "row", flexWrap: "wrap", gap: 4, justifyContent: "center" },
  weekMissaoDot: { width: 8, height: 8, borderRadius: 3 },
  weekMais: { color: C.muted, fontSize: 10 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center" },
  modalBox: { backgroundColor: C.bg, borderRadius: 20, padding: 24, width: 560, maxHeight: "80%", borderWidth: 1, borderColor: C.border },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: C.text, fontSize: 18, fontWeight: "900" },
  modalSearch: { backgroundColor: C.card, color: C.text, borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  modalItem: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 8 },
  modalItemTitulo: { color: C.text, fontWeight: "800", fontSize: 14 },
  modalItemSub: { color: C.muted, fontSize: 12, marginTop: 2 },

  alertBox: { backgroundColor: C.yellow + "15", borderRadius: 20, padding: 30, borderWidth: 1, borderColor: C.yellow + "55", alignItems: "center", gap: 16 },
  alertTitle: { color: C.yellow, fontSize: 20, fontWeight: "900", textAlign: "center" },
  alertText: { color: C.muted, fontSize: 15, textAlign: "center" },
  codeBox: { backgroundColor: C.bg, borderRadius: 12, padding: 18, width: "100%", borderWidth: 1, borderColor: C.border },
  code: { color: C.green, fontSize: 12, fontFamily: "monospace", lineHeight: 20 },
}); }
