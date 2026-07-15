import { useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BackofficeLayout from "../../components/BackofficeLayout";
import { supabase } from "../../src/lib/supabase";
import { useToast } from "../../components/ToastProvider";
import { useTheme } from "../../components/ThemeProvider";
import { useSettings } from "../../components/SettingsProvider";
import { Type } from "../../constants/typography";

const PALETA_PRIMARIA = [
  "#5EFC44", "#22C55E", "#16A34A", "#84CC16",
  "#50E3C2", "#06B6D4", "#0EA5E9", "#3B82F6",
  "#6366F1", "#A78BFA", "#EC4899", "#F43F5E",
  "#FB923C", "#F59E0B", "#EAB308", "#EF4444",
];

const DEFAULT_PRIMARIA = "#5EFC44";
const DEFAULT_SECUNDARIA = "#50E3C2";

function hexValido(h: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(h);
}

export default function AparenciaBackoffice() {
  const { colors, isDark, refreshColors } = useTheme();
  const C = { green: colors.primary, red: colors.red, teal: colors.secondary, bg: colors.bg, card: colors.card, border: colors.border, text: colors.text, muted: colors.textMuted, dim: colors.textDim, isDark };
  const s = useMemo(() => makeStyles(C), [colors, isDark]);
  const { showToast, showConfirm } = useToast();
  const { appName, refreshAppName } = useSettings();

  // Identidade
  const [nomeApp, setNomeApp] = useState(appName);
  const [savingNome, setSavingNome] = useState(false);

  // Cores
  const [primaria, setPrimaria] = useState(DEFAULT_PRIMARIA);
  const [secundaria, setSecundaria] = useState(DEFAULT_SECUNDARIA);
  const [savingCores, setSavingCores] = useState(false);

  useEffect(() => { setNomeApp(appName); }, [appName]);
  useEffect(() => { carregarCores(); }, []);

  async function carregarCores() {
    const { data } = await supabase.from("configuracoes").select("chave, valor").in("chave", ["cor_primaria", "cor_secundaria"]);
    const map = Object.fromEntries((data || []).map((c: any) => [c.chave, c.valor]));
    setPrimaria(map["cor_primaria"]?.trim() || DEFAULT_PRIMARIA);
    setSecundaria(map["cor_secundaria"]?.trim() || DEFAULT_SECUNDARIA);
  }

  async function guardarNome() {
    const valor = nomeApp.trim();
    if (!valor) { showToast({ type: "warning", message: "O nome da app não pode ficar vazio." }); return; }
    setSavingNome(true);
    const { error } = await supabase.from("configuracoes").upsert({ chave: "nome_app", valor }, { onConflict: "chave" });
    setSavingNome(false);
    if (error) { showToast({ type: "error", message: "Não foi possível guardar o nome." }); return; }
    await refreshAppName();
    showToast({ type: "success", title: "Nome atualizado", message: `A app passa a chamar-se "${valor}".` });
  }

  async function guardarCores() {
    if (!hexValido(primaria) || !hexValido(secundaria)) {
      showToast({ type: "warning", message: "As cores têm de estar no formato #RRGGBB." });
      return;
    }
    setSavingCores(true);
    const { error } = await supabase.from("configuracoes").upsert(
      [{ chave: "cor_primaria", valor: primaria }, { chave: "cor_secundaria", valor: secundaria }],
      { onConflict: "chave" }
    );
    setSavingCores(false);
    if (error) { showToast({ type: "error", message: "Não foi possível guardar as cores." }); return; }
    await refreshColors();
    showToast({ type: "success", title: "Cores aplicadas", message: "As novas cores já estão ativas na app." });
  }

  async function reporCores() {
    const ok = await showConfirm({
      title: "Repor Cores Padrão",
      message: "As cores voltam ao verde original da Green League. Continuar?",
      confirmText: "Repor",
      icon: "color-wand-outline",
    });
    if (!ok) return;
    await supabase.from("configuracoes").delete().in("chave", ["cor_primaria", "cor_secundaria"]);
    setPrimaria(DEFAULT_PRIMARIA);
    setSecundaria(DEFAULT_SECUNDARIA);
    await refreshColors();
    showToast({ type: "success", message: "Cores repostas para o padrão." });
  }

  const alterado = primaria.toLowerCase() !== DEFAULT_PRIMARIA.toLowerCase() || secundaria.toLowerCase() !== DEFAULT_SECUNDARIA.toLowerCase();

  return (
    <BackofficeLayout>
      <Text style={s.title}>Aparência</Text>
      <Text style={s.subtitle}>Personaliza a identidade e as cores da aplicação.</Text>

      {/* ── IDENTIDADE ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Identidade da Aplicação</Text>
        <Text style={s.label}>Nome da App</Text>
        <Text style={s.hint}>Aparece no canto superior dos ecrãs da app (atualmente "{appName}").</Text>
        <View style={s.inlineRow}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            value={nomeApp}
            onChangeText={setNomeApp}
            placeholder="Ex: GREEN LEAGUE"
            placeholderTextColor="#777"
            maxLength={30}
          />
          <TouchableOpacity style={s.btnPrimary} onPress={guardarNome} disabled={savingNome}>
            <Ionicons name="save-outline" size={16} color={isDark ? "#000" : "#FFF"} />
            <Text style={s.btnPrimaryText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── CORES ── */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <View>
            <Text style={[s.sectionTitle, { marginBottom: 2 }]}>Cores da Aplicação</Text>
            <Text style={s.hint}>A cor primária é o destaque (verde) usado em botões, ícones e realces.</Text>
          </View>
          {alterado && (
            <TouchableOpacity style={s.btnGhost} onPress={reporCores}>
              <Ionicons name="refresh-outline" size={15} color={C.muted} />
              <Text style={s.btnGhostText}>Repor padrão</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.coresRow}>
          <ColorField C={C} label="Cor Primária (destaque)" value={primaria} onChange={setPrimaria} />
          <ColorField C={C} label="Cor Secundária" value={secundaria} onChange={setSecundaria} />
        </View>

        {/* Pré-visualização */}
        <Text style={[s.label, { marginTop: 20 }]}>Pré-visualização</Text>
        <View style={s.preview}>
          <View style={[s.previewBtn, { backgroundColor: primaria }]}>
            <Ionicons name="leaf" size={16} color="#000" />
            <Text style={s.previewBtnText}>Botão primário</Text>
          </View>
          <View style={[s.previewChip, { backgroundColor: primaria + "22", borderColor: primaria + "55" }]}>
            <Text style={[s.previewChipText, { color: primaria }]}>Realce</Text>
          </View>
          <View style={[s.previewChip, { backgroundColor: secundaria + "22", borderColor: secundaria + "55" }]}>
            <Text style={[s.previewChipText, { color: secundaria }]}>Secundária</Text>
          </View>
          <Ionicons name="trophy" size={22} color={primaria} />
          <Ionicons name="water" size={22} color={secundaria} />
        </View>

        <TouchableOpacity style={[s.btnPrimary, { marginTop: 20, alignSelf: "flex-start" }]} onPress={guardarCores} disabled={savingCores}>
          <Ionicons name="color-palette-outline" size={16} color={isDark ? "#000" : "#FFF"} />
          <Text style={s.btnPrimaryText}>Aplicar cores</Text>
        </TouchableOpacity>
      </View>
    </BackofficeLayout>
  );
}

function ColorField({ C, label, value, onChange }: { C: any; label: string; value: string; onChange: (v: string) => void }) {
  const s = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={{ flex: 1, minWidth: 260 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.colorInputRow}>
        <View style={[s.colorSwatch, { backgroundColor: value }]}>
          {Platform.OS === "web" && (
            // @ts-ignore — input nativo do browser
            <input
              type="color"
              value={hexValido(value) ? value : "#000000"}
              onChange={(e: any) => onChange(e.target.value)}
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
            />
          )}
        </View>
        <TextInput
          style={[s.input, { flex: 1 }]}
          value={value}
          onChangeText={onChange}
          placeholder="#RRGGBB"
          placeholderTextColor="#777"
          autoCapitalize="characters"
          maxLength={7}
        />
      </View>
      <View style={s.paletaGrid}>
        {PALETA_PRIMARIA.map(cor => (
          <TouchableOpacity
            key={cor}
            style={[s.paletaItem, { backgroundColor: cor }, value.toLowerCase() === cor.toLowerCase() && s.paletaItemSel]}
            onPress={() => onChange(cor)}
          >
            {value.toLowerCase() === cor.toLowerCase() && <Ionicons name="checkmark" size={13} color="#000" />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function makeStyles(C: any) { return StyleSheet.create({
  title: { ...Type.largeTitle, color: C.text },
  subtitle: { ...Type.body, color: C.muted, marginTop: 6, marginBottom: 28 },
  section: { backgroundColor: C.card, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 12 },
  sectionTitle: { ...Type.headline, color: C.text, marginBottom: 16 },
  label: { ...Type.footnote, color: C.muted, marginBottom: 6 },
  hint: { ...Type.caption, color: C.dim, marginBottom: 10 },
  input: { backgroundColor: C.bg, color: C.text, borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: C.border },
  inlineRow: { flexDirection: "row", gap: 12, alignItems: "flex-end" },
  btnPrimary: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.green, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10, height: 46 },
  btnPrimaryText: { color: C.isDark ? "#000" : "#FFF", fontWeight: "900", fontSize: 14 },
  btnGhost: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  btnGhostText: { color: C.muted, fontWeight: "700", fontSize: 13 },

  coresRow: { flexDirection: "row", gap: 20, flexWrap: "wrap" },
  colorInputRow: { flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 12 },
  colorSwatch: { width: 46, height: 46, borderRadius: 10, borderWidth: 1, borderColor: C.border, overflow: "hidden", position: "relative" },
  paletaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  paletaItem: { width: 30, height: 30, borderRadius: 8, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(0,0,0,0.15)" },
  paletaItemSel: { borderWidth: 2, borderColor: C.text },

  preview: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12, backgroundColor: C.bg, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border },
  previewBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  previewBtnText: { color: "#000", fontWeight: "800", fontSize: 13 },
  previewChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  previewChipText: { fontWeight: "800", fontSize: 12 },
}); }
