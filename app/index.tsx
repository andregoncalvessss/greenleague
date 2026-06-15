import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase'; // <-- Importação do nosso cérebro

const COLORS = { background: '#121214', primary: '#5EFC44', secondary: '#50E3C2', inputBg: '#1E1E24', inputBorder: '#333333', textLight: '#FFFFFF', textGray: '#888888' };

export default function LoginScreen() {
  const router = useRouter();
  
  // Variáveis para guardar o que o utilizador escreve
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Função que comunica com a base de dados para fazer o Login
  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preenche o email e a palavra-passe.');
      return;
    }

    setLoading(true); // Liga a rodinha de carregamento no botão
    
    // Tenta fazer login no Supabase
    const { error } = await supabase.auth.signInWithPassword({ 
      email: email.trim().toLowerCase(), 
      password 
    });
    
    setLoading(false); // Desliga a rodinha

    if (error) {
      Alert.alert('Erro no Login', 'Credenciais incorretas. Verifica o teu email e password.');
    } else {
      // Login com sucesso! Vai para o Dashboard (home.tsx)
      router.replace('/home'); 
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Ionicons name="shield-outline" size={70} color={COLORS.primary} style={styles.glowIcon} />
          <Text style={[styles.title, styles.glowText]}>IPVC GREEN LEAGUE</Text>
          <Text style={styles.subtitle}>Sustentabilidade em modo competitivo</Text>
        </View>

        {/* Formulário */}
        <View style={styles.form}>
          <Text style={styles.label}>Email Institucional</Text>
          <TextInput 
            style={styles.input} 
            placeholder="aluno@ipvc.pt" 
            placeholderTextColor={COLORS.textGray} 
            keyboardType="email-address" 
            autoCapitalize="none" 
            value={email} // <-- Liga o campo à variável
            onChangeText={setEmail} // <-- Atualiza a variável
          />

          <Text style={styles.label}>Password</Text>
          <TextInput 
            style={styles.input} 
            placeholder="••••••••" 
            placeholderTextColor={COLORS.textGray} 
            secureTextEntry 
            value={password} // <-- Liga o campo à variável
            onChangeText={setPassword} // <-- Atualiza a variável
          />

          {/* Botão de Login com a ação onPress */}
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

        {/* Rodapé para ir para o Registo */}
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

// Estilos
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.primary, marginTop: 15, letterSpacing: 1 },
  subtitle: { fontSize: 14, color: COLORS.secondary, marginTop: 5, fontWeight: '600' },
  form: { width: '100%' },
  label: { color: COLORS.textLight, fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: 12, color: COLORS.textLight, padding: 16, fontSize: 16 },
  button: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  buttonText: { color: '#000000', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  linkContainer: { alignItems: 'center', marginTop: 20 },
  linkText: { color: COLORS.secondary, fontSize: 14, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40 },
  footerText: { color: COLORS.textGray, fontSize: 14 },
  footerLink: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold' },
  glowText: { textShadowColor: COLORS.primary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15 },
  glowIcon: { textShadowColor: COLORS.primary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
  glowButton: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 }
});