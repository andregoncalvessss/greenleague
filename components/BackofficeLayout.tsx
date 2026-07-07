import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { ReactNode, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "./ThemeProvider";

type Props = { children: ReactNode };

const COLLAPSED = 72;
const EXPANDED  = 256;

const menuItems = [
  { icon: "home-outline",             iconActive: "home",              title: "Dashboard",    route: "/backoffice" },
  { icon: "person-outline",           iconActive: "person",            title: "Utilizadores", route: "/backoffice/utilizadores" },
  { icon: "people-outline",           iconActive: "people",            title: "Equipas",      route: "/backoffice/equipas" },
  { icon: "pricetag-outline",         iconActive: "pricetag",          title: "Categorias",   route: "/backoffice/categorias" },
  { icon: "flag-outline",             iconActive: "flag",              title: "Desafios",     route: "/backoffice/desafios" },
  { icon: "ribbon-outline",           iconActive: "ribbon",            title: "Missões",      route: "/backoffice/missoes" },
  { icon: "layers-outline",           iconActive: "layers",            title: "Ações",         route: "/backoffice/submissoes" },
  { icon: "bar-chart-outline",        iconActive: "bar-chart",         title: "Estatísticas", route: "/backoffice/estatisticas" },
  { icon: "download-outline",         iconActive: "download",          title: "Exportar",     route: "/backoffice/exportar" },
];

// Transições CSS — só funcionam no web (React Native Web passa estilos desconhecidos como CSS)
const TRANSITION_SIDEBAR = "width 220ms cubic-bezier(0.4,0,0.2,1)";
const TRANSITION_LABEL_IN  = "opacity 160ms ease 80ms";
const TRANSITION_LABEL_OUT = "opacity 80ms ease";
const TRANSITION_PAD = "padding-left 220ms cubic-bezier(0.4,0,0.2,1)";

export default function BackofficeLayout({ children }: Props) {
  const [open, setOpen] = useState(false);
  const { colors, isDark, toggleTheme } = useTheme();
  const pathname = usePathname();

  const isActive = (route: string) =>
    route === "/backoffice" ? pathname === "/backoffice" : pathname.startsWith(route);

  // Estilo da sidebar com transição CSS
  const sidebarStyle: any = {
    width: open ? EXPANDED : COLLAPSED,
    backgroundColor: colors.surface,
    borderRightColor: colors.border,
    shadowColor: isDark ? "#000" : "#64748B",
    shadowOpacity: isDark ? 0.3 : 0.08,
    ...(Platform.OS === "web" ? { transition: TRANSITION_SIDEBAR, overflow: "hidden" } : {}),
  };

  // Estilo dos labels (texto ao lado dos ícones)
  const labelStyle: any = {
    opacity: open ? 1 : 0,
    ...(Platform.OS === "web" ? {
      transition: open ? TRANSITION_LABEL_IN : TRANSITION_LABEL_OUT,
      whiteSpace: "nowrap",
      overflow: "hidden",
    } : {}),
  };

  // Padding dos items: ícone centrado quando fechado, alinhado à esq quando aberto
  const itemPadStyle: any = {
    paddingLeft: open ? 14 : (COLLAPSED - 20) / 2 - 2, // (72-20)/2 - 2 = 24
    ...(Platform.OS === "web" ? { transition: TRANSITION_PAD } : {}),
  };

  return (
    <View style={[styles.page, { backgroundColor: colors.bg }]}>

      {/* ── SIDEBAR ── */}
      <View
        style={[styles.sidebar, sidebarStyle]}
        {...(Platform.OS === "web"
          ? { onMouseEnter: () => setOpen(true), onMouseLeave: () => setOpen(false) }
          : {})}
      >
        {/* LOGO */}
        <View style={[styles.logoArea, { borderBottomColor: colors.border }]}>
          {/* Ícone — sempre na mesma posição */}
          <View style={[styles.logoIconBox, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
            <Ionicons name="shield-checkmark" size={26} color={colors.primary} />
          </View>
          {/* Textos com fade */}
          <View style={[styles.logoTexts, labelStyle]}>
            <Text style={[styles.logoLine1, { color: colors.text }]}>IPVC GREEN</Text>
            <Text style={[styles.logoLine2, { color: colors.primary }]}>LEAGUE</Text>
            <View style={[styles.adminBadge, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
              <Text style={[styles.adminBadgeText, { color: colors.primary }]}>Backoffice</Text>
            </View>
          </View>
        </View>

        {/* MENU */}
        <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.menu}>
            {menuItems.map((item) => {
              const active = isActive(item.route);
              return (
                <TouchableOpacity
                  key={item.route}
                  style={[
                    styles.menuItem,
                    itemPadStyle,
                    active && { backgroundColor: colors.primary + "12" },
                  ]}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.75}
                >
                  {active && <View style={[styles.activeBar, { backgroundColor: colors.primary }]} />}
                  {/* Ícone sempre visível */}
                  <View style={styles.iconWrap}>
                    <Ionicons
                      name={(active ? item.iconActive : item.icon) as any}
                      size={20}
                      color={active ? colors.primary : colors.textMuted}
                    />
                  </View>
                  {/* Label com fade */}
                  <Text
                    style={[styles.menuText, { color: active ? colors.primary : colors.text }, labelStyle]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* FOOTER */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {/* Toggle tema */}
          <TouchableOpacity
            style={[styles.footerBtn, itemPadStyle]}
            onPress={toggleTheme}
            activeOpacity={0.75}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={isDark ? "sunny-outline" : "moon-outline"}
                size={18}
                color={colors.text}
              />
            </View>
            <Text style={[styles.footerBtnText, { color: colors.text }, labelStyle]}>
              {isDark ? "Modo Claro" : "Modo Escuro"}
            </Text>
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity
            style={[
              styles.logoutBtn,
              itemPadStyle,
              { backgroundColor: colors.red + "10", borderColor: colors.red + "30" },
            ]}
            onPress={() => router.replace("/")}
            activeOpacity={0.75}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="power-outline" size={18} color={colors.red} />
            </View>
            <Text style={[styles.logoutBtnText, { color: colors.red }, labelStyle]}>
              Terminar Sessão
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── CONTEÚDO ── */}
      <ScrollView
        style={[styles.content, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.contentInner}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, flexDirection: "row" },

  sidebar: {
    borderRightWidth: 1,
    paddingBottom: 12,
    shadowOffset: { width: 2, height: 0 },
    shadowRadius: 12,
    elevation: 4,
    zIndex: 10,
  },

  // Logo
  logoArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 14,
    paddingRight: 12,
    paddingVertical: 20,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  logoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  logoTexts: { flexShrink: 0 },
  logoLine1: { fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  logoLine2: { fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  adminBadge: {
    alignSelf: "flex-start",
    marginTop: 5,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  adminBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },

  // Menu
  menuScroll: { flex: 1 },
  menu: { paddingRight: 10, gap: 2 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingRight: 12,
    borderRadius: 10,
    position: "relative",
  },
  iconWrap: {
    width: 20,
    alignItems: "center",
    flexShrink: 0,
  },
  activeBar: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  menuText: { fontSize: 14, fontWeight: "600", flexShrink: 1 },

  // Footer
  footer: { paddingRight: 10, gap: 4, borderTopWidth: 1, paddingTop: 12 },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingRight: 12,
    borderRadius: 10,
  },
  footerBtnText: { fontSize: 13, fontWeight: "600", flexShrink: 1 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingRight: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  logoutBtnText: { fontSize: 13, fontWeight: "700", flexShrink: 1 },

  // Content
  content: { flex: 1 },
  contentInner: { padding: 36 },
});
