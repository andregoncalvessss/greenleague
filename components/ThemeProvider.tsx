import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "../src/lib/supabase";

// ── Tokens ────────────────────────────────────────────────────────────────────

export type Colors = {
  // Backgrounds
  bg: string;
  surface: string;
  card: string;
  modal: string;
  // Borders
  border: string;
  borderLight: string;
  // Text
  text: string;
  textMuted: string;
  textDim: string;
  // Accents (shared entre dark/light — ligeiramente ajustados para contraste)
  primary: string;       // verde principal
  primaryDark: string;   // verde escuro (texto em bg claro / fundo botão)
  secondary: string;     // teal/cyan
  yellow: string;
  red: string;
  blue: string;
  purple: string;
  // Input
  inputBg: string;
  inputBorder: string;
  placeholderText: string;
  // Status bar
  statusBarStyle: "light-content" | "dark-content";
};

const DARK: Colors = {
  bg: "#0F0F14",
  surface: "#121214",
  card: "#1E1E24",
  modal: "#1A1A20",
  border: "#3E3E4A",
  borderLight: "#35353F",
  text: "#FFFFFF",
  textMuted: "#AAAAAA",
  textDim: "#888888",
  primary: "#5EFC44",
  primaryDark: "#22C55E",
  secondary: "#50E3C2",
  yellow: "#FFB020",
  red: "#FF5555",
  blue: "#5B8DEF",
  purple: "#A78BFA",
  inputBg: "#1E1E24",
  inputBorder: "#333333",
  placeholderText: "#666666",
  statusBarStyle: "light-content",
};

const LIGHT: Colors = {
  bg: "#F1F5F9",          // slate-100 — fundo neutro limpo
  surface: "#FFFFFF",     // sidebar e modais brancos puros
  card: "#FFFFFF",        // cards brancos
  modal: "#FFFFFF",
  border: "#E2E8F0",      // slate-200 — bordas subtis
  borderLight: "#F8FAFC", // slate-50
  text: "#0F172A",        // slate-900 — alto contraste
  textMuted: "#64748B",   // slate-500
  textDim: "#94A3B8",     // slate-400
  primary: "#16A34A",     // green-600 — contraste 4.7:1 em branco ✓
  primaryDark: "#15803D", // green-700
  secondary: "#0891B2",   // cyan-600
  yellow: "#D97706",      // amber-600
  red: "#DC2626",         // red-600
  blue: "#2563EB",        // blue-600
  purple: "#7C3AED",      // violet-600
  inputBg: "#F8FAFC",     // slate-50
  inputBorder: "#CBD5E1", // slate-300
  placeholderText: "#94A3B8", // slate-400
  statusBarStyle: "dark-content",
};

// ── Context ───────────────────────────────────────────────────────────────────

type ThemeCtx = {
  isDark: boolean;
  colors: Colors;
  toggleTheme: () => void;
  refreshColors: () => Promise<void>;
};

const ThemeContext = createContext<ThemeCtx>({
  isDark: true,
  colors: DARK,
  toggleTheme: () => {},
  refreshColors: async () => {},
});

const STORAGE_KEY = "@greenleague_theme";

type Overrides = { primary?: string; secondary?: string };

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true); // default: dark
  const [overrides, setOverrides] = useState<Overrides>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val !== null) setIsDark(val === "dark");
    });
  }, []);

  // Carrega cores personalizadas definidas no backoffice (tab Aparência).
  const refreshColors = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("configuracoes")
        .select("chave, valor")
        .in("chave", ["cor_primaria", "cor_secundaria"]);
      const map = Object.fromEntries((data || []).map((c: any) => [c.chave, c.valor]));
      setOverrides({
        primary: map["cor_primaria"]?.trim() || undefined,
        secondary: map["cor_secundaria"]?.trim() || undefined,
      });
    } catch {
      // sem tabela/valores — mantém o default
    }
  }, []);

  useEffect(() => {
    refreshColors();

    const channel = supabase
      .channel("cfg-cores")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "configuracoes" },
        (payload: any) => {
          const chave = payload?.new?.chave || payload?.old?.chave;
          if (chave === "cor_primaria" || chave === "cor_secundaria") refreshColors();
        }
      )
      .subscribe();

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshColors();
    });

    return () => {
      supabase.removeChannel(channel);
      appStateSub.remove();
    };
  }, [refreshColors]);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
      return next;
    });
  }, []);

  const colors: Colors = useMemo(() => {
    const base = isDark ? DARK : LIGHT;
    return {
      ...base,
      ...(overrides.primary ? { primary: overrides.primary, primaryDark: overrides.primary } : {}),
      ...(overrides.secondary ? { secondary: overrides.secondary } : {}),
    };
  }, [isDark, overrides]);

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme, refreshColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export { DARK, LIGHT };
