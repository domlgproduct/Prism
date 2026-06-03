import { Box, List, ListItemButton, ListItemIcon, ListItemText, Typography, Button, Divider } from '@mui/material';
import { 
  RateReview as TriageIcon, 
  Article as BrowseIcon, 
  Hub as GraphIcon, 
  RssFeed as SourcesIcon, 
  CloudDownload as ExportIcon, 
  Logout as LogoutIcon,
  Description as ContextIcon
} from '@mui/icons-material';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  userEmail?: string;
  onSignOut: () => void;
}

export default function Sidebar({ currentView, onViewChange, userEmail, onSignOut }: SidebarProps) {
  const menuItems = [
    { id: 'triage', label: 'Triage Queue', icon: <TriageIcon /> },
    { id: 'browse', label: 'Knowledge Base', icon: <BrowseIcon /> },
    { id: 'graph', label: 'Entity Graph', icon: <GraphIcon /> },
    { id: 'context', label: 'Context Docs', icon: <ContextIcon /> },
    { id: 'sources', label: 'Monitored Feeds', icon: <SourcesIcon /> },
    { id: 'export', label: 'Export System', icon: <ExportIcon /> },
  ];

  return (
    <Box sx={{
      width: 260,
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      background: 'rgba(15, 15, 25, 0.6)',
      backdropFilter: 'blur(10px)',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 1000
    }}>
      {/* Header Logo */}
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h4" sx={{ 
          fontFamily: "'Outfit', sans-serif", 
          fontWeight: 700, 
          background: 'linear-gradient(45deg, #90caf9 30%, #f48fb1 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '1px'
        }}>
          PRISM
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '2px', mt: 0.5 }}>
          INTELLIGENCE HUB
        </Typography>
      </Box>
      
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', mx: 2 }} />

      {/* Nav Menu Links */}
      <Box sx={{ flexGrow: 1, px: 2, py: 3 }}>
        <List sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {menuItems.map((item) => {
            const active = currentView === item.id;
            return (
              <ListItemButton
                key={item.id}
                onClick={() => onViewChange(item.id)}
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  px: 2,
                  background: active ? 'rgba(144, 202, 249, 0.08)' : 'transparent',
                  borderLeft: active ? '3px solid #90caf9' : '3px solid transparent',
                  color: active ? '#90caf9' : '#a1a5b7',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.03)',
                    color: '#f1f3f9'
                  }
                }}
              >
                <ListItemIcon sx={{ 
                  color: active ? '#90caf9' : '#a1a5b7', 
                  minWidth: 40,
                  transition: 'color 0.2s'
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: active ? 600 : 500 }}>
                    {item.label}
                  </Typography>
                </ListItemText>
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      {/* User Session Info footer */}
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            OPERATOR SESSION
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#f1f3f9', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {userEmail || 'Analyst'}
          </Typography>
        </Box>
        <Button 
          variant="outlined" 
          color="error" 
          startIcon={<LogoutIcon />}
          onClick={onSignOut}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            borderColor: 'rgba(244, 67, 54, 0.3)',
            '&:hover': {
              borderColor: 'red',
              background: 'rgba(244, 67, 54, 0.05)'
            }
          }}
        >
          Sign Out
        </Button>
      </Box>
    </Box>
  );
}
