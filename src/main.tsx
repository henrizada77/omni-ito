import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ligarCapturaGlobal } from './utils/telemetria'

// Antes de renderizar: erro que acontece durante o primeiro render também
// precisa ser registrado. O ErrorBoundary cobre erro de render; isto cobre o
// resto — handler de evento, promessa sem catch, chunk que não carrega.
ligarCapturaGlobal()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
