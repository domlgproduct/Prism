import { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Switch, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, FormControl, InputLabel, Select, MenuItem, CircularProgress, Chip
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import GlassCard from '../components/GlassCard';

const client = generateClient<Schema>();

export default function SourcesAdmin() {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [sourceType, setSourceType] = useState('RSS');

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const { data: sourceList } = await client.models.SourceDefinition.list();
      setSources(sourceList || []);
    } catch (err) {
      console.error('Error fetching sources:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (source: any) => {
    try {
      const updated = !source.active;
      // Optimistic state update
      setSources(prev => prev.map(s => s.id === source.id ? { ...s, active: updated } : s));
      
      await client.models.SourceDefinition.update({
        id: source.id,
        active: updated
      });
    } catch (err) {
      console.error('Error updating source active state:', err);
      // Revert if failed
      fetchSources();
    }
  };

  const handleCreateSource = async () => {
    if (!name || !url) return;
    setActionLoading(true);
    try {
      await client.models.SourceDefinition.create({
        name,
        url,
        sourceType: sourceType as any,
        active: true,
        pollingConfig: 'rate(1 hour)',
        domainConfig: '{}',
        defaultScoringHints: '{"reliabilityScore": 4}',
        tags: ['manual']
      });
      
      setIsModalOpen(false);
      setName('');
      setUrl('');
      setSourceType('RSS');
      fetchSources();
    } catch (err) {
      console.error('Error creating source:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Box className="fade-in" sx={{ py: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>
            Monitored Feeds
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure monitored RSS feeds, press release targets, and scraping intervals
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsModalOpen(true)}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
        >
          Add Feed
        </Button>
      </Box>

      {/* Table grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <GlassCard>
          <TableContainer component={Paper} sx={{ background: 'transparent', boxShadow: 'none' }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.08)', fontWeight: 600, color: 'text.secondary' } }}>
                  <TableCell>Name</TableCell>
                  <TableCell>Source Type</TableCell>
                  <TableCell>Feed / Web URL</TableCell>
                  <TableCell align="center">Interval</TableCell>
                  <TableCell align="center">Active Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sources.map((source) => (
                  <TableRow
                    key={source.id}
                    sx={{ 
                      '& td': { borderColor: 'rgba(255,255,255,0.05)', py: 2.5 },
                      '&:hover': { background: 'rgba(255,255,255,0.01)' }
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>
                      {source.name}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={source.sourceType} 
                        size="small" 
                        variant="outlined" 
                        sx={{ fontSize: '0.7rem', fontWeight: 600 }} 
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {source.url}
                    </TableCell>
                    <TableCell align="center" sx={{ color: 'text.secondary' }}>
                      {source.pollingConfig || 'rate(1 hour)'}
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        checked={!!source.active}
                        onChange={() => handleToggleActive(source)}
                        color="primary"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {sources.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No monitored feeds found. Use the Database Seeder script to initialize your iGaming sources.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </GlassCard>
      )}

      {/* Add Feed Dialog Modal */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        slotProps={{
          paper: {
            sx: {
              background: '#151522',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              p: 2,
              minWidth: { xs: '100%', sm: 450 }
            }
          }
        }}
      >
        <DialogTitle sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>
          Add Monitored Feed
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <TextField
            label="Feed Name"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            variant="outlined"
            placeholder="e.g. iGaming Business"
          />

          <TextField
            label="Feed URL"
            fullWidth
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            variant="outlined"
            placeholder="e.g. https://example.com/feed"
          />

          <FormControl fullWidth>
            <InputLabel>Source Type</InputLabel>
            <Select
              value={sourceType}
              label="Source Type"
              onChange={(e) => setSourceType(e.target.value)}
            >
              <MenuItem value="RSS">RSS Feed</MenuItem>
              <MenuItem value="INVESTOR_RELATIONS">Investor Relations page</MenuItem>
              <MenuItem value="NEWS_SITE">News site / Announcement</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsModalOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateSource}
            disabled={actionLoading || !name || !url}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
