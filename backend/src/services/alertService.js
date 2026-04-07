import { createClient } from '@supabase/supabase-js';
import { getCryptoPrices, getTraditionalPrices, getCryptoOHLCV, getTraditionalOHLCV } from './priceService.js';
import { computeIndicators } from './technicalAnalysisService.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const indicatorCache = new Map();
let isRunning = false;

async function getIndicators(assetId, assetType) {
  const cacheKey = `${assetType}_${assetId}`;
  if (indicatorCache.has(cacheKey)) return indicatorCache.get(cacheKey);

  try {
    let candles;
    if (assetType === 'crypto') {
      candles = await getCryptoOHLCV(assetId, 90);
    } else {
      candles = await getTraditionalOHLCV(assetId);
    }

    if (!candles || candles.length === 0) return null;

    const indicators = computeIndicators(candles);
    indicatorCache.set(cacheKey, indicators);
    setTimeout(() => indicatorCache.delete(cacheKey), 5 * 60 * 1000);

    return indicators;
  } catch {
    return null;
  }
}

async function evaluateAlert(alert, priceMap) {
  const assetPrice = priceMap[alert.asset_id];
  if (!assetPrice) return false;

  const price = assetPrice.price;
  const change24h = assetPrice.change24h;

  switch (alert.alert_type) {
    case 'price_above':
      return price >= alert.target_value;

    case 'price_below':
      return price <= alert.target_value;

    case 'change_above':
      return change24h >= alert.target_value;

    case 'change_below':
      return change24h <= alert.target_value;

    case 'rsi_overbought': {
      const indicators = await getIndicators(alert.asset_id, alert.asset_type);
      return indicators?.indicators?.rsi?.current >= 70;
    }

    case 'rsi_oversold': {
      const indicators = await getIndicators(alert.asset_id, alert.asset_type);
      return indicators?.indicators?.rsi?.current <= 30;
    }

    case 'macd_bullish': {
      const indicators = await getIndicators(alert.asset_id, alert.asset_type);
      return indicators?.indicators?.macd?.current?.histogram > 0;
    }

    case 'macd_bearish': {
      const indicators = await getIndicators(alert.asset_id, alert.asset_type);
      return indicators?.indicators?.macd?.current?.histogram < 0;
    }

    default:
      return false;
  }
}

async function checkAlerts() {
  try {
    const cryptoPrices = await getCryptoPrices();
    const traditionalPrices = await getTraditionalPrices();
    const priceMap = { ...cryptoPrices, ...traditionalPrices };

    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('is_active', true)
      .is('triggered_at', null);

    if (error) throw error;
    if (!alerts || alerts.length === 0) return;

    let triggered = 0;
    for (const alert of alerts) {
      const shouldTrigger = await evaluateAlert(alert, priceMap);
      if (shouldTrigger) {
        const { error: updateError } = await supabase
          .from('alerts')
          .update({ triggered_at: new Date().toISOString(), is_active: false })
          .eq('id', alert.id);

        if (!updateError) {
          triggered++;
        }
      }
    }

    if (triggered > 0) {
      console.log(`[AlertEngine] Triggered ${triggered} alert(s)`);
    }
  } catch (err) {
    console.error(`[AlertEngine] Error:`, err.message);
  }
}

export function startAlertEngine() {
  if (isRunning) return;
  isRunning = true;
  console.log('[AlertEngine] Starting...');

  checkAlerts();
  setInterval(checkAlerts, 60 * 1000);
}
