import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

// ─── Gráfico D3: evolución de valor de mercado vs costo base ─────────────────
export function PortfolioChart({ positions }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!positions?.length || !svgRef.current) return;

    // Construir serie temporal: acumular posiciones por fecha de compra
    const sorted = [...positions]
      .filter(p => !p.is_simulation && p.created_at && p.currentPrice != null)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    if (sorted.length === 0) return;

    // Generar puntos de tiempo: una entrada por posición (acumulando)
    const points = [];
    let cumCost  = 0;
    let cumValue = 0;

    for (const pos of sorted) {
      cumCost  += pos.costBasis ?? 0;
      cumValue += pos.currentValue ?? 0;
      points.push({
        date:  new Date(pos.created_at),
        cost:  cumCost,
        value: cumValue,
      });
    }

    // Añadir punto "hoy" con los mismos valores finales para extender la línea
    const today = new Date();
    if (points.length && points[points.length - 1].date < today) {
      points.push({ date: today, cost: cumCost, value: cumValue });
    }

    // ── Dimensiones ────────────────────────────────────────────────────────────
    const container = svgRef.current.parentElement;
    const W  = container.clientWidth || 600;
    const H  = 200;
    const m  = { top: 12, right: 12, bottom: 28, left: 54 };
    const iW = W - m.left - m.right;
    const iH = H - m.top  - m.bottom;

    // Limpiar SVG anterior
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', W)
      .attr('height', H);

    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

    // ── Escalas ────────────────────────────────────────────────────────────────
    const xScale = d3.scaleTime()
      .domain(d3.extent(points, d => d.date))
      .range([0, iW]);

    const allValues = points.flatMap(p => [p.cost, p.value]);
    const [yMin, yMax] = d3.extent(allValues);
    const yPad = (yMax - yMin) * 0.15 || 100;

    const yScale = d3.scaleLinear()
      .domain([Math.max(0, yMin - yPad), yMax + yPad])
      .range([iH, 0]);

    // ── Gradiente de área ──────────────────────────────────────────────────────
    const defs = svg.append('defs');
    const isProfit = cumValue >= cumCost;

    const grad = defs.append('linearGradient')
      .attr('id', 'portfolio-grad')
      .attr('x1', '0').attr('y1', '0')
      .attr('x2', '0').attr('y2', '1');
    grad.append('stop').attr('offset', '0%')
      .attr('stop-color', isProfit ? '#c0c0c0' : '#ef4444')
      .attr('stop-opacity', 0.3);
    grad.append('stop').attr('offset', '100%')
      .attr('stop-color', isProfit ? '#c0c0c0' : '#ef4444')
      .attr('stop-opacity', 0.0);

    // ── Área valor ─────────────────────────────────────────────────────────────
    const areaValue = d3.area()
      .x(d => xScale(d.date))
      .y0(iH)
      .y1(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(points)
      .attr('fill', 'url(#portfolio-grad)')
      .attr('d', areaValue);

    // ── Línea valor (plata o rojo) ─────────────────────────────────────────────
    const lineValue = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(points)
      .attr('fill', 'none')
      .attr('stroke', isProfit ? '#c0c0c0' : '#ef4444')
      .attr('stroke-width', 2)
      .attr('d', lineValue);

    // ── Línea costo base (gris punteado) ───────────────────────────────────────
    const lineCost = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.cost))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(points)
      .attr('fill', 'none')
      .attr('stroke', '#475569')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4 3')
      .attr('d', lineCost);

    // ── Ejes ───────────────────────────────────────────────────────────────────
    g.append('g')
      .attr('transform', `translate(0,${iH})`)
      .call(d3.axisBottom(xScale).ticks(4).tickFormat(d3.timeFormat('%d/%m')))
      .call(ax => ax.select('.domain').remove())
      .call(ax => ax.selectAll('line').attr('stroke', '#334155'))
      .call(ax => ax.selectAll('text').attr('fill', '#64748b').attr('font-size', 10));

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(4).tickFormat(v =>
        v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` :
        v >= 1e3 ? `$${(v/1e3).toFixed(0)}K` : `$${v.toFixed(0)}`
      ))
      .call(ax => ax.select('.domain').remove())
      .call(ax => ax.selectAll('line').attr('stroke', '#1e293b'))
      .call(ax => ax.selectAll('text').attr('fill', '#64748b').attr('font-size', 10));

    // ── Tooltip interactivo ────────────────────────────────────────────────────
    const tooltip = d3.select(svgRef.current.parentElement)
      .select('.portfolio-tooltip');

    const bisect = d3.bisector(d => d.date).left;

    const overlay = g.append('rect')
      .attr('width', iW)
      .attr('height', iH)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair');

    const vLine = g.append('line')
      .attr('y1', 0).attr('y2', iH)
      .attr('stroke', '#c0c0c0')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3 3')
      .attr('opacity', 0);

    overlay
      .on('mousemove', function(event) {
        const [mx] = d3.pointer(event);
        const date = xScale.invert(mx);
        const idx  = Math.min(bisect(points, date), points.length - 1);
        const pt   = points[idx];
        if (!pt) return;

        vLine
          .attr('x1', xScale(pt.date))
          .attr('x2', xScale(pt.date))
          .attr('opacity', 1);

        const pnl = pt.value - pt.cost;
        const pnlPct = pt.cost > 0 ? (pnl / pt.cost * 100) : 0;
        const fmt = v => v >= 1000
          ? `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
          : `$${v.toFixed(2)}`;

        tooltip
          .style('opacity', 1)
          .html(`
            <div class="text-xs text-slate-400">${d3.timeFormat('%d %b %Y')(pt.date)}</div>
            <div class="text-sm font-semibold text-white mt-0.5">Valor: ${fmt(pt.value)}</div>
            <div class="text-xs text-slate-400">Costo: ${fmt(pt.cost)}</div>
            <div class="text-xs font-medium mt-0.5 ${pnl >= 0 ? 'text-[#c0c0c0]' : 'text-red-400'}">
              P&L: ${pnl >= 0 ? '+' : ''}${fmt(pnl)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)
            </div>
          `);
      })
      .on('mouseleave', () => {
        vLine.attr('opacity', 0);
        tooltip.style('opacity', 0);
      });

  }, [positions]);

  return (
    <div className="relative w-full">
      <svg ref={svgRef} className="w-full" />
      <div
        className="portfolio-tooltip pointer-events-none absolute top-2 left-14 bg-slate-800/95 border border-slate-700/50 rounded-lg px-3 py-2 opacity-0 transition-opacity z-10"
        style={{ minWidth: '160px' }}
      />
      {/* Leyenda */}
      <div className="flex gap-4 mt-1 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-[#c0c0c0] rounded" />
          <span className="text-xs text-slate-500">Valor mercado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-slate-500 rounded" style={{ borderTop: '2px dashed #475569', background: 'none' }} />
          <span className="text-xs text-slate-500">Costo base</span>
        </div>
      </div>
    </div>
  );
}
