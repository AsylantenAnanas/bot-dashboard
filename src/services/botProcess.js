const BotHandler = require('./botHandler');

let botHandler;

process.on('message', (message) => {
    if (message.type === 'start') {
        try {
            botHandler = new BotHandler(message.config);

            botHandler.bot.on('message', (jsonMsg) => {
                if (botHandler.isBlacklisted(jsonMsg.toString())) return;
                const msg = {
                    timestamp: new Date().toISOString(),
                    text: jsonMsg.toAnsi()
                };
                process.send({ type: 'message', payload: msg });
            });

            botHandler.bot.on('msaCode', (msaMessage) => {
                process.send({ type: 'msaCode', payload: msaMessage });
            });

            botHandler.bot.on('spawn', () => {
                const spawnMessage = {
                    timestamp: new Date().toISOString(),
                    text: `Bot ist gespawnt auf "${botHandler.serverConfig.hostname}".`
                };
                process.send({ type: 'spawn', payload: spawnMessage });
            });

            botHandler.bot.on('playerJoined', (player) => {
                process.send({
                    type: 'playerUpdate',
                    payload: {
                        type: 'joined',
                        player,
                        playerList: Object.keys(botHandler.bot.players),
                        playerCount: Object.keys(botHandler.bot.players).length
                    }
                });
            });

            botHandler.bot.on('playerUpdated', (player) => {
                process.send({
                    type: 'playerUpdate',
                    payload: {
                        type: 'updated',
                        player,
                        playerList: Object.keys(botHandler.bot.players),
                        playerCount: Object.keys(botHandler.bot.players).length
                    }
                });
            });

            botHandler.bot.on('playerLeft', (player) => {
                process.send({
                    type: 'playerUpdate',
                    payload: {
                        type: 'left',
                        player,
                        playerList: Object.keys(botHandler.bot.players),
                        playerCount: Object.keys(botHandler.bot.players).length
                    }
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
                process.send({ type: 'kicked', payload: kickedMessage });
            });

            botHandler.bot.on('error', (err) => {
                const errorMessage = {
                    timestamp: new Date().toISOString(),
                    text: `Bot-Error: ${err.message}`
                };
                process.send({ type: 'error', payload: errorMessage });
            });

            botHandler.bot.on('end', () => {
                const endMessage = {
                    timestamp: new Date().toISOString(),
                    text: 'Bot hat die Verbindung verloren (end).'
                };
                process.send({ type: 'end', payload: endMessage });
            });

        } catch (error) {
            process.send({ type: 'error', payload: {
                timestamp: new Date().toISOString(),
                text: `Fehler beim Erstellen des Bots: ${error.message}`
            }});
        }
    } else if (message.type === 'stop') {
        if (botHandler) {
            botHandler.markAsStoppedByUser();
            botHandler.bot.quit();
        }
    } else if (message.type === 'chat') {
        if (botHandler) {
            botHandler.bot.chat(message.payload);
        }
    }
});
