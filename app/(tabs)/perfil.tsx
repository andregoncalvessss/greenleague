import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Share } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useToast } from '../../components/ToastProvider';
import { useTheme } from '../../components/ThemeProvider';

export default function ProfileScreen() {
  const router = useRouter();
  const { showConfirm } = useToast();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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

      const { data: profile } = await supabase
        .from('utilizadores')
        .select('*, escolas(nome), cursos(nome)')
        .eq('id', user.id)
        .single();

      const myXp = profile?.xp_total || 0;
      const { count: rankCount } = await supabase
        .from('utilizadores')
        .select('id', { count: 'exact', head: true })
        .gt('xp_total', myXp);
      const rank = (rankCount || 0) + 1;

      const { data: acoes } = await supabase
        .from('submissoes_acao')
        .select('criado_em')
        .eq('utilizador_id', user.id)
        .eq('estado', 'aprovado');

      const acoesCompletadas = acoes?.length || 0;
      const diasAtivosSet = new Set();
      acoes?.forEach(a => {
        if (a.criado_em) {
          const data = new Date(a.criado_em).toISOString().split('T')[0];
          diasAtivosSet.add(data);
        }
      });

      setUserData({ ...profile, rank, acoesCompletadas, diasAtivos: diasAtivosSet.size });
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `Estou a jogar o IPVC Green League! Já tenho ${userData?.xp_total || 0} XP e sou o #${userData?.rank || '?'} no ranking. Junta-te a mim! 🌱`,
        title: 'IPVC Green League',
      });
    } catch (_) {}
  }

  if (loading && !userData) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  const nivel = userData?.nivel || 1;
  const xpAtual = userData?.xp_total || 0;
  const xpObjetivo = nivel * 1000;
  const progressoPercentagem = Math.min((xpAtual / xpObjetivo) * 100, 100);

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* BOTÕES HEADER */}
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.iconCircle} onPress={handleShare} activeOpacity={0.75}>
              <Feather name="share-2" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconCircle} onPress={() => router.push('/definicoes')} activeOpacity={0.75}>
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* CARD PRINCIPAL */}
          <View style={styles.profileCard}>
            <View style={styles.avatarRow}>
              <View style={styles.avatarBox}>
                {userData?.avatar_url ? (
                  <Image source={{ uri: userData.avatar_url }} style={styles.avatarImg} contentFit="cover" />
                ) : (
                  <LinearGradient colors={isDark ? ['#5EFC44', '#22C55E'] : [colors.primary, colors.secondary]} style={styles.avatarGrad}>
                    <Text style={styles.avatarText}>
                      {userData?.nome ? userData.nome.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </LinearGradient>
                )}
              </View>

              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>{userData?.nome || 'Jogador'}</Text>
                <Text style={styles.userCourse} numberOfLines={1}>{userData?.cursos?.nome || 'Sem Curso Definido'}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.rankBadge}>
                    <Ionicons name="trophy" size={11} color={colors.yellow} style={{ marginRight: 4 }} />
                    <Text style={styles.rankText}>#{userData?.rank || '—'}</Text>
                  </View>
                  <View style={styles.streakBadge}>
                    <Text style={styles.streakText}>{userData?.diasAtivos || 0} dias 🔥</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* BARRA XP — igual à Home */}
            <View style={styles.xpRow}>
              <Text style={styles.levelText}>Nível {nivel}</Text>
              <Text style={styles.xpText}>{xpAtual} / {xpObjetivo} XP</Text>
            </View>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={isDark ? ['#5EFC44', '#50E3C2'] : [colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${progressoPercentagem}%` }]}
              />
            </View>
            <Text style={styles.totalXp}>Total de {xpAtual} XP acumulados · {userData?.escolas?.nome || 'Sem escola'}</Text>
          </View>

          {/* IMPACTO AMBIENTAL */}
          <Text style={styles.sectionTitle}>Impacto Ambiental</Text>
          <View style={styles.impactRow}>
            <View style={styles.impactCard}>
              <View style={[styles.impactIconBox, { backgroundColor: colors.primary + '18' }]}>
                <MaterialCommunityIcons name="leaf" size={24} color={colors.primary} />
              </View>
              <Text style={styles.impactLabel}>CO₂ Poupado</Text>
              <Text style={[styles.impactValue, { color: colors.primary }]}>
                {userData?.co2_poupado ? parseFloat(userData.co2_poupado).toFixed(1) : '0.0'} kg
              </Text>
            </View>

            <View style={styles.impactCard}>
              <View style={[styles.impactIconBox, { backgroundColor: colors.secondary + '18' }]}>
                <Ionicons name="water" size={24} color={colors.secondary} />
              </View>
              <Text style={styles.impactLabel}>Água Poupada</Text>
              <Text style={[styles.impactValue, { color: colors.secondary }]}>
                {userData?.agua_poupada ? parseFloat(userData.agua_poupada).toFixed(1) : '0.0'} L
              </Text>
            </View>
          </View>

          {/* ESTATÍSTICAS */}
          <Text style={styles.sectionTitle}>Estatísticas</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{userData?.acoesCompletadas || 0}</Text>
              <Text style={styles.statLabel}>Ações Completadas</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.secondary }]}>{userData?.diasAtivos || 0}</Text>
              <Text style={styles.statLabel}>Dias Ativos</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.yellow }]}>#{userData?.rank || '—'}</Text>
              <Text style={styles.statLabel}>Ranking Global</Text>
            </View>
          </View>

          {/* SAIR */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={async () => {
              const ok = await showConfirm({
                title: 'Sair da Conta',
                message: 'Tens a certeza que queres sair?',
                confirmText: 'Sair',
                destructive: true,
              });
              if (ok) {
                await supabase.auth.signOut();
                router.replace('/');
              }
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.red} />
            <Text style={styles.logoutText}>Sair da Conta</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    scrollContent: { padding: 20, paddingBottom: 120 },

    // BOTÕES HEADER
    headerButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginBottom: 20 },
    iconCircle: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: c.card,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: c.border,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
    },

    // CARD DO PERFIL
    profileCard: {
      backgroundColor: c.card, borderRadius: 24, padding: 20,
      borderWidth: 1, borderColor: c.border,
      marginBottom: 28,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 5,
    },
    avatarRow: { flexDirection: 'row', gap: 18, marginBottom: 20 },
    avatarBox: { width: 96, height: 96, borderRadius: 20, overflow: 'hidden' },
    avatarGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: { fontSize: 44, fontWeight: '900', color: '#000' },
    userInfo: { flex: 1, justifyContent: 'center', gap: 4 },
    userName: { color: c.text, fontSize: 22, fontWeight: '900' },
    userCourse: { color: c.textMuted, fontSize: 13 },
    badgeRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
    rankBadge: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.yellow + '1A', paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 8, borderWidth: 1, borderColor: c.yellow + '44',
    },
    rankText: { color: c.yellow, fontWeight: '800', fontSize: 12 },
    streakBadge: {
      backgroundColor: c.secondary + '1A', paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 8, borderWidth: 1, borderColor: c.secondary + '44',
    },
    streakText: { color: c.secondary, fontWeight: '700', fontSize: 12 },

    // BARRA XP
    xpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    levelText: { color: c.textMuted, fontSize: 14, fontWeight: '600' },
    xpText: { color: c.primary, fontWeight: '700', fontSize: 14 },
    progressBarBg: { height: 10, backgroundColor: c.border, borderRadius: 5, overflow: 'hidden', marginBottom: 10 },
    progressBarFill: { height: '100%', borderRadius: 5 },
    totalXp: { color: c.textMuted, fontSize: 11, textAlign: 'center' },

    // SECÇÕES
    sectionTitle: { color: c.text, fontSize: 18, fontWeight: '900', marginBottom: 14 },

    // IMPACTO
    impactRow: { flexDirection: 'row', gap: 14, marginBottom: 28 },
    impactCard: {
      flex: 1, backgroundColor: c.card, borderRadius: 20, padding: 16,
      borderWidth: 1, borderColor: c.border, gap: 8,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    impactIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    impactLabel: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
    impactValue: { fontSize: 22, fontWeight: '900' },

    // STATS
    statsContainer: {
      backgroundColor: c.card, borderRadius: 20, padding: 20,
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderColor: c.border, marginBottom: 30,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    statBox: { flex: 1, alignItems: 'center', gap: 4 },
    statValue: { fontSize: 28, fontWeight: '900' },
    statLabel: { color: c.textMuted, fontSize: 11, textAlign: 'center', fontWeight: '600' },
    divider: { width: 1, height: 44, backgroundColor: c.border, marginHorizontal: 4 },

    // LOGOUT
    logoutButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      paddingVertical: 15, backgroundColor: c.red + '12',
      borderRadius: 16, borderWidth: 1, borderColor: c.red + '33',
    },
    logoutText: { color: c.red, fontSize: 15, fontWeight: '700' },
  });
}
