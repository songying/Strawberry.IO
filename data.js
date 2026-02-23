// ============================================================
// WORLD CONSTANTS
// ============================================================
const WORLD_GRID_SIZE = 800;
const CELL_SIZE = 5;
const WORLD_PIXEL_SIZE = WORLD_GRID_SIZE * CELL_SIZE;

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;

// ============================================================
// PLAYER CONSTANTS
// ============================================================
const PLAYER_SPEED = 150;
const PLAYER_START_RADIUS = 12;
const DIRECTION_BUFFER_TIME = 0.05;
const TURN_SPEED = 10.0; // radians per second - compromise for visible curved arcs

// ============================================================
// GAME TIMING
// ============================================================
const GAME_DURATION = 120;
const WIN_TERRITORY_PCT = 100;
const DT_CAP = 0.05;
const RESPAWN_DELAY = 2.0;

// ============================================================
// GAME MODES
// ============================================================
const GAME_MODES = {
    peaceful: {
        name: 'Peaceful',
        icon: '\u{1F54A}',
        enemyCount: 3,
        enemySpeedMult: 0.7,
        enemyAggression: 0.2,
        xpMultiplier: 0.5,
        description: 'Relaxed gameplay with fewer, slower enemies'
    },
    normal: {
        name: 'Normal',
        icon: '\u{2694}',
        enemyCount: 6,
        enemySpeedMult: 1.15,
        enemyAggression: 0.5,
        xpMultiplier: 1.0,
        description: 'Standard difficulty'
    },
    extreme: {
        name: 'Extreme',
        icon: '\u{1F480}',
        enemyCount: 10,
        enemySpeedMult: 1.4,
        enemyAggression: 0.8,
        xpMultiplier: 2.0,
        description: 'Intense challenge with many aggressive enemies'
    },
    berry: {
        name: 'Berry Mode',
        icon: '\u{1F353}',
        enemyCount: 8,
        enemySpeedMult: 1.15,
        enemyAggression: 0.6,
        xpMultiplier: 1.5,
        special: true,
        description: 'Special mode with berry power-ups'
    }
};

// ============================================================
// SKINS
// ============================================================
const SKINS = {
    strawberry: {
        name: 'Strawberry',
        bodyColor: '#FF2D55',
        seedColor: '#FFD700',
        leafColor: '#228B22',
        trailColor: 'rgba(255,45,85,0.6)',
        territoryColor: 'rgba(255,45,85,0.25)',
        borderColor: '#FF2D55',
        price: 0,
        vipOnly: false,
        unlocked: true
    },
    raspberry: {
        name: 'Raspberry',
        bodyColor: '#C2185B',
        seedColor: '#E91E63',
        leafColor: '#2E7D32',
        trailColor: 'rgba(194,24,91,0.6)',
        territoryColor: 'rgba(194,24,91,0.25)',
        borderColor: '#C2185B',
        price: 100,
        vipOnly: true,
        unlocked: false
    },
    blueberry: {
        name: 'Blueberry',
        bodyColor: '#3F51B5',
        seedColor: '#7986CB',
        leafColor: '#1B5E20',
        trailColor: 'rgba(63,81,181,0.6)',
        territoryColor: 'rgba(63,81,181,0.25)',
        borderColor: '#3F51B5',
        price: 150,
        vipOnly: true,
        unlocked: false
    },
    blackberry: {
        name: 'Blackberry',
        bodyColor: '#1A1A2E',
        seedColor: '#6C63FF',
        leafColor: '#16213E',
        trailColor: 'rgba(108,99,255,0.6)',
        territoryColor: 'rgba(26,26,46,0.25)',
        borderColor: '#6C63FF',
        price: 300,
        vipOnly: true,
        unlocked: false
    },
    golden_strawberry: {
        name: 'Golden Strawberry',
        bodyColor: '#FFD700',
        seedColor: '#FFFFFF',
        leafColor: '#228B22',
        trailColor: 'rgba(255,215,0,0.6)',
        territoryColor: 'rgba(255,215,0,0.2)',
        borderColor: '#FFD700',
        price: 500,
        vipOnly: true,
        unlocked: false
    },
    golden_raspberry: {
        name: 'Golden Raspberry',
        bodyColor: '#FFD700',
        seedColor: '#FFFFFF',
        leafColor: '#2E7D32',
        trailColor: 'rgba(255,215,0,0.6)',
        territoryColor: 'rgba(255,215,0,0.2)',
        borderColor: '#E91E63',
        price: 500,
        vipOnly: true,
        unlocked: false
    },
    golden_blueberry: {
        name: 'Golden Blueberry',
        bodyColor: '#FFD700',
        seedColor: '#FFFFFF',
        leafColor: '#1B5E20',
        trailColor: 'rgba(255,215,0,0.6)',
        territoryColor: 'rgba(255,215,0,0.2)',
        borderColor: '#3F51B5',
        price: 500,
        vipOnly: true,
        unlocked: false
    },
    golden_blackberry: {
        name: 'Golden Blackberry',
        bodyColor: '#FFD700',
        seedColor: '#FFFFFF',
        leafColor: '#16213E',
        trailColor: 'rgba(255,215,0,0.6)',
        territoryColor: 'rgba(255,215,0,0.2)',
        borderColor: '#6C63FF',
        price: 500,
        vipOnly: true,
        unlocked: false
    }
};

// ============================================================
// AI NAMES
// ============================================================
const AI_NAMES = [
    'BerryBot', 'JuicyAI', 'SweetBot', 'PatchBot', 'FruitNinja',
    'BerryKing', 'Jammer', 'Smoothie', 'Picker', 'Harvest',
    'Bramble', 'Cobbler', 'Tartlet', 'Preserve', 'Sundae'
];

const AI_SKINS = ['strawberry', 'raspberry', 'blueberry', 'blackberry'];

// ============================================================
// LEVEL / XP SYSTEM
// ============================================================
const XP_PER_LEVEL = [
    0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000,
    5000, 6500, 8000, 10000, 12500, 15000, 18000, 22000, 27000, 33000
];
const MAX_LEVEL = XP_PER_LEVEL.length;

// ============================================================
// CURRENCY REWARDS
// ============================================================
const BERRIES_PER_CELL = 0.1;
const BERRIES_PER_KILL = 5;
const BERRIES_WIN_BONUS = 20;
const XP_PER_CELL = 0.5;
const XP_PER_KILL = 10;
const XP_WIN_BONUS = 50;

// ============================================================
// BERRY MODE POWER-UPS
// ============================================================
const POWERUPS = {
    speed_boost: { name: 'Speed Boost', duration: 5, speedMult: 1.5, color: '#FF9800', icon: '\u{26A1}' },
    shield: { name: 'Shield', duration: 3, color: '#2196F3', icon: '\u{1F6E1}' },
    magnet: { name: 'Magnet', duration: 8, color: '#9C27B0', icon: '\u{1F9F2}' }
};
const POWERUP_SPAWN_INTERVAL = 10;
const MAX_POWERUPS_ON_MAP = 5;

// ============================================================
// DEFAULT SAVE DATA
// ============================================================
const DEFAULT_SAVE = {
    berries: 0,
    level: 1,
    xp: 0,
    selectedSkin: 'strawberry',
    selectedMode: 'normal',
    unlockedSkins: ['strawberry', 'raspberry', 'blueberry', 'blackberry', 'golden_strawberry', 'golden_raspberry', 'golden_blueberry', 'golden_blackberry'],
    isVip: false,
    settings: {
        soundEnabled: true
    },
    stats: {
        gamesPlayed: 0,
        totalTerritory: 0,
        totalKills: 0,
        bestTerritory: 0
    }
};
