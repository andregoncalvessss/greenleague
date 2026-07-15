import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import { ToastProvider } from '../components/ToastProvider';
import { ThemeProvider, useTheme } from '../components/ThemeProvider';
import { SettingsProvider } from '../components/SettingsProvider';
import { FONT } from '../constants/typography';

// Web-only global polish: SF Pro font stack + Apple-grade text rendering, e o
// reset dos contornos nativos dos campos. A COR do contorno de foco é aplicada
// dinamicamente pelo <FocusOutline/> abaixo, para seguir a cor primária do tema.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const el = document.createElement('style');
  el.textContent = [
    ':root { font-synthesis: none; }',
    'html, body, #root, input, select, textarea, button {',
    `  font-family: ${FONT.sans};`,
    '  -webkit-font-smoothing: antialiased;',
    '  -moz-osx-font-smoothing: grayscale;',
    '  text-rendering: optimizeLegibility;',
    '  font-feature-settings: "kern", "liga", "calt";',
    '}',
    /* remove browser-native borders/outlines by default */
    'select { border: none !important; outline: none; }',
    'input  { outline: none; }',
    'textarea { outline: none; }',
  ].join(' ');
  document.head.appendChild(el);
}

// Aplica (e mantém atualizada) a cor do contorno de foco dos campos no web,
// seguindo a cor primária escolhida na tab Aparência.
function FocusOutline() {
  const { colors } = useTheme();
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    let el = document.getElementById('gl-focus-outline') as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = 'gl-focus-outline';
      document.head.appendChild(el);
    }
    el.textContent = `select:focus, input:focus, textarea:focus { outline: 2px solid ${colors.primary}; outline-offset: 0px; border-radius: 10px; }`;
  }, [colors.primary]);
  return null;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <ToastProvider>
          <FocusOutline />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="register" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="definicoes" />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </ToastProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
