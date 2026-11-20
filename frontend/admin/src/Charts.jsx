import React, { useEffect, useRef, useState } from 'react';
import { money, label } from '../../shared/api';
export function Bars({ data, field = 'revenue', height = 175 }) {
  const chart = useRef(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    observer.observe(chart.current);
    return () => observer.disconnect();
  }, []);
  const max = Math.max(1, ...data.map((d) => Number(d[field]))),
    step = field === 'orders' ? Math.max(1, Math.ceil(max / 3)) : Math.max(1, Math.ceil(max / 300) * 100),
    top = step * 3;
  const left = 54,
    right = 12,
    bottom = 28,
    plot = height - bottom - 10,
    barSpace = (width - left - right) / Math.max(1, data.length);
  return (
    <svg
      ref={chart}
      className={`bar-chart chart-${field}`}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${field === 'revenue' ? 'Paid revenue in USD' : 'Orders'} by day`}
    >
      <title>{field === 'revenue' ? 'Revenue' : 'Orders'} by day</title>
      {[0, 1, 2, 3].map((i) => {
        const y = height - bottom - (i / 3) * plot;
        return (
          <g key={i}>
            <line x1={left} x2={width - right} y1={y} y2={y} stroke="#eceef2" />
            <text x={left - 10} y={y + 4} textAnchor="end">
              {field === 'revenue' ? `$${(i * step).toLocaleString()}` : i * step}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const barHeight = (Number(d[field]) / top) * plot;
        return (
          <g key={d.day}>
            <rect
              x={left + i * barSpace + barSpace * 0.2}
              y={height - bottom - barHeight}
              width={barSpace * 0.6}
              height={barHeight}
              fill={field === 'revenue' ? '#309e98' : '#8580b6'}
            >
              <title>
                {d.day}: {field === 'revenue' ? money(d[field]) : d[field]}
              </title>
            </rect>
            {i % Math.max(1, Math.ceil(data.length / (width < 400 ? 3 : 5))) === 0 && (
              <text x={left + i * barSpace + barSpace * 0.5} y={height - 6} textAnchor="middle">
                {new Date(d.day + 'T12:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
export function StatusChart({ data }) {
  const total = data.reduce((s, x) => s + Number(x.count), 0);
  return (
    <div className="status-chart">
      {data.map((x, i) => (
        <div key={x.status}>
          <div>
            <span>
              <i
                style={{ background: ['#26938d', '#686a9d', '#a8a8c2', '#c7c9d6', '#dce0e7', '#e8ebef'][i] }}
              />
              {label(x.status)}
            </span>
            <strong>{x.count}</strong>
          </div>
          <div className="status-track">
            <span
              style={{
                width: `${total ? (Number(x.count) / total) * 100 : 0}%`,
                background: i === 0 ? '#26938d' : '#b3b5ce',
              }}
            />
          </div>
        </div>
      ))}
      {!total && <p className="muted">No orders in this period.</p>}
    </div>
  );
}
