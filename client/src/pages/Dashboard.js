import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Typography,
  Box,
  Grid,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
  Add as AddIcon,
  BarChart as BarChartIcon,
  CalendarToday as CalendarTodayIcon,
  Done as DoneIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { habitAPI, statsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LogHabitDialog from '../components/LogHabitDialog';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [habits, setHabits] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  
  // Log habit dialog state
  const [logCompletionOpen, setLogCompletionOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current date for filtering
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 30); // Last 30 days
      
      // Fetch habits and stats
      const [habitsResponse, statsResponse] = await Promise.all([
        habitAPI.getHabits(),
        statsAPI.getStats(
          startDate.toISOString().split('T')[0],
          today.toISOString().split('T')[0]
        ),
      ]);
      
      setHabits(habitsResponse.data);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
    setAlert({
      open: true,
      message: 'Habit completion logged successfully!',
      severity: 'success'
    });
    fetchDashboardData(); // Refresh data
  };
  
  const handleCloseAlert = () => {
    setAlert((prev) => ({ ...prev, open: false }));
  };

  const getActiveHabits = () => {
    return habits.filter(habit => habit.active).slice(0, 5);
  };

  const getRecentlyCompletedHabits = () => {
    return habits
      .filter(habit => 
        habit.habitLogs && 
        habit.habitLogs.length > 0 &&
        habit.active
      )
      .sort((a, b) => {
        const aDate = a.habitLogs.length ? new Date(a.habitLogs[a.habitLogs.length - 1].date) : new Date(0);
        const bDate = b.habitLogs.length ? new Date(b.habitLogs[b.habitLogs.length - 1].date) : new Date(0);
        return bDate - aDate;
      })
      .slice(0, 3);
  };

  const getTopStreaks = () => {
    return habits
      .filter(habit => habit.streaks && habit.streaks.length > 0)
      .sort((a, b) => {
        const aStreak = a.streaks[0]?.currentStreak || 0;
        const bStreak = b.streaks[0]?.currentStreak || 0;
        return bStreak - aStreak;
      })
      .slice(0, 3);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Welcome Section */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome, {currentUser?.username || 'User'}!
        </Typography>
        <Typography variant="body1" color="textSecondary">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </Typography>
      </Box>

      {/* Stats Overview */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Habits
              </Typography>
              <Typography variant="h4">{habits.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Habits
              </Typography>
              <Typography variant="h4">
                {habits.filter(habit => habit.active).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Categories
              </Typography>
              <Typography variant="h4">
                {new Set(habits.map(habit => habit.categoryId).filter(Boolean)).size}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Best Streak
              </Typography>
              <Typography variant="h4">
                {Math.max(
                  ...habits
                    .filter(habit => habit.streaks && habit.streaks.length > 0)
                    .map(habit => habit.streaks[0]?.longestStreak || 0),
                  0
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Dashboard Content */}
      <Grid container spacing={3}>
        {/* Active Habits */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Active Habits</Typography>
              <Button component={Link} to="/habits" startIcon={<AddIcon />} size="small">
                Manage
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {getActiveHabits().length === 0 ? (
              <Alert severity="info">
                No active habits found. Start by creating a new habit!
              </Alert>
            ) : (
              <List>
                {getActiveHabits().map((habit) => (
                  <ListItem key={habit.id} 
                    divider
                    secondaryAction={
                      <Tooltip title="Log Completion">
                        <IconButton 
                          edge="end" 
                          color="success" 
                          onClick={() => handleOpenLogCompletion(habit)}
                        >
                          <DoneIcon />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    <ListItemIcon>
                      <CalendarTodayIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={habit.name}
                      secondary={`${habit.frequency} • ${
                        habit.category ? habit.category.name : 'No category'
                      }`}
                    />
                    {habit.streaks && habit.streaks.length > 0 && (
                      <Chip
                        size="small"
                        label={`Streak: ${habit.streaks[0].currentStreak}`}
                        color="primary"
                        variant="outlined"
                        sx={{ mr: 4 }}
                      />
                    )}
                  </ListItem>
                ))}
              </List>
            )}
            {habits.filter(habit => habit.active).length > 5 && (
              <Box mt={2} textAlign="center">
                <Button component={Link} to="/habits" size="small">
                  View All ({habits.filter(habit => habit.active).length})
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Recent Completions & Top Streaks */}
        <Grid item xs={12} md={6}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Recent Completions</Typography>
                  <IconButton component={Link} to="/reports" size="small">
                    <BarChartIcon />
                  </IconButton>
                </Box>
                <Divider sx={{ mb: 2 }} />
                {getRecentlyCompletedHabits().length === 0 ? (
                  <Alert severity="info">
                    No recent habit completions. Start logging your progress!
                  </Alert>
                ) : (
                  <List>
                    {getRecentlyCompletedHabits().map((habit) => {
                      const latestLog = habit.habitLogs[habit.habitLogs.length - 1];
                      return (
                        <ListItem key={habit.id} 
                          divider
                          secondaryAction={
                            <Tooltip title="Log Again">
                              <IconButton 
                                edge="end" 
                                color="success" 
                                onClick={() => handleOpenLogCompletion(habit)}
                              >
                                <DoneIcon />
                              </IconButton>
                            </Tooltip>
                          }
                        >
                          <ListItemIcon>
                            <CheckCircleIcon color="success" />
                          </ListItemIcon>
                          <ListItemText
                            primary={habit.name}
                            secondary={`Completed on ${format(
                              new Date(latestLog.date),
                              'MMM d, yyyy'
                            )}`}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Top Streaks
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {getTopStreaks().length === 0 ? (
                  <Alert severity="info">
                    No streaks yet. Keep completing your habits consistently!
                  </Alert>
                ) : (
                  <List>
                    {getTopStreaks().map((habit) => (
                      <ListItem key={habit.id} 
                        divider
                        secondaryAction={
                          <Tooltip title="Log Completion">
                            <IconButton 
                              edge="end" 
                              color="success" 
                              onClick={() => handleOpenLogCompletion(habit)}
                            >
                              <DoneIcon />
                            </IconButton>
                          </Tooltip>
                        }
                      >
                        <ListItemIcon>
                          <AssignmentIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={habit.name}
                          secondary={`${habit.frequency} • ${
                            habit.category ? habit.category.name : 'No category'
                          }`}
                        />
                        <Chip
                          size="small"
                          label={`Streak: ${habit.streaks[0].currentStreak}`}
                          color="primary"
                          sx={{ mr: 4 }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      
      {/* Log Completion Dialog */}
      <LogHabitDialog
        open={logCompletionOpen}
        onClose={handleCloseLogCompletion}
        habit={selectedHabit}
        onSuccess={handleLogCompletionSuccess}
      />
      
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

export default Dashboard; 