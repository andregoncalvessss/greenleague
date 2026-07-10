import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "./ThemeProvider";

/**
 * Paginação minimalista "‹ Página X de Y ›", alinhada à direita.
 * Não renderiza nada se só houver 1 página (ou nenhuma).
 */
export default function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const { colors } = useTheme();
  if (totalPages <= 1) return null;

  const dim = colors.textDim;
  const border = colors.border;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
      <TouchableOpacity onPress={() => onChange(Math.max(0, page - 1))} disabled={page === 0} hitSlop={6}>
        <Ionicons name="chevron-back" size={13} color={page === 0 ? border : dim} />
      </TouchableOpacity>
      <Text style={{ color: dim, fontSize: 11, fontWeight: "600" }}>
        Página {page + 1} de {totalPages}
      </Text>
      <TouchableOpacity onPress={() => onChange(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} hitSlop={6}>
        <Ionicons name="chevron-forward" size={13} color={page >= totalPages - 1 ? border : dim} />
      </TouchableOpacity>
    </View>
  );
}
