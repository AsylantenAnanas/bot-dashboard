const EventEmitter = require('events');
const { mineflayer: mineflayerViewer } = require('prismarine-viewer');
const AnsiToHtml = require('ansi-to-html');

const BotHandler = require('./botHandler');
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

        const botHandler = new BotHandler(clientConfig);
        const viewerPort = this.nextViewerPort++;

        mineflayerViewer(botHandler.bot, { port: viewerPort, firstPerson: true });

        botHandler.bot.on('rejoinTrigger', () => {
            this.stopBot(clientId);
            this.startBot(clientConfig);
        });

        botHandler.bot.on('message', (jsonMsg) => {
            if (botHandler.isBlacklisted(jsonMsg.toString())) return;
            const message = {
                timestamp: new Date().toISOString(),
                text: jsonMsg.toAnsi()
            };
            messages.push(message);
            this.emit(`messageUpdate:${clientId}`, message);
        });

        botHandler.bot.on('msaCode', (msaMessage) => {
            messages.push(msaMessage);
            this.emit(`messageUpdate:${clientId}`, msaMessage);
        });

        botHandler.bot.on('spawn', () => {
            const spawnMessage = {
                timestamp: new Date().toISOString(),
                text: `Bot ist gespawnt auf "${botHandler.serverConfig.hostname}".`
            };
            messages.push(spawnMessage);
            this.emit(`messageUpdate:${clientId}`, spawnMessage);
        });

        botHandler.bot.on('playerJoined', (player) => {
            this.emit(`playerUpdate:${clientId}`, {
                type: 'joined',
                player,
                playerList: Object.keys(botHandler.bot.players),
                playerCount: Object.keys(botHandler.bot.players).length
            });
        });

        botHandler.bot.on('playerUpdated', (player) => {
            this.emit(`playerUpdate:${clientId}`, {
                type: 'updated',
                player,
                playerList: Object.keys(botHandler.bot.players),
                playerCount: Object.keys(botHandler.bot.players).length
            });
        });

        botHandler.bot.on('playerLeft', (player) => {
            this.emit(`playerUpdate:${clientId}`, {
                type: 'left',
                player,
                playerList: Object.keys(botHandler.bot.players),
                playerCount: Object.keys(botHandler.bot.players).length
            });
        });

        botHandler.bot.on('kicked', (reason) => {
            let reasonText = '';
            if (typeof reason === 'string') {
                reasonText = reason;
            } else if (typeof reason === 'object' && reason !== null) {
                if (reason.value && reason.value.text && typeof reason.value.text.value === 'string') {
                    reasonText = reason.value.text.value;
                } else if (reason.text && typeof reason.text.value === 'string') {
                    reasonText = reason.text.value;
                } else {
                    reasonText = JSON.stringify(reason, null, 2);
                }
            } else {
                reasonText = String(reason);
            }

            const kickedMessage = {
                timestamp: new Date().toISOString(),
                text: `Bot wurde gekickt: ${reasonText}`
            };
            messages.push(kickedMessage);
            this.emit(`messageUpdate:${clientId}`, kickedMessage);
            this.bots[clientId].status = 'errored';
        });

        botHandler.bot.on('error', (err) => {
            const errorMessage = {
                timestamp: new Date().toISOString(),
                text: `Bot-Error: ${err.message}`
            };
            messages.push(errorMessage);
            this.emit(`messageUpdate:${clientId}`, errorMessage);
            this.bots[clientId].status = 'errored';
            const statusMessage = {
                timestamp: new Date().toISOString(),
                text: "Status geändert auf 'errored'."
            };
            this.emit(`messageUpdate:${clientId}`, statusMessage);
        });

        botHandler.bot.on('end', () => {
            const endMessage = {
                timestamp: new Date().toISOString(),
                text: 'Bot hat die Verbindung verloren (end).'
            };
            messages.push(endMessage);
            this.emit(`messageUpdate:${clientId}`, endMessage);
            this.bots[clientId].status = 'errored';
        });

        this.bots[clientId] = {
            botHandler,
            status: 'running',
            messages,
            config: clientConfig,
            viewerPort
        };
    }

    stopBot(clientId) {
        const botData = this.bots[clientId];
        if (!botData) return;
        if (botData.status === 'running' || botData.status === 'errored') {
            botData.botHandler.markAsStoppedByUser();
            botData.botHandler.bot.quit();
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
        if (!this.bots[clientId]) return [];
        return this.bots[clientId].botHandler.bot.players;
    }

    getMaxPlayers(clientId) {
        if (!this.bots[clientId]) return 0;
        return this.bots[clientId].botHandler.bot.game.maxPlayers || 0;
    }

    getPlayerAmount(clientId) {
        if (!this.bots[clientId]) return 0;
        return this.bots[clientId].botHandler.bot.players.length;
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
            botData.botHandler.bot.chat(message);
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