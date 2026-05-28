import { Authenticator } from '@aws-amplify/ui-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import { ThemeProvider, createTheme, CssBaseline, Box, Typography, Button, Paper } from '@mui/material';

const client = generateClient<Schema>();

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' },
    background: { default: '#121212', paper: '#1e1e1e' }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  }
});

function App() {
  const handleTestApi = async () => {
    try {
      const { data: newItem, errors } = await client.models.SourceItem.create({
        url: 'https://example.com/article',
        title: 'Initial Discovery Link',
        status: 'PENDING'
      });
      if (errors) {
        console.error('Errors creating SourceItem:', errors);
      } else {
        console.log('SourceItem created successfully:', newItem);
        alert(`Successfully created SourceItem: ${newItem.title}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Authenticator hideSignUp>
        {({ signOut, user }) => (
          <Box sx={{ minHeight: '100vh', p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Paper elevation={3} sx={{ p: 4, maxWidth: 800, width: '100%' }}>
              <Typography variant="h3" gutterBottom color="primary">
                PRISM Operations
              </Typography>
              <Typography variant="body1" sx={{ mb: 4 }} color="text.secondary">
                Authenticated as: {user?.signInDetails?.loginId}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="contained" onClick={handleTestApi}>
                  Test SAM Ingestion Mutation
                </Button>
                <Button variant="outlined" color="error" onClick={signOut}>
                  Sign Out
                </Button>
              </Box>
            </Paper>
          </Box>
        )}
      </Authenticator>
    </ThemeProvider>
  );
}

export default App;
