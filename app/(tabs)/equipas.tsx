import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
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
  border: '#2A2A30',
  danger: '#FF4C4C'
};

// Interfaces para o TypeScript
interface Me { id: string; nome: string | null; }
interface Equipa { id: string; nome: string; codigo_convite: string; xp_total: number; avatar_url: string | null; criador_id: string; }
interface Membro { id: string; utilizador_id: string; funcao: string; utilizadores: { nome: string; nivel: number; xp_total: number; avatar_url: string | null }; }
interface Convite { id: string; equipas: { nome: string }; estado: string; }

export default function EquipasScreen() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  
  // Estados da Equipa
  const [minhaEquipa, setMinhaEquipa] = useState<Equipa | null>(null);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [minhaFuncao, setMinhaFuncao] = useState<string>('membro');
  
  // Estados sem Equipa
  const [convites, setConvites] = useState<Convite[]>([]);
  
  // Inputs de formulário
  const [inputCriarNome, setInputCriarNome] = useState('');
  const [inputAderirCodigo, setInputAderirCodigo] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: userData } = await supabase.from('utilizadores').select('id, nome').eq('id', user.id).single();
      setMe(userData);

      // Verificar se estou numa equipa
      const { data: membroData } = await supabase
        .from('equipa_membros')
        .select('equipa_id, funcao')
        .eq('utilizador_id', user.id)
        .single();

      if (membroData) {
        // JÁ TEM EQUIPA
        setMinhaFuncao(membroData.funcao);
        
        // Buscar detalhes da equipa
        const { data: equipaData } = await supabase.from('equipas').select('*').eq('id', membroData.equipa_id).single();
        setMinhaEquipa(equipaData);

        // Buscar membros
        const { data: listaMembros } = await supabase
          .from('equipa_membros')
          .select(`id, utilizador_id, funcao, utilizadores (nome, nivel, xp_total, avatar_url)`)
          .eq('equipa_id', membroData.equipa_id)
          .order('funcao', { ascending: true }); // Lider primeiro
        
        setMembros(listaMembros as any || []);
      } else {
        // NÃO TEM EQUIPA
        setMinhaEquipa(null);
        setMembros([]);
        
        // Buscar convites pendentes
        const { data: listaConvites } = await supabase
          .from('equipa_convites')
          .select(`id, estado, equipas (nome)`)
          .eq('convidado_id', user.id)
          .eq('estado', 'pendente');
          
        setConvites(listaConvites as any || []);
      }
    } catch (error) {
      console.error("Erro ao carregar equipa:", error);
    } finally {
      setLoading(false);
    }
  }

  // --- ACÇÕES: SEM EQUIPA ---

  async function criarEquipa() {
    if (!inputCriarNome.trim() || !me) return;
    setLoading(true);
    
    // Gerar código aleatório tipo GRN-X42B
    const codigo = 'GRN-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    try {
      // 1. Criar a equipa
      const { data: novaEquipa, error: erroEquipa } = await supabase
        .from('equipas')
        .insert({ nome: inputCriarNome.trim(), codigo_convite: codigo, criador_id: me.id })
        .select()
        .single();

      if (erroEquipa) throw erroEquipa;

      // 2. Adicionar-se como líder
      await supabase.from('equipa_membros').insert({ equipa_id: novaEquipa.id, utilizador_id: me.id, funcao: 'lider' });
      
      setInputCriarNome('');
      await carregarDados(); // Refresh ao ecrã
    } catch (error: any) {
      Alert.alert("Erro", "Não foi possível criar a equipa. Tenta outro nome.");
      setLoading(false);
    }
  }

  async function aderirEquipa() {
    if (!inputAderirCodigo.trim() || !me) return;
    setLoading(true);
    
    try {
      // Procurar equipa pelo código
      const { data: equipa } = await supabase.from('equipas').select('id').eq('codigo_convite', inputAderirCodigo.trim().toUpperCase()).single();
      
      if (!equipa) {
        Alert.alert("Inválido", "Código de convite não encontrado.");
        setLoading(false);
        return;
      }

      // Adicionar como membro
      await supabase.from('equipa_membros').insert({ equipa_id: equipa.id, utilizador_id: me.id, funcao: 'membro' });
      
      setInputAderirCodigo('');
      await carregarDados();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível entrar na equipa.");
      setLoading(false);
    }
  }

  async function responderConvite(conviteId: string, resposta: 'aceite' | 'rejeitado', equipaId?: string) {
    setLoading(true);
    try {
      await supabase.from('equipa_convites').update({ estado: resposta }).eq('id', conviteId);
      
      if (resposta === 'aceite' && equipaId && me) {
        await supabase.from('equipa_membros').insert({ equipa_id: equipaId, utilizador_id: me.id, funcao: 'membro' });
      }
      await carregarDados();
    } catch (error) {
      Alert.alert("Erro", "Falha ao responder ao convite.");
      setLoading(false);
    }
  }

  // --- ACÇÕES: COM EQUIPA ---

  async function sairDaEquipa() {
    if (!me || !minhaEquipa) return;
    Alert.alert("Sair da Equipa", "Tens a certeza que queres abandonar a tua equipa?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: async () => {
          setLoading(true);
          await supabase.from('equipa_membros').delete().eq('utilizador_id', me.id);
          await carregarDados();
        } 
      }
    ]);
  }

  // --- RENDERIZADORES UI ---

  if (loading && !minhaEquipa && !convites.length) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topNavbar}>
        <Text style={[styles.logoText, styles.glowText]}>GREEN LEAGUE</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {!minhaEquipa ? (
          // === ESTADO 1: SEM EQUIPA ===
          <View style={styles.section}>
            <View style={styles.headerBox}>
              <MaterialCommunityIcons name="shield-off-outline" size={40} color={COLORS.textGray} />
              <Text style={styles.title}>Sem Equipa</Text>
              <Text style={styles.subtitle}>Junta-te a uma equipa para partilharem XP e competirem nos rankings em conjunto.</Text>
            </View>

            {/* Criar Equipa */}
            <View style={styles.actionCard}>
              <Text style={styles.cardTitle}>Criar uma Equipa</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Nome da tua equipa"
                  placeholderTextColor={COLORS.textGray}
                  value={inputCriarNome}
                  onChangeText={setInputCriarNome}
                  maxLength={25}
                />
                <TouchableOpacity style={styles.btnAction} onPress={criarEquipa} disabled={loading}>
                  <Text style={styles.btnActionText}>Criar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Aderir a Equipa */}
            <View style={styles.actionCard}>
              <Text style={styles.cardTitle}>Aderir por Código</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: GRN-X42B"
                  placeholderTextColor={COLORS.textGray}
                  value={inputAderirCodigo}
                  onChangeText={setInputAderirCodigo}
                  autoCapitalize="characters"
                  maxLength={10}
                />
                <TouchableOpacity style={[styles.btnAction, { backgroundColor: COLORS.secondary }]} onPress={aderirEquipa} disabled={loading}>
                  <Text style={[styles.btnActionText, { color: '#000' }]}>Aderir</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Convites Pendentes */}
            {convites.length > 0 && (
              <View style={styles.invitesContainer}>
                <Text style={styles.sectionTitle}>Convites Recebidos</Text>
                {convites.map((convite) => (
                  <View key={convite.id} style={styles.inviteItem}>
                    <View style={styles.inviteInfo}>
                      <MaterialCommunityIcons name="email-fast-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                      <Text style={styles.inviteText}>
                        <Text style={{ fontWeight: 'bold', color: '#FFF' }}>{convite.equipas.nome}</Text> convida-te
                      </Text>
                    </View>
                    <View style={styles.inviteActions}>
                      <TouchableOpacity style={[styles.iconBtn, { backgroundColor: 'rgba(94, 252, 68, 0.2)' }]} onPress={() => responderConvite(convite.id, 'aceite', convite.id)}>
                         <MaterialCommunityIcons name="check" size={20} color={COLORS.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.iconBtn, { backgroundColor: 'rgba(255, 76, 76, 0.2)' }]} onPress={() => responderConvite(convite.id, 'rejeitado')}>
                         <MaterialCommunityIcons name="close" size={20} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          // === ESTADO 2: COM EQUIPA ===
          <View style={styles.section}>
            
            {/* Cabeçalho da Equipa */}
            <LinearGradient colors={['#1a1a1e', '#121214']} style={styles.teamHeader}>
              <View style={styles.teamCrest}>
                <Text style={styles.teamCrestText}>{minhaEquipa.nome.substring(0, 2).toUpperCase()}</Text>
              </View>
              <Text style={styles.teamName}>{minhaEquipa.nome}</Text>
              
              <View style={styles.codeContainer}>
                <Text style={styles.codeLabel}>CÓDIGO DE CONVITE</Text>
                <View style={styles.codePill}>
                  <Text style={styles.codeText}>{minhaEquipa.codigo_convite}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Lista de Membros */}
            <View style={styles.membersList}>
              <Text style={styles.sectionTitle}>Esquadrão ({membros.length})</Text>
              {membros.map((m) => {
                const isMe = m.utilizador_id === me?.id;
                return (
                  <View key={m.id} style={[styles.memberItem, isMe && styles.memberHighlight]}>
                    <View style={styles.memberAvatar}>
                      <MaterialCommunityIcons name="account" size={24} color="#000" />
                    </View>
                    <View style={styles.memberInfo}>
                      <View style={styles.memberNameRow}>
                        <Text style={styles.memberName}>{m.utilizadores?.nome || 'Jogador'}</Text>
                        {m.funcao === 'lider' && <MaterialCommunityIcons name="crown" size={16} color="#FFD700" style={{ marginLeft: 6 }} />}
                      </View>
                      <Text style={styles.memberXp}>Nível {m.utilizadores?.nivel || 1} • {m.utilizadores?.xp_total || 0} XP</Text>
                    </View>
                    {isMe && <View style={styles.badgeEu}><Text style={styles.badgeEuText}>Eu</Text></View>}
                  </View>
                );
              })}
            </View>

            {/* Zona Perigosa */}
            <View style={styles.dangerZone}>
              <TouchableOpacity style={styles.btnLeave} onPress={sairDaEquipa}>
                <MaterialCommunityIcons name="exit-run" size={20} color={COLORS.danger} style={{ marginRight: 8 }} />
                <Text style={styles.btnLeaveText}>Abandonar Equipa</Text>
              </TouchableOpacity>
            </View>

          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 100, paddingHorizontal: 20 },
  topNavbar: { paddingVertical: 15, paddingHorizontal: 20 },
  logoText: { fontSize: 22, fontWeight: '900', color: COLORS.primary, fontStyle: 'italic' },
  glowText: { textShadowColor: COLORS.primary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  
  section: { marginTop: 10 },
  
  // SEM EQUIPA
  headerBox: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
  title: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  subtitle: { color: COLORS.textGray, textAlign: 'center', fontSize: 14, marginTop: 8, paddingHorizontal: 20 },
  
  actionCard: { backgroundColor: COLORS.cardBg, padding: 16, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: '#121214', color: '#FFF', paddingHorizontal: 15, height: 46, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  btnAction: { backgroundColor: COLORS.primary, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  btnActionText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  
  invitesContainer: { marginTop: 20 },
  sectionTitle: { color: COLORS.textGray, fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 },
  inviteItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.cardBg, padding: 12, borderRadius: 16, marginBottom: 10 },
  inviteInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  inviteText: { color: COLORS.textGray, fontSize: 14 },
  inviteActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  // COM EQUIPA
  teamHeader: { alignItems: 'center', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(94, 252, 68, 0.2)', marginBottom: 25 },
  teamCrest: { width: 80, height: 80, borderRadius: 24, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  teamCrestText: { fontSize: 32, fontWeight: '900', color: '#000' },
  teamName: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  codeContainer: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  codeLabel: { color: COLORS.textGray, fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  codePill: { backgroundColor: 'rgba(94, 252, 68, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  codeText: { color: COLORS.primary, fontSize: 16, fontWeight: '900', letterSpacing: 2 },

  membersList: { marginBottom: 30 },
  memberItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, padding: 12, borderRadius: 16, marginBottom: 8 },
  memberHighlight: { borderWidth: 1, borderColor: COLORS.primary, backgroundColor: 'rgba(94, 252, 68, 0.05)' },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center' },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center' },
  memberName: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  memberXp: { color: COLORS.textGray, fontSize: 12, marginTop: 2 },
  
  badgeEu: { backgroundColor: 'rgba(94, 252, 68, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeEuText: { color: COLORS.primary, fontSize: 10, fontWeight: 'bold' },

  dangerZone: { marginTop: 10, alignItems: 'center' },
  btnLeave: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16, backgroundColor: 'rgba(255, 76, 76, 0.1)' },
  btnLeaveText: { color: COLORS.danger, fontWeight: 'bold' }
});