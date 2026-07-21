// Marca d'água "papel timbrado" para as telas que imprimem via window.print()
// (advertência, avaliação). Renderiza a logo ITO em SVG (imprime como conteúdo,
// não como background — os @media print zeram background-image). Só aparece na
// impressão (`hidden print:*`); na tela fica oculta para não poluir o modal.
export default function LetterheadWatermark() {
  return (
    <div
      aria-hidden
      className="hidden print:flex pointer-events-none absolute inset-0 items-center justify-center"
      style={{ zIndex: 0 }}
    >
      <svg
        viewBox="0 0 100 100"
        style={{ width: '58%', maxWidth: 360, opacity: 0.06 }}
        fill="#000000"
      >
        <circle cx="50" cy="50" r="47" fill="none" stroke="#000000" strokeWidth="2.2" />
        <rect x="31" y="29" width="3.2" height="42" />
        <rect x="65.8" y="29" width="3.2" height="42" />
        <rect x="42" y="29" width="16" height="3.2" />
        <rect x="42" y="67.8" width="16" height="3.2" />
        <rect x="48.4" y="40" width="3.2" height="20" />
      </svg>
    </div>
  );
}
