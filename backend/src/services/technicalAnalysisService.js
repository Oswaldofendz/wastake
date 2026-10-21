import { RSI, MACD, EMA, BollingerBands, ATR, ADX } from 'technicalindicators';

// ─── Períodos estándar ────────────────────────────────────────────────────────
const PERIODS = {
  rsi:        14,
  macdFast:   12,
  macdSlow:   26,
  macdSignal:  9,
  ema20:      20,
  ema50:      50,
  bb:         20,
  bbStdDev:    2,
  atr:        14,
  adx:        14,
  volume:     20,
};

const MIN_CANDLES = 60; // mínimo para calcular todos los indicadores

// ─── Helpers ──────────────────────────────────────────────────────────────────

function last(arr) {
  return arr.length ? arr[arr.length - 1] : null;
}

function round(n, decimals = 4) {
  if (n == null || isNaN(n)) return null;
  return parseFloat(n.toFixed(decimals));
}

// ─── Cálculo de indicadores ───────────────────────────────────────────────────

function calcRSI(closes) {
  const values = RSI.calculate({ values: closes, period: PERIODS.rsi });
  return { series: values, current: round(last(values), 2) };
}

function calcMACD(closes) {
  const values = MACD.calculate({
    values:        closes,
    fastPeriod:    PERIODS.macdFast,
    slowPeriod:    PERIODS.macdSlow,
    signalPeriod:  PERIODS.macdSignal,
    SimpleMAOscillator: false,
    SimpleMASignal:     false,
  });
  const cur = last(values);
  return {
    series: values,
    current: cur
      ? { macd: round(cur.MACD), signal: round(cur.signal), histogram: round(cur.histogram) }
      : null,
  };
}

function calcEMA(closes, period) {
  const values = EMA.calculate({ values: closes, period });
  return { series: values, current: round(last(values)) };
}

function calcBollingerBands(closes) {
  const values = BollingerBands.calculate({
    values:  closes,
    period:  PERIODS.bb,
    stdDev:  PERIODS.bbStdDev,
  });
  const cur = last(values);
  return {
    series: values,
    current: cur
      ? { upper: round(cur.upper), middle: round(cur.middle), lower: round(cur.lower) }
      : null,
  };
}

function calcATR(highs, lows, closes) {
  const values = ATR.calculate({
    high:   highs,
    low:    lows,
    close:  closes,
    period: PERIODS.atr,
  });
  return { series: values, current: round(last(values)) };
}

function calcADX(highs, lows, closes) {
  const values = ADX.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: PERIODS.adx,
  });
  const cur = last(values);
  return {
    series: values,
    current: cur
      ? { adx: round(cur.adx, 2), pdi: round(cur.pdi, 2), mdi: round(cur.mdi, 2) }
      : null,
  };
}

function calcVolume(volumes) {
  const lastVolume = last(volumes);
  const current = Number.isFinite(lastVolume) && lastVolume >= 0 ? lastVolume : null;
  const window = volumes.slice(0, -1)
    .filter(value => Number.isFinite(value) && value >= 0)
    .slice(-PERIODS.volume);
  const average = window.length
    ? window.reduce((total, value) => total + value, 0) / window.length
    : null;
  return {
    current: round(current, 2),
    average: round(average, 2),
    ratio: current != null && average > 0 ? round(current / average, 2) : null,
    period: PERIODS.volume,
  };
}

// ─── Interpretación de señales ────────────────────────────────────────────────

function interpretRSI(value) {
  if (value == null) return { signal: 'neutral', label: 'Sin datos' };
  if (value < 30)   return { signal: 'buy',     label: `Sobrevendido (${value})` };
  if (value > 70)   return { signal: 'sell',    label: `Sobrecomprado (${value})` };
  return { signal: 'neutral', label: `Neutral (${value})` };
}

function interpretMACD(cur) {
  if (!cur) return { signal: 'neutral', label: 'Sin datos' };
  if (cur.histogram > 0) return { signal: 'buy',  label: `Histograma positivo (${cur.histogram})` };
  if (cur.histogram < 0) return { signal: 'sell', label: `Histograma negativo (${cur.histogram})` };
  return { signal: 'neutral', label: 'Sin cruce claro' };
}

function interpretEMACross(ema20, ema50) {
  if (ema20 == null || ema50 == null) return { signal: 'neutral', label: 'Sin datos' };
  if (ema20 > ema50) return { signal: 'buy',  label: `EMA20 (${ema20}) > EMA50 (${ema50}) — tendencia alcista` };
  if (ema20 < ema50) return { signal: 'sell', label: `EMA20 (${ema20}) < EMA50 (${ema50}) — tendencia bajista` };
  return { signal: 'neutral', label: 'EMAs convergentes' };
}

function interpretBB(price, bb) {
  if (!bb || price == null) return { signal: 'neutral', label: 'Sin datos' };
  const pct = round(((price - bb.lower) / (bb.upper - bb.lower)) * 100, 1);
  if (price >= bb.upper) return { signal: 'sell',    label: `Precio en banda superior (${pct}%)` };
  if (price <= bb.lower) return { signal: 'buy',     label: `Precio en banda inferior (${pct}%)` };
  return { signal: 'neutral', label: `Precio dentro de bandas (${pct}%)` };
}

function interpretATR(atrValue, price) {
  if (atrValue == null || price == null) return { volatility: 'unknown', label: 'Sin datos' };
  const pct = round((atrValue / price) * 100, 2);
  if (pct > 5)  return { volatility: 'high',   label: `Alta volatilidad (ATR ${pct}% del precio)` };
  if (pct > 2)  return { volatility: 'medium', label: `Volatilidad moderada (ATR ${pct}% del precio)` };
  return { volatility: 'low', label: `Baja volatilidad (ATR ${pct}% del precio)` };
}

function computeOverallSignal(signals, indicators, lastPrice) {
  const weights = { macd: 2, ema: 2, rsi: 1.5, bb: 1 };
  const counts = { buy: 0, sell: 0, neutral: 0 };
  let weightedScore = 0;
  let totalWeight = 0;

  for (const [key, s] of Object.entries(signals)) {
    if (key === 'adx') continue; // Keep the existing -100..100 score stable for other consumers.
    const w = weights[key] ?? 1;
    counts[s.signal] = (counts[s.signal] || 0) + 1;
    if (s.signal === 'buy')  weightedScore += w;
    if (s.signal === 'sell') weightedScore -= w;
    totalWeight += w;
  }

  // Bonus: price vs EMA50 (trend confirmation)
  if (lastPrice && indicators?.ema50?.current) {
    const bonus = lastPrice > indicators.ema50.current ? 1 : -1;
    weightedScore += bonus;
    totalWeight += 1;
  }

  // Bonus: price vs Bollinger middle (momentum)
  if (lastPrice && indicators?.bollingerBands?.current?.middle) {
    const bonus = lastPrice > indicators.bollingerBands.current.middle ? 0.5 : -0.5;
    weightedScore += bonus;
    totalWeight += 0.5;
  }

  const score = round((weightedScore / totalWeight) * 100, 1);

  let overall;
  if (score > 15)       overall = 'buy';
  else if (score < -15) overall = 'sell';
  else                  overall = 'neutral';

  const directional = (value) => value == null ? null : Math.sign(value);
  const clamp = (value, min = -1, max = 1) => Math.min(max, Math.max(min, value));
  const component = (values, weight) => {
    const available = values.filter(value => value != null && Number.isFinite(value));
    if (!available.length) return null;
    const direction = available.reduce((sum, value) => sum + value, 0) / available.length;
    return { score: round(5 + 5 * clamp(direction), 2), weight };
  };

  const trend = component([
    directional(indicators.ema20?.current != null && indicators.ema50?.current != null
      ? indicators.ema20.current - indicators.ema50.current : null),
    directional(lastPrice != null && indicators.ema50?.current != null
      ? lastPrice - indicators.ema50.current : null),
  ], 35);

  const rsiDirection = indicators.rsi?.current == null
    ? null
    : clamp((indicators.rsi.current - 50) / 50);
  const macdDirection = indicators.macd?.current?.histogram == null || !lastPrice
    ? null
    : Math.tanh((indicators.macd.current.histogram / lastPrice) * 1000);
  const momentum = component([rsiDirection, macdDirection], 35);

  const bb = indicators.bollingerBands?.current;
  const structureDirection = bb && bb.upper > bb.middle && lastPrice != null
    ? clamp((lastPrice - bb.middle) / (bb.upper - bb.middle))
    : null;
  const structure = component([structureDirection], 20);

  const adx = indicators.adx?.current;
  const trendStrengthDirection = adx && adx.adx >= 20
    ? clamp(((adx.pdi - adx.mdi) / 100) * Math.min(adx.adx / 25, 1))
    : adx ? 0 : null;
  const participation = component([trendStrengthDirection], 10);
  const components = { trend, momentum, structure, participation };
  const available = Object.values(components).filter(Boolean);
  const availableWeight = available.reduce((sum, item) => sum + item.weight, 0);
  const score10 = availableWeight
    ? round(available.reduce((sum, item) => sum + item.score * item.weight, 0) / availableWeight, 1)
    : null;
  const bias = score10 == null ? 'unavailable' : score10 <= 4 ? 'bearish' : score10 >= 6 ? 'bullish' : 'mixed';

  return {
    overall,
    score,
    score10,
    bias,
    coverage: availableWeight,
    components,
    weights: { trend: 35, momentum: 35, structure: 20, participation: 10 },
    counts,
  };
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Calcula RSI, MACD, EMA, Bollinger Bands y ATR a partir de velas OHLCV.
 *
 * @param {Array<{time, open, high, low, close}>} candles
 * @returns {object} Indicadores, señales e interpretación
 */
export function computeIndicators(candles) {
  if (!candles || candles.length < MIN_CANDLES) {
    throw new Error(
      `Se necesitan al menos ${MIN_CANDLES} velas. Se recibieron: ${candles?.length ?? 0}`
    );
  }

  const closes = candles.map(c => c.close);
  const highs   = candles.map(c => c.high);
  const lows    = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume);
  const lastPrice = closes[closes.length - 1];

  // ── Calcular ──────────────────────────────────────────────────
  const rsi = calcRSI(closes);
  const macd = calcMACD(closes);
  const ema20 = calcEMA(closes, PERIODS.ema20);
  const ema50 = calcEMA(closes, PERIODS.ema50);
  const bb = calcBollingerBands(closes);
  const atr = calcATR(highs, lows, closes);
  const adx = calcADX(highs, lows, closes);
  const volume = calcVolume(volumes);

  // ── Interpretar ───────────────────────────────────────────────
  const signals = {
    rsi:   interpretRSI(rsi.current),
    macd:  interpretMACD(macd.current),
    ema:   interpretEMACross(ema20.current, ema50.current),
    bb:    interpretBB(lastPrice, bb.current),
    adx:   adx.current?.adx >= 25
      ? { signal: adx.current.pdi > adx.current.mdi ? 'buy' : 'sell', label: `Tendencia fuerte (ADX ${adx.current.adx})` }
      : adx.current
        ? { signal: 'neutral', label: `Tendencia débil o moderada (ADX ${adx.current.adx})` }
        : { signal: 'neutral', label: 'Sin datos' },
  };

  const volatility = interpretATR(atr.current, lastPrice);
  const summary = computeOverallSignal(signals, { rsi, macd, ema20, ema50, bollingerBands: bb, adx }, lastPrice);

  return {
    meta: {
      candleCount: candles.length,
      lastPrice: round(lastPrice),
      from: candles[0].time,
      to:   candles[candles.length - 1].time,
    },
    indicators: {
      rsi:   { current: rsi.current,  period: PERIODS.rsi },
      macd:  { current: macd.current, fast: PERIODS.macdFast, slow: PERIODS.macdSlow, signal: PERIODS.macdSignal },
      ema20: { current: ema20.current, period: 20 },
      ema50: { current: ema50.current, period: 50 },
      bollingerBands: { current: bb.current, period: PERIODS.bb, stdDev: PERIODS.bbStdDev },
      atr:   { current: atr.current, period: PERIODS.atr },
      adx:   { current: adx.current, period: PERIODS.adx },
      volume,
    },
    signals,
    volatility,
    summary,
  };
}
