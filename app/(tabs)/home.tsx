import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';

const COLORS = { 
  background: '#121214', 
  primary: '#5EFC44', 
  secondary: '#50E3C2', 
  cardBg: '#1E1E24', 
  textLight: '#FFFFFF', 
  textGray: '#888888',
  border: '#2A2A30'
};

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('João');
  const [nivel, setNivel] = useState(12);
  const [xp, setXp] = useState(2450);

  useEffect(() => {
    checkUserSession();
  }, []);

  async function checkUserSession() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.replace('/'); 
      return;
    }

    const { data: profile } = await supabase
      .from('utilizadores')
      .select('nome, nivel, xp_total')
      .eq('id', user.id)
      .single();

    if (profile) {
      const primeiroNome = profile.nome ? profile.nome.split(' ')[0] : 'Atleta';
      setUserName(primeiroNome);
      setNivel(profile.nivel || 12);
      setXp(profile.xp_total || 2450);
    }

    setLoading(false);
  }

  const xpMaximo = 3000;
  const xpProgresso = (xp / xpMaximo) * 100;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.topNavbar}>
        <Text style={[styles.logoText, styles.glowText]}>GREEN LEAGUE</Text>
        <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="bell-outline" size={26} color={COLORS.textGray} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <View style={styles.profileSection}>
          <View>
            <Text style={styles.greetingText}>Olá, {userName}!</Text>
            <View style={styles.streakContainer}>
              <Text style={styles.streakText}>Streak de 7 dias </Text>
              <Text style={styles.fireEmoji}>🔥</Text>
            </View>
          </View>
          
          <LinearGradient colors={['#8ef6b5', '#50E3C2']} style={styles.avatarBox}>
            <Text style={styles.avatarLetter}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.xpSection}>
          <View style={styles.xpHeader}>
            <Text style={styles.levelText}>Level {nivel}</Text>
            <Text style={styles.xpNumbers}>{xp} / {xpMaximo} XP</Text>
          </View>
          <View style={styles.progressBarBg}>
            <LinearGradient 
              colors={['#5EFC44', '#50E3C2']} 
              start={{x: 0, y: 0}} 
              end={{x: 1, y: 0}} 
              style={[styles.progressBarFill, { width: `${xpProgresso}%` }]} 
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.actionSquare}>
            <MaterialCommunityIcons name="recycle" size={32} color={COLORS.primary} />
            <Text style={styles.actionText}>Reciclar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionSquare}>
            <MaterialCommunityIcons name="bike" size={32} color={COLORS.secondary} />
            <Text style={styles.actionText}>Bike</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionSquare}>
            <MaterialCommunityIcons name="bus" size={32} color="#b05cff" />
            <Text style={styles.actionText}>Transporte</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionSquare}>
            <Ionicons name="water-outline" size={32} color={COLORS.primary} />
            <Text style={styles.actionText}>Água</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Missões do Dia</Text>
        
        <View style={styles.missionCard}>
          <View style={styles.missionIconBox}>
            <MaterialCommunityIcons name="recycle" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.missionContent}>
            <Text style={styles.missionTitle}>Reciclar 2kg de materiais</Text>
            <Text style={styles.missionDesc}>Contribui para a redução de resíduos</Text>
            <View style={styles.missionBarBg}>
              <View style={[styles.missionBarFill, { width: '55%' }]} />
            </View>
            <Text style={styles.missionReward}>+150 XP</Text>
          </View>
        </View>

        <View style={styles.missionCard}>
          <View style={styles.missionIconBoxBlue}>
            <MaterialCommunityIcons name="bus" size={28} color={COLORS.secondary} />
          </View>
          <View style={styles.missionContent}>
            <Text style={styles.missionTitle}>Utilizar transportes públicos</Text>
            <Text style={styles.missionDesc}>Reduz a pegada de carbono</Text>
            <Text style={styles.missionReward}>+100 XP</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Atividade da Comunidade</Text>
        <View style={[styles.missionCard, { opacity: 0.5 }]}>
           <View style={[styles.missionIconBox, { backgroundColor: '#333', borderColor: '#444' }]}>
             <Text style={{ color: '#FFF', fontWeight: 'bold' }}>M</Text>
           </View>
           <View style={styles.missionContent}>
             <Text style={styles.missionTitle}>Maria Costa</Text>
             <Text style={styles.missionDesc}>Completou uma viagem de bicicleta</Text>
           </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 130 },
  
  topNavbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  logoText: { fontSize: 22, fontWeight: '900', color: COLORS.primary, letterSpacing: 0.5, fontStyle: 'italic' },
  glowText: { textShadowColor: COLORS.primary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  notificationBtn: { position: 'relative', padding: 5 },
  notificationDot: { position: 'absolute', top: 5, right: 5, width: 10, height: 10, backgroundColor: COLORS.secondary, borderRadius: 5, borderWidth: 2, borderColor: COLORS.background },

  profileSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, marginTop: 15 },
  greetingText: { color: COLORS.textLight, fontSize: 28, fontWeight: 'bold' },
  streakContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  streakText: { color: COLORS.textGray, fontSize: 15 },
  fireEmoji: { fontSize: 15 },
  
  avatarBox: { width: 65, height: 65, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  avatarLetter: { color: '#000000', fontSize: 30, fontWeight: '900' },

  xpSection: { marginBottom: 35 },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  levelText: { color: COLORS.textGray, fontSize: 15, fontWeight: '600' },
  xpNumbers: { color: COLORS.primary, fontSize: 15, fontWeight: 'bold' },
  progressBarBg: { height: 10, backgroundColor: COLORS.cardBg, borderRadius: 5, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  progressBarFill: { height: '100%', borderRadius: 5 },

  sectionTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  
  quickActionsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 35 },
  actionSquare: { width: '23%', aspectRatio: 1, backgroundColor: COLORS.cardBg, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  actionText: { color: COLORS.textGray, fontSize: 12, fontWeight: '600', marginTop: 8 },

  missionCard: { flexDirection: 'row', backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: COLORS.border },
  missionIconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(94, 252, 68, 0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1, borderColor: 'rgba(94, 252, 68, 0.2)' },
  missionIconBoxBlue: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(80, 227, 194, 0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1, borderColor: 'rgba(80, 227, 194, 0.2)' },
  missionContent: { flex: 1, justifyContent: 'center' },
  missionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  missionDesc: { color: COLORS.textGray, fontSize: 13, marginBottom: 10 },
  missionBarBg: { height: 6, backgroundColor: '#111', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  missionBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  missionReward: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold' }
});