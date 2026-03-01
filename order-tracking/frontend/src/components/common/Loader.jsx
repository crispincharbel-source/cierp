// src/components/common/Loader.jsx
import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Loader component with optional text
 * @param {Object} props - Component props
 * @param {string} props.text - Text to display below loader
 * @param {string} props.color - Loader color
 * @param {number} props.size - Loader size
 * @param {Object} props.sx - Additional styles
 */
const Loader = ({ text, color = 'primary', size = 40, sx = {} }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        ...sx,
      }}
    >
      <CircularProgress color={color} size={size} />
      {text && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {text}
        </Typography>
      )}
    </Box>
  );
};

export default Loader;