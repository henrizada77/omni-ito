import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  CheckCircle, 
  AlertTriangle, 
  ShieldCheck,
  Sun,
  Moon,
  FileText,
  PenTool
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { buildContractText } from '../../data/contractTemplates';
import AdmissionForm from '../../components/documents/AdmissionForm';

interface AdmissaoCandidatoProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

/**
 * Erro cuja mensagem foi escrita para o candidato ler — quem abre esta página é
 * alguém sendo contratado, não um desenvolvedor. Qualquer outro erro é logado no
 * console e substituído por um texto genérico antes de chegar à tela.
 */
class ErroVisivelAoCandidato extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErroVisivelAoCandidato';
  }
}

export default function AdmissaoCandidato({ theme, setTheme }: AdmissaoCandidatoProps) {
  const { token } = useParams<{ token: string }>();
  
  // Validation States
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [candidateEmail, setCandidateEmail] = useState('');
  const [tokenStatus, setTokenStatus] = useState('pendente_preenchimento');

  // Form Fields
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');

  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // O banner de erro fica acima do visualizador do contrato e do quadro de
  // assinatura; o botão de enviar fica abaixo dos dois. No celular, o erro
  // renderiza fora da vista e o botão parece não ter feito nada.
  const submitErrorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!submitError) return;
    submitErrorRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    submitErrorRef.current?.focus();
  }, [submitError]);

  // PDF Draft states
  const [pdfDraftUrl, setPdfDraftUrl] = useState('');
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [tokenDetails, setTokenDetails] = useState<any>(null);
  const [tokenRow, setTokenRow] = useState<any>(null);

  // Mesma substituição que a edge function usa para o PDF final — assim a
  // pré-visualização em texto bate exatamente com o documento assinado.
  const renderTemplateText = () => buildContractText(tokenDetails?.pdf_template_base64, tokenRow, tokenDetails);

  // Signature states
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sigPointsCount, setSigPointsCount] = useState(0);
  const [isSigning, setIsSigning] = useState(false);

  // Sync theme class. A classe dark/light aciona `color-scheme` no index.css —
  // sem ela, os <select> da ficha de admissão abriam a lista de opções com
  // fundo branco no tema escuro.
  useEffect(() => {
    if (theme === 'dark') {
      document.body.className = 'dark bg-[#0D0D0C] text-[#E5DFD3] antialiased';
    } else {
      document.body.className = 'light bg-[#FBFBFA] text-[#0A0A0A] antialiased';
    }
  }, [theme]);

  // Load and validate token on startup
  const validateAndLoad = async () => {
    if (!token) {
      setIsTokenValid(false);
      setIsValidatingToken(false);
      return;
    }
    
    try {
      const { data: arrayData, error } = await supabase
        .rpc('get_admission_token_by_token', { p_token: token });
      
      if (error) throw error;
      
      const data = arrayData && arrayData.length > 0 ? arrayData[0] : null;
      
      if (data) {
        const isExpired = new Date(data.expira_em) < new Date();
        
        if (isExpired) {
          setIsTokenValid(false);
        } else {
          setIsTokenValid(true);
          setTokenRow(data);
          setTokenDetails(data.detalhes || {});
          setNome(data.candidato_nome);
          setCandidateEmail(data.candidato_email);
          setCargo(data.candidato_cargo || '');
          setTokenStatus(data.status || 'pendente_preenchimento');
          
          // Log view securely via RPC
          await supabase.rpc('mark_admission_token_viewed', { p_token: token });

          // If waiting signature, get the PDF draft url
          if (data.status === 'aguardando_assinatura') {
            await loadDraftPdf(data);
          }
        }
      } else {
        setIsTokenValid(false);
      }
    } catch (err) {
      console.error('Falha ao validar token de admissão:', err);
      setIsTokenValid(false);
    } finally {
      setIsValidatingToken(false);
    }
  };

  useEffect(() => {
    validateAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // High-DPI signature canvas settings
  useEffect(() => {
    if (tokenStatus !== 'aguardando_assinatura') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = theme === 'dark' ? '#E5DFD3' : '#0A0A0A';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  }, [tokenStatus, theme]);

  const loadDraftPdf = async (tokenData: any) => {
    setIsLoadingPdf(true);
    try {
      const details = tokenData.detalhes || {};
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gerar-contrato-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          token: token,
          userEmail: tokenData.candidato_email,
          candidateName: tokenData.candidato_nome,
          candidateCpf: tokenData.candidato_cpf || details.cpf || '000.000.000-00',
          signatureBase64: null,
          pdfTemplateBase64: details.pdf_template_base64 || null,
          contractText: buildContractText(details.pdf_template_base64, tokenData, details),
          documentName: 'contrato_admissao_rascunho'
        })
      });
      const res = await response.json();
      if (res.success) {
        setPdfDraftUrl(res.signedUrl);
      } else {
        throw new Error(res.error);
      }
    } catch (err) {
      console.warn("Erro ao gerar prévia do PDF, usando visualizador de texto alternativo:", err);
      setPdfDraftUrl('');
    } finally {
      setIsLoadingPdf(false);
    }
  };

  // Drawing Canvas Handlers
  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setIsSigning(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setSigPointsCount(1);
  };

  const draw = (e: any) => {
    if (!isSigning) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setSigPointsCount(prev => prev + 1);
  };

  const stopDrawing = () => {
    setIsSigning(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigPointsCount(0);
  };



  // Step 2: Finalize Signature Canvas
  const handleFinalizeSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureBase64 = canvas.toDataURL('image/png');

    setSubmitting(true);
    setSubmitError('');

    try {
      // Get token details securely via RPC
      const { data: arrayData, error: fetchErr } = await supabase
        .rpc('get_admission_token_by_token', { p_token: token });
      
      if (fetchErr) throw fetchErr;
      const tokenRow = arrayData && arrayData.length > 0 ? arrayData[0] : null;
      if (!tokenRow) throw new Error('Token inválido ou não encontrado.');

      const details = tokenRow.detalhes || {};
      const cpf = tokenRow.candidato_cpf || details.cpf || '000.000.000-00';

      const payload = {
        token,
        userEmail: candidateEmail,
        candidateName: nome,
        candidateCpf: cpf,
        signatureBase64,
        coordinatorEmail: tokenRow.criado_por || 'rh@thiagoomena.com.br',
        pdfTemplateBase64: details.pdf_template_base64 || null,
        contractText: buildContractText(details.pdf_template_base64, tokenRow, details),
        documentName: `contrato_${cpf.replace(/\D/g, '')}_assinado`,
        colabSignaturePosition: details.colab_signature_position || null,
        repSignaturePosition: details.rep_signature_position || null
      };

      let response: Response;
      try {
        response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gerar-contrato-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify(payload)
        });
      } catch (netErr) {
        // fetch só rejeita por rede/CORS — nunca por status HTTP. É daqui que
        // vinha o "Failed to fetch" cru na tela do candidato.
        console.error('Falha de rede ao chamar gerar-contrato-pdf:', netErr);
        throw new ErroVisivelAoCandidato(
          'Não conseguimos falar com o servidor para gerar seu contrato. ' +
          'Verifique sua conexão e tente novamente — sua assinatura continua no quadro.'
        );
      }

      if (!response.ok) {
        console.error(`gerar-contrato-pdf respondeu ${response.status} ${response.statusText}`);
        throw new ErroVisivelAoCandidato(
          response.status === 404
            ? 'O serviço que gera o contrato não está disponível no momento. ' +
              'Isso é uma falha nossa, não sua: avise a equipe de RH e tente mais tarde.'
            : 'O servidor não conseguiu gerar seu contrato agora. ' +
              'Tente novamente em alguns instantes; se continuar, avise a equipe de RH.'
        );
      }

      let res: any;
      try {
        res = await response.json();
      } catch {
        throw new ErroVisivelAoCandidato(
          'O servidor devolveu uma resposta inesperada. Tente novamente em alguns instantes.'
        );
      }

      if (!res.success) {
        console.error('gerar-contrato-pdf falhou:', res.error);
        throw new ErroVisivelAoCandidato(
          'Não foi possível gerar seu contrato agora. ' +
          'Tente novamente; se continuar, avise a equipe de RH.'
        );
      }

      // Save document registry and update token status in a secure database transaction RPC
      const { data: signResult, error: signErr } = await supabase.rpc('sign_admission_token', {
        p_token: token,
        p_signature_base64: signatureBase64,
        p_user_agent: navigator.userAgent,
        p_signed_url: res.filePath || res.signedUrl,
        p_document_hash: res.documentHash
      });

      if (signErr) throw signErr;
      if (!signResult || !signResult.success) throw new Error('Falha ao processar assinatura eletrônica.');

      // Log audit (IP and User Agent automatically populated by trigger metadata)
      await supabase.from('logs_auditoria').insert({
        usuario_email: candidateEmail,
        acao: 'CANDIDATO_ASSINA_CONTRATO',
        detalhes: { nome, cpf, document_hash: res.documentHash }
      });

      setTokenStatus('aguardando_assinatura_rh');
    } catch (err) {
      // Só mensagem escrita para o candidato chega à tela. Erro de rede ou do
      // Postgres vira texto técnico em inglês que ele não sabe o que fazer com.
      if (err instanceof ErroVisivelAoCandidato) {
        setSubmitError(err.message);
      } else {
        console.error('Erro ao registrar assinatura:', err);
        setSubmitError(
          'Não foi possível registrar sua assinatura agora. Tente novamente em alguns instantes. ' +
          'Se o problema continuar, avise a equipe de RH.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isValidatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0C] text-[#E5DFD3]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono tracking-wider opacity-60">Validando link de admissão...</span>
        </div>
      </div>
    );
  }

  if (!isTokenValid) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-500 ${
        theme === 'dark' ? 'bg-[#0D0D0C] text-[#E5DFD3]' : 'bg-[#FBFBFA] text-[#0A0A0A]'
      }`}>
        <div className={`w-full max-w-md rounded-2xl border p-6 md:p-8 text-center ${
          theme === 'dark' ? 'glass-card-dark border-rose-500/20' : 'glass-card-light border-rose-500/30'
        }`}>
          <div className="space-y-6">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center mx-auto text-rose-500">
              <AlertTriangle size={28} />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold">Link Expirado ou Inválido</h2>
              <p className="text-xs opacity-65 max-w-xs mx-auto leading-relaxed">
                Este token de convite expirou (24 horas excedidas), foi utilizado ou revogado pelo RH. Contate o suporte para reenvio.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500 ${
      theme === 'dark' ? 'bg-[#0D0D0C] text-[#E5DFD3]' : 'bg-[#FBFBFA] text-[#0A0A0A]'
    }`}>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#E5DFD3]/3 rounded-full blur-[120px] pointer-events-none" />

      {/* Theme Switcher */}
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

      <div className="w-full max-w-2xl relative z-10 my-8">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold tracking-tight text-sm ${
            theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]'
          }`}>
            ITO
          </div>
          <span className="font-semibold tracking-wider text-base">INSTITUTO THIAGO OMENA</span>
        </div>

        {/* 1. Cadastral Form Screen */}
        {tokenStatus === 'pendente_preenchimento' && (
          <div className={`rounded-2xl border p-6 md:p-8 space-y-6 ${
            theme === 'dark' ? 'glass-card-dark' : 'glass-card-light'
          }`}>
            <div>
              <span className="px-2.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Ficha de Admissão
              </span>
              <h2 className="text-xl font-bold mt-2">Envio de Cadastro do Candidato</h2>
              <p className="text-xs opacity-60 mt-1">Preencha suas informações cadastrais e carregue os documentos de identificação.</p>
            </div>

            <AdmissionForm 
              theme={theme}
              token={token}
              initialNome={nome}
              initialCargo={cargo}
              onClose={() => {}}
              onSuccess={() => setTokenStatus('concluido')}
            />
          </div>
        )}

        {/* 2. Waiting Homologation Intermediary Screen */}
        {tokenStatus === 'aguardando_homologacao' && (
          <div className={`rounded-2xl border p-8 text-center space-y-6 animate-fadeIn ${
            theme === 'dark' ? 'glass-card-dark border-amber-500/20' : 'glass-card-light border-amber-500/30'
          }`}>
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/25 rounded-full flex items-center justify-center mx-auto text-amber-500">
              <FileText size={32} />
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-bold">Dados Recebidos pelo RH</h2>
              <p className="text-xs opacity-70 max-w-md mx-auto leading-relaxed">
                Olá, <strong>{nome}</strong>. Seus documentos admissionais foram carregados no sistema. Nossa equipe do RH Thiago Omena revisará as informações e liberará o contrato oficial para a sua assinatura digital em instantes neste mesmo link.
              </p>
            </div>
            <div className="text-[10px] opacity-40 font-mono flex items-center justify-center gap-1.5 pt-4 border-t border-white/5">
              <ShieldCheck size={12} className="text-amber-500" />
              Aguardando Liberação Documental Remota
            </div>
          </div>
        )}

        {/* 3. Signing Screen */}
        {tokenStatus === 'aguardando_assinatura' && (
          <div className={`rounded-2xl border p-6 md:p-8 space-y-6 ${
            theme === 'dark' ? 'glass-card-dark' : 'glass-card-light'
          }`}>
            <div>
              <span className="px-2.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Passo 2 de 2
              </span>
              <h2 className="text-xl font-bold mt-2">Assinatura Eletrônica do Contrato</h2>
              <p className="text-xs opacity-60 mt-1">Revise o documento gerado pelo RH no visualizador abaixo e desenhe sua assinatura no quadro.</p>
            </div>

            {submitError && (
              <div
                ref={submitErrorRef}
                role="alert"
                tabIndex={-1}
                className="p-3 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-start gap-2 leading-relaxed"
              >
                <AlertTriangle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Document Iframe preview */}
            <div className={`w-full h-[320px] rounded-xl overflow-hidden border ${
              theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/5'
            }`}>
              {isLoadingPdf ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] font-mono opacity-50">Carregando visualização do contrato...</span>
                </div>
              ) : pdfDraftUrl ? (
                <iframe src={`${pdfDraftUrl}#toolbar=0`} className="w-full h-full border-none" title="Prévia do Contrato" />
              ) : (
                <div className="w-full h-full overflow-y-auto p-4 text-xs font-serif leading-relaxed text-left whitespace-pre-wrap select-none bg-white text-[#0A0A0A] border-none">
                  {renderTemplateText() || (
                    <div className="w-full h-full flex items-center justify-center text-rose-500 text-xs font-semibold">
                      Erro ao carregar prévia do PDF. Prossiga assinando para gerar o final.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Signature Canvas */}
            <div className="space-y-4">
              <label className="block text-xs font-semibold tracking-wider uppercase opacity-60 flex items-center gap-1.5">
                <PenTool size={14} />
                Desenhe sua Assinatura abaixo
              </label>
              <div className={`relative border rounded-xl overflow-hidden ${
                theme === 'dark' ? 'bg-[#121211] border-white/15' : 'bg-black/5 border-black/15'
              }`}>
                {/* touch-none é o que impede o gesto de assinar de rolar a página.
                    preventDefault não serve aqui: o React registra onTouchMove como
                    listener passivo no root, e a chamada seria ignorada. */}
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full cursor-crosshair h-[180px] bg-transparent touch-none select-none"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${
                    theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'
                  }`}
                >
                  Limpar Quadro
                </button>
                <button
                  type="button"
                  onClick={handleFinalizeSignature}
                  disabled={sigPointsCount < 5 || submitting}
                  className={`text-xs px-4 py-1.5 rounded-lg font-bold transition-colors ${
                    theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]'
                  } disabled:opacity-50`}
                >
                  {submitting ? 'Finalizando...' : 'Concluir Assinatura Digital'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. Complete Screen */}
        {tokenStatus === 'concluido' && (
          <div className={`rounded-2xl border p-8 text-center space-y-6 animate-fadeIn ${
            theme === 'dark' ? 'glass-card-dark border-emerald-500/20' : 'glass-card-light border-emerald-500/30'
          }`}>
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center mx-auto text-emerald-500 animate-bounce">
              <CheckCircle size={32} />
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-bold">Processo de Admissão Finalizado!</h2>
              <p className="text-xs opacity-70 max-w-md mx-auto leading-relaxed">
                Parabéns! Seu contrato de admissão e documentos admissionais foram assinados eletronicamente e arquivados com sucesso na sua ficha de colaborador. Seja bem-vindo ao <strong>Instituto Thiago Omena</strong>.
              </p>
            </div>
            <div className="text-[10px] opacity-40 font-mono flex items-center justify-center gap-1.5 pt-4 border-t border-white/5">
              <ShieldCheck size={12} className="text-emerald-500" />
              Auditoria de Assinatura Registrada e Criptografada
            </div>
          </div>
        )}

        {/* 5. Waiting RH Signature Screen */}
        {tokenStatus === 'aguardando_assinatura_rh' && (
          <div className={`rounded-2xl border p-8 text-center space-y-6 animate-fadeIn ${
            theme === 'dark' ? 'glass-card-dark border-amber-500/20' : 'glass-card-light border-amber-500/30'
          }`}>
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/25 rounded-full flex items-center justify-center mx-auto text-amber-500">
              <FileText size={32} />
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-bold">Assinatura do Candidato Registrada!</h2>
              <p className="text-xs opacity-70 max-w-md mx-auto leading-relaxed">
                Olá, <strong>{nome}</strong>. Sua assinatura digital foi coletada e gravada no contrato de trabalho. O documento foi encaminhado para a assinatura conjunta e finalização do representante legal do Instituto Thiago Omena.
              </p>
            </div>
            <div className="text-[10px] opacity-40 font-mono flex items-center justify-center gap-1.5 pt-4 border-t border-white/5">
              <ShieldCheck size={12} className="text-amber-500" />
              Aguardando Assinatura do Representante do RH
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
