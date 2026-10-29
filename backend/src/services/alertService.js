import { createClient } from '@supabase/supabase-js';
import { getSingleQuote, getCryptoOHLCV, getTraditionalOHLCV } from './priceService.js';
import { computeIndicators } from './technicalAnalysisService.js';
import {completedDailyCandles} from './dailyCandles.js';
import {evaluateAlertCondition} from './alertConditions.js';

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const indicatorCache = new Map();
let isRunning = false,checking=false;

async function getIndicators(assetId, assetType) {
  const cacheKey = `${assetType}_${assetId}`;
  if (indicatorCache.has(cacheKey)) return indicatorCache.get(cacheKey);

  try {
    let candles;
    if (assetType === 'crypto') {
      candles = await getCryptoOHLCV(assetId, 365);
    } else {
      candles = await getTraditionalOHLCV(assetId);
    }

    if (!candles || candles.length === 0) return null;

    const indicators = computeIndicators(completedDailyCandles(candles));
    indicatorCache.set(cacheKey, indicators);
    setTimeout(() => indicatorCache.delete(cacheKey), 5 * 60 * 1000);

    return indicators;
  } catch {
    return null;
  }
}

async function checkAlerts() {
  if(checking)return;checking=true;
  try {

    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('is_active', true)
      .is('triggered_at', null);

    if (error) throw error;
    if (!alerts || alerts.length === 0) return;

    const quotes=new Map();
    let triggered = 0;
    for (const alert of alerts) {
      const technical=!/^(price|change)_/.test(alert.alert_type);
      const key=`${alert.asset_type}:${alert.asset_id}`;
      if(!technical&&!quotes.has(key)){try{quotes.set(key,await getSingleQuote(alert.asset_id,alert.asset_type==='crypto'?'crypto':'stock'));}catch{quotes.set(key,null);}}
      const indicators=technical?await getIndicators(alert.asset_id,alert.asset_type):null;
      const shouldTrigger=evaluateAlertCondition(alert,quotes.get(key),indicators);
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
  }finally{checking=false;}
}

export function startAlertEngine() {
  if (isRunning) return;
  if (!supabase) {
    console.log('[AlertEngine] Disabled: configure Supabase to enable saved alerts.');
    return;
  }
  isRunning = true;
  console.log('[AlertEngine] Starting...');

  checkAlerts();
  setInterval(checkAlerts, 60 * 1000);
}
