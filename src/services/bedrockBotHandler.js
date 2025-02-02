// src/services/bedrockBotHandler.js
const mineflayer = require('mineflayer-bedrock'); // Bedrock-spezifische Version (bitte installieren: npm i mineflayer-bedrock)
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { Vec3 } = require('vec3');
const actionHandlers = require('./actionHandlers');

class BedrockBotHandler {
  constructor(options) {
    this.username = options.accountData.username;
    // Bei Bedrock erfolgt häufig eine Offline-Authentifizierung
    this.auth = options.auth || 'offline';
    this.serverConfig = options.serverConfig || {};
    this._stoppedByUser = false;
    
    // GPT, AutoShop etc. können auch hier konfiguriert werden, falls benötigt.
    this.chatGptConfig = options.modules?.chatgpt || {};
    if (this.chatGptConfig.enabled && this.chatGptConfig.apiKey) {
      // Initialisierung von OpenAI oder anderem, falls erforderlich
      // (Implementierung analog zur Java-Version)
    }
    this.autoShopConfig = options.modules?.autoshop || {};
    this.activeTransactions = {};

    // Erstelle den Bedrock-Bot (Standardport für Bedrock ist 19132)
    try {
      this.bot = mineflayer.createBot({
        host: this.serverConfig.hostname,
        port: this.serverConfig.port || 19132,
        username: this.username,
        auth: this.auth,
        version: this.serverConfig.version // Beispiel: Bedrock-Version (anpassen, falls nötig)
        // Weitere bedrock-spezifische Optionen können hier hinzugefügt werden.
      });
    } catch (error) {
      console.error(`[ERROR] Bedrock Bot konnte nicht erstellt werden: ${error.message}`);
      return;
    }

    // Lade das Pathfinder-Plugin (sofern kompatibel)
    this.bot.loadPlugin(pathfinder);
    this.setupEvents();
    
    // Hooks einrichten (analog wie bei der Java-Version)
    this.hooks = (options.modules?.hooks && Array.isArray(options.modules.hooks))
      ? options.modules.hooks
      : [];
    this.setupHooks();
  }

  setupEvents() {
    // Beispiel: Registrierung von Ereignissen (anpassen, wenn sich die Bedrock-API unterscheidet)
    this.bot.on('message', (message) => {
      console.log('[BedrockBot] Nachricht:', message.toString());
      // Zusätzliche Verarbeitung, z. B. Chatbefehle, können hier implementiert werden.
    });

    this.bot.on('spawn', () => {
      console.log('[BedrockBot] Bot gespawnt');
      // Falls du beim Spawn z. B. zu einem NPC navigieren möchtest, hier implementieren.
    });

    this.bot.on('kicked', (reason) => {
      console.warn(`[BedrockBot] Bot wurde gekickt: ${reason}`);
      if (this.autorestart && !this._stoppedByUser) {
        this.rejoinAfterDelay();
      }
    });

    this.bot.on('error', (err) => {
      console.error('[BedrockBot] Fehler:', err);
      if (this.autorestart && !this._stoppedByUser) {
        this.rejoinAfterDelay();
      }
    });
  }

  setupHooks() {
    if (!this.hooks || this.hooks.length === 0) return;
    this.hooks.forEach((hook) => {
      if (!hook.name || !hook.data) {
        console.warn(`[BedrockBotHandler] Ungültige Hook-Konfiguration: ${JSON.stringify(hook)}`);
        return;
      }
      const eventName = hook.data.event || hook.name;
      this.bot.on(eventName, async (eventData) => {
        try {
          await this.executeHook(hook, eventData, { username: eventData?.username || 'unknown' });
        } catch (error) {
          console.error(`[BedrockBotHandler] Fehler beim Ausführen des Hooks '${hook.name}':`, error);
        }
      });
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
        console.error(`[BedrockBotHandler] Fehler beim Ausführen der Aktion '${actionType}':`, error);
      }
    } else {
      console.warn(`[BedrockBotHandler] Kein Handler für Aktionstyp '${actionType}' gefunden.`);
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
          console.warn(`[BedrockBotHandler] Unbekannter Operator '${operator}'.`);
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
      console.log("[BedrockBotHandler] Versuch, dem Server erneut beizutreten...");
      this.bot.emit('rejoinTrigger');
    }, 2000);
  }
}

module.exports = BedrockBotHandler;