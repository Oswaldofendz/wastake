import { Router } from 'express';
import { CRYPTO_ASSETS } from '../services/priceService.js';
import { catalogueMeta } from '../services/catalogueService.js';
import {getIntradayCandles} from '../services/intradayService.js';
import {
  getCryptoPrices,
  getCryptoOHLCV,
  getTraditionalPrices,
  getTraditionalOHLCV,
} from '../services/priceService.js';

export const priceRouter = Router();

// GET /api/prices/all — todos los activos de una vez
priceRouter.get('/all', async (req, res) => {
  const [cryptoResult, traditionalResult] = await Promise.allSettled([
    getCryptoPrices(),
    getTraditionalPrices(),
  ]);

  // Si AMBAS fuentes fallaron → 502
  if (cryptoResult.status === 'rejected' && traditionalResult.status === 'rejected') {
    console.error('Both price sources failed:', cryptoResult.reason?.message);
    return res.status(502).json({
      error: 'Failed to fetch prices',
      detail: cryptoResult.reason?.message ?? 'Unknown error',
    });
  }

  const cryptoRaw   = cryptoResult.status === 'fulfilled'    ? cryptoResult.value    : {};
  const traditional = traditionalResult.status === 'fulfilled' ? traditionalResult.value : {};

  if (cryptoResult.status === 'rejected')
    console.warn('[/all] Crypto failed, serving traditional only:', cryptoResult.reason?.message);
  if (traditionalResult.status === 'rejected')
    console.warn('[/all] Traditional failed, serving crypto only:', traditionalResult.reason?.message);

  const { _isStale, _staleTs, ...crypto } = cryptoRaw;
  const isStale = _isStale ?? (cryptoResult.status === 'rejected') ?? false;

  const completeCrypto=Object.fromEntries(Object.entries(CRYPTO_ASSETS).map(([id,meta])=>[id,{...meta,id,type:'crypto',price:null,change24h:null,...crypto[id]}]));
  res.json({ crypto:completeCrypto, traditional, catalogue:catalogueMeta, ts: Date.now(), isStale, staleTs: _staleTs ?? null });
});

// GET /api/prices/crypto — solo crypto
priceRouter.get('/crypto', async (req, res) => {
  try {
    const ids = req.query.ids ? req.query.ids.split(',') : undefined;
    const { _isStale, _staleTs, ...data } = await getCryptoPrices(ids);
    res.json({ ...data, isStale: _isStale ?? false });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/prices/traditional — solo activos tradicionales
priceRouter.get('/traditional', async (req, res) => {
  try {
    const symbols = req.query.symbols ? req.query.symbols.split(',') : undefined;
    const data = await getTraditionalPrices(symbols);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/prices/ohlcv/:id?type=crypto&days=7
// GET /api/prices/ohlcv/:id?type=stock&interval=1d&range=3mo
priceRouter.get('/ohlcv/:id', async (req, res) => {
  const { id } = req.params;
  const { type = 'crypto', days = '7', interval = '1d', range = '3mo' } = req.query;
  if (!/^[A-Za-z0-9^=._-]{1,100}$/.test(id)) return res.status(400).json({ error: 'Invalid asset' });
  if(!['1d','4h','15m'].includes(interval))return res.status(400).json({error:'Unsupported candle interval'});

  try {
    if(interval!=='1d')return res.json({id,...await getIntradayCandles(id,type,interval)});
    let candles;
    if (type === 'crypto') {
      candles = await getCryptoOHLCV(id, Math.max(30,Math.min(365,parseInt(days)||90)));
    } else {
      candles = await getTraditionalOHLCV(id, interval, range);
    }
    res.json({ id, candles, source: candles.source ?? 'Yahoo Finance / Stooq', currency: candles.currency ?? null,interval:'1d',intervalSeconds:86400 });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});
