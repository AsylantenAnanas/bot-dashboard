module.exports = {
    hookEvents: [
        // Chat Events
        {
            name: 'chat',
            params: ['username', 'message', 'translate', 'jsonMsg', 'matches']
        },
        {
            name: 'whisper',
            params: ['username', 'message', 'translate', 'jsonMsg', 'matches']
        },
        {
            name: 'chat:name',
            params: ['matches']
        },

        // Action and Message Events
        {
            name: 'actionBar',
            params: ['jsonMsg', 'verified']
        },
        {
            name: 'message',
            params: ['jsonMsg', 'position', 'sender', 'verified']
        },
        {
            name: 'messagestr',
            params: ['message', 'messagePosition', 'jsonMsg', 'sender', 'verified']
        },

        // Connection and Authentication Events
        {
            name: 'inject_allowed',
            params: []
        },
        {
            name: 'login',
            params: []
        },
        {
            name: 'kicked',
            params: ['reason', 'loggedIn']
        },
        {
            name: 'end',
            params: ['reason']
        },
        {
            name: 'error',
            params: ['err']
        },

        // Player Lifecycle Events
        {
            name: 'spawn',
            params: []
        },
        {
            name: 'respawn',
            params: []
        },

        // Game State Events
        {
            name: 'game',
            params: []
        },
        {
            name: 'resourcePack',
            params: ['url', 'hash']
        },
        {
            name: 'title',
            params: ['title', 'type']
        },
        {
            name: 'rain',
            params: []
        },
        {
            name: 'weatherUpdate',
            params: []
        },
        {
            name: 'time',
            params: []
        },

        // Entity Events
        {
            name: 'death',
            params: []
        },
        {
            name: 'health',
            params: []
        },
        {
            name: 'breath',
            params: []
        },
        {
            name: 'entityAttributes',
            params: ['entity']
        },
        {
            name: 'entitySwingArm',
            params: ['entity']
        },
        {
            name: 'entityHurt',
            params: ['entity']
        },
        {
            name: 'entityDead',
            params: ['entity']
        },
        {
            name: 'entityTaming',
            params: ['entity']
        },
        {
            name: 'entityTamed',
            params: ['entity']
        },
        {
            name: 'entityShakingOffWater',
            params: ['entity']
        },
        {
            name: 'entityEatingGrass',
            params: ['entity']
        },
        {
            name: 'entityHandSwap',
            params: ['entity']
        },
        {
            name: 'entityWake',
            params: ['entity']
        },
        {
            name: 'entityEat',
            params: ['entity']
        },
        {
            name: 'entityCriticalEffect',
            params: ['entity']
        },
        {
            name: 'entityMagicCriticalEffect',
            params: ['entity']
        },
        {
            name: 'entityCrouch',
            params: ['entity']
        },
        {
            name: 'entityUncrouch',
            params: ['entity']
        },
        {
            name: 'entityEquip',
            params: ['entity']
        },
        {
            name: 'entitySleep',
            params: ['entity']
        },
        {
            name: 'entitySpawn',
            params: ['entity']
        },
        {
            name: 'entityElytraFlew',
            params: ['entity']
        },
        {
            name: 'entityGone',
            params: ['entity']
        },
        {
            name: 'entityMoved',
            params: ['entity']
        },
        {
            name: 'entityDetach',
            params: ['entity', 'vehicle']
        },
        {
            name: 'entityAttach',
            params: ['entity', 'vehicle']
        },
        {
            name: 'entityUpdate',
            params: ['entity']
        },
        {
            name: 'entityEffect',
            params: ['entity', 'effect']
        },
        {
            name: 'entityEffectEnd',
            params: ['entity', 'effect']
        },

        // Item and Inventory Events
        {
            name: 'itemDrop',
            params: ['entity']
        },
        {
            name: 'playerCollect',
            params: ['collector', 'collected']
        },
        {
            name: 'heldItemChanged',
            params: ['heldItem']
        },

        // Player Events
        {
            name: 'playerJoined',
            params: ['player']
        },
        {
            name: 'playerUpdated',
            params: ['player']
        },
        {
            name: 'playerLeft',
            params: ['player']
        },

        // Block Events
        {
            name: 'blockUpdate',
            params: ['oldBlock', 'newBlock']
        },
        {
            name: 'blockUpdate:(x, y, z)',
            params: ['oldBlock', 'newBlock']
        },
        {
            name: 'blockPlaced',
            params: ['oldBlock', 'newBlock']
        },

        // Chunk Events
        {
            name: 'chunkColumnLoad',
            params: ['point']
        },
        {
            name: 'chunkColumnUnload',
            params: ['point']
        },

        // Sound and Particle Events
        {
            name: 'soundEffectHeard',
            params: ['soundName', 'position', 'volume', 'pitch']
        },
        {
            name: 'hardcodedSoundEffectHeard',
            params: ['soundId', 'soundCategory', 'position', 'volume', 'pitch']
        },
        {
            name: 'noteHeard',
            params: ['block', 'instrument', 'pitch']
        },
        {
            name: 'particle',
            params: []
        },

        // Mechanism Events
        {
            name: 'pistonMove',
            params: ['block', 'isPulling', 'direction']
        },
        {
            name: 'chestLidMove',
            params: ['block', 'isOpen', 'block2']
        },
        {
            name: 'blockBreakProgressObserved',
            params: ['block', 'destroyStage', 'entity']
        },
        {
            name: 'blockBreakProgressEnd',
            params: ['block', 'entity']
        },
        {
            name: 'diggingCompleted',
            params: ['block']
        },
        {
            name: 'diggingAborted',
            params: ['block']
        },

        // Firework Events
        {
            name: 'usedFirework',
            params: ['fireworkEntityId']
        },

        // Movement Events
        {
            name: 'move',
            params: []
        },
        {
            name: 'forcedMove',
            params: []
        },
        {
            name: 'mount',
            params: []
        },
        {
            name: 'dismount',
            params: ['vehicle']
        },

        // Window and Interface Events
        {
            name: 'windowOpen',
            params: ['window']
        },
        {
            name: 'windowClose',
            params: ['window']
        },

        // Sleep and Wake Events
        {
            name: 'sleep',
            params: []
        },
        {
            name: 'wake',
            params: []
        },

        // Experience and Scoreboard Events
        {
            name: 'experience',
            params: []
        },
        {
            name: 'scoreboardCreated',
            params: ['scoreboard']
        },
        {
            name: 'scoreboardDeleted',
            params: ['scoreboard']
        },
        {
            name: 'scoreboardTitleChanged',
            params: ['scoreboard']
        },
        {
            name: 'scoreUpdated',
            params: ['scoreboard', 'item']
        },
        {
            name: 'scoreRemoved',
            params: ['scoreboard', 'item']
        },
        {
            name: 'scoreboardPosition',
            params: ['position', 'scoreboard']
        },

        // Team Events
        {
            name: 'teamCreated',
            params: ['team']
        },
        {
            name: 'teamRemoved',
            params: ['team']
        },
        {
            name: 'teamUpdated',
            params: ['team']
        },
        {
            name: 'teamMemberAdded',
            params: ['team']
        },
        {
            name: 'teamMemberRemoved',
            params: ['team']
        },

        // Boss Bar Events
        {
            name: 'bossBarCreated',
            params: ['bossBar']
        },
        {
            name: 'bossBarDeleted',
            params: ['bossBar']
        },
        {
            name: 'bossBarUpdated',
            params: ['bossBar']
        },

        // Miscellaneous Events
        {
            name: 'physicsTick',
            params: []
        }
    ],
    hookTypes: [
        {
            name: 'message',
            label: 'Message',
            fields: [
                { key: 'message', type: 'string', label: 'Message Content' }
            ]
        },
        {
            name: 'whisper',
            label: 'Whisper',
            fields: [
                { key: 'username', type: 'string', label: 'Recipient Username' },
                { key: 'message', type: 'string', label: 'Whisper Message' }
            ]
        },
        {
            name: 'move',
            label: 'Move',
            fields: [
                { key: 'x', type: 'number', label: 'X Coordinate' },
                { key: 'y', type: 'number', label: 'Y Coordinate' },
                { key: 'z', type: 'number', label: 'Z Coordinate' }
            ]
        },
        {
            name: 'wait',
            label: 'Wait',
            fields: [
                { key: 'duration', type: 'number', label: 'Duration (seconds)' }
            ]
        },
        // New Action Types Below
    
        {
            name: 'dig',
            label: 'Dig',
            fields: [
                { key: 'blockType', type: 'string', label: 'Block Type' },
                { key: 'x', type: 'number', label: 'X Coordinate' },
                { key: 'y', type: 'number', label: 'Y Coordinate' },
                { key: 'z', type: 'number', label: 'Z Coordinate' }
            ]
        },
        {
            name: 'place',
            label: 'Place Block',
            fields: [
                { key: 'blockType', type: 'string', label: 'Block Type' },
                { key: 'x', type: 'number', label: 'X Coordinate' },
                { key: 'y', type: 'number', label: 'Y Coordinate' },
                { key: 'z', type: 'number', label: 'Z Coordinate' },
                { key: 'direction', type: 'string', label: 'Direction (e.g., north, south)' }
            ]
        },
        {
            name: 'equip',
            label: 'Equip Item',
            fields: [
                { key: 'slot', type: 'string', label: 'Slot (e.g., mainhand, offhand)' },
                { key: 'item', type: 'string', label: 'Item Name' }
            ]
        },
        {
            name: 'attack',
            label: 'Attack',
            fields: [
                { key: 'target', type: 'string', label: 'Target Entity ID or Name' },
                { key: 'strength', type: 'number', label: 'Attack Strength' }
            ]
        },
        {
            name: 'useItem',
            label: 'Use Item',
            fields: [
                { key: 'item', type: 'string', label: 'Item Name' },
                { key: 'target', type: 'string', label: 'Target Block or Entity' }
            ]
        },
        {
            name: 'setWaypoint',
            label: 'Set Waypoint',
            fields: [
                { key: 'name', type: 'string', label: 'Waypoint Name' },
                { key: 'x', type: 'number', label: 'X Coordinate' },
                { key: 'y', type: 'number', label: 'Y Coordinate' },
                { key: 'z', type: 'number', label: 'Z Coordinate' }
            ]
        },
        {
            name: 'follow',
            label: 'Follow Entity',
            fields: [
                { key: 'entity', type: 'string', label: 'Entity ID or Name' },
                { key: 'distance', type: 'number', label: 'Follow Distance' }
            ]
        },
        {
            name: 'lookAt',
            label: 'Look At',
            fields: [
                { key: 'target', type: 'string', label: 'Target Entity ID or Name' },
                { key: 'x', type: 'number', label: 'X Coordinate (optional)' },
                { key: 'y', type: 'number', label: 'Y Coordinate (optional)' },
                { key: 'z', type: 'number', label: 'Z Coordinate (optional)' }
            ]
        },
        {
            name: 'jump',
            label: 'Jump',
            fields: [
                { key: 'height', type: 'number', label: 'Jump Height' }
            ]
        },
        {
            name: 'crouch',
            label: 'Crouch',
            fields: [
                { key: 'state', type: 'boolean', label: 'Crouch State (true/false)' }
            ]
        }
    ]    
};
