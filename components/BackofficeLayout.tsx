import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  children: ReactNode;
};

export default function BackofficeLayout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { icon: "home-outline", title: "Dashboard", route: "/backoffice" },
    { icon: "person-outline", title: "Utilizadores", route: "/backoffice/utilizadores" },
    { icon: "people-outline", title: "Equipas", route: "/backoffice/equipas" },
    { icon: "pricetag-outline", title: "Categorias", route: "/backoffice/categorias" },
    { icon: "clipboard-outline", title: "Moderação", route: "/backoffice/submissoes" },
    { icon: "checkmark-circle-outline", title: "Registos", route: "/backoffice/registos" },
    { icon: "flag-outline", title: "Desafios", route: "/backoffice/desafios" },
    { icon: "megaphone-outline", title: "Campanhas", route: "/backoffice/campanhas" },
    { icon: "bar-chart-outline", title: "Estatísticas", route: "/backoffice/estatisticas" },
    { icon: "download-outline", title: "Exportar", route: "/backoffice/exportar" },
  ];

  return (
    <View style={styles.page}>
      <View
        style={[
          styles.sidebar,
          {
            width: sidebarOpen ? 260 : 76,
            alignItems: "center",
          },
        ]}
        {...(Platform.OS === "web"
          ? {
              onMouseEnter: () => setSidebarOpen(true),
              onMouseLeave: () => setSidebarOpen(false),
            }
          : {})}
      >
        <View style={styles.logoContainer}>
          <Ionicons
            name="shield-outline"
            size={sidebarOpen ? 52 : 38}
            color="#4CFF3B"
          />

          {sidebarOpen && (
            <>
              <Text style={styles.logoTitle}>IPVC GREEN LEAGUE</Text>
              <Text style={styles.logoSubtitle}>
                Sustentabilidade em modo competitivo
              </Text>
              <Text style={styles.adminText}>Backoffice</Text>
            </>
          )}
        </View>

        <View style={styles.menu}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={[
                styles.menuItem,
                {
                  justifyContent: sidebarOpen ? "flex-start" : "center",
                },
              ]}
              onPress={() => router.push(item.route as any)}
            >
              <Ionicons name={item.icon as any} size={22} color="#EDEDF2" />

              {sidebarOpen && (
                <Text style={styles.menuText}>
                  {item.title}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.logout,
            {
              justifyContent: sidebarOpen ? "flex-start" : "center",
              paddingHorizontal: sidebarOpen ? 16 : 0,
            },
          ]}
          onPress={() => router.replace("/")}
        >
          <Ionicons name="power-outline" size={22} color="#000" />

          {sidebarOpen && (
            <Text style={styles.logoutText}>Terminar Sessão</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#0D0D10",
  },

  sidebar: {
    backgroundColor: "#121218",
    padding: 18,
    borderRightWidth: 1,
    borderRightColor: "#292932",
  },

  logoContainer: {
    height: 190,
    alignItems: "center",
    justifyContent: "center",
  },

  logoTitle: {
    marginTop: 12,
    color: "#4CFF3B",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1,
    textShadowColor: "#4CFF3B",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },

  logoSubtitle: {
    marginTop: 6,
    color: "#00FFD1",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },

  adminText: {
    color: "#B8B8C0",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 6,
  },

  menu: {
    width: "100%",
    gap: 8,
  },

  menuItem: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },

  menuText: {
    color: "#EDEDF2",
    fontSize: 14,
    fontWeight: "700",
  },

  logout: {
    marginTop: "auto",
    width: "90%",
    height: 46,
    backgroundColor: "#4CFF3B",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  logoutText: {
    marginLeft: 10,
    color: "#000",
    fontWeight: "900",
    fontSize: 14,
  },

  content: {
    flex: 1,
    padding: 36,
  },
});