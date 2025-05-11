import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Button,
  Fab,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Chip,
  Tooltip,
  Link
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Category as CategoryIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { habitAPI, categoryAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import LogHabitDialog from '../components/LogHabitDialog';

const frequencyOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const initialFormState = {
  name: '',
  description: '',
  frequency: 'daily',
  targetCount: 1,
  startDate: new Date(),
  endDate: null,
  categoryId: '',
};

const HabitManager = () => {
  const [habits, setHabits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState(null);
  const navigate = useNavigate();
  
  // New state for log completion dialog
  const [logCompletionOpen, setLogCompletionOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState(null);

  useEffect(() => {
    fetchHabits();
    fetchCategories();
  }, [fetchHabits, fetchCategories]);

  const fetchHabits = async () => {
    try {
      setLoading(true);
      const response = await habitAPI.getHabits();
      setHabits(response.data);
    } catch (error) {
      console.error('Error fetching habits:', error);
      showAlert('Failed to load habits', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoryAPI.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (name, date) => {
    setFormData((prev) => ({ ...prev, [name]: date }));
  };

  const handleSubmit = async () => {
    try {
      // Prepare habit data for API
      const habitData = {
        ...formData,
        targetCount: parseInt(formData.targetCount, 10),
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate ? formData.endDate.toISOString() : null,
        ...(formData.categoryId ? { categoryId: formData.categoryId } : { categoryId: null })
      };

      if (editingHabitId) {
        // Update existing habit
        await habitAPI.updateHabit(editingHabitId, habitData);
        showAlert('Habit updated successfully');
      } else {
        // Create new habit
        await habitAPI.createHabit(habitData);
        showAlert('Habit created successfully');
      }

      // Reset form and refresh habits
      setFormData(initialFormState);
      setEditingHabitId(null);
      setOpenDialog(false);
      fetchHabits();
    } catch (error) {
      console.error('Error saving habit:', error);
      showAlert('Failed to save habit', 'error');
    }
  };

  const handleEdit = (habit) => {
    // Convert ISO date strings to Date objects
    const formattedHabit = {
      ...habit,
      startDate: new Date(habit.startDate),
      endDate: habit.endDate ? new Date(habit.endDate) : null,
    };
    
    setFormData(formattedHabit);
    setEditingHabitId(habit.id);
    setOpenDialog(true);
  };

  const confirmDelete = (habit) => {
    setHabitToDelete(habit);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!habitToDelete) return;
    
    try {
      await habitAPI.deleteHabit(habitToDelete.id);
      showAlert('Habit deleted successfully');
      fetchHabits();
    } catch (error) {
      console.error('Error deleting habit:', error);
      showAlert('Failed to delete habit', 'error');
    } finally {
      setDeleteConfirmOpen(false);
      setHabitToDelete(null);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData(initialFormState);
    setEditingHabitId(null);
  };

  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  };

  const handleCloseAlert = () => {
    setAlert((prev) => ({ ...prev, open: false }));
  };

  // Navigate to Category Manager
  const goToCategoryManager = () => {
    navigate('/categories');
  };
  
  // Handle opening the log completion dialog
  const handleOpenLogCompletion = (habit) => {
    setSelectedHabit(habit);
    setLogCompletionOpen(true);
  };
  
  // Handle closing the log completion dialog
  const handleCloseLogCompletion = () => {
    setLogCompletionOpen(false);
    setSelectedHabit(null);
  };
  
  // Handle successful completion logging
  const handleLogCompletionSuccess = () => {
    showAlert('Habit completion logged successfully!', 'success');
    fetchHabits(); // Refresh habits to update UI
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Habit Manager
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<CategoryIcon />}
            onClick={goToCategoryManager}
            sx={{ mr: 2 }}
          >
            Manage Categories
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setFormData(initialFormState);
              setEditingHabitId(null);
              setOpenDialog(true);
            }}
          >
            Add Habit
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : habits.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">
            No habits found. Create your first habit to get started!
          </Typography>
          <Fab
            color="primary"
            sx={{ mt: 2 }}
            onClick={() => {
              setFormData(initialFormState);
              setOpenDialog(true);
            }}
          >
            <AddIcon />
          </Fab>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Frequency</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {habits.map((habit) => (
                <TableRow key={habit.id}>
                  <TableCell>{habit.name}</TableCell>
                  <TableCell>{habit.description || '-'}</TableCell>
                  <TableCell>
                    {frequencyOptions.find((opt) => opt.value === habit.frequency)?.label}
                  </TableCell>
                  <TableCell>
                    {habit.category ? (
                      <Chip
                        label={habit.category.name}
                        size="small"
                        style={{
                          backgroundColor: habit.category.color || '#e0e0e0',
                          color: habit.category.color ? '#fff' : '#000',
                        }}
                      />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{format(new Date(habit.startDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <Tooltip title="Log Completion">
                      <IconButton color="success" onClick={() => handleOpenLogCompletion(habit)}>
                        <CheckCircleIcon />
                      </IconButton>
                    </Tooltip>
                    <IconButton color="primary" onClick={() => handleEdit(habit)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => confirmDelete(habit)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Habit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingHabitId ? 'Edit Habit' : 'Add New Habit'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Habit Name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                value={formData.description || ''}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleInputChange}
                  label="Frequency"
                >
                  {frequencyOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="targetCount"
                label="Target Count"
                type="number"
                value={formData.targetCount}
                onChange={handleInputChange}
                fullWidth
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Start Date"
                value={formData.startDate}
                onChange={(date) => handleDateChange('startDate', date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="End Date (Optional)"
                value={formData.endDate}
                onChange={(date) => handleDateChange('endDate', date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  name="categoryId"
                  value={formData.categoryId || ''}
                  onChange={handleInputChange}
                  label="Category"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            bgcolor: category.color || '#9e9e9e',
                            mr: 1
                          }}
                        />
                        {category.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {categories.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  No categories available. <Link component="button" onClick={goToCategoryManager}>Create some categories</Link> first.
                </Typography>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingHabitId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the habit "{habitToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Log Completion Dialog */}
      <LogHabitDialog
        open={logCompletionOpen}
        onClose={handleCloseLogCompletion}
        habit={selectedHabit}
        onSuccess={handleLogCompletionSuccess}
      />

      {/* Alert Snackbar */}
      <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
        <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default HabitManager; 