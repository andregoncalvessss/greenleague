import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
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
  border: '#2A2A30',
};

// ============================================================
// Tipos (correspondem às colunas do teu esquema)
// ============================================================
interface PerfilHome {
  nome: string;
  xp_total: number;
  co2_poupado: number;
  avatar_url: string | null;
}
interface CategoriaRapida {
  id: number;
  nome: string;
  cor_hex: string | null;
  icon_url: string | null;
}
interface AcaoSugerida {
  id: number;
  categoria_id: number | null;
  titulo: string;
  descricao: string | null;
  xp_base: number;
  categoria: { nome: string; cor_hex: string | null } | null;
}
interface AtividadeComunidade {
  id: string;
  foto_url: string | null;
  descricao_user: string | null;
  criado_em: string;
  utilizador: { nome: string | null; avatar_url: string | null } | null;
  acao: { titulo: string; categoria: { cor_hex: string | null } | null } | null;
}
interface DadosHome {
  perfil: PerfilHome | null;
  categorias: CategoriaRapida[];
  sugestoes: AcaoSugerida[];
  comunidade: AtividadeComunidade[];
  streak: number;
}

// ============================================================
// Helpers (tempo, nível, streak) — tudo local, sem dependências
// ============================================================

// Tempo relativo em PT-PT: "agora mesmo", "há 5 min", "ontem"...
function tempoRelativo(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  const segundos = Math.floor((Date.now() - data.getTime()) / 1000);
  if (segundos < 45) return 'agora mesmo';
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  const semanas = Math.floor(dias / 7);
  if (semanas < 5) return `há ${semanas} sem`;
  return data.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}

// XP necessário para subir DO nível n para n+1 (ajusta para afinar dificuldade).
function xpParaSubir(nivel: number): number {
  return 100 + (nivel - 1) * 50;
}

interface ProgressoNivel {
  nivel: number;
  xpNoNivel: number;
  xpDoNivel: number;
  progresso: number;
}

// Deriva o nível atual e o progresso DENTRO do nível a partir do xp_total.
function calcularProgresso(xpTotal: number): ProgressoNivel {
  let nivel = 1;
  let restante = Math.max(0, Math.floor(Number(xpTotal) || 0));
  while (restante >= xpParaSubir(nivel)) {
    restante -= xpParaSubir(nivel);
    nivel += 1;
  }
  const xpDoNivel = xpParaSubir(nivel);
  return {
    nivel,
    xpNoNivel: restante,
    xpDoNivel,
    progresso: xpDoNivel > 0 ? restante / xpDoNivel : 0,
  };
}

// Conta dias consecutivos com submissões, a partir de hoje (ou ontem).
function chaveDia(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function calcularStreak(datasISO: string[]): number {
  if (datasISO.length === 0) return 0;
  const dias = new Set(
    datasISO
      .map((iso) => new Date(iso))
      .filter((d) => !Number.isNaN(d.getTime()))
      .map(chaveDia)
  );
  const cursor = new Date();
  if (!dias.has(chaveDia(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!dias.has(chaveDia(cursor))) return 0;
  }
  let streak = 0;
  while (dias.has(chaveDia(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function isUrl(s?: string | null): boolean {
  return !!s && /^https?:\/\//i.test(s);
}
function iniciais(nome?: string | null): string {
  if (!nome) return '?';
  return nome.trim().charAt(0).toUpperCase();
}

// ============================================================
// Acesso à BD: 5 queries em paralelo
// ============================================================
async function obterDadosHome(userId: string): Promise<DadosHome> {
  const [perfilRes, categoriasRes, sugestoesRes, comunidadeRes, streakRes] =
    await Promise.all([
      supabase
        .from('utilizadores')
        .select('nome, xp_total, co2_poupado, avatar_url')
        .eq('id', userId)
        .single(),
      supabase
        .from('categorias_acao')
        .select('id, nome, cor_hex, icon_url')
        .order('id')
        .limit(4),
      supabase
        .from('catalogo_acoes')
        .select(
          'id, categoria_id, titulo, descricao, xp_base, categoria:categorias_acao!categoria_id ( nome, cor_hex )'
        )
        .eq('ativo', true)
        .not('categoria_id', 'is', null) // toda a ação sugerida tem de ter categoria
        .order('xp_base', { ascending: false })
        .limit(3),
      supabase
        .from('submissoes_acao')
        .select(
          `id, foto_url, descricao_user, criado_em,
           utilizador:utilizadores!utilizador_id ( nome, avatar_url ),
           acao:catalogo_acoes!acao_id ( titulo, categoria:categorias_acao!categoria_id ( cor_hex ) )`
        )
        .eq('estado', 'aprovado')
        .order('criado_em', { ascending: false })
        .limit(3),
      supabase
        .from('submissoes_acao')
        .select('criado_em')
        .eq('utilizador_id', userId)
        .eq('estado', 'aprovado')
        .order('criado_em', { ascending: false })
        .limit(90),
    ]);

  if (perfilRes.error) throw perfilRes.error;

  const p = perfilRes.data as {
    nome: string | null;
    xp_total: number | null;
    co2_poupado: number | null;
    avatar_url: string | null;
  } | null;

  const perfil: PerfilHome | null = p
    ? {
        nome: p.nome ?? 'Estudante',
        xp_total: Number(p.xp_total ?? 0),
        co2_poupado: Number(p.co2_poupado ?? 0),
        avatar_url: p.avatar_url,
      }
    : null;

  const datasStreak = (streakRes.data ?? []).map(
    (r: { criado_em: string }) => r.criado_em
  );

  return {
    perfil,
    categorias: (categoriasRes.data ?? []) as unknown as CategoriaRapida[],
    sugestoes: (sugestoesRes.data ?? []) as unknown as AcaoSugerida[],
    comunidade: (comunidadeRes.data ?? []) as unknown as AtividadeComunidade[],
    streak: calcularStreak(datasStreak),
  };
}

// Ícone de uma categoria: aceita URL de imagem ou nome de ícone (MaterialCommunityIcons).
function IconeCategoria({ categoria }: { categoria: CategoriaRapida }) {
  const cor = categoria.cor_hex || COLORS.primary;
  if (isUrl(categoria.icon_url)) {
    return <Image source={{ uri: categoria.icon_url! }} style={styles.actionImg} />;
  }
  const nome = (categoria.icon_url || 'leaf') as keyof typeof MaterialCommunityIcons.glyphMap;
  return <MaterialCommunityIcons name={nome} size={32} color={cor} />;
}

// ============================================================
// Ecrã
// ============================================================
export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosHome | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/');
      return;
    }
    try {
      const resultado = await obterDadosHome(user.id);
      setDados(resultado);
    } catch (e) {
      setErro('Não foi possível carregar os teus dados. Tenta novamente.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const atualizar = useCallback(async () => {
    setRefreshing(true);
    await carregar();
    setRefreshing(false);
  }, [carregar]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centro]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (erro || !dados?.perfil) {
    return (
      <View style={[styles.container, styles.centro]}>
        <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textGray} />
        <Text style={styles.erroTexto}>{erro ?? 'Perfil não encontrado.'}</Text>
        <TouchableOpacity style={styles.botao} onPress={carregar}>
          <Text style={styles.botaoTexto}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { perfil, categorias, sugestoes, comunidade, streak } = dados;
  const primeiroNome = perfil.nome.split(' ')[0];
  const prog = calcularProgresso(perfil.xp_total);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topNavbar}>
        <Text style={[styles.logoText, styles.glowText]}>GREEN LEAGUE</Text>
        <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="bell-outline" size={26} color={COLORS.textGray} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={atualizar} tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
      >
        {/* Perfil */}
        <View style={styles.profileSection}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingText}>Olá, {primeiroNome}!</Text>
            {streak > 0 ? (
              <View style={styles.streakContainer}>
                <Text style={styles.streakText}>
                  Streak de {streak} {streak === 1 ? 'dia' : 'dias'}{' '}
                </Text>
                <Text style={styles.fireEmoji}>🔥</Text>
              </View>
            ) : (
              <Text style={styles.streakText}>Regista uma ação para começar um streak</Text>
            )}
          </View>

          {perfil.avatar_url ? (
            <Image source={{ uri: perfil.avatar_url }} style={styles.avatarBox} />
          ) : (
            <LinearGradient colors={['#8ef6b5', '#50E3C2']} style={styles.avatarBox}>
              <Text style={styles.avatarLetter}>{iniciais(perfil.nome)}</Text>
            </LinearGradient>
          )}
        </View>

        {/* Nível e XP */}
        <View style={styles.xpSection}>
          <View style={styles.xpHeader}>
            <Text style={styles.levelText}>Nível {prog.nivel}</Text>
            <Text style={styles.xpNumbers}>
              {prog.xpNoNivel} / {prog.xpDoNivel} XP
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <LinearGradient
              colors={['#5EFC44', '#50E3C2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${Math.round(prog.progresso * 100)}%` }]}
            />
          </View>
          <View style={styles.co2Row}>
            <MaterialCommunityIcons name="molecule-co2" size={16} color={COLORS.secondary} />
            <Text style={styles.co2Text}>
              {perfil.co2_poupado.toLocaleString('pt-PT', { maximumFractionDigits: 1 })} kg de CO₂ poupados
            </Text>
          </View>
        </View>

        {/* Ações Rápidas */}
        {categorias.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Ações Rápidas</Text>
            <View style={styles.quickActionsGrid}>
              {categorias.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.actionSquare}
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/adicionar-acao', params: { categoria: String(cat.id) } })}
                >
                  <IconeCategoria categoria={cat} />
                  <Text style={styles.actionText} numberOfLines={1}>
                    {cat.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Ações sugeridas */}
        {sugestoes.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Ações sugeridas</Text>
            {sugestoes.map((acao) => {
              const cor = acao.categoria?.cor_hex || COLORS.primary;
              return (
                <TouchableOpacity
                  key={acao.id}
                  style={styles.missionCard}
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/adicionar-acao', params: { acao: String(acao.id) } })}
                >
                  <View style={[styles.missionIconBox, { borderColor: cor + '40', backgroundColor: cor + '0D' }]}>
                    <MaterialCommunityIcons name="leaf" size={28} color={cor} />
                  </View>
                  <View style={styles.missionContent}>
                    <Text style={styles.missionTitle}>{acao.titulo}</Text>
                    {acao.descricao ? (
                      <Text style={styles.missionDesc} numberOfLines={2}>
                        {acao.descricao}
                      </Text>
                    ) : null}
                    <Text style={styles.missionReward}>+{acao.xp_base} XP</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Atividade da Comunidade */}
        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Atividade da Comunidade</Text>
        {comunidade.length === 0 ? (
          <Text style={styles.vazioComunidade}>Ainda não há atividade. Sê o primeiro!</Text>
        ) : (
          comunidade.map((item) => {
            const cor = item.acao?.categoria?.cor_hex || COLORS.primary;
            const nome = item.utilizador?.nome ?? 'Estudante';
            return (
              <View key={item.id} style={styles.missionCard}>
                {item.utilizador?.avatar_url ? (
                  <Image source={{ uri: item.utilizador.avatar_url }} style={styles.comunidadeAvatar} />
                ) : (
                  <View style={[styles.missionIconBox, { borderColor: cor + '40', backgroundColor: cor + '0D' }]}>
                    <Text style={{ color: cor, fontWeight: 'bold' }}>{iniciais(nome)}</Text>
                  </View>
                )}
                <View style={styles.missionContent}>
                  <Text style={styles.missionTitle}>{nome}</Text>
                  <Text style={styles.missionDesc}>{item.acao?.titulo ?? 'Registou uma ação'}</Text>
                  <Text style={styles.comunidadeTempo}>{tempoRelativo(item.criado_em)}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centro: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
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
  co2Row: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  co2Text: { color: COLORS.textGray, fontSize: 13, marginLeft: 6 },

  sectionTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },

  quickActionsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 35 },
  actionSquare: { width: '23%', aspectRatio: 1, backgroundColor: COLORS.cardBg, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  actionText: { color: COLORS.textGray, fontSize: 12, fontWeight: '600', marginTop: 8 },
  actionImg: { width: 32, height: 32, resizeMode: 'contain' },

  missionCard: { flexDirection: 'row', backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: COLORS.border },
  missionIconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1 },
  missionContent: { flex: 1, justifyContent: 'center' },
  missionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  missionDesc: { color: COLORS.textGray, fontSize: 13, marginBottom: 10 },
  missionReward: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold' },

  comunidadeAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: COLORS.cardBg },
  comunidadeTempo: { color: COLORS.textGray, fontSize: 12 },
  vazioComunidade: { color: COLORS.textGray, fontSize: 14, marginBottom: 15 },

  erroTexto: { color: COLORS.textGray, fontSize: 14, textAlign: 'center', marginTop: 14, lineHeight: 20 },
  botao: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 },
  botaoTexto: { color: '#0A0A0A', fontWeight: '700', fontSize: 15 },
});