import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
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
  border: '#2A2A30'
};

export default function EquipasScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teamData, setTeamData] = useState<any>(null);

  useEffect(() => {
    fetchTeamData();
  }, []);

  async function fetchTeamData() {
    setLoading(true);
    setTimeout(() => {
      setTeamData({
        nome: "Green Warriors",
        rank: 3,
        membrosCount: 12,
        xpTotal: "45 200",
        lider: true
      });
      setLoading(false);
    }, 800);
  }

  if (loading) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topNavbar}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Equipas</Text>
        <TouchableOpacity style={styles.profileSmall}>
          <Ionicons name="person-circle" size={32} color={COLORS.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#0D2B1D', '#121214']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mainTeamCard}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.teamName}>{teamData?.nome}</Text>
              <View style={styles.teamBadges}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>Rank #{teamData?.rank}</Text>
                </View>
                <Text style={styles.memberCount}>{teamData?.membrosCount} membros</Text>
              </View>
            </View>
            {teamData?.lider && (
              <View style={styles.leaderBadge}>
                <MaterialCommunityIcons name="crown" size={16} color={COLORS.secondary} />
                <Text style={styles.leaderText}>Líder</Text>
              </View>
            )}
          </View>

          <View style={styles.xpContainer}>
            <Text style={styles.xpValue}>{teamData?.xpTotal}</Text>
            <Text style={styles.xpLabel}>XP Total</Text>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Desafios de Equipa</Text>
        </View>

        <View style={styles.challengeCard}>
          <View style={styles.challengeInfo}>
            <View style={{ flex: 1 }}>
              <Text style={styles.challengeTitle}>Reciclar 50kg em equipa</Text>
              <Text style={styles.challengeDesc}>Trabalhem juntos para reciclar</Text>
            </View>
            <Text style={styles.challengeXp}>+1000 XP</Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '68%' }]} />
            </View>
            <Text style={styles.progressText}>68% completo</Text>
          </View>
        </View>

        <View style={styles.challengeCard}>
          <View style={styles.challengeInfo}>
            <View style={{ flex: 1 }}>
              <Text style={styles.challengeTitle}>Poupar 500L de água</Text>
              <Text style={styles.challengeDesc}>Esforço coletivo de poupança</Text>
            </View>
            <Text style={styles.challengeXp}>+800 XP</Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '45%', backgroundColor: COLORS.primary }]} />
            </View>
            <Text style={styles.progressText}>45% completo</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Membros da Equipa</Text>
          <TouchableOpacity style={styles.addButton}>
             <Ionicons name="person-add-outline" size={18} color={COLORS.secondary} />
             <Text style={styles.addButtonText}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.memberItem}>
          <View style={styles.memberAvatar}>
            <Text style={styles.memberInitial}>J</Text>
          </View>
          <View style={styles.memberInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.memberName}>João Silva</Text>
              <MaterialCommunityIcons name="crown" size={16} color={COLORS.secondary} style={{ marginLeft: 6 }} />
            </View>
            <Text style={styles.memberXp}>15 450 XP</Text>
          </View>
        </View>

        <View style={styles.memberItem}>
          <View style={[styles.memberAvatar, { backgroundColor: '#333' }]}>
            <Text style={styles.memberInitial}>M</Text>
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>Maria Antónia</Text>
            <Text style={styles.memberXp}>12 100 XP</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 20, paddingBottom: 120 },
  topNavbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { color: COLORS.primary, fontSize: 24, fontWeight: 'bold' },
  profileSmall: { padding: 4 },
  mainTeamCard: { borderRadius: 24, padding: 25, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(94, 252, 68, 0.2)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  teamName: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  teamBadges: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  rankBadge: { backgroundColor: 'rgba(94, 252, 68, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary, marginRight: 10 },
  rankText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 12 },
  memberCount: { color: COLORS.textGray, fontSize: 14 },
  leaderBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(80, 227, 194, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  leaderText: { color: COLORS.secondary, fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  xpContainer: { marginTop: 30 },
  xpValue: { color: COLORS.primary, fontSize: 42, fontWeight: '900' },
  xpLabel: { color: COLORS.textGray, fontSize: 14, marginTop: -5 },
  sectionHeader: { marginBottom: 15 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  challengeCard: { backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  challengeInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  challengeTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  challengeDesc: { color: COLORS.textGray, fontSize: 13, marginTop: 2 },
  challengeXp: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },
  progressContainer: { width: '100%' },
  progressBarBg: { height: 8, backgroundColor: '#111', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.secondary, borderRadius: 4 },
  progressText: { color: COLORS.textGray, fontSize: 12, marginTop: 8 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addButtonText: { color: COLORS.secondary, fontSize: 14, fontWeight: 'bold' },
  memberItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  memberAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  memberInitial: { color: '#000', fontSize: 20, fontWeight: 'bold' },
  memberInfo: { marginLeft: 15, flex: 1 },
  memberName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  memberXp: { color: COLORS.textGray, fontSize: 13, marginTop: 2 }
});