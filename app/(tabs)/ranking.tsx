import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Image, FlatList, RefreshControl } from 'react-native';
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

const PAGE_SIZE = 20;

type Tab = 'global' | 'escola' | 'curso';

interface Escola { id: number; nome: string; sigla: string; }
interface Curso { id: number; nome: string; escola_id: number; }
interface Jogador { id: string; nome: string | null; xp_total: number | null; nivel: number | null; avatar_url: string | null; }
interface Me { id: string; nome: string | null; escola_id: number | null; curso_id: number | null; xp_total: number | null; nivel: number | null; avatar_url: string | null; }

function inicial(nome?: string | null): string {
  return nome ? nome.trim().charAt(0).toUpperCase() : '?';
}
function primeiroNome(nome?: string | null): string {
  return nome ? nome.split(' ')[0] : 'Jogador';
}

function RankAvatar({ uri, ini, colors, size, radius, fontSize }: {
  uri: string | null; ini: string; colors: string[]; size: number; radius: number; fontSize: number;
}) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius, backgroundColor: COLORS.cardBg }} />;
  }
  return (
    <LinearGradient colors={colors as [string, string, ...string[]]} style={{ width: size, height: size, borderRadius: radius, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize, fontWeight: '900', color: '#000' }}>{ini}</Text>
    </LinearGradient>
  );
}

export default function RankingScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('global');
  const [bootstrapping, setBootstrapping] = useState(true);

  const [me, setMe] = useState<Me | null>(null);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [selectedEscolaId, setSelectedEscolaId] = useState<number | null>(null);
  const [selectedCursoId, setSelectedCursoId] = useState<number | null>(null);

  const [rankingData, setRankingData] = useState<Jogador[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingFirst, setLoadingFirst] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [minhaPosicao, setMinhaPosicao] = useState<number | null>(null);

  const aPedirRef = useRef(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      let perfil: Me | null = null;
      if (user) {
        const { data } = await supabase
          .from('utilizadores')
          .select('id, nome, escola_id, curso_id, xp_total, nivel, avatar_url')
          .eq('id', user.id)
          .single();
        perfil = (data as Me) ?? { id: user.id, nome: null, escola_id: null, curso_id: null, xp_total: 0, nivel: 1, avatar_url: null };
        setMe(perfil);
      }
      const { data: escolasData } = await supabase.from('escolas').select('id, nome, sigla').order('nome');
      const lista = (escolasData ?? []) as Escola[];
      setEscolas(lista);
      setSelectedEscolaId(perfil?.escola_id ?? lista[0]?.id ?? null);
      setBootstrapping(false);
    })();
  }, []);

  useEffect(() => {
    if (selectedEscolaId == null) { setCursos([]); setSelectedCursoId(null); return; }
    (async () => {
      const { data } = await supabase
        .from('cursos')
        .select('id, nome, escola_id')
        .eq('escola_id', selectedEscolaId)
        .order('nome');
      const lista = (data ?? []) as Curso[];
      setCursos(lista);
      const cursoDoUser = me?.curso_id && lista.some((c) => c.id === me.curso_id) ? me.curso_id : null;
      setSelectedCursoId(cursoDoUser ?? lista[0]?.id ?? null);
    })();
  }, [selectedEscolaId, me?.curso_id]);

  function aplicarFiltros(q: any) {
    if (activeTab === 'escola') q = q.eq('escola_id', selectedEscolaId);
    else if (activeTab === 'curso') q = q.eq('curso_id', selectedCursoId);
    return q
      .order('nivel', { ascending: false })
      .order('xp_total', { ascending: false })
      .order('id', { ascending: true }); 
  }

  const calcularMinhaPosicao = useCallback(async (): Promise<number | null> => {
    if (!me) return null;
    if (activeTab === 'escola' && selectedEscolaId !== me.escola_id) return null;
    if (activeTab === 'curso' && selectedCursoId !== me.curso_id) return null;

    const myNivel = me.nivel ?? 1;
    const myXp = me.xp_total ?? 0;

    let q: any = supabase.from('utilizadores').select('id', { count: 'exact', head: true });
    if (activeTab === 'escola') q = q.eq('escola_id', selectedEscolaId);
    else if (activeTab === 'curso') q = q.eq('curso_id', selectedCursoId);
    
    q = q.or(`nivel.gt.${myNivel},and(nivel.eq.${myNivel},xp_total.gt.${myXp})`);

    const { count } = await q;
    return (count ?? 0) + 1;
  }, [me, activeTab, selectedEscolaId, selectedCursoId]);

  const carregarInicial = useCallback(async () => {
    if (bootstrapping) return;
    if (activeTab === 'escola' && selectedEscolaId == null) { setRankingData([]); setMinhaPosicao(null); return; }
    if (activeTab === 'curso' && selectedCursoId == null) { setRankingData([]); setMinhaPosicao(null); return; }

    if (aPedirRef.current) return;
    aPedirRef.current = true;
    setLoadingFirst(true);
    try {
      const { data } = await aplicarFiltros(
        supabase.from('utilizadores').select('id, nome, xp_total, nivel, avatar_url')
      ).range(0, PAGE_SIZE - 1);
      const lista = (data ?? []) as Jogador[];
      
      const idsUnicos = new Set();
      const listaLimpa = lista.filter(item => {
        if (idsUnicos.has(item.id)) return false;
        idsUnicos.add(item.id);
        return true;
      });

      setRankingData(listaLimpa);
      setPage(0);
      setHasMore(listaLimpa.length === PAGE_SIZE);
      setMinhaPosicao(await calcularMinhaPosicao());
    } finally {
      setLoadingFirst(false);
      aPedirRef.current = false;
    }
  }, [activeTab, selectedEscolaId, selectedCursoId, bootstrapping, calcularMinhaPosicao]);

  const carregarMais = useCallback(async () => {
    if (aPedirRef.current || loadingFirst || !hasMore) return;
    aPedirRef.current = true;
    setLoadingMore(true);
    try {
      const proxima = page + 1;
      const de = proxima * PAGE_SIZE;
      const ate = de + PAGE_SIZE - 1;
      const { data } = await aplicarFiltros(
        supabase.from('utilizadores').select('id, nome, xp_total, nivel, avatar_url')
      ).range(de, ate);
      const novos = (data ?? []) as Jogador[];
      
      setRankingData((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...novos.filter((n) => !ids.has(n.id))];
      });
      setPage(proxima);
      setHasMore(novos.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
      aPedirRef.current = false;
    }
  }, [page, hasMore, loadingFirst, activeTab, selectedEscolaId, selectedCursoId]);

  useEffect(() => {
    carregarInicial();
  }, [carregarInicial]);

  const atualizar = useCallback(async () => {
    setRefreshing(true);
    await carregarInicial();
    setRefreshing(false);
  }, [carregarInicial]);

  function isMe(item: Jogador): boolean {
    return !!me && item.id === me.id;
  }

  const renderItem = useCallback(({ item, index }: { item: Jogador; index: number }) => {
    const eu = isMe(item);
    return (
      <View style={[styles.listItem, eu && styles.listHighlight]}>
        <Text style={styles.listRankNumber}>#{index + 1}</Text>
        <RankAvatar uri={item.avatar_url} ini={inicial(item.nome)} colors={['#50E3C2', '#0d9488']} size={40} radius={20} fontSize={16} />
        <View style={styles.listInfo}>
          <View style={styles.listNameRow}>
            <Text style={styles.listName} numberOfLines={1}>{item.nome}</Text>
            {eu && <View style={styles.badgeEu}><Text style={styles.badgeEuText}>Eu</Text></View>}
          </View>
          <Text style={styles.listXp}>Nível {item.nivel ?? 1} • {item.xp_total ?? 0} XP</Text>
        </View>
      </View>
    );
  }, [me]);

  if (bootstrapping) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const pertenceAoFiltroAtual = 
    activeTab === 'global' || 
    (activeTab === 'escola' && me?.escola_id === selectedEscolaId) ||
    (activeTab === 'curso' && me?.curso_id === selectedCursoId);

  const euJaNaLista = me ? rankingData.some((jogador) => jogador.id === me.id) : false;
  const showMeCard = pertenceAoFiltroAtual && minhaPosicao != null && !euJaNaLista;

  const ListHeader = showMeCard && me ? (
    <View style={styles.meCard}>
      <Text style={styles.meRank}>#{minhaPosicao}</Text>
      <RankAvatar uri={me.avatar_url} ini={inicial(me.nome)} colors={['#8ef6b5', '#5EFC44']} size={40} radius={20} fontSize={16} />
      <View style={styles.meInfo}>
        <View style={styles.listNameRow}>
          <Text style={styles.meName} numberOfLines={1}>{primeiroNome(me.nome)}</Text>
          <View style={styles.badgeEu}><Text style={styles.badgeEuText}>Eu</Text></View>
        </View>
        <Text style={styles.listXp}>Nível {me.nivel ?? 1} • {me.xp_total ?? 0} XP</Text>
      </View>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topNavbar}>
        <Text style={[styles.logoText, styles.glowText]}>GREEN LEAGUE</Text>
        <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="bell-outline" size={26} color={COLORS.textGray} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <Text style={styles.pageTitle}>Ranking</Text>

      {/* Abas */}
      <View style={styles.tabsContainer}>
        {(['global', 'escola', 'curso'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tabButton, activeTab === t && styles.tabActive]} onPress={() => setActiveTab(t)}>
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'global' ? 'Global' : t === 'escola' ? 'Escola' : 'Curso'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Seletor de Escola */}
      {(activeTab === 'escola' || activeTab === 'curso') && (
        <View style={styles.filterWrapper}>
          <Text style={styles.selectorLabel}>Escolhe a escola</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.scrollFiltros} 
            contentContainerStyle={styles.chipsRow}
          >
            {escolas.map((e) => {
              const ativo = e.id === selectedEscolaId;
              return (
                <TouchableOpacity key={e.id} style={[styles.chip, ativo && styles.chipActive]} onPress={() => setSelectedEscolaId(e.id)}>
                  <Text style={[styles.chipText, ativo && styles.chipTextActive]}>{e.sigla}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Seletor de Curso */}
      {activeTab === 'curso' && (
        <View style={styles.filterWrapper}>
          <Text style={styles.selectorLabel}>Escolhe o curso</Text>
          {cursos.length === 0 ? (
            <Text style={styles.infoText}>Esta escola ainda não tem cursos registados.</Text>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.scrollFiltros}
              contentContainerStyle={styles.chipsRow}
            >
              {cursos.map((c) => {
                const ativo = c.id === selectedCursoId;
                return (
                  <TouchableOpacity key={c.id} style={[styles.chip, ativo && styles.chipActive]} onPress={() => setSelectedCursoId(c.id)}>
                    <Text style={[styles.chipText, ativo && styles.chipTextActive]} numberOfLines={1}>{c.nome}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* Lista paginada */}
      <FlatList
        style={{ flex: 1 }}
        data={rankingData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onEndReached={carregarMais}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={atualizar} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          loadingFirst ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : (
            <Text style={styles.emptyText}>Nenhuns dados registados para este ranking.</Text>
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} /> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  topNavbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  logoText: { fontSize: 22, fontWeight: '900', color: COLORS.primary, letterSpacing: 0.5, fontStyle: 'italic' },
  glowText: { textShadowColor: COLORS.primary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  notificationBtn: { position: 'relative', padding: 5 },
  notificationDot: { position: 'absolute', top: 5, right: 5, width: 10, height: 10, backgroundColor: COLORS.secondary, borderRadius: 5, borderWidth: 2, borderColor: COLORS.background },
  
  pageTitle: { color: COLORS.primary, fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },

  tabsContainer: { flexDirection: 'row', backgroundColor: '#1E1E24', borderRadius: 30, padding: 4, marginHorizontal: 20, marginBottom: 12 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 26 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textGray, fontSize: 13, fontWeight: 'bold' },
  tabTextActive: { color: '#000000' },

  filterWrapper: { marginBottom: 12 }, // Um bocadinho mais de folga após o filtro
  selectorLabel: { color: COLORS.textGray, fontSize: 13, fontWeight: '600', marginLeft: 20, marginBottom: 6 }, // Label ligeiramente maior
  
  // AUMENTADO: minHeight e maxHeight passaram de 32 para 40
  scrollFiltros: { flexGrow: 0, minHeight: 40, maxHeight: 40 }, 
  chipsRow: { paddingHorizontal: 20, gap: 10 }, 
  
  chip: { 
    backgroundColor: COLORS.cardBg, 
    paddingHorizontal: 16, 
    height: 36, // AUMENTADO: de 30 para 36
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 18, 
    borderWidth: 1, 
    borderColor: COLORS.border 
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textGray, fontWeight: 'bold', fontSize: 13 }, // AUMENTADO: de 12 para 13
  chipTextActive: { color: '#000' },
  
  infoText: { color: COLORS.textGray, marginLeft: 20, fontSize: 13 },
  emptyText: { color: COLORS.textGray, textAlign: 'center', marginTop: 30 },

  meCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(94, 252, 68, 0.06)', borderWidth: 1, borderColor: COLORS.primary, borderRadius: 16, padding: 12, marginBottom: 10 },
  meRank: { color: COLORS.primary, fontSize: 15, fontWeight: '900', width: 38 },
  meInfo: { flex: 1, marginLeft: 10 },
  meName: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },

  listContainer: { paddingHorizontal: 20, paddingBottom: 120 },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 12, marginBottom: 8 },
  listHighlight: { borderWidth: 1, borderColor: COLORS.primary, backgroundColor: 'rgba(94, 252, 68, 0.05)' },
  listRankNumber: { color: '#666', fontSize: 15, fontWeight: '900', width: 38 },
  listInfo: { flex: 1, marginLeft: 10 },
  listNameRow: { flexDirection: 'row', alignItems: 'center' },
  listName: { color: '#FFF', fontSize: 14, fontWeight: 'bold', flex: 1 },
  badgeEu: { backgroundColor: 'rgba(94, 252, 68, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  badgeEuText: { color: COLORS.primary, fontSize: 9, fontWeight: 'bold' },
  listXp: { color: COLORS.textGray, fontSize: 11, marginTop: 2 }
});