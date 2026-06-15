import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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

  useEffect(() => {
    fetchUserData();
  }, []);

  async function fetchUserData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Busca os dados reais do teu Supabase
    const { data: profile } = await supabase
      .from('utilizadores')
      .select('*, escolas(nome), cursos(nome)')
      .eq('id', user.id)
      .single();

    setUserData(profile);
    setLoading(false);
  }

  if (loading) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Fundo com Gradiente Subtil */}
      <LinearGradient colors={['#121214', '#1A1A2E', '#0D2B1D']} style={styles.backgroundGradient} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* BOTÕES DE TOPO */}
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.iconCircle}>
              <Feather name="share-2" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconCircle}>
              <Ionicons name="settings-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* CARTÃO PRINCIPAL DO PERFIL */}
          <View style={styles.profileCard}>
            <View style={styles.avatarRow}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarText}>
                  {userData?.nome ? userData.nome.charAt(0).toUpperCase() : 'J'}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{userData?.nome || 'João Silva'}</Text>
                <Text style={styles.userCourse}>{userData?.cursos?.nome || 'Engenharia Informática'}</Text>
                <View style={styles.badgeRow}>
                   <View style={styles.rankBadge}>
                     <Text style={styles.rankText}>Rank #4</Text>
                   </View>
                   <View style={styles.streakBadge}>
                     <Text style={styles.streakText}>7 dias 🔥</Text>
                   </View>
                </View>
              </View>
            </View>

            <View style={styles.xpRow}>
              <Text style={styles.levelText}>Level {userData?.nivel || 12}</Text>
              <Text style={styles.xpText}>{userData?.xp_total || 2450} / 3000 XP</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '80%' }]} />
            </View>
            <Text style={styles.totalXp}>Total: 15 450 XP</Text>
          </View>

          {/* SECÇÃO IMPACTO AMBIENTAL */}
          <Text style={styles.sectionTitle}>Impacto Ambiental</Text>
          <View style={styles.impactRow}>
            <View style={styles.impactCard}>
              <View style={styles.impactHeader}>
                <View>
                   <Text style={styles.impactLabel}>CO₂ Poupado</Text>
                   <Text style={[styles.impactValue, { color: COLORS.primary }]}>245kg</Text>
                   <Text style={styles.impactSubText}>↑ 12% esta semana</Text>
                </View>
                <MaterialCommunityIcons name="lightning-bolt" size={32} color={COLORS.primary} />
              </View>
            </View>

            <View style={styles.impactCard}>
              <View style={styles.impactHeader}>
                <View>
                   <Text style={styles.impactLabel}>Água Poupada</Text>
                   <Text style={[styles.impactValue, { color: COLORS.secondary }]}>1.250L</Text>
                   <Text style={styles.impactSubText}>↑ 8% esta semana</Text>
                </View>
                <Ionicons name="water" size={32} color={COLORS.secondary} />
              </View>
            </View>
          </View>

          {/* ESTATÍSTICAS RÁPIDAS */}
          <Text style={styles.sectionTitle}>Estatísticas</Text>
          <View style={styles.statsContainer}>
             <View style={styles.statBox}>
                <Text style={styles.statValue}>156</Text>
                <Text style={styles.statLabel}>Ações Completadas</Text>
             </View>
             <View style={styles.divider} />
             <View style={styles.statBox}>
                <Text style={styles.statValue}>45</Text>
                <Text style={styles.statLabel}>Dias Ativos</Text>
             </View>
          </View>

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
  avatarBox: { width: 100, height: 100, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 48, fontWeight: 'bold', color: '#000' },
  userInfo: { flex: 1, justifyContent: 'center' },
  userName: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  userCourse: { color: COLORS.textGray, fontSize: 16, marginBottom: 10 },
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
  impactSubText: { color: COLORS.textGray, fontSize: 10 },

  statsContainer: { backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center' },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { color: COLORS.primary, fontSize: 32, fontWeight: 'bold' },
  statLabel: { color: COLORS.textGray, fontSize: 12, textAlign: 'center' },
  divider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' }
});