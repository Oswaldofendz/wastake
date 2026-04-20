import { useState } from 'react';

// ─── Íconos ───────────────────────────────────────────────────────────────────

function IconMail() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 5.5A1.5 1.5 0 0 1 4 4h12a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5v-9Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.5 5.5 7.5 5.25 7.5-5.25" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 9V7a3 3 0 0 1 6 0v2" />
      <rect x="4" y="9" width="12" height="9" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="13.5" r="1" fill="currentColor" />
    </svg>
  );
}

function IconEye({ open }) {
  return open ? (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6Z" />
      <circle cx="10" cy="10" r="2.5" strokeLinecap="round" />
    </svg>
  ) : (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l14 14M8.5 8.6A2.5 2.5 0 0 0 12 13m-4.5-9C9 3.4 9.5 3.2 10 3c5 0 8 7 8 7a14.6 14.6 0 0 1-2 2.7M6.5 6.5A14.5 14.5 0 0 0 2 10s3 7 8 7c1.6 0 3-.5 4.2-1.3" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 10l4 4 8-8" />
    </svg>
  );
}

// ─── Input con ícono ──────────────────────────────────────────────────────────

function InputField({ icon, label, type, value, onChange, placeholder, minLength, required, rightSlot }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--silver-400)' }}>
          {icon}
        </span>
        <input
          type={type}
          required={required}
          minLength={minLength}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-xl px-3 py-3 pl-10 text-sm text-white placeholder-slate-600 transition-all outline-none"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-normal)',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--accent-silver)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-silver-glow)'; }}
          onBlur={e =>  { e.target.style.borderColor = 'var(--border-normal)'; e.target.style.boxShadow = 'none'; }}
        />
        {rightSlot && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightSlot}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Pantalla de confirmación ─────────────────────────────────────────────────

function ConfirmScreen({ onBack }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 px-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: 'var(--accent-silver-glow)', border: '1px solid var(--accent-silver)' }}
      >
        <span style={{ color: 'var(--accent-silver)' }}><IconCheck /></span>
      </div>
      <h3 className="text-white font-semibold text-lg mb-2">¡Cuenta creada!</h3>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        Revisa tu bandeja de entrada y confirma tu email para activar tu cuenta.
      </p>
      <button
        onClick={onBack}
        className="text-sm font-medium underline transition-colors"
        style={{ color: 'var(--accent-silver)' }}
      >
        Volver al inicio de sesión
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AuthModal({ onSignIn, onSignUp }) {
  const [mode, setMode]           = useState('login'); // 'login' | 'signup'
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [error, setError]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await onSignIn(email, password);
      } else {
        await onSignUp(email, password);
        setDone(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function switchMode(m) {
    setMode(m);
    setError(null);
    setEmail('');
    setPassword('');
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 px-4"
      style={{ background: 'linear-gradient(160deg, #090909 0%, #0c0c0d 40%, #09090a 100%)' }}
    >
      {/* Fondo decorativo con glow teal sutil */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(46,196,200,0.06) 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-md relative">

        {/* Logo + titulo */}
        <div className="text-center mb-8">
          <img
            src="/logo-completo.png"
            alt="WaStake"
            className="mx-auto mb-4"
            style={{
              height: '80px',
              width: 'auto',
              mixBlendMode: 'lighten',
              filter: 'brightness(1.4) contrast(1.1)',
            }}
          />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Análisis de mercados financieros
          </p>
        </div>

        {/* Card principal */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          }}
        >

          {/* Tabs Login / Registro */}
          <div className="flex" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {['login', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className="flex-1 py-3.5 text-sm font-semibold transition-colors relative"
                style={{
                  color: mode === m ? 'var(--accent-silver)' : 'var(--text-muted)',
                  background: 'transparent',
                  border: 'none',
                }}
              >
                {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                {mode === m && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-3/4 rounded-full"
                    style={{ background: 'var(--accent-silver)' }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Contenido */}
          <div className="p-6">
            {done ? (
              <ConfirmScreen onBack={() => { setDone(false); switchMode('login'); }} />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">

                <InputField
                  icon={<IconMail />}
                  label="Email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                />

                <InputField
                  icon={<IconLock />}
                  label="Contraseña"
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="transition-colors"
                      style={{ color: 'var(--silver-400)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <IconEye open={showPass} />
                    </button>
                  }
                />

                {mode === 'signup' && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Mínimo 6 caracteres. Recibirás un email de confirmación.
                  </p>
                )}

                {error && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm"
                    style={{
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      color: '#f87171',
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* Botón principal */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  style={{
                    background: loading
                      ? '#3a3a3a'
                      : 'linear-gradient(135deg, #3a3a3a 0%, var(--accent-silver) 100%)',
                    color: '#fff',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    boxShadow: loading ? 'none' : '0 4px 16px var(--accent-silver-glow)',
                  }}
                >
                  {loading ? (
                    <>
                      <span
                        className="w-4 h-4 rounded-full border-2 animate-spin"
                        style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}
                      />
                      Procesando...
                    </>
                  ) : mode === 'login' ? (
                    'Iniciar sesión'
                  ) : (
                    'Crear cuenta'
                  )}
                </button>

                {/* Separador */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>o</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                </div>

                {/* Toggle rápido */}
                <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                  <button
                    type="button"
                    onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                    className="font-medium underline transition-colors"
                    style={{ color: 'var(--accent-silver)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {mode === 'login' ? 'Regístrate gratis' : 'Inicia sesión'}
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs mt-5" style={{ color: 'var(--text-muted)' }}>
          WaStake no es asesoría financiera. Usa los datos bajo tu propia responsabilidad.
        </p>
      </div>
    </div>
  );
}
