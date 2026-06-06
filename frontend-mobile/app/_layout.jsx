import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../src/context/AuthContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#0E1318' },
            headerTintColor: '#00FF87',
            headerTitleStyle: { fontWeight: '800', fontSize: 18 },
            contentStyle: { backgroundColor: '#080C10' },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="dashboard" options={{ title: 'LMS', headerShown: true }} />
          <Stack.Screen name="room/[id]" options={{ title: 'Room', headerShown: true }} />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
