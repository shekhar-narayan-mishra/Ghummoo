const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { sequelize } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/v1', routes);

// Error handling middleware (must be last)
const { ErrorHandler } = errorHandler;
app.use(ErrorHandler.notFound);
app.use(ErrorHandler.globalHandler);


// Database connection and server start
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync database models
    await sequelize.sync({ alter: true });
    console.log('Database synchronized.');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
// update 0
// update 1
// update 2
// update 3
// update 4
// update 5
// update 6
// update 7
// update 8
// update 9
// update 10
// update 11
// update 12
// update 13
// update 14
// update 15
// update 16
// update 17
// update 18
// update 19
// update 20
// update 21
// update 22
// update 23
// update 24
// update 25
// update 26
// update 27
// update 28
// update 29
// update 30
// update 31
// update 32
// update 33
// update 34
// update 35
// update 36
// update 37
// update 38
// update 39
// update 40
// update 41
// update 42
// update 43
// update 44
// update 45
// update 46
// update 47
// update 48
// update 49
