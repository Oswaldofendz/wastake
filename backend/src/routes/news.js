import { Router } from 'express';
import { getNewsForAsset } from '../services/newsService.js';

export const newsRouter = Router();

// GET /api/news/:id?type=crypto|stock
newsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const type = req.query.type ?? 'crypto';

  try {
    const news = await getNewsForAsset(id, type);
    res.json({ id, type, count: news.length, news });
  } catch (err) {
    console.error('[news route]', err.message);
    res.status(500).json({ error: 'Error al obtener noticias' });
  }
});
