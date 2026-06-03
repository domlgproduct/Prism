import { Card, CardProps } from '@mui/material';

interface GlassCardProps extends CardProps {
  hoverEffect?: boolean;
}

export default function GlassCard({ children, hoverEffect = false, sx, ...props }: GlassCardProps) {
  return (
    <Card 
      className={`glass-panel ${hoverEffect ? 'glass-panel-hover' : ''}`}
      sx={{
        borderRadius: 3,
        overflow: 'visible',
        ...sx
      }}
      {...props}
    >
      {children}
    </Card>
  );
}
