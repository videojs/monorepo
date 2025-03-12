import React, { useState } from 'react';
import { TextField, Box } from '@mui/material';
import useBoundStore from '../stores/boundStore';

const SearchBar: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const setFilter = useBoundStore((state) => state.setFilter);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setSearchTerm(value);
    setFilter({ search: value });
  };

  return (
    <Box sx={{ padding: 2 }}>
      <TextField
        fullWidth
        placeholder="Search presets..."
        value={searchTerm}
        onChange={handleSearch}
        variant="outlined"
      />
    </Box>
  );
};

export default SearchBar;
