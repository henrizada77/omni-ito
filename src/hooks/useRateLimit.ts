import { useEffect, useRef, useState } from 'react';

/**
 * Rate limit client-side por chave, guardado em localStorage.
 *
 * Uso: `const rl = useRateLimit('omni_pesquisa_last', 3 * 60 * 60 * 1000)`.
 *   rl.allowed          → true se pode enviar agora
 *   rl.retryAfterSec    → segundos restantes até liberar (0 se allowed)
 *   rl.markSent()       → chame após submit com sucesso; carimba o timestamp
 *
 * O contador regressivo atualiza sozinho a cada segundo enquanto está bloqueado.
 *
 * Notas de segurança: isso não é um rate limit "de verdade" — quem quiser
 * bypassa em modo anônimo ou trocando de navegador. É proteção contra
 * double-click e spam casual, coerente com a promessa de anonimato do canal
 * (não gravamos IP no servidor).
 */
export function useRateLimit(key: string, intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  const tickerRef = useRef<number | null>(null);

  const readLast = (): number => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return 0;
      const n = Number(raw);
      // Chave adulterada, corrompida, ou vinda de um outro clock — trata como
      // "nunca enviado" em vez de travar o formulário para sempre.
      if (!Number.isFinite(n) || n <= 0 || n > Date.now()) return 0;
      return n;
    } catch {
      return 0;
    }
  };

  const last = readLast();
  const nextAllowed = last + intervalMs;
  const remainingMs = Math.max(0, nextAllowed - now);
  const allowed = remainingMs === 0;

  // Só liga o ticker enquanto ainda estiver bloqueado.
  useEffect(() => {
    if (allowed) return;
    tickerRef.current = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (tickerRef.current !== null) window.clearInterval(tickerRef.current);
    };
  }, [allowed]);

  const markSent = () => {
    try {
      localStorage.setItem(key, String(Date.now()));
      setNow(Date.now());
    } catch {
      // localStorage bloqueado (modo privado em iOS antigo, por ex). Não é
      // erro de UX: o envio passa; o rate limit simplesmente não persiste.
    }
  };

  return {
    allowed,
    retryAfterSec: Math.ceil(remainingMs / 1000),
    markSent
  };
}

/** Formata segundos como "2h 45min" ou "45min 12s" ou "45s". */
export function formatRetryAfter(sec: number): string {
  if (sec <= 0) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}
