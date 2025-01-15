const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const OpenAI = require('openai');
const { Vec3 } = require('vec3');
const actionHandlers = require('./actionHandlers'); // Import the action handlers

class BotHandler {
    constructor(options) {
        this.username = options.accountData.username;
        this.auth = options.auth || 'microsoft';
        this.version = options.version || '1.20.4';
        this.blacklist = options.blacklist || [];
        this.autorestart = options.autorestart || false;

        this.serverConfig = options.serverConfig || {};
        this._stoppedByUser = false;

        this.chatGptConfig = options.modules?.chatgpt || {};
        if (this.chatGptConfig.enabled && this.chatGptConfig.apiKey) {
            this.openai = new OpenAI({
                apiKey: this.chatGptConfig.apiKey
            });
        }
        this.autoShopConfig = options.modules?.autoshop || {};

        this.activeTransactions = {}; // Track active transactions

        try {
            this.bot = mineflayer.createBot({
                host: this.serverConfig.hostname,
                username: this.username,
                auth: this.auth,
                version: this.version,

                // Updated: MSA Code Handling via event emit instead of .push()
                onMsaCode: (data) => {
                    const msaMessage = {
                        timestamp: new Date().toISOString(),
                        text: `Um dich zu authentifizieren, gehe hier: ${data.verification_uri} und gib den Code ${data.user_code} ein.`
                    };
                    // Emit a custom 'msaCode' event
                    this.bot.emit('msaCode', msaMessage);
                }
            });
        } catch (error) {
            console.error(`[ERROR] Bot konnte nicht erstellt werden: ${error.message}`);
            return;
        }

        this.bot.loadPlugin(pathfinder);
        this.setupEvents();

        this.hooks = options.modules?.hooks || [];
        this.setupHooks();
    }

    /**
     * Sets up the core Mineflayer events that are essential for the bot's functionality.
     */
    setupEvents() {
        // Whisper Event
        this.bot.on('whisper', (username, message) => {
            if (username === this.bot.username) return;
            this.handleChat(username, message);
        });

        // Spawn Event
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

        // Message Event
        this.bot.on('message', (message) => {
            try {
                const msgText = message.toString();
                const chatMessagePattern = /^\[.*? --> dir\] (.+)$/; // Extract message after '] '
                const match = msgText.match(chatMessagePattern);

                if (match && match[1]) {
                    const chatMessage = match[1].trim();
                    const usernamePattern = /^\[(.*?) ● (.*?) --> dir\]/; // Username pattern
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

        // Kicked Event
        this.bot.on('kicked', (reason) => {
            console.warn(`Bot was kicked for reason: ${reason}`);
            if (this.autorestart && !this._stoppedByUser) {
                this.rejoinAfterDelay();
            }
        });

        // Error Event
        this.bot.on('error', (err) => {
            console.error("Bot encountered an error:", err);
            if (this.autorestart && !this._stoppedByUser) {
                this.rejoinAfterDelay();
            }
        });

        // Additional Core Events (Optional)
        // Add more core event handlers here if necessary
    }

    /**
     * Registers all hooks by attaching them to the respective Mineflayer events.
     */
    setupHooks() {
        if (!Array.isArray(this.hooks)) {
            console.warn("[BotHandler] Hooks should be an array.");
            return;
        }

        this.hooks.forEach((hook) => {
            if (!hook.event || !hook.type) {
                console.warn(`[BotHandler] Invalid hook configuration: ${JSON.stringify(hook)}`);
                return;
            }

            // Avoid attaching the same event multiple times for performance
            this.bot.on(hook.event, async (data) => {
                try {
                    await this.executeHook(hook, data, { username: data.username || 'unknown' });
                } catch (error) {
                    console.error(`[BotHandler] Error executing hook '${hook.name}':`, error);
                }
            });
        });
    }

    /**
     * Executes a given hook based on its type and associated data.
     * @param {Object} hook - The hook configuration object.
     * @param {any} data - The data passed from the event.
     * @param {Object} context - Additional context for action handlers.
     */
    async executeHook(hook, data, context = {}) {
        if (!hook.type || !hook.data) {
            console.warn(`[BotHandler] Hook '${hook.name}' is missing type or data.`);
            return;
        }

        // Execute the main action of the hook
        await this.executeAction(hook.type, hook.data.typeData, context);

        // Process actions with conditions
        if (Array.isArray(hook.data.actions)) {
            for (const action of hook.data.actions) {
                if (this.evaluateConditions(action.conditions, context)) {
                    await this.executeAction(action.type, action.typeData, context);
                }
            }
        }

        // Process nested hooks recursively
        if (Array.isArray(hook.data.nestedHooks)) {
            for (const nestedHook of hook.data.nestedHooks) {
                await this.executeHook(nestedHook, data, context);
            }
        }
    }

    /**
     * Executes a specific action based on its type.
     * @param {string} actionType - The type of action to execute.
     * @param {Object} typeData - The data associated with the action.
     * @param {Object} context - Additional context for action handlers.
     */
    async executeAction(actionType, typeData, context) {
        const handler = actionHandlers[actionType];
        if (handler) {
            try {
                await handler(this.bot, typeData, context);
                console.log(`[BotHandler] Executed action '${actionType}' with data:`, typeData);
            } catch (error) {
                console.error(`[BotHandler] Error executing action '${actionType}':`, error);
            }
        } else {
            console.warn(`[BotHandler] No handler found for action type '${actionType}'.`);
        }
    }

    /**
     * Evaluates a list of conditions to determine if an action should be executed.
     * @param {Array} conditions - The list of conditions to evaluate.
     * @param {Object} context - Additional context for condition evaluation.
     * @returns {boolean} - True if all conditions are met, else false.
     */
    evaluateConditions(conditions = [], context = {}) {
        for (const condition of conditions) {
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
                // Add more operators as needed
                default:
                    console.warn(`[BotHandler] Unsupported operator '${operator}' in condition.`);
                    return false;
            }
        }
        return true;
    }

    /**
     * Resolves placeholders in a string (e.g., {{username}}).
     * @param {string} value - The string containing placeholders.
     * @param {Object} context - The context to replace placeholders.
     * @returns {string} - The string with placeholders resolved.
     */
    resolvePlaceholders(value, context = {}) {
        if (typeof value !== 'string') return value;
        return value.replace(/{{\s*(\w+)\s*}}/g, (_, key) => context[key] || '');
    }

    /**
     * Marks the bot as stopped by the user to prevent automatic restarts.
     */
    markAsStoppedByUser() {
        this._stoppedByUser = true;
    }

    /**
     * Attempts to rejoin the server after a delay.
     */
    rejoinAfterDelay() {
        setTimeout(() => {
            console.log("[BotHandler] Attempting to rejoin the server...");
            this.bot.emit('rejoinTrigger');
            // Implement rejoin logic as needed
        }, 2000);
    }

    /**
     * Navigates the bot to the specified NPC location and attempts to interact.
     * @param {Vec3} target - The target position vector.
     */
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

    /**
     * Handles incoming chat messages and executes commands like GPT and Auto-Shop.
     * @param {string} username - The username of the sender.
     * @param {string} message - The message content.
     */
    async handleChat(username, message) {
        const [command, ...args] = message.split(' ');

        // GPT Command Handling
        if (command === 'gpt' && this.openai) {
            const prompt = args.join(' ');
            const data = {
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    }
                ],
                max_tokens: 100,
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

        // Auto-Shop Command Handling
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

    /**
     * Initiates a purchase transaction for a user.
     * @param {string} username - The username of the buyer.
     * @param {number} price - The total price of the item(s).
     * @param {string} itemName - The name of the item.
     * @param {Object} chest - The chest configuration containing the item.
     * @param {number} amount - The quantity of the item.
     */
    async initiatePurchase(username, price, itemName, chest, amount) {
        // Prevent multiple transactions for the same user
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

    /**
     * Checks if the user has made the required payment within a timeout period.
     * @param {string} username - The username of the buyer.
     * @param {number} price - The total price of the item(s).
     * @param {string} itemName - The name of the item.
     * @param {Object} chest - The chest configuration containing the item.
     * @param {number} amount - The quantity of the item.
     * @returns {Promise<void>}
     */
    async checkForPayment(username, price, itemName, chest, amount) {
        const moneyReceivedPattern = new RegExp(`» You have received (\\d+[.,]?\\d*) Gold from [^\\s]+ ● ${username}\\.`, 'i');
        const timeoutDuration = 30000; // 30 seconds for payment

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
                        this.bot.whisper(username, `Insufficient payment. Expected: ${price} Gold, received: ${receivedAmount} Gold.`);
                        await this.refund(username, receivedAmount);
                        reject(new Error('Insufficient payment.'));
                    }
                }
            };

            this.bot.on('message', messageHandler);

            // Set up timeout to handle cases where no payment is made
            timeoutHandle = setTimeout(async () => {
                this.bot.removeListener('message', messageHandler);
                this.bot.whisper(username, 'Payment timeout. Please try the purchase again.');
                await this.refund(username);
                await this.restoreItems(username);
                reject(new Error('Payment timeout.'));
            }, timeoutDuration);
        });
    }

    /**
     * Delivers the purchased item(s) to the user.
     * @param {string} username - The username of the buyer.
     * @param {Object} chest - The chest configuration containing the item.
     * @param {string} itemName - The name of the item.
     * @param {number} amount - The quantity of the item.
     * @param {number} price - The total price of the item(s).
     */
    async deliverItem(username, chest, itemName, amount, price) {
        try {
            // Navigate to the chest's plot
            this.bot.chat(`/p h ${chest.plot}`);

            const chestLocation = new Vec3(chest.x, chest.y, chest.z);

            await this.goToTarget(chestLocation);

            const chestBlock = this.bot.blockAt(chestLocation);
            if (!chestBlock) {
                throw new Error(`No block found at chest position: ${chestLocation}`);
            }

            const container = await this.bot.openContainer(chestBlock);
            const itemInChest = container.containerItems().find(i => i.name === itemName);

            if (itemInChest && itemInChest.count >= amount) {
                await container.withdraw(itemInChest.type, null, amount);
                container.close();

                // Short delay to ensure inventory updates
                await new Promise(resolve => setTimeout(resolve, 500));

                // Check inventory after withdrawal
                const inventoryItem = this.bot.inventory.findInventoryItem(itemInChest.type, null);
                const inventoryCount = inventoryItem ? inventoryItem.count : 0;
                console.log(`[DEBUG] Inventory after withdrawal: ${inventoryCount} ${itemName}`);

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
                        console.log(`[DEBUG] Delivered ${amount} ${itemName} to ${username}.`);
                        this.bot.whisper(username, `${amount} ${itemName} have been successfully delivered. Thank you for your purchase!`);

                        const updatedItem = this.bot.inventory.findInventoryItem(itemInChest.type, null);
                        const updatedCount = updatedItem ? updatedItem.count : 0;
                        console.log(`[DEBUG] Inventory after delivery: ${updatedCount} ${itemName}`);

                        if (updatedCount > 0) {
                            await this.goToTarget(chestLocation);
                            const depositContainerAfter = await this.bot.openContainer(chestBlock);
                            await depositContainerAfter.deposit(itemInChest.type, null, updatedCount);
                            depositContainerAfter.close();
                        }
                    } else {
                        this.bot.chat(`/pay ${username} ${price}`);
                        this.bot.whisper(username, `You are not near me, so the purchase was canceled. Please come closer and try again.`);
                    }
                }
            } else {
                container.close();
                this.bot.chat('/pay ' + username + ' ' + price);
                this.bot.whisper(username, `I don't have enough ${itemName} in the chest. Currently, I have ${itemInChest ? itemInChest.count : 0} available.`);
            }
        } catch (error) {
            console.error(`[ERROR] Delivering items to ${username} failed:`, error);
            await this.refund(username, price);
            await this.restoreItems(username, itemName, amount);
            throw error;
        }
    }

    /**
     * Navigates the bot to a target location.
     * @param {Vec3} target - The target position vector.
     * @returns {Promise<void>}
     */
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
                console.error(`[ERROR] Navigation to target failed:`, error);
                reject(error);
            }
        });
    }

    /**
     * Refunds the user for their purchase.
     * @param {string} username - The username of the buyer.
     * @param {number|null} amount - The amount to refund. If null, uses the transaction price.
     */
    async refund(username, amount = null) {
        try {
            const refundAmount = amount || this.activeTransactions[username]?.price;
            if (refundAmount) {
                this.bot.chat(`/pay ${username} ${refundAmount}`);
                this.bot.whisper(username, `Your payment of ${refundAmount} Gold has been refunded.`);
                console.log(`[DEBUG] Refunded ${refundAmount} Gold to ${username}.`);
            } else {
                console.warn(`[WARN] No amount specified for refund to ${username}.`);
                this.bot.whisper(username, `There was an issue refunding your payment. Please contact support.`);
            }
        } catch (error) {
            console.error(`[ERROR] Refunding ${username} failed:`, error);
        }
    }

    /**
     * Restores items to the chest in case of a failed transaction.
     * @param {string} username - The username of the buyer.
     * @param {string|null} itemName - The name of the item to restore.
     * @param {number|null} amount - The quantity of the item to restore.
     */
    async restoreItems(username, itemName = null, amount = null) {
        try {
            const transaction = this.activeTransactions[username];
            if (!transaction) return;

            const chest = transaction.chest;
            const chestLocation = new Vec3(chest.x, chest.y, chest.z);
            await this.goToTarget(chestLocation);
            const chestBlock = this.bot.blockAt(chestLocation);
            if (!chestBlock) {
                throw new Error(`No block found at chest position: ${chestLocation}`);
            }

            const container = await this.bot.openContainer(chestBlock);
            if (itemName && amount) {
                const itemId = this.bot.registry.itemsByName[itemName]?.id;
                if (itemId) {
                    await container.deposit(itemId, null, amount);
                    this.bot.whisper(username, `The items have been successfully returned to the chest.`);
                    console.log(`[DEBUG] Restored ${amount} ${itemName} to the chest.`);
                } else {
                    console.warn(`[WARN] Item ID for '${itemName}' not found. Cannot restore.`);
                }
            } else {
                // Optional: Handle restoring multiple items or specific scenarios
                this.bot.whisper(username, `Items have been returned to the chest.`);
                console.log(`[DEBUG] Items for ${username} have been returned to the chest.`);
            }
            container.close();
        } catch (error) {
            console.error(`[ERROR] Restoring items for ${username} failed:`, error);
        }
    }

    /**
     * Checks if a message contains any blacklisted words.
     * @param {string} message - The message content.
     * @returns {boolean} - True if blacklisted, else false.
     */
    isBlacklisted(message) {
        return this.blacklist.some(b => message.includes(b));
    }
}

module.exports = BotHandler;
