import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { ToastProvider } from '../components/ToastProvider';
import { ThemeProvider } from '../components/ThemeProvider';
import { FONT } from '../constants/typography';

// Web-only global polish: SF Pro font stack + Apple-grade text rendering, and
// the select/input focus treatment used across the backoffice.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const el = document.createElement('style');
  el.textContent = [
    /* ── Typography: SF Pro stack + subpixel antialiasing (the macOS "crisp" look) ── */
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
    /* restore a themed outline on focus */
    'select:focus, input:focus, textarea:focus {',
    '  outline: 2px solid #22C55E;',
    '  outline-offset: 0px;',
    '  border-radius: 10px;',
    '}',
  ].join(' ');
  document.head.appendChild(el);
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="register" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="definicoes" />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </ToastProvider>
    </ThemeProvider>
  );
}
