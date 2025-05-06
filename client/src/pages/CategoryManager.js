import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Paper,
  IconButton,
  Divider,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { categoryAPI } from '../services/api';

// Predefined color options
const colorOptions = [
  { name: 'Red', value: '#f44336' },
  { name: 'Pink', value: '#e91e63' },
  { name: 'Purple', value: '#9c27b0' },
  { name: 'Deep Purple', value: '#673ab7' },
  { name: 'Indigo', value: '#3f51b5' },
  { name: 'Blue', value: '#2196f3' },
  { name: 'Light Blue', value: '#03a9f4' },
  { name: 'Cyan', value: '#00bcd4' },
  { name: 'Teal', value: '#009688' },
  { name: 'Green', value: '#4caf50' },
  { name: 'Light Green', value: '#8bc34a' },
  { name: 'Lime', value: '#cddc39' },
  { name: 'Yellow', value: '#ffeb3b' },
  { name: 'Amber', value: '#ffc107' },
  { name: 'Orange', value: '#ff9800' },
  { name: 'Deep Orange', value: '#ff5722' },
  { name: 'Brown', value: '#795548' },
  { name: 'Grey', value: '#9e9e9e' },
];

// Initial form state
const initialFormState = {
  name: '',
  color: colorOptions[0].value
};

const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryAPI.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      showAlert('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  };

  const handleCloseAlert = () => {
    setAlert((prev) => ({ ...prev, open: false }));
  };

  const handleOpenDialog = (category = null) => {
    if (category) {
      setFormData({
        name: category.name,
        color: category.color || colorOptions[0].value
      });
      setEditingCategoryId(category.id);
    } else {
      setFormData(initialFormState);
      setEditingCategoryId(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData(initialFormState);
    setEditingCategoryId(null);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name.trim()) {
        showAlert('Category name is required', 'error');
        return;
      }

      if (editingCategoryId) {
        await categoryAPI.updateCategory(editingCategoryId, formData);
        showAlert('Category updated successfully');
      } else {
        await categoryAPI.createCategory(formData);
        showAlert('Category created successfully');
      }

      handleCloseDialog();
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      showAlert('Failed to save category', 'error');
    }
  };

  const handleOpenDeleteConfirm = (category) => {
    setCategoryToDelete(category);
    setDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setCategoryToDelete(null);
  };

  const handleDeleteCategory = async () => {
    try {
      if (!categoryToDelete) return;
      
      await categoryAPI.deleteCategory(categoryToDelete.id);
      showAlert('Category deleted successfully');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      showAlert('Failed to delete category', 'error');
    } finally {
      handleCloseDeleteConfirm();
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Category Manager
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          New Category
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : categories.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            You haven't created any categories yet.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Create Your First Category
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {categories.map((category) => (
            <Grid item xs={12} sm={6} md={4} key={category.id}>
              <Paper
                sx={{
                  p: 2,
                  borderTop: 3,
                  borderColor: category.color || '#9e9e9e',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                    {category.name}
                  </Typography>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(category)}
                      aria-label="edit"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDeleteConfirm(category)}
                      aria-label="delete"
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 'auto' }}>
                  <Chip
                    label={`${category.habitCount || 0} habit${category.habitCount !== 1 ? 's' : ''}`}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: category.color || '#9e9e9e',
                      mt: 1
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategoryId ? 'Edit Category' : 'Create New Category'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              name="name"
              label="Category Name"
              fullWidth
              required
              value={formData.name}
              onChange={handleInputChange}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel id="color-label">Color</InputLabel>
              <Select
                labelId="color-label"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                label="Color"
              >
                {colorOptions.map((color) => (
                  <MenuItem key={color.value} value={color.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: color.value,
                          mr: 1
                        }}
                      />
                      {color.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            startIcon={<CheckIcon />}
          >
            {editingCategoryId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
      >
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the category "{categoryToDelete?.name}"?
            {categoryToDelete?.habitCount > 0 && (
              <Box sx={{ mt: 1, color: 'error.main' }}>
                This category has {categoryToDelete.habitCount} habit{categoryToDelete.habitCount !== 1 ? 's' : ''} assigned to it.
                Deleting it will remove the category from these habits.
              </Box>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteCategory}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alert Snackbar */}
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseAlert}
          severity={alert.severity}
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CategoryManager; 