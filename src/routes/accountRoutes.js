const router = require('express').Router();
const pool = require('../config/db');
const checkAuth = require('../middleware/checkAuth');

// Alle Accounts abrufen
router.get('/', checkAuth, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM accounts WHERE user_id = ?', [req.userId]);

        // proxies ist JSON => parsen
        rows.forEach(acc => {
            if (acc.proxies) {
                try {
                    acc.proxies = JSON.parse(acc.proxies);
                } catch (e) {
                    acc.proxies = [];
                }
            } else {
                acc.proxies = [];
            }
        });
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Datenbankfehler' });
    }
});

// Neuen Account anlegen
router.post('/', checkAuth, async (req, res) => {
    const { username, nickname, proxies, edition } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'E-Mail ist erforderlich' });
    }
    try {
      let proxiesString = null;
      if (proxies) {
        proxiesString = JSON.stringify(proxies);
      }
      const editionValue = (edition === 'bedrock' || edition === 'java') ? edition : 'java';
  
      const [result] = await pool.query(
        'INSERT INTO accounts (username, nickname, user_id, proxies, edition) VALUES (?, ?, ?, ?, ?)',
        [username, nickname || '', req.userId, proxiesString, editionValue]
      );
      const insertedId = result.insertId;
      res.json({ success: true, account: { id: insertedId, username, nickname, edition: editionValue } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Fehler beim Anlegen des Accounts' });
    }
  });

// Account bearbeiten
router.post('/:id', checkAuth, async (req, res) => {
    const { id } = req.params;
    const { username, nickname, proxies } = req.body;
    try {
        const [existing] = await pool.query(
            'SELECT * FROM accounts WHERE id = ? AND user_id = ?',
            [id, req.userId]
        );
        if (existing.length === 0) {
            return res.status(403).json({ error: 'Zugriff verweigert' });
        }

        let proxiesString = null;
        if (proxies) {
            proxiesString = JSON.stringify(proxies);
        }

        await pool.query(
            'UPDATE accounts SET username = ?, nickname = ?, proxies = ? WHERE id = ?',
            [username, nickname, proxiesString, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Accounts' });
    }
});

// Account löschen
router.post('/:id/delete', checkAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const [existing] = await pool.query(
            'SELECT * FROM accounts WHERE id = ? AND user_id = ?',
            [id, req.userId]
        );
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

module.exports = router;