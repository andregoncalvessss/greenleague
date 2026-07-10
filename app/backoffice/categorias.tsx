import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BackofficeLayout from "../../components/BackofficeLayout";
import Pagination from "../../components/Pagination";
import { supabase } from "../../src/lib/supabase";
import { useToast } from "../../components/ToastProvider";
import { useTheme } from "../../components/ThemeProvider";
import { Type } from "../../constants/typography";

const FORM_VAZIO = { id: null as number | null, nome: "", cor_hex: "#4CFF3B", icon_url: "" };
const CATEGORIAS_PER_PAGE = 10;

const PALETA_CORES = [
  // Verdes
  "#4CFF3B", "#5EFC44", "#22C55E", "#16A34A", "#15803D", "#14532D",
  "#A3E635", "#84CC16", "#65A30D", "#4D7C0F",
  // Azuis / ciano
  "#50E3C2", "#06B6D4", "#0EA5E9", "#3B82F6", "#6366F1", "#0284C7",
  "#38BDF8", "#7DD3FC", "#93C5FD", "#818CF8",
  // Amarelos / laranja
  "#FFB020", "#F59E0B", "#EAB308", "#FBBF24", "#F97316", "#EA580C",
  "#FB923C", "#FDBA74", "#FCD34D", "#FDE68A",
  // Vermelhos / rosa
  "#EF4444", "#DC2626", "#B91C1C", "#EC4899", "#DB2777", "#BE185D",
  "#F43F5E", "#E11D48", "#FB7185", "#FDA4AF",
  // Roxos
  "#A855F7", "#9333EA", "#7C3AED", "#6D28D9", "#8B5CF6", "#C084FC",
  // Neutros / especiais
  "#FFFFFF", "#D1D5DB", "#9CA3AF", "#6B7280", "#374151", "#1F2937",
];

const ICONES_DISPONIVEIS = [
  "leaf-outline", "leaf", "earth-outline", "earth",
  "water-outline", "water", "sunny-outline", "sunny",
  "cloud-outline", "cloud", "thunderstorm-outline", "rainy-outline",
  "flame-outline", "flame", "snow-outline", "partly-sunny-outline",
  "bicycle-outline", "bicycle", "bus-outline", "bus",
  "car-outline", "car", "train-outline", "walk-outline",
  "boat-outline", "airplane-outline", "rocket-outline",
  "trash-outline", "trash", "bag-outline", "bag",
  "basket-outline", "basket", "cart-outline",
  "restaurant-outline", "fast-food-outline", "nutrition-outline",
  "flask-outline", "beaker-outline", "pulse-outline",
  "home-outline", "home", "business-outline", "school-outline",
  "build-outline", "construct-outline", "hammer-outline",
  "bulb-outline", "bulb", "flash-outline", "flash",
  "battery-charging-outline", "battery-full-outline",
  "color-palette-outline", "brush-outline", "color-filter-outline",
  "heart-outline", "heart", "star-outline", "star",
  "ribbon-outline", "trophy-outline", "medal-outline",
  "people-outline", "person-outline", "person-add-outline",
  "hand-left-outline", "thumbs-up-outline", "happy-outline",
  "shield-checkmark-outline", "checkmark-circle-outline",
  "refresh-outline", "reload-outline", "repeat-outline",
  "stats-chart-outline", "trending-up-outline", "bar-chart-outline",
  "globe-outline", "map-outline", "compass-outline",
  "camera-outline", "image-outline", "scan-outline",
  "cellular-outline", "wifi-outline", "radio-outline",
  "flower-outline", "rose-outline", "fish-outline",
  "paw-outline", "bug-outline", "telescope-outline",
  "hammer-outline", "settings-outline", "cog-outline",
];

export default function CategoriasBackoffice() {
  const { colors, isDark } = useTheme();
  const C = { green: colors.primary, red: colors.red, yellow: colors.yellow, bg: colors.bg, card: colors.card, border: colors.border, text: colors.text, muted: colors.textMuted, dim: colors.textDim, isDark };
  const s = useMemo(() => makeStyles(C), [colors, isDark]);
  const { showToast, showConfirm } = useToast();
  const [categorias, setCategorias] = useState<any[]>([]);
  const [form, setForm] = useState({ ...FORM_VAZIO });
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState(false);
  const [modalIcones, setModalIcones] = useState(false);
  const [modalCores, setModalCores] = useState(false);
  const [hexInput, setHexInput] = useState(FORM_VAZIO.cor_hex);
  const [pesquisaIcone, setPesquisaIcone] = useState("");
  const [pagina, setPagina] = useState(0);
  const nativeColorRef = useRef<any>(null);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const { data } = await supabase
      .from("categorias_acao")
      .select("*, catalogo_acoes(count)")
      .order("id");
    setCategorias(data || []);
  }

  async function guardar() {
    if (!form.nome.trim()) { showToast({ type: 'warning', message: 'O nome é obrigatório.' }); return; }
    setLoading(true);
    if (form.id) {
      await supabase.from("categorias_acao").update({
        nome: form.nome.trim(),
        cor_hex: form.cor_hex,
        icon_url: form.icon_url || null,
      }).eq("id", form.id);
    } else {
      await supabase.from("categorias_acao").insert({
        nome: form.nome.trim(),
        cor_hex: form.cor_hex,
        icon_url: form.icon_url || null,
      });
    }
    setForm({ ...FORM_VAZIO });
    setEditando(false);
    setLoading(false);
    carregar();
  }

  async function eliminar(id: number, nome: string) {
    const ok = await showConfirm({ title: 'Eliminar Categoria', message: `Eliminar "${nome}"? As ações desta categoria perderão a associação.`, confirmText: 'Eliminar', destructive: true });
    if (!ok) return;
    await supabase.from("catalogo_acoes").update({ categoria_id: null }).eq("categoria_id", id);
    await supabase.from("categorias_acao").delete().eq("id", id);
    carregar();
  }

  function iniciarEdicao(cat: any) {
    const cor = cat.cor_hex || "#4CFF3B";
    setForm({ id: cat.id, nome: cat.nome, cor_hex: cor, icon_url: cat.icon_url || "" });
    setHexInput(cor);
    setEditando(true);
  }

  function aplicarHex(valor: string) {
    const v = valor.startsWith("#") ? valor : "#" + valor;
    setHexInput(v);
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
      setForm(f => ({ ...f, cor_hex: v }));
    }
  }

  const iconesFiltrados = ICONES_DISPONIVEIS.filter(i =>
    i.includes(pesquisaIcone.toLowerCase())
  );

  const totalPaginas = Math.ceil(categorias.length / CATEGORIAS_PER_PAGE);
  const categoriasPagina = categorias.slice(pagina * CATEGORIAS_PER_PAGE, (pagina + 1) * CATEGORIAS_PER_PAGE);

  return (
    <BackofficeLayout>
      <Text style={s.title}>Categorias de Ações</Text>
      <Text style={s.subtitle}>Gere as categorias que organizam o catálogo de ações ecológicas.</Text>

      <View style={s.statsRow}>
        <Stat title="Categorias" value={categorias.length} icon="pricetag" color={C.green} />
        <Stat title="Total Ações" value={categorias.reduce((acc, c) => acc + (c.catalogo_acoes?.[0]?.count || 0), 0)} icon="flag" color={C.yellow} />
      </View>

      {/* FORMULÁRIO */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>{editando ? "Editar Categoria" : "Nova Categoria"}</Text>
        <View style={s.formRow}>
          <View style={{ flex: 3 }}>
            <Text style={s.label}>Nome *</Text>
            <TextInput
              style={s.input}
              value={form.nome}
              onChangeText={v => setForm(f => ({ ...f, nome: v }))}
              placeholder="Ex: Mobilidade Sustentável"
              placeholderTextColor="#777"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Cor</Text>
            <TouchableOpacity style={s.colorPicker} onPress={() => { setHexInput(form.cor_hex); setModalCores(true); }}>
              <View style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: form.cor_hex, borderWidth: 1, borderColor: C.border }} />
              <Text style={s.colorPickerText}>{form.cor_hex}</Text>
              <Ionicons name="chevron-down" size={16} color={C.muted} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1.5 }}>
            <Text style={s.label}>Ícone</Text>
            <TouchableOpacity style={s.iconPicker} onPress={() => setModalIcones(true)}>
              {form.icon_url
                ? <Ionicons name={form.icon_url as any} size={22} color={form.cor_hex || "#4CFF3B"} />
                : <Ionicons name="shapes-outline" size={22} color={C.muted} />
              }
              <Text style={[s.iconPickerText, !form.icon_url && { color: C.muted }]}>
                {form.icon_url || "Selecionar ícone"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={C.muted} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
          <TouchableOpacity style={s.btnPrimary} onPress={guardar} disabled={loading}>
            <Ionicons name={editando ? "checkmark" : "add"} size={18} color={isDark ? "#000" : "#FFF"} />
            <Text style={s.btnPrimaryText}>{editando ? "Guardar Alterações" : "Criar Categoria"}</Text>
          </TouchableOpacity>
          {editando && (
            <TouchableOpacity style={s.btnCancel} onPress={() => { setForm({ ...FORM_VAZIO }); setEditando(false); }}>
              <Text style={s.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
          )}
          {form.icon_url ? (
            <TouchableOpacity style={s.btnCancel} onPress={() => setForm(f => ({ ...f, icon_url: "" }))}>
              <Ionicons name="close" size={16} color="#B8B8C0" />
              <Text style={s.btnCancelText}>Remover ícone</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* TABELA */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Lista de Categorias</Text>
        <View style={s.tableHeader}>
          <Text style={[s.th, { flex: 0.4 }]}>Ícone</Text>
          <Text style={[s.th, { flex: 2 }]}>Nome</Text>
          <Text style={s.th}>Cor</Text>
          <Text style={s.th}>Ações</Text>
          <Text style={[s.th, { flex: 1.5 }]}>Opções</Text>
        </View>
        {categoriasPagina.map(c => (
          <View key={c.id} style={s.tableRow}>
            <View style={[s.td, { flex: 0.4 }]}>
              {c.icon_url
                ? <Ionicons name={c.icon_url as any} size={20} color={c.cor_hex || "#4CFF3B"} />
                : <Text style={{ color: C.muted }}>—</Text>
              }
            </View>
            <Text style={[s.td, { flex: 2, fontWeight: "800" }]}>{c.nome}</Text>
            <View style={[s.td, { flexDirection: "row", alignItems: "center", gap: 8 }]}>
              <View style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: c.cor_hex || "#4CFF3B" }} />
              <Text style={[s.td, { color: c.cor_hex || "#4CFF3B", fontWeight: "700" }]}>{c.cor_hex || "—"}</Text>
            </View>
            <Text style={s.td}>{c.catalogo_acoes?.[0]?.count || 0}</Text>
            <View style={[s.td, { flex: 1.5, flexDirection: "row", gap: 8 }]}>
              <TouchableOpacity style={s.btnSecondary} onPress={() => iniciarEdicao(c)}>
                <Text style={s.btnSecondaryText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnDanger} onPress={() => eliminar(c.id, c.nome)}>
                <Text style={s.btnDangerText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {categorias.length === 0 && <Text style={s.emptyText}>Sem categorias. Cria a primeira acima.</Text>}

        <Pagination page={pagina} totalPages={totalPaginas} onChange={setPagina} />
      </View>

      {/* MODAL SELETOR DE CORES */}
      <Modal visible={modalCores} transparent animationType="fade" onRequestClose={() => setModalCores(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { maxWidth: 440 }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Selecionar Cor</Text>
              <TouchableOpacity onPress={() => setModalCores(false)}>
                <Ionicons name="close" size={24} color="#B8B8C0" />
              </TouchableOpacity>
            </View>

            {/* Prévia */}
            <View style={[s.colorPreview, { backgroundColor: form.cor_hex }]}>
              {form.icon_url
                ? <Ionicons name={form.icon_url as any} size={36} color="#000" />
                : <Ionicons name="color-palette-outline" size={36} color="#000" />
              }
              <Text style={s.colorPreviewText}>{form.cor_hex}</Text>
            </View>

            {/* Paleta */}
            <Text style={s.modalSubtitle}>Paleta</Text>
            <View style={s.paletaGrid}>
              {PALETA_CORES.map(cor => (
                <TouchableOpacity
                  key={cor}
                  style={[s.paletaItem, { backgroundColor: cor }, form.cor_hex === cor && s.paletaItemSelecionado]}
                  onPress={() => { setForm(f => ({ ...f, cor_hex: cor })); setHexInput(cor); }}
                >
                  {form.cor_hex === cor && <Ionicons name="checkmark" size={14} color={isLight(cor) ? "#000" : "#FFF"} />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Hex manual */}
            <Text style={[s.modalSubtitle, { marginTop: 16 }]}>Código Hex personalizado</Text>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: form.cor_hex, borderWidth: 1, borderColor: "#444" }} />
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={hexInput}
                onChangeText={aplicarHex}
                placeholder="#RRGGBB"
                placeholderTextColor="#555"
                autoCapitalize="characters"
                maxLength={7}
              />
              {/* Picker nativo web */}
              {Platform.OS === "web" && (
                <View style={s.nativeColorWrap}>
                  <Ionicons name="eyedrop-outline" size={20} color="#B8B8C0" />
                  <Text style={s.nativeColorLabel}>Picker</Text>
                  {/* @ts-ignore */}
                  <input
                    type="color"
                    value={form.cor_hex}
                    onChange={(e: any) => { setForm(f => ({ ...f, cor_hex: e.target.value })); setHexInput(e.target.value); }}
                    style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
                  />
                </View>
              )}
            </View>

            <TouchableOpacity style={[s.btnPrimary, { marginTop: 20, alignSelf: "flex-end" }]} onPress={() => setModalCores(false)}>
              <Ionicons name="checkmark" size={18} color={isDark ? "#000" : "#FFF"} />
              <Text style={s.btnPrimaryText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL SELETOR DE ÍCONES */}
      <Modal visible={modalIcones} transparent animationType="fade" onRequestClose={() => setModalIcones(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Selecionar Ícone</Text>
              <TouchableOpacity onPress={() => setModalIcones(false)}>
                <Ionicons name="close" size={24} color="#B8B8C0" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={s.modalSearch}
              placeholder="Pesquisar ícone..."
              placeholderTextColor="#555"
              value={pesquisaIcone}
              onChangeText={setPesquisaIcone}
            />

            <ScrollView contentContainerStyle={s.iconeGrid}>
              {iconesFiltrados.map(nome => (
                <TouchableOpacity
                  key={nome}
                  style={[
                    s.iconeItem,
                    form.icon_url === nome && { backgroundColor: form.cor_hex + "33", borderColor: form.cor_hex }
                  ]}
                  onPress={() => {
                    setForm(f => ({ ...f, icon_url: nome }));
                    setModalIcones(false);
                    setPesquisaIcone("");
                  }}
                >
                  <Ionicons
                    name={nome as any}
                    size={28}
                    color={form.icon_url === nome ? (form.cor_hex || "#4CFF3B") : "#B8B8C0"}
                  />
                  <Text style={[s.iconeLabel, form.icon_url === nome && { color: form.cor_hex || "#4CFF3B" }]}>
                    {nome.replace(/-outline$/, "").replace(/-/g, " ")}
                  </Text>
                </TouchableOpacity>
              ))}
              {iconesFiltrados.length === 0 && (
                <Text style={s.emptyText}>Nenhum ícone encontrado.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </BackofficeLayout>
  );
}

function isLight(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function Stat({ title, value, icon, color }: { title: string; value: number; icon: string; color?: string }) {
  const { colors } = useTheme();
  const c = color || colors.primary;
  return (
    <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 4 }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 6, backgroundColor: c + "18" }}>
        <Ionicons name={icon as any} size={20} color={c} />
      </View>
      <Text style={{ color: c, fontSize: 28, fontWeight: "900" }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 6 }}>{title}</Text>
    </View>
  );
}

function makeStyles(C: any) { return StyleSheet.create({
  title: { ...Type.largeTitle, color: C.text },
  subtitle: { ...Type.body, color: C.muted, marginTop: 6, marginBottom: 28 },
  statsRow: { flexDirection: "row", gap: 16, marginBottom: 26 },
  statCard: { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: C.border },
  statValue: { ...Type.metric, color: C.green },
  statTitle: { ...Type.footnote, color: C.muted, marginTop: 6 },
  section: { backgroundColor: C.card, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  sectionTitle: { ...Type.headline, color: C.text, marginBottom: 16 },
  formRow: { flexDirection: "row", gap: 16, alignItems: "flex-end" },
  label: { ...Type.footnote, color: C.muted, marginBottom: 6 },
  input: { backgroundColor: C.card, color: C.text, borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: C.border },
  iconPicker: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: C.border },
  iconPickerText: { flex: 1, color: C.text, fontSize: 13 },
  btnPrimary: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.green, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  btnPrimaryText: { color: C.isDark ? "#000" : "#FFF", fontWeight: "900", fontSize: 14 },
  btnCancel: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  btnCancelText: { color: C.muted, fontWeight: "700" },
  tableHeader: { flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  th: { ...Type.overline, flex: 1, color: C.muted },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  td: { ...Type.callout, flex: 1, color: C.text },
  btnSecondary: { backgroundColor: C.green + "18", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  btnSecondaryText: { color: C.green, fontWeight: "800", fontSize: 12 },
  btnDanger: { backgroundColor: C.red + "18", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  btnDangerText: { color: C.red, fontWeight: "800", fontSize: 12 },
  emptyText: { color: C.muted, marginTop: 12 },
  colorPicker: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: C.border },
  colorPickerText: { flex: 1, color: C.text, fontSize: 13, fontFamily: "monospace" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: { backgroundColor: C.card, borderRadius: 20, width: "100%", maxWidth: 640, maxHeight: "85%", padding: 24, borderWidth: 1, borderColor: C.border },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: C.text, fontSize: 20, fontWeight: "900" },
  modalSubtitle: { color: C.muted, fontSize: 13, fontWeight: "700", marginBottom: 10 },
  modalSearch: { backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14, height: 44, color: C.text, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  colorPreview: { borderRadius: 14, padding: 20, alignItems: "center", gap: 8, marginBottom: 20, flexDirection: "row", justifyContent: "center" },
  colorPreviewText: { fontSize: 18, fontWeight: "900", color: "#000", fontFamily: "monospace" },
  paletaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  paletaItem: { width: 36, height: 36, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  paletaItemSelecionado: { borderWidth: 3, borderColor: "#FFF" },
  nativeColorWrap: { position: "relative", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.card, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.border },
  nativeColorLabel: { color: C.muted, fontSize: 13, fontWeight: "700" },
  iconeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  iconeItem: { width: 90, alignItems: "center", gap: 6, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  iconeLabel: { color: C.dim, fontSize: 10, textAlign: "center" },
}); }
