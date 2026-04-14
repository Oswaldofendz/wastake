import { Router } from 'express';
import {
  getCryptoPrices,
  getCryptoOHLCV,
  getTraditionalPrices,
  getTraditionalOHLCV,
} from '../services/priceService.js';

export const priceRouter = Router();

// GET /api/prices/all — todos los activos de una vez
priceRouter.get('/all', async (req, res) => {
  try {
    const [cryptoRaw, traditional] = await Promise.all([
      getCryptoPrices(),
      getTraditionalPrices(),
    ]);

    // Strip internal stale markers before sending to client
    const { _isStale, _staleTs, ...crypto } = cryptoRaw;
    const isStale = _isStale ?? false;

    res.json({ crypto, traditional, ts: Date.now(), isStale, staleTs: _staleTs ?? null });
  } catch (err) {
    console.error('Error fetching all prices:', err.message);
    res.status(502).json({ error: 'Failed to fetch prices', detail: err.message });
  }
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

  try {
    let candles;
    if (type === 'crypto') {
      candles = await getCryptoOHLCV(id, parseInt(days));
    } else {
      candles = await getTraditionalOHLCV(id, interval, range);
    }
    res.json({ id, candles });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});
