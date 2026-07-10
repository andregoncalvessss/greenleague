import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../src/lib/supabase";
import BackofficeLayout from "../../components/BackofficeLayout";
import { useTheme } from "../../components/ThemeProvider";
import { Type } from "../../constants/typography";

type Stats = {
  utilizadores: number; novosSemana: number;
  equipas: number;
  subsTotais: number; subsPendentes: number; subsAprovadas: number; subsHoje: number;
  xpTotal: number; co2Total: number; aguaTotal: number;
  aprovacaoAuto: boolean; missoesConfiguradas: number;
};

export default function BackofficeDashboard() {
  const { colors } = useTheme();
  const C = { green: colors.primary, teal: colors.secondary, yellow: colors.yellow, red: colors.red, blue: colors.blue, purple: colors.purple, bg: colors.bg, card: colors.card, border: colors.border, text: colors.text, muted: colors.textMuted, dim: colors.textDim };
  const s = useMemo(() => makeStyles(C), [colors]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendentes, setPendentes] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [topEquipas, setTopEquipas] = useState<any[]>([]);
  const [atividadeSemana, setAtividadeSemana] = useState<{ dia: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
    const inicioSemana = new Date(Date.now() - 6 * 86400000).toISOString();

    const [
      { count: cUsers },
      { count: cUsersNovos },
      { count: cEquipas },
      { count: cSubs },
      { count: cPendentes },
      { count: cAprovadas },
      { count: cHoje },
      { data: utilizadores },
      { data: equipas },
      { data: pendentesData },
      { data: semanaData },
      { count: cMissoes },
      { data: configData },
    ] = await Promise.all([
      supabase.from("utilizadores").select("*", { count: "exact", head: true }),
      supabase.from("utilizadores").select("*", { count: "exact", head: true }).gte("criado_em", inicioSemana),
      supabase.from("equipas").select("*", { count: "exact", head: true }),
      supabase.from("submissoes_acao").select("*", { count: "exact", head: true }),
      supabase.from("submissoes_acao").select("*", { count: "exact", head: true }).eq("estado", "pendente"),
      supabase.from("submissoes_acao").select("*", { count: "exact", head: true }).eq("estado", "aprovado"),
      supabase.from("submissoes_acao").select("*", { count: "exact", head: true }).gte("criado_em", inicioHoje),
      supabase.from("utilizadores").select("nome, xp_total, nivel, co2_poupado, agua_poupada, escolas(sigla)").order("xp_total", { ascending: false }).limit(5),
      supabase.from("equipas").select("nome, xp_total, equipa_membros(count)").order("xp_total", { ascending: false }).limit(3),
      supabase.from("submissoes_acao").select("id, criado_em, xp_atribuido, utilizadores(nome, escolas(sigla)), catalogo_acoes(titulo)").eq("estado", "pendente").order("criado_em", { ascending: true }).limit(6),
      supabase.from("submissoes_acao").select("criado_em").gte("criado_em", inicioSemana),
      supabase.from("missoes_semanais").select("*", { count: "exact", head: true }).eq("ativa", true),
      supabase.from("configuracoes").select("valor").eq("chave", "aprovacao_automatica").single(),
    ]);

    const allUtils = utilizadores || [];
    const xpTotal = allUtils.reduce((a, u) => a + (u.xp_total || 0), 0);
    const co2Total = allUtils.reduce((a, u) => a + parseFloat(u.co2_poupado || 0), 0);
    const aguaTotal = allUtils.reduce((a, u) => a + parseFloat(u.agua_poupada || 0), 0);

    // Agrupar atividade por dia (últimos 7 dias)
    const diasMap: Record<string, number> = {};
    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      diasMap[d.toISOString().split("T")[0]] = 0;
    }
    (semanaData || []).forEach((s: any) => {
      const dia = s.criado_em.split("T")[0];
      if (diasMap[dia] !== undefined) diasMap[dia]++;
    });
    const atividade = Object.entries(diasMap).map(([data, count]) => ({
      dia: diasSemana[new Date(data + "T12:00:00").getDay()],
      count,
    }));

    setStats({
      utilizadores: cUsers || 0, novosSemana: cUsersNovos || 0,
      equipas: cEquipas || 0,
      subsTotais: cSubs || 0, subsPendentes: cPendentes || 0,
      subsAprovadas: cAprovadas || 0, subsHoje: cHoje || 0,
      xpTotal, co2Total, aguaTotal,
      aprovacaoAuto: !configData || configData.valor === "true",
      missoesConfiguradas: cMissoes || 0,
    });
    setPendentes(pendentesData || []);
    setTopUsers(utilizadores || []);
    setTopEquipas(equipas || []);
    setAtividadeSemana(atividade);
    setLoading(false);
  }

  async function aprovarRapido(sub: any) {
    setApprovingId(sub.id);
    try {
      await supabase.from("submissoes_acao").update({ estado: "aprovado", validado_em: new Date().toISOString() }).eq("id", sub.id);
      const xp = sub.xp_atribuido || 0;
      if (sub.utilizadores?.id && xp > 0) {
        const { data: p } = await supabase.from("utilizadores").select("xp_total").eq("id", sub.utilizadores.id).single();
        if (p) await supabase.from("utilizadores").update({ xp_total: (p.xp_total || 0) + xp }).eq("id", sub.utilizadores.id);
      }
      await carregar();
    } finally {
      setApprovingId(null);
    }
  }

  const now = new Date();
  const dataFormatada = now.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const horaFormatada = now.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  const maxAtividade = Math.max(...atividadeSemana.map(d => d.count), 1);

  if (loading || !stats) {
    return (
      <BackofficeLayout>
        <Text style={s.title}>Dashboard</Text>
        <Text style={s.muted}>A carregar dados...</Text>
      </BackofficeLayout>
    );
  }

  const temPendentes = stats.subsPendentes > 0 && !stats.aprovacaoAuto;

  return (
    <BackofficeLayout>

      {/* CABEÇALHO */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Dashboard</Text>
          <Text style={s.muted}>{dataFormatada} · {horaFormatada}</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={carregar}>
          <Ionicons name="refresh-outline" size={18} color={C.green} />
          <Text style={s.refreshText}>Atualizar</Text>
        </TouchableOpacity>
      </View>

      {/* ALERTA DE PENDENTES */}
      {temPendentes && (
        <TouchableOpacity style={s.alertBanner} onPress={() => router.push("/backoffice/submissoes")}>
          <Ionicons name="time" size={22} color={C.yellow} />
          <View style={{ flex: 1 }}>
            <Text style={s.alertTitle}>{stats.subsPendentes} submissão{stats.subsPendentes !== 1 ? "ões" : ""} a aguardar revisão</Text>
            <Text style={s.alertDesc}>Aprovação manual ativa — revê e valida as ações dos utilizadores.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.yellow} />
        </TouchableOpacity>
      )}

      {/* KPIs LINHA 1 — Atividade */}
      <View style={s.kpiRow}>
        <KPI icon="people" color={C.teal} label="Utilizadores" value={stats.utilizadores} sub={`+${stats.novosSemana} esta semana`} />
        <KPI icon="shield" color={C.blue} label="Equipas" value={stats.equipas} sub="equipas ativas" />
        <KPI icon="document-text" color={C.green} label="Submissões" value={stats.subsTotais} sub={`${stats.subsHoje} hoje`} />
        <KPI icon="time" color={stats.subsPendentes > 0 ? C.yellow : C.muted} label="Pendentes" value={stats.subsPendentes} sub="aguardam revisão" urgent={stats.subsPendentes > 0 && !stats.aprovacaoAuto} />
      </View>

      {/* KPIs LINHA 2 — Impacto */}
      <View style={s.kpiRow}>
        <KPI icon="star" color={C.yellow} label="XP Total" value={stats.xpTotal.toLocaleString("pt-PT")} sub="distribuído na liga" />
        <KPI icon="leaf" color={C.green} label="CO₂ Poupado" value={`${Math.round(stats.co2Total)}kg`} sub="impacto acumulado" />
        <KPI icon="water" color={C.blue} label="Água Poupada" value={`${Math.round(stats.aguaTotal)}L`} sub="impacto acumulado" />
        <KPI icon="checkmark-circle" color={C.green} label="Aprovadas" value={stats.subsAprovadas} sub={`${Math.round((stats.subsAprovadas / Math.max(stats.subsTotais, 1)) * 100)}% do total`} />
      </View>

      {/* LINHA CENTRAL — Pendentes + Top Utilizadores */}
      <View style={s.rowTwo}>

        {/* SUBMISSÕES PENDENTES */}
        <View style={[s.section, { flex: 3 }]}>
          <View style={s.sectionHead}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="time-outline" size={18} color={C.yellow} />
              <Text style={s.sectionTitle}>Pendentes</Text>
              {stats.subsPendentes > 0 && <View style={s.badge}><Text style={s.badgeText}>{stats.subsPendentes}</Text></View>}
            </View>
            <TouchableOpacity onPress={() => router.push("/backoffice/submissoes")}>
              <Text style={s.link}>Ver todas →</Text>
            </TouchableOpacity>
          </View>

          {pendentes.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={36} color={C.green} />
              <Text style={s.emptyText}>Tudo em dia! Sem submissões por rever.</Text>
            </View>
          ) : (
            pendentes.map((sub, i) => (
              <View key={sub.id} style={[s.pendRow, i === pendentes.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={s.pendAvatar}>
                  <Text style={s.pendAvatarText}>{(sub.utilizadores?.nome || "?")[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.pendName}>{sub.utilizadores?.nome || "—"}</Text>
                  <Text style={s.pendAction}>{sub.catalogo_acoes?.titulo || "—"}</Text>
                  <Text style={s.pendDate}>{new Date(sub.criado_em).toLocaleDateString("pt-PT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
                </View>
                <TouchableOpacity
                  style={[s.approveBtn, approvingId === sub.id && { opacity: 0.5 }]}
                  onPress={() => aprovarRapido(sub)}
                  disabled={approvingId === sub.id}
                >
                  <Ionicons name="checkmark" size={14} color="#000" />
                  <Text style={s.approveBtnText}>Aprovar</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* TOP UTILIZADORES */}
        <View style={[s.section, { flex: 2 }]}>
          <View style={s.sectionHead}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="trophy-outline" size={18} color={C.yellow} />
              <Text style={s.sectionTitle}>Top Utilizadores</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/backoffice/utilizadores")}>
              <Text style={s.link}>Ver todos →</Text>
            </TouchableOpacity>
          </View>
          {topUsers.map((u, i) => (
            <View key={i} style={[s.rankRow, i === topUsers.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={[s.rankNum, i < 3 && { color: [C.yellow, "#C0C0C0", "#CD7F32"][i] }]}>#{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.rankName}>{u.nome}</Text>
                <Text style={s.rankSub}>{(u as any).escolas?.sigla || "—"} · Nível {u.nivel || 1}</Text>
              </View>
              <Text style={s.rankXp}>{(u.xp_total || 0).toLocaleString("pt-PT")} XP</Text>
            </View>
          ))}
        </View>
      </View>

      {/* LINHA INFERIOR — Atividade + Equipas + Sistema */}
      <View style={s.rowTwo}>

        {/* ATIVIDADE 7 DIAS */}
        <View style={[s.section, { flex: 2 }]}>
          <View style={s.sectionHead}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="bar-chart-outline" size={18} color={C.teal} />
              <Text style={s.sectionTitle}>Atividade (7 dias)</Text>
            </View>
          </View>
          <View style={s.chartWrap}>
            {atividadeSemana.map((d, i) => (
              <View key={i} style={s.barCol}>
                <Text style={s.barValue}>{d.count > 0 ? d.count : ""}</Text>
                <View style={[s.bar, { height: Math.max(4, (d.count / maxAtividade) * 80), backgroundColor: d.count > 0 ? C.green : C.border }]} />
                <Text style={s.barLabel}>{d.dia}</Text>
              </View>
            ))}
          </View>
          <Text style={s.chartNote}>Total: {atividadeSemana.reduce((a, d) => a + d.count, 0)} submissões nos últimos 7 dias</Text>
        </View>

        {/* TOP EQUIPAS */}
        <View style={[s.section, { flex: 2 }]}>
          <View style={s.sectionHead}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="shield-outline" size={18} color={C.blue} />
              <Text style={s.sectionTitle}>Top Equipas</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/backoffice/equipas")}>
              <Text style={s.link}>Ver todas →</Text>
            </TouchableOpacity>
          </View>
          {topEquipas.length === 0
            ? <Text style={s.emptyText}>Sem equipas registadas.</Text>
            : topEquipas.map((e, i) => (
              <View key={i} style={[s.rankRow, i === topEquipas.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={[s.rankNum, i < 3 && { color: [C.yellow, "#C0C0C0", "#CD7F32"][i] }]}>#{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.rankName}>{e.nome}</Text>
                  <Text style={s.rankSub}>{(e as any).equipa_membros?.[0]?.count || 0} membros</Text>
                </View>
                <Text style={s.rankXp}>{(e.xp_total || 0).toLocaleString("pt-PT")} XP</Text>
              </View>
            ))
          }
        </View>

        {/* ESTADO DO SISTEMA */}
        <View style={[s.section, { flex: 2 }]}>
          <View style={s.sectionHead}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="settings-outline" size={18} color={C.muted} />
              <Text style={s.sectionTitle}>Estado do Sistema</Text>
            </View>
          </View>

          <StatusItem
            icon="checkmark-circle"
            label="Aprovação automática"
            value={stats.aprovacaoAuto ? "Ativa" : "Manual"}
            color={stats.aprovacaoAuto ? C.green : C.yellow}
            onPress={() => router.push("/backoffice/submissoes")}
          />
          <StatusItem
            icon="ribbon"
            label="Missões ativas"
            value={`${stats.missoesConfiguradas} configuradas`}
            color={stats.missoesConfiguradas > 0 ? C.green : C.red}
            onPress={() => router.push("/backoffice/missoes")}
          />
          <StatusItem
            icon="people"
            label="Utilizadores"
            value={`${stats.utilizadores} registados`}
            color={C.teal}
            onPress={() => router.push("/backoffice/utilizadores")}
          />
          <StatusItem
            icon="document-text"
            label="Submissões pendentes"
            value={stats.subsPendentes > 0 ? `${stats.subsPendentes} por rever` : "Em dia"}
            color={stats.subsPendentes > 0 ? C.yellow : C.green}
            onPress={() => router.push("/backoffice/submissoes")}
          />

          {/* ATALHOS RÁPIDOS */}
          <Text style={[s.muted, { marginTop: 20, marginBottom: 10, fontWeight: "700", fontSize: 12 }]}>ACESSO RÁPIDO</Text>
          <View style={s.shortcuts}>
            {[
              { icon: "person-outline", label: "Utilizadores", route: "/backoffice/utilizadores" },
              { icon: "flag-outline", label: "Desafios", route: "/backoffice/desafios" },
              { icon: "ribbon-outline", label: "Missões", route: "/backoffice/missoes" },
              { icon: "bar-chart-outline", label: "Estatísticas", route: "/backoffice/estatisticas" },
              { icon: "download-outline", label: "Exportar", route: "/backoffice/exportar" },
              { icon: "pricetag-outline", label: "Categorias", route: "/backoffice/categorias" },
            ].map(item => (
              <TouchableOpacity key={item.route} style={s.shortcut} onPress={() => router.push(item.route as any)}>
                <Ionicons name={item.icon as any} size={18} color={C.green} />
                <Text style={s.shortcutLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

    </BackofficeLayout>
  );
}

function KPI({ icon, color, label, value, sub, urgent }: { icon: string; color: string; label: string; value: string | number; sub: string; urgent?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: urgent ? 1.5 : 1, borderColor: urgent ? colors.yellow : colors.border, gap: 4 }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 6, backgroundColor: color + "18" }}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[Type.metric, { color }]}>{value}</Text>
      <Text style={[Type.footnote, { color: colors.textMuted }]}>{label}</Text>
      <Text style={{ color: colors.textDim, fontSize: 11 }}>{sub}</Text>
    </View>
  );
}

function StatusItem({ icon, label, value, color, onPress }: { icon: string; label: string; value: string; color: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }} onPress={onPress}>
      <Ionicons name={icon as any} size={16} color={color} />
      <Text style={{ flex: 1, color: colors.textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: "800", color }}>{value}</Text>
      <Ionicons name="chevron-forward" size={14} color={colors.textDim} />
    </TouchableOpacity>
  );
}

function makeStyles(C: any) { return StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  title: { ...Type.largeTitle, color: C.text },
  muted: { ...Type.body, color: C.muted, marginTop: 2 },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.card, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  refreshText: { color: C.green, fontWeight: "700", fontSize: 13 },

  alertBanner: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.yellow + "15", borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: C.yellow + "55", marginBottom: 20, marginTop: 14 },
  alertTitle: { color: C.yellow, fontWeight: "900", fontSize: 14 },
  alertDesc: { color: C.muted, fontSize: 12, marginTop: 2 },

  kpiRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  kpiCard: { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, gap: 4 },
  kpiIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  kpiValue: { ...Type.metric },
  kpiLabel: { ...Type.footnote, color: C.muted },
  kpiSub: { ...Type.caption, color: C.dim },

  rowTwo: { flexDirection: "row", gap: 16, marginTop: 20, ...(Platform.OS !== "web" ? { flexDirection: "column" } : {}) },
  section: { backgroundColor: C.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.border },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { ...Type.headline, color: C.text },
  link: { color: C.green, fontSize: 13, fontWeight: "700" },
  badge: { backgroundColor: C.yellow + "22", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: C.yellow, fontWeight: "900", fontSize: 12 },

  emptyState: { alignItems: "center", paddingVertical: 24, gap: 10 },
  emptyText: { color: C.muted, fontSize: 13, textAlign: "center" },

  pendRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  pendAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.green + "22", justifyContent: "center", alignItems: "center" },
  pendAvatarText: { color: C.green, fontWeight: "900", fontSize: 15 },
  pendName: { color: C.text, fontWeight: "800", fontSize: 13 },
  pendAction: { color: C.muted, fontSize: 12 },
  pendDate: { color: C.dim, fontSize: 11, marginTop: 2 },
  approveBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.green, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  approveBtnText: { color: "#000", fontWeight: "900", fontSize: 12 },

  rankRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  rankNum: { color: C.dim, fontWeight: "900", fontSize: 13, width: 28 },
  rankName: { color: C.text, fontWeight: "700", fontSize: 13 },
  rankSub: { color: C.dim, fontSize: 11 },
  rankXp: { color: C.yellow, fontWeight: "900", fontSize: 12 },

  chartWrap: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 100, marginBottom: 8 },
  barCol: { flex: 1, alignItems: "center", gap: 4, justifyContent: "flex-end" },
  bar: { width: "70%", borderRadius: 4 },
  barValue: { color: C.green, fontSize: 10, fontWeight: "700", minHeight: 14 },
  barLabel: { color: C.dim, fontSize: 11 },
  chartNote: { color: C.dim, fontSize: 11, marginTop: 4 },

  statusItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  statusLabel: { flex: 1, color: C.muted, fontSize: 13 },
  statusValue: { fontSize: 12, fontWeight: "800" },

  shortcuts: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  shortcut: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.bg, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border },
  shortcutLabel: { color: C.muted, fontSize: 12, fontWeight: "700" },
}); }
