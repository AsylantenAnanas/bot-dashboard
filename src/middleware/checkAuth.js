module.exports = function checkAuth(req, res, next) {
    if (req.session && req.session.loggedIn && req.session.userId) {
        req.userId = req.session.userId;
        next();
    } else {
        res.status(401).json({ error: 'Nicht eingeloggt' });
    }
};