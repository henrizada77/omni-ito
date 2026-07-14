// OMNI ITO - SUPABASE EDGE FUNCTION (DENO)
// Path: supabase/functions/gerar-contrato-pdf/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { PDFDocument, rgb } from 'https://esm.sh/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS Pre-flight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      userEmail, 
      candidateName, 
      candidateCpf, 
      signatureBase64, 
      signatureRepresentativeBase64,
      coordinatorEmail, 
      pdfTemplateBase64,
      documentName,
      colabSignaturePosition,
      repSignaturePosition,
      customText 
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
      
      const text = customText || `CONTRATO DE ADMISSÃO\n\nEu, ${candidateName}, portador do CPF ${candidateCpf}, declaro estar de acordo com os termos deste Instituto.\n\nAssinaturas Eletrônicas Registradas abaixo:`;
      page.drawText(text, { x: 50, y: 720, size: 9.5, font, lineHeight: 14 })
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
    const cpfClean = candidateCpf.replace(/\D/g, '')
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
        documentHash: auditHash
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    )
  }
})
