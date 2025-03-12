import React from 'react';
import { Box, Chip } from '@mui/material';
import useBoundStore from '../stores/boundStore';
import { Tag } from '../types/tag';

const TagsBar: React.FC = () => {
  const { tags, filter, setFilter } = useBoundStore();

  const handleTagClick = (tag: Tag) => {
    setFilter({
      selectedTags: filter.selectedTags.includes(tag)
        ? filter.selectedTags.filter((t) => t.name !== tag.name)
        : [...filter.selectedTags, tag],
    });
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, padding: 2 }}>
      {tags.map((tag) => (
        <Chip
          key={tag.name + Math.random().toString()}
          label={tag.name}
          color={filter.selectedTags.includes(tag) ? 'primary' : 'default'}
          onClick={() => handleTagClick(tag)}
        />
      ))}
    </Box>
  );
};

export default TagsBar;
