import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, TouchableOpacity, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const COLORS = { 
  background: '#121214', 
  primary: '#5EFC44', 
  inactive: '#888888', 
  border: '#1E1E24' 
};

export default function TabsLayout() {
  const router = useRouter();

  return (
    <View style={{ flex: 1 }}>
      {/* ==========================================
          A TUA NAVBAR COM AS 5 PÁGINAS PERFEITAS
          ========================================== */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: COLORS.background,
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
            height: Platform.OS === 'ios' ? 85 : 70, 
            paddingBottom: Platform.OS === 'ios' ? 25 : 10, 
            paddingTop: 8,
            elevation: 0,
          },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.inactive,
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
          bottom: Platform.OS === 'ios' ? 100 : 85, // Fica perfeitamente acima da Navbar
          right: 20, // Colado ao lado direito
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: COLORS.primary,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: COLORS.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5,
          shadowRadius: 10,
          elevation: 8,
        }}
        onPress={() => router.push('/(tabs)/adicionar-acao')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={36} color="#000" />
      </TouchableOpacity>
    </View>
  );
}