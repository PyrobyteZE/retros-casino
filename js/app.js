// App controller - navigation, save/load, balance
const App = {
  balance: 0.02,
  totalEarned: 0,
  totalClicks: 0,
  upgrades: { clickValue: 0, autoClicker: 0, luckyClick: 0, critClick: 0, autoBet: 0 },
  rebirth: 0,
  creditScore: 600,
  stats: { gamesWon: 0, gamesLost: 0 },
  currentScreen: 'home',
  screenHistory: [],

  // Hunger system
  hunger: 100,
  lastHungerTick: 0,
  luckBoostUntil: 0,
  luckBoostPct: 0,
  decaySlowUntil: 0,

  // Suffixes for large numbers (goes up to 10^63)
  suffixes: [
    '', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc',
    'No', 'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg'
  ],

  platform: 'mobile', // 'mobile' or 'desktop'

  init() {
    this.detectPlatform();
    if (typeof Settings !== 'undefined') Settings.init();
    this.load();
    this.updateBalance();
    this.startAutoSave();
    // beforeunload is unreliable on mobile PWA; pagehide + visibilitychange cover it
    window.addEventListener('beforeunload', () => this.save());
    window.addEventListener('pagehide', () => this.save());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.save();
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    // Live shorthand preview: show "$10M" hint when user types "10m" in any .sh-input
    document.addEventListener('input', e => {
      const inp = e.target;
      if (!inp.classList || !inp.classList.contains('sh-input')) return;
      const preview = inp.nextElementSibling;
      if (!preview || !preview.classList.contains('sh-preview')) return;
      const parsed = this.parseAmount(inp.value);
      const showPreview = !isNaN(parsed) && parsed > 0 &&
        (/[kmbt]/i.test(inp.value) || /^(max|all|\d+\.?\d*%)$/i.test(inp.value.trim()));
      if (showPreview) {
        preview.textContent = '= ' + this.formatMoney(parsed);
        preview.style.display = 'block';
      } else {
        preview.style.display = 'none';
      }
    });
  },

  detectPlatform() {
    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|mobile|phone/.test(ua) ||
      (navigator.maxTouchPoints > 0 && window.innerWidth < 768);
    this.platform = isMobile ? 'mobile' : 'desktop';
    document.documentElement.setAttribute('data-platform', this.platform);
  },

  formatMoney(n) {
    // Full number format mode
    if (typeof Settings !== 'undefined' && Settings.options.numberFormat === 'full') {
      return Settings.formatMoneyFull(n);
    }

    if (n < 0) return '-' + this.formatMoney(-n);
    if (n < 100) return '$' + n.toFixed(2);
    if (n < 1e3) return '$' + Math.floor(n);

    // Find the right suffix
    let tier = Math.floor(Math.log10(n) / 3);
    if (tier >= this.suffixes.length) tier = this.suffixes.length - 1;
    const divisor = Math.pow(10, tier * 3);
    const val = n / divisor;

    // Show 2 decimal places for cleaner display
    if (val >= 100) return '$' + Math.floor(val) + this.suffixes[tier];
    if (val >= 10) return '$' + val.toFixed(1) + this.suffixes[tier];
    return '$' + val.toFixed(2) + this.suffixes[tier];
  },

  // Parse shorthand amounts: "10m" → 10M, "2.5b" → 2.5B, "max"/"all" → balance, "50%" → 50% of balance
  parseAmount(str) {
    if (str === null || str === undefined) return NaN;
    let s = String(str).trim().replace(/^\$/, '').replace(/,/g, '').toLowerCase();
    if (!s) return NaN;
    // "max" / "all" = full balance
    if (s === 'max' || s === 'all') return Math.max(0, this.balance);
    // "50%" = percentage of balance
    const pctMatch = s.match(/^([\d.]+)%$/);
    if (pctMatch) {
      const pct = parseFloat(pctMatch[1]);
      if (!isNaN(pct) && pct >= 0) return Math.max(0, this.balance * pct / 100);
    }
    const match = s.match(/^(-?[\d.]+)\s*([kmbt]?)$/);
    if (!match) return NaN;
    const n = parseFloat(match[1]);
    if (isNaN(n)) return NaN;
    const mult = { '': 1, k: 1e3, m: 1e6, b: 1e9, t: 1e12 };
    return n * (mult[match[2]] ?? 1);
  },

  // Format a number for a bet input field (avoids scientific notation for huge values)
  setBetInput(el, n) {
    if (!el) return;
    n = Math.max(0, n);
    if (n >= 1e12)     el.value = (n / 1e12).toFixed(2) + 't';
    else if (n >= 1e9) el.value = (n / 1e9).toFixed(2) + 'b';
    else if (n >= 1e6) el.value = (n / 1e6).toFixed(2) + 'm';
    else if (n >= 1e3) el.value = (n / 1e3).toFixed(2) + 'k';
    else               el.value = Math.max(0.01, Math.round(n * 100) / 100);
  },

  // Central boost aggregator — merges Houses + Crafting boosts
  getAllBoosts() {
    const out = {
      earningsMult: 0, slotsBonus: 0, gamblingBonus: 0, luckBoost: 0,
      stocksBonus: 0, passiveIncome: 0, hungerDecayMult: 0, raidReductionMult: 0,
      crimeBonus: 0, hackingBonus: 0, spaceBonus: 0, craftingBonus: 0, pharmaBonus: 0,
    };
    function merge(src) {
      if (!src) return;
      for (const k in out) {
        if (src[k]) out[k] += src[k];
      }
    }
    if (typeof Houses !== 'undefined') merge(Houses.getBoosts());
    if (typeof Crafting !== 'undefined') merge(Crafting.getEquippedBoosts());
    return out;
  },

  // Safe add that avoids floating point drift on large numbers
  addBalance(amount) {
    // God mode: block all negative balance changes
    if (amount < 0 && typeof Admin !== 'undefined' && Admin.godMode) return;
    // Apply earningsMult from boosts + world events on income
    if (amount > 0) {
      const boosts = this.getAllBoosts();
      const eventMult = typeof Events !== 'undefined' ? Events.getIncomeMultiplier() : 1;
      amount = amount * (1 + (boosts.earningsMult || 0)) * eventMult;
    }
    this.balance = this.safeAdd(this.balance, amount);
    if (amount > 0) this.totalEarned = this.safeAdd(this.totalEarned, amount);
    this.updateBalance();
  },

  recordWin() { this.stats.gamesWon++; },
  recordLoss() { this.stats.gamesLost++; },

  // Rounds to 2 decimal places to prevent floating point accumulation
  safeAdd(a, b) {
    const result = a + b;
    // Only round small numbers to avoid losing precision on huge ones
    if (Math.abs(result) < 1e15) return Math.round(result * 100) / 100;
    return result;
  },

  updateBalance() {
    const balEl = document.getElementById('balance');
    if (typeof Admin !== 'undefined' && Admin.godMode) {
      balEl.textContent = '∞';
      balEl.classList.remove('balance-danger');
      return;
    }
    balEl.textContent = this.formatMoney(this.balance).slice(1);
    // Red balance when very low and in debt
    if (typeof Loans !== 'undefined' && Loans.debt > 0 && this.balance < Loans.debt * 0.1) {
      balEl.classList.add('balance-danger');
    } else {
      balEl.classList.remove('balance-danger');
    }
  },

  showScreen(name) {
    const titles = {
      home: "Retro's Casino",
      casino: 'Casino',
      coinflip: 'Coin Flip',
      slots: 'Slots',
      crash: 'Crash',
      blackjack: 'Blackjack',
      plinko: 'Plinko',
      roulette: 'Roulette',
      horses: 'Horse Racing',
      lottery: 'Lottery',
      properties: 'Properties',
      crime: 'Crime Empire',
      pets: 'Pets',
      stocks: 'Stock Market',
      crypto: 'Crypto Mining',
      leaderboard: 'Leaderboard',
      companies: 'Player Companies',
      houses: 'Houses',
      inventory: 'Inventory',
      cars: 'Car Garage',
      settings: 'Settings',
      stores: 'Shops',
    };

    if (this.currentScreen !== name) {
      this.screenHistory.push(this.currentScreen);
      // Notify MainRoom when leaving a multiplayer screen
      if (typeof MainRoom !== 'undefined' && ['roulette', 'crash', 'horses'].includes(this.currentScreen)) {
        MainRoom.onScreenLeave(this.currentScreen);
      }
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + name).classList.add('active');
    document.getElementById('page-title').textContent = titles[name] || "Retro's Casino";
    document.getElementById('back-btn').classList.toggle('hidden', name === 'home');
    this.currentScreen = name;

    // Init game-specific stuff
    if (name === 'coinflip') CoinFlip.init();
    if (name === 'slots') Slots.init();
    if (name === 'plinko') Plinko.initCanvas();
    if (name === 'roulette') Roulette.init();
    if (name === 'horses') Horses.init();
    if (['roulette', 'crash', 'horses'].includes(name) && typeof MainRoom !== 'undefined') {
      MainRoom.joinScreen(name);
      MainRoom.onScreenEnter(name);
    }
    if (name === 'lottery') Lottery.init();
    if (name === 'properties') Properties.init();
    if (name === 'crime') Crime.init();
    if (name === 'pets') Pets.init();
    if (name === 'stocks') Stocks.init();
    if (name === 'crypto') Crypto.init();
    if (name === 'leaderboard') { if (typeof Firebase !== 'undefined') { Firebase.renderLeaderboard(); const badge = document.getElementById('lb-online-badge'); if (badge) { badge.textContent = Firebase.isOnline() ? 'Online' : 'Offline'; badge.className = 'lb-online-badge ' + (Firebase.isOnline() ? 'lb-badge-online' : ''); } } }
    if (name === 'casino') this.renderCasinoGrid();
    if (name === 'companies') { if (typeof Companies !== 'undefined') Companies.render(); }
    if (name === 'houses') { if (typeof Houses !== 'undefined') { Houses._refreshNpcMarket(); Houses.render(); } }
    if (name === 'inventory') { if (typeof Crafting !== 'undefined') Crafting.render(); }
    if (name === 'stores') { if (typeof Stores !== 'undefined') Stores.renderStoresScreen(); }
    if (name === 'cars') { if (typeof Cars !== 'undefined') Cars.render(); }
    if (name === 'settings') Settings.render();
    // Refresh drawer nav highlight if drawer is open
    if (document.getElementById('side-drawer')?.classList.contains('open')) this._renderDrawerNav();
  },

  goBack() {
    const prev = this.screenHistory.pop() || 'home';
    this.showScreen(prev);
    this.screenHistory.pop();
  },

  // ── Side Drawer ──────────────────────────────────────────────────────
  toggleDrawer() {
    const drawer = document.getElementById('side-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const open = drawer.classList.toggle('open');
    overlay.classList.toggle('open', open);
    if (open) this._renderDrawerNav();
  },

  closeDrawer() {
    document.getElementById('side-drawer')?.classList.remove('open');
    document.getElementById('drawer-overlay')?.classList.remove('open');
  },

  _renderDrawerNav() {
    // Update player info
    const name = typeof Settings !== 'undefined' ? (Settings.profile.name || 'Guest') : 'Guest';
    const el = document.getElementById('drawer-name');
    if (el) el.textContent = name;
    const balEl = document.getElementById('drawer-balance');
    if (balEl) balEl.textContent = this.formatMoney(this.balance);

    const nav = document.getElementById('drawer-nav');
    if (!nav) return;

    const sections = [
      { label: 'Home', links: [
        { id: 'home', icon: '🏠', label: 'Home' },
        { id: 'casino', icon: '🎲', label: 'Casino' },
      ]},
      { label: 'Casino Games', links: [
        { id: 'coinflip', icon: '🪙', label: 'Coin Flip' },
        { id: 'slots', icon: '🎰', label: 'Slots' },
        { id: 'crash', icon: '🚀', label: 'Crash' },
        { id: 'blackjack', icon: '🃏', label: 'Blackjack' },
        { id: 'plinko', icon: '🎱', label: 'Plinko' },
        { id: 'roulette', icon: '🎯', label: 'Roulette' },
      ]},
      { label: 'Sports & Luck', links: [
        { id: 'horses', icon: '🏇', label: 'Horse Racing' },
        { id: 'lottery', icon: '🎟', label: 'Lottery' },
      ]},
      { label: 'Business', links: [
        { id: 'properties', icon: '🏢', label: 'Properties' },
        { id: 'crime', icon: '🚨', label: 'Crime' },
        { id: 'companies', icon: '🏛', label: 'Companies' },
        { id: 'houses', icon: '🏠', label: 'Houses' },
        { id: 'cars', icon: '🚗', label: 'Cars' },
      ]},
      { label: 'Markets', links: [
        { id: 'stocks', icon: '📈', label: 'Stocks' },
        { id: 'crypto', icon: '⛏️', label: 'Crypto' },
      ]},
      { label: 'Other', links: [
        { id: 'inventory', icon: '🎒', label: 'Inventory' },
        { id: 'stores', icon: '🏪', label: 'Shops' },
        { id: 'pets', icon: '🐾', label: 'Pets' },
        { id: 'leaderboard', icon: '🏆', label: 'Leaderboard' },
        { id: 'settings', icon: '⚙️', label: 'Settings' },
      ]},
    ];

    let html = '';
    sections.forEach(sec => {
      html += `<div class="drawer-nav-section">${sec.label}</div>`;
      sec.links.forEach(link => {
        const active = this.currentScreen === link.id ? ' active' : '';
        html += `<button class="drawer-nav-link${active}" onclick="App.showScreen('${link.id}');App.closeDrawer()">${link.icon} ${link.label}</button>`;
      });
    });
    nav.innerHTML = html;
  },

  // ── Home Tabs ────────────────────────────────────────────────────────
  setHomeTab(tab) {
    document.querySelectorAll('.home-tab-panel').forEach(p => p.classList.add('hidden'));
    const panel = document.getElementById('home-tab-' + tab);
    if (panel) panel.classList.remove('hidden');
    document.querySelectorAll('.home-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
  },

  // ── Casino Categories + Favorites ────────────────────────────────────
  favorites: [],

  CASINO_CATEGORIES: [
    { label: '🎰 Casino Games',  screens: ['coinflip','slots','crash','blackjack','plinko','roulette'] },
    { label: '🐎 Sports & Luck', screens: ['horses','lottery'] },
    { label: '💼 Business',      screens: ['properties','crime','companies','houses','cars'] },
    { label: '📈 Markets',       screens: ['stocks','crypto'] },
    { label: '🎒 Inventory',     screens: ['inventory', 'stores'] },
    { label: '🐾 Social',        screens: ['pets','leaderboard'] },
    { label: '⚙️ System',        screens: ['settings'] },
  ],

  CASINO_SCREEN_META: {
    coinflip:   { icon: '🪙', label: 'Coin Flip' },
    slots:      { icon: '🎰', label: 'Slots' },
    crash:      { icon: '🚀', label: 'Crash' },
    blackjack:  { icon: '🃏', label: 'Blackjack' },
    plinko:     { icon: '🎱', label: 'Plinko' },
    roulette:   { icon: '🎯', label: 'Roulette' },
    horses:     { icon: '🏇', label: 'Horse Racing' },
    lottery:    { icon: '🎟', label: 'Lottery' },
    properties: { icon: '🏢', label: 'Properties' },
    crime:      { icon: '🚨', label: 'Crime' },
    companies:  { icon: '🏛', label: 'Companies' },
    houses:     { icon: '🏠', label: 'Houses' },
    cars:       { icon: '🚗', label: 'Cars' },
    stocks:     { icon: '📈', label: 'Stocks' },
    crypto:     { icon: '⛏️', label: 'Crypto' },
    inventory:  { icon: '🎒', label: 'Inventory' },
    stores:     { icon: '🏪', label: 'Shops' },
    pets:       { icon: '🐾', label: 'Pets' },
    leaderboard:{ icon: '🏆', label: 'Leaderboard' },
    settings:   { icon: '⚙️', label: 'Settings' },
  },

  renderCasinoGrid() {
    const grid = document.getElementById('casino-grid');
    if (!grid) return;

    const _makeCard = (screenId) => {
      const meta = this.CASINO_SCREEN_META[screenId];
      if (!meta) return '';
      const isFav = this.favorites.includes(screenId);
      return `<div class="casino-card" onclick="App.showScreen('${screenId}')">
        <button class="fav-pin-btn" onclick="App.toggleFavorite('${screenId}',event)">${isFav ? '⭐' : '☆'}</button>
        <div class="casino-icon">${meta.icon}</div>
        <div class="casino-name">${meta.label}</div>
      </div>`;
    };

    let html = '';

    // Favorites strip
    if (this.favorites.length > 0) {
      html += `<div class="casino-category-label">⭐ Favorites</div>`;
      html += `<div class="casino-favs-strip">`;
      this.favorites.forEach(id => { html += _makeCard(id); });
      html += `</div>`;
    }

    // Categories
    this.CASINO_CATEGORIES.forEach(cat => {
      html += `<div class="casino-category-label">${cat.label}</div>`;
      html += `<div class="casino-grid-section">`;
      cat.screens.forEach(id => { html += _makeCard(id); });
      html += `</div>`;
    });

    grid.innerHTML = html;
  },

  toggleFavorite(screenId, event) {
    if (event) { event.stopPropagation(); }
    const idx = this.favorites.indexOf(screenId);
    if (idx >= 0) {
      this.favorites.splice(idx, 1);
    } else {
      this.favorites.push(screenId);
    }
    this.save();
    this.renderCasinoGrid();
  },

  getHungerPenalty() {
    const h = this.hunger || 0;
    if (h > 75) return 0;
    if (h > 50) return 0.05;
    if (h > 25) return 0.15;
    if (h > 10) return 0.30;
    return 0.50;
  },

  save() {
    const data = {
      balance: this.balance,
      totalEarned: this.totalEarned,
      totalClicks: this.totalClicks,
      upgrades: this.upgrades,
      rebirth: this.rebirth,
      creditScore: this.creditScore,
      stats: this.stats,
      hunger: this.hunger,
      lastHungerTick: this.lastHungerTick,
      luckBoostUntil: this.luckBoostUntil,
      luckBoostPct: this.luckBoostPct,
      decaySlowUntil: this.decaySlowUntil,
      loans: typeof Loans !== 'undefined' ? Loans.getSaveData() : null,
      properties: typeof Properties !== 'undefined' ? Properties.getSaveData() : null,
      crime: typeof Crime !== 'undefined' ? Crime.getSaveData() : null,
      pets: typeof Pets !== 'undefined' ? Pets.getSaveData() : null,
      stocks: typeof Stocks !== 'undefined' ? Stocks.getSaveData() : null,
      crypto: typeof Crypto !== 'undefined' ? Crypto.getSaveData() : null,
      companies: typeof Companies !== 'undefined' ? Companies.getSaveData() : null,
      houses: typeof Houses !== 'undefined' ? Houses.getSaveData() : null,
      crafting: typeof Crafting !== 'undefined' ? Crafting.getSaveData() : null,
      cars: typeof Cars !== 'undefined' ? Cars.getSaveData() : null,
      favorites: this.favorites,
      version: 7,
      savedAt: Date.now(),
    };
    localStorage.setItem('retros_casino_save', JSON.stringify(data));
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.pushLeaderboard();
      Firebase.pushCloudSave();
    }
  },

  load() {
    const raw = localStorage.getItem('retros_casino_save');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      this.balance = data.balance !== undefined ? data.balance : 0.02;
      this.totalEarned = data.totalEarned || 0;
      this.totalClicks = data.totalClicks || 0;
      this.upgrades = data.upgrades || { clickValue: 0, autoClicker: 0, luckyClick: 0, critClick: 0, autoBet: 0 };
      this.rebirth = data.rebirth || 0;
      this.creditScore = data.creditScore !== undefined ? data.creditScore : 600;
      this.stats = data.stats || { gamesWon: 0, gamesLost: 0 };
      this.hunger = data.hunger !== undefined ? data.hunger : 100;
      this.lastHungerTick = data.lastHungerTick || 0;
      this.luckBoostUntil = data.luckBoostUntil || 0;
      this.luckBoostPct = data.luckBoostPct || 0;
      this.decaySlowUntil = data.decaySlowUntil || 0;
      this.favorites = Array.isArray(data.favorites) ? data.favorites : [];
      if (typeof Loans !== 'undefined') {
        if (data.loans) Loans.loadSaveData(data.loans);
        else { Loans.debt = data.debt || 0; Loans.loanTime = data.loanTime || 0; } // legacy
      }
      if (typeof Properties !== 'undefined' && data.properties) {
        Properties.loadSaveData(data.properties);
      }
      if (typeof Crime !== 'undefined' && data.crime) {
        Crime.loadSaveData(data.crime);
      }
      if (typeof Pets !== 'undefined' && data.pets) {
        Pets.loadSaveData(data.pets);
      }
      if (typeof Stocks !== 'undefined' && data.stocks) {
        Stocks.loadSaveData(data.stocks);
      }
      if (typeof Crypto !== 'undefined' && data.crypto) {
        Crypto.loadSaveData(data.crypto);
      }
      if (typeof Companies !== 'undefined' && data.companies) {
        Companies.loadSaveData(data.companies);
      }
      if (typeof Houses !== 'undefined' && data.houses) {
        Houses.loadSaveData(data.houses);
      }
      if (typeof Crafting !== 'undefined' && data.crafting) {
        Crafting.loadSaveData(data.crafting);
      }
      if (typeof Cars !== 'undefined' && data.cars) {
        Cars.loadSaveData(data.cars);
      }
    } catch (e) {}
  },

  startAutoSave() {
    if (this._autoSaveTimer) clearInterval(this._autoSaveTimer);
    const interval = (typeof Settings !== 'undefined') ? Settings.options.autoSaveInterval * 1000 : 30000;
    this._autoSaveTimer = setInterval(() => this.save(), interval);
  }
};

// Toast notification queue — prevents overlapping news/alerts
const Toast = {
  _queue: [],
  _active: false,
  _el: null,

  // show(text, color?, duration?) — enqueue a toast
  show(text, color = '', duration = 4000) {
    this._queue.push({ text, color, duration });
    if (!this._active) this._next();
  },

  _next() {
    if (!this._queue.length) { this._active = false; return; }
    this._active = true;
    const { text, color, duration } = this._queue.shift();

    const el = document.createElement('div');
    el.className = 'insider-tip-toast toast-in';
    el.textContent = text;
    if (color) { el.style.background = color; el.style.color = '#fff'; }
    document.body.appendChild(el);
    this._el = el;

    const hideAfter = Math.max(duration - 400, 200);
    setTimeout(() => {
      el.classList.remove('toast-in');
      el.classList.add('toast-out');
      setTimeout(() => {
        el.remove();
        this._next();
      }, 380);
    }, hideAfter);
  },
};

// Start Firebase (called once — skipped for guests until they set a name)
function _initFirebase() {
  if (typeof Firebase !== 'undefined' && !Firebase.isOnline() && Firebase.connectionState !== 'connecting') {
    Firebase.init();
  }
}

function showFirstTimeUsernamePrompt() {
  if (document.getElementById('ft-username-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'ft-username-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.88)';
  modal.innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--green);border-radius:14px;padding:28px 22px;max-width:320px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.5)">
      <div style="font-size:40px;margin-bottom:8px">🎰</div>
      <div style="font-size:19px;font-weight:700;color:var(--green);margin-bottom:4px">Welcome to Retro's Casino!</div>
      <div style="font-size:13px;color:var(--text-dim);margin-bottom:18px">Pick a username. It will show on the leaderboard.</div>
      <input id="ft-username-input" type="text" maxlength="16" placeholder="Username"
        style="width:100%;padding:11px;background:var(--bg);color:var(--text);border:1px solid var(--bg3);border-radius:8px;font-size:15px;box-sizing:border-box;text-align:center;margin-bottom:10px;outline:none"
        onkeydown="if(event.key==='Enter')document.getElementById('ft-username-submit').click()">
      <button id="ft-username-submit"
        style="width:100%;padding:13px;background:var(--green);color:#000;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:8px"
        onclick="(function(){const v=document.getElementById('ft-username-input').value.trim();if(v){Settings.setName(v);_initFirebase();}document.getElementById('ft-username-modal').remove();})()">Let's Play!</button>

      <div style="display:flex;align-items:center;gap:8px;margin:10px 0">
        <div style="flex:1;height:1px;background:var(--bg3)"></div>
        <span style="font-size:11px;color:var(--text-dim);white-space:nowrap">already have an account?</span>
        <div style="flex:1;height:1px;background:var(--bg3)"></div>
      </div>

      <div id="ft-login-section" style="display:none;margin-bottom:8px">
        <input id="ft-login-name" type="text" maxlength="16" placeholder="Username"
          style="width:100%;padding:10px;background:var(--bg);color:var(--text);border:1px solid var(--bg3);border-radius:8px;font-size:14px;box-sizing:border-box;text-align:center;margin-bottom:8px;outline:none">
        <input id="ft-login-pw" type="password" placeholder="Password"
          style="width:100%;padding:10px;background:var(--bg);color:var(--text);border:1px solid var(--bg3);border-radius:8px;font-size:14px;box-sizing:border-box;text-align:center;margin-bottom:10px;outline:none"
          onkeydown="if(event.key==='Enter')document.getElementById('ft-login-submit').click()">
        <button id="ft-login-submit"
          style="width:100%;padding:11px;background:var(--bg3);color:var(--text);border:1px solid var(--green);border-radius:8px;font-size:14px;font-weight:700;cursor:pointer"
          onclick="(async function(){
            const n=document.getElementById('ft-login-name').value.trim();
            const p=document.getElementById('ft-login-pw').value.trim();
            if(!n||!p){alert('Enter username and password');return;}
            const btn=document.getElementById('ft-login-submit');
            btn.textContent='Logging in...';btn.disabled=true;
            Settings.setName(n);
            _initFirebase();
            await new Promise(r=>setTimeout(r,1500));
            const result=await Firebase.loginWithPassword(n,p);
            if(result.ok){
              document.getElementById('ft-username-modal').remove();
            } else {
              btn.textContent='Login / Restore Save';btn.disabled=false;
              alert('Login failed: '+(result.error||'incorrect password'));
            }
          })()">Login / Restore Save</button>
        <div id="ft-login-err" style="font-size:11px;color:var(--red);margin-top:6px;min-height:14px"></div>
      </div>

      <button style="width:100%;padding:8px;background:var(--bg3);color:var(--green);border:1px solid var(--bg3);border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:6px"
        onclick="(function(){const s=document.getElementById('ft-login-section');const vis=s.style.display==='none';s.style.display=vis?'block':'none';if(vis){document.getElementById('ft-recover-section').style.display='none';document.getElementById('ft-login-name').focus();}this.textContent=vis?'↑ Hide Login':'🔑 Login to Existing Account';})()">🔑 Login to Existing Account</button>

      <div id="ft-recover-section" style="display:none;margin-bottom:8px">
        <input id="ft-recover-name" type="text" maxlength="16" placeholder="Username"
          style="width:100%;padding:10px;background:var(--bg);color:var(--text);border:1px solid var(--bg3);border-radius:8px;font-size:14px;box-sizing:border-box;text-align:center;margin-bottom:8px;outline:none">
        <input id="ft-recover-code" type="text" placeholder="Recovery code (XXXX-XXXX-XXXX)"
          style="width:100%;padding:10px;background:var(--bg);color:var(--text);border:1px solid var(--bg3);border-radius:8px;font-size:13px;box-sizing:border-box;text-align:center;margin-bottom:10px;outline:none;text-transform:uppercase;letter-spacing:1px"
          maxlength="14"
          onkeydown="if(event.key==='Enter')document.getElementById('ft-recover-submit').click()">
        <button id="ft-recover-submit"
          style="width:100%;padding:11px;background:var(--bg3);color:var(--text);border:1px solid var(--gold,#f39c12);border-radius:8px;font-size:14px;font-weight:700;cursor:pointer"
          onclick="(async function(){
            const n=document.getElementById('ft-recover-name').value.trim();
            const c=document.getElementById('ft-recover-code').value.trim();
            if(!n||!c){alert('Enter your username and recovery code');return;}
            const btn=document.getElementById('ft-recover-submit');
            btn.textContent='Recovering...';btn.disabled=true;
            Settings.setName(n);
            _initFirebase();
            await new Promise(r=>setTimeout(r,1500));
            const result=await Firebase.recoverAccount(n,c);
            if(result.ok){
              document.getElementById('ft-username-modal').remove();
              alert('Account recovered successfully!');
            } else {
              btn.textContent='Recover Account';btn.disabled=false;
              alert('Recovery failed: '+(result.error||'invalid code'));
            }
          })()">Recover Account</button>
        <div id="ft-recover-err" style="font-size:11px;color:var(--red);margin-top:6px;min-height:14px"></div>
      </div>

      <button style="width:100%;padding:8px;background:var(--bg3);color:#f39c12;border:1px solid var(--bg3);border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:6px"
        onclick="(function(){const s=document.getElementById('ft-recover-section');const vis=s.style.display==='none';s.style.display=vis?'block':'none';if(vis){document.getElementById('ft-login-section').style.display='none';document.getElementById('ft-recover-name').focus();}this.textContent=vis?'↑ Hide Recovery':'🔑 Recover with Code';})()">🔑 Recover with Code</button>

      <button style="width:100%;padding:8px;background:none;color:var(--text-dim);border:none;font-size:12px;cursor:pointer"
        onclick="document.getElementById('ft-username-modal').remove()">Skip (play as Guest — local only)</button>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('ft-username-input')?.focus(), 80);
}

document.addEventListener('DOMContentLoaded', () => {
  // Pin ticker directly below top-bar using its real rendered height
  const _pinTicker = () => {
    const bar = document.getElementById('top-bar');
    const ticker = document.getElementById('stock-ticker');
    if (bar && ticker) ticker.style.top = bar.offsetHeight + 'px';
  };
  _pinTicker();
  window.addEventListener('resize', _pinTicker);

  const isFirstTime = !localStorage.getItem('retros_casino_save');
  App.init();
  App.renderCasinoGrid();
  Clicker.init();
  Loans.init();
  Properties.init();
  Pets.init();
  if (typeof Food !== 'undefined') Food.init();
  if (typeof Stocks !== 'undefined') Stocks.init();
  if (typeof Crypto !== 'undefined') Crypto.init();
  if (typeof Houses !== 'undefined') Houses.init();
  if (typeof Crafting !== 'undefined') Crafting.init();
  if (typeof Cars !== 'undefined') Cars.init();
  GameStats.initAllHUDs();
  if (isFirstTime) {
    // Defer Firebase until after the username choice
    setTimeout(showFirstTimeUsernamePrompt, 600);
  } else {
    _initFirebase();
  }
});
