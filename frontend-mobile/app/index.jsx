import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080C10' }}>
        <ActivityIndicator color="#00FF87" />
      </View>
    );
  }

  return <Redirect href={user ? '/dashboard' : '/login'} />;
}
