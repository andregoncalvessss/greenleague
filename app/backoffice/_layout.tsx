import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { useTheme } from "../../components/ThemeProvider";

// Guard de acesso ao backoffice.
// Corre para TODAS as rotas /backoffice/*. Verifica se existe sessão ativa e se
// o utilizador tem role 'admin'. Enquanto verifica mostra um spinner; se não
// estiver autenticado ou não for admin, redireciona para o login (/).
export default function BackofficeLayout() {
  const { colors } = useTheme();
  const [estado, setEstado] = useState<"verificando" | "autorizado" | "negado">("verificando");

  useEffect(() => {
    let ativo = true;

    async function verificarSessao(session: any) {
      // getSession() espera que o cliente restaure a sessão do storage (evita
      // a race condition no reload da página no web).
      const user = session?.user;
      if (!user) {
        if (ativo) setEstado("negado");
        return;
      }
      const { data: perfil } = await supabase
        .from("utilizadores")
        .select("role")
        .eq("id", user.id)
        .single();
      if (ativo) setEstado(perfil?.role === "admin" ? "autorizado" : "negado");
    }

    supabase.auth.getSession().then(({ data }) => verificarSessao(data.session));

    // Reavaliar em logout / mudança de sessão.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") { if (ativo) setEstado("negado"); return; }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") verificarSessao(session);
    });

    return () => { ativo = false; sub.subscription.unsubscribe(); };
  }, []);

  if (estado === "verificando") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (estado === "negado") {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
