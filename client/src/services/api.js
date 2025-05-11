import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include authentication token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Habit API methods
export const habitAPI = {
  // Get all habits
  getHabits: () => api.get('/habits'),
  
  // Get a single habit
  getHabit: (id) => api.get(`/habits/${id}`),
  
  // Create a new habit
  createHabit: (habitData) => api.post('/habits', habitData),
  
  // Update a habit
  updateHabit: (id, habitData) => api.put(`/habits/${id}`, habitData),
  
  // Delete a habit
  deleteHabit: (id) => api.delete(`/habits/${id}`),
  
  // Log a habit completion
  logCompletion: (id, logData) => api.post(`/habits/${id}/log`, logData),
};

// Category API methods
export const categoryAPI = {
  // Get all categories
  getCategories: () => api.get('/categories'),
  
  // Create a new category
  createCategory: (categoryData) => api.post('/categories', categoryData),
  
  // Update a category
  updateCategory: (id, categoryData) => api.put(`/categories/${id}`, categoryData),
  
  // Delete a category
  deleteCategory: (id) => api.delete(`/categories/${id}`),
};

// Stats API methods
export const statsAPI = {
  // Get basic stats
  getStats: (startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return api.get('/stats', { params });
  },
  
  // Get comprehensive habit report
  getHabitReport: (startDate, endDate, categoryId) => {
    const params = { startDate, endDate };
    if (categoryId) params.categoryId = categoryId;
    return api.get('/stats/report', { params });
  },
  
  // Get consistency score for a habit
  getConsistencyScore: (habitId, startDate, endDate) => {
    return api.get(`/stats/consistency/${habitId}`, {
      params: { startDate, endDate }
    });
  }
};

// Auth API methods
export const authAPI = {
  // Login
  login: (credentials) => api.post('/auth/login', credentials),
  
  // Register
  register: (userData) => api.post('/auth/register', userData),
  
  // Get current user
  getCurrentUser: () => api.get('/auth/me'),
};

export default api; 