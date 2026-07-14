import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Signature, 
  GitMerge, 
  AlertTriangle, 
  Moon, 
  Sun, 
  Trash2, 
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
  Gift
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

import OverviewPanel from '../../components/analytics/OverviewPanel';
import TurnoverPanel from '../../components/analytics/TurnoverPanel';
import HealthSafetyPanel from '../../components/analytics/HealthSafetyPanel';
import CompensationsPanel from '../../components/analytics/CompensationsPanel';
import LegalPanel from '../../components/analytics/LegalPanel';
import FormManager from '../../components/documents/FormManager';
import BenefitsManager from '../../components/benefits/BenefitsManager';

type Role = 'coordenadora_rh' | 'ti';
type Theme = 'dark' | 'light';

interface DashboardProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  user: any;
  role: Role;
}

export default function Dashboard({ theme, setTheme, user, role }: DashboardProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const activePath = location.pathname; // '/app/dashboard', '/app/colaboradores', etc.

  // Mobile sidebar open state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Security Helper for RH role OR TI superuser email
  const hasFullAccess = role === 'coordenadora_rh' || user?.email === 'ito.thiagosilva@gmail.com';

  const handleLogout = async () => {
    try {
      await supabase.from('logs_auditoria').insert({
        usuario_id: user.id,
        usuario_email: user.email,
        acao: 'LOGOUT',
        ip_address: '192.168.45.102',
        user_agent: navigator.userAgent
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
        detalhes: detalhes,
        ip_address: '192.168.45.102',
        user_agent: navigator.userAgent
      });
    } catch (err) {
      console.error('Audit log failed:', err);
    }
  };


  // --- MÓDULO 6: BENEFÍCIOS ---
  const [dbBenefits, setDbBenefits] = useState<any[]>([]);
  const [dbColaboradorBeneficios, setDbColaboradorBeneficios] = useState<any[]>([]);

  // --- MÓDULO 1: DOCUMENTOS ---
  const [modelos, setModelos] = useState<any[]>([]);
  const [selectedModeloId, setSelectedModeloId] = useState<string>('');
  const [docTemplate, setDocTemplate] = useState('Termo de Consentimento de Uso de Imagem\n\nEu, {{nome}}, portador do CPF {{cpf}}, autorizo o Instituto Thiago Omena no setor de {{setor}}...');
  
  const [varNome, setVarNome] = useState('Ana Souza Pereira');
  const [varCpf, setVarCpf] = useState('123.456.789-00');
  const [varSetor, setVarSetor] = useState('Biomedicina');

  const [uploadedPdfBase64, setUploadedPdfBase64] = useState<string>('');
  const [uploadedPdfName, setUploadedPdfName] = useState<string>('');
  // Docs Module Sub-tabs
  const [docsSubTab, setDocsSubTab] = useState<'visao'|'modelos'|'envios'|'pendencias'|'formularios'|'envio-form'|'historico'>('visao');
  // New Modelo form
  const [newModeloTitulo, setNewModeloTitulo] = useState('');
  const [newModeloConteudo, setNewModeloConteudo] = useState('');
  const [isSavingModelo, setIsSavingModelo] = useState(false);
  const [showNewModeloForm, setShowNewModeloForm] = useState(false);
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
    return docTemplate
      .replace(/{{nome}}/g, varNome || '_______')
      .replace(/{{cpf}}/g, varCpf || '_______')
      .replace(/{{setor}}/g, varSetor || '_______');
  };

  const [signatureHash, setSignatureHash] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [signatureSaved, setSignatureSaved] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sigPointsCount, setSigPointsCount] = useState(0);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [generatedPdfResult, setGeneratedPdfResult] = useState<any>(null);

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
        const defaultModels = [
          { id: '1', titulo: 'Termo de Uso de Imagem', conteudo: 'Eu, {{nome}}, portador do CPF {{cpf}}, autorizo o Instituto Thiago Omena no setor de {{setor}}...' },
          { id: '2', titulo: 'Contrato de Experiência', conteudo: 'Pelo presente instrumento, {{nome}}, CPF {{cpf}}, fica admitido para o setor {{setor}}...' }
        ];
        setModelos(defaultModels);
        setSelectedModeloId('1');
        setDocTemplate(defaultModels[0].conteudo);
      }
    } catch {
      const defaultModels = [
        { id: '1', titulo: 'Termo de Uso de Imagem (Local)', conteudo: 'Eu, {{nome}}, portador do CPF {{cpf}}, autorizo o Instituto Thiago Omena no setor de {{setor}}...' },
        { id: '2', titulo: 'Contrato de Experiência (Local)', conteudo: 'Pelo presente instrumento, {{nome}}, CPF {{cpf}}, fica admitido para o setor {{setor}}...' }
      ];
      setModelos(defaultModels);
      setSelectedModeloId('1');
      setDocTemplate(defaultModels[0].conteudo);
    }
  };

  useEffect(() => {
    if (activePath === '/app/documentos') {
      fetchModelos();
    }
  }, [activePath]);

  // High-DPI canvas
  useEffect(() => {
    if (activePath !== '/app/documentos') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 2;
    canvas.style.width = '100%';
    canvas.style.height = '180px';
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 180 * dpr;
    ctx.scale(dpr, dpr);
    
    ctx.strokeStyle = theme === 'dark' ? '#E5DFD3' : '#0A0A0A';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  }, [activePath, theme]);



  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = theme === 'dark' ? '#E5DFD3' : '#0A0A0A';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsSigning(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isSigning) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setSigPointsCount(prev => prev + 1);
  };

  const stopDrawing = () => setIsSigning(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigPointsCount(0);
    setSignatureHash('');
    setSignatureSaved(false);
    setGeneratedPdfResult(null);
  };

  const saveSignature = async () => {
    if (sigPointsCount < 5 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const signatureBase64 = canvas.toDataURL('image/png');
    const ip = '192.168.45.102';
    const userAgent = navigator.userAgent;

    try {
      const payload = `${varNome}|${varCpf}|${sigPointsCount}|${ip}|${userAgent}`;
      const msgBuffer = new TextEncoder().encode(payload);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setSignatureHash(hashHex);

      const { error } = await supabase.from('documentos_assinados').insert({
        colaborador_id: user.id,
        colaborador_cpf: varCpf,
        documento_id: selectedModeloId !== '1' && selectedModeloId !== '2' ? selectedModeloId : null,
        assinatura_desenhada: signatureBase64,
        ip_address: ip,
        user_agent: userAgent
      });
      if (error) console.error('Supabase save error:', error.message);

      setSignatureSaved(true);
      await logAuditoria('ASSINAR_TERMO', { candidato: varNome, cpf: varCpf, modelo_id: selectedModeloId });
    } catch {
      setSignatureHash('sha256_' + Math.random().toString(36).substring(2, 11));
      setSignatureSaved(true);
    }
  };

  const handleGeneratePdf = async () => {
    if (!signatureSaved) return;
    setIsGeneratingPdf(true);
    setGeneratedPdfResult(null);

    const canvas = canvasRef.current;
    const signatureBase64 = canvas ? canvas.toDataURL('image/png') : '';

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gerar-contrato-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          userEmail: user.email,
          candidateName: varNome,
          candidateCpf: varCpf,
          signatureBase64,
          coordinatorEmail: user.email,
          pdfTemplateBase64: selectedModeloId === 'upload' ? uploadedPdfBase64 : null,
          documentName: selectedModeloId === 'upload' ? uploadedPdfName : 'contrato_admissao'
        })
      });
      const data = await response.json();
      if (data.success) {
        setGeneratedPdfResult(data);
      } else {
        throw new Error(data.error);
      }
    } catch {
      setTimeout(async () => {
        const dummyHash = 'd7ac82751fbc9c09a80e1b2184e0368b1a89c8942b0c95029a8f4c281df60c7f';
        setGeneratedPdfResult({
          success: true,
          message: "PDF gerado e armazenado com sucesso! (Modo Simulação)",
          signedUrl: `https://jyvxhyaeagqljvqqeuwi.supabase.co/storage/v1/object/sign/contratos-assinados/contrato_${varCpf.replace(/\D/g, '')}.pdf?token=dummy`,
          documentHash: dummyHash
        });
        await logAuditoria('GERAR_PDF_CONTRATO_SIMULADO', { candidato: varNome, cpf: varCpf, document_hash: dummyHash });
      }, 1200);
    } finally {
      setTimeout(() => setIsGeneratingPdf(false), 1200);
    }
  };


  // --- MÓDULO 2: COLABORADORES & SIDE-BY-SIDE ---
  const [colabSubTab, setColabSubTab] = useState<'quadro' | 'admissao' | 'cadastrar'>('quadro');
  
  // Quadro de Funcionários filters and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSetor, setFilterSetor] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [sortOrder, setSortOrder] = useState<'antigo' | 'recente'>('antigo');

  // Side Drawer Prontuário States
  const [activeColaboradorForDrawer, setActiveColaboradorForDrawer] = useState<any>(null);
  const [selectedColabDocuments, setSelectedColabDocuments] = useState<any[]>([]);

  // Link Generation States
  const [newCandidateName, setNewCandidateName] = useState('Ana Souza Pereira');
  const [newCandidateEmail, setNewCandidateEmail] = useState('ana.souza@gmail.com');
  const [newCandidateCargo, setNewCandidateCargo] = useState('Fisioterapeuta Dermato-Funcional');
  const [newCandidateSetor, setNewCandidateSetor] = useState('Biomedicina');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isTokenRevoked, setIsTokenRevoked] = useState(false);

  // Side-by-Side Review states
  const [candidateData, setCandidateData] = useState({
    nome: 'Ana Souza Pereira',
    cpf: '123.456.789-00',
    rg: '98.765.432-1',
    cargo: 'Fisioterapeuta Dermato-Funcional',
    setor: 'Biomedicina',
    salario: 'R$ 4.500,00'
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
  const [drawerTab, setDrawerTab] = useState<'pessoal' | 'admissao' | 'ocorrencias'>('pessoal');
  const [ocorrenciasList, setOcorrenciasList] = useState<any[]>([]);
  const [isRegisteringOcorrencia, setIsRegisteringOcorrencia] = useState(false);
  const [ocTipo, setOcTipo] = useState('Atraso');
  const [ocData, setOcData] = useState(new Date().toISOString().split('T')[0]);
  const [ocDesvio, setOcDesvio] = useState('');
  const [ocJustificativa, setOcJustificativa] = useState('');
  const [ocFile, setOcFile] = useState<File | null>(null);
  const [isSubmittingOcorrencia, setIsSubmittingOcorrencia] = useState(false);

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
    } else {
      setSelectedColabDocuments([]);
      setOcorrenciasList([]);
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
    
    setCandidateData({
      nome: tokenRow.candidato_nome || details.nome || '-',
      cpf: cpfClean || '-',
      rg: tokenRow.candidato_rg || details.rg || '-',
      cargo: tokenRow.candidato_cargo || details.cargo || 'Fisioterapeuta Dermato-Funcional',
      setor: tokenRow.candidato_setor || details.setor || 'Biomedicina',
      salario: details.salario || 'R$ 4.500,00'
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
        alert('Link de Admissão gerado e copiado para a área de transferência!');
      }
    } catch (err: any) {
      alert('Erro ao gerar link de admissão: ' + err.message);
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
        const details = {
          ...candidateData,
          integrado: true,
          pdf_template_base64: approvalTemplateId === 'upload' ? uploadedPdfBase64 : null,
          template_id: approvalTemplateId
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
      alert('Cadastro do colaborador homologado e mesclado com sucesso na Ficha Ativa!');
      
      fetchTokensList();
      fetchColaboradoresList();
    } catch (err: any) {
      alert('Erro ao homologar cadastro: ' + err.message);
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

      // 1. Fetch partial document signed by the candidate
      const { data: signDoc, error: docErr } = await supabase
        .from('documentos_assinados')
        .select('*')
        .eq('colaborador_cpf', details.cpf)
        .eq('status', 'aguardando_rh')
        .maybeSingle();

      if (docErr || !signDoc) throw new Error("Contrato parcial do candidato não encontrado.");

      // 2. Call Deno Edge Function with both signatures
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gerar-contrato-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          userEmail: selectedTokenRow.candidato_email,
          candidateName: selectedTokenRow.candidato_nome,
          candidateCpf: details.cpf,
          signatureBase64: signDoc.assinatura_desenhada,
          signatureRepresentativeBase64: representativeSignatureBase64,
          coordinatorEmail: user.email,
          pdfTemplateBase64: details.pdf_template_base64 || null,
          documentName: `contrato_${details.cpf.replace(/\D/g, '')}_consolidado`
        })
      });

      const res = await response.json();
      if (!res.success) throw new Error(res.error || 'Erro na fusão do contrato bilateral.');

      // 3. Update public.documentos_assinados registry
      const { error: updateDocErr } = await supabase
        .from('documentos_assinados')
        .update({
          status: 'finalizado',
          url_arquivo: res.signedUrl,
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
        .eq('cpf', details.cpf);

      await logAuditoria('FINALIZACAO_ADMISSAO_CONJUNTA', { candidato: selectedTokenRow.candidato_nome, cpf: details.cpf, document_hash: res.documentHash });
      alert('Contrato assinado bilateralmente com sucesso! Admissão concluída.');

      fetchTokensList();
      fetchColaboradoresList();
    } catch (err: any) {
      alert('Erro ao finalizar admissão: ' + err.message);
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
        alert("Nenhum log disponível para exportação.");
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
      alert("Erro ao exportar logs: " + err.message);
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

      alert('Ocorrência de jornada registrada com sucesso!');

      // Reset form
      setOcTipo('Atraso');
      setOcData(new Date().toISOString().split('T')[0]);
      setOcDesvio('');
      setOcJustificativa('');
      setOcFile(null);
      setIsRegisteringOcorrencia(false);

      // Refresh list
      fetchOcorrencias(activeColaboradorForDrawer.id);
    } catch (err: any) {
      alert('Erro ao registrar ocorrência: ' + err.message);
    } finally {
      setIsSubmittingOcorrencia(false);
    }
  };

  const handleCadastrarColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cadastroNome.trim() || !cadastroCpf.trim() || !cadastroCargo.trim() || !cadastroAdmissao) {
      alert('Por favor, preencha todos os campos obrigatórios.');
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
      alert(`Colaborador ${cadastroNome.trim()} cadastrado com sucesso!`);
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
      alert('Erro ao cadastrar colaborador: ' + err.message);
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
    // Inscrição Supabase Realtime para a tabela documentos_assinados
    const channel = supabase
      .channel('documentos-assinados-realtime-rh')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'documentos_assinados' },
        (payload) => {
          console.log('Realtime notification received:', payload);
          // Atualiza as listas automaticamente e emite aviso visual
          fetchTokensList();
          fetchColaboradoresList();
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
    try {
      const [colabsRes, benefitsRes, assocRes] = await Promise.all([
        supabase.from('colaboradores').select('*').order('nome', { ascending: true }),
        supabase.from('beneficios').select('*'),
        supabase.from('colaborador_beneficios').select('*')
      ]);

      if (colabsRes.error) throw colabsRes.error;
      
      if (colabsRes.data) {
        setColaboradoresList(colabsRes.data);
        if (!selectedColaboradorId && colabsRes.data.length > 0) {
          setSelectedColaboradorId(colabsRes.data[0].id);
          loadColaboradorOnboarding(colabsRes.data[0]);
        } else if (colabsRes.data.length > 0) {
          const activeCol = colabsRes.data.find(c => c.id === selectedColaboradorId);
          if (activeCol) loadColaboradorOnboarding(activeCol);
        }
      } else {
        setColaboradoresList([]);
      }

      if (benefitsRes.data) setDbBenefits(benefitsRes.data);
      if (assocRes.data) setDbColaboradorBeneficios(assocRes.data);

    } catch (err) {
      console.error('Error fetching colaboradores and benefits:', err);
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
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'geral' | 'turnover' | 'saude' | 'compensacao' | 'juridico'>('geral');

  // --- MÓDULO 5: DASHBOARD KPIs (dados reais) ---
  const [kpiAtivos, setKpiAtivos] = useState(0);
  const [kpiContratos, setKpiContratos] = useState(0);
  const [kpiAdmissoesP, setKpiAdmissoesP] = useState(0);
  const [kpiAsoVencer, setKpiAsoVencer] = useState<any[]>([]);
  const [kpiFeriasVencer, setKpiFeriasVencer] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  // Drawer edit mode
  const [isEditingDrawer, setIsEditingDrawer] = useState(false);
  const [drawerEditData, setDrawerEditData] = useState<any>({});
  const [isSavingDrawer, setIsSavingDrawer] = useState(false);

  const fetchDashboardKpis = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

      const [ativos, contratos, admPend, asoQ, feriasQ, logs] = await Promise.all([
        supabase.from('colaboradores').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
        supabase.from('documentos_assinados').select('id', { count: 'exact', head: true }).eq('status', 'finalizado'),
        supabase.from('admission_tokens').select('id', { count: 'exact', head: true }).in('status', ['aguardando_homologacao', 'aguardando_assinatura', 'aguardando_assinatura_rh']),
        supabase.from('colaboradores').select('id, nome, cargo, setor, data_aso_vencimento').eq('status', 'ativo').lte('data_aso_vencimento', in30).gte('data_aso_vencimento', today).order('data_aso_vencimento'),
        supabase.from('colaboradores').select('id, nome, cargo, setor, data_ferias_vencimento').eq('status', 'ativo').lte('data_ferias_vencimento', in30).gte('data_ferias_vencimento', today).order('data_ferias_vencimento'),
        supabase.from('logs_auditoria').select('usuario_email, acao, criado_em').order('criado_em', { ascending: false }).limit(5)
      ]);

      setKpiAtivos(ativos.count ?? 0);
      setKpiContratos(contratos.count ?? 0);
      setKpiAdmissoesP(admPend.count ?? 0);
      setKpiAsoVencer(asoQ.data ?? []);
      setKpiFeriasVencer(feriasQ.data ?? []);
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
      await logAuditoria('EDICAO_FICHA_COLABORADOR', { colaborador_id: activeColaboradorForDrawer.id, campos: Object.keys(drawerEditData) });
      setIsEditingDrawer(false);
      fetchColaboradoresList();
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setIsSavingDrawer(false);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      const [logsRes, colabsRes, ocorrenciasRes, indicadoresRes] = await Promise.all([
        supabase.from('logs_auditoria').select('*').order('criado_em', { ascending: false }).limit(8),
        supabase.from('colaboradores').select('*'),
        supabase.from('ocorrencias_jornada').select('*, colaboradores(nome, setor)'),
        supabase.from('indicadores_trabalhistas').select('*')
      ]);

      if (logsRes.data) setLogsAuditoria(logsRes.data);
      if (colabsRes.data) setColaboradoresList(colabsRes.data);
      if (ocorrenciasRes.data) setOcorrenciasAnalytics(ocorrenciasRes.data);
      if (indicadoresRes.data) setIndicadoresTrabalhistas(indicadoresRes.data);
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
      alert('Erro ao carregar anexo: ' + err.message);
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
        const val = assoc.valor_customizado ?? benefit.valor_padrao;
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
    if (activePath === '/app/analytics') {
      fetchAnalyticsData();
    }
  }, [activePath]);



  // Filters computed list for employees board
  const filteredAndSortedColaboradores = colaboradoresList
    .filter(c => {
      const matchesSearch = 
        c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.cpf.includes(searchQuery);
      
      const matchesSector = filterSetor === 'Todos' || c.setor === filterSetor;
      
      let matchesStatus = true;
      if (filterStatus === 'Ativo') {
        matchesStatus = c.status === 'ativo';
      } else if (filterStatus === 'Onboarding') {
        matchesStatus = c.status === 'pendente';
      }
      
      return matchesSearch && matchesSector && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(a.data_admissao).getTime();
      const dateB = new Date(b.data_admissao).getTime();
      return sortOrder === 'antigo' ? dateA - dateB : dateB - dateA;
    });

  // Sidebar Links array builder
  const sidebarLinks = [
    ...(hasFullAccess ? [
      { path: '/app/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
      { path: '/app/colaboradores', label: 'Colaboradores', icon: <Users size={16} /> },
      { path: '/app/onboarding', label: 'Onboarding', icon: <ClipboardCheck size={16} /> },
      { path: '/app/documentos', label: 'Documentos', icon: <FileText size={16} /> },
      { path: '/app/beneficios', label: 'Benefícios', icon: <Gift size={16} /> }
    ] : []),
    { path: '/app/analytics', label: 'Analytics', icon: <TrendingUp size={16} /> }
  ];

  const renderSidebarContent = () => (
    <div className="flex flex-col justify-between h-full">
      <div className="space-y-8">
        
        {/* Branding header */}
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold tracking-tight text-sm ${
            theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]'
          }`}>
            ITO
          </div>
          <span className="font-semibold tracking-wider text-base">OMNI ITO</span>
        </div>

        {/* Links list */}
        <nav className="flex flex-col gap-1.5">
          {sidebarLinks.map((link) => {
            const isActive = activePath === link.path;
            return (
              <button
                key={link.path}
                onClick={() => {
                  navigate(link.path);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all relative ${
                  isActive 
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
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Section Bottom */}
      <div className="pt-6 border-t border-white/5 space-y-4">
        
        {/* Toggle Theme inline */}
        <div className="flex items-center justify-between text-xs opacity-75">
          <span>Aparência</span>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`p-1.5 rounded-lg border transition-colors ${
              theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'
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
            className={`p-1.5 rounded-lg border flex-shrink-0 transition-colors ${
              theme === 'dark' ? 'border-white/10 hover:bg-rose-500/15 hover:text-rose-500' : 'border-black/10 hover:bg-rose-500/15 hover:text-rose-500'
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
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-500 ${
      theme === 'dark' ? 'bg-[#0D0D0C] text-[#E5DFD3]' : 'bg-[#FBFBFA] text-[#0A0A0A]'
    }`}>
      
      {/* 1. Desktop Left Sidebar */}
      <aside className={`hidden md:block w-64 border-r fixed inset-y-0 left-0 p-6 z-40 transition-colors ${
        theme === 'dark' ? 'border-white/10 bg-black/20 backdrop-blur-md' : 'border-black/5 bg-[#F4F4F3]'
      }`}>
        {renderSidebarContent()}
      </aside>

      {/* 2. Mobile Top Navigation Header */}
      <header className={`md:hidden sticky top-0 z-50 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between transition-colors ${
        theme === 'dark' ? 'border-white/10 bg-[#0D0D0C]/80' : 'border-black/5 bg-[#FBFBFA]/80'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold tracking-tight text-sm ${
            theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]'
          }`}>
            ITO
          </div>
          <span className="font-semibold tracking-wider text-base">OMNI ITO</span>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-[9px] px-2 py-0.5 rounded border font-mono ${
            role === 'coordenadora_rh' || user?.email === 'ito.thiagosilva@gmail.com'
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
          }`}>
            {role === 'coordenadora_rh' || user?.email === 'ito.thiagosilva@gmail.com' ? 'ADM' : 'TI'}
          </span>
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className={`p-2 rounded-lg border transition-colors ${
              theme === 'dark' ? 'border-white/10 bg-[#0D0D0C]' : 'border-black/10 bg-[#FBFBFA]'
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
          <aside className={`fixed inset-y-0 left-0 w-64 p-6 z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
            theme === 'dark' ? 'bg-[#0D0D0C] border-r border-white/10' : 'bg-[#FBFBFA] border-r border-black/10'
          }`}>
            {renderSidebarContent()}
          </aside>
        </>
      )}

      {/* 4. Main Workspace */}
      <div className="flex-1 flex flex-col min-h-screen justify-between md:pl-64">
        
        <main className="max-w-6xl w-full mx-auto px-6 py-8 flex-1">
          
          <div className={`rounded-2xl border p-6 md:p-8 transition-colors ${
            theme === 'dark' ? 'glass-card-dark' : 'glass-card-light'
          }`}>
            
            {/* MÓDULO 5: DASHBOARD OVERVIEW */}
            {activePath === '/app/dashboard' && hasFullAccess && (
              <div className="space-y-8 animate-fadeIn">
                <div className="pb-6 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#E5DFD3]/20">VISÃO GERAL</span>
                    <h3 className="text-xl font-bold">Painel de Controle Omni</h3>
                  </div>
                  <p className="text-xs opacity-65 mt-1">Bem-vindo ao centro operacional do Instituto Thiago Omena.</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Colaboradores Ativos', value: kpiAtivos, color: 'text-emerald-500', sub: 'na folha' },
                    { label: 'Contratos Finalizados', value: kpiContratos, color: 'text-sky-400', sub: 'assinados bilateralmente' },
                    { label: 'Admissões em Andamento', value: kpiAdmissoesP, color: 'text-amber-500', sub: 'aguardando conclusão' },
                    { label: 'Alertas (30 dias)', value: kpiAsoVencer.length + kpiFeriasVencer.length, color: kpiAsoVencer.length + kpiFeriasVencer.length > 0 ? 'text-rose-400' : 'text-emerald-500', sub: 'ASO + férias a vencer' }
                  ].map((k, i) => (
                    <div key={i} className={`p-5 rounded-xl border flex flex-col justify-between h-28 ${
                      theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.02] border-black/5'
                    }`}>
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">{k.label}</span>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-extrabold font-mono ${k.color}`}>{k.value}</span>
                        <span className="text-[10px] opacity-50">{k.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Alertas Reais: ASO + Férias */}
                {(kpiAsoVencer.length > 0 || kpiFeriasVencer.length > 0) && (
                  <div className={`rounded-2xl border p-5 ${
                    theme === 'dark' ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50 border-rose-200'
                  }`}>
                    <div className="flex items-center gap-2 text-rose-500 mb-4">
                      <AlertTriangle size={16} />
                      <span className="text-[10px] font-bold tracking-wider uppercase">Alertas — Próximos 30 dias</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {kpiAsoVencer.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold opacity-60 uppercase tracking-wider">ASO a Vencer</h4>
                          {kpiAsoVencer.map((c: any) => (
                            <div key={c.id} className={`p-2.5 rounded-lg border text-xs flex justify-between ${
                              theme === 'dark' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-100 border-rose-200'
                            }`}>
                              <span className="font-semibold truncate">{c.nome.split(' ').slice(0,2).join(' ')}</span>
                              <span className="font-mono opacity-70">{new Date(c.data_aso_vencimento).toLocaleDateString('pt-BR')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {kpiFeriasVencer.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold opacity-60 uppercase tracking-wider">Férias a Vencer</h4>
                          {kpiFeriasVencer.map((c: any) => (
                            <div key={c.id} className={`p-2.5 rounded-lg border text-xs flex justify-between ${
                              theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-100 border-amber-200'
                            }`}>
                              <span className="font-semibold truncate">{c.nome.split(' ').slice(0,2).join(' ')}</span>
                              <span className="font-mono opacity-70">{new Date(c.data_ferias_vencimento).toLocaleDateString('pt-BR')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                  <div className="lg:col-span-2 space-y-4">
                    <h4 className="text-xs font-bold tracking-widest uppercase opacity-65">Ações Rápidas</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {[
                        { icon: <Users size={18} />, label: 'Novo Colaborador', desc: 'Cadastrar funcionário direto.', action: () => { navigate('/app/colaboradores'); setColabSubTab('cadastrar'); } },
                        { icon: <ClipboardCheck size={18} />, label: 'Registrar Ocorrência', desc: 'Atraso, falta ou descumprimento.', action: () => navigate('/app/colaboradores') },
                        { icon: <FileText size={18} />, label: 'Emitir Contrato', desc: 'Gerar termo de imagem ou contrato.', action: () => navigate('/app/documentos') },
                        { icon: <Zap size={18} className="text-amber-500" />, label: 'Pendência Folha', desc: 'Verificar divergências de pagamento.', action: () => navigate('/app/analytics') }
                      ].map((item, i) => (
                        <button
                          key={i}
                          onClick={item.action}
                          className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-colors ${
                            theme === 'dark' ? 'border-white/10 hover:bg-white/5 bg-[#121211]' : 'border-black/10 hover:bg-black/5 bg-black/[0.01]'
                          }`}
                        >
                          <span className="mt-0.5 opacity-80">{item.icon}</span>
                          <div>
                            <span className="block font-bold">{item.label}</span>
                            <span className="text-[10px] opacity-60 block mt-0.5">{item.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`p-5 rounded-xl border space-y-4 ${
                    theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.02] border-black/5'
                  }`}>
                    <h4 className="text-xs font-bold tracking-widest uppercase opacity-65 flex items-center gap-1.5">
                      <History size={14} className="text-emerald-500" /> Atividades Recentes
                    </h4>
                    <div className="space-y-3 text-[11px]">
                      {recentLogs.length > 0 ? recentLogs.map((log: any, i: number) => (
                        <div key={i} className="flex justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                          <span className="opacity-70 truncate max-w-[160px]">{log.acao?.replace(/_/g,' ')}</span>
                          <span className="font-mono opacity-50 text-[10px] ml-2 shrink-0">
                            {new Date(log.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )) : (
                        <p className="opacity-40 italic text-[10px]">Sem atividade registrada.</p>
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
                      ['visao','Visão Geral'],
                      ['modelos','Modelos'],
                      ['envios','Envios'],
                      ['pendencias','Pendências'],
                      ['formularios','Formulários'],
                      ['envio-form','Envio de Formulários'],
                      ['historico','Histórico'],
                    ] as [typeof docsSubTab, string][]).map(([key, label]) => (
                      <button key={key} onClick={() => { setDocsSubTab(key); if(key==='historico') fetchDocsHistorico(); }}
                        className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-all ${
                          docsSubTab === key
                            ? (theme==='dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]')
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
                        <div key={i} className={`p-5 rounded-xl border flex flex-col justify-between h-24 ${
                          theme==='dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.02] border-black/5'
                        }`}>
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">{k.label}</span>
                          <span className={`text-3xl font-extrabold font-mono ${k.color}`}>{k.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className={`p-5 rounded-xl border space-y-3 ${ theme==='dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.02] border-black/5' }`}>
                        <h4 className="text-xs font-bold uppercase tracking-wider opacity-60">Ações Rápidas</h4>
                        {[
                          { label: 'Novo Modelo de Documento', icon: <FileText size={15}/>, action: () => { setDocsSubTab('modelos'); setShowNewModeloForm(true); } },
                          { label: 'Criar Formulário', icon: <ClipboardCheck size={15}/>, action: () => setDocsSubTab('formularios') },
                          { label: 'Ver Pendências', icon: <AlertTriangle size={15} className="text-amber-500"/>, action: () => setDocsSubTab('pendencias') },
                          { label: 'Ver Histórico Completo', icon: <History size={15}/>, action: () => { setDocsSubTab('historico'); fetchDocsHistorico(); } },
                        ].map((a,i) => (
                          <button key={i} onClick={a.action}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border text-xs text-left transition-colors ${
                              theme==='dark' ? 'border-white/5 hover:bg-white/5' : 'border-black/5 hover:bg-black/5'
                            }`}>
                            <span className="opacity-70">{a.icon}</span>
                            <span className="font-semibold">{a.label}</span>
                          </button>
                        ))}
                      </div>
                      <div className={`p-5 rounded-xl border space-y-3 ${ theme==='dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.02] border-black/5' }`}>
                        <h4 className="text-xs font-bold uppercase tracking-wider opacity-60">Modelos Disponíveis</h4>
                        {modelos.length > 0 ? modelos.map((m: any) => (
                          <div key={m.id} className={`p-3 rounded-lg border flex items-center justify-between text-xs ${ theme==='dark' ? 'border-white/5 bg-white/[0.02]' : 'border-black/5 bg-black/[0.01]' }`}>
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
                        className={`text-xs px-4 py-2 rounded-lg font-bold border transition-colors ${
                          showNewModeloForm ? 'border-rose-500/30 text-rose-400 bg-rose-500/10' : (theme==='dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-white')
                        }`}>{showNewModeloForm ? 'Cancelar' : '+ Novo Modelo'}</button>
                    </div>

                    {/* New Modelo Form */}
                    {showNewModeloForm && (
                      <div className={`p-5 rounded-xl border space-y-4 animate-fadeIn ${ theme==='dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10' }`}>
                        <h5 className="text-xs font-bold uppercase tracking-wider opacity-60">Criar Novo Modelo</h5>
                        <div>
                          <label className="block text-[9px] font-bold uppercase opacity-50 mb-1">Título do Modelo *</label>
                          <input type="text" value={newModeloTitulo} onChange={e => setNewModeloTitulo(e.target.value)}
                            placeholder="Ex: Contrato de Experiência 45d"
                            className={`w-full text-xs p-2.5 rounded-lg border bg-transparent focus:outline-none ${ theme==='dark' ? 'border-white/15' : 'border-black/15' }`} />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase opacity-50 mb-1">Conteúdo / Texto do Modelo</label>
                          <textarea rows={6} value={newModeloConteudo} onChange={e => setNewModeloConteudo(e.target.value)}
                            placeholder="Use {{nome}}, {{cpf}}, {{setor}} como variáveis..."
                            className={`w-full text-xs p-2.5 rounded-lg border bg-transparent resize-none focus:outline-none font-mono ${ theme==='dark' ? 'border-white/15' : 'border-black/15' }`} />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase opacity-50 mb-1">Ou importar PDF base</label>
                          <input type="file" accept="application/pdf" onChange={handlePdfUpload}
                            className={`w-full text-[10px] p-1.5 rounded-lg border ${ theme==='dark' ? 'border-white/10 bg-[#121211]' : 'border-black/10' }`} />
                          {uploadedPdfBase64 && <p className="text-[10px] text-emerald-500 mt-1">✓ PDF importado: {uploadedPdfName}</p>}
                        </div>
                        <button
                          disabled={isSavingModelo || !newModeloTitulo.trim()}
                          onClick={async () => {
                            setIsSavingModelo(true);
                            try {
                              await supabase.from('modelos_documentos').insert({ titulo: newModeloTitulo.trim(), conteudo: newModeloConteudo.trim() || uploadedPdfBase64 });
                              await logAuditoria('CRIACAO_MODELO_DOCUMENTO', { titulo: newModeloTitulo });
                              setShowNewModeloForm(false); setNewModeloTitulo(''); setNewModeloConteudo('');
                              fetchModelos();
                            } catch(e: any) { alert('Erro: ' + e.message); }
                            finally { setIsSavingModelo(false); }
                          }}
                          className={`text-xs px-5 py-2 rounded-lg font-bold ${ theme==='dark' ? 'bg-[#E5DFD3] text-black' : 'bg-[#0A0A0A] text-white' } disabled:opacity-50`}>
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
                            className={`w-full text-left p-3 rounded-lg border text-xs transition-colors ${
                              selectedModeloId === m.id
                                ? (theme==='dark' ? 'border-[#E5DFD3]/30 bg-[#E5DFD3]/5 text-[#E5DFD3]' : 'border-black/30 bg-black/5')
                                : (theme==='dark' ? 'border-white/5 hover:bg-white/5' : 'border-black/5 hover:bg-black/5')
                            }`}>
                            <span className="font-semibold block">{m.titulo}</span>
                            <span className="opacity-40 text-[9px]">ID: {m.id}</span>
                          </button>
                        ))}
                        <div className="pt-2">
                          <label className="block text-[9px] font-bold uppercase opacity-50 mb-1">Importar PDF Local</label>
                          <input type="file" accept="application/pdf" onChange={handlePdfUpload}
                            className={`w-full text-[10px] p-1.5 rounded border ${ theme==='dark' ? 'border-white/10 bg-[#121211]' : 'border-black/10' }`} />
                          {uploadedPdfBase64 && <p className="text-[10px] text-emerald-500 mt-1">✓ {uploadedPdfName}</p>}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          {[{l:'Nome',s:varNome,f:setVarNome},{l:'CPF',s:varCpf,f:setVarCpf},{l:'Setor',s:varSetor,f:setVarSetor}].map(({l,s,f})=>(
                            <div key={l}>
                              <label className="block text-[9px] font-bold uppercase opacity-50 mb-1">{l}</label>
                              <input type="text" value={s} onChange={e=>f(e.target.value)} className={`w-full text-xs p-2 rounded border bg-transparent ${ theme==='dark'?'border-white/10':'border-black/10' }`}/>
                            </div>
                          ))}
                        </div>
                        <div className={`p-4 rounded-xl border text-xs leading-relaxed font-serif ${ theme==='dark' ? 'bg-[#161615] border-white/5' : 'bg-black/[0.02] border-black/5' }`}>
                          <span className="block text-[9px] font-bold uppercase opacity-50 mb-2 tracking-wider">Pré-visualização</span>
                          {selectedModeloId === 'upload' ? (
                            <p className="text-emerald-500 font-mono text-[10px]">📄 PDF importado: {uploadedPdfName}</p>
                          ) : (
                            <div className="whitespace-pre-wrap opacity-80 min-h-[100px]">{renderTemplateText()}</div>
                          )}
                        </div>
                        {/* Signature canvas */}
                        <div>
                          <label className="block text-[9px] font-bold uppercase opacity-50 mb-1">Assinatura Biométrica</label>
                          <div className={`relative border rounded-xl overflow-hidden ${ theme==='dark' ? 'bg-[#121211] border-white/15' : 'bg-black/5 border-black/15' }`}>
                            <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                              onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                              className="w-full cursor-crosshair h-[130px] bg-transparent" />
                          </div>
                          <div className="flex gap-3 mt-2">
                            <button onClick={clearCanvas} className={`text-xs px-3 py-1.5 rounded border ${ theme==='dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10' }`}><Trash2 size={11} className="inline mr-1"/>Limpar</button>
                            <button onClick={saveSignature} disabled={sigPointsCount < 5 || signatureSaved}
                              className={`text-xs px-4 py-1.5 rounded font-bold ${ theme==='dark' ? 'bg-[#E5DFD3] text-black' : 'bg-[#0A0A0A] text-white' } disabled:opacity-50`}>
                              <Signature size={11} className="inline mr-1"/>Registrar Assinatura
                            </button>
                            {signatureSaved && (
                              <button onClick={handleGeneratePdf} disabled={isGeneratingPdf}
                                className="text-xs px-4 py-1.5 rounded font-bold bg-emerald-500 text-white disabled:opacity-50">
                                {isGeneratingPdf ? 'Gerando...' : 'Gerar PDF'}
                              </button>
                            )}
                          </div>
                          {signatureSaved && generatedPdfResult && (
                            <div className="mt-3 text-xs p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold">{generatedPdfResult.message}</span>
                                <a href={generatedPdfResult.signedUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline text-[10px] font-bold">Abrir PDF <ExternalLink size={10}/></a>
                              </div>
                              <span className="font-mono text-[9px] break-all opacity-70">{generatedPdfResult.documentHash}</span>
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
                          const statusMap: Record<string, {label:string; color:string}> = {
                            'pendente_preenchimento': { label: 'Preenchendo', color: 'bg-sky-500/10 border-sky-500/20 text-sky-400' },
                            'aguardando_homologacao': { label: 'Aguard. Homologação', color: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
                            'aguardando_assinatura': { label: 'Aguard. Assinatura', color: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
                            'aguardando_assinatura_rh': { label: 'Aguard. RH Assinar', color: 'bg-orange-500/10 border-orange-500/20 text-orange-400' },
                            'concluido': { label: 'Concluído ✓', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
                          };
                          const st = statusMap[t.status] || { label: t.status, color: 'bg-white/5 border-white/10 text-white' };
                          return (
                            <div key={t.id} className={`p-4 rounded-xl border flex items-center justify-between ${ theme==='dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.02] border-black/5' }`}>
                              <div>
                                <span className="text-sm font-semibold block">{t.candidato_nome || '—'}</span>
                                <span className="text-[10px] opacity-50 font-mono">{t.token?.slice(0,20)}...</span>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${st.color}`}>{st.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={`p-8 rounded-xl border text-center ${ theme==='dark' ? 'border-white/5 bg-[#121211]' : 'border-black/5 bg-black/[0.02]' }`}>
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
                      {tokensList.filter((t:any) => t.status !== 'concluido').length > 0 ? (
                        tokensList.filter((t:any) => t.status !== 'concluido').map((t:any) => (
                          <div key={t.id} className={`p-4 rounded-xl border flex items-center justify-between ${ theme==='dark' ? 'bg-rose-500/5 border-rose-500/15' : 'bg-rose-50 border-rose-200' }`}>
                            <div>
                              <span className="text-sm font-semibold block text-rose-500">{t.candidato_nome || 'Candidato'}</span>
                              <span className="text-[10px] opacity-60 capitalize">{t.status?.replace(/_/g,' ')}</span>
                            </div>
                            <AlertTriangle size={16} className="text-rose-400 opacity-70" />
                          </div>
                        ))
                      ) : (
                        <div className={`p-8 rounded-xl border text-center ${ theme==='dark' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50' }`}>
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
                    <div className={`p-5 rounded-xl border space-y-4 ${ theme==='dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10' }`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-bold uppercase opacity-50 mb-1">Colaborador Destinatário</label>
                          <select className={`w-full text-xs p-2.5 rounded-lg border bg-transparent ${ theme==='dark' ? 'border-white/10 bg-[#121211]' : 'border-black/10 bg-white' }`}>
                            <option value="">Selecionar colaborador...</option>
                            {colaboradoresList.map((c:any) => (
                              <option key={c.id} value={c.id}>{c.nome} — {c.cargo}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase opacity-50 mb-1">Formulário a Enviar</label>
                          <select className={`w-full text-xs p-2.5 rounded-lg border bg-transparent ${ theme==='dark' ? 'border-white/10 bg-[#121211]' : 'border-black/10 bg-white' }`}>
                            <option value="">Selecionar formulário...</option>
                            <option value="avaliacao">Avaliação de Desempenho</option>
                            <option value="pesquisa">Pesquisa de Clima</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold uppercase opacity-50 mb-1">Prazo de Resposta</label>
                        <input type="date" className={`text-xs p-2.5 rounded-lg border bg-transparent ${ theme==='dark' ? 'border-white/10' : 'border-black/10' }`} />
                      </div>
                      <button className={`text-xs px-5 py-2.5 rounded-lg font-bold ${ theme==='dark' ? 'bg-[#E5DFD3] text-black hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-white hover:bg-[#2A2A2A]' }`}>
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
                        {docsHistorico.map((doc:any) => (
                          <div key={doc.id} className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${ theme==='dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.02] border-black/5' }`}>
                            <div>
                              <span className="font-semibold block">{doc.nome_colaborador || doc.cpf_colaborador || '—'}</span>
                              <span className="opacity-50 text-[10px]">
                                {doc.documento_id === '1' ? 'Termo de Imagem' : (doc.documento_id === '2' ? 'Contrato Experiência' : 'Documento')} &nbsp;·&nbsp;
                                {doc.assinado_em ? new Date(doc.assinado_em).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${
                                doc.status === 'finalizado' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              }`}>{doc.status === 'finalizado' ? 'Finalizado' : doc.status}</span>
                              {doc.url_arquivo && (
                                <a href={doc.url_arquivo} target="_blank" rel="noreferrer" className="p-1 rounded hover:bg-white/10 opacity-70 hover:opacity-100">
                                  <ExternalLink size={12}/>
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`p-8 rounded-xl border text-center ${ theme==='dark' ? 'border-white/5 bg-[#121211]' : 'border-black/5 bg-black/[0.02]' }`}>
                        <p className="text-xs opacity-40 italic">Nenhum documento assinado encontrado no banco de dados.</p>
                      </div>
                    )}

                    {/* Integridade */}
                    <div className={`p-4 rounded-xl border space-y-3 ${ theme==='dark' ? 'bg-[#181816] border-white/5' : 'bg-black/[0.03] border-black/5' }`}>
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
                      className={`text-xs px-4 py-1.5 rounded font-bold transition-all ${
                        colabSubTab === 'quadro'
                          ? (theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]')
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      Quadro de Funcionários
                    </button>
                    <button
                      onClick={() => setColabSubTab('admissao')}
                      className={`text-xs px-4 py-1.5 rounded font-bold transition-all ${
                        colabSubTab === 'admissao'
                          ? (theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]')
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      Processo de Admissão
                    </button>
                    <button
                      onClick={() => setColabSubTab('cadastrar')}
                      className={`text-xs px-4 py-1.5 rounded font-bold transition-all ${
                        colabSubTab === 'cadastrar'
                          ? (theme === 'dark' ? 'bg-emerald-500 text-white' : 'bg-emerald-600 text-white')
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      + Cadastrar
                    </button>
                  </div>
                </div>

                {/* Sub-tab 1: Quadro de Funcionários (Time Ativo) */}
                {colabSubTab === 'quadro' && (
                  <div className="space-y-6 animate-fadeIn">
                    
                    {/* Filters Toolbar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                      
                      {/* Search box */}
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold uppercase opacity-60 mb-1 tracking-wider">Busca rápida</label>
                        <input
                          type="text"
                          placeholder="Buscar por Nome ou CPF..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className={`w-full text-xs p-2.5 rounded-lg border bg-transparent focus:outline-none ${
                            theme === 'dark' ? 'border-white/10 focus:ring-1 focus:ring-white' : 'border-black/15 focus:ring-1 focus:ring-black'
                          }`}
                        />
                      </div>

                      {/* Dropdown Setor */}
                      <div>
                        <label className="block text-[9px] font-bold uppercase opacity-60 mb-1 tracking-wider">Filtrar Setor</label>
                        <select
                          value={filterSetor}
                          onChange={(e) => setFilterSetor(e.target.value)}
                          className={`w-full text-xs p-2.5 rounded-lg border bg-transparent focus:outline-none ${
                            theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/15 text-black bg-white'
                          }`}
                        >
                          <option value="Todos">Todos os Setores</option>
                          <option value="Call Center">Call Center</option>
                          <option value="Recepção">Recepção</option>
                          <option value="Financeiro">Financeiro</option>
                          <option value="Smartshape">Smartshape</option>
                          <option value="Biomedicina">Biomedicina</option>
                          <option value="Enfermagem">Enfermagem</option>
                          <option value="Farmácia">Farmácia</option>
                          <option value="Serviços Gerais">Serviços Gerais</option>
                          <option value="Nutrição">Nutrição</option>
                        </select>
                      </div>

                      {/* Dropdown Status */}
                      <div>
                        <label className="block text-[9px] font-bold uppercase opacity-60 mb-1 tracking-wider">Status</label>
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className={`w-full text-xs p-2.5 rounded-lg border bg-transparent focus:outline-none ${
                            theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/15 text-black bg-white'
                          }`}
                        >
                          <option value="Todos">Todos os Status</option>
                          <option value="Ativo">Ativo</option>
                          <option value="Onboarding">Onboarding</option>
                        </select>
                      </div>

                      {/* Sorting Tenure Toggle */}
                      <div>
                        <label className="block text-[9px] font-bold uppercase opacity-60 mb-1 tracking-wider">Tempo de Casa</label>
                        <button
                          onClick={() => setSortOrder(sortOrder === 'antigo' ? 'recente' : 'antigo')}
                          className={`w-full text-xs p-2.5 rounded-lg border bg-transparent font-semibold transition-all flex items-center justify-between ${
                            theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/15 hover:bg-black/5'
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
                          <tr className={`border-b opacity-75 font-semibold ${
                            theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-black/5 bg-black/5'
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
                            filteredAndSortedColaboradores.map((c) => (
                              <tr 
                                key={c.id} 
                                onClick={() => setActiveColaboradorForDrawer(c)}
                                className={`cursor-pointer transition-colors ${
                                  theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'
                                }`}
                              >
                                <td className="p-3 font-semibold">{c.nome}</td>
                                <td className="p-3 font-mono opacity-85">{c.cpf}</td>
                                <td className="p-3 opacity-80">{c.cargo}</td>
                                <td className="p-3 font-mono opacity-80">{c.salario || '—'}</td>
                                <td className="p-3 font-mono font-bold text-emerald-500">{getSalarioLiquido(c).liquido}</td>
                                <td className="p-3 opacity-80">{c.setor}</td>
                                <td className="p-3 font-mono opacity-70">
                                  {new Date(c.data_admissao).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="p-3 font-medium text-emerald-500">
                                  {calculateTenure(c.data_admissao)}
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    c.status === 'ativo' 
                                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                                      : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                  }`}>
                                    {c.status === 'ativo' ? 'Ativo' : 'Onboarding'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="text-center p-8 opacity-50 italic">
                                Nenhum colaborador encontrado com os filtros selecionados.
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
                    <div className={`p-6 rounded-xl border space-y-6 ${
                      theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10'
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
                              className={`w-full text-xs p-2.5 rounded-lg border bg-transparent focus:outline-none focus:ring-1 ${
                                theme === 'dark' ? 'border-white/15 focus:ring-white/40' : 'border-black/15 focus:ring-black/40'
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
                              className={`w-full text-xs p-2.5 rounded-lg border bg-transparent focus:outline-none focus:ring-1 font-mono ${
                                theme === 'dark' ? 'border-white/15 focus:ring-white/40' : 'border-black/15 focus:ring-black/40'
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
                              className={`w-full text-xs p-2.5 rounded-lg border bg-transparent focus:outline-none focus:ring-1 ${
                                theme === 'dark' ? 'border-white/15 focus:ring-white/40' : 'border-black/15 focus:ring-black/40'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase opacity-60 mb-1 tracking-wider">Setor *</label>
                            <select
                              value={cadastroSetor}
                              onChange={(e) => setCadastroSetor(e.target.value)}
                              className={`w-full text-xs p-2.5 rounded-lg border focus:outline-none focus:ring-1 ${
                                theme === 'dark' ? 'border-white/15 focus:ring-white/40 bg-[#121211] text-[#E5DFD3]' : 'border-black/15 focus:ring-black/40 bg-white text-[#0A0A0A]'
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
                              className={`w-full text-xs p-2.5 rounded-lg border bg-transparent focus:outline-none focus:ring-1 ${
                                theme === 'dark' ? 'border-white/15 focus:ring-white/40' : 'border-black/15 focus:ring-black/40'
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
                              className={`w-full text-xs p-2.5 rounded-lg border bg-transparent focus:outline-none focus:ring-1 ${
                                theme === 'dark' ? 'border-white/15 focus:ring-white/40' : 'border-black/15 focus:ring-black/40'
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
                              className={`w-full text-xs p-2.5 rounded-lg border bg-transparent focus:outline-none focus:ring-1 ${
                                theme === 'dark' ? 'border-white/15 focus:ring-white/40' : 'border-black/15 focus:ring-black/40'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Info banner */}
                        <div className={`p-3 rounded-lg border text-xs ${
                          theme === 'dark' ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' : 'bg-sky-500/10 border-sky-500/20 text-sky-700'
                        }`}>
                          <span className="font-bold">ℹ️ Onboarding:</span> O colaborador será cadastrado com status <span className="font-mono font-bold">ativo</span> e os itens de onboarding (benefícios, EPI, biometria) poderão ser marcados na aba de Onboarding logo após o cadastro.
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                          <button
                            type="submit"
                            disabled={isSavingCadastro}
                            className={`text-xs px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-colors ${
                              theme === 'dark' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            } disabled:opacity-50`}
                          >
                            {isSavingCadastro ? 'Salvando...' : '✓ Cadastrar Colaborador'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setColabSubTab('quadro')}
                            className={`text-xs px-4 py-2.5 rounded-lg font-bold border transition-colors ${
                              theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'
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
                    <div className={`p-5 rounded-xl border space-y-4 ${
                      theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10'
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
                            className={`w-full text-xs p-2 rounded border bg-transparent ${
                              theme === 'dark' ? 'border-white/10 focus:ring-1 focus:ring-white' : 'border-black/15 focus:ring-1 focus:ring-black'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase opacity-60 mb-1">E-mail</label>
                          <input
                            type="email"
                            value={newCandidateEmail}
                            onChange={(e) => setNewCandidateEmail(e.target.value)}
                            className={`w-full text-xs p-2 rounded border bg-transparent ${
                              theme === 'dark' ? 'border-white/10 focus:ring-1 focus:ring-white' : 'border-black/15 focus:ring-1 focus:ring-black'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase opacity-60 mb-1">Cargo</label>
                          <input
                            type="text"
                            value={newCandidateCargo}
                            onChange={(e) => setNewCandidateCargo(e.target.value)}
                            className={`w-full text-xs p-2 rounded border bg-transparent ${
                              theme === 'dark' ? 'border-white/10 focus:ring-1 focus:ring-white' : 'border-black/15 focus:ring-1 focus:ring-black'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase opacity-60 mb-1">Setor</label>
                          <input
                            type="text"
                            value={newCandidateSetor}
                            onChange={(e) => setNewCandidateSetor(e.target.value)}
                            className={`w-full text-xs p-2 rounded border bg-transparent ${
                              theme === 'dark' ? 'border-white/10 focus:ring-1 focus:ring-white' : 'border-black/15 focus:ring-1 focus:ring-black'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          onClick={handleGenerateLink}
                          className={`text-xs px-5 py-2.5 rounded-lg font-bold transition-colors ${
                            theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]'
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
                              className={`flex-1 text-xs font-mono p-2 rounded border bg-transparent ${
                                isTokenRevoked ? 'text-rose-500 border-rose-500/20' : 'opacity-70 border-white/10'
                              }`}
                            />
                            <button
                              onClick={toggleTokenStatus}
                              className={`text-xs px-3 py-2 rounded font-bold transition-colors ${
                                isTokenRevoked ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white hover:bg-rose-600'
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
                              className={`text-xs p-1.5 rounded border focus:outline-none bg-transparent ${
                                theme === 'dark' ? 'border-white/10 text-white' : 'border-black/10 text-black'
                              }`}
                            >
                              {tokensList.map(t => {
                                const statMap: Record<string, string> = {
                                  'pendente_preenchimento': 'Preenchendo Ficha',
                                  'aguardando_homologacao': 'Revisar Dados',
                                  'aguardando_assinatura': 'Aguardando Assinatura',
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
                        <div className={`p-4 rounded-xl border space-y-4 ${
                          theme === 'dark' ? 'bg-[#161615] border-white/5' : 'bg-black/[0.02] border-black/5'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase opacity-65">Formulário Recebido (Candidato)</span>
                            {(() => {
                              const selectedTokenRow = tokensList.find(t => t.id === selectedTokenId);
                              return (
                                <span className={`text-xs px-2 py-0.5 border rounded-full font-medium ${
                                  selectedTokenRow?.status === 'concluido'
                                    ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/35'
                                    : selectedTokenRow?.status === 'aguardando_assinatura'
                                    ? 'bg-amber-500/20 text-amber-500 border-amber-500/35'
                                    : 'bg-sky-500/20 text-sky-500 border-sky-500/35'
                                }`}>
                                  {selectedTokenRow?.status === 'concluido' 
                                    ? 'Concluído' 
                                    : selectedTokenRow?.status === 'aguardando_assinatura' 
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

                        <div className={`p-4 rounded-xl border space-y-4 ${
                          theme === 'dark' ? 'bg-[#161615] border-white/5' : 'bg-black/[0.02] border-black/5'
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
                              <div className={`p-4 rounded-xl border space-y-3 mt-4 ${
                                theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10'
                              }`}>
                                <label className="block text-[10px] font-bold uppercase opacity-65 tracking-wider">
                                  Escolher Modelo de Contrato para Envio ao Candidato
                                </label>
                                <select
                                  value={approvalTemplateId}
                                  onChange={(e) => setApprovalTemplateId(e.target.value)}
                                  className={`w-full text-xs p-2.5 rounded border focus:outline-none bg-transparent ${
                                    theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
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
                              <div className={`p-5 rounded-xl border space-y-4 mt-4 animate-fadeIn ${
                                theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10'
                              }`}>
                                <div className="space-y-1">
                                  <h5 className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                                    <Signature size={14} /> Assinatura Conjunta do Representante Legal (RH)
                                  </h5>
                                  <p className="text-[10px] opacity-60">
                                    O candidato já assinou o termo. Desenhe sua assinatura corporativa abaixo para consolidar o contrato de trabalho de forma final.
                                  </p>
                                </div>
                                
                                <div className={`relative border rounded-xl overflow-hidden ${
                                  theme === 'dark' ? 'bg-[#121211] border-white/15' : 'bg-black/5 border-black/15'
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
                                    className={`text-[10px] px-3 py-1.5 rounded border font-medium ${
                                      theme === 'dark' ? 'border-white/10 hover:bg-white/5 text-white' : 'border-black/10 hover:bg-black/5 text-black'
                                    }`}
                                  >
                                    Limpar Quadro
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleFinalizeRepresentativeSignature}
                                    disabled={repSigPointsCount < 5 || isFinishingAdmission}
                                    className={`text-[10px] px-4 py-1.5 rounded font-bold transition-colors ${
                                      theme === 'dark' ? 'bg-[#E5DFD3] text-black hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-white hover:bg-[#2A2A2A]'
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
                                className={`text-xs px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-colors ${
                                  theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]'
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
                          className={`text-[10px] md:text-xs py-2 rounded-lg border font-semibold transition-all ${
                            selectedSector === sector
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
                        className={`w-full text-xs p-2 rounded border focus:outline-none bg-transparent ${
                          theme === 'dark' ? 'border-white/10 text-white' : 'border-black/10 text-black'
                        }`}
                      >
                        {colaboradoresList.map(c => (
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
                      {Object.entries(benefits).map(([key, value]) => (
                        <label 
                          key={key} 
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer ${
                            theme === 'dark' ? 'border-white/5 bg-[#121211] hover:bg-white/[0.02]' : 'border-black/5 bg-black/[0.02] hover:bg-black/[0.04]'
                          }`}
                        >
                          <span className="capitalize opacity-80">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <input
                            type="checkbox"
                            checked={value}
                            disabled={!selectedColaboradorId}
                            onChange={(e) => handleCheckboxChange('benefit', key, e.target.checked)}
                            className="accent-[#E5DFD3] cursor-pointer"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold opacity-80 border-b border-white/10 pb-2">EPIs & Treinamento</h4>
                    <div className="space-y-2 text-xs">
                      {Object.entries(tasks).map(([key, value]) => (
                        <label 
                          key={key} 
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer ${
                            theme === 'dark' ? 'border-white/5 bg-[#121211] hover:bg-white/[0.02]' : 'border-black/5 bg-black/[0.02] hover:bg-black/[0.04]'
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
                    <div className={`p-5 rounded-xl border space-y-4 text-center ${
                      theme === 'dark' ? 'bg-[#181816] border-white/5' : 'bg-black/[0.03] border-black/5'
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
                        className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-all ${
                          analyticsSubTab === tab.key
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
                    />
                    
                    <div className={`p-5 rounded-xl border space-y-4 ${
                      theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10'
                    }`}>
                      <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <h4 className="text-xs font-bold tracking-widest uppercase opacity-65 flex items-center gap-2">
                          <History size={16} className="text-emerald-500" /> Logs de Auditoria (`logs_auditoria` - Supabase)
                        </h4>
                        <button
                          onClick={exportLogsToCsv}
                          className={`text-[10px] px-3 py-1.5 rounded font-bold uppercase transition-all flex items-center gap-1.5 ${
                            theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-white' : 'bg-black/5 hover:bg-black/10 border border-black/10 text-black'
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
                                <td className="py-2.5 font-mono opacity-50">{l.ip_address || '192.168.45.102'}</td>
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

          </div>
        </main>

        {/* Footer */}
        <footer className={`py-6 border-t text-center text-xs opacity-50 transition-colors ${
          theme === 'dark' ? 'border-white/5 bg-[#0D0D0C]' : 'border-black/5 bg-[#FBFBFA]'
        }`}>
          <p>© 2026 Instituto Thiago Omena. Sistema OMNI ITO - Uso Exclusivo e Proprietário.</p>
          <p className="mt-0.5 font-mono text-[9px]">Autenticado e Monitorado via Row Level Security (RLS)</p>
        </footer>

      </div>



      {/* 5. Side Drawer Onyx for Dossier/Prontuário */}
      {activeColaboradorForDrawer && (
        <>
          {/* Backdrop */}
          <div 
            onClick={() => setActiveColaboradorForDrawer(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          />
          {/* Drawer Panel */}
          <div className={`fixed top-0 right-0 h-full w-full max-w-md p-6 z-50 transform transition-transform duration-300 ease-in-out border-l flex flex-col justify-between ${
            theme === 'dark' 
              ? 'bg-[#0D0D0C]/95 border-white/10 text-[#E5DFD3] glass-card-dark' 
              : 'bg-[#FBFBFA]/95 border-black/10 text-[#0A0A0A] glass-card-light'
          }`}>
            <div className="space-y-6 overflow-y-auto pr-2">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <span className="text-[9px] font-bold tracking-widest uppercase opacity-60">Prontuário do Colaborador</span>
                  <h3 className="text-base font-bold truncate max-w-[280px] mt-0.5">{activeColaboradorForDrawer.nome}</h3>
                  <span className="text-xs opacity-50 block mt-0.5">{activeColaboradorForDrawer.cargo}</span>
                </div>
                <button 
                  onClick={() => setActiveColaboradorForDrawer(null)}
                  className={`p-1.5 rounded-lg border hover:bg-white/5 transition-colors ${
                    theme === 'dark' ? 'border-white/10' : 'border-black/10'
                  }`}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tab Selector — scrollable horizontal */}
              <div className="flex border-b border-white/10 mb-5 overflow-x-auto gap-0 scrollbar-hide">
                {(['pessoal','admissao','ocorrencias'] as const).map((tab, i) => {
                  const labels = ['Pessoal','Ficha Admissão','Ocorrências'];
                  return (
                    <button
                      key={tab}
                      onClick={() => setDrawerTab(tab)}
                      className={`shrink-0 px-3 pb-2.5 text-[9px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                        drawerTab === tab
                          ? (theme==='dark' ? 'border-[#E5DFD3] text-[#E5DFD3]' : 'border-[#0A0A0A] text-[#0A0A0A]')
                          : 'border-transparent opacity-45 hover:opacity-80'
                      }`}
                    >
                      {labels[i]}
                    </button>
                  );
                })}
              </div>

              {/* ─── TAB: PESSOAL ─── */}
              {drawerTab === 'pessoal' && (
                <div className="space-y-5 animate-fadeIn">
                  
                  {/* Resumo Financeiro / Folha Salarial */}
                  <div className={`p-4 rounded-xl border space-y-3 ${
                    theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'
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
                    <button onClick={() => { setIsEditingDrawer(!isEditingDrawer); setDrawerEditData({}); }} className={`text-[9px] px-2.5 py-1 rounded font-bold border transition-colors ${
                      isEditingDrawer ? 'border-rose-500/30 text-rose-400 bg-rose-500/10' : (theme==='dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5')
                    }`}>{isEditingDrawer ? 'Cancelar' : '✏️ Editar'}</button>
                  </div>

                  {([
                    { label: 'Nome Completo', field: 'nome', span: 2 },
                    { label: 'CPF', field: 'cpf' },
                    { label: 'RG', field: 'rg' },
                    { label: 'Data Nascimento', field: 'data_nascimento', type: 'date' },
                    { label: 'Sexo', field: 'sexo', type: 'select', opts: ['Feminino','Masculino','Outro'] },
                    { label: 'Estado Civil', field: 'estado_civil', type: 'select', opts: ['Solteiro(a)','Casado(a)','Divorciado(a)','Viúvo(a)','União Estável'] },
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
                  ] as any[]).map(({ label, field, span, type, opts }: any) => {
                    const val = isEditingDrawer
                      ? (drawerEditData[field] !== undefined ? drawerEditData[field] : activeColaboradorForDrawer[field])
                      : activeColaboradorForDrawer[field];
                    return (
                      <div key={field} className={span === 2 ? 'col-span-2' : ''}>
                        <label className="block text-[9px] font-bold uppercase opacity-50 mb-0.5">{label}</label>
                        {isEditingDrawer ? (
                          type === 'select' ? (
                            <select value={val || ''} onChange={e => setDrawerEditData((p: any) => ({...p, [field]: e.target.value}))}
                              className={`w-full text-xs p-1.5 rounded border bg-transparent ${ theme==='dark' ? 'border-white/10 bg-[#121211]' : 'border-black/10 bg-white' }`}>
                              <option value="">—</option>
                              {opts.map((o: string) => <option key={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input type={type || 'text'} value={val || ''} onChange={e => setDrawerEditData((p: any) => ({...p, [field]: e.target.value}))}
                              className={`w-full text-xs p-1.5 rounded border bg-transparent ${ theme==='dark' ? 'border-white/10' : 'border-black/10' }`} />
                          )
                        ) : (
                          <p className="text-xs font-semibold py-0.5">{val || <span className="opacity-30 italic">—</span>}</p>
                        )}
                      </div>
                    );
                  })}

                  {isEditingDrawer && (
                    <button onClick={handleSaveDrawerEdit} disabled={isSavingDrawer}
                      className={`w-full py-2 rounded font-bold text-xs transition-colors ${ theme==='dark' ? 'bg-[#E5DFD3] text-black' : 'bg-[#0A0A0A] text-white' } disabled:opacity-50`}>
                      {isSavingDrawer ? 'Salvando...' : '✓ Salvar Alterações'}
                    </button>
                  )}
                  {/* Tempo de Casa */}
                  <div className={`rounded-xl border p-4 flex items-center justify-between ${ theme==='dark' ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5' }`}>
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
                                {doc.documento_id === '1' ? 'Termo de Imagem' : (doc.documento_id === '2' ? 'Contrato Experiência' : 'Documento')}
                              </span>
                              <span className="text-[10px] opacity-45">Assinado {new Date(doc.assinado_em || '').toLocaleDateString('pt-BR')}</span>
                            </div>
                            <button onClick={() => { if (doc.url_arquivo) window.open(doc.url_arquivo,'_blank'); }}
                              className={`p-1 rounded hover:bg-white/10 ${theme==='dark'?'text-[#E5DFD3]':'text-[#0A0A0A]'}`}>
                              <ExternalLink size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs opacity-40 italic">Nenhum documento assinado.</p>
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

                      {/* Section 4 */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 block">Documentos & Fotos Anexados</span>
                        <div className="space-y-2">
                          {activeColaboradorForDrawer.documentos_anexos &&
                            Object.entries(activeColaboradorForDrawer.documentos_anexos).map(([docType, path]: [string, any]) => {
                              const labels: Record<string, string> = {
                                identidade: 'Documento de Identidade (RG/CNH)',
                                residencia: 'Comprovante de Residência',
                                aso: 'Atestado de Saúde Ocupacional (ASO)',
                                foto: 'Foto / Selfie Cadastral'
                              };
                              return (
                                <div key={docType} className="p-2.5 rounded-lg border border-white/5 bg-white/5 flex items-center justify-between text-xs animate-fadeIn">
                                  <div>
                                    <span className="font-semibold block">{labels[docType] || docType}</span>
                                    <span className="text-[9px] opacity-45 font-mono truncate block max-w-[200px]">{path}</span>
                                  </div>
                                  <button
                                    onClick={() => handleDownloadAttachment(path)}
                                    className={`p-1.5 rounded hover:bg-white/10 ${theme==='dark'?'text-[#E5DFD3]':'text-[#0A0A0A]'}`}
                                    title="Visualizar documento privado"
                                  >
                                    <ExternalLink size={13} />
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-lg border border-white/5 bg-white/5 text-center opacity-50 italic">
                      Colaborador legado ou sem ficha cadastral digital preenchida.
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
                        className={`text-[10px] px-3 py-1.5 rounded font-bold uppercase transition-all ${
                          isRegisteringOcorrencia 
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
                    <form onSubmit={handleRegisterOcorrencia} className={`p-4 rounded-xl border space-y-3 ${
                      theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10'
                    }`}>
                      <div>
                        <label className="block text-[9px] font-bold uppercase opacity-65 mb-1">Tipo de Ocorrência</label>
                        <select
                          value={ocTipo}
                          onChange={(e) => setOcTipo(e.target.value)}
                          className={`w-full text-xs p-2.5 rounded border focus:outline-none bg-transparent ${
                            theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
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
                            className={`w-full text-xs p-2.5 rounded border bg-transparent ${
                              theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
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
                            className={`w-full text-xs p-2.5 rounded border bg-transparent ${
                              theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
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
                          className={`w-full text-xs p-2.5 rounded border bg-transparent resize-none ${
                            theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'
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
                        className={`w-full py-2.5 rounded text-[10px] font-bold tracking-wider uppercase transition-colors ${
                          theme === 'dark' 
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
                          <div key={oc.id} className={`p-3.5 rounded-xl border space-y-2.5 ${
                            theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.02] border-black/5'
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
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-white/10 text-center text-[9px] opacity-40">
              ID Interno: {activeColaboradorForDrawer.id}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
