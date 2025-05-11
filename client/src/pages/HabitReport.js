import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Chip,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { subDays } from 'date-fns';
import {
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
} from '@mui/icons-material';
import { statsAPI, categoryAPI } from '../services/api';

const HabitReport = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    startDate: subDays(new Date(), 30), // Default to last 30 days
    endDate: new Date(),
    categoryId: '',
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoryAPI.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to load categories. Please try again later.');
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { startDate, endDate, categoryId } = filters;
      
      // Format dates as ISO strings
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      
      const response = await statsAPI.getHabitReport(
        formattedStartDate,
        formattedEndDate,
        categoryId || null
      );
      
      setReportData(response.data);
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Failed to generate report. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const getCompletionRateColor = (rate) => {
    if (rate >= 0.8) return '#4caf50'; // Good - green
    if (rate >= 0.5) return '#ff9800'; // Moderate - orange
    return '#f44336'; // Poor - red
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return <TrendingUpIcon color="success" />;
    if (trend < 0) return <TrendingDownIcon color="error" />;
    return <TrendingFlatIcon color="action" />;
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Habit Report
      </Typography>

      {/* Report Filters */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Report Filters
        </Typography>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={4}>
            <DatePicker
              label="Start Date"
              value={filters.startDate}
              onChange={(date) => handleFilterChange('startDate', date)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <DatePicker
              label="End Date"
              value={filters.endDate}
              onChange={(date) => handleFilterChange('endDate', date)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={filters.categoryId}
                onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                label="Category"
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={generateReport}
              disabled={loading}
            >
              Generate Report
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading indicator */}
      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Report results */}
      {reportData && !loading && (
        <Box>
          {/* Summary Statistics */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Habits
                  </Typography>
                  <Typography variant="h4">{reportData.summary.total_habits}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Active Habits
                  </Typography>
                  <Typography variant="h4">{reportData.summary.active_habits}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Average Streak
                  </Typography>
                  <Typography variant="h4">
                    {Math.round(reportData.summary.avg_current_streak)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Max Streak
                  </Typography>
                  <Typography variant="h4">{reportData.summary.max_streak}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="h5" gutterBottom>
            Habit Details
          </Typography>

          {reportData.habits.length === 0 ? (
            <Alert severity="info">
              No habit data found for the selected period. Try adjusting your filters.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Habit</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="center">Completion Rate</TableCell>
                    <TableCell align="center">Streak</TableCell>
                    <TableCell align="center">Total Completions</TableCell>
                    <TableCell align="center">Recent Trend</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.habits.map((habit) => (
                    <TableRow key={habit.habit_id}>
                      <TableCell>
                        <Typography variant="subtitle2">{habit.habit_name}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {habit.description ? habit.description.substring(0, 50) : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {habit.category_name ? (
                          <Chip
                            label={habit.category_name}
                            size="small"
                            style={{
                              backgroundColor: habit.category_color || '#e0e0e0',
                              color: habit.category_color ? '#fff' : '#000',
                            }}
                          />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
                          <Typography variant="body2">
                            {Math.round(habit.completion_rate * 100)}%
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(habit.completion_rate * 100, 100)}
                            sx={{
                              width: '80%',
                              height: 8,
                              borderRadius: 5,
                              bgcolor: '#e0e0e0',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: getCompletionRateColor(habit.completion_rate),
                              },
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          Current: {habit.current_streak}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Best: {habit.longest_streak}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {habit.total_completions}
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" justifyContent="center" alignItems="center">
                          {getTrendIcon(habit.recent_trend)}
                          <Typography variant="body2" ml={1}>
                            {habit.recent_trend > 0 && '+'}
                            {habit.recent_trend}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
    </Box>
  );
};

export default HabitReport; 