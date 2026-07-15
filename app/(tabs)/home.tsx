import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { useTheme } from '../../components/ThemeProvider';
import { useSettings } from '../../components/SettingsProvider';

// ============================================================
// Tipos
// ============================================================
interface PerfilHome {
  nome: string;
  nivel: number;
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
  comunidade: AtividadeComunidade[];
  streak: number;
}

// ============================================================
// Helpers
// ============================================================
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
// Acesso à BD
// ============================================================
async function obterDadosHome(userId: string): Promise<DadosHome> {
  const [perfilRes, categoriasRes, comunidadeRes, streakRes] =
    await Promise.all([
      supabase
        .from('utilizadores')
        // AQUI: Adicionado o 'nivel' à query
        .select('nome, nivel, xp_total, co2_poupado, avatar_url')
        .eq('id', userId)
        .single(),
      supabase
        .from('categorias_acao')
        .select('id, nome, cor_hex, icon_url')
        .order('id')
        .limit(4),
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

  const p = perfilRes.data as any;

  const perfil: PerfilHome | null = p
    ? {
        nome: p.nome ?? 'Estudante',
        nivel: Number(p.nivel ?? 1),
        xp_total: Number(p.xp_total ?? 0),
        co2_poupado: Number(p.co2_poupado ?? 0),
        avatar_url: p.avatar_url,
      }
    : null;

  const datasStreak = (streakRes.data ?? []).map((r: any) => r.criado_em);

  return {
    perfil,
    categorias: (categoriasRes.data ?? []) as any[],
    comunidade: (comunidadeRes.data ?? []) as any[],
    streak: calcularStreak(datasStreak),
  };
}

function IconeCategoria({ categoria, colors }: { categoria: CategoriaRapida; colors: ReturnType<typeof useTheme>['colors'] }) {
  const cor = categoria.cor_hex || colors.primary;
  if (isUrl(categoria.icon_url)) {
    return <Image source={{ uri: categoria.icon_url! }} style={{ width: 32, height: 32, resizeMode: 'contain' }} />;
  }
  const nome = (categoria.icon_url || 'leaf') as keyof typeof MaterialCommunityIcons.glyphMap;
  return <MaterialCommunityIcons name={nome} size={32} color={cor} />;
}

// ============================================================
// Ecrã
// ============================================================
export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { appName } = useSettings();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (erro || !dados?.perfil) {
    return (
      <View style={[styles.container, styles.centro]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
        <Text style={styles.erroTexto}>{erro ?? 'Perfil não encontrado.'}</Text>
        <TouchableOpacity style={styles.botao} onPress={carregar}>
          <Text style={styles.botaoTexto}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { perfil, categorias, comunidade, streak } = dados;
  const primeiroNome = perfil.nome.split(' ')[0];

  // AQUI: Lógica exata e simples a ler da Base de Dados
  const nivel = perfil.nivel;
  const xpAtual = perfil.xp_total;
  const xpObjetivo = nivel * 1000;
  const progressoPercentagem = Math.min((xpAtual / xpObjetivo) * 100, 100);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topNavbar}>
        <Text style={[styles.logoText, styles.glowText]}>{appName}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={atualizar} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
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
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.avatarBox}>
              <Text style={styles.avatarLetter}>{iniciais(perfil.nome)}</Text>
            </LinearGradient>
          )}
        </View>

        <View style={styles.xpSection}>
          <View style={styles.xpHeader}>
            <Text style={styles.levelText}>Nível {nivel}</Text>
            <Text style={styles.xpNumbers}>
              {xpAtual} / {xpObjetivo} XP
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${progressoPercentagem}%` }]}
            />
          </View>
          <View style={styles.co2Row}>
            <MaterialCommunityIcons name="molecule-co2" size={16} color={colors.secondary} />
            <Text style={styles.co2Text}>
              {perfil.co2_poupado.toLocaleString('pt-PT', { maximumFractionDigits: 1 })} kg de CO₂ poupados
            </Text>
          </View>
        </View>

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
                  <IconeCategoria categoria={cat} colors={colors} />
                  <Text style={styles.actionText} numberOfLines={1}>
                    {cat.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}


        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Atividade da Comunidade</Text>
        {comunidade.length === 0 ? (
          <Text style={styles.vazioComunidade}>Ainda não há atividade. Sê o primeiro!</Text>
        ) : (
          comunidade.map((item) => {
            const acaoItem = Array.isArray(item.acao) ? item.acao[0] : item.acao;
            const catItem = Array.isArray(acaoItem?.categoria) ? acaoItem.categoria[0] : acaoItem?.categoria;
            const cor = catItem?.cor_hex || colors.primary;
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
                  <Text style={styles.missionDesc}>{acaoItem?.titulo ?? 'Registou uma ação'}</Text>
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

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centro: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
    content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 130 },

    topNavbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: c.border },
    logoText: { fontSize: 22, fontWeight: '900', color: c.primary, letterSpacing: 0.5, fontStyle: 'italic' },
    glowText: { textShadowColor: c.primary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
    notificationBtn: { position: 'relative', padding: 5 },
    notificationDot: { position: 'absolute', top: 5, right: 5, width: 10, height: 10, backgroundColor: c.secondary, borderRadius: 5, borderWidth: 2, borderColor: c.surface },

    profileSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, marginTop: 15 },
    greetingText: { color: c.text, fontSize: 28, fontWeight: 'bold' },
    streakContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    streakText: { color: c.textMuted, fontSize: 15 },
    fireEmoji: { fontSize: 15 },

    avatarBox: { width: 65, height: 65, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: c.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
    avatarLetter: { color: '#000000', fontSize: 30, fontWeight: '900' },

    xpSection: { marginBottom: 35 },
    xpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    levelText: { color: c.textMuted, fontSize: 15, fontWeight: '600' },
    xpNumbers: { color: c.primary, fontSize: 15, fontWeight: 'bold' },
    progressBarBg: { height: 10, backgroundColor: c.card, borderRadius: 5, overflow: 'hidden', borderWidth: 1, borderColor: c.border },
    progressBarFill: { height: '100%', borderRadius: 5 },
    co2Row: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    co2Text: { color: c.textMuted, fontSize: 13, marginLeft: 6 },

    sectionTitle: { color: c.text, fontSize: 20, fontWeight: 'bold', marginBottom: 15 },

    quickActionsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 35 },
    actionSquare: { width: '23%', aspectRatio: 1, backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
    actionText: { color: c.textMuted, fontSize: 12, fontWeight: '600', marginTop: 8 },
    actionImg: { width: 32, height: 32, resizeMode: 'contain' },

    missionCard: { flexDirection: 'row', backgroundColor: c.card, borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: c.border },
    missionIconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1 },
    missionContent: { flex: 1, justifyContent: 'center' },
    missionTitle: { color: c.text, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    missionDesc: { color: c.textMuted, fontSize: 13, marginBottom: 10 },
    missionReward: { color: c.primary, fontSize: 14, fontWeight: 'bold' },

    comunidadeAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: c.card },
    comunidadeTempo: { color: c.textMuted, fontSize: 12 },
    vazioComunidade: { color: c.textMuted, fontSize: 14, marginBottom: 15 },

    erroTexto: { color: c.textMuted, fontSize: 14, textAlign: 'center', marginTop: 14, lineHeight: 20 },
    botao: { marginTop: 20, backgroundColor: c.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 },
    botaoTexto: { color: '#0A0A0A', fontWeight: '700', fontSize: 15 },
  });
}
