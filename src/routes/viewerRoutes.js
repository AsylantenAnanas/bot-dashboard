const express = require('express');
const checkAuth = require('../middleware/checkAuth');
const botManager = require('../services/botManager');
const router = express.Router();

// Endpunkt: Liefert Scoreboard-Daten als JSON für einen Client
router.get('/:clientId/scoreboard', checkAuth, (req, res) => {
  const { clientId } = req.params;
  const botData = botManager.bots[clientId];
  if (!botData || !botData.botHandler || !botData.botHandler.bot.scoreboard) {
    return res.status(404).json({ error: 'Scoreboard nicht gefunden' });
  }
  const scoreboardData = botData.botHandler.getScoreboardData();
  res.json(scoreboardData);
});

// Hauptroute: Liefert eine Viewer-Seite mit eingebettetem Prismarine-Viewer und Scoreboard-Overlay
router.get('/:clientId', checkAuth, (req, res) => {
  const { clientId } = req.params;
  const botData = botManager.bots[clientId];
  if (!botData || !botData.viewerPort) {
    return res.status(404).send('Viewer nicht gefunden');
  }
  
  res.send(`
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <title>Viewer für Client ${clientId}</title>
      <style>
         html, body {
           margin: 0;
           padding: 0;
           height: 100%;
           overflow: hidden;
           font-family: sans-serif;
         }
         #container {
           position: relative;
           width: 100vw;
           height: 100vh;
         }
         /* Das iframe füllt den Container */
         #viewerFrame {
           width: 100%;
           height: 100%;
           border: none;
         }
         /* Scoreboard-Overlay: direkt rechts, vertikal zentriert, flexible Breite */
         #scoreboard {
           position: absolute;
           top: 50%;
           right: 0;
           transform: translateY(-50%);
           background: rgba(0, 0, 0, 0.7);
           border: 2px solid #555;
           padding: 5px 10px;
           box-sizing: border-box;
           border-radius: 0;
           pointer-events: none;
         }
         #scoreboard ul {
           list-style: none;
           padding: 0;
           margin: 0;
           white-space: nowrap;
         }
         #scoreboard li {
           font-size: 14px;
           color: #fff;
           margin: 2px 0;
         }
      </style>
    </head>
    <body>
      <div id="container">
         <iframe id="viewerFrame" src="http://localhost:${botData.viewerPort}"></iframe>
         <div id="scoreboard">
           <ul id="scoreboard-list"></ul>
         </div>
      </div>
      <script>
        // Aktualisiert das Scoreboard-Overlay anhand der empfangenen Daten.
        function updateScoreboard(data) {
          const listEl = document.getElementById('scoreboard-list');
          listEl.innerHTML = '';
          console.log("updateScoreboard: Empfangene Daten:", data);
          if (data.entries && data.entries.length > 0) {
            data.entries.forEach(entry => {
              console.log("Eintrag:", entry.name, entry.score);
              const li = document.createElement('li');
              li.textContent = entry.name + (entry.score !== "" ? ': ' + entry.score : '');
              listEl.appendChild(li);
            });
          } else {
            console.warn("Keine Scoreboard-Einträge gefunden.");
            const li = document.createElement('li');
            li.textContent = '(keine Einträge)';
            listEl.appendChild(li);
          }
        }
        
        // Holt Scoreboard-Daten vom Server
        async function fetchScoreboard() {
          const url = window.location.pathname + '/scoreboard';
          console.log("Hole Scoreboard-Daten von", url);
          try {
            const res = await fetch(url);
            console.log("Antwortstatus:", res.status);
            if (res.ok) {
              const data = await res.json();
              console.log("Empfangene Scoreboard-Daten:", data);
              updateScoreboard(data);
            } else {
              console.error('Fehler beim Laden des Scoreboards:', res.status);
            }
          } catch (err) {
            console.error('Netzwerkfehler beim Scoreboard:', err);
          }
        }
        
        setInterval(fetchScoreboard, 2000);
        fetchScoreboard();
      </script>
    </body>
    </html>
  `);
});

module.exports = router;
