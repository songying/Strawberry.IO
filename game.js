// ============================================================
// CANVAS SETUP
// ============================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ============================================================
// GAME STATE
// ============================================================
let gameState = 'MENU'; // MENU, PLAYING, GAME_OVER
let currentMode = null;

// World grids
let territoryGrid = null;  // Uint8Array - owner ID per cell (0=unclaimed)
let trailGrid = null;      // Uint8Array - trail owner ID per cell

// Entities
let player = null;
let enemies = [];
let powerUps = [];
let particles = [];

// Camera
let camera = { x: 0, y: 0 };

// Game clock
let lastTime = 0;
let gameTime = 0;
let gameTimer = 0;

// Game results
let gameResults = null;

// Input
let inputDir = { dx: 0, dy: -1 }; // Start moving up
let nextDir = null;
let keysDown = {};

// Canvas scaling
let scaleX = 1, scaleY = 1;

// ============================================================
// GRID UTILITIES
// ============================================================
function gridIndex(gx, gy) {
    return gy * WORLD_GRID_SIZE + gx;
}

function worldToGrid(wx, wy) {
    return {
        gx: Math.floor(wx / CELL_SIZE),
        gy: Math.floor(wy / CELL_SIZE)
    };
}

function gridToWorld(gx, gy) {
    return {
        x: gx * CELL_SIZE + CELL_SIZE / 2,
        y: gy * CELL_SIZE + CELL_SIZE / 2
    };
}

function isInBounds(gx, gy) {
    return gx >= 0 && gx < WORLD_GRID_SIZE && gy >= 0 && gy < WORLD_GRID_SIZE;
}

// ============================================================
// ENTITY CREATION
// ============================================================
function createEntity(id, skinId, name, gx, gy) {
    var pos = gridToWorld(gx, gy);
    return {
        id: id,
        x: pos.x,
        y: pos.y,
        dx: 0,
        dy: -1,
        speed: PLAYER_SPEED,
        skinId: skinId,
        name: name,
        trail: [],
        isOutside: false,
        alive: true,
        kills: 0,
        territoryCaptured: 0,
        // Grid position tracking
        lastGX: gx,
        lastGY: gy,
        // Movement accumulator
        moveAccum: 0,
        // Power-ups
        activePowerUp: null,
        powerUpTimer: 0,
        shielded: false,
        speedMult: 1.0,
        // Respawn
        respawnTimer: 0
    };
}

function initTerritory(entityId, cx, cy, radius) {
    for (var dy = -radius; dy <= radius; dy++) {
        for (var dx = -radius; dx <= radius; dx++) {
            var gx = cx + dx;
            var gy = cy + dy;
            if (isInBounds(gx, gy)) {
                territoryGrid[gridIndex(gx, gy)] = entityId;
            }
        }
    }
}

// ============================================================
// TERRITORY SYSTEM - FLOOD FILL CAPTURE
// ============================================================
function floodFillCapture(entityId) {
    // 1. Collect trail cells
    var trailCells = [];
    for (var i = 0; i < WORLD_GRID_SIZE * WORLD_GRID_SIZE; i++) {
        if (trailGrid[i] === entityId) {
            trailCells.push({ gx: i % WORLD_GRID_SIZE, gy: Math.floor(i / WORLD_GRID_SIZE) });
        }
    }
    if (trailCells.length === 0) return 0;

    // 2. Convert trail cells to territory
    for (var t = 0; t < trailCells.length; t++) {
        var tc = trailCells[t];
        var idx = gridIndex(tc.gx, tc.gy);
        territoryGrid[idx] = entityId;
        trailGrid[idx] = 0;
    }

    // 3. Compute bounding box of ALL this entity's territory
    var minX = WORLD_GRID_SIZE, maxX = 0, minY = WORLD_GRID_SIZE, maxY = 0;
    for (var y = 0; y < WORLD_GRID_SIZE; y++) {
        for (var x = 0; x < WORLD_GRID_SIZE; x++) {
            if (territoryGrid[gridIndex(x, y)] === entityId) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    // 4. Expand bbox by 1 for flood-fill border
    minX = Math.max(0, minX - 1);
    minY = Math.max(0, minY - 1);
    maxX = Math.min(WORLD_GRID_SIZE - 1, maxX + 1);
    maxY = Math.min(WORLD_GRID_SIZE - 1, maxY + 1);

    // 5. Flood-fill from edges to mark exterior cells
    var w = maxX - minX + 1;
    var h = maxY - minY + 1;
    var visited = new Uint8Array(w * h);

    var queue = [];
    var qi = 0;

    // Seed edge cells that are NOT this entity's territory
    for (var ex = minX; ex <= maxX; ex++) {
        seedEdge(ex, minY);
        seedEdge(ex, maxY);
    }
    for (var ey = minY + 1; ey < maxY; ey++) {
        seedEdge(minX, ey);
        seedEdge(maxX, ey);
    }

    function seedEdge(sx, sy) {
        if (territoryGrid[gridIndex(sx, sy)] === entityId) return;
        var li = (sx - minX) + (sy - minY) * w;
        if (visited[li]) return;
        visited[li] = 1;
        queue.push(sx, sy);
    }

    // BFS
    while (qi < queue.length) {
        var cx = queue[qi++];
        var cy = queue[qi++];
        var nbs = [[cx-1,cy],[cx+1,cy],[cx,cy-1],[cx,cy+1]];
        for (var n = 0; n < 4; n++) {
            var nx = nbs[n][0], ny = nbs[n][1];
            if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
            if (territoryGrid[gridIndex(nx, ny)] === entityId) continue;
            var li = (nx - minX) + (ny - minY) * w;
            if (visited[li]) continue;
            visited[li] = 1;
            queue.push(nx, ny);
        }
    }

    // 6. Claim non-exterior cells
    var captured = 0;
    for (var fy = minY; fy <= maxY; fy++) {
        for (var fx = minX; fx <= maxX; fx++) {
            var li = (fx - minX) + (fy - minY) * w;
            if (!visited[li] && territoryGrid[gridIndex(fx, fy)] !== entityId) {
                territoryGrid[gridIndex(fx, fy)] = entityId;
                captured++;
            }
        }
    }

    return captured + trailCells.length;
}

function clearTrail(entityId) {
    for (var i = 0; i < WORLD_GRID_SIZE * WORLD_GRID_SIZE; i++) {
        if (trailGrid[i] === entityId) {
            trailGrid[i] = 0;
        }
    }
}

function clearTerritory(entityId) {
    for (var i = 0; i < WORLD_GRID_SIZE * WORLD_GRID_SIZE; i++) {
        if (territoryGrid[i] === entityId) {
            territoryGrid[i] = 0;
        }
    }
}

function countTerritory(entityId) {
    var count = 0;
    for (var i = 0; i < WORLD_GRID_SIZE * WORLD_GRID_SIZE; i++) {
        if (territoryGrid[i] === entityId) count++;
    }
    return count;
}

function getTerritoryPercentage(entityId) {
    return (countTerritory(entityId) / (WORLD_GRID_SIZE * WORLD_GRID_SIZE)) * 100;
}

// ============================================================
// ENTITY MOVEMENT
// ============================================================
function moveEntity(entity, dt) {
    if (!entity.alive) return;

    var speed = entity.speed * entity.speedMult;
    var distance = speed * dt;

    entity.x += entity.dx * distance;
    entity.y += entity.dy * distance;

    // Clamp to world bounds
    entity.x = Math.max(CELL_SIZE / 2, Math.min(WORLD_PIXEL_SIZE - CELL_SIZE / 2, entity.x));
    entity.y = Math.max(CELL_SIZE / 2, Math.min(WORLD_PIXEL_SIZE - CELL_SIZE / 2, entity.y));

    // Check grid cell transition
    var gpos = worldToGrid(entity.x, entity.y);
    var gx = gpos.gx, gy = gpos.gy;

    if (gx !== entity.lastGX || gy !== entity.lastGY) {
        // Entered a new cell
        onEnterCell(entity, gx, gy);
        entity.lastGX = gx;
        entity.lastGY = gy;
    }
}

function onEnterCell(entity, gx, gy) {
    if (!isInBounds(gx, gy)) return;

    var idx = gridIndex(gx, gy);
    var cellOwner = territoryGrid[idx];
    var trailOwner = trailGrid[idx];

    // Check if stepping on someone else's trail -> the stepper dies
    // (paper.io 2 rules: trails are deadly to anyone who touches them, except the owner)
    if (trailOwner > 0 && trailOwner !== entity.id) {
        if (!entity.shielded) {
            var trailEntity = getEntityById(trailOwner);
            if (trailEntity) trailEntity.kills++;
            killEntity(entity, trailOwner);
            return;
        }
    }

    // Check if stepping on own trail -> self-kill
    // Only triggers if this is a cell we already visited (making a loop back into our trail)
    // Exclude the last 2 trail cells to prevent false positives from grid jitter
    if (trailOwner === entity.id && entity.isOutside && entity.trail.length > 2) {
        var lastTrail = entity.trail[entity.trail.length - 1];
        var prevTrail = entity.trail[entity.trail.length - 2];
        var isRecent = (lastTrail.gx === gx && lastTrail.gy === gy) ||
                       (prevTrail.gx === gx && prevTrail.gy === gy);
        if (!isRecent) {
            killEntity(entity, 0);
            return;
        }
    }

    // Check boundary collision - die if hitting the very edge of the world
    if (gx <= 0 || gx >= WORLD_GRID_SIZE - 1 || gy <= 0 || gy >= WORLD_GRID_SIZE - 1) {
        killEntity(entity, 0);
        return;
    }

    if (cellOwner === entity.id) {
        // Returned to own territory
        if (entity.isOutside && entity.trail.length > 0) {
            var captured = floodFillCapture(entity.id);
            entity.territoryCaptured += captured;
            entity.trail = [];
            entity.isOutside = false;

            // Particles at capture
            spawnCaptureParticles(entity);

            if (entity.id === 1) {
                playCaptureSound();
            }
        }
        entity.isOutside = false;
    } else {
        // Outside own territory
        entity.isOutside = true;
        if (trailGrid[idx] !== entity.id) {
            trailGrid[idx] = entity.id;
            entity.trail.push({ gx: gx, gy: gy });
        }
    }

    // Power-up pickup (berry mode)
    if (entity.id === 1) {
        checkPowerUpPickup(entity, gx, gy);
    }
}

// ============================================================
// KILL / RESPAWN
// ============================================================
function killEntity(entity, killerId) {
    if (!entity.alive) return;
    entity.alive = false;

    // Spawn death particles
    spawnDeathParticles(entity);

    // Clear trail
    clearTrail(entity.id);
    entity.trail = [];
    entity.isOutside = false;

    if (entity.id === 1) {
        // Player died
        playDeathSound();
        endGame(false);
    } else {
        // AI died - release some territory and schedule respawn
        clearTerritory(entity.id);
        entity.respawnTimer = RESPAWN_DELAY;

        if (killerId === 1) {
            playKillSound();
        }
    }
}

function respawnEntity(entity) {
    // Find a random empty spot
    var attempts = 0;
    while (attempts < 100) {
        var gx = 10 + Math.floor(Math.random() * (WORLD_GRID_SIZE - 20));
        var gy = 10 + Math.floor(Math.random() * (WORLD_GRID_SIZE - 20));

        // Check if area is mostly empty
        var clear = true;
        for (var dy = -4; dy <= 4 && clear; dy++) {
            for (var dx = -4; dx <= 4 && clear; dx++) {
                var checkIdx = gridIndex(gx + dx, gy + dy);
                if (territoryGrid[checkIdx] !== 0 || trailGrid[checkIdx] !== 0) {
                    clear = false;
                }
            }
        }

        if (clear) {
            var pos = gridToWorld(gx, gy);
            entity.x = pos.x;
            entity.y = pos.y;
            entity.lastGX = gx;
            entity.lastGY = gy;
            entity.alive = true;
            entity.isOutside = false;
            entity.trail = [];
            entity.dx = 0;
            entity.dy = -1;
            entity.shielded = false;
            entity.speedMult = 1.0;
            entity.activePowerUp = null;
            initTerritory(entity.id, gx, gy, PLAYER_START_RADIUS);
            return;
        }
        attempts++;
    }
    // Fallback: just pick any spot
    var gx = 10 + Math.floor(Math.random() * (WORLD_GRID_SIZE - 20));
    var gy = 10 + Math.floor(Math.random() * (WORLD_GRID_SIZE - 20));
    var pos = gridToWorld(gx, gy);
    entity.x = pos.x;
    entity.y = pos.y;
    entity.lastGX = gx;
    entity.lastGY = gy;
    entity.alive = true;
    entity.isOutside = false;
    entity.trail = [];
    entity.dx = 0;
    entity.dy = -1;
    initTerritory(entity.id, gx, gy, PLAYER_START_RADIUS);
}

function getEntityById(id) {
    if (player && player.id === id) return player;
    for (var i = 0; i < enemies.length; i++) {
        if (enemies[i].id === id) return enemies[i];
    }
    return null;
}

// ============================================================
// POWER-UPS
// ============================================================
function checkPowerUpPickup(entity, gx, gy) {
    for (var i = powerUps.length - 1; i >= 0; i--) {
        var pu = powerUps[i];
        if (pu.gx === gx && pu.gy === gy) {
            activatePowerUp(entity, pu.type);
            powerUps.splice(i, 1);
            playPowerUpSound();
        }
    }
}

function activatePowerUp(entity, type) {
    var def = POWERUPS[type];
    entity.activePowerUp = type;
    entity.powerUpTimer = def.duration;

    if (type === 'speed_boost') {
        entity.speedMult = def.speedMult;
    } else if (type === 'shield') {
        entity.shielded = true;
    }
}

function updatePowerUp(entity, dt) {
    if (!entity.activePowerUp) return;
    entity.powerUpTimer -= dt;
    if (entity.powerUpTimer <= 0) {
        // Remove power-up effect
        entity.speedMult = 1.0;
        entity.shielded = false;
        entity.activePowerUp = null;
        entity.powerUpTimer = 0;
    }
}

function spawnPowerUp() {
    if (powerUps.length >= MAX_POWERUPS_ON_MAP) return;

    var types = Object.keys(POWERUPS);
    var type = types[Math.floor(Math.random() * types.length)];

    var attempts = 0;
    while (attempts < 50) {
        var gx = 5 + Math.floor(Math.random() * (WORLD_GRID_SIZE - 10));
        var gy = 5 + Math.floor(Math.random() * (WORLD_GRID_SIZE - 10));
        if (territoryGrid[gridIndex(gx, gy)] === 0 && trailGrid[gridIndex(gx, gy)] === 0) {
            powerUps.push({ gx: gx, gy: gy, type: type, time: 0 });
            return;
        }
        attempts++;
    }
}

// ============================================================
// PARTICLES
// ============================================================
function spawnCaptureParticles(entity) {
    var skin = SKINS[entity.skinId];
    for (var i = 0; i < 15; i++) {
        particles.push({
            x: entity.x,
            y: entity.y,
            vx: (Math.random() - 0.5) * 200,
            vy: (Math.random() - 0.5) * 200,
            life: 0.5 + Math.random() * 0.5,
            maxLife: 0.5 + Math.random() * 0.5,
            color: skin.bodyColor,
            size: 3 + Math.random() * 4
        });
    }
}

function spawnDeathParticles(entity) {
    var skin = SKINS[entity.skinId];
    for (var i = 0; i < 25; i++) {
        particles.push({
            x: entity.x,
            y: entity.y,
            vx: (Math.random() - 0.5) * 300,
            vy: (Math.random() - 0.5) * 300,
            life: 0.8 + Math.random() * 0.5,
            maxLife: 0.8 + Math.random() * 0.5,
            color: i % 2 === 0 ? skin.bodyColor : skin.seedColor,
            size: 4 + Math.random() * 5
        });
    }
}

function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.life -= dt;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// ============================================================
// CAMERA
// ============================================================
function updateCamera() {
    if (!player) return;
    var targetX = player.x - CANVAS_WIDTH / (2 * scaleX);
    var targetY = player.y - CANVAS_HEIGHT / (2 * scaleY);
    camera.x += (targetX - camera.x) * 0.1;
    camera.y += (targetY - camera.y) * 0.1;
}

// ============================================================
// RENDERING
// ============================================================
function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (gameState !== 'PLAYING') return;

    ctx.save();

    // Determine visible grid range
    var startGX = Math.max(0, Math.floor(camera.x / CELL_SIZE) - 1);
    var startGY = Math.max(0, Math.floor(camera.y / CELL_SIZE) - 1);
    var endGX = Math.min(WORLD_GRID_SIZE - 1, Math.ceil((camera.x + CANVAS_WIDTH) / CELL_SIZE) + 1);
    var endGY = Math.min(WORLD_GRID_SIZE - 1, Math.ceil((camera.y + CANVAS_HEIGHT) / CELL_SIZE) + 1);

    drawBackground(startGX, startGY, endGX, endGY);
    drawTerritory(startGX, startGY, endGX, endGY);
    drawTrails(startGX, startGY, endGX, endGY);
    drawPowerUps();
    drawWorldBorder();
    drawEntities();
    drawParticles();
    drawMinimap();

    ctx.restore();
}

function worldToScreen(wx, wy) {
    return {
        sx: wx - camera.x,
        sy: wy - camera.y
    };
}

function drawBackground(startGX, startGY, endGX, endGY) {
    // Draw grid background
    for (var gy = startGY; gy <= endGY; gy++) {
        for (var gx = startGX; gx <= endGX; gx++) {
            var sx = gx * CELL_SIZE - camera.x;
            var sy = gy * CELL_SIZE - camera.y;

            // Subtle checkerboard
            if ((gx + gy) % 2 === 0) {
                ctx.fillStyle = '#1e1e3a';
            } else {
                ctx.fillStyle = '#1a1a34';
            }
            ctx.fillRect(sx, sy, CELL_SIZE, CELL_SIZE);
        }
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (var gx = startGX; gx <= endGX; gx++) {
        var sx = gx * CELL_SIZE - camera.x;
        ctx.beginPath();
        ctx.moveTo(sx, startGY * CELL_SIZE - camera.y);
        ctx.lineTo(sx, (endGY + 1) * CELL_SIZE - camera.y);
        ctx.stroke();
    }
    for (var gy = startGY; gy <= endGY; gy++) {
        var sy = gy * CELL_SIZE - camera.y;
        ctx.beginPath();
        ctx.moveTo(startGX * CELL_SIZE - camera.x, sy);
        ctx.lineTo((endGX + 1) * CELL_SIZE - camera.x, sy);
        ctx.stroke();
    }
}

function drawTerritory(startGX, startGY, endGX, endGY) {
    for (var gy = startGY; gy <= endGY; gy++) {
        for (var gx = startGX; gx <= endGX; gx++) {
            var owner = territoryGrid[gridIndex(gx, gy)];
            if (owner > 0) {
                var entity = getEntityById(owner);
                if (entity) {
                    var skin = SKINS[entity.skinId];
                    var sx = gx * CELL_SIZE - camera.x;
                    var sy = gy * CELL_SIZE - camera.y;

                    ctx.fillStyle = skin.territoryColor;
                    ctx.fillRect(sx, sy, CELL_SIZE, CELL_SIZE);

                    // Territory border: draw border on edges adjacent to non-owned cells
                    drawTerritoryEdge(gx, gy, owner, sx, sy, skin.borderColor);
                }
            }
        }
    }
}

function drawTerritoryEdge(gx, gy, owner, sx, sy, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.4;

    if (!isInBounds(gx, gy - 1) || territoryGrid[gridIndex(gx, gy - 1)] !== owner) {
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + CELL_SIZE, sy); ctx.stroke();
    }
    if (!isInBounds(gx, gy + 1) || territoryGrid[gridIndex(gx, gy + 1)] !== owner) {
        ctx.beginPath(); ctx.moveTo(sx, sy + CELL_SIZE); ctx.lineTo(sx + CELL_SIZE, sy + CELL_SIZE); ctx.stroke();
    }
    if (!isInBounds(gx - 1, gy) || territoryGrid[gridIndex(gx - 1, gy)] !== owner) {
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + CELL_SIZE); ctx.stroke();
    }
    if (!isInBounds(gx + 1, gy) || territoryGrid[gridIndex(gx + 1, gy)] !== owner) {
        ctx.beginPath(); ctx.moveTo(sx + CELL_SIZE, sy); ctx.lineTo(sx + CELL_SIZE, sy + CELL_SIZE); ctx.stroke();
    }

    ctx.globalAlpha = 1.0;
}

function drawTrails(startGX, startGY, endGX, endGY) {
    var pulse = 0.5 + 0.3 * Math.sin(gameTime * 6);

    for (var gy = startGY; gy <= endGY; gy++) {
        for (var gx = startGX; gx <= endGX; gx++) {
            var trailOwner = trailGrid[gridIndex(gx, gy)];
            if (trailOwner > 0) {
                var entity = getEntityById(trailOwner);
                if (entity) {
                    var skin = SKINS[entity.skinId];
                    var sx = gx * CELL_SIZE - camera.x;
                    var sy = gy * CELL_SIZE - camera.y;

                    ctx.globalAlpha = pulse;
                    ctx.fillStyle = skin.trailColor;
                    ctx.fillRect(sx + 1, sy + 1, CELL_SIZE - 2, CELL_SIZE - 2);

                    // Glow
                    ctx.fillStyle = skin.bodyColor;
                    ctx.globalAlpha = pulse * 0.3;
                    ctx.fillRect(sx - 1, sy - 1, CELL_SIZE + 2, CELL_SIZE + 2);

                    ctx.globalAlpha = 1.0;
                }
            }
        }
    }
}

function drawPowerUps() {
    var bob = Math.sin(gameTime * 3) * 3;
    for (var i = 0; i < powerUps.length; i++) {
        var pu = powerUps[i];
        var def = POWERUPS[pu.type];
        var pos = gridToWorld(pu.gx, pu.gy);
        var s = worldToScreen(pos.x, pos.y);

        // Check if visible
        if (s.sx < -30 || s.sx > CANVAS_WIDTH + 30 || s.sy < -30 || s.sy > CANVAS_HEIGHT + 30) continue;

        // Glow
        ctx.beginPath();
        ctx.arc(s.sx, s.sy + bob, 14, 0, Math.PI * 2);
        ctx.fillStyle = def.color;
        ctx.globalAlpha = 0.2 + 0.1 * Math.sin(gameTime * 4);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Icon circle
        ctx.beginPath();
        ctx.arc(s.sx, s.sy + bob, 8, 0, Math.PI * 2);
        ctx.fillStyle = def.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Icon text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(def.icon, s.sx, s.sy + bob);
    }
}

function drawWorldBorder() {
    var bx = -camera.x;
    var by = -camera.y;
    var bw = WORLD_PIXEL_SIZE;
    var bh = WORLD_PIXEL_SIZE;

    ctx.strokeStyle = '#FF2D55';
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.6 + 0.2 * Math.sin(gameTime * 2);
    ctx.strokeRect(bx, by, bw, bh);
    ctx.globalAlpha = 1.0;

    // Danger zone near border
    var dangerSize = CELL_SIZE * 2;
    ctx.fillStyle = 'rgba(255,45,85,0.05)';
    // Top
    ctx.fillRect(bx, by, bw, dangerSize);
    // Bottom
    ctx.fillRect(bx, by + bh - dangerSize, bw, dangerSize);
    // Left
    ctx.fillRect(bx, by, dangerSize, bh);
    // Right
    ctx.fillRect(bx + bw - dangerSize, by, dangerSize, bh);
}

function drawEntities() {
    // Draw all alive entities
    var allEntities = [player].concat(enemies);
    for (var i = 0; i < allEntities.length; i++) {
        var entity = allEntities[i];
        if (!entity || !entity.alive) continue;

        var s = worldToScreen(entity.x, entity.y);
        if (s.sx < -40 || s.sx > CANVAS_WIDTH + 40 || s.sy < -40 || s.sy > CANVAS_HEIGHT + 40) continue;

        drawBerry(entity, s.sx, s.sy);
    }
}

function drawBerry(entity, sx, sy) {
    var skin = SKINS[entity.skinId];
    var r = 10; // base radius
    var bobY = Math.sin(gameTime * 4 + entity.id) * 1.5;
    sy += bobY;

    ctx.save();

    // Shield effect
    if (entity.shielded) {
        ctx.beginPath();
        ctx.arc(sx, sy, r + 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(gameTime * 6);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    // Berry body — proper strawberry shape: wide at top, pointed at bottom
    ctx.fillStyle = skin.bodyColor;
    ctx.beginPath();
    ctx.moveTo(sx, sy - r * 0.6);
    ctx.quadraticCurveTo(sx + r, sy - r * 0.6, sx + r * 0.9, sy + r * 0.2);
    ctx.quadraticCurveTo(sx + r * 0.5, sy + r * 1.3, sx, sy + r * 1.2);
    ctx.quadraticCurveTo(sx - r * 0.5, sy + r * 1.3, sx - r * 0.9, sy + r * 0.2);
    ctx.quadraticCurveTo(sx - r, sy - r * 0.6, sx, sy - r * 0.6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Highlight / shine
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(sx - r * 0.3, sy - r * 0.15, r * 0.25, r * 0.5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Seeds
    ctx.fillStyle = skin.seedColor;
    var seeds = [
        [-3, 0], [3, 0],
        [-4, r * 0.5], [4, r * 0.5],
        [0, r * 0.8],
        [-2, -r * 0.3], [2, -r * 0.3]
    ];
    for (var s = 0; s < seeds.length; s++) {
        ctx.beginPath();
        ctx.ellipse(sx + seeds[s][0], sy + seeds[s][1], 1, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Leaves — two ellipses splayed out
    ctx.fillStyle = skin.leafColor;
    ctx.beginPath();
    ctx.ellipse(sx - 4, sy - r * 0.7, 5, 3, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sx + 4, sy - r * 0.7, 5, 3, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Stem
    ctx.strokeStyle = skin.leafColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy - r * 0.6);
    ctx.lineTo(sx, sy - r * 0.95);
    ctx.stroke();

    // Eyes (looking in movement direction)
    var eyeOffX = entity.dx * 1.5;
    var eyeOffY = entity.dy * 1.2;
    var eyeY = sy - r * 0.05;
    // Left eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(sx - 3 + eyeOffX * 0.3, eyeY + eyeOffY * 0.3, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(sx - 3 + eyeOffX * 0.6, eyeY + eyeOffY * 0.6, 1.3, 0, Math.PI * 2);
    ctx.fill();
    // Right eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(sx + 3 + eyeOffX * 0.3, eyeY + eyeOffY * 0.3, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(sx + 3 + eyeOffX * 0.6, eyeY + eyeOffY * 0.6, 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Name above entity
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.globalAlpha = 0.8;
    ctx.fillText(entity.name, sx, sy - r - 6);
    ctx.globalAlpha = 1.0;
}

function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var s = worldToScreen(p.x, p.y);
        var alpha = p.life / p.maxLife;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(s.sx, s.sy, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;
}

function drawMinimap() {
    var MINIMAP_SIZE = 100;
    var MINIMAP_MARGIN = 8;
    var mx = CANVAS_WIDTH - MINIMAP_SIZE - MINIMAP_MARGIN;
    var my = CANVAS_HEIGHT - MINIMAP_SIZE - MINIMAP_MARGIN;
    var scale = MINIMAP_SIZE / WORLD_GRID_SIZE;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(mx - 1, my - 1, MINIMAP_SIZE + 2, MINIMAP_SIZE + 2);

    // Territory (sample every few cells for performance)
    var step = 2;
    for (var gy = 0; gy < WORLD_GRID_SIZE; gy += step) {
        for (var gx = 0; gx < WORLD_GRID_SIZE; gx += step) {
            var owner = territoryGrid[gridIndex(gx, gy)];
            if (owner > 0) {
                var entity = getEntityById(owner);
                if (entity) {
                    ctx.fillStyle = SKINS[entity.skinId].bodyColor;
                    ctx.fillRect(
                        mx + gx * scale,
                        my + gy * scale,
                        Math.ceil(step * scale),
                        Math.ceil(step * scale)
                    );
                }
            }
        }
    }

    // Trail dots
    for (var gy = 0; gy < WORLD_GRID_SIZE; gy += step) {
        for (var gx = 0; gx < WORLD_GRID_SIZE; gx += step) {
            var trailOwner = trailGrid[gridIndex(gx, gy)];
            if (trailOwner > 0) {
                var entity = getEntityById(trailOwner);
                if (entity) {
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(mx + gx * scale, my + gy * scale, Math.ceil(step * scale), Math.ceil(step * scale));
                }
            }
        }
    }

    // Player position
    if (player && player.alive) {
        var pgx = Math.floor(player.x / CELL_SIZE);
        var pgy = Math.floor(player.y / CELL_SIZE);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(mx + pgx * scale - 1.5, my + pgy * scale - 1.5, 4, 4);
    }

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx - 1, my - 1, MINIMAP_SIZE + 2, MINIMAP_SIZE + 2);
}

// ============================================================
// INPUT HANDLING
// ============================================================
function setupInput() {
    document.addEventListener('keydown', function(e) {
        if (gameState !== 'PLAYING') return;
        keysDown[e.key] = true;

        var newDir = null;
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') newDir = { dx: 0, dy: -1 };
        else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') newDir = { dx: 0, dy: 1 };
        else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') newDir = { dx: -1, dy: 0 };
        else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') newDir = { dx: 1, dy: 0 };

        if (newDir) {
            e.preventDefault();
            // Prevent 180-degree turns
            if (newDir.dx !== -player.dx || newDir.dy !== -player.dy) {
                inputDir = newDir;
            }
        }
    });

    document.addEventListener('keyup', function(e) {
        delete keysDown[e.key];
    });
}

// ============================================================
// GAME FLOW
// ============================================================
function startGame(modeId) {
    currentMode = GAME_MODES[modeId];
    gameState = 'PLAYING';
    gameTime = 0;
    gameTimer = GAME_DURATION;
    gameResults = null;
    particles = [];
    powerUps = [];

    // Initialize grids
    territoryGrid = new Uint8Array(WORLD_GRID_SIZE * WORLD_GRID_SIZE);
    trailGrid = new Uint8Array(WORLD_GRID_SIZE * WORLD_GRID_SIZE);

    // Create player at center
    var centerGX = Math.floor(WORLD_GRID_SIZE / 2);
    var centerGY = Math.floor(WORLD_GRID_SIZE / 2);
    var saveData = loadSave();
    player = createEntity(1, saveData.selectedSkin, 'You', centerGX, centerGY);
    initTerritory(1, centerGX, centerGY, PLAYER_START_RADIUS);
    inputDir = { dx: 0, dy: -1 };

    // Camera snap to player
    camera.x = player.x - CANVAS_WIDTH / 2;
    camera.y = player.y - CANVAS_HEIGHT / 2;

    // Create AI enemies
    enemies = [];
    var enemyCount = currentMode.enemyCount;
    for (var i = 0; i < enemyCount; i++) {
        var id = i + 2; // IDs 2, 3, 4, ...
        var skinId = AI_SKINS[i % AI_SKINS.length];
        var name = AI_NAMES[i % AI_NAMES.length];

        // Place enemies spread around the map
        var angle = (i / enemyCount) * Math.PI * 2;
        var dist = WORLD_GRID_SIZE * 0.3;
        var egx = Math.floor(centerGX + Math.cos(angle) * dist);
        var egy = Math.floor(centerGY + Math.sin(angle) * dist);
        egx = Math.max(10, Math.min(WORLD_GRID_SIZE - 10, egx));
        egy = Math.max(10, Math.min(WORLD_GRID_SIZE - 10, egy));

        var enemy = createEntity(id, skinId, name, egx, egy);
        enemy.speed = PLAYER_SPEED * currentMode.enemySpeedMult;
        initTerritory(id, egx, egy, PLAYER_START_RADIUS);
        initAI(enemy, currentMode.enemyAggression);
        enemies.push(enemy);
    }

    // Show HUD, hide menu
    showScreen('PLAYING');
}

function endGame(won) {
    if (gameState !== 'PLAYING') return;

    var territoryPct = player.alive ? getTerritoryPercentage(1) : 0;
    var cellsCaptured = player.territoryCaptured;
    var kills = player.kills;

    var saveData = loadSave();
    var mode = currentMode;

    // Calculate rewards
    var berriesEarned = Math.floor(cellsCaptured * BERRIES_PER_CELL) + kills * BERRIES_PER_KILL;
    var xpEarned = Math.floor(cellsCaptured * XP_PER_CELL) + kills * XP_PER_KILL;
    if (won) {
        berriesEarned += BERRIES_WIN_BONUS;
        xpEarned += XP_WIN_BONUS;
    }
    xpEarned = Math.floor(xpEarned * mode.xpMultiplier);

    // Update save
    saveData.berries += berriesEarned;
    saveData.xp += xpEarned;
    saveData.stats.gamesPlayed++;
    saveData.stats.totalTerritory += cellsCaptured;
    saveData.stats.totalKills += kills;
    if (territoryPct > saveData.stats.bestTerritory) {
        saveData.stats.bestTerritory = territoryPct;
    }

    // Check level up
    while (saveData.level < MAX_LEVEL && saveData.xp >= XP_PER_LEVEL[saveData.level]) {
        saveData.xp -= XP_PER_LEVEL[saveData.level];
        saveData.level++;
    }

    saveToDisk(saveData);

    gameResults = {
        won: won,
        territoryPct: territoryPct.toFixed(1),
        cellsCaptured: cellsCaptured,
        kills: kills,
        berriesEarned: berriesEarned,
        xpEarned: xpEarned
    };

    gameState = 'GAME_OVER';
    showScreen('GAME_OVER');
}

// ============================================================
// UPDATE LOOP
// ============================================================
function update(dt) {
    if (gameState !== 'PLAYING') return;

    gameTime += dt;
    gameTimer -= dt;

    // Timer expired - whoever has most territory wins
    if (gameTimer <= 0) {
        gameTimer = 0;
        var playerPct = getTerritoryPercentage(1);
        var maxEnemyPct = 0;
        for (var i = 0; i < enemies.length; i++) {
            if (enemies[i].alive) {
                var pct = getTerritoryPercentage(enemies[i].id);
                if (pct > maxEnemyPct) maxEnemyPct = pct;
            }
        }
        endGame(playerPct >= maxEnemyPct);
        return;
    }

    // Update player
    if (player && player.alive) {
        player.dx = inputDir.dx;
        player.dy = inputDir.dy;
        moveEntity(player, dt);
        updatePowerUp(player, dt);
    }

    // Check win by territory
    if (player && player.alive) {
        var pct = getTerritoryPercentage(1);
        if (pct >= WIN_TERRITORY_PCT) {
            endGame(true);
            return;
        }
    }

    // Update enemies
    for (var i = 0; i < enemies.length; i++) {
        var enemy = enemies[i];
        if (!enemy.alive) {
            enemy.respawnTimer -= dt;
            if (enemy.respawnTimer <= 0) {
                respawnEntity(enemy);
                initAI(enemy, currentMode.enemyAggression);
            }
            continue;
        }
        updateAI(enemy, dt);
        moveEntity(enemy, dt);
    }

    // Spawn power-ups in berry mode
    if (currentMode.special) {
        if (Math.random() < dt / POWERUP_SPAWN_INTERVAL) {
            spawnPowerUp();
        }
        // Animate power-ups
        for (var i = 0; i < powerUps.length; i++) {
            powerUps[i].time += dt;
        }
    }

    updateParticles(dt);
    updateCamera();
    updateHUD();
}

// ============================================================
// GAME LOOP
// ============================================================
function gameLoop(timestamp) {
    var dt = (timestamp - lastTime) / 1000;
    if (dt > DT_CAP) dt = DT_CAP;
    lastTime = timestamp;

    update(dt);
    render();

    requestAnimationFrame(gameLoop);
}

// ============================================================
// CANVAS RESIZE
// ============================================================
function resizeCanvas() {
    var container = document.getElementById('game-container');
    var cw = container.clientWidth;
    var ch = container.clientHeight;

    var ratio = CANVAS_WIDTH / CANVAS_HEIGHT;
    var containerRatio = cw / ch;

    if (containerRatio > ratio) {
        canvas.style.height = ch + 'px';
        canvas.style.width = Math.floor(ch * ratio) + 'px';
    } else {
        canvas.style.width = cw + 'px';
        canvas.style.height = Math.floor(cw / ratio) + 'px';
    }
}

// ============================================================
// INITIALIZATION
// ============================================================
function initGame() {
    setupInput();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}
