const router = require('express').Router();
const pool = require('../config/db');

// Hooks in einem Client speichern
router.post('/clients/:clientId/hooks', async (req, res) => {
    const { clientId } = req.params;
    const { hooks } = req.body;

    // Neu: Nur noch 'hooks' als Array prüfen
    if (!Array.isArray(hooks)) {
        return res.status(400).json({ error: 'Hooks must be an array.' });
    }

    // Unsere neue Mindest-Anforderung: 'name' & 'data' pro Hook
    for (const hook of hooks) {
        if (!hook.name || !hook.data) {
            return res.status(400).json({
                error: 'Each hook must have at least a "name" and a "data" object.'
            });
        }
    }

    try {
        // Speichern in JSON-Feld "hooks" des modules-Objekts
        await pool.query(
            'UPDATE clients SET modules = JSON_SET(modules, "$.hooks", ?) WHERE id = ?',
            [JSON.stringify(hooks || []), clientId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save hooks' });
    }
});

// Hooks in einem Client auslesen
router.get('/clients/:clientId/hooks', async (req, res) => {
    const { clientId } = req.params;

    try {
        const [rows] = await pool.query('SELECT modules FROM clients WHERE id = ?', [clientId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        const modules = JSON.parse(rows[0].modules || '{}');
        let hooks = modules.hooks || [];

        if (typeof hooks === 'string') {
            try {
                hooks = JSON.parse(hooks);
            } catch (e) {
                console.error("Failed to parse hooks JSON string:", e);
                hooks = [];
            }
        }

        if (!Array.isArray(hooks)) {
            hooks = [];
        }

        res.json(hooks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to load hooks' });
    }
});

// Hook-Events
router.get('/hooks/events', async (req, res) => {
    // Unverändert, falls du hier nichts anpasst
    const { hookEvents } = require('../config/hooksConfig');
    res.json(hookEvents);
});

// Hook-Typen
router.get('/hooks/types', (req, res) => {
    const { hookTypes } = require('../config/hooksConfig');
    res.json(hookTypes);
});

module.exports = router;