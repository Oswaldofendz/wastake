import { useState, useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import { fetchOHLCV } from '../services/api.js';

const TIMEFRAMES = [
  { label: '1D',  type: 'crypto', days: 1,   interval: '1h',  range: '1d'  },
  { label: '1S',  type: 'crypto', days: 7,   interval: '1h',  range: '5d'  },
  { label: '1M',  type: 'crypto', days: 30,  interval: '1d',  range: '1mo' },
  { label: '3M',  type: 'crypto', days: 90,  interval: '1d',  range: '3mo' },
  { label: '1A',  type: 'crypto', days: 365, interval: '1d',  range: '1y'  },
];

export function useChart(containerRef, asset, isDark = true) {
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const [tf, setTf] = useState(TIMEFRAMES[1]);   // 1S por defecto
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Crear/destruir chart cuando el contenedor cambia
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: isDark ? '#0f172a' : '#ffffff' },
        textColor:  isDark ? '#94a3b8' : '#475569',
      },
      grid: {
        vertLines: { color: isDark ? '#1e293b' : '#f1f5f9' },
        horzLines: { color: isDark ? '#1e293b' : '#f1f5f9' },
      },
      timeScale: {
        borderColor: isDark ? '#334155' : '#e2e8f0',
        timeVisible: true,
      },
      rightPriceScale: { borderColor: isDark ? '#334155' : '#e2e8f0' },
      crosshair: { mode: 1 },
      handleScroll: true,
      handleScale: true,
    });

    // Hacer el chart responsive
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        chart.applyOptions({ width: e.contentRect.width });
      }
    });
    ro.observe(containerRef.current);

    const series = chart.addCandlestickSeries({
      upColor:       '#22c55e',
      downColor:     '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor:   '#22c55e',
      wickDownColor: '#ef4444',
    });

    chartRef.current  = chart;
    seriesRef.current = series;

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current  = null;
      seriesRef.current = null;
    };
  }, [containerRef, isDark]);

  // Cargar datos cuando cambia el activo o timeframe
  useEffect(() => {
    if (!asset || !seriesRef.current) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = asset.type === 'crypto'
          ? { days: tf.days }
          : { interval: tf.interval, range: tf.range };

        const { candles } = await fetchOHLCV(asset.id, asset.type, params);
        if (seriesRef.current && candles.length) {
          seriesRef.current.setData(candles);
          chartRef.current?.timeScale().fitContent();
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [asset, tf]);

  return { timeframes: TIMEFRAMES, activeTf: tf, setTf, loading, error };
}
