import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  User, 
  MapPin, 
  CreditCard, 
  GraduationCap, 
  Activity, 
  ShieldCheck, 
  Upload, 
  AlertTriangle, 
  CheckCircle,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

interface AdmissionFormProps {
  theme: 'dark' | 'light';
  onClose: () => void;
  onSuccess: () => void;
  token?: string;
  initialNome?: string;
  initialCargo?: string;
}

export default function AdmissionForm({ theme, onClose, onSuccess, token, initialNome, initialCargo }: AdmissionFormProps) {
  const [step, setStep] = useState(1);
  
  useEffect(() => {
    if (initialNome) setFormData(p => ({ ...p, nome: initialNome }));
    if (initialCargo) setFormData(p => ({ ...p, cargo: initialCargo }));
  }, [initialNome, initialCargo]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Fields State
  const [formData, setFormData] = useState({
    // Step 1: Pessoal
    nome: '',
    nome_social: '',
    data_nascimento: '',
    cpf: '',
    rg: '',
    pis_pasep: '',
    municipio_uf_nascimento: '',
    nacionalidade: 'Brasileira',
    raca_cor: 'Prefiro não declarar',
    genero: 'Prefiro não declarar',
    estado_civil: 'Solteiro(a)',
    nome_mae: '',
    nome_pai: '',
    possui_deficiencia: 'Não',
    deficiencia_qual: '',
    possui_dependentes: 'Não',
    dependentes_detalhes: '',

    // Step 2: Contato e Endereço
    endereco_completo: '',
    tempo_endereco_atual: '',
    telefone_residencial: '',
    telefone_whatsapp: '',
    email_pessoal: '',

    // Step 3: Registro e Pagamento
    cargo: '',
    setor: 'Recepção',
    tipo_vinculo: 'CLT',
    jornada_regime: '44h semanal',
    data_admissao: '',
    horario_trabalho: '',
    salario: '',
    banco_nome: '',
    banco_agencia: '',
    banco_conta: '',
    banco_pix: '',
    ctps_numero: '',
    ctps_serie_uf: '',
    possui_registro_carteira: 'Sim',
    registro_carteira_explicacao: '',
    sindicato_contribuicao: '',

    // Step 4: Qualificações
    escolaridade: 'Superior completo',
    cursos_instituicao: '',
    idiomas_nivel: '',
    cursos_complementares: '',
    emprego_anterior: '',
    referencias_profissionais: '',

    // Step 5: Saúde e Contato de Emergência
    saude_compativel: 'Sim',
    saude_compativel_obs: '',
    medicacao_continua: 'Não',
    medicacao_continua_qual: '',
    alergias_relevantes: 'Não',
    alergias_relevantes_qual: '',
    sofreu_acidente_trabalho: 'Não',
    acidente_trabalho_descr: '',
    concorda_exames: 'Sim',
    cartao_vacina: 'Apresentado',
    cartao_vacina_obs: '',
    emergencia_nome: '',
    emergencia_parentesco: '',
    emergencia_telefone: '',
    emergencia_endereco: '',

    // Step 6: Declarações
    declaracao_veracidade: false,
    autorizacao_antecedentes: 'Concordo',
    autorizacao_imagem: 'Sim'
  });

  // Attached files states
  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: File | null }>({
    identidade: null,
    residencia: null,
    aso: null,
    foto: null
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field: string, file: File | null) => {
    setSelectedFiles(prev => ({ ...prev, [field]: file }));
  };

  const validateStep = () => {
    setErrorMsg('');
    if (step === 1) {
      if (!formData.nome) return 'Nome Completo é obrigatório.';
      if (!formData.data_nascimento) return 'Data de Nascimento é obrigatória.';
      if (!formData.cpf) return 'CPF é obrigatório.';
      if (!formData.rg) return 'RG é obrigatório.';
      if (!formData.nome_mae) return 'Nome da Mãe é obrigatório.';
    }
    if (step === 2) {
      if (!formData.endereco_completo) return 'Endereço residencial completo é obrigatório.';
      if (!formData.telefone_whatsapp) return 'Telefone/WhatsApp é obrigatório.';
      if (!formData.email_pessoal) return 'E-mail pessoal é obrigatório.';
    }
    if (step === 3) {
      if (!formData.cargo) return 'Cargo a ser ocupado é obrigatório.';
      if (!formData.setor) return 'Setor de Alocação é obrigatório.';
      if (!formData.data_admissao) return 'Data de admissão prevista é obrigatória.';
      if (!formData.salario) return 'Salário/Remuneração inicial é obrigatório.';
    }
    if (step === 5) {
      if (!formData.emergencia_nome) return 'Nome do contato de emergência é obrigatório.';
      if (!formData.emergencia_parentesco) return 'Parentesco é obrigatório.';
      if (!formData.emergencia_telefone) return 'Telefone de emergência é obrigatório.';
    }
    if (step === 6) {
      if (!formData.declaracao_veracidade) return 'Você deve concordar com a declaração de veracidade das informações.';
      if (!selectedFiles.identidade) return 'Você deve anexar o Documento de Identidade.';
      if (!selectedFiles.residencia) return 'Você deve anexar o Comprovante de Residência.';
    }
    return '';
  };

  const handleNext = () => {
    const error = validateStep();
    if (error) {
      setErrorMsg(error);
      return;
    }
    setStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setErrorMsg('');
    setStep(prev => prev - 1);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateStep();
    if (error) {
      setErrorMsg(error);
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const cpfClean = formData.cpf.replace(/\D/g, '');
      const filesUrls: { [key: string]: string } = {};

      // 1. Upload files to Storage
      for (const [key, file] of Object.entries(selectedFiles)) {
        if (file) {
          const fileExt = file.name.split('.').pop();
          const filePath = `admissao/${cpfClean}/${key}_${Date.now()}.${fileExt}`;
          
          const { error: uploadErr } = await supabase.storage
            .from('documentos-envios')
            .upload(filePath, file);

          if (uploadErr) throw new Error(`Erro ao subir ${key}: ${uploadErr.message}`);
          filesUrls[key] = filePath; // Save path in JSON
        }
      }

      // 2. Format database columns
      // Parse salaries format: e.g. R$ 4.500,00 -> "R$ 4.500,00" (stored as formatted text in db)
      let rawSal = formData.salario;
      if (!rawSal.includes('R$')) {
        rawSal = `R$ ${rawSal}`;
      }

      // Prepare payload for RPC
      const newColaborador = {
        nome: formData.nome,
        cpf: formData.cpf,
        rg: formData.rg,
        cargo: formData.cargo,
        setor: formData.setor,
        salario: rawSal,
        status: 'ativo',
        data_admissao: formData.data_admissao,
        genero: formData.genero === 'Masculino' ? 'M' : (formData.genero === 'Feminino' ? 'F' : null),
        vale_alimentacao: true,
        plano_saude: true,
        depily: true,
        ficha_admissao: formData,
        documentos_anexos: filesUrls,
        onboarding_progresso: 100
      };

      // 2. Call SECURITY DEFINER RPC — validates token & inserts colaborador bypassing RLS
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'inserir_colaborador_via_admissao',
        { p_dados: newColaborador, p_token: token || '' }
      );

      if (rpcError) throw rpcError;
      if (rpcResult && !rpcResult.success) throw new Error(rpcResult.error || 'Erro ao inserir colaborador.');

      // Token update and audit log are handled inside the RPC function
      setSuccessMsg('Ficha de admissão enviada com sucesso! O novo colaborador foi inserido no sistema.');
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao processar admissão. Verifique os dados e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const stepsHeaders = [
    { title: 'Pessoal', icon: <User size={14} /> },
    { title: 'Contato & Endereço', icon: <MapPin size={14} /> },
    { title: 'Registro & Pgto', icon: <CreditCard size={14} /> },
    { title: 'Qualificação', icon: <GraduationCap size={14} /> },
    { title: 'Saúde & Emergência', icon: <Activity size={14} /> },
    { title: 'Anexos & Envio', icon: <ShieldCheck size={14} /> }
  ];

  return (
    <div className="space-y-6">
      {/* Step Progress bar */}
      <div className="flex justify-between items-center overflow-x-auto pb-2 border-b border-white/10 gap-2 scrollbar-hide">
        {stepsHeaders.map((hdr, i) => (
          <div 
            key={i} 
            className={`flex items-center gap-1.5 shrink-0 pb-1.5 border-b-2 text-[10px] uppercase font-bold tracking-wider transition-all ${
              step === i + 1 
                ? (theme === 'dark' ? 'border-[#E5DFD3] text-[#E5DFD3]' : 'border-[#0A0A0A] text-[#0A0A0A]')
                : 'border-transparent opacity-40'
            }`}
          >
            {hdr.icon}
            <span>{hdr.title}</span>
          </div>
        ))}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2">
          <AlertTriangle size={14} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center gap-2">
          <CheckCircle size={14} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-5 text-xs">
        
        {/* STEP 1: DADOS PESSOAIS */}
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <h4 className="text-[11px] font-bold uppercase tracking-wider opacity-60">1. Informações Pessoais de Admissão</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block font-bold opacity-60 mb-1">Nome Completo *</label>
                <input type="text" required value={formData.nome} onChange={e => handleInputChange('nome', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15 focus:border-white/35':'border-black/15 focus:border-black/35'}`} />
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Nome Social / Apelido</label>
                <input type="text" value={formData.nome_social} onChange={e => handleInputChange('nome_social', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Data de Nascimento *</label>
                <input type="date" required value={formData.data_nascimento} onChange={e => handleInputChange('data_nascimento', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">CPF *</label>
                <input type="text" placeholder="000.000.000-00" required value={formData.cpf} onChange={e => handleInputChange('cpf', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">RG *</label>
                <input type="text" placeholder="Ex: 1234567-8 / SSP-AL" required value={formData.rg} onChange={e => handleInputChange('rg', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">PIS/PASEP</label>
                <input type="text" value={formData.pis_pasep} onChange={e => handleInputChange('pis_pasep', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Município/UF de Nascimento *</label>
                <input type="text" required value={formData.municipio_uf_nascimento} onChange={e => handleInputChange('municipio_uf_nascimento', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Raça/Cor</label>
                <select value={formData.raca_cor} onChange={e => handleInputChange('raca_cor', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15 bg-[#121211]':'border-black/15 bg-white'}`}>
                  {['Branca','Parda','Preta','Amarela','Indígena','Prefiro não declarar'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Sexo</label>
                <select value={formData.genero} onChange={e => handleInputChange('genero', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15 bg-[#121211]':'border-black/15 bg-white'}`}>
                  {['Feminino','Masculino','Outro','Prefiro não declarar'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Estado Civil</label>
                <select value={formData.estado_civil} onChange={e => handleInputChange('estado_civil', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15 bg-[#121211]':'border-black/15 bg-white'}`}>
                  {['Solteiro(a)','Casado(a)','União estável','Divorciado(a)','Viúvo(a)'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Nome da Mãe *</label>
                <input type="text" required value={formData.nome_mae} onChange={e => handleInputChange('nome_mae', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Nome do Pai</label>
                <input type="text" value={formData.nome_pai} onChange={e => handleInputChange('nome_pai', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Possui alguma deficiência?</label>
                <select value={formData.possui_deficiencia} onChange={e => handleInputChange('possui_deficiencia', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15 bg-[#121211]':'border-black/15 bg-white'}`}>
                  <option>Não</option>
                  <option>Sim</option>
                </select>
              </div>

              {formData.possui_deficiencia === 'Sim' && (
                <div className="md:col-span-2">
                  <label className="block font-bold opacity-60 mb-1">Especifique a deficiência / Adaptações necessárias</label>
                  <input type="text" value={formData.deficiencia_qual} onChange={e => handleInputChange('deficiencia_qual', e.target.value)}
                    className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
                </div>
              )}

              <div>
                <label className="block font-bold opacity-60 mb-1">Possui dependentes?</label>
                <select value={formData.possui_dependentes} onChange={e => handleInputChange('possui_dependentes', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15 bg-[#121211]':'border-black/15 bg-white'}`}>
                  <option>Não</option>
                  <option>Sim</option>
                </select>
              </div>

              {formData.possui_dependentes === 'Sim' && (
                <div className="md:col-span-2">
                  <label className="block font-bold opacity-60 mb-1">Nomes, parentesco e idade dos dependentes</label>
                  <textarea value={formData.dependentes_detalhes} onChange={e => handleInputChange('dependentes_detalhes', e.target.value)}
                    className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'} h-16`} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: CONTATO E ENDEREÇO */}
        {step === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <h4 className="text-[11px] font-bold uppercase tracking-wider opacity-60">2. Informações de Contato e Residência</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block font-bold opacity-60 mb-1">Endereço Residencial Completo (com CEP) *</label>
                <input type="text" required value={formData.endereco_completo} onChange={e => handleInputChange('endereco_completo', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold opacity-60 mb-1">Tempo no endereço atual</label>
                  <input type="text" placeholder="Ex: 3 anos" value={formData.tempo_endereco_atual} onChange={e => handleInputChange('tempo_endereco_atual', e.target.value)}
                    className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
                </div>

                <div>
                  <label className="block font-bold opacity-60 mb-1">Telefone Residencial</label>
                  <input type="text" value={formData.telefone_residencial} onChange={e => handleInputChange('telefone_residencial', e.target.value)}
                    className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
                </div>

                <div>
                  <label className="block font-bold opacity-60 mb-1">WhatsApp / Celular *</label>
                  <input type="text" required value={formData.telefone_whatsapp} onChange={e => handleInputChange('telefone_whatsapp', e.target.value)}
                    className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
                </div>

                <div>
                  <label className="block font-bold opacity-60 mb-1">E-mail Pessoal *</label>
                  <input type="email" required value={formData.email_pessoal} onChange={e => handleInputChange('email_pessoal', e.target.value)}
                    className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: REGISTRO E PAGAMENTO */}
        {step === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <h4 className="text-[11px] font-bold uppercase tracking-wider opacity-60">3. Dados de Cargo e Pagamento</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold opacity-60 mb-1">Cargo a ser ocupado *</label>
                <input type="text" required value={formData.cargo} onChange={e => handleInputChange('cargo', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Departamento/Setor *</label>
                <select value={formData.setor} onChange={e => handleInputChange('setor', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15 bg-[#121211]':'border-black/15 bg-white'}`}>
                  {['Biomedicina', 'Recepção', 'Financeiro', 'Call Center', 'Smartshape', 'Enfermagem', 'Farmácia', 'Serviços Gerais', 'Nutrição', 'Administrativo'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Tipo de Vínculo</label>
                <select value={formData.tipo_vinculo} onChange={e => handleInputChange('tipo_vinculo', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15 bg-[#121211]':'border-black/15 bg-white'}`}>
                  {['CLT', 'PJ', 'Temporário', 'Estágio', 'Outro'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Jornada/Regime de Trabalho</label>
                <select value={formData.jornada_regime} onChange={e => handleInputChange('jornada_regime', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15 bg-[#121211]':'border-black/15 bg-white'}`}>
                  {['44h semanal', '40h', '30h', 'Horista', 'Plantão', 'Outro'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Data de Admissão Prevista *</label>
                <input type="date" required value={formData.data_admissao} onChange={e => handleInputChange('data_admissao', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Horário de Trabalho (Entrada/Pausa/Saída)</label>
                <input type="text" placeholder="Ex: 08:00 - 12:00 / 13:00 - 17:00" value={formData.horario_trabalho} onChange={e => handleInputChange('horario_trabalho', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Salário Inicial (R$) *</label>
                <input type="text" placeholder="Ex: 4500,00" required value={formData.salario} onChange={e => handleInputChange('salario', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Nº Carteira de Trabalho / Série / UF</label>
                <input type="text" value={formData.ctps_numero} onChange={e => handleInputChange('ctps_numero', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
              </div>

              <div className="md:col-span-2 border-t border-white/10 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold opacity-60 mb-1">Nome do Banco & Tipo de Conta</label>
                  <input type="text" placeholder="Ex: Itaú - Conta Corrente" value={formData.banco_nome} onChange={e => handleInputChange('banco_nome', e.target.value)}
                    className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
                </div>

                <div>
                  <label className="block font-bold opacity-60 mb-1">Agência / Conta com Dígito</label>
                  <input type="text" placeholder="Ex: Ag: 1234 / Cc: 56789-0" value={formData.banco_agencia} onChange={e => handleInputChange('banco_agencia', e.target.value)}
                    className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold opacity-60 mb-1">Chave PIX para pagamentos emergentes</label>
                  <input type="text" placeholder="Celular, E-mail ou CPF" value={formData.banco_pix} onChange={e => handleInputChange('banco_pix', e.target.value)}
                    className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: FORMAÇÃO E QUALIFICAÇÕES */}
        {step === 4 && (
          <div className="space-y-4 animate-fadeIn">
            <h4 className="text-[11px] font-bold uppercase tracking-wider opacity-60">4. Formação Acadêmica & Histórico Profissional</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block font-bold opacity-60 mb-1">Escolaridade</label>
                <select value={formData.escolaridade} onChange={e => handleInputChange('escolaridade', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15 bg-[#121211]':'border-black/15 bg-white'}`}>
                  {['Fundamental','Médio','Técnico','Superior incompleto','Superior completo','Pós-graduação'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Curso(s) e Instituições de Ensino</label>
                <input type="text" placeholder="Ex: Fisioterapia - Universidade Federal de Alagoas" value={formData.cursos_instituicao} onChange={e => handleInputChange('cursos_instituicao', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Idiomas e nível de fluência</label>
                <input type="text" placeholder="Ex: Inglês Intermediário, Espanhol Básico" value={formData.idiomas_nivel} onChange={e => handleInputChange('idiomas_nivel', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Cursos Complementares / Treinamentos Relevantes</label>
                <textarea value={formData.cursos_complementares} onChange={e => handleInputChange('cursos_complementares', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'} h-16`} />
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Último Emprego (Empresa, Cargo, Período, Motivo Saída)</label>
                <textarea value={formData.emprego_anterior} onChange={e => handleInputChange('emprego_anterior', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'} h-16`} />
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Referências Profissionais (Nome, Cargo, Telefone/Contato)</label>
                <input type="text" value={formData.referencias_profissionais} onChange={e => handleInputChange('referencias_profissionais', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: SAÚDE & CONTATO DE EMERGÊNCIA */}
        {step === 5 && (
          <div className="space-y-4 animate-fadeIn">
            <h4 className="text-[11px] font-bold uppercase tracking-wider opacity-60">5. Questionário de Saúde & Emergência</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold opacity-60 mb-1">Condição de saúde compatível com as funções?</label>
                <select value={formData.saude_compativel} onChange={e => handleInputChange('saude_compativel', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15 bg-[#121211]':'border-black/15 bg-white'}`}>
                  <option>Sim</option>
                  <option>Não</option>
                </select>
              </div>

              <div>
                <label className="block font-bold opacity-60 mb-1">Uso de Medicação Contínua?</label>
                <select value={formData.medicacao_continua} onChange={e => handleInputChange('medicacao_continua', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15 bg-[#121211]':'border-black/15 bg-white'}`}>
                  <option>Não</option>
                  <option>Sim</option>
                </select>
              </div>

              {formData.medicacao_continua === 'Sim' && (
                <div className="md:col-span-2">
                  <label className="block font-bold opacity-60 mb-1">Quais medicações?</label>
                  <input type="text" value={formData.medicacao_continua_qual} onChange={e => handleInputChange('medicacao_continua_qual', e.target.value)}
                    className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
                </div>
              )}

              <div>
                <label className="block font-bold opacity-60 mb-1">Possui Alergias Relevantes?</label>
                <select value={formData.alergias_relevantes} onChange={e => handleInputChange('alergias_relevantes', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15 bg-[#121211]':'border-black/15 bg-white'}`}>
                  <option>Não</option>
                  <option>Sim</option>
                </select>
              </div>

              {formData.alergias_relevantes === 'Sim' && (
                <div className="md:col-span-2">
                  <label className="block font-bold opacity-60 mb-1">Especificação da Alergia</label>
                  <input type="text" value={formData.alergias_relevantes_qual} onChange={e => handleInputChange('alergias_relevantes_qual', e.target.value)}
                    className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
                </div>
              )}

              <div>
                <label className="block font-bold opacity-60 mb-1">Já sofreu Acidente de Trabalho?</label>
                <select value={formData.sofreu_acidente_trabalho} onChange={e => handleInputChange('sofreu_acidente_trabalho', e.target.value)}
                  className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15 bg-[#121211]':'border-black/15 bg-white'}`}>
                  <option>Não</option>
                  <option>Sim</option>
                </select>
              </div>

              {formData.sofreu_acidente_trabalho === 'Sim' && (
                <div className="md:col-span-2">
                  <label className="block font-bold opacity-60 mb-1">Descreva o ocorrido</label>
                  <textarea value={formData.acidente_trabalho_descr} onChange={e => handleInputChange('acidente_trabalho_descr', e.target.value)}
                    className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'} h-16`} />
                </div>
              )}

              <div className="md:col-span-2 border-t border-white/10 pt-4">
                <span className="font-bold opacity-60 block mb-2">Contatos de Emergência (RH Obligatory)</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold opacity-60 mb-1">Nome Completo *</label>
                    <input type="text" required value={formData.emergencia_nome} onChange={e => handleInputChange('emergencia_nome', e.target.value)}
                      className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
                  </div>
                  <div>
                    <label className="block font-bold opacity-60 mb-1">Parentesco *</label>
                    <input type="text" required value={formData.emergencia_parentesco} onChange={e => handleInputChange('emergencia_parentesco', e.target.value)}
                      className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
                  </div>
                  <div>
                    <label className="block font-bold opacity-60 mb-1">Telefone *</label>
                    <input type="text" required value={formData.emergencia_telefone} onChange={e => handleInputChange('emergencia_telefone', e.target.value)}
                      className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block font-bold opacity-60 mb-1">Endereço do Contato de Emergência</label>
                    <input type="text" value={formData.emergencia_endereco} onChange={e => handleInputChange('emergencia_endereco', e.target.value)}
                      className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: DOCUMENTOS E DECLARAÇÕES */}
        {step === 6 && (
          <div className="space-y-4 animate-fadeIn">
            <h4 className="text-[11px] font-bold uppercase tracking-wider opacity-60">6. Upload de Documentos Admissionais & Autorizações</h4>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${theme==='dark'?'bg-white/5 border-white/10':'bg-black/5 border-black/10'}`}>
                  <div>
                    <span className="font-bold block mb-1">Documento de Identidade *</span>
                    <span className="opacity-50 text-[10px] block mb-3">RG, CNH ou equivalente com foto.</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className={`cursor-pointer px-3 py-1.5 rounded font-bold transition-all flex items-center gap-1 bg-[#10b981]/20 border border-[#10b981]/25 text-[#10b981] ${selectedFiles.identidade ? 'opacity-100':'opacity-70 hover:opacity-100'}`}>
                      <Upload size={12} /> {selectedFiles.identidade ? 'Alterar' : 'Anexar'}
                      <input type="file" required={!selectedFiles.identidade} className="hidden" accept="image/*,application/pdf" onChange={e => handleFileChange('identidade', e.target.files ? e.target.files[0] : null)} />
                    </label>
                    {selectedFiles.identidade && <span className="truncate max-w-[120px] opacity-75">{selectedFiles.identidade.name}</span>}
                  </div>
                </div>

                <div className={`p-4 rounded-xl border flex flex-col justify-between ${theme==='dark'?'bg-white/5 border-white/10':'bg-black/5 border-black/10'}`}>
                  <div>
                    <span className="font-bold block mb-1">Comprovante de Residência *</span>
                    <span className="opacity-50 text-[10px] block mb-3">Contas de água, luz ou telefone (últimos 90 dias).</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className={`cursor-pointer px-3 py-1.5 rounded font-bold transition-all flex items-center gap-1 bg-[#10b981]/20 border border-[#10b981]/25 text-[#10b981] ${selectedFiles.residencia ? 'opacity-100':'opacity-70 hover:opacity-100'}`}>
                      <Upload size={12} /> {selectedFiles.residencia ? 'Alterar' : 'Anexar'}
                      <input type="file" required={!selectedFiles.residencia} className="hidden" accept="image/*,application/pdf" onChange={e => handleFileChange('residencia', e.target.files ? e.target.files[0] : null)} />
                    </label>
                    {selectedFiles.residencia && <span className="truncate max-w-[120px] opacity-75">{selectedFiles.residencia.name}</span>}
                  </div>
                </div>

                <div className={`p-4 rounded-xl border flex flex-col justify-between ${theme==='dark'?'bg-white/5 border-white/10':'bg-black/5 border-black/10'}`}>
                  <div>
                    <span className="font-bold block mb-1">Exame Admissional (ASO)</span>
                    <span className="opacity-50 text-[10px] block mb-3">Atestado de Saúde Ocupacional.</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className={`cursor-pointer px-3 py-1.5 rounded font-bold transition-all flex items-center gap-1 bg-[#10b981]/20 border border-[#10b981]/25 text-[#10b981] ${selectedFiles.aso ? 'opacity-100':'opacity-70 hover:opacity-100'}`}>
                      <Upload size={12} /> {selectedFiles.aso ? 'Alterar' : 'Anexar'}
                      <input type="file" className="hidden" accept="image/*,application/pdf" onChange={e => handleFileChange('aso', e.target.files ? e.target.files[0] : null)} />
                    </label>
                    {selectedFiles.aso && <span className="truncate max-w-[120px] opacity-75">{selectedFiles.aso.name}</span>}
                  </div>
                </div>

                <div className={`p-4 rounded-xl border flex flex-col justify-between ${theme==='dark'?'bg-white/5 border-white/10':'bg-black/5 border-black/10'}`}>
                  <div>
                    <span className="font-bold block mb-1">Foto 3x4 / Selfie Profissional</span>
                    <span className="opacity-50 text-[10px] block mb-3">Fundo neutro, boa iluminação, para cadastro no ponto.</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className={`cursor-pointer px-3 py-1.5 rounded font-bold transition-all flex items-center gap-1 bg-[#10b981]/20 border border-[#10b981]/25 text-[#10b981] ${selectedFiles.foto ? 'opacity-100':'opacity-70 hover:opacity-100'}`}>
                      <Upload size={12} /> {selectedFiles.foto ? 'Alterar' : 'Anexar'}
                      <input type="file" className="hidden" accept="image/*" onChange={e => handleFileChange('foto', e.target.files ? e.target.files[0] : null)} />
                    </label>
                    {selectedFiles.foto && <span className="truncate max-w-[120px] opacity-75">{selectedFiles.foto.name}</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-white/10 pt-4">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.declaracao_veracidade} onChange={e => handleInputChange('declaracao_veracidade', e.target.checked)}
                    className="mt-0.5" />
                  <span className="leading-relaxed opacity-75">
                    <strong>Declaração de Veracidade:</strong> Declaro que todas as informações prestadas são verdadeiras e assumo responsabilidade total pela autenticidade dos documentos apresentados funcionalmente.
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold opacity-60 mb-1">Consulta de Antecedentes e Contatos</label>
                    <select value={formData.autorizacao_antecedentes} onChange={e => handleInputChange('autorizacao_antecedentes', e.target.value)}
                      className={`w-full p-2 rounded border bg-transparent ${theme==='dark'?'border-white/15 bg-[#121211]':'border-black/15 bg-white'}`}>
                      <option>Concordo</option>
                      <option>Não concordo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold opacity-60 mb-1">Autoriza uso de imagem interna (Crachá/Ponto)</label>
                    <select value={formData.autorizacao_imagem} onChange={e => handleInputChange('autorizacao_imagem', e.target.value)}
                      className={`w-full p-2 rounded border bg-transparent ${theme==='dark'?'border-white/15 bg-[#121211]':'border-black/15 bg-white'}`}>
                      <option>Sim</option>
                      <option>Não</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTROLS BAR */}
        <div className="flex justify-between items-center border-t border-white/10 pt-4 mt-6">
          <button 
            type="button" 
            onClick={step === 1 ? onClose : handlePrev}
            className={`px-4 py-2 rounded-lg font-bold border transition-colors flex items-center gap-1.5 ${
              theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'
            }`}
          >
            <ArrowLeft size={14} /> {step === 1 ? 'Cancelar' : 'Voltar'}
          </button>

          {step < 6 ? (
            <button 
              type="button" 
              onClick={handleNext}
              className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]'
              }`}
            >
              Avançar <ArrowRight size={14} />
            </button>
          ) : (
            <button 
              type="submit" 
              disabled={submitting}
              className={`px-5 py-2 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
                theme === 'dark' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-emerald-600 text-white hover:bg-emerald-750'
              } disabled:opacity-50`}
            >
              {submitting ? 'Gravando Cadastro...' : '✓ Finalizar Admissão'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
