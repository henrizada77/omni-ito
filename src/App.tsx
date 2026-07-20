import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Pages and components
import LandingPage from './pages/public/LandingPage';
import AdmissaoCandidato from './pages/public/AdmissaoCandidato';
import PesquisaSatisfacao from './pages/public/PesquisaSatisfacao';
import Ouvidoria from './pages/public/Ouvidoria';
import ProtectedRoute from './components/ProtectedRoute';
import AccessDenied403 from './pages/errors/AccessDenied403';
import NotFound404 from './pages/errors/NotFound404';

// Carregado sob demanda: o Dashboard e o recharts respondem pela maior parte do
// bundle, e o candidato que abre /admissao/:token no celular não usa nenhum dos
// dois. Importado estaticamente, ele baixava tudo isso antes de ver a ficha.
const Dashboard = lazy(() => import('./pages/private/Dashboard'));

type Role = 'coordenadora_rh' | 'ti';
type Theme = 'dark' | 'light';

// As 8 rotas privadas renderizam o mesmo Dashboard, que decide o conteúdo pelo
// activePath. A única coisa que varia entre elas é quem pode entrar.
const APP_ROUTES: { path: string; allowedRoles: Role[] }[] = [
  { path: '/app/dashboard', allowedRoles: ['coordenadora_rh'] },
  { path: '/app/documentos', allowedRoles: ['coordenadora_rh'] },
  { path: '/app/colaboradores', allowedRoles: ['coordenadora_rh'] },
  { path: '/app/onboarding', allowedRoles: ['coordenadora_rh'] },
  { path: '/app/beneficios', allowedRoles: ['coordenadora_rh'] },
  { path: '/app/ferias-aso', allowedRoles: ['coordenadora_rh'] },
  { path: '/app/avaliacoes', allowedRoles: ['coordenadora_rh'] },
  { path: '/app/cargos', allowedRoles: ['coordenadora_rh'] },
  { path: '/app/feedback', allowedRoles: ['coordenadora_rh'] },
  { path: '/app/ponto', allowedRoles: ['coordenadora_rh'] },
  { path: '/app/agenda', allowedRoles: ['coordenadora_rh'] },
  { path: '/app/analytics', allowedRoles: ['coordenadora_rh', 'ti'] }
];

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" role="status">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
        <span className="text-xs font-mono tracking-wider opacity-60">Carregando painel...</span>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<Role>('ti'); // Default cargo is TI
  const [isInitialSessionCheckDone, setIsInitialSessionCheckDone] = useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.body.className = 'dark bg-[#0D0D0C] text-[#E5DFD3] antialiased';
    } else {
      document.body.className = 'light bg-[#FBFBFA] text-[#0A0A0A] antialiased';
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

        <Route
          path="/pesquisa"
          element={<PesquisaSatisfacao theme={theme} setTheme={setTheme} />}
        />

        <Route
          path="/ouvidoria"
          element={<Ouvidoria theme={theme} setTheme={setTheme} />}
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

        {APP_ROUTES.map(({ path, allowedRoles }) => (
          <Route
            key={path}
            path={path}
            element={
              <ProtectedRoute
                user={user}
                role={role}
                isInitialCheckDone={isInitialSessionCheckDone}
                allowedRoles={allowedRoles}
              >
                <Suspense fallback={<RouteFallback />}>
                  <Dashboard theme={theme} setTheme={setTheme} user={user} role={role} />
                </Suspense>
              </ProtectedRoute>
            }
          />
        ))}

        {/* Error Pages */}
        <Route path="/403" element={<AccessDenied403 theme={theme} />} />
        <Route path="*" element={<NotFound404 theme={theme} />} />
      </Routes>
    </BrowserRouter>
  );
}
