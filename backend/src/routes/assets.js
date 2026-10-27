import { Router } from 'express';
import { CRYPTO_ASSETS, TRADITIONAL_ASSETS } from '../services/priceService.js';
import { discoverAssets, getCapitalizationUniverse } from '../services/assetDiscoveryService.js';
import { getSingleQuote } from '../services/priceService.js';
import { getCompanyResearch } from '../services/companyResearchService.js';
import { getCryptoResearch } from '../services/cryptoResearchService.js';
import { catalogueMeta } from '../services/catalogueService.js';

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

  res.json({ crypto, traditional,meta:catalogueMeta });
});

// GET /api/assets/search?q=bitcoin
// Buscar activos por nombre o símbolo (útil para agregar activos custom)
assetsRouter.get('/search', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
  if (!q || q.length > 80 || /[\x00-\x1f]/.test(q)) return res.status(400).json({ error: 'Invalid search' });
  try { return res.json(await discoverAssets(q)); }
  catch { return res.status(502).json({ error: 'Search sources unavailable' }); }
});

assetsRouter.get('/rankings', async (_req, res) => {
  try { res.json(await getCapitalizationUniverse()); }
  catch { res.status(502).json({ error: 'Capitalization sources unavailable' }); }
});

assetsRouter.get('/quote/:id', async (req, res) => {
  if (!/^[A-Za-z0-9^=._-]{1,100}$/.test(req.params.id)) return res.status(400).json({ error: 'Invalid asset' });
  try {
    const quote = await getSingleQuote(req.params.id, req.query.type === 'crypto' ? 'crypto' : 'stock');
    if (!quote) return res.status(404).json({ error: 'Quote unavailable' });
    res.json(quote);
  } catch { res.status(502).json({ error: 'Quote source unavailable' }); }
});

assetsRouter.get('/research/:id', async(req,res)=>{
  if(!/^[A-Za-z0-9^=._-]{1,100}$/.test(req.params.id))return res.status(400).json({error:'Invalid asset'});
  const type=typeof req.query.type==='string'?req.query.type:'stock';
  if(!['stock','crypto','etf','bond','forex','commodity','index'].includes(type))return res.status(400).json({error:'Invalid asset type'});
  try{res.json(await (type==='crypto'?getCryptoResearch(req.params.id):getCompanyResearch(req.params.id,type)));}
  catch{res.status(502).json({error:'Company sources unavailable'});}
});
