const router = require('express').Router();
const { createProxyMiddleware } = require('http-proxy-middleware');
const botManager = require('../services/botManager');
const checkAuth = require('../middleware/checkAuth');

// Viewer-Route
router.get('/:clientId', checkAuth, (req, res) => {
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
        onError: (err, reqP, resP) => {
            console.error('[PROXY] Proxy error:', err);
            resP.status(500).send('Proxy error');
        },
    });
    proxy(req, res, () => res.end());
});

// Viewer-JS-Dateien
router.get('/:clientId/:fileName', checkAuth, (req, res, next) => {
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

    const proxy = createProxyMiddleware({
        target,
        changeOrigin: true,
        logLevel: 'debug',
        pathRewrite: {
            [`^/viewers/${clientId}/`]: '/',
        },
        onProxyRes: (proxyRes) => {
            proxyRes.headers['Content-Type'] = 'application/javascript';
        },
        onError: (err, reqP, resP) => {
            console.error(`[PROXY] Proxy error for ${actualFileName}.js:`, err);
            resP.status(500).send(`Proxy error for ${actualFileName}.js`);
        },
    });

    proxy(req, res, next);
});

module.exports = router;