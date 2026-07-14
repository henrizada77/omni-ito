import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  Link2, 
  FileSpreadsheet, 
  Plus, 
  Copy, 
  Check, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';
import AdmissionForm from './AdmissionForm';

interface FormManagerProps {
  theme: 'dark' | 'light';
}

export default function FormManager({ theme }: FormManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tokensList, setTokensList] = useState<any[]>([]);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // States for generating a new admission link
  const [newLinkData, setNewLinkData] = useState({
    nome: '',
    email: 'pendente@candidato.com',
    cargo: 'Recepcionista',
    setor: 'Recepção'
  });
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkError, setLinkError] = useState('');

  const fetchActiveTokens = async () => {
    try {
      const { data, error } = await supabase
        .from('admission_tokens')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      if (data) setTokensList(data);
    } catch (err) {
      console.error('Error loading admission tokens:', err);
    }
  };

  useEffect(() => {
    fetchActiveTokens();
  }, []);

  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkData.nome || !newLinkData.cargo) {
      setLinkError('Por favor preencha todos os campos obrigatórios.');
      return;
    }

    setGeneratingLink(true);
    setLinkError('');

    try {
      // Token expires in 7 days
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + 7);

      const { error } = await supabase
        .from('admission_tokens')
        .insert({
          candidato_nome: newLinkData.nome,
          candidato_email: newLinkData.email,
          candidato_cargo: newLinkData.cargo,
          candidato_setor: newLinkData.setor,
          expira_em: expDate.toISOString(),
          status: 'pendente_preenchimento'
        })
        .select()
        .single();

      if (error) throw error;

      // Reset form and refresh list
      setNewLinkData({ nome: '', email: 'pendente@candidato.com', cargo: 'Recepcionista', setor: 'Recepção' });
      fetchActiveTokens();
    } catch (err: any) {
      console.error(err);
      setLinkError(err.message || 'Erro ao gerar link.');
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyToClipboard = (token: string, id: string) => {
    const link = `${window.location.origin}/admissao/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedTokenId(id);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner and Quick Local Fill Button */}
      <div className={`p-6 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'
      }`}>
        <div className="space-y-1">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-500" size={16} /> Central de Formulários Operacionais de RH
          </h4>
          <p className="text-xs opacity-60">Emita links para candidatos preencherem de casa ou realize o cadastro de admissão localmente.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className={`text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors shrink-0 ${
            theme === 'dark' ? 'bg-[#E5DFD3] text-black hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-white hover:bg-[#2A2A2A]'
          }`}
        >
          <Plus size={14} /> Ficha de Admissão Local
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Link Panel */}
        <div className={`p-5 rounded-xl border space-y-4 h-fit ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <div className="pb-2 border-b border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-65 flex items-center gap-1.5">
              <Link2 size={14} className="text-emerald-500" /> Emitir Novo Link de Admissão
            </h4>
          </div>

          {linkError && (
            <div className="p-2.5 rounded-lg text-[10px] font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-1.5">
              <AlertTriangle size={12} />
              <span>{linkError}</span>
            </div>
          )}

          <form onSubmit={handleGenerateLink} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold opacity-60 mb-1">Nome Completo *</label>
              <input 
                type="text" 
                required 
                placeholder="Ex: Maria Silva"
                value={newLinkData.nome} 
                onChange={e => setNewLinkData(p => ({...p, nome: e.target.value}))}
                className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/10':'border-black/10'}`} 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold opacity-60 mb-1">Cargo *</label>
                <select
                  value={newLinkData.cargo} 
                  onChange={e => {
                    const cargo = e.target.value;
                    const sectorMapping: Record<string, string> = {
                      "Recepcionista": "Recepção",
                      "Operador de Call Center": "Call Center",
                      "Analista Financeiro": "Financeiro",
                      "Fisioterapeuta Dermato-Funcional": "Biomedicina",
                      "Biomédica": "Biomedicina",
                      "Enfermeira": "Enfermagem",
                      "Farmacêutica": "Farmácia",
                      "Serviços Gerais": "Serviços Gerais",
                      "Nutricionista": "Nutrição",
                      "Coordenadora de RH": "Administrativo",
                      "Administrador de TI": "Administrativo"
                    };
                    const setor = sectorMapping[cargo] || "Recepção";
                    setNewLinkData(p => ({ ...p, cargo, setor }));
                  }}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/10 bg-[#121211]':'border-black/10 bg-white'}`} 
                >
                  {["Recepcionista", "Operador de Call Center", "Analista Financeiro", "Fisioterapeuta Dermato-Funcional", "Biomédica", "Enfermeira", "Farmacêutica", "Serviços Gerais", "Nutricionista", "Coordenadora de RH", "Administrador de TI"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Setor (Auto)</label>
                <div className={`w-full p-2.5 rounded border bg-transparent opacity-60 font-semibold ${theme==='dark'?'border-white/10':'border-black/10'}`}>
                  {newLinkData.setor}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={generatingLink}
              className={`w-full py-2 rounded font-bold text-xs transition-colors ${
                theme === 'dark' ? 'bg-[#E5DFD3] text-black hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-white hover:bg-[#2A2A2A]'
              } disabled:opacity-50`}
            >
              {generatingLink ? 'Gerando...' : '✓ Gerar Link Admissão'}
            </button>
          </form>
        </div>

        {/* Links listing and Status */}
        <div className={`p-5 rounded-xl border space-y-4 lg:col-span-2 ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <div className="pb-2 border-b border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-65 flex items-center gap-1.5">
              <Clock size={14} className="text-emerald-500" /> Links Emitidos e Status de Preenchimento
            </h4>
          </div>

          <div className="overflow-y-auto max-h-[350px] space-y-2">
            {tokensList.length > 0 ? (
              tokensList.map((token) => (
                <div 
                  key={token.id} 
                  className={`p-3 rounded-lg border flex items-center justify-between text-xs transition-all ${
                    theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'
                  }`}
                >
                  <div className="space-y-1 truncate max-w-[70%]">
                    <span className="font-bold block truncate">{token.candidato_nome}</span>
                    <span className="text-[10px] opacity-50 block truncate">
                      {token.candidato_cargo} · {token.candidato_setor}
                    </span>
                    <span className="text-[9px] opacity-40 font-mono block">
                      Expira em: {new Date(token.expira_em).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      token.status === 'concluido' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : (token.status === 'aguardando_homologacao' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-white/5 border-white/10 opacity-60')
                    }`}>
                      {token.status === 'concluido' ? 'Concluído' : (token.status === 'aguardando_homologacao' ? 'Homologação' : 'Pendente')}
                    </span>
                    
                    <button
                      onClick={() => copyToClipboard(token.token, token.id)}
                      className={`p-1.5 rounded hover:bg-white/5 transition-colors border ${
                        theme === 'dark' ? 'border-white/10 text-[#E5DFD3]' : 'border-black/10 text-[#0A0A0A]'
                      }`}
                      title="Copiar Link de Admissão"
                    >
                      {copiedTokenId === token.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 opacity-40 italic text-xs">
                Nenhum link ou token de admissão gerado.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Local Fill Admission Wizard Modal */}
      {showCreateModal && (
        <>
          {/* Backdrop */}
          <div 
            onClick={() => setShowCreateModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity animate-fadeIn"
          />
          {/* Modal content */}
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl p-6 rounded-2xl border z-50 max-h-[90vh] overflow-y-auto ${
            theme === 'dark' 
              ? 'bg-[#0D0D0C]/95 border-white/10 text-[#E5DFD3] glass-card-dark' 
              : 'bg-[#FBFBFA]/95 border-black/10 text-[#0A0A0A] glass-card-light'
          }`}>
            <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-5">
              <div>
                <span className="text-[9px] font-bold tracking-widest uppercase opacity-60">Cadastro Funcional</span>
                <h3 className="text-base font-bold mt-0.5">Formulário de Admissão — Coordenação de RH</h3>
              </div>
            </div>

            <AdmissionForm 
              theme={theme} 
              onClose={() => setShowCreateModal(false)} 
              onSuccess={() => {
                setShowCreateModal(false);
                fetchActiveTokens();
              }} 
            />
          </div>
        </>
      )}
    </div>
  );
}
