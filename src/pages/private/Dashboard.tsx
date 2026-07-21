import React, { useState, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  Signature,
  Printer,
  Receipt,
  GitMerge,
  AlertTriangle,
  Moon,
  Sun,
  CheckCircle,
  Zap,
  LogOut,
  ExternalLink,
  History,
  LayoutDashboard,
  Users,
  ClipboardCheck,
  FileText,
  TrendingUp,
  Menu,
  X,
  Download,
  Gift,
  Calendar,
  Award,
  Briefcase,
  MessageSquare,
  Clock
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import type { DashboardProps } from '../../types';
import { MESES_PT_BR, DEFAULT_MODELS, buildContractText, getEmpregadora } from '../../data/contractTemplates';

// Carregados sob demanda (code-splitting): os painéis de Analytics puxam o
// Recharts (pesado) e cada Manager é um módulo grande. Assim o bundle inicial
// do Dashboard fica menor e a tela abre mais rápido; cada um baixa ao entrar.
const OverviewPanel = lazy(() => import('../../components/analytics/OverviewPanel'));
const TurnoverPanel = lazy(() => import('../../components/analytics/TurnoverPanel'));
const HealthSafetyPanel = lazy(() => import('../../components/analytics/HealthSafetyPanel'));
const CompensationsPanel = lazy(() => import('../../components/analytics/CompensationsPanel'));
const LegalPanel = lazy(() => import('../../components/analytics/LegalPanel'));
const FormManager = lazy(() => import('../../components/documents/FormManager'));
const BenefitsManager = lazy(() => import('../../components/benefits/BenefitsManager'));
const CargosManager = lazy(() => import('../../components/cargos/CargosManager'));
const FeedbackManager = lazy(() => import('../../components/feedback/FeedbackManager'));
const PontoManager = lazy(() => import('../../components/ponto/PontoManager'));
const RiscoManager = lazy(() => import('../../components/risco/RiscoManager'));
const FolhaManager = lazy(() => import('../../components/folha/FolhaManager'));
import LetterheadWatermark from '../../components/common/LetterheadWatermark';
import CopilotWidget from '../../components/copilot/CopilotWidget';

export default function Dashboard({ theme, setTheme, user, role }: DashboardProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const activePath = location.pathname;

  // Mobile sidebar open state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Security Helper for RH role OR TI superuser email
  const hasFullAccess = role === 'coordenadora_rh' || user?.email === 'ito.thiagosilva@gmail.com';

  const handleLogout = async () => {
    try {
      // ip_address e user_agent são preenchidos pelo trigger
      // trg_fn_log_auditoria_metadata, a partir dos headers da requisição.
      // Enviá-los daqui só serviria para o cliente escolher o próprio rastro.
      await supabase.from('logs_auditoria').insert({
        usuario_id: user.id,
        usuario_email: user.email,
        acao: 'LOGOUT'
      });
    } catch (e) {
      console.error(e);
    }
    await supabase.auth.signOut();
  };

  // Helper function for audit logging
  const logAuditoria = async (acao: string, detalhes: any = {}) => {
    try {
      await supabase.from('logs_auditoria').insert({
        usuario_id: user.id,
        usuario_email: user.email,
        acao: acao,
        detalhes: detalhes
      });
    } catch (err) {
      console.error('Audit log failed:', err);
    }
  };


  // --- MÓDULO 6: BENEFÍCIOS ---
  const [dbBenefits, setDbBenefits] = useState<any[]>([]);
  const [dbColaboradorBeneficios, setDbColaboradorBeneficios] = useState<any[]>([]);

  // --- MÓDULO 7: PLANO DE CARREIRA E AVALIAÇÃO DESEMPENHO ---
  const [dbPlanosCarreira, setDbPlanosCarreira] = useState<any[]>([]);
  const [dbAvaliacoesDesempenho, setDbAvaliacoesDesempenho] = useState<any[]>([]);
  const [dbAdvertencias, setDbAdvertencias] = useState<any[]>([]);

  // --- MÓDULO 1: DOCUMENTOS ---
  const [modelos, setModelos] = useState<any[]>([]);
  const [selectedModeloId, setSelectedModeloId] = useState<string>('');
  const [docTemplate, setDocTemplate] = useState('Termo de Consentimento de Uso de Imagem\n\nEu, {{nome}}, portador do CPF {{cpf}}, autorizo o Instituto Thiago Omena no setor de {{setor}}...');

  // Variáveis do contrato. Nascem vazias de propósito: o que não for preenchido
  // sai como "_______" no documento, o que é visível. Valor de exemplo herdado
  // aqui vira cláusula real no contrato de alguém.
  const [varNome, setVarNome] = useState('');
  const [varCpf, setVarCpf] = useState('');
  const [varSetor, setVarSetor] = useState('');
  const [varCargo, setVarCargo] = useState('');
  const [varCbo, setVarCbo] = useState('');
  const [varAtribuicoes, setVarAtribuicoes] = useState('');
  const [varSalario, setVarSalario] = useState('');
  const [varSalarioExtenso, setVarSalarioExtenso] = useState('');
  const [varEndereco, setVarEndereco] = useState('');
  const [varAdmissao, setVarAdmissao] = useState('');

  const [uploadedPdfBase64, setUploadedPdfBase64] = useState<string>('');
  const [uploadedPdfName, setUploadedPdfName] = useState<string>('');
  // Docs Module Sub-tabs
  const [docsSubTab, setDocsSubTab] = useState<'visao' | 'modelos' | 'envios' | 'pendencias' | 'formularios' | 'envio-form' | 'historico'>('visao');
  // New Modelo form
  const [newModeloTitulo, setNewModeloTitulo] = useState('');
  const [newModeloConteudo, setNewModeloConteudo] = useState('');
  const [isSavingModelo, setIsSavingModelo] = useState(false);
  const [uploadFileType, setUploadFileType] = useState<'identidade' | 'residencia' | 'aso' | 'foto' | 'outros'>('identidade');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [showNewModeloForm, setShowNewModeloForm] = useState(false);

  // New Coordinate Positioner states
  const [colabSigPos, setColabSigPos] = useState<{ x: number; y: number; page: number } | null>({ x: 80, y: 150, page: 1 });
  const [repSigPos, setRepSigPos] = useState<{ x: number; y: number; page: number } | null>({ x: 380, y: 150, page: 1 });
  const [activePositioningRole, setActivePositioningRole] = useState<'colaborador' | 'representante'>('colaborador');
  const [activePreviewPage, setActivePreviewPage] = useState<number>(1);
  const [modelFileType, setModelFileType] = useState<'texto' | 'pdf' | 'docx'>('texto');
  // Histórico
  const [docsHistorico, setDocsHistorico] = useState<any[]>([]);
  const fetchDocsHistorico = async () => {
    try {
      const { data } = await supabase.from('documentos_assinados').select('*').order('assinado_em', { ascending: false }).limit(30);
      setDocsHistorico(data || []);
    } catch { setDocsHistorico([]); }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedPdfName(file.name);
      const isDocx = file.name.endsWith('.docx') || file.name.endsWith('.doc');
      setModelFileType(isDocx ? 'docx' : 'pdf');
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setUploadedPdfBase64(base64);
        setSelectedModeloId('upload');
      };
      reader.readAsDataURL(file);
    }
  };

  const renderTemplateText = () => {
    const today = new Date();
    return docTemplate
      .replace(/{{nome}}/g, varNome || '_______')
      .replace(/{{cpf}}/g, varCpf || '_______')
      .replace(/{{setor}}/g, varSetor || '_______')
      .replace(/{{cargo}}/g, varCargo || '_______')
      .replace(/{{cbo}}/g, varCbo || '_______')
      .replace(/{{atribuicoes}}/g, varAtribuicoes || '_______')
      .replace(/{{salario}}/g, varSalario || '_______')
      .replace(/{{salario_extenso}}/g, varSalarioExtenso || '_______')
      .replace(/{{endereco}}/g, varEndereco || '_______')
      .replace(/{{data_admissao}}/g, varAdmissao || '_______')
      .replace(/{{dia}}/g, today.getDate().toString())
      .replace(/{{mes}}/g, MESES_PT_BR[today.getMonth()])
      .replace(/{{ano}}/g, today.getFullYear().toString());
  };

  const signatureHash = '';

  const fetchModelos = async () => {
    try {
      const { data, error } = await supabase
        .from('modelos_documentos')
        .select('*')
        .order('titulo', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        setModelos(data);
        setSelectedModeloId(data[0].id);
        setDocTemplate(data[0].conteudo);
      } else {
        setModelos(DEFAULT_MODELS);
        setSelectedModeloId('1');
        setDocTemplate(DEFAULT_MODELS[0].conteudo);
      }
    } catch {
      setModelos(DEFAULT_MODELS);
      setSelectedModeloId('1');
      setDocTemplate(DEFAULT_MODELS[0].conteudo);
    }
  };

  const [selectedColaboradorForDocId, setSelectedColaboradorForDocId] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [generatedSignLink, setGeneratedSignLink] = useState('');

  const handleSelectColaboradorForDoc = (colabId: string) => {
    const colab = colaboradoresList.find((c: any) => c.id === colabId);
    if (colab) {
      setSelectedColaboradorForDocId(colabId);
      setVarNome(colab.nome || '');
      setVarCpf(colab.cpf || '');
      setVarSetor(colab.setor || '');
      setVarCargo(colab.cargo || '');
      setVarSalario(colab.salario || '');
      // Não há origem para o extenso no cadastro: precisa ser limpo junto com o
      // salário, ou o extenso do colaborador anterior segue no contrato deste.
      setVarSalarioExtenso('');
      
      const addrParts = [
        colab.logradouro,
        colab.numero ? `nº ${colab.numero}` : '',
        colab.complemento,
        colab.bairro,
        colab.cidade,
        colab.uf
      ].filter(Boolean).join(', ');
      setVarEndereco(addrParts || '');
      setVarAdmissao(colab.data_admissao || '');
    } else {
      setSelectedColaboradorForDocId('');
    }
  };

  const handleGenerateSignatureLink = async () => {
    if (!selectedColaboradorForDocId) return;
    setIsGeneratingLink(true);
    setGeneratedSignLink('');

    try {
      const colab = colaboradoresList.find((c: any) => c.id === selectedColaboradorForDocId);
      if (!colab) throw new Error('Colaborador não encontrado.');

      const savedModel = modelos.find(m => m.id === selectedModeloId);
      const docTitle = savedModel ? savedModel.titulo : 'Contrato';

      const details = {
        nome: varNome,
        cpf: varCpf,
        setor: varSetor,
        cargo: varCargo,
        cbo: varCbo,
        atribuicoes: varAtribuicoes,
        salario: varSalario,
        salario_extenso: varSalarioExtenso,
        endereco: varEndereco,
        data_admissao: varAdmissao,
        integrado: true,
        pdf_template_base64: selectedModeloId === 'upload'
          ? uploadedPdfBase64
          : (savedModel ? savedModel.conteudo : null),
        template_id: selectedModeloId,
        // Modelo de TEXTO: paginação é dinâmica, então coordenada fixa não faz
        // sentido — mandamos null e a Edge Function ancora a assinatura na linha
        // "EMPREGADO(A)"/"EMPREGADORA" do próprio contrato. Coordenada explícita
        // fica só para PDF carregado (upload), onde o layout é fixo.
        colab_signature_position: selectedModeloId === 'upload' ? colabSigPos : null,
        rep_signature_position: selectedModeloId === 'upload' ? repSigPos : null
      };

      const expiraEm = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('admission_tokens')
        .insert({
          candidato_nome: colab.nome,
          candidato_email: colab.email_pessoal || 'colaborador@thiagoomena.com.br',
          candidato_cpf: colab.cpf,
          candidato_cargo: colab.cargo,
          candidato_setor: colab.setor,
          detalhes: details,
          expira_em: expiraEm,
          status: 'aguardando_assinatura',
          criado_por: user.id
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const link = `${window.location.origin}/admissao/${data.token}`;
        setGeneratedSignLink(link);
        await logAuditoria('GERACAO_LINK_ASSINATURA_TERMO', {
          colaborador: colab.nome,
          documento: docTitle,
          link: link
        });
      }
    } catch (err: any) {
      notify('Erro ao gerar link de assinatura: ' + err.message);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  useEffect(() => {
    if (activePath === '/app/documentos') {
      fetchModelos();
    }
  }, [activePath]);




  // --- MÓDULO 2: COLABORADORES & SIDE-BY-SIDE ---
  const [colabSubTab, setColabSubTab] = useState<'quadro' | 'admissao' | 'cadastrar' | 'desligados'>('quadro');

  // Quadro de Funcionários filters and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSetor, setFilterSetor] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [sortOrder, setSortOrder] = useState<'antigo' | 'recente'>('antigo');

  // Agenda/Calendário RH States
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(new Date().getDate());

  // Side Drawer Prontuário States
  const [activeColaboradorForDrawer, setActiveColaboradorForDrawer] = useState<any>(null);
  const [selectedColabDocuments, setSelectedColabDocuments] = useState<any[]>([]);

  // Offboarding form states
  const [isOffboardingMode, setIsOffboardingMode] = useState(false);
  const [offboardDate, setOffboardDate] = useState(new Date().toISOString().split('T')[0]);
  const [offboardType, setOffboardType] = useState<'Voluntario' | 'Involuntario'>('Voluntario');
  const [offboardReason, setOffboardReason] = useState('');
  const [isSavingOffboard, setIsSavingOffboard] = useState(false);

  // Férias & ASO Panel States
  const [searchQueryFeriasAso, setSearchQueryFeriasAso] = useState('');
  const [filterSetorFeriasAso, setFilterSetorFeriasAso] = useState('Todos');
  const [filterStatusAso, setFilterStatusAso] = useState('Todos');
  const [filterStatusFerias, setFilterStatusFerias] = useState('Todos');
  const [selectedColabForQuickUpdate, setSelectedColabForQuickUpdate] = useState<any>(null);
  const [quickAsoDate, setQuickAsoDate] = useState('');
  const [quickFeriasDate, setQuickFeriasDate] = useState('');
  const [quickFeriasInicio, setQuickFeriasInicio] = useState('');
  const [quickFeriasDias, setQuickFeriasDias] = useState('');

  // Toast padrão do app (substitui os notify() nativos). Mesma assinatura de
  // notify(msg): infere sucesso/erro pelo texto e some sozinho.
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<number | null>(null);
  const notify = (msg: string) => {
    const type: 'success' | 'error' =
      /erro|falha|não foi|nao foi|inválid|invalid|não conseg|nao conseg|obrigat|informe/i.test(msg) ? 'error' : 'success';
    setToast({ msg, type });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  };
  const [isSavingQuickDates, setIsSavingQuickDates] = useState(false);

  // Avaliações Panel Filters
  const [searchQueryAvaliacoes, setSearchQueryAvaliacoes] = useState('');
  const [filterSetorAvaliacoes, setFilterSetorAvaliacoes] = useState('Todos');
  const [filterStatusPromo, setFilterStatusPromo] = useState('Todos');

  // Career Evaluation states
  const [isSavingAvaliacao, setIsSavingAvaliacao] = useState(false);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evalModalReadOnly, setEvalModalReadOnly] = useState(false);
  const [selectedEvalForModal, setSelectedEvalForModal] = useState<any | null>(null);

  const initialEvalForm = {
    dataFeedback: new Date().toISOString().split('T')[0],
    periodoAvaliado: '',
    desempenhoGeral: 'Bom',
    comentariosGestor: '',
    pontosFortes: 'Trabalho em equipe\nComprometimento com a jornada (pontualidade e assiduidade)\nDisponibilidade',
    pontosMelhoria: [{ oportunidade: '', acao: '' }],
    pdi: [{ objetivo: '', acao: '', prazo: '', responsavel: '' }],
    competencias: {
      qualidade_entregas: 3,
      relacionamento_interpessoal: 3,
      comunicacao: 3,
      organizacao: 3,
      proatividade: 3,
      comprometimento: 3
    },
    controleInterno: {
      entregue: true,
      arquivado: true,
      lancado: true,
      gestor_orientado: true
    }
  };

  const [evalForm, setEvalForm] = useState(initialEvalForm);

  const parseEvaluationComments = (commentsStr: string) => {
    try {
      const parsed = JSON.parse(commentsStr);
      if (parsed && typeof parsed === 'object' && parsed.is_structured) {
        return parsed;
      }
    } catch {
      // Fallback
    }
    return {
      is_structured: false,
      dataFeedback: new Date().toISOString().split('T')[0],
      periodoAvaliado: 'N/A',
      desempenhoGeral: 'Bom',
      comentariosGestor: commentsStr || '',
      pontosFortes: 'Trabalho em equipe\nComprometimento com a jornada (pontualidade e assiduidade)\nDisponibilidade',
      pontosMelhoria: [],
      pdi: [],
      competencias: {
        qualidade_entregas: 3,
        relacionamento_interpessoal: 3,
        comunicacao: 3,
        organizacao: 3,
        proatividade: 3,
        comprometimento: 3
      },
      controleInterno: {
        entregue: false,
        arquivado: false,
        lancado: false,
        gestor_orientado: false
      }
    };
  };

  const addPontoMelhoriaRow = () => {
    setEvalForm(prev => ({
      ...prev,
      pontosMelhoria: [...prev.pontosMelhoria, { oportunidade: '', acao: '' }]
    }));
  };

  const removePontoMelhoriaRow = (index: number) => {
    setEvalForm(prev => ({
      ...prev,
      pontosMelhoria: prev.pontosMelhoria.filter((_, i) => i !== index)
    }));
  };

  const updatePontoMelhoriaRow = (index: number, key: 'oportunidade' | 'acao', value: string) => {
    setEvalForm(prev => {
      const updated = [...prev.pontosMelhoria];
      updated[index] = { ...updated[index], [key]: value };
      return { ...prev, pontosMelhoria: updated };
    });
  };

  const addPdiRow = () => {
    setEvalForm(prev => ({
      ...prev,
      pdi: [...prev.pdi, { objetivo: '', acao: '', prazo: '', responsavel: '' }]
    }));
  };

  const removePdiRow = (index: number) => {
    setEvalForm(prev => ({
      ...prev,
      pdi: prev.pdi.filter((_, i) => i !== index)
    }));
  };

  const updatePdiRow = (index: number, key: 'objetivo' | 'acao' | 'prazo' | 'responsavel', value: string) => {
    setEvalForm(prev => {
      const updated = [...prev.pdi];
      updated[index] = { ...updated[index], [key]: value };
      return { ...prev, pdi: updated };
    });
  };


  // Link Generation States
  const [newCandidateName, setNewCandidateName] = useState('');
  const [newCandidateEmail, setNewCandidateEmail] = useState('');
  const [newCandidateCargo, setNewCandidateCargo] = useState('');
  const [newCandidateSetor, setNewCandidateSetor] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isTokenRevoked, setIsTokenRevoked] = useState(false);

  // Side-by-Side Review states
  const [candidateData, setCandidateData] = useState({
    nome: '-',
    cpf: '-',
    rg: '-',
    cargo: '-',
    setor: '-',
    salario: '-'
  });

  const [existingData, setExistingData] = useState({
    nome: '-',
    cpf: '-',
    rg: '-',
    cargo: '-',
    setor: '-',
    salario: '-'
  });

  const [isMerged, setIsMerged] = useState(false);
  const [tokensList, setTokensList] = useState<any[]>([]);
  const [selectedTokenId, setSelectedTokenId] = useState<string>('');
  const [approvalTemplateId, setApprovalTemplateId] = useState<string>('default');
  const repCanvasRef = useRef<HTMLCanvasElement>(null);
  const [repSigPointsCount, setRepSigPointsCount] = useState(0);
  const [isRepSigning, setIsRepSigning] = useState(false);
  const [isFinishingAdmission, setIsFinishingAdmission] = useState(false);

  // Ocorrências States
  const [drawerTab, setDrawerTab] = useState<'pessoal' | 'admissao' | 'ocorrencias' | 'carreira'>('pessoal');
  const [ocorrenciasList, setOcorrenciasList] = useState<any[]>([]);
  const [isRegisteringOcorrencia, setIsRegisteringOcorrencia] = useState(false);
  const [ocTipo, setOcTipo] = useState('Atraso');
  const [ocData, setOcData] = useState(new Date().toISOString().split('T')[0]);
  const [ocDesvio, setOcDesvio] = useState('');
  const [ocJustificativa, setOcJustificativa] = useState('');
  const [ocFile, setOcFile] = useState<File | null>(null);
  const [isSubmittingOcorrencia, setIsSubmittingOcorrencia] = useState(false);

  // Advertências States
  const [isRegisteringAdvertencia, setIsRegisteringAdvertencia] = useState(false);
  const [advDataFalta, setAdvDataFalta] = useState(new Date().toISOString().split('T')[0]);
  const [advDescricaoSituacao, setAdvDescricaoSituacao] = useState('');
  const [isSavingAdvertencia, setIsSavingAdvertencia] = useState(false);
  const [showAdvertenciaModal, setShowAdvertenciaModal] = useState(false);
  const [selectedAdvertenciaForModal, setSelectedAdvertenciaForModal] = useState<any | null>(null);

  // Cadastrar Colaborador form state
  const [cadastroNome, setCadastroNome] = useState('');
  const [cadastroCpf, setCadastroCpf] = useState('');
  const [cadastroCargo, setCadastroCargo] = useState('');
  const [cadastroSetor, setCadastroSetor] = useState('Administrativo');
  const [cadastroSalario, setCadastroSalario] = useState('');
  const [cadastroAdmissao, setCadastroAdmissao] = useState('');
  const [cadastroAniversario, setCadastroAniversario] = useState('');
  const [isSavingCadastro, setIsSavingCadastro] = useState(false);

  // High-DPI representative canvas setup
  useEffect(() => {
    const selectedTokenRow = tokensList.find(t => t.id === selectedTokenId);
    if (selectedTokenRow?.status !== 'aguardando_assinatura_rh') return;
    const canvas = repCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 2;
    canvas.style.width = '100%';
    canvas.style.height = '140px';
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 140 * dpr;
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = theme === 'dark' ? '#E5DFD3' : '#0A0A0A';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTokenId, tokensList, theme]);

  const calculateTenure = (admissaoDateStr: string) => {
    if (!admissaoDateStr) return '-';
    const start = new Date(admissaoDateStr);
    const now = new Date();
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();

    if (months < 0) {
      years--;
      months += 12;
    }

    const yrText = years === 1 ? '1 ano' : `${years} anos`;
    const moText = months === 1 ? '1 mês' : `${months} meses`;

    if (years > 0 && months > 0) return `${yrText} e ${moText}`;
    if (years > 0) return yrText;
    if (months > 0) return moText;
    return 'Recém-admitido';
  };

  const isUnderExperience = (admissaoDateStr: string) => {
    if (!admissaoDateStr) return false;
    const start = new Date(admissaoDateStr);
    const now = new Date();
    const diffTime = now.getTime() - start.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 90;
  };

  const getFilePathFromUrl = (url: string) => {
    if (!url) return '';
    let path = url;
    if (url.startsWith('http')) {
      try {
        const parts = url.split('/contratos-assinados/');
        if (parts.length > 1) {
          path = parts[1].split('?')[0];
        }
      } catch (e) {
        console.error(e);
      }
    }
    // Clean up any leading slash or bucket name if present in relative path
    if (path.startsWith('/')) {
      path = path.slice(1);
    }
    if (path.startsWith('contratos-assinados/')) {
      path = path.replace('contratos-assinados/', '');
    }
    return path;
  };

  const handleViewDocument = async (url: string) => {
    if (!url) return;
    // Registro legado do antigo "modo de simulação": a assinatura foi gravada
    // sem que o PDF fosse gerado, e o hash não corresponde a documento algum.
    // Nada novo é gravado assim desde a correção, mas os antigos seguem no banco.
    if (url.includes('token=dummy')) {
      notify(
        'Este contrato não tem valor probatório: foi registrado sem que o PDF chegasse a ser gerado, ' +
        'e o hash gravado não corresponde a nenhum documento. O contrato precisa ser assinado novamente.'
      );
      return;
    }
    try {
      const filePath = getFilePathFromUrl(url);
      const { data, error } = await supabase.storage
        .from('contratos-assinados')
        .createSignedUrl(filePath, 60);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err: any) {
      if (err.message?.includes('Object not found') || err.message?.includes('not_found') || err.message?.includes('The resource could not be found')) {
        notify('Aviso: O arquivo físico deste documento não foi encontrado na Storage. Isto geralmente ocorre com documentos de teste ou simulados localmente.');
      } else {
        notify('Erro ao carregar documento da Storage: ' + err.message);
      }
    }
  };

  const fetchSelectedColabDocuments = async (cpf: string) => {
    try {
      const { data, error } = await supabase
        .from('documentos_assinados')
        .select('*')
        .eq('colaborador_cpf', cpf)
        .order('assinado_em', { ascending: false });

      if (error) throw error;
      setSelectedColabDocuments(data || []);
    } catch (err) {
      console.error('Error fetching collaborator documents:', err);
      setSelectedColabDocuments([]);
    }
  };

  useEffect(() => {
    if (activeColaboradorForDrawer?.cpf) {
      fetchSelectedColabDocuments(activeColaboradorForDrawer.cpf);
      fetchOcorrencias(activeColaboradorForDrawer.id);
      setDrawerTab('pessoal');
      setIsRegisteringOcorrencia(false);
      setIsOffboardingMode(false);
      setOffboardDate(new Date().toISOString().split('T')[0]);
      setOffboardType('Voluntario');
      setOffboardReason('');
      setShowEvalModal(false);
      setSelectedEvalForModal(null);
    } else {
      setSelectedColabDocuments([]);
      setOcorrenciasList([]);
      setIsOffboardingMode(false);
      setShowEvalModal(false);
      setSelectedEvalForModal(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeColaboradorForDrawer]);

  const fetchTokensList = async () => {
    try {
      const { data, error } = await supabase
        .from('admission_tokens')
        .select('*')
        .neq('status', 'pendente_preenchimento')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        setTokensList(data);
        setSelectedTokenId(data[0].id);
        loadTokenForReview(data[0]);
      } else {
        setTokensList([]);
      }
    } catch (err) {
      console.error('Error fetching used tokens:', err);
    }
  };

  const loadTokenForReview = async (tokenRow: any) => {
    const details = tokenRow.detalhes || {};
    const cpfClean = tokenRow.candidato_cpf || details.cpf || '';

    // Sem fallback inventado: esta é a tela em que o RH confere os dados antes
    // de aprovar a admissão. Campo ausente tem que aparecer como ausente.
    setCandidateData({
      nome: tokenRow.candidato_nome || details.nome || '-',
      cpf: cpfClean || '-',
      rg: tokenRow.candidato_rg || details.rg || '-',
      cargo: tokenRow.candidato_cargo || details.cargo || '-',
      setor: tokenRow.candidato_setor || details.setor || '-',
      salario: details.salario || '-'
    });

    if (cpfClean) {
      try {
        const { data, error } = await supabase
          .from('colaboradores')
          .select('*')
          .eq('cpf', cpfClean)
          .single();

        if (error) throw error;
        if (data) {
          setExistingData({
            nome: data.nome,
            cpf: data.cpf,
            rg: data.rg,
            cargo: data.cargo,
            setor: data.setor,
            salario: data.salario || 'R$ 4.500,00'
          });
          setIsMerged(true);
        } else {
          resetExistingDataFields();
        }
      } catch {
        resetExistingDataFields();
      }
    } else {
      resetExistingDataFields();
    }
  };

  const resetExistingDataFields = () => {
    setExistingData({
      nome: '-',
      cpf: '-',
      rg: '-',
      cargo: '-',
      setor: '-',
      salario: '-'
    });
    setIsMerged(false);
  };

  const handleTokenSelectChange = (id: string) => {
    setSelectedTokenId(id);
    const tok = tokensList.find(t => t.id === id);
    if (tok) {
      loadTokenForReview(tok);
    }
  };

  const handleGenerateLink = async () => {
    try {
      const expiraEm = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('admission_tokens')
        .insert({
          candidato_nome: newCandidateName,
          candidato_email: newCandidateEmail,
          candidato_cargo: newCandidateCargo,
          candidato_setor: newCandidateSetor,
          expira_em: expiraEm,
          criado_por: user.id
        })
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        const inviteLink = `${window.location.origin}/admissao/${data[0].token}`;
        setGeneratedLink(inviteLink);
        setIsTokenRevoked(false);
        await logAuditoria('GERACAO_TOKEN_ADMISSAO', { email: newCandidateEmail, link: inviteLink });

        await navigator.clipboard.writeText(inviteLink);
        notify('Link de Admissão gerado e copiado para a área de transferência!');
      }
    } catch (err: any) {
      notify('Erro ao gerar link de admissão: ' + err.message);
    }
  };

  const toggleTokenStatus = async () => {
    if (!generatedLink) return;
    const tokenPart = generatedLink.split('/').pop();
    if (!tokenPart) return;

    try {
      const newStatus = !isTokenRevoked;
      const { error } = await supabase
        .from('admission_tokens')
        .update({
          expira_em: newStatus ? new Date().toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('token', tokenPart);

      if (error) throw error;
      setIsTokenRevoked(newStatus);
      await logAuditoria(newStatus ? 'REVOGACAO_TOKEN_ADMISSAO' : 'REATIVACAO_TOKEN_ADMISSAO', { token: tokenPart });
    } catch (err: any) {
      console.error(err);
    }
  };

  const mergeData = async () => {
    try {
      // 1. Homologar e inserir no banco colaboradores
      const { error } = await supabase
        .from('colaboradores')
        .upsert({
          nome: candidateData.nome,
          cpf: candidateData.cpf,
          rg: candidateData.rg,
          cargo: candidateData.cargo,
          setor: candidateData.setor,
          salario: candidateData.salario,
          status: 'pendente'
        }, { onConflict: 'cpf' });

      if (error) throw error;

      // 2. Definir detalhes do token e transicionar status para aguardando_assinatura
      if (selectedTokenId) {
        const savedModel = modelos.find(m => m.id === approvalTemplateId);
        const details = {
          ...candidateData,
          integrado: true,
          pdf_template_base64: approvalTemplateId === 'upload'
            ? uploadedPdfBase64
            : (savedModel ? savedModel.conteudo : null),
          template_id: approvalTemplateId,
          colab_signature_position: approvalTemplateId === 'upload'
            ? colabSigPos
            : (savedModel ? savedModel.assinatura_coordenadas : null),
          rep_signature_position: approvalTemplateId === 'upload'
            ? repSigPos
            : (savedModel ? savedModel.assinatura_rep_coordenadas : null)
        };
        await supabase
          .from('admission_tokens')
          .update({
            status: 'aguardando_assinatura',
            detalhes: details
          })
          .eq('id', selectedTokenId);
      }

      setExistingData(candidateData);
      setIsMerged(true);
      await logAuditoria('HOMOLOGACAO_ADMISSAO', { candidato: candidateData.nome, setor: candidateData.setor });
      notify('Cadastro do colaborador homologado e mesclado com sucesso na Ficha Ativa!');

      fetchTokensList();
      fetchColaboradoresList();
    } catch (err: any) {
      notify('Erro ao homologar cadastro: ' + err.message);
    }
  };

  // Canvas drawing handlers for RH Representative
  const startRepDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = repCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsRepSigning(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setRepSigPointsCount(1);
  };

  const drawRep = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isRepSigning) return;
    const canvas = repCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setRepSigPointsCount(prev => prev + 1);
  };

  const stopRepDrawing = () => {
    setIsRepSigning(false);
  };

  const clearRepCanvas = () => {
    const canvas = repCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setRepSigPointsCount(0);
  };

  // Step 3: Finalize contract bilateral signature (RH Representative)
  const handleFinalizeRepresentativeSignature = async () => {
    const canvas = repCanvasRef.current;
    if (!canvas) return;
    const representativeSignatureBase64 = canvas.toDataURL('image/png');

    setIsFinishingAdmission(true);

    try {
      const selectedTokenRow = tokensList.find(t => t.id === selectedTokenId);
      if (!selectedTokenRow) throw new Error("Nenhum token selecionado.");

      const details = selectedTokenRow.detalhes || {};
      const cpf = selectedTokenRow.candidato_cpf || details.cpf || '';

      // 1. Fetch partial document signed by the candidate
      const { data: signDoc, error: docErr } = await supabase
        .from('documentos_assinados')
        .select('*')
        .eq('colaborador_cpf', cpf)
        .eq('status', 'aguardando_rh')
        .maybeSingle();

      if (docErr || !signDoc) throw new Error("Contrato parcial do candidato não encontrado.");

      // Fetch coordinator user session token to authenticate Edge Function
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionToken = sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gerar-contrato-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          token: selectedTokenRow.token,
          userEmail: selectedTokenRow.candidato_email,
          candidateName: selectedTokenRow.candidato_nome,
          candidateCpf: cpf,
          signatureBase64: signDoc.assinatura_desenhada,
          signatureRepresentativeBase64: representativeSignatureBase64,
          coordinatorEmail: user.email,
          pdfTemplateBase64: details.pdf_template_base64 || null,
          contractText: buildContractText(details.pdf_template_base64, selectedTokenRow, details),
          documentName: `contrato_${cpf.replace(/\D/g, '')}_consolidado`,
          colabSignaturePosition: details.colab_signature_position || null,
          repSignaturePosition: details.rep_signature_position || null
        })
      });

      const res = await response.json();
      if (!res.success) throw new Error(res.error || 'Erro na fusão do contrato bilateral.');

      // 3. Update public.documentos_assinados registry
      const { error: updateDocErr } = await supabase
        .from('documentos_assinados')
        .update({
          status: 'finalizado',
          url_arquivo: res.filePath || res.signedUrl,
          document_hash: res.documentHash,
          assinatura_representante: representativeSignatureBase64,
          assinado_em: new Date().toISOString()
        })
        .eq('id', signDoc.id);

      if (updateDocErr) throw updateDocErr;

      // 4. Update status in admission_tokens to 'concluido'
      await supabase
        .from('admission_tokens')
        .update({
          status: 'concluido',
          usado_em: new Date().toISOString()
        })
        .eq('id', selectedTokenId);

      // 5. Update onboarding progress checklist item for contract to true
      await supabase
        .from('colaboradores')
        .update({
          depily: true // contract signed
        })
        .eq('cpf', cpf);

      await logAuditoria('FINALIZACAO_ADMISSAO_CONJUNTA', { candidato: selectedTokenRow.candidato_nome, cpf, document_hash: res.documentHash });
      notify('Contrato assinado bilateralmente com sucesso! Admissão concluída.');

      fetchTokensList();
      fetchColaboradoresList();
    } catch (err: any) {
      notify('Erro ao finalizar admissão: ' + err.message);
    } finally {
      setIsFinishingAdmission(false);
    }
  };

  // Abre/imprime o contrato já assinado pelo COLABORADOR para o token
  // selecionado — usado quando o RH prefere assinar fisicamente no papel.
  const handlePrintCandidateSigned = async () => {
    try {
      const selectedTokenRow = tokensList.find(t => t.id === selectedTokenId);
      if (!selectedTokenRow) return;
      const details = selectedTokenRow.detalhes || {};
      const cpf = selectedTokenRow.candidato_cpf || details.cpf || '';
      const { data: signDoc, error } = await supabase
        .from('documentos_assinados')
        .select('url_arquivo')
        .eq('colaborador_cpf', cpf)
        .in('status', ['aguardando_rh', 'finalizado'])
        .order('assinado_em', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (signDoc?.url_arquivo) {
        handleViewDocument(signDoc.url_arquivo);
      } else {
        notify('O contrato assinado pelo colaborador ainda não está disponível.');
      }
    } catch (err: any) {
      notify('Não foi possível abrir o contrato assinado: ' + (err.message || err));
    }
  };

  // Conclui a admissão SEM a assinatura digital do RH no portal: o contrato
  // assinado pelo colaborador vira o documento final, e o RH assina na cópia
  // impressa. Torna a assinatura do RH no portal opcional.
  const handleConcludeWithoutDigitalRep = async () => {
    const selectedTokenRow = tokensList.find(t => t.id === selectedTokenId);
    if (!selectedTokenRow) return;
    if (!confirm(
      'Concluir a admissão SEM assinatura digital do RH?\n\n' +
      'O contrato assinado pelo colaborador é marcado como final e fica salvo. ' +
      'Imprima-o para o RH assinar fisicamente. Esta ação não pode ser desfeita pelo portal.'
    )) return;

    setIsFinishingAdmission(true);
    try {
      const details = selectedTokenRow.detalhes || {};
      const cpf = selectedTokenRow.candidato_cpf || details.cpf || '';

      const { data: signDoc, error: docErr } = await supabase
        .from('documentos_assinados')
        .select('id')
        .eq('colaborador_cpf', cpf)
        .eq('status', 'aguardando_rh')
        .maybeSingle();
      if (docErr || !signDoc) throw new Error('Contrato assinado pelo colaborador não encontrado.');

      const { error: updErr } = await supabase
        .from('documentos_assinados')
        .update({ status: 'finalizado' })
        .eq('id', signDoc.id);
      if (updErr) throw updErr;

      await supabase
        .from('admission_tokens')
        .update({ status: 'concluido', usado_em: new Date().toISOString() })
        .eq('id', selectedTokenId);

      await supabase.from('colaboradores').update({ depily: true }).eq('cpf', cpf);

      await logAuditoria('ADMISSAO_CONCLUIDA_ASSINATURA_FISICA', {
        candidato: selectedTokenRow.candidato_nome,
        cpf
      });

      notify('Admissão concluída. O contrato assinado pelo colaborador está salvo — imprima para o RH assinar fisicamente.');
      fetchTokensList();
      fetchColaboradoresList();
    } catch (err: any) {
      notify('Erro ao concluir admissão: ' + (err.message || err));
    } finally {
      setIsFinishingAdmission(false);
    }
  };

  // CSV log exporter compliant with RFC 4180
  const exportLogsToCsv = async () => {
    try {
      const { data, error } = await supabase
        .from('logs_auditoria')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        notify("Nenhum log disponível para exportação.");
        return;
      }

      const headers = ['ID', 'Criado Em', 'Usuario Email', 'Acao', 'IP Address', 'User Agent', 'Detalhes'];
      const rows = data.map(log => {
        const id = log.id;
        const criadoEm = log.criado_em;
        const email = log.usuario_email || 'sistema';
        const acao = log.acao;
        const ip = log.ip_address || '127.0.0.1';
        const userAgent = log.user_agent ? log.user_agent.replace(/"/g, '""') : '';
        const detalhes = log.detalhes ? JSON.stringify(log.detalhes).replace(/"/g, '""') : '';

        return `"${id}","${criadoEm}","${email}","${acao}","${ip}","${userAgent}","${detalhes}"`;
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([new TextEncoder().encode(csvContent)], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `logs_auditoria_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await logAuditoria('EXPORTAR_LOGS_CSV');
    } catch (err: any) {
      notify("Erro ao exportar logs: " + err.message);
    }
  };

  // Fetch occurrences list for the active collaborator
  const fetchOcorrencias = async (colabId: string) => {
    try {
      const { data, error } = await supabase
        .from('ocorrencias_jornada')
        .select('*')
        .eq('colaborador_id', colabId)
        .order('data_ocorrencia', { ascending: false });

      if (error) throw error;
      setOcorrenciasList(data || []);
    } catch (err: any) {
      console.error("Error fetching occurrences:", err.message);
      setOcorrenciasList([]);
    }
  };

  // Submit handler for registering a new occurrence
  const handleRegisterOcorrencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeColaboradorForDrawer) return;

    setIsSubmittingOcorrencia(true);

    try {
      let anexoUrl = '';

      if (ocFile) {
        const fileExt = ocFile.name.split('.').pop();
        const fileName = `${activeColaboradorForDrawer.cpf.replace(/\D/g, '')}/${Date.now()}.${fileExt}`;

        // Upload attachment to private bucket
        const { error: uploadErr } = await supabase.storage
          .from('documentos-envios')
          .upload(fileName, ocFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadErr) throw uploadErr;

        // Generate a 10-year signed URL for secure document access
        const { data: urlData, error: urlErr } = await supabase.storage
          .from('documentos-envios')
          .createSignedUrl(fileName, 315360000);

        if (urlErr) throw urlErr;
        anexoUrl = urlData.signedUrl;
      }

      // Insert record
      const { error: insertErr } = await supabase
        .from('ocorrencias_jornada')
        .insert({
          colaborador_id: activeColaboradorForDrawer.id,
          tipo: ocTipo,
          data_ocorrencia: ocData,
          horas_minutos_desvio: ocDesvio || null,
          justificativa: ocJustificativa || null,
          anexo_url: anexoUrl || null,
          criado_por: user.id
        });

      if (insertErr) throw insertErr;

      await logAuditoria('REGISTRAR_OCORRENCIA_JORNADA', {
        colaborador: activeColaboradorForDrawer.nome,
        tipo: ocTipo,
        data: ocData
      });

      notify('Ocorrência de jornada registrada com sucesso!');

      // Reset form
      setOcTipo('Atraso');
      setOcData(new Date().toISOString().split('T')[0]);
      setOcDesvio('');
      setOcJustificativa('');
      setOcFile(null);
      setIsRegisteringOcorrencia(false);

      // Refresh list — fetchAnalyticsData é o que popula ocorrenciasAnalytics
      // (fonte dos painéis de analytics); sem ele a ocorrência só aparecia
      // no drawer, e os relatórios continuavam com dado velho até um F5.
      fetchOcorrencias(activeColaboradorForDrawer.id);
      fetchDashboardKpis();
      fetchAnalyticsData();
    } catch (err: any) {
      notify('Erro ao registrar ocorrência: ' + err.message);
    } finally {
      setIsSubmittingOcorrencia(false);
    }
  };

  const handleRegisterAdvertencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeColaboradorForDrawer) return;

    setIsSavingAdvertencia(true);

    try {
      const colabPrevAdvertencias = dbAdvertencias
        .filter(adv => adv.colaborador_id === activeColaboradorForDrawer.id)
        .map(adv => ({
          id: adv.id,
          data_falta: adv.data_falta,
          descricao_situacao: adv.descricao_situacao,
          criado_em: adv.criado_em
        }));

      if (!user?.email) {
        notify('Operação não autorizada. Faça login novamente.');
        return;
      }
      const avaliadorEmail = user.email;

      const { data, error: insertErr } = await supabase
        .from('colaborador_advertencias')
        .insert({
          colaborador_id: activeColaboradorForDrawer.id,
          data_falta: advDataFalta,
          descricao_situacao: advDescricaoSituacao,
          avaliador_email: avaliadorEmail,
          advertencias_anteriores: colabPrevAdvertencias
        })
        .select('*')
        .single();

      if (insertErr) throw insertErr;

      if (data) {
        setDbAdvertencias(prev => [data, ...prev]);
      }

      await logAuditoria('REGISTRAR_ADVERTENCIA', {
        colaborador: activeColaboradorForDrawer.nome,
        data_falta: advDataFalta
      });

      notify('Advertência registrada com sucesso!');

      setAdvDataFalta(new Date().toISOString().split('T')[0]);
      setAdvDescricaoSituacao('');
      setIsRegisteringAdvertencia(false);
      
      setSelectedAdvertenciaForModal(data);
      setShowAdvertenciaModal(true);

    } catch (err: any) {
      notify('Erro ao registrar advertência: ' + err.message);
    } finally {
      setIsSavingAdvertencia(false);
    }
  };

  const handleCadastrarColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cadastroNome.trim() || !cadastroCpf.trim() || !cadastroCargo.trim() || !cadastroAdmissao) {
      notify('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    setIsSavingCadastro(true);
    try {
      const { error } = await supabase.from('colaboradores').insert({
        nome: cadastroNome.trim().toUpperCase(),
        cpf: cadastroCpf.trim(),
        cargo: cadastroCargo.trim(),
        setor: cadastroSetor,
        salario: cadastroSalario.trim() || null,
        data_admissao: cadastroAdmissao,
        data_aniversario: cadastroAniversario.trim() || null,
        status: 'ativo',
        vale_alimentacao: false,
        plano_saude: false,
        depily: false,
        kit_onboarding: false,
        uniforme_sapato: false,
        entrega_epi: false,
        treinamento_inicial: false,
        cadastro_biometria: false
      });
      if (error) throw error;
      await logAuditoria('CADASTRO_DIRETO_COLABORADOR', { nome: cadastroNome, cpf: cadastroCpf, setor: cadastroSetor });
      notify(`Colaborador ${cadastroNome.trim()} cadastrado com sucesso!`);
      // Reset form
      setCadastroNome('');
      setCadastroCpf('');
      setCadastroCargo('');
      setCadastroSetor('Administrativo');
      setCadastroSalario('');
      setCadastroAdmissao('');
      setCadastroAniversario('');
      fetchColaboradoresList();
      setColabSubTab('quadro');
    } catch (err: any) {
      notify('Erro ao cadastrar colaborador: ' + err.message);
    } finally {
      setIsSavingCadastro(false);
    }
  };

  const resetMerge = async () => {
    setExistingData({ nome: '-', cpf: '-', rg: '-', cargo: '-', setor: '-', salario: '-' });
    setIsMerged(false);
    await logAuditoria('RESET_SIMULACAO_ADMISSAO');
  };

  useEffect(() => {
    if (activePath === '/app/colaboradores') {
      fetchTokensList();
      fetchColaboradoresList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath]);

  useEffect(() => {
    // Inscrição Supabase Realtime para tabelas críticas (documentos, colaboradores, advertências, avaliações)
    const channel = supabase
      .channel('documentos-assinados-realtime-rh')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'documentos_assinados' },
        (payload) => {
          console.log('Realtime notification received (documentos):', payload);
          fetchTokensList();
          fetchColaboradoresList();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'colaboradores' },
        (payload) => {
          console.log('Realtime change received (colaboradores):', payload);
          fetchColaboradoresList();
          fetchDashboardKpis();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'colaborador_advertencias' },
        (payload) => {
          console.log('Realtime change received (advertencias):', payload);
          fetchColaboradoresList();
          fetchDashboardKpis();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'avaliacoes_desempenho' },
        (payload) => {
          console.log('Realtime change received (avaliacoes):', payload);
          fetchColaboradoresList();
          fetchDashboardKpis();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // --- MÓDULO 3: ONBOARDING ---
  const [colaboradoresList, setColaboradoresList] = useState<any[]>([]);
  const [loadingColabs, setLoadingColabs] = useState(true);
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string>('');
  const [selectedSector, setSelectedSector] = useState('Biomedicina');

  const [benefits, setBenefits] = useState({
    valeAlimentacao: false,
    planoSaude: false,
    depily: false,
    kitOnboarding: false,
    uniformeSapato: false
  });

  const [tasks, setTasks] = useState({
    entregaEPI: false,
    treinamentoInicial: false,
    cadastroBiometria: false
  });

  const [onboardingProgress, setOnboardingProgress] = useState(0);
  const [onboardingStatus, setOnboardingStatus] = useState('pendente');
  const [onboardingSuccessMessage, setOnboardingSuccessMessage] = useState(false);

  const fetchColaboradoresList = async () => {
    setLoadingColabs(true);
    try {
      const [colabsRes, benefitsRes, assocRes, planosRes, avaliacoesRes] = await Promise.all([
        supabase.from('colaboradores').select('*').order('nome', { ascending: true }),
        supabase.from('beneficios').select('*'),
        supabase.from('colaborador_beneficios').select('*'),
        supabase.from('planos_carreira').select('*'),
        supabase.from('avaliacoes_desempenho').select('*').order('data_avaliacao', { ascending: false })
      ]);

      if (colabsRes.error) throw colabsRes.error;

      if (colabsRes.data) {
        setColaboradoresList(colabsRes.data);
        const nonDesligados = colabsRes.data.filter((c: any) => c.status !== 'desligado');
        if (!selectedColaboradorId && nonDesligados.length > 0) {
          setSelectedColaboradorId(nonDesligados[0].id);
          loadColaboradorOnboarding(nonDesligados[0]);
        } else if (colabsRes.data.length > 0) {
          const activeCol = colabsRes.data.find(c => c.id === selectedColaboradorId);
          if (activeCol) loadColaboradorOnboarding(activeCol);
        }
      } else {
        setColaboradoresList([]);
      }

      if (benefitsRes.data) setDbBenefits(benefitsRes.data);
      if (assocRes.data) setDbColaboradorBeneficios(assocRes.data);
      if (planosRes.data) setDbPlanosCarreira(planosRes.data);
      if (avaliacoesRes.data) setDbAvaliacoesDesempenho(avaliacoesRes.data);

      let advertenciasData: any[] = [];
      try {
        const { data, error } = await supabase
          .from('colaborador_advertencias')
          .select('*')
          .order('criado_em', { ascending: false });
        if (!error && data) {
          advertenciasData = data;
        }
      } catch (err) {
        console.warn('colaborador_advertencias table not loaded:', err);
      }
      setDbAdvertencias(advertenciasData);

    } catch (err) {
      console.error('Error fetching colaboradores and benefits:', err);
    } finally {
      setLoadingColabs(false);
    }
  };

  const loadColaboradorOnboarding = (col: any) => {
    setBenefits({
      valeAlimentacao: col.vale_alimentacao,
      planoSaude: col.plano_saude,
      depily: col.depily,
      kitOnboarding: col.kit_onboarding,
      uniformeSapato: col.uniforme_sapato
    });
    setTasks({
      entregaEPI: col.entrega_epi,
      treinamentoInicial: col.treinamento_inicial,
      cadastroBiometria: col.cadastro_biometria
    });
    setOnboardingProgress(col.onboarding_progresso);
    setOnboardingStatus(col.status);
    setSelectedSector(col.setor || 'Biomedicina');
  };

  const handleColaboradorSelectChange = (id: string) => {
    setSelectedColaboradorId(id);
    const colObj = colaboradoresList.find(c => c.id === id);
    if (colObj) {
      loadColaboradorOnboarding(colObj);
    }
  };

  const handleCheckboxChange = async (category: 'benefit' | 'task', key: string, checked: boolean) => {
    if (!selectedColaboradorId) return;

    const columnMap: any = {
      valeAlimentacao: 'vale_alimentacao',
      planoSaude: 'plano_saude',
      depily: 'depily',
      kitOnboarding: 'kit_onboarding',
      uniformeSapato: 'uniforme_sapato',
      entregaEPI: 'entrega_epi',
      treinamentoInicial: 'treinamento_inicial',
      cadastroBiometria: 'cadastro_biometria'
    };

    const columnName = columnMap[key];
    if (!columnName) return;

    try {
      const { error } = await supabase
        .from('colaboradores')
        .update({ [columnName]: checked })
        .eq('id', selectedColaboradorId);

      if (error) throw error;

      if (category === 'benefit') {
        setBenefits(prev => ({ ...prev, [key]: checked }));
      } else {
        setTasks(prev => ({ ...prev, [key]: checked }));
      }

      const { data: updatedCol, error: fetchErr } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('id', selectedColaboradorId)
        .single();

      if (!fetchErr && updatedCol) {
        setOnboardingProgress(updatedCol.onboarding_progresso);
        setOnboardingStatus(updatedCol.status);

        const { data: listData } = await supabase.from('colaboradores').select('*').order('nome', { ascending: true });
        if (listData) setColaboradoresList(listData);
      }
    } catch (err: any) {
      console.error('Checkbox update failed:', err);
    }
  };

  useEffect(() => {
    if (activePath === '/app/onboarding' || activePath === '/app/colaboradores' || activePath === '/app/beneficios') {
      fetchColaboradoresList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath]);

  useEffect(() => {
    if (onboardingProgress === 100 && onboardingStatus === 'ativo') {
      setOnboardingSuccessMessage(true);
    } else {
      setOnboardingSuccessMessage(false);
    }
  }, [onboardingProgress, onboardingStatus]);


  // --- MÓDULO 4: ANALYTICS & LOGS AUDITORIA ---
  const [logsAuditoria, setLogsAuditoria] = useState<any[]>([]);
  const [ocorrenciasAnalytics, setOcorrenciasAnalytics] = useState<any[]>([]);
  const [indicadoresTrabalhistas, setIndicadoresTrabalhistas] = useState<any[]>([]);
  const [pesquisasSatisfacao, setPesquisasSatisfacao] = useState<any[]>([]);
  const [cargosAnalytics, setCargosAnalytics] = useState<any[]>([]);
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'geral' | 'turnover' | 'saude' | 'compensacao' | 'juridico'>('geral');

  // --- MÓDULO 5: DASHBOARD KPIs (dados reais) ---
  const [kpiAtivos, setKpiAtivos] = useState(0);
  const [kpiEfetivados, setKpiEfetivados] = useState(0);
  const [kpiContratos, setKpiContratos] = useState(0);
  const [kpiAdmissoesP, setKpiAdmissoesP] = useState(0);
  const [kpiAsoVencer, setKpiAsoVencer] = useState<any[]>([]);
  const [kpiFeriasVencer, setKpiFeriasVencer] = useState<any[]>([]);
  const [kpiExperienciaVencer, setKpiExperienciaVencer] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  // Drawer edit mode
  const [isEditingDrawer, setIsEditingDrawer] = useState(false);
  const [drawerEditData, setDrawerEditData] = useState<any>({});
  const [isSavingDrawer, setIsSavingDrawer] = useState(false);

  const fetchDashboardKpis = async () => {
    try {
      const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      const date90Ago = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
      const date60Ago = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0];

      const [colabsQ, contratos, admPend, asoQ, feriasQ, expQ, logs] = await Promise.all([
        supabase.from('colaboradores').select('id, status, data_admissao').neq('status', 'desligado'),
        supabase.from('documentos_assinados').select('id', { count: 'exact', head: true }).eq('status', 'finalizado'),
        supabase.from('admission_tokens').select('id', { count: 'exact', head: true }).in('status', ['aguardando_homologacao', 'aguardando_assinatura', 'aguardando_assinatura_rh']),
        supabase.from('colaboradores').select('id, nome, cargo, setor, data_aso_vencimento').eq('status', 'ativo').lte('data_aso_vencimento', in30).order('data_aso_vencimento'),
        supabase.from('colaboradores').select('id, nome, cargo, setor, data_ferias_vencimento').eq('status', 'ativo').lte('data_ferias_vencimento', in30).order('data_ferias_vencimento'),
        supabase.from('colaboradores').select('id, nome, cargo, setor, data_admissao').neq('status', 'desligado').gte('data_admissao', date90Ago).lte('data_admissao', date60Ago).order('data_admissao'),
        supabase.from('logs_auditoria').select('usuario_email, acao, criado_em').order('criado_em', { ascending: false }).limit(5)
      ]);

      const totalColabs = colabsQ.data?.length ?? 0;
      const efetivados = colabsQ.data?.filter(c => (c.status === 'ativo' || c.status === 'em_ferias') && c.data_admissao <= date90Ago).length ?? 0;

      setKpiAtivos(totalColabs);
      setKpiEfetivados(efetivados);
      setKpiContratos(contratos.count ?? 0);
      setKpiAdmissoesP(admPend.count ?? 0);
      setKpiAsoVencer(asoQ.data ?? []);
      setKpiFeriasVencer(feriasQ.data ?? []);
      setKpiExperienciaVencer(expQ.data ?? []);
      setRecentLogs(logs.data ?? []);
    } catch (err) {
      console.error('KPI fetch error:', err);
    }
  };

  useEffect(() => {
    if (activePath === '/app/dashboard') fetchDashboardKpis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath]);

  const handleSaveDrawerEdit = async () => {
    if (!activeColaboradorForDrawer) return;
    setIsSavingDrawer(true);
    try {
      const { error } = await supabase
        .from('colaboradores')
        .update(drawerEditData)
        .eq('id', activeColaboradorForDrawer.id);
      if (error) throw error;
      setActiveColaboradorForDrawer({ ...activeColaboradorForDrawer, ...drawerEditData });

      // Update local state list for instant responsiveness (no lag)
      setColaboradoresList(prev => prev.map(c =>
        c.id === activeColaboradorForDrawer.id ? { ...c, ...drawerEditData } : c
      ));

      await logAuditoria('EDICAO_FICHA_COLABORADOR', { colaborador_id: activeColaboradorForDrawer.id, campos: Object.keys(drawerEditData) });
      setIsEditingDrawer(false);
      fetchColaboradoresList();
      fetchDashboardKpis();
    } catch (err: any) {
      notify('Erro ao salvar: ' + err.message);
    } finally {
      setIsSavingDrawer(false);
    }
  };

  const handleOffboardColaborador = async () => {
    if (!activeColaboradorForDrawer) return;
    if (!offboardDate || !offboardType) {
      notify('Por favor, preencha a data e o tipo de desligamento.');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja desligar o colaborador "${activeColaboradorForDrawer.nome}"? Esta ação removerá todos os seus benefícios e definirá seu status como desligado.`)) return;

    setIsSavingOffboard(true);
    try {
      // 1. Delete benefit associations
      const { error: deleteAssocError } = await supabase
        .from('colaborador_beneficios')
        .delete()
        .eq('colaborador_id', activeColaboradorForDrawer.id);

      if (deleteAssocError) throw deleteAssocError;

      // 2. Update status of the collaborator
      const updateData = {
        status: 'desligado',
        tipo_desligamento: offboardType,
        data_desligamento: offboardDate,
        motivo_desligamento: offboardReason.trim() || null
      };

      const { error: updateError } = await supabase
        .from('colaboradores')
        .update(updateData)
        .eq('id', activeColaboradorForDrawer.id);

      if (updateError) throw updateError;

      // 3. Log Audit
      await logAuditoria('DESLIGAMENTO_COLABORADOR', {
        colaborador_id: activeColaboradorForDrawer.id,
        nome: activeColaboradorForDrawer.nome,
        tipo: offboardType,
        data: offboardDate
      });

      // 4. Update the local active state for the drawer
      setActiveColaboradorForDrawer({
        ...activeColaboradorForDrawer,
        ...updateData
      });

      // Update local state list for instant responsiveness (no lag)
      setColaboradoresList(prev => prev.map(c =>
        c.id === activeColaboradorForDrawer.id ? { ...c, ...updateData } : c
      ));

      setIsOffboardingMode(false);
      notify(`Colaborador ${activeColaboradorForDrawer.nome} desligado com sucesso!`);

      // 5. Refresh lists
      fetchColaboradoresList();
      fetchDashboardKpis();
      fetchAnalyticsData();
    } catch (err: any) {
      console.error(err);
      notify('Erro ao desligar colaborador: ' + err.message);
    } finally {
      setIsSavingOffboard(false);
    }
  };

  const handleCadastrarAvaliacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeColaboradorForDrawer) return;
    setIsSavingAvaliacao(true);
    try {
      const userObjStr = localStorage.getItem('omni_user');
      const userObj = userObjStr ? JSON.parse(userObjStr) : null;
      const avaliadorEmail = userObj?.email || 'coordenadora@itoclinic.com';

      const avgNota = (
        evalForm.competencias.qualidade_entregas +
        evalForm.competencias.relacionamento_interpessoal +
        evalForm.competencias.comunicacao +
        evalForm.competencias.organizacao +
        evalForm.competencias.proatividade +
        evalForm.competencias.comprometimento
      ) / 6;

      const serializedComments = JSON.stringify({
        is_structured: true,
        ...evalForm
      });

      const { data, error } = await supabase
        .from('avaliacoes_desempenho')
        .insert({
          colaborador_id: activeColaboradorForDrawer.id,
          nota: parseFloat(avgNota.toFixed(2)),
          comentarios: serializedComments,
          avaliador_email: avaliadorEmail,
          data_avaliacao: evalForm.dataFeedback || new Date().toISOString().split('T')[0]
        })
        .select('*')
        .single();

      if (error) throw error;

      // Update state locally for instant feedback
      if (data) {
        setDbAvaliacoesDesempenho(prev => [data, ...prev]);
      }

      await logAuditoria('LANCAMENTO_AVALIACAO_DESEMPENHO', {
        colaborador_id: activeColaboradorForDrawer.id,
        nome: activeColaboradorForDrawer.nome,
        nota: avgNota
      });

      notify(`Avaliação de desempenho lançada com sucesso com média ${avgNota.toFixed(1)}!`);
      setShowEvalModal(false);
    } catch (err: any) {
      notify('Erro ao registrar avaliação: ' + err.message);
    } finally {
      setIsSavingAvaliacao(false);
    }
  };

  const handleSaveQuickDates = async () => {
    if (!selectedColabForQuickUpdate) return;
    setIsSavingQuickDates(true);
    try {
      const updateData = {
        data_aso_vencimento: quickAsoDate || null,
        data_ferias_vencimento: quickFeriasDate || null
      };

      const { error } = await supabase
        .from('colaboradores')
        .update(updateData)
        .eq('id', selectedColabForQuickUpdate.id);

      if (error) throw error;

      await logAuditoria('EDICAO_FICHA_COLABORADOR', {
        colaborador_id: selectedColabForQuickUpdate.id,
        campos: Object.keys(updateData)
      });

      // Update local state list
      setColaboradoresList(prev => prev.map(c =>
        c.id === selectedColabForQuickUpdate.id ? { ...c, ...updateData } : c
      ));

      notify('Datas atualizadas com sucesso!');
      setSelectedColabForQuickUpdate(null);
      fetchDashboardKpis();
    } catch (err: any) {
      console.error(err);
      notify('Erro ao salvar datas: ' + err.message);
    } finally {
      setIsSavingQuickDates(false);
    }
  };

  // Soma meses/dias a uma data 'YYYY-MM-DD' e devolve 'YYYY-MM-DD'.
  const addMonthsISO = (dateStr: string, months: number) => {
    const d = new Date(dateStr + 'T12:00:00');
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  };
  const addDaysISO = (dateStr: string, days: number) => {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // Coloca o colaborador em férias: grava início + dias e empurra o vencimento
  // das férias para (início + 12 meses).
  const handleColocarEmFerias = async () => {
    if (!selectedColabForQuickUpdate) return;
    if (!quickFeriasInicio) { notify('Informe a data de início das férias.'); return; }
    const dias = parseInt(quickFeriasDias, 10);
    if (!dias || dias <= 0) { notify('Informe quantos dias de férias.'); return; }
    setIsSavingQuickDates(true);
    try {
      const novoVencimento = addMonthsISO(quickFeriasInicio, 12);
      const updateData = {
        status: 'em_ferias',
        ferias_inicio: quickFeriasInicio,
        ferias_dias: dias,
        data_ferias_vencimento: novoVencimento
      };
      const { error } = await supabase.from('colaboradores').update(updateData).eq('id', selectedColabForQuickUpdate.id);
      if (error) throw error;
      await logAuditoria('COLABORADOR_EM_FERIAS', { colaborador_id: selectedColabForQuickUpdate.id, inicio: quickFeriasInicio, dias });
      setColaboradoresList(prev => prev.map(c => c.id === selectedColabForQuickUpdate.id ? { ...c, ...updateData } : c));
      notify('Colaborador em férias. Vencimento atualizado para ' + new Date(novoVencimento + 'T12:00:00').toLocaleDateString('pt-BR') + '.');
      setSelectedColabForQuickUpdate(null);
      fetchDashboardKpis();
    } catch (err: any) {
      console.error(err);
      notify('Erro ao colocar em férias: ' + err.message);
    } finally {
      setIsSavingQuickDates(false);
    }
  };

  // Retorno de férias: volta o status para 'ativo' (o registro de férias fica
  // como histórico nos campos ferias_inicio/ferias_dias).
  const handleRetornarFerias = async () => {
    if (!selectedColabForQuickUpdate) return;
    if (!confirm('Confirmar retorno das férias? O status volta para Ativo.')) return;
    setIsSavingQuickDates(true);
    try {
      const { error } = await supabase.from('colaboradores').update({ status: 'ativo' }).eq('id', selectedColabForQuickUpdate.id);
      if (error) throw error;
      await logAuditoria('COLABORADOR_RETORNO_FERIAS', { colaborador_id: selectedColabForQuickUpdate.id });
      setColaboradoresList(prev => prev.map(c => c.id === selectedColabForQuickUpdate.id ? { ...c, status: 'ativo' } : c));
      notify('Colaborador retornou das férias (Ativo).');
      setSelectedColabForQuickUpdate(null);
      fetchDashboardKpis();
    } catch (err: any) {
      console.error(err);
      notify('Erro ao registrar retorno: ' + err.message);
    } finally {
      setIsSavingQuickDates(false);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      const [logsRes, colabsRes, ocorrenciasRes, indicadoresRes, benefitsRes, assocRes, pesquisasRes, cargosRes] = await Promise.all([
        supabase.from('logs_auditoria').select('*').order('criado_em', { ascending: false }).limit(8),
        supabase.from('colaboradores').select('*'),
        supabase.from('ocorrencias_jornada').select('*, colaboradores(nome, setor)'),
        supabase.from('indicadores_trabalhistas').select('*'),
        supabase.from('beneficios').select('*'),
        supabase.from('colaborador_beneficios').select('*'),
        supabase.from('pesquisas_satisfacao').select('nota, categoria, criado_em'),
        supabase.from('cargos').select('titulo, referencia_salarial_al, referencia_salarial_fonte, referencia_salarial_data')
      ]);

      if (logsRes.data) setLogsAuditoria(logsRes.data);
      if (colabsRes.data) setColaboradoresList(colabsRes.data);
      if (ocorrenciasRes.data) setOcorrenciasAnalytics(ocorrenciasRes.data);
      if (indicadoresRes.data) setIndicadoresTrabalhistas(indicadoresRes.data);
      if (benefitsRes.data) setDbBenefits(benefitsRes.data);
      if (assocRes.data) setDbColaboradorBeneficios(assocRes.data);
      if (pesquisasRes.data) setPesquisasSatisfacao(pesquisasRes.data);
      if (cargosRes.data) setCargosAnalytics(cargosRes.data);
    } catch (err) {
      console.error("Error fetching analytics data:", err);
    }
  };

  const handleDownloadAttachment = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documentos-envios')
        .createSignedUrl(filePath, 60);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err: any) {
      notify('Erro ao carregar anexo: ' + err.message);
    }
  };

  const handleUploadColaboradorFile = async () => {
    if (!activeColaboradorForDrawer || !uploadFile) return;
    setIsUploadingFile(true);
    try {
      const fileExt = uploadFile.name.split('.').pop();
      const cleanCpf = activeColaboradorForDrawer.cpf.replace(/\D/g, '');
      const storagePath = `colaborador-uploads/${cleanCpf}/${Date.now()}.${fileExt}`;

      // 1. Upload to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from('documentos-envios')
        .upload(storagePath, uploadFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadErr) throw uploadErr;

      // 2. Fetch current documentos_anexos from colaborador
      const currentAnexos = activeColaboradorForDrawer.documentos_anexos || {};
      const updatedAnexos = {
        ...currentAnexos,
        [uploadFileType]: storagePath
      };

      // 3. Update public.colaboradores database
      const { error: updateErr } = await supabase
        .from('colaboradores')
        .update({ documentos_anexos: updatedAnexos })
        .eq('id', activeColaboradorForDrawer.id);

      if (updateErr) throw updateErr;

      // 4. Update local state for immediate visual feedback
      const updatedColaborador = {
        ...activeColaboradorForDrawer,
        documentos_anexos: updatedAnexos
      };
      setActiveColaboradorForDrawer(updatedColaborador);
      setColaboradoresList(prev => prev.map(c =>
        c.id === activeColaboradorForDrawer.id ? updatedColaborador : c
      ));

      await logAuditoria('UPLOAD_DOCUMENTO_COLABORADOR', {
        colaborador: activeColaboradorForDrawer.nome,
        tipo: uploadFileType,
        caminho: storagePath
      });

      notify('Documento enviado com sucesso para a ficha!');
      setUploadFile(null);

      const fileInput = document.getElementById('drawer-file-upload-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err: any) {
      notify('Erro ao enviar documento: ' + err.message);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const getSalarioLiquido = (colab: any) => {
    const baseStr = colab.salario || 'R$ 0,00';
    const cleanStr = baseStr.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
    const baseValue = parseFloat(cleanStr) || 0;

    const colabAssocs = dbColaboradorBeneficios.filter(a => a.colaborador_id === colab.id);
    let totalAdicionais = 0;
    let totalDescontos = 0;

    colabAssocs.forEach(assoc => {
      const benefit = dbBenefits.find(b => b.id === assoc.beneficio_id);
      if (benefit) {
        let val = assoc.valor_customizado;
        if (val === null || val === undefined) {
          if (benefit.nome.toLowerCase().includes('vale transporte') || benefit.valor_padrao < 1) {
            val = baseValue * (benefit.valor_padrao < 1 ? benefit.valor_padrao : 0.06);
          } else {
            val = benefit.valor_padrao;
          }
        }
        if (benefit.tipo === 'adicional') {
          totalAdicionais += val;
        } else if (benefit.tipo === 'desconto') {
          totalDescontos += val;
        }
      }
    });

    const netValue = baseValue + totalAdicionais - totalDescontos;
    return {
      liquido: netValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      base: baseValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      adicionais: totalAdicionais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      descontos: totalDescontos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      netValue
    };
  };

  useEffect(() => {
    if (activePath === '/app/analytics' || activePath === '/app/avaliacoes') {
      fetchAnalyticsData();
    }
  }, [activePath]);



  // Filters computed list for employees board
  const filteredAndSortedColaboradores = useMemo(() => {
    return colaboradoresList
      .filter(c => {
        const matchesSearch =
          c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.cpf.includes(searchQuery);

        const matchesSector = filterSetor === 'Todos' || c.setor === filterSetor;

        let matchesStatus = true;
        if (colabSubTab === 'desligados') {
          matchesStatus = c.status === 'desligado';
        } else {
          if (filterStatus === 'Ativo') {
            matchesStatus = c.status === 'ativo';
          } else if (filterStatus === 'Em Férias') {
            matchesStatus = c.status === 'em_ferias';
          } else if (filterStatus === 'Onboarding') {
            matchesStatus = c.status === 'pendente';
          } else {
            matchesStatus = c.status !== 'desligado';
          }
        }

        return matchesSearch && matchesSector && matchesStatus;
      })
      .sort((a, b) => {
        const dateA = new Date(a.data_admissao).getTime();
        const dateB = new Date(b.data_admissao).getTime();
        return sortOrder === 'antigo' ? dateA - dateB : dateB - dateA;
      });
  }, [colaboradoresList, searchQuery, filterSetor, colabSubTab, filterStatus, sortOrder]);

  const warningsMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    (dbAdvertencias || []).forEach(adv => {
      if (adv && adv.colaborador_id) {
        if (!map[adv.colaborador_id]) {
          map[adv.colaborador_id] = [];
        }
        map[adv.colaborador_id].push(adv);
      }
    });
    return map;
  }, [dbAdvertencias]);

  const calendarEvents = useMemo(() => {
    const list: any[] = [];

    colaboradoresList.forEach((col) => {
      if (!col) return;

      // 1. Férias a vencer (data_ferias_vencimento)
      if (col.data_ferias_vencimento) {
        const d = new Date(col.data_ferias_vencimento + 'T12:00:00');
        if (!isNaN(d.getTime())) {
          list.push({
            id: `ferias-${col.id}`,
            date: col.data_ferias_vencimento,
            type: 'ferias',
            label: `Férias a Vencer: ${col.nome}`,
            desc: `Colaborador(a) ${col.nome} possui férias a vencer em ${d.toLocaleDateString('pt-BR')}.`,
            colaborador: col
          });
        }
      }

      // 2. Experiência acabando (90 dias após data_admissao)
      if (col.data_admissao) {
        const dateAdm = new Date(col.data_admissao + 'T12:00:00');
        if (!isNaN(dateAdm.getTime())) {
          const dateExp = new Date(dateAdm.getTime() + 90 * 86400000);
          if (!isNaN(dateExp.getTime())) {
            const expStr = dateExp.toISOString().split('T')[0];
            list.push({
              id: `exp-${col.id}`,
              date: expStr,
              type: 'experiencia',
              label: `Fim da Experiência: ${col.nome}`,
              desc: `Término do período de 90 dias de experiência desde a admissão em ${dateAdm.toLocaleDateString('pt-BR')}.`,
              colaborador: col
            });
          }
        }
      }

      // 3. Vencimento de ASO (data_aso_vencimento)
      if (col.data_aso_vencimento) {
        const d = new Date(col.data_aso_vencimento + 'T12:00:00');
        if (!isNaN(d.getTime())) {
          list.push({
            id: `aso-${col.id}`,
            date: col.data_aso_vencimento,
            type: 'aso',
            label: `ASO a Vencer: ${col.nome}`,
            desc: `Atestado de Saúde Ocupacional (ASO) vence em ${d.toLocaleDateString('pt-BR')}.`,
            colaborador: col
          });
        }
      }

      // 4. Data de Admissão (aniversário ou admissão pendente/nova)
      if (col.data_admissao) {
        const d = new Date(col.data_admissao + 'T12:00:00');
        if (!isNaN(d.getTime())) {
          list.push({
            id: `adm-${col.id}`,
            date: col.data_admissao,
            type: 'admissao',
            label: `Admissão: ${col.nome}`,
            desc: `Data de admissão de ${col.nome} (${col.cargo}) na clínica em ${d.toLocaleDateString('pt-BR')}.`,
            colaborador: col
          });
        }
      }
    });

    // 5. Data de Advertências (data_falta)
    dbAdvertencias.forEach((adv) => {
      if (!adv || !adv.data_falta) return;
      const col = colaboradoresList.find((c) => c.id === adv.colaborador_id);
      const d = new Date(adv.data_falta + 'T12:00:00');
      if (!isNaN(d.getTime())) {
        list.push({
          id: `adv-${adv.id}`,
          date: adv.data_falta,
          type: 'advertencia',
          label: `Advertência Disciplinar: ${col?.nome || 'Colaborador'}`,
          desc: `Advertência formal emitida devido a desvio: "${adv.descricao_situacao}"`,
          colaborador: col
        });
      }
    });

    return list;
  }, [colaboradoresList, dbAdvertencias]);

  // Sidebar Links array builder
  // Badge da sidebar: nº de alertas de pulse ainda não vistos (só faz sentido
  // para o RH; para o `ti` o RLS devolve 0).
  const [pulseAlertasNovos, setPulseAlertasNovos] = useState(0);
  useEffect(() => {
    if (!hasFullAccess) return;
    let active = true;
    (async () => {
      const { count } = await supabase
        .from('pulse_alertas')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'novo');
      if (active) setPulseAlertasNovos(count || 0);
    })();
    return () => { active = false; };
  }, [hasFullAccess]);

  // Badge da sidebar: lançamentos da folha pendentes na competência atual.
  const [folhaPendentes, setFolhaPendentes] = useState(0);
  useEffect(() => {
    if (!hasFullAccess) return;
    let active = true;
    (async () => {
      const comp = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const { count } = await supabase
        .from('folha_lancamentos')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pendente')
        .eq('competencia', comp);
      if (active) setFolhaPendentes(count || 0);
    })();
    return () => { active = false; };
  }, [hasFullAccess, activePath]);

  const sidebarLinks = [
    ...(hasFullAccess ? [
      { path: '/app/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
      { path: '/app/colaboradores', label: 'Colaboradores', icon: <Users size={16} /> },
      { path: '/app/onboarding', label: 'Onboarding', icon: <ClipboardCheck size={16} /> },
      { path: '/app/documentos', label: 'Documentos', icon: <FileText size={16} /> },
      { path: '/app/beneficios', label: 'Benefícios', icon: <Gift size={16} /> },
      { path: '/app/ferias-aso', label: 'Férias & ASO', icon: <Calendar size={16} /> },
      { path: '/app/avaliacoes', label: 'Avaliações', icon: <Award size={16} /> },
      { path: '/app/cargos', label: 'Cargos & Carreira', icon: <Briefcase size={16} /> },
      { path: '/app/feedback', label: 'Voz do Time', icon: <MessageSquare size={16} /> },
      { path: '/app/ponto', label: 'Espelho de Ponto', icon: <Clock size={16} /> },
      { path: '/app/riscos', label: 'Mapa de Riscos', icon: <Shield size={16} /> },
      { path: '/app/folha', label: 'Lançamentos da Folha', icon: <Receipt size={16} /> },
      { path: '/app/agenda', label: 'Agenda RH', icon: <Calendar size={16} /> }
    ] : []),
    { path: '/app/analytics', label: 'Analytics', icon: <TrendingUp size={16} /> }
  ];

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="space-y-8 flex-1 min-h-0 overflow-y-auto sidebar-scroll pr-1 -mr-1">

        {/* Branding header */}
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold tracking-tight text-sm ${theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]'
            }`}>
            ITO
          </div>
          <span className="font-semibold tracking-wider text-base">OMNI ITO</span>
        </div>

        {/* Links list */}
        <nav className="flex flex-col gap-1.5">
          {sidebarLinks.map((link) => {
            const isActive = activePath === link.path;
            const badge = link.path === '/app/feedback'
              ? pulseAlertasNovos
              : link.path === '/app/folha'
                ? folhaPendentes
                : 0;
            return (
              <button
                key={link.path}
                onClick={() => {
                  navigate(link.path);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all relative ${isActive
                    ? (theme === 'dark' ? 'bg-white/5 text-[#E5DFD3]' : 'bg-black/5 text-[#0A0A0A]')
                    : 'opacity-65 hover:opacity-100'
                  }`}
              >
                {/* Active Indicator Line and Glow */}
                {isActive && (
                  <>
                    <span className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-[#E5DFD3] rounded-r"
                      style={{ backgroundColor: theme === 'dark' ? '#E5DFD3' : '#0A0A0A' }} />
                    <span className="absolute left-0 top-1/4 bottom-1/4 w-[12px] bg-[#E5DFD3]/10 blur-[4px] rounded-r"
                      style={{ backgroundColor: theme === 'dark' ? 'rgba(229,223,211,0.2)' : 'rgba(10,10,10,0.15)' }} />
                  </>
                )}
                {link.icon}
                <span>{link.label}</span>
                {badge > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Section Bottom */}
      <div className="pt-6 mt-6 border-t border-white/5 space-y-4 shrink-0">

        {/* Toggle Theme inline */}
        <div className="flex items-center justify-between text-xs opacity-75">
          <span>Aparência</span>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`p-1.5 rounded-lg border transition-colors ${theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'
              }`}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col text-left min-w-0">
            <span className="text-[10px] font-bold opacity-80 leading-none truncate">{user?.email}</span>
            <span className="text-[9px] font-mono opacity-50 capitalize mt-1">
              {role === 'coordenadora_rh' ? 'Coordenadora RH' : (user?.email === 'ito.thiagosilva@gmail.com' ? 'TI Admin (Bypass)' : 'Auditor TI')}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className={`p-1.5 rounded-lg border flex-shrink-0 transition-colors ${theme === 'dark' ? 'border-white/10 hover:bg-rose-500/15 hover:text-rose-500' : 'border-black/10 hover:bg-rose-500/15 hover:text-rose-500'
              }`}
            title="Sair"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0D0D0C] text-[#E5DFD3]' : 'bg-[#FBFBFA] text-[#0A0A0A]'
      }`}>

      {/* 1. Desktop Left Sidebar */}
      <aside className={`hidden md:block w-64 border-r fixed inset-y-0 left-0 p-6 z-40 transition-colors ${theme === 'dark' ? 'border-white/10 bg-black/20 backdrop-blur-md' : 'border-black/5 bg-[#F4F4F3]'
        }`}>
        {renderSidebarContent()}
      </aside>

      {/* 2. Mobile Top Navigation Header */}
      <header className={`md:hidden sticky top-0 z-50 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between transition-colors ${theme === 'dark' ? 'border-white/10 bg-[#0D0D0C]/80' : 'border-black/5 bg-[#FBFBFA]/80'
        }`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold tracking-tight text-sm ${theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]'
            }`}>
            ITO
          </div>
          <span className="font-semibold tracking-wider text-base">OMNI ITO</span>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-[9px] px-2 py-0.5 rounded border font-mono ${role === 'coordenadora_rh' || user?.email === 'ito.thiagosilva@gmail.com'
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            }`}>
            {role === 'coordenadora_rh' || user?.email === 'ito.thiagosilva@gmail.com' ? 'ADM' : 'TI'}
          </span>
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className={`p-2 rounded-lg border transition-colors ${theme === 'dark' ? 'border-white/10 bg-[#0D0D0C]' : 'border-black/10 bg-[#FBFBFA]'
              }`}
          >
            {isMobileSidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {/* 3. Mobile Sidebar Overlay Drawer */}
      {isMobileSidebarOpen && (
        <>
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          />
          <aside className={`fixed inset-y-0 left-0 w-64 p-6 z-50 transform transition-transform duration-300 ease-in-out md:hidden ${theme === 'dark' ? 'bg-[#0D0D0C] border-r border-white/10' : 'bg-[#FBFBFA] border-r border-black/10'
            }`}>
            {renderSidebarContent()}
          </aside>
        </>
      )}

      {/* 4. Main Workspace */}
      <div className="flex-1 flex flex-col min-h-screen justify-between md:pl-64">

        <main className="max-w-6xl w-full mx-auto px-6 py-8 flex-1">
         <Suspense fallback={<div className="py-24 flex justify-center opacity-60"><div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" /></div>}>

          <div className={`rounded-2xl border p-6 md:p-8 transition-colors ${theme === 'dark' ? 'glass-card-dark' : 'glass-card-light'
            }`}>

            {/* MÓDULO 5: DASHBOARD OVERVIEW */}
            {activePath === '/app/dashboard' && hasFullAccess && (
              <div className="space-y-8 animate-fadeIn">

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 pb-6 border-b border-white/8">
                  <div>
                    <p className={`text-[10px] font-bold tracking-[0.2em] uppercase mb-1.5 ${theme === 'dark' ? 'text-[#E5DFD3]/40' : 'text-black/35'}`}>
                      Instituto Thiago Omena · Omni RH
                    </p>
                    <h2 className="text-2xl font-extrabold tracking-tight leading-none">Painel de Controle</h2>
                    <p className={`text-xs mt-1.5 ${theme === 'dark' ? 'text-[#E5DFD3]/45' : 'text-black/40'}`}>
                      Centro operacional · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <div className={`text-[9px] font-mono px-3 py-1.5 rounded-full border flex items-center gap-1.5 self-start md:self-auto ${theme === 'dark' ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/8' : 'border-emerald-500/30 text-emerald-600 bg-emerald-50'
                    }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    Sistema Operacional
                  </div>
                </div>

                {/* ── KPI Cards ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      label: 'Total de Colaboradores',
                      value: kpiAtivos,
                      sub: 'ativos e em onboarding',
                      color: 'emerald',
                      accent: theme === 'dark' ? 'border-t-emerald-500/60' : 'border-t-emerald-500/40',
                      glow: 'shadow-[0_0_24px_-8px_rgba(52,211,153,0.18)]',
                      icon: '👥'
                    },
                    {
                      label: 'Colaboradores Efetivados',
                      value: kpiEfetivados,
                      sub: 'acima de 3 meses de casa',
                      color: 'sky',
                      accent: theme === 'dark' ? 'border-t-sky-400/60' : 'border-t-sky-400/40',
                      glow: 'shadow-[0_0_24px_-8px_rgba(56,189,248,0.18)]',
                      icon: '🛡️'
                    },
                    {
                      label: 'Contratos Finalizados',
                      value: kpiContratos,
                      sub: 'assinados bilateralmente',
                      color: 'amber',
                      accent: theme === 'dark' ? 'border-t-amber-400/60' : 'border-t-amber-400/40',
                      glow: 'shadow-[0_0_24px_-8px_rgba(251,191,36,0.18)]',
                      icon: '📄'
                    },
                    {
                      label: 'Alertas & Penalidades',
                      value: kpiAsoVencer.length + kpiFeriasVencer.length + kpiExperienciaVencer.length + dbAdvertencias.length,
                      sub: `${dbAdvertencias.length} advertências registradas`,
                      color: kpiAsoVencer.length + kpiFeriasVencer.length + kpiExperienciaVencer.length + dbAdvertencias.length > 0 ? 'rose' : 'emerald',
                      accent: kpiAsoVencer.length + kpiFeriasVencer.length + kpiExperienciaVencer.length + dbAdvertencias.length > 0
                        ? (theme === 'dark' ? 'border-t-rose-400/60' : 'border-t-rose-400/40')
                        : (theme === 'dark' ? 'border-t-emerald-500/60' : 'border-t-emerald-500/40'),
                      glow: kpiAsoVencer.length + kpiFeriasVencer.length + kpiExperienciaVencer.length + dbAdvertencias.length > 0
                        ? 'shadow-[0_0_24px_-8px_rgba(251,113,133,0.22)]'
                        : 'shadow-[0_0_24px_-8px_rgba(52,211,153,0.18)]',
                      icon: kpiAsoVencer.length + kpiFeriasVencer.length + kpiExperienciaVencer.length + dbAdvertencias.length > 0 ? '⚠️' : '✅'
                    },
                  ].map((k, i) => (
                    <div key={i} className={`relative p-5 rounded-2xl border-t-2 flex flex-col justify-between h-32 transition-all duration-200 hover:scale-[1.02] ${k.accent} ${k.glow} ${theme === 'dark' ? 'bg-[#111110] border border-white/6 border-t-2' : 'bg-white border border-black/6 border-t-2'
                      }`}>
                      <div className="flex items-start justify-between">
                        <span className={`text-[9px] font-bold tracking-[0.15em] uppercase leading-tight ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`}>
                          {k.label}
                        </span>
                        <span className="text-base leading-none opacity-60">{k.icon}</span>
                      </div>
                      <div>
                        <span className={`text-4xl font-black font-mono leading-none ${k.color === 'emerald' ? 'text-emerald-400' :
                            k.color === 'sky' ? 'text-sky-400' :
                              k.color === 'amber' ? 'text-amber-400' : 'text-rose-400'
                          }`}>{k.value}</span>
                        <p className={`text-[9px] mt-1.5 ${theme === 'dark' ? 'text-white/35' : 'text-black/35'}`}>{k.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Alertas Reais ── */}
                {(kpiAsoVencer.length > 0 || kpiFeriasVencer.length > 0 || kpiExperienciaVencer.length > 0 || dbAdvertencias.length > 0) && (
                  <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'border-rose-500/15 bg-[#111110]' : 'border-rose-200 bg-white'
                    }`}>
                    {/* Alert Header Bar */}
                    <div className={`px-5 py-3.5 border-b flex items-center justify-between ${theme === 'dark' ? 'bg-rose-500/8 border-rose-500/15' : 'bg-rose-50 border-rose-200'
                      }`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${theme === 'dark' ? 'bg-rose-500/15' : 'bg-rose-100'
                          }`}>
                          <AlertTriangle size={13} className="text-rose-400" />
                        </div>
                        <span className="text-[10px] font-black tracking-[0.15em] uppercase text-rose-400">Alertas — Próximos 30 dias & Penalidades</span>
                      </div>
                      <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full ${theme === 'dark' ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-100 text-rose-500'
                        }`}>
                        {kpiAsoVencer.length + kpiFeriasVencer.length + kpiExperienciaVencer.length + dbAdvertencias.length} alertas / advertências
                      </span>
                    </div>

                    {/* Alert Content */}
                    <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-5">
                      {dbAdvertencias.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                            <h4 className={`text-[9px] font-black tracking-[0.15em] uppercase ${theme === 'dark' ? 'text-white/50' : 'text-black/50'}`}>Advertências Emitidas</h4>
                          </div>
                          <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                            {dbAdvertencias.slice(0, 5).map((adv: any) => {
                              const colab = colaboradoresList.find(c => c.id === adv.colaborador_id);
                              return (
                                <div key={adv.id} className={`p-2.5 rounded-xl border text-[11px] flex justify-between items-center gap-2 ${theme === 'dark' ? 'bg-rose-950/20 border-rose-500/20 hover:bg-rose-900/25' : 'bg-rose-50/50 border-rose-100'
                                  } transition-colors`}>
                                  <span className="font-semibold truncate">{colab?.nome?.split(' ').slice(0, 2).join(' ') || 'Colaborador'}</span>
                                  <span className={`font-mono text-[9px] shrink-0 px-2 py-0.5 rounded-full font-bold ${theme === 'dark' ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-100 text-rose-600'
                                    }`}>{(() => {
                                      const d = new Date(adv.data_falta + 'T12:00:00');
                                      return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
                                    })()}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {kpiAsoVencer.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`w-2 h-2 rounded-full bg-rose-400`} />
                            <h4 className={`text-[9px] font-black tracking-[0.15em] uppercase ${theme === 'dark' ? 'text-white/50' : 'text-black/50'}`}>ASO a Vencer</h4>
                          </div>
                           {kpiAsoVencer.map((c: any) => {
                            const dateD = new Date(c.data_aso_vencimento);
                            const dateStr = isNaN(dateD.getTime()) ? '—' : dateD.toLocaleDateString('pt-BR');
                            return (
                              <div key={c.id} className={`p-3 rounded-xl border text-xs flex justify-between items-center gap-2 ${theme === 'dark' ? 'bg-rose-500/8 border-rose-500/15 hover:bg-rose-500/12' : 'bg-rose-50 border-rose-100'
                                } transition-colors`}>
                                <span className="font-semibold truncate">{c.nome.split(' ').slice(0, 2).join(' ')}</span>
                                <span className={`font-mono text-[9px] shrink-0 px-2 py-0.5 rounded-full font-bold ${theme === 'dark' ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-100 text-rose-600'
                                  }`}>{dateStr}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {kpiFeriasVencer.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`w-2 h-2 rounded-full bg-amber-400`} />
                            <h4 className={`text-[9px] font-black tracking-[0.15em] uppercase ${theme === 'dark' ? 'text-white/50' : 'text-black/50'}`}>Férias a Vencer</h4>
                          </div>
                          {kpiFeriasVencer.map((c: any) => {
                            const dateD = new Date(c.data_ferias_vencimento);
                            const dateStr = isNaN(dateD.getTime()) ? '—' : dateD.toLocaleDateString('pt-BR');
                            return (
                              <div key={c.id} className={`p-3 rounded-xl border text-xs flex justify-between items-center gap-2 ${theme === 'dark' ? 'bg-amber-500/8 border-amber-500/15 hover:bg-amber-500/12' : 'bg-amber-50 border-amber-100'
                                } transition-colors`}>
                                <span className="font-semibold truncate">{c.nome.split(' ').slice(0, 2).join(' ')}</span>
                                <span className={`font-mono text-[9px] shrink-0 px-2 py-0.5 rounded-full font-bold ${theme === 'dark' ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-600'
                                  }`}>{dateStr}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {kpiExperienciaVencer.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`w-2 h-2 rounded-full bg-sky-400`} />
                            <h4 className={`text-[9px] font-black tracking-[0.15em] uppercase ${theme === 'dark' ? 'text-white/50' : 'text-black/50'}`}>Fim de Experiência</h4>
                          </div>
                          {kpiExperienciaVencer.map((c: any) => {
                            const dateAdm = new Date(c.data_admissao);
                            const dateFim = !isNaN(dateAdm.getTime()) ? new Date(dateAdm.getTime() + 90 * 86400000) : null;
                            const dateStr = dateFim && !isNaN(dateFim.getTime()) ? dateFim.toLocaleDateString('pt-BR') : '—';
                            return (
                              <div key={c.id} className={`p-3 rounded-xl border text-xs flex justify-between items-center gap-2 ${theme === 'dark' ? 'bg-sky-500/8 border-sky-500/15 hover:bg-sky-500/12' : 'bg-sky-50 border-sky-100'
                                } transition-colors`}>
                                <span className="font-semibold truncate">{c.nome.split(' ').slice(0, 2).join(' ')}</span>
                                <span className={`font-mono text-[9px] shrink-0 px-2 py-0.5 rounded-full font-bold ${theme === 'dark' ? 'bg-sky-500/15 text-sky-300' : 'bg-sky-100 text-sky-600'
                                  }`}>{dateStr}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Quick Actions + Recent Activity ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                  {/* Quick Actions */}
                  <div className="lg:col-span-2 space-y-3">
                    <p className={`text-[9px] font-black tracking-[0.2em] uppercase ${theme === 'dark' ? 'text-white/35' : 'text-black/35'}`}>Ações Rápidas</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        {
                          icon: <Users size={16} />,
                          label: 'Novo Colaborador',
                          desc: 'Cadastrar funcionário direto no sistema.',
                          action: () => { navigate('/app/colaboradores'); setColabSubTab('cadastrar'); },
                          accent: 'emerald'
                        },
                        {
                          icon: <ClipboardCheck size={16} />,
                          label: 'Registrar Ocorrência',
                          desc: 'Atraso, falta ou descumprimento de jornada.',
                          action: () => navigate('/app/colaboradores'),
                          accent: 'amber'
                        },
                        {
                          icon: <FileText size={16} />,
                          label: 'Emitir Contrato',
                          desc: 'Gerar e enviar modelo de documento assinável.',
                          action: () => navigate('/app/documentos'),
                          accent: 'sky'
                        },
                        {
                          icon: <TrendingUp size={16} />,
                          label: 'Ver Analytics',
                          desc: 'Acessar indicadores e métricas de RH.',
                          action: () => navigate('/app/analytics'),
                          accent: 'violet'
                        }
                      ].map((item, i) => (
                        <button
                          key={i}
                          onClick={item.action}
                          className={`group p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all duration-200 hover:scale-[1.015] ${theme === 'dark'
                              ? 'border-white/7 bg-[#111110] hover:border-white/12 hover:bg-[#161615]'
                              : 'border-black/7 bg-white hover:border-black/12 hover:bg-gray-50/80'
                            }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${item.accent === 'emerald' ? (theme === 'dark' ? 'bg-emerald-500/12 text-emerald-400 group-hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100') :
                              item.accent === 'amber' ? (theme === 'dark' ? 'bg-amber-500/12 text-amber-400 group-hover:bg-amber-500/20' : 'bg-amber-50 text-amber-600 group-hover:bg-amber-100') :
                                item.accent === 'sky' ? (theme === 'dark' ? 'bg-sky-500/12 text-sky-400 group-hover:bg-sky-500/20' : 'bg-sky-50 text-sky-600 group-hover:bg-sky-100') :
                                  (theme === 'dark' ? 'bg-violet-500/12 text-violet-400 group-hover:bg-violet-500/20' : 'bg-violet-50 text-violet-600 group-hover:bg-violet-100')
                            }`}>
                            {item.icon}
                          </div>
                          <div className="min-w-0">
                            <span className="block text-xs font-bold leading-tight">{item.label}</span>
                            <span className={`text-[9px] block mt-1 leading-relaxed ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`}>{item.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recent Activity Feed */}
                  <div className={`rounded-2xl border p-5 flex flex-col gap-4 ${theme === 'dark' ? 'bg-[#111110] border-white/6' : 'bg-white border-black/7'
                    }`}>
                    <div className="flex items-center gap-2">
                      <History size={13} className="text-emerald-500" />
                      <p className={`text-[9px] font-black tracking-[0.2em] uppercase ${theme === 'dark' ? 'text-white/35' : 'text-black/35'}`}>Atividades Recentes</p>
                    </div>
                    <div className="space-y-1 flex-1">
                      {recentLogs.length > 0 ? recentLogs.map((log: any, i: number) => (
                        <div key={i} className={`flex justify-between items-center py-2.5 border-b last:border-0 ${theme === 'dark' ? 'border-white/5' : 'border-black/5'
                          }`}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.acao?.includes('LOGIN') ? 'bg-emerald-400' :
                                log.acao?.includes('LOGOUT') ? 'bg-rose-400' :
                                  log.acao?.includes('CADASTRO') ? 'bg-sky-400' :
                                    log.acao?.includes('EDICAO') ? 'bg-amber-400' : 'bg-white/30'
                              }`} />
                            <span className={`text-[10px] truncate ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                              {log.acao?.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase())}
                            </span>
                          </div>
                          <span className={`font-mono text-[9px] shrink-0 ml-2 ${theme === 'dark' ? 'text-white/30' : 'text-black/30'}`}>
                            {new Date(log.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )) : (
                        <div className={`flex flex-col items-center justify-center h-24 gap-2 ${theme === 'dark' ? 'text-white/20' : 'text-black/20'}`}>
                          <History size={20} />
                          <p className="text-[10px]">Sem atividade registrada</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* Módulo 1: Documentos */}
            {activePath === '/app/documentos' && hasFullAccess && (
              <div className="space-y-6 animate-fadeIn">

                {/* Header */}
                <div className="pb-5 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#E5DFD3]/20">MÓDULO 1</span>
                      <h3 className="text-xl font-bold">Gestão de Documentos</h3>
                    </div>
                    <p className="text-xs opacity-65 mt-1">Modelos, formulários, envios e assinaturas em um único painel.</p>
                  </div>
                  {/* Sub-tabs pill bar */}
                  <div className="flex flex-wrap gap-1 border rounded-xl border-white/10 p-1 bg-black/10 self-start md:self-auto">
                    {([
                      ['visao', 'Visão Geral'],
                      ['modelos', 'Modelos'],
                      ['envios', 'Envios'],
                      ['pendencias', 'Pendências'],
                      ['formularios', 'Formulários'],
                      ['envio-form', 'Envio de Formulários'],
                      ['historico', 'Histórico'],
                    ] as [typeof docsSubTab, string][]).map(([key, label]) => (
                      <button key={key} onClick={() => { setDocsSubTab(key); if (key === 'historico') fetchDocsHistorico(); }}
                        className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-all ${docsSubTab === key
                            ? (theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]')
                            : 'opacity-55 hover:opacity-100'
                          }`}>{label}</button>
                    ))}
                  </div>
                </div>

                {/* ─── VISÃO GERAL ─── */}
                {docsSubTab === 'visao' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'Modelos Cadastrados', value: modelos.length, color: 'text-sky-400' },
                        { label: 'Documentos Assinados', value: docsHistorico.length || '—', color: 'text-emerald-500' },
                        { label: 'Contratos Finalizados', value: kpiContratos, color: 'text-emerald-400' },
                        { label: 'Envios Pendentes', value: kpiAdmissoesP, color: 'text-amber-400' },
                      ].map((k, i) => (
                        <div key={i} className={`p-5 rounded-xl border flex flex-col justify-between h-24 ${theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.02] border-black/5'
                          }`}>
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">{k.label}</span>
                          <span className={`text-3xl font-extrabold font-mono ${k.color}`}>{k.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className={`p-5 rounded-xl border space-y-3 ${theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.02] border-black/5'}`}>
                        <h4 className="text-xs font-bold uppercase tracking-wider opacity-60">Ações Rápidas</h4>
                        {[
                          { label: 'Novo Modelo de Documento', icon: <FileText size={15} />, action: () => { setDocsSubTab('modelos'); setShowNewModeloForm(true); } },
                          { label: 'Criar Formulário', icon: <ClipboardCheck size={15} />, action: () => setDocsSubTab('formularios') },
                          { label: 'Ver Pendências', icon: <AlertTriangle size={15} className="text-amber-500" />, action: () => setDocsSubTab('pendencias') },
                          { label: 'Ver Histórico Completo', icon: <History size={15} />, action: () => { setDocsSubTab('historico'); fetchDocsHistorico(); } },
                        ].map((a, i) => (
                          <button key={i} onClick={a.action}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border text-xs text-left transition-colors ${theme === 'dark' ? 'border-white/5 hover:bg-white/5' : 'border-black/5 hover:bg-black/5'
                              }`}>
                            <span className="opacity-70">{a.icon}</span>
                            <span className="font-semibold">{a.label}</span>
                          </button>
                        ))}
                      </div>
                      <div className={`p-5 rounded-xl border space-y-3 ${theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.02] border-black/5'}`}>
                        <h4 className="text-xs font-bold uppercase tracking-wider opacity-60">Modelos Disponíveis</h4>
                        {modelos.length > 0 ? modelos.map((m: any) => (
                          <div key={m.id} className={`p-3 rounded-lg border flex items-center justify-between text-xs ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-black/5 bg-black/[0.01]'}`}>
                            <span className="font-semibold truncate">{m.titulo}</span>
                            <button onClick={() => { setDocsSubTab('modelos'); setSelectedModeloId(m.id); setDocTemplate(m.conteudo); }}
                              className="text-[9px] px-2 py-1 rounded border border-white/10 opacity-70 hover:opacity-100">Usar</button>
                          </div>
                        )) : <p className="text-xs opacity-40 italic">Nenhum modelo cadastrado.</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── MODELOS ─── */}
                {docsSubTab === 'modelos' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold">Modelos de Documentos</h4>
                      <button onClick={() => setShowNewModeloForm(!showNewModeloForm)}
                        className={`text-xs px-4 py-2 rounded-lg font-bold border transition-colors ${showNewModeloForm ? 'border-rose-500/30 text-rose-400 bg-rose-500/10' : (theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-white')
                          }`}>{showNewModeloForm ? 'Cancelar' : '+ Novo Modelo'}</button>
                    </div>

                    {/* New Modelo Form */}
                    {showNewModeloForm && (
                      <div className={`p-5 rounded-xl border space-y-4 animate-fadeIn ${theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10'}`}>
                        <h5 className="text-xs font-bold uppercase tracking-wider opacity-60">Criar Novo Modelo</h5>
                        <div>
                          <label className="block text-[9px] font-bold uppercase opacity-50 mb-1">Título do Modelo *</label>
                          <input type="text" value={newModeloTitulo} onChange={e => setNewModeloTitulo(e.target.value)}
                            placeholder="Ex: Contrato de Experiência 45d"
                            className={`w-full text-xs p-2.5 rounded-lg border bg-transparent focus:outline-none ${theme === 'dark' ? 'border-white/15' : 'border-black/15'}`} />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase opacity-50 mb-1">Conteúdo / Texto do Modelo</label>
                          <textarea rows={6} value={newModeloConteudo} onChange={e => setNewModeloConteudo(e.target.value)}
                            placeholder="Use {{nome}}, {{cpf}}, {{setor}} como variáveis..."
                            className={`w-full text-xs p-2.5 rounded-lg border bg-transparent resize-none focus:outline-none font-mono ${theme === 'dark' ? 'border-white/15' : 'border-black/15'}`} />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase opacity-50 mb-1">Ou importar PDF/DOCX base</label>
                          <input type="file" accept="application/pdf,.docx,.doc" onChange={handlePdfUpload}
                            className={`w-full text-[10px] p-1.5 rounded-lg border ${theme === 'dark' ? 'border-white/10 bg-[#121211]' : 'border-black/10'}`} />
                          {uploadedPdfBase64 && <p className="text-[10px] text-emerald-500 mt-1">✓ Arquivo importado ({modelFileType.toUpperCase()}): {uploadedPdfName}</p>}
                        </div>

                        {uploadedPdfBase64 && (
                          <div className="space-y-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] mt-3">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                              <div>
                                <h6 className="text-[11px] font-bold uppercase tracking-wider opacity-75">📍 Posicionamento das Assinaturas (Prévia)</h6>
                                <p className="text-[9px] opacity-50 mt-0.5">Clique em qualquer lugar da folha para definir a posição do campo ativo.</p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setActivePositioningRole('colaborador')}
                                  className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${activePositioningRole === 'colaborador'
                                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                      : 'border-white/10 opacity-60'
                                    }`}
                                >
                                  ✍️ Colaborador
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActivePositioningRole('representante')}
                                  className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${activePositioningRole === 'representante'
                                      ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                                      : 'border-white/10 opacity-60'
                                    }`}
                                >
                                  🏛️ Representante (RH)
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start justify-center">
                              {/* Virtual A4 Canvas */}
                              <div
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const clickX = e.clientX - rect.left;
                                  const clickY = e.clientY - rect.top;
                                  const pctX = clickX / rect.width;
                                  const pctY = clickY / rect.height;
                                  const pdfX = Math.round(pctX * 600);
                                  const pdfY = Math.round((1 - pctY) * 800);

                                  if (activePositioningRole === 'colaborador') {
                                    setColabSigPos({ x: pdfX, y: pdfY, page: activePreviewPage });
                                  } else {
                                    setRepSigPos({ x: pdfX, y: pdfY, page: activePreviewPage });
                                  }
                                }}
                                className="w-full max-w-[210px] aspect-[1/1.414] relative bg-white border border-black/10 rounded shadow-md cursor-crosshair overflow-hidden select-none"
                              >
                                <div className="absolute inset-0 p-3 flex flex-col justify-between pointer-events-none">
                                  <div className="border-b border-black/5 pb-1 text-[6px] text-black/40 font-bold uppercase tracking-wider flex justify-between">
                                    <span>OMNI ITO - PREVIEW</span>
                                    <span>{modelFileType.toUpperCase()}</span>
                                  </div>
                                  <div className="flex-1 flex flex-col justify-center items-center gap-1 opacity-[0.08]">
                                    <div className="w-12 h-1 bg-black rounded" />
                                    <div className="w-16 h-1 bg-black rounded" />
                                    <div className="w-14 h-1 bg-black rounded" />
                                    <div className="w-20 h-1 bg-black rounded" />
                                  </div>
                                  <div className="border-t border-black/5 pt-1 text-[5px] text-black/30 text-center font-mono uppercase">
                                    PÁGINA {activePreviewPage}
                                  </div>
                                </div>

                                {colabSigPos && colabSigPos.page === activePreviewPage && (
                                  <div
                                    style={{
                                      left: `${(colabSigPos.x / 600) * 100}%`,
                                      top: `${(1 - (colabSigPos.y / 800)) * 100}%`,
                                      transform: 'translate(-50%, -100%)'
                                    }}
                                    className="absolute px-1.5 py-0.5 rounded text-[7px] font-bold bg-amber-500 text-black shadow border border-amber-600 pointer-events-none flex items-center gap-0.5 whitespace-nowrap"
                                  >
                                    <span>Colaborador ✍️</span>
                                  </div>
                                )}

                                {repSigPos && repSigPos.page === activePreviewPage && (
                                  <div
                                    style={{
                                      left: `${(repSigPos.x / 600) * 100}%`,
                                      top: `${(1 - (repSigPos.y / 800)) * 100}%`,
                                      transform: 'translate(-50%, -100%)'
                                    }}
                                    className="absolute px-1.5 py-0.5 rounded text-[7px] font-bold bg-sky-500 text-white shadow border border-sky-600 pointer-events-none flex items-center gap-0.5 whitespace-nowrap"
                                  >
                                    <span>RH 🏛️</span>
                                  </div>
                                )}
                              </div>

                              {/* Controls */}
                              <div className="flex-1 w-full space-y-3">
                                <div>
                                  <label className="block text-[8px] font-bold uppercase opacity-50 mb-1">Página do Modelo</label>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setActivePreviewPage(p => Math.max(1, p - 1))}
                                      className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-bold"
                                    >
                                      -
                                    </button>
                                    <span className="text-[10px] font-mono font-bold">Pág. {activePreviewPage}</span>
                                    <button
                                      type="button"
                                      onClick={() => setActivePreviewPage(p => p + 1)}
                                      className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-bold"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2 p-2 rounded bg-white/5 border border-white/10">
                                  <span className="text-[9px] font-bold uppercase tracking-wider block text-sky-400">
                                    {activePositioningRole === 'colaborador' ? 'Ajuste: Colaborador' : 'Ajuste: Representante'}
                                  </span>
                                  <div>
                                    <div className="flex justify-between text-[8px] opacity-60 mb-0.5">
                                      <span>X (Horizontal)</span>
                                      <span className="font-mono font-bold">{activePositioningRole === 'colaborador' ? colabSigPos?.x : repSigPos?.x} pt</span>
                                    </div>
                                    <input
                                      type="range"
                                      min="0"
                                      max="600"
                                      value={activePositioningRole === 'colaborador' ? (colabSigPos?.x || 80) : (repSigPos?.x || 380)}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        if (activePositioningRole === 'colaborador') {
                                          setColabSigPos(prev => ({ x: val, y: prev?.y || 150, page: activePreviewPage }));
                                        } else {
                                          setRepSigPos(prev => ({ x: val, y: prev?.y || 150, page: activePreviewPage }));
                                        }
                                      }}
                                      className="w-full h-1 bg-white/10 rounded appearance-none cursor-pointer accent-sky-400"
                                    />
                                  </div>

                                  <div>
                                    <div className="flex justify-between text-[8px] opacity-60 mb-0.5">
                                      <span>Y (Vertical)</span>
                                      <span className="font-mono font-bold">{activePositioningRole === 'colaborador' ? colabSigPos?.y : repSigPos?.y} pt</span>
                                    </div>
                                    <input
                                      type="range"
                                      min="0"
                                      max="800"
                                      value={activePositioningRole === 'colaborador' ? (colabSigPos?.y || 150) : (repSigPos?.y || 150)}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        if (activePositioningRole === 'colaborador') {
                                          setColabSigPos(prev => ({ x: prev?.x || 80, y: val, page: activePreviewPage }));
                                        } else {
                                          setRepSigPos(prev => ({ x: prev?.x || 380, y: val, page: activePreviewPage }));
                                        }
                                      }}
                                      className="w-full h-1 bg-white/10 rounded appearance-none cursor-pointer accent-sky-400"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <button
                          disabled={isSavingModelo || !newModeloTitulo.trim()}
                          onClick={async () => {
                            setIsSavingModelo(true);
                            try {
                              await supabase.from('modelos_documentos').insert({
                                titulo: newModeloTitulo.trim(),
                                conteudo: newModeloConteudo.trim() || uploadedPdfBase64,
                                tipo_arquivo: uploadedPdfBase64 ? modelFileType : 'texto',
                                assinatura_coordenadas: uploadedPdfBase64 ? colabSigPos : null,
                                assinatura_rep_coordenadas: uploadedPdfBase64 ? repSigPos : null
                              });
                              await logAuditoria('CRIACAO_MODELO_DOCUMENTO', { titulo: newModeloTitulo });
                              setShowNewModeloForm(false); setNewModeloTitulo(''); setNewModeloConteudo('');
                              setUploadedPdfBase64(''); setUploadedPdfName('');
                              fetchModelos();
                            } catch (e: any) { notify('Erro: ' + e.message); }
                            finally { setIsSavingModelo(false); }
                          }}
                          className={`text-xs px-5 py-2 rounded-lg font-bold ${theme === 'dark' ? 'bg-[#E5DFD3] text-black' : 'bg-[#0A0A0A] text-white'} disabled:opacity-50`}>
                          {isSavingModelo ? 'Salvando...' : '✓ Salvar Modelo'}
                        </button>
                      </div>
                    )}

                    {/* Modelos List + Editor */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[9px] font-bold uppercase opacity-50 mb-2">Modelos Cadastrados</label>
                        {modelos.map((m: any) => (
                          <button key={m.id} onClick={() => { setSelectedModeloId(m.id); setDocTemplate(m.conteudo); }}
                            className={`w-full text-left p-3 rounded-lg border text-xs transition-colors ${selectedModeloId === m.id
                                ? (theme === 'dark' ? 'border-[#E5DFD3]/30 bg-[#E5DFD3]/5 text-[#E5DFD3]' : 'border-black/30 bg-black/5')
                                : (theme === 'dark' ? 'border-white/5 hover:bg-white/5' : 'border-black/5 hover:bg-black/5')
                              }`}>
                            <span className="font-semibold block">{m.titulo}</span>
                            <span className="opacity-40 text-[9px]">ID: {m.id}</span>
                          </button>
                        ))}
                        <div className="pt-2">
                          <label className="block text-[9px] font-bold uppercase opacity-50 mb-1">Importar PDF Local</label>
                          <input type="file" accept="application/pdf" onChange={handlePdfUpload}
                            className={`w-full text-[10px] p-1.5 rounded border ${theme === 'dark' ? 'border-white/10 bg-[#121211]' : 'border-black/10'}`} />
                          {uploadedPdfBase64 && <p className="text-[10px] text-emerald-500 mt-1">✓ {uploadedPdfName}</p>}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {[
                            { l: 'Nome', s: varNome, f: setVarNome },
                            { l: 'CPF', s: varCpf, f: setVarCpf },
                            { l: 'Setor', s: varSetor, f: setVarSetor },
                            { l: 'Cargo', s: varCargo, f: setVarCargo },
                            { l: 'CBO', s: varCbo, f: setVarCbo },
                            { l: 'Salário (R$)', s: varSalario, f: setVarSalario },
                            { l: 'Salário por Extenso', s: varSalarioExtenso, f: setVarSalarioExtenso },
                            { l: 'Data Admissão', s: varAdmissao, f: setVarAdmissao },
                            { l: 'Endereço', s: varEndereco, f: setVarEndereco },
                            { l: 'Atribuições', s: varAtribuicoes, f: setVarAtribuicoes, span: 3 }
                          ].map(({ l, s, f, span }: any) => (
                            <div key={l} className={span === 3 ? 'col-span-full' : ''}>
                              <label className="block text-[9px] font-bold uppercase opacity-50 mb-1">{l}</label>
                              {span === 3 ? (
                                <textarea rows={2} value={s} onChange={e => f(e.target.value)} className={`w-full text-xs p-2 rounded border bg-transparent resize-none ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`} />
                              ) : (
                                <input type="text" value={s} onChange={e => f(e.target.value)} className={`w-full text-xs p-2 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`} />
                              )}
                            </div>
                          ))}
                        </div>
                        <div className={`p-4 rounded-xl border text-xs leading-relaxed font-serif ${theme === 'dark' ? 'bg-[#161615] border-white/5' : 'bg-black/[0.02] border-black/5'}`}>
                          <span className="block text-[9px] font-bold uppercase opacity-50 mb-2 tracking-wider">Pré-visualização</span>
                          {selectedModeloId === 'upload' ? (
                            <p className="text-emerald-500 font-mono text-[10px]">📄 PDF importado: {uploadedPdfName}</p>
                          ) : (
                            <div className="whitespace-pre-wrap opacity-80 min-h-[100px]">{renderTemplateText()}</div>
                          )}
                        </div>
                        {/* Enviar para Assinatura do Colaborador */}
                        <div className={`p-4 rounded-xl border space-y-4 ${theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10'}`}>
                          <h5 className="text-xs font-bold uppercase opacity-80 flex items-center gap-1">
                            <Signature size={14} className="text-sky-400" />
                            Enviar para Assinatura do Colaborador
                          </h5>

                          <div>
                            <label className="block text-[9px] font-bold uppercase opacity-50 mb-1">Selecionar Colaborador</label>
                            <select
                              value={selectedColaboradorForDocId}
                              onChange={e => handleSelectColaboradorForDoc(e.target.value)}
                              className={`w-full text-xs p-2.5 rounded-lg border bg-transparent ${theme === 'dark' ? 'border-white/10 bg-[#121211]' : 'border-black/10 bg-white'}`}
                            >
                              <option value="">-- Escolha um colaborador --</option>
                              {colaboradoresList.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.nome} ({c.cargo})</option>
                              ))}
                            </select>
                          </div>

                          <button
                            onClick={handleGenerateSignatureLink}
                            disabled={!selectedColaboradorForDocId || isGeneratingLink}
                            className={`w-full text-xs py-2 rounded-lg font-bold transition-all ${
                              theme === 'dark' ? 'bg-sky-500 hover:bg-sky-600 text-white' : 'bg-sky-600 hover:bg-sky-700 text-white'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            {isGeneratingLink ? 'Gerando Link...' : 'Gerar Link de Assinatura'}
                          </button>

                          {generatedSignLink && (
                            <div className="mt-3 text-xs p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 space-y-2">
                              <p className="font-bold flex items-center gap-1">
                                <CheckCircle size={14} /> Link gerado com sucesso!
                              </p>
                              <p className="text-[10px] opacity-75">Envie o link abaixo para o colaborador assinar o documento:</p>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={generatedSignLink}
                                  className={`w-full text-[10px] font-mono p-1 rounded border bg-transparent ${
                                    theme === 'dark' ? 'border-white/10' : 'border-black/10'
                                  }`}
                                />
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(generatedSignLink);
                                    notify('Link copiado para a área de transferência!');
                                  }}
                                  className={`text-[9px] px-2.5 rounded font-bold border transition-colors ${
                                    theme === 'dark' ? 'border-[#E5DFD3]/30 hover:bg-[#E5DFD3]/5 text-[#E5DFD3]' : 'border-black/30 hover:bg-black/5 text-black'
                                  }`}
                                >
                                  Copiar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── ENVIOS ─── */}
                {docsSubTab === 'envios' && (
                  <div className="space-y-5 animate-fadeIn">
                    <h4 className="text-sm font-bold">Acompanhamento de Envios</h4>
                    <p className="text-xs opacity-60">Documentos enviados via link de admissão e seus status de assinatura.</p>
                    {tokensList.length > 0 ? (
                      <div className="space-y-3">
                        {tokensList.map((t: any) => {
                          const statusMap: Record<string, { label: string; color: string }> = {
                            'pendente_preenchimento': { label: 'Preenchendo', color: 'bg-sky-500/10 border-sky-500/20 text-sky-400' },
                            'aguardando_homologacao': { label: 'Aguard. Homologação', color: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
                            'aguardando_assinatura': { label: 'Aguard. Assinatura', color: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
                            'aguardando_assinatura_rh': { label: 'Aguard. RH Assinar', color: 'bg-orange-500/10 border-orange-500/20 text-orange-400' },
                            'concluido': { label: 'Concluído ✓', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
                          };
                          const st = statusMap[t.status] || { label: t.status, color: 'bg-white/5 border-white/10 text-white' };
                          return (
                            <div key={t.id} className={`p-4 rounded-xl border flex items-center justify-between ${theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.02] border-black/5'}`}>
                              <div>
                                <span className="text-sm font-semibold block">{t.candidato_nome || '—'}</span>
                                <span className="text-[10px] opacity-50 font-mono">{t.token?.slice(0, 20)}...</span>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${st.color}`}>{st.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={`p-8 rounded-xl border text-center ${theme === 'dark' ? 'border-white/5 bg-[#121211]' : 'border-black/5 bg-black/[0.02]'}`}>
                        <p className="text-xs opacity-40 italic">Nenhum envio registrado. Gere um link de admissão na aba Colaboradores.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── PENDÊNCIAS ─── */}
                {docsSubTab === 'pendencias' && (
                  <div className="space-y-5 animate-fadeIn">
                    <h4 className="text-sm font-bold">Pendências Documentais</h4>
                    <div className="space-y-3">
                      {tokensList.filter((t: any) => t.status !== 'concluido').length > 0 ? (
                        tokensList.filter((t: any) => t.status !== 'concluido').map((t: any) => {
                          const handleResolvePending = () => {
                            setSelectedTokenId(t.id);
                            loadTokenForReview(t);
                            navigate('/app/colaboradores');
                            setColabSubTab('admissao');
                          };
                          return (
                            <div 
                              key={t.id} 
                              onClick={handleResolvePending}
                              className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all ${
                                theme === 'dark' 
                                  ? 'bg-rose-500/5 border-rose-500/15 hover:bg-rose-500/10' 
                                  : 'bg-rose-50 border-rose-200 hover:bg-rose-100/50'
                              }`}
                              title="Clique para assinar/revisar esta pendência"
                            >
                              <div>
                                <span className="text-sm font-semibold block text-rose-500">{t.candidato_nome || 'Candidato'}</span>
                                <span className="text-[10px] opacity-60 capitalize">
                                  {t.status === 'aguardando_assinatura_rh' ? 'Assinatura Pendente (RH)' : t.status?.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] opacity-50 font-bold uppercase tracking-wider">Clique para Resolver</span>
                                <AlertTriangle size={16} className="text-rose-400 opacity-70" />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className={`p-8 rounded-xl border text-center ${theme === 'dark' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50'}`}>
                          <CheckCircle size={24} className="text-emerald-500 mx-auto mb-2" />
                          <p className="text-xs text-emerald-500 font-semibold">Nenhuma pendência! Todos os envios foram concluídos.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ─── FORMULÁRIOS ─── */}
                {docsSubTab === 'formularios' && (
                  <FormManager theme={theme} />
                )}

                {/* ─── ENVIO DE FORMULÁRIOS ─── */}
                {docsSubTab === 'envio-form' && (
                  <div className="space-y-5 animate-fadeIn">
                    <h4 className="text-sm font-bold">Envio de Formulários para Colaboradores</h4>
                    <div className={`p-5 rounded-xl border space-y-4 ${theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10'}`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-bold uppercase opacity-50 mb-1">Colaborador Destinatário</label>
                          <select className={`w-full text-xs p-2.5 rounded-lg border bg-transparent ${theme === 'dark' ? 'border-white/10 bg-[#121211]' : 'border-black/10 bg-white'}`}>
                            <option value="">Selecionar colaborador...</option>
                            {colaboradoresList.map((c: any) => (
                              <option key={c.id} value={c.id}>{c.nome} — {c.cargo}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase opacity-50 mb-1">Formulário a Enviar</label>
                          <select className={`w-full text-xs p-2.5 rounded-lg border bg-transparent ${theme === 'dark' ? 'border-white/10 bg-[#121211]' : 'border-black/10 bg-white'}`}>
                            <option value="">Selecionar formulário...</option>
                            <option value="avaliacao">Avaliação de Desempenho</option>
                            <option value="pesquisa">Pesquisa de Clima</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold uppercase opacity-50 mb-1">Prazo de Resposta</label>
                        <input type="date" className={`text-xs p-2.5 rounded-lg border bg-transparent ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`} />
                      </div>
                      <button className={`text-xs px-5 py-2.5 rounded-lg font-bold ${theme === 'dark' ? 'bg-[#E5DFD3] text-black hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-white hover:bg-[#2A2A2A]'}`}>
                        Enviar Formulário
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── HISTÓRICO ─── */}
                {docsSubTab === 'historico' && (
                  <div className="space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold">Histórico de Documentos Assinados</h4>
                      <button onClick={fetchDocsHistorico} className="text-[9px] px-2.5 py-1 rounded border border-white/10 hover:bg-white/5 opacity-70">↻ Atualizar</button>
                    </div>
                    {docsHistorico.length > 0 ? (
                      <div className="space-y-2">
                        {docsHistorico.map((doc: any) => (
                          <div key={doc.id} className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.02] border-black/5'}`}>
                            <div>
                              <span className="font-semibold block">{doc.nome_colaborador || doc.cpf_colaborador || '—'}</span>
                              <span className="opacity-50 text-[10px]">
                                {doc.documento_id === '1' ? 'Termo de Imagem' : (doc.documento_id === '2' ? 'Contrato Experiência' : 'Documento')} &nbsp;·&nbsp;
                                {doc.assinado_em ? new Date(doc.assinado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${doc.status === 'finalizado' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                }`}>{doc.status === 'finalizado' ? 'Finalizado' : doc.status}</span>
                              {doc.url_arquivo && (
                                <button onClick={() => handleViewDocument(doc.url_arquivo)} className="p-1 rounded hover:bg-white/10 opacity-70 hover:opacity-100">
                                  <ExternalLink size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`p-8 rounded-xl border text-center ${theme === 'dark' ? 'border-white/5 bg-[#121211]' : 'border-black/5 bg-black/[0.02]'}`}>
                        <p className="text-xs opacity-40 italic">Nenhum documento assinado encontrado no banco de dados.</p>
                      </div>
                    )}

                    {/* Integridade */}
                    <div className={`p-4 rounded-xl border space-y-3 ${theme === 'dark' ? 'bg-[#181816] border-white/5' : 'bg-black/[0.03] border-black/5'}`}>
                      <div className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase opacity-65">
                        <Shield size={13} className="text-emerald-500" />
                        <span>Auditoria & Integridade SHA-256</span>
                      </div>
                      {signatureHash ? (
                        <span className="text-[10px] font-mono text-emerald-500 break-all bg-emerald-500/10 p-1.5 rounded border border-emerald-500/20 block">{signatureHash}</span>
                      ) : (
                        <span className="text-xs opacity-40 italic">Nenhuma assinatura gerada nesta sessão.</span>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Módulo 2: Colaboradores (Refactored Sub-tabs, Filters, Tenure Sorting, Drawer) */}
            {activePath === '/app/colaboradores' && hasFullAccess && (
              <div className="space-y-8 animate-fadeIn">

                {/* Header */}
                <div className="pb-6 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#E5DFD3]/20">MÓDULO 2</span>
                      <h3 className="text-xl font-bold">Gestão de Colaboradores</h3>
                    </div>
                    <p className="text-xs opacity-65 mt-1">Monitore o quadro geral de funcionários ativos e gerencie novas admissões.</p>
                  </div>

                  {/* Sub-tabs menu */}
                  <div className="flex border rounded-lg overflow-hidden border-white/10 p-1 bg-black/10 gap-1 self-start md:self-auto">
                    <button
                      onClick={() => setColabSubTab('quadro')}
                      className={`text-xs px-4 py-1.5 rounded font-bold transition-all ${colabSubTab === 'quadro'
                          ? (theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]')
                          : 'opacity-60 hover:opacity-100'
                        }`}
                    >
                      Quadro de Funcionários
                    </button>
                    <button
                      onClick={() => setColabSubTab('desligados')}
                      className={`text-xs px-4 py-1.5 rounded font-bold transition-all ${colabSubTab === 'desligados'
                          ? (theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]')
                          : 'opacity-60 hover:opacity-100'
                        }`}
                    >
                      Desligados
                    </button>
                    <button
                      onClick={() => setColabSubTab('admissao')}
                      className={`text-xs px-4 py-1.5 rounded font-bold transition-all ${colabSubTab === 'admissao'
                          ? (theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]')
                          : 'opacity-60 hover:opacity-100'
                        }`}
                    >
                      Processo de Admissão
                    </button>
                    <button
                      onClick={() => setColabSubTab('cadastrar')}
                      className={`text-xs px-4 py-1.5 rounded font-bold transition-all ${colabSubTab === 'cadastrar'
                          ? (theme === 'dark' ? 'bg-emerald-500 text-white' : 'bg-emerald-600 text-white')
                          : 'opacity-60 hover:opacity-100'
                        }`}
                    >
                      + Cadastrar
                    </button>
                  </div>
                </div>

                {/* Sub-tab 1: Quadro de Funcionários (Time Ativo) */}
                {(colabSubTab === 'quadro' || colabSubTab === 'desligados') && (
                  <div className="space-y-6 animate-fadeIn">

                    {/* Filters Toolbar */}
                    <div className={`grid grid-cols-1 sm:grid-cols-2 ${colabSubTab === 'quadro' ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-3`}>

                      {/* Search box */}
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold uppercase opacity-60 mb-1 tracking-wider">Busca rápida</label>
                        <input
                          type="text"
                          placeholder="Buscar por Nome ou CPF..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className={`w-full text-xs p-2.5 rounded-lg border bg-transparent focus:outline-none ${theme === 'dark' ? 'border-white/10 focus:ring-1 focus:ring-white' : 'border-black/15 focus:ring-1 focus:ring-black'
                            }`}
                        />
                      </div>

                      {/* Dropdown Setor */}
                      <div>
                        <label className="block text-[9px] font-bold uppercase opacity-60 mb-1 tracking-wider">Filtrar Setor</label>
                        <select
                          value={filterSetor}
                          onChange={(e) => setFilterSetor(e.target.value)}
                          className={`w-full text-xs p-2.5 rounded-lg border bg-transparent focus:outline-none ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/15 text-black bg-white'
                            }`}
                        >
                          {[
                            { value: 'Todos', label: 'Todos os Setores' },
                            { value: 'Call Center', label: 'Call Center' },
                            { value: 'Recepção', label: 'Recepção' },
                            { value: 'Financeiro', label: 'Financeiro' },
                            { value: 'Smartshape', label: 'Smartshape' },
                            { value: 'Biomedicina', label: 'Biomedicina' },
                            { value: 'Enfermagem', label: 'Enfermagem' },
                            { value: 'Farmácia', label: 'Farmácia' },
                            { value: 'Serviços Gerais', label: 'Serviços Gerais' },
                            { value: 'Nutrição', label: 'Nutrição' }
                          ].map((opt) => (
                            <option
                              key={opt.value}
                              value={opt.value}
                              className={theme === 'dark' ? 'bg-[#0D0D0C] text-white' : 'bg-white text-black'}
                            >
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Dropdown Status */}
                      {colabSubTab === 'quadro' && (
                        <div>
                          <label className="block text-[9px] font-bold uppercase opacity-60 mb-1 tracking-wider">Status</label>
                          <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className={`w-full text-xs p-2.5 rounded-lg border bg-transparent focus:outline-none ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/15 text-black bg-white'
                              }`}
                          >
                            {[
                              { value: 'Todos', label: 'Todos os Status' },
                              { value: 'Ativo', label: 'Ativo' },
                              { value: 'Em Férias', label: 'Em Férias' },
                              { value: 'Onboarding', label: 'Onboarding' }
                            ].map((opt) => (
                              <option
                                key={opt.value}
                                value={opt.value}
                                className={theme === 'dark' ? 'bg-[#0D0D0C] text-white' : 'bg-white text-black'}
                              >
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Sorting Tenure Toggle */}
                      <div>
                        <label className="block text-[9px] font-bold uppercase opacity-60 mb-1 tracking-wider">Tempo de Casa</label>
                        <button
                          onClick={() => setSortOrder(sortOrder === 'antigo' ? 'recente' : 'antigo')}
                          className={`w-full text-xs p-2.5 rounded-lg border bg-transparent font-semibold transition-all flex items-center justify-between ${theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/15 hover:bg-black/5'
                            }`}
                        >
                          <span>{sortOrder === 'antigo' ? 'Mais Antigos' : 'Mais Recentes'}</span>
                          <TrendingUp size={14} className={sortOrder === 'recente' ? 'transform rotate-180 transition-transform' : 'transition-transform'} />
                        </button>
                      </div>
                    </div>

                    {/* Table Board */}
                    <div className="overflow-x-auto border rounded-xl border-white/10 bg-black/5">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className={`border-b opacity-75 font-semibold ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-black/5 bg-black/5'
                            }`}>
                            <th className="p-3">Nome Completo</th>
                            <th className="p-3">CPF</th>
                            <th className="p-3">Cargo</th>
                            <th className="p-3">Salário Base</th>
                            <th className="p-3">Salário Líquido</th>
                            <th className="p-3">Setor</th>
                            <th className="p-3">Admissão</th>
                            <th className="p-3">Tempo Presente</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredAndSortedColaboradores.length > 0 ? (
                            filteredAndSortedColaboradores.map((c: any) => (
                              <tr
                                key={c.id}
                                onClick={() => setActiveColaboradorForDrawer(c)}
                                className={`cursor-pointer transition-colors ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'
                                  }`}
                              >
                                <td className="p-3 font-semibold">
                                  <div className="flex items-center gap-1.5">
                                    <span>{c.nome}</span>
                                    {(() => {
                                      const colabAdvs = warningsMap[c.id] || [];
                                      return colabAdvs.length > 0 && (
                                        <span
                                          title={`${colabAdvs.length} advertência(s) registrada(s)`}
                                          className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                        >
                                          ⚠️ {colabAdvs.length}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                </td>
                                <td className="p-3 font-mono opacity-85">{c.cpf}</td>
                                <td className="p-3 opacity-80">{c.cargo}</td>
                                <td className="p-3 font-mono opacity-80">{c.salario || '—'}</td>
                                <td className="p-3 font-mono font-bold text-emerald-500">{getSalarioLiquido(c).liquido}</td>
                                <td className="p-3 opacity-80">{c.setor}</td>
                                <td className="p-3 font-mono opacity-70">
                                  {(() => {
                                    const d = new Date(c.data_admissao);
                                    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
                                  })()}
                                </td>
                                <td className="p-3 font-medium text-emerald-500">
                                  {calculateTenure(c.data_admissao)}
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${c.status === 'ativo'
                                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                      : c.status === 'desligado'
                                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                                        : c.status === 'em_ferias'
                                          ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                                          : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                    }`}>
                                    {c.status === 'ativo' ? 'Ativo' : c.status === 'desligado' ? 'Desligado' : c.status === 'em_ferias' ? 'Em Férias' : 'Onboarding'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={9} className="text-center p-8 opacity-50 italic">
                                {loadingColabs ? (
                                  <div className="space-y-2 py-1">
                                    {[0, 1, 2, 3, 4].map(i => <div key={i} className="h-9 rounded-lg skeleton" />)}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-2 py-6 not-italic">
                                    <Users size={24} className="opacity-40" />
                                    <span className="opacity-60">Nenhum colaborador encontrado com os filtros selecionados.</span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sub-tab Cadastrar: Cadastro Direto de Colaborador */}
                {colabSubTab === 'cadastrar' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className={`p-6 rounded-xl border space-y-6 ${theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10'
                      }`}>
                      <div>
                        <h4 className="text-sm font-bold flex items-center gap-2">
                          <Users size={16} className="text-emerald-500" />
                          Cadastrar Novo Colaborador
                        </h4>
                        <p className="text-xs opacity-60 mt-1">Insira diretamente um funcionário no quadro ativo. O onboarding poderá ser completado posteriormente.</p>
                      </div>

                      <form onSubmit={handleCadastrarColaborador} className="space-y-5">
                        {/* Row 1: Nome + CPF */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold uppercase opacity-60 mb-1 tracking-wider">Nome Completo *</label>
                            <input
                              type="text"
                              value={cadastroNome}
                              onChange={(e) => setCadastroNome(e.target.value)}
                              placeholder="Ex: MARIA SILVA SANTOS"
                              required
                              className={`w-full text-xs p-2.5 rounded-lg border bg-transparent focus:outline-none focus:ring-1 ${theme === 'dark' ? 'border-white/15 focus:ring-white/40' : 'border-black/15 focus:ring-black/40'
                                }`}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase opacity-60 mb-1 tracking-wider">CPF *</label>
                            <input
                              type="text"
                              value={cadastroCpf}
                              onChange={(e) => setCadastroCpf(e.target.value)}
                              placeholder="000.000.000-00"
                              required
                              className={`w-full text-xs p-2.5 rounded-lg border bg-transparent focus:outline-none focus:ring-1 font-mono ${theme === 'dark' ? 'border-white/15 focus:ring-white/40' : 'border-black/15 focus:ring-black/40'
                                }`}
                            />
                          </div>
                        </div>

                        {/* Row 2: Cargo + Setor */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold uppercase opacity-60 mb-1 tracking-wider">Cargo *</label>
                            <input
                              type="text"
                              value={cadastroCargo}
                              onChange={(e) => setCadastroCargo(e.target.value)}
                              placeholder="Ex: Recepcionista"
                              required
                              className={`w-full text-xs p-2.5 rounded-lg border bg-transparent focus:outline-none focus:ring-1 ${theme === 'dark' ? 'border-white/15 focus:ring-white/40' : 'border-black/15 focus:ring-black/40'
                                }`}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase opacity-60 mb-1 tracking-wider">Setor *</label>
                            <select
                              value={cadastroSetor}
                              onChange={(e) => setCadastroSetor(e.target.value)}
                              className={`w-full text-xs p-2.5 rounded-lg border focus:outline-none focus:ring-1 ${theme === 'dark' ? 'border-white/15 focus:ring-white/40 bg-[#121211] text-[#E5DFD3]' : 'border-black/15 focus:ring-black/40 bg-white text-[#0A0A0A]'
                                }`}
                            >
                              <option value="Administrativo">Administrativo</option>
                              <option value="Biomedicina">Biomedicina</option>
                              <option value="Comercial">Comercial</option>
                              <option value="Enfermagem">Enfermagem</option>
                              <option value="Farmácia">Farmácia</option>
                              <option value="Financeiro">Financeiro</option>
                              <option value="Nutrição">Nutrição</option>
                              <option value="Recepção">Recepção</option>
                              <option value="RH">RH</option>
                              <option value="Serviços Gerais">Serviços Gerais</option>
                              <option value="Smartshape">Smartshape</option>
                              <option value="TI">TI</option>
                            </select>
                          </div>
                        </div>

                        {/* Row 3: Salário + Admissão */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold uppercase opacity-60 mb-1 tracking-wider">Salário</label>
                            <input
                              type="text"
                              value={cadastroSalario}
                              onChange={(e) => setCadastroSalario(e.target.value)}
                              placeholder="Ex: R$ 2.000,00"
                              className={`w-full text-xs p-2.5 rounded-lg border bg-transparent focus:outline-none focus:ring-1 ${theme === 'dark' ? 'border-white/15 focus:ring-white/40' : 'border-black/15 focus:ring-black/40'
                                }`}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase opacity-60 mb-1 tracking-wider">Data de Admissão *</label>
                            <input
                              type="date"
                              value={cadastroAdmissao}
                              onChange={(e) => setCadastroAdmissao(e.target.value)}
                              required
                              className={`w-full text-xs p-2.5 rounded-lg border bg-transparent focus:outline-none focus:ring-1 ${theme === 'dark' ? 'border-white/15 focus:ring-white/40' : 'border-black/15 focus:ring-black/40'
                                }`}
                            />
                          </div>
                        </div>

                        {/* Row 4: Aniversário (optional) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold uppercase opacity-60 mb-1 tracking-wider">Data de Aniversário <span className="opacity-50">(opcional)</span></label>
                            <input
                              type="text"
                              value={cadastroAniversario}
                              onChange={(e) => setCadastroAniversario(e.target.value)}
                              placeholder="Ex: 02-14 (MM-DD)"
                              className={`w-full text-xs p-2.5 rounded-lg border bg-transparent focus:outline-none focus:ring-1 ${theme === 'dark' ? 'border-white/15 focus:ring-white/40' : 'border-black/15 focus:ring-black/40'
                                }`}
                            />
                          </div>
                        </div>

                        {/* Info banner */}
                        <div className={`p-3 rounded-lg border text-xs ${theme === 'dark' ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' : 'bg-sky-500/10 border-sky-500/20 text-sky-700'
                          }`}>
                          <span className="font-bold">ℹ️ Onboarding:</span> O colaborador será cadastrado com status <span className="font-mono font-bold">ativo</span> e os itens de onboarding (benefícios, EPI, biometria) poderão ser marcados na aba de Onboarding logo após o cadastro.
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                          <button
                            type="submit"
                            disabled={isSavingCadastro}
                            className={`text-xs px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-colors ${theme === 'dark' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              } disabled:opacity-50`}
                          >
                            {isSavingCadastro ? 'Salvando...' : '✓ Cadastrar Colaborador'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setColabSubTab('quadro')}
                            className={`text-xs px-4 py-2.5 rounded-lg font-bold border transition-colors ${theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'
                              }`}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Sub-tab 2: Processo de Admissão (Side-by-Side & Link Generator) */}
                {colabSubTab === 'admissao' && (
                  <div className="space-y-8 animate-fadeIn">

                    {/* Link Generator Form */}
                    <div className={`p-5 rounded-xl border space-y-4 ${theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10'
                      }`}>
                      <h4 className="text-sm font-bold flex items-center gap-2">
                        <Zap size={16} className="text-amber-500" /> Geração de Link de Admissão Público
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase opacity-60 mb-1">Nome do Candidato</label>
                          <input
                            type="text"
                            value={newCandidateName}
                            onChange={(e) => setNewCandidateName(e.target.value)}
                            className={`w-full text-xs p-2 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 focus:ring-1 focus:ring-white' : 'border-black/15 focus:ring-1 focus:ring-black'
                              }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase opacity-60 mb-1">E-mail</label>
                          <input
                            type="email"
                            value={newCandidateEmail}
                            onChange={(e) => setNewCandidateEmail(e.target.value)}
                            className={`w-full text-xs p-2 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 focus:ring-1 focus:ring-white' : 'border-black/15 focus:ring-1 focus:ring-black'
                              }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase opacity-60 mb-1">Cargo</label>
                          <input
                            type="text"
                            value={newCandidateCargo}
                            onChange={(e) => setNewCandidateCargo(e.target.value)}
                            className={`w-full text-xs p-2 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 focus:ring-1 focus:ring-white' : 'border-black/15 focus:ring-1 focus:ring-black'
                              }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase opacity-60 mb-1">Setor</label>
                          <input
                            type="text"
                            value={newCandidateSetor}
                            onChange={(e) => setNewCandidateSetor(e.target.value)}
                            className={`w-full text-xs p-2 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 focus:ring-1 focus:ring-white' : 'border-black/15 focus:ring-1 focus:ring-black'
                              }`}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          onClick={handleGenerateLink}
                          className={`text-xs px-5 py-2.5 rounded-lg font-bold transition-colors ${theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]'
                            }`}
                        >
                          Gerar e Copiar Link (24h)
                        </button>
                        {generatedLink && (
                          <div className="flex-1 flex gap-2 items-center">
                            <input
                              type="text"
                              readOnly
                              value={isTokenRevoked ? 'LINK REVOGADO' : generatedLink}
                              className={`flex-1 text-xs font-mono p-2 rounded border bg-transparent ${isTokenRevoked ? 'text-rose-500 border-rose-500/20' : 'opacity-70 border-white/10'
                                }`}
                            />
                            <button
                              onClick={toggleTokenStatus}
                              className={`text-xs px-3 py-2 rounded font-bold transition-colors ${isTokenRevoked ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white hover:bg-rose-600'
                                }`}
                            >
                              {isTokenRevoked ? 'Reativar' : 'Revogar'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Side-by-Side Review Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold flex items-center gap-2">
                          <GitMerge size={16} /> Revisão Lado a Lado (Ficha Admissional)
                        </h4>

                        {tokensList.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs opacity-60">Revisar Submissão:</span>
                            <select
                              value={selectedTokenId}
                              onChange={(e) => handleTokenSelectChange(e.target.value)}
                              className={`text-xs p-1.5 rounded border focus:outline-none bg-transparent ${theme === 'dark' ? 'border-white/10 text-white' : 'border-black/10 text-black'
                                }`}
                            >
                              {tokensList.map(t => {
                                const statMap: Record<string, string> = {
                                  'pendente_preenchimento': 'Preenchendo Ficha',
                                  'aguardando_homologacao': 'Revisar Dados',
                                  'aguardando_assinatura': 'Aguardando Assinatura',
                                  'aguardando_assinatura_rh': 'Assinatura Pendente (RH)',
                                  'concluido': 'Finalizado'
                                };
                                const friendlyStatus = statMap[t.status] || 'Preenchendo Ficha';
                                return (
                                  <option key={t.id} value={t.id} className={theme === 'dark' ? 'bg-[#0D0D0C]' : 'bg-white'}>
                                    {t.candidato_nome} ({friendlyStatus})
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`p-4 rounded-xl border space-y-4 ${theme === 'dark' ? 'bg-[#161615] border-white/5' : 'bg-black/[0.02] border-black/5'
                          }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase opacity-65">Formulário Recebido (Candidato)</span>
                            {(() => {
                              const selectedTokenRow = tokensList.find(t => t.id === selectedTokenId);
                              const isCompleted = selectedTokenRow?.status === 'concluido';
                              const isAwaitingRH = selectedTokenRow?.status === 'aguardando_assinatura_rh';
                              const isAwaitingCandidate = selectedTokenRow?.status === 'aguardando_assinatura';
                              return (
                                <span className={`text-xs px-2 py-0.5 border rounded-full font-medium ${
                                  isCompleted
                                    ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/35'
                                    : isAwaitingRH
                                      ? 'bg-orange-500/20 text-orange-500 border-orange-500/35'
                                      : isAwaitingCandidate
                                        ? 'bg-amber-500/20 text-amber-500 border-amber-500/35'
                                        : 'bg-sky-500/20 text-sky-500 border-sky-500/35'
                                  }`}>
                                  {isCompleted
                                    ? 'Concluído'
                                    : isAwaitingRH
                                      ? 'Assinatura Pendente (RH)'
                                      : isAwaitingCandidate
                                        ? 'Aguardando Assinatura'
                                        : 'Pendente Revisão'}
                                </span>
                              );
                            })()}
                          </div>
                          <div className="space-y-3 text-sm">
                            {Object.entries(candidateData).map(([key, value]) => (
                              <div key={key} className="flex justify-between py-2 border-b border-white/5">
                                <span className="opacity-50 capitalize">{key}:</span>
                                <span className="font-semibold">{value as string}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className={`p-4 rounded-xl border space-y-4 ${theme === 'dark' ? 'bg-[#161615] border-white/5' : 'bg-black/[0.02] border-black/5'
                          }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase opacity-65">Banco de Dados Ativo (`public.colaboradores`)</span>
                            {isMerged ? (
                              <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-full font-medium flex items-center gap-1">
                                <CheckCircle size={10} /> Integrado
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-full font-medium">Vazio / Novo Registro</span>
                            )}
                          </div>
                          <div className="space-y-3 text-sm">
                            {Object.entries(existingData).map(([key, value]) => (
                              <div key={key} className="flex justify-between py-2 border-b border-white/5">
                                <span className="opacity-50 capitalize">{key}:</span>
                                <span className={`font-semibold ${isMerged ? 'text-emerald-500' : ''}`}>{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {(() => {
                        const selectedTokenRow = tokensList.find(t => t.id === selectedTokenId);
                        return (
                          <>
                            {selectedTokenRow?.status === 'aguardando_homologacao' && (
                              <div className={`p-4 rounded-xl border space-y-3 mt-4 ${theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10'
                                }`}>
                                <label className="block text-[10px] font-bold uppercase opacity-65 tracking-wider">
                                  Escolher Modelo de Contrato para Envio ao Candidato
                                </label>
                                <select
                                  value={approvalTemplateId}
                                  onChange={(e) => setApprovalTemplateId(e.target.value)}
                                  className={`w-full text-xs p-2.5 rounded border focus:outline-none bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                                    }`}
                                >
                                  <option value="default">Contrato de Admissão Padrão (Helvetica)</option>
                                  {modelos.map(m => (
                                    <option key={m.id} value={m.id}>
                                      {m.titulo}
                                    </option>
                                  ))}
                                  {uploadedPdfBase64 && (
                                    <option value="upload">
                                      📄 PDF Carregado: {uploadedPdfName}
                                    </option>
                                  )}
                                </select>
                              </div>
                            )}

                            {selectedTokenRow?.status === 'aguardando_assinatura_rh' && (
                              <div className={`p-5 rounded-xl border space-y-4 mt-4 animate-fadeIn ${theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10'
                                }`}>
                                <div className="space-y-1">
                                  <h5 className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                                    <Signature size={14} /> Assinatura do RH — <span className="opacity-70 font-semibold">opcional</span>
                                  </h5>
                                  <p className="text-[10px] opacity-60">
                                    O colaborador já assinou e o contrato está salvo. Você pode assinar digitalmente aqui,
                                    <strong> ou imprimir o contrato assinado e assinar no papel</strong> — nesse caso, use “Concluir no papel”.
                                  </p>
                                </div>

                                {/* Opção de assinatura física */}
                                <div className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center gap-2 ${theme === 'dark' ? 'border-white/10 bg-white/[0.03]' : 'border-black/10 bg-black/[0.02]'}`}>
                                  <div className="flex items-center gap-1.5 text-[10px] opacity-70 flex-1">
                                    <Printer size={13} /> Prefere assinar no papel? Imprima o contrato do colaborador e conclua.
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handlePrintCandidateSigned}
                                    className={`text-[10px] px-3 py-1.5 rounded border font-bold flex items-center gap-1.5 ${theme === 'dark' ? 'border-white/10 hover:bg-white/5 text-white' : 'border-black/10 hover:bg-black/5 text-black'}`}
                                  >
                                    <Printer size={12} /> Imprimir contrato assinado
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleConcludeWithoutDigitalRep}
                                    disabled={isFinishingAdmission}
                                    className="text-[10px] px-3 py-1.5 rounded border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-bold disabled:opacity-50 flex items-center gap-1.5"
                                  >
                                    <CheckCircle size={12} /> Concluir no papel
                                  </button>
                                </div>

                                <div className="text-[9px] uppercase tracking-wider opacity-40 pt-1">Ou assine digitalmente abaixo</div>

                                <div className={`relative border rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-[#121211] border-white/15' : 'bg-black/5 border-black/15'
                                  }`}>
                                  <canvas
                                    ref={repCanvasRef}
                                    onMouseDown={startRepDrawing}
                                    onMouseMove={drawRep}
                                    onMouseUp={stopRepDrawing}
                                    onMouseLeave={stopRepDrawing}
                                    onTouchStart={startRepDrawing}
                                    onTouchMove={drawRep}
                                    onTouchEnd={stopRepDrawing}
                                    className="w-full cursor-crosshair h-[140px] bg-transparent"
                                  />
                                </div>

                                <div className="flex gap-3">
                                  <button
                                    type="button"
                                    onClick={clearRepCanvas}
                                    className={`text-[10px] px-3 py-1.5 rounded border font-medium ${theme === 'dark' ? 'border-white/10 hover:bg-white/5 text-white' : 'border-black/10 hover:bg-black/5 text-black'
                                      }`}
                                  >
                                    Limpar Quadro
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleFinalizeRepresentativeSignature}
                                    disabled={repSigPointsCount < 5 || isFinishingAdmission}
                                    className={`text-[10px] px-4 py-1.5 rounded font-bold transition-colors ${theme === 'dark' ? 'bg-[#E5DFD3] text-black hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-white hover:bg-[#2A2A2A]'
                                      } disabled:opacity-50`}
                                  >
                                    {isFinishingAdmission ? 'Consolidando...' : 'Assinar e Concluir Admissão'}
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="flex gap-4 mt-6">
                              <button
                                onClick={mergeData}
                                disabled={isMerged || selectedTokenRow?.status !== 'aguardando_homologacao'}
                                className={`text-xs px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-colors ${theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]'
                                  } disabled:opacity-50`}
                              >
                                <CheckCircle size={14} />
                                {selectedTokenRow?.status === 'concluido'
                                  ? 'Admissão Concluída'
                                  : selectedTokenRow?.status === 'aguardando_assinatura_rh'
                                    ? 'Assinatura Pendente (RH)'
                                    : selectedTokenRow?.status === 'aguardando_assinatura'
                                      ? 'Aguardando Assinatura'
                                      : 'Homologar e Enviar para Assinatura'}
                              </button>
                              {isMerged && (
                                <button onClick={resetMerge} className="text-xs px-4 py-2.5 rounded-lg font-medium border border-white/10 hover:bg-white/5">
                                  Resetar Simulação
                                </button>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Módulo 3: Onboarding */}
            {activePath === '/app/onboarding' && hasFullAccess && (
              <div className="space-y-8 animate-fadeIn">
                <div className="pb-6 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#E5DFD3]/20">MÓDULO 3</span>
                    <h3 className="text-xl font-bold">Esteira de Onboarding por Setor</h3>
                  </div>
                  <p className="text-xs opacity-65 mt-1">Concessão de kits e EPIs cadastrados nos setores oficiais do Instituto.</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <label className="block text-xs font-semibold tracking-wider opacity-60 mb-2">Setores Oficiais do Instituto</label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
                      {[
                        'Call Center', 'Recepção', 'Financeiro',
                        'Smartshape', 'Biomedicina', 'Enfermagem',
                        'Farmácia', 'Serviços Gerais', 'Nutrição'
                      ].map((sector) => (
                        <button
                          key={sector}
                          onClick={() => setSelectedSector(sector)}
                          className={`text-[10px] md:text-xs py-2 rounded-lg border font-semibold transition-all ${selectedSector === sector
                              ? (theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]')
                              : (theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5')
                            }`}
                        >
                          {sector}
                        </button>
                      ))}
                    </div>
                  </div>

                  {colaboradoresList.length > 0 && (
                    <div className="min-w-[200px]">
                      <label className="block text-xs font-semibold tracking-wider opacity-60 mb-2">Selecionar Colaborador:</label>
                      <select
                        value={selectedColaboradorId}
                        onChange={(e) => handleColaboradorSelectChange(e.target.value)}
                        className={`w-full text-xs p-2 rounded border focus:outline-none bg-transparent ${theme === 'dark' ? 'border-white/10 text-white' : 'border-black/10 text-black'
                          }`}
                      >
                        {colaboradoresList.filter(c => c.status !== 'desligado').map(c => (
                          <option key={c.id} value={c.id} className={theme === 'dark' ? 'bg-[#0D0D0C]' : 'bg-white'}>
                            {c.nome} ({c.cargo})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold opacity-80 border-b border-white/10 pb-2">Benefícios e Kits</h4>
                    <div className="space-y-2 text-xs">
                      {Object.entries(benefits).map(([key, value]) => {
                        const activeCol = colaboradoresList.find(c => c.id === selectedColaboradorId);
                        const isRestricted = ['valeAlimentacao', 'planoSaude', 'kitOnboarding', 'uniformeSapato'].includes(key);
                        const isLocked = isRestricted && activeCol && isUnderExperience(activeCol.data_admissao);

                        return (
                          <label
                            key={key}
                            className={`flex items-center justify-between p-3 rounded-lg border ${isLocked ? 'opacity-40 cursor-not-allowed bg-black/10' : 'cursor-pointer'
                              } ${theme === 'dark' ? 'border-white/5 bg-[#121211] hover:bg-white/[0.02]' : 'border-black/5 bg-black/[0.02] hover:bg-black/[0.04]'
                              }`}
                          >
                            <div className="flex flex-col">
                              <span className="capitalize opacity-80">{key.replace(/([A-Z])/g, ' $1')}</span>
                              {isLocked && (
                                <span className="text-[9px] text-amber-500 font-semibold mt-0.5">Bloqueado (Experiência)</span>
                              )}
                            </div>
                            <input
                              type="checkbox"
                              checked={value}
                              disabled={!selectedColaboradorId || isLocked}
                              onChange={(e) => handleCheckboxChange('benefit', key, e.target.checked)}
                              className="accent-[#E5DFD3] cursor-pointer"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold opacity-80 border-b border-white/10 pb-2">EPIs & Treinamento</h4>
                    <div className="space-y-2 text-xs">
                      {Object.entries(tasks).map(([key, value]) => (
                        <label
                          key={key}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer ${theme === 'dark' ? 'border-white/5 bg-[#121211] hover:bg-white/[0.02]' : 'border-black/5 bg-black/[0.02] hover:bg-black/[0.04]'
                            }`}
                        >
                          <span className="capitalize opacity-80">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <input
                            type="checkbox"
                            checked={value}
                            disabled={!selectedColaboradorId}
                            onChange={(e) => handleCheckboxChange('task', key, e.target.checked)}
                            className="accent-[#E5DFD3] cursor-pointer"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6 flex flex-col justify-between">
                    <div className={`p-5 rounded-xl border space-y-4 text-center ${theme === 'dark' ? 'bg-[#181816] border-white/5' : 'bg-black/[0.03] border-black/5'
                      }`}>
                      <h4 className="text-xs font-bold tracking-widest uppercase opacity-65">Status de Onboarding</h4>
                      <div className="relative inline-flex items-center justify-center">
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle cx="48" cy="48" r="40" stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeWidth="8" fill="transparent" />
                          <circle cx="48" cy="48" r="40" stroke={theme === 'dark' ? '#E5DFD3' : '#0A0A0A'} strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * onboardingProgress) / 100} className="transition-all duration-500 ease-out" />
                        </svg>
                        <span className="absolute text-lg font-bold">{onboardingProgress}%</span>
                      </div>
                      <div className="text-xs opacity-75">
                        {onboardingProgress === 100 ? (
                          <span className="text-emerald-500 font-bold flex items-center justify-center gap-1">
                            <CheckCircle size={14} /> Integrado com Sucesso
                          </span>
                        ) : (
                          <span>Aguardando conclusão das tarefas</span>
                        )}
                      </div>
                    </div>

                    {onboardingSuccessMessage && (
                      <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 text-xs font-bold text-center space-y-2 animate-bounce">
                        <p>✨ AUTOMATIC TRIGGER DETECTED!</p>
                        <p className="font-normal opacity-90">Progresso 100%. O status do colaborador na tabela `colaboradores` foi promovido para "Ativo" de forma segura no Supabase!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Módulo 4: Analytics */}
            {activePath === '/app/analytics' && (
              <div className="space-y-8 animate-fadeIn">
                <div className="pb-6 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#E5DFD3]/20">MÓDULO 4</span>
                      <h3 className="text-xl font-bold">Analytics & Auditoria Global</h3>
                    </div>
                    <p className="text-xs opacity-65 mt-1">Logs de auditoria e métricas de desempenho em tempo real.</p>
                  </div>
                  {/* Tab controls */}
                  <div className="flex flex-wrap gap-1 border rounded-xl border-white/10 p-1 bg-black/10 self-start md:self-auto">
                    {[
                      { key: 'geral', label: 'Geral' },
                      { key: 'turnover', label: 'Movimentação (Turnover)' },
                      { key: 'saude', label: 'Saúde & Frequência' },
                      { key: 'compensacao', label: 'Compensação & Paridade' },
                      { key: 'juridico', label: 'Segurança Jurídica' }
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setAnalyticsSubTab(tab.key as any)}
                        className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-all ${analyticsSubTab === tab.key
                            ? (theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]')
                            : 'opacity-55 hover:opacity-100'
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {analyticsSubTab === 'geral' && (
                  <div className="space-y-8 animate-fadeIn">
                    <OverviewPanel
                      theme={theme}
                      colaboradoresList={colaboradoresList}
                      ocorrenciasList={ocorrenciasAnalytics}
                      indicadoresList={indicadoresTrabalhistas}
                      benefitsList={dbBenefits}
                      associationsList={dbColaboradorBeneficios}
                    />

                    <div className={`p-5 rounded-xl border space-y-4 ${theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10'
                      }`}>
                      <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <h4 className="text-xs font-bold tracking-widest uppercase opacity-65 flex items-center gap-2">
                          <History size={16} className="text-emerald-500" /> Logs de Auditoria (`logs_auditoria` - Supabase)
                        </h4>
                        <button
                          onClick={exportLogsToCsv}
                          className={`text-[10px] px-3 py-1.5 rounded font-bold uppercase transition-all flex items-center gap-1.5 ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-white' : 'bg-black/5 hover:bg-black/10 border border-black/10 text-black'
                            }`}
                        >
                          <Download size={12} /> Exportar Logs (CSV)
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px] text-left">
                          <thead>
                            <tr className="border-b border-white/10 opacity-60">
                              <th className="pb-2 font-semibold">Data/Hora</th>
                              <th className="pb-2 font-semibold">Usuário</th>
                              <th className="pb-2 font-semibold">Ação Executada</th>
                              <th className="pb-2 font-semibold">Metadados IP</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {logsAuditoria.map((l) => (
                              <tr key={l.id} className="opacity-90">
                                <td className="py-2.5 font-mono opacity-60">{new Date(l.criado_em).toLocaleTimeString()}</td>
                                <td className="py-2.5 font-semibold">{l.usuario_email || 'sistema'}</td>
                                <td className="py-2.5">
                                  <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded font-mono text-[10px] uppercase">
                                    {l.acao}
                                  </span>
                                </td>
                                <td className="py-2.5 font-mono opacity-60">{l.ip_address || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {analyticsSubTab === 'turnover' && (
                  <TurnoverPanel
                    theme={theme}
                    colaboradoresList={colaboradoresList}
                  />
                )}

                {analyticsSubTab === 'saude' && (
                  <HealthSafetyPanel
                    theme={theme}
                    colaboradoresList={colaboradoresList}
                    ocorrenciasList={ocorrenciasAnalytics}
                    indicadoresList={indicadoresTrabalhistas}
                  />
                )}

                {analyticsSubTab === 'compensacao' && (
                  <CompensationsPanel
                    theme={theme}
                    colaboradoresList={colaboradoresList}
                    indicadoresList={indicadoresTrabalhistas}
                    benefitsList={dbBenefits}
                    associationsList={dbColaboradorBeneficios}
                    pesquisasSatisfacao={pesquisasSatisfacao}
                    cargosReferencia={cargosAnalytics}
                  />
                )}

                {analyticsSubTab === 'juridico' && (
                  <LegalPanel
                    theme={theme}
                    indicadoresList={indicadoresTrabalhistas}
                  />
                )}
              </div>
            )}

            {/* Módulo 6: Benefícios */}
            {activePath === '/app/beneficios' && hasFullAccess && (
              <BenefitsManager theme={theme} />
            )}

            {/* Módulo 7: Férias & ASO */}
            {activePath === '/app/ferias-aso' && hasFullAccess && (
              <div className="space-y-6 animate-fadeIn">
                {(() => {
                  // Local Helper functions inside block
                  const getDaysRemaining = (dateStr: string) => {
                    if (!dateStr) return null;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const target = new Date(dateStr + 'T12:00:00');
                    target.setHours(0, 0, 0, 0);
                    const diffTime = target.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays;
                  };

                  const getAsoStatus = (colab: any) => {
                    if (!colab.data_aso_vencimento) return { label: 'Não Cadastrado', color: 'gray', days: null };
                    const days = getDaysRemaining(colab.data_aso_vencimento);
                    if (days === null) return { label: 'Não Cadastrado', color: 'gray', days: null };
                    if (days < 0) return { label: 'Vencido', color: 'red', days };
                    if (days <= 30) return { label: 'A Vencer', color: 'amber', days };
                    return { label: 'Em Dia', color: 'emerald', days };
                  };

                  const getFeriasStatus = (colab: any) => {
                    if (!colab.data_ferias_vencimento) return { label: 'Não Cadastrado', color: 'gray', days: null };
                    const days = getDaysRemaining(colab.data_ferias_vencimento);
                    if (days === null) return { label: 'Não Cadastrado', color: 'gray', days: null };
                    if (days < 0) return { label: 'Vencido', color: 'red', days };
                    if (days <= 30) return { label: 'A Vencer', color: 'amber', days };
                    return { label: 'Em Dia', color: 'emerald', days };
                  };

                  const activeColabs = colaboradoresList.filter(c => c.status === 'ativo' || c.status === 'em_ferias');

                  let asoVencido = 0;
                  let asoAVencer = 0;
                  let feriasAlert = 0;
                  let totalColabs = activeColabs.length;

                  activeColabs.forEach(c => {
                    const aso = getAsoStatus(c);
                    const fer = getFeriasStatus(c);
                    if (aso.label === 'Vencido') asoVencido++;
                    if (aso.label === 'A Vencer') asoAVencer++;
                    if (fer.label === 'Vencido' || fer.label === 'A Vencer') feriasAlert++;
                  });

                  const filtered = activeColabs.filter(c => {
                    // Search name
                    if (searchQueryFeriasAso && !c.nome.toLowerCase().includes(searchQueryFeriasAso.toLowerCase())) return false;

                    // Sector
                    if (filterSetorFeriasAso !== 'Todos' && c.setor !== filterSetorFeriasAso) return false;

                    // ASO Status
                    if (filterStatusAso !== 'Todos') {
                      const aso = getAsoStatus(c);
                      if (aso.label !== filterStatusAso) return false;
                    }

                    // Vacation Status
                    if (filterStatusFerias !== 'Todos') {
                      const fer = getFeriasStatus(c);
                      if (fer.label !== filterStatusFerias) return false;
                    }

                    return true;
                  });

                  return (
                    <>
                      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-white/10 gap-3">
                        <div>
                          <h2 className="text-xl font-bold tracking-tight">Férias & ASO</h2>
                          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-[#E5DFD3]/45' : 'text-black/45'}`}>
                            Controle ocupacional, exames médicos e vencimentos de períodos de férias.
                          </p>
                        </div>
                      </div>

                      {/* KPIs Row */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className={`p-4 rounded-xl border flex flex-col justify-between h-24 ${theme === 'dark' ? 'bg-[#111110] border-white/5' : 'bg-white border-black/5 shadow-sm'
                          }`}>
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45">ASO Vencido</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className={`text-3xl font-black font-mono ${asoVencido > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{asoVencido}</span>
                            <span className="text-xs">exames</span>
                          </div>
                        </div>
                        <div className={`p-4 rounded-xl border flex flex-col justify-between h-24 ${theme === 'dark' ? 'bg-[#111110] border-white/5' : 'bg-white border-black/5 shadow-sm'
                          }`}>
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45">ASO a Vencer (30d)</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className={`text-3xl font-black font-mono ${asoAVencer > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{asoAVencer}</span>
                            <span className="text-xs">exames</span>
                          </div>
                        </div>
                        <div className={`p-4 rounded-xl border flex flex-col justify-between h-24 ${theme === 'dark' ? 'bg-[#111110] border-white/5' : 'bg-white border-black/5 shadow-sm'
                          }`}>
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45">Férias Limite/Vencidas</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className={`text-3xl font-black font-mono ${feriasAlert > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{feriasAlert}</span>
                            <span className="text-xs">alertas</span>
                          </div>
                        </div>
                        <div className={`p-4 rounded-xl border flex flex-col justify-between h-24 ${theme === 'dark' ? 'bg-[#111110] border-white/5' : 'bg-white border-black/5 shadow-sm'
                          }`}>
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45">Total Colaboradores</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-3xl font-black font-mono">{totalColabs}</span>
                            <span className="text-xs">ativos</span>
                          </div>
                        </div>
                      </div>

                      {/* Filter Controls Row */}
                      <div className={`p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
                        }`}>
                        <div>
                          <label className="block text-[8px] font-bold uppercase opacity-50 mb-1">Buscar Colaborador</label>
                          <input
                            type="text"
                            placeholder="Nome do colaborador..."
                            value={searchQueryFeriasAso}
                            onChange={e => setSearchQueryFeriasAso(e.target.value)}
                            className={`w-full text-xs p-2 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                              }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold uppercase opacity-50 mb-1">Filtrar por Setor</label>
                          <select
                            value={filterSetorFeriasAso}
                            onChange={e => setFilterSetorFeriasAso(e.target.value)}
                            className={`w-full text-xs p-2 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                              }`}
                          >
                            <option value="Todos">Todos os Setores</option>
                            {Array.from(new Set(activeColabs.map(c => c.setor).filter(Boolean))).map(setor => (
                              <option key={setor} value={setor}>{setor}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold uppercase opacity-50 mb-1">Status ASO</label>
                          <select
                            value={filterStatusAso}
                            onChange={e => setFilterStatusAso(e.target.value)}
                            className={`w-full text-xs p-2 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                              }`}
                          >
                            <option value="Todos">Todos ASO</option>
                            <option value="Em Dia">Em Dia</option>
                            <option value="A Vencer">A Vencer (30d)</option>
                            <option value="Vencido">Vencido</option>
                            <option value="Não Cadastrado">Não Cadastrado</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold uppercase opacity-50 mb-1">Status Férias</label>
                          <select
                            value={filterStatusFerias}
                            onChange={e => setFilterStatusFerias(e.target.value)}
                            className={`w-full text-xs p-2 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                              }`}
                          >
                            <option value="Todos">Todas as Férias</option>
                            <option value="Em Dia">Em Dia</option>
                            <option value="A Vencer">A Vencer (30d)</option>
                            <option value="Vencido">Vencido</option>
                            <option value="Não Cadastrado">Não Cadastrado</option>
                          </select>
                        </div>
                      </div>

                      {/* Table View */}
                      <div className={`border rounded-xl overflow-hidden ${theme === 'dark' ? 'border-white/5 bg-[#121211]' : 'border-black/5 bg-white'
                        }`}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className={`border-b text-[10px] font-bold uppercase tracking-wider opacity-60 ${theme === 'dark' ? 'border-white/5 bg-white/2' : 'border-black/5 bg-black/2'
                                }`}>
                                <th className="p-4">Colaborador</th>
                                <th className="p-4">Admissão & Tempo</th>
                                <th className="p-4">Exame ASO (Vencimento)</th>
                                <th className="p-4">Limite de Férias</th>
                                <th className="p-4 text-center">Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filtered.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="p-8 text-center opacity-40 italic">
                                    {loadingColabs ? (
                                  <div className="space-y-2 py-1">
                                    {[0, 1, 2, 3, 4].map(i => <div key={i} className="h-9 rounded-lg skeleton" />)}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-2 py-6 not-italic">
                                    <Users size={24} className="opacity-40" />
                                    <span className="opacity-60">Nenhum colaborador encontrado com os filtros selecionados.</span>
                                  </div>
                                )}
                                  </td>
                                </tr>
                              ) : (
                                filtered.map(c => {
                                  const aso = getAsoStatus(c);
                                  const fer = getFeriasStatus(c);
                                  const initials = c.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

                                  return (
                                    <tr key={c.id} className={`border-b transition-colors ${theme === 'dark' ? 'border-white/5 hover:bg-white/[0.01]' : 'border-black/5 hover:bg-black/[0.01]'
                                      }`}>
                                      <td className="p-4">
                                        <div className="flex items-center gap-3">
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${theme === 'dark' ? 'bg-[#E5DFD3]/10 text-[#E5DFD3]' : 'bg-[#0A0A0A]/5 text-[#0A0A0A]'
                                            }`}>
                                            {initials}
                                          </div>
                                          <div className="truncate max-w-[180px]">
                                            <span className="font-semibold block truncate">{c.nome}</span>
                                            <span className="text-[10px] opacity-50 block truncate">{c.cargo} • {c.setor}</span>
                                            {c.status === 'em_ferias' && (
                                              <span className="inline-block mt-0.5 text-[8px] font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded-full">
                                                🏖 Em férias{c.ferias_inicio && c.ferias_dias ? ` · retorna ${new Date(addDaysISO(c.ferias_inicio, c.ferias_dias) + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="p-4 font-mono text-[11px]">
                                        <span>{new Date(c.data_admissao + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                        <span className="block text-[9px] font-sans opacity-55 mt-0.5">{calculateTenure(c.data_admissao)}</span>
                                      </td>
                                      <td className="p-4">
                                        {c.data_aso_vencimento ? (
                                          <div className="space-y-1">
                                            <span className="font-mono">{new Date(c.data_aso_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                            <span className={`block text-[9px] font-bold font-mono rounded-full px-2 py-0.5 w-fit ${aso.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                                                aso.color === 'amber' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10' :
                                                  'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                                              }`}>
                                              {aso.label} {aso.days !== null && (
                                                aso.days < 0 ? `(atrasado ${Math.abs(aso.days)}d)` : `(vence em ${aso.days}d)`
                                              )}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="opacity-30 italic text-[10px]">Não Cadastrado</span>
                                        )}
                                      </td>
                                      <td className="p-4">
                                        {c.data_ferias_vencimento ? (
                                          <div className="space-y-1">
                                            <span className="font-mono">{new Date(c.data_ferias_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                            <span className={`block text-[9px] font-bold font-mono rounded-full px-2 py-0.5 w-fit ${fer.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                                                fer.color === 'amber' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10' :
                                                  'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                                              }`}>
                                              {fer.label} {fer.days !== null && (
                                                fer.days < 0 ? `(vencido ${Math.abs(fer.days)}d)` : `(limite em ${fer.days}d)`
                                              )}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="opacity-30 italic text-[10px]">Não Cadastrado</span>
                                        )}
                                      </td>
                                      <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                          <button
                                            onClick={() => {
                                              setSelectedColabForQuickUpdate(c);
                                              setQuickAsoDate(c.data_aso_vencimento || '');
                                              setQuickFeriasDate(c.data_ferias_vencimento || '');
                                              setQuickFeriasInicio(c.ferias_inicio || '');
                                              setQuickFeriasDias(c.ferias_dias ? String(c.ferias_dias) : '');
                                            }}
                                            className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${theme === 'dark' ? 'border-white/10 hover:bg-white/5 text-[#E5DFD3]' : 'border-black/10 hover:bg-black/5 text-[#0A0A0A]'
                                              }`}
                                            title="Atualizar vencimentos diretamente"
                                          >
                                            ✏️ Datas
                                          </button>
                                          <button
                                            onClick={() => setActiveColaboradorForDrawer(c)}
                                            className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${theme === 'dark' ? 'border-[#E5DFD3]/30 bg-white/5 hover:bg-white/10 text-[#E5DFD3]' : 'border-[#0A0A0A]/30 bg-black/5 hover:bg-black/10 text-[#0A0A0A]'
                                              }`}
                                            title="Ver prontuário do colaborador"
                                          >
                                            📄 Dossiê
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Modal de vidro para Edição Rápida */}
                      {selectedColabForQuickUpdate && (
                        <>
                          <div
                            onClick={() => setSelectedColabForQuickUpdate(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
                          />
                          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm p-6 rounded-2xl border z-50 space-y-4 ${theme === 'dark'
                              ? 'bg-[#0D0D0C]/90 border-white/10 text-white glass-card-dark'
                              : 'bg-white/90 border-black/10 text-black glass-card-light shadow-xl'
                            }`}>
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider opacity-55">Edição de Prazos</span>
                              <h4 className="text-sm font-bold truncate mt-0.5">{selectedColabForQuickUpdate.nome}</h4>
                              <p className="text-[10px] opacity-45">{selectedColabForQuickUpdate.cargo}</p>
                            </div>

                            <div className="space-y-3.5 text-xs">
                              <div>
                                <label className="block text-[9px] font-bold uppercase opacity-65 mb-1">Vencimento do Exame ASO</label>
                                <input
                                  type="date"
                                  value={quickAsoDate}
                                  onChange={e => setQuickAsoDate(e.target.value)}
                                  className={`w-full p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                                    }`}
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold uppercase opacity-65 mb-1">Data Limite de Férias</label>
                                <input
                                  type="date"
                                  value={quickFeriasDate}
                                  onChange={e => setQuickFeriasDate(e.target.value)}
                                  className={`w-full p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                                    }`}
                                />
                              </div>

                              {/* Férias */}
                              <div className="pt-3 border-t border-white/10">
                                {selectedColabForQuickUpdate.status === 'em_ferias' ? (
                                  <div className="space-y-2">
                                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">🏖 Em Férias</span>
                                    <p className="text-[10px] opacity-70 leading-relaxed">
                                      {selectedColabForQuickUpdate.ferias_inicio ? `Desde ${new Date(selectedColabForQuickUpdate.ferias_inicio + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}
                                      {selectedColabForQuickUpdate.ferias_dias ? ` · ${selectedColabForQuickUpdate.ferias_dias} dias` : ''}
                                      {selectedColabForQuickUpdate.ferias_inicio && selectedColabForQuickUpdate.ferias_dias
                                        ? ` · retorno previsto ${new Date(addDaysISO(selectedColabForQuickUpdate.ferias_inicio, selectedColabForQuickUpdate.ferias_dias) + 'T12:00:00').toLocaleDateString('pt-BR')}`
                                        : ''}
                                    </p>
                                    <button
                                      onClick={handleRetornarFerias}
                                      disabled={isSavingQuickDates}
                                      className="w-full py-2 rounded font-bold text-xs border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
                                    >
                                      ↩ Retornar de férias (voltar a Ativo)
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <label className="block text-[9px] font-bold uppercase opacity-65">Colocar em férias</label>
                                    <div className="grid grid-cols-2 gap-2">
                                      <input
                                        type="date"
                                        value={quickFeriasInicio}
                                        onChange={e => setQuickFeriasInicio(e.target.value)}
                                        title="Início das férias"
                                        className={`w-full p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'}`}
                                      />
                                      <input
                                        type="number"
                                        min="1"
                                        placeholder="Dias"
                                        value={quickFeriasDias}
                                        onChange={e => setQuickFeriasDias(e.target.value)}
                                        title="Dias de férias"
                                        className={`w-full p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'}`}
                                      />
                                    </div>
                                    <p className="text-[9px] opacity-50">O vencimento das férias será atualizado para o início + 12 meses.</p>
                                    <button
                                      onClick={handleColocarEmFerias}
                                      disabled={isSavingQuickDates}
                                      className="w-full py-2 rounded font-bold text-xs bg-sky-500/15 text-sky-400 border border-sky-500/25 hover:bg-sky-500/25 disabled:opacity-50"
                                    >
                                      🏖 Colocar em férias
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2 pt-2">
                                <button
                                  onClick={handleSaveQuickDates}
                                  disabled={isSavingQuickDates}
                                  className={`flex-1 py-2 rounded font-bold text-xs transition-colors ${theme === 'dark' ? 'bg-[#E5DFD3] text-[#0d0d0c] hover:bg-[#c4beb1]' : 'bg-[#0A0A0A] text-white hover:bg-black/90'
                                    } disabled:opacity-50`}
                                >
                                  {isSavingQuickDates ? 'Salvando...' : '✓ Salvar Alterações'}
                                </button>
                                <button
                                  onClick={() => setSelectedColabForQuickUpdate(null)}
                                  className={`px-3 py-2 rounded border text-xs font-semibold transition-colors ${theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'
                                    }`}
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Módulo 8: Avaliações de Desempenho */}
            {activePath === '/app/avaliacoes' && hasFullAccess && (
              <div className="space-y-6 animate-fadeIn">
                {(() => {
                  const getMonthsElapsed = (dateStr: string) => {
                    if (!dateStr) return 0;
                    const start = new Date(dateStr + 'T12:00:00');
                    const end = new Date();
                    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
                  };

                  // Exclude coordinators as per instructions
                  const activeColabs = colaboradoresList.filter(c =>
                    (c.status === 'ativo' || c.status === 'em_ferias') &&
                    !(c.cargo?.toLowerCase().includes('coordenador') || c.cargo?.toLowerCase().includes('coordenadora'))
                  );

                  const totalRatings = dbAvaliacoesDesempenho.length;
                  const notasValidas = dbAvaliacoesDesempenho.map(a => Number(a.nota)).filter(n => !isNaN(n));
                  const mediaGeral = notasValidas.length > 0 ? (notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length).toFixed(1) : '0.0';

                  let countAptos = 0;
                  let countPendentes = 0;
                  const date180Ago = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
                  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

                  // Precompute career statuses for activeColabs
                  const colabsCalculados = activeColabs.map(colab => {
                    const plano = dbPlanosCarreira.find(p => p.cargo_atual === colab.cargo);
                    const monthsElapsed = getMonthsElapsed(colab.data_admissao);
                    const requiredMonths = plano?.requisito_tempo_meses ?? 12;
                    const isTempoOk = monthsElapsed >= requiredMonths;

                    const colabOcorrencias = ocorrenciasAnalytics.filter(o => o.colaborador_id === colab.id);
                    const recentOcorrencias = colabOcorrencias.filter(o => {
                      if (!o.data_ocorrencia) return false;
                      return new Date(o.data_ocorrencia + 'T12:00:00') >= date180Ago;
                    });
                    const isOcorrenciasOk = recentOcorrencias.length === 0;

                    const colabAvals = dbAvaliacoesDesempenho.filter(a => a.colaborador_id === colab.id);
                    const latestAval = colabAvals[0]; // ordered desc, so first is latest
                    const requiredNota = plano?.requisito_nota_avaliacao ?? 4.0;
                    const isNotaOk = latestAval ? Number(latestAval.nota) >= requiredNota : false;

                    const isApto = !!plano && isTempoOk && isOcorrenciasOk && isNotaOk;
                    if (isApto) countAptos++;

                    const isPendente = !latestAval || new Date(latestAval.data_avaliacao + 'T12:00:00') < oneYearAgo;
                    if (isPendente) countPendentes++;

                    return {
                      ...colab,
                      plano,
                      latestAval,
                      monthsElapsed,
                      requiredMonths,
                      isTempoOk,
                      isOcorrenciasOk,
                      recentOcorrenciasCount: recentOcorrencias.length,
                      isNotaOk,
                      isApto
                    };
                  });

                  // Filter the list
                  const filteredColabs = colabsCalculados.filter(item => {
                    if (searchQueryAvaliacoes && !item.nome.toLowerCase().includes(searchQueryAvaliacoes.toLowerCase())) return false;
                    if (filterSetorAvaliacoes !== 'Todos' && item.setor !== filterSetorAvaliacoes) return false;
                    if (filterStatusPromo !== 'Todos') {
                      if (filterStatusPromo === 'Apto' && !item.isApto) return false;
                      if (filterStatusPromo === 'Em Desenvolvimento' && item.isApto) return false;
                    }
                    return true;
                  });

                  const getNotaColor = (nota: number) => {
                    if (nota >= 4.0) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                    if (nota >= 3.0) return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
                    return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
                  };

                  return (
                    <>
                      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-white/10 gap-3">
                        <div>
                          <h2 className="text-xl font-bold tracking-tight">Avaliações de Desempenho & Carreira</h2>
                          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-[#E5DFD3]/45' : 'text-black/45'}`}>
                            Acompanhamento de planos de carreira, trilhas de progressão e avaliações dos colaboradores.
                          </p>
                        </div>
                      </div>

                      {/* KPIs Row */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className={`p-4 rounded-xl border flex flex-col justify-between h-24 ${theme === 'dark' ? 'bg-[#111110] border-white/5' : 'bg-white border-black/5 shadow-sm'
                          }`}>
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45">Média Geral de Notas</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-3xl font-black font-mono text-sky-400">{mediaGeral}</span>
                            <span className="text-xs opacity-50">/ 5.0</span>
                          </div>
                        </div>

                        <div className={`p-4 rounded-xl border flex flex-col justify-between h-24 ${theme === 'dark' ? 'bg-[#111110] border-white/5' : 'bg-white border-black/5 shadow-sm'
                          }`}>
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45">Avaliações Lançadas</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-3xl font-black font-mono text-emerald-400">{totalRatings}</span>
                            <span className="text-xs opacity-50">total</span>
                          </div>
                        </div>

                        <div className={`p-4 rounded-xl border flex flex-col justify-between h-24 ${theme === 'dark' ? 'bg-[#111110] border-white/5' : 'bg-white border-black/5 shadow-sm'
                          }`}>
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45">Aptos para Promoção</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className={`text-3xl font-black font-mono ${countAptos > 0 ? 'text-emerald-400' : 'opacity-40'}`}>{countAptos}</span>
                            <span className="text-xs opacity-50">elegíveis</span>
                          </div>
                        </div>

                        <div className={`p-4 rounded-xl border flex flex-col justify-between h-24 ${theme === 'dark' ? 'bg-[#111110] border-white/5' : 'bg-white border-black/5 shadow-sm'
                          }`}>
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45">Avaliações Pendentes</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className={`text-3xl font-black font-mono ${countPendentes > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{countPendentes}</span>
                            <span className="text-xs opacity-50">sem aval.</span>
                          </div>
                        </div>
                      </div>

                      {/* Filters and Search */}
                      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#111110] border-white/5' : 'bg-white border-black/5 shadow-sm'
                        }`}>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {/* Search */}
                          <div className="md:col-span-2">
                            <label className="block text-[9px] font-bold uppercase tracking-wider opacity-50 mb-1.5">Pesquisar Colaborador</label>
                            <input
                              type="text"
                              placeholder="Nome do colaborador..."
                              value={searchQueryAvaliacoes}
                              onChange={(e) => setSearchQueryAvaliacoes(e.target.value)}
                              className={`w-full text-xs p-2.5 rounded border bg-transparent focus:outline-none transition-colors ${theme === 'dark' ? 'border-white/10 text-white focus:border-white/30' : 'border-black/10 text-black focus:border-black/30'
                                }`}
                            />
                          </div>

                          {/* Sector */}
                          <div>
                            <label className="block text-[9px] font-bold uppercase tracking-wider opacity-50 mb-1.5">Filtrar por Setor</label>
                            <select
                              value={filterSetorAvaliacoes}
                              onChange={(e) => setFilterSetorAvaliacoes(e.target.value)}
                              className={`w-full text-xs p-2.5 rounded border focus:outline-none bg-transparent transition-colors ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                                }`}
                            >
                              <option value="Todos">Todos os Setores</option>
                              <option value="Biomedicina">Biomedicina</option>
                              <option value="Recepção">Recepção</option>
                              <option value="Financeiro">Financeiro</option>
                              <option value="Call Center">Call Center</option>
                              <option value="Smartshape">Smartshape</option>
                              <option value="Enfermagem">Enfermagem</option>
                              <option value="Farmácia">Farmácia</option>
                              <option value="Serviços Gerais">Serviços Gerais</option>
                              <option value="Nutrição">Nutrição</option>
                              <option value="Administrativo">Administrativo</option>
                            </select>
                          </div>

                          {/* Promotion Status */}
                          <div>
                            <label className="block text-[9px] font-bold uppercase tracking-wider opacity-50 mb-1.5">Status Elegibilidade</label>
                            <select
                              value={filterStatusPromo}
                              onChange={(e) => setFilterStatusPromo(e.target.value)}
                              className={`w-full text-xs p-2.5 rounded border focus:outline-none bg-transparent transition-colors ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                                }`}
                            >
                              <option value="Todos">Todos</option>
                              <option value="Apto">🛡️ Apto para Promoção</option>
                              <option value="Em Desenvolvimento">⚙️ Em Desenvolvimento</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Main Table */}
                      <div className={`border rounded-xl overflow-hidden ${theme === 'dark' ? 'border-white/5 bg-[#0D0D0C]' : 'border-black/5 bg-white shadow-sm'
                        }`}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className={`border-b text-[9px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'border-white/5 bg-white/2 text-[#E5DFD3]/60' : 'border-black/5 bg-black/[0.01] text-black/50'
                                }`}>
                                <th className="p-4">Colaborador</th>
                                <th className="p-4">Setor</th>
                                <th className="p-4">Tempo de Casa</th>
                                <th className="p-4">Última Avaliação</th>
                                <th className="p-4">Ocorrências (6m)</th>
                                <th className="p-4">Status Carreira</th>
                                <th className="p-4 text-center">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {filteredColabs.length > 0 ? (
                                filteredColabs.map((item) => {
                                  const nota = item.latestAval ? Number(item.latestAval.nota) : null;

                                  return (
                                    <tr
                                      key={item.id}
                                      className={`text-xs transition-colors ${theme === 'dark' ? 'hover:bg-white/[0.02]' : 'hover:bg-black/[0.01]'
                                        }`}
                                    >
                                      {/* Colaborador */}
                                      <td className="p-4">
                                        <div className="font-bold">{item.nome}</div>
                                        <div className="text-[10px] opacity-50 mt-0.5">{item.cargo}</div>
                                      </td>

                                      {/* Setor */}
                                      <td className="p-4 opacity-75">{item.setor}</td>

                                      {/* Tempo de Casa */}
                                      <td className="p-4">
                                        <div className="font-semibold">{item.monthsElapsed} meses</div>
                                        <div className="text-[9px] opacity-45">Req: {item.requiredMonths} meses</div>
                                      </td>

                                      {/* Última Avaliação */}
                                      <td className="p-4">
                                        {nota ? (
                                          <div className="flex flex-col gap-1">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-fit ${getNotaColor(nota)}`}>
                                              Nota {nota.toFixed(1)}
                                            </span>
                                            <span className="text-[9px] opacity-40 font-mono">
                                              {new Date(item.latestAval.data_avaliacao + 'T12:00:00').toLocaleDateString('pt-BR')}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="opacity-40 italic text-[11px]">Não avaliado</span>
                                        )}
                                      </td>

                                      {/* Ocorrências */}
                                      <td className="p-4">
                                        <span className={`font-semibold ${item.recentOcorrenciasCount > 0 ? 'text-rose-400 font-bold' : 'opacity-70'}`}>
                                          {item.recentOcorrenciasCount} ocor.
                                        </span>
                                      </td>

                                      {/* Status Carreira */}
                                      <td className="p-4">
                                        {item.isApto ? (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            🛡️ Apto
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-white/50 border border-white/5">
                                            ⚙️ Em Desenv.
                                          </span>
                                        )}
                                      </td>

                                      {/* Ações */}
                                      <td className="p-4 text-center">
                                        <button
                                          onClick={() => {
                                            setActiveColaboradorForDrawer(item);
                                            setDrawerTab('carreira');
                                          }}
                                          className={`px-3 py-1.5 rounded font-bold text-[10px] uppercase transition-colors ${theme === 'dark'
                                              ? 'bg-white/5 hover:bg-white/10 text-white'
                                              : 'bg-black/5 hover:bg-black/10 text-black'
                                            }`}
                                        >
                                          ✏️ Avaliar / Trilha
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={7} className="p-8 text-center opacity-50 italic">
                                    {loadingColabs ? (
                                  <div className="space-y-2 py-1">
                                    {[0, 1, 2, 3, 4].map(i => <div key={i} className="h-9 rounded-lg skeleton" />)}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-2 py-6 not-italic">
                                    <Users size={24} className="opacity-40" />
                                    <span className="opacity-60">Nenhum colaborador encontrado com os filtros selecionados.</span>
                                  </div>
                                )}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {activePath === '/app/cargos' && hasFullAccess && (
              <CargosManager theme={theme} userEmail={user?.email || ''} />
            )}

            {activePath === '/app/feedback' && hasFullAccess && (
              <FeedbackManager theme={theme} />
            )}

            {activePath === '/app/ponto' && hasFullAccess && (
              <PontoManager theme={theme} />
            )}

            {activePath === '/app/riscos' && hasFullAccess && (
              <RiscoManager theme={theme} />
            )}

            {activePath === '/app/folha' && hasFullAccess && (
              <FolhaManager theme={theme} userEmail={user?.email || ''} />
            )}

            {activePath === '/app/agenda' && hasFullAccess && (
              <div className="space-y-6 animate-fadeIn">
                {/* Header */}
                <div className="pb-6 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#E5DFD3]/20">MÓDULO 8</span>
                      <h3 className="text-xl font-bold">Agenda & Calendário do RH</h3>
                    </div>
                    <p className="text-xs opacity-65 mt-1">Acompanhe vencimentos de ASO, Férias, Experiências e Ocorrências do time em tempo real.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Calendar Grid Container */}
                  <div className={`lg:col-span-8 p-6 rounded-2xl border ${
                    theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-white border-black/10 shadow-sm'
                  }`}>
                    {/* Controls */}
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-sm font-bold tracking-wider uppercase opacity-75">
                        {[
                          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                        ][currentMonth]} de {currentYear}
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (currentMonth === 0) {
                              setCurrentMonth(11);
                              setCurrentYear(prev => prev - 1);
                            } else {
                              setCurrentMonth(prev => prev - 1);
                            }
                            setSelectedCalendarDay(1);
                          }}
                          className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                            theme === 'dark' ? 'border-white/10 hover:bg-white/5 bg-[#0D0D0C]' : 'border-black/10 hover:bg-black/5 bg-white'
                          }`}
                        >
                          ◀ Mês Ant.
                        </button>
                        <button
                          onClick={() => {
                            if (currentMonth === 11) {
                              setCurrentMonth(0);
                              setCurrentYear(prev => prev + 1);
                            } else {
                              setCurrentMonth(prev => prev + 1);
                            }
                            setSelectedCalendarDay(1);
                          }}
                          className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                            theme === 'dark' ? 'border-white/10 hover:bg-white/5 bg-[#0D0D0C]' : 'border-black/10 hover:bg-black/5 bg-white'
                          }`}
                        >
                          Próx. Mês ▶
                        </button>
                      </div>
                    </div>

                    {/* Weekdays Header */}
                    <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold uppercase tracking-wider opacity-60 mb-2">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                        <div key={day} className="py-2">{day}</div>
                      ))}
                    </div>

                    {/* Monthly grid */}
                    <div className="grid grid-cols-7 gap-2">
                      {(() => {
                        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                        const startDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

                        const arr = [];
                        for (let i = 0; i < startDayOfWeek; i++) {
                          arr.push(null);
                        }
                        for (let d = 1; d <= daysInMonth; d++) {
                          arr.push(d);
                        }

                        return arr.map((day, idx) => {
                          if (day === null) {
                            return <div key={`empty-${idx}`} className="aspect-square opacity-0 pointer-events-none" />;
                          }

                          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const dayEvents = calendarEvents.filter((ev: any) => ev.date === dateStr);

                          const isSelected = selectedCalendarDay === day;
                          const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth && new Date().getFullYear() === currentYear;

                          return (
                            <button
                              key={`day-${day}`}
                              onClick={() => setSelectedCalendarDay(day)}
                              className={`aspect-square rounded-xl border flex flex-col items-center justify-between p-2 transition-all relative ${
                                isSelected
                                  ? (theme === 'dark' ? 'bg-[#E5DFD3] border-transparent text-[#0C0C0C]' : 'bg-[#0A0A0A] border-transparent text-[#FBFBFA]')
                                  : isToday
                                    ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-500 font-black'
                                    : (theme === 'dark' ? 'border-white/5 bg-white/[0.02] hover:bg-white/5 text-white/90' : 'border-black/5 bg-black/[0.01] hover:bg-black/[0.03] text-black/90')
                              }`}
                            >
                              <span className="text-xs font-bold font-mono">{day}</span>

                              {/* Dots indicators container */}
                              {dayEvents.length > 0 && (
                                <div className="flex gap-1 flex-wrap justify-center max-w-full">
                                  {dayEvents.slice(0, 3).map((ev: any, eidx: number) => {
                                    let dotColor = 'bg-sky-500';
                                    if (ev.type === 'aso') dotColor = 'bg-emerald-500';
                                    else if (ev.type === 'experiencia') dotColor = 'bg-amber-500';
                                    else if (ev.type === 'advertencia') dotColor = 'bg-rose-500 animate-pulse';
                                    else if (ev.type === 'admissao') dotColor = 'bg-violet-500';

                                    return (
                                      <span
                                        key={`${ev.id}-${eidx}`}
                                        className={`w-1.5 h-1.5 rounded-full ${dotColor}`}
                                        title={ev.label}
                                      />
                                    );
                                  })}
                                  {dayEvents.length > 3 && (
                                    <span className="text-[7px] font-bold leading-none opacity-60">+</span>
                                  )}
                                </div>
                              )}
                            </button>
                          );
                        });
                      })()}
                    </div>

                    {/* Colors legend */}
                    <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-white/5 text-[9px] uppercase font-bold tracking-wider opacity-60 justify-center">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                        <span>Férias</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>ASO</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span>Experiência</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                        <span>Admissão</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span>Advertência</span>
                      </div>
                    </div>

                  </div>

                  {/* Day Details Panel */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className={`p-5 rounded-2xl border ${
                      theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-white border-black/10 shadow-sm'
                    }`}>
                      <h4 className="text-xs font-bold uppercase tracking-wider opacity-60 mb-4">
                        Eventos do Dia {selectedCalendarDay ? `${selectedCalendarDay}/${currentMonth + 1}/${currentYear}` : '—'}
                      </h4>

                      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
                        {(() => {
                          if (!selectedCalendarDay) return null;
                          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedCalendarDay).padStart(2, '0')}`;
                          const selectedDateEvents = calendarEvents.filter((ev: any) => ev.date === dateStr);

                          return selectedDateEvents.length > 0 ? (
                            selectedDateEvents.map((ev: any) => {
                              let cardColor = 'border-sky-500/20 bg-sky-500/5';
                              let badgeColor = 'bg-sky-500/10 text-sky-400 border-sky-500/20';
                              let labelType = 'FÉRIAS';

                              if (ev.type === 'aso') {
                                cardColor = 'border-emerald-500/20 bg-emerald-500/5';
                                badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                                labelType = 'ASO';
                              } else if (ev.type === 'experiencia') {
                                cardColor = 'border-amber-500/20 bg-amber-500/5';
                                badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                                labelType = 'EXPERIÊNCIA';
                              } else if (ev.type === 'advertencia') {
                                cardColor = 'border-rose-500/20 bg-rose-500/5';
                                badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                                labelType = 'ADVERTÊNCIA';
                              } else if (ev.type === 'admissao') {
                                cardColor = 'border-violet-500/20 bg-violet-500/5';
                                badgeColor = 'bg-violet-500/10 text-violet-400 border-violet-500/20';
                                labelType = 'ADMISSÃO';
                              }

                              return (
                                <div
                                  key={ev.id}
                                  className={`p-4 rounded-xl border flex flex-col gap-3 transition-transform hover:scale-[1.01] ${cardColor}`}
                                >
                                  <div className="flex justify-between items-start">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold tracking-wider border ${badgeColor}`}>
                                      {labelType}
                                    </span>
                                  </div>

                                  <div className="space-y-1">
                                    <h5 className="text-xs font-bold">{ev.label}</h5>
                                    <p className="text-[11px] opacity-70 leading-relaxed">{ev.desc}</p>
                                  </div>

                                  {ev.colaborador && (
                                    <button
                                      onClick={() => setActiveColaboradorForDrawer(ev.colaborador)}
                                      className={`w-full py-1.5 rounded text-[9px] font-bold tracking-widest uppercase border transition-colors ${
                                        theme === 'dark'
                                          ? 'border-white/10 hover:bg-white/5 text-white'
                                          : 'border-black/10 hover:bg-black/5 text-black'
                                      }`}
                                    >
                                      🔍 Abrir Prontuário
                                    </button>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="py-8 text-center opacity-50 italic text-xs">
                              Nenhum evento agendado para esta data.
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

          </div>
         </Suspense>
        </main>

        {/* Footer */}
        <footer className={`py-6 border-t text-center text-xs opacity-50 transition-colors ${theme === 'dark' ? 'border-white/5 bg-[#0D0D0C]' : 'border-black/5 bg-[#FBFBFA]'
          }`}>
          <p>© 2026 Instituto Thiago Omena. Sistema OMNI ITO - Uso Exclusivo e Proprietário.</p>
          <p className="mt-0.5 font-mono text-[9px]">Autenticado e Monitorado via Row Level Security (RLS)</p>
        </footer>

      </div>

      {/* Copiloto de RH — flutuante, disponível em todos os módulos (só RH) */}
      {hasFullAccess && <CopilotWidget theme={theme} />}

      {/* Toast global (substitui os alert() nativos) */}
      {toast && (
        <div
          onClick={() => setToast(null)}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] max-w-[90vw] px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xl border cursor-pointer toast-in flex items-center gap-2 ${
            toast.type === 'error'
              ? 'bg-rose-500 text-white border-rose-600'
              : 'bg-emerald-500 text-white border-emerald-600'
          }`}
          role="status"
        >
          {toast.type === 'error' ? <AlertTriangle size={14} className="shrink-0" /> : <CheckCircle size={14} className="shrink-0" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* 5. Side Drawer Onyx for Dossier/Prontuário */}
      {activeColaboradorForDrawer && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setActiveColaboradorForDrawer(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          />
          {/* Drawer Panel */}
          <div className={`fixed top-0 right-0 h-full w-full max-w-md p-6 z-50 transform transition-transform duration-300 ease-in-out border-l flex flex-col justify-between ${theme === 'dark'
              ? 'bg-[#0D0D0C]/95 border-white/10 text-[#E5DFD3] glass-card-dark'
              : 'bg-[#FBFBFA]/95 border-black/10 text-[#0A0A0A] glass-card-light'
            }`}>
            <div className="space-y-6 overflow-y-auto pr-2">

              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <span className="text-[9px] font-bold tracking-widest uppercase opacity-60">Prontuário do Colaborador</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <h3 className="text-base font-bold truncate max-w-[200px]">{activeColaboradorForDrawer.nome}</h3>
                    {(() => {
                      const colabAdvs = warningsMap[activeColaboradorForDrawer.id] || [];
                      return colabAdvs.length > 0 && (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[8px] font-extrabold uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20 px-1.5 py-0.5 rounded">
                          ⚠️ {colabAdvs.length}
                        </span>
                      );
                    })()}
                  </div>
                  <span className="text-xs opacity-50 block mt-0.5">{activeColaboradorForDrawer.cargo}</span>
                </div>
                <button
                  onClick={() => setActiveColaboradorForDrawer(null)}
                  className={`p-1.5 rounded-lg border hover:bg-white/5 transition-colors ${theme === 'dark' ? 'border-white/10' : 'border-black/10'
                    }`}
                >
                  <X size={16} />
                </button>
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
                          ? (theme === 'dark' ? 'border-[#E5DFD3] text-[#E5DFD3]' : 'border-[#0A0A0A] text-[#0A0A0A]')
                          : 'border-transparent opacity-45 hover:opacity-80'
                        }`}
                    >
                      {labels[tab]}
                    </button>
                  );
                })}
              </div>

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
                    <h4 className="text-xs font-bold uppercase tracking-wider opacity-60">Dados Pessoais & Endereço</h4>
                    <button onClick={() => { setIsEditingDrawer(!isEditingDrawer); setDrawerEditData({}); }} className={`text-[9px] px-2.5 py-1 rounded font-bold border transition-colors ${isEditingDrawer ? 'border-rose-500/30 text-rose-400 bg-rose-500/10' : (theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5')
                      }`}>{isEditingDrawer ? 'Cancelar' : '✏️ Editar'}</button>
                  </div>

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
                              className={`w-full text-xs p-1.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 bg-[#121211]' : 'border-black/10 bg-white'}`}>
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

                  {isEditingDrawer && (
                    <button onClick={handleSaveDrawerEdit} disabled={isSavingDrawer}
                      className={`w-full py-2 rounded font-bold text-xs transition-colors ${theme === 'dark' ? 'bg-[#E5DFD3] text-black' : 'bg-[#0A0A0A] text-white'} disabled:opacity-50`}>
                      {isSavingDrawer ? 'Salvando...' : '✓ Salvar Alterações'}
                    </button>
                  )}
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
                                className={`p-1 rounded hover:bg-white/10 ${theme === 'dark' ? 'text-[#E5DFD3]' : 'text-[#0A0A0A]'}`}>
                                <Printer size={13} />
                              </button>
                              <button onClick={() => handleViewDocument(doc.url_arquivo)}
                                title="Abrir documento"
                                className={`p-1 rounded hover:bg-white/10 ${theme === 'dark' ? 'text-[#E5DFD3]' : 'text-[#0A0A0A]'}`}>
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
                      <div className={`p-4 rounded-xl border text-xs space-y-2 ${theme === 'dark' ? 'bg-rose-500/5 border-rose-500/10 text-[#E5DFD3]' : 'bg-rose-500/5 border-rose-500/10 text-rose-800'
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
                    ) : isOffboardingMode ? (
                      <div className={`p-4 rounded-xl border space-y-3.5 ${theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10'
                        }`}>
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1">
                          ⚠️ Formulário de Desligamento
                        </h5>
                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="block text-[9px] font-bold uppercase opacity-65 mb-1">Data do Desligamento *</label>
                            <input
                              type="date"
                              required
                              value={offboardDate}
                              onChange={e => setOffboardDate(e.target.value)}
                              className={`w-full p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                                }`}
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold uppercase opacity-65 mb-1">Tipo de Desligamento *</label>
                            <select
                              value={offboardType}
                              onChange={e => setOffboardType(e.target.value as any)}
                              className={`w-full p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                                }`}
                            >
                              <option value="Voluntario" className={theme === 'dark' ? 'bg-[#0D0D0C] text-white' : 'bg-white text-black'}>Voluntário (Pedido de Demissão)</option>
                              <option value="Involuntario" className={theme === 'dark' ? 'bg-[#0D0D0C] text-white' : 'bg-white text-black'}>Involuntário (Demissão pela Empresa)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold uppercase opacity-65 mb-1">Motivo do Desligamento</label>
                            <textarea
                              rows={2.5}
                              placeholder="Descreva brevemente o motivo..."
                              value={offboardReason}
                              onChange={e => setOffboardReason(e.target.value)}
                              className={`w-full p-2.5 rounded border bg-transparent resize-none focus:outline-none ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
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
                              {isSavingOffboard ? 'Processando...' : '✓ Confirmar Desligamento'}
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
                        ⚠️ Desligar Colaborador
                      </button>
                    )}
                  </div>
                </div>
              )}

              {drawerTab === 'admissao' && (
                <div className="space-y-6 animate-fadeIn text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-white/10">
                    <h4 className="text-xs font-bold uppercase tracking-wider opacity-60">Dossiê de Admissão (Onboarding)</h4>
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
                                className={`p-1.5 rounded hover:bg-white/10 ${theme === 'dark' ? 'text-[#E5DFD3]' : 'text-[#0A0A0A]'}`}
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
                    <div className={`p-4 rounded-xl border space-y-3 mt-4 ${theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10'
                      }`}>
                      <h5 className="text-[10px] font-bold uppercase tracking-wider opacity-75">➕ Enviar Novo Documento ou Foto</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[8px] font-bold uppercase opacity-50 mb-1">Tipo de Anexo</label>
                          <select
                            value={uploadFileType}
                            onChange={(e) => setUploadFileType(e.target.value as any)}
                            className={`w-full text-xs p-2 rounded border focus:outline-none bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                              }`}
                          >
                            <option value="identidade" className={theme === 'dark' ? 'bg-[#0D0D0C] text-white' : 'bg-white text-black'}>Identidade (RG/CNH)</option>
                            <option value="residencia" className={theme === 'dark' ? 'bg-[#0D0D0C] text-white' : 'bg-white text-black'}>Comprovante de Residência</option>
                            <option value="aso" className={theme === 'dark' ? 'bg-[#0D0D0C] text-white' : 'bg-white text-black'}>Atestado de Saúde Ocupacional (ASO)</option>
                            <option value="foto" className={theme === 'dark' ? 'bg-[#0D0D0C] text-white' : 'bg-white text-black'}>Foto de Perfil</option>
                            <option value="outros" className={theme === 'dark' ? 'bg-[#0D0D0C] text-white' : 'bg-white text-black'}>Outros Documentos</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold uppercase opacity-50 mb-1">Selecionar Arquivo</label>
                          <input
                            id="drawer-file-upload-input"
                            type="file"
                            accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                            className={`w-full text-[10px] p-1.5 rounded border ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                              }`}
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleUploadColaboradorFile}
                        disabled={isUploadingFile || !uploadFile}
                        className={`w-full py-2 rounded-lg font-bold text-xs transition-colors ${theme === 'dark' ? 'bg-[#E5DFD3] text-black' : 'bg-[#0A0A0A] text-white'
                          } disabled:opacity-50`}
                      >
                        {isUploadingFile ? 'Enviando...' : '✓ Fazer Upload'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {drawerTab === 'ocorrencias' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Button to toggle form */}
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold uppercase tracking-wider opacity-60">Histórico de Ocorrências</h4>
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
                    <form onSubmit={handleRegisterOcorrencia} className={`p-4 rounded-xl border space-y-3 ${theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10'
                      }`}>
                      <div>
                        <label className="block text-[9px] font-bold uppercase opacity-65 mb-1">Tipo de Ocorrência</label>
                        <select
                          value={ocTipo}
                          onChange={(e) => setOcTipo(e.target.value)}
                          className={`w-full text-xs p-2.5 rounded border focus:outline-none bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
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
                          <label className="block text-[9px] font-bold uppercase opacity-65 mb-1">Data da Ocorrência</label>
                          <input
                            type="date"
                            required
                            value={ocData}
                            onChange={(e) => setOcData(e.target.value)}
                            className={`w-full text-xs p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                              }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase opacity-65 mb-1">Tempo de Desvio (Opcional)</label>
                          <input
                            type="text"
                            placeholder="Ex: 45 min ou 02:00h"
                            value={ocDesvio}
                            onChange={(e) => setOcDesvio(e.target.value)}
                            className={`w-full text-xs p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                              }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold uppercase opacity-65 mb-1">Justificativa / Motivo</label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Descreva o ocorrido..."
                          value={ocJustificativa}
                          onChange={(e) => setOcJustificativa(e.target.value)}
                          className={`w-full text-xs p-2.5 rounded border bg-transparent resize-none ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                            }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold uppercase opacity-65 mb-1">Atestado / Anexo (PDF/Imagem)</label>
                        <input
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
                            ? 'bg-[#E5DFD3] text-black hover:bg-[#D4CBB7]'
                            : 'bg-[#0A0A0A] text-white hover:bg-[#2A2A2A]'
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
                          <div key={oc.id} className={`p-3.5 rounded-xl border space-y-2.5 ${theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.02] border-black/5'
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
                      <h4 className="text-xs font-bold uppercase tracking-wider opacity-60">Advertências Formais</h4>
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
                      <form onSubmit={handleRegisterAdvertencia} className={`p-4 rounded-xl border space-y-3 ${theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10'
                        }`}>
                        <div>
                          <label className="block text-[9px] font-bold uppercase opacity-65 mb-1">Data da Falta</label>
                          <input
                            type="date"
                            required
                            value={advDataFalta}
                            onChange={(e) => setAdvDataFalta(e.target.value)}
                            className={`w-full text-xs p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                              }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold uppercase opacity-65 mb-1">Descrição Detalhada da Situação</label>
                          <textarea
                            required
                            rows={4}
                            placeholder="Descreva a atitude/falta cometida pelo funcionário..."
                            value={advDescricaoSituacao}
                            onChange={(e) => setAdvDescricaoSituacao(e.target.value)}
                            className={`w-full text-xs p-2.5 rounded border bg-transparent resize-none ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                              }`}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSavingAdvertencia}
                          className={`w-full py-2.5 rounded text-[10px] font-bold tracking-wider uppercase transition-colors ${theme === 'dark'
                              ? 'bg-[#E5DFD3] text-black hover:bg-[#D4CBB7]'
                              : 'bg-[#0A0A0A] text-white hover:bg-[#2A2A2A]'
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
                          <div key={adv.id} className={`p-3.5 rounded-xl border space-y-2.5 ${theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.02] border-black/5'
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
                                📄 Visualizar / Imprimir
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
                            <div className="px-2 py-1 rounded bg-[#E5DFD3]/10 text-xs">➔</div>
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
                      <div className={`p-3.5 rounded-xl border flex items-center justify-between ${theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.02] border-black/5'
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
                      <div className={`p-3.5 rounded-xl border flex items-center justify-between ${theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.02] border-black/5'
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
                      <div className={`p-3.5 rounded-xl border flex items-center justify-between ${theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.02] border-black/5'
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
                            <span className="text-emerald-400">🛡️ Apto para Promoção</span>
                          </>
                        ) : (
                          <>
                            <span className="opacity-40">⚙️ Em Desenvolvimento</span>
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
                            className={`text-[9px] px-2.5 py-1 rounded font-bold uppercase transition-all ${
                              theme === 'dark' ? 'bg-white/5 border border-white/10 hover:bg-white/10 text-white' : 'bg-black/5 border-black/10 hover:bg-black/10 text-black'
                            }`}
                          >
                            ✏️ Avaliar
                          </button>
                        )}
                      </div>

                      {/* Lista de Avaliações */}
                      <div className="space-y-3">
                        {colabAvaliacoes.length > 0 ? (
                          colabAvaliacoes.map((a) => {
                            const parsed = parseEvaluationComments(a.comentarios);
                            return (
                              <div key={a.id} className={`p-3 rounded-xl border space-y-2 ${theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.02] border-black/5'
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
                                  className="w-full text-center py-1 rounded text-[9px] font-bold uppercase transition-all bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 mt-1"
                                >
                                  📄 Ver Relatório Completo
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
      )}

      {showEvalModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              .print-modal, .print-modal * {
                visibility: visible !important;
                color: #000000 !important;
                background-color: transparent !important;
                background-image: none !important;
                border-color: #000000 !important;
                box-shadow: none !important;
                text-shadow: none !important;
              }
              .print-modal {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                max-height: 100% !important;
                overflow: visible !important;
                background: #ffffff !important;
                padding: 20px !important;
                margin: 0 !important;
                border: none !important;
              }
              .no-print {
                display: none !important;
              }
              .print-border, .print-border th, .print-border td {
                border: 1px solid #000000 !important;
                padding: 6px 10px !important;
              }
              input, select, textarea {
                border: none !important;
                background: transparent !important;
                color: black !important;
                resize: none !important;
                outline: none !important;
                box-shadow: none !important;
                appearance: none !important;
                -webkit-appearance: none !important;
              }
            }
          `}</style>
          
          <div className={`relative w-full max-w-4xl rounded-2xl shadow-2xl p-6 md:p-8 overflow-y-auto max-h-[90vh] print-modal flex flex-col justify-between ${
            theme === 'dark' ? 'bg-[#121211] border border-white/10 text-white' : 'bg-white border border-black/10 text-black shadow-lg'
          }`}>
            <LetterheadWatermark />

            {/* Header */}
            <div className="border-b border-white/10 pb-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:border-black">
              <div>
                <h2 className="text-lg md:text-xl font-bold tracking-tight">Avaliação de Desempenho & PDI</h2>
                <p className="text-xs opacity-60 print:opacity-100">
                  Colaborador(a): <span className="font-semibold">{activeColaboradorForDrawer?.nome}</span> | Cargo: <span className="font-semibold">{activeColaboradorForDrawer?.cargo}</span>
                  {evalModalReadOnly && selectedEvalForModal && (
                    <> | Avaliador: <span className="font-semibold">{selectedEvalForModal.avaliador_email}</span></>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 w-full md:w-auto no-print">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'
                  }`}
                >
                  🖨️ Imprimir / PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowEvalModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Content Form */}
            <form onSubmit={handleCadastrarAvaliacao} className="space-y-6 flex-grow print:space-y-4">
              
              {/* Metadata row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-black/5 pb-4 mb-4 dark:border-white/5 print:border-black">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-75 mb-1.5 print:text-black">Data do Feedback</label>
                  {evalModalReadOnly ? (
                    <span className="text-xs font-medium block mt-1 font-mono print:text-black">
                      {evalForm.dataFeedback ? new Date(evalForm.dataFeedback + 'T12:00:00').toLocaleDateString('pt-BR') : '__/__/____'}
                    </span>
                  ) : (
                    <input
                      type="date"
                      required
                      value={evalForm.dataFeedback}
                      onChange={e => setEvalForm(p => ({ ...p, dataFeedback: e.target.value }))}
                      disabled={evalModalReadOnly}
                      className={`w-full text-xs p-2 rounded border focus:outline-none bg-transparent transition-colors ${
                        theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                      }`}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-75 mb-1.5 print:text-black">Período Avaliado</label>
                  {evalModalReadOnly ? (
                    <span className="text-xs font-medium block mt-1 print:text-black">
                      {evalForm.periodoAvaliado || '___________________________'}
                    </span>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="Ex: Janeiro a Junho de 2026"
                      value={evalForm.periodoAvaliado}
                      onChange={e => setEvalForm(p => ({ ...p, periodoAvaliado: e.target.value }))}
                      disabled={evalModalReadOnly}
                      className={`w-full text-xs p-2 rounded border focus:outline-none bg-transparent transition-colors ${
                        theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                      }`}
                    />
                  )}
                </div>
              </div>

              {/* 1. Desempenho Geral */}
              <div className={`p-5 rounded-xl border space-y-4 ${theme === 'dark' ? 'bg-[#181816] border-white/5' : 'bg-black/[0.02] border-black/5'} print:border-black print:bg-transparent print:p-0 print:space-y-2`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 print:text-black print:border-b print:pb-1 print:w-full">1. Desempenho Geral</h3>
                <div>
                  <span className="block text-[10px] font-bold uppercase opacity-70 mb-2 print:text-black">Avalie o desempenho do colaborador durante o período:</span>
                  {evalModalReadOnly ? (
                    <div className="flex flex-col gap-1.5 font-mono text-xs print:text-black">
                      {['Excelente', 'Muito Bom', 'Bom', 'Regular', 'Necessita Melhorias'].map((level) => {
                        const isSelected = evalForm.desempenhoGeral === level;
                        return (
                          <div key={level} className="flex items-center gap-2">
                            <span className="text-sm font-semibold select-none">{isSelected ? '☑' : '☐'}</span>
                            <span className={isSelected ? 'font-bold' : 'opacity-70'}>{level}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {['Excelente', 'Muito Bom', 'Bom', 'Regular', 'Necessita Melhorias'].map((level) => {
                        const isSelected = evalForm.desempenhoGeral === level;
                        return (
                          <button
                            key={level}
                            type="button"
                            disabled={evalModalReadOnly}
                            onClick={() => setEvalForm(p => ({ ...p, desempenhoGeral: level }))}
                            className={`py-2 px-1 rounded-lg text-center font-bold text-[10px] uppercase border transition-all ${
                              isSelected
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : (theme === 'dark' ? 'border-white/5 bg-white/2 hover:bg-white/5 opacity-60' : 'border-black/5 bg-black/2 hover:bg-black/5 opacity-60')
                            }`}
                          >
                            {isSelected ? '✓ ' : ''}{level}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase opacity-70 mb-1.5 print:text-black">Comentários do Gestor</label>
                  {evalModalReadOnly ? (
                    <p className="text-xs p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 leading-relaxed italic print:bg-transparent print:border-none print:p-0 print:text-black">
                      <strong>Comentários do Gestor:</strong> {evalForm.comentariosGestor || 'O desempenho atual apresenta lacunas técnicas e comportamentais que precisam de correção imediata.'}
                    </p>
                  ) : (
                    <textarea
                      required
                      rows={3}
                      placeholder="Descreva detalhadamente o desempenho, lacunas técnicas/comportamentais ou avanços..."
                      value={evalForm.comentariosGestor}
                      onChange={e => setEvalForm(p => ({ ...p, comentariosGestor: e.target.value }))}
                      disabled={evalModalReadOnly}
                      className={`w-full text-xs p-2.5 rounded border bg-transparent resize-none focus:outline-none ${
                        theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                      }`}
                    />
                  )}
                </div>
              </div>

              {/* 2. Pontos Fortes */}
              <div className={`p-5 rounded-xl border space-y-3 ${theme === 'dark' ? 'bg-[#181816] border-white/5' : 'bg-black/[0.02] border-black/5'} print:border-black print:bg-transparent print:p-0 print:space-y-2`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 print:text-black print:border-b print:pb-1 print:w-full">2. Pontos Fortes</h3>
                {evalModalReadOnly ? (
                  <div className="text-xs space-y-1.5 print:text-black">
                    {(evalForm.pontosFortes || '')
                      .split('\n')
                      .map(line => line.trim())
                      .filter(line => line.length > 0)
                      .map((line, i) => (
                        <div key={i} className="flex items-start gap-1">
                          <span>-</span>
                          <span>{line.startsWith('-') ? line.substring(1).trim() : line}</span>
                        </div>
                      ))}
                    {(!evalForm.pontosFortes || evalForm.pontosFortes.trim().length === 0) && (
                      <p className="opacity-50 italic">Nenhum ponto forte registrado.</p>
                    )}
                  </div>
                ) : (
                  <textarea
                    required
                    rows={3}
                    placeholder="Liste os pontos fortes demonstrados pelo colaborador (ex: trabalho em equipe, comprometimento, proatividade...)"
                    value={evalForm.pontosFortes}
                    onChange={e => setEvalForm(p => ({ ...p, pontosFortes: e.target.value }))}
                    disabled={evalModalReadOnly}
                    className={`w-full text-xs p-2.5 rounded border bg-transparent resize-none focus:outline-none ${
                      theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                    }`}
                  />
                )}
              </div>

              {/* 3. Pontos de Melhorias */}
              <div className={`p-5 rounded-xl border space-y-4 ${theme === 'dark' ? 'bg-[#181816] border-white/5' : 'bg-black/[0.02] border-black/5'} print:border-black print:bg-transparent print:p-0 print:space-y-2`}>
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 print:text-black print:border-b print:pb-1 print:w-full">3. Pontos de Melhorias</h3>
                  {!evalModalReadOnly && (
                    <button
                      type="button"
                      onClick={addPontoMelhoriaRow}
                      className="text-[9px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase border border-emerald-500/20"
                    >
                      ＋ Adicionar
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse print-border">
                    <thead>
                      <tr className={`text-[10px] font-bold uppercase border-b ${theme === 'dark' ? 'border-white/10' : 'border-black/10'} print:border-black`}>
                        <th className="pb-2 w-1/2 print:text-black">Oportunidade de Melhoria</th>
                        <th className="pb-2 w-1/2 print:text-black">Ação Recomendada</th>
                        {!evalModalReadOnly && <th className="pb-2 w-12 text-center no-print">Ação</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 print:divide-y-0">
                      {evalForm.pontosMelhoria.map((row, idx) => (
                        <tr key={idx} className="print:border-b print:border-black/20">
                          <td className="py-2.5 pr-2">
                            {evalModalReadOnly ? (
                              <span className="text-xs block print:text-black">{row.oportunidade || '______'}</span>
                            ) : (
                              <input
                                type="text"
                                required
                                placeholder="Ex: Comunicação clara"
                                value={row.oportunidade}
                                onChange={e => updatePontoMelhoriaRow(idx, 'oportunidade', e.target.value)}
                                disabled={evalModalReadOnly}
                                className={`w-full text-xs p-1.5 rounded border bg-transparent ${
                                  theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                                }`}
                              />
                            )}
                          </td>
                          <td className="py-2.5 pr-2">
                            {evalModalReadOnly ? (
                              <span className="text-xs block print:text-black">{row.acao || '______'}</span>
                            ) : (
                              <input
                                type="text"
                                required
                                placeholder="Ex: Realizar feedback individual quinzenal"
                                value={row.acao}
                                onChange={e => updatePontoMelhoriaRow(idx, 'acao', e.target.value)}
                                disabled={evalModalReadOnly}
                                className={`w-full text-xs p-1.5 rounded border bg-transparent ${
                                  theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                                }`}
                              />
                            )}
                          </td>
                          {!evalModalReadOnly && (
                            <td className="py-2.5 text-center no-print">
                              <button
                                type="button"
                                onClick={() => removePontoMelhoriaRow(idx)}
                                className="text-rose-500 hover:text-rose-400 font-bold text-xs"
                                disabled={evalForm.pontosMelhoria.length <= 1}
                              >
                                ✕
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Plano de Desenvolvimento (PDI) */}
              <div className={`p-5 rounded-xl border space-y-4 ${theme === 'dark' ? 'bg-[#181816] border-white/5' : 'bg-black/[0.02] border-black/5'} print:border-black print:bg-transparent print:p-0 print:space-y-2`}>
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 print:text-black print:border-b print:pb-1 print:w-full">4. Plano de Desenvolvimento</h3>
                  {!evalModalReadOnly && (
                    <button
                      type="button"
                      onClick={addPdiRow}
                      className="text-[9px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase border border-emerald-500/20"
                    >
                      ＋ Adicionar
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse print-border">
                    <thead>
                      <tr className={`text-[10px] font-bold uppercase border-b ${theme === 'dark' ? 'border-white/10' : 'border-black/10'} print:border-black`}>
                        <th className="pb-2 print:text-black">Objetivo</th>
                        <th className="pb-2 print:text-black">Ação</th>
                        <th className="pb-2 w-28 print:text-black">Prazo</th>
                        <th className="pb-2 w-32 print:text-black">Responsável</th>
                        {!evalModalReadOnly && <th className="pb-2 w-12 text-center no-print">Ação</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 print:divide-y-0">
                      {evalForm.pdi.map((row, idx) => (
                        <tr key={idx} className="print:border-b print:border-black/20">
                          <td className="py-2.5 pr-2">
                            {evalModalReadOnly ? (
                              <span className="text-xs block print:text-black">{row.objetivo || '______'}</span>
                            ) : (
                              <input
                                type="text"
                                required
                                placeholder="Ex: Melhorar pontualidade"
                                value={row.objetivo}
                                onChange={e => updatePdiRow(idx, 'objetivo', e.target.value)}
                                disabled={evalModalReadOnly}
                                className={`w-full text-xs p-1.5 rounded border bg-transparent ${
                                  theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                                }`}
                              />
                            )}
                          </td>
                          <td className="py-2.5 pr-2">
                            {evalModalReadOnly ? (
                              <span className="text-xs block print:text-black">{row.acao || '______'}</span>
                            ) : (
                              <input
                                type="text"
                                required
                                placeholder="Ex: Organizar agenda diária"
                                value={row.acao}
                                onChange={e => updatePdiRow(idx, 'acao', e.target.value)}
                                disabled={evalModalReadOnly}
                                className={`w-full text-xs p-1.5 rounded border bg-transparent ${
                                  theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                                }`}
                              />
                            )}
                          </td>
                          <td className="py-2.5 pr-2">
                            {evalModalReadOnly ? (
                              <span className="text-xs block print:text-black">{row.prazo || '______'}</span>
                            ) : (
                              <input
                                type="text"
                                required
                                placeholder="Ex: 30 dias"
                                value={row.prazo}
                                onChange={e => updatePdiRow(idx, 'prazo', e.target.value)}
                                disabled={evalModalReadOnly}
                                className={`w-full text-xs p-1.5 rounded border bg-transparent ${
                                  theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                                }`}
                              />
                            )}
                          </td>
                          <td className="py-2.5 pr-2">
                            {evalModalReadOnly ? (
                              <span className="text-xs block print:text-black">{row.responsavel || '______'}</span>
                            ) : (
                              <input
                                type="text"
                                required
                                placeholder="Ex: Colaborador"
                                value={row.responsavel}
                                onChange={e => updatePdiRow(idx, 'responsavel', e.target.value)}
                                disabled={evalModalReadOnly}
                                className={`w-full text-xs p-1.5 rounded border bg-transparent ${
                                  theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
                                }`}
                              />
                            )}
                          </td>
                          {!evalModalReadOnly && (
                            <td className="py-2.5 text-center no-print">
                              <button
                                type="button"
                                onClick={() => removePdiRow(idx)}
                                className="text-rose-500 hover:text-rose-400 font-bold text-xs"
                                disabled={evalForm.pdi.length <= 1}
                              >
                                ✕
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. Avaliação de Competências */}
              <div className={`p-5 rounded-xl border space-y-4 ${theme === 'dark' ? 'bg-[#181816] border-white/5' : 'bg-black/[0.02] border-black/5'} print:border-black print:bg-transparent print:p-0 print:space-y-2`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 print:text-black print:border-b print:pb-1 print:w-full">5. Avaliação de Competências</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse print-border">
                    <thead>
                      <tr className={`text-[10px] font-bold uppercase border-b ${theme === 'dark' ? 'border-white/10' : 'border-black/10'} print:border-black`}>
                        <th className="pb-2 print:text-black">Competência</th>
                        <th className="pb-2 text-center w-64 print:text-black">Nota (1 a 5)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 print:divide-y-0">
                      {[
                        { key: 'qualidade_entregas', label: 'Qualidade das entregas' },
                        { key: 'relacionamento_interpessoal', label: 'Relacionamento interpessoal' },
                        { key: 'comunicacao', label: 'Comunicação' },
                        { key: 'organizacao', label: 'Organização' },
                        { key: 'proatividade', label: 'Proatividade' },
                        { key: 'comprometimento', label: 'Comprometimento' }
                      ].map((item) => {
                        const currentScore = (evalForm.competencias as any)[item.key];
                        return (
                          <tr key={item.key} className="print:border-b print:border-black/20">
                            <td className="py-3 text-xs font-medium print:text-black">{item.label}</td>
                            <td className="py-3">
                              <div className="flex items-center justify-center gap-3">
                                {[1, 2, 3, 4, 5].map((score) => {
                                  const isChecked = currentScore === score;
                                  if (evalModalReadOnly) {
                                    return (
                                      <span
                                        key={score}
                                        className="font-mono text-xs select-none print:text-black mx-1"
                                      >
                                        {isChecked ? `☑${score}` : `☐${score}`}
                                      </span>
                                    );
                                  }
                                  return (
                                    <button
                                      key={score}
                                      type="button"
                                      disabled={evalModalReadOnly}
                                      onClick={() => {
                                        setEvalForm(p => ({
                                          ...p,
                                          competencias: {
                                            ...p.competencias,
                                            [item.key]: score
                                          }
                                        }));
                                      }}
                                      className={`w-6 h-6 rounded-full font-mono text-[10px] font-bold flex items-center justify-center border transition-all ${
                                        isChecked
                                          ? 'bg-emerald-500 border-emerald-500 text-white'
                                          : (theme === 'dark' ? 'border-white/15 hover:border-white/30 text-white bg-white/2' : 'border-black/15 hover:border-black/30 text-black bg-black/2')
                                      }`}
                                    >
                                      {score}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 6. Ciência das Partes & 7. Controle Interno */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-1 print:gap-4 print:pt-4">
                
                {/* 6. Ciência das Partes */}
                <div className={`p-5 rounded-xl border space-y-4 ${theme === 'dark' ? 'bg-[#181816] border-white/5' : 'bg-black/[0.02] border-black/5'} print:border-black print:bg-transparent print:p-0 print:space-y-2`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 print:text-black print:border-b print:pb-1">6. Ciência das Partes</h3>
                  <p className="text-[10px] opacity-70 italic print:text-black">Declaro estar ciente e de acordo com o feedback recebido.</p>
                  
                  <div className="space-y-4 pt-2 text-xs font-mono print:space-y-3 print:pt-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span className="print:text-black">Assinatura do Colaborador: ___________________________</span>
                      <span className="print:text-black">Data: __/__/____</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span className="print:text-black">Assinatura do Gestor: ___________________________</span>
                      <span className="print:text-black">Data: __/__/____</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span className="print:text-black">Assinatura do RH: ___________________________</span>
                      <span className="print:text-black">Data: __/__/____</span>
                    </div>
                  </div>
                </div>

                {/* 7. Controle Interno (RH) */}
                <div className={`p-5 rounded-xl border space-y-4 ${theme === 'dark' ? 'bg-[#181816] border-white/5' : 'bg-black/[0.02] border-black/5'} print:border-black print:bg-transparent print:p-0 print:space-y-2`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 print:text-black print:border-b print:pb-1">7. Controle Interno (RH)</h3>
                  
                  <div className="space-y-3 print:space-y-1.5 print:pt-1">
                    {[
                      { key: 'entregue', label: 'Documento entregue ao colaborador' },
                      { key: 'arquivado', label: 'Cópia arquivada no prontuário' },
                      { key: 'lancado', label: 'Lançamento em sistema realizado' },
                      { key: 'gestor_orientado', label: 'Gestor orientado sobre próximos passos' }
                    ].map((item) => {
                      const isChecked = (evalForm.controleInterno as any)[item.key];
                      if (evalModalReadOnly) {
                        return (
                          <div key={item.key} className="flex items-center gap-2 text-xs font-mono select-none print:text-black">
                            <span className="text-sm font-semibold">{isChecked ? '☑' : '☐'}</span>
                            <span className="opacity-75 print:opacity-100">{item.label}</span>
                          </div>
                        );
                      }
                      return (
                        <label key={item.key} className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={evalModalReadOnly}
                            onChange={e => {
                              setEvalForm(p => ({
                                ...p,
                                controleInterno: {
                                  ...p.controleInterno,
                                  [item.key]: e.target.checked
                                }
                              }));
                            }}
                            className={`w-3.5 h-3.5 rounded accent-emerald-500`}
                          />
                          <span className="opacity-75">{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Form Actions (Create Mode Only) */}
              {!evalModalReadOnly && (
                <div className="pt-4 border-t border-white/10 flex justify-end gap-3 no-print">
                  <button
                    type="button"
                    onClick={() => setShowEvalModal(false)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                      theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingAvaliacao}
                    className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-colors ${
                      theme === 'dark' ? 'bg-[#E5DFD3] text-black hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-white hover:bg-[#2A2A2A]'
                    } disabled:opacity-50`}
                  >
                    {isSavingAvaliacao ? 'Gravando...' : 'Gravar Avaliação'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {showAdvertenciaModal && selectedAdvertenciaForModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto eval-modal-backdrop">
          <style>{`
            @media print {
              body {
                visibility: hidden !important;
              }
              .print-modal, .print-modal * {
                visibility: visible !important;
                color: #000000 !important;
                background-color: transparent !important;
                background-image: none !important;
                border-color: #000000 !important;
                box-shadow: none !important;
                text-shadow: none !important;
              }
              @page {
                size: A4 portrait;
                margin: 15mm;
              }
              .eval-modal-backdrop {
                position: static !important;
                background: transparent !important;
                backdrop-filter: none !important;
                padding: 0 !important;
                display: block !important;
              }
              .print-modal {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                max-height: none !important;
                overflow: visible !important;
                background: #ffffff !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
              }
              .no-print {
                display: none !important;
              }
              .print-break-inside-avoid {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
            }
          `}</style>
          
          <div className={`relative w-full max-w-2xl rounded-2xl shadow-2xl p-6 md:p-8 overflow-y-auto max-h-[90vh] print-modal flex flex-col justify-between ${
            theme === 'dark' ? 'bg-[#121211] border border-white/10 text-white' : 'bg-white border border-black/10 text-black shadow-lg'
          }`}>
            <LetterheadWatermark />

            {/* Header de Tela */}
            <div className="border-b border-white/10 pb-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
              <div>
                <h2 className="text-lg md:text-xl font-bold tracking-tight text-rose-500">Aviso de Advertência Disciplinar</h2>
                <p className="text-xs opacity-60">
                  Colaborador(a): <span className="font-semibold">{activeColaboradorForDrawer?.nome}</span> | Cargo: <span className="font-semibold">{activeColaboradorForDrawer?.cargo}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-3 w-full md:w-auto no-print">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'
                  }`}
                >
                  🖨️ Imprimir / PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdvertenciaModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Cabeçalho Corporativo de Impressão */}
            <div className="hidden print:block border-b-2 border-black pb-4 mb-6">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h1 className="text-sm font-bold tracking-wider uppercase text-black">{getEmpregadora(activeColaboradorForDrawer?.setor).razao}</h1>
                  <p className="text-[9px] text-black/60 font-mono">CNPJ: {getEmpregadora(activeColaboradorForDrawer?.setor).cnpj} | Rua Olavo Macedo Ribeiro, 320, Jatiúca, Maceió - AL</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold uppercase border border-black px-2.5 py-1">Controle Interno - RH</span>
                </div>
              </div>
              
              <div className="text-center py-2.5 my-2 bg-[#f3f4f6] border border-black/10" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <h2 className="text-xs font-extrabold tracking-widest uppercase text-black">AVISO DE ADVERTÊNCIA AO EMPREGADO</h2>
              </div>
            </div>

            {/* Content Form / Printable Text */}
            <div className="space-y-6 flex-grow text-xs text-left leading-relaxed text-black/90 dark:text-white/90 print:text-black font-sans">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-black/5 dark:border-white/5 print:border-black">
                <div>
                  <strong>NOME:</strong> {activeColaboradorForDrawer?.nome}
                </div>
                <div>
                  <strong>FUNÇÃO:</strong> {activeColaboradorForDrawer?.cargo}
                </div>
              </div>

              <div className="pt-2">
                <p>
                  Na conformidade da Consolidação das Leis do Trabalho, fica advertido pela(s) falta(s) abaixo discriminada(s):
                </p>
                <div className="mt-4 p-3 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg print:border-none print:p-0 print:bg-transparent">
                  <strong>• Ao dia {(() => {
                    const d = new Date(selectedAdvertenciaForModal.data_falta + 'T12:00:00');
                    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
                  })()}, o funcionário:</strong> {selectedAdvertenciaForModal.descricao_situacao}
                </div>
              </div>

              <div className="space-y-3">
                <p>
                  Essa conduta foi verificada confrontando o nosso regimento interno, o contrato de trabalho em vigor, bem como a legislação quanto ao tema.
                </p>
                <p>
                  Tal atitude prejudica a empresa e seu rendimento no trabalho.
                </p>
                <p>
                  Por isso, não só esperamos que tome as necessárias providências a fim de que não se repitam as irregularidades acima discriminadas, como também aproveitamos para esclarecer-lhe que a repetição ou a prática de outra prevista em lei, nossos Regulamentos, Ordens de Serviços, Comunicações, etc., poderá contribuir desfavoravelmente em seu progresso nesta firma, além de poder acarretar-lhe penalidades mais severas, conforme o caso e preceitos das disposições do Artigo 482 e suas alíneas da Consolidação das Leis do Trabalho.
                </p>
              </div>

              {/* Advertências Anteriores */}
              <div className="pt-4 border-t border-black/5 dark:border-white/5 print:border-black print-break-inside-avoid">
                <h4 className="font-bold uppercase text-[10px] tracking-wider mb-2 text-rose-500 print:text-black">
                  Por fim, reforço que já houveram as seguintes advertências anteriores:
                </h4>
                <div className="space-y-2 pl-2 font-sans">
                  {selectedAdvertenciaForModal.advertencias_anteriores && selectedAdvertenciaForModal.advertencias_anteriores.length > 0 ? (
                    selectedAdvertenciaForModal.advertencias_anteriores.map((prev: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-1 font-mono text-[11px] leading-relaxed">
                        <span>•</span>
                        <span>Advertência referente à falta de {(() => {
                          const d = new Date(prev.data_falta + 'T12:00:00');
                          return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
                        })()}: "{prev.descricao_situacao}"</span>
                      </div>
                    ))
                  ) : (
                    <p className="opacity-50 italic">Nenhuma advertência anterior registrada até a data deste documento.</p>
                  )}
                </div>
              </div>

              {/* Assinaturas */}
              <div className="grid grid-cols-2 gap-8 pt-10 print-break-inside-avoid text-center">
                <div className="space-y-1">
                  <div className="border-t border-black/30 dark:border-white/30 print:border-black pt-1.5 mx-auto max-w-[200px]" />
                  <span className="text-[10px] block opacity-70">Assinatura do Empregador</span>
                </div>
                <div className="space-y-1">
                  <div className="border-t border-black/30 dark:border-white/30 print:border-black pt-1.5 mx-auto max-w-[200px]" />
                  <span className="text-[10px] block opacity-70">Ciente do Empregado</span>
                </div>
              </div>

              {/* Local e Data */}
              <div className="text-right pt-6 opacity-60 text-[10px] font-mono print:opacity-100">
                Maceió - AL, {(() => {
                  const d = new Date(selectedAdvertenciaForModal.criado_em || Date.now());
                  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
                })()}
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
