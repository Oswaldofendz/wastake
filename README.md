# MarketPulse Bot — Sprint 1

## Estructura del proyecto

```
marketpulse/
├── frontend/          # React + Vite + Tailwind
└── backend/           # Node.js + Express
```

## Setup rápido

### 1. Variables de entorno

**backend/.env**
```
PORT=3001
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
COINGECKO_BASE=https://api.coingecko.com/api/v3
```

**frontend/.env**
```
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 2. Instalar y correr

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (otra terminal)
cd frontend && npm install && npm run dev
```

### 3. Supabase — tabla requerida para Sprint 1

```sql
-- Ejecutar en Supabase SQL editor
create table user_watchlist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  asset_id text not null,        -- ej: 'bitcoin', 'ethereum'
  asset_type text not null,      -- 'crypto' | 'stock' | 'commodity'
  display_name text not null,
  created_at timestamptz default now()
);

alter table user_watchlist enable row level security;

create policy "Users see own watchlist"
  on user_watchlist for all
  using (auth.uid() = user_id);
```

## Activos soportados en Sprint 1

| Activo       | ID            | Fuente        |
|--------------|---------------|---------------|
| Bitcoin      | bitcoin       | CoinGecko     |
| Ethereum     | ethereum      | CoinGecko     |
| Solana       | solana        | CoinGecko     |
| S&P 500      | SPY           | Yahoo Finance |
| MSCI World   | URTH          | Yahoo Finance |
| Mercados Em. | EEM           | Yahoo Finance |
| Oro          | GC=F          | Yahoo Finance |
| Plata        | SI=F          | Yahoo Finance |

## Próximos sprints

- Sprint 2: Motor de análisis técnico (RSI, MACD, EMA, score)
- Sprint 3: Noticias, sentimiento, alertas, cartera
- Sprint 4: Ejecución, paper trading, 2FA
- Sprint 5: Beta pública, app móvil
