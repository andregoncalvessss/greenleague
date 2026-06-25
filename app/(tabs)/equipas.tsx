import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Image, Modal } from 'react-native';
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

const LIMITE_MEMBROS = 5;
const TAMANHO_PAGINA_SUGESTOES = 4;

interface Me { id: string; nome: string | null; }
interface Equipa { id: string; nome: string; codigo_convite: string; xp_total: number; avatar_url: string | null; criador_id: string; permissao_convite: 'lider' | 'todos'; }
interface Membro { id: string; utilizador_id: string; funcao: string; utilizadores: { nome: string; nivel: number; xp_total: number; avatar_url: string | null }; }
interface Convite { id: string; equipa_id: string; estado: string; equipas: { nome: string } | null; }
interface ResultadoBusca { id: string; nome: string | null; numero_aluno: string | null; avatar_url: string | null; em_equipa: boolean; }
interface EquipaSugerida { id: string; nome: string; avatar_url: string | null; xp_total: number; num_membros: number; }
interface PedidoEntrada { id: string; utilizador_id: string; utilizadores: { nome: string | null; avatar_url: string | null; nivel: number | null; xp_total: number | null } | null; }

export default function EquipasScreen() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);

  const [minhaEquipa, setMinhaEquipa] = useState<Equipa | null>(null);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [minhaFuncao, setMinhaFuncao] = useState<string>('membro');

  const [convites, setConvites] = useState<Convite[]>([]);
  const [equipasSugeridas, setEquipasSugeridas] = useState<EquipaSugerida[]>([]);
  const [paginaSugestoes, setPaginaSugestoes] = useState(1);
  const [meusPedidos, setMeusPedidos] = useState<Set<string>>(new Set());
  const [pedidosRecebidos, setPedidosRecebidos] = useState<PedidoEntrada[]>([]);
  const [aPedirEntrada, setAPedirEntrada] = useState<string | null>(null);

  const [inputCriarNome, setInputCriarNome] = useState('');
  const [inputAderirCodigo, setInputAderirCodigo] = useState('');

  const [termoBusca, setTermoBusca] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [aProcurar, setAProcurar] = useState(false);
  const [aConvidar, setAConvidar] = useState<string | null>(null);
  const buscaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Estados do Modal de Transferência de Líder
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  const souLider = minhaFuncao === 'lider';
  const podeConvidar = !!minhaEquipa && (minhaEquipa.permissao_convite === 'todos' || souLider);
  const equipaCheia = membros.length >= LIMITE_MEMBROS;

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

      const { data: membroData } = await supabase
        .from('equipa_membros')
        .select('equipa_id, funcao')
        .eq('utilizador_id', user.id)
        .maybeSingle();

      if (membroData) {
        // === COM EQUIPA ===
        setMinhaFuncao(membroData.funcao);

        const { data: equipaData } = await supabase.from('equipas').select('*').eq('id', membroData.equipa_id).single();
        setMinhaEquipa(equipaData as Equipa);

        const { data: listaMembros } = await supabase
          .from('equipa_membros')
          .select(`id, utilizador_id, funcao, utilizadores (nome, nivel, xp_total, avatar_url)`)
          .eq('equipa_id', membroData.equipa_id)
          .order('funcao', { ascending: true });
        setMembros((listaMembros as any) || []);

        const permite = equipaData?.permissao_convite === 'todos' || membroData.funcao === 'lider';
        if (permite) {
          const { data: pedidos } = await supabase
            .from('equipa_pedidos')
            .select(`id, utilizador_id, utilizadores (nome, avatar_url, nivel, xp_total)`)
            .eq('equipa_id', membroData.equipa_id)
            .eq('estado', 'pendente');
          setPedidosRecebidos((pedidos as any) || []);
        } else {
          setPedidosRecebidos([]);
        }

        setConvites([]);
        setEquipasSugeridas([]);
        setMeusPedidos(new Set());
      } else {
        // === SEM EQUIPA ===
        setMinhaEquipa(null);
        setMembros([]);
        setPedidosRecebidos([]);

        const { data: listaConvites } = await supabase
          .from('equipa_convites')
          .select(`id, equipa_id, estado, equipas (nome)`)
          .eq('convidado_id', user.id)
          .eq('estado', 'pendente');
        setConvites((listaConvites as any) || []);

        // Buscar top 20 equipas para paginação local
        const { data: teams } = await supabase
          .from('equipas')
          .select('id, nome, avatar_url, xp_total')
          .order('xp_total', { ascending: false })
          .limit(20);
        const lista = (teams ?? []) as { id: string; nome: string; avatar_url: string | null; xp_total: number }[];

        const ids = lista.map((t) => t.id);
        const counts: Record<string, number> = {};
        if (ids.length > 0) {
          const { data: mem } = await supabase.from('equipa_membros').select('equipa_id').in('equipa_id', ids);
          (mem ?? []).forEach((m: any) => { counts[m.equipa_id] = (counts[m.equipa_id] || 0) + 1; });
        }

        const { data: pend } = await supabase
          .from('equipa_pedidos')
          .select('equipa_id')
          .eq('utilizador_id', user.id)
          .eq('estado', 'pendente');
        setMeusPedidos(new Set((pend ?? []).map((p: any) => p.equipa_id)));

        // Filtrar equipas que já estão cheias para não sugerir
        const sugeridasFiltradas = lista
          .map((t) => ({ ...t, num_membros: counts[t.id] || 0 }))
          .filter(t => t.num_membros < LIMITE_MEMBROS);

        setEquipasSugeridas(sugeridasFiltradas);
        setPaginaSugestoes(1);
      }
    } catch (error) {
      console.error('Erro ao carregar equipa:', error);
    } finally {
      setLoading(false);
    }
  }

  // --- TRATAMENTO DE ERROS DO TRIGGER ---
  function handleErrorEquipaCheia(error: any) {
    if (error?.message?.includes('EQUIPA_CHEIA')) {
      Alert.alert('Equipa Cheia', `O limite é de ${LIMITE_MEMBROS} membros por equipa.`);
      return true;
    }
    return false;
  }

  // --- ACÕES SEM EQUIPA ---

  async function criarEquipa() {
    if (!inputCriarNome.trim() || !me) return;
    setLoading(true);
    const codigo = 'GRN-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    try {
      const { data: novaEquipa, error: erroEquipa } = await supabase
        .from('equipas')
        .insert({ nome: inputCriarNome.trim(), codigo_convite: codigo, criador_id: me.id, permissao_convite: 'lider' })
        .select()
        .single();
      if (erroEquipa) throw erroEquipa;
      await supabase.from('equipa_membros').insert({ equipa_id: novaEquipa.id, utilizador_id: me.id, funcao: 'lider' });
      setInputCriarNome('');
      await carregarDados();
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível criar a equipa. Tenta outro nome.');
      setLoading(false);
    }
  }

  async function aderirEquipa() {
    if (!inputAderirCodigo.trim() || !me) return;
    setLoading(true);
    try {
      const { data: equipa } = await supabase.from('equipas').select('id').eq('codigo_convite', inputAderirCodigo.trim().toUpperCase()).single();
      if (!equipa) {
        Alert.alert('Inválido', 'Código de convite não encontrado.');
        setLoading(false);
        return;
      }
      const { error } = await supabase.from('equipa_membros').insert({ equipa_id: equipa.id, utilizador_id: me.id, funcao: 'membro' });
      if (error) {
        if (!handleErrorEquipaCheia(error)) {
          Alert.alert('Falha', 'Não foi possível aderir (podes já ter uma equipa).');
        }
        setLoading(false);
        return;
      }
      setInputAderirCodigo('');
      await carregarDados();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível entrar na equipa.');
      setLoading(false);
    }
  }

  async function responderConvite(conviteId: string, resposta: 'aceite' | 'rejeitado', equipaId: string) {
    setLoading(true);
    try {
      if (resposta === 'rejeitado') {
        await supabase.from('equipa_convites').update({ estado: 'rejeitado' }).eq('id', conviteId);
        await carregarDados();
        return;
      }
      if (!me) return;
      const { error } = await supabase.from('equipa_membros').insert({ equipa_id: equipaId, utilizador_id: me.id, funcao: 'membro' });
      if (error) {
        if (handleErrorEquipaCheia(error)) {
           await supabase.from('equipa_convites').update({ estado: 'expirado' }).eq('id', conviteId);
        } else {
           Alert.alert('Erro', 'Não foi possível aceitar.');
        }
        await carregarDados();
        return;
      }
      await supabase.from('equipa_convites').update({ estado: 'aceite' }).eq('id', conviteId);
      await carregarDados();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao responder ao convite.');
      setLoading(false);
    }
  }

  async function pedirParaEntrar(equipa: EquipaSugerida) {
    if (!me) return;
    setAPedirEntrada(equipa.id);
    try {
      const { data: existe } = await supabase.from('equipa_pedidos').select('id').eq('equipa_id', equipa.id).eq('utilizador_id', me.id).eq('estado', 'pendente').maybeSingle();
      if (existe) {
        setMeusPedidos((prev) => new Set(prev).add(equipa.id));
        return;
      }
      const { error } = await supabase.from('equipa_pedidos').insert({ equipa_id: equipa.id, utilizador_id: me.id, estado: 'pendente' });
      if (error) throw error;
      setMeusPedidos((prev) => new Set(prev).add(equipa.id));
      Alert.alert('Pedido enviado!', `Pediste para entrar em ${equipa.nome}.`);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar o pedido.');
    } finally {
      setAPedirEntrada(null);
    }
  }

  // --- ACÕES COM EQUIPA ---

  async function responderPedido(pedidoId: string, utilizadorId: string, resposta: 'aceite' | 'rejeitado') {
    if (!minhaEquipa) return;
    
    if (resposta === 'aceite' && equipaCheia) {
       Alert.alert('Equipa Cheia', `Já atingiste o limite de ${LIMITE_MEMBROS} membros.`);
       return;
    }

    setLoading(true);
    try {
      if (resposta === 'rejeitado') {
        await supabase.from('equipa_pedidos').update({ estado: 'rejeitado' }).eq('id', pedidoId);
        await carregarDados();
        return;
      }
      
      const { error } = await supabase.from('equipa_membros').insert({ equipa_id: minhaEquipa.id, utilizador_id: utilizadorId, funcao: 'membro' });
      if (error) {
        if (!handleErrorEquipaCheia(error)) {
           Alert.alert('Indisponível', 'Este jogador entretanto já entrou noutra equipa.');
        }
        await supabase.from('equipa_pedidos').update({ estado: 'expirado' }).eq('id', pedidoId);
        await carregarDados();
        return;
      }
      await supabase.from('equipa_pedidos').update({ estado: 'aceite' }).eq('id', pedidoId);
      await carregarDados();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao responder ao pedido.');
      setLoading(false);
    }
  }

  function onChangeBusca(texto: string) {
    setTermoBusca(texto);
    if (buscaTimer.current) clearTimeout(buscaTimer.current);
    if (texto.trim().length < 2) { setResultados([]); return; }
    buscaTimer.current = setTimeout(() => procurarJogadores(texto.trim()), 350);
  }

  async function procurarJogadores(termo: string) {
    if (!minhaEquipa) return;
    setAProcurar(true);
    try {
      const padrao = `%${termo}%`;
      const { data, error } = await supabase
        .from('utilizadores')
        .select('id, nome, numero_aluno, avatar_url')
        .or(`nome.ilike.${padrao},numero_aluno.ilike.${padrao},email.ilike.${padrao}`)
        .neq('id', me?.id ?? '')
        .limit(10);
      if (error) throw error;
      const lista = (data ?? []) as { id: string; nome: string | null; numero_aluno: string | null; avatar_url: string | null }[];

      const ids = lista.map((u) => u.id);
      let emEquipa = new Set<string>();
      if (ids.length > 0) {
        const { data: membrosExistentes } = await supabase.from('equipa_membros').select('utilizador_id').in('utilizador_id', ids);
        emEquipa = new Set((membrosExistentes ?? []).map((m: any) => m.utilizador_id));
      }
      setResultados(lista.map((u) => ({ ...u, em_equipa: emEquipa.has(u.id) })));
    } catch (error) {
      console.error('Erro na procura:', error);
      setResultados([]);
    } finally {
      setAProcurar(false);
    }
  }

  async function convidarJogador(jogador: ResultadoBusca) {
    if (!minhaEquipa) return;
    if (equipaCheia) {
      Alert.alert('Equipa Cheia', `Não podes convidar, limite de ${LIMITE_MEMBROS} atingido.`);
      return;
    }
    if (jogador.em_equipa) {
      Alert.alert('Impossível convidar', 'Este jogador já pertence a uma equipa.');
      return;
    }
    setAConvidar(jogador.id);
    try {
      const { data: jaConvidado } = await supabase.from('equipa_convites').select('id').eq('equipa_id', minhaEquipa.id).eq('convidado_id', jogador.id).eq('estado', 'pendente').maybeSingle();
      if (jaConvidado) {
        Alert.alert('Já convidado', 'Já existe um convite pendente para este jogador.');
        return;
      }
      const { error } = await supabase.from('equipa_convites').insert({ equipa_id: minhaEquipa.id, convidado_id: jogador.id, estado: 'pendente' });
      if (error) throw error;
      Alert.alert('Convite enviado!', `${jogador.nome ?? 'O jogador'} recebeu o teu convite.`);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar o convite.');
    } finally {
      setAConvidar(null);
    }
  }

  async function alterarPermissao(novo: 'lider' | 'todos') {
    if (!minhaEquipa || !souLider || novo === minhaEquipa.permissao_convite) return;
    const anterior = minhaEquipa;
    setMinhaEquipa({ ...minhaEquipa, permissao_convite: novo });
    const { error } = await supabase.from('equipas').update({ permissao_convite: novo }).eq('id', minhaEquipa.id);
    if (error) {
      setMinhaEquipa(anterior);
      Alert.alert('Erro', 'Não foi possível alterar a permissão.');
    }
  }

  // --- LÓGICA DE SAÍDA / ELIMINAÇÃO / TRANSFERÊNCIA ---

  function pressSairOuEliminar() {
    if (!me || !minhaEquipa) return;

    if (membros.length === 1) {
      // É o único membro, eliminar equipa inteira
      Alert.alert('Eliminar Equipa', 'És o único membro. A equipa será eliminada para sempre.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: eliminarEquipa }
      ]);
    } else if (souLider) {
      // Líder com mais membros -> Precisa passar a liderança
      setShowTransferModal(true);
    } else {
      // Membro normal, apenas abandona
      Alert.alert('Sair da Equipa', 'Tens a certeza que queres abandonar a tua equipa?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: abandonarNormal }
      ]);
    }
  }

  async function eliminarEquipa() {
    setLoading(true);
    await supabase.from('equipas').delete().eq('id', minhaEquipa!.id);
    await carregarDados();
  }

  async function abandonarNormal() {
    setLoading(true);
    await supabase.from('equipa_membros').delete().eq('utilizador_id', me!.id);
    await carregarDados();
  }

  async function transferirESair(novoLiderId: string) {
    setSubmittingTransfer(true);
    try {
      // 1. Promove o novo líder
      await supabase.from('equipa_membros').update({ funcao: 'lider' }).eq('equipa_id', minhaEquipa!.id).eq('utilizador_id', novoLiderId);
      // 2. Apaga-se a si próprio
      await supabase.from('equipa_membros').delete().eq('utilizador_id', me!.id);
      
      setShowTransferModal(false);
      await carregarDados();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível transferir a liderança.');
    } finally {
      setSubmittingTransfer(false);
    }
  }

  // --- UI ---

  if (loading && !minhaEquipa && !convites.length && !equipasSugeridas.length) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const sugestoesVisiveis = equipasSugeridas.slice(0, paginaSugestoes * TAMANHO_PAGINA_SUGESTOES);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topNavbar}>
        <Text style={[styles.logoText, styles.glowText]}>GREEN LEAGUE</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {!minhaEquipa ? (
          // === SEM EQUIPA ===
          <View style={styles.section}>
            <View style={styles.headerBox}>
              <MaterialCommunityIcons name="shield-off-outline" size={40} color={COLORS.textGray} />
              <Text style={styles.title}>Sem Equipa</Text>
              <Text style={styles.subtitle}>Junta-te a uma equipa para partilharem XP e competirem nos rankings em conjunto.</Text>
            </View>

            {/* Convites recebidos */}
            {convites.length > 0 && (
              <View style={styles.invitesContainer}>
                <Text style={styles.sectionTitle}>Convites Recebidos</Text>
                {convites.map((convite) => (
                  <View key={convite.id} style={styles.inviteItem}>
                    <View style={styles.inviteInfo}>
                      <MaterialCommunityIcons name="email-fast-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                      <Text style={styles.inviteText}>
                        <Text style={{ fontWeight: 'bold', color: '#FFF' }}>{convite.equipas?.nome ?? 'Uma equipa'}</Text> convida-te
                      </Text>
                    </View>
                    <View style={styles.inviteActions}>
                      <TouchableOpacity style={[styles.iconBtn, { backgroundColor: 'rgba(94, 252, 68, 0.2)' }]} onPress={() => responderConvite(convite.id, 'aceite', convite.equipa_id)}>
                        <MaterialCommunityIcons name="check" size={20} color={COLORS.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.iconBtn, { backgroundColor: 'rgba(255, 76, 76, 0.2)' }]} onPress={() => responderConvite(convite.id, 'rejeitado', convite.equipa_id)}>
                        <MaterialCommunityIcons name="close" size={20} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Criar */}
            <View style={styles.actionCard}>
              <Text style={styles.cardTitle}>Criar uma Equipa</Text>
              <View style={styles.inputRow}>
                <TextInput style={styles.input} placeholder="Nome da tua equipa" placeholderTextColor={COLORS.textGray} value={inputCriarNome} onChangeText={setInputCriarNome} maxLength={25} />
                <TouchableOpacity style={styles.btnAction} onPress={criarEquipa} disabled={loading}>
                  <Text style={styles.btnActionText}>Criar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Aderir por código */}
            <View style={styles.actionCard}>
              <Text style={styles.cardTitle}>Aderir por Código</Text>
              <View style={styles.inputRow}>
                <TextInput style={styles.input} placeholder="Ex: GRN-X42B" placeholderTextColor={COLORS.textGray} value={inputAderirCodigo} onChangeText={setInputAderirCodigo} autoCapitalize="characters" maxLength={10} />
                <TouchableOpacity style={[styles.btnAction, { backgroundColor: COLORS.secondary }]} onPress={aderirEquipa} disabled={loading}>
                  <Text style={[styles.btnActionText, { color: '#000' }]}>Aderir</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Equipas sugeridas c/ Paginação */}
            {equipasSugeridas.length > 0 && (
              <View style={styles.invitesContainer}>
                <Text style={styles.sectionTitle}>Equipas Sugeridas</Text>
                {sugestoesVisiveis.map((eq) => {
                  const jaPedido = meusPedidos.has(eq.id);
                  return (
                    <View key={eq.id} style={styles.suggestItem}>
                      <View style={styles.suggestCrest}>
                        {eq.avatar_url ? (
                          <Image source={{ uri: eq.avatar_url }} style={styles.suggestCrestImg} />
                        ) : (
                          <Text style={styles.suggestCrestText}>{eq.nome.substring(0, 2).toUpperCase()}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestName} numberOfLines={1}>{eq.nome}</Text>
                        <Text style={styles.suggestSub}>{eq.num_membros}/{LIMITE_MEMBROS} membros • {eq.xp_total} XP</Text>
                      </View>
                      {jaPedido ? (
                        <View style={styles.pedidoTag}><Text style={styles.pedidoTagText}>Pedido enviado</Text></View>
                      ) : (
                        <TouchableOpacity style={styles.btnPedir} onPress={() => pedirParaEntrar(eq)} disabled={aPedirEntrada === eq.id}>
                          {aPedirEntrada === eq.id ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.btnPedirText}>Pedir</Text>}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
                
                {/* Botão de Ver Mais */}
                {sugestoesVisiveis.length < equipasSugeridas.length && (
                  <TouchableOpacity style={styles.btnVerMais} onPress={() => setPaginaSugestoes(prev => prev + 1)}>
                    <Text style={styles.btnVerMaisText}>Mostrar Mais</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ) : (
          // === COM EQUIPA ===
          <View style={styles.section}>
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

            {/* Pedidos para entrar */}
            {podeConvidar && pedidosRecebidos.length > 0 && (
              <View style={styles.actionCard}>
                <Text style={styles.cardTitle}>Pedidos para Entrar ({pedidosRecebidos.length})</Text>
                {pedidosRecebidos.map((p) => (
                  <View key={p.id} style={styles.resultRow}>
                    <View style={styles.resultAvatar}>
                      {p.utilizadores?.avatar_url ? (
                        <Image source={{ uri: p.utilizadores.avatar_url }} style={styles.resultAvatarImg} />
                      ) : (
                        <Text style={styles.resultAvatarText}>{(p.utilizadores?.nome ?? '?').charAt(0).toUpperCase()}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName} numberOfLines={1}>{p.utilizadores?.nome ?? 'Jogador'}</Text>
                      <Text style={styles.resultSub}>Nível {p.utilizadores?.nivel ?? 1} • {p.utilizadores?.xp_total ?? 0} XP</Text>
                    </View>
                    <View style={styles.inviteActions}>
                      <TouchableOpacity style={[styles.iconBtn, { backgroundColor: equipaCheia ? COLORS.border : 'rgba(94, 252, 68, 0.2)' }]} onPress={() => responderPedido(p.id, p.utilizador_id, 'aceite')} disabled={equipaCheia}>
                        <MaterialCommunityIcons name="check" size={20} color={equipaCheia ? COLORS.textGray : COLORS.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.iconBtn, { backgroundColor: 'rgba(255, 76, 76, 0.2)' }]} onPress={() => responderPedido(p.id, p.utilizador_id, 'rejeitado')}>
                        <MaterialCommunityIcons name="close" size={20} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                {equipaCheia && <Text style={styles.fullWarning}>Não podes aceitar mais pedidos, a equipa está cheia.</Text>}
              </View>
            )}

            {/* Convidar jogadores */}
            {podeConvidar ? (
              <View style={styles.actionCard}>
                <Text style={styles.cardTitle}>Convidar Jogadores</Text>
                {equipaCheia ? (
                   <View style={styles.fullBox}><Text style={styles.fullBoxText}>A tua equipa atingiu o limite de {LIMITE_MEMBROS} membros. Já não podes convidar mais ninguém.</Text></View>
                ) : (
                  <>
                    <View style={styles.searchRow}>
                      <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textGray} />
                      <TextInput style={styles.searchInput} placeholder="Nome, nº de aluno ou email" placeholderTextColor={COLORS.textGray} value={termoBusca} onChangeText={onChangeBusca} autoCapitalize="none" />
                      {aProcurar && <ActivityIndicator color={COLORS.primary} />}
                    </View>
                    {termoBusca.trim().length >= 2 && resultados.length === 0 && !aProcurar && (
                      <Text style={styles.searchHint}>Nenhum jogador encontrado.</Text>
                    )}
                    {resultados.map((jog) => (
                      <View key={jog.id} style={styles.resultRow}>
                        <View style={styles.resultAvatar}>
                          {jog.avatar_url ? (
                            <Image source={{ uri: jog.avatar_url }} style={styles.resultAvatarImg} />
                          ) : (
                            <Text style={styles.resultAvatarText}>{(jog.nome ?? '?').charAt(0).toUpperCase()}</Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.resultName} numberOfLines={1}>{jog.nome ?? 'Jogador'}</Text>
                          {jog.numero_aluno ? <Text style={styles.resultSub}>Nº {jog.numero_aluno}</Text> : null}
                        </View>
                        {jog.em_equipa ? (
                          <View style={styles.jaEquipaTag}><Text style={styles.jaEquipaText}>Já tem equipa</Text></View>
                        ) : (
                          <TouchableOpacity style={styles.btnConvidar} onPress={() => convidarJogador(jog)} disabled={aConvidar === jog.id}>
                            {aConvidar === jog.id ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.btnConvidarText}>Convidar</Text>}
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </>
                )}
              </View>
            ) : (
              <View style={styles.actionCard}>
                <Text style={styles.permInfo}>Só o líder pode convidar jogadores e gerir pedidos nesta equipa.</Text>
              </View>
            )}

            {/* Permissões (só o líder) */}
            {souLider && (
              <View style={styles.actionCard}>
                <Text style={styles.cardTitle}>Quem pode convidar</Text>
                <View style={styles.permRow}>
                  <TouchableOpacity style={[styles.permOption, minhaEquipa.permissao_convite === 'lider' && styles.permOptionActive]} onPress={() => alterarPermissao('lider')}>
                    <Text style={[styles.permOptionText, minhaEquipa.permissao_convite === 'lider' && styles.permOptionTextActive]}>Só o líder</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.permOption, minhaEquipa.permissao_convite === 'todos' && styles.permOptionActive]} onPress={() => alterarPermissao('todos')}>
                    <Text style={[styles.permOptionText, minhaEquipa.permissao_convite === 'todos' && styles.permOptionTextActive]}>Qualquer membro</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Membros */}
            <View style={styles.membersList}>
              <Text style={styles.sectionTitle}>Esquadrão ({membros.length}/{LIMITE_MEMBROS})</Text>
              {membros.map((m) => {
                const isMe = m.utilizador_id === me?.id;
                return (
                  <View key={m.id} style={[styles.memberItem, isMe && styles.memberHighlight]}>
                    <View style={styles.memberAvatar}>
                      {m.utilizadores?.avatar_url ? (
                        <Image source={{ uri: m.utilizadores.avatar_url }} style={styles.memberAvatarImg} />
                      ) : (
                        <MaterialCommunityIcons name="account" size={24} color="#000" />
                      )}
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

            {/* Zona Perigosa - Eliminar / Abandonar */}
            <View style={styles.dangerZone}>
              <TouchableOpacity style={styles.btnLeave} onPress={pressSairOuEliminar}>
                {membros.length === 1 ? (
                   <>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.danger} style={{ marginRight: 8 }} />
                    <Text style={styles.btnLeaveText}>Eliminar Equipa</Text>
                   </>
                ) : (
                   <>
                    <MaterialCommunityIcons name="exit-run" size={20} color={COLORS.danger} style={{ marginRight: 8 }} />
                    <Text style={styles.btnLeaveText}>Abandonar Equipa</Text>
                   </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal: Transferir Liderança */}
      <Modal visible={showTransferModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Escolher novo líder</Text>
            <Text style={styles.modalSub}>Como és o líder, tens de passar a coroa a alguém antes de abandonares a equipa.</Text>
            
            <ScrollView style={styles.modalScroll}>
              {membros.filter(m => m.utilizador_id !== me?.id).map((m) => (
                <TouchableOpacity key={m.id} style={styles.modalMember} onPress={() => transferirESair(m.utilizador_id)} disabled={submittingTransfer}>
                  <View style={styles.memberAvatar}>
                      {m.utilizadores?.avatar_url ? (
                        <Image source={{ uri: m.utilizadores.avatar_url }} style={styles.memberAvatarImg} />
                      ) : (
                        <MaterialCommunityIcons name="account" size={24} color="#000" />
                      )}
                  </View>
                  <Text style={styles.modalMemberName}>{m.utilizadores?.nome || 'Jogador'}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textGray} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowTransferModal(false)} disabled={submittingTransfer}>
               <Text style={styles.modalBtnCancelText}>Cancelar saída</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

  headerBox: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
  title: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  subtitle: { color: COLORS.textGray, textAlign: 'center', fontSize: 14, marginTop: 8, paddingHorizontal: 20 },

  actionCard: { backgroundColor: COLORS.cardBg, padding: 16, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: '#121214', color: '#FFF', paddingHorizontal: 15, height: 46, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  btnAction: { backgroundColor: COLORS.primary, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  btnActionText: { color: '#000', fontWeight: 'bold', fontSize: 14 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#121214', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, height: 46 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14 },
  searchHint: { color: COLORS.textGray, fontSize: 13, marginTop: 12 },
  resultRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 12 },
  resultAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  resultAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  resultAvatarText: { color: '#000', fontWeight: '900', fontSize: 16 },
  resultName: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  resultSub: { color: COLORS.textGray, fontSize: 12, marginTop: 2 },
  btnConvidar: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, minWidth: 84, alignItems: 'center' },
  btnConvidarText: { color: '#000', fontWeight: 'bold', fontSize: 13 },
  jaEquipaTag: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  jaEquipaText: { color: COLORS.textGray, fontSize: 11, fontWeight: 'bold' },
  permInfo: { color: COLORS.textGray, fontSize: 13 },
  fullWarning: { color: COLORS.danger, fontSize: 12, marginTop: 12 },
  fullBox: { backgroundColor: 'rgba(255, 76, 76, 0.1)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 76, 76, 0.3)' },
  fullBoxText: { color: '#FFF', fontSize: 13 },

  permRow: { flexDirection: 'row', gap: 10 },
  permOption: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: '#121214' },
  permOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  permOptionText: { color: COLORS.textGray, fontWeight: 'bold', fontSize: 13 },
  permOptionTextActive: { color: '#000' },

  invitesContainer: { marginBottom: 20 },
  sectionTitle: { color: COLORS.textGray, fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 },
  inviteItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.cardBg, padding: 12, borderRadius: 16, marginBottom: 10 },
  inviteInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  inviteText: { color: COLORS.textGray, fontSize: 14 },
  inviteActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  suggestItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, padding: 12, borderRadius: 16, marginBottom: 10, gap: 12 },
  suggestCrest: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  suggestCrestImg: { width: 44, height: 44, borderRadius: 14 },
  suggestCrestText: { color: '#000', fontWeight: '900', fontSize: 16 },
  suggestName: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  suggestSub: { color: COLORS.textGray, fontSize: 12, marginTop: 2 },
  btnPedir: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, minWidth: 72, alignItems: 'center' },
  btnPedirText: { color: '#000', fontWeight: 'bold', fontSize: 13 },
  pedidoTag: { backgroundColor: 'rgba(94, 252, 68, 0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  pedidoTagText: { color: COLORS.primary, fontSize: 11, fontWeight: 'bold' },
  btnVerMais: { backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  btnVerMaisText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },

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
  memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  memberAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center' },
  memberName: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  memberXp: { color: COLORS.textGray, fontSize: 12, marginTop: 2 },

  badgeEu: { backgroundColor: 'rgba(94, 252, 68, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeEuText: { color: COLORS.primary, fontSize: 10, fontWeight: 'bold' },

  dangerZone: { marginTop: 10, alignItems: 'center' },
  btnLeave: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16, backgroundColor: 'rgba(255, 76, 76, 0.1)' },
  btnLeaveText: { color: COLORS.danger, fontWeight: 'bold' },

  // Modal Novo Lider
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.cardBg, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: COLORS.border, maxHeight: '80%' },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  modalSub: { color: COLORS.textGray, fontSize: 14, textAlign: 'center', marginBottom: 20 },
  modalScroll: { marginBottom: 20 },
  modalMember: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#121214', padding: 12, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  modalMemberName: { color: '#FFF', fontSize: 15, fontWeight: 'bold', flex: 1, marginLeft: 12 },
  modalBtnCancel: { paddingVertical: 14, alignItems: 'center' },
  modalBtnCancelText: { color: COLORS.textGray, fontWeight: 'bold', fontSize: 15 }
});