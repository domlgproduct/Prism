import { useState, useEffect, useRef } from 'react';
import { 
  Box, Typography, Button, Paper, Stack, CircularProgress, Chip, CardContent, Divider,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, OutlinedInput, IconButton
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon, 
  Description as DocIcon, 
  Close as CloseIcon, 
  Edit as EditIcon,
  Tag as TagIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatListBulleted as ListIcon
} from '@mui/icons-material';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import GlassCard from '../components/GlassCard';

const client = generateClient<Schema>();

export default function ContextDocs() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Dialog & Viewer States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<any>(null);
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Form Field States
  const [docId, setDocId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTopics, setFormTopics] = useState('');
  const [formEntityIds, setFormEntityIds] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      try {
        const docsRes = await client.models.ContextDocument.list();
        setDocuments(docsRes.data || []);
      } catch (e) {
        console.error('Error listing ContextDocuments:', e);
      }

      try {
        const entRes = await client.models.Entity.list();
        console.log('ContextDocs fetched entities:', entRes.data);
        setEntities(entRes.data || []);
      } catch (e) {
        console.error('Error listing Entities:', e);
      }
    } catch (err) {
      console.error('General error fetching context details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = async () => {
    setDocId(null);
    setFormTitle('');
    setFormDescription('');
    setFormContent('');
    setFormTopics('');
    setFormEntityIds([]);
    setEditorTab('write');
    setIsFormOpen(true);
    
    // Refresh entities on dialog open
    try {
      const entRes = await client.models.Entity.list();
      setEntities(entRes.data || []);
    } catch (e) {
      console.error('Error reloading entities on create:', e);
    }
  };

  const handleOpenEdit = async (doc: any) => {
    setDocId(doc.id);
    setFormTitle(doc.title || '');
    setFormDescription(doc.description || '');
    setFormContent(doc.content || '');
    setFormTopics(doc.topics ? doc.topics.join(', ') : '');
    setFormEntityIds(doc.entityIds || []);
    setEditorTab('write');
    setIsFormOpen(true);
    setIsViewerOpen(false); // Close viewer if editing

    // Refresh entities on dialog open
    try {
      const entRes = await client.models.Entity.list();
      setEntities(entRes.data || []);
    } catch (e) {
      console.error('Error reloading entities on edit:', e);
    }
  };

  const handleOpenViewer = (doc: any) => {
    setActiveDoc(doc);
    setIsViewerOpen(true);
  };

  const handleSaveDocument = async () => {
    if (!formTitle) return;
    setActionLoading(true);
    try {
      const topicsArr = formTopics
        ? formTopics.split(',').map(t => t.trim()).filter(t => t !== '')
        : [];
      
      if (docId) {
        // Update existing document with explicit type safe parameters
        await client.models.ContextDocument.update({
          id: docId,
          title: formTitle,
          description: formDescription,
          content: formContent,
          topics: topicsArr,
          entityIds: formEntityIds,
        });
      } else {
        // Create new document with explicit type safe parameters
        await client.models.ContextDocument.create({
          title: formTitle,
          description: formDescription,
          content: formContent,
          topics: topicsArr,
          entityIds: formEntityIds,
        });
      }

      setIsFormOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error saving context document:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToolbarClick = (syntaxType: 'bold' | 'italic' | 'h1' | 'h2' | 'list') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    let replacement = '';
    switch (syntaxType) {
      case 'bold':
        replacement = `**${selected || 'bold text'}**`;
        break;
      case 'italic':
        replacement = `*${selected || 'italic text'}*`;
        break;
      case 'h1':
        replacement = `\n# ${selected || 'Header 1'}\n`;
        break;
      case 'h2':
        replacement = `\n## ${selected || 'Header 2'}\n`;
        break;
      case 'list':
        replacement = `\n* ${selected || 'list item'}`;
        break;
    }

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setFormContent(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 0);
  };

  const handleDownloadTemplate = () => {
    const templateText = `---
title: [Title of the briefing note]
description: [Short summary of the briefing]
topics: [comma, separated, topics]
---

# [Title of the briefing note]

## Overview
[Write a brief summary of the briefing note here...]

## Key Points
* [Point 1]
* [Point 2]

## Detailed Analysis
[Write your long-form markdown content here...]
`;
    const blob = new Blob([templateText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'prism_context_document_template.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUploadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      let titleVal = '';
      let descVal = '';
      let topicsVal = '';
      let contentVal = text;

      if (text.startsWith('---')) {
        const endIndex = text.indexOf('---', 3);
        if (endIndex !== -1) {
          const frontmatter = text.substring(3, endIndex);
          contentVal = text.substring(endIndex + 3).trim();

          const lines = frontmatter.split('\n');
          lines.forEach(line => {
            const parts = line.split(':');
            if (parts.length >= 2) {
              const key = parts[0].trim().toLowerCase();
              const value = parts.slice(1).join(':').trim();
              if (key === 'title') {
                titleVal = value;
              } else if (key === 'description') {
                descVal = value;
              } else if (key === 'topics') {
                topicsVal = value;
              }
            }
          });
        }
      }

      if (titleVal) setFormTitle(titleVal);
      if (descVal) setFormDescription(descVal);
      if (topicsVal) setFormTopics(topicsVal);
      setFormContent(contentVal);
    };
    reader.readAsText(file);
  };

  // Helper map to resolve Entity IDs to Names
  const entityMap = entities.reduce((acc, ent) => {
    acc[ent.id] = ent.name;
    return acc;
  }, {} as Record<string, string>);

  // Filtering Logic
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = searchQuery === '' || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.topics && doc.topics.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesSearch;
  });

  return (
    <Box className="fade-in" sx={{ py: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>
            Context Documents
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage long-form briefing notes, reference guides, and regulatory briefs
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
        >
          Create Document
        </Button>
      </Box>

      {/* Search Input Bar */}
      <GlassCard sx={{ p: 3, mb: 4 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by title, summary description, or topic tag..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
            }
          }}
        />
      </GlassCard>

      {/* Docs Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredDocs.length === 0 ? (
        <Paper className="glass-panel" sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="body1" color="text.secondary">
            No context documents found. Click 'Create Document' to add your first analyst briefing note.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredDocs.map(doc => (
            <Grid item xs={12} md={6} key={doc.id}>
              <GlassCard hoverEffect sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <DocIcon sx={{ color: 'primary.main' }} />
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {doc.title}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, lineHeight: 1.6 }}>
                    {doc.description || 'No description provided.'}
                  </Typography>

                  {/* Badges and tags */}
                  {doc.topics && doc.topics.length > 0 && (
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {doc.topics.map((t: string) => (
                        <Chip key={t} label={t} size="small" variant="outlined" icon={<TagIcon style={{ fontSize: 12 }} />} />
                      ))}
                    </Stack>
                  )}

                  {/* Associated Entities */}
                  {doc.entityIds && doc.entityIds.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        LINKED ENTITIES:
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {doc.entityIds.map((id: string) => (
                          <Chip 
                            key={id} 
                            label={entityMap[id] || 'Unknown Entity'} 
                            size="small" 
                            sx={{ background: 'rgba(255,255,255,0.04)', fontSize: '0.7rem' }} 
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </CardContent>

                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.06)' }} />
                
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    onClick={() => handleOpenEdit(doc)}
                    startIcon={<EditIcon />}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    Edit
                  </Button>
                  <Button 
                    size="small" 
                    variant="contained" 
                    onClick={() => handleOpenViewer(doc)}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    Read Briefing
                  </Button>
                </Box>
              </GlassCard>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Editor Modal Dialog */}
      <Dialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        slotProps={{
          paper: {
            sx: {
              background: '#151522',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              p: 2,
              minWidth: { xs: '100%', sm: 600 }
            }
          }
        }}
      >
        <DialogTitle sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>
          {docId ? 'Edit Briefing Note' : 'Create Briefing Note'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          {/* File Actions */}
          <Box sx={{ 
            p: 2, 
            background: 'rgba(255, 255, 255, 0.02)', 
            border: '1px solid rgba(255, 255, 255, 0.05)', 
            borderRadius: 2, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Markdown File Actions
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Upload a document or download a scaffolded template
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleDownloadTemplate}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                Download Template
              </Button>
              <Button
                variant="contained"
                size="small"
                component="label"
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                Upload File (.md)
                <input
                  type="file"
                  accept=".md"
                  hidden
                  onChange={handleUploadFile}
                />
              </Button>
            </Stack>
          </Box>
          <TextField
            label="Document Title"
            fullWidth
            required
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            variant="outlined"
            placeholder="e.g. Regulatory Changes in Brazilian iGaming"
          />

          <TextField
            label="Brief Description / Summary"
            fullWidth
            multiline
            rows={2}
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            variant="outlined"
            placeholder="Provide a high-level briefing summary for index browsing..."
          />

          {/* Edit / Preview Tabs */}
          <Stack direction="row" spacing={1} sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)', pb: 1 }}>
            <Button
              size="small"
              variant={editorTab === 'write' ? 'contained' : 'text'}
              onClick={() => setEditorTab('write')}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Write
            </Button>
            <Button
              size="small"
              variant={editorTab === 'preview' ? 'contained' : 'text'}
              onClick={() => setEditorTab('preview')}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Preview Layout
            </Button>
          </Stack>

          {editorTab === 'write' ? (
            <Box>
              {/* Markdown Toolbar */}
              <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, background: 'rgba(255,255,255,0.03)', p: 0.5, borderRadius: 1.5, alignItems: 'center' }}>
                <IconButton size="small" onClick={() => handleToolbarClick('bold')} title="Bold">
                  <BoldIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => handleToolbarClick('italic')} title="Italic">
                  <ItalicIcon fontSize="small" />
                </IconButton>
                <Button size="small" onClick={() => handleToolbarClick('h1')} sx={{ minWidth: 32, p: 0.5, color: '#a1a5b7', fontWeight: 700 }} title="Heading 1">
                  H1
                </Button>
                <Button size="small" onClick={() => handleToolbarClick('h2')} sx={{ minWidth: 32, p: 0.5, color: '#a1a5b7', fontWeight: 700 }} title="Heading 2">
                  H2
                </Button>
                <IconButton size="small" onClick={() => handleToolbarClick('list')} title="Bullet List">
                  <ListIcon fontSize="small" />
                </IconButton>
              </Stack>

              <TextField
                label="Markdown Content"
                fullWidth
                multiline
                rows={10}
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                variant="outlined"
                placeholder="# Header 1\nType your briefing details here in Markdown formatting..."
                inputRef={textareaRef}
                slotProps={{
                  htmlInput: {
                    style: { fontFamily: 'monospace', fontSize: '0.85rem' }
                  }
                }}
              />
            </Box>
          ) : (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                LIVE PREVIEW:
              </Typography>
              <Box 
                dangerouslySetInnerHTML={{ __html: renderMarkdown(formContent) }} 
                sx={{
                  p: 3,
                  background: 'rgba(30, 30, 42, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: 2,
                  minHeight: 250,
                  maxHeight: 300,
                  overflowY: 'auto',
                  color: '#e1e3eb',
                  lineHeight: 1.7,
                  '& h1': { fontSize: '1.4rem', fontWeight: 700, mt: 1.5, mb: 1, color: '#90caf9' },
                  '& h2': { fontSize: '1.2rem', fontWeight: 700, mt: 1.5, mb: 1, color: '#f48fb1' },
                  '& h3': { fontSize: '1.05rem', fontWeight: 700, mt: 1, mb: 1 },
                  '& ul': { pl: 3, mb: 1.5 },
                  '& li': { mb: 0.5 },
                  '& strong': { color: '#fff', fontWeight: 600 },
                  '& pre': { background: '#151522', p: 1.5, borderRadius: 1, overflowX: 'auto', mt: 0.5, mb: 1.5 },
                  '& code': { fontFamily: 'monospace', fontSize: '0.8rem' }
                }}
              />
            </Box>
          )}

          <TextField
            label="Topics (Comma Separated)"
            fullWidth
            value={formTopics}
            onChange={(e) => setFormTopics(e.target.value)}
            variant="outlined"
            placeholder="e.g. Regulation, Brazil, Sportsbook"
          />

          <FormControl fullWidth>
            <InputLabel>Link Entities ({entities.length} available)</InputLabel>
            <Select
              multiple
              value={formEntityIds}
              onChange={(e) => setFormEntityIds(e.target.value as string[])}
              input={<OutlinedInput label={`Link Entities (${entities.length} available)`} />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={entityMap[value] || 'Unknown'} size="small" />
                  ))}
                </Box>
              )}
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: {
                      bgcolor: '#1e1e2f',
                      backgroundImage: 'none',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }
                  }
                }
              }}
            >
              {entities.map((ent) => (
                <MenuItem key={ent.id} value={ent.id}>
                  {ent.name} ({ent.type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsFormOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveDocument}
            disabled={actionLoading || !formTitle}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Save Document
          </Button>
        </DialogActions>
      </Dialog>

      {/* Viewer Drawer / Full screen Modal */}
      <Dialog
        fullWidth
        maxWidth="md"
        open={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              background: '#0f0f18',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              p: 3,
              minHeight: '60vh'
            }
          }
        }}
      >
        {activeDoc && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h5" sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>
                  {activeDoc.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  CREATED BY ANALYST • {new Date(activeDoc.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => handleOpenEdit(activeDoc)}
                  startIcon={<EditIcon />}
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  Edit
                </Button>
                <Button onClick={() => setIsViewerOpen(false)} sx={{ color: 'text.secondary', minWidth: 'auto', p: 1 }}>
                  <CloseIcon />
                </Button>
              </Stack>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

            <Box sx={{ flexGrow: 1, maxHeight: '60vh', overflowY: 'auto', pr: 1 }}>
              {/* Formatted markdown viewer */}
              <Box 
                dangerouslySetInnerHTML={{ __html: renderMarkdown(activeDoc.content) }} 
                sx={{ 
                  p: 3, 
                  background: 'rgba(30, 30, 42, 0.25)', 
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: 2,
                  color: '#e1e3eb',
                  lineHeight: 1.7,
                  '& h1': { fontSize: '1.4rem', fontWeight: 700, mt: 1.5, mb: 1, color: '#90caf9' },
                  '& h2': { fontSize: '1.2rem', fontWeight: 700, mt: 1.5, mb: 1, color: '#f48fb1' },
                  '& h3': { fontSize: '1.05rem', fontWeight: 700, mt: 1, mb: 1 },
                  '& ul': { pl: 3, mb: 1.5 },
                  '& li': { mb: 0.5 },
                  '& strong': { color: '#fff', fontWeight: 600 },
                  '& pre': { background: '#151522', p: 1.5, borderRadius: 1, overflowX: 'auto', mt: 0.5, mb: 1.5 },
                  '& code': { fontFamily: 'monospace', fontSize: '0.8rem' }
                }}
              />
            </Box>
          </Box>
        )}
      </Dialog>
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

// Simple HTML/CSS-safe markdown parser mapping helper
function renderMarkdown(md: string) {
  if (!md) return '';
  
  // Safe HTML character escaping
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  // Markdown structures mapping
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/^\s*[\*\-]\s+(.*?)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  html = html.replace(/\n\n(?!<h|<ul|<li)(.*?)\n\n/gs, '<p>$1</p>');
  
  return html;
}
