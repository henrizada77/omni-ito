import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailPayload {
  to: string;
  nome: string;
  tipo: 'parabens_aniversario' | 'copia_documento' | 'boas_vindas' | 'comunicado_rh';
  assunto?: string;
  mensagem?: string;
  linkDocumento?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const senderEmail = Deno.env.get('SENDER_EMAIL') || 'rh@itoclinic.com.br';

    const body: EmailPayload = await req.json().catch(() => ({}) as EmailPayload);
    const { to, nome, tipo, assunto, mensagem, linkDocumento } = body;

    if (!to || !tipo) {
      return new Response(
        JSON.stringify({ error: 'Os campos "to" (destinatário) e "tipo" são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let subject = assunto || 'Notificação ITO Clinic';
    let htmlContent = '';

    const headerHtml = `
      <div style="background-color: #0A0E17; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: #4F6DF5; font-family: sans-serif; margin: 0; font-size: 22px; font-weight: 800; tracking-wide: 1px;">
          ITO CLINIC
        </h1>
        <p style="color: #94A3B8; font-family: sans-serif; margin: 4px 0 0 0; font-size: 12px;">
          Gestão de Pessoas &amp; Recursos Humanos
        </p>
      </div>
    `;

    const footerHtml = `
      <div style="background-color: #F8FAFC; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #E2E8F0;">
        <p style="color: #64748B; font-family: sans-serif; font-size: 11px; margin: 0;">
          Esta é uma mensagem automática enviada pelo sistema Omni ITO da Clínica Médica ITO.
        </p>
        <p style="color: #94A3B8; font-family: sans-serif; font-size: 10px; margin: 6px 0 0 0;">
          Maceió - AL · Todos os direitos reservados
        </p>
      </div>
    `;

    if (tipo === 'parabens_aniversario') {
      subject = subject || `🎉 Feliz Aniversário, ${nome}! · Família ITO Clinic`;
      htmlContent = `
        ${headerHtml}
        <div style="padding: 32px 24px; background-color: #FFFFFF; font-family: sans-serif; color: #1E293B;">
          <h2 style="color: #4F6DF5; font-size: 20px; margin-top: 0;">Parabéns pelo seu dia, ${nome}! 🎈</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Toda a equipe da <strong>ITO Clinic</strong> deseja a você um feliz aniversário repleto de saúde, paz, alegria e muito sucesso!
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Agradecemos imensamente pela sua dedicação, carinho e excelente trabalho no nosso dia a dia. É um orgulho ter você no nosso time!
          </p>
          <div style="margin: 24px 0; padding: 16px; background-color: #F1F5F9; border-left: 4px solid #4F6DF5; border-radius: 4px; font-style: italic; font-size: 13px;">
            "O sucesso de uma empresa é feito pelas pessoas extraordinárias que caminham juntas todos os dias."
          </div>
        </div>
        ${footerHtml}
      `;
    } else if (tipo === 'copia_documento') {
      subject = subject || `📄 Cópia de Documento Assinado · ${nome}`;
      htmlContent = `
        ${headerHtml}
        <div style="padding: 32px 24px; background-color: #FFFFFF; font-family: sans-serif; color: #1E293B;">
          <h2 style="color: #0F172A; font-size: 18px; margin-top: 0;">Olá, ${nome}!</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Segue em anexo ou disponível no link abaixo a cópia do seu documento homologado/assinado digitalmente no sistema da ITO Clinic.
          </p>
          ${mensagem ? `<p style="font-size: 13px; color: #475569; background: #F8FAFC; padding: 12px; rounded: 8px;">${mensagem}</p>` : ''}
          ${
            linkDocumento
              ? `<div style="text-align: center; margin: 28px 0;">
                  <a href="${linkDocumento}" target="_blank" style="background-color: #4F6DF5; color: #FFFFFF; text-decoration: none; padding: 12px 24px; font-size: 14px; font-weight: bold; border-radius: 8px; display: inline-block;">
                    📥 Acessar Cópia do Documento
                  </a>
                </div>`
              : ''
          }
        </div>
        ${footerHtml}
      `;
    } else if (tipo === 'boas_vindas') {
      subject = subject || `✨ Seja bem-vindo(a) à ITO Clinic, ${nome}!`;
      htmlContent = `
        ${headerHtml}
        <div style="padding: 32px 24px; background-color: #FFFFFF; font-family: sans-serif; color: #1E293B;">
          <h2 style="color: #4F6DF5; font-size: 20px; margin-top: 0;">Bem-vindo(a) ao time, ${nome}! 🚀</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Estamos muito felizes em receber você na equipe da ITO Clinic! Seu processo de admissão digital foi iniciado.
          </p>
          ${
            linkDocumento
              ? `<p style="font-size: 14px; line-height: 1.6; color: #334155;">
                  Por favor, clique no botão abaixo para preencher seus dados e enviar os documentos necessários:
                </p>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${linkDocumento}" target="_blank" style="background-color: #4F6DF5; color: #FFFFFF; text-decoration: none; padding: 14px 28px; font-size: 14px; font-weight: bold; border-radius: 8px; display: inline-block;">
                    📋 Acessar Ficha de Admissão
                  </a>
                </div>`
              : ''
          }
        </div>
        ${footerHtml}
      `;
    } else {
      subject = subject || `📢 Comunicado do RH · ${nome}`;
      htmlContent = `
        ${headerHtml}
        <div style="padding: 32px 24px; background-color: #FFFFFF; font-family: sans-serif; color: #1E293B;">
          <h2 style="color: #0F172A; font-size: 18px; margin-top: 0;">Prezado(a) ${nome},</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            ${mensagem || 'Você recebeu uma nova atualização da Coordenação de Recursos Humanos da ITO Clinic.'}
          </p>
        </div>
        ${footerHtml}
      `;
    }

    // Disparo via Resend API se houver chave configurada, ou simulação de envio
    if (resendApiKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `ITO Clinic RH <${senderEmail}>`,
          to: [to],
          subject: subject,
          html: htmlContent,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Falha ao disparar e-mail via Resend API.');
      }

      const data = await res.json();
      return new Response(
        JSON.stringify({ success: true, messageId: data.id, status: 'enviado_resend' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Retorna sucesso de preparação quando a chave do Resend estiver pendente de inclusão nos secrets
      return new Response(
        JSON.stringify({
          success: true,
          status: 'simulado',
          info: 'Edge Function preparada com sucesso. Para envio real, adicione a RESEND_API_KEY nos secrets do Supabase.',
          payload: { to, subject, nome, tipo }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (err: any) {
    console.error('Erro na Edge Function enviar-email:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno ao processar o e-mail.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
