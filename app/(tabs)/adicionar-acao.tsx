import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Platform, Image, Modal } from 'react-native';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useRouter, useGlobalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
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

export default function AdicionarAcaoScreen() {
  const router = useRouter();
  // Parâmetros que a Home (ou outra tela) pode enviar para pré-selecionar destino.
  // - acao: abre diretamente o modal dessa ação, na categoria dela.
  // - categoria: apenas seleciona o separador dessa categoria.
  // IMPORTANTE: usamos useGlobalSearchParams (e não useLocalSearchParams) porque
  // esta tela é uma TAB e a navegação vem de outra tab. O useLocalSearchParams
  // não recebe os params de forma fiável entre tabs; o global recebe sempre.
  const params = useGlobalSearchParams<{ categoria?: string; acao?: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [categorias, setCategorias] = useState<any[]>([]);
  const [acoes, setAcoes] = useState<any[]>([]);

  const [activeCatId, setActiveCatId] = useState<number | null>(null);
  const [selectedAcao, setSelectedAcao] = useState<any | null>(null);

  const [quantidade, setQuantidade] = useState(1);
  const [descricao, setDescricao] = useState('');

  const [showCameraOptions, setShowCameraOptions] = useState(false);
  const [fotoUri, setFotoUri] = useState<string | null>(null);

  useEffect(() => {
    fetchDados();
  }, []);

  // Reage aos parâmetros da rota assim que os dados estão carregados.
  // Fica num efeito separado para também funcionar quando se volta a navegar
  // para esta tab já montada (os tabs não desmontam entre navegações).
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
      // Só define a categoria por defeito se NÃO viermos com um destino específico.
      if (!params.categoria && !params.acao) {
        setActiveCatId(catData[0].id);
      }
    }
    const { data: acoesData } = await supabase.from('catalogo_acoes').select('*').eq('ativo', true);
    if (acoesData) {
      setAcoes(acoesData);
    }
    setLoading(false);
  }

  async function handleTirarFoto() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'Precisamos de acesso à câmara para provar a tua ação!');
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
      Alert.alert('Ops!', 'Não foi possível ler a fotografia.');
    }
  }

  async function handleAbrirGaleria() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'Precisamos de acesso à galeria para escolheres a foto!');
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
      Alert.alert('Ops!', 'Não foi possível carregar a imagem.');
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
      Alert.alert('Falta a Prova!', 'Por favor, tira uma foto ou escolhe da galeria.');
      return;
    }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert('Erro', 'Sessão expirada. Faz login novamente.');
      setSubmitting(false);
      return;
    }

    try {
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
      const totalCo2 = selectedAcao.co2_estimado ? selectedAcao.co2_estimado * quantidade : 0;

      const { error: insertError } = await supabase.from('submissoes_acao').insert({
        utilizador_id: user.id,
        acao_id: selectedAcao.id,
        quantidade: quantidade,
        descricao_user: descricao,
        foto_url: publicUrl,
        estado: 'aprovado',
        xp_atribuido: totalXp,
        co2_atribuido: totalCo2
      });

      if (insertError) throw insertError;

      const { data: profile } = await supabase.from('utilizadores').select('xp_total').eq('id', user.id).single();
      if (profile) {
        const novoXp = (profile.xp_total || 0) + totalXp;
        await supabase.from('utilizadores').update({ xp_total: novoXp }).eq('id', user.id);
      }

      setSubmitting(false);
      resetFormulario();
      Alert.alert('Sucesso! 🌱', `Ação registada! Ganhaste +${totalXp} XP.`, [
        { text: 'Incrível', onPress: () => router.push('/(tabs)/home') }
      ]);

    } catch (error) {
      console.log("Erro no Upload:", error);
      Alert.alert('Erro no Upload', 'Ocorreu um problema a enviar a tua prova para o servidor.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const acoesFiltradas = acoes.filter(a => a.categoria_id === activeCatId);
  const categoriaModal = selectedAcao ? categorias.find(c => c.id === selectedAcao.categoria_id) : null;
  const totalXpModal = selectedAcao ? selectedAcao.xp_base * quantidade : 0;
  const totalCo2Modal = selectedAcao && selectedAcao.co2_estimado ? (selectedAcao.co2_estimado * quantidade).toFixed(2) : 0;

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
              style={[styles.catTab, activeCatId === cat.id && { backgroundColor: cat.cor_hex || COLORS.primary }]}
              onPress={() => setActiveCatId(cat.id)}
            >
              <MaterialCommunityIcons name={cat.icon_url || 'leaf'} size={20} color={activeCatId === cat.id ? '#000' : COLORS.textGray} />
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
              <Feather name="chevron-right" size={20} color={COLORS.textGray} style={{ marginLeft: 10 }} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={!!selectedAcao} animationType="slide" transparent={false} onRequestClose={resetFormulario}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={resetFormulario} style={styles.backButton}>
              <Ionicons name="arrow-down" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.formHeaderTitle}>Registar Ação</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>

            {selectedAcao && (
              <View style={[styles.selectedCard, { borderColor: categoriaModal?.cor_hex || COLORS.primary }]}>
                <MaterialCommunityIcons name={categoriaModal?.icon_url || 'leaf'} size={40} color={categoriaModal?.cor_hex || COLORS.primary} />
                <Text style={styles.selectedTitle}>{selectedAcao.titulo}</Text>

                <View style={styles.quantityContainer}>
                  <TouchableOpacity onPress={handleDecrement} style={styles.qtyButton}>
                    <Feather name="minus" size={24} color="#FFF" />
                  </TouchableOpacity>
                  <View style={styles.qtyValueContainer}>
                    <Text style={styles.qtyValue}>{quantidade}</Text>
                    <Text style={styles.qtyUnit}>{selectedAcao.unidade_medida || 'unidades'}</Text>
                  </View>
                  <TouchableOpacity onPress={handleIncrement} style={styles.qtyButton}>
                    <Feather name="plus" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.selectedBadges}>
                  <Text style={styles.badgeXp}>+{totalXpModal} XP</Text>
                  {selectedAcao.co2_estimado && (
                    <Text style={styles.badgeCo2}>-{totalCo2Modal}kg CO₂</Text>
                  )}
                </View>
              </View>
            )}

            <Text style={styles.label}>Como correu? (Opcional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Adiciona detalhes sobre a tua ação..."
              placeholderTextColor={COLORS.textGray}
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
                  <Ionicons name="camera-outline" size={40} color={COLORS.textGray} />
                  <Text style={styles.cameraText}>Adicionar Prova Fotográfica</Text>
                  <Text style={styles.cameraSubtext}>Clica para escolheres o método</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.cameraOptionsContainer}>
                  <TouchableOpacity style={styles.cameraOptionBtn} onPress={handleTirarFoto}>
                    <Ionicons name="camera" size={32} color={COLORS.primary} />
                    <Text style={styles.cameraOptionText}>Tirar Foto</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cameraOptionBtn} onPress={handleAbrirGaleria}>
                    <Ionicons name="images" size={32} color={COLORS.secondary} />
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
                  <Ionicons name="camera" size={24} color={COLORS.primary} />
                  <Text style={styles.cameraOptionText}>Nova Foto</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cameraOptionBtn} onPress={handleAbrirGaleria}>
                  <Ionicons name="images" size={24} color={COLORS.secondary} />
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
              {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>SUBMETER AÇÃO</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingTop: 30, paddingBottom: 15 },
  headerTitle: { color: COLORS.primary, fontSize: 28, fontWeight: 'bold' },
  headerSubtitle: { color: COLORS.textGray, fontSize: 14, marginTop: 4 },
  categoriesWrapper: { paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  categoriesScroll: { paddingHorizontal: 20, gap: 10 },
  catTab: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, gap: 6 },
  catText: { color: COLORS.textGray, fontWeight: 'bold', fontSize: 14 },
  listContent: { padding: 20, paddingBottom: 120 },
  emptyText: { color: COLORS.textGray, textAlign: 'center', marginTop: 40 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  actionInfo: { flex: 1, marginRight: 10 },
  actionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  actionDesc: { color: COLORS.textGray, fontSize: 12 },
  xpBadge: { backgroundColor: 'rgba(94, 252, 68, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary },
  xpText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 11, textAlign: 'center' },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 20 : 30, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backButton: { padding: 5 },
  formHeaderTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  formContent: { padding: 20, paddingBottom: 150 },
  selectedCard: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 20, marginBottom: 25, borderWidth: 1 },
  selectedTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 15, textAlign: 'center' },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 16, padding: 8, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  qtyButton: { backgroundColor: COLORS.cardBg, padding: 12, borderRadius: 12 },
  qtyValueContainer: { paddingHorizontal: 25, alignItems: 'center' },
  qtyValue: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  qtyUnit: { color: COLORS.textGray, fontSize: 12, marginTop: 2, textTransform: 'uppercase' },
  selectedBadges: { flexDirection: 'row', gap: 10 },
  badgeXp: { backgroundColor: COLORS.primary, color: '#000', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, fontWeight: 'bold', overflow: 'hidden' },
  badgeCo2: { backgroundColor: COLORS.secondary, color: '#000', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, fontWeight: 'bold', overflow: 'hidden' },
  label: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginBottom: 10, marginLeft: 4 },
  textInput: { backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, color: '#FFF', padding: 15, fontSize: 14, minHeight: 100, textAlignVertical: 'top', marginBottom: 25 },
  cameraButton: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', borderRadius: 20, padding: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  cameraText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginTop: 10 },
  cameraSubtext: { color: COLORS.textGray, fontSize: 12, marginTop: 4 },
  cameraOptionsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 15, marginBottom: 30 },
  cameraOptionBtn: { flex: 1, backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 25, alignItems: 'center', justifyContent: 'center' },
  cameraOptionText: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginTop: 10 },
  previewContainer: { borderRadius: 16, overflow: 'hidden', marginBottom: 15, borderWidth: 1, borderColor: COLORS.border },
  previewImage: { width: '100%', height: 200, resizeMode: 'cover' },
  previewOverlay: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.7)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6 },
  previewOverlayText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  fixedBottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.background, padding: 20, borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: Platform.OS === 'ios' ? 40 : 25 },
  submitBtn: { backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  submitBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' }
});