import { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BackofficeLayout from "../../components/BackofficeLayout";
import { supabase } from "../../src/lib/supabase";
import { useToast } from "../../components/ToastProvider";
import { useTheme } from "../../components/ThemeProvider";
import { Type } from "../../constants/typography";

type ExportConfig = {
  id: string;
  titulo: string;
  descricao: string;
  icon: string;
  cor: string;
  buscar: () => Promise<{ colunas: string[]; linhas: any[][] }>;
  nomeFile: string;
};

const EXPORTS: ExportConfig[] = [
  {
    id: "utilizadores",
    titulo: "Utilizadores",
    descricao: "Nome, email, escola, curso, nível, XP, CO₂, água e data de registo.",
    icon: "people-outline",
    cor: "#4CFF3B",
    nomeFile: "utilizadores",
    buscar: async () => {
      const { data } = await supabase
        .from("utilizadores")
        .select("nome, email, role, nivel, xp_total, co2_poupado, agua_poupada, numero_aluno, ano_frequencia, criado_em, escolas(nome, sigla), cursos(nome)")
        .order("xp_total", { ascending: false });
      const colunas = ["Nome", "Email", "Role", "Escola", "Sigla Escola", "Curso", "Número Aluno", "Ano", "Nível", "XP Total", "CO2 Poupado (kg)", "Água Poupada (L)", "Criado Em"];
      const linhas = (data || []).map((u: any) => [
        u.nome, u.email, u.role || "user",
        u.escolas?.nome || "", u.escolas?.sigla || "",
        u.cursos?.nome || "", u.numero_aluno || "", u.ano_frequencia || "",
        u.nivel || 1, u.xp_total || 0,
        parseFloat(u.co2_poupado || 0).toFixed(3),
        parseFloat(u.agua_poupada || 0).toFixed(3),
        u.criado_em ? new Date(u.criado_em).toLocaleDateString("pt-PT") : "",
      ]);
      return { colunas, linhas };
    },
  },
  {
    id: "submissoes",
    titulo: "Submissões",
    descricao: "Todas as submissões com utilizador, ação, estado, XP atribuído e datas.",
    icon: "clipboard-outline",
    cor: "#FFB020",
    nomeFile: "submissoes",
    buscar: async () => {
      const { data } = await supabase
        .from("submissoes_acao")
        .select("estado, quantidade, xp_atribuido, co2_atribuido, agua_atribuida, criado_em, validado_em, descricao_user, utilizadores(nome, email), catalogo_acoes(titulo, categorias_acao(nome))")
        .order("criado_em", { ascending: false });
      const colunas = ["Utilizador", "Email", "Ação", "Categoria", "Quantidade", "Estado", "XP Atribuído", "CO2 Atribuído (kg)", "Água Atribuída (L)", "Descrição", "Submetido Em", "Validado Em"];
      const linhas = (data || []).map((s: any) => [
        s.utilizadores?.nome || "", s.utilizadores?.email || "",
        s.catalogo_acoes?.titulo || "", s.catalogo_acoes?.categorias_acao?.nome || "",
        s.quantidade || 1, s.estado,
        s.xp_atribuido ?? "", s.co2_atribuido ?? "", s.agua_atribuida ?? "",
        s.descricao_user || "",
        s.criado_em ? new Date(s.criado_em).toLocaleDateString("pt-PT") : "",
        s.validado_em ? new Date(s.validado_em).toLocaleDateString("pt-PT") : "",
      ]);
      return { colunas, linhas };
    },
  },
  {
    id: "equipas",
    titulo: "Equipas",
    descricao: "Todas as equipas com código, XP e número de membros.",
    icon: "shield-outline",
    cor: "#5BE0FF",
    nomeFile: "equipas",
    buscar: async () => {
      const { data } = await supabase
        .from("equipas")
        .select("nome, codigo_convite, xp_total, permissao_convite, created_at, utilizadores!equipas_criador_id_fkey(nome, email), equipa_membros(count)")
        .order("xp_total", { ascending: false });
      const colunas = ["Nome", "Código", "Líder", "Email Líder", "XP Total", "Membros", "Permissão Convite", "Criada Em"];
      const linhas = (data || []).map((e: any) => [
        e.nome, e.codigo_convite,
        e.utilizadores?.nome || "", e.utilizadores?.email || "",
        e.xp_total || 0, e.equipa_membros?.[0]?.count || 0,
        e.permissao_convite,
        e.created_at ? new Date(e.created_at).toLocaleDateString("pt-PT") : "",
      ]);
      return { colunas, linhas };
    },
  },
  {
    id: "membros_equipas",
    titulo: "Membros por Equipa",
    descricao: "Relação completa de cada membro com a sua equipa e função.",
    icon: "person-add-outline",
    cor: "#A78BFA",
    nomeFile: "membros_equipas",
    buscar: async () => {
      const { data } = await supabase
        .from("equipa_membros")
        .select("funcao, joined_at, equipas(nome), utilizadores(nome, email, xp_total, nivel)")
        .order("joined_at");
      const colunas = ["Utilizador", "Email", "Equipa", "Função", "Nível", "XP", "Entrou Em"];
      const linhas = (data || []).map((m: any) => [
        m.utilizadores?.nome || "", m.utilizadores?.email || "",
        m.equipas?.nome || "", m.funcao,
        m.utilizadores?.nivel || 1, m.utilizadores?.xp_total || 0,
        m.joined_at ? new Date(m.joined_at).toLocaleDateString("pt-PT") : "",
      ]);
      return { colunas, linhas };
    },
  },
  {
    id: "desafios",
    titulo: "Catálogo de Desafios",
    descricao: "Todos os desafios/ações com XP, CO₂, água estimada e estado.",
    icon: "flag-outline",
    cor: "#34D399",
    nomeFile: "catalogo_acoes",
    buscar: async () => {
      const { data } = await supabase
        .from("catalogo_acoes")
        .select("titulo, descricao, xp_base, co2_estimado, agua_estimada, unidade_medida, ativo, categorias_acao(nome)")
        .order("id");
      const colunas = ["Título", "Descrição", "Categoria", "XP Base", "CO2 Estimado (kg)", "Água Estimada (L)", "Unidade", "Ativo"];
      const linhas = (data || []).map((a: any) => [
        a.titulo, a.descricao || "", a.categorias_acao?.nome || "",
        a.xp_base, a.co2_estimado || 0, a.agua_estimada || 0,
        a.unidade_medida, a.ativo ? "Sim" : "Não",
      ]);
      return { colunas, linhas };
    },
  },
  {
    id: "ranking",
    titulo: "Ranking Completo",
    descricao: "Ranking geral de todos os utilizadores por XP, com posição.",
    icon: "trophy-outline",
    cor: "#FCD34D",
    nomeFile: "ranking",
    buscar: async () => {
      const { data } = await supabase
        .from("utilizadores")
        .select("nome, email, nivel, xp_total, co2_poupado, agua_poupada, escolas(sigla), cursos(nome)")
        .order("xp_total", { ascending: false });
      const colunas = ["Posição", "Nome", "Email", "Escola", "Curso", "Nível", "XP Total", "CO2 (kg)", "Água (L)"];
      const linhas = (data || []).map((u: any, i: number) => [
        i + 1, u.nome, u.email,
        u.escolas?.sigla || "", u.cursos?.nome || "",
        u.nivel || 1, u.xp_total || 0,
        parseFloat(u.co2_poupado || 0).toFixed(3),
        parseFloat(u.agua_poupada || 0).toFixed(3),
      ]);
      return { colunas, linhas };
    },
  },
];

function exportarCSV(colunas: string[], linhas: any[][], nomeFile: string) {
  const escapar = (v: any) => {
    const str = String(v ?? "").replace(/"/g, '""');
    return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
  };
  const csvConteudo = [colunas, ...linhas].map(row => row.map(escapar).join(",")).join("\n");
  const BOM = "﻿";
  const blob = new Blob([BOM + csvConteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const data = new Date().toISOString().split("T")[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `greenleague_${nomeFile}_${data}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ExportarBackoffice() {
  const { colors, isDark } = useTheme();
  const C = { green: colors.primary, red: colors.red, yellow: colors.yellow, bg: colors.bg, card: colors.card, border: colors.border, text: colors.text, muted: colors.textMuted, dim: colors.textDim, isDark };
  const s = useMemo(() => makeStyles(C), [colors, isDark]);
  const { showToast } = useToast();
  const [estados, setEstados] = useState<Record<string, "idle" | "loading" | "done" | "error">>({});

  async function handleExport(config: ExportConfig) {
    if (Platform.OS !== "web") {
      showToast({ type: 'info', message: 'A exportação de CSV está disponível apenas na versão web do backoffice.' });
      return;
    }
    setEstados(prev => ({ ...prev, [config.id]: "loading" }));
    try {
      const { colunas, linhas } = await config.buscar();
      exportarCSV(colunas, linhas, config.nomeFile);
      setEstados(prev => ({ ...prev, [config.id]: "done" }));
      setTimeout(() => setEstados(prev => ({ ...prev, [config.id]: "idle" })), 3000);
    } catch (e) {
      console.error(e);
      setEstados(prev => ({ ...prev, [config.id]: "error" }));
      setTimeout(() => setEstados(prev => ({ ...prev, [config.id]: "idle" })), 3000);
    }
  }

  return (
    <BackofficeLayout>
      <Text style={s.title}>Exportar Dados</Text>
      <Text style={s.subtitle}>Exporta os dados da plataforma em formato CSV compatível com Excel, Google Sheets, etc.</Text>

      {Platform.OS !== "web" && (
        <View style={s.alertBox}>
          <Ionicons name="information-circle-outline" size={24} color={C.yellow} />
          <Text style={s.alertText}>A exportação de ficheiros CSV está disponível apenas na versão web do backoffice.</Text>
        </View>
      )}

      <View style={s.grid}>
        {EXPORTS.map(config => {
          const estado = estados[config.id] || "idle";
          return (
            <View key={config.id} style={s.card}>
              <View style={s.cardBody}>
                <View style={[s.cardIcon, { backgroundColor: config.cor + "22", borderColor: config.cor + "44" }]}>
                  <Ionicons name={config.icon as any} size={32} color={config.cor} />
                </View>
                <Text style={s.cardTitle}>{config.titulo}</Text>
                <Text style={s.cardDesc}>{config.descricao}</Text>
              </View>
              <TouchableOpacity
                style={[s.btn, estado === "done" && s.btnDone, estado === "error" && s.btnError, estado === "loading" && s.btnLoading]}
                onPress={() => handleExport(config)}
                disabled={estado === "loading"}
              >
                <Ionicons
                  name={estado === "done" ? "checkmark-circle" : estado === "error" ? "close-circle" : "download-outline"}
                  size={16}
                  color={estado === "done" ? C.green : estado === "error" ? C.red : isDark ? "#000" : "#FFF"}
                />
                <Text style={[s.btnText, (estado === "done" || estado === "error") && { color: estado === "done" ? C.green : C.red }]}>
                  {estado === "loading" ? "A exportar..." : estado === "done" ? "Exportado!" : estado === "error" ? "Erro!" : "Exportar CSV"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <View style={s.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color={C.green} />
        <View style={{ flex: 1 }}>
          <Text style={s.infoTitle}>Sobre os ficheiros exportados</Text>
          <Text style={s.infoText}>
            Os ficheiros CSV são gerados com codificação UTF-8 (BOM) para compatibilidade com Microsoft Excel.
            Contêm todos os registos da base de dados no momento da exportação.
            Os valores numéricos usam ponto como separador decimal.
          </Text>
        </View>
      </View>
    </BackofficeLayout>
  );
}

function makeStyles(C: any) { return StyleSheet.create({
  title: { ...Type.largeTitle, color: C.text },
  subtitle: { ...Type.body, color: C.muted, marginTop: 6, marginBottom: 28 },
  alertBox: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.yellow + "15", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.yellow + "55", marginBottom: 24 },
  alertText: { color: C.yellow, fontWeight: "700", flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 20, marginBottom: 24 },
  card: { flex: 1, minWidth: 240, backgroundColor: C.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.border },
  cardBody: { flex: 1, gap: 12, marginBottom: 16 },
  cardIcon: { width: 60, height: 60, borderRadius: 16, justifyContent: "center", alignItems: "center", borderWidth: 1 },
  cardTitle: { ...Type.headline, color: C.text },
  cardDesc: { ...Type.callout, color: C.muted, lineHeight: 20 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.green, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  btnLoading: { backgroundColor: C.green + "18", borderWidth: 1, borderColor: C.green },
  btnDone: { backgroundColor: C.green + "30", borderWidth: 1, borderColor: C.green },
  btnError: { backgroundColor: C.red + "22", borderWidth: 1, borderColor: C.red },
  btnText: { color: C.isDark ? "#000" : "#FFF", fontWeight: "900", fontSize: 14 },
  infoBox: { flexDirection: "row", gap: 14, backgroundColor: C.green + "18", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.green + "44", alignItems: "flex-start" },
  infoTitle: { ...Type.headline, color: C.green, marginBottom: 6 },
  infoText: { ...Type.callout, color: C.muted },
}); }
