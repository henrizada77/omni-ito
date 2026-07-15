import React from 'react';
import { Navigate } from 'react-router-dom';

type Role = 'coordenadora_rh' | 'ti';

interface ProtectedRouteProps {
  user: any;
  role: Role;
  isInitialCheckDone: boolean;
  allowedRoles?: Role[];
  children: React.ReactNode;
}

export default function ProtectedRoute({
  user,
  role,
  isInitialCheckDone,
  allowedRoles,
  children
}: ProtectedRouteProps) {
  if (!isInitialCheckDone) {
    // Sem cor fixa: o <body> já recebe fundo e texto do tema em App.tsx. Com o
    // #0D0D0C hardcoded, quem usa tema claro levava um flash preto a cada
    // navegação protegida.
    return (
      <div className="min-h-screen flex items-center justify-center" role="status">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
          <span className="text-xs font-mono tracking-wider opacity-60">Verificando permissões...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role) && user?.email !== 'ito.thiagosilva@gmail.com') {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
