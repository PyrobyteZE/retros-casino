// ===== Rig System =====
const Rig = {
  enabled: false,
  winRate: 50,
  forceWin: null,

  // Per-game rig settings
  games: {
    coinflip: { forceResult: null, winStreak: 0 },
    slots: { forceJackpot: false, forceSymbol: -1 },
    crash: { forceCrashAt: 0, minMultiplier: 1, neverCrash: false },
    blackjack: { forceBlackjack: false, neverBust: false, peekDealer: false },
    plinko: { forceBucket: -1, alwaysEdge: false },
    roulette: { forceNumber: -1 },
    horses: { forceWinner: -1 },
    lottery: { forceJackpot: false }
  },

  shouldWin() {
    if (!this.enabled || !Admin.isAdmin()) return Math.random() < 0.5;
    if (this.forceWin !== null) {
      const result = this.forceWin;
      this.forceWin = null;
      Admin.updateRigStatus();
      return result;
    }
    return Math.random() * 100 < this.winRate;
  },

  biasedRandom(fairRandom) {
    if (!this.enabled || !Admin.isAdmin()) return fairRandom !== undefined ? fairRandom : Math.random();
    const bias = this.winRate / 100;
    const r = fairRandom !== undefined ? fairRandom : Math.random();
    return Math.pow(r, 2 * (1 - bias));
  }
};

// ===== Game Stats Tracker =====
const GameStats = {
  history: [],
  stats: {
    coinflip: { wins: 0, losses: 0, profit: 0 },
    slots:    { wins: 0, losses: 0, profit: 0 },
    crash:    { wins: 0, losses: 0, profit: 0 },
    blackjack:{ wins: 0, losses: 0, profit: 0 },
    plinko:   { wins: 0, losses: 0, profit: 0 },
    roulette: { wins: 0, losses: 0, profit: 0 },
    horses:   { wins: 0, losses: 0, profit: 0 },
    lottery:  { wins: 0, losses: 0, profit: 0 }
  },
  streak: 0,        // positive = win streak, negative = lose streak

  record(game, result, amount) {
    // result: 'win', 'lose', 'push'
    const s = this.stats[game];
    if (!s) return;

    if (result === 'win') {
      s.wins++;
      s.profit += amount;
      this.streak = this.streak > 0 ? this.streak + 1 : 1;
    } else if (result === 'lose') {
      s.losses++;
      s.profit -= amount;
      this.streak = this.streak < 0 ? this.streak - 1 : -1;
      if (typeof Pets !== 'undefined') Pets.checkEasterEgg('money_lost', amount);
    }
    // push doesn't affect streak

    this.history.unshift({ game, result, amount, time: Date.now() });
    if (this.history.length > 100) this.history.length = 100;

    this.updateHUD(game);
    this.updateStreak();
  },

  updateHUD(game) {
    const s = this.stats[game];
    const prefix = this.getPrefix(game);
    const recordEl = document.getElementById(prefix + '-record');
    const profitEl = document.getElementById(prefix + '-profit');
    if (recordEl) recordEl.textContent = s.wins + '/' + s.losses;
    if (profitEl) {
      profitEl.textContent = App.formatMoney(Math.abs(s.profit));
      profitEl.className = s.profit >= 0 ? 'profit-pos' : 'profit-neg';
    }
  },

  updateStreak() {
    const banner = document.getElementById('streak-banner');
    const icon = document.getElementById('streak-icon');
    const text = document.getElementById('streak-text');
    const abs = Math.abs(this.streak);

    if (abs < 2 || (typeof Settings !== 'undefined' && !Settings.options.showStreaks)) {
      banner.classList.add('hidden');
      return;
    }

    banner.classList.remove('hidden');
    if (this.streak > 0) {
      banner.className = 'win-streak';
      icon.textContent = '\u{1F525}';
      text.textContent = abs + ' Win Streak!';
    } else {
      banner.className = 'lose-streak';
      icon.textContent = '\u{1F4A8}';
      text.textContent = abs + ' Loss Streak...';
    }
  },

  getPrefix(game) {
    const map = { coinflip: 'cf', slots: 'slots', crash: 'crash', blackjack: 'bj', plinko: 'plinko', roulette: 'rl', horses: 'horses', lottery: 'lottery' };
    return map[game] || game;
  },

  initAllHUDs() {
    for (const game of Object.keys(this.stats)) {
      this.updateHUD(game);
    }
  }
};

// ===== Admin Panel =====
const Admin = {
  tapCount: 0,
  tapTimer: null,
  adminMode: false,
  godMode: false,
  trollMode: false,
  badgeHidden: false,
  speedMultiplier: 1,
  startingBalance: 0.02,
  adminPassword: '1984',
  adminName: 'RetroByte',

  isAdmin() {
    return this.adminMode && typeof Settings !== 'undefined' && Settings.profile.name === this.adminName;
  },

  tapTitle() {
    this.tapCount++;
    clearTimeout(this.tapTimer);
    this.tapTimer = setTimeout(() => { this.tapCount = 0; }, 2000);

    if (this.tapCount >= 5) {
      this.tapCount = 0;
      if (!this.adminMode) {
        if (typeof Settings === 'undefined' || Settings.profile.name !== this.adminName) return;
        const pw = prompt('Enter admin password:');
        if (pw !== this.adminPassword) return;
        this.adminMode = true;
        this.showGameAdmins();
        if (!this.badgeHidden) {
          document.getElementById('admin-indicator').classList.remove('hidden');
        }
      }
      if (!this.isAdmin()) {
        this.adminMode = false;
        this.godMode = false;
        document.getElementById('admin-indicator').classList.add('hidden');
        this.showGameAdmins();
        return;
      }
      this.open();
    }
  },

  showGameAdmins() {
    document.querySelectorAll('.game-admin').forEach(el => {
      el.classList.toggle('hidden', !this.adminMode);
    });
  },

  toggleGamePanel(id) {
    document.getElementById(id).classList.toggle('collapsed');
  },

  open() {
    document.getElementById('admin-balance').value = Math.floor(App.balance);
    document.getElementById('admin-click-level').value = App.upgrades.clickValue || 0;
    document.getElementById('admin-auto-level').value = App.upgrades.autoClicker || 0;
    document.getElementById('admin-rebirth').value = App.rebirth || 0;
    document.getElementById('admin-earned').value = Math.floor(App.totalEarned);
    document.getElementById('admin-clicks').value = App.totalClicks;
    document.getElementById('admin-debt').value = Math.floor(Loans.debt);
    document.getElementById('admin-godmode').checked = this.godMode;
    document.getElementById('admin-speed').value = this.speedMultiplier;
    document.getElementById('admin-start-bal').value = this.startingBalance;
    document.getElementById('rig-toggle').checked = Rig.enabled;
    document.getElementById('rig-winrate').value = Rig.winRate;
    document.getElementById('rig-winrate-display').textContent = Rig.winRate + '%';
    document.getElementById('admin-badge-toggle').textContent = this.badgeHidden ? 'Show Badge' : 'Hide Badge';
    this.updateRigStatus();
    this.renderHistory();
    this.renderStockControls();
    this.renderCryptoControls();
    document.getElementById('admin-overlay').classList.add('open');
    document.getElementById('admin-overlay-backdrop').classList.add('open');
  },

  close() {
    document.getElementById('admin-overlay').classList.remove('open');
    document.getElementById('admin-overlay-backdrop').classList.remove('open');
  },

  toggleBadge() {
    this.badgeHidden = !this.badgeHidden;
    const indicator = document.getElementById('admin-indicator');
    if (this.badgeHidden) {
      indicator.classList.add('hidden');
    } else if (this.adminMode) {
      indicator.classList.remove('hidden');
    }
    document.getElementById('admin-badge-toggle').textContent = this.badgeHidden ? 'Show Badge' : 'Hide Badge';
  },

  // === God Mode ===
  toggleGodMode() {
    if (!this.isAdmin()) { document.getElementById('admin-godmode').checked = false; return; }
    this.godMode = document.getElementById('admin-godmode').checked;
    document.getElementById('balance-display').classList.toggle('godmode', this.godMode);
  },

  // Revoke admin if name changes away from RetroByte
  checkAdminRevoke() {
    if (this.adminMode && !this.isAdmin()) {
      this.adminMode = false;
      this.godMode = false;
      Rig.enabled = false;
      Rig.forceWin = null;
      document.getElementById('admin-indicator').classList.add('hidden');
      document.getElementById('balance-display').classList.remove('godmode');
      this.close();
      this.showGameAdmins();
    }
  },

  // === Speed Controls ===
  setSpeed() {
    this.speedMultiplier = parseInt(document.getElementById('admin-speed').value);
    Clicker.startAutoClicker();
  },

  // === Unlock All ===
  setRebirth() {
    const val = parseInt(document.getElementById('admin-rebirth').value);
    if (isNaN(val) || val < 0) return;
    App.rebirth = val;
    Clicker.updateRebirthUI();
    Clicker.renderUpgrades();
    Clicker.updateStats();
    Clicker.startAutoClicker();
    Clicker.startAutoBet();
  },

  unlockAll() {
    App.upgrades.clickValue = 50;
    App.upgrades.autoClicker = 50;
    if (App.rebirth >= 1) App.upgrades.luckyClick = 10;
    if (App.rebirth >= 2) App.upgrades.critClick = 5;
    if (App.rebirth >= 3) App.upgrades.autoBet = 5;
    Clicker.startAutoClicker();
    Clicker.startAutoBet();
    Clicker.updateStats();
    Clicker.renderUpgrades();
    Clicker.updateRebirthUI();
    document.getElementById('admin-click-level').value = 50;
    document.getElementById('admin-auto-level').value = 50;
  },

  // === Custom Starting Balance ===
  setStartBal() {
    const val = parseFloat(document.getElementById('admin-start-bal').value);
    if (!isNaN(val) && val > 0) this.startingBalance = val;
  },

  // === Global Rig ===
  updateRigStatus() {
    const status = document.getElementById('rig-status');
    if (!status) return;
    if (!Rig.enabled) {
      status.textContent = 'Disabled';
      status.style.color = '#888';
    } else if (Rig.forceWin === true) {
      status.textContent = 'FORCE WIN on next game';
      status.style.color = '#00e676';
    } else if (Rig.forceWin === false) {
      status.textContent = 'FORCE LOSE on next game';
      status.style.color = '#ff5252';
    } else {
      status.textContent = 'Active \u2014 ' + Rig.winRate + '% win rate';
      status.style.color = '#ffd740';
    }
  },

  toggleRig() {
    Rig.enabled = document.getElementById('rig-toggle').checked;
    this.updateRigStatus();
  },

  setWinRate() {
    Rig.winRate = parseInt(document.getElementById('rig-winrate').value);
    document.getElementById('rig-winrate-display').textContent = Rig.winRate + '%';
    this.updateRigStatus();
  },

  forceNextWin() {
    Rig.forceWin = true;
    Rig.enabled = true;
    document.getElementById('rig-toggle').checked = true;
    this.updateRigStatus();
  },

  forceNextLose() {
    Rig.forceWin = false;
    Rig.enabled = true;
    document.getElementById('rig-toggle').checked = true;
    this.updateRigStatus();
  },

  refreshGameRig() {},

  // === Troll Mode ===
  toggleTroll() {
    this.trollMode = !this.trollMode;
    const btn = document.getElementById('admin-troll-toggle');
    if (btn) btn.textContent = this.trollMode ? 'Troll: ON' : 'Troll: OFF';
  },

  trollFakeBalance() {
    // Shows a fake $0.00 balance to scare friends
    const el = document.getElementById('balance');
    if (el) el.textContent = '0.00';
    setTimeout(() => App.updateBalance(), 5000);
  },

  trollFlipScreen() {
    document.getElementById('app').style.transform =
      document.getElementById('app').style.transform === 'rotate(180deg)' ? '' : 'rotate(180deg)';
  },

  trollShake() {
    const app = document.getElementById('app');
    app.classList.add('troll-shake');
    setTimeout(() => app.classList.remove('troll-shake'), 3000);
  },

  trollFakeReset() {
    // Fake "data deleted" alert then restore
    const el = document.getElementById('balance');
    const real = el.textContent;
    el.textContent = '0.00';
    alert('ERROR: Save data corrupted! All progress lost.');
    setTimeout(() => { el.textContent = real; }, 100);
  },

  trollRainbow() {
    document.documentElement.classList.toggle('troll-rainbow');
  },

  trollHideBalance() {
    document.getElementById('balance-display').classList.toggle('hidden');
  },

  trollBlur() {
    const screens = document.getElementById('screens');
    screens.style.filter = screens.style.filter === 'blur(8px)' ? '' : 'blur(8px)';
  },

  // === Custom Stock News (synced to all players) ===
  _funnyFallbackNews: [
    'CEO found living double life as a goat farmer',
    'Quarterly earnings beat by exactly $1',
    'Company mascot escapes from office again',
    'Intern accidentally deleted the database',
    'Stock price changed because Mercury is in retrograde',
  ],

  sendStockNews() {
    const input = document.getElementById('admin-stock-news');
    if (!input) return;
    let text = input.value.trim();
    const isGood = document.getElementById('admin-stock-news-good').checked;

    // If empty, pick a funny fallback
    if (!text) {
      text = this._funnyFallbackNews[Math.floor(Math.random() * this._funnyFallbackNews.length)];
    }

    // Add locally — no "ADMIN:" prefix
    if (typeof Stocks !== 'undefined') {
      Stocks._addNews(text, isGood);
      if (App.currentScreen === 'stocks') Stocks.render();
    }

    // Push to Firebase so all players see it
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.pushStockNews(text, isGood);
    }

    input.value = '';
  },

  // === Balance ===
  setBalance() {
    const val = parseFloat(document.getElementById('admin-balance').value);
    if (isNaN(val) || val < 0) return;
    App.balance = val;
    App.updateBalance();
  },

  addMoney() {
    const val = parseFloat(document.getElementById('admin-balance').value);
    if (isNaN(val)) return;
    App.addBalance(val);
  },

  quickAdd(amount) {
    App.addBalance(amount);
    document.getElementById('admin-balance').value = Math.floor(App.balance);
  },

  // === Upgrades ===
  setClickLevel() {
    const val = parseInt(document.getElementById('admin-click-level').value);
    if (isNaN(val) || val < 0) return;
    App.upgrades.clickValue = val;
    Clicker.updateStats();
    Clicker.renderUpgrades();
  },

  setAutoLevel() {
    const val = parseInt(document.getElementById('admin-auto-level').value);
    if (isNaN(val) || val < 0) return;
    App.upgrades.autoClicker = val;
    Clicker.startAutoClicker();
    Clicker.updateStats();
    Clicker.renderUpgrades();
  },

  // === Stats ===
  setEarned() {
    const val = parseFloat(document.getElementById('admin-earned').value);
    if (isNaN(val) || val < 0) return;
    App.totalEarned = val;
    Clicker.updateStats();
  },

  setClicks() {
    const val = parseInt(document.getElementById('admin-clicks').value);
    if (isNaN(val) || val < 0) return;
    App.totalClicks = val;
    Clicker.updateStats();
  },

  // === Game History ===
  renderHistory() {
    const container = document.getElementById('admin-history');
    if (GameStats.history.length === 0) {
      container.innerHTML = '<span style="color:#888">No games played yet.</span>';
      return;
    }
    container.innerHTML = GameStats.history.slice(0, 50).map(h => {
      const name = h.game.charAt(0).toUpperCase() + h.game.slice(1);
      const cls = h.result;
      const sign = h.result === 'win' ? '+' : h.result === 'lose' ? '-' : '';
      return `<div class="history-entry">
        <span class="h-game">${name}</span>
        <span class="h-result ${cls}">${h.result.toUpperCase()}</span>
        <span class="h-amount">${sign}${App.formatMoney(h.amount)}</span>
      </div>`;
    }).join('');
  },

  clearHistory() {
    GameStats.history = [];
    for (const g of Object.keys(GameStats.stats)) {
      GameStats.stats[g] = { wins: 0, losses: 0, profit: 0 };
    }
    GameStats.streak = 0;
    GameStats.initAllHUDs();
    GameStats.updateStreak();
    this.renderHistory();
  },

  // === Stocks Admin ===
  _pushStockPricesNow() {
    if (typeof Firebase !== 'undefined' && Firebase.isOnline() && Firebase._isStockAuthority) {
      Firebase.pushStockPrices(Stocks.prices.slice());
    }
  },

  stocksCrash() {
    if (typeof Stocks === 'undefined') return;
    Stocks.setGradualAll(0.5, 20);
    Stocks._addNews('Market downturn! Stocks falling...', false);
  },

  stocksBoom() {
    if (typeof Stocks === 'undefined') return;
    Stocks.setGradualAll(2, 20);
    Stocks._addNews('Market rally! Stocks climbing...', true);
  },

  stocksGiveShares() {
    if (typeof Stocks === 'undefined') return;
    Stocks.stocks.forEach(s => {
      if (!Stocks.holdings[s.symbol]) {
        Stocks.holdings[s.symbol] = { shares: 0, avgCost: 0 };
      }
      Stocks.holdings[s.symbol].shares += 100;
    });
    if (App.currentScreen === 'stocks') Stocks.render();
  },

  stocksResetPortfolio() {
    if (typeof Stocks === 'undefined') return;
    Stocks.holdings = {};
    Stocks.cashInvested = 0;
    Stocks.totalProfit = 0;
    if (App.currentScreen === 'stocks') Stocks.render();
  },

  stocksResetPrices() {
    if (typeof Stocks === 'undefined') return;
    Stocks.stocks.forEach((s, i) => {
      Stocks.prices[i] = s.basePrice;
      Stocks.priceHistory[i] = [];
      for (let j = 0; j < 60; j++) Stocks.priceHistory[i].push(s.basePrice);
    });
    this._pushStockPricesNow();
    if (App.currentScreen === 'stocks') Stocks.render();
    this.renderStockControls();
  },

  stockAdjust(idx, mult) {
    if (typeof Stocks === 'undefined') return;
    const target = Math.max(1, Stocks.prices[idx] * mult);
    Stocks.setGradualTarget(idx, target, 15);
  },

  stockSetPrice(idx) {
    if (typeof Stocks === 'undefined') return;
    const input = document.getElementById('admin-stock-price-' + idx);
    if (!input) return;
    const val = parseFloat(input.value);
    if (isNaN(val) || val < 1) return;
    Stocks.setGradualTarget(idx, val, 15);
  },

  renderStockControls() {
    const container = document.getElementById('admin-stock-controls');
    if (!container || typeof Stocks === 'undefined') return;
    let html = '<div class="admin-stock-grid">';
    Stocks.stocks.forEach((s, i) => {
      const price = Stocks.prices[i];
      html += `<div class="admin-stock-row">
        <span class="admin-stock-sym">${s.symbol}</span>
        <span class="admin-stock-price">${App.formatMoney(price)}</span>
        <div class="admin-stock-btns">
          <button class="rig-btn lose" onclick="Admin.stockAdjust(${i},0.5)">-50%</button>
          <button class="rig-btn lose" onclick="Admin.stockAdjust(${i},0.8)">-20%</button>
          <button class="rig-btn win" onclick="Admin.stockAdjust(${i},1.25)">+25%</button>
          <button class="rig-btn win" onclick="Admin.stockAdjust(${i},2)">+100%</button>
        </div>
        <div class="admin-stock-set">
          <input type="number" id="admin-stock-price-${i}" value="${Math.round(price)}" min="1" style="width:70px">
          <button onclick="Admin.stockSetPrice(${i})">Set</button>
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  },

  // === Crypto Admin ===
  _pushCryptoPricesNow() {
    if (typeof Firebase !== 'undefined' && Firebase.isOnline() && Firebase._isCryptoAuthority) {
      Firebase.pushCryptoPrices(Crypto.coinPrices.slice());
    }
  },

  cryptoPump() {
    if (typeof Crypto === 'undefined') return;
    Crypto.setGradualAll(3, 12);
  },

  cryptoDump() {
    if (typeof Crypto === 'undefined') return;
    Crypto.setGradualAll(0.3, 12);
  },

  cryptoAdjust(idx, mult) {
    if (typeof Crypto === 'undefined') return;
    const target = Math.max(0.01, Crypto.coinPrices[idx] * mult);
    Crypto.setGradualTarget(idx, target, 10);
  },

  cryptoSetPrice(idx) {
    if (typeof Crypto === 'undefined') return;
    const input = document.getElementById('admin-crypto-price-' + idx);
    if (!input) return;
    const val = parseFloat(input.value);
    if (isNaN(val) || val < 0.01) return;
    Crypto.setGradualTarget(idx, val, 10);
  },

  renderCryptoControls() {
    const container = document.getElementById('admin-crypto-controls');
    if (!container || typeof Crypto === 'undefined') return;
    let html = '<div class="admin-stock-grid">';
    Crypto.coins.forEach((c, i) => {
      const price = Crypto.coinPrices[i];
      html += `<div class="admin-stock-row">
        <span class="admin-stock-sym" style="color:${c.color}">${c.symbol}</span>
        <span class="admin-stock-price">${App.formatMoney(price)}</span>
        <div class="admin-stock-btns">
          <button class="rig-btn lose" onclick="Admin.cryptoAdjust(${i},0.3)">-70%</button>
          <button class="rig-btn lose" onclick="Admin.cryptoAdjust(${i},0.5)">-50%</button>
          <button class="rig-btn win" onclick="Admin.cryptoAdjust(${i},2)">+100%</button>
          <button class="rig-btn win" onclick="Admin.cryptoAdjust(${i},5)">+400%</button>
        </div>
        <div class="admin-stock-set">
          <input type="number" id="admin-crypto-price-${i}" value="${price.toFixed(2)}" min="0.01" step="0.01" style="width:80px">
          <button onclick="Admin.cryptoSetPrice(${i})">Set</button>
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  },

  cryptoGiveCoins() {
    if (typeof Crypto === 'undefined') return;
    Crypto.wallet.BTC += 10;
    Crypto.wallet.ETH += 100;
    Crypto.wallet.DOGE += 100000;
    if (App.currentScreen === 'crypto') Crypto.render();
  },

  cryptoMaxRigs() {
    if (typeof Crypto === 'undefined') return;
    for (let i = 0; i < Crypto.rigs.length; i++) {
      Crypto.rigOwned[i] = true;
      Crypto.rigLevels[i] = Crypto.rigs[i].maxLevel;
    }
    if (App.currentScreen === 'crypto') Crypto.render();
  },

  cryptoMaxUpgrades() {
    if (typeof Crypto === 'undefined') return;
    Crypto.upgrades.cpu = 10;
    Crypto.upgrades.gpu = 5;
    Crypto.upgrades.overclock = 5;
    for (let i = 0; i < Crypto.coolingUpgrades.length; i++) {
      Crypto.cooling[i] = true;
    }
    if (App.currentScreen === 'crypto') Crypto.render();
  },

  cryptoResetHeat() {
    if (typeof Crypto === 'undefined') return;
    Crypto.heat = 0;
    if (App.currentScreen === 'crypto') Crypto.render();
  },

  cryptoResetAll() {
    if (typeof Crypto === 'undefined') return;
    Crypto.wallet = { BTC: 0, ETH: 0, DOGE: 0 };
    Crypto.totalMined = { BTC: 0, ETH: 0, DOGE: 0 };
    Crypto.rigOwned = Crypto.rigs.map(() => false);
    Crypto.rigLevels = Crypto.rigs.map(() => 0);
    Crypto.upgrades = { cpu: 0, gpu: 0, overclock: 0 };
    Crypto.cooling = Crypto.coolingUpgrades.map(() => false);
    Crypto.heat = 0;
    if (App.currentScreen === 'crypto') Crypto.render();
  },

  cryptoPumpPrices() {
    if (typeof Crypto === 'undefined') return;
    Crypto.setGradualAll(3, 12);
  },

  // === Data ===
  forceSave() {
    App.save();
    alert('Game saved!');
  },

  resetAll() {
    if (!confirm('Are you sure? This will erase ALL progress!')) return;
    if (!confirm('Really? This cannot be undone.')) return;
    localStorage.removeItem('retros_casino_save');
    App.balance = this.startingBalance;
    App.totalEarned = 0;
    App.totalClicks = 0;
    App.upgrades = { clickValue: 0, autoClicker: 0, luckyClick: 0, critClick: 0, autoBet: 0 };
    App.rebirth = 0;
    Loans.debt = 0;
    Loans.loanTime = 0;
    Loans.stopInterest();
    Loans.updateUI();
    Loans.updateDebtDisplay();
    if (typeof Properties !== 'undefined') Properties.resetAll();
    App.updateBalance();
    Clicker.startAutoClicker();
    Clicker.updateStats();
    Clicker.renderUpgrades();
    Clicker.updateRebirthUI();
    Clicker.startAutoBet();
    this.clearHistory();
    this.open();
  },

  exportData() {
    App.save();
    const data = localStorage.getItem('retros_casino_save') || '{}';
    document.getElementById('admin-data').value = data;
    navigator.clipboard.writeText(data).then(() => {}, () => {});
  },

  importData() {
    const raw = document.getElementById('admin-data').value.trim();
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (typeof data.balance === 'undefined') {
        alert('Invalid save data');
        return;
      }
      localStorage.setItem('retros_casino_save', raw);
      App.load();
      App.updateBalance();
      Clicker.startAutoClicker();
      Clicker.updateStats();
      Clicker.renderUpgrades();
      if (typeof Properties !== 'undefined') Properties.init();
      this.open();
      alert('Save imported!');
    } catch (e) {
      alert('Invalid JSON data');
    }
  }
};
