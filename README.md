# WaStake

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
git clone https://github.com/TU_USUARIO/wastake.git
cd wastake

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

## Alojamiento gratuito para pruebas

El repositorio incluye `render.yaml` para crear el backend en Render desde este repositorio. El servicio gratuito puede servir para probar WaStake sin pagar Railway, pero no ofrece disponibilidad continua: Render lo suspende tras 15 minutos sin tráfico y puede tardar alrededor de un minuto en responder cuando vuelve a arrancar. Render indica que sus instancias gratuitas no están destinadas a producción. Consulta sus [límites actuales](https://render.com/docs/free).

### Backend → Render

1. En [Render](https://render.com), crea un Web Service conectado al repositorio `wastake` y usa el Blueprint `render.yaml`.
2. Selecciona el plan gratuito. El servicio expone `/health` como comprobación de disponibilidad.
3. Configura las variables secretas que ya tengas en tus proveedores. No las guardes en Git ni en el frontend:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `GEMINI_API_KEY`
   - `GROQ_API_KEY` (si ya tienes una clave configurada)
   - `FRONTEND_URL` → el dominio público actual del frontend
4. Cuando Render termine, copia la URL pública del backend y configúrala como `VITE_API_URL` en los ajustes de entorno del frontend en Vercel. Después, vuelve a desplegar el frontend desde Vercel para que use esa URL.

Las alertas guardadas necesitan las credenciales de Supabase y el motor de alertas solo se ejecuta mientras el backend está despierto. El almacenamiento en memoria de cachés también se reinicia al suspenderse el servicio. No uses esta configuración gratuita como garantía de alertas oportunas o disponibilidad continua.

### Frontend → Vercel (gratis)

1. [vercel.com](https://vercel.com) → New Project → importa el repo
2. Configuración:
   - **Root Directory**: `frontend`
   - **Framework**: Vite (auto-detectado)
3. En **Environment Variables** agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` → la URL pública de tu backend

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
