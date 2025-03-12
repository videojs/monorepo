import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Chip,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import useBoundStore from '../stores/boundStore';
import { Preset } from '../types/preset';
import { Tag } from '../types/tag';

interface PresetDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (preset: Omit<Preset, 'id'>) => void;
  onDelete: () => void;
  existingPresetData?: Omit<Preset, 'id'>;
  mode: 'create' | 'edit';
}

const PresetDialog: React.FC<PresetDialogProps> = ({ open, onClose, onSave, onDelete, existingPresetData, mode }) => {
  const [name, setName] = useState(existingPresetData?.name || '');
  const [url, setUrl] = useState(existingPresetData?.url || '');
  const [selectedTags, setSelectedTags] = useState<Tag[]>(existingPresetData?.tags || []);
  const [isPublic, setIsPublic] = useState<boolean>(existingPresetData?.isPublic || false);
  const { tags } = useBoundStore();
  const selectedTagNames = selectedTags.map(tag => tag.name);

  useEffect(() => {
    if (existingPresetData) {
      setName(existingPresetData.name);
      setUrl(existingPresetData.url);
      setSelectedTags(existingPresetData.tags);
      setIsPublic(existingPresetData.isPublic);
    }
  }, [existingPresetData]);

  const handleSave = () => {
    if (!name) {
      return alert('Preset name is required!');
    }

    onSave({ name, url, isPublic, tags: selectedTags });
    onClose();

    // reset state to defaults
    setName('');
    setSelectedTags([]);
    setIsPublic(false);
  };

  const handleTagClick = (tag: Tag) => {
    setSelectedTags((prevTags) => {
      const isSelected = prevTags.some((t) => t.name === tag.name);

      if (isSelected) {
        return prevTags.filter((t) => t.name !== tag.name);
      } else {
        return [...prevTags, tag];
      }
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>{mode === 'create' ? 'Create Preset' : 'Edit Preset'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Preset Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            sx={{ mt: 1 }}
          />
          <TextField
            label="Source URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            fullWidth
            required
          />
          <FormControlLabel
            label="Public"
            control={
              <Checkbox
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
            }
          />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {tags.map((tag) => (
              <Chip
                key={tag.name + Math.random().toString()}
                label={tag.name}
                color={selectedTagNames.includes(tag.name) ? 'primary' : 'default'}
                onClick={() => handleTagClick(tag)}
                clickable
              />
            ))}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          {mode === 'edit' ? (
            <Button onClick={onDelete} variant="contained" color="secondary">
              Delete
            </Button>
          ) : (
              <Box sx={{ minWidth: 'auto', visibility: 'hidden' }} />
          )}
          <Box>
            <Button onClick={onClose} color="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave} variant="contained" color="primary">
              Save
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default PresetDialog;
