import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Pages and components
import LandingPage from './pages/public/LandingPage';
import AdmissaoCandidato from './pages/public/AdmissaoCandidato';
import Dashboard from './pages/private/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AccessDenied403 from './pages/errors/AccessDenied403';
import NotFound404 from './pages/errors/NotFound404';

type Role = 'coordenadora_rh' | 'ti';
type Theme = 'dark' | 'light';

export default function App() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<Role>('ti'); // Default cargo is TI
  const [isInitialSessionCheckDone, setIsInitialSessionCheckDone] = useState(false);

  // Sync theme with body element
  useEffect(() => {
    if (theme === 'dark') {
      document.body.className = 'bg-[#0D0D0C] text-[#E5DFD3] antialiased';
    } else {
      document.body.className = 'bg-[#FBFBFA] text-[#0A0A0A] antialiased';
    }
  }, [theme]);

  // Auth session recovery
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setIsInitialSessionCheckDone(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setRole('ti');
        setIsInitialSessionCheckDone(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('cargo')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      if (data) {
        setRole(data.cargo as Role);
      }
    } catch (err) {
      console.error('Error fetching user profile cargo:', err);
      setRole('ti');
    } finally {
      setIsInitialSessionCheckDone(true);
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/" 
          element={
            user && isInitialSessionCheckDone ? (
              <Navigate to="/app" replace />
            ) : (
              <LandingPage theme={theme} setTheme={setTheme} />
            )
          } 
        />
        
        <Route 
          path="/admissao/:token" 
          element={<AdmissaoCandidato theme={theme} setTheme={setTheme} />} 
        />

        {/* Private Admin Routes */}
        <Route 
          path="/app" 
          element={
            <ProtectedRoute user={user} role={role} isInitialCheckDone={isInitialSessionCheckDone}>
              {role === 'coordenadora_rh' || user?.email === 'ito.thiagosilva@gmail.com' ? (
                <Navigate to="/app/dashboard" replace />
              ) : (
                <Navigate to="/app/analytics" replace />
              )}
            </ProtectedRoute>
          }
        />

        <Route 
          path="/app/dashboard" 
          element={
            <ProtectedRoute 
              user={user} 
              role={role} 
              isInitialCheckDone={isInitialSessionCheckDone} 
              allowedRoles={['coordenadora_rh']}
            >
              <Dashboard theme={theme} setTheme={setTheme} user={user} role={role} />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/app/documentos" 
          element={
            <ProtectedRoute 
              user={user} 
              role={role} 
              isInitialCheckDone={isInitialSessionCheckDone} 
              allowedRoles={['coordenadora_rh']}
            >
              <Dashboard theme={theme} setTheme={setTheme} user={user} role={role} />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/app/colaboradores" 
          element={
            <ProtectedRoute 
              user={user} 
              role={role} 
              isInitialCheckDone={isInitialSessionCheckDone} 
              allowedRoles={['coordenadora_rh']}
            >
              <Dashboard theme={theme} setTheme={setTheme} user={user} role={role} />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/app/onboarding" 
          element={
            <ProtectedRoute 
              user={user} 
              role={role} 
              isInitialCheckDone={isInitialSessionCheckDone} 
              allowedRoles={['coordenadora_rh']}
            >
              <Dashboard theme={theme} setTheme={setTheme} user={user} role={role} />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/app/beneficios" 
          element={
            <ProtectedRoute 
              user={user} 
              role={role} 
              isInitialCheckDone={isInitialSessionCheckDone} 
              allowedRoles={['coordenadora_rh']}
            >
              <Dashboard theme={theme} setTheme={setTheme} user={user} role={role} />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/app/analytics" 
          element={
            <ProtectedRoute 
              user={user} 
              role={role} 
              isInitialCheckDone={isInitialSessionCheckDone} 
              allowedRoles={['coordenadora_rh', 'ti']}
            >
              <Dashboard theme={theme} setTheme={setTheme} user={user} role={role} />
            </ProtectedRoute>
          } 
        />

        {/* Error Pages */}
        <Route path="/403" element={<AccessDenied403 theme={theme} />} />
        <Route path="*" element={<NotFound404 theme={theme} />} />
      </Routes>
    </BrowserRouter>
  );
}
