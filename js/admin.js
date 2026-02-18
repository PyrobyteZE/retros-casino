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
  speedMultiplier: 1,
  startingBalance: 0.02,
  adminPassword: '1984',
  adminName: 'RetroByte',

  isAdmin() {
    return this.adminMode && typeof Settings !== 'undefined' && Settings.profile.name === this.adminName;
  },

  tapTitle() {
    if (App.currentScreen !== 'home') return;
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
        document.getElementById('admin-indicator').classList.remove('hidden');
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
    this.updateRigStatus();
    this.renderHistory();
    App.showScreen('admin');
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

  refreshGameRig() {
    // visual feedback could go here
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
