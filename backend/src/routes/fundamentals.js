import { Router } from 'express';
import { getRawNewsForAsset } from '../services/newsService.js';
import { scoreHeadline } from '../services/fundamentalScoringService.js';
import { enrichFundamentalsNews } from '../services/fundamentalsAnalysisService.js';

export const fundamentalsRouter = Router();

// GET /api/fundamentals/:id?type=crypto|stock&name=Bitcoin&symbol=BTC&lang=es|pt|en
fundamentalsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const type = req.query.type === 'crypto' ? 'crypto' : 'stock';
  const aliases = [req.query.name, req.query.symbol]
    .filter(value => typeof value === 'string')
    .map(value => value.trim().slice(0, 80))
    .filter(Boolean);
  const lang = ['es', 'pt', 'en'].includes(req.query.lang) ? req.query.lang : 'es';

  if (!id || id.length > 80) {
    return res.status(400).json({ error: 'Invalid asset id' });
  }

  try {
    const headlines = await getRawNewsForAsset(id, type, aliases);
    const baseline = headlines.map(scoreHeadline);
    const analysis = await enrichFundamentalsNews(baseline, lang);
    res.json({ id, type, lang, count: analysis.news.length, scoringVersion: 'keyword-rules-v1', ...analysis });
  } catch (err) {
    console.error('[fundamentals route]', err.message);
    res.status(502).json({ error: 'Error al obtener titulares para Fundamentales' });
  }
});
