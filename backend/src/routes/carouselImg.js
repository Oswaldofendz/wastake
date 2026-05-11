import { Router } from 'express';
import axios from 'axios';

export const carouselImgRouter = Router();

// ============================================================================
// WaPulse · Carousel image proxy
// ----------------------------------------------------------------------------
// Sirve las slides del bucket Supabase `carousel-slides` a través de un dominio
// que SÍ podemos verificar en TikTok Developer Portal (este backend en Railway).
//
// TikTok exige que las URLs usadas con PULL_FROM_URL pertenezcan a un dominio
// del cual hayamos demostrado propiedad. supabase.co no es nuestro y no lo
// podemos verificar, así que en lugar de exponer URLs directas de Supabase,
// el pipeline genera URLs de la forma:
//
//   https://wastake-backend-production.up.railway.app/api/carousel-img/<post_id>/slide_NN.jpg
//
// Este router las recibe, baja el archivo público de Supabase Storage y lo
// reenvía como stream con los headers de imagen apropiados.
// ============================================================================

const BUCKET = 'carousel-slides';
const SUPABASE_URL = process.env.SUPABASE_URL;

// Caché de respuesta — las slides no cambian una vez subidas. Permitir que
// CDN/cliente las cacheen un día reduce carga si TikTok pide la misma URL
// varias veces (lo hace).
const CACHE_CONTROL = 'public, max-age=86400, immutable';

carouselImgRouter.get('/:postId/:slide', async (req, res) => {
  const { postId, slide } = req.params;

  // Validación estricta para evitar path traversal o acceso a archivos
  // fuera del esquema esperado.
  if (!/^\d+$/.test(postId)) {
    return res.status(400).json({ error: 'invalid postId' });
  }
  if (!/^slide_\d{2}\.jpg$/.test(slide)) {
    return res.status(400).json({ error: 'invalid slide filename' });
  }

  if (!SUPABASE_URL) {
    console.error('[carousel-img] SUPABASE_URL not configured');
    return res.status(500).json({ error: 'SUPABASE_URL not set' });
  }

  const upstreamUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${postId}/${slide}`;

  try {
    const upstream = await axios.get(upstreamUrl, {
      responseType: 'stream',
      timeout: 20000,
    });

    res.set('Content-Type', upstream.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', CACHE_CONTROL);
    if (upstream.headers['content-length']) {
      res.set('Content-Length', upstream.headers['content-length']);
    }

    upstream.data.pipe(res);
  } catch (err) {
    const status = err.response?.status || 502;
    const msg = err.message?.slice(0, 120);
    console.error(`[carousel-img] proxy failed (${status}) ${postId}/${slide}: ${msg}`);
    return res.status(status === 404 ? 404 : 502).json({
      error: status === 404 ? 'slide not found' : 'upstream error',
    });
  }
});
