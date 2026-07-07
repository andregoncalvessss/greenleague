import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { useToast } from '../components/ToastProvider';
import { useTheme } from '../components/ThemeProvider';

export default function RegisterScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [confirmarEmail, setConfirmarEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!nome || !email || !confirmarEmail || !password || !confirmarPassword) {
      showToast({ type: 'warning', title: 'Campos em falta', message: 'Por favor, preenche todos os campos.' });
      return;
    }
    if (nome.trim().length < 3) {
      showToast({ type: 'warning', title: 'Nome demasiado curto', message: 'O nome deve ter pelo menos 3 caracteres.' });
      return;
    }
    if (nome.trim().length > 80) {
      showToast({ type: 'warning', title: 'Nome demasiado longo', message: 'O nome não pode ter mais de 80 caracteres.' });
      return;
    }
    if (!email.trim().toLowerCase().endsWith('@ipvc.pt')) {
      showToast({ type: 'error', title: 'Email inválido', message: 'O teu email deve pertencer ao IPVC (@ipvc.pt).' });
      return;
    }
    if (email.trim().toLowerCase() !== confirmarEmail.trim().toLowerCase()) {
      showToast({ type: 'error', title: 'Emails não coincidem', message: 'O email e a confirmação têm de ser iguais.' });
      return;
    }
    if (password !== confirmarPassword) {
      showToast({ type: 'error', title: 'Passwords não coincidem', message: 'A password e a confirmação têm de ser iguais.' });
      return;
    }
    if (password.length < 6) {
      showToast({ type: 'warning', title: 'Password fraca', message: 'A password deve ter pelo menos 6 caracteres.' });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: { data: { nome: nome.trim() } }
    });

    setLoading(false);

    if (error) {
      showToast({ type: 'error', title: 'Erro no Registo', message: error.message });
    } else {
      showToast({ type: 'success', title: 'Conta criada!', message: 'Bem-vindo à Green League.' });
      router.replace('/onboarding');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>

        <View style={styles.header}>
          <Ionicons name="leaf-outline" size={70} color={colors.primary} />
          <Text style={styles.title}>CRIAR CONTA</Text>
          <Text style={styles.subtitle}>Junta-te à competição pelo planeta</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Primeiro e Último Nome</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: João Silva"
            placeholderTextColor={colors.placeholderText}
            maxLength={80}
            value={nome}
            onChangeText={setNome}
          />

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

          <Text style={styles.label}>Confirmar Email</Text>
          <TextInput
            style={styles.input}
            placeholder="aluno@ipvc.pt"
            placeholderTextColor={colors.placeholderText}
            keyboardType="email-address"
            autoCapitalize="none"
            value={confirmarEmail}
            onChangeText={setConfirmarEmail}
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

          <Text style={styles.label}>Confirmar Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.placeholderText}
            secureTextEntry
            value={confirmarPassword}
            onChangeText={setConfirmarPassword}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>REGISTAR</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Já tens conta? </Text>
          <TouchableOpacity onPress={() => router.push('/')}>
            <Text style={styles.footerLink}>Fazer Login</Text>
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
    header: { alignItems: 'center', marginBottom: 30 },
    title: { fontSize: 26, fontWeight: '900', color: c.primary, marginTop: 10 },
    subtitle: { fontSize: 14, color: c.secondary, marginTop: 5, fontWeight: '600' },
    form: { width: '100%' },
    label: { color: c.text, fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 15 },
    input: { backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.inputBorder, borderRadius: 12, color: c.text, padding: 16, fontSize: 16 },
    button: { backgroundColor: c.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
    buttonText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
    footerText: { color: c.textMuted, fontSize: 14 },
    footerLink: { color: c.primary, fontSize: 14, fontWeight: 'bold' },
  });
}
