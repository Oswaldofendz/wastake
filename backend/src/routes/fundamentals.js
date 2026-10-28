import { Router } from 'express';
import {getNewsSnapshot} from '../services/newsSnapshotService.js';

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
    res.set('Cache-Control','no-store');
    res.json(await getNewsSnapshot({id,type,aliases},lang,req.query.stage!=='headlines'));
  } catch (err) {
    console.error('[fundamentals route]', err.message);
    res.status(502).json({ error: 'Error al obtener titulares para Fundamentales' });
  }
});
