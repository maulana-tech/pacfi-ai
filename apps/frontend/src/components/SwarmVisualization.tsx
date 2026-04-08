import React, { useEffect, useRef, useState, useCallback } from 'react';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import noverlap from 'graphology-layout-noverlap';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'analyzing' | 'done';
  decision?: 'BUY' | 'SELL' | 'HOLD';
  confidence?: number;
  reasoning?: string;
  color: string;
  attributes?: Record<string, unknown>;
  createdAt?: string;
}

interface MarketNode {
  id: string;
  symbol: string;
  price: string;
  change: string;
  color: string;
  funding?: string;
  nextFunding?: string;
  volume24h?: string;
  openInterest?: string;
  markPrice?: string;
  oraclePrice?: string;
}

interface PacificaMarketData {
  symbol: string;
  mark: string;
  mid: string;
  oracle: string;
  funding: string;
  next_funding: string;
  open_interest: string;
  volume_24h: string;
  yesterday_price: string;
  timestamp: number;
}

interface SwarmVisualizationProps {
  agents: Agent[];
  isRunning: boolean;
  width?: number;
  height?: number;
  showMarketNodes?: boolean;
  marketData?: PacificaMarketData[];
}

interface SelectedItem {
  type: 'node' | 'market';
  data: Agent | MarketNode;
  color: string;
}

const STATUS_COLORS: Record<string, string> = {
  analyzing: '#F59E0B',
  done: '#10B981',
  idle: '#9CA3AF',
};

const LINK_VISUALS: Record<string, { hue: string; width: number }> = {
  DATA_FLOW: { hue: '#3b82f6', width: 1.5 },
  SYNC: { hue: '#8b5cf6', width: 1.2 },
  _fallback: { hue: '#94a3b8', width: 1 },
};

function hexRgb(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

function rgbHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [c(r), c(g), c(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function fadeToWhite(hex: string, keep: number): string {
  const [r, g, b] = hexRgb(hex);
  const W = 250;
  return rgbHex(W + (r - W) * keep, W + (g - W) * keep, W + (b - W) * keep);
}

function darken(hex: string, factor: number): string {
  const [r, g, b] = hexRgb(hex);
  return rgbHex(
    r + (0 - r) * (1 - 1 / factor),
    g + (0 - g) * (1 - 1 / factor),
    b + (0 - b) * (1 - 1 / factor)
  );
}

export default function SwarmVisualization({
  agents,
  isRunning,
  showMarketNodes = false,
  marketData = [],
}: SwarmVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<any>(null);
  const graphRef = useRef<Graph | null>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);

  const selRef = useRef<SelectedItem | null>(null);
  const showLabelsRef = useRef(showEdgeLabels);
  const isRunningRef = useRef(isRunning);

  useEffect(() => {
    selRef.current = selectedItem;
  }, [selectedItem]);
  useEffect(() => {
    showLabelsRef.current = showEdgeLabels;
  }, [showEdgeLabels]);
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const cleanup = useCallback(() => {
    sigmaRef.current?.kill();
    sigmaRef.current = null;
    graphRef.current = null;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !agents.length) return;

    let didBoot = false;
    const ro = new ResizeObserver((entries) => {
      const { width: w, height: h } = entries[0].contentRect;
      if (!w || !h || didBoot) return;
      didBoot = true;
      ro.disconnect();
      cleanup();
      bootstrap(el, w, h);
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      cleanup();
    };
  }, [agents, cleanup]);

  useEffect(() => {
    sigmaRef.current?.refresh();
  }, [selectedItem, isRunning]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    agents.forEach((agent) => {
      if (graph.hasNode(agent.id)) {
        graph.mergeNodeAttributes(agent.id, {
          rawData: agent,
          statusColor: STATUS_COLORS[agent.status] || STATUS_COLORS.idle,
        });
      }
    });
    sigmaRef.current?.refresh();
  }, [agents]);

  function bootstrap(container: HTMLDivElement, canvasW: number, canvasH: number) {
    const N = agents.length;
    const PHI = Math.PI * (3 - Math.sqrt(5));
    const SPIRAL_RADIUS = Math.sqrt(N) * 80;

    const graph = new Graph({ multi: false });
    graphRef.current = graph;

    agents.forEach((agent, i) => {
      const theta = i * PHI;
      const r = SPIRAL_RADIUS * Math.sqrt((i + 1) / Math.max(N, 1));
      const jitter = SPIRAL_RADIUS * 0.15;
      graph.addNode(agent.id, {
        x: r * Math.cos(theta) + (Math.random() - 0.5) * jitter,
        y: r * Math.sin(theta) + (Math.random() - 0.5) * jitter,
        size: 22,
        color: agent.color,
        label: agent.name,
        nodeType: agent.role,
        rawData: agent,
        statusColor: STATUS_COLORS[agent.status] || STATUS_COLORS.idle,
        mass: agent.role === 'Final Decision' ? 6 : 2,
      });
    });

    if (showMarketNodes && marketData.length > 0) {
      const SYMBOL_COLORS: Record<string, string> = {
        BTC: '#F7931A',
        ETH: '#627EEA',
        SOL: '#9945FF',
        WIF: '#A7E87D',
        DOGE: '#C3A634',
        AAVE: '#B6509E',
        ARB: '#28A0F0',
        SUI: '#6FBCF0',
        LINK: '#2A5ADA',
        AVAX: '#E84142',
      };

      const topMarkets = marketData.slice(0, 6);

      const marketNodes: MarketNode[] = topMarkets.map((m) => {
        const markPrice = parseFloat(m.mark || m.oracle || '0');
        const yesterdayPrice = parseFloat(m.yesterday_price || m.mark || '0');
        const changePercent =
          yesterdayPrice > 0
            ? (((markPrice - yesterdayPrice) / yesterdayPrice) * 100).toFixed(2)
            : '0.00';

        return {
          id: `mkt_${m.symbol.toLowerCase()}`,
          symbol: m.symbol,
          price:
            markPrice >= 1000
              ? `$${markPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
              : markPrice >= 1
                ? `$${markPrice.toFixed(2)}`
                : `$${markPrice.toFixed(4)}`,
          change: `${markPrice >= yesterdayPrice ? '+' : ''}${changePercent}%`,
          color: SYMBOL_COLORS[m.symbol] || '#6B7280',
          funding: m.funding,
          nextFunding: m.next_funding,
          volume24h: m.volume_24h,
          openInterest: m.open_interest,
          markPrice: m.mark,
          oraclePrice: m.oracle,
        };
      });

      marketNodes.forEach((m) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = SPIRAL_RADIUS * 1.6;
        graph.addNode(m.id, {
          x: dist * Math.cos(angle) + (Math.random() - 0.5) * 40,
          y: dist * Math.sin(angle) + (Math.random() - 0.5) * 40,
          size: 16,
          color: m.color,
          label: `${m.symbol} ${m.price}`,
          nodeType: 'market',
          rawData: m,
          isMarketNode: true,
        });
      });

      marketNodes.forEach((m) => {
        const targets = ['market_analyst', 'sentiment_agent'];
        targets.forEach((target) => {
          if (graph.hasNode(m.id) && graph.hasNode(target) && !graph.hasEdge(m.id, target)) {
            graph.addEdge(m.id, target, {
              kind: 'MARKET_FEED',
              label: showLabelsRef.current ? `${m.symbol} Feed` : '',
              size: 0.8,
              color: m.color + '44',
              type: 'curved',
              curvature: 0.15 + Math.random() * 0.1,
            });
          }
        });
      });
    }

    const links: { source: string; target: string; name: string; kind: string }[] = [
      { source: 'market_analyst', target: 'coordinator', name: 'Market Data', kind: 'DATA_FLOW' },
      { source: 'sentiment_agent', target: 'coordinator', name: 'Sentiment', kind: 'DATA_FLOW' },
      { source: 'risk_manager', target: 'coordinator', name: 'Risk Analysis', kind: 'DATA_FLOW' },
      { source: 'market_analyst', target: 'sentiment_agent', name: 'Sync', kind: 'SYNC' },
      { source: 'sentiment_agent', target: 'risk_manager', name: 'Sync', kind: 'SYNC' },
      { source: 'risk_manager', target: 'market_analyst', name: 'Sync', kind: 'SYNC' },
    ];

    links.forEach((link) => {
      if (graph.hasNode(link.source) && graph.hasNode(link.target)) {
        if (graph.hasEdge(link.source, link.target)) return;
        const vis = LINK_VISUALS[link.kind] ?? LINK_VISUALS._fallback;
        graph.addEdge(link.source, link.target, {
          kind: link.kind,
          label: showLabelsRef.current ? link.name : '',
          size: vis.width,
          color: vis.hue + '55',
          type: 'curved',
          curvature: 0.15,
        });
      }
    });

    const inferred = forceAtlas2.inferSettings(graph);
    forceAtlas2.assign(graph, {
      iterations: 120,
      settings: {
        ...inferred,
        gravity: 2,
        scalingRatio: 20,
        barnesHutOptimize: false,
        adjustSizes: true,
      },
    });

    noverlap.assign(graph, {
      maxIterations: 30,
      settings: { ratio: 1.8, margin: 30 },
    });

    const padding = 60;
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    graph.forEachNode((node) => {
      const x = graph.getNodeAttribute(node, 'x');
      const y = graph.getNodeAttribute(node, 'y');
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    const scaleX = (canvasW - padding * 2) / (maxX - minX || 1);
    const scaleY = (canvasH - padding * 2) / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY);

    graph.forEachNode((node) => {
      const x = graph.getNodeAttribute(node, 'x');
      const y = graph.getNodeAttribute(node, 'y');
      graph.setNodeAttribute(node, 'x', (x - minX) * scale + padding);
      graph.setNodeAttribute(node, 'y', (y - minY) * scale + padding);
    });

    import('sigma').then(({ default: Sigma }) => {
      import('@sigma/edge-curve').then(({ default: EdgeCurveProgram }) => {
        if (!containerRef.current) return;

        const sigma = new Sigma(graph, containerRef.current, {
          renderLabels: true,
          labelFont: 'system-ui, -apple-system, sans-serif',
          labelSize: 13,
          labelWeight: '600',
          labelColor: { color: '#374151' },
          labelRenderedSizeThreshold: 5,
          labelDensity: 0.5,
          labelGridCellSize: 80,
          renderEdgeLabels: showLabelsRef.current,
          defaultEdgeType: 'curved',
          edgeProgramClasses: { curved: EdgeCurveProgram },
          defaultEdgeColor: '#d1d5db',
          hideEdgesOnMove: false,
          minCameraRatio: 0.3,
          maxCameraRatio: 4,
          zIndex: true,
          stagePadding: 40,

          nodeReducer: (nid: string, attrs: Record<string, unknown>) => {
            const out = { ...attrs };
            const sel = selRef.current;
            const origClr = attrs.color as string;
            const origSize = attrs.size as number;

            if (sel) {
              if (nid === sel.data.id) {
                return { ...out, size: origSize * 2, highlighted: true, zIndex: 3 };
              }
              const isNeighbor = graph.hasNode(nid) && graph.neighbors(sel.data.id).includes(nid);
              if (isNeighbor) {
                return { ...out, size: origSize * 1.4, zIndex: 2 };
              }
              return {
                ...out,
                color: fadeToWhite(origClr, 0.25),
                size: origSize * 0.6,
                label: '',
                zIndex: 0,
              };
            }

            if (isRunningRef.current) {
              const rawData = attrs.rawData as Agent | undefined;
              if (rawData?.status === 'analyzing') {
                return {
                  ...out,
                  color: '#F59E0B',
                  size: origSize * 1.5,
                  highlighted: true,
                  zIndex: 2,
                };
              }
              if (rawData?.status === 'done') {
                return { ...out, color: '#10B981', size: origSize * 1.2, zIndex: 1 };
              }
            }

            return out;
          },

          edgeReducer: (eid: string, attrs: Record<string, unknown>) => {
            const out = { ...attrs };
            const sel = selRef.current;

            if (sel) {
              const src = graph.source(eid);
              const tgt = graph.target(eid);
              if (src === sel.data.id || tgt === sel.data.id) {
                return { ...out, color: darken(sel.color, 1.2), size: 3, zIndex: 2 };
              }
              return { ...out, color: '#f3f4f6', size: 0.3, zIndex: 0 };
            }

            return out;
          },

          defaultDrawNodeHover: (ctx: CanvasRenderingContext2D, d: any) => {
            const label = d.label as string | undefined;
            if (!label) return;
            ctx.font = '600 12px system-ui, -apple-system, sans-serif';
            const tw = ctx.measureText(label).width;
            const ns = (d.size as number) || 10;
            const px = 10,
              py = 5;
            const w = tw + px * 2;
            const h = 14 + py * 2;
            const cx = d.x as number;
            const cy = (d.y as number) - ns - 14;

            ctx.fillStyle = '#fff';
            ctx.shadowColor = 'rgba(0,0,0,0.12)';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 6);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = (d.color as string) || '#3b82f6';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = '#111827';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, cx, cy);

            ctx.beginPath();
            ctx.arc(d.x as number, d.y as number, ns + 6, 0, Math.PI * 2);
            ctx.strokeStyle = (d.color as string) || '#3b82f6';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.25;
            ctx.stroke();
            ctx.globalAlpha = 1;
          },
        });

        sigmaRef.current = sigma;
        setTimeout(() => sigma.refresh(), 100);

        sigma.on('clickNode', ({ node }: { node: string }) => {
          const attrs = graph.getNodeAttributes(node);
          const rawData = attrs.rawData as Agent;
          const color = attrs.color as string;
          if (selRef.current?.data.id === node) {
            setSelectedItem(null);
          } else {
            setSelectedItem({ type: 'node', data: rawData, color });
          }
        });

        sigma.on('clickStage', () => {
          setSelectedItem(null);
        });
        sigma.on('enterNode', () => {
          container.style.cursor = 'pointer';
        });
        sigma.on('leaveNode', () => {
          container.style.cursor = 'default';
        });
      });
    });
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#FAFAFA',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}
      />

      {/* Edge Labels Toggle */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#FFF',
          padding: '6px 12px',
          borderRadius: '20px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          zIndex: 10,
        }}
      >
        <label
          style={{
            position: 'relative',
            display: 'inline-block',
            width: '36px',
            height: '20px',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={showEdgeLabels}
            onChange={(e) => {
              setShowEdgeLabels(e.target.checked);
              showLabelsRef.current = e.target.checked;
            }}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span
            style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: showEdgeLabels ? '#2563EB' : '#D1D5DB',
              borderRadius: '20px',
              transition: '0.3s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                height: '14px',
                width: '14px',
                left: showEdgeLabels ? '18px' : '3px',
                bottom: '3px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: '0.3s',
              }}
            />
          </span>
        </label>
        <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>Labels</span>
      </div>

      {/* Running Indicator */}
      {isRunning && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            color: '#fff',
            padding: '8px 18px',
            borderRadius: '20px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            fontWeight: 500,
            zIndex: 100,
          }}
        >
          <div
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#4CAF50',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          AI Swarm Running
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '14px',
          background: 'rgba(255,255,255,0.95)',
          padding: '10px 14px',
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          zIndex: 10,
        }}
      >
        <span
          style={{
            display: 'block',
            fontSize: '10px',
            fontWeight: 700,
            color: '#2563EB',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Agents
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {agents.map((agent) => (
            <div
              key={agent.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                fontSize: '11px',
                color: '#555',
              }}
            >
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: agent.color,
                  flexShrink: 0,
                }}
              />
              <span>{agent.name}</span>
            </div>
          ))}
        </div>
        <div style={{ height: 6 }} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            fontSize: '10px',
            color: '#888',
          }}
        >
          <div
            style={{
              width: '14px',
              height: '2px',
              background: '#3b82f6',
              borderRadius: 1,
              flexShrink: 0,
            }}
          />
          <span>Data Flow</span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            fontSize: '10px',
            color: '#888',
            marginTop: 3,
          }}
        >
          <div
            style={{
              width: '14px',
              height: '2px',
              background: '#8b5cf6',
              borderRadius: 1,
              flexShrink: 0,
            }}
          />
          <span>Sync</span>
        </div>
        {showMarketNodes && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              fontSize: '10px',
              color: '#888',
              marginTop: 3,
            }}
          >
            <div
              style={{
                width: '14px',
                height: '2px',
                background: '#F59E0B',
                borderRadius: 1,
                flexShrink: 0,
              }}
            />
            <span>Market Feed</span>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedItem && (
        <div
          style={{
            position: 'absolute',
            top: '48px',
            right: '12px',
            width: '270px',
            maxHeight: 'calc(100% - 70px)',
            background: '#FFF',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            fontSize: '13px',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 14px',
              background: '#FAFAFA',
              borderBottom: '1px solid #F0F0F0',
            }}
          >
            <span style={{ fontWeight: 700, color: '#111827', fontSize: '13px' }}>
              {selectedItem.type === 'market' ? 'Market Data' : 'Agent Details'}
            </span>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: 600,
                background: selectedItem.color,
                color: '#fff',
              }}
            >
              {selectedItem.type === 'market'
                ? (selectedItem.data as MarketNode).symbol
                : (selectedItem.data as Agent).role}
            </span>
            <button
              onClick={() => setSelectedItem(null)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: '#9CA3AF',
                lineHeight: 1,
                padding: '0 2px',
              }}
            >
              &times;
            </button>
          </div>

          {selectedItem.type === 'market' ? (
            <div style={{ padding: '14px' }}>
              {(() => {
                const m = selectedItem.data as MarketNode;
                const fundingRate = m.funding ? parseFloat(m.funding) * 100 : null;
                const nextFundingRate = m.nextFunding ? parseFloat(m.nextFunding) * 100 : null;
                const vol = m.volume24h ? parseFloat(m.volume24h) : null;
                const oi = m.openInterest ? parseFloat(m.openInterest) : null;
                const formatBigNum = (n: number) =>
                  n >= 1e9
                    ? `$${(n / 1e9).toFixed(2)}B`
                    : n >= 1e6
                      ? `$${(n / 1e6).toFixed(2)}M`
                      : n >= 1e3
                        ? `$${(n / 1e3).toFixed(1)}K`
                        : `$${n.toFixed(2)}`;
                return (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ color: '#111827', fontWeight: 800, fontSize: '18px' }}>
                        {m.price}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '12px',
                          color: m.change.startsWith('+') ? '#10B981' : '#EF4444',
                          background: m.change.startsWith('+') ? '#F0FDF4' : '#FEF2F2',
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {m.change}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px 12px',
                        marginTop: 10,
                      }}
                    >
                      <div>
                        <div style={{ color: '#9CA3AF', fontSize: '10px', fontWeight: 500 }}>
                          Mark Price
                        </div>
                        <div style={{ color: '#111827', fontWeight: 600, fontSize: '12px' }}>
                          {m.markPrice ? `$${parseFloat(m.markPrice).toFixed(2)}` : '-'}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#9CA3AF', fontSize: '10px', fontWeight: 500 }}>
                          Oracle
                        </div>
                        <div style={{ color: '#111827', fontWeight: 600, fontSize: '12px' }}>
                          {m.oraclePrice ? `$${parseFloat(m.oraclePrice).toFixed(2)}` : '-'}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#9CA3AF', fontSize: '10px', fontWeight: 500 }}>
                          Funding Rate
                        </div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '12px',
                            color: fundingRate !== null && fundingRate >= 0 ? '#10B981' : '#EF4444',
                          }}
                        >
                          {fundingRate !== null
                            ? `${fundingRate >= 0 ? '+' : ''}${fundingRate.toFixed(4)}%`
                            : '-'}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#9CA3AF', fontSize: '10px', fontWeight: 500 }}>
                          Next Funding
                        </div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '12px',
                            color:
                              nextFundingRate !== null && nextFundingRate >= 0
                                ? '#10B981'
                                : '#EF4444',
                          }}
                        >
                          {nextFundingRate !== null
                            ? `${nextFundingRate >= 0 ? '+' : ''}${nextFundingRate.toFixed(4)}%`
                            : '-'}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#9CA3AF', fontSize: '10px', fontWeight: 500 }}>
                          Volume 24h
                        </div>
                        <div style={{ color: '#111827', fontWeight: 600, fontSize: '12px' }}>
                          {vol !== null ? formatBigNum(vol) : '-'}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#9CA3AF', fontSize: '10px', fontWeight: 500 }}>
                          Open Interest
                        </div>
                        <div style={{ color: '#111827', fontWeight: 600, fontSize: '12px' }}>
                          {oi !== null ? formatBigNum(oi) : '-'}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        marginTop: 12,
                        padding: '8px 10px',
                        background: '#EFF6FF',
                        borderRadius: 6,
                        fontSize: '10px',
                        color: '#2563EB',
                        fontWeight: 500,
                      }}
                    >
                      Live data from Pacifica API
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div style={{ padding: '14px', overflowY: 'auto' }}>
              {(() => {
                const a = selectedItem.data as Agent;
                return (
                  <>
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ color: '#9CA3AF', fontSize: '11px', fontWeight: 500 }}>
                        Name:{' '}
                      </span>
                      <span style={{ color: '#111827', fontWeight: 600 }}>{a.name}</span>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ color: '#9CA3AF', fontSize: '11px', fontWeight: 500 }}>
                        ID:{' '}
                      </span>
                      <span style={{ color: '#6B7280', fontFamily: 'monospace', fontSize: '10px' }}>
                        {a.id}
                      </span>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ color: '#9CA3AF', fontSize: '11px', fontWeight: 500 }}>
                        Status:{' '}
                      </span>
                      <span
                        style={{
                          color: STATUS_COLORS[a.status] || STATUS_COLORS.idle,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          fontSize: '11px',
                        }}
                      >
                        {a.status}
                      </span>
                    </div>
                    {a.decision && (
                      <div style={{ marginBottom: '10px' }}>
                        <span style={{ color: '#9CA3AF', fontSize: '11px', fontWeight: 500 }}>
                          Decision:{' '}
                        </span>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: '14px',
                            color:
                              a.decision === 'BUY'
                                ? '#10B981'
                                : a.decision === 'SELL'
                                  ? '#EF4444'
                                  : '#6B7280',
                          }}
                        >
                          {a.decision}
                        </span>
                      </div>
                    )}
                    {a.confidence && (
                      <div style={{ marginBottom: '10px' }}>
                        <span style={{ color: '#9CA3AF', fontSize: '11px', fontWeight: 500 }}>
                          Confidence:{' '}
                        </span>
                        <span style={{ color: '#111827', fontWeight: 600 }}>{a.confidence}%</span>
                      </div>
                    )}
                    {a.reasoning && (
                      <div
                        style={{
                          marginTop: '12px',
                          paddingTop: '12px',
                          borderTop: '1px solid #F0F0F0',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#6B7280',
                            marginBottom: '6px',
                          }}
                        >
                          Reasoning:
                        </div>
                        <div style={{ lineHeight: 1.6, color: '#374151', fontSize: '12px' }}>
                          {a.reasoning}
                        </div>
                      </div>
                    )}
                    {a.createdAt && (
                      <div style={{ marginTop: '10px' }}>
                        <span style={{ color: '#9CA3AF', fontSize: '11px', fontWeight: 500 }}>
                          Created:{' '}
                        </span>
                        <span style={{ color: '#374151' }}>{formatDateTime(a.createdAt)}</span>
                      </div>
                    )}
                    {a.attributes && Object.keys(a.attributes).length > 0 && (
                      <div
                        style={{
                          marginTop: '12px',
                          paddingTop: '12px',
                          borderTop: '1px solid #F0F0F0',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#6B7280',
                            marginBottom: '6px',
                          }}
                        >
                          Properties:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {Object.entries(a.attributes).map(([key, value]) => (
                            <div key={key} style={{ display: 'flex', gap: '6px' }}>
                              <span
                                style={{
                                  color: '#9CA3AF',
                                  fontWeight: 500,
                                  minWidth: '70px',
                                  fontSize: '11px',
                                }}
                              >
                                {key}:
                              </span>
                              <span style={{ color: '#374151', fontSize: '11px' }}>
                                {String(value) || 'None'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
