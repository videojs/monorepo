import React, { useState } from 'react';
import { Card, CardContent, Chip, Typography, IconButton, Box } from '@mui/material';
import { Edit, PlayArrow, Share } from '@mui/icons-material';
import PresetDialog from './PresetDialog'
import { Preset } from '../types/preset';
import { User } from 'firebase/auth';
import useBoundStore from '../stores/boundStore';

interface PresetCardProps {
  currentUser: User | null;
  preset: Preset;
  onClick: () => void;
}

const PresetCard: React.FC<PresetCardProps> = ({ currentUser, preset, onClick }) => {
  const [open, setOpen] = useState(false);
  const { updatePreset, deletePreset } = useBoundStore();

  const handleSave = (updatedPreset: Omit<Preset, 'id'>) => {
    updatePreset(preset.id, updatedPreset);
  };

  const handleDelete = () => {
    deletePreset(preset.id);
  };

  return (
    <>
      <Card sx={{ position: 'relative', padding: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" color={preset.isPublic ? 'green' : 'red'}>
              {preset.isPublic ? 'Public' : 'Private'}
            </Typography>
            <Box>
              {currentUser && (
                <IconButton onClick={() => setOpen(true)}>
                  <Edit />
                </IconButton>
              )}
              <IconButton onClick={() => onClick()}>
                <PlayArrow />
              </IconButton>
              <IconButton>
                <Share />
              </IconButton>
            </Box>
          </Box>
          <Typography variant="h6">{preset.name}</Typography>
          <Box sx={{ display: 'flex', gap: 1, marginTop: 1 }}>
            {preset.tags?.map((tag) => (
              <Chip key={tag.name + Math.random().toString()} label={tag.name} size="small" />
            ))}
          </Box>
        </CardContent>
      </Card>
      <PresetDialog
        open={open}
        onClose={() => setOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        existingPresetData={preset}
        mode="edit"
      />
    </>
  );
};

export default PresetCard;
