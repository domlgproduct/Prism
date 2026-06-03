import { useState, useEffect } from 'react';
import { 
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Paper, Chip, Stack, CircularProgress, CardContent
} from '@mui/material';
import { 
  Apartment as OperatorIcon, 
  Web as BrandIcon, 
  Gavel as RegulatorIcon,
  Tag as TopicIcon
} from '@mui/icons-material';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import GlassCard from '../components/GlassCard';

const client = generateClient<Schema>();

export default function EntityGraph() {
  const [entities, setEntities] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Entities & Relationships in parallel
      const [entRes, relRes] = await Promise.all([
        client.models.Entity.list(),
        client.models.Relationship.list()
      ]);

      setEntities(entRes.data || []);
      setRelationships(relRes.data || []);
    } catch (err) {
      console.error('Error fetching graph details:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper map to resolve Entity IDs to Names
  const entityMap = entities.reduce((acc, ent) => {
    acc[ent.id] = ent;
    return acc;
  }, {} as Record<string, any>);

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'OPERATOR': return <OperatorIcon sx={{ color: '#90caf9', fontSize: 16 }} />;
      case 'BRAND': return <BrandIcon sx={{ color: '#f48fb1', fontSize: 16 }} />;
      case 'REGULATOR': return <RegulatorIcon sx={{ color: '#a5d6a7', fontSize: 16 }} />;
      default: return <TopicIcon sx={{ color: '#ffe082', fontSize: 16 }} />;
    }
  };

  return (
    <Box className="fade-in" sx={{ py: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>
          Entity & Relationship Graph
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Browse generic business structures, brands, and strategic connections
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={4}>
          {/* Entities List */}
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
                      No registered entities found. Use the Database Seeder script to seed your dev sandbox.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </GlassCard>
          </Grid>

          {/* Relationships Matrix */}
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

// Simple local Grid item layout mapper helper
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
