import { Router } from 'express';
import { getCryptoOHLCV, getTraditionalOHLCV } from '../services/priceService.js';
import { computeIndicators } from '../services/technicalAnalysisService.js';

export const analysisRouter = Router();

// GET /api/analysis/:id?type=crypto&days=90
// GET /api/analysis/:id?type=stock
//
// Ejemplos:
//   /api/analysis/bitcoin?type=crypto&days=90
//   /api/analysis/SPY?type=stock
//   /api/analysis/GC%3DF?type=stock   (GC=F url-encoded)
analysisRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { type = 'crypto', days = '90' } = req.query;

  try {
    let candles;

    if (type === 'crypto') {
      candles = await getCryptoOHLCV(id, parseInt(days));
    } else {
      candles = await getTraditionalOHLCV(id);
    }

    if (!candles || candles.length === 0) {
      return res.status(404).json({ error: `No se encontraron datos OHLCV para "${id}"` });
    }

    const analysis = computeIndicators(candles);
    res.json({ id, type, analysis });

  } catch (err) {
    const status = err.message.startsWith('Se necesitan') ? 422 : 502;
    res.status(status).json({ error: err.message });
  }
});
