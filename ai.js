// ============================================================
// AI SYSTEM
// ============================================================

// AI States
var AI_EXPANDING = 'EXPANDING';
var AI_RETURNING = 'RETURNING';
var AI_HUNTING = 'HUNTING';
var AI_IDLE = 'IDLE';

function initAI(enemy, aggression) {
    enemy.aiState = AI_IDLE;
    enemy.aiAggression = aggression;
    enemy.aiWaypoints = [];
    enemy.aiWaypointIndex = 0;
    enemy.aiStepsRemaining = 0;
    enemy.aiIdleTimer = 0.5 + Math.random() * 0.5;
    enemy.aiReturnTarget = null;
    enemy.aiHuntTarget = null;
    enemy.aiStepAccum = 0;
}

function updateAI(enemy, dt) {
    if (!enemy.alive) return;

    switch (enemy.aiState) {
        case AI_IDLE:
            aiIdle(enemy, dt);
            break;
        case AI_EXPANDING:
            aiExpanding(enemy, dt);
            break;
        case AI_RETURNING:
            aiReturning(enemy, dt);
            break;
        case AI_HUNTING:
            aiHunting(enemy, dt);
            break;
    }
}

// ============================================================
// AI STATES
// ============================================================
function aiIdle(enemy, dt) {
    enemy.aiIdleTimer -= dt;
    if (enemy.aiIdleTimer <= 0) {
        // Decide next action
        if (enemy.isOutside) {
            // Need to return home first
            enemy.aiState = AI_RETURNING;
            findReturnPath(enemy);
            return;
        }

        // Check for hunting opportunity
        if (Math.random() < enemy.aiAggression * 0.3) {
            var target = findNearbyTrail(enemy);
            if (target) {
                enemy.aiState = AI_HUNTING;
                enemy.aiHuntTarget = target;
                return;
            }
        }

        // Default: expand
        planRectangularLoop(enemy);
        enemy.aiState = AI_EXPANDING;
    }
}

function aiExpanding(enemy, dt) {
    if (enemy.aiWaypoints.length === 0 || enemy.aiWaypointIndex >= enemy.aiWaypoints.length) {
        // Done expanding, go idle
        enemy.aiState = AI_IDLE;
        enemy.aiIdleTimer = 0.3 + Math.random() * 0.5;
        return;
    }

    var wp = enemy.aiWaypoints[enemy.aiWaypointIndex];
    enemy.dx = wp.dir.dx;
    enemy.dy = wp.dir.dy;

    // Count cell transitions
    var gpos = worldToGrid(enemy.x, enemy.y);
    var currentGX = gpos.gx, currentGY = gpos.gy;

    // Track accumulated movement
    enemy.aiStepAccum += enemy.speed * enemy.speedMult * dt;
    if (enemy.aiStepAccum >= CELL_SIZE) {
        enemy.aiStepAccum -= CELL_SIZE;
        enemy.aiStepsRemaining--;

        if (enemy.aiStepsRemaining <= 0) {
            enemy.aiWaypointIndex++;
            if (enemy.aiWaypointIndex < enemy.aiWaypoints.length) {
                enemy.aiStepsRemaining = enemy.aiWaypoints[enemy.aiWaypointIndex].steps;
            }
        }
    }

    // Safety: if trail is too long, abort and return
    if (enemy.trail.length > 50) {
        enemy.aiState = AI_RETURNING;
        findReturnPath(enemy);
    }

    // Safety: about to hit world border
    var futureGX = currentGX + enemy.dx * 3;
    var futureGY = currentGY + enemy.dy * 3;
    if (!isInBounds(futureGX, futureGY)) {
        enemy.aiState = AI_RETURNING;
        findReturnPath(enemy);
    }
}

function aiReturning(enemy, dt) {
    if (!enemy.isOutside) {
        // Made it back!
        enemy.aiState = AI_IDLE;
        enemy.aiIdleTimer = 0.2 + Math.random() * 0.3;
        return;
    }

    // Navigate toward nearest own territory
    var gpos = worldToGrid(enemy.x, enemy.y);
    var dir = findDirectionToTerritory(enemy, gpos.gx, gpos.gy);
    if (dir) {
        enemy.dx = dir.dx;
        enemy.dy = dir.dy;
    }
}

function aiHunting(enemy, dt) {
    if (!enemy.aiHuntTarget) {
        enemy.aiState = AI_IDLE;
        enemy.aiIdleTimer = 0.3;
        return;
    }

    // Safety: don't hunt too long outside territory
    if (enemy.trail.length > 30) {
        enemy.aiState = AI_RETURNING;
        findReturnPath(enemy);
        return;
    }

    var gpos = worldToGrid(enemy.x, enemy.y);
    var tgx = enemy.aiHuntTarget.gx;
    var tgy = enemy.aiHuntTarget.gy;

    // Check if target trail still exists
    if (trailGrid[gridIndex(tgx, tgy)] === 0) {
        // Trail gone, give up
        if (enemy.isOutside) {
            enemy.aiState = AI_RETURNING;
            findReturnPath(enemy);
        } else {
            enemy.aiState = AI_IDLE;
            enemy.aiIdleTimer = 0.3;
        }
        return;
    }

    // Move toward target
    var ddx = tgx - gpos.gx;
    var ddy = tgy - gpos.gy;

    if (Math.abs(ddx) > Math.abs(ddy)) {
        enemy.dx = ddx > 0 ? 1 : -1;
        enemy.dy = 0;
    } else {
        enemy.dx = 0;
        enemy.dy = ddy > 0 ? 1 : -1;
    }

    // Prevent 180-degree turn into own trail
    var nextGX = gpos.gx + enemy.dx;
    var nextGY = gpos.gy + enemy.dy;
    if (isInBounds(nextGX, nextGY) && trailGrid[gridIndex(nextGX, nextGY)] === enemy.id) {
        // Try perpendicular direction
        if (enemy.dx !== 0) {
            enemy.dy = Math.random() < 0.5 ? 1 : -1;
            enemy.dx = 0;
        } else {
            enemy.dx = Math.random() < 0.5 ? 1 : -1;
            enemy.dy = 0;
        }
    }
}

// ============================================================
// AI HELPERS
// ============================================================
function planRectangularLoop(enemy) {
    var baseSize = 3;
    var maxExtra = Math.floor(enemy.aiAggression * 12);
    var loopWidth = baseSize + Math.floor(Math.random() * (maxExtra + 1));
    var loopHeight = baseSize + Math.floor(Math.random() * (maxExtra + 1));

    // Pick a random rotation for the loop
    var patterns = [
        // Clockwise variations
        [{dx:0,dy:-1}, {dx:1,dy:0}, {dx:0,dy:1}, {dx:-1,dy:0}],
        [{dx:1,dy:0}, {dx:0,dy:1}, {dx:-1,dy:0}, {dx:0,dy:-1}],
        [{dx:0,dy:1}, {dx:-1,dy:0}, {dx:0,dy:-1}, {dx:1,dy:0}],
        [{dx:-1,dy:0}, {dx:0,dy:-1}, {dx:1,dy:0}, {dx:0,dy:1}],
        // Counter-clockwise variations
        [{dx:0,dy:-1}, {dx:-1,dy:0}, {dx:0,dy:1}, {dx:1,dy:0}],
        [{dx:1,dy:0}, {dx:0,dy:-1}, {dx:-1,dy:0}, {dx:0,dy:1}],
        [{dx:0,dy:1}, {dx:1,dy:0}, {dx:0,dy:-1}, {dx:-1,dy:0}],
        [{dx:-1,dy:0}, {dx:0,dy:1}, {dx:1,dy:0}, {dx:0,dy:-1}]
    ];

    var pattern = patterns[Math.floor(Math.random() * patterns.length)];

    enemy.aiWaypoints = [
        { dir: pattern[0], steps: loopHeight },
        { dir: pattern[1], steps: loopWidth },
        { dir: pattern[2], steps: loopHeight },
        { dir: pattern[3], steps: loopWidth }
    ];
    enemy.aiWaypointIndex = 0;
    enemy.aiStepsRemaining = enemy.aiWaypoints[0].steps;
    enemy.aiStepAccum = 0;
}

function findReturnPath(enemy) {
    enemy.aiReturnTarget = null;
}

function findDirectionToTerritory(entity, gx, gy) {
    // BFS to find nearest territory cell, return first step direction
    var visited = {};
    var queue = [[gx, gy, null]]; // gx, gy, firstDir
    visited[gx + ',' + gy] = true;
    var qi = 0;

    var dirs = [
        {dx: 0, dy: -1},
        {dx: 0, dy: 1},
        {dx: -1, dy: 0},
        {dx: 1, dy: 0}
    ];

    // Limit BFS radius for performance
    var maxSteps = 400;
    var steps = 0;

    while (qi < queue.length && steps < maxSteps) {
        var cur = queue[qi++];
        var cx = cur[0], cy = cur[1], firstDir = cur[2];
        steps++;

        for (var d = 0; d < 4; d++) {
            var nx = cx + dirs[d].dx;
            var ny = cy + dirs[d].dy;

            if (!isInBounds(nx, ny)) continue;
            var key = nx + ',' + ny;
            if (visited[key]) continue;
            visited[key] = true;

            // Don't walk through own trail
            if (trailGrid[gridIndex(nx, ny)] === entity.id) continue;

            var newFirstDir = firstDir || dirs[d];

            // Found own territory!
            if (territoryGrid[gridIndex(nx, ny)] === entity.id) {
                return newFirstDir;
            }

            queue.push([nx, ny, newFirstDir]);
        }
    }

    // Fallback: just move toward center of map
    var centerGX = Math.floor(WORLD_GRID_SIZE / 2);
    var centerGY = Math.floor(WORLD_GRID_SIZE / 2);
    var ddx = centerGX - gx;
    var ddy = centerGY - gy;
    if (Math.abs(ddx) > Math.abs(ddy)) {
        return { dx: ddx > 0 ? 1 : -1, dy: 0 };
    }
    return { dx: 0, dy: ddy > 0 ? 1 : -1 };
}

function findNearbyTrail(enemy) {
    var gpos = worldToGrid(enemy.x, enemy.y);
    var searchRadius = 15;

    var bestDist = Infinity;
    var bestTarget = null;

    for (var dy = -searchRadius; dy <= searchRadius; dy++) {
        for (var dx = -searchRadius; dx <= searchRadius; dx++) {
            var checkGX = gpos.gx + dx;
            var checkGY = gpos.gy + dy;
            if (!isInBounds(checkGX, checkGY)) continue;

            var trailOwner = trailGrid[gridIndex(checkGX, checkGY)];
            if (trailOwner > 0 && trailOwner !== enemy.id) {
                var dist = Math.abs(dx) + Math.abs(dy);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestTarget = { gx: checkGX, gy: checkGY };
                }
            }
        }
    }

    return bestTarget;
}
