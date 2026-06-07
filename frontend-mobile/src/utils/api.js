import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ Change this to your deployed backend URL before building
export const API_BASE = __DEV__
  ? 'http://localhost:3001/api'   // local dev
  : 'https://your-api-domain.com/api';  // production

export const COLORS = {
  bgPrimary: '#080C10',
  bgSecondary: '#0E1318',
  bgCard: '#111820',
  border: 'rgba(255,255,255,0.07)',
  borderActive: 'rgba(0,255,135,0.3)',
  accent: '#00FF87',
  accentDim: 'rgba(0,255,135,0.15)',
  yellow: '#FFD700',
  red: '#FF3B3B',
  textPrimary: '#F0F4F8',
  textSecondary: '#7A8C99',
  textMuted: '#445566',
};

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('lms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/')) {
      await AsyncStorage.multiRemove(['lms_token', 'lms_user']);
    }
    return Promise.reject(err.response?.data?.error || err.message);
  }
);

export default api;
