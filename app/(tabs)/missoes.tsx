import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const COLORS = {
  background: '#121214',
  primary: '#5EFC44',
  secondary: '#50E3C2',
  cardBg: '#1E1E24',
  textLight: '#FFFFFF',
  textGray: '#888888',
  border: '#2A2A30'
};

export default function MissoesScreen() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topNavbar}>
        <Text style={[styles.logoText, styles.glowText]}>GREEN LEAGUE</Text>
        <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="bell-outline" size={26} color={COLORS.textGray} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.pageTitle}>Missões Diárias</Text>

        <View style={styles.dailyProgressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Progresso Diário</Text>
            <Text style={styles.progressNumbers}>200 / 450 XP</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '45%', backgroundColor: COLORS.secondary }]} />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hoje</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>1 / 3</Text>
          </View>
        </View>

        <View style={styles.missionCard}>
          <View style={styles.missionIconBox}>
            <MaterialCommunityIcons name="recycle" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.missionContent}>
            <Text style={styles.missionTitle}>Reciclar 2kg de materiais</Text>
            <Text style={styles.missionDesc}>Separa e recicla diferentes tipos de materiais</Text>
            <View style={styles.missionBarBg}>
              <View style={[styles.missionBarFill, { width: '65%' }]} />
            </View>
            <Text style={styles.missionReward}>+150 XP</Text>
          </View>
        </View>

        <View style={[styles.missionCard, styles.missionCardCompleted]}>
          <View style={styles.missionIconBox}>
            <MaterialCommunityIcons name="bike" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.missionContent}>
            <Text style={styles.missionTitle}>Utilizar bicicleta - 5km</Text>
            <Text style={styles.missionDesc}>Pedala em vez de usar carro</Text>
            <View style={styles.missionBarBg}>
              <View style={[styles.missionBarFill, { width: '100%' }]} />
            </View>
            <View style={styles.rewardRow}>
              <Text style={styles.missionReward}>+200 XP</Text>
              <View style={styles.completedBadge}>
                <Text style={styles.completedText}>Completed</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.missionCard}>
          <View style={styles.missionIconBox}>
            <Ionicons name="water-outline" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.missionContent}>
            <Text style={styles.missionTitle}>Poupar 50L de água</Text>
            <Text style={styles.missionDesc}>Reduz o consumo de água no dia-a-dia</Text>
            <View style={styles.missionBarBg}>
              <View style={[styles.missionBarFill, { width: '30%' }]} />
            </View>
            <Text style={styles.missionReward}>+100 XP</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Semanais</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>0 / 2</Text>
          </View>
        </View>

        <View style={styles.missionCard}>
          <View style={styles.missionIconBox}>
            <Ionicons name="leaf-outline" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.missionContent}>
            <Text style={styles.missionTitle}>Dieta Vegetariana - 3 dias</Text>
            <Text style={styles.missionDesc}>Faz refeições sem carne durante 3 dias seguidos</Text>
            <View style={styles.missionBarBg}>
              <View style={[styles.missionBarFill, { width: '0%' }]} />
            </View>
            <Text style={styles.missionReward}>+500 XP</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 20, paddingBottom: 120 },
  
  topNavbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  logoText: { fontSize: 22, fontWeight: '900', color: COLORS.primary, letterSpacing: 0.5, fontStyle: 'italic' },
  glowText: { textShadowColor: COLORS.primary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  notificationBtn: { position: 'relative', padding: 5 },
  notificationDot: { position: 'absolute', top: 5, right: 5, width: 10, height: 10, backgroundColor: COLORS.secondary, borderRadius: 5, borderWidth: 2, borderColor: COLORS.background },

  pageTitle: { color: COLORS.primary, fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginTop: 20, marginBottom: 20 },

  dailyProgressCard: { backgroundColor: '#1A1A1E', borderRadius: 20, padding: 20, marginBottom: 30, borderWidth: 1, borderColor: '#2A2A30' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  progressTitle: { color: COLORS.textGray, fontSize: 16, fontWeight: '600' },
  progressNumbers: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold' },
  progressBarBg: { height: 10, backgroundColor: '#000', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
  sectionTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  badge: { backgroundColor: 'rgba(94, 252, 68, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(94, 252, 68, 0.3)' },
  badgeText: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold' },

  missionCard: { flexDirection: 'row', backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: COLORS.border },
  missionCardCompleted: { opacity: 0.7 },
  missionIconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(94, 252, 68, 0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1, borderColor: 'rgba(94, 252, 68, 0.2)' },
  missionContent: { flex: 1 },
  missionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  missionDesc: { color: COLORS.textGray, fontSize: 13, marginBottom: 12 },
  missionBarBg: { height: 6, backgroundColor: '#111', borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  missionBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  missionReward: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold' },
  
  rewardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  completedBadge: { backgroundColor: 'rgba(94, 252, 68, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary },
  completedText: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' }
});