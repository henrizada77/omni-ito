// Cliente Supabase — instância única para toda a aplicação.
//
// Antes, a ausência das variáveis caía num placeholder e o app SUBIA parecendo
// saudável: a interface renderizava e cada query falhava sozinha, com erro de
// rede. O usuário via telas vazias e ninguém sabia dizer por quê. Falha
// silenciosa de configuração é a categoria mais cara de incidente, porque o
// alarme não dispara.
//
// Agora falha alto e cedo, no boot. Ver docs/AUDITORIA.md, item ARQ-05.

import { createClient } from '@supabase/supabase-js';

function obrigatoria(nome: string, valor: string | undefined): string {
  if (!valor) {
    throw new Error(
      `Variável de ambiente ${nome} não definida. ` +
      `Copie .env.example para .env e preencha com os valores do projeto Supabase ` +
      `(Dashboard → Project Settings → API).`
    );
  }
  return valor;
}

const supabaseUrl = obrigatoria('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = obrigatoria('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
