const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const OpenAI = require('openai');
const { Vec3 } = require('vec3');
const actionHandlers = require('./actionHandlers');
const SocksProxyAgent = require('socks-proxy-agent'); // npm i socks-proxy-agent

class BotHandler {
  constructor(options) {
    this.username = options.accountData.username;
    this.auth = options.auth || 'microsoft';
    this.version = options.version || '1.20.1';
    this.blacklist = options.blacklist || [];
    this.autorestart = options.autorestart || false;

    this.serverConfig = options.serverConfig || {};
    this.accountData = options.accountData || {};
    this._stoppedByUser = false;

    // GPT
    this.chatGptConfig = options.modules?.chatgpt || {};
    if (this.chatGptConfig.enabled && this.chatGptConfig.apiKey) {
      this.openai = new OpenAI({ apiKey: this.chatGptConfig.apiKey });
    }
    this.autoShopConfig = options.modules?.autoshop || {};
    this.activeTransactions = {};

    // Proxies aus accountData lesen
    let proxyAgent = null;
    if (Array.isArray(this.accountData.proxies) && this.accountData.proxies.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.accountData.proxies.length);
      const chosenProxy = this.accountData.proxies[randomIndex];
      console.log(`[INFO] Using proxy for Bot: ${chosenProxy}`);
      proxyAgent = new SocksProxyAgent(`socks://${chosenProxy}`);
    }

    try {
      this.bot = mineflayer.createBot({
        host: this.serverConfig.hostname,
        username: this.username,
        auth: this.auth,
        version: this.version,
        agent: proxyAgent,
        onMsaCode: (data) => {
          const msaMessage = {
            timestamp: new Date().toISOString(),
            text: `Um dich zu authentifizieren, gehe hier: ${data.verification_uri} und gib den Code ${data.user_code} ein.`
          };
          this.bot.emit('msaCode', msaMessage);
        }
      });
    } catch (error) {
      console.error(`[ERROR] Bot konnte nicht erstellt werden: ${error.message}`);
      return;
    }

    this.bot.loadPlugin(pathfinder);
    this.setupEvents();

    // Hooks
    this.hooks = (options.modules?.hooks && Array.isArray(options.modules.hooks))
      ? options.modules.hooks
      : [];
    this.setupHooks();
  }

  setupEvents() {
    this.bot.on('whisper', (username, message) => {
      if (username === this.bot.username) return;
      this.handleChat(username, message);
    });

    this.bot.on('spawn', () => {
      if (
        Number.isFinite(this.serverConfig.npcX) &&
        Number.isFinite(this.serverConfig.npcY) &&
        Number.isFinite(this.serverConfig.npcZ)
      ) {
        this.goToTargetAndHitNPC(new Vec3(
          this.serverConfig.npcX,
          this.serverConfig.npcY,
          this.serverConfig.npcZ
        ));
      }
    });

    this.bot.on('message', (message) => {
      try {
        const msgText = message.toString();
        const chatMessagePattern = /^\[.*? --> dir\] (.+)$/;
        const match = msgText.match(chatMessagePattern);
        if (match && match[1]) {
          const chatMessage = match[1].trim();
          const usernamePattern = /^\[(.*?) ● (.*?) --> dir\]/;
          const usernameMatch = msgText.match(usernamePattern);
          if (usernameMatch && usernameMatch[2]) {
            const username = usernameMatch[2].trim();
            this.handleChat(username, chatMessage);
          }
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    });

    this.bot.on('kicked', (reason) => {
      console.warn(`Bot was kicked for reason: ${reason}`);
      if (this.autorestart && !this._stoppedByUser) {
        this.rejoinAfterDelay();
      }
    });

    this.bot.on('error', (err) => {
      console.error("Bot encountered an error:", err);
      if (this.autorestart && !this._stoppedByUser) {
        this.rejoinAfterDelay();
      }
    });
  }

  setupHooks() {
    console.info(`[BotHandler] Starte das Setup von ${this.hooks ? this.hooks.length : 0} Hooks...`);

    if (!this.hooks || this.hooks.length === 0) {
      console.info(`[BotHandler] Keine Hooks definiert – Setup wird beendet.`);
      return;
    }

    this.hooks.forEach((hook, index) => {
      console.group(`[BotHandler] Verarbeite Hook #${index + 1}: ${hook.name || 'Unbenannt'}`);
      console.debug(`[BotHandler] Hook-Daten: ${JSON.stringify(hook)}`);

      if (!hook.name || !hook.data) {
        console.warn(`[BotHandler] Ungültige Hook-Konfiguration: 'name' und 'data' sind erforderlich. Hook: ${JSON.stringify(hook)}`);
        console.groupEnd();
        return;
      }

      const eventName = hook.data.event || hook.name;
      console.info(`[BotHandler] Registriere Hook '${hook.name}' für Event '${eventName}'.`);

      this.bot.on(eventName, async (mineflayerEventData) => {
        console.group(`[BotHandler] Event '${eventName}' ausgelöst für Hook '${hook.name}'`);
        console.debug(`[BotHandler] Empfange Event-Daten: ${JSON.stringify(mineflayerEventData)}`);

        try {
          console.debug(`[BotHandler] Starte Ausführung von Hook '${hook.name}'...`);
          await this.executeHook(hook, mineflayerEventData, {
            username: mineflayerEventData?.username || 'unknown'
          });
          console.debug(`[BotHandler] Hook '${hook.name}' erfolgreich ausgeführt.`);
        } catch (error) {
          console.error(`[BotHandler] Fehler bei der Ausführung von Hook '${hook.name}':`, error);
        }

        console.groupEnd();
      });

      console.groupEnd();
    });
  }

  async executeHook(hook, data, context = {}) {
    if (!hook.data) return;
    if (Array.isArray(hook.data.actions)) {
      for (const actionObj of hook.data.actions) {
        if (this.evaluateConditions(actionObj.conditions, context)) {
          await this.executeAction(actionObj.type, actionObj.typeData, context);
        }
      }
    }
    if (Array.isArray(hook.data.nestedHooks)) {
      for (const nested of hook.data.nestedHooks) {
        await this.executeNestedHook(nested, data, context);
      }
    }
  }

  async executeNestedHook(nestedHook, data, context) {
    if (!nestedHook.data) return;
    if (Array.isArray(nestedHook.data.actions)) {
      for (const actionObj of nestedHook.data.actions) {
        if (this.evaluateConditions(actionObj.conditions, context)) {
          await this.executeAction(actionObj.type, actionObj.typeData, context);
        }
      }
    }
    if (Array.isArray(nestedHook.data.nestedHooks)) {
      for (const deeperHook of nestedHook.data.nestedHooks) {
        await this.executeNestedHook(deeperHook, data, context);
      }
    }
  }

  async executeAction(actionType, typeData, context) {
    const handler = actionHandlers[actionType];
    if (handler) {
      try {
        await handler(this.bot, typeData, context);
      } catch (error) {
        console.error(`[BotHandler] Error executing action '${actionType}':`, error);
      }
    } else {
      console.warn(`[BotHandler] No handler found for action type '${actionType}'.`);
    }
  }

  evaluateConditions(conditions = [], context = {}) {
    for (const condition of conditions || []) {
      const { field, operator, compareValue } = condition;
      const fieldValue = this.resolvePlaceholders(field, context);
      const compareResolved = this.resolvePlaceholders(compareValue, context);

      switch (operator) {
        case 'equals':
          if (fieldValue !== compareResolved) return false;
          break;
        case 'not_equals':
          if (fieldValue === compareResolved) return false;
          break;
        case 'contains':
          if (typeof fieldValue === 'string' && !fieldValue.includes(compareResolved)) return false;
          break;
        case 'startsWith':
          if (typeof fieldValue === 'string' && !fieldValue.startsWith(compareResolved)) return false;
          break;
        case 'endsWith':
          if (typeof fieldValue === 'string' && !fieldValue.endsWith(compareResolved)) return false;
          break;
        default:
          console.warn(`[BotHandler] Unsupported operator '${operator}'.`);
          return false;
      }
    }
    return true;
  }

  resolvePlaceholders(value, context = {}) {
    if (typeof value !== 'string') return value;
    return value.replace(/{{\s*(\w+)\s*}}/g, (_, key) => context[key] || '');
  }

  markAsStoppedByUser() {
    this._stoppedByUser = true;
  }

  rejoinAfterDelay() {
    setTimeout(() => {
      console.log("[BotHandler] Attempting to rejoin the server...");
      this.bot.emit('rejoinTrigger');
    }, 2000);
  }

  goToTargetAndHitNPC(target) {
    const defaultMove = new Movements(this.bot);
    this.bot.pathfinder.setMovements(defaultMove);
    const goal = new goals.GoalBlock(target.x, target.y, target.z);
    this.bot.pathfinder.setGoal(goal, true);

    const interval = setInterval(() => {
      const pos = this.bot.entity.position;
      const distance = pos.distanceTo(target);
      if (distance < 2) {
        clearInterval(interval);
        this.bot.look(0, 0.2, true);

        setTimeout(() => {
          const npcName = this.serverConfig.npcName || 'modern_server';
          const nearestEntity = this.bot.nearestEntity(e => e.username === npcName);
          if (nearestEntity) {
            this.bot.attack(nearestEntity);
          }
        }, 500);
      }
    }, 1000);
  }

  async handleChat(username, message) {
    const [command, ...args] = message.split(' ');

    if (command === 'gpt' && this.openai) {
      const prompt = args.join(' ');
      const data = {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100
      };
      try {
        const response = await this.openai.chat.completions.create(data);
        const reply = response.choices[0].message.content.trim();
        this.bot.whisper(username, reply || 'No response received.');
      } catch (err) {
        console.error("Error during GPT request:", err);
        this.bot.whisper(username, 'There was an error processing your GPT request.');
      }
    }

    if (command === 'buy' && this.autoShopConfig.enabled) {
      const itemName = args[0];
      const amount = parseInt(args[1], 10) || 1;
      if (!itemName || isNaN(amount) || amount < 1) {
        this.bot.whisper(username, 'Invalid request. Format: buy <itemName> <amount>.');
        return;
      }
      const chest = this.autoShopConfig.chests.find(ch =>
        ch.items.some(item => item.itemName === itemName)
      );
      if (!chest) {
        console.warn("Item not available:", itemName);
        this.bot.whisper(username, `The item "${itemName}" is not available.`);
        return;
      }
      const item = chest.items.find(i => i.itemName === itemName);
      const price = item.pricePiece * amount;

      this.bot.whisper(username, `This costs ${price} Gold. Please transfer the amount, and the item will be delivered to you.`);
      this.initiatePurchase(username, price, itemName, chest, amount);
    }
  }

  async initiatePurchase(username, price, itemName, chest, amount) {
    if (this.activeTransactions[username]) {
      this.bot.whisper(username, 'You already have an ongoing transaction. Please wait a moment.');
      return;
    }
    this.activeTransactions[username] = { price, itemName, chest, amount };

    try {
      await this.checkForPayment(username, price, itemName, chest, amount);
    } catch (error) {
      console.error(`[ERROR] Transaction error for ${username}:`, error);
      await this.refund(username);
      await this.restoreItems(username);
    } finally {
      delete this.activeTransactions[username];
    }
  }

  async checkForPayment(username, price, itemName, chest, amount) {
    // » Du hast 250 Gold von King ● AsylantenAnanas erhalten.
    const moneyReceivedPattern = new RegExp(`» Du hast (\\d+[.,]?\\d*) Gold von [^\\s]+ ● ${username}\\ erhalten.`, 'i');
    const timeoutDuration = 30000; // 30 Sekunden

    return new Promise((resolve, reject) => {
      let timeoutHandle;

      const messageHandler = async (message) => {
        const msgText = message.toString();
        const match = msgText.match(moneyReceivedPattern);
        if (match) {
          const receivedAmount = parseInt(match[1].replace('.', '').replace(',', '.'), 10);
          if (receivedAmount >= price) {
            this.bot.removeListener('message', messageHandler);
            clearTimeout(timeoutHandle);
            try {
              await this.deliverItem(username, chest, itemName, amount, price);
              resolve();
            } catch (error) {
              reject(error);
            }
          } else {
            this.bot.removeListener('message', messageHandler);
            clearTimeout(timeoutHandle);
            this.bot.whisper(username, `Zuwenig Gold. Erwartet ${price}, erhalten ${receivedAmount}.`);
            await this.refund(username, receivedAmount);
            reject(new Error('Zuwenig bezahlt.'));
          }
        }
      };

      this.bot.on('message', messageHandler);
      timeoutHandle = setTimeout(async () => {
        this.bot.removeListener('message', messageHandler);
        this.bot.whisper(username, 'Zeit für Bezahlung abgelaufen.');
        await this.refund(username);
        await this.restoreItems(username);
        reject(new Error('Timeout beim Bezahlen.'));
      }, timeoutDuration);
    });
  }

  async deliverItem(username, chest, itemName, amount, price) {
    try {
      this.bot.chat(`/p h ${chest.plot}`);
      const chestLocation = new Vec3(chest.x, chest.y, chest.z);
      await this.goToTarget(chestLocation);

      const chestBlock = this.bot.blockAt(chestLocation);
      if (!chestBlock) throw new Error(`Kein Block an: ${chestLocation}`);
      const container = await this.bot.openContainer(chestBlock);
      const itemInChest = container.containerItems().find(i => i.name === itemName);

      if (itemInChest && itemInChest.count >= amount) {
        await container.withdraw(itemInChest.type, null, amount);
        container.close();

        await new Promise(resolve => setTimeout(resolve, 500));

        const inventoryItem = this.bot.inventory.findInventoryItem(itemInChest.type, null);
        const inventoryCount = inventoryItem ? inventoryItem.count : 0;

        if (inventoryCount >= amount) {
          const excess = inventoryCount - amount;
          if (excess > 0) {
            const depositContainer = await this.bot.openContainer(chestBlock);
            await depositContainer.deposit(itemInChest.type, null, excess);
            depositContainer.close();
          }
          const player = this.bot.players[username];
          if (player && player.entity) {
            await this.goToTarget(player.entity.position);
            await this.bot.toss(itemInChest.type, null, amount);
            this.bot.whisper(username, `${amount} ${itemName} geliefert.`);
            const updatedItem = this.bot.inventory.findInventoryItem(itemInChest.type, null);
            const updatedCount = updatedItem ? updatedItem.count : 0;
            if (updatedCount > 0) {
              await this.goToTarget(chestLocation);
              const depositContainerAfter = await this.bot.openContainer(chestBlock);
              await depositContainerAfter.deposit(itemInChest.type, null, updatedCount);
              depositContainerAfter.close();
            }
          } else {
            this.bot.chat(`/pay ${username} ${price}`);
            this.bot.whisper(username, `Du bist nicht in meiner Nähe. Vorgang abgebrochen, Geld zurück.`);
          }
        }
      } else {
        container.close();
        this.bot.chat(`/pay ${username} ${price}`);
        this.bot.whisper(username, `Nicht genug "${itemName}" vorhanden.`);
      }
    } catch (error) {
      console.error(`[ERROR] Lieferung fehlgeschlagen:`, error);
      await this.refund(username, price);
      await this.restoreItems(username, itemName, amount);
      throw error;
    }
  }

  async goToTarget(target) {
    return new Promise((resolve, reject) => {
      try {
        const defaultMove = new Movements(this.bot);
        this.bot.pathfinder.setMovements(defaultMove);
        const goal = new goals.GoalBlock(target.x, target.y, target.z);
        this.bot.pathfinder.setGoal(goal, true);

        const interval = setInterval(() => {
          const pos = this.bot.entity.position;
          const distance = pos.distanceTo(target);
          if (distance < 2) {
            clearInterval(interval);
            resolve();
          }
        }, 1000);
      } catch (error) {
        console.error(`[ERROR] Bewegung fehlgeschlagen:`, error);
        reject(error);
      }
    });
  }

  async refund(username, amount = null) {
    try {
      const refundAmount = amount || this.activeTransactions[username]?.price;
      if (refundAmount) {
        this.bot.chat(`/pay ${username} ${refundAmount}`);
        this.bot.whisper(username, `Dein Geld (${refundAmount} Gold) wurde zurückgezahlt.`);
      } else {
        this.bot.whisper(username, `Fehler bei Rückerstattung. Bitte Support kontaktieren.`);
      }
    } catch (error) {
      console.error(`[ERROR] Refund fehlgeschlagen:`, error);
    }
  }

  async restoreItems(username, itemName = null, amount = null) {
    try {
      const transaction = this.activeTransactions[username];
      if (!transaction) return;
      const chest = transaction.chest;
      const chestLocation = new Vec3(chest.x, chest.y, chest.z);
      await this.goToTarget(chestLocation);

      const chestBlock = this.bot.blockAt(chestLocation);
      if (!chestBlock) throw new Error(`Kein Block an Position: ${chestLocation}`);
      const container = await this.bot.openContainer(chestBlock);

      if (itemName && amount) {
        const itemId = this.bot.registry.itemsByName[itemName]?.id;
        if (itemId) {
          await container.deposit(itemId, null, amount);
          this.bot.whisper(username, `Items zurück ins Lager.`);
        }
      } else {
        this.bot.whisper(username, `Items zurück ins Lager.`);
      }
      container.close();
    } catch (error) {
      console.error(`[ERROR] Wiederherstellung fehlgeschlagen:`, error);
    }
  }

  isBlacklisted(message) {
    return this.blacklist.some(b => message.includes(b));
  }

  // NEUE Funktion: Bereitet Scoreboard-Daten für den Viewer auf.
  // Liefert ein Objekt { entries: [ { name, score } ] }
  getScoreboardData() {
    const scoreboard = this.bot.scoreboard;
    let entries = [];
    if (scoreboard) {
      if (scoreboard.sidebar && scoreboard.sidebar.itemsMap && Object.keys(scoreboard.sidebar.itemsMap).length > 0) {
        entries = Object.values(scoreboard.sidebar.itemsMap);
      } else if (scoreboard.sidebar && scoreboard.sidebar.title && scoreboard.sidebar.title.value && scoreboard.sidebar.title.value.extra && scoreboard.sidebar.title.value.extra.value) {
        entries = scoreboard.sidebar.title.value.extra.value;
      } else if (scoreboard["1"] && scoreboard["1"].itemsMap && Object.keys(scoreboard["1"].itemsMap).length > 0) {
        entries = Object.values(scoreboard["1"].itemsMap);
      } else if (scoreboard["1"] && scoreboard["1"].title && scoreboard["1"].title.value && scoreboard["1"].title.value.extra && scoreboard["1"].title.value.extra.value) {
        entries = scoreboard["1"].title.value.extra.value;
      }
    }
    // Falls entries kein Array ist, versuchen wir es aus einem enthaltenen value zu extrahieren.
    if (!Array.isArray(entries)) {
      console.warn("Scoreboard entries is not an array, attempting to extract entries.value");
      if (entries && typeof entries === "object" && Array.isArray(entries.value)) {
        entries = entries.value;
      } else {
        entries = [];
      }
    }
    // Transformiere die Einträge in ein einheitliches Format.
    const transformed = entries.map(entry => {
      let name = "";
      let score = "";
      if (entry.name && entry.name.value) {
        name = entry.name.value;
      } else if (entry.text && entry.text.value) {
        name = entry.text.value;
      } else if (typeof entry === "string") {
        name = entry;
      }
      if (entry.score && entry.score.value !== undefined) {
        score = entry.score.value;
      }
      return { name, score };
    });
    return { entries: transformed };
  }
}

module.exports = BotHandler;
