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
        angle: -Math.PI / 2,
        targetAngle: -Math.PI / 2,
        speed: PLAYER_SPEED,
        skinId: skinId,
        name: name,
        trail: [],
        smoothTrail: [], // actual world positions for smooth rendering
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

    // Smooth turning toward target angle
    var diff = entity.targetAngle - entity.angle;
    // Normalize to [-PI, PI]
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    var maxTurn = TURN_SPEED * dt;
    if (Math.abs(diff) < maxTurn) {
        entity.angle = entity.targetAngle;
    } else {
        entity.angle += (diff > 0 ? maxTurn : -maxTurn);
    }
    // Update dx/dy from angle
    entity.dx = Math.cos(entity.angle);
    entity.dy = Math.sin(entity.angle);

    var speed = entity.speed * entity.speedMult;
    var distance = speed * dt;

    entity.x += entity.dx * distance;
    entity.y += entity.dy * distance;

    // Record smooth world position when outside territory
    if (entity.isOutside) {
        var st = entity.smoothTrail;
        if (st.length === 0 || Math.abs(entity.x - st[st.length - 2]) + Math.abs(entity.y - st[st.length - 1]) > CELL_SIZE * 1.5) {
            st.push(entity.x, entity.y);
        }
    }

    // Clamp to world bounds (no death, just stop at the edge)
    entity.x = Math.max(CELL_SIZE, Math.min(WORLD_PIXEL_SIZE - CELL_SIZE, entity.x));
    entity.y = Math.max(CELL_SIZE, Math.min(WORLD_PIXEL_SIZE - CELL_SIZE, entity.y));

    // Check grid cell transition
    var gpos = worldToGrid(entity.x, entity.y);
    var gx = gpos.gx, gy = gpos.gy;

    if (gx !== entity.lastGX || gy !== entity.lastGY) {
        // If moved diagonally, also step through adjacent cells to avoid trail gaps
        var dgx = gx - entity.lastGX;
        var dgy = gy - entity.lastGY;
        if (dgx !== 0 && dgy !== 0) {
            onEnterCell(entity, entity.lastGX + dgx, entity.lastGY);
        }
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
    if (trailOwner > 0 && trailOwner !== entity.id) {
        if (!entity.shielded) {
            var trailEntity = getEntityById(trailOwner);
            if (trailEntity) trailEntity.kills++;
            killEntity(entity, trailOwner);
            return;
        }
    }

    // Check if stepping on own trail -> self-kill
    if (trailOwner === entity.id && entity.isOutside && entity.trail.length > 20) {
        var isRecent = false;
        for (var ti = Math.max(0, entity.trail.length - 20); ti < entity.trail.length; ti++) {
            if (entity.trail[ti].gx === gx && entity.trail[ti].gy === gy) {
                isRecent = true;
                break;
            }
        }
        if (!isRecent) {
            killEntity(entity, 0);
            return;
        }
    }

    if (cellOwner === entity.id) {
        // Returned to own territory
        if (entity.isOutside && entity.trail.length > 0) {
            var captured = floodFillCapture(entity.id);
            entity.territoryCaptured += captured;
            entity.trail = [];
            entity.smoothTrail = [];
            entity.isOutside = false;

            // Kill enemies caught inside captured territory (player encircling only)
            if (entity.id === 1) {
                for (var ki = 0; ki < enemies.length; ki++) {
                    var victim = enemies[ki];
                    if (!victim || !victim.alive) continue;
                    var vpos = worldToGrid(victim.x, victim.y);
                    if (territoryGrid[gridIndex(vpos.gx, vpos.gy)] === entity.id) {
                        killEntity(victim, entity.id);
                    }
                }
            }

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
    entity.smoothTrail = [];
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
            entity.smoothTrail = [];
            entity.dx = 0;
            entity.dy = -1;
            entity.angle = -Math.PI / 2;
            entity.targetAngle = -Math.PI / 2;
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
    camera.x += (targetX - camera.x) * 0.08;
    camera.y += (targetY - camera.y) * 0.08;
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
    // Clean solid background - no grid, like Paper.io 2
    ctx.fillStyle = '#1c1c38';
    var bx = startGX * CELL_SIZE - camera.x;
    var by = startGY * CELL_SIZE - camera.y;
    var bw = (endGX - startGX + 1) * CELL_SIZE;
    var bh = (endGY - startGY + 1) * CELL_SIZE;
    ctx.fillRect(bx, by, bw, bh);
}

function drawTerritory(startGX, startGY, endGX, endGY) {
    // Fill territory - single path per owner to avoid grid artifacts
    var ownerCells = {};
    for (var gy = startGY; gy <= endGY; gy++) {
        for (var gx = startGX; gx <= endGX; gx++) {
            var owner = territoryGrid[gridIndex(gx, gy)];
            if (owner > 0) {
                if (!ownerCells[owner]) ownerCells[owner] = [];
                ownerCells[owner].push(gx, gy);
            }
        }
    }
    for (var ownerId in ownerCells) {
        var entity = getEntityById(parseInt(ownerId));
        if (!entity) continue;
        ctx.fillStyle = SKINS[entity.skinId].territoryColor;
        ctx.beginPath();
        var cells = ownerCells[ownerId];
        for (var i = 0; i < cells.length; i += 2) {
            var sx = cells[i] * CELL_SIZE - camera.x;
            var sy = cells[i + 1] * CELL_SIZE - camera.y;
            ctx.rect(sx - 0.25, sy - 0.25, CELL_SIZE + 0.5, CELL_SIZE + 0.5);
        }
        ctx.fill();
    }

    // Border: overlapping circles at border cell centers
    var bordersByOwner = {};
    for (var gy = startGY; gy <= endGY; gy++) {
        for (var gx = startGX; gx <= endGX; gx++) {
            var owner = territoryGrid[gridIndex(gx, gy)];
            if (owner <= 0) continue;
            if ((!isInBounds(gx, gy - 1) || territoryGrid[gridIndex(gx, gy - 1)] !== owner) ||
                (!isInBounds(gx, gy + 1) || territoryGrid[gridIndex(gx, gy + 1)] !== owner) ||
                (!isInBounds(gx - 1, gy) || territoryGrid[gridIndex(gx - 1, gy)] !== owner) ||
                (!isInBounds(gx + 1, gy) || territoryGrid[gridIndex(gx + 1, gy)] !== owner)) {
                if (!bordersByOwner[owner]) bordersByOwner[owner] = [];
                bordersByOwner[owner].push(gx, gy);
            }
        }
    }

    var r = CELL_SIZE * 0.7;
    for (var ownerId in bordersByOwner) {
        var entity = getEntityById(parseInt(ownerId));
        if (!entity) continue;
        ctx.fillStyle = SKINS[entity.skinId].borderColor;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        var cells = bordersByOwner[ownerId];
        for (var i = 0; i < cells.length; i += 2) {
            var cx = cells[i] * CELL_SIZE + CELL_SIZE * 0.5 - camera.x;
            var cy = cells[i + 1] * CELL_SIZE + CELL_SIZE * 0.5 - camera.y;
            ctx.moveTo(cx + r, cy);
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

function drawTrails(startGX, startGY, endGX, endGY) {
    var pulse = 0.6 + 0.2 * Math.sin(gameTime * 6);

    // Draw trail using smooth world positions (actual curved path)
    var allEntities = [player];
    for (var ei = 0; ei < enemies.length; ei++) allEntities.push(enemies[ei]);

    for (var e = 0; e < allEntities.length; e++) {
        var entity = allEntities[e];
        if (!entity || !entity.alive) continue;
        var st = entity.smoothTrail;
        if (st.length < 4) continue;

        var skin = SKINS[entity.skinId];

        // Build smooth curved path using quadratic bezier through midpoints
        function drawSmoothPath() {
            // Collect all screen points including current position
            var pts = [];
            for (var ti = 0; ti < st.length; ti += 2) {
                var s = worldToScreen(st[ti], st[ti + 1]);
                pts.push(s.sx, s.sy);
            }
            var es = worldToScreen(entity.x, entity.y);
            pts.push(es.sx, es.sy);

            if (pts.length < 4) return;

            ctx.moveTo(pts[0], pts[1]);
            if (pts.length === 4) {
                ctx.lineTo(pts[2], pts[3]);
                return;
            }
            // Quadratic bezier through midpoints for smooth curves
            for (var i = 2; i < pts.length - 2; i += 2) {
                var midX = (pts[i] + pts[i + 2]) * 0.5;
                var midY = (pts[i + 1] + pts[i + 3]) * 0.5;
                ctx.quadraticCurveTo(pts[i], pts[i + 1], midX, midY);
            }
            // Final segment to last point
            ctx.lineTo(pts[pts.length - 2], pts[pts.length - 1]);
        }

        // Glow line (wider, behind)
        ctx.beginPath();
        ctx.strokeStyle = skin.bodyColor;
        ctx.lineWidth = CELL_SIZE + 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = pulse * 0.2;
        drawSmoothPath();
        ctx.stroke();

        // Main trail line
        ctx.beginPath();
        ctx.strokeStyle = skin.trailColor;
        ctx.lineWidth = CELL_SIZE - 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = pulse;
        drawSmoothPath();
        ctx.stroke();

        ctx.globalAlpha = 1.0;
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

// ---- Strawberry: heart/teardrop shape, wide top, pointed bottom, seeds ----
function drawStrawberryBody(sx, sy, r, skin) {
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
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(sx - r * 0.3, sy - r * 0.15, r * 0.25, r * 0.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Seeds
    ctx.fillStyle = skin.seedColor;
    var seeds = [[-3, 0], [3, 0], [-4, r * 0.5], [4, r * 0.5], [0, r * 0.8], [-2, -r * 0.3], [2, -r * 0.3]];
    for (var s = 0; s < seeds.length; s++) {
        ctx.beginPath();
        ctx.ellipse(sx + seeds[s][0], sy + seeds[s][1], 1, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    // Leaves
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
}

// ---- Raspberry: round cluster of bumpy drupelets ----
function drawRaspberryBody(sx, sy, r, skin) {
    // Drupelets arranged in a dome shape
    var drupelets = [
        // center column
        {x: 0, y: 0, s: 3.2},
        {x: 0, y: -5, s: 3.0},
        {x: 0, y: 5, s: 3.0},
        {x: 0, y: 9, s: 2.5},
        // left column
        {x: -5, y: -3, s: 3.0},
        {x: -5, y: 3, s: 3.0},
        {x: -4, y: 8, s: 2.2},
        // right column
        {x: 5, y: -3, s: 3.0},
        {x: 5, y: 3, s: 3.0},
        {x: 4, y: 8, s: 2.2},
        // outer
        {x: -8, y: 0, s: 2.5},
        {x: 8, y: 0, s: 2.5},
        {x: -3, y: -8, s: 2.2},
        {x: 3, y: -8, s: 2.2}
    ];
    // Shadow behind
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (var i = 0; i < drupelets.length; i++) {
        ctx.beginPath();
        ctx.arc(sx + drupelets[i].x + 0.5, sy + drupelets[i].y + 0.5, drupelets[i].s, 0, Math.PI * 2);
        ctx.fill();
    }
    // Main drupelets
    ctx.fillStyle = skin.bodyColor;
    for (var i = 0; i < drupelets.length; i++) {
        ctx.beginPath();
        ctx.arc(sx + drupelets[i].x, sy + drupelets[i].y, drupelets[i].s, 0, Math.PI * 2);
        ctx.fill();
    }
    // Highlight on each drupelet
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    for (var i = 0; i < drupelets.length; i++) {
        ctx.beginPath();
        ctx.arc(sx + drupelets[i].x - 0.8, sy + drupelets[i].y - 0.8, drupelets[i].s * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }
    // Leaves — small, at the top
    ctx.fillStyle = skin.leafColor;
    ctx.beginPath();
    ctx.ellipse(sx - 3, sy - r * 0.9, 4, 2.5, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sx + 3, sy - r * 0.9, 4, 2.5, 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Stem
    ctx.strokeStyle = skin.leafColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy - r * 0.7);
    ctx.lineTo(sx, sy - r * 1.1);
    ctx.stroke();
}

// ---- Blueberry: simple round shape with calyx (crown) at top ----
function drawBlueberryBody(sx, sy, r, skin) {
    // Main round body
    ctx.fillStyle = skin.bodyColor;
    ctx.beginPath();
    ctx.arc(sx, sy + 1, r * 1.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // Frosted bloom effect (whitish dusting)
    ctx.fillStyle = 'rgba(180,200,255,0.15)';
    ctx.beginPath();
    ctx.arc(sx, sy + 1, r * 0.95, 0, Math.PI * 2);
    ctx.fill();
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(sx - r * 0.3, sy - r * 0.2, r * 0.2, r * 0.4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Calyx (5-pointed star/crown at the top)
    ctx.fillStyle = skin.leafColor;
    var calyxY = sy - r * 0.65;
    for (var i = 0; i < 5; i++) {
        var angle = -Math.PI / 2 + (i / 5) * Math.PI * 2;
        var tx = sx + Math.cos(angle) * 4;
        var ty = calyxY + Math.sin(angle) * 3;
        ctx.beginPath();
        ctx.ellipse(tx, ty, 2, 3.5, angle + Math.PI / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ---- Blackberry: similar to raspberry but more elongated, tighter drupelets ----
function drawBlackberryBody(sx, sy, r, skin) {
    // More elongated cluster than raspberry
    var drupelets = [
        // center column (tall)
        {x: 0, y: -7, s: 2.8},
        {x: 0, y: -2, s: 3.0},
        {x: 0, y: 3, s: 3.0},
        {x: 0, y: 8, s: 2.8},
        {x: 0, y: 12, s: 2.2},
        // left
        {x: -5, y: -4, s: 2.6},
        {x: -5, y: 1, s: 2.8},
        {x: -5, y: 6, s: 2.6},
        {x: -4, y: 10, s: 2.0},
        // right
        {x: 5, y: -4, s: 2.6},
        {x: 5, y: 1, s: 2.8},
        {x: 5, y: 6, s: 2.6},
        {x: 4, y: 10, s: 2.0},
        // outer edges
        {x: -8, y: -1, s: 2.0},
        {x: 8, y: -1, s: 2.0},
        {x: -3, y: -10, s: 2.0},
        {x: 3, y: -10, s: 2.0}
    ];
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    for (var i = 0; i < drupelets.length; i++) {
        ctx.beginPath();
        ctx.arc(sx + drupelets[i].x + 0.5, sy + drupelets[i].y + 0.5, drupelets[i].s, 0, Math.PI * 2);
        ctx.fill();
    }
    // Main drupelets
    ctx.fillStyle = skin.bodyColor;
    for (var i = 0; i < drupelets.length; i++) {
        ctx.beginPath();
        ctx.arc(sx + drupelets[i].x, sy + drupelets[i].y, drupelets[i].s, 0, Math.PI * 2);
        ctx.fill();
    }
    // Purple/blue sheen highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; // subtle sheen highlight
    for (var i = 0; i < drupelets.length; i++) {
        ctx.beginPath();
        ctx.arc(sx + drupelets[i].x - 0.6, sy + drupelets[i].y - 0.6, drupelets[i].s * 0.45, 0, Math.PI * 2);
        ctx.fill();
    }
    // Leaves
    ctx.fillStyle = skin.leafColor;
    ctx.beginPath();
    ctx.ellipse(sx - 3, sy - r * 1.1, 4, 2.5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sx + 3, sy - r * 1.1, 4, 2.5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // Stem
    ctx.strokeStyle = skin.leafColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy - r * 0.9);
    ctx.lineTo(sx, sy - r * 1.3);
    ctx.stroke();
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

    // Determine base berry type (golden variants use the same shape as their base)
    var berryType = entity.skinId.replace('golden_', '');

    if (berryType === 'raspberry') {
        drawRaspberryBody(sx, sy, r, skin);
    } else if (berryType === 'blueberry') {
        drawBlueberryBody(sx, sy, r, skin);
    } else if (berryType === 'blackberry') {
        drawBlackberryBody(sx, sy, r, skin);
    } else {
        drawStrawberryBody(sx, sy, r, skin);
    }

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

    // VIP badge above name
    if (entity.isVip) {
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        var vipY = sy - r - 16;
        var vipW = ctx.measureText('VIP').width + 6;
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(sx - vipW / 2, vipY - 8, vipW, 10);
        ctx.fillStyle = '#000';
        ctx.fillText('VIP', sx, vipY + 1);
        ctx.globalAlpha = 1.0;
    }

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
function updateInputFromKeys() {
    if (gameState !== 'PLAYING') return;
    var dx = 0, dy = 0;
    if (keysDown['arrowup'] || keysDown['w']) dy -= 1;
    if (keysDown['arrowdown'] || keysDown['s']) dy += 1;
    if (keysDown['arrowleft'] || keysDown['a']) dx -= 1;
    if (keysDown['arrowright'] || keysDown['d']) dx += 1;
    if (dx === 0 && dy === 0) return;
    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
        var inv = 1 / Math.sqrt(2);
        dx *= inv;
        dy *= inv;
    }
    // Prevent 180-degree turns
    if (player && !(dx === -player.dx && dy === -player.dy)) {
        inputDir = { dx: dx, dy: dy };
    }
}

function setupInput() {
    // Mouse steering - player moves toward cursor
    canvas.addEventListener('mousemove', function(e) {
        if (gameState !== 'PLAYING' || !player) return;
        var rect = canvas.getBoundingClientRect();
        // Scale mouse position to canvas coordinates
        var mouseX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
        var mouseY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
        // Player screen position
        var playerScreenX = player.x - camera.x;
        var playerScreenY = player.y - camera.y;
        var dx = mouseX - playerScreenX;
        var dy = mouseY - playerScreenY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
            inputDir = { dx: dx / dist, dy: dy / dist };
        }
    });

    // Keyboard as fallback
    document.addEventListener('keydown', function(e) {
        if (gameState !== 'PLAYING') return;
        keysDown[e.key.toLowerCase()] = true;
        updateInputFromKeys();
        if (['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].indexOf(e.key.toLowerCase()) !== -1) {
            e.preventDefault();
        }
    });

    document.addEventListener('keyup', function(e) {
        delete keysDown[e.key.toLowerCase()];
        updateInputFromKeys();
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
    player = createEntity(1, saveData.selectedSkin, t('leaderboard.you'), centerGX, centerGY);
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
        egx = Math.max(20, Math.min(WORLD_GRID_SIZE - 20, egx));
        egy = Math.max(20, Math.min(WORLD_GRID_SIZE - 20, egy));

        var enemy = createEntity(id, skinId, name, egx, egy);
        enemy.isVip = Math.random() < 0.4;
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

    // Update player
    if (player && player.alive) {
        player.targetAngle = Math.atan2(inputDir.dy, inputDir.dx);
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
