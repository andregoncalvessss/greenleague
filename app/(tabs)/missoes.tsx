import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../components/ThemeProvider';

const DIAS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function MissoesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [missoes, setMissoes] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [xpDiario, setXpDiario] = useState(0);
  const [xpMeta, setXpMeta] = useState(0);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [])
  );

  async function carregar() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Dia da semana: JS 0=Dom...6=Sáb → BD 1=Seg...7=Dom
      const diaSemana = new Date().getDay() === 0 ? 7 : new Date().getDay();

      // Missões do dia configuradas pelo admin
      const { data: missoesDia } = await supabase
        .from('missoes_semanais')
        .select(`
          id, xp_bonus, ordem,
          catalogo_acoes(id, titulo, descricao, xp_base, co2_estimado, agua_estimada, unidade_medida, categorias_acao(nome, cor_hex))
        `)
        .eq('dia_semana', diaSemana)
        .eq('ativa', true)
        .order('ordem');

      if (!missoesDia || missoesDia.length === 0) {
        setMissoes([]);
        setLoading(false);
        return;
      }

      // Submissões do utilizador de HOJE para estas ações
      const hoje = new Date().toISOString().split('T')[0];
      const acaoIds = missoesDia.map((m: any) => m.catalogo_acoes?.id).filter(Boolean);

      const { data: submissoesHoje } = await supabase
        .from('submissoes_acao')
        .select('acao_id, estado, xp_atribuido')
        .eq('utilizador_id', user.id)
        .in('acao_id', acaoIds)
        .gte('criado_em', `${hoje}T00:00:00`)
        .lte('criado_em', `${hoje}T23:59:59`);

      const subMap: Record<number, { estado: string; xp: number }> = {};
      (submissoesHoje || []).forEach(s => {
        subMap[s.acao_id] = { estado: s.estado, xp: s.xp_atribuido || 0 };
      });

      const missoesCompletas = (missoesDia as any[]).map(m => {
        const acao = m.catalogo_acoes;
        const sub = subMap[acao?.id];
        const xpTotal = (acao?.xp_base || 0) + (m.xp_bonus || 0);
        return { ...m, acao, xpTotal, sub };
      });

      // Calcular XP diário (apenas aprovadas)
      const xpGanhoHoje = missoesCompletas
        .filter(m => m.sub?.estado === 'aprovado')
        .reduce((acc, m) => acc + (m.sub?.xp || 0), 0);
      const xpMetaTotal = missoesCompletas.reduce((acc, m) => acc + m.xpTotal, 0);

      setMissoes(missoesCompletas);
      setXpDiario(xpGanhoHoje);
      setXpMeta(xpMetaTotal);
    } catch (e) {
      console.error('Erro ao carregar missões:', e);
    } finally {
      setLoading(false);
    }
  }

  const hoje = new Date();
  const diaNome = DIAS_PT[hoje.getDay()];
  const completadas = missoes.filter(m => m.sub?.estado === 'aprovado').length;
  const progressoPercent = xpMeta > 0 ? Math.min((xpDiario / xpMeta) * 100, 100) : 0;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ['#121214', '#1A1A2E', '#0D2B1D'] : [colors.surface, colors.surface, '#E8F5E9']}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={{ flex: 1 }}>

        <View style={styles.topNavbar}>
          <Text style={[styles.logoText, styles.glowText]}>GREEN LEAGUE</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <Text style={styles.pageTitle}>Missões de {diaNome}</Text>
          <Text style={styles.pageSubtitle}>
            {missoes.length === 0
              ? 'Sem missões configuradas para hoje.'
              : `${completadas} de ${missoes.length} concluída${completadas !== 1 ? 's' : ''}`}
          </Text>

          {missoes.length > 0 && (
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Progresso Diário</Text>
                <Text style={styles.progressNumbers}>{xpDiario} / {xpMeta} XP</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressoPercent}%` }]} />
              </View>
              <Text style={styles.progressSub}>{Math.round(progressoPercent)}% concluído</Text>
            </View>
          )}

          {missoes.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="trophy-outline" size={64} color='rgba(94,252,68,0.2)' />
              <Text style={styles.emptyTitle}>Dia de descanso!</Text>
              <Text style={styles.emptyDesc}>Não há missões configuradas para hoje. Volta amanhã!</Text>
            </View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Missões de Hoje</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{completadas} / {missoes.length}</Text>
                </View>
              </View>

              {missoes.map((m) => {
                const estado = m.sub?.estado;
                const concluida = estado === 'aprovado';
                const pendente = estado === 'pendente';

                return (
                  <View key={m.id} style={[styles.missionCard, concluida && styles.missionCardCompleted]}>
                    <View style={[styles.missionIconBox, { borderColor: m.acao?.categorias_acao?.cor_hex || colors.primary }]}>
                      {concluida
                        ? <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
                        : pendente
                          ? <Ionicons name="time-outline" size={28} color="#FFB020" />
                          : <Ionicons name="leaf-outline" size={28} color={m.acao?.categorias_acao?.cor_hex || colors.primary} />
                      }
                    </View>

                    <View style={styles.missionContent}>
                      <View style={styles.missionTitleRow}>
                        <Text style={[styles.missionTitle, concluida && { color: colors.textMuted }]} numberOfLines={2}>
                          {m.acao?.titulo}
                        </Text>
                        {m.xp_bonus > 0 && (
                          <View style={styles.bonusBadge}>
                            <Text style={styles.bonusText}>+{m.xp_bonus} bónus</Text>
                          </View>
                        )}
                      </View>

                      {m.acao?.categorias_acao?.nome && (
                        <View style={styles.catTag}>
                          <View style={[styles.catDot, { backgroundColor: m.acao.categorias_acao.cor_hex || colors.primary }]} />
                          <Text style={styles.catText}>{m.acao.categorias_acao.nome}</Text>
                        </View>
                      )}

                      {m.acao?.descricao ? (
                        <Text style={styles.missionDesc} numberOfLines={2}>{m.acao.descricao}</Text>
                      ) : null}

                      <View style={styles.missionFooter}>
                        <View style={styles.xpGroup}>
                          <Text style={styles.missionReward}>{m.xpTotal} XP</Text>
                          {m.acao?.co2_estimado > 0 && (
                            <Text style={styles.co2Text}>· CO₂ {m.acao.co2_estimado} kg</Text>
                          )}
                        </View>

                        {concluida ? (
                          <View style={styles.completedBadge}>
                            <Ionicons name="checkmark" size={12} color={colors.primary} />
                            <Text style={styles.completedText}>Concluída</Text>
                          </View>
                        ) : pendente ? (
                          <View style={styles.pendenteBadge}>
                            <Ionicons name="time-outline" size={12} color="#FFB020" />
                            <Text style={styles.pendenteText}>Em análise</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.iniciarBtn}
                            onPress={() => router.push('/(tabs)/adicionar-acao')}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.iniciarText}>Submeter</Text>
                            <Ionicons name="arrow-forward" size={14} color="#000" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    scrollContent: { padding: 20, paddingBottom: 120 },

    topNavbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: c.border },
    logoText: { fontSize: 22, fontWeight: '900', color: c.primary, letterSpacing: 0.5, fontStyle: 'italic' },
    glowText: { textShadowColor: c.primary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
    notificationBtn: { padding: 5 },

    pageTitle: { color: c.primary, fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginTop: 20, marginBottom: 4 },
    pageSubtitle: { color: c.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 24 },

    progressCard: { backgroundColor: c.card, borderRadius: 20, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: c.border },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    progressTitle: { color: c.textMuted, fontSize: 14, fontWeight: '600' },
    progressNumbers: { color: c.primary, fontSize: 14, fontWeight: 'bold' },
    progressBarBg: { height: 10, backgroundColor: c.border, borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
    progressBarFill: { height: '100%', backgroundColor: c.primary, borderRadius: 5 },
    progressSub: { color: c.textMuted, fontSize: 12, textAlign: 'right' },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { color: c.text, fontSize: 20, fontWeight: 'bold' },
    badge: { backgroundColor: 'rgba(94,252,68,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(94,252,68,0.3)' },
    badgeText: { color: c.primary, fontSize: 14, fontWeight: 'bold' },

    missionCard: { flexDirection: 'row', backgroundColor: c.card, borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: c.border },
    missionCardCompleted: { opacity: 0.65 },
    missionIconBox: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(94,252,68,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1, flexShrink: 0 },
    missionContent: { flex: 1 },
    missionTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
    missionTitle: { color: c.text, fontSize: 15, fontWeight: 'bold', flex: 1 },
    bonusBadge: { backgroundColor: 'rgba(80,227,194,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(80,227,194,0.3)' },
    bonusText: { color: c.secondary, fontSize: 10, fontWeight: 'bold' },
    catTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    catDot: { width: 8, height: 8, borderRadius: 3 },
    catText: { color: c.textMuted, fontSize: 12 },
    missionDesc: { color: c.textMuted, fontSize: 13, marginBottom: 12 },
    missionFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    xpGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    missionReward: { color: c.primary, fontSize: 14, fontWeight: 'bold' },
    co2Text: { color: c.textMuted, fontSize: 12 },
    completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(94,252,68,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(94,252,68,0.3)' },
    completedText: { color: c.primary, fontSize: 12, fontWeight: 'bold' },
    pendenteBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,176,32,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,176,32,0.3)' },
    pendenteText: { color: '#FFB020', fontSize: 12, fontWeight: 'bold' },
    iniciarBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
    iniciarText: { color: '#000', fontSize: 13, fontWeight: 'bold' },

    emptyState: { alignItems: 'center', paddingVertical: 60, gap: 16 },
    emptyTitle: { color: c.text, fontSize: 22, fontWeight: 'bold' },
    emptyDesc: { color: c.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  });
}
