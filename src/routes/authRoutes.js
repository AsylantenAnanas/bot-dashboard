const router = require('express').Router();
const pool = require('../config/db');

// Login
router.post('/login', async (req, res) => {
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

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Fehler beim Logout' });
        }
        res.clearCookie('sessionId');
        res.json({ success: true });
    });
});

module.exports = router;