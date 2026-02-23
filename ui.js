// ============================================================
// UI SYSTEM - Menus, Shop, Persistence, Touch Controls
// ============================================================

// ============================================================
// SAVE / LOAD
// ============================================================
function loadSave() {
    try {
        var raw = localStorage.getItem('strawberry_io_save');
        if (raw) {
            var data = JSON.parse(raw);
            // Merge with defaults for any missing keys
            for (var key in DEFAULT_SAVE) {
                if (data[key] === undefined) {
                    data[key] = DEFAULT_SAVE[key];
                }
            }
            if (!data.settings) data.settings = DEFAULT_SAVE.settings;
            if (!data.stats) data.stats = DEFAULT_SAVE.stats;
            // Ensure all default skins are unlocked
            var defSkins = DEFAULT_SAVE.unlockedSkins;
            for (var i = 0; i < defSkins.length; i++) {
                if (data.unlockedSkins.indexOf(defSkins[i]) === -1) {
                    data.unlockedSkins.push(defSkins[i]);
                }
            }
            return data;
        }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_SAVE));
}

function saveToDisk(saveData) {
    try {
        localStorage.setItem('strawberry_io_save', JSON.stringify(saveData));
    } catch (e) {}
}

// ============================================================
// SCREEN MANAGEMENT
// ============================================================
function showScreen(state) {
    var menuEl = document.getElementById('screen-menu');
    var shopEl = document.getElementById('screen-shop');
    var settingsEl = document.getElementById('screen-settings');
    var vipEl = document.getElementById('screen-vip');
    var hudEl = document.getElementById('game-hud');
    var gameoverEl = document.getElementById('screen-gameover');
    var touchEl = document.getElementById('touch-controls');

    menuEl.classList.add('hidden');
    shopEl.classList.add('hidden');
    settingsEl.classList.add('hidden');
    vipEl.classList.add('hidden');
    hudEl.classList.add('hidden');
    gameoverEl.classList.add('hidden');
    touchEl.classList.add('hidden');

    switch (state) {
        case 'MENU':
            menuEl.classList.remove('hidden');
            refreshMenuDisplay();
            pauseBackgroundMusic();
            break;
        case 'SHOP':
            shopEl.classList.remove('hidden');
            renderShop();
            break;
        case 'SETTINGS':
            settingsEl.classList.remove('hidden');
            refreshSettings();
            break;
        case 'VIP':
            vipEl.classList.remove('hidden');
            break;
        case 'PLAYING':
            hudEl.classList.remove('hidden');
            if (isTouchDevice()) touchEl.classList.remove('hidden');
            playBackgroundMusic();
            break;
        case 'GAME_OVER':
            gameoverEl.classList.remove('hidden');
            renderGameOver();
            pauseBackgroundMusic();
            break;
    }
}

// ============================================================
// MAIN MENU
// ============================================================
var selectedMode = 'normal';

function initMenu() {
    // Start button
    document.getElementById('btn-start').addEventListener('click', function() {
        playClickSound();
        startGame(selectedMode);
    });

    // Mode buttons
    var modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            playClickSound();
            modeBtns.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            selectedMode = btn.getAttribute('data-mode');
            var saveData = loadSave();
            saveData.selectedMode = selectedMode;
            saveToDisk(saveData);
        });
    });

    // Shop button
    document.getElementById('btn-shop').addEventListener('click', function() {
        playClickSound();
        showScreen('SHOP');
    });

    // VIP button
    document.getElementById('btn-vip').addEventListener('click', function() {
        playClickSound();
        showScreen('VIP');
    });

    // Settings button
    document.getElementById('btn-settings').addEventListener('click', function() {
        playClickSound();
        showScreen('SETTINGS');
    });

    // Load saved mode
    var saveData = loadSave();
    selectedMode = saveData.selectedMode || 'normal';
    modeBtns.forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === selectedMode);
    });

    refreshMenuDisplay();
    renderSkinPreview();
}

function refreshMenuDisplay() {
    var saveData = loadSave();
    document.getElementById('berry-count').textContent = saveData.berries;
    document.getElementById('player-level').textContent = saveData.level;

    // XP bar
    var xpNeeded = saveData.level < MAX_LEVEL ? XP_PER_LEVEL[saveData.level] : 1;
    var xpPct = Math.min(100, (saveData.xp / xpNeeded) * 100);
    document.getElementById('xp-fill').style.width = xpPct + '%';
}

function renderSkinPreview() {
    var saveData = loadSave();
    var skinId = saveData.selectedSkin || 'strawberry';
    var previewCanvas = document.getElementById('skinPreview');
    var pctx = previewCanvas.getContext('2d');
    var w = previewCanvas.width;
    var h = previewCanvas.height;
    var cx = w / 2;
    var cy = h / 2;
    var skin = SKINS[skinId] || SKINS.strawberry;
    var berryType = skinId.replace('golden_', '');

    pctx.clearRect(0, 0, w, h);

    // Glow
    var gradient = pctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
    gradient.addColorStop(0, skin.bodyColor + '33');
    gradient.addColorStop(1, 'transparent');
    pctx.fillStyle = gradient;
    pctx.fillRect(0, 0, w, h);

    var r = 40;

    if (berryType === 'raspberry') {
        drawPreviewRaspberry(pctx, cx, cy, r, skin);
    } else if (berryType === 'blueberry') {
        drawPreviewBlueberry(pctx, cx, cy, r, skin);
    } else if (berryType === 'blackberry') {
        drawPreviewBlackberry(pctx, cx, cy, r, skin);
    } else {
        drawPreviewStrawberry(pctx, cx, cy, r, skin);
    }

    // Eyes (same for all)
    pctx.fillStyle = '#fff';
    pctx.beginPath();
    pctx.arc(cx - 10, cy - 4, 8, 0, Math.PI * 2);
    pctx.fill();
    pctx.beginPath();
    pctx.arc(cx + 10, cy - 4, 8, 0, Math.PI * 2);
    pctx.fill();
    pctx.fillStyle = '#111';
    pctx.beginPath();
    pctx.arc(cx - 8, cy - 3, 4, 0, Math.PI * 2);
    pctx.fill();
    pctx.beginPath();
    pctx.arc(cx + 12, cy - 3, 4, 0, Math.PI * 2);
    pctx.fill();
}

function drawPreviewStrawberry(c, cx, cy, r, skin) {
    c.fillStyle = skin.bodyColor;
    c.beginPath();
    c.moveTo(cx, cy - r * 0.6);
    c.quadraticCurveTo(cx + r, cy - r * 0.6, cx + r * 0.9, cy + r * 0.2);
    c.quadraticCurveTo(cx + r * 0.5, cy + r * 1.3, cx, cy + r * 1.2);
    c.quadraticCurveTo(cx - r * 0.5, cy + r * 1.3, cx - r * 0.9, cy + r * 0.2);
    c.quadraticCurveTo(cx - r, cy - r * 0.6, cx, cy - r * 0.6);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.2)';
    c.lineWidth = 1.5;
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.15)';
    c.beginPath();
    c.ellipse(cx - r * 0.3, cy - r * 0.15, r * 0.2, r * 0.45, -0.3, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = skin.seedColor;
    var seeds = [[-12, 0], [12, 0], [-15, r * 0.5], [15, r * 0.5], [0, r * 0.8], [-8, -r * 0.3], [8, -r * 0.3], [0, r * 0.4], [-6, r * 0.65], [6, r * 0.65]];
    for (var s = 0; s < seeds.length; s++) {
        c.beginPath();
        c.ellipse(cx + seeds[s][0], cy + seeds[s][1], 2.5, 4, 0, 0, Math.PI * 2);
        c.fill();
    }
    c.fillStyle = skin.leafColor;
    c.beginPath();
    c.ellipse(cx - 14, cy - r * 0.7, 18, 9, -0.4, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(cx + 14, cy - r * 0.7, 18, 9, 0.4, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = skin.leafColor;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(cx, cy - r * 0.6);
    c.lineTo(cx, cy - r * 0.95);
    c.stroke();
}

function drawPreviewRaspberry(c, cx, cy, r, skin) {
    var drupelets = [
        {x: 0, y: 0, s: 10}, {x: 0, y: -14, s: 9}, {x: 0, y: 14, s: 9}, {x: 0, y: 24, s: 7},
        {x: -14, y: -8, s: 9}, {x: -14, y: 8, s: 9}, {x: -11, y: 20, s: 6},
        {x: 14, y: -8, s: 9}, {x: 14, y: 8, s: 9}, {x: 11, y: 20, s: 6},
        {x: -22, y: 0, s: 7}, {x: 22, y: 0, s: 7},
        {x: -8, y: -22, s: 6}, {x: 8, y: -22, s: 6}
    ];
    c.fillStyle = 'rgba(0,0,0,0.12)';
    for (var i = 0; i < drupelets.length; i++) {
        c.beginPath();
        c.arc(cx + drupelets[i].x + 1, cy + drupelets[i].y + 1, drupelets[i].s, 0, Math.PI * 2);
        c.fill();
    }
    c.fillStyle = skin.bodyColor;
    for (var i = 0; i < drupelets.length; i++) {
        c.beginPath();
        c.arc(cx + drupelets[i].x, cy + drupelets[i].y, drupelets[i].s, 0, Math.PI * 2);
        c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.2)';
    for (var i = 0; i < drupelets.length; i++) {
        c.beginPath();
        c.arc(cx + drupelets[i].x - 2, cy + drupelets[i].y - 2, drupelets[i].s * 0.35, 0, Math.PI * 2);
        c.fill();
    }
    c.fillStyle = skin.leafColor;
    c.beginPath();
    c.ellipse(cx - 10, cy - r * 0.8, 14, 7, -0.5, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(cx + 10, cy - r * 0.8, 14, 7, 0.5, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = skin.leafColor;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(cx, cy - r * 0.6);
    c.lineTo(cx, cy - r * 0.95);
    c.stroke();
}

function drawPreviewBlueberry(c, cx, cy, r, skin) {
    c.fillStyle = skin.bodyColor;
    c.beginPath();
    c.arc(cx, cy + 2, r, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.2)';
    c.lineWidth = 1.5;
    c.stroke();
    c.fillStyle = 'rgba(180,200,255,0.15)';
    c.beginPath();
    c.arc(cx, cy + 2, r * 0.92, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.beginPath();
    c.ellipse(cx - r * 0.3, cy - r * 0.2, r * 0.15, r * 0.4, -0.3, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = skin.leafColor;
    var calyxY = cy - r * 0.6;
    for (var i = 0; i < 5; i++) {
        var angle = -Math.PI / 2 + (i / 5) * Math.PI * 2;
        var tx = cx + Math.cos(angle) * 12;
        var ty = calyxY + Math.sin(angle) * 8;
        c.beginPath();
        c.ellipse(tx, ty, 6, 10, angle + Math.PI / 2, 0, Math.PI * 2);
        c.fill();
    }
}

function drawPreviewBlackberry(c, cx, cy, r, skin) {
    var drupelets = [
        {x: 0, y: -18, s: 8}, {x: 0, y: -6, s: 9}, {x: 0, y: 8, s: 9}, {x: 0, y: 20, s: 8}, {x: 0, y: 30, s: 6},
        {x: -14, y: -12, s: 8}, {x: -14, y: 2, s: 8}, {x: -14, y: 14, s: 8}, {x: -11, y: 25, s: 6},
        {x: 14, y: -12, s: 8}, {x: 14, y: 2, s: 8}, {x: 14, y: 14, s: 8}, {x: 11, y: 25, s: 6},
        {x: -22, y: -2, s: 6}, {x: 22, y: -2, s: 6},
        {x: -8, y: -26, s: 6}, {x: 8, y: -26, s: 6}
    ];
    c.fillStyle = 'rgba(0,0,0,0.15)';
    for (var i = 0; i < drupelets.length; i++) {
        c.beginPath();
        c.arc(cx + drupelets[i].x + 1, cy + drupelets[i].y + 1, drupelets[i].s, 0, Math.PI * 2);
        c.fill();
    }
    c.fillStyle = skin.bodyColor;
    for (var i = 0; i < drupelets.length; i++) {
        c.beginPath();
        c.arc(cx + drupelets[i].x, cy + drupelets[i].y, drupelets[i].s, 0, Math.PI * 2);
        c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.15)';
    for (var i = 0; i < drupelets.length; i++) {
        c.beginPath();
        c.arc(cx + drupelets[i].x - 1.5, cy + drupelets[i].y - 1.5, drupelets[i].s * 0.35, 0, Math.PI * 2);
        c.fill();
    }
    c.fillStyle = skin.leafColor;
    c.beginPath();
    c.ellipse(cx - 10, cy - r * 1.0, 14, 7, -0.4, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(cx + 10, cy - r * 1.0, 14, 7, 0.4, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = skin.leafColor;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(cx, cy - r * 0.8);
    c.lineTo(cx, cy - r * 1.2);
    c.stroke();
}

// ============================================================
// SHOP
// ============================================================
function renderShop() {
    var saveData = loadSave();
    document.getElementById('berry-count-shop').textContent = saveData.berries;

    var grid = document.getElementById('skin-grid');
    grid.innerHTML = '';

    var skinIds = Object.keys(SKINS);
    for (var i = 0; i < skinIds.length; i++) {
        var skinId = skinIds[i];
        var skin = SKINS[skinId];
        var owned = saveData.unlockedSkins.indexOf(skinId) !== -1;
        var equipped = saveData.selectedSkin === skinId;
        var canBuy = !owned && saveData.berries >= skin.price;
        var vipLocked = skin.vipOnly && !saveData.isVip;

        var card = document.createElement('div');
        card.className = 'skin-card';
        if (equipped) card.className += ' equipped';
        else if (owned) card.className += ' owned';
        else if (vipLocked || !canBuy) card.className += ' locked';

        // VIP badge
        if (skin.vipOnly) {
            var badge = document.createElement('div');
            badge.className = 'vip-badge';
            badge.textContent = 'VIP';
            card.appendChild(badge);
        }

        // Mini preview
        var miniCanvas = document.createElement('canvas');
        miniCanvas.width = 50;
        miniCanvas.height = 50;
        drawMiniSkin(miniCanvas, skin, skinId);
        card.appendChild(miniCanvas);

        // Name
        var nameEl = document.createElement('div');
        nameEl.className = 'skin-name';
        nameEl.textContent = skin.name;
        card.appendChild(nameEl);

        // Price or status
        var statusEl = document.createElement('div');
        if (equipped) {
            statusEl.className = 'skin-status equipped-label';
            statusEl.textContent = 'Equipped';
        } else if (owned) {
            statusEl.className = 'skin-status owned-label';
            statusEl.textContent = 'Owned';
        } else {
            statusEl.className = 'skin-price';
            statusEl.textContent = '\u{1F353} ' + skin.price;
        }
        card.appendChild(statusEl);

        // Click handler
        (function(sid, sk, isOwned, isEquipped, canAfford, isVipLocked) {
            card.addEventListener('click', function() {
                playClickSound();
                if (isEquipped) return;
                if (isOwned) {
                    // Equip
                    var sd = loadSave();
                    sd.selectedSkin = sid;
                    saveToDisk(sd);
                    renderShop();
                    renderSkinPreview();
                } else if (isVipLocked) {
                    // Can't buy - VIP only
                    return;
                } else if (canAfford) {
                    // Buy
                    var sd = loadSave();
                    sd.berries -= sk.price;
                    sd.unlockedSkins.push(sid);
                    sd.selectedSkin = sid;
                    saveToDisk(sd);
                    renderShop();
                    renderSkinPreview();
                }
            });
        })(skinId, skin, owned, equipped, canBuy, vipLocked);

        grid.appendChild(card);
    }
}

function drawMiniSkin(miniCanvas, skin, skinId) {
    var mctx = miniCanvas.getContext('2d');
    var cx = miniCanvas.width / 2;
    var cy = miniCanvas.height / 2;
    var r = 16;
    var berryType = (skinId || '').replace('golden_', '');

    mctx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);

    if (berryType === 'raspberry') {
        drawMiniRaspberry(mctx, cx, cy, r, skin);
    } else if (berryType === 'blueberry') {
        drawMiniBlueberry(mctx, cx, cy, r, skin);
    } else if (berryType === 'blackberry') {
        drawMiniBlackberry(mctx, cx, cy, r, skin);
    } else {
        drawMiniStrawberry(mctx, cx, cy, r, skin);
    }

    // Eyes (same for all)
    mctx.fillStyle = '#fff';
    mctx.beginPath();
    mctx.arc(cx - 4, cy - 2, 3, 0, Math.PI * 2);
    mctx.fill();
    mctx.beginPath();
    mctx.arc(cx + 4, cy - 2, 3, 0, Math.PI * 2);
    mctx.fill();
    mctx.fillStyle = '#111';
    mctx.beginPath();
    mctx.arc(cx - 3, cy - 1.5, 1.5, 0, Math.PI * 2);
    mctx.fill();
    mctx.beginPath();
    mctx.arc(cx + 5, cy - 1.5, 1.5, 0, Math.PI * 2);
    mctx.fill();
}

function drawMiniStrawberry(c, cx, cy, r, skin) {
    c.fillStyle = skin.bodyColor;
    c.beginPath();
    c.moveTo(cx, cy - r * 0.6);
    c.quadraticCurveTo(cx + r, cy - r * 0.6, cx + r * 0.9, cy + r * 0.2);
    c.quadraticCurveTo(cx + r * 0.5, cy + r * 1.3, cx, cy + r * 1.2);
    c.quadraticCurveTo(cx - r * 0.5, cy + r * 1.3, cx - r * 0.9, cy + r * 0.2);
    c.quadraticCurveTo(cx - r, cy - r * 0.6, cx, cy - r * 0.6);
    c.fill();
    c.fillStyle = skin.seedColor;
    var seeds = [[-4, 0], [4, 0], [-5, r * 0.5], [5, r * 0.5], [0, r * 0.8]];
    for (var s = 0; s < seeds.length; s++) {
        c.beginPath();
        c.ellipse(cx + seeds[s][0], cy + seeds[s][1], 1.2, 2, 0, 0, Math.PI * 2);
        c.fill();
    }
    c.fillStyle = skin.leafColor;
    c.beginPath();
    c.ellipse(cx - 5, cy - r * 0.7, 7, 3.5, -0.4, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(cx + 5, cy - r * 0.7, 7, 3.5, 0.4, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = skin.leafColor;
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(cx, cy - r * 0.6);
    c.lineTo(cx, cy - r * 0.95);
    c.stroke();
}

function drawMiniRaspberry(c, cx, cy, r, skin) {
    var drupelets = [
        {x: 0, y: 0, s: 4.5}, {x: 0, y: -6, s: 4}, {x: 0, y: 6, s: 4},
        {x: -6, y: -3, s: 4}, {x: -6, y: 3, s: 4},
        {x: 6, y: -3, s: 4}, {x: 6, y: 3, s: 4},
        {x: -3, y: -8, s: 3}, {x: 3, y: -8, s: 3},
        {x: 0, y: 9, s: 3}
    ];
    c.fillStyle = skin.bodyColor;
    for (var i = 0; i < drupelets.length; i++) {
        c.beginPath();
        c.arc(cx + drupelets[i].x, cy + drupelets[i].y, drupelets[i].s, 0, Math.PI * 2);
        c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.2)';
    for (var i = 0; i < drupelets.length; i++) {
        c.beginPath();
        c.arc(cx + drupelets[i].x - 1, cy + drupelets[i].y - 1, drupelets[i].s * 0.35, 0, Math.PI * 2);
        c.fill();
    }
    c.fillStyle = skin.leafColor;
    c.beginPath();
    c.ellipse(cx - 4, cy - r * 0.8, 5, 3, -0.5, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(cx + 4, cy - r * 0.8, 5, 3, 0.5, 0, Math.PI * 2);
    c.fill();
}

function drawMiniBlueberry(c, cx, cy, r, skin) {
    c.fillStyle = skin.bodyColor;
    c.beginPath();
    c.arc(cx, cy + 1, r, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(180,200,255,0.15)';
    c.beginPath();
    c.arc(cx, cy + 1, r * 0.9, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.beginPath();
    c.ellipse(cx - r * 0.3, cy - r * 0.2, r * 0.15, r * 0.35, -0.3, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = skin.leafColor;
    for (var i = 0; i < 5; i++) {
        var angle = -Math.PI / 2 + (i / 5) * Math.PI * 2;
        var tx = cx + Math.cos(angle) * 5;
        var ty = cy - r * 0.6 + Math.sin(angle) * 3;
        c.beginPath();
        c.ellipse(tx, ty, 2.5, 4, angle + Math.PI / 2, 0, Math.PI * 2);
        c.fill();
    }
}

function drawMiniBlackberry(c, cx, cy, r, skin) {
    var drupelets = [
        {x: 0, y: -7, s: 3.5}, {x: 0, y: -1, s: 4}, {x: 0, y: 5, s: 4}, {x: 0, y: 10, s: 3},
        {x: -6, y: -4, s: 3.5}, {x: -6, y: 2, s: 3.5}, {x: -5, y: 7, s: 3},
        {x: 6, y: -4, s: 3.5}, {x: 6, y: 2, s: 3.5}, {x: 5, y: 7, s: 3}
    ];
    c.fillStyle = skin.bodyColor;
    for (var i = 0; i < drupelets.length; i++) {
        c.beginPath();
        c.arc(cx + drupelets[i].x, cy + drupelets[i].y, drupelets[i].s, 0, Math.PI * 2);
        c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.15)';
    for (var i = 0; i < drupelets.length; i++) {
        c.beginPath();
        c.arc(cx + drupelets[i].x - 0.8, cy + drupelets[i].y - 0.8, drupelets[i].s * 0.35, 0, Math.PI * 2);
        c.fill();
    }
    c.fillStyle = skin.leafColor;
    c.beginPath();
    c.ellipse(cx - 4, cy - r * 1.0, 5, 3, -0.4, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(cx + 4, cy - r * 1.0, 5, 3, 0.4, 0, Math.PI * 2);
    c.fill();
}

// ============================================================
// SHOP BACK BUTTON
// ============================================================
function initShop() {
    document.getElementById('btn-shop-back').addEventListener('click', function() {
        playClickSound();
        showScreen('MENU');
    });
}

// ============================================================
// VIP MAGAZINE
// ============================================================
function initVip() {
    document.getElementById('btn-vip-back').addEventListener('click', function() {
        playClickSound();
        showScreen('MENU');
    });

    document.getElementById('vip-donate-btn').addEventListener('click', function() {
        playClickSound();
        document.getElementById('donate-modal').classList.remove('hidden');
    });

    document.getElementById('donate-modal-close').addEventListener('click', function() {
        playClickSound();
        document.getElementById('donate-modal').classList.add('hidden');
    });

    document.getElementById('donate-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            document.getElementById('donate-modal').classList.add('hidden');
        }
    });
}

// ============================================================
// SETTINGS
// ============================================================
function initSettings() {
    document.getElementById('btn-settings-back').addEventListener('click', function() {
        playClickSound();
        showScreen('MENU');
    });

    document.getElementById('setting-sound').addEventListener('change', function() {
        var saveData = loadSave();
        saveData.settings.soundEnabled = this.checked;
        saveToDisk(saveData);
        toggleSound(this.checked);
    });

    document.getElementById('setting-vip').addEventListener('change', function() {
        var saveData = loadSave();
        saveData.isVip = this.checked;
        saveToDisk(saveData);
    });
}

function refreshSettings() {
    var saveData = loadSave();
    document.getElementById('setting-sound').checked = saveData.settings.soundEnabled;
    document.getElementById('setting-vip').checked = saveData.isVip;

    var statsEl = document.getElementById('stats-display');
    var stats = saveData.stats;
    statsEl.innerHTML =
        'Games Played: ' + stats.gamesPlayed + '<br>' +
        'Total Kills: ' + stats.totalKills + '<br>' +
        'Best Territory: ' + stats.bestTerritory.toFixed(1) + '%<br>' +
        'Total Cells Captured: ' + stats.totalTerritory;
}

// ============================================================
// HUD UPDATE
// ============================================================
function updateHUD() {
    if (gameState !== 'PLAYING') return;

    // Territory percentage
    var pct = getTerritoryPercentage(1);
    document.getElementById('hud-territory-pct').textContent = pct.toFixed(1);

    // Kills
    document.getElementById('hud-kills').textContent = player ? player.kills : 0;

    // Leaderboard
    updateLeaderboard();

    // Power-up indicator
    var puEl = document.getElementById('hud-powerup');
    if (player && player.activePowerUp) {
        var def = POWERUPS[player.activePowerUp];
        puEl.textContent = def.icon + ' ' + def.name + ' ' + player.powerUpTimer.toFixed(1) + 's';
        puEl.classList.remove('hidden');
    } else {
        puEl.classList.add('hidden');
    }
}

function updateLeaderboard() {
    var lbEl = document.getElementById('hud-leaderboard');
    var entries = [];

    if (player) {
        entries.push({
            name: 'You',
            pct: getTerritoryPercentage(1),
            color: SKINS[player.skinId].bodyColor,
            isPlayer: true
        });
    }

    for (var i = 0; i < enemies.length; i++) {
        var enemy = enemies[i];
        if (enemy.alive) {
            entries.push({
                name: enemy.name,
                pct: getTerritoryPercentage(enemy.id),
                color: SKINS[enemy.skinId].bodyColor,
                isPlayer: false
            });
        }
    }

    // Sort by territory descending
    entries.sort(function(a, b) { return b.pct - a.pct; });

    // Show top 5
    var html = '';
    var count = Math.min(5, entries.length);
    for (var i = 0; i < count; i++) {
        var e = entries[i];
        var rowClass = e.isPlayer ? 'lb-row player-row' : 'lb-row';
        html += '<div class="' + rowClass + '">' +
            '<span class="lb-color" style="background:' + e.color + '"></span>' +
            '<span class="lb-name">' + e.name + '</span>' +
            '<span class="lb-pct">' + e.pct.toFixed(1) + '%</span>' +
            '</div>';
    }
    lbEl.innerHTML = html;
}

// ============================================================
// GAME OVER
// ============================================================
function renderGameOver() {
    if (!gameResults) return;

    var titleEl = document.getElementById('result-title');
    if (gameResults.won) {
        titleEl.textContent = 'Victory!';
        titleEl.className = 'win';
    } else {
        titleEl.textContent = 'Game Over';
        titleEl.className = '';
    }

    var statsEl = document.getElementById('result-stats');
    statsEl.innerHTML =
        'Territory: <span class="stat-value">' + gameResults.territoryPct + '%</span><br>' +
        'Cells Captured: <span class="stat-value">' + gameResults.cellsCaptured + '</span><br>' +
        'Kills: <span class="stat-value">' + gameResults.kills + '</span><br>' +
        'Berries Earned: <span class="stat-value">+' + gameResults.berriesEarned + '</span><br>' +
        'XP Earned: <span class="stat-value">+' + gameResults.xpEarned + '</span>';
}

function initGameOver() {
    document.getElementById('btn-play-again').addEventListener('click', function() {
        playClickSound();
        gameState = 'MENU';
        startGame(selectedMode);
    });

    document.getElementById('btn-back-menu').addEventListener('click', function() {
        playClickSound();
        gameState = 'MENU';
        showScreen('MENU');
    });
}

// ============================================================
// MOBILE TOUCH CONTROLS (Floating Joystick)
// ============================================================
var touchActive = false;
var touchStartX = 0;
var touchStartY = 0;
var joystickBase = null;
var joystickThumb = null;

function isTouchDevice() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

function initTouchControls() {
    var zone = document.getElementById('joystick-zone');

    // Create joystick elements
    joystickBase = document.createElement('div');
    joystickBase.className = 'joystick-base';
    zone.appendChild(joystickBase);

    joystickThumb = document.createElement('div');
    joystickThumb.className = 'joystick-thumb';
    zone.appendChild(joystickThumb);

    zone.addEventListener('touchstart', function(e) {
        if (gameState !== 'PLAYING') return;
        e.preventDefault();
        var touch = e.touches[0];
        touchActive = true;
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;

        // Show joystick
        joystickBase.style.display = 'block';
        joystickBase.style.left = (touchStartX - 50) + 'px';
        joystickBase.style.top = (touchStartY - 50) + 'px';

        joystickThumb.style.display = 'block';
        joystickThumb.style.left = (touchStartX - 20) + 'px';
        joystickThumb.style.top = (touchStartY - 20) + 'px';
    }, { passive: false });

    zone.addEventListener('touchmove', function(e) {
        if (!touchActive || gameState !== 'PLAYING') return;
        e.preventDefault();
        var touch = e.touches[0];
        var dx = touch.clientX - touchStartX;
        var dy = touch.clientY - touchStartY;

        // Clamp thumb to joystick radius
        var dist = Math.sqrt(dx * dx + dy * dy);
        var maxDist = 40;
        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }

        joystickThumb.style.left = (touchStartX + dx - 20) + 'px';
        joystickThumb.style.top = (touchStartY + dy - 20) + 'px';

        // Dead zone
        if (dist > 15) {
            // Free-angle direction (normalized)
            var ndx = dx / dist;
            var ndy = dy / dist;
            var newDir = { dx: ndx, dy: ndy };

            // Prevent 180 turns
            if (player && !(ndx === -player.dx && ndy === -player.dy)) {
                inputDir = newDir;
            }
        }
    }, { passive: false });

    zone.addEventListener('touchend', function(e) {
        touchActive = false;
        joystickBase.style.display = 'none';
        joystickThumb.style.display = 'none';
    });

    zone.addEventListener('touchcancel', function(e) {
        touchActive = false;
        joystickBase.style.display = 'none';
        joystickThumb.style.display = 'none';
    });
}

// ============================================================
// INITIALIZATION
// ============================================================
(function() {
    // Load sound settings
    var saveData = loadSave();
    soundEnabled = saveData.settings.soundEnabled;

    // Initialize all UI
    initMenu();
    initShop();
    initVip();
    initSettings();
    initGameOver();
    initTouchControls();

    // Initialize background music
    initBackgroundMusic();

    // Initialize game engine
    initGame();

    // Show main menu
    showScreen('MENU');
})();
