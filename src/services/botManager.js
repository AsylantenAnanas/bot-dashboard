const EventEmitter = require('events');
const { fork } = require('child_process');
const path = require('path');
const AnsiToHtml = require('ansi-to-html');

const ansiToHtml = new AnsiToHtml();

class BotManager extends EventEmitter {
    constructor() {
        super();
        this.bots = {};
        this.nextViewerPort = 3007;
    }

    startBot(clientConfig) {
        const { clientId } = clientConfig;
        if (this.bots[clientId] && this.bots[clientId].status === 'running') {
            return;
        }

        let messages = [];
        if (!this.bots[clientId]) {
            messages = [];
        } else {
            messages = this.bots[clientId].messages;
        }
        const startMessage = { timestamp: new Date().toISOString(), text: 'Bot wird gestartet...' };
        messages.push(startMessage);
        this.emit(`messageUpdate:${clientId}`, startMessage);

        const botProcess = fork(path.join(__dirname, 'botProcess.js'));

        botProcess.send({ type: 'start', config: clientConfig });

        botProcess.on('message', (message) => {
            const { type, payload } = message;

            if (type === 'playerUpdate') {
                this.emit(`playerUpdate:${clientId}`, payload);
            } else {
                // This is a terminal message
                if (payload && payload.timestamp) {
                    messages.push(payload);
                    this.emit(`messageUpdate:${clientId}`, payload);
                }

                if (type === 'kicked' || type === 'error' || type === 'end') {
                    if (this.bots[clientId]) {
                        this.bots[clientId].status = 'errored';
                    }
                }
            }
        });

        botProcess.on('exit', (code) => {
            const exitMessage = {
                timestamp: new Date().toISOString(),
                text: `Bot-Prozess wurde mit Code ${code} beendet.`
            };
            messages.push(exitMessage);
            this.emit(`messageUpdate:${clientId}`, exitMessage);
            if (this.bots[clientId]) {
                this.bots[clientId].status = 'stopped';
            }
        });

        this.bots[clientId] = {
            process: botProcess,
            status: 'running',
            messages,
            config: clientConfig,
            viewerPort: null // Viewer wird vorerst nicht unterstützt
        };
    }

    stopBot(clientId) {
        const botData = this.bots[clientId];
        if (!botData) return;
        if (botData.status === 'running' || botData.status === 'errored') {
            botData.process.send({ type: 'stop' });
            botData.status = 'stopped';

            const stoppedMessage = { timestamp: new Date().toISOString(), text: 'Bot ist jetzt gestoppt.' };
            botData.messages.push(stoppedMessage);
            this.emit(`messageUpdate:${clientId}`, stoppedMessage);
        }
    }

    rejoinBot(clientId) {
        const botData = this.bots[clientId];
        if (!botData) return;
        this.stopBot(clientId);
        this.startBot(botData.config);
    }

    getBotStatus(clientId) {
        if (!this.bots[clientId]) return 'stopped';
        return this.bots[clientId].status;
    }

    getMessages(clientId) {
        if (!this.bots[clientId]) return [];
        return this.bots[clientId].messages;
    }

    getPlayerList(clientId) {
        // Diese Methode muss angepasst werden, da der Bot in einem anderen Prozess läuft.
        // Vorerst geben wir ein leeres Array zurück.
        return [];
    }

    getMaxPlayers(clientId) {
        // Diese Methode muss angepasst werden.
        return 0;
    }

    getPlayerAmount(clientId) {
        // Diese Methode muss angepasst werden.
        return 0;
    }

    sendChatMessage(clientId, message) {
        const botData = this.bots[clientId];
        if (botData && botData.status === 'running') {
            const chatMessage = {
                timestamp: new Date().toISOString(),
                text: `> ${message}`
            };
            botData.messages.push(chatMessage);
            this.emit(`messageUpdate:${clientId}`, chatMessage);
            botData.process.send({ type: 'chat', payload: message });
        }
    }

    exportAllLogs() {
        let htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>All Clients Chat Log</title>
        <style>
          body {
            background-color: #2b2b2b;
            color: #f1f1f1;
            font-family: 'Minecraft', sans-serif;
            padding: 20px;
          }
          .client-section {
            margin-bottom: 30px;
          }
          .client-header {
            font-weight: bold;
            margin-bottom: 10px;
            color: #00aaff;
          }
          .message {
            margin: 2px 0;
            white-space: pre-wrap;
          }
        </style>
      </head>
      <body>
        <h1>All Clients Chat Log</h1>
    `;
        for (const clientId in this.bots) {
            const botObj = this.bots[clientId];
            htmlContent += `<div class="client-section">`;
            htmlContent += `<div class="client-header">--- Client #${clientId} (Status: ${botObj.status}) ---</div>`;

            botObj.messages.forEach((msg) => {
                const timestamp = new Date(msg.timestamp).toLocaleString();
                const messageHtml = ansiToHtml.toHtml(msg.text);
                htmlContent += `<div class="message"><span class="timestamp">${timestamp}</span> - ${messageHtml}</div>`;
            });
            htmlContent += `</div>`;
        }
        htmlContent += `</body></html>`;
        return htmlContent;
    }

    // (Optional) Falls hier genutzt, beibehalten
    isBlacklisted(message) {
        // Beispielhaft: "this.blacklist" gibt es global nicht im BotManager
        // Falls du das global brauchst, anpassen oder entfernen
        return this.blacklist?.some(b => message.includes(b));
    }
}

module.exports = new BotManager();
