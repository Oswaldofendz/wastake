// WaStake logos — usa los PNGs en /public/
// logo-icon.png  → ícono cuadrado (símbolo W+flecha)
// logo-full.png  → logo completo con texto "WaStake · ANÁLISIS DE MERCADO"

/** Ícono cuadrado — para navbar, favicon fallback, badges */
export function WaLogoIcon({ size = 32, className = '' }) {
  return (
    <img
      src="/logo-icon.png"
      alt="WaStake"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      draggable={false}
    />
  );
}

/** Logo completo con texto — para splash, login, header de páginas */
export function WaLogoFull({ height = 64, className = '' }) {
  return (
    <img
      src="/logo-full.png"
      alt="WaStake — Análisis de Mercado"
      height={height}
      className={`object-contain ${className}`}
      draggable={false}
    />
  );
}

/** Versión navbar: ícono + texto "WaStake" inline */
export function WaLogoMark({ iconSize = 28, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src="/logo-icon.png"
        alt=""
        width={iconSize}
        height={iconSize}
        className="object-contain flex-shrink-0"
        draggable={false}
      />
      <span className="font-bold text-base tracking-tight leading-none select-none">
        <span style={{ color: '#C8915A' }}>Wa</span>
        <span style={{ color: '#2FC4E0' }}>Stake</span>
      </span>
    </div>
  );
}

// Alias para compatibilidad con imports existentes
export const WaLogo = WaLogoIcon;
