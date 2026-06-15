import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, SafeAreaView, 
  ScrollView, TextInput, Alert, ActivityIndicator, Modal, FlatList, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';

const COLORS = { 
  background: '#121214', primary: '#5EFC44', secondary: '#50E3C2', 
  cardBg: '#1E1E24', inputBorder: '#333333',
  textLight: '#FFFFFF', textGray: '#888888', modalBg: '#1A1A20'
};

const ANOS = ['1º Ano', '2º Ano', '3º Ano', '4º Ano', 'Outro'];

export default function OnboardingScreen() {
  const router = useRouter();
  
  // Dados do Utilizador logado
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  
  // Dados vindos da Base de Dados
  const [escolasDb, setEscolasDb] = useState<any[]>([]);
  const [cursosDb, setCursosDb] = useState<any[]>([]);

  // Seleções do Utilizador
  const [escolaObj, setEscolaObj] = useState<any>(null);
  const [cursoObj, setCursoObj] = useState<any>(null);
  const [numAluno, setNumAluno] = useState('');
  const [ano, setAno] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Controlo do Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'escola' | 'curso' | 'ano'>('escola');

  useEffect(() => {
    async function loadInitialData() {
      // 1. Carregar o utilizador atual do Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email || '');
        // Vai buscar o nome que guardámos nos metadados durante o registo (se existir)
        setUserName(user.user_metadata?.full_name || (user.email?.split('@')[0] ?? 'Atleta'));
      }

      // 2. Carregar a lista de Escolas diretamente da Base de Dados
      const { data: escolas, error } = await supabase.from('escolas').select('*').order('id');
      if (escolas && !error) {
        setEscolasDb(escolas);
      } else {
        console.error("Erro a carregar escolas:", error);
      }
    }
    loadInitialData();
  }, []);

  const openModal = (type: 'escola' | 'curso' | 'ano') => {
    if (type === 'curso' && !escolaObj) {
      Alert.alert('Atenção', 'Por favor, seleciona a tua escola primeiro.');
      return;
    }
    setModalType(type);
    setModalVisible(true);
  };

  const handleSelectItem = async (item: any) => {
    if (modalType === 'escola') {
      setEscolaObj(item);
      setCursoObj(null); // Limpa o curso se mudar de escola
      setModalVisible(false);
      
      // Carrega os cursos específicos desta escola!
      const { data: cursos } = await supabase
        .from('cursos')
        .select('*')
        .eq('escola_id', item.id)
        .order('nome');
        
      if (cursos) setCursosDb(cursos);
      
    } else if (modalType === 'curso') {
      setCursoObj(item);
      setModalVisible(false);
    } else {
      setAno(item);
      setModalVisible(false);
    }
  };

  async function handleSaveProfile() {
    if (!escolaObj || !cursoObj || !numAluno.trim() || !ano) {
      Alert.alert('Campos Incompletos', 'Por favor, preenche todos os campos para entrares na liga.');
      return;
    }

    setSaveLoading(true);

    // Guardar os dados na tabela 'utilizadores' exatamente com as colunas que definiste
    const { error } = await supabase.from('utilizadores').upsert({
      id: userId,
      nome: userName, 
      email: userEmail,
      escola_id: escolaObj.id,
      curso_id: cursoObj.id,
      numero_aluno: numAluno,
      ano_frequencia: ano // A nova coluna que adicionámos
    });

    if (error) {
      Alert.alert('Erro ao guardar', 'Não foi possível guardar o perfil. Detalhes: ' + error.message);
      setSaveLoading(false);
      return;
    }

    // Atualizamos também os metadados do Auth por segurança
    await supabase.auth.updateUser({
      data: { escola_id: escolaObj.id, curso_id: cursoObj.id, numero_aluno: numAluno, ano_frequencia: ano }
    });

    setSaveLoading(false);
    Alert.alert('Perfil Configurado!', 'Tudo pronto. Bem-vindo à Green League!');
    
    // Entra na Home!
   router.replace('/(tabs)/home');
  }

  // Define os dados a renderizar no modal dependendo da escolha
  const modalData = modalType === 'escola' ? escolasDb : modalType === 'curso' ? cursosDb : ANOS;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.headerCentered}>
            <MaterialCommunityIcons name="trophy-outline" size={60} color={COLORS.primary} style={styles.glowIcon} />
            <Text style={[styles.title, styles.glowText]}>CONFIGURA O TEU PERFIL</Text>
            <Text style={styles.subtitle}>Falta apenas isto para começares a pontuar</Text>
          </View>

          <View style={styles.form}>
            
            <Text style={styles.label}>Qual é a tua Escola? *</Text>
            <TouchableOpacity style={styles.inputWithIcon} onPress={() => openModal('escola')} activeOpacity={0.7}>
              <Ionicons name="business-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
              <Text style={[styles.inputText, !escolaObj && { color: COLORS.textGray }]}>
                {escolaObj ? escolaObj.nome : "Seleciona a tua escola"}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textGray} />
            </TouchableOpacity>

            <Text style={styles.label}>Qual é o teu Curso? *</Text>
            <TouchableOpacity style={styles.inputWithIcon} onPress={() => openModal('curso')} activeOpacity={0.7}>
              <Ionicons name="school-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
              <Text style={[styles.inputText, !cursoObj && { color: COLORS.textGray }]}>
                {cursoObj ? cursoObj.nome : "Seleciona o teu curso"}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textGray} />
            </TouchableOpacity>

            <Text style={styles.label}>Número de Aluno *</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ex: 23451" 
              placeholderTextColor={COLORS.textGray} 
              keyboardType="numeric"
              value={numAluno}
              onChangeText={setNumAluno}
            />

            <Text style={styles.label}>Ano que frequentas *</Text>
            <TouchableOpacity style={styles.inputWithIcon} onPress={() => openModal('ano')} activeOpacity={0.7}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
              <Text style={[styles.inputText, !ano && { color: COLORS.textGray }]}>
                {ano ? ano : "Seleciona o teu ano"}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textGray} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.glowButton, { marginTop: 40 }]} onPress={handleSaveProfile} disabled={saveLoading}>
              {saveLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.actionButtonText}>ENTRAR NA LIGA</Text>}
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL DAS LISTAS DINÂMICAS */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType === 'escola' ? 'Selecione a Escola' : modalType === 'curso' ? 'Selecione o Curso' : 'Selecione o Ano'}
            </Text>
            
            <FlatList
              data={modalData}
              // O Ano é uma string simples, Escola e Curso são objetos com ID
              keyExtractor={(item, index) => modalType === 'ano' ? index.toString() : item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectItem(item)}>
                  <Text style={styles.modalOptionText}>
                    {modalType === 'ano' ? item : item.nome}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCloseText}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// Estilos
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background }, scrollContent: { flexGrow: 1, padding: 20, justifyContent: 'center' }, headerCentered: { alignItems: 'center', marginBottom: 30, marginTop: 20 }, title: { fontSize: 24, fontWeight: '900', color: COLORS.primary, marginTop: 15, letterSpacing: 1, textAlign: 'center' }, subtitle: { fontSize: 14, color: COLORS.secondary, marginTop: 5, fontWeight: '600', textAlign: 'center' }, form: { width: '100%' }, label: { color: COLORS.textLight, fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 15 }, input: { backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: 12, color: COLORS.textLight, padding: 16, fontSize: 16 }, inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: 12, paddingHorizontal: 16 }, inputIcon: { marginRight: 10 }, inputText: { flex: 1, color: COLORS.textLight, paddingVertical: 16, fontSize: 16 }, actionButton: { backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }, actionButtonText: { color: '#000000', fontSize: 18, fontWeight: '900', letterSpacing: 1 }, glowText: { textShadowColor: COLORS.primary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 }, glowIcon: { textShadowColor: COLORS.primary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15 }, glowButton: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 15, elevation: 10 }, modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 }, modalContent: { width: '100%', maxHeight: '80%', backgroundColor: COLORS.modalBg, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.inputBorder }, modalTitle: { color: COLORS.primary, fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }, modalOption: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.inputBorder }, modalOptionText: { color: COLORS.textLight, fontSize: 16 }, modalCloseButton: { marginTop: 20, paddingVertical: 12, alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: 10, borderWidth: 1, borderColor: COLORS.inputBorder }, modalCloseText: { color: COLORS.textGray, fontSize: 14, fontWeight: 'bold' }
});