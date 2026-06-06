import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('lms_user').then(u => {
      if (u) setUser(JSON.parse(u));
      setReady(true);
    });
  }, []);

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    await AsyncStorage.setItem('lms_token', data.token);
    await AsyncStorage.setItem('lms_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }

  async function register(email, username, password) {
    const data = await api.post('/auth/register', { email, username, password });
    await AsyncStorage.setItem('lms_token', data.token);
    await AsyncStorage.setItem('lms_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }

  async function logout() {
    await AsyncStorage.multiRemove(['lms_token', 'lms_user']);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
