import { useState, useEffect } from 'react';
import { 
  Box, Typography, TextField, Stack, Select, MenuItem, InputLabel, 
  FormControl, CardContent, CircularProgress, Collapse, CardActions, Button, Chip, Paper
} from '@mui/material';
import { 
  Search as SearchIcon, 
  ExpandMore as ExpandMoreIcon, 
  ExpandLess as ExpandLessIcon,
  Label as TagIcon
} from '@mui/icons-material';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import GlassCard from '../components/GlassCard';
import ScoreIndicator from '../components/ScoreIndicator';

const client = generateClient<Schema>();

export default function KnowledgeBase() {
  const [items, setItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('ALL');
  const [selectedSignificance, setSelectedSignificance] = useState('ALL');
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPublishedItems();
  }, []);

  const fetchPublishedItems = async () => {
    setLoading(true);
    try {
      const { data: publishedItems } = await client.models.KnowledgeItem.list({
        filter: { status: { eq: 'PUBLISHED' } }
      });
      setItems(publishedItems || []);
    } catch (err) {
      console.error('Error fetching published items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExpandClick = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Compile list of unique topics from all items for the dropdown filter
  const topics = ['ALL', ...Array.from(new Set(items.flatMap(item => item.topics || [])))];

  // Filtering Logic
  const filteredItems = items.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.summary && item.summary.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesTopic = selectedTopic === 'ALL' || 
      (item.topics && item.topics.includes(selectedTopic));
      
    const matchesSignificance = selectedSignificance === 'ALL' || 
      (item.significanceScore && item.significanceScore >= parseInt(selectedSignificance));
      
    return matchesSearch && matchesTopic && matchesSignificance;
  });

  return (
    <Box className="fade-in" sx={{ py: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>
          Knowledge Base
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Explore and query published canonical intelligence records
        </Typography>
      </Box>

      {/* Filter controls */}
      <GlassCard sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search published records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Topic</InputLabel>
              <Select
                value={selectedTopic}
                label="Filter by Topic"
                onChange={(e) => setSelectedTopic(e.target.value)}
              >
                {topics.map(t => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Min Significance</InputLabel>
              <Select
                value={selectedSignificance}
                label="Min Significance"
                onChange={(e) => setSelectedSignificance(e.target.value)}
              >
                <MenuItem value="ALL">All Scores</MenuItem>
                <MenuItem value="3">3+ Relevant</MenuItem>
                <MenuItem value="4">4+ Strategic</MenuItem>
                <MenuItem value="5">5 Market-Shaping</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </GlassCard>

      {/* Loading state */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredItems.length === 0 ? (
        <Paper className="glass-panel" sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="body1" color="text.secondary">
            No published items found matching your filters.
          </Typography>
        </Paper>
      ) : (
        /* Results Grid */
        <Stack spacing={3}>
          {filteredItems.map(item => {
            const isExpanded = expandedId === item.id;
            return (
              <GlassCard key={item.id} hoverEffect={!isExpanded}>
                <CardContent sx={{ p: 4, pb: isExpanded ? 2 : 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Stack direction="row" spacing={1}>
                      <ScoreIndicator score={item.reliabilityScore} type="reliability" />
                      <ScoreIndicator score={item.significanceScore} type="significance" />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      PUBLISHED • {new Date(item.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>

                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5 }}>
                    {item.title}
                  </Typography>

                  <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.6 }}>
                    {item.summary}
                  </Typography>

                  {/* Badges */}
                  {item.topics && item.topics.length > 0 && (
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                      {item.topics.map((t: string) => (
                        <Chip key={t} label={t} size="small" variant="outlined" icon={<TagIcon style={{ fontSize: 12 }} />} />
                      ))}
                    </Stack>
                  )}
                </CardContent>

                <CardActions sx={{ px: 4, pb: 2, justifyContent: 'flex-end' }}>
                  <Button 
                    size="small" 
                    onClick={() => handleExpandClick(item.id)}
                    endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    sx={{ textTransform: 'none' }}
                  >
                    {isExpanded ? 'Hide Details' : 'Show Details'}
                  </Button>
                </CardActions>

                {/* Collapsible Details */}
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />
                  <CardContent sx={{ p: 4, background: 'rgba(0,0,0,0.1)' }}>
                    <Grid container spacing={4}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 600 }}>
                          Why It Matters
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          {item.whyItMatters || 'No explanation provided.'}
                        </Typography>

                        <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 600 }}>
                          Key Facts
                        </Typography>
                        {item.keyFacts && item.keyFacts.length > 0 ? (
                          <Box component="ul" sx={{ m: 0, pl: 2, color: 'text.secondary', fontSize: '0.875rem' }}>
                            {item.keyFacts.map((fact: string, idx: number) => (
                              <li key={idx} style={{ marginBottom: 6 }}>{fact}</li>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">No structured facts mapped.</Typography>
                        )}
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 600 }}>
                          Markdown Body (LLM Export Preview)
                        </Typography>
                        <Paper sx={{ 
                          p: 2, 
                          background: '#151522', 
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          maxHeight: 250,
                          overflowY: 'auto',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          color: '#a1a5b7'
                        }}>
                          {item.markdownBody || 'No markdown body compiled.'}
                        </Paper>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Collapse>
              </GlassCard>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}

// Simple Divider helper
function Divider({ sx }: { sx?: any }) {
  return <Box sx={{ borderBottom: '1px solid transparent', ...sx }} />;
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
