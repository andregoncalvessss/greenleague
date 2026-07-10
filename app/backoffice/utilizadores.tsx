// SQL necessário (correr no Supabase SQL Editor):
// ALTER TABLE public.utilizadores ADD COLUMN IF NOT EXISTS banido boolean NOT NULL DEFAULT false;

import { Picker } from "@react-native-picker/picker";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import BackofficeLayout from "../../components/BackofficeLayout";
import Pagination from "../../components/Pagination";
import { supabase } from "../../src/lib/supabase";

import { useTheme } from "../../components/ThemeProvider";
import { useToast } from "../../components/ToastProvider";
import { Type } from "../../constants/typography";

const ESCOLA_CORES = ["#4CFF3B", "#50E3C2", "#FFB020", "#5B8DEF", "#A78BFA", "#FF5555", "#FB923C"];
const ESCOLA_PER_PAGE = 4;
const CURSO_PER_PAGE = 4;

export default function UtilizadoresBackoffice() {
  const { colors, isDark } = useTheme();
  const { showConfirm, showToast } = useToast();
  const C = { green: colors.primary, red: colors.red, teal: colors.secondary, yellow: colors.yellow, purple: colors.purple, card: colors.card, bg: colors.bg, border: colors.border, text: colors.text, muted: colors.textMuted, dim: colors.textDim, isDark };
  const s = useMemo(() => makeStyles(C), [colors, isDark]);
  const [utilizadores, setUtilizadores] = useState<any[]>([]);
  const [pesquisa, setPesquisa] = useState("");
  const [filtroEscola, setFiltroEscola] = useState("todas");
  const [filtroCurso, setFiltroCurso] = useState("todos");
  const [filtroRole, setFiltroRole] = useState("todas");
  const [escolaDestaque, setEscolaDestaque] = useState<string[]>([]);
  const [cursoDestaque, setCursoDestaque] = useState<string[]>([]);
  const [paginaEscola, setPaginaEscola] = useState(0);
  const [paginaCurso, setPaginaCurso] = useState(0);
  const [paginaLista, setPaginaLista] = useState(0);
  const LISTA_PER_PAGE = 15;

  const escolasUnicas = Array.from(new Set(utilizadores.map(u => u.escolas?.sigla).filter(Boolean)));
  const cursosUnicos = Array.from(new Set(utilizadores.map(u => u.cursos?.nome).filter(Boolean)));

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const { data } = await supabase
      .from("utilizadores")
      .select("id, nome, email, role, banido, xp_total, nivel, co2_poupado, agua_poupada, criado_em, escolas(nome, sigla), cursos(nome, escolas(sigla))")
      .order("xp_total", { ascending: false });
    setUtilizadores(data || []);
  }

  async function alterarRole(id: string, roleAtual: string, nome: string) {
    const tornandoAdmin = roleAtual !== "admin";
    const confirmado = await showConfirm({
      title: tornandoAdmin ? "Tornar Administrador" : "Remover Administrador",
      message: tornandoAdmin
        ? `Vai ser atribuído acesso total ao backoffice a ${nome}. Esta ação pode ser revertida a qualquer momento.`
        : `${nome} vai perder o acesso ao backoffice e todas as permissões de administrador.`,
      confirmText: tornandoAdmin ? "Tornar Administrador" : "Remover Acesso",
      cancelText: "Cancelar",
      destructive: !tornandoAdmin,
      icon: tornandoAdmin ? "shield-checkmark-outline" : "person-remove-outline",
      iconColor: tornandoAdmin ? colors.primary : colors.red,
    });
    if (!confirmado) return;
    const { error } = await supabase
      .from("utilizadores")
      .update({ role: tornandoAdmin ? "admin" : "user" })
      .eq("id", id);
    if (error) {
      showToast({ type: "error", title: "Erro", message: "Não foi possível alterar a permissão." });
    } else {
      showToast({
        type: "success",
        title: tornandoAdmin ? "Administrador atribuído" : "Permissão removida",
        message: tornandoAdmin
          ? `${nome} é agora administrador.`
          : `${nome} voltou a ser utilizador.`,
      });
      carregar();
    }
  }

  async function banirUtilizador(id: string, nome: string, banidoAtual: boolean) {
    const tornandoBanido = !banidoAtual;
    const confirmado = await showConfirm({
      title: tornandoBanido ? "Banir Utilizador" : "Remover Ban",
      message: tornandoBanido
        ? `${nome} vai perder o acesso à aplicação imediatamente. Podes reverter esta ação a qualquer momento.`
        : `${nome} vai recuperar o acesso normal à aplicação.`,
      confirmText: tornandoBanido ? "Banir" : "Remover Ban",
      cancelText: "Cancelar",
      destructive: tornandoBanido,
      icon: tornandoBanido ? "ban-outline" : "checkmark-circle-outline",
      iconColor: tornandoBanido ? colors.red : colors.primary,
    });
    if (!confirmado) return;
    const { error } = await supabase
      .from("utilizadores")
      .update({ banido: tornandoBanido })
      .eq("id", id);
    if (error) {
      showToast({ type: "error", title: "Erro", message: "Não foi possível atualizar o estado de banimento." });
    } else {
      showToast({
        type: tornandoBanido ? "warning" : "success",
        title: tornandoBanido ? "Utilizador banido" : "Ban removido",
        message: tornandoBanido ? `${nome} foi banido da aplicação.` : `${nome} já pode aceder novamente.`,
      });
      carregar();
    }
  }

  async function eliminarUtilizador(id: string, nome: string) {
    const confirmado = await showConfirm({
      title: "Eliminar Utilizador",
      message: `Esta ação é permanente e não pode ser revertida. Todos os dados de ${nome} (XP, submissões, histórico) serão perdidos.`,
      confirmText: "Eliminar Definitivamente",
      cancelText: "Cancelar",
      destructive: true,
      icon: "trash-outline",
      iconColor: colors.red,
    });
    if (!confirmado) return;
    const { error } = await supabase.from("utilizadores").delete().eq("id", id);
    if (error) {
      showToast({ type: "error", title: "Erro", message: "Não foi possível eliminar o utilizador." });
    } else {
      showToast({ type: "success", title: "Utilizador eliminado", message: `${nome} foi removido permanentemente.` });
      carregar();
    }
  }

  // ── Stats por escola ──────────────────────────────────────────────────────
  const statsPorEscola = useMemo(() => {
    const mapa: Record<string, { nome: string; sigla: string; count: number; xpTotal: number; co2Total: number }> = {};
    utilizadores.forEach(u => {
      const sigla = u.escolas?.sigla || "—";
      const nome = u.escolas?.nome || sigla;
      if (!mapa[sigla]) mapa[sigla] = { nome, sigla, count: 0, xpTotal: 0, co2Total: 0 };
      mapa[sigla].count++;
      mapa[sigla].xpTotal += u.xp_total || 0;
      mapa[sigla].co2Total += parseFloat(u.co2_poupado || 0);
    });
    return Object.values(mapa).sort((a, b) => b.count - a.count);
  }, [utilizadores]);

  // ── Stats por curso ───────────────────────────────────────────────────────
  const statsPorCurso = useMemo(() => {
    const mapa: Record<string, { nome: string; escolaSigla: string; count: number; xpTotal: number }> = {};
    utilizadores.forEach(u => {
      const nome = u.cursos?.nome || "Sem curso";
      const escolaSigla = (u.cursos as any)?.escolas?.sigla || u.escolas?.sigla || "—";
      if (!mapa[nome]) mapa[nome] = { nome, escolaSigla, count: 0, xpTotal: 0 };
      mapa[nome].count++;
      mapa[nome].xpTotal += u.xp_total || 0;
    });
    return Object.values(mapa).sort((a, b) => b.count - a.count);
  }, [utilizadores]);

  // Cursos visíveis na secção "Por Curso" — restritos às escolas selecionadas, se houver
  const statsPorCursoVisivel = useMemo(() => {
    if (escolaDestaque.length === 0) return statsPorCurso;
    return statsPorCurso.filter(c => escolaDestaque.includes(c.escolaSigla));
  }, [statsPorCurso, escolaDestaque]);

  useEffect(() => { setPaginaCurso(0); }, [escolaDestaque]);

  // ── Lista filtrada ────────────────────────────────────────────────────────
  const filtrados = useMemo(() => {
    return utilizadores.filter(u => {
      const texto = `${u.nome} ${u.email} ${u.escolas?.nome} ${u.cursos?.nome}`.toLowerCase();
      const passaEscola = filtroEscola === "todas" || u.escolas?.sigla === filtroEscola;
      const passaCurso = filtroCurso === "todos" || u.cursos?.nome === filtroCurso;
      const passaRole = filtroRole === "todas" || u.role === filtroRole;
      const passaDestaque = (escolaDestaque.length === 0 || escolaDestaque.includes(u.escolas?.sigla)) && (cursoDestaque.length === 0 || cursoDestaque.includes(u.cursos?.nome));
      return texto.includes(pesquisa.toLowerCase()) && passaEscola && passaCurso && passaRole && passaDestaque;
    });
  }, [utilizadores, pesquisa, filtroEscola, filtroCurso, filtroRole, escolaDestaque, cursoDestaque]);

  // Reset da página da lista sempre que os filtros mudam
  useEffect(() => { setPaginaLista(0); }, [pesquisa, filtroEscola, filtroCurso, filtroRole, escolaDestaque, cursoDestaque]);
  const totalPaginasLista = Math.ceil(filtrados.length / LISTA_PER_PAGE);
  const filtradosPagina = filtrados.slice(paginaLista * LISTA_PER_PAGE, (paginaLista + 1) * LISTA_PER_PAGE);

  const total = utilizadores.length;
  const totalAdmins = utilizadores.filter(u => u.role === "admin").length;
  const totalXP = utilizadores.reduce((a, u) => a + (u.xp_total || 0), 0);

  const totalPaginasEscola = Math.ceil(statsPorEscola.length / ESCOLA_PER_PAGE);
  const totalPaginasCurso = Math.ceil(statsPorCursoVisivel.length / CURSO_PER_PAGE);
  const escolasPagina = statsPorEscola.slice(paginaEscola * ESCOLA_PER_PAGE, (paginaEscola + 1) * ESCOLA_PER_PAGE);
  const cursosPagina = statsPorCursoVisivel.slice(paginaCurso * CURSO_PER_PAGE, (paginaCurso + 1) * CURSO_PER_PAGE);

  function toggleEscolaFilter(sigla: string) {
    setEscolaDestaque(prev => prev.includes(sigla) ? prev.filter(s => s !== sigla) : [...prev, sigla]);
  }

  function toggleCursoFilter(nome: string) {
    setCursoDestaque(prev => prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome]);
  }

  return (
    <BackofficeLayout>
      <Text style={s.title}>Gestão de Utilizadores</Text>
      <Text style={s.subtitle}>Visão geral dos utilizadores, escolas e cursos do IPVC.</Text>

      {/* KPIs */}
      <View style={s.kpiRow}>
        <KPI label="Total" value={total} icon="people" color={C.teal} />
        <KPI label="Admins" value={totalAdmins} icon="shield" color={C.yellow} />
        <KPI label="Utilizadores" value={total - totalAdmins} icon="person" color={C.green} />
        <KPI label="Escolas" value={statsPorEscola.length} icon="business" color="#5B8DEF" />
        <KPI label="Cursos" value={statsPorCurso.length} icon="book" color="#A78BFA" />
        <KPI label="XP Total" value={totalXP.toLocaleString("pt-PT")} icon="star" color={C.yellow} />
      </View>

      {/* ── POR ESCOLA ─────────────────────────────────────────────────────── */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="business-outline" size={18} color="#5B8DEF" />
            <Text style={s.sectionTitle}>Por Escola</Text>
            <Text style={s.paginaLabel}>{statsPorEscola.length} escolas</Text>
          </View>
          {escolaDestaque.length > 0 && (
            <TouchableOpacity onPress={() => setEscolaDestaque([])} style={s.clearFilter}>
              <Ionicons name="close" size={13} color={C.yellow} />
              <Text style={s.clearFilterText}>Limpar Filtro{escolaDestaque.length > 1 ? ` (${escolaDestaque.length})` : ""}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.hRow}>
          {escolasPagina.map((escola, i) => {
            const globalIdx = statsPorEscola.findIndex(e => e.sigla === escola.sigla);
            const cor = ESCOLA_CORES[globalIdx % ESCOLA_CORES.length];
            const pct = Math.round((escola.count / total) * 100);
            const ativo = escolaDestaque.includes(escola.sigla);
            const avgXp = escola.count > 0 ? Math.round(escola.xpTotal / escola.count) : 0;
            return (
              <TouchableOpacity
                key={escola.sigla}
                style={[s.escolaCard, { flex: 1 }, ativo && { borderColor: cor, backgroundColor: cor + "0D" }]}
                onPress={() => toggleEscolaFilter(escola.sigla)}
                activeOpacity={0.75}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <ProgressRing pct={pct} color={cor} trackColor={C.border} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <View style={[s.escolaSiglaBox, { width: 22, height: 22, borderRadius: 6, backgroundColor: cor + "22", borderColor: cor + "55" }]}>
                        <Text style={[s.escolaSigla, { fontSize: 9, color: cor }]}>{escola.sigla}</Text>
                      </View>
                      <Text style={s.escolaNome} numberOfLines={1}>{escola.nome}</Text>
                    </View>
                    <Text style={s.escolaStats}>{escola.count} utilizadores</Text>
                    <Text style={s.barCaption}>do total de utilizadores da app</Text>
                  </View>
                  {ativo && <Ionicons name="funnel" size={14} color={cor} />}
                </View>
                <View style={[s.escolaMeta, { marginTop: 4 }]}>
                  <View style={s.metaItem}>
                    <Ionicons name="star-outline" size={11} color={C.dim} />
                    <Text style={s.metaText}>XP médio: <Text style={{ color: cor, fontWeight: "800" }}>{avgXp.toLocaleString("pt-PT")}</Text></Text>
                  </View>
                  <View style={s.metaItem}>
                    <Ionicons name="leaf-outline" size={11} color={C.dim} />
                    <Text style={s.metaText}>CO₂: <Text style={{ color: C.teal, fontWeight: "800" }}>{escola.co2Total.toFixed(1)}kg</Text></Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          {/* Placeholders para manter largura quando página incompleta */}
          {Array.from({ length: ESCOLA_PER_PAGE - escolasPagina.length }).map((_, i) => (
            <View key={`ph-${i}`} style={{ flex: 1 }} />
          ))}
        </View>

        <Pagination page={paginaEscola} totalPages={totalPaginasEscola} onChange={setPaginaEscola} />
      </View>

      {/* ── POR CURSO ──────────────────────────────────────────────────────── */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="book-outline" size={18} color="#A78BFA" />
            <Text style={s.sectionTitle}>Por Curso</Text>
            <Text style={s.paginaLabel}>{statsPorCursoVisivel.length} curso{statsPorCursoVisivel.length !== 1 ? "s" : ""}</Text>
          </View>
          {cursoDestaque.length > 0 && (
            <TouchableOpacity onPress={() => setCursoDestaque([])} style={s.clearFilter}>
              <Ionicons name="close" size={13} color={C.yellow} />
              <Text style={s.clearFilterText}>Limpar Filtro{cursoDestaque.length > 1 ? ` (${cursoDestaque.length})` : ""}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.hRow}>
          {cursosPagina.map((curso) => {
            const pct = Math.round((curso.count / total) * 100);
            const ativo = cursoDestaque.includes(curso.nome);
            const escolaIdx = statsPorEscola.findIndex(e => e.sigla === curso.escolaSigla);
            const cor = escolaIdx >= 0 ? ESCOLA_CORES[escolaIdx % ESCOLA_CORES.length] : "#888";
            const avgXp = curso.count > 0 ? Math.round(curso.xpTotal / curso.count) : 0;
            return (
              <TouchableOpacity
                key={curso.nome}
                style={[s.escolaCard, { flex: 1 }, ativo && { borderColor: "#A78BFA", backgroundColor: "#A78BFA0D" }]}
                onPress={() => toggleCursoFilter(curso.nome)}
                activeOpacity={0.75}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <ProgressRing pct={pct} color={ativo ? "#A78BFA" : cor} trackColor={C.border} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <View style={[s.escolaSiglaBox, { width: 22, height: 22, borderRadius: 6, backgroundColor: cor + "22", borderColor: cor + "55" }]}>
                        <Text style={[s.escolaSigla, { fontSize: 9, color: cor }]}>{curso.escolaSigla}</Text>
                      </View>
                      <Text style={s.escolaNome} numberOfLines={1}>{curso.nome}</Text>
                    </View>
                    <Text style={s.escolaStats}>{curso.count} utilizadores</Text>
                    <Text style={s.barCaption}>do total de utilizadores da app</Text>
                  </View>
                  {ativo && <Ionicons name="funnel" size={14} color="#A78BFA" />}
                </View>
                <View style={[s.escolaMeta, { marginTop: 4 }]}>
                  <View style={s.metaItem}>
                    <Ionicons name="star-outline" size={11} color={C.dim} />
                    <Text style={s.metaText}>XP médio: <Text style={{ color: "#A78BFA", fontWeight: "800" }}>{avgXp.toLocaleString("pt-PT")}</Text></Text>
                  </View>
                  <View style={s.metaItem}>
                    <Ionicons name="business-outline" size={11} color={C.dim} />
                    <Text style={s.metaText}>Escola: <Text style={{ color: cor, fontWeight: "800" }}>{curso.escolaSigla}</Text></Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          {Array.from({ length: CURSO_PER_PAGE - cursosPagina.length }).map((_, i) => (
            <View key={`ph-${i}`} style={{ flex: 1 }} />
          ))}
        </View>

        <Pagination page={paginaCurso} totalPages={totalPaginasCurso} onChange={setPaginaCurso} />
      </View>

      {/* LISTA DE UTILIZADORES */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>
            Lista de Utilizadores
            {(escolaDestaque.length > 0 || cursoDestaque.length > 0) && (
              <Text style={{ color: C.yellow, fontSize: 14, fontWeight: "700" }}>
                {" "}· {filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}
              </Text>
            )}
          </Text>
          {(escolaDestaque.length > 0 || cursoDestaque.length > 0) && (
            <TouchableOpacity onPress={() => { setEscolaDestaque([]); setCursoDestaque([]); }} style={s.clearFilter}>
              <Ionicons name="close" size={13} color={C.yellow} />
              <Text style={s.clearFilterText}>
                Limpar Filtro{(escolaDestaque.length + cursoDestaque.length) > 1 ? ` (${escolaDestaque.length + cursoDestaque.length})` : ""}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.filtersRow}>
          <TextInput
            value={pesquisa}
            onChangeText={setPesquisa}
            placeholder="Pesquisar por nome, email, escola ou curso..."
            placeholderTextColor="#555"
            style={s.input}
          />
          <View style={s.selectContainer}>
            <Picker selectedValue={filtroEscola} onValueChange={setFiltroEscola} dropdownIconColor={C.green} style={s.picker}>
              <Picker.Item label="Todas as escolas" value="todas" />
              {escolasUnicas.map(e => <Picker.Item key={String(e)} label={String(e)} value={String(e)} />)}
            </Picker>
          </View>
          <View style={s.selectContainer}>
            <Picker selectedValue={filtroCurso} onValueChange={setFiltroCurso} dropdownIconColor={C.green} style={s.picker}>
              <Picker.Item label="Todos os cursos" value="todos" />
              {cursosUnicos.map(c => <Picker.Item key={String(c)} label={String(c)} value={String(c)} />)}
            </Picker>
          </View>
          <View style={s.selectContainer}>
            <Picker selectedValue={filtroRole} onValueChange={setFiltroRole} dropdownIconColor={C.green} style={s.picker}>
              <Picker.Item label="Todas as roles" value="todas" />
              <Picker.Item label="Admin" value="admin" />
              <Picker.Item label="User" value="user" />
            </Picker>
          </View>
        </View>

        <Text style={s.countText}>{filtrados.length} utilizadores encontrados</Text>

        <View style={s.tableHeader}>
          <Text style={[s.th, { flex: 2 }]}>Nome</Text>
          <Text style={[s.th, { flex: 2 }]}>Email</Text>
          <Text style={s.th}>Escola</Text>
          <Text style={[s.th, { flex: 2 }]}>Curso</Text>
          <Text style={s.th}>Nível</Text>
          <Text style={s.th}>XP</Text>
          <Text style={s.th}>Cargo</Text>
          <Text style={[s.th, { flex: 3 }]}>Ação</Text>
        </View>

        {filtradosPagina.map((u, i) => {
          const escolaIdx = statsPorEscola.findIndex(e => e.sigla === u.escolas?.sigla);
          const cor = escolaIdx >= 0 ? ESCOLA_CORES[escolaIdx % ESCOLA_CORES.length] : "#888";
          return (
            <View key={u.id} style={[s.tableRow, i % 2 === 0 && { backgroundColor: C.border + "50" }, u.banido && { opacity: 0.55 }]}>
              <View style={[s.td, { flex: 2, flexDirection: "row", alignItems: "center", gap: 8 }]}>
                <View style={[s.avatar, { backgroundColor: cor + "22" }]}>
                  <Text style={[s.avatarText, { color: cor }]}>{(u.nome || "?")[0].toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={[s.td, { fontWeight: "800", flex: 0 }]}>{u.nome}</Text>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    {u.role === "admin" && <Text style={s.adminBadge}>admin</Text>}
                    {u.banido && <Text style={s.banidoBadge}>banido</Text>}
                  </View>
                </View>
              </View>
              <Text style={[s.td, { flex: 2, color: C.muted, fontSize: 12 }]}>{u.email}</Text>
              <View style={[s.td, { alignItems: "flex-start" }]}>
                <View style={[s.escolaPill, { backgroundColor: cor + "22" }]}>
                  <Text style={[s.escolaPillText, { color: cor }]}>{u.escolas?.sigla || "—"}</Text>
                </View>
              </View>
              <Text style={[s.td, { flex: 2, fontSize: 12 }]}>{u.cursos?.nome || "—"}</Text>
              <View style={[s.td, { alignItems: "flex-start" }]}>
                <Text style={s.nivelBadge}>Lv {u.nivel || 1}</Text>
              </View>
              <Text style={[s.td, { color: C.yellow, fontWeight: "700" }]}>{(u.xp_total || 0).toLocaleString("pt-PT")}</Text>
              <Text style={[s.td, { color: u.role === "admin" ? C.yellow : C.muted, fontSize: 12 }]}>{u.role || "user"}</Text>
              <View style={[s.td, { flex: 3, flexDirection: "row", alignItems: "center", gap: 6 }]}>
                <TouchableOpacity
                  style={[s.roleButton, u.role === "admin" ? s.roleButtonAdmin : s.roleButtonUser]}
                  onPress={() => alterarRole(u.id, u.role, u.nome)}
                >
                  <Ionicons
                    name={u.role === "admin" ? "person-outline" : "shield-outline"}
                    size={12}
                    color={u.role === "admin" ? "#000" : C.green}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[s.roleButtonText, u.role === "admin" && { color: C.isDark ? "#000" : "#FFF" }]}>
                    {u.role === "admin" ? "Tornar Utilizador" : "Tornar Administrador"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.iconActionBtn, u.banido ? s.iconActionBtnGreen : s.iconActionBtnYellow]}
                  onPress={() => banirUtilizador(u.id, u.nome, !!u.banido)}
                >
                  <Ionicons name={u.banido ? "checkmark-circle-outline" : "ban-outline"} size={14} color={u.banido ? C.green : C.yellow} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.iconActionBtn, s.iconActionBtnRed]}
                  onPress={() => eliminarUtilizador(u.id, u.nome)}
                >
                  <Ionicons name="trash-outline" size={14} color={C.red} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {filtrados.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 32, gap: 8 }}>
            <Ionicons name="search-outline" size={32} color={C.dim} />
            <Text style={s.emptyText}>Nenhum utilizador encontrado.</Text>
          </View>
        )}

        <Pagination page={paginaLista} totalPages={totalPaginasLista} onChange={setPaginaLista} />
      </View>
    </BackofficeLayout>
  );
}

function KPI({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 4 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 6, backgroundColor: color + "18" }}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: "900", color }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function ProgressRing({ pct, color, trackColor, size = 56, strokeWidth = 6 }: { pct: number; color: string; trackColor: string; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, pct)) / 100) * circumference;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={{ fontSize: size * 0.24, fontWeight: "900", color }}>{Math.round(pct)}%</Text>
    </View>
  );
}

function makeStyles(C: any) { return StyleSheet.create({
  title: { ...Type.largeTitle, color: C.text },
  subtitle: { ...Type.body, color: C.muted, marginTop: 6, marginBottom: 24 },

  kpiRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  kpiCard: { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, gap: 4 },
  kpiIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  kpiValue: { ...Type.metric },
  kpiLabel: { ...Type.footnote, color: C.muted },

  section: { backgroundColor: C.card, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { ...Type.headline, color: C.text },
  paginaLabel: { color: C.dim, fontSize: 12, fontWeight: "700" },
  clearFilter: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.yellow + "18", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: C.yellow + "44" },
  clearFilterText: { color: C.yellow, fontSize: 12, fontWeight: "700" },

  hRow: { flexDirection: "row", gap: 12 },

  escolaCard: { backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border },
  escolaSiglaBox: { borderRadius: 10, borderWidth: 1, width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  escolaSigla: { fontSize: 13, fontWeight: "900" },
  escolaNome: { color: C.text, fontWeight: "700", fontSize: 13, flex: 1 },
  escolaStats: { color: C.muted, fontSize: 11, marginTop: 2 },
  barCaption: { color: C.dim, fontSize: 10, marginTop: 1 },
  escolaMeta: { flexDirection: "row", gap: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: C.dim, fontSize: 11 },


  emptyText: { color: C.muted, fontSize: 13 },

  filtersRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  input: { flex: 3, backgroundColor: C.card, color: C.text, borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: C.border },
  selectContainer: { flex: 1, height: 46, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: "hidden", justifyContent: "center" },
  picker: { color: C.text, height: 46, backgroundColor: C.card },
  countText: { color: C.muted, fontSize: 13, marginBottom: 14 },

  tableHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  th: { ...Type.overline, flex: 1, color: C.muted },
  tableRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8, marginBottom: 2 },
  td: { ...Type.callout, flex: 1, color: C.text },

  avatar: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  avatarText: { fontWeight: "900", fontSize: 14 },
  adminBadge: { backgroundColor: C.yellow + "18", color: C.yellow, fontSize: 10, fontWeight: "900", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, alignSelf: "flex-start", marginTop: 2, borderWidth: 1, borderColor: C.yellow + "44" },
  banidoBadge: { backgroundColor: C.red + "18", color: C.red, fontSize: 10, fontWeight: "900", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, alignSelf: "flex-start", marginTop: 2, borderWidth: 1, borderColor: C.red + "44" },
  escolaPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start" },
  escolaPillText: { fontWeight: "900", fontSize: 12 },
  nivelBadge: { color: C.purple, fontWeight: "800", fontSize: 12, backgroundColor: C.purple + "18", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start" },

  roleButton: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1 },
  roleButtonUser: { backgroundColor: C.green + "18", borderColor: C.green + "55" },
  roleButtonAdmin: { backgroundColor: C.yellow, borderColor: C.yellow },
  roleButtonText: { color: C.green, fontWeight: "700", fontSize: 11 },

  iconActionBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  iconActionBtnYellow: { backgroundColor: C.yellow + "18", borderColor: C.yellow + "55" },
  iconActionBtnGreen: { backgroundColor: C.green + "18", borderColor: C.green + "55" },
  iconActionBtnRed: { backgroundColor: C.red + "12", borderColor: C.red + "44" },
}); }
