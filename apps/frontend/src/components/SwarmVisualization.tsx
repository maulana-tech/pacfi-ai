import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'analyzing' | 'done';
  decision?: 'BUY' | 'SELL' | 'HOLD';
  confidence?: number;
  reasoning?: string;
  color: string;
  attributes?: Record<string, any>;
  createdAt?: string;
}

interface SwarmVisualizationProps {
  agents: Agent[];
  isRunning: boolean;
  width?: number;
  height?: number;
}

interface ParticleData {
  id: string;
  source: { x: number; y: number };
  target: { x: number; y: number };
  progress: number;
  speed: number;
}

interface SelectedItem {
  type: 'node';
  data: Agent;
  color: string;
}

interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'analyzing' | 'done';
  color: string;
  rawData: Agent;
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  source: string | SimulationNode;
  target: string | SimulationNode;
  type: string;
  name: string;
  curvature: number;
  pairTotal: number;
}

export default function SwarmVisualization({
  agents,
  isRunning,
  width = 600,
  height = 400,
}: SwarmVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<ParticleData[]>([]);
  const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationLink> | null>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'analyzing':
        return '#F59E0B';
      case 'done':
        return '#10B981';
      default:
        return '#9CA3AF';
    }
  };

  const getStatusGlow = (status: Agent['status']) => {
    switch (status) {
      case 'analyzing':
        return 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.6))';
      case 'done':
        return 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.5))';
      default:
        return 'none';
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
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

  const animateParticles = useCallback(() => {
    if (!svgRef.current || !isRunning) return;

    const svg = d3.select(svgRef.current);
    const particleGroup = svg.select('.particles');

    particlesRef.current.forEach((particle) => {
      particle.progress += particle.speed;
      if (particle.progress > 1) particle.progress = 0;
    });

    particleGroup
      .selectAll<SVGCircleElement, ParticleData>('circle')
      .attr('cx', (d: ParticleData) => d.source.x + (d.target.x - d.source.x) * d.progress)
      .attr('cy', (d: ParticleData) => d.source.y + (d.target.y - d.source.y) * d.progress);

    animationRef.current = requestAnimationFrame(animateParticles);
  }, [isRunning]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Stop previous simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Prepare nodes data
    const nodes = agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      status: agent.status,
      color: agent.color,
      rawData: agent,
    }));

    // Define links - all connected to coordinator with multiple connections
    const links: any[] = [
      { source: 'market_analyst', target: 'coordinator', type: 'DATA_FLOW', name: 'Market Data' },
      { source: 'sentiment_agent', target: 'coordinator', type: 'DATA_FLOW', name: 'Sentiment' },
      { source: 'risk_manager', target: 'coordinator', type: 'DATA_FLOW', name: 'Risk Analysis' },
      { source: 'market_analyst', target: 'sentiment_agent', type: 'SYNC', name: 'Sync' },
      { source: 'sentiment_agent', target: 'risk_manager', type: 'SYNC', name: 'Sync' },
      { source: 'risk_manager', target: 'market_analyst', type: 'SYNC', name: 'Sync' },
    ];

    // Calculate edge curvature for multiple edges
    const edgePairCount: Record<string, number> = {};
    links.forEach((e) => {
      const pairKey = [e.source, e.target].sort().join('_');
      edgePairCount[pairKey] = (edgePairCount[pairKey] || 0) + 1;
    });

    const edgePairIndex: Record<string, number> = {};
    links.forEach((e) => {
      const pairKey = [e.source, e.target].sort().join('_');
      const currentIndex = edgePairIndex[pairKey] || 0;
      edgePairIndex[pairKey] = currentIndex + 1;

      const totalCount = edgePairCount[pairKey];
      let curvature = 0;
      if (totalCount > 1) {
        const curvatureRange = Math.min(1.2, 0.6 + totalCount * 0.15);
        curvature = (currentIndex / (totalCount - 1) - 0.5) * curvatureRange * 2;
        const isReversed = e.source > e.target;
        if (isReversed) curvature = -curvature;
      }

      e.curvature = curvature;
      e.pairTotal = totalCount;
    });

    // Force simulation
    const simulation = d3
      .forceSimulation<SimulationNode>(nodes as SimulationNode[])
      .force(
        'link',
        d3
          .forceLink<SimulationNode, SimulationLink>(links as SimulationLink[])
          .id((d) => d.id)
          .distance((d) => {
            const baseDistance = 120;
            const edgeCount = d.pairTotal || 1;
            return baseDistance + (edgeCount - 1) * 40;
          })
      )
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(innerWidth / 2, innerHeight / 2))
      .force('collide', d3.forceCollide().radius(45))
      .force('x', d3.forceX(innerWidth / 2).strength(0.05))
      .force('y', d3.forceY(innerHeight / 2).strength(0.05));

    simulationRef.current = simulation;

    // Zoom behavior
    const zoom = d3
      .zoom()
      .extent([
        [0, 0],
        [width, height],
      ])
      .scaleExtent([0.5, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Helper functions for curved paths
    const getLinkPath = (d: any) => {
      const sx = d.source.x;
      const sy = d.source.y;
      const tx = d.target.x;
      const ty = d.target.y;

      if (d.curvature === 0) {
        return `M${sx},${sy} L${tx},${ty}`;
      }

      const dx = tx - sx;
      const dy = ty - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pairTotal = d.pairTotal || 1;
      const offsetRatio = 0.25 + pairTotal * 0.05;
      const baseOffset = Math.max(30, dist * offsetRatio);
      const offsetX = (-dy / dist) * d.curvature * baseOffset;
      const offsetY = (dx / dist) * d.curvature * baseOffset;
      const cx = (sx + tx) / 2 + offsetX;
      const cy = (sy + ty) / 2 + offsetY;

      return `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`;
    };

    const getLinkMidpoint = (d: any) => {
      const sx = d.source.x;
      const sy = d.source.y;
      const tx = d.target.x;
      const ty = d.target.y;

      if (d.curvature === 0) {
        return { x: (sx + tx) / 2, y: (sy + ty) / 2 };
      }

      const dx = tx - sx;
      const dy = ty - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pairTotal = d.pairTotal || 1;
      const offsetRatio = 0.25 + pairTotal * 0.05;
      const baseOffset = Math.max(30, dist * offsetRatio);
      const offsetX = (-dy / dist) * d.curvature * baseOffset;
      const offsetY = (dx / dist) * d.curvature * baseOffset;
      const cx = (sx + tx) / 2 + offsetX;
      const cy = (sy + ty) / 2 + offsetY;

      const midX = 0.25 * sx + 0.5 * cx + 0.25 * tx;
      const midY = 0.25 * sy + 0.5 * cy + 0.25 * ty;

      return { x: midX, y: midY };
    };

    // Links group
    const linkGroup = g.append('g').attr('class', 'links');

    // Link paths
    const link = linkGroup
      .selectAll('path')
      .data(links)
      .enter()
      .append('path')
      .attr('stroke', '#C0C0C0')
      .attr('stroke-width', 2)
      .attr('fill', 'none')
      .style('cursor', 'pointer')
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        linkGroup.selectAll('path').attr('stroke', '#C0C0C0').attr('stroke-width', 2);
        d3.select(event.target).attr('stroke', '#2563EB').attr('stroke-width', 3);
      });

    // Link labels background
    const linkLabelBg = linkGroup
      .selectAll('rect')
      .data(links)
      .enter()
      .append('rect')
      .attr('fill', 'rgba(255,255,255,0.95)')
      .attr('rx', 3)
      .attr('ry', 3)
      .style('cursor', 'pointer')
      .style('pointer-events', 'all')
      .style('display', showEdgeLabels ? 'block' : 'none')
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        linkGroup.selectAll('path').attr('stroke', '#C0C0C0').attr('stroke-width', 2);
        link
          .filter((l: any) => l === d)
          .attr('stroke', '#2563EB')
          .attr('stroke-width', 3);
      });

    // Link labels
    const linkLabels = linkGroup
      .selectAll('text')
      .data(links)
      .enter()
      .append('text')
      .text((d: any) => d.name)
      .attr('font-size', '9px')
      .attr('fill', '#666')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('cursor', 'pointer')
      .style('pointer-events', 'all')
      .style('font-family', 'system-ui, sans-serif')
      .style('display', showEdgeLabels ? 'block' : 'none')
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        linkGroup.selectAll('path').attr('stroke', '#C0C0C0').attr('stroke-width', 2);
        link
          .filter((l: any) => l === d)
          .attr('stroke', '#2563EB')
          .attr('stroke-width', 3);
      });

    // Particle container
    g.append('g').attr('class', 'particles');

    // Initialize particles if running
    if (isRunning) {
      particlesRef.current = links
        .filter((_: any, i: number) => i % 2 === 0)
        .map((link: any, i: number) => ({
          id: `particle-${i}`,
          source: { x: 0, y: 0 },
          target: { x: 0, y: 0 },
          progress: Math.random(),
          speed: 0.008 + Math.random() * 0.006,
        }));

      const particleGroup = g.select('.particles');
      particleGroup
        .selectAll('circle')
        .data(particlesRef.current)
        .enter()
        .append('circle')
        .attr('r', 3)
        .attr('fill', '#3B82F6')
        .style('opacity', 0.8);

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      animateParticles();
    }

    // Nodes group
    const nodeGroup = g.append('g').attr('class', 'nodes');

    // Node circles
    const node = nodeGroup
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag()
          .on('start', (event: any, d: any) => {
            d.fx = d.x;
            d.fy = d.y;
            d._dragStartX = event.x;
            d._dragStartY = event.y;
            d._isDragging = false;
          })
          .on('drag', (event: any, d: any) => {
            const dx = event.x - d._dragStartX;
            const dy = event.y - d._dragStartY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (!d._isDragging && distance > 3) {
              d._isDragging = true;
              simulation.alphaTarget(0.3).restart();
            }

            if (d._isDragging) {
              d.fx = event.x;
              d.fy = event.y;
            }
          })
          .on('end', (event: any, d: any) => {
            if (d._isDragging) {
              simulation.alphaTarget(0);
            }
            d.fx = null;
            d.fy = null;
            d._isDragging = false;
          }) as any
      )
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        node.selectAll('circle').attr('stroke', '#fff').attr('stroke-width', 3);
        linkGroup.selectAll('path').attr('stroke', '#C0C0C0').attr('stroke-width', 2);
        d3.select(event.currentTarget)
          .select('circle')
          .attr('stroke', d.color)
          .attr('stroke-width', 4);
        link
          .filter((l: any) => l.source.id === d.id || l.target.id === d.id)
          .attr('stroke', d.color)
          .attr('stroke-width', 2.5);

        setSelectedItem({
          type: 'node',
          data: d.rawData,
          color: d.color,
        });
      })
      .on('mouseenter', (event: any, d: any) => {
        if (!selectedItem || selectedItem.data.id !== d.rawData.id) {
          d3.select(event.currentTarget)
            .select('circle')
            .attr('stroke', '#333')
            .attr('stroke-width', 4);
        }
      })
      .on('mouseleave', (event: any, d: any) => {
        if (!selectedItem || selectedItem.data.id !== d.rawData.id) {
          d3.select(event.currentTarget)
            .select('circle')
            .attr('stroke', '#fff')
            .attr('stroke-width', 3)
            .style('filter', getStatusGlow(d.status));
        }
      });

    // Outer glow
    node
      .append('circle')
      .attr('class', 'glow')
      .attr('r', 32)
      .attr('fill', 'none')
      .attr('stroke', (d: any) => getStatusColor(d.status))
      .attr('stroke-width', 2)
      .style('opacity', 0.3)
      .style('filter', (d: any) => getStatusGlow(d.status));

    // Main circle
    node
      .append('circle')
      .attr('class', 'main')
      .attr('r', 22)
      .attr('fill', (d: any) => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 3);

    // Status indicator
    node
      .append('circle')
      .attr('class', 'status')
      .attr('r', 6)
      .attr('cx', 14)
      .attr('cy', 14)
      .attr('fill', (d: any) => getStatusColor(d.status))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);

    // Node labels
    const nodeLabels = nodeGroup
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .text((d: any) => (d.name.length > 10 ? d.name.substring(0, 10) + '…' : d.name))
      .attr('font-size', '11px')
      .attr('fill', '#333')
      .attr('font-weight', '600')
      .attr('dx', 28)
      .attr('dy', 4)
      .style('pointer-events', 'none')
      .style('font-family', 'system-ui, sans-serif');

    // Simulation tick
    simulation.on('tick', () => {
      link.attr('d', (d: any) => getLinkPath(d));

      linkLabels.each(function (d: any) {
        const mid = getLinkMidpoint(d);
        d3.select(this).attr('x', mid.x).attr('y', mid.y);
      });

      linkLabelBg.each(function (d: any, i: number) {
        const mid = getLinkMidpoint(d);
        const textEl = linkLabels.nodes()[i];
        const bbox = (textEl as SVGTextElement).getBBox();
        d3.select(this)
          .attr('x', mid.x - bbox.width / 2 - 4)
          .attr('y', mid.y - bbox.height / 2 - 2)
          .attr('width', bbox.width + 8)
          .attr('height', bbox.height + 4);
      });

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);

      nodeLabels.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y);

      // Update particle positions
      if (isRunning) {
        const particleGroup = g.select('.particles');
        particleGroup
          .selectAll<SVGCircleElement, ParticleData>('circle')
          .attr('cx', (d: ParticleData, i: number) => {
            const link = links[i % links.length];
            if (!link?.source?.x || !link?.target?.x) return 0;
            d.source = { x: link.source.x, y: link.source.y };
            d.target = { x: link.target.x, y: link.target.y };
            return d.source.x + (d.target.x - d.source.x) * d.progress;
          })
          .attr('cy', (d: ParticleData, i: number) => {
            const link = links[i % links.length];
            if (!link?.source?.y || !link?.target?.y) return 0;
            return d.source.y + (d.target.y - d.source.y) * d.progress;
          });
      }
    });

    // Click background to deselect
    svg.on('click', () => {
      setSelectedItem(null);
      node.selectAll('circle').attr('stroke', '#fff').attr('stroke-width', 3);
      linkGroup.selectAll('path').attr('stroke', '#C0C0C0').attr('stroke-width', 2);
    });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      simulation.stop();
    };
  }, [agents, isRunning, width, height, showEdgeLabels, animateParticles]);

  // Update styles when agents change
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    svg
      .selectAll('.status')
      .transition()
      .duration(300)
      .attr('fill', (d: any) => getStatusColor(d.status));

    svg
      .selectAll('.glow')
      .transition()
      .duration(300)
      .attr('stroke', (d: any) => getStatusColor(d.status))
      .style('filter', (d: any) => getStatusGlow(d.status))
      .style('opacity', (d: any) => (d.status === 'analyzing' ? 0.6 : 0.3));
  }, [agents]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#FAFAFA',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundImage: 'radial-gradient(#D0D0D0 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
      }}
    >
      <svg
        ref={svgRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />

      {/* Edge Labels Toggle */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#FFF',
          padding: '8px 12px',
          borderRadius: '20px',
          border: '1px solid #E0E0E0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          zIndex: 10,
        }}
      >
        <label
          style={{
            position: 'relative',
            display: 'inline-block',
            width: '40px',
            height: '22px',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={showEdgeLabels}
            onChange={(e) => setShowEdgeLabels(e.target.checked)}
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
              backgroundColor: showEdgeLabels ? '#2563EB' : '#E0E0E0',
              borderRadius: '22px',
              transition: '0.3s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                content: '""',
                height: '16px',
                width: '16px',
                left: showEdgeLabels ? '21px' : '3px',
                bottom: '3px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: '0.3s',
              }}
            />
          </span>
        </label>
        <span style={{ fontSize: '12px', color: '#666' }}>Show Labels</span>
      </div>

      {/* Running Indicator */}
      {isRunning && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '30px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontWeight: 500,
            letterSpacing: '0.5px',
            zIndex: 100,
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
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
          bottom: '20px',
          left: '20px',
          background: 'rgba(255,255,255,0.95)',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #EAEAEA',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          zIndex: 10,
        }}
      >
        <span
          style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: 600,
            color: '#2563EB',
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Agent Types
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {agents.map((agent) => (
            <div
              key={agent.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#555',
              }}
            >
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: agent.color,
                  flexShrink: 0,
                }}
              />
              <span>{agent.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedItem && (
        <div
          style={{
            position: 'absolute',
            top: '60px',
            right: '20px',
            width: '280px',
            maxHeight: 'calc(100% - 100px)',
            background: '#FFF',
            border: '1px solid #EAEAEA',
            borderRadius: '10px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            fontSize: '13px',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              background: '#FAFAFA',
              borderBottom: '1px solid #EEE',
            }}
          >
            <span style={{ fontWeight: 600, color: '#333', fontSize: '14px' }}>Agent Details</span>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 500,
                background: selectedItem.color,
                color: '#fff',
              }}
            >
              {selectedItem.data.role}
            </span>
            <button
              onClick={() => setSelectedItem(null)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#999',
                lineHeight: 1,
                padding: '0 4px',
              }}
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '16px', overflowY: 'auto' }}>
            {/* Name */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: '#888', fontSize: '12px', fontWeight: 500 }}>Name: </span>
              <span style={{ color: '#333', fontWeight: 600 }}>{selectedItem.data.name}</span>
            </div>

            {/* ID */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: '#888', fontSize: '12px', fontWeight: 500 }}>ID: </span>
              <span style={{ color: '#666', fontFamily: 'monospace', fontSize: '11px' }}>
                {selectedItem.data.id}
              </span>
            </div>

            {/* Status */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: '#888', fontSize: '12px', fontWeight: 500 }}>Status: </span>
              <span
                style={{
                  color: getStatusColor(selectedItem.data.status),
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              >
                {selectedItem.data.status}
              </span>
            </div>

            {/* Decision */}
            {selectedItem.data.decision && (
              <div style={{ marginBottom: '12px' }}>
                <span style={{ color: '#888', fontSize: '12px', fontWeight: 500 }}>Decision: </span>
                <span
                  style={{
                    fontWeight: 700,
                    color:
                      selectedItem.data.decision === 'BUY'
                        ? '#10B981'
                        : selectedItem.data.decision === 'SELL'
                          ? '#EF4444'
                          : '#6B7280',
                  }}
                >
                  {selectedItem.data.decision}
                </span>
              </div>
            )}

            {/* Confidence */}
            {selectedItem.data.confidence && (
              <div style={{ marginBottom: '12px' }}>
                <span style={{ color: '#888', fontSize: '12px', fontWeight: 500 }}>
                  Confidence:{' '}
                </span>
                <span style={{ color: '#333' }}>{selectedItem.data.confidence}%</span>
              </div>
            )}

            {/* Reasoning */}
            {selectedItem.data.reasoning && (
              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '14px',
                  borderTop: '1px solid #F0F0F0',
                }}
              >
                <div
                  style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '10px' }}
                >
                  Reasoning:
                </div>
                <div style={{ lineHeight: 1.6, color: '#444', fontSize: '12px' }}>
                  {selectedItem.data.reasoning}
                </div>
              </div>
            )}

            {/* Created At */}
            {selectedItem.data.createdAt && (
              <div style={{ marginTop: '12px' }}>
                <span style={{ color: '#888', fontSize: '12px', fontWeight: 500 }}>Created: </span>
                <span style={{ color: '#333' }}>{formatDateTime(selectedItem.data.createdAt)}</span>
              </div>
            )}

            {/* Attributes */}
            {selectedItem.data.attributes &&
              Object.keys(selectedItem.data.attributes).length > 0 && (
                <div
                  style={{
                    marginTop: '16px',
                    paddingTop: '14px',
                    borderTop: '1px solid #F0F0F0',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#666',
                      marginBottom: '10px',
                    }}
                  >
                    Properties:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.entries(selectedItem.data.attributes).map(([key, value]) => (
                      <div key={key} style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ color: '#888', fontWeight: 500, minWidth: '80px' }}>
                          {key}:
                        </span>
                        <span style={{ color: '#333' }}>{String(value) || 'None'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
