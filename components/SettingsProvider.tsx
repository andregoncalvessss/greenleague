import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "../src/lib/supabase";

// Nome da app editável no backoffice (guardado em configuracoes.nome_app).
// Atualiza em tempo real (Supabase Realtime) e ao voltar a app ao primeiro plano.

const DEFAULT_NAME = "GREEN LEAGUE";

type SettingsCtx = {
  appName: string;
  refreshAppName: () => Promise<void>;
};

const SettingsContext = createContext<SettingsCtx>({
  appName: DEFAULT_NAME,
  refreshAppName: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [appName, setAppName] = useState(DEFAULT_NAME);

  const refreshAppName = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", "nome_app")
        .single();
      if (data?.valor && data.valor.trim()) setAppName(data.valor.trim());
    } catch {
      // sem tabela/valor — mantém o default
    }
  }, []);

  useEffect(() => {
    refreshAppName();

    // Tempo real: reage a alterações do nome_app no backoffice.
    const channel = supabase
      .channel("cfg-nome-app")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "configuracoes", filter: "chave=eq.nome_app" },
        () => refreshAppName()
      )
      .subscribe();

    // Rede de segurança: reler ao voltar a app ao primeiro plano.
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshAppName();
    });

    return () => {
      supabase.removeChannel(channel);
      appStateSub.remove();
    };
  }, [refreshAppName]);

  return (
    <SettingsContext.Provider value={{ appName, refreshAppName }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
