// Domain types for Omni-ITO — derived from supabase_setup.sql schema

export type Role = 'coordenadora_rh' | 'ti';
export type Theme = 'dark' | 'light';
export type ColaboradorStatus = 'pendente' | 'ativo' | 'desligado';
export type Genero = 'M' | 'F';
export type TipoDesligamento = 'Voluntario' | 'Involuntario';
export type TipoOcorrencia =
  | 'Atraso'
  | 'Falta Injustificada'
  | 'Falta Justificada (Atestado)'
  | 'Saída Antecipada'
  | 'Descumprimento de Carga';
export type TipoBeneficio = 'adicional' | 'desconto';
export type TipoRegistroPonto = 'entrada' | 'intervalo_saida' | 'intervalo_retorno' | 'saida';
export type TokenStatus =
  | 'pendente_preenchimento'
  | 'aguardando_homologacao'
  | 'aguardando_assinatura'
  | 'aguardando_assinatura_rh'
  | 'concluido';
export type DocumentoStatus = 'aguardando_rh' | 'finalizado';
export type ModeloFileType = 'texto' | 'pdf' | 'docx';

export interface DashboardProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  user: AuthUser;
  role: Role;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface Perfil {
  id: string;
  email: string;
  cargo: Role;
  criado_em: string;
}

export interface Colaborador {
  id: string;
  nome: string;
  cpf: string;
  rg?: string;
  cargo?: string;
  setor?: string;
  salario?: string;
  status: ColaboradorStatus;
  data_admissao: string;
  data_desligamento?: string;
  motivo_desligamento?: string;
  tipo_desligamento?: TipoDesligamento;
  genero?: Genero;
  documento_identidade_url?: string;
  comprovante_residencia_url?: string;
  exame_aso_url?: string;
  // Onboarding checklist
  vale_alimentacao: boolean;
  plano_saude: boolean;
  depily: boolean;
  kit_onboarding: boolean;
  uniforme_sapato: boolean;
  entrega_epi: boolean;
  treinamento_inicial: boolean;
  cadastro_biometria: boolean;
  onboarding_progresso: number;
  // Extended fields
  ficha_admissao?: Record<string, unknown>;
  documentos_anexos?: Record<string, string>;
  data_aso_vencimento?: string;
  data_ferias_vencimento?: string;
  data_aniversario?: string;
  email_pessoal?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  criado_em: string;
}

export interface ModeloDocumento {
  id: string;
  titulo: string;
  conteudo: string;
  assinatura_coordenadas?: SignaturePosition;
  assinatura_rep_coordenadas?: SignaturePosition;
  tipo_arquivo?: string;
  criado_em: string;
}

export interface SignaturePosition {
  x: number;
  y: number;
  page: number;
}

export interface DocumentoAssinado {
  id: string;
  colaborador_id?: string;
  colaborador_cpf?: string;
  documento_id?: string;
  assinatura_desenhada: string;
  assinatura_representante?: string;
  ip_address: string;
  user_agent: string;
  payload_hash?: string;
  document_hash?: string;
  status?: DocumentoStatus;
  url_arquivo?: string;
  titulo?: string;
  nome_colaborador?: string;
  cpf_colaborador?: string;
  assinado_em: string;
}

export interface AdmissionToken {
  id: string;
  token: string;
  candidato_nome: string;
  candidato_email: string;
  candidato_cpf?: string;
  candidato_rg?: string;
  candidato_cargo?: string;
  candidato_setor?: string;
  candidato_salario?: string;
  detalhes: TokenDetails;
  expira_em: string;
  usado_em?: string;
  visualizado_em?: string;
  status: TokenStatus;
  criado_por?: string;
  criado_em: string;
}

export interface TokenDetails {
  nome?: string;
  cpf?: string;
  rg?: string;
  setor?: string;
  cargo?: string;
  cbo?: string;
  atribuicoes?: string;
  salario?: string;
  salario_extenso?: string;
  endereco?: string;
  data_admissao?: string;
  integrado?: boolean;
  pdf_template_base64?: string;
  template_id?: string;
  colab_signature_position?: SignaturePosition;
  rep_signature_position?: SignaturePosition;
}

export interface LogAuditoria {
  id: string;
  usuario_id?: string;
  usuario_email?: string;
  acao: string;
  detalhes?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  criado_em: string;
}

export interface OcorrenciaJornada {
  id: string;
  colaborador_id: string;
  tipo: TipoOcorrencia;
  data_ocorrencia: string;
  horas_minutos_desvio?: string;
  justificativa?: string;
  anexo_url?: string;
  criado_por?: string;
  criado_em: string;
  colaboradores?: { nome: string; setor: string };
}

export interface Beneficio {
  id: string;
  nome: string;
  tipo: TipoBeneficio;
  valor_padrao: number;
  descricao?: string;
  criado_em: string;
}

export interface ColaboradorBeneficio {
  colaborador_id: string;
  beneficio_id: string;
  valor_customizado?: number;
  criado_em: string;
}

export interface PlanoCarreira {
  id: string;
  cargo_atual: string;
  proximo_cargo: string;
  requisito_tempo_meses: number;
  requisito_nota_avaliacao: number;
  salario_projetado: string;
  criado_em: string;
}

export interface AvaliacaoDesempenho {
  id: string;
  colaborador_id: string;
  data_avaliacao: string;
  nota: number;
  comentarios?: string;
  avaliador_email?: string;
  criado_em: string;
}

export interface Cargo {
  id: string;
  titulo: string;
  descricao?: string;
  atribuicoes: string[];
  cbo?: string;
  setor?: string;
  faixa_salarial_min?: number;
  faixa_salarial_max?: number;
  requisitos?: string;
  ativo: boolean;
  criado_em: string;
}

export interface TrilhaCarreira {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  criado_em: string;
}

export interface TrilhaDegrau {
  id: string;
  trilha_id: string;
  cargo_id: string;
  ordem: number;
  requisito_tempo_meses?: number;
  requisito_nota_avaliacao?: number;
  competencias?: string;
  observacao?: string;
}

export type PromocaoStatus = 'proposta' | 'aprovada' | 'efetivada' | 'rejeitada';

export type CategoriaSatisfacao = 'Geral' | 'Ambiente' | 'Liderança' | 'Benefícios' | 'Carreira' | 'Comunicação';

export interface PesquisaSatisfacao {
  id: string;
  nota: number;
  categoria: CategoriaSatisfacao;
  comentario?: string;
  criado_em: string;
}

export type TipoOuvidoria = 'Elogio' | 'Sugestão' | 'Reclamação' | 'Denúncia';
export type StatusOuvidoria = 'novo' | 'em_analise' | 'resolvido' | 'arquivado';

export interface OuvidoriaManifestacao {
  id: string;
  tipo: TipoOuvidoria;
  setor_alvo?: string;
  mensagem: string;
  status: StatusOuvidoria;
  resposta_interna?: string;
  atualizado_em: string;
  criado_em: string;
}

export interface Promocao {
  id: string;
  colaborador_id: string;
  cargo_origem_id?: string;
  cargo_destino_id: string;
  cargo_origem_titulo?: string;
  cargo_destino_titulo: string;
  salario_anterior?: string;
  salario_novo?: string;
  data_proposta: string;
  data_efetivacao?: string;
  status: PromocaoStatus;
  motivo?: string;
  proposto_por?: string;
  aprovado_por?: string;
  atualizado_em: string;
  criado_em: string;
}

export interface IndicadorTrabalhista {
  id: string;
  tipo: 'Processo Trabalhista' | 'Acidente de Trabalho' | 'Pesquisa Beneficio';
  data_registro: string;
  status: string;
  detalhes?: string;
  valor_envolvido?: number;
  tempo_resolucao_dias?: number;
  nota_satisfacao?: number;
  setor: string;
  criado_em: string;
}

export interface CandidateReviewData {
  nome: string;
  cpf: string;
  rg: string;
  cargo: string;
  setor: string;
  salario: string;
}

export interface OnboardingBenefits {
  valeAlimentacao: boolean;
  planoSaude: boolean;
  depily: boolean;
  kitOnboarding: boolean;
  uniformeSapato: boolean;
}

export interface OnboardingTasks {
  entregaEPI: boolean;
  treinamentoInicial: boolean;
  cadastroBiometria: boolean;
}

export interface SalarioLiquidoResult {
  liquido: string;
  base: string;
  adicionais: string;
  descontos: string;
  netValue: number;
}

// Column name mapping for onboarding checkboxes
export const ONBOARDING_COLUMN_MAP: Record<string, string> = {
  valeAlimentacao: 'vale_alimentacao',
  planoSaude: 'plano_saude',
  depily: 'depily',
  kitOnboarding: 'kit_onboarding',
  uniformeSapato: 'uniforme_sapato',
  entregaEPI: 'entrega_epi',
  treinamentoInicial: 'treinamento_inicial',
  cadastroBiometria: 'cadastro_biometria',
};
