import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BackofficeLayout from "../../components/BackofficeLayout";
import { supabase } from "../../src/lib/supabase";
import { useToast } from "../../components/ToastProvider";
import { useTheme } from "../../components/ThemeProvider";

// NOTA: Esta página requer a criação da tabela 'campanhas' na base de dados.
// Corre o seguinte SQL no Supabase SQL Editor:
//
// CREATE TABLE public.campanhas (
//   id uuid NOT NULL DEFAULT gen_random_uuid(),
//   titulo character varying NOT NULL,
//   descricao text,
//   data_inicio date NOT NULL,
//   data_fim date NOT NULL,
//   ativa boolean DEFAULT true,
//   escola_id integer REFERENCES public.escolas(id),
//   xp_bonus integer DEFAULT 0,
//   criado_em timestamp DEFAULT now(),
//   CONSTRAINT campanhas_pkey PRIMARY KEY (id)
// );

const FORM_VAZIO = {
  id: null as string | null,
  titulo: "", descricao: "",
  data_inicio: "", data_fim: "",
  ativa: true, escola_id: "" as any, xp_bonus: "",
};

export default function CampanhasBackoffice() {
  const { colors } = useTheme();
  const C = { green: colors.primary, red: colors.red, yellow: colors.yellow, bg: colors.bg, card: colors.card, border: colors.border, text: colors.text, muted: colors.textMuted, dim: colors.textDim };
  const s = useMemo(() => makeStyles(C), [colors]);
  const { showToast, showConfirm } = useToast();
  const [campanhas, setCampanhas] = useState<any[]>([]);
  const [escolas, setEscolas] = useState<any[]>([]);
  const [form, setForm] = useState({ ...FORM_VAZIO });
  const [editando, setEditando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tabelaExiste, setTabelaExiste] = useState(true);
  const [pesquisa, setPesquisa] = useState("");

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const { data: e } = await supabase.from("escolas").select("id, nome, sigla").order("id");
    setEscolas(e || []);

    const { data, error } = await supabase
      .from("campanhas")
      .select("*, escolas(nome, sigla)")
      .order("data_inicio", { ascending: false });

    if (error?.code === "42P01") {
      setTabelaExiste(false);
    } else {
      setTabelaExiste(true);
      setCampanhas(data || []);
    }
  }

  async function guardar() {
    if (!form.titulo.trim()) { showToast({ type: 'warning', message: 'O título é obrigatório.' }); return; }
    if (!form.data_inicio || !form.data_fim) { showToast({ type: 'warning', message: 'As datas são obrigatórias.' }); return; }
    setLoading(true);
    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
      ativa: form.ativa,
      escola_id: form.escola_id || null,
      xp_bonus: parseInt(form.xp_bonus) || 0,
    };
    if (form.id) {
      await supabase.from("campanhas").update(payload).eq("id", form.id);
    } else {
      await supabase.from("campanhas").insert(payload);
    }
    setForm({ ...FORM_VAZIO });
    setEditando(false);
    setLoading(false);
    carregar();
  }

  async function eliminar(id: string, titulo: string) {
    const ok = await showConfirm({ title: 'Eliminar Campanha', message: `Eliminar a campanha "${titulo}"?`, confirmText: 'Eliminar', destructive: true });
    if (!ok) return;
    await supabase.from("campanhas").delete().eq("id", id);
    carregar();
  }

  async function toggleAtiva(id: string, atual: boolean) {
    await supabase.from("campanhas").update({ ativa: !atual }).eq("id", id);
    carregar();
  }

  function iniciarEdicao(c: any) {
    setForm({
      id: c.id, titulo: c.titulo, descricao: c.descricao || "",
      data_inicio: c.data_inicio, data_fim: c.data_fim,
      ativa: c.ativa, escola_id: c.escola_id || "", xp_bonus: String(c.xp_bonus || ""),
    });
    setEditando(true);
  }

  const hoje = new Date().toISOString().split("T")[0];
  const filtradas = campanhas.filter(c =>
    `${c.titulo} ${c.descricao} ${c.escolas?.nome}`.toLowerCase().includes(pesquisa.toLowerCase())
  );

  const ativas = campanhas.filter(c => c.ativa && c.data_fim >= hoje).length;
  const terminadas = campanhas.filter(c => c.data_fim < hoje).length;

  if (!tabelaExiste) {
    return (
      <BackofficeLayout>
        <Text style={s.title}>Campanhas</Text>
        <Text style={s.subtitle}>Gestão de campanhas temáticas de sustentabilidade.</Text>
        <View style={s.alertBox}>
          <Ionicons name="warning-outline" size={32} color={C.yellow} />
          <Text style={s.alertTitle}>Tabela "campanhas" não existe na Base de Dados</Text>
          <Text style={s.alertText}>Para ativar esta funcionalidade, corre o seguinte SQL no Supabase SQL Editor:</Text>
          <View style={s.codeBox}>
            <Text style={s.code}>{`CREATE TABLE public.campanhas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titulo character varying NOT NULL,
  descricao text,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  ativa boolean DEFAULT true,
  escola_id integer REFERENCES public.escolas(id),
  xp_bonus integer DEFAULT 0,
  criado_em timestamp DEFAULT now(),
  CONSTRAINT campanhas_pkey PRIMARY KEY (id)
);

-- Permite acesso pelo admin
ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerem campanhas"
  ON public.campanhas FOR ALL
  USING (true) WITH CHECK (true);`}</Text>
          </View>
          <TouchableOpacity style={s.btnPrimary} onPress={carregar}>
            <Ionicons name="refresh" size={16} color="#000" />
            <Text style={s.btnPrimaryText}>Verificar novamente</Text>
          </TouchableOpacity>
        </View>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <Text style={s.title}>Campanhas</Text>
      <Text style={s.subtitle}>Cria e gere campanhas temáticas de sustentabilidade por escola ou para toda a plataforma.</Text>

      <View style={s.statsRow}>
        <Stat title="Total" value={campanhas.length} />
        <Stat title="Ativas" value={ativas} color={C.green} />
        <Stat title="Terminadas" value={terminadas} color={C.muted} />
      </View>

      {/* FORMULÁRIO */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>{editando ? "Editar Campanha" : "Nova Campanha"}</Text>
        <View style={s.formRow}>
          <View style={{ flex: 3 }}>
            <Text style={s.label}>Título *</Text>
            <TextInput style={s.input} value={form.titulo} onChangeText={v => setForm(f => ({ ...f, titulo: v }))} placeholder="Ex: Semana da Mobilidade 2025" placeholderTextColor="#777" />
          </View>
          <View style={{ flex: 1.5 }}>
            <Text style={s.label}>Escola (opcional)</Text>
            <TextInput style={s.input} value={form.escola_id ? (escolas.find(e => e.id === Number(form.escola_id))?.nome || "") : ""} placeholder="Todas as escolas" placeholderTextColor="#777" editable={false} />
            <Text style={{ color: "#555", fontSize: 11, marginTop: 4 }}>Deixa vazio para todas as escolas</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Bónus XP</Text>
            <TextInput style={s.input} value={form.xp_bonus} onChangeText={v => setForm(f => ({ ...f, xp_bonus: v }))} placeholder="0" placeholderTextColor="#777" keyboardType="numeric" />
          </View>
        </View>
        <View style={s.formRow}>
          <View style={{ flex: 2 }}>
            <Text style={s.label}>Data de Início *</Text>
            <TextInput style={s.input} value={form.data_inicio} onChangeText={v => setForm(f => ({ ...f, data_inicio: v }))} placeholder="YYYY-MM-DD" placeholderTextColor="#777" />
          </View>
          <View style={{ flex: 2 }}>
            <Text style={s.label}>Data de Fim *</Text>
            <TextInput style={s.input} value={form.data_fim} onChangeText={v => setForm(f => ({ ...f, data_fim: v }))} placeholder="YYYY-MM-DD" placeholderTextColor="#777" />
          </View>
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <Text style={s.label}>Ativa</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 46 }}>
              <Switch value={form.ativa} onValueChange={v => setForm(f => ({ ...f, ativa: v }))} trackColor={{ false: C.border, true: C.green }} />
              <Text style={{ color: form.ativa ? C.green : C.muted }}>{form.ativa ? "Sim" : "Não"}</Text>
            </View>
          </View>
        </View>
        <View>
          <Text style={s.label}>Descrição</Text>
          <TextInput style={[s.input, { height: 80 }]} value={form.descricao} onChangeText={v => setForm(f => ({ ...f, descricao: v }))} placeholder="Descreve a campanha..." placeholderTextColor="#777" multiline />
        </View>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
          <TouchableOpacity style={s.btnPrimary} onPress={guardar} disabled={loading}>
            <Ionicons name={editando ? "checkmark" : "add"} size={18} color="#000" />
            <Text style={s.btnPrimaryText}>{editando ? "Guardar Alterações" : "Criar Campanha"}</Text>
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
        <Text style={s.sectionTitle}>Lista de Campanhas</Text>
        <TextInput style={[s.input, { marginBottom: 18 }]} value={pesquisa} onChangeText={setPesquisa} placeholder="Pesquisar campanhas..." placeholderTextColor="#777" />

        <View style={s.tableHeader}>
          <Text style={[s.th, { flex: 2 }]}>Título</Text>
          <Text style={s.th}>Escola</Text>
          <Text style={s.th}>Início</Text>
          <Text style={s.th}>Fim</Text>
          <Text style={s.th}>XP Bónus</Text>
          <Text style={s.th}>Estado</Text>
          <Text style={[s.th, { flex: 1.5 }]}>Ações</Text>
        </View>

        {filtradas.map(c => {
          const terminada = c.data_fim < hoje;
          return (
            <View key={c.id} style={s.tableRow}>
              <Text style={[s.td, { flex: 2, fontWeight: "800" }]}>{c.titulo}</Text>
              <Text style={s.td}>{c.escolas?.sigla || "Todas"}</Text>
              <Text style={[s.td, { fontSize: 12 }]}>{c.data_inicio}</Text>
              <Text style={[s.td, { fontSize: 12 }]}>{c.data_fim}</Text>
              <Text style={[s.td, { color: C.green, fontWeight: "700" }]}>+{c.xp_bonus || 0}</Text>
              <TouchableOpacity style={s.td} onPress={() => !terminada && toggleAtiva(c.id, c.ativa)}>
                <Text style={[s.badge, terminada ? s.terminada : c.ativa ? s.ativaStyle : s.inativa]}>
                  {terminada ? "Terminada" : c.ativa ? "Ativa" : "Inativa"}
                </Text>
              </TouchableOpacity>
              <View style={[s.td, { flex: 1.5, flexDirection: "row", gap: 6 }]}>
                <TouchableOpacity style={s.btnSecondary} onPress={() => iniciarEdicao(c)}>
                  <Text style={s.btnSecondaryText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnDanger} onPress={() => eliminar(c.id, c.titulo)}>
                  <Text style={s.btnDangerText}>Apagar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
        {filtradas.length === 0 && <Text style={s.emptyText}>Sem campanhas. Cria a primeira acima.</Text>}
      </View>
    </BackofficeLayout>
  );
}

function Stat({ title, value, color }: { title: string; value: number; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ fontSize: 28, fontWeight: "900", color: color || colors.text }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 6 }}>{title}</Text>
    </View>
  );
}

function makeStyles(C: any) { return StyleSheet.create({
  title: { color: C.text, fontSize: 28, fontWeight: "900" },
  subtitle: { color: C.muted, fontSize: 15, marginTop: 6, marginBottom: 28 },
  statsRow: { flexDirection: "row", gap: 16, marginBottom: 26 },
  section: { backgroundColor: C.bg, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  sectionTitle: { color: C.text, fontSize: 18, fontWeight: "900", marginBottom: 16 },
  formRow: { flexDirection: "row", gap: 16, alignItems: "flex-end", marginBottom: 12 },
  label: { color: C.muted, fontSize: 13, marginBottom: 6 },
  input: { backgroundColor: C.card, color: C.text, borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: C.border },
  btnPrimary: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.green, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  btnPrimaryText: { color: "#000", fontWeight: "900", fontSize: 14 },
  btnCancel: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  btnCancelText: { color: C.muted, fontWeight: "700" },
  tableHeader: { flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  th: { flex: 1, color: C.green, fontSize: 13, fontWeight: "900" },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  td: { flex: 1, color: C.text, fontSize: 13 },
  badge: { fontSize: 11, fontWeight: "900", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, alignSelf: "flex-start" },
  ativaStyle: { backgroundColor: C.green + "22", color: C.green },
  inativa: { backgroundColor: "#80808022", color: C.muted },
  terminada: { backgroundColor: "#80808015", color: C.dim },
  btnSecondary: { backgroundColor: C.green + "18", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  btnSecondaryText: { color: C.green, fontWeight: "800", fontSize: 12 },
  btnDanger: { backgroundColor: C.red + "18", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  btnDangerText: { color: C.red, fontWeight: "800", fontSize: 12 },
  emptyText: { color: C.muted, marginTop: 12 },
  alertBox: { backgroundColor: C.yellow + "15", borderRadius: 20, padding: 30, borderWidth: 1, borderColor: C.yellow + "55", alignItems: "center", gap: 16 },
  alertTitle: { color: C.yellow, fontSize: 20, fontWeight: "900", textAlign: "center" },
  alertText: { color: C.muted, fontSize: 15, textAlign: "center" },
  codeBox: { backgroundColor: C.bg, borderRadius: 12, padding: 18, width: "100%", borderWidth: 1, borderColor: C.border },
  code: { color: C.green, fontSize: 12, fontFamily: "monospace", lineHeight: 20 },
}); }
