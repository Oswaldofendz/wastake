# WaFinance Pulse

Plataforma de inteligencia de mercados financieros en tiempo real.

## Stack

- **Frontend**: React 18, Tailwind CSS, Vite, i18next (ES/PT/EN)
- **Backend**: Express.js, Node.js
- **Base de datos**: Supabase (PostgreSQL + Auth)
- **Análisis técnico**: RSI, MACD, EMA, Bollinger Bands, ATR

## Funcionalidades

- Dashboard con precios en tiempo real (crypto + ETFs + commodities + forex)
- Análisis técnico con señales de compra/venta
- Panorama: señal de trading con semáforo y gauges de confluencia
- Sistema de alertas personalizadas (precio, RSI, MACD)
- Mercados: heatmap, Fear & Greed, dominancia BTC, correlaciones
- Portfolio con seguimiento de posiciones
- Noticias con análisis de sentimiento (Gemini AI)
- Calendario económico macro

---

## Desarrollo local

### 1. Clonar e instalar

```bash
git clone https://github.com/TU_USUARIO/wafinance-pulse.git
cd wafinance-pulse

cd backend && npm install
cd ../frontend && npm install
```

### 2. Variables de entorno

```bash
cp backend/.env.example backend/.env
# Edita backend/.env con tus claves

cp frontend/.env.example frontend/.env
# Edita frontend/.env con tus claves
```

### 3. Iniciar

```bash
# Terminal 1
cd backend && npm start

# Terminal 2
cd frontend && npm run dev
```

Abre http://localhost:5173

---

## Deploy en producción

### Backend → Render (gratis)

1. [render.com](https://render.com) → New → Web Service
2. Conecta tu repo de GitHub
3. Configuración:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
   - **Plan**: Free
4. En **Environment Variables** agrega:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `GEMINI_API_KEY`
   - `FRONTEND_URL` → tu URL de Vercel

### Frontend → Vercel (gratis)

1. [vercel.com](https://vercel.com) → New Project → importa el repo
2. Configuración:
   - **Root Directory**: `frontend`
   - **Framework**: Vite (auto-detectado)
3. En **Environment Variables** agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` → tu URL de Render

---

## Variables de entorno

### `backend/.env`
| Variable | Descripción |
|---|---|
| `PORT` | Puerto (default: 3001) |
| `FRONTEND_URL` | URL del frontend para CORS |
| `SUPABASE_URL` | URL de tu proyecto Supabase |
| `SUPABASE_SERVICE_KEY` | Service role key de Supabase |
| `GEMINI_API_KEY` | API key de Google Gemini |

### `frontend/.env`
| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL de tu proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key pública de Supabase |
| `VITE_API_URL` | URL del backend |
