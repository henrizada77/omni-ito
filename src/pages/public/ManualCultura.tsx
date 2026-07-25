import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sun, Moon, BookOpen, ChevronLeft, ChevronRight, Maximize2, Grid } from 'lucide-react';
import Logo from '../../components/common/Logo';

interface ManualCulturaProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

// Importação dinâmica de todas as páginas ordenadas do manual
const manualImages = Object.entries(
  import.meta.glob<{ default: string }>('../../assets/Manual_de_Integração_ito.jpg/*.jpg', { eager: true })
)
  .sort(([pathA], [pathB]) => {
    const getNum = (p: string) => {
      const match = p.match(/-(\d+)\.jpg$/);
      return match ? parseInt(match[1], 10) : 0;
    };
    return getNum(pathA) - getNum(pathB);
  })
  .map(([_, module]) => module.default);

export default function ManualCultura({ theme, setTheme }: ManualCulturaProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode === 'grid') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        prevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, viewMode]);

  const nextPage = () => {
    if (currentPage < manualImages.length - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.error(err));
      setIsFullscreen(false);
    }
  };

  const cardBg = theme === 'dark'
    ? 'bg-[#121A2A]/90 border-[#1E2739] shadow-2xl backdrop-blur-xl'
    : 'bg-white border-[#E9ECF3] shadow-xl backdrop-blur-xl';

  return (
    <div className={`min-h-screen px-4 py-6 sm:px-6 sm:py-10 flex flex-col items-center justify-center relative overflow-x-hidden transition-colors duration-500 ${
      theme === 'dark' ? 'bg-[#0A0E17] text-[#E6EAF2]' : 'bg-[#F3F5FB] text-[#0F1729]'
    }`}>
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-[#4F6DF5]/10 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] bg-[#3D5AE0]/5 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none" />

      {/* Header Bar com alinhamento perfeito (grid grid-cols-3) */}
      <div className="w-full max-w-4xl grid grid-cols-3 items-center mb-4 sm:mb-6 z-20">
        <div className="justify-self-start">
          <Link
            to="/"
            className={`p-2 sm:p-2.5 rounded-xl border transition-all flex items-center gap-1.5 sm:gap-2 text-xs font-semibold ${
              theme === 'dark' ? 'border-[#1E2739] hover:bg-[#121A2A] bg-[#0A0E17]/80 text-[#9AA4B6]' : 'border-[#E9ECF3] hover:bg-white bg-white/80 text-[#5B6472]'
            }`}
          >
            <ArrowLeft size={15} /> <span>Voltar</span>
          </Link>
        </div>
        
        {/* Branding Centralizado */}
        <div className="justify-self-center flex items-center gap-2">
          <Logo className="w-7 h-7 sm:w-8 sm:h-8 text-[#4F6DF5]" />
          <span className="font-bold tracking-wider text-sm sm:text-base">ITO</span>
        </div>

        <div className="justify-self-end flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Alternar tema"
            className={`p-2 sm:p-2.5 rounded-xl border transition-all ${
              theme === 'dark' ? 'border-[#1E2739] hover:bg-[#121A2A] bg-[#0A0E17]/80 text-[#9AA4B6]' : 'border-[#E9ECF3] hover:bg-white bg-white/80 text-[#5B6472]'
            }`}
          >
            {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-[#4F6DF5]" />}
          </button>
        </div>
      </div>

      <div className="w-full max-w-4xl relative z-10 my-2 sm:my-4" ref={containerRef}>
        {/* Container Principal */}
        <div className={`rounded-2xl sm:rounded-3xl border p-4 sm:p-8 space-y-6 ${cardBg}`}>
          
          {/* Top Bar de Controles do Leitor */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E2739]/30 pb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#4F6DF5]/10 text-[#4F6DF5] border border-[#4F6DF5]/20">
                <BookOpen size={13} /> Manual de Integração ITO
              </span>
              <span className="text-xs font-mono font-semibold text-[#9AA4B6]">
                {currentPage + 1} de {manualImages.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(prev => prev === 'single' ? 'grid' : 'single')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  theme === 'dark' ? 'border-[#1E2739] hover:bg-[#1E2739]' : 'border-[#E9ECF3] hover:bg-[#F3F5FB]'
                }`}
              >
                <Grid size={14} /> {viewMode === 'single' ? 'Ver Grade' : 'Leitor'}
              </button>

              {viewMode === 'single' && (
                <button
                  onClick={toggleFullscreen}
                  className={`p-2 rounded-xl border text-xs transition-all ${
                    theme === 'dark' ? 'border-[#1E2739] hover:bg-[#1E2739]' : 'border-[#E9ECF3] hover:bg-[#F3F5FB]'
                  }`}
                  title="Tela Cheia"
                >
                  <Maximize2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Conteúdo: Modo Leitor de Página Única */}
          {viewMode === 'single' ? (
            <div className="space-y-4">
              <div className="relative flex items-center justify-center min-h-[400px] sm:min-h-[600px] bg-black/20 rounded-2xl overflow-hidden group">
                <img
                  src={manualImages[currentPage]}
                  alt={`Página ${currentPage + 1} do Manual de Integração ITO`}
                  className="max-h-[80vh] w-auto object-contain rounded-xl shadow-2xl transition-all duration-300"
                />

                {/* Botão Anterior */}
                <button
                  onClick={prevPage}
                  disabled={currentPage === 0}
                  className="absolute left-2 sm:left-4 p-2.5 sm:p-3 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/20 hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-lg"
                  aria-label="Página Anterior"
                >
                  <ChevronLeft size={22} />
                </button>

                {/* Botão Próximo */}
                <button
                  onClick={nextPage}
                  disabled={currentPage === manualImages.length - 1}
                  className="absolute right-2 sm:right-4 p-2.5 sm:p-3 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/20 hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-lg"
                  aria-label="Próxima Página"
                >
                  <ChevronRight size={22} />
                </button>
              </div>

              {/* Carrossel de Miniaturas Inferior */}
              <div className="flex gap-2 overflow-x-auto py-2 px-1 scrollbar-thin">
                {manualImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx)}
                    className={`shrink-0 w-12 h-16 sm:w-16 sm:h-22 rounded-lg overflow-hidden border-2 transition-all ${
                      currentPage === idx
                        ? 'border-[#4F6DF5] scale-105 shadow-md shadow-[#4F6DF5]/30'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Página ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Conteúdo: Modo Grade de Páginas */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 max-h-[70vh] overflow-y-auto p-1">
              {manualImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentPage(idx);
                    setViewMode('single');
                  }}
                  className={`group relative rounded-xl overflow-hidden border transition-all text-left cursor-pointer ${
                    currentPage === idx
                      ? 'border-[#4F6DF5] ring-2 ring-[#4F6DF5]/40 scale-102'
                      : theme === 'dark' ? 'border-[#1E2739] hover:border-[#4F6DF5]/50' : 'border-[#E9ECF3] hover:border-[#4F6DF5]/50'
                  }`}
                >
                  <img src={img} alt={`Página ${idx + 1}`} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white text-[10px] font-mono font-bold flex justify-between items-center">
                    <span>Pág. {idx + 1}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

