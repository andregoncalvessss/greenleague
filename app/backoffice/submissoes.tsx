import { useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, Image, Modal, Switch } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import BackofficeLayout from "../../components/BackofficeLayout";
import Pagination from "../../components/Pagination";
import { supabase } from "../../src/lib/supabase";
import { useTheme } from "../../components/ThemeProvider";
import { useToast } from "../../components/ToastProvider";
import { Type } from "../../constants/typography";

const SUBS_PER_PAGE = 15;

type Filtro = "todos" | "pendente" | "aprovado" | "rejeitado";
type Ordenacao = "recentes" | "antigas" | "maior_xp" | "menor_xp";

const FILTRO_LABEL: Record<Filtro, string> = {
  todos: "Todos", pendente: "Pendente", aprovado: "Aprovado", rejeitado: "Rejeitado",
};
const ORDEM_LABEL: Record<Ordenacao, string> = {
  recentes: "Mais recentes", antigas: "Mais antigas", maior_xp: "Maior XP", menor_xp: "Menor XP",
};

export default function SubmissoesBackoffice() {
  const { colors, isDark } = useTheme();
  const C = { green: colors.primary, red: colors.red, yellow: colors.yellow, teal: colors.secondary, bg: colors.bg, card: colors.card, border: colors.border, text: colors.text, muted: colors.textMuted, dim: colors.textDim, isDark };
  const s = useMemo(() => makeStyles(C), [colors, isDark]);

  const { showToast } = useToast();
  const [submissoes, setSubmissoes] = useState<any[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("recentes");
  const [sortFocused, setSortFocused] = useState(false);
  const [pesquisa, setPesquisa] = useState("");
  const [pagina, setPagina] = useState(0);
  const [fotoModal, setFotoModal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aprovacaoAutomatica, setAprovacaoAutomatica] = useState(true);
  const [iaAtiva, setIaAtiva] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const [savingIa, setSavingIa] = useState(false);

  useEffect(() => { carregarSetting(); }, []);
  useEffect(() => { carregar(); }, [filtro]);

  async function carregarSetting() {
    try {
      const { data } = await supabase
        .from("configuracoes")
        .select("chave, valor")
        .in("chave", ["aprovacao_automatica", "ia_estimativa_ativa"]);
      const map = Object.fromEntries((data || []).map((c: any) => [c.chave, c.valor]));
      if (map["aprovacao_automatica"] !== undefined) setAprovacaoAutomatica(map["aprovacao_automatica"] === "true");
      if (map["ia_estimativa_ativa"] !== undefined) setIaAtiva(map["ia_estimativa_ativa"] === "true");
    } catch {
      // tabela pode não existir ainda — mantém defaults
    }
  }

  async function toggleAprovacao(novoValor: boolean) {
    setSavingToggle(true);
    try {
      await supabase.from("configuracoes").upsert(
        { chave: "aprovacao_automatica", valor: novoValor ? "true" : "false" },
        { onConflict: "chave" }
      );
      setAprovacaoAutomatica(novoValor);
      showToast({
        type: "success",
        message: novoValor
          ? "Aprovação automática ativada."
          : "Aprovação manual ativada. Revê as submissões abaixo.",
      });
    } catch {
      showToast({ type: "error", message: "Não foi possível guardar a configuração." });
    } finally {
      setSavingToggle(false);
    }
  }

  async function toggleIa(novoValor: boolean) {
    setSavingIa(true);
    try {
      await supabase.from("configuracoes").upsert(
        { chave: "ia_estimativa_ativa", valor: novoValor ? "true" : "false" },
        { onConflict: "chave" }
      );
      setIaAtiva(novoValor);
      showToast({
        type: "success",
        message: novoValor
          ? "IA ativada — as novas submissões terão o CO₂/água estimados por IA."
          : "IA desativada — volta a usar a estimativa manual do catálogo.",
      });
    } catch {
      showToast({ type: "error", message: "Não foi possível guardar a configuração." });
    } finally {
      setSavingIa(false);
    }
  }

  async function carregar() {
    setLoading(true);
    let query = supabase
      .from("submissoes_acao")
      .select(`
        id, descricao_user, estado, criado_em, foto_url, quantidade, xp_atribuido, co2_atribuido, agua_atribuida, estimado_por_ia, ia_justificacao,
        utilizadores(id, nome, email, xp_total, nivel),
        catalogo_acoes(titulo, xp_base, co2_estimado, agua_estimada)
      `)
      .order("criado_em", { ascending: false });

    if (filtro !== "todos") query = query.eq("estado", filtro);

    const { data } = await query.limit(1000);
    setSubmissoes(data || []);
    setLoading(false);
  }

  async function aprovar(sub: any) {
    const xp = Math.round((sub.catalogo_acoes?.xp_base || 0) * (sub.quantidade || 1));
    // Se a submissão foi estimada por IA, mantém esses valores; senão recalcula do catálogo
    const co2 = sub.estimado_por_ia
      ? parseFloat((Number(sub.co2_atribuido) || 0).toFixed(3))
      : parseFloat(((sub.catalogo_acoes?.co2_estimado || 0) * (sub.quantidade || 1)).toFixed(3));
    const agua = sub.estimado_por_ia
      ? parseFloat((Number(sub.agua_atribuida) || 0).toFixed(3))
      : parseFloat(((sub.catalogo_acoes?.agua_estimada || 0) * (sub.quantidade || 1)).toFixed(3));

    await supabase.from("submissoes_acao").update({
      estado: "aprovado",
      xp_atribuido: xp,
      co2_atribuido: co2,
      agua_atribuida: agua,
      validado_em: new Date().toISOString(),
    }).eq("id", sub.id);

    const userId = sub.utilizadores?.id;
    const { data: u } = await supabase.from("utilizadores").select("xp_total, co2_poupado, agua_poupada, nivel").eq("id", userId).single();
    if (u) {
      const novoXP = (u.xp_total || 0) + xp;
      const novoNivel = Math.floor(novoXP / 1000) + 1;
      await supabase.from("utilizadores").update({
        xp_total: novoXP,
        co2_poupado: parseFloat(((u.co2_poupado || 0) + co2).toFixed(3)),
        agua_poupada: parseFloat(((u.agua_poupada || 0) + agua).toFixed(3)),
        nivel: novoNivel,
      }).eq("id", userId);
    }
    carregar();
  }

  async function rejeitar(id: string) {
    await supabase.from("submissoes_acao").update({
      estado: "rejeitado",
      validado_em: new Date().toISOString(),
    }).eq("id", id);
    carregar();
  }

  async function voltarPendente(id: string) {
    await supabase.from("submissoes_acao").update({
      estado: "pendente",
      xp_atribuido: null,
      co2_atribuido: null,
      agua_atribuida: null,
      validado_em: null,
    }).eq("id", id);
    carregar();
  }

  async function remover(id: string) {
    if (!window.confirm("Tens a certeza que queres remover esta submissão?")) return;
    await supabase.from("submissoes_acao").delete().eq("id", id);
    carregar();
  }

  const filtradas = submissoes
    .filter(sub =>
      `${sub.utilizadores?.nome} ${sub.utilizadores?.email} ${sub.catalogo_acoes?.titulo} ${sub.descricao_user}`
        .toLowerCase().includes(pesquisa.toLowerCase())
    )
    .sort((a, b) => {
      if (ordenacao === "recentes") return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
      if (ordenacao === "antigas") return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
      const xpA = Math.round((a.catalogo_acoes?.xp_base || 0) * (a.quantidade || 1));
      const xpB = Math.round((b.catalogo_acoes?.xp_base || 0) * (b.quantidade || 1));
      if (ordenacao === "maior_xp") return xpB - xpA;
      if (ordenacao === "menor_xp") return xpA - xpB;
      return 0;
    });

  useEffect(() => { setPagina(0); }, [pesquisa, ordenacao, filtro]);
  const totalPaginas = Math.ceil(filtradas.length / SUBS_PER_PAGE);
  const filtradasPagina = filtradas.slice(pagina * SUBS_PER_PAGE, (pagina + 1) * SUBS_PER_PAGE);

  const pendentes = submissoes.filter(sub => sub.estado === "pendente").length;
  const aprovadas = submissoes.filter(sub => sub.estado === "aprovado").length;
  const rejeitadas = submissoes.filter(sub => sub.estado === "rejeitado").length;
  const totalXP = submissoes.filter(sub => sub.estado === "aprovado").reduce((acc, sub) => acc + (sub.xp_atribuido || 0), 0);
  const totalCO2 = submissoes.filter(sub => sub.estado === "aprovado").reduce((acc, sub) => acc + parseFloat(sub.co2_atribuido || 0), 0);
  const totalAgua = submissoes.filter(sub => sub.estado === "aprovado").reduce((acc, sub) => acc + parseFloat(sub.agua_atribuida || 0), 0);

  return (
    <BackofficeLayout>
      <Text style={s.title}>Ações dos Utilizadores</Text>
      <Text style={s.subtitle}>Aprova ou rejeita as ações submetidas pelos utilizadores.</Text>

      {/* TOGGLE APROVAÇÃO AUTOMÁTICA */}
      <View style={[s.toggleCard, aprovacaoAutomatica ? s.toggleCardOn : s.toggleCardOff]}>
        <View style={s.toggleIcon}>
          <Ionicons
            name={aprovacaoAutomatica ? "checkmark-circle" : "time"}
            size={28}
            color={aprovacaoAutomatica ? C.green : C.yellow}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.toggleTitle}>Aprovar Submissões de Ações Automaticamente</Text>
          <Text style={s.toggleDesc}>
            {aprovacaoAutomatica
              ? "Ativo — as submissões dos utilizadores são aprovadas e o XP é atribuído de imediato."
              : "Inativo — cada submissão fica pendente até seres tu a aprovar manualmente abaixo."}
          </Text>
        </View>
        <Switch
          value={aprovacaoAutomatica}
          onValueChange={toggleAprovacao}
          disabled={savingToggle}
          trackColor={{ false: "#2A2A32", true: "#1A3D1A" }}
          thumbColor={aprovacaoAutomatica ? C.green : C.dim}
        />
      </View>

      {/* TOGGLE ESTIMATIVA POR IA */}
      <View style={[s.toggleCard, iaAtiva ? s.toggleCardIa : s.toggleCardOff]}>
        <View style={s.toggleIcon}>
          <Ionicons name="sparkles" size={26} color={iaAtiva ? C.teal : C.muted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.toggleTitle}>Estimar CO₂ e Água com IA (Gemini)</Text>
          <Text style={s.toggleDesc}>
            {iaAtiva
              ? "Ativo — ao submeter, a IA analisa a foto e estima o impacto real. A estimativa manual do catálogo fica como reserva."
              : "Inativo — o CO₂/água são calculados a partir dos valores manuais definidos no catálogo de desafios."}
          </Text>
        </View>
        <Switch
          value={iaAtiva}
          onValueChange={toggleIa}
          disabled={savingIa}
          trackColor={{ false: "#2A2A32", true: "#0E3A34" }}
          thumbColor={iaAtiva ? C.teal : C.dim}
        />
      </View>

      <View style={s.statsRow}>
        <Stat title="Aprovadas" value={aprovadas} icon="checkmark-circle" color={C.green} />
        <Stat title="Pendentes" value={pendentes} icon="time" color={C.yellow} />
        <Stat title="Rejeitadas" value={rejeitadas} icon="close-circle" color={C.red} />
        <Stat title="XP Distribuído" value={totalXP} icon="star" color={C.yellow} />
        <Stat title="CO₂ (kg)" value={Math.round(totalCO2 * 10) / 10} icon="leaf" color={C.green} />
        <Stat title="Água Poupada (L)" value={Math.round(totalAgua * 10) / 10} icon="water" color={C.teal} />
      </View>

      <View style={s.section}>
        {/* Linha 1: Estado + Pesquisa */}
        <View style={s.filterBar}>
          <View style={s.tabs}>
            {(["todos", "pendente", "aprovado", "rejeitado"] as Filtro[]).map(f => (
              <TouchableOpacity key={f} style={[s.tab, filtro === f && s.tabActive]} onPress={() => setFiltro(f)}>
                <Text style={[s.tabText, filtro === f && s.tabTextActive]}>{FILTRO_LABEL[f]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={s.input}
            value={pesquisa}
            onChangeText={setPesquisa}
            placeholder="Pesquisar utilizador, ação..."
            placeholderTextColor={C.dim}
          />
          <View style={[s.sortWrap, sortFocused && { borderColor: C.green, borderWidth: 2 }]}>
            <Ionicons name="swap-vertical-outline" size={15} color={sortFocused ? C.green : C.muted} />
            <Picker
              selectedValue={ordenacao}
              onValueChange={v => setOrdenacao(v as Ordenacao)}
              onFocus={() => setSortFocused(true)}
              onBlur={() => setSortFocused(false)}
              dropdownIconColor={C.green}
              style={[s.sortPicker, { outline: "none" } as any]}
            >
              {(["recentes", "antigas", "maior_xp", "menor_xp"] as Ordenacao[]).map(o => (
                <Picker.Item key={o} label={ORDEM_LABEL[o]} value={o} />
              ))}
            </Picker>
          </View>
        </View>


        {loading && <Text style={s.emptyText}>A carregar...</Text>}

        <View style={s.tableHeader}>
          <Text style={[s.th, { flex: 2 }]}>Utilizador</Text>
          <Text style={[s.th, { flex: 2 }]}>Ação</Text>
          <Text style={[s.th, { flex: 2 }]}>Descrição</Text>
          <Text style={s.th}>Qtd</Text>
          <Text style={s.th}>XP</Text>
          <Text style={s.th}>Foto</Text>
          <Text style={s.th}>Estado</Text>
          <Text style={s.th}>Data</Text>
          <Text style={[s.th, { flex: 1.5 }]}>Ações</Text>
        </View>

        {filtradasPagina.map(sub => (
          <View key={sub.id} style={s.tableRow}>
            <View style={[{ flex: 2 }]}>
              <Text style={[s.td, { fontWeight: "800" }]}>{sub.utilizadores?.nome}</Text>
              <Text style={[s.td, { color: C.muted, fontSize: 11 }]}>{sub.utilizadores?.email}</Text>
            </View>
            <View style={{ flex: 2 }}>
              <Text style={s.td}>{sub.catalogo_acoes?.titulo}</Text>
              {sub.estimado_por_ia && (
                <View style={s.iaBadge}>
                  <Ionicons name="sparkles" size={10} color={C.teal} />
                  <Text style={s.iaBadgeText}>
                    IA · {Number(sub.co2_atribuido || 0).toFixed(1)}kg · {Number(sub.agua_atribuida || 0).toFixed(1)}L
                  </Text>
                </View>
              )}
            </View>
            <Text style={[s.td, { flex: 2, color: C.dim }]} numberOfLines={2}>
              {sub.estimado_por_ia && sub.ia_justificacao ? sub.ia_justificacao : (sub.descricao_user || "—")}
            </Text>
            <Text style={s.td}>{sub.quantidade || 1}</Text>
            <Text style={[s.td, { color: C.green, fontWeight: "700" }]}>
              {Math.round((sub.catalogo_acoes?.xp_base || 0) * (sub.quantidade || 1))}
            </Text>
            <View style={s.td}>
              {sub.foto_url
                ? <TouchableOpacity onPress={() => setFotoModal(sub.foto_url)}>
                    <Text style={{ color: C.teal, fontWeight: "700", fontSize: 12 }}>Ver foto</Text>
                  </TouchableOpacity>
                : <Text style={{ color: C.dim, fontSize: 12 }}>—</Text>
              }
            </View>
            <View style={s.td}>
              <Text style={[s.estadoBadge, sub.estado === "pendente" ? s.pendente : sub.estado === "aprovado" ? s.aprovado : s.rejeitado]}>
                {sub.estado}
              </Text>
            </View>
            <Text style={[s.td, { fontSize: 11, color: C.muted }]}>
              {new Date(sub.criado_em).toLocaleDateString("pt-PT")}
            </Text>
            <View style={[s.td, { flex: 1.5, flexDirection: "row", gap: 6, flexWrap: "wrap" }]}>
              {sub.estado === "pendente" ? (
                <>
                  <TipBtn style={s.btnAprovar} onPress={() => aprovar(sub)} tip="Aprovar submissão" color={C.green}>
                    <Ionicons name="checkmark" size={16} color={C.green} />
                  </TipBtn>
                  <TipBtn style={s.btnRejeitar} onPress={() => rejeitar(sub.id)} tip="Rejeitar submissão" color={C.red}>
                    <Ionicons name="close" size={16} color={C.red} />
                  </TipBtn>
                </>
              ) : (
                <TipBtn style={s.btnPendente} onPress={() => voltarPendente(sub.id)} tip="Repor para pendente" color={C.yellow}>
                  <Ionicons name="arrow-undo" size={16} color={C.yellow} />
                </TipBtn>
              )}
              <TipBtn style={s.btnRemover} onPress={() => remover(sub.id)} tip="Remover submissão" color={C.red}>
                <Ionicons name="trash-outline" size={16} color={C.red} />
              </TipBtn>
            </View>
          </View>
        ))}
        {!loading && filtradas.length === 0 && (
          <Text style={s.emptyText}>Nenhuma submissão encontrada.</Text>
        )}

        <Pagination page={pagina} totalPages={totalPaginas} onChange={setPagina} />
      </View>

      <Modal visible={!!fotoModal} transparent animationType="fade">
        <TouchableOpacity style={s.fotoOverlay} onPress={() => setFotoModal(null)}>
          {fotoModal && <Image source={{ uri: fotoModal }} style={s.fotoModal} resizeMode="contain" />}
          <Text style={{ color: "#AAAAAA", marginTop: 12 }}>Toca para fechar</Text>
        </TouchableOpacity>
      </Modal>
    </BackofficeLayout>
  );
}

function Stat({ title, value, icon, color }: { title: string; value: number; icon: string; color?: string }) {
  const { colors } = useTheme();
  const c = color || colors.primary;
  return (
    <View style={{ minWidth: 130, flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 4 }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 6, backgroundColor: c + "18" }}>
        <Ionicons name={icon as any} size={20} color={c} />
      </View>
      <Text style={[Type.metric, { color: c }]}>{value}</Text>
      <Text style={[Type.footnote, { color: colors.textMuted, marginTop: 6 }]}>{title}</Text>
    </View>
  );
}

function TipBtn({ style, onPress, tip, color, children }: { style: any; onPress: () => void; tip: string; color: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const handlers = Platform.OS === 'web'
    ? { onMouseEnter: () => setShow(true), onMouseLeave: () => setShow(false) }
    : {};
  return (
    <View style={{ position: 'relative' }}>
      <TouchableOpacity style={style} onPress={onPress} {...handlers}>
        {children}
      </TouchableOpacity>
      {show && (
        <View style={{ position: 'absolute', bottom: 36, left: -20, backgroundColor: 'rgba(15,15,20,0.88)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, zIndex: 9999 }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }} numberOfLines={1}>{tip}</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(C: any) { return StyleSheet.create({
  title: { ...Type.largeTitle, color: C.text },
  subtitle: { ...Type.body, color: C.muted, marginTop: 6, marginBottom: 28 },
  toggleCard: { flexDirection: "row", alignItems: "center", gap: 16, borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 24 },
  toggleCardOn: { backgroundColor: C.green + "15", borderColor: C.green + "55" },
  toggleCardOff: { backgroundColor: C.yellow + "15", borderColor: C.yellow + "55" },
  toggleCardIa: { backgroundColor: C.teal + "15", borderColor: C.teal + "55" },
  toggleIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.card, justifyContent: "center", alignItems: "center" },
  toggleTitle: { ...Type.headline, color: C.text, marginBottom: 4 },
  toggleDesc: { ...Type.callout, color: C.muted },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 26 },
  section: { backgroundColor: C.card, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  filterBar: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  tabs: { flexDirection: "row", backgroundColor: C.bg, borderRadius: 10, padding: 4, gap: 4, borderWidth: 1, borderColor: C.border },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  tabActive: { backgroundColor: C.green },
  tabText: { color: C.muted, fontWeight: "700", fontSize: 13 },
  tabTextActive: { color: C.isDark ? "#000" : "#FFF" },
  input: { flex: 1, backgroundColor: C.card, color: C.text, borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: C.border },
  sortWrap: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.card, borderRadius: 12, paddingLeft: 12, height: 46, borderWidth: 1, borderColor: C.border, minWidth: 160 },
  sortPicker: { flex: 1, color: C.text, height: 46, backgroundColor: "transparent" },
  tableHeader: { flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  th: { ...Type.overline, flex: 1, color: C.muted },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  td: { ...Type.callout, flex: 1, color: C.text },
  iaBadge: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3, backgroundColor: C.teal + "18", borderWidth: 1, borderColor: C.teal + "44", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start" },
  iaBadgeText: { color: C.teal, fontSize: 10, fontWeight: "800" },
  estadoBadge: { fontSize: 11, fontWeight: "900", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, alignSelf: "flex-start" },
  pendente: { backgroundColor: C.yellow + "22", color: C.yellow },
  aprovado: { backgroundColor: C.green + "22", color: C.green },
  rejeitado: { backgroundColor: C.red + "22", color: C.red },
  btnAprovar: { backgroundColor: C.green + "18", borderWidth: 1, borderColor: C.green, width: 30, height: 30, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  btnAprovarText: { color: C.green, fontWeight: "900", fontSize: 16 },
  btnRejeitar: { backgroundColor: C.red + "18", borderWidth: 1, borderColor: C.red, width: 30, height: 30, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  btnRejeitarText: { color: C.red, fontWeight: "900", fontSize: 16 },
  btnPendente: { backgroundColor: C.yellow + "18", borderWidth: 1, borderColor: C.yellow, width: 30, height: 30, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  btnRemover: { backgroundColor: C.red + "12", borderWidth: 1, borderColor: C.red + "44", width: 30, height: 30, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  emptyText: { color: C.muted, marginTop: 12 },
  fotoOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  fotoModal: { width: 500, height: 500, borderRadius: 16 },
}); }
