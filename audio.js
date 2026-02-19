// ============================================================
// AUDIO SYSTEM (Web Audio API + Background Music)
// ============================================================
var audioCtx = null;
var soundEnabled = true;

// Background music
var bgMusic = null;
var bgMusicPlaying = false;

function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

// ============================================================
// BACKGROUND MUSIC (MP3)
// ============================================================
function initBackgroundMusic() {
    bgMusic = document.createElement('audio');
    bgMusic.src = 'Pixel_Paradise_Party.mp3';
    bgMusic.loop = true;
    bgMusic.volume = 0.35;
    bgMusic.preload = 'auto';
}

function playBackgroundMusic() {
    if (!bgMusic) initBackgroundMusic();
    if (!soundEnabled) return;
    bgMusic.play().catch(function() {});
    bgMusicPlaying = true;
}

function pauseBackgroundMusic() {
    if (bgMusic) {
        bgMusic.pause();
        bgMusicPlaying = false;
    }
}

function setMusicVolume(vol) {
    if (bgMusic) bgMusic.volume = vol;
}

function toggleSound(enabled) {
    soundEnabled = enabled;
    if (!enabled) {
        pauseBackgroundMusic();
    } else if (bgMusicPlaying === false && gameState === 'PLAYING') {
        playBackgroundMusic();
    }
}

// ============================================================
// SYNTHESIZED SOUND EFFECTS
// ============================================================
function playCaptureSound() {
    if (!soundEnabled) return;
    try {
        var c = getAudioCtx();
        var notes = [523, 659, 784];
        for (var i = 0; i < notes.length; i++) {
            var osc = c.createOscillator();
            var gain = c.createGain();
            osc.connect(gain);
            gain.connect(c.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(notes[i], c.currentTime + i * 0.06);
            gain.gain.setValueAtTime(0, c.currentTime + i * 0.06);
            gain.gain.linearRampToValueAtTime(0.12, c.currentTime + i * 0.06 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + i * 0.06 + 0.15);
            osc.start(c.currentTime + i * 0.06);
            osc.stop(c.currentTime + i * 0.06 + 0.15);
        }
    } catch (e) {}
}

function playKillSound() {
    if (!soundEnabled) return;
    try {
        var c = getAudioCtx();
        var notes = [440, 554, 659, 880];
        for (var i = 0; i < notes.length; i++) {
            var osc = c.createOscillator();
            var gain = c.createGain();
            osc.connect(gain);
            gain.connect(c.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(notes[i], c.currentTime + i * 0.07);
            gain.gain.setValueAtTime(0, c.currentTime + i * 0.07);
            gain.gain.linearRampToValueAtTime(0.08, c.currentTime + i * 0.07 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + i * 0.07 + 0.12);
            osc.start(c.currentTime + i * 0.07);
            osc.stop(c.currentTime + i * 0.07 + 0.12);
        }
    } catch (e) {}
}

function playDeathSound() {
    if (!soundEnabled) return;
    try {
        var c = getAudioCtx();
        var notes = [400, 300, 200];
        for (var i = 0; i < notes.length; i++) {
            var osc = c.createOscillator();
            var gain = c.createGain();
            osc.connect(gain);
            gain.connect(c.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(notes[i], c.currentTime + i * 0.12);
            gain.gain.setValueAtTime(0, c.currentTime + i * 0.12);
            gain.gain.linearRampToValueAtTime(0.1, c.currentTime + i * 0.12 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + i * 0.12 + 0.25);
            osc.start(c.currentTime + i * 0.12);
            osc.stop(c.currentTime + i * 0.12 + 0.25);
        }
    } catch (e) {}
}

function playPowerUpSound() {
    if (!soundEnabled) return;
    try {
        var c = getAudioCtx();
        var notes = [523, 784, 1046];
        for (var i = 0; i < notes.length; i++) {
            var osc = c.createOscillator();
            var gain = c.createGain();
            osc.connect(gain);
            gain.connect(c.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(notes[i], c.currentTime + i * 0.05);
            gain.gain.setValueAtTime(0, c.currentTime + i * 0.05);
            gain.gain.linearRampToValueAtTime(0.1, c.currentTime + i * 0.05 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + i * 0.05 + 0.2);
            osc.start(c.currentTime + i * 0.05);
            osc.stop(c.currentTime + i * 0.05 + 0.2);
        }
    } catch (e) {}
}

function playClickSound() {
    if (!soundEnabled) return;
    try {
        var c = getAudioCtx();
        var osc = c.createOscillator();
        var gain = c.createGain();
        osc.connect(gain);
        gain.connect(c.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, c.currentTime);
        gain.gain.setValueAtTime(0.06, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.08);
        osc.start(c.currentTime);
        osc.stop(c.currentTime + 0.08);
    } catch (e) {}
}
