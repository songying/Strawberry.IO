// ============================================================
// i18n - Language System (English / Chinese)
// ============================================================
var LANG = {
    en: {
        // Menu
        'start': 'START',
        'mode.peaceful': '\uD83D\uDD4A Peaceful',
        'mode.normal': '\u2694 Normal',
        'mode.extreme': '\uD83D\uDC80 Extreme',
        'mode.berry': '\uD83C\uDF53 Berry',
        'footer': 'Designed by Jiashi \u2022 Powered by Claude Code',

        // Top bar tooltips
        'tooltip.settings': 'Settings',
        'tooltip.berrypass': 'Berry Pass',
        'tooltip.shop': 'Shop',

        // Shop
        'shop.title': 'Berry Shop',
        'shop.back': '\u2190 Back',
        'shop.equipped': 'Equipped',
        'shop.owned': 'Owned',

        // Settings
        'settings.title': 'Settings',
        'settings.back': '\u2190 Back',
        'settings.sound': 'Sound Effects',
        'settings.vip': 'VIP Mode',
        'settings.stats': 'Stats',
        'stats.gamesPlayed': 'Games Played',
        'stats.totalKills': 'Total Kills',
        'stats.bestTerritory': 'Best Territory',
        'stats.totalCells': 'Total Cells Captured',

        // HUD
        'hud.kills': 'Kills: ',
        'leaderboard.you': 'You',

        // Game Over
        'gameover.title': 'Game Over',
        'gameover.victory': 'Victory!',
        'gameover.playAgain': 'Play Again',
        'gameover.menu': 'Menu',
        'gameover.territory': 'Territory: ',
        'gameover.cellsCaptured': 'Cells Captured: ',
        'gameover.kills': 'Kills: ',
        'gameover.berries': 'Berries Earned: ',
        'gameover.xp': 'XP Earned: ',

        // VIP / Berry Pass
        'vip.title': '\uD83C\uDF53 Berry Pass',
        'vip.back': '\u2190 Back',
        'vip.bannerText': 'BERRY\nPASS',
        'vip.perk1.title': '7 Exclusive Skins',
        'vip.perk1.desc': 'Golden Strawberry, Golden Raspberry, Golden Blueberry & more',
        'vip.perk2.title': 'VIP Berry Badge',
        'vip.perk2.desc': 'A shiny gold badge floats above your berry in-game',
        'vip.perk3.title': 'Feed the Berry Farm',
        'vip.perk3.desc': 'Your support keeps Strawberry.io growing!',
        'vip.donateBtn': '\uD83C\uDF53 Support the Berry Farm \uD83C\uDF53',
        'vip.note': 'After donating, toggle VIP in Settings to unlock your perks!',
        'vip.changelog': '\uD83D\uDCF0 Berry Patch Notes',
        'vip.log1': 'Each berry gets its own unique shape!',
        'vip.log2': 'Smooth trails & encirclement captures',
        'vip.log3': 'Strawberry.io is born!',

        // Donate Modal
        'donate.title': 'Pick Your Monthly Berry Basket!',
        'donate.tier1': 'Seedling',
        'donate.tier2': 'Berry Bunch',
        'donate.tier2badge': 'Best Value',
        'donate.tier3': 'Berry King',
        'donate.thanks': 'Monthly support keeps the berry farm growing every season!',

        // Skin names
        'skin.strawberry': 'Strawberry',
        'skin.raspberry': 'Raspberry',
        'skin.blueberry': 'Blueberry',
        'skin.blackberry': 'Blackberry',
        'skin.golden_strawberry': 'Golden Strawberry',
        'skin.golden_raspberry': 'Golden Raspberry',
        'skin.golden_blueberry': 'Golden Blueberry',
        'skin.golden_blackberry': 'Golden Blackberry',

        // Power-ups
        'powerup.speed_boost': 'Speed Boost',
        'powerup.shield': 'Shield',
        'powerup.magnet': 'Magnet'
    },
    zh: {
        // Menu
        'start': '\u5F00\u59CB',
        'mode.peaceful': '\uD83D\uDD4A \u548C\u5E73',
        'mode.normal': '\u2694 \u666E\u901A',
        'mode.extreme': '\uD83D\uDC80 \u6781\u9650',
        'mode.berry': '\uD83C\uDF53 \u8393\u679C',
        'footer': '\u7531 Jiashi \u8BBE\u8BA1 \u2022 Claude Code \u9A71\u52A8',

        // Top bar tooltips
        'tooltip.settings': '\u8BBE\u7F6E',
        'tooltip.berrypass': '\u8393\u679C\u901A\u884C\u8BC1',
        'tooltip.shop': '\u5546\u5E97',

        // Shop
        'shop.title': '\u8393\u679C\u5546\u5E97',
        'shop.back': '\u2190 \u8FD4\u56DE',
        'shop.equipped': '\u5DF2\u88C5\u5907',
        'shop.owned': '\u5DF2\u62E5\u6709',

        // Settings
        'settings.title': '\u8BBE\u7F6E',
        'settings.back': '\u2190 \u8FD4\u56DE',
        'settings.sound': '\u97F3\u6548',
        'settings.vip': 'VIP \u6A21\u5F0F',
        'settings.stats': '\u7EDF\u8BA1',
        'stats.gamesPlayed': '\u6E38\u620F\u6B21\u6570',
        'stats.totalKills': '\u603B\u51FB\u6740\u6570',
        'stats.bestTerritory': '\u6700\u4F73\u9886\u5730',
        'stats.totalCells': '\u603B\u5360\u9886\u683C\u6570',

        // HUD
        'hud.kills': '\u51FB\u6740: ',
        'leaderboard.you': '\u4F60',

        // Game Over
        'gameover.title': '\u6E38\u620F\u7ED3\u675F',
        'gameover.victory': '\u80DC\u5229\uFF01',
        'gameover.playAgain': '\u518D\u6765\u4E00\u5C40',
        'gameover.menu': '\u83DC\u5355',
        'gameover.territory': '\u9886\u5730: ',
        'gameover.cellsCaptured': '\u5360\u9886\u683C\u6570: ',
        'gameover.kills': '\u51FB\u6740: ',
        'gameover.berries': '\u83B7\u5F97\u8393\u679C: ',
        'gameover.xp': '\u83B7\u5F97\u7ECF\u9A8C: ',

        // VIP / Berry Pass
        'vip.title': '\uD83C\uDF53 \u8393\u679C\u901A\u884C\u8BC1',
        'vip.back': '\u2190 \u8FD4\u56DE',
        'vip.bannerText': '\u8393\u679C\n\u901A\u884C\u8BC1',
        'vip.perk1.title': '7\u6B3E\u4E13\u5C5E\u76AE\u80A4',
        'vip.perk1.desc': '\u91D1\u8272\u8349\u8393\u3001\u91D1\u8272\u6811\u8393\u3001\u91D1\u8272\u84DD\u8393\u7B49\u66F4\u591A\u76AE\u80A4',
        'vip.perk2.title': 'VIP \u8393\u679C\u5FBD\u7AE0',
        'vip.perk2.desc': '\u6E38\u620F\u4E2D\u4F60\u7684\u8393\u679C\u4E0A\u65B9\u4F1A\u6709\u4E00\u4E2A\u95EA\u4EAE\u7684\u91D1\u8272\u5FBD\u7AE0',
        'vip.perk3.title': '\u652F\u6301\u8393\u679C\u519C\u573A',
        'vip.perk3.desc': '\u4F60\u7684\u652F\u6301\u8BA9 Strawberry.io \u6301\u7EED\u6210\u957F\uFF01',
        'vip.donateBtn': '\uD83C\uDF53 \u652F\u6301\u8393\u679C\u519C\u573A \uD83C\uDF53',
        'vip.note': '\u6350\u8D60\u540E\uFF0C\u8BF7\u5728\u8BBE\u7F6E\u4E2D\u5F00\u542F VIP \u4EE5\u89E3\u9501\u7279\u6743\uFF01',
        'vip.changelog': '\uD83D\uDCF0 \u8393\u679C\u66F4\u65B0\u65E5\u5FD7',
        'vip.log1': '\u6BCF\u79CD\u8393\u679C\u90FD\u6709\u72EC\u7279\u7684\u5916\u5F62\uFF01',
        'vip.log2': '\u5E73\u6ED1\u8F68\u8FF9 & \u5305\u56F4\u5360\u9886',
        'vip.log3': 'Strawberry.io \u8BDE\u751F\uFF01',

        // Donate Modal
        'donate.title': '\u9009\u62E9\u4F60\u7684\u6BCF\u6708\u8393\u679C\u7BEE\uFF01',
        'donate.tier1': '\u79CD\u5B50',
        'donate.tier2': '\u8393\u679C\u675F',
        'donate.tier2badge': '\u6700\u8D85\u503C',
        'donate.tier3': '\u8393\u679C\u4E4B\u738B',
        'donate.thanks': '\u6BCF\u6708\u7684\u652F\u6301\u8BA9\u8393\u679C\u519C\u573A\u6BCF\u4E00\u5B63\u90FD\u5728\u6210\u957F\uFF01',

        // Skin names
        'skin.strawberry': '\u8349\u8393',
        'skin.raspberry': '\u6811\u8393',
        'skin.blueberry': '\u84DD\u8393',
        'skin.blackberry': '\u9ED1\u8393',
        'skin.golden_strawberry': '\u91D1\u8272\u8349\u8393',
        'skin.golden_raspberry': '\u91D1\u8272\u6811\u8393',
        'skin.golden_blueberry': '\u91D1\u8272\u84DD\u8393',
        'skin.golden_blackberry': '\u91D1\u8272\u9ED1\u8393',

        // Power-ups
        'powerup.speed_boost': '\u52A0\u901F',
        'powerup.shield': '\u62A4\u76FE',
        'powerup.magnet': '\u78C1\u94C1'
    }
};

var currentLang = localStorage.getItem('strawberry_io_lang') || 'en';

function t(key) {
    return (LANG[currentLang] && LANG[currentLang][key]) || LANG.en[key] || key;
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('strawberry_io_lang', lang);
    applyLanguage();
}

function applyLanguage() {
    // Update all elements with data-i18n attribute (textContent)
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
        var key = els[i].getAttribute('data-i18n');
        var attr = els[i].getAttribute('data-i18n-attr');
        if (attr === 'title') {
            els[i].title = t(key);
        } else {
            els[i].textContent = t(key);
        }
    }

    // Special: elements with data-i18n-html use innerHTML (for <br> support)
    var htmlEls = document.querySelectorAll('[data-i18n-html]');
    for (var i = 0; i < htmlEls.length; i++) {
        var key = htmlEls[i].getAttribute('data-i18n-html');
        htmlEls[i].innerHTML = t(key).replace(/\n/g, '<br>');
    }

    // Update html lang attribute
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';

    // Highlight active language button
    var langBtns = document.querySelectorAll('.lang-btn');
    for (var i = 0; i < langBtns.length; i++) {
        langBtns[i].classList.toggle('active', langBtns[i].getAttribute('data-lang') === currentLang);
    }

    // Update player name if game is active
    if (typeof player !== 'undefined' && player) {
        player.name = t('leaderboard.you');
    }

    // Refresh dynamic screens if visible
    if (typeof refreshSettings === 'function' && !document.getElementById('screen-settings').classList.contains('hidden')) {
        refreshSettings();
    }
    if (typeof renderShop === 'function' && !document.getElementById('screen-shop').classList.contains('hidden')) {
        renderShop();
    }
    if (typeof renderGameOver === 'function' && !document.getElementById('screen-gameover').classList.contains('hidden')) {
        renderGameOver();
    }
}
