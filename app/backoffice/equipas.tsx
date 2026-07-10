import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BackofficeLayout from "../../components/BackofficeLayout";
import Pagination from "../../components/Pagination";
import { supabase } from "../../src/lib/supabase";
import { useToast } from "../../components/ToastProvider";
import { useTheme } from "../../components/ThemeProvider";
import { Type } from "../../constants/typography";

const EQUIPAS_PER_PAGE = 15;

export default function EquipasBackoffice() {
  const { colors } = useTheme();
  const C = { green: colors.primary, red: colors.red, blue: colors.blue, bg: colors.bg, card: colors.card, border: colors.border, text: colors.text, muted: colors.textMuted, dim: colors.textDim };
  const s = useMemo(() => makeStyles(C), [colors]);
  const { showConfirm } = useToast();
  const [equipas, setEquipas] = useState<any[]>([]);
  const [pesquisa, setPesquisa] = useState("");
  const [pagina, setPagina] = useState(0);
  const [modalEquipa, setModalEquipa] = useState<any>(null);
  const [membros, setMembros] = useState<any[]>([]);
  const [loadingMembros, setLoadingMembros] = useState(false);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const { data } = await supabase
      .from("equipas")
      .select(`
        id, nome, codigo_convite, xp_total, created_at, permissao_convite,
        utilizadores!equipas_criador_id_fkey(nome, email),
        equipa_membros(count)
      `)
      .order("xp_total", { ascending: false });
    setEquipas(data || []);
  }

  async function verMembros(equipa: any) {
    setModalEquipa(equipa);
    setLoadingMembros(true);
    const { data } = await supabase
      .from("equipa_membros")
      .select("funcao, joined_at, utilizadores(nome, email, xp_total, nivel)")
      .eq("equipa_id", equipa.id)
      .order("funcao");
    setMembros(data || []);
    setLoadingMembros(false);
  }

  async function dissolverEquipa(id: string, nome: string) {
    const ok = await showConfirm({ title: 'Dissolver Equipa', message: `Dissolver "${nome}"? Esta ação é irreversível.`, confirmText: 'Dissolver', destructive: true });
    if (!ok) return;
    await supabase.from("equipa_membros").delete().eq("equipa_id", id);
    await supabase.from("equipa_convites").delete().eq("equipa_id", id);
    await supabase.from("equipa_pedidos").delete().eq("equipa_id", id);
    await supabase.from("equipas").delete().eq("id", id);
    carregar();
  }

  const filtradas = equipas.filter(e =>
    `${e.nome} ${e.codigo_convite} ${e.utilizadores?.nome}`.toLowerCase().includes(pesquisa.toLowerCase())
  );

  useEffect(() => { setPagina(0); }, [pesquisa]);
  const totalPaginas = Math.ceil(filtradas.length / EQUIPAS_PER_PAGE);
  const filtradasPagina = filtradas.slice(pagina * EQUIPAS_PER_PAGE, (pagina + 1) * EQUIPAS_PER_PAGE);

  const totalMembros = equipas.reduce((acc, e) => acc + (e.equipa_membros?.[0]?.count || 0), 0);
  const topXP = equipas[0]?.xp_total || 0;

  return (
    <BackofficeLayout>
      <Text style={s.title}>Gestão de Equipas</Text>
      <Text style={s.subtitle}>Visualiza, monitoriza e dissolve as equipas da plataforma.</Text>

      <View style={s.statsRow}>
        <Stat title="Total Equipas" value={equipas.length} icon="shield" color={C.green} />
        <Stat title="Total Membros" value={totalMembros} icon="people" color={C.blue} />
        <Stat title="Maior XP" value={topXP} icon="trophy" color={colors.yellow} />
        <Stat title="Sem Membros" value={equipas.filter(e => (e.equipa_membros?.[0]?.count || 0) === 0).length} icon="alert-circle" color={C.red} />
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Lista de Equipas</Text>
        <TextInput
          style={s.input}
          value={pesquisa}
          onChangeText={setPesquisa}
          placeholder="Pesquisar por nome, código ou líder..."
          placeholderTextColor="#777"
        />

        <View style={s.tableHeader}>
          <Text style={[s.th, { flex: 2 }]}>Nome</Text>
          <Text style={[s.th, { flex: 1.5 }]}>Líder</Text>
          <Text style={s.th}>Código</Text>
          <Text style={s.th}>Membros</Text>
          <Text style={s.th}>XP</Text>
          <Text style={s.th}>Convite</Text>
          <Text style={[s.th, { flex: 1.5 }]}>Ações</Text>
        </View>

        {filtradasPagina.map(e => (
          <View key={e.id} style={s.tableRow}>
            <Text style={[s.td, { flex: 2, fontWeight: "800" }]}>{e.nome}</Text>
            <Text style={[s.td, { flex: 1.5 }]}>{e.utilizadores?.nome || "—"}</Text>
            <Text style={[s.td, { fontFamily: "monospace" }]}>{e.codigo_convite}</Text>
            <Text style={s.td}>{e.equipa_membros?.[0]?.count || 0}</Text>
            <Text style={[s.td, { color: C.green, fontWeight: "900" }]}>{e.xp_total}</Text>
            <Text style={s.td}>{e.permissao_convite}</Text>
            <View style={[s.td, { flex: 1.5, flexDirection: "row", gap: 8 }]}>
              <TouchableOpacity style={s.btnSecondary} onPress={() => verMembros(e)}>
                <Text style={s.btnSecondaryText}>Ver</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnDanger} onPress={() => dissolverEquipa(e.id, e.nome)}>
                <Text style={s.btnDangerText}>Dissolver</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {filtradas.length === 0 && <Text style={s.emptyText}>Nenhuma equipa encontrada.</Text>}

        <Pagination page={pagina} totalPages={totalPaginas} onChange={setPagina} />
      </View>

      <Modal visible={!!modalEquipa} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Membros — {modalEquipa?.nome}</Text>
              <TouchableOpacity onPress={() => setModalEquipa(null)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            {loadingMembros ? (
              <Text style={s.emptyText}>A carregar...</Text>
            ) : membros.length === 0 ? (
              <Text style={s.emptyText}>Sem membros nesta equipa.</Text>
            ) : (
              <FlatList
                data={membros}
                keyExtractor={(_, i) => i.toString()}
                renderItem={({ item }) => (
                  <View style={s.memberRow}>
                    <View>
                      <Text style={s.memberName}>{item.utilizadores?.nome}</Text>
                      <Text style={s.memberEmail}>{item.utilizadores?.email}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={s.funcaoBadge}>{item.funcao}</Text>
                      <Text style={s.memberXP}>Nível {item.utilizadores?.nivel} · {item.utilizadores?.xp_total} XP</Text>
                    </View>
                  </View>
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
      <Text style={[Type.metric, { color: c }]}>{value}</Text>
      <Text style={[Type.footnote, { color: colors.textMuted, marginTop: 6 }]}>{title}</Text>
    </View>
  );
}

function makeStyles(C: any) { return StyleSheet.create({
  title: { ...Type.largeTitle, color: C.text },
  subtitle: { ...Type.body, color: C.muted, marginTop: 6, marginBottom: 28 },
  statsRow: { flexDirection: "row", gap: 16, marginBottom: 26 },
  section: { backgroundColor: C.card, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  sectionTitle: { ...Type.headline, color: C.text, marginBottom: 16 },
  input: { backgroundColor: C.card, color: C.text, borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: C.border, marginBottom: 18 },
  tableHeader: { flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  th: { ...Type.overline, flex: 1, color: C.muted },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  td: { ...Type.callout, flex: 1, color: C.text },
  btnSecondary: { backgroundColor: C.green + "18", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  btnSecondaryText: { color: C.green, fontWeight: "800", fontSize: 12 },
  btnDanger: { backgroundColor: C.red + "18", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  btnDangerText: { color: C.red, fontWeight: "800", fontSize: 12 },
  emptyText: { color: C.muted },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center" },
  modalBox: { backgroundColor: C.bg, borderRadius: 20, padding: 28, width: 600, maxHeight: "80%", borderWidth: 1, borderColor: C.border },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { ...Type.title2, color: C.text },
  memberRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 8 },
  memberName: { color: C.text, fontWeight: "800", fontSize: 14 },
  memberEmail: { color: C.muted, fontSize: 12, marginTop: 2 },
  funcaoBadge: { color: C.green, fontWeight: "900", fontSize: 12 },
  memberXP: { color: C.muted, fontSize: 12, marginTop: 2 },
}); }
