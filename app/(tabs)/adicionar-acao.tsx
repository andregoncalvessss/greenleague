import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Platform, Image, Modal } from 'react-native';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useRouter, useGlobalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../src/lib/supabase';
import { useToast } from '../../components/ToastProvider';
import { useTheme } from '../../components/ThemeProvider';
import { UNIDADES, normUnidade } from '../../constants/unidades';

export default function AdicionarAcaoScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { colors } = useTheme();
  const params = useGlobalSearchParams<{ categoria?: string; acao?: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('SUBMETER AÇÃO');

  const [categorias, setCategorias] = useState<any[]>([]);
  const [acoes, setAcoes] = useState<any[]>([]);
  const [iaAtiva, setIaAtiva] = useState(false);

  const [activeCatId, setActiveCatId] = useState<number | null>(null);
  const [selectedAcao, setSelectedAcao] = useState<any | null>(null);

  const [quantidade, setQuantidade] = useState(1);
  const [unidade, setUnidade] = useState('unidades');
  const [descricao, setDescricao] = useState('');

  const [showCameraOptions, setShowCameraOptions] = useState(false);
  const [fotoUri, setFotoUri] = useState<string | null>(null);

  const [resultado, setResultado] = useState<null | {
    xp: number; co2: number; agua: number; impacto: string; estimadoPorIa: boolean; justificacao: string | null; aprovado: boolean;
  }>(null);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Unidades a mostrar:
  //  1) se o desafio definiu "unidades_permitidas", usa só essas;
  //  2) caso contrário, a lista curada (+ a unidade própria do desafio, se for custom).
  const unidadesDisponiveis = selectedAcao?.unidades_permitidas?.length
    ? selectedAcao.unidades_permitidas
    : (selectedAcao?.unidade_medida && !UNIDADES.some(u => normUnidade(u) === normUnidade(selectedAcao.unidade_medida))
        ? [selectedAcao.unidade_medida, ...UNIDADES]
        : UNIDADES);

  useEffect(() => {
    fetchDados();
  }, []);

  // Ao escolher uma ação, começa com a 1ª unidade permitida (se o desafio as
  // restringe), senão com a unidade do catálogo mapeada para a lista.
  useEffect(() => {
    if (!selectedAcao) return;
    if (selectedAcao.unidades_permitidas?.length) {
      setUnidade(selectedAcao.unidades_permitidas[0]);
      return;
    }
    const match = UNIDADES.find(u => normUnidade(u) === normUnidade(selectedAcao.unidade_medida));
    setUnidade(match || selectedAcao.unidade_medida || 'Unidades');
  }, [selectedAcao]);

  // Reage aos parâmetros da rota assim que os dados estão carregados.
  useEffect(() => {
    if (loading) return;

    if (params.acao) {
      const alvo = acoes.find((a) => String(a.id) === String(params.acao));
      if (alvo) {
        setActiveCatId(alvo.categoria_id);
        setSelectedAcao(alvo);
        setQuantidade(1);
        setFotoUri(null);
        setShowCameraOptions(false);
      }
    } else if (params.categoria) {
      setActiveCatId(Number(params.categoria));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.acao, params.categoria, loading, acoes]);

  async function fetchDados() {
    setLoading(true);
    const { data: catData } = await supabase.from('categorias_acao').select('*').order('id');
    if (catData && catData.length > 0) {
      setCategorias(catData);
      if (!params.categoria && !params.acao) {
        setActiveCatId(catData[0].id);
      }
    }
    const { data: acoesData } = await supabase.from('catalogo_acoes').select('*').eq('ativo', true);
    if (acoesData) {
      setAcoes(acoesData);
    }
    // Estimativa por IA ativa? (esconde os valores manuais de CO₂/água no card)
    const { data: cfg } = await supabase.from('configuracoes').select('valor').eq('chave', 'ia_estimativa_ativa').single();
    setIaAtiva(cfg?.valor === 'true');
    setLoading(false);
  }

  async function handleTirarFoto() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showToast({ type: 'warning', title: 'Permissão Negada', message: 'Precisamos de acesso à câmara para provar a tua ação!' });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFotoUri(result.assets[0].uri);
        setShowCameraOptions(false);
      }
    } catch (error) {
      console.log("Erro ao processar imagem:", error);
      showToast({ type: 'error', message: 'Não foi possível ler a fotografia.' });
    }
  }

  async function handleAbrirGaleria() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast({ type: 'warning', title: 'Permissão Negada', message: 'Precisamos de acesso à galeria para escolheres a foto!' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFotoUri(result.assets[0].uri);
        setShowCameraOptions(false);
      }
    } catch (error) {
      console.log("Erro ao processar imagem:", error);
      showToast({ type: 'error', message: 'Não foi possível carregar a imagem.' });
    }
  }

  function handleIncrement() { setQuantidade(prev => prev + 1); }
  function handleDecrement() { setQuantidade(prev => (prev > 1 ? prev - 1 : 1)); }

  function resetFormulario() {
    setSelectedAcao(null);
    setDescricao('');
    setQuantidade(1);
    setFotoUri(null);
    setShowCameraOptions(false);
  }

  async function handleSubmeter() {
    if (!fotoUri) {
      showToast({ type: 'warning', title: 'Falta a Prova!', message: 'Por favor, tira uma foto ou escolhe da galeria.' });
      return;
    }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      showToast({ type: 'error', message: 'Sessão expirada. Faz login novamente.' });
      setSubmitting(false);
      return;
    }

    try {
      // Ler configurações: aprovação automática + estimativa por IA
      const { data: configs } = await supabase
        .from('configuracoes')
        .select('chave, valor')
        .in('chave', ['aprovacao_automatica', 'ia_estimativa_ativa']);
      const configMap = Object.fromEntries((configs || []).map((c: any) => [c.chave, c.valor]));
      const aprovacaoAutomatica = configMap['aprovacao_automatica'] === undefined || configMap['aprovacao_automatica'] === 'true';
      const iaAtiva = configMap['ia_estimativa_ativa'] === 'true';

      const fileExt = fotoUri.split('.').pop() || 'jpg';
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;

      const response = await fetch(fotoUri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('provas_acoes')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('provas_acoes')
        .getPublicUrl(fileName);

      const totalXp = selectedAcao.xp_base * quantidade;

      // Estimativa manual (fallback / comportamento original)
      let totalCo2 = selectedAcao.co2_estimado ? selectedAcao.co2_estimado * quantidade : 0;
      let totalAgua = selectedAcao.agua_estimada ? selectedAcao.agua_estimada * quantidade : 0;
      let estimadoPorIa = false;
      let iaJustificacao: string | null = null;

      // Se a IA estiver ativa, pede uma estimativa real com base na foto
      if (iaAtiva) {
        setSubmitStatus('A ANALISAR IMPACTO COM IA…');
        try {
          const { data: ia, error: iaError } = await supabase.functions.invoke('analisar-impacto', {
            body: {
              fotoUrl: publicUrl,
              acaoTitulo: selectedAcao.titulo,
              acaoDescricao: selectedAcao.descricao || '',
              descricaoUser: descricao,
              quantidade,
              unidade,
              co2Manual: selectedAcao.co2_estimado ? selectedAcao.co2_estimado * quantidade : null,
              aguaManual: selectedAcao.agua_estimada ? selectedAcao.agua_estimada * quantidade : null,
            },
          });
          if (!iaError && ia && !ia.error) {
            totalCo2 = Number(ia.co2_kg) || 0;
            totalAgua = Number(ia.agua_litros) || 0;
            iaJustificacao = ia.justificacao || null;
            estimadoPorIa = true;
          }
          // Em caso de falha da IA, mantém-se a estimativa manual (sem bloquear a submissão)
        } catch {
          // silencioso — usa o fallback manual
        }
        setSubmitStatus('SUBMETER AÇÃO');
      }

      // Respeita o tipo de impacto do desafio (zera a métrica não contabilizada)
      const impacto = selectedAcao.impacto || 'ambos';
      if (impacto === 'co2') totalAgua = 0;
      if (impacto === 'agua') totalCo2 = 0;

      const estado = aprovacaoAutomatica ? 'aprovado' : 'pendente';

      const { error: insertError } = await supabase.from('submissoes_acao').insert({
        utilizador_id: user.id,
        acao_id: selectedAcao.id,
        quantidade: quantidade,
        unidade_medida: unidade,
        descricao_user: descricao,
        foto_url: publicUrl,
        estado,
        xp_atribuido: totalXp,
        co2_atribuido: totalCo2,
        agua_atribuida: totalAgua,
        estimado_por_ia: estimadoPorIa,
        ia_justificacao: iaJustificacao,
        ...(aprovacaoAutomatica ? { validado_em: new Date().toISOString() } : {}),
      });

      if (insertError) throw insertError;

      // Só atualiza XP se aprovado automaticamente
      if (aprovacaoAutomatica) {
        const { data: profile } = await supabase
          .from('utilizadores')
          .select('xp_total, co2_poupado, agua_poupada')
          .eq('id', user.id)
          .single();

        if (profile) {
          await supabase.from('utilizadores').update({
            xp_total: (profile.xp_total || 0) + totalXp,
            co2_poupado: Number(profile.co2_poupado || 0) + totalCo2,
            agua_poupada: Number(profile.agua_poupada || 0) + totalAgua,
          }).eq('id', user.id);
        }
      }

      setSubmitting(false);
      setSubmitStatus('SUBMETER AÇÃO');
      resetFormulario();

      // Mostra o ecrã de resultado com o impacto
      setResultado({
        xp: totalXp,
        co2: totalCo2,
        agua: totalAgua,
        impacto,
        estimadoPorIa,
        justificacao: iaJustificacao,
        aprovado: aprovacaoAutomatica,
      });

    } catch (error: any) {
      console.log("Erro no Upload:", error);
      showToast({ type: 'error', title: 'Erro ao submeter', message: error?.message || 'Ocorreu um problema a enviar a tua prova.' });
      setSubmitting(false);
      setSubmitStatus('SUBMETER AÇÃO');
    }
  }

  function fecharResultado() {
    setResultado(null);
    router.push('/(tabs)/home');
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const acoesFiltradas = acoes.filter(a => a.categoria_id === activeCatId);
  const categoriaModal = selectedAcao ? categorias.find(c => c.id === selectedAcao.categoria_id) : null;

  // Valores para mostrar no ecrã de revisão
  const totalXpModal = selectedAcao ? selectedAcao.xp_base * quantidade : 0;
  const totalCo2Modal = selectedAcao && selectedAcao.co2_estimado ? (selectedAcao.co2_estimado * quantidade).toFixed(2) : 0;
  const totalAguaModal = selectedAcao && selectedAcao.agua_estimada ? (selectedAcao.agua_estimada * quantidade).toFixed(2) : 0;

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Novo Impacto</Text>
        <Text style={styles.headerSubtitle}>Escolhe a categoria da tua ação</Text>
      </View>

      <View style={styles.categoriesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {categorias.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catTab, activeCatId === cat.id && { backgroundColor: cat.cor_hex || colors.primary }]}
              onPress={() => setActiveCatId(cat.id)}
            >
              <MaterialCommunityIcons name={cat.icon_url || 'leaf'} size={20} color={activeCatId === cat.id ? '#000' : colors.textMuted} />
              <Text style={[styles.catText, activeCatId === cat.id && { color: '#000' }]}>{cat.nome}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {acoesFiltradas.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma ação encontrada nesta categoria.</Text>
        ) : (
          acoesFiltradas.map((acao) => (
            <TouchableOpacity
              key={acao.id}
              style={styles.actionCard}
              activeOpacity={0.7}
              onPress={() => { setSelectedAcao(acao); setQuantidade(1); setFotoUri(null); setShowCameraOptions(false); }}
            >
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>{acao.titulo}</Text>
                <Text style={styles.actionDesc}>{acao.descricao}</Text>
              </View>
              <View style={styles.xpBadge}>
                <Text style={styles.xpText}>{acao.xp_base} XP / {acao.unidade_medida}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textMuted} style={{ marginLeft: 10 }} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={!!selectedAcao} animationType="slide" transparent={false} onRequestClose={resetFormulario}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={resetFormulario} style={styles.backButton}>
              <Ionicons name="arrow-down" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.formHeaderTitle}>Registar Ação</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>

            {selectedAcao && (
              <View style={[styles.selectedCard, { borderColor: categoriaModal?.cor_hex || colors.primary }]}>
                <MaterialCommunityIcons name={categoriaModal?.icon_url || 'leaf'} size={40} color={categoriaModal?.cor_hex || colors.primary} />
                <Text style={styles.selectedTitle}>{selectedAcao.titulo}</Text>

                <View style={styles.quantityContainer}>
                  <TouchableOpacity onPress={handleDecrement} style={styles.qtyButton}>
                    <Feather name="minus" size={24} color={colors.text} />
                  </TouchableOpacity>
                  <View style={styles.qtyValueContainer}>
                    <Text style={styles.qtyValue}>{quantidade}</Text>
                    <Text style={styles.qtyUnit} numberOfLines={1}>{unidade}</Text>
                  </View>
                  <TouchableOpacity onPress={handleIncrement} style={styles.qtyButton}>
                    <Feather name="plus" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Seletor de unidade */}
                <Text style={styles.unidadeLabel}>Unidade de medida</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unidadeScroll}>
                  {unidadesDisponiveis.map((u: string) => {
                    const ativo = u === unidade;
                    return (
                      <TouchableOpacity
                        key={u}
                        style={[styles.unidadeChip, ativo && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => setUnidade(u)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.unidadeChipText, ativo && { color: '#000' }]}>{u}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Resumo Dinâmico. Com a IA ativa, o CO₂/água não são mostrados aqui
                    (valores manuais) — só aparecem no card de resultado da IA no fim. */}
                <View style={styles.selectedBadges}>
                  <Text style={styles.badgeXp}>+{totalXpModal} XP</Text>

                  {!iaAtiva && selectedAcao.co2_estimado ? (
                    <Text style={styles.badgeCo2}>-{totalCo2Modal}kg CO₂</Text>
                  ) : null}

                  {!iaAtiva && selectedAcao.agua_estimada ? (
                    <Text style={styles.badgeAgua}>-{totalAguaModal}L Água</Text>
                  ) : null}
                </View>

                {iaAtiva && (
                  <View style={styles.iaHint}>
                    <Ionicons name="sparkles" size={13} color={colors.secondary} />
                    <Text style={styles.iaHintText}>O impacto em CO₂ e água será calculado por IA ao submeter.</Text>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.label}>Como correu? (Opcional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Adiciona detalhes sobre a tua ação..."
              placeholderTextColor={colors.placeholderText}
              multiline
              numberOfLines={4}
              value={descricao}
              onChangeText={setDescricao}
            />

            <Text style={styles.label}>Comprovativo Fotográfico *</Text>

            {!fotoUri ? (
              !showCameraOptions ? (
                <TouchableOpacity
                  style={styles.cameraButton}
                  onPress={() => setShowCameraOptions(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera-outline" size={40} color={colors.textMuted} />
                  <Text style={styles.cameraText}>Adicionar Prova Fotográfica</Text>
                  <Text style={styles.cameraSubtext}>Clica para escolheres o método</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.cameraOptionsContainer}>
                  <TouchableOpacity style={styles.cameraOptionBtn} onPress={handleTirarFoto}>
                    <Ionicons name="camera" size={32} color={colors.primary} />
                    <Text style={styles.cameraOptionText}>Tirar Foto</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cameraOptionBtn} onPress={handleAbrirGaleria}>
                    <Ionicons name="images" size={32} color={colors.secondary} />
                    <Text style={styles.cameraOptionText}>Abrir Galeria</Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              <TouchableOpacity
                style={styles.previewContainer}
                onPress={() => setShowCameraOptions(true)}
                activeOpacity={0.8}
              >
                <Image source={{ uri: fotoUri }} style={styles.previewImage} />
                <View style={styles.previewOverlay}>
                  <Ionicons name="swap-horizontal" size={20} color="#FFF" />
                  <Text style={styles.previewOverlayText}>Alterar Imagem</Text>
                </View>
              </TouchableOpacity>
            )}

            {showCameraOptions && fotoUri && (
              <View style={[styles.cameraOptionsContainer, { marginTop: 15 }]}>
                <TouchableOpacity style={styles.cameraOptionBtn} onPress={handleTirarFoto}>
                  <Ionicons name="camera" size={24} color={colors.primary} />
                  <Text style={styles.cameraOptionText}>Nova Foto</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cameraOptionBtn} onPress={handleAbrirGaleria}>
                  <Ionicons name="images" size={24} color={colors.secondary} />
                  <Text style={styles.cameraOptionText}>Galeria</Text>
                </TouchableOpacity>
              </View>
            )}

          </ScrollView>

          <View style={styles.fixedBottomBar}>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmeter}
              disabled={submitting}
            >
              {submitting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <ActivityIndicator color="#000" />
                  <Text style={styles.submitBtnText}>{submitStatus}</Text>
                </View>
              ) : (
                <Text style={styles.submitBtnText}>SUBMETER AÇÃO</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ECRÃ DE RESULTADO — impacto da ação */}
      <Modal visible={!!resultado} animationType="fade" transparent onRequestClose={fecharResultado}>
        <View style={styles.resultOverlay}>
          <View style={styles.resultCard}>
            <View style={styles.resultIconCircle}>
              <Ionicons name={resultado?.aprovado ? 'checkmark-circle' : 'time'} size={54} color={resultado?.aprovado ? colors.primary : '#FFB020'} />
            </View>

            <Text style={styles.resultTitle}>
              {resultado?.aprovado ? 'Ação registada!' : 'Ação submetida!'}
            </Text>
            <Text style={styles.resultSubtitle}>
              {resultado?.aprovado
                ? 'Aqui está o teu impacto ambiental:'
                : 'A aguardar aprovação. Impacto estimado:'}
            </Text>

            {resultado?.estimadoPorIa && (
              <View style={styles.resultIaBadge}>
                <Ionicons name="sparkles" size={13} color={colors.secondary} />
                <Text style={styles.resultIaText}>Estimado por IA</Text>
              </View>
            )}

            <View style={styles.resultStats}>
              <View style={styles.resultStat}>
                <Text style={[styles.resultStatValue, { color: colors.primary }]}>+{resultado?.xp}</Text>
                <Text style={styles.resultStatLabel}>XP</Text>
              </View>
              {resultado?.impacto !== 'agua' && (
                <>
                  <View style={styles.resultDivider} />
                  <View style={styles.resultStat}>
                    <Text style={[styles.resultStatValue, { color: colors.secondary }]}>{(resultado?.co2 || 0).toFixed(1)}</Text>
                    <Text style={styles.resultStatLabel}>kg CO₂</Text>
                  </View>
                </>
              )}
              {resultado?.impacto !== 'co2' && (
                <>
                  <View style={styles.resultDivider} />
                  <View style={styles.resultStat}>
                    <Text style={[styles.resultStatValue, { color: '#3b82f6' }]}>{(resultado?.agua || 0).toFixed(1)}</Text>
                    <Text style={styles.resultStatLabel}>L Água</Text>
                  </View>
                </>
              )}
            </View>

            {resultado?.estimadoPorIa && resultado?.justificacao ? (
              <Text style={styles.resultJustificacao}>“{resultado.justificacao}”</Text>
            ) : null}

            <TouchableOpacity style={styles.resultBtn} onPress={fecharResultado}>
              <Text style={styles.resultBtnText}>Concluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    modalContainer: { flex: 1, backgroundColor: c.bg },
    header: { padding: 20, paddingTop: 30, paddingBottom: 15 },
    headerTitle: { color: c.primary, fontSize: 28, fontWeight: 'bold' },
    headerSubtitle: { color: c.textMuted, fontSize: 14, marginTop: 4 },
    categoriesWrapper: { paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: c.border },
    categoriesScroll: { paddingHorizontal: 20, gap: 10 },
    catTab: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: c.border, gap: 6 },
    catText: { color: c.textMuted, fontWeight: 'bold', fontSize: 14 },
    listContent: { padding: 20, paddingBottom: 120 },
    emptyText: { color: c.textMuted, textAlign: 'center', marginTop: 40 },
    actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    actionInfo: { flex: 1, marginRight: 10 },
    actionTitle: { color: c.text, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    actionDesc: { color: c.textMuted, fontSize: 12 },
    xpBadge: { backgroundColor: 'rgba(94, 252, 68, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: c.primary },
    xpText: { color: c.primary, fontWeight: 'bold', fontSize: 11, textAlign: 'center' },
    formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 20 : 30, borderBottomWidth: 1, borderBottomColor: c.border },
    backButton: { padding: 5 },
    formHeaderTitle: { color: c.text, fontSize: 18, fontWeight: 'bold' },
    formContent: { padding: 20, paddingBottom: 150 },
    selectedCard: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 20, marginBottom: 25, borderWidth: 1 },
    selectedTitle: { color: c.text, fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 15, textAlign: 'center' },
    quantityContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.bg, borderRadius: 16, padding: 8, marginBottom: 20, borderWidth: 1, borderColor: c.border },
    qtyButton: { backgroundColor: c.card, padding: 12, borderRadius: 12 },
    qtyValueContainer: { paddingHorizontal: 25, alignItems: 'center', minWidth: 130 },
    qtyValue: { color: c.text, fontSize: 24, fontWeight: 'bold' },
    qtyUnit: { color: c.textMuted, fontSize: 12, marginTop: 2, textTransform: 'uppercase', textAlign: 'center' },
    unidadeLabel: { color: c.textMuted, fontSize: 12, fontWeight: '700', alignSelf: 'flex-start', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    unidadeScroll: { gap: 8, paddingRight: 4, marginBottom: 20 },
    unidadeChip: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
    unidadeChipText: { color: c.textMuted, fontSize: 13, fontWeight: '600' },
    selectedBadges: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
    badgeXp: { backgroundColor: c.primary, color: '#000', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, fontWeight: 'bold', overflow: 'hidden' },
    badgeCo2: { backgroundColor: c.secondary, color: '#000', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, fontWeight: 'bold', overflow: 'hidden' },
    badgeAgua: { backgroundColor: '#3b82f6', color: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, fontWeight: 'bold', overflow: 'hidden' },
    iaHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, paddingHorizontal: 12 },
    iaHintText: { color: c.textMuted, fontSize: 12, fontStyle: 'italic', textAlign: 'center', flexShrink: 1 },
    label: { color: c.text, fontSize: 14, fontWeight: 'bold', marginBottom: 10, marginLeft: 4 },
    textInput: { backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.inputBorder, borderRadius: 16, color: c.text, padding: 15, fontSize: 14, minHeight: 100, textAlignVertical: 'top', marginBottom: 25 },
    cameraButton: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 2, borderColor: c.border, borderStyle: 'dashed', borderRadius: 20, padding: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
    cameraText: { color: c.text, fontSize: 16, fontWeight: 'bold', marginTop: 10 },
    cameraSubtext: { color: c.textMuted, fontSize: 12, marginTop: 4 },
    cameraOptionsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 15, marginBottom: 30 },
    cameraOptionBtn: { flex: 1, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 25, alignItems: 'center', justifyContent: 'center' },
    cameraOptionText: { color: c.text, fontSize: 14, fontWeight: 'bold', marginTop: 10 },
    previewContainer: { borderRadius: 16, overflow: 'hidden', marginBottom: 15, borderWidth: 1, borderColor: c.border },
    previewImage: { width: '100%', height: 200, resizeMode: 'cover' },
    previewOverlay: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.7)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6 },
    previewOverlayText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
    fixedBottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: c.surface, padding: 20, borderTopWidth: 1, borderTopColor: c.border, paddingBottom: Platform.OS === 'ios' ? 40 : 25 },
    submitBtn: { backgroundColor: c.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
    submitBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },

    // Ecrã de resultado
    resultOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 28 },
    resultCard: { width: '100%', maxWidth: 420, backgroundColor: c.card, borderRadius: 28, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: c.border },
    resultIconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: c.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
    resultTitle: { color: c.text, fontSize: 24, fontWeight: '900', textAlign: 'center' },
    resultSubtitle: { color: c.textMuted, fontSize: 14, textAlign: 'center', marginTop: 6 },
    resultIaBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14, backgroundColor: c.secondary + '18', borderWidth: 1, borderColor: c.secondary + '44', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
    resultIaText: { color: c.secondary, fontSize: 12, fontWeight: '800' },
    resultStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg, borderRadius: 20, paddingVertical: 20, paddingHorizontal: 10, marginTop: 22, width: '100%', borderWidth: 1, borderColor: c.border },
    resultStat: { flex: 1, alignItems: 'center' },
    resultStatValue: { fontSize: 26, fontWeight: '900' },
    resultStatLabel: { color: c.textMuted, fontSize: 12, marginTop: 4, fontWeight: '600' },
    resultDivider: { width: 1, height: 40, backgroundColor: c.border },
    resultJustificacao: { color: c.textMuted, fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 18, lineHeight: 19 },
    resultBtn: { backgroundColor: c.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 24, width: '100%' },
    resultBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  });
}
