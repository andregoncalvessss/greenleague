import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../src/lib/supabase';

const COLORS = {
  background: '#121214',
  primary: '#5EFC44', 
  secondary: '#50E3C2', 
  cardBg: 'rgba(30, 30, 36, 0.8)',
  textLight: '#FFFFFF',
  textGray: '#888888',
  border: '#2A2A30'
};

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [])
  );

  async function fetchUserData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error: profileErr } = await supabase
        .from('utilizadores')
        .select('*, escolas(nome), cursos(nome)')
        .eq('id', user.id)
        .single();
        
      if (profileErr) console.error("Erro perfil:", profileErr);

      // Calcular o Rank Global exato verificando apenas quem tem mais XP total
      const myXp = profile?.xp_total || 0;
      
      const { count: rankCount } = await supabase
        .from('utilizadores')
        .select('id', { count: 'exact', head: true })
        .gt('xp_total', myXp);
      
      const rank = (rankCount || 0) + 1;

      const { data: acoes, error: acoesErr } = await supabase
        .from('submissoes_acao')
        .select('criado_em')
        .eq('utilizador_id', user.id)
        .eq('estado', 'aprovado');

      if (acoesErr) console.error("Erro acoes:", acoesErr);

      const acoesCompletadas = acoes?.length || 0;
      
      const diasAtivosSet = new Set();
      acoes?.forEach(a => {
         if (a.criado_em) {
           const data = new Date(a.criado_em).toISOString().split('T')[0];
           diasAtivosSet.add(data);
         }
      });
      const diasAtivos = diasAtivosSet.size;

      setUserData({
        ...profile,
        rank,
        acoesCompletadas,
        diasAtivos
      });
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !userData) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );

  // AQUI: Lógica exata e simples a ler da Base de Dados (Igual à Home)
  const nivel = userData?.nivel || 1;
  const xpAtual = userData?.xp_total || 0;
  const xpObjetivo = nivel * 1000; 
  const progressoPercentagem = Math.min((xpAtual / xpObjetivo) * 100, 100);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#121214', '#1A1A2E', '#0D2B1D']} style={styles.backgroundGradient} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.iconCircle}>
              <Feather name="share-2" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconCircle} onPress={() => router.push('/definicoes')}>
              <Ionicons name="settings-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.avatarRow}>
              <View style={styles.avatarBox}>
                {userData?.avatar_url ? (
                  <Image source={{ uri: userData.avatar_url }} style={styles.avatarImg} contentFit="cover" />
                ) : (
                  <Text style={styles.avatarText}>
                    {userData?.nome ? userData.nome.charAt(0).toUpperCase() : '?'}
                  </Text>
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>{userData?.nome || 'Jogador'}</Text>
                <Text style={styles.userCourse} numberOfLines={1}>{userData?.cursos?.nome || 'Sem Curso Definido'}</Text>
                <View style={styles.badgeRow}>
                   <View style={styles.rankBadge}>
                     <Text style={styles.rankText}>Rank #{userData?.rank || '-'}</Text>
                   </View>
                   <View style={styles.streakBadge}>
                     <Text style={styles.streakText}>{userData?.diasAtivos || 0} dias 🔥</Text>
                   </View>
                </View>
              </View>
            </View>

            <View style={styles.xpRow}>
              <Text style={styles.levelText}>Level {nivel}</Text>
              <Text style={styles.xpText}>{xpAtual} / {xpObjetivo} XP</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressoPercentagem}%` }]} />
            </View>
            <Text style={styles.totalXp}>Total de {xpAtual} XP acumulados</Text>
          </View>

          <Text style={styles.sectionTitle}>Impacto Ambiental</Text>
          <View style={styles.impactRow}>
            <View style={styles.impactCard}>
              <View style={styles.impactHeader}>
                <View>
                   <Text style={styles.impactLabel}>CO₂ Poupado</Text>
                   <Text style={[styles.impactValue, { color: COLORS.primary }]}>
                     {userData?.co2_poupado ? parseFloat(userData.co2_poupado).toFixed(1) : '0.0'} kg
                   </Text>
                </View>
                <MaterialCommunityIcons name="lightning-bolt" size={32} color={COLORS.primary} />
              </View>
            </View>

            <View style={styles.impactCard}>
              <View style={styles.impactHeader}>
                <View>
                   <Text style={styles.impactLabel}>Água Poupada</Text>
                   <Text style={[styles.impactValue, { color: COLORS.secondary }]}>
                     {userData?.agua_poupada ? parseFloat(userData.agua_poupada).toFixed(1) : '0.0'} L
                   </Text>
                </View>
                <Ionicons name="water" size={32} color={COLORS.secondary} />
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Estatísticas</Text>
          <View style={styles.statsContainer}>
             <View style={styles.statBox}>
                <Text style={styles.statValue}>{userData?.acoesCompletadas || 0}</Text>
                <Text style={styles.statLabel}>Ações Completadas</Text>
             </View>
             <View style={styles.divider} />
             <View style={styles.statBox}>
                <Text style={styles.statValue}>{userData?.diasAtivos || 0}</Text>
                <Text style={styles.statLabel}>Dias Ativos</Text>
             </View>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              Alert.alert(
                'Sair da Conta',
                'Tens a certeza que queres sair?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Sair',
                    style: 'destructive',
                    onPress: async () => {
                      await supabase.auth.signOut();
                      router.replace('/');
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF4444" />
            <Text style={styles.logoutText}>Sair da Conta</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  backgroundGradient: { ...StyleSheet.absoluteFillObject },
  scrollContent: { padding: 20, paddingBottom: 120 },
  
  headerButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15, marginBottom: 20 },
  iconCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  
  profileCard: { backgroundColor: COLORS.cardBg, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 30 },
  avatarRow: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  avatarBox: { width: 100, height: 100, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontSize: 48, fontWeight: 'bold', color: '#000' },
  userInfo: { flex: 1, justifyContent: 'center' },
  userName: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  userCourse: { color: COLORS.textGray, fontSize: 13, marginBottom: 10 },
  badgeRow: { flexDirection: 'row', gap: 10 },
  rankBadge: { backgroundColor: 'rgba(94, 252, 68, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary },
  rankText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 12 },
  streakBadge: { backgroundColor: 'rgba(80, 227, 194, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  streakText: { color: COLORS.secondary, fontWeight: 'bold', fontSize: 12 },

  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, marginTop: 10 },
  levelText: { color: COLORS.textGray, fontSize: 14 },
  xpText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },
  progressBar: { height: 8, backgroundColor: '#333', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  totalXp: { color: COLORS.textGray, fontSize: 12, textAlign: 'center', marginTop: 10 },

  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  impactRow: { flexDirection: 'row', gap: 15, marginBottom: 30 },
  impactCard: { flex: 1, backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  impactHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  impactLabel: { color: COLORS.textGray, fontSize: 12 },
  impactValue: { fontSize: 20, fontWeight: 'bold', marginVertical: 4 },

  statsContainer: { backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center' },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { color: COLORS.primary, fontSize: 32, fontWeight: 'bold' },
  statLabel: { color: COLORS.textGray, fontSize: 12, textAlign: 'center' },
  divider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },

  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 30, paddingVertical: 16, backgroundColor: 'rgba(255, 68, 68, 0.1)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 68, 68, 0.3)' },
  logoutText: { color: '#FF4444', fontSize: 16, fontWeight: '600' },
});