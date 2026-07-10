import { useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BackofficeLayout from "../../components/BackofficeLayout";
import { supabase } from "../../src/lib/supabase";
import { useTheme } from "../../components/ThemeProvider";
import { Type } from "../../constants/typography";

export default function EstatisticasBackoffice() {
  const { colors } = useTheme();
  const C = { green: colors.primary, red: colors.red, yellow: colors.yellow, teal: colors.secondary, bg: colors.bg, card: colors.card, border: colors.border, text: colors.text, muted: colors.textMuted, dim: colors.textDim };
  const s = useMemo(() => makeStyles(C), [colors]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0, totalEquipas: 0, totalSubmissoes: 0,
    totalXP: 0, totalCO2: 0, totalAgua: 0,
  });
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [topEquipas, setTopEquipas] = useState<any[]>([]);
  const [porEscola, setPorEscola] = useState<any[]>([]);
  const [porCategoria, setPorCategoria] = useState<any[]>([]);
  const [submissoesPorDia, setSubmissoesPorDia] = useState<any[]>([]);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const [
      { count: cUsers }, { count: cEquipas }, { count: cSubs },
      { data: utilizadores }, { data: equipas },
      { data: subsPorDia }, { data: subsCat },
      { data: escolaStats },
    ] = await Promise.all([
      supabase.from("utilizadores").select("*", { count: "exact", head: true }),
      supabase.from("equipas").select("*", { count: "exact", head: true }),
      supabase.from("submissoes_acao").select("*", { count: "exact", head: true }),
      supabase.from("utilizadores").select("nome, email, xp_total, nivel, co2_poupado, agua_poupada, escolas(sigla)").order("xp_total", { ascending: false }).limit(10),
      supabase.from("equipas").select("nome, xp_total, equipa_membros(count)").order("xp_total", { ascending: false }).limit(10),
      supabase.from("submissoes_acao").select("criado_em").gte("criado_em", new Date(Date.now() - 29 * 86400000).toISOString()),
      supabase.from("submissoes_acao").select("catalogo_acoes(categorias_acao(nome, cor_hex))").eq("estado", "aprovado"),
      supabase.from("utilizadores").select("xp_total, co2_poupado, agua_poupada, escolas(nome, sigla)"),
    ]);

    const totalXP = (utilizadores || []).reduce((a, u) => a + (u.xp_total || 0), 0);
    const totalCO2 = (utilizadores || []).reduce((a, u) => a + parseFloat(u.co2_poupado || 0), 0);
    const totalAgua = (utilizadores || []).reduce((a, u) => a + parseFloat(u.agua_poupada || 0), 0);

    setStats({
      totalUsers: cUsers || 0, totalEquipas: cEquipas || 0, totalSubmissoes: cSubs || 0,
      totalXP, totalCO2, totalAgua,
    });

    setTopUsers(utilizadores || []);
    setTopEquipas(equipas || []);

    // Submissões últimos 30 dias agrupadas por dia
    const diasMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      diasMap[d] = 0;
    }
    (subsPorDia || []).forEach(s => {
      const d = s.criado_em.split("T")[0];
      if (diasMap[d] !== undefined) diasMap[d]++;
    });
    setSubmissoesPorDia(Object.entries(diasMap).map(([data, count]) => ({ data, count })));

    // Por categoria
    const catMap: Record<string, { nome: string; cor: string; count: number }> = {};
    (subsCat || []).forEach((s: any) => {
      const cat = s.catalogo_acoes?.categorias_acao;
      if (!cat?.nome) return;
      if (!catMap[cat.nome]) catMap[cat.nome] = { nome: cat.nome, cor: cat.cor_hex || colors.primary, count: 0 };
      catMap[cat.nome].count++;
    });
    setPorCategoria(Object.values(catMap).sort((a, b) => b.count - a.count));

    // XP por escola
    const escolaMap: Record<string, { nome: string; sigla: string; xp: number; co2: number; users: number }> = {};
    (escolaStats || []).forEach((u: any) => {
      const nome = u.escolas?.nome || "Sem escola";
      const sigla = u.escolas?.sigla || "—";
      if (!escolaMap[nome]) escolaMap[nome] = { nome, sigla, xp: 0, co2: 0, users: 0 };
      escolaMap[nome].xp += u.xp_total || 0;
      escolaMap[nome].co2 += parseFloat(u.co2_poupado || 0);
      escolaMap[nome].users++;
    });
    setPorEscola(Object.values(escolaMap).sort((a, b) => b.xp - a.xp));

    setLoading(false);
  }

  const maxDia = Math.max(...submissoesPorDia.map(d => d.count), 1);

  if (loading) return (
    <BackofficeLayout>
      <Text style={s.title}>Estatísticas</Text>
      <Text style={s.loadingText}>A carregar dados...</Text>
    </BackofficeLayout>
  );

  return (
    <BackofficeLayout>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <Text style={s.title}>Estatísticas</Text>
        <TouchableOpacity style={s.refreshBtn} onPress={carregar}>
          <Ionicons name="refresh-outline" size={18} color={C.green} />
          <Text style={s.refreshText}>Atualizar</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.subtitle}>Visão geral do impacto e atividade da plataforma IPVC Green League.</Text>

      {/* STATS PRINCIPAIS */}
      <View style={s.statsGrid}>
        <BigStat label="Utilizadores" value={stats.totalUsers} icon="people-outline" />
        <BigStat label="Equipas" value={stats.totalEquipas} icon="shield-outline" />
        <BigStat label="Submissões" value={stats.totalSubmissoes} icon="clipboard-outline" />
        <BigStat label="XP Total" value={stats.totalXP} icon="star-outline" />
        <BigStat label={`CO₂ Poupado (kg)`} value={Math.round(stats.totalCO2 * 10) / 10} icon="leaf-outline" color={colors.secondary} />
        <BigStat label={`Água Poupada (L)`} value={Math.round(stats.totalAgua * 10) / 10} icon="water-outline" color={colors.blue} />
      </View>

      {/* GRÁFICO SUBMISSÕES 30 DIAS */}
      <View style={s.section}>
        {/* Cabeçalho com resumo */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <View>
            <Text style={s.sectionTitle}>Submissões — Últimos 30 Dias</Text>
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>
              Atividade diária de submissões na plataforma
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {[
              { label: "Total", value: submissoesPorDia.reduce((a, d) => a + d.count, 0), color: C.green },
              { label: "Média/dia", value: (submissoesPorDia.reduce((a, d) => a + d.count, 0) / 30).toFixed(1), color: C.teal },
              { label: "Pico", value: maxDia, color: C.yellow },
            ].map(({ label, value, color }) => (
              <View key={label} style={{ alignItems: "center", backgroundColor: color + "12", borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: color + "30" }}>
                <Text style={{ color, fontSize: 24, fontWeight: "900" }}>{value}</Text>
                <Text style={{ color: C.muted, fontSize: 12, fontWeight: "600" }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Gráfico */}
        <View style={{ flexDirection: "row", alignItems: "stretch" }}>
          {/* Eixo Y */}
          <View style={{ width: 36, justifyContent: "space-between", alignItems: "flex-end", paddingRight: 8, paddingBottom: 32 }}>
            {[maxDia, Math.round(maxDia * 0.5), 0].map(v => (
              <Text key={v} style={{ color: C.dim, fontSize: 12, lineHeight: 15, fontWeight: "600" }}>{v}</Text>
            ))}
          </View>

          {/* Área do gráfico */}
          <View style={{ flex: 1, position: "relative" }}>
            {/* Linhas de grelha */}
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 32, justifyContent: "space-between", pointerEvents: "none" as any }}>
              {[0, 1, 2].map(i => (
                <View key={i} style={{ height: 1, backgroundColor: C.border, opacity: 0.7 }} />
              ))}
            </View>

            {/* Barras */}
            <View style={{ flexDirection: "row", alignItems: "flex-end", height: 240, gap: 3, paddingBottom: 32 }}>
              {submissoesPorDia.map((d, i) => (
                <ChartBar key={i} d={d} i={i} total={submissoesPorDia.length} maxDia={maxDia} C={C} />
              ))}
            </View>
          </View>
        </View>

        <Text style={s.chartNote}>
          Hoje: {new Date().toLocaleDateString("pt-PT")}
        </Text>
      </View>

      <View style={s.gridTwo}>
        {/* TOP UTILIZADORES */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Top 10 Utilizadores</Text>
          <View style={s.tableHeader}>
            <Text style={[s.th, { flex: 0.4 }]}>#</Text>
            <Text style={[s.th, { flex: 2 }]}>Nome</Text>
            <Text style={s.th}>Escola</Text>
            <Text style={s.th}>Nível</Text>
            <Text style={s.th}>XP</Text>
            <Text style={s.th}>CO₂ (kg)</Text>
          </View>
          {topUsers.map((u, i) => (
            <View key={i} style={s.tableRow}>
              <Text style={[s.td, { flex: 0.4, color: i < 3 ? C.yellow : C.muted, fontWeight: "900" }]}>{i + 1}</Text>
              <Text style={[s.td, { flex: 2, fontWeight: "800" }]}>{u.nome}</Text>
              <Text style={s.td}>{u.escolas?.sigla || "—"}</Text>
              <Text style={s.td}>{u.nivel || 1}</Text>
              <Text style={[s.td, { color: C.green, fontWeight: "700" }]}>{u.xp_total}</Text>
              <Text style={s.td}>{parseFloat(u.co2_poupado || 0).toFixed(1)}</Text>
            </View>
          ))}
        </View>

        {/* TOP EQUIPAS */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Top 10 Equipas</Text>
          <View style={s.tableHeader}>
            <Text style={[s.th, { flex: 0.4 }]}>#</Text>
            <Text style={[s.th, { flex: 2 }]}>Equipa</Text>
            <Text style={s.th}>Membros</Text>
            <Text style={s.th}>XP</Text>
          </View>
          {topEquipas.map((e, i) => (
            <View key={i} style={s.tableRow}>
              <Text style={[s.td, { flex: 0.4, color: i < 3 ? C.yellow : C.muted, fontWeight: "900" }]}>{i + 1}</Text>
              <Text style={[s.td, { flex: 2, fontWeight: "800" }]}>{e.nome}</Text>
              <Text style={s.td}>{e.equipa_membros?.[0]?.count || 0}</Text>
              <Text style={[s.td, { color: C.green, fontWeight: "700" }]}>{e.xp_total}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.gridTwo}>
        {/* POR ESCOLA */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Impacto por Escola</Text>
          <View style={s.tableHeader}>
            <Text style={[s.th, { flex: 2 }]}>Escola</Text>
            <Text style={s.th}>Users</Text>
            <Text style={s.th}>XP Total</Text>
            <Text style={s.th}>CO₂ (kg)</Text>
          </View>
          {porEscola.map((e, i) => (
            <View key={i} style={s.tableRow}>
              <Text style={[s.td, { flex: 2, fontWeight: "800" }]}>{e.sigla}</Text>
              <Text style={s.td}>{e.users}</Text>
              <Text style={[s.td, { color: C.green, fontWeight: "700" }]}>{e.xp}</Text>
              <Text style={s.td}>{e.co2.toFixed(1)}</Text>
            </View>
          ))}
        </View>

        {/* POR CATEGORIA */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Ações Aprovadas por Categoria</Text>
          {porCategoria.map((c, i) => (
            <View key={i} style={s.catRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 2 }}>
                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c.cor }} />
                <Text style={s.catNome}>{c.nome}</Text>
              </View>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${(c.count / (porCategoria[0]?.count || 1)) * 100}%`, backgroundColor: c.cor }]} />
              </View>
              <Text style={s.catCount}>{c.count}</Text>
            </View>
          ))}
          {porCategoria.length === 0 && <Text style={s.emptyText}>Sem dados de categorias.</Text>}
        </View>
      </View>
    </BackofficeLayout>
  );
}

const DIAS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function ChartBar({ d, i, total, maxDia, C }: { d: { data: string; count: number }; i: number; total: number; maxDia: number; C: any }) {
  const [hover, setHover] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const isToday = d.data === today;
  const isLastWeek = i >= total - 7;
  const barH = maxDia === 0 ? 4 : Math.max(d.count > 0 ? 8 : 2, (d.count / maxDia) * 190);
  const barColor = isToday ? C.yellow : hover ? C.teal : C.green;

  // Etiqueta: última semana → nome do dia; resto → DD/MM
  const label = isLastWeek
    ? DIAS_PT[new Date(d.data + "T12:00:00").getDay()]
    : d.data.slice(8) + "/" + d.data.slice(5, 7);

  return (
    <View
      style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", position: "relative" }}
      {...(Platform.OS === "web" ? {
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => setHover(false),
      } : {})}
    >
      {/* Tooltip */}
      {hover && (
        <View style={{
          position: "absolute", bottom: barH + 10, left: -24,
          backgroundColor: "rgba(15,15,20,0.92)", borderRadius: 7,
          paddingHorizontal: 8, paddingVertical: 5, zIndex: 9999,
          borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
        }}>
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "900", textAlign: "center" }}>{d.count}</Text>
          <Text style={{ color: "#aaa", fontSize: 11, textAlign: "center" }}>{d.data.slice(8) + "/" + d.data.slice(5, 7)}</Text>
        </View>
      )}

      {/* Barra */}
      <View style={{
        width: "80%", borderTopLeftRadius: 3, borderTopRightRadius: 3,
        height: barH,
        backgroundColor: barColor,
        opacity: d.count === 0 ? 0.18 : hover ? 1 : 0.85,
      }} />

      {/* Etiqueta */}
      <Text style={{
        position: "absolute", bottom: 0, fontSize: isLastWeek ? 11 : 10,
        color: isToday ? C.yellow : isLastWeek ? C.muted : C.dim,
        fontWeight: isToday ? "800" : isLastWeek ? "700" : "400",
      }}>
        {label}
      </Text>
    </View>
  );
}

function BigStat({ label, value, icon, color }: { label: string; value: number; icon: string; color?: string }) {
  const { colors } = useTheme();
  const c = color || colors.text;
  return (
    <View style={{ minWidth: 150, flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}>
      <Ionicons name={icon as any} size={24} color={c} style={{ marginBottom: 8 }} />
      <Text style={[Type.metric, { marginBottom: 4, color: c }]}>{value.toLocaleString("pt-PT")}</Text>
      <Text style={[Type.footnote, { color: colors.textMuted, textAlign: "center" }]}>{label}</Text>
    </View>
  );
}

function makeStyles(C: any) { return StyleSheet.create({
  title: { ...Type.largeTitle, color: C.text },
  subtitle: { ...Type.body, color: C.muted, marginTop: 6, marginBottom: 28 },
  loadingText: { color: C.muted, marginTop: 20 },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.green + "18", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: C.green },
  refreshText: { color: C.green, fontWeight: "700" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 26 },
  gridTwo: { flexDirection: "row", gap: 16, marginBottom: 0 },
  section: { flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  sectionTitle: { ...Type.headline, color: C.text, marginBottom: 16 },
  tableHeader: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 4 },
  th: { ...Type.overline, flex: 1, color: C.muted },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  td: { ...Type.callout, flex: 1, color: C.text },
  chartNote: { color: C.dim, fontSize: 11, marginTop: 10 },
  catRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  catNome: { color: C.text, fontWeight: "700", fontSize: 13 },
  barTrack: { flex: 3, height: 8, backgroundColor: C.card, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  catCount: { color: C.green, fontWeight: "900", fontSize: 13, width: 36, textAlign: "right" },
  emptyText: { color: C.muted },
}); }
