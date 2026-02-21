// App controller - navigation, save/load, balance
const App = {
  balance: 0.02,
  totalEarned: 0,
  totalClicks: 0,
  upgrades: { clickValue: 0, autoClicker: 0, luckyClick: 0, critClick: 0, autoBet: 0 },
  rebirth: 0,
  stats: { gamesWon: 0, gamesLost: 0 },
  currentScreen: 'home',
  screenHistory: [],

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
    window.addEventListener('beforeunload', () => this.save());

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
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

  // Safe add that avoids floating point drift on large numbers
  addBalance(amount) {
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
      settings: 'Settings'
    };

    if (this.currentScreen !== name) {
      this.screenHistory.push(this.currentScreen);
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
    if (name === 'lottery') Lottery.init();
    if (name === 'properties') Properties.init();
    if (name === 'crime') Crime.init();
    if (name === 'pets') Pets.init();
    if (name === 'stocks') Stocks.init();
    if (name === 'crypto') Crypto.init();
    if (name === 'leaderboard') { if (typeof Firebase !== 'undefined') { Firebase.renderLeaderboard(); const badge = document.getElementById('lb-online-badge'); if (badge) { badge.textContent = Firebase.isOnline() ? 'Online' : 'Offline'; badge.className = 'lb-online-badge ' + (Firebase.isOnline() ? 'lb-badge-online' : ''); } } }
    if (name === 'companies') { if (typeof Companies !== 'undefined') Companies.render(); }
    if (name === 'settings') Settings.render();
  },

  goBack() {
    const prev = this.screenHistory.pop() || 'home';
    this.showScreen(prev);
    this.screenHistory.pop();
  },

  save() {
    const data = {
      balance: this.balance,
      totalEarned: this.totalEarned,
      totalClicks: this.totalClicks,
      upgrades: this.upgrades,
      rebirth: this.rebirth,
      stats: this.stats,
      loans: typeof Loans !== 'undefined' ? Loans.getSaveData() : null,
      properties: typeof Properties !== 'undefined' ? Properties.getSaveData() : null,
      crime: typeof Crime !== 'undefined' ? Crime.getSaveData() : null,
      pets: typeof Pets !== 'undefined' ? Pets.getSaveData() : null,
      stocks: typeof Stocks !== 'undefined' ? Stocks.getSaveData() : null,
      crypto: typeof Crypto !== 'undefined' ? Crypto.getSaveData() : null,
      companies: typeof Companies !== 'undefined' ? Companies.getSaveData() : null,
      version: 7
    };
    localStorage.setItem('retros_casino_save', JSON.stringify(data));
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushLeaderboard();
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
      this.stats = data.stats || { gamesWon: 0, gamesLost: 0 };
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
    } catch (e) {}
  },

  startAutoSave() {
    const interval = (typeof Settings !== 'undefined') ? Settings.options.autoSaveInterval * 1000 : 30000;
    this._autoSaveTimer = setInterval(() => this.save(), interval);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
  Clicker.init();
  Loans.init();
  Properties.init();
  Pets.init();
  if (typeof Stocks !== 'undefined') Stocks.init();
  if (typeof Crypto !== 'undefined') Crypto.init();
  if (typeof Firebase !== 'undefined') Firebase.init();
  GameStats.initAllHUDs();
});
