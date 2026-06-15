import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';

const COLORS = { background: '#121214', primary: '#5EFC44', secondary: '#50E3C2', inputBg: '#1E1E24', inputBorder: '#333333', textLight: '#FFFFFF', textGray: '#888888' };

export default function RegisterScreen() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!nome || !email || !password) {
      Alert.alert('Erro', 'Por favor, preenche todos os campos.');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: {
          nome: nome.trim()
        }
      }
    });

    setLoading(false);

    if (error) {
      Alert.alert('Erro no Registo', error.message);
    } else {
      Alert.alert('Sucesso', 'Conta criada com sucesso!', [
        { text: 'OK', onPress: () => router.replace('/onboarding') }
      ]);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        
        <View style={styles.header}>
          <Ionicons name="leaf-outline" size={70} color={COLORS.primary} />
          <Text style={styles.title}>CRIAR CONTA</Text>
          <Text style={styles.subtitle}>Junta-te à competição pelo planeta</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Nome Completo</Text>
          <TextInput 
            style={styles.input} 
            placeholder="O teu nome" 
            placeholderTextColor={COLORS.textGray} 
            value={nome}
            onChangeText={setNome}
          />

          <Text style={styles.label}>Email Institucional</Text>
          <TextInput 
            style={styles.input} 
            placeholder="aluno@ipvc.pt" 
            placeholderTextColor={COLORS.textGray} 
            keyboardType="email-address" 
            autoCapitalize="none" 
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput 
            style={styles.input} 
            placeholder="••••••••" 
            placeholderTextColor={COLORS.textGray} 
            secureTextEntry 
            value={password}
            onChangeText={setPassword}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.primary, marginTop: 10 },
  subtitle: { fontSize: 14, color: COLORS.secondary, marginTop: 5, fontWeight: '600' },
  form: { width: '100%' },
  label: { color: COLORS.textLight, fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: 12, color: COLORS.textLight, padding: 16, fontSize: 16 },
  button: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  buttonText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  footerText: { color: COLORS.textGray, fontSize: 14 },
  footerLink: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold' }
});