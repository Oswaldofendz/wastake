import { RSI, MACD, EMA, BollingerBands, ATR } from 'technicalindicators';

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

function computeOverallSignal(signals) {
  const weights = { macd: 2, ema: 2, rsi: 1.5, bb: 1 };
  const counts = { buy: 0, sell: 0, neutral: 0 };
  let weightedScore = 0;
  let totalWeight = 0;

  for (const [key, s] of Object.entries(signals)) {
    const w = weights[key] ?? 1;
    counts[s.signal] = (counts[s.signal] || 0) + 1;
    if (s.signal === 'buy')  weightedScore += w;
    if (s.signal === 'sell') weightedScore -= w;
    totalWeight += w;
  }

  const score = round((weightedScore / totalWeight) * 100, 1);

  let overall;
  if (score > 15)       overall = 'buy';
  else if (score < -15) overall = 'sell';
  else                  overall = 'neutral';

  return { overall, score, counts };
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
  const lastPrice = closes[closes.length - 1];

  // ── Calcular ──────────────────────────────────────────────────
  const rsi = calcRSI(closes);
  const macd = calcMACD(closes);
  const ema20 = calcEMA(closes, PERIODS.ema20);
  const ema50 = calcEMA(closes, PERIODS.ema50);
  const bb = calcBollingerBands(closes);
  const atr = calcATR(highs, lows, closes);

  // ── Interpretar ───────────────────────────────────────────────
  const signals = {
    rsi:   interpretRSI(rsi.current),
    macd:  interpretMACD(macd.current),
    ema:   interpretEMACross(ema20.current, ema50.current),
    bb:    interpretBB(lastPrice, bb.current),
  };

  const volatility = interpretATR(atr.current, lastPrice);
  const summary = computeOverallSignal(signals);

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
    },
    signals,
    volatility,
    summary,
  };
}
