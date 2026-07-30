import { useState } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import { ThemeProvider, createTheme, CssBaseline, Box, AppBar, Toolbar, IconButton, Typography, Drawer, useMediaQuery, useTheme } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import Sidebar from './components/Sidebar';
import ReviewQueue from './views/ReviewQueue';
import KnowledgeBase from './views/KnowledgeBase';
import EntityGraph from './views/EntityGraph';
import ContextDocs from './views/ContextDocs';
import SourcesAdmin from './views/SourcesAdmin';
import ExportManager from './views/ExportManager';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' },
    background: { default: '#0b0b0f', paper: 'rgba(30, 30, 42, 0.35)' }
  },
  typography: {
    fontFamily: "'Outfit', 'Inter', sans-serif",
  }
});

function App() {
  const [currentView, setCurrentView] = useState('triage');
  const [mobileOpen, setMobileOpen] = useState(false);
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const renderView = () => {
    switch (currentView) {
      case 'triage':
        return <ReviewQueue />;
      case 'browse':
        return <KnowledgeBase />;
      case 'graph':
        return <EntityGraph />;
      case 'context':
        return <ContextDocs />;
      case 'sources':
        return <SourcesAdmin />;
      case 'export':
        return <ExportManager />;
      default:
        return <ReviewQueue />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Authenticator hideSignUp>
        {({ signOut, user }) => (
          <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            {!isMobile && (
              <Sidebar
                currentView={currentView}
                onViewChange={setCurrentView}
                userEmail={user?.signInDetails?.loginId}
                onSignOut={signOut || (() => {})}
              />
            )}
            
            {isMobile && (
              <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                  display: { xs: 'block', md: 'none' },
                  '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 260 },
                }}
              >
                <Sidebar
                  currentView={currentView}
                  onViewChange={setCurrentView}
                  userEmail={user?.signInDetails?.loginId}
                  onSignOut={signOut || (() => {})}
                  onClose={handleDrawerToggle}
                />
              </Drawer>
            )}

            <Box sx={{ flexGrow: 1, pl: isMobile ? 0 : '260px', width: isMobile ? '100%' : 'calc(100% - 260px)' }}>
              {isMobile && (
                <AppBar position="sticky" elevation={0} sx={{ background: 'rgba(15, 15, 25, 0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <Toolbar>
                    <IconButton
                      color="inherit"
                      aria-label="open drawer"
                      edge="start"
                      onClick={handleDrawerToggle}
                      sx={{ mr: 2, color: '#a1a5b7' }}
                    >
                      <MenuIcon />
                    </IconButton>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      <Box component="img" src="/Icon-blue.png" alt="Prism Icon" sx={{ width: 28, height: 28, objectFit: 'contain' }} />
                      <Typography variant="h6" sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, background: 'linear-gradient(45deg, #90caf9 30%, #f48fb1 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '1px' }}>
                        RISM
                      </Typography>
                    </Box>
                  </Toolbar>
                </AppBar>
              )}
              <Box sx={{ p: { xs: 2, sm: 4 } }}>
                {renderView()}
              </Box>
            </Box>
          </Box>
        )}
      </Authenticator>
    </ThemeProvider>
  );
}

export default App;
