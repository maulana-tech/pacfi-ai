import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  createChart,
  AreaSeries as AreaSeriesDef,
  ColorType,
  CrosshairMode,
  type AreaData,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts';

const API_BASE =
  (import.meta.env.PUBLIC_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:3001';

const PERIODS = [
  { label: '5m', interval: '1m', limit: 80 },
  { label: '1H', interval: '1m', limit: 120 },
  { label: '4H', interval: '5m', limit: 90 },
  { label: '1D', interval: '15m', limit: 96 },
  { label: '1W', interval: '1h', limit: 168 },
  { label: '1M', interval: '4h', limit: 180 },
] as const;

const COIN_BG: Record<string, string> = {
  BTC: '#F7931A',
  ETH: '#627EEA',
  SOL: '#14F195',
  AVAX: '#E84142',
  LINK: '#2A5ADA',
  XRP: '#00AAE4',
  DOGE: '#C2A633',
  WLD: '#2D2D2D',
};

const COIN_SYMBOL: Record<string, string> = {
  BTC: 'B',
  ETH: 'E',
  SOL: 'S',
  AVAX: 'A',
  LINK: 'L',
  XRP: 'X',
  DOGE: 'D',
  WLD: 'W',
};

interface CandlePoint {
  time: number;
  close: number;
}

interface PriceChartProps {
  symbol?: string;
  currentPrice?: number;
  change24h?: number;
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '0.00';
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: value >= 1000 ? 2 : 3,
    maximumFractionDigits: value >= 1000 ? 2 : 4,
  });
}

export default function PriceChart({
  symbol = 'BTC',
  currentPrice = 0,
  change24h = 0,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const areaRef = useRef<ISeriesApi<'Area'> | null>(null);

  const [activePeriod, setActivePeriod] = useState(1);
  const [loading, setLoading] = useState(true);
  const [crossPrice, setCrossPrice] = useState<number | null>(null);
  const [crossTime, setCrossTime] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isPositive = change24h >= 0;
  const trendColor = isPositive ? '#10B981' : '#EF4444';
  const coinColor = COIN_BG[symbol] ?? '#64748B';
  const coinChar = COIN_SYMBOL[symbol] ?? symbol[0] ?? '?';

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 300,
      layout: {
        background: { type: ColorType.Solid, color: '#0B1220' },
        textColor: '#94A3B8',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(71, 85, 105, 0.18)' },
        horzLines: { color: 'rgba(71, 85, 105, 0.18)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(148, 163, 184, 0.5)',
          width: 1,
          labelBackgroundColor: '#1E293B',
        },
        horzLine: {
          color: 'rgba(148, 163, 184, 0.45)',
          width: 1,
          labelBackgroundColor: '#1E293B',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(71, 85, 105, 0.35)',
        entireTextOnly: true,
      },
      timeScale: {
        borderColor: 'rgba(71, 85, 105, 0.35)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 4,
        barSpacing: 9,
      },
    });

    const areaSeries = chart.addSeries(AreaSeriesDef, {
      lineWidth: 2,
      lineColor: trendColor,
      topColor: isPositive ? 'rgba(16, 185, 129, 0.40)' : 'rgba(239, 68, 68, 0.40)',
      bottomColor: isPositive ? 'rgba(16, 185, 129, 0.03)' : 'rgba(239, 68, 68, 0.03)',
      priceLineColor: trendColor,
      priceLineVisible: true,
      lastValueVisible: true,
      crosshairMarkerRadius: 5,
      crosshairMarkerBorderColor: '#E2E8F0',
      crosshairMarkerBackgroundColor: trendColor,
    }) as ISeriesApi<'Area'>;

    chart.subscribeCrosshairMove((param) => {
      const data = param.seriesData.get(areaSeries) as AreaData<Time> | undefined;
      setCrossPrice(data?.value ?? null);
      if (typeof param.time === 'number') {
        setCrossTime(param.time);
      } else {
        setCrossTime(null);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });

    resizeObserver.observe(containerRef.current);

    chartRef.current = chart;
    areaRef.current = areaSeries;

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      areaRef.current = null;
    };
  }, [isPositive, trendColor]);

  const setFallbackSeries = useCallback(() => {
    if (!areaRef.current || currentPrice <= 0) {
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    const flatData: AreaData<Time>[] = [
      { time: (now - 3600) as Time, value: currentPrice },
      { time: now as Time, value: currentPrice },
    ];
    areaRef.current.setData(flatData);
    chartRef.current?.timeScale().fitContent();
  }, [currentPrice]);

  const fetchLineData = useCallback(async () => {
    setLoading(true);
    const { interval, limit } = PERIODS[activePeriod];
    try {
      const response = await fetch(
        `${API_BASE}/orders/candles?symbol=${symbol}&interval=${interval}&limit=${limit}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch candles');
      }

      const payload = await response.json();
      const candles: CandlePoint[] = Array.isArray(payload.data) ? payload.data : [];
      const lineData: AreaData<Time>[] = candles
        .filter((item) => Number.isFinite(item.time) && Number.isFinite(item.close))
        .map((item) => ({
          time: item.time as Time,
          value: item.close,
        }));

      if (lineData.length >= 2 && areaRef.current) {
        areaRef.current.setData(lineData);
        chartRef.current?.timeScale().fitContent();
        setLastUpdated(new Date());
      } else {
        setFallbackSeries();
      }
    } catch {
      setFallbackSeries();
    } finally {
      setLoading(false);
    }
  }, [activePeriod, setFallbackSeries, symbol]);

  useEffect(() => {
    fetchLineData();
    const timer = setInterval(fetchLineData, 12000);
    return () => clearInterval(timer);
  }, [fetchLineData]);

  const displayPrice = crossPrice ?? currentPrice;
  const crossTimeLabel =
    typeof crossTime === 'number'
      ? new Date(crossTime * 1000).toLocaleString('en-US', {
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '--';

  return (
    <div
      className="card"
      style={{
        padding: 0,
        border: '1px solid #1E293B',
        borderRadius: 12,
        background: '#0B1220',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px 10px',
          borderBottom: '1px solid rgba(71, 85, 105, 0.30)',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 800,
              color: '#FFFFFF',
              background: coinColor,
            }}
          >
            {coinChar}
          </span>
          <div>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, letterSpacing: '0.05em' }}>
              {symbol}/USDC
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="num" style={{ color: '#F8FAFC', fontWeight: 800, fontSize: 20 }}>
                ${formatPrice(displayPrice)}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: isPositive ? '#34D399' : '#F87171',
                }}
              >
                {isPositive ? '+' : ''}
                {change24h.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: '#64748B' }}>
              Updated {lastUpdated.toLocaleTimeString('en-US', { hour12: false })} UTC+7
            </span>
          )}
          <div
            style={{
              display: 'flex',
              gap: 4,
              padding: 3,
              borderRadius: 7,
              background: '#111B2E',
              border: '1px solid rgba(71, 85, 105, 0.35)',
            }}
          >
            {PERIODS.map((period, idx) => (
              <button
                key={period.label}
                onClick={() => setActivePeriod(idx)}
                style={{
                  border: 'none',
                  borderRadius: 5,
                  padding: '5px 8px',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                  color: activePeriod === idx ? '#FFFFFF' : '#94A3B8',
                  background: activePeriod === idx ? '#2563EB' : 'transparent',
                }}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: 'rgba(15, 23, 42, 0.50)',
          borderBottom: '1px solid rgba(71, 85, 105, 0.22)',
          fontSize: 11,
          color: '#94A3B8',
        }}
      >
        <span>
          Cursor Price{' '}
          <strong style={{ color: '#E2E8F0', fontWeight: 700 }}>${formatPrice(displayPrice)}</strong>
        </span>
        <span>
          Cursor Time <strong style={{ color: '#E2E8F0', fontWeight: 700 }}>{crossTimeLabel}</strong>
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(11, 18, 32, 0.45)',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: '2px solid rgba(148, 163, 184, 0.25)',
                borderTopColor: '#38BDF8',
                animation: 'priceSpin 0.8s linear infinite',
              }}
            />
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%', minHeight: 300 }} />
      </div>

      <style>{`
        @keyframes priceSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
