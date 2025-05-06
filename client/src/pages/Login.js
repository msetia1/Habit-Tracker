import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Tab,
  Tabs,
  Alert,
  Avatar,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

const Login = () => {
  const navigate = useNavigate();
  const { login, register, error } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setFormErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear field-specific error when typing
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (tabValue === 0) { // Login
      if (!formData.email) errors.email = 'Email is required';
      if (!formData.password) errors.password = 'Password is required';
    } else { // Register
      if (!formData.username) errors.username = 'Username is required';
      if (!formData.email) errors.email = 'Email is required';
      if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email is invalid';
      if (!formData.password) errors.password = 'Password is required';
      if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      if (tabValue === 0) {
        // Login
        await login(formData.email, formData.password);
        navigate('/');
      } else {
        // Register
        await register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        });
        navigate('/');
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper
        elevation={3}
        sx={{
          marginTop: 8,
          padding: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar sx={{ bgcolor: 'primary.main', mb: 2 }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Welcome to Habit Tracker
        </Typography>
        
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ mt: 2, mb: 2 }}>
          <Tab label="Login" />
          <Tab label="Register" />
        </Tabs>
        
        {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
          {tabValue === 1 && (
            <TextField
              margin="normal"
              fullWidth
              label="Username"
              name="username"
              autoComplete="username"
              value={formData.username}
              onChange={handleInputChange}
              error={!!formErrors.username}
              helperText={formErrors.username}
            />
          )}
          
          <TextField
            margin="normal"
            fullWidth
            label="Email Address"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleInputChange}
            error={!!formErrors.email}
            helperText={formErrors.email}
          />
          
          <TextField
            margin="normal"
            fullWidth
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleInputChange}
            error={!!formErrors.password}
            helperText={formErrors.password}
          />
          
          {tabValue === 1 && (
            <TextField
              margin="normal"
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              error={!!formErrors.confirmPassword}
              helperText={formErrors.confirmPassword}
            />
          )}
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            {tabValue === 0 ? 'Sign In' : 'Sign Up'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login; 