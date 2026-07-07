/**
 * GreenLeague — Typography Design System
 * ----------------------------------------
 * Inspirado nas Apple Human Interface Guidelines (SF Pro / macOS).
 *
 * Princípios:
 *  1. Escala semântica, não tamanhos soltos. Cada estilo tem um *papel*
 *     (largeTitle, headline, body…) — escolhe-se pelo significado, não pelo px.
 *  2. Optical sizing: a Apple usa "SF Pro Display" ≥20px e "SF Pro Text" <20px.
 *     Na web o `-apple-system` faz isto automaticamente; o stack abaixo garante
 *     fallback consistente fora de dispositivos Apple.
 *  3. Tracking (letter-spacing) negativo nos títulos grandes, neutro no corpo,
 *     positivo (e UPPERCASE) nas labels pequenas — a assinatura tipográfica Apple.
 *  4. Números sempre tabular (`tabular-nums`) para alinharem em colunas/stats.
 *
 * Uso:
 *   import { Type, FONT } from "../../constants/typography";
 *   sectionTitle: { ...Type.headline, color: C.text },
 *   kpiValue:     { ...Type.metric,   color: C.green },
 *
 * A cor NUNCA vive aqui — é aplicada pelo tema (C.text, C.muted…) para
 * funcionar em dark/light. Os tokens só carregam forma (size/weight/spacing).
 */

import { TextStyle } from "react-native";

// ── Font family ─────────────────────────────────────────────────────────────
// Stack do sistema: SF Pro em Apple, Segoe/Roboto fora. O RN Web já usa
// -apple-system por defeito, mas declaramos explicitamente para garantir o
// optical sizing (Display/Text) e a ordem de fallback.
export const FONT = {
  sans:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", system-ui, Roboto, Helvetica, Arial, sans-serif',
  mono:
    'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Monaco, "Cascadia Mono", "Roboto Mono", monospace',
} as const;

// ── Weights ─────────────────────────────────────────────────────────────────
// Nomes Apple-like. Em web mapeiam para os pesos reais do SF Pro.
export const WEIGHT = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  heavy: "800",
  black: "900",
} as const;

// Helper: garante figuras tabulares (colunas e métricas alinhadas).
const tnum: Pick<TextStyle, "fontVariant"> = { fontVariant: ["tabular-nums"] };

// ── Escala semântica ─────────────────────────────────────────────────────────
// size / weight / lineHeight / letterSpacing afinados para densidade desktop.
export const Type = {
  /** H1 de página. "Dashboard", "Gestão de Equipas". Um por ecrã. */
  largeTitle: {
    fontFamily: FONT.sans,
    fontSize: 30,
    fontWeight: WEIGHT.heavy,
    lineHeight: 36,
    letterSpacing: -0.5,
  },

  /** Títulos de destaque dentro de conteúdo / modais grandes. */
  title1: {
    fontFamily: FONT.sans,
    fontSize: 24,
    fontWeight: WEIGHT.bold,
    lineHeight: 30,
    letterSpacing: -0.4,
  },

  /** Títulos de modal, totais grandes. */
  title2: {
    fontFamily: FONT.sans,
    fontSize: 20,
    fontWeight: WEIGHT.bold,
    lineHeight: 26,
    letterSpacing: -0.3,
  },

  /** Subtítulo de bloco. */
  title3: {
    fontFamily: FONT.sans,
    fontSize: 17,
    fontWeight: WEIGHT.semibold,
    lineHeight: 22,
    letterSpacing: -0.2,
  },

  /** Título de secção / card. O cavalo de batalha dos cabeçalhos de bloco. */
  headline: {
    fontFamily: FONT.sans,
    fontSize: 15,
    fontWeight: WEIGHT.bold,
    lineHeight: 20,
    letterSpacing: -0.1,
  },

  /** Texto corrente. Descrições, parágrafos. */
  body: {
    fontFamily: FONT.sans,
    fontSize: 14,
    fontWeight: WEIGHT.regular,
    lineHeight: 20,
    letterSpacing: 0,
  },

  /** Body com ênfase (nomes, valores em linha). */
  bodyEmphasized: {
    fontFamily: FONT.sans,
    fontSize: 14,
    fontWeight: WEIGHT.semibold,
    lineHeight: 20,
    letterSpacing: 0,
  },

  /** Conteúdo de tabela e listas densas. */
  callout: {
    fontFamily: FONT.sans,
    fontSize: 13,
    fontWeight: WEIGHT.regular,
    lineHeight: 19,
    letterSpacing: 0,
  },

  /** Subtítulo de página / legendas de apoio. */
  subheadline: {
    fontFamily: FONT.sans,
    fontSize: 13,
    fontWeight: WEIGHT.medium,
    lineHeight: 18,
    letterSpacing: 0,
  },

  /** Labels de formulário, metadados. */
  footnote: {
    fontFamily: FONT.sans,
    fontSize: 12,
    fontWeight: WEIGHT.semibold,
    lineHeight: 16,
    letterSpacing: 0,
  },

  /** Texto auxiliar mais pequeno (datas, contadores). */
  caption: {
    fontFamily: FONT.sans,
    fontSize: 11,
    fontWeight: WEIGHT.medium,
    lineHeight: 14,
    letterSpacing: 0.2,
  },

  /**
   * Overline / cabeçalho de tabela. UPPERCASE + tracking largo.
   * É o detalhe que faz uma tabela "parecer Apple".
   */
  overline: {
    fontFamily: FONT.sans,
    fontSize: 11,
    fontWeight: WEIGHT.bold,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  /**
   * Número grande / KPI. Tabular para alinhar. Tracking negativo para
   * compactar dígitos como nos widgets do macOS.
   */
  metric: {
    fontFamily: FONT.sans,
    fontSize: 32,
    fontWeight: WEIGHT.black,
    lineHeight: 36,
    letterSpacing: -0.6,
    ...tnum,
  },

  /** Número médio em linha (XP numa célula, contadores). */
  metricSmall: {
    fontFamily: FONT.sans,
    fontSize: 15,
    fontWeight: WEIGHT.heavy,
    lineHeight: 20,
    letterSpacing: -0.2,
    ...tnum,
  },

  /** Código / códigos de convite. */
  mono: {
    fontFamily: FONT.mono,
    fontSize: 13,
    fontWeight: WEIGHT.medium,
    lineHeight: 18,
    letterSpacing: 0,
  },
} satisfies Record<string, TextStyle>;

export type TypeToken = keyof typeof Type;
