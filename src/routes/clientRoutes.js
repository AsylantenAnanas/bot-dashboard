// src/routes/clientRoutes.js
const router = require('express').Router();
const pool = require('../config/db');
const checkAuth = require('../middleware/checkAuth');
// Importiere beide Manager
const javaBotManager = require('../services/botManager');
const bedrockBotManager = null; //require('../services/bedrockBotManager');

/**
 * Hilfsfunktion: Bestimmt den richtigen Bot-Manager anhand der Account-Edition.
 * Es wird der Client geladen und anschließend der zugehörige Account abgefragt.
 * Ist die Edition "bedrock", wird der bedrockBotManager verwendet, andernfalls der javaBotManager.
 */
async function getBotManagerForClient(clientId, userId) {
  const [clientRows] = await pool.query(
    'SELECT * FROM clients WHERE id = ? AND user_id = ?',
    [clientId, userId]
  );
  if (clientRows.length === 0) {
    throw new Error('Client nicht gefunden oder Zugriff verweigert');
  }
  const client = clientRows[0];
  const [accountRows] = await pool.query(
    'SELECT edition FROM accounts WHERE id = ?',
    [client.account_id]
  );
  if (accountRows.length === 0) {
    throw new Error('Account nicht gefunden');
  }
  const edition = accountRows[0].edition;
  return (edition === 'bedrock') ? bedrockBotManager : javaBotManager;
}

// Alle Clients eines Nutzers (mit Edition aus Accounts ermitteln)
router.get('/', checkAuth, async (req, res) => {
  try {
    // Clients mit zugehöriger Account-Edition abrufen (JOIN)
    const [rows] = await pool.query(
      'SELECT c.*, a.edition FROM clients c JOIN accounts a ON c.account_id = a.id WHERE c.user_id = ?',
      [req.userId]
    );
    const updated = await Promise.all(rows.map(async r => {
      const manager = (r.edition === 'bedrock') ? bedrockBotManager : javaBotManager;
      return { ...r, status: manager.getBotStatus(r.id) };
    }));
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Laden der Clients' });
  }
});

// Neuen Client anlegen
router.post('/', checkAuth, async (req, res) => {
  const { accountId, serverId, auth, blacklist, autorestart } = req.body;
  if (!accountId || !serverId) {
    return res.status(400).json({ error: 'accountId und serverId sind erforderlich' });
  }
  try {
    const [accountRows] = await pool.query(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ?',
      [accountId, req.userId]
    );
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

// Client konfigurieren (Blacklist, Autorestart, Module usw.)
router.post('/:clientId', checkAuth, async (req, res) => {
  const { clientId } = req.params;
  const { blacklist, autorestart, modules } = req.body;

  try {
    const [existingClients] = await pool.query(
      'SELECT modules, blacklist, autorestart FROM clients WHERE id = ? AND user_id = ?',
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
        return res.status(500).json({ error: 'Fehler beim Verarbeiten der Module' });
      }
    }

    const updatedModules = {
      ...existingModules,
      ...modules,
    };

    // Falls Hooks bereits existieren und nicht überschrieben werden sollen
    if (existingModules.hooks && modules?.hooks === undefined) {
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

// Spezifischen Client abrufen
router.get('/:clientId', checkAuth, async (req, res) => {
  const { clientId } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM clients WHERE id = ? AND user_id = ?',
      [clientId, req.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Client nicht gefunden oder Zugriff verweigert' });
    }
    const client = rows[0];
    const [server] = await pool.query('SELECT * FROM servers WHERE id = ?', [client.server_id]);
    const [account] = await pool.query('SELECT * FROM accounts WHERE id = ?', [client.account_id]);

    // Wähle den richtigen Manager anhand der Account-Edition
    const manager = (account[0].edition === 'bedrock') ? bedrockBotManager : javaBotManager;
    const maxPlayers = manager.getMaxPlayers(clientId);

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

// Client löschen
router.post('/:clientId/delete', checkAuth, async (req, res) => {
  const { clientId } = req.params;
  try {
    const [existing] = await pool.query(
      'SELECT * FROM clients WHERE id = ? AND user_id = ?',
      [clientId, req.userId]
    );
    if (existing.length === 0) {
      return res.status(403).json({ error: 'Zugriff verweigert' });
    }
    const manager = await getBotManagerForClient(clientId, req.userId);
    manager.stopBot(clientId);
    await pool.query('DELETE FROM clients WHERE id = ?', [clientId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Löschen des Clients' });
  }
});

// Client starten
router.post('/:clientId/start', checkAuth, async (req, res) => {
  const { clientId } = req.params;
  try {
    const [clients] = await pool.query('SELECT * FROM clients WHERE id=?', [clientId]);
    if (clients.length === 0) {
      return res.status(403).json({ error: 'Zugriff verweigert' });
    }
    const c = clients[0];

    const [accs] = await pool.query('SELECT * FROM accounts WHERE id=?', [c.account_id]);
    if (accs.length === 0) {
      return res.status(404).json({ error: 'Account nicht gefunden' });
    }
    const accountData = accs[0];

    const [servers] = await pool.query('SELECT * FROM servers WHERE id=?', [c.server_id]);
    if (servers.length === 0) {
      return res.status(404).json({ error: 'Server nicht gefunden' });
    }
    const serverConfig = servers[0];

    const blackArray = c.blacklist
      ? c.blacklist.split('\n').map(l => l.trim()).filter(Boolean)
      : [];
    const autoR = c.autorestart === 1;

    // Bestimme den richtigen Manager basierend auf der Account-Edition
    const manager = (accountData.edition === 'bedrock') ? bedrockBotManager : javaBotManager;

    manager.startBot({
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
    return res.json({ success: true, status: manager.getBotStatus(clientId) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Fehler beim Starten des Bots' });
  }
});

// Client stoppen
router.post('/:clientId/stop', checkAuth, async (req, res) => {
  const { clientId } = req.params;
  try {
    const manager = await getBotManagerForClient(clientId, req.userId);
    manager.stopBot(clientId);
    await pool.query('UPDATE clients SET status=? WHERE id=?', ['stopped', clientId]);
    res.json({ success: true, status: 'stopped' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Stoppen des Bots' });
  }
});

// Client rejoin
router.post('/clients/:clientId/rejoin', checkAuth, async (req, res) => {
  const { clientId } = req.params;
  try {
    const manager = await getBotManagerForClient(clientId, req.userId);
    manager.rejoinBot(clientId);
    await pool.query('UPDATE clients SET status=? WHERE id=?', ['running', clientId]);
    res.json({ success: true, status: 'running' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Rejoinen des Bots' });
  }
});

// Chat an Bot
router.post('/:clientId/chat', checkAuth, async (req, res) => {
  const { clientId } = req.params;
  const { message } = req.body;
  try {
    const manager = await getBotManagerForClient(clientId, req.userId);
    manager.sendChatMessage(clientId, message);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Senden der Chatnachricht' });
  }
});

// Nachrichten abrufen
router.get('/:clientId/messages', checkAuth, async (req, res) => {
  const { clientId } = req.params;
  try {
    const manager = await getBotManagerForClient(clientId, req.userId);
    const msgs = manager.getMessages(clientId);
    res.json(msgs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Nachrichten' });
  }
});

// Spieler abrufen
router.get('/:clientId/players', checkAuth, async (req, res) => {
  const { clientId } = req.params;
  try {
    const manager = await getBotManagerForClient(clientId, req.userId);
    const players = manager.getPlayerList(clientId);
    res.json(players);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Spieler' });
  }
});

// Spieleranzahl abrufen
router.get('/:clientId/playerAmount', checkAuth, async (req, res) => {
  const { clientId } = req.params;
  try {
    const manager = await getBotManagerForClient(clientId, req.userId);
    const playerAmount = manager.getPlayerAmount(clientId);
    res.json(playerAmount);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Spieleranzahl' });
  }
});

module.exports = router;