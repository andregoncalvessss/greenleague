import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform
} from "react-native";
import { supabase } from "../../src/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import BackofficeLayout from "../../components/BackofficeLayout";

export default function BackofficeScreen() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [totalUtilizadores, setTotalUtilizadores] = useState(0);
  const [totalEquipas, setTotalEquipas] = useState(0);
  const [totalSubmissoes, setTotalSubmissoes] = useState(0);
  const [totalCampanhas, setTotalCampanhas] = useState(0);

  const [submissoesPendentes, setSubmissoesPendentes] = useState<any[]>([]);

  useEffect(() => {
    carregarDashboard();
  }, []);

  async function carregarDashboard() {
    const { count: countUsers } = await supabase
      .from("utilizadores")
      .select("*", { count: "exact", head: true });

    const { count: countEquipas } = await supabase
      .from("equipas")
      .select("*", { count: "exact", head: true });

    const { count: countSubmissoes } = await supabase
      .from("submissoes_acao")
      .select("*", { count: "exact", head: true });

    const { data: pendentes } = await supabase
      .from("submissoes_acao")
      .select(`
        id,
        descricao_user,
        estado,
        criado_em,
        utilizadores (
          nome,
          email
        ),
        catalogo_acoes (
          titulo
        )
      `)
      .eq("estado", "pendente")
      .order("criado_em", { ascending: false })
      .limit(5);

    setTotalUtilizadores(countUsers || 0);
    setTotalEquipas(countEquipas || 0);
    setTotalSubmissoes(countSubmissoes || 0);
    setTotalCampanhas(0);
    setSubmissoesPendentes(pendentes || []);
  }

  const menuItems = [
    {
        icon: "home-outline",
        title: "Dashboard",
        route: "/backoffice",
    },
    {
        icon: "person-outline",
        title: "Utilizadores",
        route: "/backoffice/utilizadores",
    },
    {
        icon: "people-outline",
        title: "Equipas",
        route: "/backoffice/equipas",
    },
    {
        icon: "pricetag-outline",
        title: "Categorias",
        route: "/backoffice/categorias",
    },
    {
        icon: "clipboard-outline",
        title: "Moderação",
        route: "/backoffice/submissoes",
    },
    {
        icon: "checkmark-circle-outline",
        title: "Registos",
        route: "/backoffice/registos",
    },
    {
        icon: "flag-outline",
        title: "Desafios",
        route: "/backoffice/desafios",
    },
    {
        icon: "megaphone-outline",
        title: "Campanhas",
        route: "/backoffice/campanhas",
    },
    {
        icon: "bar-chart-outline",
        title: "Estatísticas",
        route: "/backoffice/estatisticas",
    },
    {
        icon: "download-outline",
        title: "Exportar",
        route: "/backoffice/exportar",
    },
    ];

    return (
    <BackofficeLayout>
        <Text style={styles.title}>Dashboard Administrativo</Text>
        <Text style={styles.subtitle}>
        Gestão geral da plataforma IPVC Green League
        </Text>

        <View style={styles.statsRow}>
        <Stat title="Utilizadores" value={totalUtilizadores} />
        <Stat title="Equipas" value={totalEquipas} />
        <Stat title="Submissões" value={totalSubmissoes} />
        <Stat title="Campanhas" value={totalCampanhas} />
        </View>

        <View style={styles.section}>
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Submissões Pendentes</Text>

            <TouchableOpacity onPress={() => router.push("/backoffice/submissoes")}>
            <Text style={styles.seeAll}>Ver todas</Text>
            </TouchableOpacity>
        </View>

        {submissoesPendentes.length === 0 ? (
            <Text style={styles.emptyText}>Não existem submissões pendentes.</Text>
        ) : (
            submissoesPendentes.map((item) => (
            <View key={item.id} style={styles.tableRow}>
                <View>
                <Text style={styles.rowTitle}>
                    {item.utilizadores?.nome || "Utilizador"}
                </Text>
                <Text style={styles.rowSub}>
                    {item.catalogo_acoes?.titulo || "Ação"} ·{" "}
                    {item.descricao_user || "Sem descrição"}
                </Text>
                </View>

                <TouchableOpacity
                style={styles.validateButton}
                onPress={() => router.push("/backoffice/submissoes")}
                >
                <Text style={styles.validateText}>Validar</Text>
                </TouchableOpacity>
            </View>
            ))
        )}
        </View>
    </BackofficeLayout>
    );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({

  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
  },

  subtitle: {
    color: "#B8B8C0",
    fontSize: 15,
    marginTop: 6,
    marginBottom: 28,
  },

  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 30,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#1E1E26",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2C2C35",
  },

  statValue: {
    color: "#4CFF3B",
    fontSize: 28,
    fontWeight: "900",
  },

  statTitle: {
    color: "#B8B8C0",
    fontSize: 13,
    marginTop: 6,
  },

  section: {
    backgroundColor: "#15151B",
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: "#292932",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },

  seeAll: {
    color: "#4CFF3B",
    fontWeight: "800",
  },

  emptyText: {
    color: "#B8B8C0",
  },

  tableRow: {
    backgroundColor: "#1E1E26",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  rowTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  rowSub: {
    color: "#B8B8C0",
    fontSize: 13,
    marginTop: 4,
  },

  validateButton: {
    backgroundColor: "#4CFF3B",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },

  validateText: {
    color: "#000",
    fontWeight: "900",
  },

});