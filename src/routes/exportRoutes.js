const router = require('express').Router();
const checkAuth = require('../middleware/checkAuth');
const botManager = require('../services/botManager');
const { generateClientLogHtml } = require('../utils/helper');

// Einzelnen Client-Log exportieren
router.get('/clients/:clientId/export', checkAuth, async (req, res) => {
    const { clientId } = req.params;
    const botObj = botManager.bots[clientId];
    if (!botObj) {
        return res.status(404).send('Client not found');
    }
    const { status, messages } = botObj;
    const htmlContent = generateClientLogHtml(clientId, status, messages);

    res.setHeader('Content-disposition', `attachment; filename=client_${clientId}_chatlog.html`);
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
});

// Alle Logs exportieren
router.get('/exportAllLogs', checkAuth, async (req, res) => {
    const allLogsHtml = botManager.exportAllLogs();
    res.setHeader('Content-disposition', 'attachment; filename=all_clients_chatlog.html');
    res.setHeader('Content-Type', 'text/html');
    res.send(allLogsHtml);
});

module.exports = router;