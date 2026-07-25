import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  CheckCircle,
  AlertTriangle,
  Sun,
  Moon,
  Send,
  ArrowLeft,
  Loader2,
  CalendarClock,
  UserCheck,
  Search,
  Award
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

import Logo from '../../components/common/Logo';

interface FuncionarioMesProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

interface Rodada { id: string; competencia: string; titulo: string | null; data_fim: string; }
interface Colab { id: string; nome: string; setor: string | null; }

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const mesExtenso = (comp: string) => {
  const [ano, mes] = comp.split('-');
  const i = Number(mes) - 1;
  return i >= 0 && i < 12 ? `${MESES[i]} de ${ano}` : comp;
};

const getPrimeiroESegundoNome = (nomeCompleto: string) => {
  if (!nomeCompleto) return '';
  const partes = nomeCompleto.trim().split(/\s+/);
  return partes.slice(0, 2).join(' ');
};

type Estado = 'carregando' | 'fechada' | 'form' | 'enviado';

export default function FuncionarioMes({ theme, setTheme }: FuncionarioMesProps) {
  const [estado, setEstado] = useState<Estado>('carregando');
  const [rodada, setRodada] = useState<Rodada | null>(null);
  const [colaboradores, setColaboradores] = useState<Colab[]>([]);
  
  // Votante (quem está votando)
  const [searchVotante, setSearchVotante] = useState('');
  const [selectedVotante, setSelectedVotante] = useState<Colab | null>(null);
  const [showVotanteDropdown, setShowVotanteDropdown] = useState(false);

  // Votado (quem recebe o voto)
  const [selectedVotado, setSelectedVotado] = useState<Colab | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const votanteRef = useRef<HTMLDivElement>(null);
  const votadoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.className = theme === 'dark'
      ? 'dark bg-[#0D0D0C] text-[#E5DFD3] antialiased'
      : 'light bg-[#FBFBFA] text-[#0A0A0A] antialiased';
  }, [theme]);

  // Click outside listener para fechar dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (votanteRef.current && !votanteRef.current.contains(event.target as Node)) {
        setShowVotanteDropdown(false);
      }
      if (votadoRef.current && !votadoRef.current.contains(event.target as Node)) {
        setShowVotadoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const [rd, cols] = await Promise.all([
        supabase.rpc('get_funcionario_mes_aberto'),
        supabase.rpc('listar_colaboradores_ativos_votacao')
      ]);
      if (!ativo) return;
      if (rd.error) {
        console.error('Falha ao carregar votação:', rd.error);
        setEstado('fechada');
        return;
      }
      const r = Array.isArray(rd.data) ? rd.data[0] : rd.data;
      if (!r) { setEstado('fechada'); return; }
      setRodada(r as Rodada);
      setColaboradores(((cols.data as Colab[]) || []));
      setEstado('form');
    })();
    return () => { ativo = false; };
  }, []);

  const enviar = async () => {
    if (!rodada || !selectedVotante || !selectedVotado) return;
    if (selectedVotante.id === selectedVotado.id) {
      setError('Você não pode votar em si mesmo.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { data: res, error: err } = await supabase.rpc('registrar_voto_funcionario_mes', {
        p_rodada_id: rodada.id,
        p_votante_id: selectedVotante.id,
        p_votado_id: selectedVotado.id
      });
      if (err) throw err;
      if (res === 'ok') { setEstado('enviado'); return; }
      if (res === 'ja_votou') { setError('Você já votou nesta rodada.'); }
      else if (res === 'fechada') { setError('A votação foi encerrada.'); }
      else { setError('Não foi possível registrar seu voto. Verifique os nomes selecionados.'); }
    } catch (err: any) {
      console.error('Falha ao registrar voto:', err);
      setError('Não foi possível registrar seu voto agora. Tente novamente em instantes.');
    } finally {
      setSubmitting(false);
    }
  };

  const cardBg = theme === 'dark'
    ? 'bg-[#121A2A]/90 border-[#1E2739] shadow-2xl backdrop-blur-xl'
    : 'bg-white border-[#E9ECF3] shadow-xl backdrop-blur-xl';

  const inputCls = theme === 'dark'
    ? 'bg-[#0F1626] border-[#1E2739] text-[#E6EAF2] placeholder-[#6B7688] focus:border-[#4F6DF5] focus:ring-1 focus:ring-[#4F6DF5]'
    : 'bg-[#F1F3F9] border-[#E9ECF3] text-[#0F1729] placeholder-[#8A94A6] focus:border-[#4F6DF5] focus:ring-1 focus:ring-[#4F6DF5]';

  const dropdownBg = theme === 'dark'
    ? 'bg-[#0F1626] border-[#1E2739] text-[#E6EAF2]'
    : 'bg-white border-[#E9ECF3] text-[#0F1729] shadow-2xl';

  const itemHover = theme === 'dark'
    ? 'hover:bg-[#1E2739]'
    : 'hover:bg-[#F3F5FB]';

  // Filtragem: busca a partir do 4º caractere (len >= 4)
  const filteredVotantes = searchVotante.trim().length >= 4
    ? colaboradores.filter(c => c.nome.toLowerCase().includes(searchVotante.trim().toLowerCase()))
    : [];

  const chrome = (children: React.ReactNode) => (
    <div className={`min-h-screen px-4 py-6 sm:px-6 sm:py-10 flex flex-col items-center justify-center relative overflow-x-hidden transition-colors duration-500 ${
      theme === 'dark' ? 'bg-[#0A0E17] text-[#E6EAF2]' : 'bg-[#F3F5FB] text-[#0F1729]'
    }`}>
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-[#4F6DF5]/10 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] bg-amber-500/5 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none" />

      {/* Header Bar para Mobile / Tablet / Desktop */}
      <div className="w-full max-w-md grid grid-cols-3 items-center mb-4 sm:mb-6 z-20">
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
        
        {/* Branding Centralizado Absoluto */}
        <div className="justify-self-center flex items-center gap-2">
          <Logo className="w-7 h-7 sm:w-8 sm:h-8 text-[#4F6DF5]" />
          <span className="font-bold tracking-wider text-sm sm:text-base">ITO</span>
        </div>

        <div className="justify-self-end">
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

      <div className="w-full max-w-md relative z-10 my-2 sm:my-4">
        {children}
      </div>
    </div>
  );

  if (estado === 'carregando') {
    return chrome(
      <div className="flex flex-col items-center gap-3 text-xs opacity-60 py-16 justify-center">
        <Loader2 size={24} className="animate-spin text-[#4F6DF5]" /> 
        <span className="font-medium tracking-wide">Carregando formulário de votação...</span>
      </div>
    );
  }

  if (estado === 'fechada') {
    return chrome(
      <div className={`rounded-3xl border p-8 text-center space-y-5 animate-fadeIn ${cardBg}`}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto bg-amber-500/10 border border-amber-500/20 text-amber-500">
          <CalendarClock size={32} />
        </div>
        <h2 className="text-xl font-bold">Votação encerrada</h2>
        <p className="text-xs text-[#9AA4B6] max-w-md mx-auto leading-relaxed">
          Não há rodada de Funcionário do Mês aberta no momento. O RH abre uma nova votação a cada início de mês.
        </p>
      </div>
    );
  }

  if (estado === 'enviado') {
    return chrome(
      <div className={`rounded-3xl border p-8 text-center space-y-5 animate-fadeIn ${cardBg}`}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 animate-bounce">
          <CheckCircle size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Voto Registrado!</h2>
          <p className="text-xs opacity-75 max-w-md mx-auto leading-relaxed">
            Seu voto para <strong>{selectedVotado?.nome}</strong> foi computado com sucesso e anonimato garantido.
          </p>
        </div>
        <div className="pt-4 border-t border-[#1E2739]/40 text-[11px] opacity-60 font-mono">
          Obrigado por reconhecer a excelência do nosso time.
        </div>
      </div>
    );
  }

  return chrome(
    <div className={`rounded-3xl border p-6 sm:p-8 space-y-6 ${cardBg}`}>
      {/* Visual Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#4F6DF5]/10 text-[#4F6DF5] border border-[#4F6DF5]/20">
          <Award size={13} /> Funcionário do Mês
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Vote no colega do mês</h2>
        <p className="text-xs text-[#9AA4B6] leading-relaxed">
          Referência: <strong className="text-foreground">{mesExtenso(rodada?.competencia || '')}</strong>.
          {rodada?.data_fim && <> Encerra em <strong>{new Date(rodada.data_fim + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>.</>}
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2.5">
          <AlertTriangle size={16} className="shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="space-y-5">
        {/* Campo 1: Votante (Digitar para se identificar a partir da 4ª letra) */}
        <div className="space-y-2 relative" ref={votanteRef}>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9AA4B6]">
            1. Digite seu nome para se identificar *
          </label>
          {selectedVotante ? (
            <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-xs font-semibold text-emerald-500">
              <div className="flex items-center gap-2">
                <UserCheck size={16} />
                <span>{selectedVotante.nome} {selectedVotante.setor && <span className="opacity-70 font-normal">· {selectedVotante.setor}</span>}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedVotante(null);
                  setSearchVotante('');
                  setShowVotanteDropdown(false);
                  setSelectedVotado(null);
                }}
                className="text-[10px] underline uppercase tracking-wider hover:opacity-80"
              >
                Alterar
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
                <input
                  type="text"
                  value={searchVotante}
                  onChange={(e) => {
                    setSearchVotante(e.target.value);
                    setShowVotanteDropdown(true);
                  }}
                  onFocus={() => setShowVotanteDropdown(true)}
                  placeholder="Digite ao menos 4 letras do seu nome..."
                  className={`w-full text-xs pl-9 pr-4 py-3 rounded-xl border transition-all ${inputCls}`}
                />
              </div>

              {/* Dropdown Auto-complete Votante */}
              {showVotanteDropdown && (
                <div className={`absolute z-30 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border shadow-xl ${dropdownBg}`}>
                  {searchVotante.trim().length < 4 ? (
                    <div className="p-3 text-[11px] text-center opacity-60">
                      Digite pelo menos <strong>4 letras</strong> para se identificar.
                    </div>
                  ) : filteredVotantes.length === 0 ? (
                    <div className="p-3 text-[11px] text-center opacity-60">
                      Nenhum colaborador encontrado com "{searchVotante}".
                    </div>
                  ) : (
                    filteredVotantes.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedVotante(c);
                          setSearchVotante(c.nome);
                          setShowVotanteDropdown(false);
                          if (selectedVotado?.id === c.id) {
                            setSelectedVotado(null);
                          }
                        }}
                        className={`w-full text-left p-3 text-xs transition-colors flex items-center justify-between border-b border-[#1E2739]/20 last:border-0 ${itemHover}`}
                      >
                        <span className="font-semibold">{c.nome}</span>
                        {c.setor && <span className="text-[10px] opacity-60 font-mono">{c.setor}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Campo 2: Votado (Seleção direta com efeito de card azul e troféu) */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9AA4B6]">
            2. Selecione o colega que deseja votar *
          </label>

          {selectedVotado ? (
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#4F6DF5]/40 bg-[#4F6DF5]/10 text-xs font-semibold text-[#4F6DF5] shadow-lg shadow-[#4F6DF5]/10 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#4F6DF5]/20 border border-[#4F6DF5]/30 flex items-center justify-center text-[#4F6DF5] shrink-0">
                  <Trophy size={16} />
                </div>
                <div>
                  <span className="font-bold text-sm block leading-snug">{getPrimeiroESegundoNome(selectedVotado.nome)}</span>
                  {selectedVotado.setor && <span className="text-[10px] opacity-70 font-mono block">{selectedVotado.setor}</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVotado(null)}
                className="text-[10px] font-bold underline uppercase tracking-wider text-[#4F6DF5] hover:opacity-80 px-2 py-1"
              >
                Alterar
              </button>
            </div>
          ) : (
            <select
              disabled={!selectedVotante}
              value=""
              onChange={(e) => {
                const found = colaboradores.find(c => c.id === e.target.value) || null;
                setSelectedVotado(found);
              }}
              className={`w-full text-xs px-4 py-3 rounded-xl border transition-all cursor-pointer ${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="">
                {selectedVotante ? '— Clique para escolher o colega —' : '— Identifique-se primeiro acima —'}
              </option>
              {colaboradores
                .filter(c => c.id !== selectedVotante?.id)
                .map(c => (
                  <option key={c.id} value={c.id}>
                    {getPrimeiroESegundoNome(c.nome)}{c.setor ? ` · ${c.setor}` : ''}
                  </option>
                ))}
            </select>
          )}
        </div>

        {/* Botão de Envio */}
        <button
          type="button"
          onClick={enviar}
          disabled={submitting || !selectedVotante || !selectedVotado}
          className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-white bg-gradient-to-r from-[#4F6DF5] to-[#3D5AE0] hover:from-[#3D5AE0] hover:to-[#3148B8] shadow-lg shadow-[#4F6DF5]/25 transition-all disabled:opacity-50 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Registrando voto...
            </>
          ) : (
            <>
              <Send size={15} /> Confirmar meu voto
            </>
          )}
        </button>
      </form>

      <div className="text-[10px] opacity-50 font-mono text-center pt-4 border-t border-[#1E2739]/30">
        1 voto sigiloso por colaborador · monitorado pelo RH
      </div>
    </div>
  );
}

