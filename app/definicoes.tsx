import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView,
  TextInput, ActivityIndicator, Modal, FlatList, KeyboardAvoidingView, Platform, Switch
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../src/lib/supabase';
import { useToast } from '../components/ToastProvider';
import { useTheme } from '../components/ThemeProvider';

const BUCKET = 'avatars';

export default function SettingsScreen() {
  const router = useRouter();
  const { showToast, showConfirm } = useToast();
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

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
      showToast({ type: 'warning', title: 'Permissão necessária', message: 'Precisamos de acesso às tuas fotos para alterares o avatar.' });
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
      const publicUrl = `${pub.publicUrl}?t=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from('utilizadores').update({ avatar_url: publicUrl }).eq('id', userId);
      if (dbErr) throw dbErr;

      setAvatarUrl(publicUrl);
      showToast({ type: 'success', message: 'Foto de perfil atualizada!' });
    } catch (e: any) {
      showToast({ type: 'error', message: 'Não foi possível atualizar a foto. ' + (e?.message || '') });
    } finally {
      setUploadingFoto(false);
    }
  }

  // ---------- MODAL ESCOLA/CURSO ----------
  const openModal = (type: 'escola' | 'curso') => {
    if (type === 'curso' && !escolaObj) {
      showToast({ type: 'warning', message: 'Seleciona primeiro a escola.' });
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
    if (!nome.trim()) { showToast({ type: 'warning', message: 'O nome não pode ficar vazio.' }); return; }
    if (!escolaObj || !cursoObj) { showToast({ type: 'warning', message: 'Seleciona a escola e o curso.' }); return; }
    if (!userId) return;

    try {
      setSavingDados(true);
      const { error } = await supabase.from('utilizadores').update({
        nome: nome.trim(),
        escola_id: escolaObj.id,
        curso_id: cursoObj.id,
      }).eq('id', userId);
      if (error) throw error;
      showToast({ type: 'success', message: 'Dados atualizados!' });
    } catch (e: any) {
      showToast({ type: 'error', message: 'Não foi possível guardar. ' + (e?.message || '') });
    } finally {
      setSavingDados(false);
    }
  }

  // ---------- EMAIL ----------
  async function handleUpdateEmail() {
    const novo = email.trim().toLowerCase();
    if (!novo || !novo.includes('@')) { showToast({ type: 'warning', message: 'Introduz um email válido.' }); return; }
    try {
      setSavingEmail(true);
      const { error } = await supabase.auth.updateUser({ email: novo });
      if (error) throw error;
      showToast({ type: 'info', title: 'Confirma o teu email', message: 'Enviámos um link de confirmação. O email só muda depois de confirmares.' });
    } catch (e: any) {
      showToast({ type: 'error', message: 'Não foi possível atualizar o email. ' + (e?.message || '') });
    } finally {
      setSavingEmail(false);
    }
  }

  // ---------- PASSWORD ----------
  async function handleUpdatePassword() {
    if (password.length < 6) { showToast({ type: 'warning', message: 'A password deve ter pelo menos 6 caracteres.' }); return; }
    if (password !== password2) { showToast({ type: 'warning', message: 'As passwords não coincidem.' }); return; }
    try {
      setSavingPass(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword(''); setPassword2('');
      showToast({ type: 'success', message: 'Password alterada com sucesso!' });
    } catch (e: any) {
      showToast({ type: 'error', message: 'Não foi possível alterar a password. ' + (e?.message || '') });
    } finally {
      setSavingPass(false);
    }
  }

  // ---------- ELIMINAR CONTA ----------
  async function handleDeleteAccount() {
    const ok = await showConfirm({
      title: 'Eliminar Conta',
      message: 'Esta ação é permanente. Todos os teus dados serão apagados e não poderás recuperar a conta.',
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    try {
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      await supabase.auth.signOut();
      router.replace('/');
    } catch (e: any) {
      showToast({ type: 'error', message: 'Não foi possível eliminar a conta. ' + (e?.message || '') });
    }
  }

  if (loading) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  const modalData = modalType === 'escola' ? escolasDb : cursosDb;

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

          <View style={styles.topBar}>
            <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Definições</Text>
            <View style={{ width: 45 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* FOTO */}
            <View style={styles.avatarWrap}>
              <View style={[styles.avatarRing, { borderColor: colors.primary + '55', backgroundColor: colors.primary + '15' }]}>
                <View style={styles.avatarBox}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarImg} contentFit="cover" />
                  ) : (
                    <LinearGradient
                      colors={isDark ? ['#5EFC44', '#22C55E'] : [colors.primary, colors.secondary]}
                      style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Text style={styles.avatarText}>{nome ? nome.charAt(0).toUpperCase() : '?'}</Text>
                    </LinearGradient>
                  )}
                </View>
              </View>
              <TouchableOpacity style={styles.changePhotoBtn} onPress={handleChangePhoto} disabled={uploadingFoto}>
                {uploadingFoto
                  ? <ActivityIndicator color={colors.primary} />
                  : <><Ionicons name="camera-outline" size={18} color={colors.primary} /><Text style={styles.changePhotoText}>Alterar Foto</Text></>}
              </TouchableOpacity>
            </View>

            {/* APARÊNCIA */}
            <View style={styles.sectionHeader}>
              <Ionicons name="color-palette-outline" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Aparência</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.themeRow}>
                <Ionicons
                  name={isDark ? 'moon-outline' : 'sunny-outline'}
                  size={22}
                  color={colors.primary}
                />
                <Text style={styles.themeLabel}>Modo Claro / Modo Escuro</Text>
                <Switch
                  value={!isDark}
                  onValueChange={toggleTheme}
                  thumbColor={colors.primary}
                  trackColor={{ false: colors.inputBorder, true: colors.secondary }}
                />
              </View>
            </View>

            {/* DADOS PESSOAIS */}
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Dados Pessoais</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Nome</Text>
              <TextInput style={styles.input} value={nome} onChangeText={setNome}
                placeholder="O teu nome" placeholderTextColor={colors.placeholderText} />

              <Text style={styles.label}>Escola</Text>
              <TouchableOpacity style={styles.selector} onPress={() => openModal('escola')}>
                <Ionicons name="business-outline" size={20} color={colors.primary} />
                <Text style={[styles.selectorText, !escolaObj && { color: colors.textMuted }]}>
                  {escolaObj?.nome || 'Seleciona a escola'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <Text style={styles.label}>Curso</Text>
              <TouchableOpacity style={styles.selector} onPress={() => openModal('curso')}>
                <Ionicons name="school-outline" size={20} color={colors.primary} />
                <Text style={[styles.selectorText, !cursoObj && { color: colors.textMuted }]}>
                  {cursoObj?.nome || 'Seleciona o curso'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveDados} disabled={savingDados}>
                {savingDados ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryBtnText}>Guardar Dados</Text>}
              </TouchableOpacity>
            </View>

            {/* CONTA */}
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Conta</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail}
                keyboardType="email-address" autoCapitalize="none"
                placeholder="email@ipvc.pt" placeholderTextColor={colors.placeholderText} />
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleUpdateEmail} disabled={savingEmail}>
                {savingEmail ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.secondaryBtnText}>Atualizar Email</Text>}
              </TouchableOpacity>

              <View style={styles.hr} />

              <Text style={styles.label}>Nova Password</Text>
              <TextInput style={styles.input} value={password} onChangeText={setPassword}
                secureTextEntry placeholder="••••••••" placeholderTextColor={colors.placeholderText} />
              <Text style={styles.label}>Confirmar Password</Text>
              <TextInput style={styles.input} value={password2} onChangeText={setPassword2}
                secureTextEntry placeholder="••••••••" placeholderTextColor={colors.placeholderText} />
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleUpdatePassword} disabled={savingPass}>
                {savingPass ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.secondaryBtnText}>Alterar Password</Text>}
              </TouchableOpacity>
            </View>

            {/* ZONA PERIGOSA */}
            <View style={styles.sectionHeader}>
              <Ionicons name="warning-outline" size={16} color={colors.red} />
              <Text style={[styles.sectionTitle, { color: colors.red }]}>Zona Perigosa</Text>
            </View>
            <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteAccount}>
              <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.red} />
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

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
    topTitle: { color: c.text, fontSize: 18, fontWeight: 'bold' },
    iconCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: c.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.border },
    scrollContent: { padding: 20, paddingBottom: 60 },

    avatarWrap: { alignItems: 'center', marginBottom: 24 },
    avatarRing: { width: 118, height: 118, borderRadius: 26, padding: 4, borderWidth: 2, alignSelf: 'center', marginBottom: 0 },
    avatarBox: { width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden', backgroundColor: c.primary },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: { fontSize: 52, fontWeight: 'bold', color: '#000' },
    changePhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, backgroundColor: c.primary + '18', borderWidth: 1, borderColor: c.primary + '44' },
    changePhotoText: { color: c.primary, fontWeight: '600' },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 10 },
    sectionTitle: { color: c.text, fontSize: 16, fontWeight: 'bold' },
    card: { backgroundColor: c.card, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: c.border, marginBottom: 25 },
    label: { color: c.text, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 12 },
    input: { backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.inputBorder, borderRadius: 12, color: c.text, padding: 14, fontSize: 15 },
    selector: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.inputBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
    selectorText: { flex: 1, color: c.text, fontSize: 15 },

    themeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    themeLabel: { flex: 1, color: c.text, fontSize: 15, fontWeight: '500' },

    primaryBtn: { backgroundColor: c.primary, paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    primaryBtnText: { color: '#000', fontWeight: 'bold', fontSize: 15 },
    secondaryBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 14, backgroundColor: c.primary + '15', borderWidth: 1, borderColor: c.primary + '44' },
    secondaryBtnText: { color: c.primary, fontWeight: 'bold', fontSize: 15 },
    hr: { height: 1, backgroundColor: c.border, marginVertical: 18 },

    dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 16, backgroundColor: c.red + '15', borderWidth: 1, borderColor: c.red + '44' },
    dangerText: { color: c.red, fontSize: 16, fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { width: '100%', maxHeight: '80%', backgroundColor: c.modal, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: c.inputBorder },
    modalTitle: { color: c.primary, fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    modalOption: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: c.inputBorder },
    modalOptionText: { color: c.text, fontSize: 16 },
    modalCloseButton: { marginTop: 20, paddingVertical: 12, alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 10, borderWidth: 1, borderColor: c.inputBorder },
    modalCloseText: { color: c.textMuted, fontSize: 14, fontWeight: 'bold' },
  });
}
