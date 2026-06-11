import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/Auth';
import Dashboard from './pages/Dashboard';
import RoomPage from './pages/Room';
import ProfilePage from './pages/Profile';
import '../src/styles/globals.css';

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function PublicOnly({ children }) {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#111820',
              color: '#F0F4F8',
              border: '1px solid rgba(255,255,255,0.07)',
              fontFamily: "'DM Sans', sans-serif",
            },
            success: { iconTheme: { primary: '#00FF87', secondary: '#080C10' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<PublicOnly><AuthPage /></PublicOnly>} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/room/:id" element={<Protected><RoomPage /></Protected>} />
          <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
