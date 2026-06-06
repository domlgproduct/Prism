import { useState, useEffect, useRef } from 'react';
import { 
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Paper, Chip, Stack, CircularProgress, CardContent, Button, ButtonGroup
} from '@mui/material';
import { 
  Apartment as OperatorIcon, 
  Web as BrandIcon, 
  Gavel as RegulatorIcon,
  Tag as TopicIcon,
  FormatListBulleted as ListIcon,
  Hub as GraphIcon
} from '@mui/icons-material';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import GlassCard from '../components/GlassCard';

const client = generateClient<Schema>();

interface Node {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Link {
  id: string;
  source: string;
  target: string;
  type: string;
}

export default function EntityGraph() {
  const [entities, setEntities] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');

  // Physics Simulation States
  const [nodes, setNodes] = useState<Node[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const dragNodeRef = useRef<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const [entRes, relRes] = await Promise.all([
        client.models.Entity.list(),
        client.models.Relationship.list()
      ]);

      const fetchedEntities = entRes.data || [];
      const fetchedRelationships = relRes.data || [];

      setEntities(fetchedEntities);
      setRelationships(fetchedRelationships);

      // Initialize Node positions in a circle
      const initialNodes: Node[] = fetchedEntities.map((ent, idx) => {
        const angle = (idx / (fetchedEntities.length || 1)) * 2 * Math.PI;
        const radius = 150 + Math.random() * 30;
        return {
          id: ent.id,
          name: ent.name,
          type: ent.type || 'OTHER',
          x: 350 + Math.cos(angle) * radius,
          y: 250 + Math.sin(angle) * radius,
          vx: 0,
          vy: 0
        };
      });
      setNodes(initialNodes);

    } catch (err) {
      console.error('Error fetching graph details:', err);
    } finally {
      setLoading(false);
    }
  };

  // Run Physics Ticks continuously in requestAnimationFrame
  useEffect(() => {
    if (viewMode !== 'graph' || nodes.length === 0) return;

    let animationFrameId: number;
    const center = { x: 350, y: 250 };
    const links: Link[] = relationships.map(rel => ({
      id: rel.id,
      source: rel.sourceEntityId,
      target: rel.targetEntityId,
      type: rel.relationshipType
    }));

    const tick = () => {
      setNodes(prevNodes => {
        // Create a copy of the nodes to apply physics forces
        const updated = prevNodes.map(n => ({ ...n }));

        // 1. Repulsion between all nodes (prevent overlap)
        for (let i = 0; i < updated.length; i++) {
          const n1 = updated[i];
          for (let j = i + 1; j < updated.length; j++) {
            const n2 = updated[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // Adjust minimum distance threshold
            const minDist = 100;
            if (dist < minDist) {
              const force = (minDist - dist) * 0.08;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              n1.vx -= fx;
              n1.vy -= fy;
              n2.vx += fx;
              n2.vy += fy;
            }
          }

          // Gravity pull to center
          const cdx = center.x - n1.x;
          const cdy = center.y - n1.y;
          n1.vx += cdx * 0.008;
          n1.vy += cdy * 0.008;
        }

        // 2. Attraction from links (pull connected nodes together)
        links.forEach(link => {
          const sourceNode = updated.find(n => n.id === link.source);
          const targetNode = updated.find(n => n.id === link.target);
          if (sourceNode && targetNode) {
            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const desiredDist = 130;
            const force = (dist - desiredDist) * 0.04;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            sourceNode.vx += fx;
            sourceNode.vy += fy;
            targetNode.vx -= fx;
            targetNode.vy -= fy;
          }
        });

        // 3. Apply velocities, friction/damping and update coordinates
        return updated.map(n => {
          // If node is currently being dragged, don't apply physics movements
          if (n.id === dragNodeRef.current) return n;

          n.x += n.vx;
          n.y += n.vy;
          n.vx *= 0.75; // damping
          n.vy *= 0.75;

          // Boundary constraint
          n.x = Math.max(40, Math.min(660, n.x));
          n.y = Math.max(40, Math.min(460, n.y));

          return n;
        });
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [viewMode, relationships, nodes.length]);

  // Helper map to resolve Entity IDs to Names
  const entityMap = entities.reduce((acc, ent) => {
    acc[ent.id] = ent;
    return acc;
  }, {} as Record<string, any>);

  const getEntityColor = (type: string) => {
    switch (type) {
      case 'OPERATOR': return '#90caf9';
      case 'BRAND': return '#f48fb1';
      case 'REGULATOR': return '#a5d6a7';
      default: return '#ffe082';
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'OPERATOR': return <OperatorIcon sx={{ color: '#90caf9', fontSize: 16 }} />;
      case 'BRAND': return <BrandIcon sx={{ color: '#f48fb1', fontSize: 16 }} />;
      case 'REGULATOR': return <RegulatorIcon sx={{ color: '#a5d6a7', fontSize: 16 }} />;
      default: return <TopicIcon sx={{ color: '#ffe082', fontSize: 16 }} />;
    }
  };

  // Node Drag Handlers
  const handleMouseDown = (nodeId: string) => {
    dragNodeRef.current = nodeId;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragNodeRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setNodes(prev => prev.map(n => {
      if (n.id === dragNodeRef.current) {
        return { ...n, x: Math.max(40, Math.min(660, x)), y: Math.max(40, Math.min(460, y)), vx: 0, vy: 0 };
      }
      return n;
    }));
  };

  const handleMouseUp = () => {
    dragNodeRef.current = null;
  };

  // Highlight connections
  const connectedNodeIds = hoveredNode ? new Set<string>([
    hoveredNode,
    ...relationships
      .filter(r => r.sourceEntityId === hoveredNode || r.targetEntityId === hoveredNode)
      .map(r => r.sourceEntityId === hoveredNode ? r.targetEntityId : r.sourceEntityId)
  ]) : null;

  return (
    <Box className="fade-in" sx={{ py: 2 }}>
      {/* Header with Visual Mode Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>
            Entity & Relationship Graph
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Browse generic business structures, brands, and strategic connections
          </Typography>
        </Box>
        <ButtonGroup variant="outlined" size="small" sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <Button 
            onClick={() => setViewMode('graph')}
            variant={viewMode === 'graph' ? 'contained' : 'outlined'}
            startIcon={<GraphIcon />}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Visual Graph
          </Button>
          <Button 
            onClick={() => setViewMode('list')}
            variant={viewMode === 'list' ? 'contained' : 'outlined'}
            startIcon={<ListIcon />}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            List Matrix
          </Button>
        </ButtonGroup>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : viewMode === 'graph' ? (
        // Glowing Neon SVG Node-Link Canvas
        <GlassCard sx={{ overflow: 'hidden' }}>
          <CardContent sx={{ p: 0, position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: 16, left: 16, pointerEvents: 'none', zIndex: 5 }}>
              <Stack direction="row" spacing={1.5}>
                <Chip size="small" label="Operator" sx={{ bgcolor: 'rgba(144,202,249,0.1)', color: '#90caf9', fontSize: '0.7rem', fontWeight: 700 }} />
                <Chip size="small" label="Brand" sx={{ bgcolor: 'rgba(244,143,177,0.1)', color: '#f48fb1', fontSize: '0.7rem', fontWeight: 700 }} />
                <Chip size="small" label="Regulator" sx={{ bgcolor: 'rgba(165,214,167,0.1)', color: '#a5d6a7', fontSize: '0.7rem', fontWeight: 700 }} />
                <Chip size="small" label="Other" sx={{ bgcolor: 'rgba(255,224,130,0.1)', color: '#ffe082', fontSize: '0.7rem', fontWeight: 700 }} />
              </Stack>
            </Box>
            <Box sx={{ position: 'absolute', bottom: 16, right: 16, pointerEvents: 'none', color: 'text.secondary' }}>
              <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic' }}>
                💡 Tip: Hover nodes to highlight connections, drag nodes to reorganize them!
              </Typography>
            </Box>
            <svg
              ref={svgRef}
              width="100%"
              height="550"
              viewBox="0 0 700 500"
              style={{ background: '#0d0d17', cursor: dragNodeRef.current ? 'grabbing' : 'default', display: 'block' }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <defs>
                {/* Glow Filter for glowing neon effect */}
                <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <marker id="arrow" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.2)" />
                </marker>
                <marker id="arrow-highlight" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#2196f3" />
                </marker>
              </defs>

              {/* Mapped Connecting Lines */}
              {relationships.map(rel => {
                const source = nodes.find(n => n.id === rel.sourceEntityId);
                const target = nodes.find(n => n.id === rel.targetEntityId);
                if (!source || !target) return null;

                const isHighlighted = hoveredNode 
                  ? (rel.sourceEntityId === hoveredNode || rel.targetEntityId === hoveredNode) 
                  : false;
                const isDimmed = hoveredNode && !isHighlighted;

                // Draw curved lines using cubic bezier
                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const dr = Math.sqrt(dx * dx + dy * dy);
                const pathData = `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${target.x},${target.y}`;

                return (
                  <g key={rel.id}>
                    <path
                      d={pathData}
                      fill="none"
                      stroke={isHighlighted ? '#2196f3' : 'rgba(255,255,255,0.08)'}
                      strokeWidth={isHighlighted ? 2.5 : 1.5}
                      markerEnd={isHighlighted ? "url(#arrow-highlight)" : "url(#arrow)"}
                      style={{
                        transition: 'stroke 0.2s, stroke-width 0.2s',
                        opacity: isDimmed ? 0.15 : 1,
                        filter: isHighlighted ? 'url(#neon-glow)' : 'none'
                      }}
                    />
                    {isHighlighted && (
                      <text
                        dy="-4"
                        fill="#90caf9"
                        fontSize="9"
                        fontWeight="700"
                        style={{ opacity: 0.95 }}
                      >
                        <textPath href={`#${rel.id}`} startOffset="50%" textAnchor="middle" xlinkHref={`#${rel.id}`}>
                          {rel.relationshipType}
                        </textPath>
                      </text>
                    )}
                    {/* Invisible path wrapper to reference for textPath */}
                    <path id={rel.id} d={pathData} fill="none" pointerEvents="none" />
                  </g>
                );
              })}

              {/* Mapped Nodes */}
              {nodes.map(node => {
                const isHighlighted = connectedNodeIds ? connectedNodeIds.has(node.id) : false;
                const isCurrentHovered = hoveredNode === node.id;
                const isDimmed = hoveredNode && !isHighlighted;
                const color = getEntityColor(node.type);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x},${node.y})`}
                    style={{ cursor: 'grab', opacity: isDimmed ? 0.3 : 1, transition: 'opacity 0.2s' }}
                    onMouseDown={() => handleMouseDown(node.id)}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {/* Glowing outer circle on highlight */}
                    <circle
                      r={isCurrentHovered ? 26 : isHighlighted ? 22 : 18}
                      fill="none"
                      stroke={color}
                      strokeWidth={isHighlighted ? 3 : 1}
                      strokeOpacity={isHighlighted ? 0.8 : 0.2}
                      style={{
                        transition: 'r 0.2s, stroke-width 0.2s, stroke-opacity 0.2s',
                        filter: isHighlighted ? 'url(#neon-glow)' : 'none'
                      }}
                    />
                    {/* Inner core circle */}
                    <circle
                      r={14}
                      fill="#1e1e2f"
                      stroke={color}
                      strokeWidth={2}
                      style={{ transition: 'r 0.2s' }}
                    />
                    {/* Node Initials Label */}
                    <text
                      textAnchor="middle"
                      dy="4"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {node.name.substring(0, 2).toUpperCase()}
                    </text>
                    {/* Text Label underneath node */}
                    <text
                      y="28"
                      textAnchor="middle"
                      fill={isCurrentHovered ? '#ffffff' : 'rgba(255,255,255,0.7)'}
                      fontSize="10"
                      fontWeight={isCurrentHovered ? 'bold' : 'normal'}
                      style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.2s' }}
                    >
                      {node.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </CardContent>
        </GlassCard>
      ) : (
        // Legacy Structured List Matrix Grid Layout
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <GlassCard sx={{ height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  Registered Entities ({entities.length})
                </Typography>
                
                <Stack spacing={2} sx={{ maxHeight: 500, overflowY: 'auto', pr: 1 }}>
                  {entities.map(ent => (
                    <Box 
                      key={ent.id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Box>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          {getEntityIcon(ent.type)}
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {ent.name}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          slug: {ent.slug}
                        </Typography>
                      </Box>
                      <Chip 
                        label={ent.type} 
                        size="small" 
                        sx={{ 
                          fontSize: '0.65rem', 
                          fontWeight: 700,
                          background: 'rgba(255,255,255,0.06)'
                        }} 
                      />
                    </Box>
                  ))}
                  {entities.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      No registered entities found.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </GlassCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <GlassCard sx={{ height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  Structured Relationships ({relationships.length})
                </Typography>

                {relationships.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    No corporate relationships mapped yet.
                  </Typography>
                ) : (
                  <TableContainer component={Paper} sx={{ background: 'transparent', boxShadow: 'none', border: 'none', maxHeight: 500, overflowY: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 300 }}>
                      <TableHead>
                        <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.08)', fontWeight: 600, color: 'text.secondary' } }}>
                          <TableCell>Subject</TableCell>
                          <TableCell align="center">Relationship</TableCell>
                          <TableCell>Object</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {relationships.map(rel => {
                          const source = entityMap[rel.sourceEntityId];
                          const target = entityMap[rel.targetEntityId];
                          return (
                            <TableRow key={rel.id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.05)', py: 2 } }}>
                              <TableCell sx={{ fontWeight: 600 }}>
                                {source ? source.name : 'Unknown Entity'}
                              </TableCell>
                              <TableCell align="center">
                                <Chip 
                                  label={rel.relationshipType} 
                                  size="small" 
                                  variant="outlined"
                                  color="primary"
                                  sx={{ fontSize: '0.7rem', fontWeight: 600, px: 0.5 }}
                                />
                              </TableCell>
                              <TableCell sx={{ color: 'text.secondary' }}>
                                {target ? target.name : 'Unknown Entity'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </GlassCard>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

function Grid({ children, container, item, xs, sm, md, spacing, alignItems, ...props }: any) {
  return (
    <Box 
      sx={{ 
        display: container ? 'flex' : 'block',
        flexWrap: 'wrap',
        margin: container && spacing ? `-${spacing * 4}px` : 0,
        width: item && xs ? `${(xs / 12) * 100}%` : 'auto',
        flexDirection: container ? 'row' : 'unset',
        alignItems: alignItems || 'stretch',
        ...(item && sm && {
          '@media (min-width: 600px)': {
            width: `${(sm / 12) * 100}%`
          }
        }),
        ...(item && md && {
          '@media (min-width: 900px)': {
            width: `${(md / 12) * 100}%`
          }
        }),
        '& > *': {
          padding: container && spacing ? `${spacing * 4}px` : 0
        }
      }}
      {...props}
    >
      {children}
    </Box>
  );
}
