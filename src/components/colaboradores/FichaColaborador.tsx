// Ficha do colaborador (drawer lateral do painel).
//
// Extraida do Dashboard.tsx, onde ocupava 1.265 linhas de um arquivo de 8 mil.
// Nesta etapa o conteudo saiu IDENTICO, de proposito: mover e redesenhar no
// mesmo passo tornaria impossivel saber qual das duas coisas quebrou algo.
//
// A lista de props e grande porque o drawer nasceu dentro do Dashboard e usa
// o estado dele a vontade. Ela encolhe na proxima etapa: parte desses itens
// so e usada aqui e vai mudar de casa em vez de continuar sendo prop.
import { supabase } from '../../supabaseClient';
import { calcularPrazosDesligamento } from '../../utils/desligamento';
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Bus,
  Camera,
  Check,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  Link2,
  Pencil,
  Plus,
  Printer,
  Settings,
  ShieldCheck,
  TrendingUp,
  X
} from 'lucide-react';

/**
 * Setter de estado que o drawer chama das duas formas: com o objeto pronto
 * e com atualizador, setX(p => ({ ...p, campo: v })).
 *
 * Sao duas assinaturas, e nao uma uniao, por dois motivos que se somam:
 * uma uniao contendo any colapsa em any e o p do atualizador fica sem tipo;
 * e uma uniao com o objeto escrito por extenso recusaria o setter real, que
 * chega tipado com a forma exata do estado la do Dashboard.
 *
 * A ordem importa: a forma de funcao vem primeiro para que uma chamada com
 * atualizador case com ela, e nao com o any da segunda.
 */
type Atualizador =
  & ((atualiza: (anterior: any) => any) => void)
  & ((valor: any) => void);

interface FichaColaboradorProps {
  activeColaboradorForDrawer: any;
  advDataFalta: any;
  advDescricaoSituacao: any;
  calculateTenure: any;
  dbAvaliacoesDesempenho: any[];
  dbPlanosCarreira: any[];
  desligamentosList: any[];
  drawerEditData: any;
  drawerTab: any;
  entrevistaDraft: any;
  fetchColaboradoresList: any;
  fotoDrawerUrl: any;
  getSalarioLiquido: any;
  handleDownloadAttachment: any;
  handleOffboardColaborador: any;
  handleRegisterAdvertencia: any;
  handleRegisterOcorrencia: any;
  handleSaveDrawerEdit: any;
  handleUploadColaboradorFile: any;
  handleViewDocument: any;
  hasFullAccess: any;
  initialEvalForm: any;
  isEditingDrawer: any;
  isMexendoLinkEntrevista: any;
  isOffboardingMode: any;
  isRegisteringAdvertencia: any;
  isRegisteringOcorrencia: any;
  isSavingAdvertencia: any;
  isSavingDrawer: any;
  isSavingEntrevista: any;
  isSavingOffboard: any;
  isSubmittingOcorrencia: any;
  isUploadingFile: any;
  logAuditoria: any;
  notify: any;
  ocData: any;
  ocDesvio: any;
  ocJustificativa: any;
  ocTipo: any;
  ocorrenciasList: any[];
  offboardDate: any;
  offboardModalidade: any;
  offboardReason: any;
  offboardTipo: any;
  parseEvaluationComments: any;
  selectedColabDocuments: any[];
  setActiveColaboradorForDrawer: (v: any) => void;
  setAdvDataFalta: (v: any) => void;
  setAdvDescricaoSituacao: (v: any) => void;
  setDrawerEditData: (v: any) => void;
  setDrawerTab: (v: any) => void;
  setEntrevistaDraft: Atualizador;
  setEvalForm: (v: any) => void;
  setEvalModalReadOnly: (v: any) => void;
  setIsEditingDrawer: (v: any) => void;
  setIsMexendoLinkEntrevista: (v: any) => void;
  setIsOffboardingMode: (v: any) => void;
  setIsRegisteringAdvertencia: (v: any) => void;
  setIsRegisteringOcorrencia: (v: any) => void;
  setIsSavingEntrevista: (v: any) => void;
  setOcData: (v: any) => void;
  setOcDesvio: (v: any) => void;
  setOcFile: (v: any) => void;
  setOcJustificativa: (v: any) => void;
  setOcTipo: (v: any) => void;
  setOffboardDate: (v: any) => void;
  setOffboardModalidade: (v: any) => void;
  setOffboardReason: (v: any) => void;
  setOffboardTipo: (v: any) => void;
  setSelectedAdvertenciaForModal: (v: any) => void;
  setSelectedEvalForModal: (v: any) => void;
  setShowAdvertenciaModal: (v: any) => void;
  setShowEvalModal: (v: any) => void;
  setUploadFile: (v: any) => void;
  setUploadFileType: (v: any) => void;
  theme: 'dark' | 'light';
  uploadFile: any;
  uploadFileType: any;
  warningsMap: Record<string, any[]>;
}

export default function FichaColaborador({
  activeColaboradorForDrawer,
  advDataFalta,
  advDescricaoSituacao,
  calculateTenure,
  dbAvaliacoesDesempenho,
  dbPlanosCarreira,
  desligamentosList,
  drawerEditData,
  drawerTab,
  entrevistaDraft,
  fetchColaboradoresList,
  fotoDrawerUrl,
  getSalarioLiquido,
  handleDownloadAttachment,
  handleOffboardColaborador,
  handleRegisterAdvertencia,
  handleRegisterOcorrencia,
  handleSaveDrawerEdit,
  handleUploadColaboradorFile,
  handleViewDocument,
  hasFullAccess,
  initialEvalForm,
  isEditingDrawer,
  isMexendoLinkEntrevista,
  isOffboardingMode,
  isRegisteringAdvertencia,
  isRegisteringOcorrencia,
  isSavingAdvertencia,
  isSavingDrawer,
  isSavingEntrevista,
  isSavingOffboard,
  isSubmittingOcorrencia,
  isUploadingFile,
  logAuditoria,
  notify,
  ocData,
  ocDesvio,
  ocJustificativa,
  ocTipo,
  ocorrenciasList,
  offboardDate,
  offboardModalidade,
  offboardReason,
  offboardTipo,
  parseEvaluationComments,
  selectedColabDocuments,
  setActiveColaboradorForDrawer,
  setAdvDataFalta,
  setAdvDescricaoSituacao,
  setDrawerEditData,
  setDrawerTab,
  setEntrevistaDraft,
  setEvalForm,
  setEvalModalReadOnly,
  setIsEditingDrawer,
  setIsMexendoLinkEntrevista,
  setIsOffboardingMode,
  setIsRegisteringAdvertencia,
  setIsRegisteringOcorrencia,
  setIsSavingEntrevista,
  setOcData,
  setOcDesvio,
  setOcFile,
  setOcJustificativa,
  setOcTipo,
  setOffboardDate,
  setOffboardModalidade,
  setOffboardReason,
  setOffboardTipo,
  setSelectedAdvertenciaForModal,
  setSelectedEvalForModal,
  setShowAdvertenciaModal,
  setShowEvalModal,
  setUploadFile,
  setUploadFileType,
  theme,
  uploadFile,
  uploadFileType,
  warningsMap
}: FichaColaboradorProps) {
  // O pai ja decide quando montar, mas a guarda fica: sem colaborador ativo
  // metade do JSX abaixo desreferenciaria null.
  if (!activeColaboradorForDrawer) return null;

  return (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setActiveColaboradorForDrawer(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          />
          {/* Drawer Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-md md:max-w-2xl lg:max-w-4xl p-6 z-50 transform transition-transform duration-300 ease-in-out border-l border-line flex flex-col justify-between glass-fill glass-blur glass-sheen text-fg">
            {/* Cabecalho e abas ficam FORA da area que rola. Antes os tres
                estavam no mesmo container e o nome da pessoa saia da tela
                depois de dois palmos de rolagem, junto com a indicacao de qual
                aba estava aberta - dava para editar a ficha errada sem
                perceber. */}
            <div className="shrink-0 space-y-6">

              {/* Header de perfil */}
              <div className="relative mb-2 pb-4 border-b border-white/10 overflow-hidden">
                {/* brilho + assinatura ambiente */}
                <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 w-56 h-56 rounded-full bg-brand/15 blur-3xl" />
                <img
                  aria-hidden
                  src="/signature-hero.png"
                  alt=""
                  className={`pointer-events-none select-none absolute right-0 top-0 h-full w-1/2 object-cover object-right [mask-image:radial-gradient(120%_120%_at_100%_30%,#000_28%,transparent_72%)] ${theme === 'dark' ? 'mix-blend-screen opacity-60' : 'opacity-20'}`}
                />
                <div className="relative flex items-start gap-4">
                  {/* Avatar: foto ou iniciais + fab de câmera */}
                  {(() => {
                    const nome = activeColaboradorForDrawer.nome || 'Colaborador';
                    const ini = nome.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0] || '').join('').toUpperCase() || '?';
                    return (
                      <div className="relative shrink-0">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-brand/20 shadow-[0_10px_28px_-10px_rgba(16,24,40,0.5)] grid place-items-center bg-brand/12 text-brand">
                          {fotoDrawerUrl
                            ? <img src={fotoDrawerUrl} alt={nome} className="w-full h-full object-cover" />
                            : <span className="font-display text-2xl font-semibold">{ini}</span>}
                        </div>
                        {hasFullAccess && (
                          <button
                            onClick={() => { setUploadFileType('foto'); setDrawerTab('pessoal'); }}
                            title="Trocar foto (aba Pessoal)"
                            aria-label="Trocar foto de perfil"
                            className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-brand text-white grid place-items-center ring-2 ring-surface hover:bg-brand-strong transition-colors"
                          >
                            <Camera size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })()}
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-bold tracking-widest uppercase opacity-60">Prontuário do Colaborador</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <h3 className="font-display text-xl font-semibold truncate">{activeColaboradorForDrawer.nome}</h3>
                      {(() => {
                        const colabAdvs = warningsMap[activeColaboradorForDrawer.id] || [];
                        return colabAdvs.length > 0 && (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[8px] font-extrabold uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20 px-1.5 py-0.5 rounded">
                            <AlertTriangle size={11} />{colabAdvs.length}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-xs opacity-60 truncate mt-0.5">
                      {activeColaboradorForDrawer.cargo}{activeColaboradorForDrawer.setor ? ` · ${activeColaboradorForDrawer.setor}` : ''}
                    </p>
                    {(() => {
                      const st = activeColaboradorForDrawer.status;
                      const map: Record<string, { cls: string; label: string }> = {
                        ativo: { cls: 'bg-emerald-500/12 text-emerald-500', label: 'Ativo' },
                        em_ferias: { cls: 'bg-teal-500/12 text-teal-500', label: 'Em férias' },
                        desligado: { cls: 'bg-rose-500/12 text-rose-500', label: 'Desligado' },
                      };
                      const s = map[st] || { cls: 'bg-amber-500/12 text-amber-600', label: st || '—' };
                      return (
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full mt-2 ${s.cls}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />{s.label}
                        </span>
                      );
                    })()}
                  </div>
                  <button
                    onClick={() => setActiveColaboradorForDrawer(null)}
                    title="Fechar"
                    className={`shrink-0 p-1.5 rounded-lg border hover:bg-white/5 transition-colors ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Tab Selector — scrollable horizontal */}
              <div className="flex border-b border-white/10 mb-5 overflow-x-auto gap-0 scrollbar-hide">
                {([
                  'pessoal',
                  'admissao',
                  'ocorrencias',
                  ...(!(activeColaboradorForDrawer?.cargo?.toLowerCase().includes('coordenador') || activeColaboradorForDrawer?.cargo?.toLowerCase().includes('coordenadora')) ? ['carreira'] : [])
                ] as ('pessoal' | 'admissao' | 'ocorrencias' | 'carreira')[]).map((tab) => {
                  const labels: Record<string, string> = {
                    pessoal: 'Pessoal',
                    admissao: 'Ficha Admissão',
                    ocorrencias: 'Ocorrências',
                    carreira: 'Plano Carreira'
                  };
                  return (
                    <button
                      key={tab}
                      onClick={() => setDrawerTab(tab)}
                      className={`shrink-0 px-3 pb-2.5 text-[9px] font-bold uppercase tracking-wider border-b-2 transition-all ${drawerTab === tab
                          ? 'border-brand text-brand'
                          : 'border-transparent opacity-45 hover:opacity-80'
                        }`}
                    >
                      {labels[tab]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Daqui para baixo e a unica faixa que rola. */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 pt-1">

              {/* ─── TAB: PESSOAL ─── */}
              {drawerTab === 'pessoal' && (
                <div className="space-y-5 animate-fadeIn">

                  {/* Resumo Financeiro / Folha Salarial */}
                  <div className={`p-4 rounded-xl border space-y-3 ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'
                    }`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-50 block">Folha Salarial & Benefícios Ativos</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="opacity-50 block text-[9px] uppercase">Salário Base</span>
                        <span className="font-semibold block font-mono">{getSalarioLiquido(activeColaboradorForDrawer).base}</span>
                      </div>
                      <div>
                        <span className="opacity-50 block text-[9px] uppercase">Salário Líquido</span>
                        <span className="font-bold block font-mono text-emerald-500">{getSalarioLiquido(activeColaboradorForDrawer).liquido}</span>
                      </div>
                      <div>
                        <span className="opacity-50 block text-[9px] uppercase">Total Adicionais</span>
                        <span className="font-semibold block font-mono text-emerald-400">+{getSalarioLiquido(activeColaboradorForDrawer).adicionais}</span>
                      </div>
                      <div>
                        <span className="opacity-50 block text-[9px] uppercase">Total Descontos</span>
                        <span className="font-semibold block font-mono text-rose-400">-{getSalarioLiquido(activeColaboradorForDrawer).descontos}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <h4 className="font-rounded text-xs font-bold uppercase tracking-wider opacity-60">Dados Pessoais & Endereço</h4>
                    <button onClick={() => { setIsEditingDrawer(!isEditingDrawer); setDrawerEditData({}); }} className={`text-[9px] px-2.5 py-1 rounded font-bold border transition-colors ${isEditingDrawer ? 'border-rose-500/30 text-rose-400 bg-rose-500/10' : (theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5')
                      }`}>{isEditingDrawer ? 'Cancelar' : <span className="inline-flex items-center gap-1.5"><Pencil size={13} />Editar</span>}</button>
                  </div>

                  {/* Os campos ja nasceram com span: 2 em quem precisa de linha
                      dupla, mas nao havia grid nenhum acima deles: o col-span-2
                      nao tinha o que dividir e os 22 campos empilhavam um por
                      linha. Este grid e o pai que faltava. */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
                  {([
                    { label: 'Nome Completo', field: 'nome', span: 2 },
                    { label: 'CPF', field: 'cpf' },
                    { label: 'RG', field: 'rg' },
                    { label: 'Data Nascimento', field: 'data_nascimento', type: 'date' },
                    { label: 'Gênero', field: 'genero', type: 'select', opts: [
                      { value: 'F', label: 'Feminino' },
                      { value: 'M', label: 'Masculino' },
                      { value: 'O', label: 'Outro' },
                      { value: 'NI', label: 'Prefiro não declarar' }
                    ] },
                    { label: 'Estado Civil', field: 'estado_civil', type: 'select', opts: ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'] },
                    { label: 'Telefone', field: 'telefone' },
                    { label: 'E-mail Pessoal', field: 'email_pessoal', span: 2 },
                    { label: 'Naturalidade', field: 'naturalidade' },
                    { label: 'Nacionalidade', field: 'nacionalidade' },
                    { label: 'CEP', field: 'cep' },
                    { label: 'Endereço', field: 'endereco', span: 2 },
                    { label: 'Número', field: 'numero' },
                    { label: 'Complemento', field: 'complemento' },
                    { label: 'Bairro', field: 'bairro' },
                    { label: 'Cidade', field: 'cidade' },
                    { label: 'UF', field: 'uf' },
                    { label: 'Cargo', field: 'cargo', span: 2 },
                    { label: 'Setor', field: 'setor' },
                    { label: 'Salário', field: 'salario' },
                    { label: 'Vencimento ASO', field: 'data_aso_vencimento', type: 'date' },
                    { label: 'Limite de Férias', field: 'data_ferias_vencimento', type: 'date' },
                  ] as any[]).map(({ label, field, span, type, opts }: any) => {
                    const val = isEditingDrawer
                      ? (drawerEditData[field] !== undefined ? drawerEditData[field] : activeColaboradorForDrawer[field])
                      : activeColaboradorForDrawer[field];
                    // opts pode ser string[] (label = value) ou {value,label}[]
                    // — genero grava sigla ('M','F','O','NI') mas mostra por
                    // extenso ("Feminino") tanto no select quanto no modo leitura.
                    const normalizedOpts: { value: string; label: string }[] = type === 'select'
                      ? (opts as any[]).map(o => typeof o === 'string' ? { value: o, label: o } : o)
                      : [];
                    const displayVal = type === 'select'
                      ? (normalizedOpts.find(o => o.value === val)?.label ?? val)
                      : val;
                    return (
                      <div key={field} className={span === 2 ? 'col-span-2' : ''}>
                        <label className="block text-[9px] font-bold uppercase opacity-50 mb-0.5">{label}</label>
                        {isEditingDrawer ? (
                          type === 'select' ? (
                            <select value={val || ''} onChange={e => setDrawerEditData((p: any) => ({ ...p, [field]: e.target.value }))}
                              className={`w-full text-xs p-1.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 bg-surface-2' : 'border-black/10 bg-white'}`}>
                              <option value="">—</option>
                              {normalizedOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          ) : (
                            <input type={type || 'text'} value={val || ''} onChange={e => setDrawerEditData((p: any) => ({ ...p, [field]: e.target.value }))}
                              className={`w-full text-xs p-1.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`} />
                          )
                        ) : (
                          <p className="text-xs font-semibold py-0.5">
                            {type === 'date' && val
                              ? new Date(val + 'T12:00:00').toLocaleDateString('pt-BR')
                              : (displayVal || <span className="opacity-30 italic">—</span>)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  </div>

                  {isEditingDrawer && (
                    <button onClick={handleSaveDrawerEdit} disabled={isSavingDrawer}
                      className={`w-full py-2 rounded font-bold text-xs transition-colors ${theme === 'dark' ? 'bg-brand text-white' : 'bg-brand text-white'} disabled:opacity-50`}>
                      {isSavingDrawer ? 'Salvando...' : <span className="inline-flex items-center gap-1.5"><Check size={13} />Salvar Alterações</span>}
                    </button>
                  )}
                  {/* Vale-Transporte (opt-in + % de desconto) */}
                  {(() => {
                    const vtOpta = isEditingDrawer
                      ? (drawerEditData.vt_opta !== undefined ? drawerEditData.vt_opta : activeColaboradorForDrawer.vt_opta)
                      : activeColaboradorForDrawer.vt_opta;
                    const vtPerc = isEditingDrawer
                      ? (drawerEditData.vt_percentual !== undefined ? drawerEditData.vt_percentual : (activeColaboradorForDrawer.vt_percentual ?? 6))
                      : (activeColaboradorForDrawer.vt_percentual ?? 6);
                    return (
                      <div className={`rounded-xl border p-4 space-y-2 ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase opacity-50 font-bold tracking-wider">Vale-Transporte</span>
                          <Bus size={14} />
                        </div>
                        {isEditingDrawer ? (
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                              <input type="checkbox" checked={!!vtOpta}
                                onChange={e => setDrawerEditData((p: any) => ({ ...p, vt_opta: e.target.checked }))} />
                              Colaborador optou pelo vale-transporte
                            </label>
                            {vtOpta && (
                              <div>
                                <label htmlFor="ficha-vtPerc" className="block text-[9px] font-bold uppercase opacity-50 mb-0.5">% de desconto em folha (teto legal 6%)</label>
                                <input id="ficha-vtPerc" type="number" step="0.5" min="0" max="6" value={vtPerc}
                                  onChange={e => setDrawerEditData((p: any) => ({ ...p, vt_percentual: parseFloat(e.target.value) || 0 }))}
                                  className={`w-full text-xs p-1.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs font-semibold">
                            {vtOpta
                              ? <span className="text-emerald-500">Optante · {vtPerc}% de desconto</span>
                              : <span className="opacity-40 italic">Não optante</span>}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Tempo de Casa */}
                  <div className={`rounded-xl border p-4 flex items-center justify-between ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <div>
                      <span className="text-[9px] uppercase opacity-50">Tempo de Casa</span>
                      <p className="text-lg font-bold mt-0.5">{calculateTenure(activeColaboradorForDrawer.data_admissao)}</p>
                    </div>
                    <TrendingUp size={22} className="opacity-40" />
                  </div>

                  {/* Documentos assinados */}
                  <div>
                    <h4 className="text-[9px] font-bold uppercase opacity-50 mb-2">Contratos Assinados</h4>
                    {selectedColabDocuments.length > 0 ? (
                      <div className="space-y-2">
                        {selectedColabDocuments.map((doc: any) => (
                          <div key={doc.id} className="p-2.5 rounded-lg border border-white/5 bg-white/5 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-semibold block truncate max-w-[180px]">
                                {doc.titulo || (doc.documento_id === '1' ? 'Termo de Imagem' : (doc.documento_id === '2' ? 'Contrato Experiência' : 'Documento'))}
                              </span>
                              <span className="text-[10px] opacity-45">Assinado {new Date(doc.assinado_em || '').toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleViewDocument(doc.url_arquivo)}
                                title="Abrir / imprimir para assinatura física"
                                className={`p-1 rounded hover:bg-white/10 ${theme === 'dark' ? 'text-fg' : 'text-fg'}`}>
                                <Printer size={13} />
                              </button>
                              <button onClick={() => handleViewDocument(doc.url_arquivo)}
                                title="Abrir documento"
                                className={`p-1 rounded hover:bg-white/10 ${theme === 'dark' ? 'text-fg' : 'text-fg'}`}>
                                <ExternalLink size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs opacity-40 italic">Nenhum documento assinado.</p>
                    )}
                  </div>

                  {/* Seção de Desligamento */}
                  <div className="pt-4 border-t border-white/10 space-y-4">
                    {activeColaboradorForDrawer.status === 'desligado' ? (
                      <>
                      <div className={`p-4 rounded-xl border text-xs space-y-2 ${theme === 'dark' ? 'bg-rose-500/5 border-rose-500/10 text-fg' : 'bg-rose-500/5 border-rose-500/10 text-rose-800'
                        }`}>
                        <div className="flex items-center gap-1.5 text-rose-500 font-bold uppercase tracking-wider text-[10px]">
                          <AlertTriangle size={12} /> Colaborador Desligado
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
                          <div>
                            <span className="opacity-50 block uppercase text-[9px] font-sans">Data Desligamento</span>
                            <span className="font-semibold">{activeColaboradorForDrawer.data_desligamento ? new Date(activeColaboradorForDrawer.data_desligamento).toLocaleDateString('pt-BR') : '—'}</span>
                          </div>
                          <div>
                            <span className="opacity-50 block uppercase text-[9px] font-sans">Tipo Desligamento</span>
                            <span className="font-semibold">{activeColaboradorForDrawer.tipo_desligamento || '—'}</span>
                          </div>
                          {activeColaboradorForDrawer.motivo_desligamento && (
                            <div className="col-span-2 pt-1">
                              <span className="opacity-50 block uppercase text-[9px] font-sans">Motivo</span>
                              <p className="font-sans leading-relaxed text-xs italic opacity-95">"{activeColaboradorForDrawer.motivo_desligamento}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                      {(() => {
                        const deslig = desligamentosList.find((d: any) => d.colaborador_id === activeColaboradorForDrawer.id);
                        if (!deslig) return null;
                        if (deslig.entrevista_realizada_em) {
                          return (
                            <div className={`p-4 rounded-xl border space-y-2 text-xs ${theme === 'dark' ? 'bg-surface-2 border-white/10' : 'bg-black/5 border-black/10'}`}>
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <h5 className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5"><Check size={14} />Entrevista de Desligamento — {new Date(deslig.entrevista_realizada_em).toLocaleDateString('pt-BR')}</h5>
                                {/* Quem respondeu muda como o RH lê o conteúdo: o ex-colaborador
                                    fala por si; o RH digitando é sempre relato de segunda mão. */}
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                                  deslig.entrevista_origem === 'ex_colaborador'
                                    ? 'bg-sky-500/10 text-sky-500 border-sky-500/20'
                                    : 'bg-white/5 opacity-60 border-white/10'
                                }`}>
                                  {deslig.entrevista_origem === 'ex_colaborador' ? 'Respondida pelo ex-colaborador' : 'Registrada pelo RH'}
                                </span>
                              </div>
                              <p><b>Motivo real:</b> {deslig.entrevista_motivo_real || '—'}</p>
                              <p><b>Pontos positivos:</b> {deslig.entrevista_pontos_positivos || '—'}</p>
                              <p><b>A melhorar:</b> {deslig.entrevista_pontos_melhorar || '—'}</p>
                              <p><b>Recomendaria (0–10):</b> {deslig.entrevista_recomendaria ?? '—'}</p>
                              {deslig.entrevista_comentarios && <p className="italic opacity-80">"{deslig.entrevista_comentarios}"</p>}
                            </div>
                          );
                        }
                        // Mesma conta da RPC submit_entrevista_desligamento: data_termino + 15.
                        // Se já venceu, gerar link não adianta — o banco recusaria o envio.
                        const prazoEntrevista = new Date(`${deslig.data_termino}T00:00:00`);
                        prazoEntrevista.setDate(prazoEntrevista.getDate() + 15);
                        const prazoLabel = prazoEntrevista.toLocaleDateString('pt-BR');
                        const prazoVencido = prazoEntrevista < new Date(new Date().toDateString());
                        const linkAtivo = !!deslig.entrevista_token && deslig.entrevista_token_ativo !== false;
                        const linkUrl = deslig.entrevista_token
                          ? `${window.location.origin}/entrevista-desligamento/${deslig.entrevista_token}`
                          : '';
                        const mexerNoLink = async (patch: any, evento: string, msg: string) => {
                          setIsMexendoLinkEntrevista(true);
                          try {
                            const { error } = await supabase.from('desligamentos').update(patch).eq('id', deslig.id);
                            if (error) throw error;
                            await logAuditoria(evento, { desligamento_id: deslig.id, colaborador_id: deslig.colaborador_id });
                            notify(msg);
                            fetchColaboradoresList();
                          } catch (err: any) { notify('Erro no link da entrevista: ' + err.message); }
                          finally { setIsMexendoLinkEntrevista(false); }
                        };
                        return (
                          <div className={`p-4 rounded-xl border space-y-3 ${theme === 'dark' ? 'bg-surface-2 border-white/10' : 'bg-black/5 border-black/10'}`}>
                            <h5 className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5"><ClipboardList size={14} />Entrevista de Desligamento — pendente</h5>

                            {/* Caminho preferido: o próprio ex-colaborador responde pelo link.
                                O formulário manual logo abaixo continua existindo como saída —
                                muita gente simplesmente não responde, e o RH não pode ficar
                                sem o registro por causa disso. */}
                            <div className={`p-3 rounded-lg border space-y-2 ${theme === 'dark' ? 'bg-black/20 border-white/10' : 'bg-white border-black/10'}`}>
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 flex items-center gap-1.5"><Link2 size={13} />Link para o ex-colaborador</span>
                                <span className={`text-[10px] font-semibold ${prazoVencido ? 'text-rose-500' : 'opacity-60'}`}>
                                  {prazoVencido ? `Prazo encerrado em ${prazoLabel}` : `Válido até ${prazoLabel}`}
                                </span>
                              </div>

                              {linkAtivo ? (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      readOnly
                                      value={linkUrl}
                                      onFocus={e => e.currentTarget.select()}
                                      className={`flex-1 min-w-0 p-2 rounded border text-[11px] font-mono bg-transparent ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`}
                                    />
                                    <button
                                      title="Copiar link"
                                      onClick={() => { navigator.clipboard.writeText(linkUrl); notify('Link copiado.'); }}
                                      className={`p-2 rounded border shrink-0 transition-colors ${theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'}`}
                                    ><Copy size={13} /></button>
                                  </div>
                                  <button
                                    disabled={isMexendoLinkEntrevista}
                                    onClick={() => mexerNoLink({ entrevista_token_ativo: false }, 'ENTREVISTA_DESLIGAMENTO_LINK_REVOGADO', 'Link revogado.')}
                                    className="text-[10px] font-bold text-rose-500 hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                                  ><Ban size={11} />Revogar link</button>
                                </>
                              ) : (
                                <button
                                  disabled={isMexendoLinkEntrevista || prazoVencido}
                                  onClick={() => mexerNoLink(
                                    { entrevista_token: crypto.randomUUID().replace(/-/g, ''), entrevista_token_ativo: true },
                                    'ENTREVISTA_DESLIGAMENTO_LINK_GERADO',
                                    'Link gerado.'
                                  )}
                                  className="w-full py-2 rounded-lg font-bold text-xs bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 transition-colors"
                                >
                                  {isMexendoLinkEntrevista
                                    ? 'Gerando…'
                                    : <span className="inline-flex items-center gap-1.5"><Link2 size={13} />{deslig.entrevista_token ? 'Gerar novo link' : 'Gerar link'}</span>}
                                </button>
                              )}

                              <p className="text-[10px] opacity-55 leading-relaxed">
                                Aceita uma única resposta e expira em {prazoLabel}. Assim que for respondida,
                                aparece aqui automaticamente.
                              </p>
                            </div>

                            <p className="text-[10px] font-bold uppercase tracking-wider opacity-45 pt-1">ou registre você mesma</p>
                            <div className="space-y-2 text-xs">
                              <select value={entrevistaDraft.motivo_real} onChange={e => setEntrevistaDraft(p => ({ ...p, motivo_real: e.target.value }))} className={`w-full p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-surface-2' : 'border-black/10 text-black bg-white'}`}>
                                {['Remuneração', 'Liderança', 'Carreira', 'Clima', 'Pessoal', 'Outro'].map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                              <input placeholder="Detalhe do motivo (opcional)" value={entrevistaDraft.motivo_texto} onChange={e => setEntrevistaDraft(p => ({ ...p, motivo_texto: e.target.value }))} className={`w-full p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-surface-2' : 'border-black/10 text-black bg-white'}`} />
                              <textarea rows={2} placeholder="O que funcionou bem?" value={entrevistaDraft.pontos_positivos} onChange={e => setEntrevistaDraft(p => ({ ...p, pontos_positivos: e.target.value }))} className={`w-full p-2.5 rounded border bg-transparent resize-none ${theme === 'dark' ? 'border-white/10 text-white bg-surface-2' : 'border-black/10 text-black bg-white'}`} />
                              <textarea rows={2} placeholder="O que a clínica pode melhorar?" value={entrevistaDraft.pontos_melhorar} onChange={e => setEntrevistaDraft(p => ({ ...p, pontos_melhorar: e.target.value }))} className={`w-full p-2.5 rounded border bg-transparent resize-none ${theme === 'dark' ? 'border-white/10 text-white bg-surface-2' : 'border-black/10 text-black bg-white'}`} />
                              <div>
                                <label htmlFor="ficha-recomendaria" className="block text-[9px] font-bold uppercase opacity-65 mb-1">Recomendaria trabalhar aqui? (0–10)</label>
                                <input id="ficha-recomendaria" type="number" min={0} max={10} value={entrevistaDraft.recomendaria} onChange={e => setEntrevistaDraft(p => ({ ...p, recomendaria: e.target.value }))} className={`w-full p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-surface-2' : 'border-black/10 text-black bg-white'}`} />
                              </div>
                              <textarea rows={2} placeholder="Comentários finais (opcional)" value={entrevistaDraft.comentarios} onChange={e => setEntrevistaDraft(p => ({ ...p, comentarios: e.target.value }))} className={`w-full p-2.5 rounded border bg-transparent resize-none ${theme === 'dark' ? 'border-white/10 text-white bg-surface-2' : 'border-black/10 text-black bg-white'}`} />
                              <button
                                disabled={isSavingEntrevista}
                                onClick={async () => {
                                  setIsSavingEntrevista(true);
                                  try {
                                    const nota = parseInt(entrevistaDraft.recomendaria, 10);
                                    const { error } = await supabase.from('desligamentos').update({
                                      entrevista_realizada_em: new Date().toISOString(),
                                      entrevista_motivo_real: entrevistaDraft.motivo_texto.trim() ? `${entrevistaDraft.motivo_real} — ${entrevistaDraft.motivo_texto.trim()}` : entrevistaDraft.motivo_real,
                                      entrevista_pontos_positivos: entrevistaDraft.pontos_positivos.trim() || null,
                                      entrevista_pontos_melhorar: entrevistaDraft.pontos_melhorar.trim() || null,
                                      entrevista_recomendaria: isNaN(nota) ? null : Math.max(0, Math.min(10, nota)),
                                      entrevista_comentarios: entrevistaDraft.comentarios.trim() || null,
                                      entrevista_origem: 'rh'
                                    }).eq('id', deslig.id);
                                    if (error) throw error;
                                    await logAuditoria('ENTREVISTA_DESLIGAMENTO_REGISTRADA', { desligamento_id: deslig.id, colaborador_id: deslig.colaborador_id });
                                    notify('Entrevista registrada.');
                                    setEntrevistaDraft({ motivo_real: 'Remuneração', motivo_texto: '', pontos_positivos: '', pontos_melhorar: '', recomendaria: '7', comentarios: '' });
                                    fetchColaboradoresList();
                                  } catch (err: any) { notify('Erro ao salvar entrevista: ' + err.message); }
                                  finally { setIsSavingEntrevista(false); }
                                }}
                                className="w-full py-2 rounded-lg font-bold text-xs bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                              >{isSavingEntrevista ? 'Salvando…' : <span className="inline-flex items-center gap-1.5"><Check size={13} />Registrar Entrevista</span>}</button>
                            </div>
                          </div>
                        );
                      })()}
                      </>
                    ) : isOffboardingMode ? (
                      <div className={`p-4 rounded-xl border space-y-3.5 ${theme === 'dark' ? 'bg-surface-2 border-white/10' : 'bg-black/5 border-black/10'
                        }`}>
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1">
                          <AlertTriangle size={14} />Formulário de Desligamento
                        </h5>
                        <div className="space-y-3 text-xs">
                          <div>
                            <label htmlFor="ficha-offboardDate" className="block text-[9px] font-bold uppercase opacity-65 mb-1">Data da Comunicação *</label>
                            <input id="ficha-offboardDate"
                              type="date"
                              required
                              value={offboardDate}
                              onChange={e => setOffboardDate(e.target.value)}
                              className={`w-full p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-surface-2' : 'border-black/10 text-black bg-white'
                                }`}
                            />
                          </div>
                          <div>
                            <label htmlFor="ficha-offboardTipo" className="block text-[9px] font-bold uppercase opacity-65 mb-1">Tipo de Desligamento *</label>
                            <select id="ficha-offboardTipo"
                              value={offboardTipo}
                              onChange={e => setOffboardTipo(e.target.value as any)}
                              className={`w-full p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-surface-2' : 'border-black/10 text-black bg-white'
                                }`}
                            >
                              <option value="sem_justa_causa" className={theme === 'dark' ? 'bg-surface-2 text-white' : 'bg-white text-black'}>Sem justa causa (empresa desliga)</option>
                              <option value="pedido_demissao" className={theme === 'dark' ? 'bg-surface-2 text-white' : 'bg-white text-black'}>Pedido de demissão (colaborador sai)</option>
                            </select>
                          </div>
                          <div>
                            <label htmlFor="ficha-offboardModalidade" className="block text-[9px] font-bold uppercase opacity-65 mb-1">Modalidade do Aviso *</label>
                            <select id="ficha-offboardModalidade"
                              value={offboardModalidade}
                              onChange={e => setOffboardModalidade(e.target.value as any)}
                              className={`w-full p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-surface-2' : 'border-black/10 text-black bg-white'
                                }`}
                            >
                              <option value="indenizado_ou_dispensado" className={theme === 'dark' ? 'bg-surface-2 text-white' : 'bg-white text-black'}>Aviso indenizado / dispensado</option>
                              <option value="trabalhado" className={theme === 'dark' ? 'bg-surface-2 text-white' : 'bg-white text-black'}>Aviso trabalhado</option>
                            </select>
                          </div>
                          {offboardDate && (() => {
                            const p = calcularPrazosDesligamento(offboardTipo, offboardModalidade, offboardDate, activeColaboradorForDrawer?.data_admissao);
                            const fmt = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
                            return (
                              <div className={`p-3 rounded-lg border text-[10px] space-y-1 ${theme === 'dark' ? 'bg-amber-500/8 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                                <p><b>Aviso prévio:</b> {p.diasAviso} dias</p>
                                <p><b>Término do contrato:</b> {fmt(p.dataTermino)}</p>
                                <p><b>Pagamento das verbas até:</b> {fmt(p.dataLimitePagamento)} (CLT 477 §6º)</p>
                              </div>
                            );
                          })()}
                          <div>
                            <label htmlFor="ficha-offboardReason" className="block text-[9px] font-bold uppercase opacity-65 mb-1">Motivo do Desligamento</label>
                            <textarea id="ficha-offboardReason"
                              rows={2.5}
                              placeholder="Descreva brevemente o motivo..."
                              value={offboardReason}
                              onChange={e => setOffboardReason(e.target.value)}
                              className={`w-full p-2.5 rounded border bg-transparent resize-none focus:outline-none ${theme === 'dark' ? 'border-white/10 text-white bg-surface-2' : 'border-black/10 text-black bg-white'
                                }`}
                            />
                          </div>
                          <div className="flex gap-2 pt-1.5">
                            <button
                              type="button"
                              onClick={handleOffboardColaborador}
                              disabled={isSavingOffboard || !offboardDate}
                              className="flex-1 py-2 rounded-lg font-bold text-xs bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
                            >
                              {isSavingOffboard ? 'Processando...' : <span className="inline-flex items-center gap-1.5"><Check size={13} />Confirmar Desligamento</span>}
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsOffboardingMode(false)}
                              className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'
                                }`}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsOffboardingMode(true)}
                        className="w-full py-2.5 rounded-lg border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <AlertTriangle size={13} />Desligar Colaborador
                      </button>
                    )}
                  </div>
                </div>
              )}

              {drawerTab === 'admissao' && (
                <div className="space-y-6 animate-fadeIn text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-white/10">
                    <h4 className="font-rounded text-xs font-bold uppercase tracking-wider opacity-60">Dossiê de Admissão (Onboarding)</h4>
                  </div>

                  {activeColaboradorForDrawer.ficha_admissao ? (
                    <div className="space-y-5">
                      {/* Section 1 */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 block">Dados Pessoais</span>
                        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-white/5 bg-white/5">
                          <div className="col-span-2">
                            <span className="opacity-50 block text-[9px] uppercase">Nome Social</span>
                            <span className="font-semibold block">{activeColaboradorForDrawer.ficha_admissao.nome_social || '—'}</span>
                          </div>
                          <div>
                            <span className="opacity-50 block text-[9px] uppercase">Raça/Cor</span>
                            <span className="font-semibold block">{activeColaboradorForDrawer.ficha_admissao.raca_cor || '—'}</span>
                          </div>
                          <div>
                            <span className="opacity-50 block text-[9px] uppercase">Sexo</span>
                            <span className="font-semibold block">{activeColaboradorForDrawer.ficha_admissao.genero || '—'}</span>
                          </div>
                          <div>
                            <span className="opacity-50 block text-[9px] uppercase">Nome da Mãe</span>
                            <span className="font-semibold block">{activeColaboradorForDrawer.ficha_admissao.nome_mae || '—'}</span>
                          </div>
                          <div>
                            <span className="opacity-50 block text-[9px] uppercase">Nome do Pai</span>
                            <span className="font-semibold block">{activeColaboradorForDrawer.ficha_admissao.nome_pai || '—'}</span>
                          </div>
                          <div>
                            <span className="opacity-50 block text-[9px] uppercase">Deficiência</span>
                            <span className="font-semibold block">
                              {activeColaboradorForDrawer.ficha_admissao.possui_deficiencia === 'Sim'
                                ? `Sim (${activeColaboradorForDrawer.ficha_admissao.deficiencia_qual})`
                                : 'Não'}
                            </span>
                          </div>
                          <div>
                            <span className="opacity-50 block text-[9px] uppercase">Dependentes</span>
                            <span className="font-semibold block">
                              {activeColaboradorForDrawer.ficha_admissao.possui_dependentes === 'Sim'
                                ? `Sim (${activeColaboradorForDrawer.ficha_admissao.dependentes_detalhes})`
                                : 'Não'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Section 2 */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 block">Registro, Escolaridade & Pagamento</span>
                        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-white/5 bg-white/5">
                          <div>
                            <span className="opacity-50 block text-[9px] uppercase">Vínculo & Regime</span>
                            <span className="font-semibold block">
                              {activeColaboradorForDrawer.ficha_admissao.tipo_vinculo} · {activeColaboradorForDrawer.ficha_admissao.jornada_regime}
                            </span>
                          </div>
                          <div>
                            <span className="opacity-50 block text-[9px] uppercase">Escolaridade</span>
                            <span className="font-semibold block">{activeColaboradorForDrawer.ficha_admissao.escolaridade || '—'}</span>
                          </div>
                          <div>
                            <span className="opacity-50 block text-[9px] uppercase">Banco & Tipo Conta</span>
                            <span className="font-semibold block">{activeColaboradorForDrawer.ficha_admissao.banco_nome || '—'}</span>
                          </div>
                          <div>
                            <span className="opacity-50 block text-[9px] uppercase">Agência / Conta</span>
                            <span className="font-semibold block">{activeColaboradorForDrawer.ficha_admissao.banco_agencia || '—'}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="opacity-50 block text-[9px] uppercase">Chave PIX</span>
                            <span className="font-semibold block">{activeColaboradorForDrawer.ficha_admissao.banco_pix || '—'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Section 3 */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 block">Saúde & Emergência</span>
                        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-white/5 bg-white/5">
                          <div>
                            <span className="opacity-50 block text-[9px] uppercase">Medicação Contínua</span>
                            <span className="font-semibold block">
                              {activeColaboradorForDrawer.ficha_admissao.medicacao_continua === 'Sim'
                                ? `Sim (${activeColaboradorForDrawer.ficha_admissao.medicacao_continua_qual})`
                                : 'Não'}
                            </span>
                          </div>
                          <div>
                            <span className="opacity-50 block text-[9px] uppercase">Alergias</span>
                            <span className="font-semibold block">
                              {activeColaboradorForDrawer.ficha_admissao.alergias_relevantes === 'Sim'
                                ? `Sim (${activeColaboradorForDrawer.ficha_admissao.alergias_relevantes_qual})`
                                : 'Não'}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="opacity-50 block text-[9px] uppercase">Contato Emergência</span>
                            <span className="font-semibold block">
                              {activeColaboradorForDrawer.ficha_admissao.emergencia_nome} ({activeColaboradorForDrawer.ficha_admissao.emergencia_parentesco}) · {activeColaboradorForDrawer.ficha_admissao.emergencia_telefone}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-lg border border-white/5 bg-white/5 text-center opacity-50 italic">
                      Colaborador legado ou sem ficha cadastral digital preenchida.
                    </div>
                  )}

                  {/* Documentos & Fotos Anexados (renderizado para todos!) */}
                  <div className="space-y-3 pt-4 border-t border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 block">Documentos & Fotos Anexados</span>
                    {activeColaboradorForDrawer.documentos_anexos && Object.keys(activeColaboradorForDrawer.documentos_anexos).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(activeColaboradorForDrawer.documentos_anexos).map(([docType, path]: [string, any]) => {
                          const labels: Record<string, string> = {
                            identidade: 'Documento de Identidade (RG/CNH)',
                            residencia: 'Comprovante de Residência',
                            aso: 'Atestado de Saúde Ocupacional (ASO)',
                            foto: 'Foto / Selfie Cadastral',
                            outros: 'Outros Anexos'
                          };
                          return (
                            <div key={docType} className="p-2.5 rounded-lg border border-white/5 bg-white/5 flex items-center justify-between text-xs animate-fadeIn">
                              <div>
                                <span className="font-semibold block">{labels[docType] || docType}</span>
                                <span className="text-[9px] opacity-45 font-mono truncate block max-w-[200px]">{path}</span>
                              </div>
                              <button
                                onClick={() => handleDownloadAttachment(path)}
                                className={`p-1.5 rounded hover:bg-white/10 ${theme === 'dark' ? 'text-fg' : 'text-fg'}`}
                                title="Visualizar documento privado"
                              >
                                <ExternalLink size={13} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs opacity-40 italic">Nenhum documento ou foto anexada à ficha.</p>
                    )}
                  </div>

                  {/* Área de Upload de Anexos */}
                  {hasFullAccess && (
                    <div className={`p-4 rounded-xl border space-y-3 mt-4 ${theme === 'dark' ? 'bg-surface-2 border-white/10' : 'bg-black/5 border-black/10'
                      }`}>
                      <h5 className="text-[10px] font-bold uppercase tracking-wider opacity-75 flex items-center gap-1.5"><Plus size={14} />Enviar Novo Documento ou Foto</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="ficha-uploadFileType" className="block text-[8px] font-bold uppercase opacity-50 mb-1">Tipo de Anexo</label>
                          <select id="ficha-uploadFileType"
                            value={uploadFileType}
                            onChange={(e) => setUploadFileType(e.target.value as any)}
                            className={`w-full text-xs p-2 rounded border focus:outline-none bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-surface-2' : 'border-black/10 text-black bg-white'
                              }`}
                          >
                            <option value="identidade" className={theme === 'dark' ? 'bg-surface-2 text-white' : 'bg-white text-black'}>Identidade (RG/CNH)</option>
                            <option value="residencia" className={theme === 'dark' ? 'bg-surface-2 text-white' : 'bg-white text-black'}>Comprovante de Residência</option>
                            <option value="aso" className={theme === 'dark' ? 'bg-surface-2 text-white' : 'bg-white text-black'}>Atestado de Saúde Ocupacional (ASO)</option>
                            <option value="foto" className={theme === 'dark' ? 'bg-surface-2 text-white' : 'bg-white text-black'}>Foto de Perfil</option>
                            <option value="outros" className={theme === 'dark' ? 'bg-surface-2 text-white' : 'bg-white text-black'}>Outros Documentos</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold uppercase opacity-50 mb-1">Selecionar Arquivo</label>
                          <input
                            id="drawer-file-upload-input"
                            type="file"
                            accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                            className={`w-full text-[10px] p-1.5 rounded border ${theme === 'dark' ? 'border-white/10 text-white bg-surface-2' : 'border-black/10 text-black bg-white'
                              }`}
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleUploadColaboradorFile}
                        disabled={isUploadingFile || !uploadFile}
                        className={`w-full py-2 rounded-lg font-bold text-xs transition-colors ${theme === 'dark' ? 'bg-brand text-white' : 'bg-brand text-white'
                          } disabled:opacity-50`}
                      >
                        {isUploadingFile ? 'Enviando...' : <span className="inline-flex items-center gap-1.5"><Check size={13} />Fazer Upload</span>}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {drawerTab === 'ocorrencias' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Button to toggle form */}
                  <div className="flex justify-between items-center">
                    <h4 className="font-rounded text-xs font-bold uppercase tracking-wider opacity-60">Histórico de Ocorrências</h4>
                    {hasFullAccess && (
                      <button
                        onClick={() => setIsRegisteringOcorrencia(!isRegisteringOcorrencia)}
                        className={`text-[10px] px-3 py-1.5 rounded font-bold uppercase transition-all ${isRegisteringOcorrencia
                            ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
                            : (theme === 'dark' ? 'bg-white/5 border border-white/10 hover:bg-white/10 text-white' : 'bg-black/5 border-black/10 hover:bg-black/10 text-black')
                          }`}
                      >
                        {isRegisteringOcorrencia ? 'Cancelar' : 'Registrar Ocorrência'}
                      </button>
                    )}
                  </div>

                  {/* Form Section */}
                  {isRegisteringOcorrencia && (
                    <form onSubmit={handleRegisterOcorrencia} className={`p-4 rounded-xl border space-y-3 ${theme === 'dark' ? 'bg-surface-2 border-white/10' : 'bg-black/5 border-black/10'
                      }`}>
                      <div>
                        <label htmlFor="ficha-ocTipo" className="block text-[9px] font-bold uppercase opacity-65 mb-1">Tipo de Ocorrência</label>
                        <select id="ficha-ocTipo"
                          value={ocTipo}
                          onChange={(e) => setOcTipo(e.target.value)}
                          className={`w-full text-xs p-2.5 rounded border focus:outline-none bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-surface-2' : 'border-black/10 text-black bg-white'
                            }`}
                        >
                          <option value="Atraso">Atraso</option>
                          <option value="Falta Injustificada">Falta Injustificada</option>
                          <option value="Falta Justificada (Atestado)">Falta Justificada (Atestado)</option>
                          <option value="Saída Antecipada">Saída Antecipada</option>
                          <option value="Descumprimento de Carga">Descumprimento de Carga</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="ficha-ocData" className="block text-[9px] font-bold uppercase opacity-65 mb-1">Data da Ocorrência</label>
                          <input id="ficha-ocData"
                            type="date"
                            required
                            value={ocData}
                            onChange={(e) => setOcData(e.target.value)}
                            className={`w-full text-xs p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-surface-2' : 'border-black/10 text-black bg-white'
                              }`}
                          />
                        </div>
                        <div>
                          <label htmlFor="ficha-ocDesvio" className="block text-[9px] font-bold uppercase opacity-65 mb-1">Tempo de Desvio (Opcional)</label>
                          <input id="ficha-ocDesvio"
                            type="text"
                            placeholder="Ex: 45 min ou 02:00h"
                            value={ocDesvio}
                            onChange={(e) => setOcDesvio(e.target.value)}
                            className={`w-full text-xs p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-surface-2' : 'border-black/10 text-black bg-white'
                              }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="ficha-ocJustificativa" className="block text-[9px] font-bold uppercase opacity-65 mb-1">Justificativa / Motivo</label>
                        <textarea id="ficha-ocJustificativa"
                          required
                          rows={3}
                          placeholder="Descreva o ocorrido..."
                          value={ocJustificativa}
                          onChange={(e) => setOcJustificativa(e.target.value)}
                          className={`w-full text-xs p-2.5 rounded border bg-transparent resize-none ${theme === 'dark' ? 'border-white/10 text-white bg-surface-2' : 'border-black/10 text-black bg-white'
                            }`}
                        />
                      </div>

                      <div>
                        <label htmlFor="ficha-atestado-anexo-pdf-imagem" className="block text-[9px] font-bold uppercase opacity-65 mb-1">Atestado / Anexo (PDF/Imagem)</label>
                        <input id="ficha-atestado-anexo-pdf-imagem"
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => setOcFile(e.target.files?.[0] || null)}
                          className="w-full text-[10px] opacity-75"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingOcorrencia}
                        className={`w-full py-2.5 rounded text-[10px] font-bold tracking-wider uppercase transition-colors ${theme === 'dark'
                            ? 'bg-brand text-white hover:bg-brand-strong'
                            : 'bg-brand text-white hover:bg-brand-strong'
                          } disabled:opacity-50`}
                      >
                        {isSubmittingOcorrencia ? 'Salvando...' : 'Gravar Ocorrência'}
                      </button>
                    </form>
                  )}

                  {/* List Section */}
                  <div className="space-y-3">
                    {ocorrenciasList.length > 0 ? (
                      ocorrenciasList.map((oc) => {
                        const badgeColors: Record<string, string> = {
                          'Atraso': 'bg-amber-500/10 border-amber-500/20 text-amber-500',
                          'Falta Injustificada': 'bg-rose-500/10 border-rose-500/20 text-rose-500',
                          'Falta Justificada (Atestado)': 'bg-sky-500/10 border-sky-500/20 text-sky-500',
                          'Saída Antecipada': 'bg-purple-500/10 border-purple-500/20 text-purple-500',
                          'Descumprimento de Carga': 'bg-pink-500/10 border-pink-500/20 text-pink-500'
                        };

                        return (
                          <div key={oc.id} className={`p-3.5 rounded-xl border space-y-2.5 ${theme === 'dark' ? 'glass-fill border-line' : 'glass-fill border-line'
                            }`}>
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${badgeColors[oc.tipo] || 'bg-white/10 text-white'}`}>
                                {oc.tipo}
                              </span>
                              <span className="text-[10px] font-mono opacity-50">
                                {new Date(oc.data_ocorrencia).toLocaleDateString('pt-BR')}
                              </span>
                            </div>

                            {oc.justificativa && (
                              <p className="text-xs opacity-75 italic leading-relaxed">
                                "{oc.justificativa}"
                              </p>
                            )}

                            {(oc.horas_minutos_desvio || oc.anexo_url) && (
                              <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-white/5 opacity-60">
                                {oc.horas_minutos_desvio ? (
                                  <span>Desvio: <strong>{oc.horas_minutos_desvio}</strong></span>
                                ) : <span />}

                                {oc.anexo_url && (
                                  <a
                                    href={oc.anexo_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 hover:underline text-sky-500 font-semibold"
                                  >
                                    <ExternalLink size={10} /> Ver Anexo
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs opacity-50 italic text-center py-6">Nenhuma ocorrência registrada para este colaborador.</p>
                    )}
                  </div>

                  {/* Divider */}
                  <hr className={`border-t my-4 ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`} />

                  {/* Advertências Formais Section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-rounded text-xs font-bold uppercase tracking-wider opacity-60">Advertências Formais</h4>
                      {hasFullAccess && (
                        <button
                          onClick={() => setIsRegisteringAdvertencia(!isRegisteringAdvertencia)}
                          className={`text-[10px] px-3 py-1.5 rounded font-bold uppercase transition-all ${isRegisteringAdvertencia
                              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
                              : (theme === 'dark' ? 'bg-white/5 border border-white/10 hover:bg-white/10 text-white' : 'bg-black/5 border-black/10 hover:bg-black/10 text-black')
                            }`}
                        >
                          {isRegisteringAdvertencia ? 'Cancelar' : 'Registrar Advertência'}
                        </button>
                      )}
                    </div>

                    {/* Form Cadastro Advertência */}
                    {isRegisteringAdvertencia && (
                      <form onSubmit={handleRegisterAdvertencia} className={`p-4 rounded-xl border space-y-3 ${theme === 'dark' ? 'bg-surface-2 border-white/10' : 'bg-black/5 border-black/10'
                        }`}>
                        <div>
                          <label htmlFor="ficha-advDataFalta" className="block text-[9px] font-bold uppercase opacity-65 mb-1">Data da Falta</label>
                          <input id="ficha-advDataFalta"
                            type="date"
                            required
                            value={advDataFalta}
                            onChange={(e) => setAdvDataFalta(e.target.value)}
                            className={`w-full text-xs p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-surface-2' : 'border-black/10 text-black bg-white'
                              }`}
                          />
                        </div>

                        <div>
                          <label htmlFor="ficha-advDescricaoSituacao" className="block text-[9px] font-bold uppercase opacity-65 mb-1">Descrição Detalhada da Situação</label>
                          <textarea id="ficha-advDescricaoSituacao"
                            required
                            rows={4}
                            placeholder="Descreva a atitude/falta cometida pelo funcionário..."
                            value={advDescricaoSituacao}
                            onChange={(e) => setAdvDescricaoSituacao(e.target.value)}
                            className={`w-full text-xs p-2.5 rounded border bg-transparent resize-none ${theme === 'dark' ? 'border-white/10 text-white bg-surface-2' : 'border-black/10 text-black bg-white'
                              }`}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSavingAdvertencia}
                          className={`w-full py-2.5 rounded text-[10px] font-bold tracking-wider uppercase transition-colors ${theme === 'dark'
                              ? 'bg-brand text-white hover:bg-brand-strong'
                              : 'bg-brand text-white hover:bg-brand-strong'
                            } disabled:opacity-50`}
                        >
                          {isSavingAdvertencia ? 'Salvando...' : 'Emitir Advertência'}
                        </button>
                      </form>
                    )}

                    {/* Lista de Advertências */}
                    <div className="space-y-3">
                      {(() => {
                        const colabAdvs = warningsMap[activeColaboradorForDrawer.id] || [];
                        return colabAdvs.length > 0 ? (
                          colabAdvs.map((adv: any) => (
                          <div key={adv.id} className={`p-3.5 rounded-xl border space-y-2.5 ${theme === 'dark' ? 'glass-fill border-line' : 'glass-fill border-line'
                            }`}>
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold border bg-rose-500/10 border-rose-500/20 text-rose-500">
                                ADVERTÊNCIA DISCIPLINAR
                              </span>
                              <span className="text-[10px] font-mono opacity-50">
                                {new Date(adv.data_falta + 'T12:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            </div>

                            <p className="text-xs opacity-85 leading-relaxed">
                              {adv.descricao_situacao}
                            </p>

                            <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-white/5 opacity-60">
                              <span>Emitido por: <strong>{adv.avaliador_email?.split('@')[0]}</strong></span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAdvertenciaForModal(adv);
                                  setShowAdvertenciaModal(true);
                                }}
                                className="flex items-center gap-1 hover:underline text-rose-500 font-bold"
                              >
                                <FileText size={13} />Visualizar / Imprimir
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs opacity-50 italic text-center py-6">Nenhuma advertência disciplinar registrada.</p>
                      );
                    })()}
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === 'carreira' && (() => {
                const plano = dbPlanosCarreira.find(p => p.cargo_atual === activeColaboradorForDrawer.cargo);

                const getMonthsElapsed = (dateStr: string) => {
                  if (!dateStr) return 0;
                  const start = new Date(dateStr + 'T12:00:00');
                  const end = new Date();
                  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
                };

                const monthsElapsed = getMonthsElapsed(activeColaboradorForDrawer.data_admissao);
                const requiredMonths = plano?.requisito_tempo_meses ?? 12;
                const isTempoOk = monthsElapsed >= requiredMonths;

                const date180Ago = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
                const recentOcorrencias = ocorrenciasList.filter(o => {
                  if (!o.data_ocorrencia) return false;
                  return new Date(o.data_ocorrencia + 'T12:00:00') >= date180Ago;
                });
                const isOcorrenciasOk = recentOcorrencias.length === 0;

                const colabAvaliacoes = dbAvaliacoesDesempenho.filter(a => a.colaborador_id === activeColaboradorForDrawer.id);
                const latestAvaliacao = colabAvaliacoes[0];
                const requiredNota = plano?.requisito_nota_avaliacao ?? 4.0;
                const isNotaOk = latestAvaliacao ? Number(latestAvaliacao.nota) >= requiredNota : false;

                const isEligibleForPromotion = !!plano && isTempoOk && isOcorrenciasOk && isNotaOk;

                return (
                  <div className="space-y-6 animate-fadeIn">
                    {/* Trilha de Progressão */}
                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'
                      }`}>
                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-50 block mb-3">Plano de Carreira Ativo</span>
                      {plano ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="text-left">
                              <span className="text-[8px] uppercase tracking-wider opacity-50 block">Cargo Atual</span>
                              <span className="text-xs font-bold">{plano.cargo_atual}</span>
                            </div>
                            <div className="px-2 py-1 rounded bg-brand/10 text-brand flex items-center"><ArrowRight size={13} /></div>
                            <div className="text-right">
                              <span className="text-[8px] uppercase tracking-wider opacity-50 block">Próximo Nível</span>
                              <span className="text-xs font-bold text-emerald-400">{plano.proximo_cargo}</span>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                            <span className="opacity-60">Salário Projetado:</span>
                            <strong className="font-mono text-emerald-400 text-xs">{plano.salario_projetado}</strong>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs opacity-50 italic text-center py-2">
                          Nenhuma trilha padrão mapeada para o cargo: <strong>{activeColaboradorForDrawer.cargo}</strong>.
                        </div>
                      )}
                    </div>

                    {/* Status de Critérios */}
                    <div className="space-y-3">
                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-50 block">Critérios para Promoção</span>

                      {/* Critério: Tempo de Casa */}
                      <div className={`p-3.5 rounded-xl border flex items-center justify-between ${theme === 'dark' ? 'glass-fill border-line' : 'glass-fill border-line'
                        }`}>
                        <div>
                          <span className="text-[10px] font-bold block">Tempo de Casa</span>
                          <span className="text-[9px] opacity-60 block mt-0.5">Mínimo necessário: {requiredMonths} meses</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-semibold">{monthsElapsed} meses</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${isTempoOk ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            }`}>
                            {isTempoOk ? 'OK' : 'Falta tempo'}
                          </span>
                        </div>
                      </div>

                      {/* Critério: Ocorrências */}
                      <div className={`p-3.5 rounded-xl border flex items-center justify-between ${theme === 'dark' ? 'glass-fill border-line' : 'glass-fill border-line'
                        }`}>
                        <div>
                          <span className="text-[10px] font-bold block">Ocorrências (Últimos 6 meses)</span>
                          <span className="text-[9px] opacity-60 block mt-0.5">Meta: Zero ocorrências</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-semibold">{recentOcorrencias.length} reg.</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${isOcorrenciasOk ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            }`}>
                            {isOcorrenciasOk ? 'OK' : 'Pendente'}
                          </span>
                        </div>
                      </div>

                      {/* Critério: Avaliação Desempenho */}
                      <div className={`p-3.5 rounded-xl border flex items-center justify-between ${theme === 'dark' ? 'glass-fill border-line' : 'glass-fill border-line'
                        }`}>
                        <div>
                          <span className="text-[10px] font-bold block">Avaliação Desempenho</span>
                          <span className="text-[9px] opacity-60 block mt-0.5">Mínimo necessário: {requiredNota.toFixed(1)} / 5.0</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-semibold">
                            {latestAvaliacao ? `${Number(latestAvaliacao.nota).toFixed(1)}` : '—'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${isNotaOk ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            }`}>
                            {isNotaOk ? 'OK' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Geral de Promoção */}
                    <div className={`p-4 rounded-xl border text-center space-y-2 ${isEligibleForPromotion
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : (theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5')
                      }`}>
                      <span className="text-[9px] uppercase tracking-wider opacity-60 block">Elegibilidade para Promoção</span>
                      <div className="text-base font-extrabold flex items-center justify-center gap-1.5">
                        {isEligibleForPromotion ? (
                          <>
                            <span className="text-emerald-400 inline-flex items-center gap-1.5"><ShieldCheck size={14} />Apto para Promoção</span>
                          </>
                        ) : (
                          <>
                            <span className="opacity-40 inline-flex items-center gap-1.5"><Settings size={14} />Em Desenvolvimento</span>
                          </>
                        )}
                      </div>
                      <p className="text-[9px] opacity-50 max-w-xs mx-auto">
                        {isEligibleForPromotion
                          ? 'O colaborador atinge todos os pré-requisitos objetivos de tempo, histórico disciplinar e desempenho.'
                          : 'Necessário atender a todos os critérios (tempo, zero ocorrências nos últimos 6 meses e nota mínima) para liberação de promoção.'
                        }
                      </p>
                    </div>

                    {/* Bloco de Avaliações / Lançamento */}
                    <div className="space-y-4 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Histórico de Avaliações</span>
                        {hasFullAccess && (
                          <button
                            onClick={() => {
                              setEvalForm(initialEvalForm);
                              setEvalModalReadOnly(false);
                              setSelectedEvalForModal(null);
                              setShowEvalModal(true);
                            }}
                            className={`text-[9px] px-2.5 py-1 rounded font-bold uppercase transition-all inline-flex items-center gap-1.5 ${
                              theme === 'dark' ? 'bg-white/5 border border-white/10 hover:bg-white/10 text-white' : 'bg-black/5 border-black/10 hover:bg-black/10 text-black'
                            }`}
                          >
                            <Pencil size={13} />Avaliar
                          </button>
                        )}
                      </div>

                      {/* Lista de Avaliações */}
                      <div className="space-y-3">
                        {colabAvaliacoes.length > 0 ? (
                          colabAvaliacoes.map((a) => {
                            const parsed = parseEvaluationComments(a.comentarios);
                            return (
                              <div key={a.id} className={`p-3 rounded-xl border space-y-2 ${theme === 'dark' ? 'glass-fill border-line' : 'glass-fill border-line'
                                }`}>
                                <div className="flex items-center justify-between text-[10px]">
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold text-[9px]">
                                      Nota {Number(a.nota).toFixed(1)}
                                    </span>
                                    <span className="opacity-45">por {a.avaliador_email?.split('@')[0]}</span>
                                  </div>
                                  <span className="opacity-45 font-mono">
                                    {new Date(a.data_avaliacao + 'T12:00:00').toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                <div className="text-[10px] space-y-1 opacity-70">
                                  {parsed.periodoAvaliado && parsed.periodoAvaliado !== 'N/A' && (
                                    <div><span className="font-semibold">Período:</span> {parsed.periodoAvaliado}</div>
                                  )}
                                  <div><span className="font-semibold">Desempenho Geral:</span> {parsed.desempenhoGeral}</div>
                                </div>
                                {parsed.comentariosGestor && (
                                  <p className="text-xs opacity-75 leading-relaxed bg-white/2 p-2 rounded-lg italic font-sans line-clamp-2">
                                    "{parsed.comentariosGestor}"
                                  </p>
                                )}
                                <button
                                  onClick={() => {
                                    setEvalForm({
                                      dataFeedback: a.data_avaliacao,
                                      periodoAvaliado: parsed.periodoAvaliado || '',
                                      desempenhoGeral: parsed.desempenhoGeral || 'Bom',
                                      comentariosGestor: parsed.comentariosGestor || '',
                                      pontosFortes: parsed.pontosFortes || '',
                                      pontosMelhoria: parsed.pontosMelhoria && parsed.pontosMelhoria.length > 0 ? parsed.pontosMelhoria : [{ oportunidade: '', acao: '' }],
                                      pdi: parsed.pdi && parsed.pdi.length > 0 ? parsed.pdi : [{ objetivo: '', acao: '', prazo: '', responsavel: '' }],
                                      competencias: parsed.competencias || { qualidade_entregas: 3, relacionamento_interpessoal: 3, comunicacao: 3, organizacao: 3, proatividade: 3, comprometimento: 3 },
                                      controleInterno: parsed.controleInterno || { entregue: false, arquivado: false, lancado: false, gestor_orientado: false }
                                    });
                                    setEvalModalReadOnly(true);
                                    setSelectedEvalForModal(a);
                                    setShowEvalModal(true);
                                  }}
                                  className="w-full text-center py-1 rounded text-[9px] font-bold uppercase transition-all bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 mt-1 inline-flex items-center justify-center gap-1.5"
                                >
                                  <FileText size={13} />Ver Relatório Completo
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs opacity-50 italic text-center py-6">Nenhuma avaliação de desempenho registrada.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-white/10 text-center text-[9px] opacity-40">
              ID Interno: {activeColaboradorForDrawer.id}
            </div>
          </div>
        </>
  );
}
