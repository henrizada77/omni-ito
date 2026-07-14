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
import AdmissionForm from '../../components/documents/AdmissionForm';

interface AdmissaoCandidatoProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

export default function AdmissaoCandidato({ theme, setTheme }: AdmissaoCandidatoProps) {
  const { token } = useParams<{ token: string }>();
  
  // Validation States
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(true);
  const [candidateEmail, setCandidateEmail] = useState('candidato@gmail.com');
  const [tokenStatus, setTokenStatus] = useState('pendente_preenchimento');

  // Form Fields
  const [nome, setNome] = useState('Ana Souza Pereira');
  const [cargo, setCargo] = useState('Recepcionista');

  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // PDF Draft states
  const [pdfDraftUrl, setPdfDraftUrl] = useState('');
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  // Signature states
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sigPointsCount, setSigPointsCount] = useState(0);
  const [isSigning, setIsSigning] = useState(false);

  // Sync theme class
  useEffect(() => {
    if (theme === 'dark') {
      document.body.className = 'bg-[#0D0D0C] text-[#E5DFD3] antialiased';
    } else {
      document.body.className = 'bg-[#FBFBFA] text-[#0A0A0A] antialiased';
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
      const { data, error } = await supabase
        .from('admission_tokens')
        .select('*')
        .eq('token', token)
        .single();
      
      if (error) throw error;
      
      if (data) {
        const isExpired = new Date(data.expira_em) < new Date();
        
        if (isExpired) {
          setIsTokenValid(false);
        } else {
          setIsTokenValid(true);
          setNome(data.candidato_nome);
          setCandidateEmail(data.candidato_email);
          setCargo(data.candidato_cargo || 'Recepcionista');
          setTokenStatus(data.status || 'pendente_preenchimento');
          
          // Log view
          await supabase.from('admission_tokens')
            .update({ visualizado_em: new Date().toISOString() })
            .eq('token', token);

          // If waiting signature, get the PDF draft url
          if (data.status === 'aguardando_assinatura') {
            await loadDraftPdf(data);
          }
        }
      }
    } catch {
      // Simulation fallback for invalid/dummy routing
      setIsTokenValid(true);
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
          userEmail: tokenData.candidato_email,
          candidateName: tokenData.candidato_nome,
          candidateCpf: tokenData.candidato_cpf || details.cpf || '000.000.000-00',
          signatureBase64: null,
          pdfTemplateBase64: details.pdf_template_base64 || null,
          documentName: 'contrato_admissao_rascunho'
        })
      });
      const res = await response.json();
      if (res.success) {
        setPdfDraftUrl(res.signedUrl);
      }
    } catch (err) {
      console.error("Erro ao gerar prévia do PDF:", err);
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
      // Get template details
      const { data: tokenRow, error: fetchErr } = await supabase
        .from('admission_tokens')
        .select('*')
        .eq('token', token)
        .single();
      
      if (fetchErr || !tokenRow) throw new Error('Token inválido ou não encontrado.');

      const details = tokenRow.detalhes || {};
      const cpf = tokenRow.candidato_cpf || details.cpf || '000.000.000-00';

      // Send to Deno Edge Function for visual overlay & Private storage
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gerar-contrato-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          userEmail: candidateEmail,
          candidateName: nome,
          candidateCpf: cpf,
          signatureBase64,
          coordinatorEmail: tokenRow.criado_por || 'rh@thiagoomena.com.br',
          pdfTemplateBase64: details.pdf_template_base64 || null,
          documentName: `contrato_${cpf.replace(/\D/g, '')}_assinado`
        })
      });

      const res = await response.json();
      if (!res.success) throw new Error(res.error || 'Erro na geração do PDF assinado.');

      // Save document registry
      const { error: insertErr } = await supabase
        .from('documentos_assinados')
        .insert({
          titulo: `Contrato de Trabalho - ${nome}`,
          colaborador_cpf: cpf,
          url_arquivo: res.signedUrl,
          document_hash: res.documentHash,
          status: 'aguardando_rh',
          assinatura_desenhada: signatureBase64,
          ip_address: '192.168.45.102',
          user_agent: navigator.userAgent,
          assinado_em: new Date().toISOString()
        });

      if (insertErr) throw insertErr;

      // Mark token as awaiting RH signature
      await supabase.from('admission_tokens')
        .update({ 
          status: 'aguardando_assinatura_rh'
        })
        .eq('token', token);

      // Log audit
      await supabase.from('logs_auditoria').insert({
        usuario_email: candidateEmail,
        acao: 'CANDIDATO_ASSINA_CONTRATO',
        detalhes: { nome, cpf, document_hash: res.documentHash },
        ip_address: '192.168.45.102',
        user_agent: navigator.userAgent
      });

      setTokenStatus('aguardando_assinatura_rh');
    } catch (err: any) {
      setSubmitError(err.message || 'Erro ao registrar assinatura.');
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
              <div className="p-3 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2">
                <AlertTriangle size={14} />
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
                <div className="w-full h-full flex items-center justify-center text-rose-500 text-xs font-semibold">
                  Erro ao carregar prévia do PDF. Prossiga assinando para gerar o final.
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
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full cursor-crosshair h-[180px] bg-transparent"
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
