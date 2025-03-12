import React, { useState, useEffect } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import TagsBar from '../components/TagsBar';
import PresetCard from '../components/PresetCard';
import AddPresetTile from '../components/AddPresetTile';
import LoginDialog from '../components/LoginDialog';
import VideoPlayer from '../components/VideoPlayer';
import { Preset } from '../types/preset';
import useBoundStore from '../stores/boundStore';
import { User } from 'firebase/auth';
import { subscribeToAuthState, signOutCurrentUser } from '../services/firebase';

const Dashboard: React.FC = () => {
  const { presets, filter, subscribeToPresets, subscribeToTags } = useBoundStore();
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Fetch Firestore data and set up real-time listeners for the presets and tags collections.
    // There will be no manual fetching needed after this. Any changes in Firestore will automatically
    // sync with the Zustand store.
    const unsubscribePresets = subscribeToPresets();
    const unsubscribeTags = subscribeToTags();

    // Subscribe to Firebase auth changes and set the current user accordingly
    const unsubscribeAuthState = subscribeToAuthState(setCurrentUser);

    return () => {
      unsubscribePresets();
      unsubscribeTags();
      unsubscribeAuthState();
    };
  }, []);

  const filteredPresets = presets.filter((preset) => {
    const matchesSearch = preset.name.toLowerCase().includes(filter.search.toLowerCase());

    const matchesTags =
      filter.selectedTags.length === 0 ||
      filter.selectedTags.every((selectedTag) =>
        preset.tags.some((presetTag) => presetTag.name === selectedTag.name)
      );

    return matchesSearch && matchesTags;
  });

  const handlePresetClick = (preset: Preset) => {
    setSelectedPreset(preset);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header currentUser={currentUser} onLoginClick={() => setLoginOpen(true)} onLogoutClick={signOutCurrentUser} />

      {/* Video Player */}
      <Box
        sx={{
          height: 500, // Placeholder height
          backgroundColor: '#000',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '2px solid #ccc',
        }}
      >
        {selectedPreset ? (
          <VideoPlayer url={selectedPreset.url} />
        ) : (
          <Typography variant="h6" color="gray">
            Select a preset to start playing
          </Typography>
        )}
      </Box>

      {/* Search and Filter Section */}
      <Box sx={{ padding: 2 }}>
        <SearchBar />
        <TagsBar />
      </Box>

      {/* Presets Grid */}
      <Box sx={{ flex: 1, overflowY: 'auto', padding: 2 }}>
        <Grid container spacing={2}>
          {filteredPresets.map((preset) => (
            <Grid item xs={12} sm={6} md={4} key={preset.id}>
              <PresetCard currentUser={currentUser} preset={preset} onClick={() => handlePresetClick(preset)} />
            </Grid>
          ))}
          {currentUser && (
            <Grid item xs={12} sm={6} md={4}>
              <AddPresetTile />
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Login Dialog */}
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </Box>
  );
};

export default Dashboard;
