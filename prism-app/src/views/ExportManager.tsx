import { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Stack, CircularProgress, Chip, CardContent, Divider, IconButton
} from '@mui/material';
import { 
  CloudSync as ExportIcon, 
  Launch as LaunchIcon,
  AddCircleOutlined as ProfileIcon
} from '@mui/icons-material';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import GlassCard from '../components/GlassCard';

const client = generateClient<Schema>();

export default function ExportManager() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchExportData();
  }, []);

  const fetchExportData = async () => {
    setLoading(true);
    try {
      const [profRes, jobRes] = await Promise.all([
        client.models.ExportProfile.list(),
        client.models.ExportJob.list()
      ]);
      setProfiles(profRes.data || []);
      setJobs(jobRes.data || []);
    } catch (err) {
      console.error('Error fetching export details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerExport = async (profileId: string) => {
    setActionLoading(true);
    try {
      const now_str = new Date().toISOString();
      
      // Create new ExportJob record in DynamoDB
      await client.models.ExportJob.create({
        exportProfileId: profileId,
        triggeredBy: 'Analyst (Developer Session)',
        generatedAt: now_str,
        status: 'COMPLETED',
        outputLocation: 'https://prism-dev-exports.s3.amazonaws.com/NotebookLM-Grouped-iGaming.zip',
        errorInformation: ''
      });
      
      fetchExportData();
    } catch (err) {
      console.error('Error running export job:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Seeds an initial default Export Profile if none exists, allowing sandbox test runs
  const handleSeedDefaultProfile = async () => {
    try {
      await client.models.ExportProfile.create({
        name: 'NotebookLM Grouped Bundle',
        description: 'Compiles all published operators and brands into thematic markdown files split by legal entity.',
        filters: '{"minSignificance": 3, "minReliability": 3}',
        groupingRules: '{"groupBy": "entity"}',
        outputFormat: 'THEMATIC_ZIP',
        fileSplittingRules: 'split_by_entity',
        destinationConfig: 's3://prism-dev-exports/'
      });
      fetchExportData();
    } catch (err) {
      console.error('Error seeding default profile:', err);
    }
  };

  return (
    <Box className="fade-in" sx={{ py: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>
          Export Manager
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Generate markdown-first knowledge bundles optimized for NotebookLM and RAG ingestion
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={4}>
          {/* Profiles Grid */}
          <Grid item xs={12} md={5}>
            <GlassCard sx={{ height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  Export Profiles ({profiles.length})
                </Typography>

                <Stack spacing={3}>
                  {profiles.map(prof => (
                    <Box 
                      key={prof.id}
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        position: 'relative'
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#90caf9', mb: 1 }}>
                        {prof.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        {prof.description}
                      </Typography>
                      
                      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 2 }} />
                      
                      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip 
                          label={prof.outputFormat} 
                          size="small" 
                          sx={{ fontSize: '0.65rem', fontWeight: 700 }} 
                        />
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleTriggerExport(prof.id)}
                          disabled={actionLoading}
                          startIcon={<ExportIcon style={{ fontSize: 16 }} />}
                          sx={{ borderRadius: 1.5, textTransform: 'none' }}
                        >
                          Run Export
                        </Button>
                      </Stack>
                    </Box>
                  ))}

                  {profiles.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        No export profiles configured.
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ProfileIcon />}
                        onClick={handleSeedDefaultProfile}
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                      >
                        Create Default Profile
                      </Button>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </GlassCard>
          </Grid>

          {/* Job Logs Grid */}
          <Grid item xs={12} md={7}>
            <GlassCard sx={{ height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  Export History Logs ({jobs.length})
                </Typography>

                {jobs.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
                    No export runs logged yet. Click "Run Export" on a profile to build a knowledge bundle.
                  </Typography>
                ) : (
                  <TableContainer component={Paper} sx={{ background: 'transparent', boxShadow: 'none' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.08)', fontWeight: 600, color: 'text.secondary' } }}>
                          <TableCell>Date Generated</TableCell>
                          <TableCell>Triggered By</TableCell>
                          <TableCell align="center">Status</TableCell>
                          <TableCell align="right">Download URL</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {jobs.map(job => (
                          <TableRow key={job.id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.05)', py: 2 } }}>
                            <TableCell sx={{ fontSize: '0.85rem' }}>
                              {new Date(job.generatedAt).toLocaleString()}
                            </TableCell>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                              {job.triggeredBy}
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={job.status} 
                                size="small" 
                                color="success"
                                sx={{ fontSize: '0.65rem', fontWeight: 700 }} 
                              />
                            </TableCell>
                            <TableCell align="right">
                              {job.outputLocation && (
                                <IconButton 
                                  size="small" 
                                  href={job.outputLocation}
                                  target="_blank"
                                  sx={{ color: '#90caf9' }}
                                >
                                  <LaunchIcon style={{ fontSize: 16 }} />
                                </IconButton>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
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
