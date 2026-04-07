/** SVG hexagon icon with 'WS' — no external image dependency */
export function WaLogoIcon({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="WaStake"
    >
      <polygon
        points="20,2 36,11 36,29 20,38 4,29 4,11"
        fill="#1e293b"
        stroke="#C8915A"
        strokeWidth="2"
      />
      <text
        x="20"
        y="26"
        textAnchor="middle"
        fontSize="14"
        fontWeight="800"
        fontFamily="system-ui, sans-serif"
        fill="#C8915A"
        letterSpacing="-0.5"
      >
        WS
      </text>
    </svg>
  );
}

/** Versión navbar: hexagon icon + 'WaStake' text inline */
export function WaLogoMark({ iconSize = 28, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <WaLogoIcon size={iconSize} />
      <span className="font-bold text-base tracking-tight leading-none select-none">
        <span style={{ color: '#C8915A' }}>Wa</span>
        <span style={{ color: '#2FC4E0' }}>Stake</span>
      </span>
    </div>
  );
}

/** Logo completo (alias de WaLogoMark para splash/login) */
export function WaLogoFull({ height = 40, className = '' }) {
  return <WaLogoMark iconSize={height} className={className} />;
}

// Alias para compatibilidad con imports existentes
export const WaLogo = WaLogoIcon;
