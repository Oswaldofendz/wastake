import { Router } from 'express';
import { CRYPTO_ASSETS, TRADITIONAL_ASSETS } from '../services/priceService.js';

export const assetsRouter = Router();

// GET /api/assets — catálogo completo de activos soportados
assetsRouter.get('/', (req, res) => {
  const crypto = Object.entries(CRYPTO_ASSETS).map(([id, meta]) => ({
    id,
    ...meta,
    type: 'crypto',
  }));

  const traditional = Object.entries(TRADITIONAL_ASSETS).map(([symbol, meta]) => ({
    id: symbol,
    symbol,
    ...meta,
  }));

  res.json({ crypto, traditional });
});

// GET /api/assets/search?q=bitcoin
// Buscar activos por nombre o símbolo (útil para agregar activos custom)
assetsRouter.get('/search', (req, res) => {
  const q = (req.query.q ?? '').toLowerCase();
  if (!q || q.length < 2) return res.json([]);

  const all = [
    ...Object.entries(CRYPTO_ASSETS).map(([id, m]) => ({ id, ...m, type: 'crypto' })),
    ...Object.entries(TRADITIONAL_ASSETS).map(([id, m]) => ({ id, symbol: id, ...m })),
  ];

  const matches = all.filter(a =>
    a.name.toLowerCase().includes(q) ||
    (a.symbol ?? '').toLowerCase().includes(q) ||
    a.id.toLowerCase().includes(q)
  );

  res.json(matches.slice(0, 10));
});
