import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../src/lib/supabase';

const COLORS = {
  background: '#121214',
  primary: '#5EFC44',
  secondary: '#50E3C2',
  cardBg: '#1a1a1e',
  textLight: '#FFFFFF',
  textGray: '#888888',
  border: '#2A2A30'
};

export default function RankingScreen() {
  const [activeTab, setActiveTab] = useState('global'); // 'global' | 'escolas' | 'cursos'
  const [loading, setLoading] = useState(true);
  const [rankingData, setRankingData] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    carregarDadosRanking();
  }, [activeTab]);

  async function carregarDadosRanking() {
    setLoading(true);
    
    // Obter ID do utilizador logado
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    let query: any;

    if (activeTab === 'global') {
      // Puxa utilizadores ordenados por nivel e depois por XP
      query = supabase
        .from('utilizadores')
        .select('id, nome, xp_total, nivel')
        .order('nivel', { ascending: false })
        .order('xp_total', { ascending: false });
    } else if (activeTab === 'escolas') {
      // Puxa a View de Escolas que criámos no SQL
      query = supabase
        .from('ranking_escolas')
        .select('escola_id, escola_nome, escola_sigla, xp_total');
    } else if (activeTab === 'cursos') {
      // Puxa a View de Cursos que criámos no SQL
      query = supabase
        .from('ranking_cursos')
        .select('curso_id, curso_nome, escola_sigla, xp_total');
    }

    const { data, error } = await query;
    if (data) {
      setRankingData(data);
    } else {
      setRankingData([]);
    }
    
    setLoading(false);
  }

  // Funções Auxiliares de Tratamento de Texto
  function getNomeExibicao(item: any) {
    if (activeTab === 'global') return item.nome;
    if (activeTab === 'escolas') return `${item.escola_nome} (${item.escola_sigla})`;
    if (activeTab === 'cursos') return `${item.curso_nome} - ${item.escola_sigla}`;
    return '';
  }

  function getNomePodium(item: any) {
    if (activeTab === 'global') return item.nome ? item.nome.split(' ')[0] : 'Jogador';
    if (activeTab === 'escolas') return item.escola_sigla;
    if (activeTab === 'cursos') return item.curso_nome;
    return '';
  }

  function getInicial(item: any) {
    const nome = getNomePodium(item);
    return nome ? nome.charAt(0).toUpperCase() : '?';
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const itemOuro = rankingData.length > 0 ? rankingData[0] : null;
  const itemPrata = rankingData.length > 1 ? rankingData[1] : null;
  const itemBronze = rankingData.length > 2 ? rankingData[2] : null;
  const restoLista = rankingData.slice(3);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topNavbar}>
        <Text style={[styles.logoText, styles.glowText]}>GREEN LEAGUE</Text>
        <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="bell-outline" size={26} color={COLORS.textGray} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.pageTitle}>Ranking</Text>

        {/* Abas Interativas ligadas à BD */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'global' && styles.tabActive]} onPress={() => setActiveTab('global')}>
            <Text style={[styles.tabText, activeTab === 'global' && styles.tabTextActive]}>Global</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'escolas' && styles.tabActive]} onPress={() => setActiveTab('escolas')}>
            <Text style={[styles.tabText, activeTab === 'escolas' && styles.tabTextActive]}>Escolas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'cursos' && styles.tabActive]} onPress={() => setActiveTab('cursos')}>
            <Text style={[styles.tabText, activeTab === 'cursos' && styles.tabTextActive]}>Cursos</Text>
          </TouchableOpacity>
        </View>

        {rankingData.length === 0 ? (
          <Text style={{ color: COLORS.textGray, textAlign: 'center', marginTop: 50 }}>Nenhuns dados registados para este ranking.</Text>
        ) : (
          <>
            {/* PÓDIO DINÂMICO */}
            <View style={styles.podiumContainer}>
              {itemPrata && (
                <View style={[styles.podiumItem, { marginTop: 40 }]}>
                  <LinearGradient colors={['#8bb0ff', '#5c8aff']} style={styles.podiumAvatar}>
                    <Text style={styles.podiumAvatarText}>{getInicial(itemPrata)}</Text>
                  </LinearGradient>
                  <View style={[styles.pillar, { borderColor: '#5c8aff', height: 90 }]}>
                    <Text style={styles.medalEmoji}>🥈</Text>
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>{getNomePodium(itemPrata)}</Text>
                  <Text style={[styles.podiumXp, { color: '#8bb0ff' }]}>{itemPrata.xp_total} XP</Text>
                </View>
              )}

              {itemOuro && (
                <View style={[styles.podiumItem, { marginTop: 0 }]}>
                  <LinearGradient colors={['#8ef6b5', '#5EFC44']} style={[styles.podiumAvatar, styles.podiumAvatarCenter]}>
                    <Text style={styles.podiumAvatarText}>{getInicial(itemOuro)}</Text>
                  </LinearGradient>
                  <View style={[styles.pillar, { borderColor: COLORS.primary, height: 110 }]}>
                    <Text style={[styles.medalEmoji, { fontSize: 32 }]}>🥇</Text>
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>{getNomePodium(itemOuro)}</Text>
                  <Text style={[styles.podiumXp, { color: COLORS.primary }]}>{itemOuro.xp_total} XP</Text>
                </View>
              )}

              {itemBronze && (
                <View style={[styles.podiumItem, { marginTop: 60 }]}>
                  <LinearGradient colors={['#d88bff', '#b05cff']} style={styles.podiumAvatar}>
                    <Text style={styles.podiumAvatarText}>{getInicial(itemBronze)}</Text>
                  </LinearGradient>
                  <View style={[styles.pillar, { borderColor: '#b05cff', height: 70 }]}>
                    <Text style={styles.medalEmoji}>🥉</Text>
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>{getNomePodium(itemBronze)}</Text>
                  <Text style={[styles.podiumXp, { color: '#d88bff' }]}>{itemBronze.xp_total} XP</Text>
                </View>
              )}
            </View>

            {/* RESTO DA LISTA FLUIDA */}
            <View style={styles.listContainer}>
              {restoLista.map((item, index) => {
                const position = index + 4;
                const isMe = activeTab === 'global' && item.id === currentUserId;
                
                return (
                  <View key={index} style={[styles.listItem, isMe && styles.listHighlight]}>
                    <Text style={styles.listRankNumber}>#{position}</Text>
                    <LinearGradient colors={['#50E3C2', '#0d9488']} style={styles.listAvatar}>
                      <Text style={styles.listAvatarText}>{getInicial(item)}</Text>
                    </LinearGradient>
                    <View style={styles.listInfo}>
                      <View style={styles.listNameRow}>
                        <Text style={styles.listName} numberOfLines={1}>{getNomeExibicao(item)}</Text>
                        {isMe && (
                          <View style={styles.badgeEu}>
                            <Text style={styles.badgeEuText}>Eu</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.listXp}>
                        {activeTab === 'global' ? `Nível ${item.nivel} • ` : ''}{item.xp_total} XP acumulados
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 120 },
  topNavbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  logoText: { fontSize: 22, fontWeight: '900', color: COLORS.primary, letterSpacing: 0.5, fontStyle: 'italic' },
  glowText: { textShadowColor: COLORS.primary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  notificationBtn: { position: 'relative', padding: 5 },
  notificationDot: { position: 'absolute', top: 5, right: 5, width: 10, height: 10, backgroundColor: COLORS.secondary, borderRadius: 5, borderWidth: 2, borderColor: COLORS.background },
  pageTitle: { color: COLORS.primary, fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#1E1E24', borderRadius: 30, padding: 4, marginHorizontal: 20, marginBottom: 40 },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 26 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textGray, fontSize: 14, fontWeight: 'bold' },
  tabTextActive: { color: '#000000' },
  podiumContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', paddingHorizontal: 10, marginBottom: 40, gap: 10 },
  podiumItem: { alignItems: 'center', flex: 1 },
  podiumAvatar: { width: 65, height: 65, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  podiumAvatarCenter: { width: 80, height: 80, borderRadius: 24 },
  podiumAvatarText: { fontSize: 24, fontWeight: '900', color: '#000' },
  pillar: { width: 55, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 2, borderBottomWidth: 0, marginTop: 10, alignItems: 'center', paddingTop: 8, backgroundColor: 'rgba(255,255,255,0.02)' },
  medalEmoji: { fontSize: 22 },
  podiumName: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginTop: 10, textAlign: 'center', width: '100%' },
  podiumXp: { fontSize: 11, fontWeight: 'bold', marginTop: 2 },
  listContainer: { paddingHorizontal: 20 },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 15, marginBottom: 12 },
  listHighlight: { borderWidth: 1, borderColor: COLORS.primary, backgroundColor: 'rgba(94, 252, 68, 0.05)' },
  listRankNumber: { color: '#666', fontSize: 16, fontWeight: '900', width: 35 },
  listAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  listAvatarText: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  listInfo: { flex: 1 },
  listNameRow: { flexDirection: 'row', alignItems: 'center' },
  listName: { color: '#FFF', fontSize: 15, fontWeight: 'bold', flex: 1 },
  badgeEu: { backgroundColor: 'rgba(94, 252, 68, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  badgeEuText: { color: COLORS.primary, fontSize: 10, fontWeight: 'bold' },
  listXp: { color: COLORS.textGray, fontSize: 12, marginTop: 2 }
});