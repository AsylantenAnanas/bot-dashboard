const express = require('express');
const session = require('express-session');
const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');
const path = require('path');
const botManager = require('./botManager');
const pool = require('./db');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { hookEvents, hookTypes } = require('./hooksConfig');
const { generateClientLogHtml } = require('./helper');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Passe dies entsprechend deiner Domain an
    methods: ['GET', 'POST']
  }
});

// 1. Socket.io-Server initialisieren
io.on('connection', (socket) => {
  socket.on('subscribeToTerminal', async (clientId) => {
    const messages = botManager.getMessages(clientId);
    socket.emit('terminalMessages', messages);

    // Abonnieren des `messageUpdate`-Ereignisses für diesen ClientId
    const messageUpdateHandler = (newMessage) => {
      socket.emit('terminalMessagesUpdate', newMessage);
    };

    botManager.on(`messageUpdate:${clientId}`, messageUpdateHandler);

    // Cleanup: Entferne den Event-Listener, wenn der Socket getrennt wird oder die Subscription aufgehoben wird
    socket.on('unsubscribeFromTerminal', () => {
      botManager.off(`messageUpdate:${clientId}`, messageUpdateHandler);
    });

    socket.on('disconnect', () => {
      botManager.off(`messageUpdate:${clientId}`, messageUpdateHandler);
    });
  });

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

const PORT = 4000;

// 2. Express-Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  name: 'sessionId', // Custom cookie name
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

app.get('/viewers/:clientId', checkAuth, (req, res) => {
  const { clientId } = req.params;
  const botData = botManager.bots[clientId];

  if (!botData || !botData.viewerPort) {
    return res.status(404).send('Viewer not found');
  }

  if (!req.path.endsWith('/')) {
    return res.redirect(`/viewers/${clientId}/`);
  }

  const target = `http://localhost:${botData.viewerPort}`;

  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    logLevel: 'debug',
    pathRewrite: {
      [`^/viewers/${clientId}/`]: '/',
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[PROXY] Proxying request to: ${target}/`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`[PROXY] Received response: ${proxyRes.statusCode} for ${req.originalUrl}`);
    },
    onError: (err, req, res) => {
      console.error('[PROXY] Proxy error:', err);
      res.status(500).send('Proxy error');
    },
  });

  proxy(req, res, () => {
    // This callback is necessary to handle the response
    // even if the proxy does not end the request.
    res.end();
  });
});

app.get('/viewers/:clientId/:fileName', checkAuth, (req, res, next) => {
  const { clientId, fileName } = req.params;

  if (!fileName.endsWith('.js')) {
    return res.status(400).send('Invalid file extension');
  }

  const actualFileName = fileName.slice(0, -3);
  const botData = botManager.bots[clientId];

  if (!botData || !botData.viewerPort) {
    return res.status(404).send('Viewer not found');
  }

  const target = `http://localhost:${botData.viewerPort}`;

  console.log(`[PROXY] Proxying ${actualFileName}.js request to: ${target}/${actualFileName}.js`);

  const proxy = createProxyMiddleware({
    target: target,
    changeOrigin: true,
    logLevel: 'debug',
    pathRewrite: {
      [`^/viewers/${clientId}/`]: '/',
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[PROXY] Proxying ${actualFileName}.js request to: ${target}/${actualFileName}.js`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`[PROXY] Received response for ${actualFileName}.js: ${proxyRes.statusCode}`);
      proxyRes.headers['Content-Type'] = 'application/javascript';
    },
    onError: (err, req, res) => {
      console.error(`[PROXY] Proxy error for ${actualFileName}.js:`, err);
      res.status(500).send(`Proxy error for ${actualFileName}.js`);
    },
  });

  proxy(req, res, next);
});

// Auth-Check Middleware
function checkAuth(req, res, next) {
  if (req.session && req.session.loggedIn && req.session.userId) {
    req.userId = req.session.userId;
    next();
  } else {
    res.status(401).json({ error: 'Nicht eingeloggt' });
  }
}

/* -------------------------
   Login / Logout
------------------------- */
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Falsche Login-Daten' });
    }
    const user = rows[0];
    req.session.loggedIn = true;
    req.session.userId = user.id;
    req.session.username = user.username;
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Datenbankfehler' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Fehler beim Logout' });
    }
    res.clearCookie('sessionId');
    res.json({ success: true });
  });
});

/* -------------------------
   Accounts
------------------------- */
app.get('/api/accounts', checkAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM accounts WHERE user_id = ?', [req.userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

app.post('/api/accounts', checkAuth, async (req, res) => {
  const { username, nickname } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'E-Mail ist erforderlich' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO accounts (username, nickname, user_id) VALUES (?, ?, ?)',
      [username, nickname || '', req.userId]
    );
    const insertedId = result.insertId;
    res.json({ success: true, account: { id: insertedId, username, nickname } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Anlegen des Accounts' });
  }
});

app.post('/api/accounts/:id', checkAuth, async (req, res) => {
  const { id } = req.params;
  const { username, nickname } = req.body;
  try {
    // Verify ownership
    const [existing] = await pool.query('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (existing.length === 0) {
      return res.status(403).json({ error: 'Zugriff verweigert' });
    }

    await pool.query(
      'UPDATE accounts SET username = ?, nickname = ? WHERE id = ?',
      [username, nickname, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Accounts' });
  }
});

app.post('/api/accounts/:id/delete', checkAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const [existing] = await pool.query('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (existing.length === 0) {
      return res.status(403).json({ error: 'Zugriff verweigert' });
    }

    await pool.query('DELETE FROM accounts WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Löschen des Accounts' });
  }
});


/* -------------------------
   Servers
------------------------- */
// Serves as "Minecraft Server configuration"
app.get('/api/servers', checkAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM servers');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Laden der Servers' });
  }
});

app.post('/api/servers', checkAuth, async (req, res) => {
  const { name, hostname, version, npc_name, npc_x, npc_y, npc_z } = req.body;
  if (!name || !hostname) {
    return res.status(400).json({ error: 'Name und Hostname sind erforderlich' });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO servers (name, hostname, version, npc_name, npc_x, npc_y, npc_z) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, hostname, version || '1.20.4', npc_name || 'modern_server', npc_x || 0, npc_y || 0, npc_z || 0]
    );
    const insertedId = result.insertId;
    res.json({ success: true, server: { id: insertedId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Anlegen des Servers' });
  }
});

app.post('/api/servers/:id', checkAuth, async (req, res) => {
  const { id } = req.params;
  const { name, hostname, version, npc_name, npc_x, npc_y, npc_z } = req.body;
  try {
    await pool.query(
      `UPDATE servers 
       SET name=?, hostname=?, version=?, npc_name=?, npc_x=?, npc_y=?, npc_z=? 
       WHERE id=?`,
      [name, hostname, version, npc_name, npc_x, npc_y, npc_z, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Servers' });
  }
});

app.post('/api/servers/:id/delete', checkAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM servers WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Löschen des Servers' });
  }
});

/* -------------------------
   Clients
------------------------- */
app.get('/api/clients', checkAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clients WHERE user_id = ?', [req.userId]);
    const updated = rows.map(r => ({
      ...r,
      status: botManager.getBotStatus(r.id)
    }));
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Laden der Clients' });
  }
});

// Neue Client-Anlage: server_id und autorestart
app.post('/api/clients', checkAuth, async (req, res) => {
  const { accountId, serverId, auth, blacklist, autorestart } = req.body;
  if (!accountId || !serverId) {
    return res.status(400).json({ error: 'accountId und serverId sind erforderlich' });
  }
  try {
    // Verify that the account belongs to the user
    const [accountRows] = await pool.query('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [accountId, req.userId]);
    if (accountRows.length === 0) {
      return res.status(403).json({ error: 'Ungültige accountId' });
    }

    const [result] = await pool.query(
      `INSERT INTO clients (account_id, server_id, auth, blacklist, status, autorestart, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        accountId,
        serverId,
        auth || 'microsoft',
        blacklist || '',
        'stopped',
        autorestart ? 1 : 0,
        req.userId
      ]
    );
    const insertedId = result.insertId;
    res.json({ success: true, client: { id: insertedId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Anlegen des Clients' });
  }
});

app.post('/api/clients/:clientId', checkAuth, async (req, res) => {
  const { clientId } = req.params;
  const { blacklist, autorestart, modules } = req.body;

  try {
    const [existingClients] = await pool.query(
      'SELECT modules FROM clients WHERE id = ? AND user_id = ?',
      [clientId, req.userId]
    );

    if (existingClients.length === 0) {
      return res.status(403).json({ error: 'Zugriff verweigert' });
    }

    let existingModules = {};
    if (existingClients[0].modules) {
      try {
        existingModules = JSON.parse(existingClients[0].modules);
      } catch (parseError) {
        console.error('Error parsing existing modules:', parseError);
        return res.status(500).json({ error: 'Fehler beim Verarbeiten der vorhandenen Module' });
      }
    }

    const updatedModules = {
      ...existingModules,
      ...modules,
    };

    if (existingModules.hooks && modules.hooks === undefined) {
      updatedModules.hooks = existingModules.hooks;
    }

    await pool.query(
      `UPDATE clients 
       SET blacklist = ?, autorestart = ?, modules = ?
       WHERE id = ?`,
      [
        blacklist !== undefined ? blacklist : existingClients[0].blacklist,
        autorestart !== undefined ? (autorestart ? 1 : 0) : existingClients[0].autorestart,
        JSON.stringify(updatedModules),
        clientId
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Clients' });
  }
});

app.get('/api/clients/:clientId', checkAuth, async (req, res) => {
  const { clientId } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM clients WHERE id = ? AND user_id = ?', [clientId, req.userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Client nicht gefunden oder Zugriff verweigert' });
    }
    const client = rows[0];
    const [server] = await pool.query('SELECT * FROM servers WHERE id = ?', [client.server_id]);
    const [account] = await pool.query('SELECT * FROM accounts WHERE id = ?', [client.account_id]);
    const maxPlayers = await botManager.getMaxPlayers(clientId);
    client.modules = JSON.parse(client.modules || '{}');
    client.server = server[0];
    client.server.maxPlayers = maxPlayers;
    client.account = account[0];
    res.json(client);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Laden des Clients' });
  }
});

// Löschen
app.post('/api/clients/:clientId/delete', checkAuth, async (req, res) => {
  const { clientId } = req.params;
  try {
    // Verify ownership
    const [existing] = await pool.query('SELECT * FROM clients WHERE id = ? AND user_id = ?', [clientId, req.userId]);
    if (existing.length === 0) {
      return res.status(403).json({ error: 'Zugriff verweigert' });
    }

    botManager.stopBot(clientId);
    await pool.query('DELETE FROM clients WHERE id = ?', [clientId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Löschen des Clients' });
  }
});

/* --- Start, Stop, Rejoin --- */
app.post('/api/clients/:clientId/start', checkAuth, async (req, res) => {
  const { clientId } = req.params;
  try {
    // Hole Client
    const [clients] = await pool.query('SELECT * FROM clients WHERE id=?', [clientId]);
    if (clients.length === 0) {
      return res.status(403).json({ error: 'Zugriff verweigert' });
    }
    const c = clients[0];

    // Hole Account
    const [accs] = await pool.query('SELECT * FROM accounts WHERE id=?', [c.account_id]);
    if (accs.length === 0) {
      return res.status(404).json({ error: 'Account nicht gefunden' });
    }
    const accountData = accs[0];

    // Hole Server
    const [servers] = await pool.query('SELECT * FROM servers WHERE id=?', [c.server_id]);
    if (servers.length === 0) {
      return res.status(404).json({ error: 'Server nicht gefunden' });
    }
    const serverConfig = servers[0];

    // Blacklist -> Array
    const blackArray = c.blacklist ? c.blacklist.split('\n').map(l => l.trim()).filter(Boolean) : [];
    const autoR = c.autorestart === 1;

    botManager.startBot({
      clientId: c.id,
      accountData,
      auth: c.auth,
      version: serverConfig.version || '1.20.4',
      blacklist: blackArray,
      autorestart: autoR,
      serverConfig: {
        hostname: serverConfig.hostname,
        npcName: serverConfig.npc_name,
        npcX: serverConfig.npc_x,
        npcY: serverConfig.npc_y,
        npcZ: serverConfig.npc_z,
        regexMoney: serverConfig.regex_money,
        regexChat: serverConfig.regex_chatmessage,
        regexUsername: serverConfig.regex_username,
      },
      modules: JSON.parse(c.modules) || {},
    });

    await pool.query('UPDATE clients SET status=? WHERE id=?', ['running', clientId]);
    return res.json({ success: true, status: botManager.getBotStatus(clientId) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Fehler beim Starten des Bots' });
  }
});

app.post('/api/clients/:clientId/stop', checkAuth, async (req, res) => {
  const { clientId } = req.params;
  botManager.stopBot(clientId);
  try {
    await pool.query('UPDATE clients SET status=? WHERE id=?', ['stopped', clientId]);
    res.json({ success: true, status: 'stopped' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Stoppen des Bots' });
  }
});

app.post('/api/clients/:clientId/rejoin', checkAuth, async (req, res) => {
  const { clientId } = req.params;
  botManager.rejoinBot(clientId);
  try {
    await pool.query('UPDATE clients SET status=? WHERE id=?', ['running', clientId]);
    res.json({ success: true, status: 'running' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Rejoinen des Bots' });
  }
});

/* --- Chat & Logs --- */
app.post('/api/clients/:clientId/chat', checkAuth, (req, res) => {
  const { clientId } = req.params;
  const { message } = req.body;
  botManager.sendChatMessage(clientId, message);
  res.json({ success: true });
});

app.get('/api/clients/:clientId/messages', checkAuth, async (req, res) => {
  const { clientId } = req.params;
  const msgs = botManager.getMessages(clientId);
  res.json(msgs);
});

app.get('/api/clients/:clientId/export', checkAuth, async (req, res) => {
  const { clientId } = req.params;
  const botObj = botManager.bots[clientId]; // Assuming botManager.bots contains client data

  if (!botObj) {
    return res.status(404).send('Client not found');
  }

  const { status, messages } = botObj; // Adjust based on your data structure

  // Generate HTML content
  const htmlContent = generateClientLogHtml(clientId, status, messages);

  // Set headers to prompt file download
  res.setHeader('Content-disposition', `attachment; filename=client_${clientId}_chatlog.html`);
  res.setHeader('Content-Type', 'text/html');
  
  res.send(htmlContent);
});


app.get('/api/clients/:clientId/players', checkAuth, async (req, res) => {
  const { clientId } = req.params;
  const players = botManager.getPlayerList(clientId);
  res.json(players);
});

app.get('/api/clients/:clientId/playerAmount', checkAuth, async (req, res) => {
  const { clientId } = req.params;
  const playerAmount = botManager.getPlayerAmount(clientId);
  res.json(playerAmount);
}); 

// Hooks
// Hooks
app.post('/api/clients/:clientId/hooks', async (req, res) => {
  const { clientId } = req.params;
  const { hooks } = req.body;

  // Validate hooks structure
  if (!Array.isArray(hooks)) {
    return res.status(400).json({ error: 'Hooks must be an array.' });
  }

  // Optional: Add more validation for each hook object
  for (const hook of hooks) {
    if (!hook.name || !hook.type || !hook.data) {
      return res.status(400).json({ error: 'Each hook must have a name, type, and data.' });
    }
    // You can add more specific validations based on your requirements
  }

  try {
    await pool.query(
      'UPDATE clients SET modules = JSON_SET(modules, "$.hooks", ?) WHERE id = ?',
      [JSON.stringify(hooks || []), clientId] // JSON.stringify is necessary to convert array to JSON string for MySQL
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save hooks' });
  }
});

// Load Hooks
// Load Hooks
app.get('/api/clients/:clientId/hooks', async (req, res) => {
  const { clientId } = req.params;

  try {
    const [rows] = await pool.query('SELECT modules FROM clients WHERE id = ?', [clientId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    const modules = JSON.parse(rows[0].modules || '{}');
    let hooks = modules.hooks || [];

    // Ensure hooks is an array
    if (typeof hooks === 'string') {
      try {
        hooks = JSON.parse(hooks);
      } catch (e) {
        console.error("Failed to parse hooks JSON string:", e);
        hooks = [];
      }
    }

    // Final validation to ensure hooks is an array
    if (!Array.isArray(hooks)) {
      hooks = [];
    }

    res.json(hooks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load hooks' });
  }
});

app.get('/api/hooks/events', async (req, res) => {
  res.json(hookEvents);
});

app.get('/api/hooks/types', (req, res) => {
  res.json(hookTypes);
});

// Download aller Logs
app.get('/api/exportAllLogs', checkAuth, async (req, res) => {
  const allLogsHtml = botManager.exportAllLogs();
  res.setHeader('Content-disposition', 'attachment; filename=all_clients_chatlog.html');
  res.setHeader('Content-Type', 'text/html');
  res.send(allLogsHtml);
});

// 3. Statische Dateien servieren
app.use(express.static(path.join(__dirname, '..', 'client', 'build')));

// 4. Catch-All für React (nicht für Socket.io)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
});

// 5. Server starten mit `server.listen`
server.listen(PORT, () => {
  console.log(`[INFO] Server läuft auf http://localhost:${PORT}`);
});
