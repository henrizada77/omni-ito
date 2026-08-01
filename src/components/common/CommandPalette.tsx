import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Home,
  ShieldCheck,
  Star,
  Activity,
  Award,
  BookOpen,
  TrendingUp,
  FileText,
  Briefcase,
  Users,
  Sun,
  Moon,
  LogOut,
  Sparkles,
  User
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { filtrarColaboradoresElegiveis } from '../../utils/colaboradoresFiltro';


interface CommandPaletteProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  isAuthenticated?: boolean;
  onLogout?: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Colaboradores' | 'Painel de Gestão' | 'Navegação Pública' | 'Ações & Aparência';
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  theme,
  setTheme,
  isAuthenticated = false,
  onLogout
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [colaboradores, setColaboradores] = useState<{ id: string; nome: string; cargo?: string; setor?: string }[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  // Busca colaboradores no Supabase quando o usuário digita na busca
  useEffect(() => {
    if (!isAuthenticated || query.trim().length < 2) {
      setColaboradores([]);
      return;
    }

    let active = true;
    const fetchColabs = async () => {
      const q = query.trim().toLowerCase();
      const { data } = await supabase
        .from('colaboradores')
        .select('id, nome, cargo, setor')
        .ilike('nome', `%${q}%`)
        .limit(5);

      if (active && data) {
        setColaboradores(filtrarColaboradoresElegiveis(data));
      }
    };

    fetchColabs();
    return () => { active = false; };
  }, [query, isAuthenticated]);

  // Escuta atalho Ctrl+K / Cmd+K e tecla Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Reseta busca, colaboradores e índice ao abrir/fechar
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setColaboradores([]);
    }
  }, [isOpen]);

  const items = useMemo<CommandItem[]>(() => {
    const publicItems: CommandItem[] = [
      {
        id: 'home',
        title: 'Página Inicial',
        category: 'Navegação Pública',
        icon: <Home size={18} />,
        action: () => navigate('/')
      },
      {
        id: 'ouvidoria',
        title: 'Ouvidoria Anônima',
        category: 'Navegação Pública',
        icon: <ShieldCheck size={18} />,
        action: () => navigate('/ouvidoria')
      },
      {
        id: 'pesquisa',
        title: 'Pesquisa de Satisfação',
        category: 'Navegação Pública',
        icon: <Star size={18} />,
        action: () => navigate('/pesquisa')
      },
      {
        id: 'pulse',
        title: 'Pulse Semanal de Clima',
        category: 'Navegação Pública',
        icon: <Activity size={18} />,
        action: () => navigate('/pulse')
      },
      {
        id: 'funcionario-mes',
        title: 'Votação - Funcionário do Mês',
        category: 'Navegação Pública',
        icon: <Award size={18} />,
        action: () => navigate('/funcionario-do-mes')
      },
      {
        id: 'cultura',
        title: 'Manual de Integração & Cultura',
        category: 'Navegação Pública',
        icon: <BookOpen size={18} />,
        action: () => navigate('/cultura')
      }
    ];

    const privateItems: CommandItem[] = [
      {
        id: 'dashboard',
        title: 'Dashboard de Clima & Visão Geral',
        category: 'Painel de Gestão',
        icon: <TrendingUp size={18} />,
        action: () => navigate('/app/dashboard')
      },
      {
        id: 'analytics',
        title: 'Analytics & Métricas de RH',
        category: 'Painel de Gestão',
        icon: <Sparkles size={18} />,
        action: () => navigate('/app/analytics')
      },
      {
        id: 'folha',
        title: 'Gestão de Folha & Compensação',
        category: 'Painel de Gestão',
        icon: <FileText size={18} />,
        action: () => navigate('/app/folha')
      },
      {
        id: 'vagas',
        title: 'Processos Seletivos & Vagas',
        category: 'Painel de Gestão',
        icon: <Briefcase size={18} />,
        action: () => navigate('/app/vagas')
      },
      {
        id: 'organograma',
        title: 'Organograma da Equipe',
        category: 'Painel de Gestão',
        icon: <Users size={18} />,
        action: () => navigate('/app/organograma')
      }
    ];

    const actionItems: CommandItem[] = [
      {
        id: 'theme-toggle',
        title: theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro',
        category: 'Ações & Aparência',
        icon: theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-[#4F6DF5]" />,
        action: () => setTheme(theme === 'dark' ? 'light' : 'dark')
      }
    ];

    if (isAuthenticated && onLogout) {
      actionItems.push({
        id: 'logout',
        title: 'Sair do Sistema (Logout)',
        category: 'Ações & Aparência',
        icon: <LogOut size={18} className="text-rose-500" />,
        action: () => onLogout()
      });
    }

    // Se estiver no /app, exibe privateItems primeiro
    const isApp = location.pathname.startsWith('/app');
    if (isApp) {
      return [...privateItems, ...publicItems, ...actionItems];
    }
    return [...publicItems, ...(isAuthenticated ? privateItems : []), ...actionItems];
  }, [location.pathname, isAuthenticated, theme, setTheme, navigate, onLogout]);

  // Junta os colaboradores buscados no Supabase com os comandos do sistema
  const filteredItems = useMemo(() => {
    const colabItems: CommandItem[] = colaboradores.map(colab => ({
      id: `colab-${colab.id}`,
      title: colab.nome,
      subtitle: [colab.cargo, colab.setor].filter(Boolean).join(' • ') || 'Colaborador ITO',
      category: 'Colaboradores',
      icon: <User size={18} className="text-[#4F6DF5]" />,
      action: () => navigate(`/app/colaboradores?id=${colab.id}`)
    }));

    if (!query.trim()) return [...colabItems, ...items];
    const q = query.toLowerCase().trim();
    const matchedStatic = items.filter(item =>
      item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    );
    return [...colabItems, ...matchedStatic];
  }, [items, colaboradores, query, navigate]);

  // Navegação por setas do teclado
  useEffect(() => {
    const handleNavigation = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
        e.preventDefault();
        filteredItems[selectedIndex].action();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleNavigation);
    return () => window.removeEventListener('keydown', handleNavigation);
  }, [isOpen, filteredItems, selectedIndex]);

  return (
    <>
      {/* Modal Overlay da Command Palette com efeito Glassmorphism */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/50 backdrop-blur-xl transition-all duration-300 animate-fadeIn">
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

          {/* Glow Orb atrás do Modal */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#4F6DF5]/20 rounded-full blur-[120px] pointer-events-none" />

          {/* Card Principal da Busca com Glassmorphism Ultra Premium */}
          <div
            className={`relative w-full max-w-xl rounded-3xl border shadow-2xl backdrop-blur-2xl overflow-hidden transition-all transform scale-100 ${
              theme === 'dark'
                ? 'bg-[#0A0E17]/75 border-[#4F6DF5]/30 text-[#E6EAF2] shadow-[#4F6DF5]/10'
                : 'bg-white/75 border-[#4F6DF5]/20 text-[#0F1729] shadow-blue-500/10'
            }`}
          >
            {/* Input de Busca */}
            <div className="flex items-center px-4 py-3.5 border-b border-[#1E2739]/30 gap-3">
              <Search size={20} className="text-[#4F6DF5] shrink-0" />
              <input
                type="text"
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Digite o que procura ou um comando..."
                autoFocus
                className="w-full bg-transparent text-sm font-medium focus:outline-none placeholder-[#6B7688]"
              />
              <kbd className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-[#4F6DF5]/10 text-[#4F6DF5] border border-[#4F6DF5]/20">
                ESC
              </kbd>
            </div>

            {/* Lista de Resultados */}
            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1 scrollbar-thin">
              {filteredItems.length > 0 ? (
                filteredItems.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        item.action();
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#4F6DF5] text-white shadow-lg shadow-[#4F6DF5]/25'
                          : theme === 'dark'
                            ? 'hover:bg-[#121A2A] text-[#9AA4B6]'
                            : 'hover:bg-[#F3F5FB] text-[#5B6472]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={isSelected ? 'text-white' : 'text-[#4F6DF5]'}>
                          {item.icon}
                        </span>
                        <div>
                          <div className={`text-xs font-bold ${isSelected ? 'text-white' : theme === 'dark' ? 'text-[#E6EAF2]' : 'text-[#0F1729]'}`}>
                            {item.title}
                          </div>
                          <div className={`text-[10px] ${isSelected ? 'text-white/80' : 'opacity-60'}`}>
                            {item.subtitle ? `${item.subtitle} • ${item.category}` : item.category}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-mono ${isSelected ? 'text-white/80' : 'opacity-40'}`}>
                        ↵ Abrir
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs opacity-50 font-medium">
                  Nenhum módulo ou comando encontrado para "{query}"
                </div>
              )}
            </div>

            {/* Rodapé da Paleta */}
            <div className="px-4 py-2.5 bg-[#4F6DF5]/5 border-t border-[#1E2739]/30 flex items-center justify-between text-[10px] font-mono text-[#9AA4B6]">
              <div className="flex items-center gap-3">
                <span>↑↓ para navegar</span>
                <span>↵ para selecionar</span>
              </div>
              <div className="flex items-center gap-1 text-[#4F6DF5] font-bold">
                OMNI ITO Command
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CommandPalette;
