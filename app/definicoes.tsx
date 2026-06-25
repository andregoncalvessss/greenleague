import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView,
  TextInput, Alert, ActivityIndicator, Modal, FlatList, KeyboardAvoidingView, Platform
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../src/lib/supabase';

const COLORS = {
  background: '#121214', primary: '#5EFC44', secondary: '#50E3C2',
  cardBg: 'rgba(30, 30, 36, 0.8)', inputBorder: '#333333', modalBg: '#1A1A20',
  textLight: '#FFFFFF', textGray: '#888888', danger: '#FF4444'
};

const BUCKET = 'avatars';

export default function SettingsScreen() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Foto
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  // Dados pessoais
  const [nome, setNome] = useState('');
  const [escolaObj, setEscolaObj] = useState<any>(null);
  const [cursoObj, setCursoObj] = useState<any>(null);
  const [savingDados, setSavingDados] = useState(false);

  // Conta
  const [email, setEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  // Listas / Modal
  const [escolasDb, setEscolasDb] = useState<any[]>([]);
  const [cursosDb, setCursosDb] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'escola' | 'curso'>('escola');

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace('/'); return; }
        setUserId(user.id);
        setEmail(user.email || '');

        const { data: profile } = await supabase
          .from('utilizadores')
          .select('*, escolas(id, nome), cursos(id, nome)')
          .eq('id', user.id)
          .single();

        if (profile) {
          setNome(profile.nome || '');
          setAvatarUrl(profile.avatar_url || null);
          if (profile.escolas) setEscolaObj(profile.escolas);
          if (profile.cursos) setCursoObj(profile.cursos);
        }

        const { data: escolas } = await supabase.from('escolas').select('*').order('id');
        if (escolas) setEscolasDb(escolas);

        if (profile?.escola_id) {
          const { data: cursos } = await supabase
            .from('cursos').select('*').eq('escola_id', profile.escola_id).order('nome');
          if (cursos) setCursosDb(cursos);
        }
      } catch (e) {
        console.error('Erro ao carregar definições:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ---------- FOTO ----------
  async function handleChangePhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso às tuas fotos para alterares o avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0] || !userId) return;

    try {
      setUploadingFoto(true);
      const asset = result.assets[0];
      const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
      const contentType = asset.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;

      const resp = await fetch(asset.uri);
      const arrayBuffer = await resp.arrayBuffer();

      const path = `${userId}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, arrayBuffer, { contentType, upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = `${pub.publicUrl}?t=${Date.now()}`; // evita cache antigo

      const { error: dbErr } = await supabase
        .from('utilizadores').update({ avatar_url: publicUrl }).eq('id', userId);
      if (dbErr) throw dbErr;

      setAvatarUrl(publicUrl);
      Alert.alert('Sucesso', 'Foto de perfil atualizada!');
    } catch (e: any) {
      Alert.alert('Erro', 'Não foi possível atualizar a foto. ' + (e?.message || ''));
    } finally {
      setUploadingFoto(false);
    }
  }

  // ---------- MODAL ESCOLA/CURSO ----------
  const openModal = (type: 'escola' | 'curso') => {
    if (type === 'curso' && !escolaObj) {
      Alert.alert('Atenção', 'Seleciona primeiro a escola.');
      return;
    }
    setModalType(type);
    setModalVisible(true);
  };

  const handleSelectItem = async (item: any) => {
    if (modalType === 'escola') {
      setEscolaObj(item);
      setCursoObj(null);
      setModalVisible(false);
      const { data: cursos } = await supabase
        .from('cursos').select('*').eq('escola_id', item.id).order('nome');
      setCursosDb(cursos || []);
    } else {
      setCursoObj(item);
      setModalVisible(false);
    }
  };

  // ---------- GUARDAR DADOS ----------
  async function handleSaveDados() {
    if (!nome.trim()) { Alert.alert('Erro', 'O nome não pode ficar vazio.'); return; }
    if (!escolaObj || !cursoObj) { Alert.alert('Erro', 'Seleciona a escola e o curso.'); return; }
    if (!userId) return;

    try {
      setSavingDados(true);
      const { error } = await supabase.from('utilizadores').update({
        nome: nome.trim(),
        escola_id: escolaObj.id,
        curso_id: cursoObj.id,
      }).eq('id', userId);
      if (error) throw error;
      Alert.alert('Sucesso', 'Dados atualizados!');
    } catch (e: any) {
      Alert.alert('Erro', 'Não foi possível guardar. ' + (e?.message || ''));
    } finally {
      setSavingDados(false);
    }
  }

  // ---------- EMAIL ----------
  async function handleUpdateEmail() {
    const novo = email.trim().toLowerCase();
    if (!novo || !novo.includes('@')) { Alert.alert('Erro', 'Introduz um email válido.'); return; }
    try {
      setSavingEmail(true);
      const { error } = await supabase.auth.updateUser({ email: novo });
      if (error) throw error;
      Alert.alert('Confirma o teu email', 'Enviámos um link de confirmação para o novo email. O email só muda depois de confirmares.');
    } catch (e: any) {
      Alert.alert('Erro', 'Não foi possível atualizar o email. ' + (e?.message || ''));
    } finally {
      setSavingEmail(false);
    }
  }

  // ---------- PASSWORD ----------
  async function handleUpdatePassword() {
    if (password.length < 6) { Alert.alert('Erro', 'A password deve ter pelo menos 6 caracteres.'); return; }
    if (password !== password2) { Alert.alert('Erro', 'As passwords não coincidem.'); return; }
    try {
      setSavingPass(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword(''); setPassword2('');
      Alert.alert('Sucesso', 'Password alterada!');
    } catch (e: any) {
      Alert.alert('Erro', 'Não foi possível alterar a password. ' + (e?.message || ''));
    } finally {
      setSavingPass(false);
    }
  }

  // ---------- ELIMINAR CONTA ----------
  function handleDeleteAccount() {
    Alert.alert(
      'Eliminar Conta',
      'Esta ação é permanente. Todos os teus dados serão apagados e não poderás recuperar a conta. Tens a certeza?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.rpc('delete_user');
              if (error) throw error;
              await supabase.auth.signOut();
              router.replace('/');
            } catch (e: any) {
              Alert.alert('Erro', 'Não foi possível eliminar a conta. ' + (e?.message || ''));
            }
          },
        },
      ]
    );
  }

  if (loading) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );

  const modalData = modalType === 'escola' ? escolasDb : cursosDb;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#121214', '#1A1A2E', '#0D2B1D']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

          <View style={styles.topBar}>
            <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Definições</Text>
            <View style={{ width: 45 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* FOTO */}
            <View style={styles.avatarWrap}>
              <View style={styles.avatarBox}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImg} contentFit="cover" />
                ) : (
                  <Text style={styles.avatarText}>{nome ? nome.charAt(0).toUpperCase() : '?'}</Text>
                )}
              </View>
              <TouchableOpacity style={styles.changePhotoBtn} onPress={handleChangePhoto} disabled={uploadingFoto}>
                {uploadingFoto
                  ? <ActivityIndicator color={COLORS.primary} />
                  : <><Ionicons name="camera-outline" size={18} color={COLORS.primary} /><Text style={styles.changePhotoText}>Alterar Foto</Text></>}
              </TouchableOpacity>
            </View>

            {/* DADOS PESSOAIS */}
            <Text style={styles.sectionTitle}>Dados Pessoais</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Nome</Text>
              <TextInput style={styles.input} value={nome} onChangeText={setNome}
                placeholder="O teu nome" placeholderTextColor={COLORS.textGray} />

              <Text style={styles.label}>Escola</Text>
              <TouchableOpacity style={styles.selector} onPress={() => openModal('escola')}>
                <Ionicons name="business-outline" size={20} color={COLORS.primary} />
                <Text style={[styles.selectorText, !escolaObj && { color: COLORS.textGray }]}>
                  {escolaObj?.nome || 'Seleciona a escola'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.textGray} />
              </TouchableOpacity>

              <Text style={styles.label}>Curso</Text>
              <TouchableOpacity style={styles.selector} onPress={() => openModal('curso')}>
                <Ionicons name="school-outline" size={20} color={COLORS.primary} />
                <Text style={[styles.selectorText, !cursoObj && { color: COLORS.textGray }]}>
                  {cursoObj?.nome || 'Seleciona o curso'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.textGray} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveDados} disabled={savingDados}>
                {savingDados ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryBtnText}>Guardar Dados</Text>}
              </TouchableOpacity>
            </View>

            {/* CONTA */}
            <Text style={styles.sectionTitle}>Conta</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail}
                keyboardType="email-address" autoCapitalize="none"
                placeholder="email@ipvc.pt" placeholderTextColor={COLORS.textGray} />
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleUpdateEmail} disabled={savingEmail}>
                {savingEmail ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.secondaryBtnText}>Atualizar Email</Text>}
              </TouchableOpacity>

              <View style={styles.hr} />

              <Text style={styles.label}>Nova Password</Text>
              <TextInput style={styles.input} value={password} onChangeText={setPassword}
                secureTextEntry placeholder="••••••••" placeholderTextColor={COLORS.textGray} />
              <Text style={styles.label}>Confirmar Password</Text>
              <TextInput style={styles.input} value={password2} onChangeText={setPassword2}
                secureTextEntry placeholder="••••••••" placeholderTextColor={COLORS.textGray} />
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleUpdatePassword} disabled={savingPass}>
                {savingPass ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.secondaryBtnText}>Alterar Password</Text>}
              </TouchableOpacity>
            </View>

            {/* ZONA PERIGOSA */}
            <Text style={[styles.sectionTitle, { color: COLORS.danger }]}>Zona Perigosa</Text>
            <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteAccount}>
              <MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.danger} />
              <Text style={styles.dangerText}>Eliminar Conta</Text>
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* MODAL ESCOLA/CURSO */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType === 'escola' ? 'Selecione a Escola' : 'Selecione o Curso'}
            </Text>
            <FlatList
              data={modalData}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalOption} onPress={() => handleSelectItem(item)}>
                  <Text style={styles.modalOptionText}>{item.nome}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCloseText}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  topTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  iconCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  scrollContent: { padding: 20, paddingBottom: 60 },

  avatarWrap: { alignItems: 'center', marginBottom: 20 },
  avatarBox: { width: 110, height: 110, borderRadius: 24, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontSize: 52, fontWeight: 'bold', color: '#000' },
  changePhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(94,252,68,0.1)', borderWidth: 1, borderColor: 'rgba(94,252,68,0.3)' },
  changePhotoText: { color: COLORS.primary, fontWeight: '600' },

  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 12, marginTop: 10 },
  card: { backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 25 },
  label: { color: COLORS.textLight, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#1E1E24', borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: 12, color: COLORS.textLight, padding: 14, fontSize: 15 },
  selector: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1E1E24', borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
  selectorText: { flex: 1, color: COLORS.textLight, fontSize: 15 },

  primaryBtn: { backgroundColor: COLORS.primary, paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  primaryBtnText: { color: '#000', fontWeight: 'bold', fontSize: 15 },
  secondaryBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 14, backgroundColor: 'rgba(94,252,68,0.08)', borderWidth: 1, borderColor: 'rgba(94,252,68,0.3)' },
  secondaryBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 15 },
  hr: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 18 },

  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 16, backgroundColor: 'rgba(255,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(255,68,68,0.3)' },
  dangerText: { color: COLORS.danger, fontSize: 16, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxHeight: '80%', backgroundColor: COLORS.modalBg, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.inputBorder },
  modalTitle: { color: COLORS.primary, fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalOption: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.inputBorder },
  modalOptionText: { color: COLORS.textLight, fontSize: 16 },
  modalCloseButton: { marginTop: 20, paddingVertical: 12, alignItems: 'center', backgroundColor: '#1E1E24', borderRadius: 10, borderWidth: 1, borderColor: COLORS.inputBorder },
  modalCloseText: { color: COLORS.textGray, fontSize: 14, fontWeight: 'bold' },
});
