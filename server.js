require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const botManager = require('./src/services/botManager');

// Routen
const authRoutes = require('./src/routes/authRoutes');
const accountRoutes = require('./src/routes/accountRoutes');
const serverRoutes = require('./src/routes/serverRoutes');
const clientRoutes = require('./src/routes/clientRoutes');
const hookRoutes = require('./src/routes/hookRoutes');
const exportRoutes = require('./src/routes/exportRoutes');
const viewerRoutes = require('./src/routes/viewerRoutes');

// Middleware
const checkAuth = require('./src/middleware/checkAuth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// --- Socket.io Setup ---
io.on('connection', (socket) => {
  // Terminal-Ausgaben
  socket.on('subscribeToTerminal', async (clientId) => {
    const messages = botManager.getMessages(clientId);
    socket.emit('terminalMessages', messages);

    const messageUpdateHandler = (newMessage) => {
      socket.emit('terminalMessagesUpdate', newMessage);
    };
    botManager.on(`messageUpdate:${clientId}`, messageUpdateHandler);

    socket.on('unsubscribeFromTerminal', () => {
      botManager.off(`messageUpdate:${clientId}`, messageUpdateHandler);
    });

    socket.on('disconnect', () => {
      botManager.off(`messageUpdate:${clientId}`, messageUpdateHandler);
    });
  });

  // Spieler-Updates
  socket.on('subscribeToPlayerUpdates', async (clientId) => {
    const initialPlayers = botManager.getPlayerList(clientId);
    const playerCount = Object.keys(initialPlayers).length;
    const maxPlayers = botManager.getMaxPlayers(clientId);

    socket.emit('playerUpdate', {
      type: 'initial',
      playerList: Object.keys(initialPlayers),
      playerCount,
      maxPlayers
    });

    const playerUpdateHandler = (data) => {
      socket.emit('playerUpdate', data);
    };
    botManager.on(`playerUpdate:${clientId}`, playerUpdateHandler);

    socket.on('unsubscribeFromPlayerUpdates', () => {
      botManager.off(`playerUpdate:${clientId}`, playerUpdateHandler);
    });

    socket.on('disconnect', () => {
      botManager.off(`playerUpdate:${clientId}`, playerUpdateHandler);
    });
  });
});

// --- App-Konfiguration ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  name: 'sessionId',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
  },
}));

// --- API-Routen einbinden ---
app.use('/api', authRoutes);
app.use('/api/accounts', checkAuth, accountRoutes);
app.use('/api/servers', checkAuth, serverRoutes);
app.use('/api/clients', checkAuth, clientRoutes);
app.use('/api', checkAuth, hookRoutes);
app.use('/api', checkAuth, exportRoutes);

// Viewer-Routen (ohne /api Prefix)
app.use('/viewers', checkAuth, viewerRoutes);

// Client-Frontend
app.use(express.static(path.join(__dirname, 'src', 'client', 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'client', 'build', 'index.html'));
});

// --- Server starten ---
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`[INFO] Server läuft auf http://localhost:${PORT}`);
});