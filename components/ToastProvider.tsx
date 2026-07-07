import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  Animated, Modal, Platform, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeProvider';
import { Type } from '../constants/typography';

// ─── Types ─────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  anim: Animated.Value;
}

interface ShowToastOpts {
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ConfirmOpts {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  icon?: string;
  iconColor?: string;
}

interface ToastContextType {
  showToast: (opts: ShowToastOpts) => void;
  showConfirm: (opts: ConfirmOpts) => Promise<boolean>;
}

// ─── Context ───────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  showConfirm: async () => false,
});

export const useToast = () => useContext(ToastContext);

// ─── Helpers ───────────────────────────────────────────────────────────────

function typeColor(type: ToastType, colors: ReturnType<typeof useTheme>['colors']): string {
  return { success: colors.primary, error: colors.red, warning: colors.yellow, info: colors.secondary }[type];
}

const TYPE_ICON: Record<ToastType, string> = {
  success: 'checkmark-circle',
  error:   'close-circle',
  warning: 'warning',
  info:    'information-circle',
};

// ─── Single Toast Component ─────────────────────────────────────────────────

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const { colors, isDark } = useTheme();
  const color = typeColor(item.type, colors);

  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const duration = 3500;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    Animated.timing(progressAnim, { toValue: 0, duration, useNativeDriver: false }).start();
    const timer = setTimeout(() => dismiss(), duration);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -120, duration: 250, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss(item.id));
  }

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const toastBg   = isDark ? '#1C1C22' : colors.surface;
  const titleClr  = colors.text;
  const msgClr    = colors.textMuted;
  const closeClr  = colors.textDim;
  const shadowOp  = isDark ? 0.4 : 0.1;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: toastBg,
          borderLeftColor: color,
          borderColor: isDark ? 'transparent' : colors.border,
          borderWidth: isDark ? 0 : 1,
          shadowOpacity: shadowOp,
          shadowColor: isDark ? '#000' : '#64748B',
        },
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={dismiss} style={styles.toastInner}>
        <Ionicons name={TYPE_ICON[item.type] as any} size={22} color={color} style={styles.toastIcon} />
        <View style={styles.toastText}>
          {item.title ? <Text style={[styles.toastTitle, { color: titleClr }]}>{item.title}</Text> : null}
          <Text style={[styles.toastMessage, { color: item.title ? msgClr : titleClr }]}>{item.message}</Text>
        </View>
        <Ionicons name="close" size={16} color={closeClr} />
      </TouchableOpacity>
      <Animated.View style={[styles.toastProgress, { width: progressWidth, backgroundColor: color }]} />
    </Animated.View>
  );
}

// ─── Confirm Modal ──────────────────────────────────────────────────────────

interface ConfirmState {
  opts: ConfirmOpts;
  resolve: (v: boolean) => void;
}

function ConfirmModal({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  const { colors, isDark } = useTheme();
  const {
    title, message,
    confirmText = 'Confirmar', cancelText = 'Cancelar',
    destructive = false, icon, iconColor,
  } = state.opts;

  const accentColor   = iconColor || (destructive ? colors.red : colors.primary);
  const confirmColor  = destructive ? colors.red : colors.primary;
  const confirmTxtClr = (!destructive && isDark) ? '#000' : '#FFF';
  const iconName      = (icon || (destructive ? 'warning-outline' : 'shield-checkmark-outline')) as any;

  const cardBg     = isDark ? '#1C1C22' : colors.surface;
  const dividerClr = isDark ? '#2E2E38' : colors.border;

  function handleConfirm() { state.resolve(true); onClose(); }
  function handleCancel()  { state.resolve(false); onClose(); }

  const overlayStyle: any = Platform.OS === 'web'
    ? { backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }
    : {};

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={[styles.confirmOverlay, overlayStyle]}>
        <View style={[
          styles.confirmCard,
          {
            backgroundColor: cardBg,
            borderColor: dividerClr,
            shadowOpacity: isDark ? 0.7 : 0.14,
            shadowColor: isDark ? '#000' : '#1E293B',
          },
        ]}>
          {/* Icon */}
          <View style={[styles.confirmIconCircle, { backgroundColor: accentColor + '18' }]}>
            <Ionicons name={iconName} size={38} color={accentColor} />
          </View>

          {/* Text */}
          <View style={styles.confirmTextBlock}>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.confirmMessage, { color: colors.textMuted }]}>{message}</Text>
          </View>

          {/* Divider */}
          <View style={[styles.confirmDivider, { backgroundColor: dividerClr }]} />

          {/* Buttons — iOS-style split */}
          <View style={styles.confirmButtons}>
            <TouchableOpacity
              style={styles.confirmBtnCancel}
              onPress={handleCancel}
              activeOpacity={0.6}
            >
              <Text style={[styles.confirmBtnCancelText, { color: colors.textMuted }]}>{cancelText}</Text>
            </TouchableOpacity>
            <View style={[styles.confirmBtnDivider, { backgroundColor: dividerClr }]} />
            <TouchableOpacity
              style={styles.confirmBtnConfirm}
              onPress={handleConfirm}
              activeOpacity={0.7}
            >
              <Text style={[styles.confirmBtnConfirmText, { color: confirmColor }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const insets = useSafeAreaInsets();

  const showToast = useCallback(({ type, title, message }: ShowToastOpts) => {
    const id = `${Date.now()}_${Math.random()}`;
    const anim = new Animated.Value(-120);
    setToasts(prev => [...prev, { id, type, title, message, anim }].slice(-4));
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showConfirm = useCallback((opts: ConfirmOpts): Promise<boolean> => {
    return new Promise(resolve => setConfirmState({ opts, resolve }));
  }, []);

  const closeConfirm = useCallback(() => setConfirmState(null), []);

  const topOffset = Platform.OS === 'web' ? 20 : insets.top + 12;

  return (
    <ToastContext.Provider value={{ showToast, showConfirm }}>
      {children}
      <View style={[styles.container, { top: topOffset }]} pointerEvents="box-none">
        {toasts.map(item => (
          <Toast key={item.id} item={item} onDismiss={dismissToast} />
        ))}
      </View>
      {confirmState && <ConfirmModal state={confirmState} onClose={closeConfirm} />}
    </ToastContext.Provider>
  );
}

// ─── Styles (estrutura apenas, cores via inline) ────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 10,
  },
  toast: {
    borderRadius: 16,
    borderLeftWidth: 4,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 12,
  },
  toastInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  toastIcon: { flexShrink: 0 },
  toastText: { flex: 1 },
  toastTitle: { fontWeight: '800', fontSize: 14, marginBottom: 2 },
  toastMessage: { fontSize: 13, lineHeight: 18 },
  toastProgress: { height: 3, alignSelf: 'flex-start' },

  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  confirmCard: {
    borderRadius: 22,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 24 },
    shadowRadius: 48,
    elevation: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  confirmIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 36,
    marginBottom: 20,
  },
  confirmTextBlock: {
    paddingHorizontal: 32,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  confirmTitle: { ...Type.title2, textAlign: 'center' },
  confirmMessage: { ...Type.body, textAlign: 'center', lineHeight: 22 },
  confirmDivider: { height: 1, width: '100%' },
  confirmButtons: { flexDirection: 'row', width: '100%' },
  confirmBtnCancel: {
    flex: 1, paddingVertical: 18, alignItems: 'center',
  },
  confirmBtnCancelText: { ...Type.callout, fontWeight: '600' },
  confirmBtnDivider: { width: 1 },
  confirmBtnConfirm: {
    flex: 1, paddingVertical: 18, alignItems: 'center',
  },
  confirmBtnConfirmText: { ...Type.callout, fontWeight: '700' },
});
