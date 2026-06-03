import { useState } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
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
            <Sidebar
              currentView={currentView}
              onViewChange={setCurrentView}
              userEmail={user?.signInDetails?.loginId}
              onSignOut={signOut || (() => {})}
            />
            <Box sx={{ flexGrow: 1, pl: '260px', width: 'calc(100% - 260px)' }}>
              <Box sx={{ p: 4 }}>
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
