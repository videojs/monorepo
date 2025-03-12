import React, { useState } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { Add } from '@mui/icons-material';
import PresetDialog from './PresetDialog';
import useBoundStore from '../stores/boundStore';
import { Preset } from '../types/preset';

const AddPresetTile: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { addPreset } = useBoundStore();

  const handleSave = (newPreset: Omit<Preset, 'id'>) => {
    addPreset(newPreset);
  };

  return (
    <>
      <Card
        onClick={() => setOpen(true)}
        sx={{
          border: '2px dashed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 200,
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <CardContent>
          <Box sx={{ textAlign: 'center' }}>
            <Add sx={{ fontSize: 48 }} />
            <Typography variant="h6">Add New Preset</Typography>
          </Box>
        </CardContent>
      </Card>
      <PresetDialog
        open={open}
        onClose={() => setOpen(false)}
        onSave={handleSave}
        onDelete={() => {}}
        mode="create"
      />
    </>
  );
};

export default AddPresetTile;
