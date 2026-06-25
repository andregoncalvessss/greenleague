import { Picker } from "@react-native-picker/picker";
import { useEffect, useMemo, useState } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import BackofficeLayout from "../../components/BackofficeLayout";
import { supabase } from "../../src/lib/supabase";

export default function UtilizadoresBackoffice() {
  const [utilizadores, setUtilizadores] = useState<any[]>([]);
  const [pesquisa, setPesquisa] = useState("");
  const [filtroEscola, setFiltroEscola] = useState("todas");
  const [filtroCurso, setFiltroCurso] = useState("todos");
  const [filtroRole, setFiltroRole] = useState("todas");
  const escolasUnicas = Array.from(
  new Set(utilizadores.map((u) => u.escolas?.sigla).filter(Boolean))
  );

  const cursosUnicos = Array.from(
  new Set(utilizadores.map((u) => u.cursos?.nome).filter(Boolean))
  );

  useEffect(() => {
    carregarUtilizadores();
  }, []);

  async function carregarUtilizadores() {
    const { data, error } = await supabase
      .from("utilizadores")
      .select(`
        id,
        nome,
        email,
        role,
        xp_total,
        nivel,
        co2_poupado,
        agua_poupada,
        escolas(nome, sigla),
        cursos(nome)
      `)
      .order("xp_total", { ascending: false });

    if (!error) {
      setUtilizadores(data || []);
    }
  }

  async function alterarRole(id: string, roleAtual: string) {
    const novaRole = roleAtual === "admin" ? "user" : "admin";

    const { error } = await supabase
      .from("utilizadores")
      .update({ role: novaRole })
      .eq("id", id);

    if (!error) {
      carregarUtilizadores();
    }
  }

  const filtrados = useMemo(() => {
    return utilizadores.filter((u) => {
        const texto = `${u.nome} ${u.email} ${u.escolas?.nome} ${u.cursos?.nome}`.toLowerCase();

        const passaPesquisa = texto.includes(pesquisa.toLowerCase());

        const passaEscola =
        filtroEscola === "todas" || u.escolas?.sigla === filtroEscola;

        const passaCurso =
        filtroCurso === "todos" || u.cursos?.nome === filtroCurso;

        const passaRole =
        filtroRole === "todas" || u.role === filtroRole;

        return passaPesquisa && passaEscola && passaCurso && passaRole;
    });
  }, [utilizadores, pesquisa, filtroEscola, filtroCurso, filtroRole]);

  const totalAdmins = utilizadores.filter((u) => u.role === "admin").length;
  const totalUsers = utilizadores.filter((u) => u.role !== "admin").length;
  const totalXP = utilizadores.reduce((acc, u) => acc + (u.xp_total || 0), 0);

  const porEscola = contarPorCampo(utilizadores, "escolas", "sigla");
  const porCurso = contarPorCampo(utilizadores, "cursos", "nome");

  return (
    <BackofficeLayout>
      <Text style={styles.title}>Gestão de Utilizadores</Text>
      <Text style={styles.subtitle}>
        Visão geral dos utilizadores, escolas e cursos do IPVC.
      </Text>

      <View style={styles.statsRow}>
        <Stat title="Total" value={utilizadores.length} />
        <Stat title="Admins" value={totalAdmins} />
        <Stat title="Users" value={totalUsers} />
        <Stat title="XP Total" value={totalXP} />
      </View>

      <View style={styles.gridTwo}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Utilizadores por Escola</Text>

          {Object.keys(porEscola).length === 0 ? (
            <Text style={styles.emptyText}>Sem dados por escola.</Text>
          ) : (
            Object.entries(porEscola).map(([nome, total]) => (
              <View key={nome} style={styles.smallRow}>
                <Text style={styles.rowText}>{nome}</Text>
                <Text style={styles.badge}>{String(total)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Utilizadores por Curso</Text>

          {Object.keys(porCurso).length === 0 ? (
            <Text style={styles.emptyText}>Sem dados por curso.</Text>
          ) : (
            Object.entries(porCurso).map(([nome, total]) => (
              <View key={nome} style={styles.smallRow}>
                <Text style={styles.rowText}>{nome}</Text>
                <Text style={styles.badge}>{String(total)}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lista de Utilizadores</Text>

        <View style={styles.filtersRow}>
            <TextInput
                value={pesquisa}
                onChangeText={setPesquisa}
                placeholder="Pesquisar por nome, email, escola ou curso..."
                placeholderTextColor="#777"
                style={styles.input}
            />

            <View style={styles.selectContainer}>
                <Picker
                selectedValue={filtroEscola}
                onValueChange={(value) => setFiltroEscola(value)}
                dropdownIconColor="#4CFF3B"
                style={styles.picker}
                >
                <Picker.Item label="Todas as escolas" value="todas" />
                {escolasUnicas.map((escola) => (
                    <Picker.Item
                    key={String(escola)}
                    label={String(escola)}
                    value={String(escola)}
                    />
                ))}
                </Picker>
            </View>

            <View style={styles.selectContainer}>
                <Picker
                selectedValue={filtroCurso}
                onValueChange={(value) => setFiltroCurso(value)}
                dropdownIconColor="#4CFF3B"
                style={styles.picker}
                >
                <Picker.Item label="Todos os cursos" value="todos" />
                {cursosUnicos.map((curso) => (
                    <Picker.Item
                    key={String(curso)}
                    label={String(curso)}
                    value={String(curso)}
                    />
                ))}
                </Picker>
            </View>

            <View style={styles.selectContainer}>
                <Picker
                selectedValue={filtroRole}
                onValueChange={(value) => setFiltroRole(value)}
                dropdownIconColor="#4CFF3B"
                style={styles.picker}
                >
                <Picker.Item label="Todas as roles" value="todas" />
                <Picker.Item label="Admin" value="admin" />
                <Picker.Item label="User" value="user" />
                </Picker>
            </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 2 }]}>Nome</Text>
          <Text style={[styles.th, { flex: 2 }]}>Email</Text>
          <Text style={styles.th}>Escola</Text>
          <Text style={[styles.th, { flex: 3 }]}>Curso</Text>
          <Text style={styles.th}>Nível</Text>
          <Text style={styles.th}>XP</Text>
          <Text style={styles.th}>Role</Text>
          <Text style={styles.th}>Ação</Text>
        </View>

        {filtrados.map((u) => (
          <View key={u.id} style={styles.tableRow}>
            <Text style={[styles.td, { flex: 2 }]}>{u.nome}</Text>
            <Text style={[styles.td, { flex: 2 }]}>{u.email}</Text>
            <Text style={styles.td}>{u.escolas?.sigla || "-"}</Text>
            <Text style={[styles.td, { flex: 3 }]}>{u.cursos?.nome || "-"}</Text>
            <Text style={styles.td}>{u.nivel || 1}</Text>
            <Text style={styles.td}>{u.xp_total || 0}</Text>
            <Text style={styles.td}>{u.role || "user"}</Text>

            <TouchableOpacity
              style={styles.roleButton}
              onPress={() => alterarRole(u.id, u.role)}
            >
              <Text style={styles.roleButtonText}>
                {u.role === "admin" ? "Mudar para User" : "Mudar para Admin"}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
    </View>
    </BackofficeLayout>
  );
}

function contarPorCampo(lista: any[], relacao: string, campo: string) {
  const resultado: Record<string, number> = {};

  lista.forEach((item) => {
    const nome = item?.[relacao]?.[campo] || "Sem dados";
    resultado[nome] = (resultado[nome] || 0) + 1;
  });

  return resultado;
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
    marginBottom: 26,
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

  gridTwo: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 26,
  },

  section: {
    flex: 1,
    backgroundColor: "#15151B",
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: "#292932",
    marginBottom: 20,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 16,
  },

  smallRow: {
    backgroundColor: "#1E1E26",
    padding: 13,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  rowText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  badge: {
    color: "#4CFF3B",
    fontWeight: "900",
  },

  emptyText: {
    color: "#B8B8C0",
  },

  input: {
    width: 360,
    backgroundColor: "#1E1E26",
    color: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#2C2C35",
  },

  tableHeader: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2C2C35",
  },

  th: {
    flex: 1,
    color: "#4CFF3B",
    fontSize: 13,
    fontWeight: "900",
  },

  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#24242B",
  },

  td: {
    flex: 1,
    color: "#EDEDF2",
    fontSize: 13,
  },

  roleButton: {
    flex: 1.3,
    backgroundColor: "#4CFF3B",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
  },

  roleButtonText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 12,
  },

  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
  },
  
   input: {
    flex: 3,
    backgroundColor: "#1E1E26",
    color: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: "#2C2C35",
  },

  selectContainer: {
    flex: 1,
    width: 180,
    height: 46,
    backgroundColor: "#1E1E26",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2C2C35",
    overflow: "hidden",
    justifyContent: "center",
  },

  picker: {
    color: "#FFFFFF",
    height: 46,
    backgroundColor: "#1E1E26",
  },

});