import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { useToast } from '../components/ToastProvider';
import { useTheme } from '../components/ThemeProvider';

export default function LoginScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      showToast({ type: 'warning', title: 'Campos em falta', message: 'Por favor, preenche o email e a palavra-passe.' });
      return;
    }

    setLoading(true);

    const { data: loginData, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (error) {
      setLoading(false);
      showToast({ type: 'error', title: 'Erro no Login', message: 'Credenciais incorretas. Verifica o teu email e password.' });
      return;
    }

    const user = loginData.user;
    const { data: perfil, error: perfilError } = await supabase
      .from('utilizadores')
      .select('role')
      .eq('id', user.id)
      .single();

    setLoading(false);

    if (perfilError) {
      showToast({ type: 'error', message: 'Não foi possível carregar o perfil.' });
      return;
    }

    if (perfil?.role === 'admin') {
      router.replace('/backoffice');
    } else {
      router.replace('/home');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>

        <View style={styles.header}>
          <Ionicons name="shield-outline" size={70} color={colors.primary} style={styles.glowIcon} />
          <Text style={[styles.title, styles.glowText]}>IPVC GREEN LEAGUE</Text>
          <Text style={styles.subtitle}>Sustentabilidade em modo competitivo</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email Institucional</Text>
          <TextInput
            style={styles.input}
            placeholder="aluno@ipvc.pt"
            placeholderTextColor={colors.placeholderText}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.placeholderText}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.button, styles.glowButton]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>JOIN THE PLANET</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkContainer}>
            <Text style={styles.linkText}>Esqueceu a password?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Novo na Green League? </Text>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.footerLink}>Criar Conta</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.surface },
    content: { flex: 1, justifyContent: 'center', padding: 20 },
    header: { alignItems: 'center', marginBottom: 40 },
    title: { fontSize: 28, fontWeight: '900', color: c.primary, marginTop: 15, letterSpacing: 1 },
    subtitle: { fontSize: 14, color: c.secondary, marginTop: 5, fontWeight: '600' },
    form: { width: '100%' },
    label: { color: c.text, fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 15 },
    input: { backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.inputBorder, borderRadius: 12, color: c.text, padding: 16, fontSize: 16 },
    button: { backgroundColor: c.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
    buttonText: { color: '#000000', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
    linkContainer: { alignItems: 'center', marginTop: 20 },
    linkText: { color: c.secondary, fontSize: 14, fontWeight: '600' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40 },
    footerText: { color: c.textMuted, fontSize: 14 },
    footerLink: { color: c.primary, fontSize: 14, fontWeight: 'bold' },
    glowText: { textShadowColor: c.primary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15 },
    glowIcon: { textShadowColor: c.primary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
    glowButton: { shadowColor: c.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 },
  });
}
