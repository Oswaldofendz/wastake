import { Router } from 'express';
import { getNewsForAsset, getRawNewsForAsset } from '../services/newsService.js';

export const newsRouter = Router();

// GET /api/news/:id?type=crypto|stock
newsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const type = req.query.type ?? 'crypto';

  try {
    const stage = req.query.stage === 'headlines' ? 'headlines' : 'analysis';
    const raw=stage==='headlines'?await getRawNewsForAsset(id,type):await getNewsForAsset(id,type);
    const news=stage==='headlines'?raw.map(article=>({...article,sentiment:null,impact:null,analysisStatus:'unavailable'})):raw;
    res.json({ id, type, stage, count: news.length, news,sourceStatus:raw.sourceStatus??'ok',stale:raw.stale??false,checkedAt:raw.sourceCheckedAt??null });
  } catch (err) {
    console.error('[news route]', err.message);
    res.status(500).json({ error: 'Error al obtener noticias' });
  }
});
