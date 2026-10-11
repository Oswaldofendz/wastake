import { Router } from 'express';
import { getRawNewsForAsset } from '../services/newsService.js';
import { scoreHeadline } from '../services/fundamentalScoringService.js';

export const fundamentalsRouter = Router();

// GET /api/fundamentals/:id?type=crypto|stock&name=Bitcoin&symbol=BTC
// Public RSS and deterministic rules only; this endpoint does not call AI APIs.
fundamentalsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const type = req.query.type === 'crypto' ? 'crypto' : 'stock';
  const aliases = [req.query.name, req.query.symbol]
    .filter(value => typeof value === 'string')
    .map(value => value.trim().slice(0, 80))
    .filter(Boolean);

  if (!id || id.length > 80) {
    return res.status(400).json({ error: 'Invalid asset id' });
  }

  try {
    const headlines = await getRawNewsForAsset(id, type, aliases);
    const news = headlines.map(scoreHeadline);
    res.json({ id, type, count: news.length, scoringVersion: 'keyword-rules-v1', news });
  } catch (err) {
    console.error('[fundamentals route]', err.message);
    res.status(502).json({ error: 'Error al obtener titulares para Fundamentales' });
  }
});
