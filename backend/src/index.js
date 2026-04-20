import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { priceRouter }    from './routes/prices.js';
import { assetsRouter }   from './routes/assets.js';
import { analysisRouter } from './routes/analysis.js';
import { newsRouter }     from './routes/news.js';
import { marketRouter }   from './routes/market.js';
import { wapulseRouter }  from './routes/wapulse.js';
import { startAlertEngine } from './services/alertService.js';

const app  = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// Seguridad HTTP — headers estándar (HSTS, X-Frame-Options, CSP básico, etc.)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // permite que el frontend externo consuma la API
  contentSecurityPolicy: false, // desactivado para API REST (solo necesario en apps que sirven HTML)
}));

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://wastake.vercel.app',
    'https://wastake-git-main-oswaldofendz.vercel.app',
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ],
  credentials: true,
}));
app.use(express.json());

// Rate limit global — 500 req / 15 min
// (Panorama hace 6 llamadas simultaneas, Dashboard polling cada 60s)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
}));

// Rate limit por ruta API — 120 req / min
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });

app.get('/health', (_, res) => res.json({ status: 'ok', ts: Date.now() }));

app.use('/api/prices',   apiLimiter, priceRouter);
app.use('/api/assets',   apiLimiter, assetsRouter);
app.use('/api/analysis', apiLimiter, analysisRouter);
app.use('/api/news',     apiLimiter, newsRouter);
app.use('/api/market',   apiLimiter, marketRouter);
app.use('/api/wapulse',  apiLimiter, wapulseRouter);

app.listen(PORT, () => {
  console.log(`WaStake backend running on port ${PORT}`);
  startAlertEngine();
});
