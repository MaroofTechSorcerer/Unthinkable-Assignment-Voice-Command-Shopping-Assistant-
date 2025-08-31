const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const voiceRoutes = require('./routes/voice');
const shoppingRoutes = require('./routes/shopping');
const suggestionsRoutes = require('./routes/suggestions');

// Use routes (no auth middleware)
app.use('/api/voice', voiceRoutes);
app.use('/api/shopping', shoppingRoutes);
app.use('/api/suggestions', suggestionsRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('voiceCommand', async (data) => {
    try {
      const { audioData, command } = data;
      // Process voice command and emit response
      const response = await processVoiceCommand(command);
      socket.emit('voiceResponse', response);
    } catch (error) {
      socket.emit('error', { message: 'Error processing voice command' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Import and initialize database
const { initDatabase } = require('./database/database');

// Import voice processing
const { processVoiceCommand } = require('./services/voiceProcessor');

const PORT = process.env.PORT || 3001;

// Initialize database and start server
const startServer = async () => {
  try {
    await initDatabase();
    console.log('Database initialized successfully');
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Voice Command Shopping Assistant is ready!`);
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };
