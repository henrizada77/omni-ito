import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sun, Moon, BookOpen } from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface ManualCulturaProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

// Página pública (sem login): qualquer pessoa lê o Manual de Cultura. O conteúdo
// vem de documentos_institucionais (tipo = 'manual_cultura'), editado pelo RH.
export default function ManualCultura({ theme, setTheme }: ManualCulturaProps) {
  const [titulo, setTitulo] = useState('Manual de Cultura');
  const [conteudo, setConteudo] = useState('');
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('documentos_institucionais')
        .select('titulo, conteudo, atualizado_em')
        .eq('tipo', 'manual_cultura')
        .maybeSingle();
      if (!active) return;
      if (data) {
        setTitulo(data.titulo || 'Manual de Cultura');
        setConteudo(data.conteudo || '');
        setAtualizadoEm(data.atualizado_em || null);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const cardBg = theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-white border-black/10 shadow-sm';

  return (
    <div className={`min-h-screen p-6 relative overflow-hidden transition-colors duration-500 ${
      theme === 'dark' ? 'bg-[#0D0D0C] text-[#E5DFD3]' : 'bg-[#FBFBFA] text-[#0A0A0A]'
    }`}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="absolute top-6 left-6">
        <Link
          to="/"
          className={`p-2 rounded-lg border transition-colors flex items-center gap-1.5 text-xs ${
            theme === 'dark' ? 'border-white/10 hover:bg-white/5 bg-[#0D0D0C]' : 'border-black/10 hover:bg-black/5 bg-[#FBFBFA]'
          }`}
        >
          <ArrowLeft size={14} /> Voltar
        </Link>
      </div>

      <div className="absolute top-6 right-6">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`p-2 rounded-lg border transition-colors ${
            theme === 'dark' ? 'border-white/10 hover:bg-white/5 bg-[#0D0D0C]' : 'border-black/10 hover:bg-black/5 bg-[#FBFBFA]'
          }`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      <div className="w-full max-w-3xl mx-auto relative z-10 my-12 md:my-16">
        {/* Branding */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold tracking-tight text-sm ${
            theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]'
          }`}>ITO</div>
          <span className="font-semibold tracking-wider text-base">INSTITUTO THIAGO OMENA</span>
        </div>

        <div className={`rounded-2xl border p-6 md:p-10 ${cardBg}`}>
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <BookOpen size={11} /> Cultura ITO
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold mt-3 tracking-tight">{titulo}</h1>
            {atualizadoEm && (
              <p className="text-[10px] opacity-40 mt-2 font-mono">
                Atualizado em {new Date(atualizadoEm).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>

          {loading ? (
            <div className="py-16 text-center opacity-50 text-sm">Carregando…</div>
          ) : conteudo.trim() ? (
            <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-[15px] opacity-90">
              {conteudo}
            </div>
          ) : (
            <div className="py-16 text-center opacity-50 italic text-sm">
              O Manual de Cultura ainda está sendo preparado. Volte em breve. 💛
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
