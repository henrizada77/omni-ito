import { EyeOff, ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NotFound404Props {
  theme?: 'dark' | 'light';
}

export default function NotFound404({ theme = 'dark' }: NotFound404Props) {
  const navigate = useNavigate();

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-500 ${
      theme === 'dark' ? 'bg-[#0D0D0C] text-[#E5DFD3]' : 'bg-[#FBFBFA] text-[#0A0A0A]'
    }`}>
      {/* Glow Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#E5DFD3]/5 rounded-full blur-[90px] pointer-events-none" />

      {/* Card */}
      <div className={`relative w-full max-w-md rounded-2xl border p-6 md:p-8 text-center transition-all ${
        theme === 'dark' ? 'glass-card-dark' : 'glass-card-light'
      }`}>
        <div className="space-y-6">
          <div className="w-14 h-14 rounded-full bg-[#E5DFD3]/10 border border-[#E5DFD3]/25 flex items-center justify-center mx-auto text-current animate-pulse">
            <EyeOff size={28} />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight">404</h1>
            <h2 className="text-lg font-bold">Página Não Encontrada</h2>
            <p className="text-xs opacity-65 max-w-xs mx-auto leading-relaxed">
              O link solicitado está inativo ou o recurso não existe neste servidor. Se isso for um convite de admissão, verifique se o token de expiração ainda é válido.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => navigate(-1)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'
              }`}
            >
              <ArrowLeft size={14} /> Voltar
            </button>
            <button
              onClick={() => navigate('/app')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                theme === 'dark' 
                  ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' 
                  : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]'
              }`}
            >
              <Home size={14} /> Painel Principal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
