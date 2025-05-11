import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { habitAPI } from '../services/api';

/**
 * Dialog component for logging habit completions
 */
const LogHabitDialog = ({ open, onClose, habit, onSuccess }) => {
  const [formData, setFormData] = useState({
    date: new Date(),
    count: 1
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDateChange = (date) => {
    setFormData((prev) => ({ ...prev, date }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      // Format the data for API
      const logData = {
        date: formData.date.toISOString(),
        count: Number(formData.count)
      };

      // Call API to log completion
      await habitAPI.logCompletion(habit.id, logData);
      
      // Success callback
      if (onSuccess) {
        onSuccess();
      }
      
      // Close dialog
      onClose();
    } catch (error) {
      console.error('Error logging habit completion:', error);
      setError(error.response?.data?.error || 'Failed to log habit completion');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date(),
      count: 1
    });
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>
        Log Completion: {habit?.name}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <DatePicker
            label="Completion Date"
            value={formData.date}
            onChange={handleDateChange}
            slotProps={{ textField: { fullWidth: true } }}
            maxDate={new Date()}
          />
          
          <TextField
            name="count"
            label="Completion Count"
            type="number"
            value={formData.count}
            onChange={handleInputChange}
            fullWidth
            inputProps={{ min: 1 }}
            helperText={`Target: ${habit?.targetCount || 1} per ${habit?.frequency}`}
          />
          
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Log Completion'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LogHabitDialog; 