import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Switch } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import BackofficeLayout from "../../components/BackofficeLayout";
import { supabase } from "../../src/lib/supabase";
import { useToast } from "../../components/ToastProvider";
import { useTheme } from "../../components/ThemeProvider";
import { Type } from "../../constants/typography";

const FORM_VAZIO = {
  id: null as number | null,
  titulo: "", descricao: "", categoria_id: "" as any,
  xp_base: "", co2_estimado: "", agua_estimada: "",
  unidade_medida: "unidades", ativo: true,
  tipo: "individual" as "individual" | "equipa",
  meta_equipa: "", xp_recompensa_equipa: "",
};

export default function DesafiosBackoffice() {
  const { colors, isDark } = useTheme();
  const C = { green: colors.primary, red: colors.red, yellow: colors.yellow, bg: colors.bg, card: colors.card, border: colors.border, text: colors.text, muted: colors.textMuted, dim: colors.textDim, isDark };
  const s = useMemo(() => makeStyles(C), [colors, isDark]);
  const { showToast, showConfirm } = useToast();
  const [acoes, setAcoes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [form, setForm] = useState({ ...FORM_VAZIO });
  const [editando, setEditando] = useState(false);
  const [pesquisa, setPesquisa] = useState("");
  const [filtroCat, setFiltroCat] = useState("todas");
  const [filtroAtivo, setFiltroAtivo] = useState("todos");
  const [vista, setVista] = useState<"individual" | "equipa">("individual");
  const [loading, setLoading] = useState(false);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const [{ data: a }, { data: c }] = await Promise.all([
      supabase.from("catalogo_acoes")
        .select("*, categorias_acao(id, nome, cor_hex), submissoes_acao(count)")
        .order("id"),
      supabase.from("categorias_acao").select("id, nome").order("nome"),
    ]);
    setAcoes(a || []);
    setCategorias(c || []);
  }

  async function guardar() {
    if (!form.titulo.trim()) { showToast({ type: 'warning', message: 'O título é obrigatório.' }); return; }
    if (!form.xp_base || isNaN(Number(form.xp_base))) { showToast({ type: 'warning', message: 'O XP base deve ser um número.' }); return; }
    if (form.tipo === "equipa" && (!form.meta_equipa || isNaN(Number(form.meta_equipa)) || Number(form.meta_equipa) <= 0)) {
      showToast({ type: 'warning', message: 'A meta coletiva deve ser um número maior que 0.' }); return;
    }
    setLoading(true);
    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      categoria_id: form.categoria_id || null,
      xp_base: parseInt(form.xp_base),
      co2_estimado: parseFloat(form.co2_estimado) || 0,
      agua_estimada: parseFloat(form.agua_estimada) || 0,
      unidade_medida: form.unidade_medida || "unidades",
      ativo: form.ativo,
      tipo: form.tipo,
      meta_equipa: form.tipo === "equipa" ? parseInt(form.meta_equipa) : null,
      xp_recompensa_equipa: form.tipo === "equipa" ? (parseInt(form.xp_recompensa_equipa) || 0) : null,
    };
    if (form.id) {
      await supabase.from("catalogo_acoes").update(payload).eq("id", form.id);
    } else {
      await supabase.from("catalogo_acoes").insert(payload);
    }
    setForm({ ...FORM_VAZIO });
    setEditando(false);
    setLoading(false);
    carregar();
  }

  async function toggleAtivo(id: number, atual: boolean) {
    await supabase.from("catalogo_acoes").update({ ativo: !atual }).eq("id", id);
    carregar();
  }

  async function eliminar(id: number, titulo: string) {
    const { count } = await supabase.from("submissoes_acao").select("*", { count: "exact", head: true }).eq("acao_id", id);
    if (count && count > 0) {
      showToast({ type: 'warning', title: 'Não é possível eliminar', message: `"${titulo}" tem ${count} submissão(ões) associada(s). Desativa-a em vez disso.` });
      return;
    }
    const ok = await showConfirm({ title: 'Eliminar Desafio', message: `Eliminar o desafio "${titulo}"?`, confirmText: 'Eliminar', destructive: true });
    if (!ok) return;
    await supabase.from("catalogo_acoes").delete().eq("id", id);
    carregar();
  }

  function iniciarEdicao(a: any) {
    setForm({
      id: a.id, titulo: a.titulo, descricao: a.descricao || "",
      categoria_id: a.categoria_id || "",
      xp_base: String(a.xp_base),
      co2_estimado: String(a.co2_estimado || ""),
      agua_estimada: String(a.agua_estimada || ""),
      unidade_medida: a.unidade_medida || "unidades",
      ativo: a.ativo,
      tipo: a.tipo === "equipa" ? "equipa" : "individual",
      meta_equipa: a.meta_equipa != null ? String(a.meta_equipa) : "",
      xp_recompensa_equipa: a.xp_recompensa_equipa != null ? String(a.xp_recompensa_equipa) : "",
    });
    setEditando(true);
  }

  const isEquipa = (a: any) => a.tipo === "equipa";
  const acoesDaVista = acoes.filter(a => vista === "equipa" ? isEquipa(a) : !isEquipa(a));

  const filtradas = acoesDaVista.filter(a => {
    const texto = `${a.titulo} ${a.descricao} ${a.categorias_acao?.nome}`.toLowerCase();
    const passaCat = filtroCat === "todas" || String(a.categoria_id) === filtroCat;
    const passaAtivo = filtroAtivo === "todos" || (filtroAtivo === "ativo" ? a.ativo : !a.ativo);
    return texto.includes(pesquisa.toLowerCase()) && passaCat && passaAtivo;
  });

  return (
    <BackofficeLayout>
      <Text style={s.title}>Catálogo de Desafios</Text>
      <Text style={s.subtitle}>Gere as ações ecológicas disponíveis para os utilizadores submeterem.</Text>

      <View style={s.statsRow}>
        <Stat title="Desafios Individuais" value={acoes.filter(a => !isEquipa(a)).length} icon="person" color={C.green} />
        <Stat title="Desafios de Equipa" value={acoes.filter(a => isEquipa(a)).length} icon="people" color={C.yellow} />
        <Stat title="Ativos" value={acoes.filter(a => a.ativo).length} icon="checkmark-circle" color={C.green} />
        <Stat title="Inativos" value={acoes.filter(a => !a.ativo).length} icon="close-circle" color={C.red} />
      </View>

      {/* FORMULÁRIO */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>{editando ? "Editar Desafio" : "Novo Desafio"}</Text>

        {/* Tipo de desafio */}
        <Text style={s.label}>Tipo de Desafio</Text>
        <View style={s.segment}>
          <TouchableOpacity
            style={[s.segmentBtn, form.tipo === "individual" && s.segmentBtnActive]}
            onPress={() => setForm(f => ({ ...f, tipo: "individual" }))}
          >
            <Ionicons name="person-outline" size={15} color={form.tipo === "individual" ? (isDark ? "#000" : "#FFF") : C.muted} />
            <Text style={[s.segmentText, form.tipo === "individual" && s.segmentTextActive]}>Individual</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.segmentBtn, form.tipo === "equipa" && s.segmentBtnActive]}
            onPress={() => setForm(f => ({ ...f, tipo: "equipa" }))}
          >
            <Ionicons name="people-outline" size={15} color={form.tipo === "equipa" ? (isDark ? "#000" : "#FFF") : C.muted} />
            <Text style={[s.segmentText, form.tipo === "equipa" && s.segmentTextActive]}>Missão de Equipa</Text>
          </TouchableOpacity>
        </View>
        {form.tipo === "equipa" && (
          <Text style={s.hint}>
            Meta coletiva partilhada: os membros da equipa contribuem em conjunto até atingir a quantidade definida. Ao completar, a equipa recebe o XP de recompensa.
          </Text>
        )}

        <View style={s.formRow}>
          <View style={{ flex: 3 }}>
            <Text style={s.label}>Título *</Text>
            <TextInput style={s.input} value={form.titulo} onChangeText={v => setForm(f => ({ ...f, titulo: v }))} placeholder="Ex: Ir de bicicleta para a escola" placeholderTextColor="#777" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Categoria</Text>
            <View style={s.selectContainer}>
              <Picker selectedValue={String(form.categoria_id)} onValueChange={v => setForm(f => ({ ...f, categoria_id: v }))} dropdownIconColor={C.green} style={s.picker}>
                <Picker.Item label="Sem categoria" value="" />
                {categorias.map(c => <Picker.Item key={c.id} label={c.nome} value={String(c.id)} />)}
              </Picker>
            </View>
          </View>
        </View>
        <View>
          <Text style={s.label}>Descrição</Text>
          <TextInput style={[s.input, { height: 80 }]} value={form.descricao} onChangeText={v => setForm(f => ({ ...f, descricao: v }))} placeholder="Descrição detalhada do desafio..." placeholderTextColor="#777" multiline />
        </View>
        <View style={s.formRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>XP Base *</Text>
            <TextInput style={s.input} value={form.xp_base} onChangeText={v => setForm(f => ({ ...f, xp_base: v }))} placeholder="Ex: 100" placeholderTextColor="#777" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>CO₂ Estimado (kg)</Text>
            <TextInput style={s.input} value={form.co2_estimado} onChangeText={v => setForm(f => ({ ...f, co2_estimado: v }))} placeholder="Ex: 0.5" placeholderTextColor="#777" keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Água Estimada (L)</Text>
            <TextInput style={s.input} value={form.agua_estimada} onChangeText={v => setForm(f => ({ ...f, agua_estimada: v }))} placeholder="Ex: 2.0" placeholderTextColor="#777" keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Unidade de Medida</Text>
            <TextInput style={s.input} value={form.unidade_medida} onChangeText={v => setForm(f => ({ ...f, unidade_medida: v }))} placeholder="unidades, km, kg..." placeholderTextColor="#777" />
          </View>
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <Text style={s.label}>Ativo</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 46 }}>
              <Switch value={form.ativo} onValueChange={v => setForm(f => ({ ...f, ativo: v }))} trackColor={{ false: C.border, true: C.green }} />
              <Text style={{ color: form.ativo ? C.green : C.muted }}>{form.ativo ? "Ativo" : "Inativo"}</Text>
            </View>
          </View>
        </View>

        {form.tipo === "equipa" && (
          <View style={s.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Meta Coletiva ({form.unidade_medida || "unidades"}) *</Text>
              <TextInput style={s.input} value={form.meta_equipa} onChangeText={v => setForm(f => ({ ...f, meta_equipa: v }))} placeholder="Ex: 100" placeholderTextColor="#777" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>XP Recompensa da Equipa</Text>
              <TextInput style={s.input} value={form.xp_recompensa_equipa} onChangeText={v => setForm(f => ({ ...f, xp_recompensa_equipa: v }))} placeholder="Ex: 500" placeholderTextColor="#777" keyboardType="numeric" />
            </View>
            <View style={{ flex: 2 }} />
          </View>
        )}

        <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
          <TouchableOpacity style={s.btnPrimary} onPress={guardar} disabled={loading}>
            <Ionicons name={editando ? "checkmark" : "add"} size={18} color={isDark ? "#000" : "#FFF"} />
            <Text style={s.btnPrimaryText}>{editando ? "Guardar Alterações" : "Criar Desafio"}</Text>
          </TouchableOpacity>
          {editando && (
            <TouchableOpacity style={s.btnCancel} onPress={() => { setForm({ ...FORM_VAZIO }); setEditando(false); }}>
              <Text style={s.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* TABELA */}
      <View style={s.section}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={[s.sectionTitle, { marginBottom: 0 }]}>
            {vista === "equipa" ? "Desafios de Equipa" : "Desafios Individuais"}
          </Text>
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
        </View>
        <View style={s.filterBar}>
          <TextInput style={[s.input, { flex: 3 }]} value={pesquisa} onChangeText={setPesquisa} placeholder="Pesquisar..." placeholderTextColor="#777" />
          <View style={s.selectContainer}>
            <Picker selectedValue={filtroCat} onValueChange={v => setFiltroCat(v)} dropdownIconColor={C.green} style={s.picker}>
              <Picker.Item label="Todas as categorias" value="todas" />
              {categorias.map(c => <Picker.Item key={c.id} label={c.nome} value={String(c.id)} />)}
            </Picker>
          </View>
          <View style={s.selectContainer}>
            <Picker selectedValue={filtroAtivo} onValueChange={v => setFiltroAtivo(v)} dropdownIconColor={C.green} style={s.picker}>
              <Picker.Item label="Todos" value="todos" />
              <Picker.Item label="Ativos" value="ativo" />
              <Picker.Item label="Inativos" value="inativo" />
            </Picker>
          </View>
        </View>

        <View style={s.tableHeader}>
          <Text style={[s.th, { flex: 3 }]}>Título</Text>
          <Text style={[s.th, { flex: 1.5 }]}>Categoria</Text>
          <Text style={s.th}>XP Base</Text>
          {vista === "equipa" ? (
            <>
              <Text style={s.th}>Meta</Text>
              <Text style={s.th}>Recompensa</Text>
            </>
          ) : (
            <>
              <Text style={s.th}>CO₂</Text>
              <Text style={s.th}>Água</Text>
              <Text style={s.th}>Unidade</Text>
              <Text style={s.th}>Subs.</Text>
            </>
          )}
          <Text style={s.th}>Estado</Text>
          <Text style={[s.th, { flex: 1.5 }]}>Ações</Text>
        </View>

        {filtradas.map(a => (
          <View key={a.id} style={s.tableRow}>
            <Text style={[s.td, { flex: 3, fontWeight: "800" }]}>{a.titulo}</Text>
            <View style={[s.td, { flex: 1.5, flexDirection: "row", alignItems: "center", gap: 6 }]}>
              {a.categorias_acao?.cor_hex && <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: a.categorias_acao.cor_hex }} />}
              <Text style={s.td}>{a.categorias_acao?.nome || "—"}</Text>
            </View>
            <Text style={[s.td, { color: C.green, fontWeight: "700" }]}>{a.xp_base}</Text>
            {vista === "equipa" ? (
              <>
                <Text style={[s.td, { color: C.yellow, fontWeight: "700" }]}>{a.meta_equipa ?? "—"} {a.unidade_medida}</Text>
                <Text style={[s.td, { color: C.green, fontWeight: "700" }]}>+{a.xp_recompensa_equipa || 0}</Text>
              </>
            ) : (
              <>
                <Text style={s.td}>{a.co2_estimado || 0}</Text>
                <Text style={s.td}>{a.agua_estimada || 0}</Text>
                <Text style={[s.td, { color: C.muted }]}>{a.unidade_medida}</Text>
                <Text style={s.td}>{a.submissoes_acao?.[0]?.count || 0}</Text>
              </>
            )}
            <TouchableOpacity style={s.td} onPress={() => toggleAtivo(a.id, a.ativo)}>
              <Text style={[s.estadoBadge, a.ativo ? s.aprovado : s.rejeitado]}>{a.ativo ? "Ativo" : "Inativo"}</Text>
            </TouchableOpacity>
            <View style={[s.td, { flex: 1.5, flexDirection: "row", gap: 6 }]}>
              <TouchableOpacity style={s.btnSecondary} onPress={() => iniciarEdicao(a)}>
                <Text style={s.btnSecondaryText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnDanger} onPress={() => eliminar(a.id, a.titulo)}>
                <Text style={s.btnDangerText}>Apagar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {filtradas.length === 0 && (
          <Text style={s.emptyText}>
            {vista === "equipa" ? "Sem desafios de equipa. Cria um acima com o tipo \"Missão de Equipa\"." : "Sem desafios encontrados."}
          </Text>
        )}
      </View>
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
  statsRow: { flexDirection: "row", gap: 16, marginBottom: 26 },
  segment: { flexDirection: "row", backgroundColor: C.bg, borderRadius: 10, padding: 4, gap: 4, borderWidth: 1, borderColor: C.border, alignSelf: "flex-start" },
  segmentBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  segmentBtnActive: { backgroundColor: C.green },
  segmentText: { color: C.muted, fontWeight: "700", fontSize: 13 },
  segmentTextActive: { color: C.isDark ? "#000" : "#FFF" },
  hint: { ...Type.callout, color: C.muted, marginTop: 8, marginBottom: 4 },
  section: { backgroundColor: C.card, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  sectionTitle: { ...Type.headline, color: C.text, marginBottom: 16 },
  formRow: { flexDirection: "row", gap: 16, alignItems: "flex-end", marginBottom: 12 },
  label: { ...Type.footnote, color: C.muted, marginBottom: 6 },
  input: { backgroundColor: C.card, color: C.text, borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: C.border },
  selectContainer: { flex: 1, height: 46, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: "hidden", justifyContent: "center" },
  picker: { color: C.text, height: 46, backgroundColor: C.card },
  filterBar: { flexDirection: "row", gap: 12, marginBottom: 18 },
  btnPrimary: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.green, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  btnPrimaryText: { color: C.isDark ? "#000" : "#FFF", fontWeight: "900", fontSize: 14 },
  btnCancel: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  btnCancelText: { color: C.muted, fontWeight: "700" },
  tableHeader: { flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  th: { ...Type.overline, flex: 1, color: C.muted },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  td: { ...Type.callout, flex: 1, color: C.text },
  estadoBadge: { fontSize: 11, fontWeight: "900", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, alignSelf: "flex-start" },
  aprovado: { backgroundColor: C.green + "22", color: C.green },
  rejeitado: { backgroundColor: C.red + "22", color: C.red },
  btnSecondary: { backgroundColor: C.green + "18", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  btnSecondaryText: { color: C.green, fontWeight: "800", fontSize: 12 },
  btnDanger: { backgroundColor: C.red + "18", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  btnDangerText: { color: C.red, fontWeight: "800", fontSize: 12 },
  emptyText: { color: C.muted, marginTop: 12 },
}); }
