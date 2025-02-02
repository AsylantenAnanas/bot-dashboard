// src/services/bedrockBotManager.js
const EventEmitter = require('events');
const BedrockBotHandler = require('./bedrockBotHandler');
const AnsiToHtml = require('ansi-to-html');
const ansiToHtml = new AnsiToHtml();

class BedrockBotManager extends EventEmitter {
  constructor() {
    super();
    this.bots = {};
    // Verwende einen anderen Viewer-Portbereich, falls notwendig:
    this.nextViewerPort = 3100;
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
    const startMessage = { timestamp: new Date().toISOString(), text: 'Bedrock Bot wird gestartet...' };
    messages.push(startMessage);
    this.emit(`messageUpdate:${clientId}`, startMessage);

    const botHandler = new BedrockBotHandler(clientConfig);
    const viewerPort = this.nextViewerPort++;
    // Hier könntest du, falls vorhanden, einen Bedrock-Viewer integrieren.

    botHandler.bot.on('rejoinTrigger', () => {
      this.stopBot(clientId);
      this.startBot(clientConfig);
    });

    botHandler.bot.on('message', (jsonMsg) => {
      const message = {
        timestamp: new Date().toISOString(),
        text: jsonMsg.toString()
      };
      messages.push(message);
      this.emit(`messageUpdate:${clientId}`, message);
    });

    botHandler.bot.on('kicked', (reason) => {
      const kickedMessage = {
        timestamp: new Date().toISOString(),
        text: `Bedrock Bot wurde gekickt: ${reason}`
      };
      messages.push(kickedMessage);
      this.emit(`messageUpdate:${clientId}`, kickedMessage);
      this.bots[clientId].status = 'errored';
    });

    botHandler.bot.on('error', (err) => {
      const errorMessage = {
        timestamp: new Date().toISOString(),
        text: `Bedrock Bot-Error: ${err.message}`
      };
      messages.push(errorMessage);
      this.emit(`messageUpdate:${clientId}`, errorMessage);
      this.bots[clientId].status = 'errored';
    });

    botHandler.bot.on('end', () => {
      const endMessage = {
        timestamp: new Date().toISOString(),
        text: 'Bedrock Bot hat die Verbindung verloren (end).'
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
      const stoppedMessage = { timestamp: new Date().toISOString(), text: 'Bedrock Bot ist jetzt gestoppt.' };
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
    return this.bots[clientId].botHandler.bot.game
      ? this.bots[clientId].botHandler.bot.game.maxPlayers
      : 0;
  }

  getPlayerAmount(clientId) {
    if (!this.bots[clientId]) return 0;
    return Object.keys(this.bots[clientId].botHandler.bot.players).length;
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
        <title>All Bedrock Clients Chat Log</title>
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
        <h1>All Bedrock Clients Chat Log</h1>
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
}

module.exports = new BedrockBotManager();