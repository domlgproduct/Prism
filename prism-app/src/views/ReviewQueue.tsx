import { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Stack, Drawer, TextField, Slider, 
  IconButton, Alert, CircularProgress, Chip, Paper, useTheme, useMediaQuery
} from '@mui/material';
import { 
  CheckCircle as ApproveIcon, 
  Cancel as RejectIcon, 
  AutoAwesome as AiIcon, 
  Close as CloseIcon, 
  PostAdd as SeedIcon 
} from '@mui/icons-material';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import GlassCard from '../components/GlassCard';
import ScoreIndicator from '../components/ScoreIndicator';
import { motion } from 'framer-motion';

const client = generateClient<Schema>();

export default function ReviewQueue() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [candidates, setCandidates] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeState, setSwipeState] = useState<'reject' | 'accept' | null>(null);
  
  // Drawer Editor states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editWhyItMatters, setEditWhyItMatters] = useState('');
  const [editReliability, setEditReliability] = useState(3);
  const [editSignificance, setEditSignificance] = useState(3);
  
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      // List draft KnowledgeItems
      const { data: items } = await client.models.KnowledgeItem.list({
        filter: { status: { eq: 'DRAFT' } }
      });
      setCandidates(items || []);
      setCurrentIndex(0);
    } catch (err) {
      console.error('Error fetching candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = (direction: 'reject' | 'accept') => {
    if (currentIndex >= candidates.length) return;
    
    setSwipeState(direction);
    
    // Let the CSS swipe animation complete before changing state
    setTimeout(async () => {
      const item = candidates[currentIndex];
      
      if (direction === 'reject') {
        // Mark as rejected in db
        try {
          await client.models.KnowledgeItem.delete({ id: item.id });
        } catch (e) {
          console.error(e);
        }
        setCurrentIndex(prev => prev + 1);
        setSwipeState(null);
      } else {
        // Open edit drawer to review and publish
        setSelectedItem(item);
        setEditTitle(item.title || '');
        setEditSummary(item.summary || '');
        setEditWhyItMatters(item.whyItMatters || '');
        setEditReliability(item.reliabilityScore || 3);
        setEditSignificance(item.significanceScore || 3);
        setIsEditorOpen(true);
      }
    }, 400);
  };

  const handlePublish = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      // Update KnowledgeItem to PUBLISHED
      await client.models.KnowledgeItem.update({
        id: selectedItem.id,
        title: editTitle,
        summary: editSummary,
        whyItMatters: editWhyItMatters,
        reliabilityScore: editReliability,
        significanceScore: editSignificance,
        status: 'PUBLISHED'
      });
      
      setIsEditorOpen(false);
      setSwipeState(null);
      setCurrentIndex(prev => prev + 1);
    } catch (err) {
      console.error('Error publishing item:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Prepopulates candidate drafts directly to DynamoDB for instant local triage evaluation
  const handleSeedMockData = async () => {
    setSeeding(true);
    try {
      // Create mock SourceItems
      const si1 = await client.models.SourceItem.create({
        url: 'https://egr.global/news/entain-betmgm-jv/',
        title: 'Entain Boosts BetMGM US Funding as Sports Betting Landscape Escalates',
        content: 'Entain PLC has announced a direct capital cash injection of $150 Million to its joint venture partner BetMGM...',
        status: 'ASSESSED'
      });

      const si2 = await client.models.SourceItem.create({
        url: 'https://sbcnews.co.uk/regulation/brazil-spa-authorized/',
        title: 'Brazil SPA Releases Certified Operators List for Federal Betting Launch',
        content: 'The Secretariat of Prizes and Betting (SPA) in Brazil has issued the official authorized list of 89 operators...',
        status: 'ASSESSED'
      });

      // Create draft KnowledgeItems linked to SourceItems
      if (si1.data) {
        await client.models.KnowledgeItem.create({
          sourceItemId: si1.data.id,
          title: 'Entain Injects $150M into BetMGM US Operations',
          summary: 'Entain has announced a $150 Million capital boost to support BetMGM US growth and market acquisition campaigns.',
          whyItMatters: 'This secures BetMGM capital position against FanDuel and DraftKings scaling surges.',
          reliabilityScore: 4,
          significanceScore: 4,
          topics: ['M&A', 'Funding', 'US Market'],
          status: 'DRAFT'
        });
      }

      if (si2.data) {
        await client.models.KnowledgeItem.create({
          sourceItemId: si2.data.id,
          title: 'Brazil Publishes Authorized Betting Operators List',
          summary: 'Brazil SPA issued its certified federal list of 89 gaming operators authorized to execute under .bet.br domains.',
          whyItMatters: 'This establishes the formal regulatory framework launch for the largest emerging market in South America.',
          reliabilityScore: 5,
          significanceScore: 5,
          topics: ['Regulation', 'Brazil', 'Launches'],
          status: 'DRAFT'
        });
      }

      await fetchCandidates();
    } catch (e) {
      console.error(e);
    } finally {
      setSeeding(false);
    }
  };

  const activeCandidate = candidates[currentIndex];
  const queueFinished = currentIndex >= candidates.length;

  return (
    <Box className="fade-in" sx={{ maxWidth: 800, mx: 'auto', py: 2 }}>
      {/* View Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>
            Review Queue
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Triage and authorize newly ingested candidate intelligence records
          </Typography>
        </Box>
        {queueFinished && (
          <Button
            variant="outlined"
            startIcon={seeding ? <CircularProgress size={16} /> : <SeedIcon />}
            onClick={handleSeedMockData}
            disabled={seeding}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Generate Test Candidates
          </Button>
        )}
      </Box>

      {/* Loading State */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : queueFinished ? (
        /* Empty Queue State */
        <Paper className="glass-panel" sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom color="primary">
            🎉 Queue Cleared!
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            There are no pending candidate articles. Use the Ingestion lambda to sweep news feeds or click the button above to seed mock developer cards.
          </Typography>
        </Paper>
      ) : (
        /* Active Triage Card */
        <Box sx={{ position: 'relative', pb: { xs: 12, sm: 0 } }}>
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={(_, { offset }) => {
              if (offset.x < -120) {
                handleSwipe('reject');
              } else if (offset.x > 120) {
                handleSwipe('accept');
              }
            }}
            whileTap={{ scale: 0.98 }}
            className={swipeState === 'reject' ? 'swipe-reject' : swipeState === 'accept' ? 'swipe-accept' : ''}
            style={{ touchAction: 'none' }}
          >
            <GlassCard sx={{ p: { xs: 3, sm: 4 }, cursor: 'grab' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  CANDIDATE DRAFT • {currentIndex + 1} OF {candidates.length}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <ScoreIndicator score={activeCandidate.reliabilityScore} type="reliability" />
                  <ScoreIndicator score={activeCandidate.significanceScore} type="significance" />
                </Stack>
              </Box>

              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                {activeCandidate.title}
              </Typography>

              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.6 }}>
                {activeCandidate.summary}
              </Typography>

              {activeCandidate.whyItMatters && (
                <Box sx={{ borderLeft: '3px solid #ffb74d', pl: 2, mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#ffb74d' }}>
                    Why It Matters:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {activeCandidate.whyItMatters}
                  </Typography>
                </Box>
              )}

              {activeCandidate.topics && activeCandidate.topics.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  {activeCandidate.topics.map((t: string) => (
                    <Chip key={t} label={t} size="small" variant="outlined" />
                  ))}
                </Stack>
              )}
            </GlassCard>
          </motion.div>

          {/* Triage Action Buttons */}
          <Stack 
            direction="row" 
            spacing={{ xs: 2, sm: 3 }} 
            sx={{ 
              mt: 4, 
              justifyContent: 'center',
              position: { xs: 'fixed', sm: 'relative' },
              bottom: { xs: 24, sm: 'auto' },
              left: { xs: 0, sm: 'auto' },
              right: { xs: 0, sm: 'auto' },
              px: { xs: 2, sm: 0 },
              zIndex: 10
            }}
          >
            <Button
              variant="contained"
              color="error"
              size="large"
              startIcon={<RejectIcon />}
              onClick={() => handleSwipe('reject')}
              disabled={swipeState !== null}
              sx={{
                borderRadius: 3,
                px: { xs: 2, sm: 4 },
                py: 1.5,
                boxShadow: '0 4px 14px 0 rgba(244, 67, 54, 0.25)',
                textTransform: 'none',
                fontWeight: 600,
                flex: { xs: 1, sm: 'none' }
              }}
            >
              Reject
            </Button>
            <Button
              variant="contained"
              color="success"
              size="large"
              startIcon={<ApproveIcon />}
              onClick={() => handleSwipe('accept')}
              disabled={swipeState !== null}
              sx={{
                borderRadius: 3,
                px: { xs: 2, sm: 4 },
                py: 1.5,
                boxShadow: '0 4px 14px 0 rgba(76, 175, 80, 0.25)',
                textTransform: 'none',
                fontWeight: 600,
                flex: { xs: 1, sm: 'none' }
              }}
            >
              Accept
            </Button>
          </Stack>
        </Box>
      )}

      {/* Adaptive Editor Drawer */}
      <Drawer
        anchor={isMobile ? 'bottom' : 'right'}
        open={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setSwipeState(null);
        }}
        slotProps={{
          paper: {
            sx: {
              width: isMobile ? '100vw' : 550,
              maxWidth: '100vw',
              height: isMobile ? '90vh' : '100%',
              maxHeight: isMobile ? '90vh' : '100vh',
              borderTopLeftRadius: isMobile ? 16 : 0,
              borderTopRightRadius: isMobile ? 16 : 0,
              background: '#151522',
              borderLeft: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
              borderTop: isMobile ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
              p: 0,
              overflow: 'hidden',
              boxSizing: 'border-box'
            }
          }
        }}
      >
        {selectedItem && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Drawer Header */}
            <Box sx={{ p: { xs: 2, sm: 3 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', flexShrink: 0 }}>
              <Typography variant="h6" sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>
                Edit & Publish
              </Typography>
              <IconButton onClick={() => {
                setIsEditorOpen(false);
                setSwipeState(null);
              }} sx={{ color: 'text.secondary' }}>
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Scrollable Form Body */}
            <Box sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', overflowX: 'hidden', flexGrow: 1, boxSizing: 'border-box', width: '100%' }}>
              <TextField
                label="Article Title"
                fullWidth
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                variant="outlined"
                size={isMobile ? 'small' : 'medium'}
              />

              <TextField
                label="Summary"
                fullWidth
                multiline
                rows={isMobile ? 3 : 4}
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                variant="outlined"
                size={isMobile ? 'small' : 'medium'}
              />

              <TextField
                label="Why It Matters"
                fullWidth
                multiline
                rows={isMobile ? 2 : 3}
                value={editWhyItMatters}
                onChange={(e) => setEditWhyItMatters(e.target.value)}
                variant="outlined"
                size={isMobile ? 'small' : 'medium'}
              />

              {/* Score Sliders */}
              <Box sx={{ px: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Factual Reliability: {editReliability} / 5
                </Typography>
                <Slider
                  value={editReliability}
                  min={1}
                  max={5}
                  step={1}
                  marks
                  onChange={(_, val) => setEditReliability(val as number)}
                  valueLabelDisplay="auto"
                />
              </Box>

              <Box sx={{ px: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Strategic Significance: {editSignificance} / 5
                </Typography>
                <Slider
                  value={editSignificance}
                  min={1}
                  max={5}
                  step={1}
                  marks
                  onChange={(_, val) => setEditSignificance(val as number)}
                  valueLabelDisplay="auto"
                  color="secondary"
                />
              </Box>

              {/* Entity Hints Alert */}
              {selectedItem.aiAssessmentMetadata && (
                <Alert severity="info" icon={<AiIcon />} sx={{ background: 'rgba(2, 136, 209, 0.08)', border: '1px solid rgba(2, 136, 209, 0.2)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                    AI SUGGESTED RELATIONSHIPS:
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Primary: {JSON.parse(selectedItem.aiAssessmentMetadata).suggestedPrimaryEntity || 'None'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Related: {(JSON.parse(selectedItem.aiAssessmentMetadata).suggestedRelatedEntities || []).join(', ') || 'None'}
                  </Typography>
                </Alert>
              )}
            </Box>

            {/* Sticky Action Footer */}
            <Box sx={{ p: { xs: 2, sm: 3 }, borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: '#151522', flexShrink: 0 }}>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => {
                    setIsEditorOpen(false);
                    setSwipeState(null);
                  }}
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  fullWidth
                  onClick={handlePublish}
                  disabled={actionLoading}
                  startIcon={actionLoading ? <CircularProgress size={16} /> : <ApproveIcon />}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  Publish & Save
                </Button>
              </Stack>
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
