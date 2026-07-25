import React, { useState } from 'react';
import {
  X,
  User,
  FileText,
  AlertTriangle,
  Clock,
  Briefcase,
  Trash2,
  ExternalLink,
  CheckCircle,
  Home
} from 'lucide-react';

interface ColaboradorProntuarioModalProps {
  colaborador: any | null;
  onClose: () => void;
  theme: 'dark' | 'light';
  documents?: any[];
  warnings?: any[];
  onOffboard?: (colab: any) => void;
}

export const ColaboradorProntuarioModal: React.FC<ColaboradorProntuarioModalProps> = ({
  colaborador,
  onClose,
  theme,
  documents = [],
  warnings = [],
  onOffboard
}) => {
  const [activeTab, setActiveTab] = useState<'dados' | 'documentos' | 'historico' | 'advertencias'>('dados');

  if (!colaborador) return null;

  const cardBg = theme === 'dark'
    ? 'bg-[#0A0E17]/95 border-[#1E2739] text-[#E6EAF2]'
    : 'bg-white/95 border-[#E9ECF3] text-[#0F1729]';

  const sectionBg = theme === 'dark'
    ? 'bg-[#121A2A]/60 border-[#1E2739]'
    : 'bg-[#F1F3F9]/60 border-[#E9ECF3]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xl animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Amplo de Alta Densidade (max-w-5xl, h-[90vh]) */}
      <div
        className={`relative w-full max-w-5xl h-[90vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl transition-all ${cardBg}`}
      >
        {/* Top Header do Prontuário */}
        <div className="px-6 py-5 border-b border-[#1E2739]/40 flex items-center justify-between shrink-0 bg-[#4F6DF5]/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4F6DF5] to-[#3D5AE0] text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-[#4F6DF5]/20">
              {colaborador.nome ? colaborador.nome.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold tracking-tight">{colaborador.nome}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                  colaborador.status === 'ativo'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                    : colaborador.status === 'desligado'
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                }`}>
                  {colaborador.status || 'Ativo'}
                </span>
              </div>
              <p className="text-xs text-[#9AA4B6] mt-0.5 font-medium">
                {colaborador.cargo || 'Cargo não especificado'} • {colaborador.setor || 'Setor não informado'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOffboard && colaborador.status !== 'desligado' && (
              <button
                onClick={() => onOffboard(colaborador)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={14} /> Iniciar Desligamento
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                theme === 'dark' ? 'border-[#1E2739] hover:bg-[#121A2A]' : 'border-[#E9ECF3] hover:bg-[#F3F5FB]'
              }`}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Abas Internas da Ficha */}
        <div className="px-6 border-b border-[#1E2739]/30 flex items-center gap-2 shrink-0 bg-[#0A0E17]/40">
          {[
            { id: 'dados', label: 'Dados Cadastrais', icon: User },
            { id: 'documentos', label: 'Documentos Prontuário', icon: FileText },
            { id: 'advertencias', label: `Advertências (${warnings.length})`, icon: AlertTriangle },
            { id: 'historico', label: 'Histórico & Admissão', icon: Clock }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                  active
                    ? 'border-[#4F6DF5] text-[#4F6DF5]'
                    : 'border-transparent text-[#9AA4B6] hover:text-[#E6EAF2]'
                }`}
              >
                <Icon size={15} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Conteúdo Expansível do Prontuário */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {activeTab === 'dados' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informações Pessoais */}
              <div className={`p-5 rounded-2xl border space-y-4 ${sectionBg}`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4F6DF5] flex items-center gap-2">
                  <User size={15} /> Informações Pessoais & Documentação
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block opacity-60 font-medium text-[11px]">CPF</span>
                    <span className="font-mono font-semibold">{colaborador.cpf || '—'}</span>
                  </div>
                  <div>
                    <span className="block opacity-60 font-medium text-[11px]">E-mail Pessoal</span>
                    <span className="font-semibold truncate block">{colaborador.email_pessoal || '—'}</span>
                  </div>
                  <div>
                    <span className="block opacity-60 font-medium text-[11px]">Telefone</span>
                    <span className="font-mono font-semibold">{colaborador.telefone || '—'}</span>
                  </div>
                  <div>
                    <span className="block opacity-60 font-medium text-[11px]">Data de Nascimento</span>
                    <span className="font-mono font-semibold">
                      {colaborador.data_nascimento ? new Date(colaborador.data_nascimento).toLocaleDateString('pt-BR') : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vínculo & Remuneração */}
              <div className={`p-5 rounded-2xl border space-y-4 ${sectionBg}`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4F6DF5] flex items-center gap-2">
                  <Briefcase size={15} /> Dados Profissionais & Cargo
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block opacity-60 font-medium text-[11px]">Cargo Atual</span>
                    <span className="font-semibold">{colaborador.cargo || '—'}</span>
                  </div>
                  <div>
                    <span className="block opacity-60 font-medium text-[11px]">Setor / Departamento</span>
                    <span className="font-semibold">{colaborador.setor || '—'}</span>
                  </div>
                  <div>
                    <span className="block opacity-60 font-medium text-[11px]">Salário Base</span>
                    <span className="font-mono font-bold text-emerald-500">{colaborador.salario || '—'}</span>
                  </div>
                  <div>
                    <span className="block opacity-60 font-medium text-[11px]">Data de Admissão</span>
                    <span className="font-mono font-semibold">
                      {colaborador.data_admissao ? new Date(colaborador.data_admissao + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className={`p-5 rounded-2xl border space-y-4 md:col-span-2 ${sectionBg}`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4F6DF5] flex items-center gap-2">
                  <Home size={15} /> Endereço Residencial
                </h3>
                <div className="text-xs space-y-1">
                  <p className="font-semibold">
                    {[colaborador.logradouro, colaborador.numero ? `nº ${colaborador.numero}` : '', colaborador.complemento].filter(Boolean).join(', ') || 'Endereço não informado'}
                  </p>
                  <p className="opacity-70">
                    {[colaborador.bairro, colaborador.cidade, colaborador.uf].filter(Boolean).join(' • ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documentos' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#4F6DF5] flex items-center gap-2">
                <FileText size={15} /> Documentos Anexados ao Prontuário
              </h3>
              {documents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {documents.map((doc, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${sectionBg}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText size={20} className="text-[#4F6DF5] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{doc.nome_arquivo || doc.titulo || `Documento ${idx + 1}`}</p>
                          <p className="text-[10px] opacity-60 font-mono">
                            {doc.criado_em ? new Date(doc.criado_em).toLocaleDateString('pt-BR') : 'Anexado'}
                          </p>
                        </div>
                      </div>
                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg bg-[#4F6DF5]/10 text-[#4F6DF5] hover:bg-[#4F6DF5] hover:text-white transition-all shrink-0"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-xs opacity-50 italic">
                  Nenhum documento físico ou digital anexado a este colaborador ainda.
                </div>
              )}
            </div>
          )}

          {activeTab === 'advertencias' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-2">
                <AlertTriangle size={15} /> Registro de Ocorrências & Advertências
              </h3>
              {warnings.length > 0 ? (
                <div className="space-y-3">
                  {warnings.map((adv, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-500">Advertência por Falta/Conduta</span>
                        <span className="text-[10px] font-mono opacity-60">
                          Data: {adv.data_falta ? new Date(adv.data_falta + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed opacity-90">{adv.descricao_situacao}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-xs opacity-50 italic">
                  Nenhuma advertência registrada no histórico deste colaborador. 👏
                </div>
              )}
            </div>
          )}

          {activeTab === 'historico' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#4F6DF5] flex items-center gap-2">
                <Clock size={15} /> Linha do Tempo & Admissão
              </h3>
              <div className={`p-5 rounded-2xl border space-y-3 ${sectionBg}`}>
                <div className="flex items-center gap-3">
                  <CheckCircle size={18} className="text-emerald-500" />
                  <div>
                    <p className="text-xs font-bold">Admissão Oficial registrada no ITO</p>
                    <p className="text-[10px] opacity-60">
                      Admitido em: {colaborador.data_admissao ? new Date(colaborador.data_admissao + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ColaboradorProntuarioModal;
