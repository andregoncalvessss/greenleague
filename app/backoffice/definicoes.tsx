import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BackofficeLayout from "../../components/BackofficeLayout";
import { supabase } from "../../src/lib/supabase";
import { useToast } from "../../components/ToastProvider";
import { useTheme } from "../../components/ThemeProvider";
import { Type } from "../../constants/typography";

export default function DefinicoesBackoffice() {
  const { colors, isDark } = useTheme();
  const C = { green: colors.primary, red: colors.red, yellow: colors.yellow, blue: colors.blue, bg: colors.bg, card: colors.card, border: colors.border, text: colors.text, muted: colors.textMuted, dim: colors.textDim, isDark };
  const s = useMemo(() => makeStyles(C), [colors, isDark]);
  const { showToast, showConfirm } = useToast();

  // ── Escolas / Cursos ──
  const [escolas, setEscolas] = useState<any[]>([]);
  const [formEscola, setFormEscola] = useState<{ id: number | null; nome: string; sigla: string }>({ id: null, nome: "", sigla: "" });
  const [novoCurso, setNovoCurso] = useState<Record<number, string>>({});
  const [cursoEdicao, setCursoEdicao] = useState<{ id: number; nome: string } | null>(null);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const { data } = await supabase
      .from("escolas")
      .select("id, nome, sigla, cursos(id, nome)")
      .order("nome");
    setEscolas(data || []);
  }

  // ── ESCOLAS ────────────────────────────────────────────────────────────────
  async function guardarEscola() {
    const nome = formEscola.nome.trim();
    const sigla = formEscola.sigla.trim().toUpperCase();
    if (!nome || !sigla) { showToast({ type: "warning", message: "Preenche o nome e a sigla da escola." }); return; }
    const payload = { nome, sigla };
    const { error } = formEscola.id
      ? await supabase.from("escolas").update(payload).eq("id", formEscola.id)
      : await supabase.from("escolas").insert(payload);
    if (error) {
      showToast({ type: "error", message: error.message.includes("duplicate") ? "Já existe uma escola com essa sigla." : "Erro ao guardar a escola." });
      return;
    }
    showToast({ type: "success", message: formEscola.id ? "Escola atualizada." : "Escola criada." });
    setFormEscola({ id: null, nome: "", sigla: "" });
    carregar();
  }

  async function eliminarEscola(e: any) {
    const cursoIds = (e.cursos || []).map((c: any) => c.id);
    const ok = await showConfirm({
      title: "Eliminar Escola",
      message: `Eliminar "${e.nome}" (${e.sigla})?\n\nOs cursos desta escola serão eliminados e os utilizadores associados terão de escolher novamente a escola e o curso ao abrir a app.`,
      confirmText: "Eliminar",
      destructive: true,
      icon: "trash-outline",
      iconColor: colors.red,
    });
    if (!ok) return;
    try {
      // Limpa as referências dos utilizadores afetados → serão reenviados ao onboarding.
      if (cursoIds.length > 0) {
        await supabase.from("utilizadores").update({ curso_id: null }).in("curso_id", cursoIds);
      }
      await supabase.from("utilizadores").update({ escola_id: null, curso_id: null }).eq("escola_id", e.id);
      // Apaga os cursos e depois a escola.
      await supabase.from("cursos").delete().eq("escola_id", e.id);
      const { error } = await supabase.from("escolas").delete().eq("id", e.id);
      if (error) throw error;
    } catch (err: any) {
      showToast({ type: "error", title: "Erro ao eliminar", message: err?.message || "Não foi possível eliminar a escola." });
      return;
    }
    if (formEscola.id === e.id) setFormEscola({ id: null, nome: "", sigla: "" });
    showToast({ type: "success", message: "Escola eliminada." });
    carregar();
  }

  // ── CURSOS ─────────────────────────────────────────────────────────────────
  async function adicionarCurso(escolaId: number) {
    const nome = (novoCurso[escolaId] || "").trim();
    if (!nome) return;
    const { error } = await supabase.from("cursos").insert({ nome, escola_id: escolaId });
    if (error) { showToast({ type: "error", message: "Erro ao adicionar o curso." }); return; }
    setNovoCurso(prev => ({ ...prev, [escolaId]: "" }));
    carregar();
  }

  async function guardarCurso() {
    if (!cursoEdicao) return;
    const nome = cursoEdicao.nome.trim();
    if (!nome) return;
    const { error } = await supabase.from("cursos").update({ nome }).eq("id", cursoEdicao.id);
    if (error) { showToast({ type: "error", message: "Erro ao guardar o curso." }); return; }
    setCursoEdicao(null);
    carregar();
  }

  async function eliminarCurso(curso: any) {
    const ok = await showConfirm({
      title: "Eliminar Curso",
      message: `Eliminar o curso "${curso.nome}"?\n\nOs utilizadores deste curso terão de escolher novamente a escola e o curso ao abrir a app.`,
      confirmText: "Eliminar",
      destructive: true,
      icon: "trash-outline",
      iconColor: colors.red,
    });
    if (!ok) return;
    try {
      // Limpa a referência dos utilizadores afetados → serão reenviados ao onboarding.
      await supabase.from("utilizadores").update({ curso_id: null }).eq("curso_id", curso.id);
      const { error } = await supabase.from("cursos").delete().eq("id", curso.id);
      if (error) throw error;
    } catch (err: any) {
      showToast({ type: "error", title: "Erro ao eliminar", message: err?.message || "Não foi possível eliminar o curso." });
      return;
    }
    carregar();
  }

  const totalCursos = escolas.reduce((acc, e) => acc + (e.cursos?.length || 0), 0);

  return (
    <BackofficeLayout>
      <Text style={s.title}>Definições</Text>
      <Text style={s.subtitle}>Gere a estrutura de escolas e cursos da plataforma.</Text>

      {/* ── ESCOLAS ── */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Escolas e Cursos</Text>
          <Text style={s.counter}>{escolas.length} escola(s) · {totalCursos} curso(s)</Text>
        </View>

        {/* Form nova/editar escola */}
        <View style={s.escolaForm}>
          <View style={{ width: 110 }}>
            <Text style={s.label}>Sigla</Text>
            <TextInput
              style={s.input}
              value={formEscola.sigla}
              onChangeText={v => setFormEscola(f => ({ ...f, sigla: v }))}
              placeholder="ESTG"
              placeholderTextColor="#777"
              autoCapitalize="characters"
              maxLength={10}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Nome da Escola</Text>
            <TextInput
              style={s.input}
              value={formEscola.nome}
              onChangeText={v => setFormEscola(f => ({ ...f, nome: v }))}
              placeholder="Ex: Escola Superior de Tecnologia e Gestão"
              placeholderTextColor="#777"
            />
          </View>
          <View style={{ justifyContent: "flex-end", flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={s.btnPrimary} onPress={guardarEscola}>
              <Ionicons name={formEscola.id ? "checkmark" : "add"} size={16} color={isDark ? "#000" : "#FFF"} />
              <Text style={s.btnPrimaryText}>{formEscola.id ? "Guardar" : "Adicionar"}</Text>
            </TouchableOpacity>
            {formEscola.id && (
              <TouchableOpacity style={s.btnCancel} onPress={() => setFormEscola({ id: null, nome: "", sigla: "" })}>
                <Text style={s.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Lista de escolas */}
        {escolas.map(e => (
          <View key={e.id} style={s.escolaCard}>
            <View style={s.escolaHeader}>
              <View style={s.siglaBox}>
                <Text style={s.siglaText}>{e.sigla}</Text>
              </View>
              <Text style={s.escolaNome}>{e.nome}</Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <TouchableOpacity style={s.iconBtn} onPress={() => setFormEscola({ id: e.id, nome: e.nome, sigla: e.sigla })}>
                  <Ionicons name="create-outline" size={16} color={C.blue} />
                </TouchableOpacity>
                <TouchableOpacity style={s.iconBtn} onPress={() => eliminarEscola(e)}>
                  <Ionicons name="trash-outline" size={16} color={C.red} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Cursos */}
            <View style={s.cursosWrap}>
              {(e.cursos || []).length === 0 && <Text style={s.semCursos}>Sem cursos registados.</Text>}
              {(e.cursos || []).sort((a: any, b: any) => a.nome.localeCompare(b.nome)).map((curso: any) => (
                <View key={curso.id} style={s.cursoRow}>
                  <Ionicons name="book-outline" size={14} color={C.muted} />
                  {cursoEdicao?.id === curso.id ? (
                    <>
                      <TextInput
                        style={[s.input, { flex: 1, height: 38 }]}
                        value={cursoEdicao?.nome ?? ""}
                        onChangeText={v => setCursoEdicao({ id: curso.id, nome: v })}
                        autoFocus
                      />
                      <TouchableOpacity style={s.iconBtn} onPress={guardarCurso}>
                        <Ionicons name="checkmark" size={16} color={C.green} />
                      </TouchableOpacity>
                      <TouchableOpacity style={s.iconBtn} onPress={() => setCursoEdicao(null)}>
                        <Ionicons name="close" size={16} color={C.muted} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={s.cursoNome}>{curso.nome}</Text>
                      <TouchableOpacity style={s.iconBtn} onPress={() => setCursoEdicao({ id: curso.id, nome: curso.nome })}>
                        <Ionicons name="create-outline" size={15} color={C.blue} />
                      </TouchableOpacity>
                      <TouchableOpacity style={s.iconBtn} onPress={() => eliminarCurso(curso)}>
                        <Ionicons name="trash-outline" size={15} color={C.red} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ))}

              {/* Adicionar curso */}
              <View style={s.addCursoRow}>
                <TextInput
                  style={[s.input, { flex: 1, height: 40 }]}
                  value={novoCurso[e.id] || ""}
                  onChangeText={v => setNovoCurso(prev => ({ ...prev, [e.id]: v }))}
                  placeholder="Novo curso..."
                  placeholderTextColor="#777"
                  onSubmitEditing={() => adicionarCurso(e.id)}
                />
                <TouchableOpacity style={s.btnAddCurso} onPress={() => adicionarCurso(e.id)}>
                  <Ionicons name="add" size={18} color={C.green} />
                  <Text style={s.btnAddCursoText}>Adicionar curso</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        {escolas.length === 0 && <Text style={s.emptyText}>Sem escolas registadas. Cria a primeira acima.</Text>}
      </View>
    </BackofficeLayout>
  );
}

function makeStyles(C: any) { return StyleSheet.create({
  title: { ...Type.largeTitle, color: C.text },
  subtitle: { ...Type.body, color: C.muted, marginTop: 6, marginBottom: 28 },
  section: { backgroundColor: C.card, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { ...Type.headline, color: C.text, marginBottom: 16 },
  counter: { ...Type.footnote, color: C.muted, marginBottom: 16 },
  label: { ...Type.footnote, color: C.muted, marginBottom: 6 },
  hint: { ...Type.caption, color: C.dim, marginBottom: 10 },
  input: { backgroundColor: C.bg, color: C.text, borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: C.border },
  inlineRow: { flexDirection: "row", gap: 12, alignItems: "flex-end" },
  btnPrimary: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.green, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10, height: 46 },
  btnPrimaryText: { color: C.isDark ? "#000" : "#FFF", fontWeight: "900", fontSize: 14 },
  btnCancel: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: C.border, height: 46, justifyContent: "center" },
  btnCancelText: { color: C.muted, fontWeight: "700" },

  escolaForm: { flexDirection: "row", gap: 12, marginBottom: 20, alignItems: "flex-end", flexWrap: "wrap" },
  escolaCard: { backgroundColor: C.bg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  escolaHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  siglaBox: { backgroundColor: C.green + "18", borderColor: C.green + "44", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 54, alignItems: "center" },
  siglaText: { color: C.green, fontWeight: "900", fontSize: 13 },
  escolaNome: { flex: 1, color: C.text, fontWeight: "700", fontSize: 15 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, justifyContent: "center", alignItems: "center" },

  cursosWrap: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border, gap: 8 },
  semCursos: { color: C.dim, fontSize: 13, fontStyle: "italic" },
  cursoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cursoNome: { flex: 1, color: C.text, fontSize: 14 },
  addCursoRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  btnAddCurso: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.green + "18", borderWidth: 1, borderColor: C.green + "44", borderRadius: 10, paddingHorizontal: 14, height: 40 },
  btnAddCursoText: { color: C.green, fontWeight: "800", fontSize: 13 },

  emptyText: { color: C.muted, marginTop: 8 },
}); }
