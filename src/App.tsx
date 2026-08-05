import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Pages and components
import LandingPage from './pages/public/LandingPage';
import AdmissaoCandidato from './pages/public/AdmissaoCandidato';
import PesquisaSatisfacao from './pages/public/PesquisaSatisfacao';
import Ouvidoria from './pages/public/Ouvidoria';
import SolicitarVaga from './pages/public/SolicitarVaga';
import TesteComportamental from './pages/public/TesteComportamental';
import FuncionarioMes from './pages/public/FuncionarioMes';
import PulseSemanal from './pages/public/PulseSemanal';
import ManualCultura from './pages/public/ManualCultura';
import EntrevistaDesligamento from './pages/public/EntrevistaDesligamento';
import RedefinirSenha from './pages/public/RedefinirSenha';
import ProtectedRoute from './components/ProtectedRoute';
import CommandPalette from './components/common/CommandPalette';
import ErrorBoundary from './components/common/ErrorBoundary';
import AccessDenied403 from './pages/errors/AccessDenied403';
import NotFound404 from './pages/errors/NotFound404';
import { ROTAS_POR_PAPEL, rotaInicial, type Papel } from './auth/papeis';

// Carregado sob demanda: o Dashboard e o recharts respondem pela maior parte do
// bundle, e o candidato que abre /admissao/:token no celular não usa nenhum dos
// dois. Importado estaticamente, ele baixava tudo isso antes de ver a ficha.
const Dashboard = lazy(() => import('./pages/private/Dashboard'));

type Role = Papel;
type Theme = 'dark' | 'light';

// As rotas privadas renderizam o mesmo Dashboard, que decide o conteúdo pelo
// activePath. A única coisa que varia entre elas é quem pode entrar — e isso
// agora vem de ROTAS_POR_PAPEL, não de uma segunda lista mantida à mão aqui.
//
// A lista da coordenadora é o conjunto completo: percorrê-la registra toda rota
// privada que existe. O teste de invariante em auth/papeis.test.ts garante que
// nenhum papel aponte para fora dela.
const PAPEIS = Object.keys(ROTAS_POR_PAPEL) as Papel[];

const APP_ROUTES: { path: string; allowedRoles: Role[] }[] =
  ROTAS_POR_PAPEL.coordenadora_rh.map(path => ({
    path,
    allowedRoles: PAPEIS.filter(papel => ROTAS_POR_PAPEL[papel].includes(path))
  }));

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

  // O link de recuperação de senha cria uma sessão VÁLIDA. Olhando só para a
  // sessão, o app não distingue "acabei de entrar" de "vim trocar a senha" — e
  // mandava a pessoa direto para /app, que é onde ela menos precisava estar.
  //
  // A intenção só aparece na URL de retorno (`type=recovery`) e no evento
  // PASSWORD_RECOVERY. Ler as duas fontes, e não confiar na rota de destino,
  // é o que faz isso funcionar mesmo se o link cair na raiz — que é o que
  // acontece enquanto /redefinir-senha não estiver na allowlist de Redirect
  // URLs do Supabase.
  const [modoRecuperacaoSenha, setModoRecuperacaoSenha] = useState(() => {
    if (typeof window === 'undefined') return false;
    return /(^|[#&?])type=recovery(&|$)/.test(window.location.hash)
      || new URLSearchParams(window.location.search).get('type') === 'recovery';
  });

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
      if (_event === 'PASSWORD_RECOVERY') setModoRecuperacaoSenha(true);
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

  // Auto-logout por inatividade (micro compartilhado: próximo usuário não herda
  // a sessão de quem esqueceu de sair). 1h sem atividade encerra a sessão.
  useEffect(() => {
    if (!user) return;
    const LIMITE_MS = 60 * 60 * 1000;
    let ultimaAtividade = Date.now();
    const bump = () => { ultimaAtividade = Date.now(); };
    const eventos = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    eventos.forEach(e => window.addEventListener(e, bump, { passive: true }));
    const iv = window.setInterval(() => {
      if (Date.now() - ultimaAtividade > LIMITE_MS) supabase.auth.signOut();
    }, 30000);
    return () => {
      eventos.forEach(e => window.removeEventListener(e, bump));
      window.clearInterval(iv);
    };
  }, [user]);

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

  // Recuperação de senha vence qualquer rota: o link pode cair na raiz, em /app
  // ou em /redefinir-senha, e o destino é sempre a troca de senha. Fica dentro
  // do BrowserRouter porque a tela usa Link e useNavigate.
  if (modoRecuperacaoSenha) {
    return (
      <BrowserRouter>
        <RedefinirSenha
          theme={theme}
          setTheme={setTheme}
          onConcluido={() => setModoRecuperacaoSenha(false)}
        />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      {/* Envolve as rotas, não o BrowserRouter: assim a tela de falha continua
          dentro do contexto de roteamento e o "Recarregar" volta para a rota
          atual, não para a raiz. */}
      <ErrorBoundary area="app" theme={theme}>
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

        <Route
          path="/solicitar-vaga"
          element={<SolicitarVaga theme={theme} setTheme={setTheme} />}
        />

        <Route
          path="/teste-comportamental/:token"
          element={<TesteComportamental theme={theme} setTheme={setTheme} />}
        />

        {/* Fora de "/" de propósito: a raiz manda para /app assim que vê sessão,
            e o link de recuperação cria sessão ao ser aberto. Apontado para a
            raiz, o usuário cairia no painel sem nunca trocar a senha. */}
        <Route
          path="/redefinir-senha"
          element={<RedefinirSenha theme={theme} setTheme={setTheme} />}
        />

        <Route
          path="/entrevista-desligamento/:token"
          element={<EntrevistaDesligamento theme={theme} setTheme={setTheme} />}
        />

        <Route
          path="/funcionario-do-mes"
          element={<FuncionarioMes theme={theme} setTheme={setTheme} />}
        />

        <Route
          path="/pulse"
          element={<PulseSemanal theme={theme} setTheme={setTheme} />}
        />

        <Route
          path="/cultura"
          element={<ManualCultura theme={theme} setTheme={setTheme} />}
        />

        {/* Private Admin Routes */}
        <Route 
          path="/app" 
          element={
            <ProtectedRoute user={user} role={role} isInitialCheckDone={isInitialSessionCheckDone}>
              <Navigate to={rotaInicial(role, user?.email)} replace />
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
      </ErrorBoundary>

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        theme={theme}
        setTheme={setTheme}
        isAuthenticated={!!user}
        papel={role}
        email={user?.email}
        onLogout={async () => {
          await supabase.auth.signOut();
          setUser(null);
        }}
      />
    </BrowserRouter>
  );
}
