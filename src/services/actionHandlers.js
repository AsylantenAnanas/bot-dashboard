const { goals, Movements } = require('mineflayer-pathfinder');
const { Vec3 } = require('vec3');

module.exports = {
    // Chat
    message: async (bot, data, context) => {
        if (!data.message) {
            bot.emit('message', 'Message action missing "message" field.');
            return;
        }
        const message = resolvePlaceholders(data.message, context);
        bot.chat(message);
    },

    // Whisper
    whisper: async (bot, data, context) => {
        if (!data.username || !data.message) {
            bot.emit('message', 'Whisper action missing "username" or "message".');
            return;
        }
        const message = resolvePlaceholders(data.message, context);
        bot.whisper(data.username, message);
    },

    // Move
    move: async (bot, data) => {
        const { x, y, z } = data;
        if (x === undefined || y === undefined || z === undefined) {
            bot.emit('message', 'Move action requires x, y, z.');
            return;
        }
        const target = new Vec3(x, y, z);
        const defaultMove = new Movements(bot);
        bot.pathfinder.setMovements(defaultMove);
        const goal = new goals.GoalBlock(x, y, z);
        bot.pathfinder.setGoal(goal, false);
    },

    // Wait
    wait: async (bot, data) => {
        const { duration } = data;
        if (duration === undefined || typeof duration !== 'number' || duration < 0) {
            bot.emit('message', 'Wait action requires a positive "duration".');
            return;
        }
        await new Promise(resolve => setTimeout(resolve, duration * 1000));
    },

    // Dig
    dig: async (bot, data) => {
        const { blockType, x, y, z } = data;
        if (!blockType || x === undefined || y === undefined || z === undefined) {
            bot.emit('message', 'Dig action requires blockType, x, y, z.');
            return;
        }
        const targetPos = new Vec3(x, y, z);
        const block = bot.blockAt(targetPos);
        if (!block) {
            bot.emit('message', `No block at (${x}, ${y}, ${z}).`);
            return;
        }
        if (block.name !== blockType) {
            bot.emit('message', `Block at (${x}, ${y}, ${z}) is not "${blockType}".`);
            return;
        }
        try {
            await bot.dig(block);
            bot.emit('message', `Dug block "${blockType}" at (${x}, ${y}, ${z}).`);
        } catch (error) {
            bot.emit('message', `Failed to dig: ${error.message}`);
        }
    },

    // Place
    place: async (bot, data) => {
        const { blockType, x, y, z, direction } = data;
        if (!blockType || x === undefined || y === undefined || z === undefined || !direction) {
            bot.emit('message', 'Place action requires blockType, x, y, z, direction.');
            return;
        }
        const targetPos = new Vec3(x, y, z);
        const block = bot.blockAt(targetPos);
        if (!block) {
            bot.emit('message', `No block at (${x}, ${y}, ${z}) for reference.`);
            return;
        }
        const directionOffset = getDirectionOffset(direction);
        if (!directionOffset) {
            bot.emit('message', `Invalid direction "${direction}".`);
            return;
        }
        const referenceBlockPos = targetPos.offset(directionOffset);
        const referenceBlock = bot.blockAt(referenceBlockPos);
        if (!referenceBlock) {
            bot.emit('message', `No reference block at ${referenceBlockPos.x},${referenceBlockPos.y},${referenceBlockPos.z}.`);
            return;
        }
        const item = bot.inventory.findInventoryItem(blockType, null);
        if (!item) {
            bot.emit('message', `Item "${blockType}" not in inventory.`);
            return;
        }
        try {
            await bot.placeBlock(referenceBlock, directionOffset, item);
            bot.emit('message', `Placed "${blockType}" at (${x}, ${y}, ${z}) facing ${direction}.`);
        } catch (error) {
            bot.emit('message', `Failed to place: ${error.message}`);
        }
    },

    // Equip
    equip: async (bot, data) => {
        const { slot, item } = data;
        if (!slot || !item) {
            bot.emit('message', 'Equip action requires "slot" and "item".');
            return;
        }
        const inventoryItem = bot.inventory.findInventoryItem(item, null);
        if (!inventoryItem) {
            bot.emit('message', `Item "${item}" not in inventory.`);
            return;
        }
        try {
            await bot.equip(inventoryItem, slot);
            bot.emit('message', `Equipped "${item}" to "${slot}".`);
        } catch (error) {
            bot.emit('message', `Failed to equip: ${error.message}`);
        }
    },

    // Attack
    attack: async (bot, data) => {
        const { target, strength } = data;
        if (!target || typeof strength !== 'number' || strength <= 0) {
            bot.emit('message', 'Attack action requires valid "target" and positive "strength".');
            return;
        }
        const entity = bot.nearestEntity(e => e.username === target || e.id === target);
        if (!entity) {
            bot.emit('message', `Target "${target}" not found.`);
            return;
        }
        try {
            for (let i = 0; i < strength; i++) {
                bot.attack(entity);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            bot.emit('message', `Attacked "${target}" with strength ${strength}.`);
        } catch (error) {
            bot.emit('message', `Failed to attack "${target}": ${error.message}`);
        }
    },

    // Use item
    useItem: async (bot, data) => {
        const { item, target } = data;
        if (!item || !target) {
            bot.emit('message', 'UseItem requires "item" and "target".');
            return;
        }
        const inventoryItem = bot.inventory.findInventoryItem(item, null);
        if (!inventoryItem) {
            bot.emit('message', `Item "${item}" not in inventory.`);
            return;
        }
        const targetEntity = bot.nearestEntity(e => e.username === target || e.id === target);
        const targetBlock = bot.blockAt(bot.entity.position.offset(0, -1, 1));

        if (targetEntity) {
            try {
                await bot.useItem(targetEntity);
                bot.emit('message', `Used "${item}" on entity "${target}".`);
            } catch (error) {
                bot.emit('message', `Error using item on entity: ${error.message}`);
            }
        } else if (targetBlock) {
            try {
                await bot.useItem(targetBlock);
                bot.emit('message', `Used "${item}" on block at (${targetBlock.position.x},${targetBlock.position.y},${targetBlock.position.z}).`);
            } catch (error) {
                bot.emit('message', `Error using item on block: ${error.message}`);
            }
        } else {
            bot.emit('message', `Target "${target}" not found.`);
        }
    },

    // SetWaypoint (Beispiel)
    setWaypoint: async (bot, data) => {
        const { name, x, y, z } = data;
        if (!name || x === undefined || y === undefined || z === undefined) {
            bot.emit('message', 'SetWaypoint requires name, x, y, z.');
            return;
        }
        bot.emit('message', `Waypoint "${name}" set at (${x}, ${y}, ${z}).`);
    },

    // Follow
    follow: async (bot, data) => {
        const { entity, distance } = data;
        if (!entity || typeof distance !== 'number' || distance <= 0) {
            bot.emit('message', 'Follow requires "entity" and "distance" > 0.');
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
            bot.emit('message', `Following "${entity}" at distance ${distance}.`);
        } catch (error) {
            bot.emit('message', `Failed to follow: ${error.message}`);
        }
    },

    // LookAt
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
                bot.emit('message', `Looking at "${target}".`);
            } catch (error) {
                bot.emit('message', `Error looking at entity: ${error.message}`);
            }
        } else if (x !== undefined && y !== undefined && z !== undefined) {
            const pos = new Vec3(x, y, z);
            try {
                await bot.lookAt(pos);
                bot.emit('message', `Looking at (${x},${y},${z}).`);
            } catch (error) {
                bot.emit('message', `Error looking at coords: ${error.message}`);
            }
        } else {
            bot.emit('message', 'LookAt requires "target" or x,y,z.');
        }
    },

    // Jump
    jump: async (bot, data) => {
        const { height } = data;
        if (typeof height !== 'number' || height <= 0) {
            bot.emit('message', 'Jump requires a numeric "height" > 0.');
            return;
        }
        try {
            bot.jump();
            bot.emit('message', `Jumped with height ${height}.`);
        } catch (error) {
            bot.emit('message', `Failed to jump: ${error.message}`);
        }
    },

    // Crouch
    crouch: async (bot, data) => {
        const { state } = data;
        if (typeof state !== 'boolean') {
            bot.emit('message', 'Crouch requires a boolean "state".');
            return;
        }
        try {
            bot.setControlState('sneak', state);
            bot.emit('message', `Crouch set to ${state}.`);
        } catch (error) {
            bot.emit('message', `Failed to set crouch: ${error.message}`);
        }
    },
};

// Utils
function resolvePlaceholders(str, context = {}) {
    return str.replace(/{{\s*(\w+)\s*}}/g, (_, key) => context[key] || '');
}

function getDirectionOffset(direction) {
    switch (direction.toLowerCase()) {
        case 'north': return new Vec3(0, 0, -1);
        case 'south': return new Vec3(0, 0, 1);
        case 'east': return new Vec3(1, 0, 0);
        case 'west': return new Vec3(-1, 0, 0);
        case 'up': return new Vec3(0, 1, 0);
        case 'down': return new Vec3(0, -1, 0);
        default: return null;
    }
}