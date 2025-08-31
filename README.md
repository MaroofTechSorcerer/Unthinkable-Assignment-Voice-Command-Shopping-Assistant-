# Voice Command Shopping Assistant

A voice-based shopping list manager built with Node.js and Express.

## Features

- Voice command recognition for adding/removing items
- Shopping list management
- Basic suggestions system
- User authentication
- Responsive web interface

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp config.env.example .env
   # Edit .env with your configuration
   ```

3. **Start the application**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## Environment Variables

Create a `.env` file based on `config.env.example`:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-here
DB_PATH=./database/shopping_assistant.db
```

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/voice/process` - Process voice commands
- `GET /api/shopping/lists/:userId` - Get shopping lists
- `POST /api/shopping/lists/:listId/items` - Add items to list

## Tech Stack

- **Backend**: Node.js, Express, SQLite
- **Frontend**: Vanilla JavaScript, CSS3
- **Authentication**: JWT
- **Voice**: Web Speech API

## License

MIT License
