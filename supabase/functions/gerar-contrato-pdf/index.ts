// OMNI ITO - SUPABASE EDGE FUNCTION (DENO)
// Path: supabase/functions/gerar-contrato-pdf/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { PDFDocument, rgb } from 'https://esm.sh/pdf-lib@1.17.1'

// Domínios extras liberados, além do localhost e dos deploys da Vercel (que
// são reconhecidos por padrão abaixo). Use isto para um domínio PRÓPRIO de
// produção. Separe por vírgula:
//   npx supabase secrets set ALLOWED_ORIGINS="https://rh.itoinstituto.com.br"
const explicitAllowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

/**
 * Decide se a origem pode ler a resposta (CORS). Reconhece, sem precisar de
 * segredo: localhost em qualquer porta (dev) e qualquer deploy *.vercel.app
 * (produção e previews). Domínio próprio entra via ALLOWED_ORIGINS.
 *
 * Por que liberar *.vercel.app é seguro aqui: CORS não autentica nada — só diz
 * quais origens de NAVEGADOR podem ler a resposta (curl/Postman ignoram). Quem
 * protege este endpoint é a validação de token+CPF (candidato) ou JWT (RH/TI)
 * mais abaixo. Uma origem liberada sem token/CPF válido só recebe 401.
 */
const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  if (explicitAllowedOrigins.includes(origin)) return true;
  try {
    const u = new URL(origin);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
    if (u.protocol === 'https:' && u.hostname.endsWith('.vercel.app')) return true;
  } catch {
    // origin malformada — nega
  }
  return false;
};

/** Só os dígitos do CPF. Aceita null/undefined sem estourar. */
const cpfDigits = (value: unknown): string => String(value ?? '').replace(/\D/g, '');

const getCorsHeaders = (origin: string | null) => {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    // A resposta varia conforme a origem: sem isto, um cache intermediário pode
    // servir o header de uma origem para outra.
    'Vary': 'Origin'
  };

  // Origem desconhecida não recebe Access-Control-Allow-Origin nenhum. Antes,
  // ela recebia o primeiro item da lista, o que só produzia um erro de CORS
  // confuso no navegador em vez de uma recusa explícita.
  if (isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin as string;
  }

  return headers;
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const responseHeaders = getCorsHeaders(origin);

  // Handle CORS Pre-flight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: responseHeaders })
  }

  try {
    const {
      token, // Candidate token for validation
      userEmail,
      candidateName,
      candidateCpf,
      signatureBase64,
      signatureRepresentativeBase64,
      coordinatorEmail,
      pdfTemplateBase64,
      documentName,
      colabSignaturePosition,
      repSignaturePosition
    } = await req.json()

    // 1. Collect Client IP and User Agent from request headers
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Dispositivo Desconhecido';
    const timestampISO = new Date().toISOString();

    // 2. Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ""
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 3. Security Hardening: Validate caller authorization (JWT or Token)
    const authHeader = req.headers.get('Authorization') || '';
    const jwtToken = authHeader.replace(/^Bearer /, '').trim();
    let isAuthorized = false;

    // Mode A: Request via Authenticated JWT Coordinator (RH or TI)
    if (jwtToken) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(jwtToken);
      if (!authError && user) {
        const { data: profile } = await supabase
          .from('perfis')
          .select('cargo')
          .eq('id', user.id)
          .single();

        const emailDomain = user.email?.split('@')[1];
        if (profile?.cargo === 'coordenadora_rh' || user.email === 'ito.thiagosilva@gmail.com' || emailDomain === 'itoinstituto.com.br') {
          isAuthorized = true;
        }
      }
    }

    // Mode B: Request via Candidate Token Validation (Bypasses JWT)
    if (!isAuthorized && token) {
      const { data: tokenRow, error: tokenError } = await supabase
        .from('admission_tokens')
        .select('*')
        .eq('token', token)
        .single();

      if (!tokenError && tokenRow) {
        const isExpired = new Date(tokenRow.expira_em) < new Date();
        const details = tokenRow.detalhes || {};
        const informado = cpfDigits(candidateCpf);
        const esperado = cpfDigits(tokenRow.candidato_cpf || details.cpf);

        // O `informado.length > 0` não é redundante: sem ele, uma chamada sem
        // candidateCpf contra um token sem CPF compara '' === '' e autoriza.
        if (!isExpired &&
            informado.length > 0 &&
            informado === esperado &&
            (tokenRow.status === 'aguardando_assinatura' || tokenRow.status === 'aguardando_assinatura_rh')) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ success: false, error: "Acesso não autorizado. Token ou credenciais inválidos." }),
        {
          headers: { ...responseHeaders, "Content-Type": "application/json" },
          status: 401
        }
      );
    }

    // 3. Initialize pdf-lib document
    let pdfDoc: PDFDocument;

    if (pdfTemplateBase64) {
      try {
        // Decode base64 PDF template
        const pdfBytes = Uint8Array.from(atob(pdfTemplateBase64), c => c.charCodeAt(0))
        pdfDoc = await PDFDocument.load(pdfBytes)
      } catch (err: any) {
        // Fallback for DOCX or corrupt PDF: generate signing wrapper
        console.log("PDF load failed, falling back to signature certificate:", err.message)
        pdfDoc = await PDFDocument.create()
        const page = pdfDoc.addPage([600, 800])
        const font = await pdfDoc.embedFont("Helvetica")

        const text = `REGISTRO E CERTIFICADO DE ASSINATURA DIGITAL\n\nEste documento certifica a assinatura digital do modelo de contrato:\n"${documentName || 'Contrato de Admissão'}"\n\nNome do Colaborador: ${candidateName}\nCPF: ${candidateCpf}\nSetor: Admissional\n\nAs assinaturas eletrônicas e registros de auditoria foram vinculados a este certificado.`;
        page.drawText(text, { x: 50, y: 700, size: 11, font, lineHeight: 18 })
      }
    } else {
      // Fallback: Create blank PDF if no base64 is provided
      pdfDoc = await PDFDocument.create()
      const page = pdfDoc.addPage([600, 800])
      const font = await pdfDoc.embedFont("Helvetica")

      const text = `CONTRATO DE ADMISSÃO\n\nEu, ${candidateName}, portador do CPF ${candidateCpf}, declaro estar de acordo com os termos deste Instituto.\n\nAssinaturas Eletrônicas Registradas abaixo:`;
      page.drawText(text, { x: 50, y: 700, size: 11, font, lineHeight: 15 })
    }

    const pages = pdfDoc.getPages()
    const lastPage = pages[pages.length - 1]
    const { width } = lastPage.getSize()

    // 4. Embed Candidate signature image if provided
    let signatureImage = null;
    const base64Data = signatureBase64 ? signatureBase64.replace(/^data:image\/png;base64,/, "") : "";
    if (base64Data) {
      const signatureImageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
      signatureImage = await pdfDoc.embedPng(signatureImageBytes)
    }

    // 5. Embed RH Representative signature image if provided
    let repSignatureImage = null;
    const repBase64Data = signatureRepresentativeBase64 ? signatureRepresentativeBase64.replace(/^data:image\/png;base64,/, "") : "";
    if (repBase64Data) {
      const repSignatureImageBytes = Uint8Array.from(atob(repBase64Data), c => c.charCodeAt(0))
      repSignatureImage = await pdfDoc.embedPng(repSignatureImageBytes)
    }

    // 6. Draw signatures on custom coordinates, form fields, or fallback
    let drewCandidateOnField = false;
    let drewRepOnField = false;
    let drewCandidateOnCoords = false;
    let drewRepOnCoords = false;

    // Draw Candidate signature on custom coordinates if provided
    if (signatureImage && colabSignaturePosition && typeof colabSignaturePosition.x === 'number' && typeof colabSignaturePosition.y === 'number') {
      try {
        const pageIdx = Math.max(0, Math.min(pages.length - 1, (colabSignaturePosition.page || 1) - 1));
        const targetPage = pages[pageIdx];
        targetPage.drawImage(signatureImage, {
          x: colabSignaturePosition.x,
          y: colabSignaturePosition.y,
          width: 140,
          height: 55
        });
        drewCandidateOnCoords = true;
      } catch (err: any) {
        console.log("Error drawing candidate signature on custom coords:", err.message);
      }
    }

    // Draw RH Representative signature on custom coordinates if provided
    if (repSignatureImage && repSignaturePosition && typeof repSignaturePosition.x === 'number' && typeof repSignaturePosition.y === 'number') {
      try {
        const pageIdx = Math.max(0, Math.min(pages.length - 1, (repSignaturePosition.page || 1) - 1));
        const targetPage = pages[pageIdx];
        targetPage.drawImage(repSignatureImage, {
          x: repSignaturePosition.x,
          y: repSignaturePosition.y,
          width: 140,
          height: 55
        });
        drewRepOnCoords = true;
      } catch (err: any) {
        console.log("Error drawing representative signature on custom coords:", err.message);
      }
    }

    // Try form fields drawing as backup/legacy support (only if not drawn on coordinates)
    if (!drewCandidateOnCoords || !drewRepOnCoords) {
      try {
        const form = pdfDoc.getForm()
        const fields = form.getFields()

        for (const field of fields) {
          const name = field.getName()

          // Match Candidate tag
          if (signatureImage && !drewCandidateOnCoords && !drewCandidateOnField &&
            (name.includes('[ASSINATURA_COLABORADOR]') || name.toLowerCase().includes('assinatura_colaborador') || name.toLowerCase() === 'assinatura')) {
            const widgets = field.acroField.getWidgets()
            if (widgets.length > 0) {
              const rect = widgets[0].getRectangle()
              lastPage.drawImage(signatureImage, {
                x: rect.x,
                y: rect.y,
                width: rect.width || 150,
                height: rect.height || 60
              })
              form.removeField(field)
              drewCandidateOnField = true
            }
          }

          // Match RH Representative tag
          if (repSignatureImage && !drewRepOnCoords && !drewRepOnField &&
            (name.includes('[ASSINATURA_REPRESENTANTE]') || name.toLowerCase().includes('assinatura_representante') || name.toLowerCase().includes('representante'))) {
            const widgets = field.acroField.getWidgets()
            if (widgets.length > 0) {
              const rect = widgets[0].getRectangle()
              lastPage.drawImage(repSignatureImage, {
                x: rect.x,
                y: rect.y,
                width: rect.width || 150,
                height: rect.height || 60
              })
              form.removeField(field)
              drewRepOnField = true
            }
          }
        }
      } catch (e: any) {
        console.log("Form field mapping failed or not present:", e.message)
      }
    }

    // Fallbacks: Draw in footer area (only if neither field nor coordinates matched)
    const sigWidth = 140;
    const sigHeight = 55;
    const yPos = 125;

    // Draw Candidate signature fallback
    if (signatureImage && !drewCandidateOnField && !drewCandidateOnCoords) {
      const xPos = repSignatureImage ? (width / 2) - 165 : (width - sigWidth) / 2;
      lastPage.drawImage(signatureImage, {
        x: xPos,
        y: yPos,
        width: sigWidth,
        height: sigHeight
      })
    }

    // Draw RH Representative signature fallback
    if (repSignatureImage && !drewRepOnField && !drewRepOnCoords) {
      const xPos = signatureImage ? (width / 2) + 25 : (width - sigWidth) / 2;
      lastPage.drawImage(repSignatureImage, {
        x: xPos,
        y: yPos,
        width: sigWidth,
        height: sigHeight
      })
    }

    // 7. Compute Transaction Cryptographic Audit Hash
    let auditHash = 'DRAFT_DOCUMENT';
    if (signatureBase64 || signatureRepresentativeBase64) {
      const rawPayload = `${candidateName}|${candidateCpf}|${signatureBase64?.substring(0, 50) || ''}|${signatureRepresentativeBase64?.substring(0, 50) || ''}|${clientIp}|${userAgent}|${timestampISO}`;
      const encoder = new TextEncoder()
      const payloadBuffer = encoder.encode(rawPayload)
      const hashBuffer = await crypto.subtle.digest("SHA-256", payloadBuffer)
      auditHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
    }

    // 8. Draw the Audit Stamp at the very bottom of the last page
    const font = await pdfDoc.embedFont("Helvetica")
    const timestampLocal = new Date(timestampISO).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + ' (Horário de Brasília)';

    let auditText = '';
    if (signatureBase64 && repSignatureImage) {
      auditText =
        `AUDITORIA DIGITAL OMNI ITO — VERIFICAÇÃO JURÍDICA BILATERAL DE ASSINATURA\n` +
        `Candidato: ${candidateName} (Assinatura Registrada) | Representante RH: Coordenadora (Assinatura Registrada)\n` +
        `Finalização: ${timestampLocal} | IP Responsável: ${clientIp}\n` +
        `Código de Integridade Consolidado (SHA-256): ${auditHash}`;
    } else if (signatureBase64) {
      auditText =
        `AUDITORIA DIGITAL OMNI ITO — CONTRATO ASSINADO PELO CANDIDATO (AGUARDANDO RH)\n` +
        `Assinante: ${candidateName} | Data/Hora: ${timestampLocal}\n` +
        `IP do Assinante: ${clientIp} | Dispositivo: ${userAgent.substring(0, 90)}\n` +
        `Código de Integridade Parcial (SHA-256): ${auditHash}`;
    } else {
      auditText =
        `DOCUMENTO NÃO ASSINADO — RASCUNHO PARA LEITURA PRÉVIA\n` +
        `Aguardando assinatura digital do candidato pelo portal admissional.`;
    }

    lastPage.drawText(auditText, {
      x: 40,
      y: 25,
      size: 6.5,
      font,
      lineHeight: 8.5,
      color: (signatureBase64 && repSignatureImage) ? rgb(0.3, 0.5, 0.3) : (signatureBase64 ? rgb(0.35, 0.35, 0.35) : rgb(0.7, 0.2, 0.2))
    })

    // 9. Save the PDF binary bytes
    const pdfResultBytes = await pdfDoc.save()

    // 10. Save to the private storage bucket: contratos-assinados/CPF/file.pdf
    const cpfClean = cpfDigits(candidateCpf)
    if (!cpfClean) throw new Error('CPF do candidato ausente: não é possível definir o caminho do arquivo.')
    const docBaseName = documentName ? documentName.replace(/[^a-zA-Z0-9_\.-]/g, '_') : `contrato_${Date.now()}`;
    const fileSuffix = signatureRepresentativeBase64 ? '_final' : (signatureBase64 ? '_candidato' : '_rascunho');
    const fileName = `${cpfClean}/${docBaseName}${fileSuffix}.pdf`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('contratos-assinados')
      .upload(fileName, pdfResultBytes, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) throw uploadError

    // 11. Generate a Signed URL that expires in 15 minutes (900 seconds)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('contratos-assinados')
      .createSignedUrl(fileName, 900)

    if (urlError) throw urlError

    // 12. Register in logs_auditoria
    await supabase.from('logs_auditoria').insert({
      usuario_email: coordinatorEmail || userEmail,
      acao: signatureRepresentativeBase64 ? 'RH_ASSINA_CONTRATO' : (signatureBase64 ? 'CANDIDATO_ASSINA_CONTRATO' : 'GERAR_PDF_RASCUNHO'),
      detalhes: {
        candidato: candidateName,
        cpf: candidateCpf,
        document_hash: auditHash,
        file_path: fileName,
        client_ip: clientIp,
        user_agent: userAgent
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: "PDF processado com sucesso!",
        signedUrl: urlData.signedUrl,
        filePath: fileName,
        documentHash: auditHash
      }),
      {
        headers: { ...responseHeaders, "Content-Type": "application/json" },
        status: 200
      }
    )

  } catch (error: any) {
    // O detalhe fica nos logs da função, onde é útil. Devolver error.message ao
    // chamador entregaria mensagem crua do Postgres/Storage a um candidato
    // anônimo — nomes de constraint, colunas, estrutura do bucket.
    console.error('gerar-contrato-pdf falhou:', error?.stack || error?.message || error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Não foi possível processar o contrato. Consulte os logs da função para o detalhe.'
      }),
      {
        headers: { ...responseHeaders, "Content-Type": "application/json" },
        status: 500
      }
    )
  }
})
