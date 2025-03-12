import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { User } from 'firebase/auth';

interface HeaderProps {
  currentUser: User | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLoginClick, onLogoutClick }) => {
  return (
    <AppBar position="static" sx={{ backgroundColor: '#1c1f26' }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Video.js Demo
        </Typography>
        {!currentUser ? (
          <Button onClick={onLoginClick} color="inherit">Login</Button>
        ) : (
          <Button onClick={onLogoutClick} color="inherit">Logout</Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;
