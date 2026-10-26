import { Router } from 'express';
import { getNewsForAsset, getRawNewsForAsset } from '../services/newsService.js';

export const newsRouter = Router();

// GET /api/news/:id?type=crypto|stock
newsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const type = req.query.type ?? 'crypto';

  try {
    const stage = req.query.stage === 'headlines' ? 'headlines' : 'analysis';
    const news = stage === 'headlines'
      ? (await getRawNewsForAsset(id,type)).map(article=>({...article,sentiment:null,impact:null,analysisStatus:'unavailable'}))
      : await getNewsForAsset(id, type);
    res.json({ id, type, stage, count: news.length, news });
  } catch (err) {
    console.error('[news route]', err.message);
    res.status(500).json({ error: 'Error al obtener noticias' });
  }
});
