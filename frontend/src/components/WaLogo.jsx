// Logo WaFinance — "Wa" con barra verde estilo flecha alcista
export function WaLogo({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Fondo redondeado */}
      <rect width="100" height="100" rx="18" fill="#0f172a" />

      {/* Letra W izquierda — dos picos blancos */}
      <path
        d="M8 28 L20 72 L32 45 L44 72 L56 28"
        stroke="white"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Barra diagonal verde — flecha alcista que atraviesa el centro */}
      <path
        d="M38 78 L62 18"
        stroke="#22c55e"
        strokeWidth="11"
        strokeLinecap="round"
      />

      {/* Letra a derecha */}
      {/* Arco exterior */}
      <path
        d="M58 50 C58 38 68 32 76 34 C84 36 90 44 90 54 C90 64 84 72 76 72 C68 72 60 65 58 58 L58 72"
        stroke="white"
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Palo derecho de la a */}
      <line x1="90" y1="35" x2="90" y2="72" stroke="white" strokeWidth="8.5" strokeLinecap="round" />
    </svg>
  );
}

// Versión inline pequeña para navbar
export function WaLogoMark({ className = '' }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`rounded-lg ${className}`}
    >
      <rect width="100" height="100" rx="18" fill="#0f172a" />
      <path d="M8 28 L20 72 L32 45 L44 72 L56 28" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M38 78 L62 18" stroke="#22c55e" strokeWidth="11" strokeLinecap="round" />
      <path d="M58 50 C58 38 68 32 76 34 C84 36 90 44 90 54 C90 64 84 72 76 72 C68 72 60 65 58 58 L58 72" stroke="white" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="90" y1="35" x2="90" y2="72" stroke="white" strokeWidth="8.5" strokeLinecap="round" />
    </svg>
  );
}
