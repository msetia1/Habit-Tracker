require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
console.log('CORS Origin:', process.env.FRONTEND_URL);

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://profound-adventure-production.up.railway.app',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
app.use(express.json());

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // required for Railway
    }
});

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('Successfully connected to PostgreSQL database');
    release();
});

// Routes
const authRoutes = require('./routes/auth');
const habitRoutes = require('./routes/habits');
const statsRoutes = require('./routes/stats');
const categoryRoutes = require('./routes/categories');

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/categories', categoryRoutes);

// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Habit Tracker API' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 