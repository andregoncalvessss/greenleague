import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, TouchableOpacity, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../components/ThemeProvider';

export default function TabsLayout() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      {/* ==========================================
          A TUA NAVBAR COM AS 5 PÁGINAS PERFEITAS
          ========================================== */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            height: Platform.OS === 'ios' ? 85 : 70, 
            paddingBottom: Platform.OS === 'ios' ? 25 : 10, 
            paddingTop: 8,
            elevation: 0,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 10, 
            fontWeight: '600',
            marginTop: 4,
          }
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="missoes"
          options={{
            title: 'Missões',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="bullseye" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ranking"
          options={{
            title: 'Ranking',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "trophy" : "trophy-outline"} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="equipas"
          options={{
            title: 'Equipas',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "people" : "people-outline"} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
            ),
          }}
        />
        
        {/* Escondemos a página de Adicionar Ação da barra inferior (o botão trata disso) */}
        <Tabs.Screen
          name="adicionar-acao"
          options={{ href: null }} 
        />
      </Tabs>

      {/* ==========================================
          O TEU BOTÃO "+" FLUTUANTE (Igual ao teu 1º design!)
          ========================================== */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 100 : 85,
          right: 20,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.55 : 0.35,
          shadowRadius: 18,
          elevation: 14,
        }}
        onPress={() => router.push('/(tabs)/adicionar-acao')}
        activeOpacity={0.85}
      >
        {/* Anel exterior subtil */}
        <View style={{
          width: 68, height: 68, borderRadius: 34,
          padding: 4,
          backgroundColor: isDark ? 'rgba(94,252,68,0.18)' : 'rgba(21,128,61,0.12)',
          justifyContent: 'center', alignItems: 'center',
        }}>
          <LinearGradient
            colors={isDark ? ['#5EFC44', '#22C55E', '#50E3C2'] : [colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 60, height: 60, borderRadius: 30,
              justifyContent: 'center', alignItems: 'center',
              borderWidth: 1.5,
              borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)',
            }}
          >
            <Ionicons name="add" size={34} color={isDark ? '#000' : '#FFF'} />
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </View>
  );
}