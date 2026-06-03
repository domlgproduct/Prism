import { Box, Chip } from '@mui/material';

interface ScoreIndicatorProps {
  score: number;
  type: 'reliability' | 'significance';
}

export default function ScoreIndicator({ score, type }: ScoreIndicatorProps) {
  // Safe bounds
  const cleanScore = Math.max(1, Math.min(5, Math.round(score || 3)));
  
  // Reliability coloring & labeling (factual trustworthiness)
  const reliabilityColors = {
    1: { color: '#90a4ae', label: '1 - Speculative' },
    2: { color: '#78909c', label: '2 - Unverified' },
    3: { color: '#64b5f6', label: '3 - Credible' },
    4: { color: '#1e88e5', label: '4 - Trusted' },
    5: { color: '#0d47a1', label: '5 - Primary' }
  };

  // Significance coloring & labeling (market-shaping impact)
  const significanceColors = {
    1: { color: '#81c784', label: '1 - Low Noise' },
    2: { color: '#aed581', label: '2 - Minor' },
    3: { color: '#ffd54f', label: '3 - Relevant' },
    4: { color: '#ffb74d', label: '4 - Strategic' },
    5: { color: '#e57373', label: '5 - Market-Shaping' }
  };

  const config = type === 'reliability' 
    ? reliabilityColors[cleanScore as keyof typeof reliabilityColors]
    : significanceColors[cleanScore as keyof typeof significanceColors];

  return (
    <Box sx={{ display: 'inline-flex' }}>
      <Chip 
        label={config.label}
        size="small"
        sx={{
          fontWeight: 600,
          fontSize: '0.75rem',
          backgroundColor: `${config.color}22`, // 13% opacity background
          color: config.color,
          border: `1px solid ${config.color}55`,
          borderRadius: '6px',
          px: 0.5
        }}
      />
    </Box>
  );
}
