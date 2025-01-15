const { goals, Movements } = require('mineflayer-pathfinder');
const { Vec3 } = require('vec3');

module.exports = {
    /**
     * Sends a chat message.
     * Replaces placeholders like {{username}} with actual values from context.
     * @param {Object} bot - The Mineflayer bot instance.
     * @param {Object} data - The action data containing the message.
     * @param {Object} context - Additional context (e.g., username).
     */
    message: async (bot, data, context) => {
        if (!data.message) {
            bot.emit('message', 'Message action missing "message" field.');
            return;
        }
        const message = resolvePlaceholders(data.message, context);
        bot.chat(message);
    },

    /**
     * Sends a whisper message to a specific user.
     * @param {Object} bot - The Mineflayer bot instance.
     * @param {Object} data - The action data containing username and message.
     * @param {Object} context - Additional context (e.g., username).
     */
    whisper: async (bot, data, context) => {
        if (!data.username || !data.message) {
            bot.emit('message', 'Whisper action missing "username" or "message" field.');
            return;
        }
        const message = resolvePlaceholders(data.message, context);
        bot.whisper(data.username, message);
    },

    /**
     * Moves the bot to specified coordinates.
     * @param {Object} bot - The Mineflayer bot instance.
     * @param {Object} data - The action data containing x, y, z coordinates.
     */
    move: async (bot, data) => {
        const { x, y, z } = data;
        if (x === undefined || y === undefined || z === undefined) {
            bot.emit('message', 'Move action requires "x", "y", and "z" coordinates.');
            return;
        }

        const target = new Vec3(x, y, z);
        const defaultMove = new Movements(bot);
        bot.pathfinder.setMovements(defaultMove);
        const goal = new goals.GoalBlock(x, y, z);
        bot.pathfinder.setGoal(goal, false); // Set to false to not re-evaluate the path continuously
    },

    /**
     * Makes the bot wait for a specified duration.
     * @param {Object} bot - The Mineflayer bot instance.
     * @param {Object} data - The action data containing duration in seconds.
     */
    wait: async (bot, data) => {
        const duration = data.duration;
        if (duration === undefined || typeof duration !== 'number' || duration < 0) {
            bot.emit('message', 'Wait action requires a positive "duration" in seconds.');
            return;
        }
        await new Promise(resolve => setTimeout(resolve, duration * 1000));
    },

    /**
     * Digs a specific block type at given coordinates.
     * @param {Object} bot - The Mineflayer bot instance.
     * @param {Object} data - The action data containing blockType and coordinates.
     */
    dig: async (bot, data) => {
        const { blockType, x, y, z } = data;
        if (!blockType || x === undefined || y === undefined || z === undefined) {
            bot.emit('message', 'Dig action requires "blockType", "x", "y", and "z" fields.');
            return;
        }

        const targetPos = new Vec3(x, y, z);
        const block = bot.blockAt(targetPos);

        if (!block) {
            bot.emit('message', `No block found at (${x}, ${y}, ${z}).`);
            return;
        }

        if (block.name !== blockType) {
            bot.emit('message', `Block at (${x}, ${y}, ${z}) is not of type "${blockType}".`);
            return;
        }

        try {
            await bot.dig(block);
            bot.emit('message', `Dug block "${blockType}" at (${x}, ${y}, ${z}).`);
        } catch (error) {
            bot.emit('message', `Failed to dig block at (${x}, ${y}, ${z}): ${error.message}`);
        }
    },

    /**
     * Places a block of specified type at given coordinates and direction.
     * @param {Object} bot - The Mineflayer bot instance.
     * @param {Object} data - The action data containing blockType, coordinates, and direction.
     */
    place: async (bot, data) => {
        const { blockType, x, y, z, direction } = data;
        if (!blockType || x === undefined || y === undefined || z === undefined || !direction) {
            bot.emit('message', 'Place action requires "blockType", "x", "y", "z", and "direction" fields.');
            return;
        }

        const targetPos = new Vec3(x, y, z);
        const block = bot.blockAt(targetPos);

        if (!block) {
            bot.emit('message', `No block found at (${x}, ${y}, ${z}) to place against.`);
            return;
        }

        const directionOffset = getDirectionOffset(direction);
        if (!directionOffset) {
            bot.emit('message', `Invalid direction "${direction}". Use directions like north, south, east, west, up, down.`);
            return;
        }

        const referenceBlockPos = targetPos.offset(directionOffset);
        const referenceBlock = bot.blockAt(referenceBlockPos);

        if (!referenceBlock) {
            bot.emit('message', `No reference block found at (${referenceBlockPos.x}, ${referenceBlockPos.y}, ${referenceBlockPos.z}).`);
            return;
        }

        const item = bot.inventory.findInventoryItem(blockType, null);
        if (!item) {
            bot.emit('message', `Item "${blockType}" not found in inventory.`);
            return;
        }

        try {
            await bot.placeBlock(referenceBlock, directionOffset, item);
            bot.emit('message', `Placed block "${blockType}" at (${x}, ${y}, ${z}) facing "${direction}".`);
        } catch (error) {
            bot.emit('message', `Failed to place block: ${error.message}`);
        }
    },

    /**
     * Equips an item to a specified slot.
     * @param {Object} bot - The Mineflayer bot instance.
     * @param {Object} data - The action data containing slot and item name.
     */
    equip: async (bot, data) => {
        const { slot, item } = data;
        if (!slot || !item) {
            bot.emit('message', 'Equip action requires "slot" and "item" fields.');
            return;
        }

        const inventoryItem = bot.inventory.findInventoryItem(item, null);
        if (!inventoryItem) {
            bot.emit('message', `Item "${item}" not found in inventory.`);
            return;
        }

        try {
            await bot.equip(inventoryItem, slot);
            bot.emit('message', `Equipped "${item}" to slot "${slot}".`);
        } catch (error) {
            bot.emit('message', `Failed to equip item: ${error.message}`);
        }
    },

    /**
     * Attacks a target entity with specified strength.
     * @param {Object} bot - The Mineflayer bot instance.
     * @param {Object} data - The action data containing target and strength.
     */
    attack: async (bot, data) => {
        const { target, strength } = data;
        if (!target || strength === undefined || typeof strength !== 'number' || strength <= 0) {
            bot.emit('message', 'Attack action requires a valid "target" and positive "strength".');
            return;
        }

        const entity = bot.nearestEntity(e => e.username === target || e.id === target);
        if (!entity) {
            bot.emit('message', `Target entity "${target}" not found.`);
            return;
        }

        try {
            for (let i = 0; i < strength; i++) {
                bot.attack(entity);
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait half a second between attacks
            }
            bot.emit('message', `Attacked "${target}" with strength ${strength}.`);
        } catch (error) {
            bot.emit('message', `Failed to attack "${target}": ${error.message}`);
        }
    },

    /**
     * Uses an item on a target block or entity.
     * @param {Object} bot - The Mineflayer bot instance.
     * @param {Object} data - The action data containing item and target.
     */
    useItem: async (bot, data) => {
        const { item, target } = data;
        if (!item || !target) {
            bot.emit('message', 'UseItem action requires "item" and "target" fields.');
            return;
        }

        const inventoryItem = bot.inventory.findInventoryItem(item, null);
        if (!inventoryItem) {
            bot.emit('message', `Item "${item}" not found in inventory.`);
            return;
        }

        const targetEntity = bot.nearestEntity(e => e.username === target || e.id === target);
        const targetBlock = bot.blockAt(bot.entity.position.offset(0, -1, 1)); // Example: Adjust as needed

        if (targetEntity) {
            try {
                await bot.useItem(targetEntity);
                bot.emit('message', `Used "${item}" on entity "${target}".`);
            } catch (error) {
                bot.emit('message', `Failed to use item on entity: ${error.message}`);
            }
        } else if (targetBlock) {
            try {
                await bot.useItem(targetBlock);
                bot.emit('message', `Used "${item}" on block at (${targetBlock.position.x}, ${targetBlock.position.y}, ${targetBlock.position.z}).`);
            } catch (error) {
                bot.emit('message', `Failed to use item on block: ${error.message}`);
            }
        } else {
            bot.emit('message', `Target "${target}" not found.`);
        }
    },

    /**
     * Sets a waypoint at specified coordinates with a name.
     * Note: Waypoint management (storing, navigating) should be implemented as needed.
     * @param {Object} bot - The Mineflayer bot instance.
     * @param {Object} data - The action data containing name and coordinates.
     */
    setWaypoint: async (bot, data) => {
        const { name, x, y, z } = data;
        if (!name || x === undefined || y === undefined || z === undefined) {
            bot.emit('message', 'SetWaypoint action requires "name", "x", "y", and "z" fields.');
            return;
        }

        // Implement your own waypoint storage logic here
        // For example, saving to a database or an in-memory object
        // This example simply logs the waypoint
        bot.emit('message', `Waypoint "${name}" set at (${x}, ${y}, ${z}).`);
    },

    /**
     * Makes the bot follow a specified entity at a certain distance.
     * @param {Object} bot - The Mineflayer bot instance.
     * @param {Object} data - The action data containing entity and distance.
     */
    follow: async (bot, data) => {
        const { entity, distance } = data;
        if (!entity || distance === undefined || typeof distance !== 'number' || distance <= 0) {
            bot.emit('message', 'Follow action requires a valid "entity" and positive "distance".');
            return;
        }

        const targetEntity = bot.nearestEntity(e => e.username === entity || e.id === entity);
        if (!targetEntity) {
            bot.emit('message', `Entity "${entity}" not found.`);
            return;
        }

        try {
            const defaultMove = new Movements(bot);
            bot.pathfinder.setMovements(defaultMove);
            const goal = new goals.GoalFollow(targetEntity, distance);
            bot.pathfinder.setGoal(goal);
            bot.emit('message', `Following entity "${entity}" at a distance of ${distance}.`);
        } catch (error) {
            bot.emit('message', `Failed to follow entity "${entity}": ${error.message}`);
        }
    },

    /**
     * Makes the bot look at a target entity or coordinates.
     * @param {Object} bot - The Mineflayer bot instance.
     * @param {Object} data - The action data containing target entity or coordinates.
     */
    lookAt: async (bot, data) => {
        const { target, x, y, z } = data;

        if (target) {
            const targetEntity = bot.nearestEntity(e => e.username === target || e.id === target);
            if (!targetEntity) {
                bot.emit('message', `Entity "${target}" not found.`);
                return;
            }
            try {
                await bot.lookAt(targetEntity.position.offset(0, targetEntity.height, 0));
                bot.emit('message', `Looking at entity "${target}".`);
            } catch (error) {
                bot.emit('message', `Failed to look at entity "${target}": ${error.message}`);
            }
        } else if (x !== undefined && y !== undefined && z !== undefined) {
            const targetPos = new Vec3(x, y, z);
            try {
                await bot.lookAt(targetPos);
                bot.emit('message', `Looking at coordinates (${x}, ${y}, ${z}).`);
            } catch (error) {
                bot.emit('message', `Failed to look at coordinates (${x}, ${y}, ${z}): ${error.message}`);
            }
        } else {
            bot.emit('message', 'LookAt action requires either "target" or "x", "y", "z" coordinates.');
        }
    },

    /**
     * Makes the bot jump with a specified height.
     * Note: Mineflayer does not support precise jump heights. This implementation makes the bot jump if height > 0.
     * @param {Object} bot - The Mineflayer bot instance.
     * @param {Object} data - The action data containing height.
     */
    jump: async (bot, data) => {
        const { height } = data;
        if (height === undefined || typeof height !== 'number') {
            bot.emit('message', 'Jump action requires a numeric "height" field.');
            return;
        }

        if (height > 0) {
            try {
                bot.jump();
                bot.emit('message', `Jumped with height ${height}.`);
                // Optionally, implement logic to jump multiple times based on height
            } catch (error) {
                bot.emit('message', `Failed to jump: ${error.message}`);
            }
        } else {
            bot.emit('message', 'Jump height must be greater than 0.');
        }
    },

    /**
     * Sets the bot's crouch state.
     * @param {Object} bot - The Mineflayer bot instance.
     * @param {Object} data - The action data containing the crouch state.
     */
    crouch: async (bot, data) => {
        const { state } = data;
        if (state === undefined || typeof state !== 'boolean') {
            bot.emit('message', 'Crouch action requires a boolean "state" field.');
            return;
        }

        try {
            bot.setControlState('sneak', state);
            bot.emit('message', `Crouch state set to ${state}.`);
        } catch (error) {
            bot.emit('message', `Failed to set crouch state: ${error.message}`);
        }
    },

    // Additional action handlers can be added here following the same pattern
};

/**
 * Resolves placeholders in a string using the provided context.
 * @param {string} str - The string containing placeholders like {{username}}.
 * @param {Object} context - An object containing values to replace placeholders.
 * @returns {string} - The string with placeholders replaced by context values.
 */
function resolvePlaceholders(str, context = {}) {
    return str.replace(/{{\s*(\w+)\s*}}/g, (_, key) => context[key] || '');
}

/**
 * Returns the Vec3 offset for a given direction string.
 * @param {string} direction - The direction (e.g., north, south, east, west, up, down).
 * @returns {Vec3|null} - The corresponding Vec3 offset or null if invalid direction.
 */
function getDirectionOffset(direction) {
    switch (direction.toLowerCase()) {
        case 'north':
            return new Vec3(0, 0, -1);
        case 'south':
            return new Vec3(0, 0, 1);
        case 'east':
            return new Vec3(1, 0, 0);
        case 'west':
            return new Vec3(-1, 0, 0);
        case 'up':
            return new Vec3(0, 1, 0);
        case 'down':
            return new Vec3(0, -1, 0);
        default:
            return null;
    }
}
