const router = require('express').Router();
const pool = require('../config/db');
const checkAuth = require('../middleware/checkAuth');

// Alle Server abrufen
router.get('/', checkAuth, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM servers');
        // proxies kann ein JSON-String sein oder null.
        rows.forEach(server => {
            if (server.proxies) {
                try {
                    server.proxies = JSON.parse(server.proxies);
                } catch (e) {
                    console.warn(`Fehler beim Parsen von proxies bei Server ${server.id}:`, e);
                    server.proxies = [];
                }
            } else {
                server.proxies = [];
            }
        });
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fehler beim Laden der Servers' });
    }
});

// Neuen Server anlegen
router.post('/', checkAuth, async (req, res) => {
    const { name, hostname, version, npc_name, npc_x, npc_y, npc_z, proxies } = req.body;
    if (!name || !hostname) {
        return res.status(400).json({ error: 'Name und Hostname sind erforderlich' });
    }
    try {
        const proxiesString = proxies ? JSON.stringify(proxies) : null;

        const [result] = await pool.query(
            `INSERT INTO servers (
        name, hostname, version, npc_name, npc_x, npc_y, npc_z, proxies
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                hostname,
                version || '1.20.4',
                npc_name || 'modern_server',
                npc_x || 0,
                npc_y || 0,
                npc_z || 0,
                proxiesString
            ]
        );
        const insertedId = result.insertId;
        res.json({ success: true, server: { id: insertedId } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fehler beim Anlegen des Servers' });
    }
});

// Server bearbeiten
router.post('/:id', checkAuth, async (req, res) => {
    const { id } = req.params;
    const { name, hostname, version, npc_name, npc_x, npc_y, npc_z, proxies } = req.body;
    try {
        const proxiesString = proxies ? JSON.stringify(proxies) : null;

        await pool.query(
            `UPDATE servers
       SET name=?, hostname=?, version=?, npc_name=?, npc_x=?, npc_y=?, npc_z=?, proxies=?
       WHERE id=?`,
            [name, hostname, version, npc_name, npc_x, npc_y, npc_z, proxiesString, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Servers' });
    }
});

// Server löschen
router.post('/:id/delete', checkAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM servers WHERE id=?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fehler beim Löschen des Servers' });
    }
});

module.exports = router;