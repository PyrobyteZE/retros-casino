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
    roulette: { forceNumber: -1, forceWin: false, forceLose: false },
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
  badgeHidden: false,
  speedMultiplier: 1,
  startingBalance: 0.02,
  adminPassword: '1984',
  adminName: 'RetroByte',
  _consoleUnlocked: false,
  _adminsList: {},   // { [uid]: { name, grantedAt } } — from Firebase

  activeTab: 'cheats',

  isAdmin() {
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    const grantedViaFirebase = myUid && this._adminsList[myUid];
    return this.adminMode && (this._consoleUnlocked || grantedViaFirebase || (typeof Settings !== 'undefined' && Settings.profile.name === this.adminName));
  },

  _consoleUnlock() {
    this._consoleUnlocked = true;
    this.adminMode = true;
    this.showGameAdmins();
    if (!this.badgeHidden) {
      const ind = document.getElementById('admin-indicator');
      if (ind) ind.classList.remove('hidden');
    }
    this._persistAdminToFirebase();
    this.open();
    console.info('%c[Admin] Console unlock successful!', 'color:#00e676;font-weight:bold');
  },

  tapTitle() {
    this.tapCount++;
    clearTimeout(this.tapTimer);
    this.tapTimer = setTimeout(() => { this.tapCount = 0; }, 2000);

    if (this.tapCount >= 5) {
      this.tapCount = 0;
      if (this.adminMode && this.isAdmin()) {
        // Already logged in — open panel
        this.open();
      } else {
        this.showLoginModal();
      }
    }
  },

  // ─── Admin Login Modal ───────────────────────────────────────────

  showLoginModal() {
    if (document.getElementById('admin-login-modal')) return;
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    const isGranted = myUid && this._adminsList[myUid];

    const modal = document.createElement('div');
    modal.id = 'admin-login-modal';
    modal.className = 'admin-login-backdrop';
    modal.innerHTML = `
      <div class="admin-login-box">
        <div class="admin-login-logo">🔐</div>
        <div class="admin-login-title">Admin Login</div>
        ${isGranted
          ? `<div class="admin-login-hint">Your account has admin access.<br>Enter the admin password to continue.</div>`
          : `<div class="admin-login-field">
               <label class="admin-login-label">Username</label>
               <input class="admin-login-input" type="text" id="al-username" autocomplete="off" spellcheck="false" placeholder="Username">
             </div>`
        }
        <div class="admin-login-field">
          <label class="admin-login-label">Password</label>
          <input class="admin-login-input" type="password" id="al-password" placeholder="Password"
            onkeydown="if(event.key==='Enter')Admin.attemptLogin()">
        </div>
        <div id="al-error" class="admin-login-error" style="display:none"></div>
        <button class="admin-login-btn" onclick="Admin.attemptLogin()">Login</button>
        <button class="admin-login-cancel" onclick="Admin.closeLoginModal()">Cancel</button>
      </div>
    `;
    document.body.appendChild(modal);
    // Focus first available input
    setTimeout(() => {
      const first = modal.querySelector('#al-username, #al-password');
      if (first) first.focus();
    }, 80);
  },

  closeLoginModal() {
    const modal = document.getElementById('admin-login-modal');
    if (modal) modal.remove();
  },

  attemptLogin() {
    const passEl  = document.getElementById('al-password');
    const userEl  = document.getElementById('al-username');
    const errorEl = document.getElementById('al-error');
    const password = passEl ? passEl.value : '';
    const username = userEl ? userEl.value.trim() : null;

    const showError = (msg) => {
      if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; }
      if (passEl)  { passEl.value = ''; passEl.focus(); }
    };

    if (password !== this.adminPassword) { showError('Incorrect password.'); return; }

    const myUid   = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    const isGranted = myUid && this._adminsList[myUid];

    // Granted admin: password is enough
    // Master admin: username must also match
    if (!isGranted && username !== this.adminName) {
      showError('Access denied.'); return;
    }

    // Success
    this.closeLoginModal();
    this.adminMode = true;
    this.showGameAdmins();
    if (!this.badgeHidden) {
      document.getElementById('admin-indicator')?.classList.remove('hidden');
    }
    this._persistAdminToFirebase();
    this.open();
  },

  _persistAdminToFirebase() {
    if (typeof Firebase === 'undefined' || !Firebase.isOnline() || !Firebase.uid) return;
    const name = typeof Settings !== 'undefined' ? Settings.profile.name : this.adminName;
    Firebase.grantAdmin(Firebase.uid, name);
  },

  showGameAdmins() {
    // Game panels moved to Cheats tab — nothing to show/hide here
  },

  toggleGamePanel(id) {
    // Game panels moved to Cheats tab
  },

  open() {
    document.getElementById('admin-badge-toggle').textContent = this.badgeHidden ? 'Show Badge' : 'Hide Badge';
    this.setTab(this.activeTab);
    document.getElementById('admin-overlay').classList.add('open');
    document.getElementById('admin-overlay-backdrop').classList.add('open');
  },

  setTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    const content = document.getElementById('admin-tab-content');
    if (!content) return;
    if (tab === 'cheats') content.innerHTML = this._renderCheatsTab();
    else if (tab === 'economy') content.innerHTML = this._renderEconomyTab();
    else if (tab === 'player') content.innerHTML = this._renderPlayerTab();
    else if (tab === 'rooms') content.innerHTML = this._renderRoomsTab();
    else if (tab === 'market') content.innerHTML = this._renderMarketTab();
    else if (tab === 'data') content.innerHTML = this._renderDataTab();
    this._populateTabValues(tab);
  },

  _populateTabValues(tab) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    const check = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };
    if (tab === 'cheats') {
      check('admin-godmode', this.godMode);
      set('admin-speed', this.speedMultiplier);
      set('admin-start-bal', this.startingBalance);
      check('rig-toggle', Rig.enabled);
      set('rig-winrate', Rig.winRate);
      const rd = document.getElementById('rig-winrate-display');
      if (rd) rd.textContent = Rig.winRate + '%';
      this.updateRigStatus();
      // Per-game rig state
      const g = Rig.games;
      set('slots-rig-symbol', g.slots.forceSymbol);
      set('crash-rig-point', g.crash.forceCrashAt || 0);
      set('crash-rig-min', g.crash.minMultiplier || 1);
      check('crash-rig-never', g.crash.neverCrash);
      check('bj-rig-nobust', g.blackjack.neverBust);
      check('bj-rig-peek', g.blackjack.peekDealer);
      check('plinko-rig-edge', g.plinko.alwaysEdge);
      set('horses-rig-winner', g.horses.forceWinner);
    } else if (tab === 'economy') {
      set('admin-balance', Math.floor(App.balance));
      set('admin-debt', Math.floor(Loans.debt));
    } else if (tab === 'player') {
      set('admin-rebirth', App.rebirth || 0);
      set('admin-click-level', App.upgrades.clickValue || 0);
      set('admin-auto-level', App.upgrades.autoClicker || 0);
      set('admin-earned', Math.floor(App.totalEarned));
      set('admin-clicks', App.totalClicks);
    } else if (tab === 'market') {
      this.renderPlayerStockControls();
      this.renderPlayerCoinControls();
      this.renderBankControls();
      this.renderStockControls();
      this.renderCryptoControls();
    } else if (tab === 'data') {
      this.renderHistory();
      this.renderAdminLeaderboard();
      this.renderAdminsSection();
      this.renderPersonalitySection();
      this.renderPlayerStockRemoveSection();
    }
  },

  _renderCheatsTab() {
    return `
      <div class="admin-section">
        <h3>Cheats</h3>
        <div class="admin-row">
          <label>God Mode:</label>
          <label class="toggle-switch">
            <input type="checkbox" id="admin-godmode" onchange="Admin.toggleGodMode()">
            <span class="toggle-slider"></span>
          </label>
          <span class="rig-hint">Bets cost $0</span>
        </div>
        <div class="admin-row">
          <label>Speed Multi:</label>
          <select id="admin-speed" onchange="Admin.setSpeed()">
            <option value="1">1x</option>
            <option value="2">2x</option>
            <option value="5">5x</option>
            <option value="10">10x</option>
            <option value="50">50x</option>
          </select>
          <span class="rig-hint">Auto-clicker speed</span>
        </div>
        <div class="admin-actions" style="margin-top:8px">
          <button class="admin-btn win-btn" onclick="Admin.unlockAll()">Max Upgrades</button>
          <button class="admin-btn win-btn" onclick="Admin.setStartBal()">Set Start $</button>
          <input type="number" id="admin-start-bal" value="0.02" style="width:80px">
        </div>
      </div>
      <div class="admin-section rig-section">
        <h3>Global Rig</h3>
        <div id="rig-status" class="rig-status">Disabled</div>
        <div class="admin-row">
          <label>Enable Rig:</label>
          <label class="toggle-switch">
            <input type="checkbox" id="rig-toggle" onchange="Admin.toggleRig()">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="admin-row">
          <label>Win Rate:</label>
          <input type="range" id="rig-winrate" min="0" max="100" value="50" oninput="Admin.setWinRate()">
          <span id="rig-winrate-display" class="rig-pct">50%</span>
        </div>
        <div class="admin-quick-money">
          <button onclick="Admin.forceNextWin()" style="border-color:#00e676;color:#00e676">Force Next Win</button>
          <button onclick="Admin.forceNextLose()" style="border-color:#ff5252;color:#ff5252">Force Next Lose</button>
        </div>
      </div>
      <div class="admin-section">
        <h3>Per-Game Rigs</h3>
        <div class="admin-game-rig-grid">
          <div class="admin-game-rig-card">
            <div class="admin-game-rig-title">Coinflip</div>
            <div class="admin-row" style="gap:4px">
              <button class="rig-btn win" onclick="Rig.games.coinflip.forceResult='heads'">Heads</button>
              <button class="rig-btn lose" onclick="Rig.games.coinflip.forceResult='tails'">Tails</button>
              <button class="rig-btn" onclick="Rig.games.coinflip.forceResult=null">None</button>
            </div>
          </div>
          <div class="admin-game-rig-card">
            <div class="admin-game-rig-title">Slots</div>
            <div class="admin-row" style="gap:4px">
              <button class="rig-btn win" onclick="Rig.games.slots.forceJackpot=true">Jackpot</button>
              <button class="rig-btn" onclick="Rig.games.slots.forceJackpot=false;Rig.games.slots.forceSymbol=-1">Off</button>
            </div>
            <div class="admin-row" style="margin-top:4px">
              <select id="slots-rig-symbol" onchange="Rig.games.slots.forceSymbol=+this.value" style="flex:1;font-size:12px;padding:4px">
                <option value="-1">No Force</option>
                <option value="0">Cherry</option>
                <option value="1">Lemon</option>
                <option value="2">Bar</option>
                <option value="3">Seven</option>
                <option value="4">Diamond</option>
              </select>
            </div>
          </div>
          <div class="admin-game-rig-card">
            <div class="admin-game-rig-title">Crash</div>
            <div class="admin-row" style="gap:4px">
              <input type="number" id="crash-rig-point" min="1" step="0.1" value="0" placeholder="0=random" style="width:60px;font-size:12px">
              <button class="rig-btn win" onclick="Rig.games.crash.forceCrashAt=+document.getElementById('crash-rig-point').value||0">Set At</button>
            </div>
            <div class="admin-row" style="margin-top:4px;gap:6px">
              <span style="font-size:11px;color:var(--text-dim)">Min:</span>
              <input type="number" id="crash-rig-min" min="1" step="0.5" value="1" style="width:45px;font-size:12px" onchange="Rig.games.crash.minMultiplier=+this.value||1">
              <span style="font-size:11px;color:var(--text-dim)">Never:</span>
              <label class="toggle-switch" style="transform:scale(0.8);flex-shrink:0">
                <input type="checkbox" id="crash-rig-never" onchange="Rig.games.crash.neverCrash=this.checked">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          <div class="admin-game-rig-card">
            <div class="admin-game-rig-title">Blackjack</div>
            <div class="admin-row" style="gap:4px">
              <button class="rig-btn win" onclick="Rig.games.blackjack.forceBlackjack=true">Force BJ</button>
              <button class="rig-btn" onclick="Rig.games.blackjack.forceBlackjack=false">Off</button>
            </div>
            <div class="admin-row" style="margin-top:4px;gap:6px;flex-wrap:wrap">
              <span style="font-size:11px;color:var(--text-dim)">No Bust:</span>
              <label class="toggle-switch" style="transform:scale(0.8);flex-shrink:0">
                <input type="checkbox" id="bj-rig-nobust" onchange="Rig.games.blackjack.neverBust=this.checked">
                <span class="toggle-slider"></span>
              </label>
              <span style="font-size:11px;color:var(--text-dim)">Peek:</span>
              <label class="toggle-switch" style="transform:scale(0.8);flex-shrink:0">
                <input type="checkbox" id="bj-rig-peek" onchange="Rig.games.blackjack.peekDealer=this.checked">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          <div class="admin-game-rig-card">
            <div class="admin-game-rig-title">Plinko</div>
            <div class="admin-row">
              <select id="plinko-rig-bucket" onchange="Rig.games.plinko.forceBucket=+this.value" style="flex:1;font-size:12px;padding:4px">
                <option value="-1">Random</option>
              </select>
            </div>
            <div class="admin-row" style="margin-top:4px;gap:6px">
              <span style="font-size:11px;color:var(--text-dim)">Always Edge:</span>
              <label class="toggle-switch" style="transform:scale(0.8);flex-shrink:0">
                <input type="checkbox" id="plinko-rig-edge" onchange="Rig.games.plinko.alwaysEdge=this.checked">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          <div class="admin-game-rig-card">
            <div class="admin-game-rig-title">Roulette</div>
            <div class="admin-row" style="gap:4px">
              <input type="text" id="rl-rig-num" placeholder="0–36 or 00" style="flex:1;font-size:12px" oninput="Rig.games.roulette.forceNumber=this.value.trim()===''?-1:this.value.trim()">
              <button onclick="Rig.games.roulette.forceNumber=-1;document.getElementById('rl-rig-num').value=''" style="font-size:11px">Clear</button>
            </div>
            <div class="admin-row" style="margin-top:4px;gap:4px">
              <button style="flex:1;background:#1b5e20;font-size:11px;padding:4px;border-radius:4px;color:#fff;border:none;cursor:pointer" onclick="Rig.games.roulette.forceWin=true;Rig.games.roulette.forceLose=false">Force Win</button>
              <button style="flex:1;background:#b71c1c;font-size:11px;padding:4px;border-radius:4px;color:#fff;border:none;cursor:pointer" onclick="Rig.games.roulette.forceLose=true;Rig.games.roulette.forceWin=false">Force Lose</button>
              <button style="font-size:11px;padding:4px;border-radius:4px;background:var(--bg3);color:var(--text);border:none;cursor:pointer" onclick="Rig.games.roulette.forceWin=false;Rig.games.roulette.forceLose=false">Reset</button>
            </div>
          </div>
          <div class="admin-game-rig-card">
            <div class="admin-game-rig-title">Horses</div>
            <div class="admin-row">
              <select id="horses-rig-winner" onchange="Rig.games.horses.forceWinner=+this.value" style="flex:1;font-size:12px;padding:4px">
                <option value="-1">Random</option>
                <option value="0">Thunder (2x)</option>
                <option value="1">Shadow (3x)</option>
                <option value="2">Goose (4x)</option>
                <option value="3">Storm (6x)</option>
                <option value="4">Lucky (10x)</option>
                <option value="5">Phantom (15x)</option>
              </select>
            </div>
          </div>
          <div class="admin-game-rig-card">
            <div class="admin-game-rig-title">Lottery</div>
            <div class="admin-row" style="gap:4px">
              <button class="rig-btn win" onclick="Rig.games.lottery.forceJackpot=true">Force Jackpot</button>
              <button class="rig-btn" onclick="Rig.games.lottery.forceJackpot=false">Off</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _renderTrollTab() {
    return '';
  },

  _renderRoomsTab() {
    const gameLabels = { horses: '🏇 Horses', crash: '💥 Crash', roulette: '🎡 Roulette' };
    const rows = ['horses', 'crash', 'roulette'].map(g => {
      const room = typeof MainRoom !== 'undefined' ? MainRoom._rooms[g] : null;
      const status = room ? room.status : 'idle';
      const players = room ? Object.keys(room.players || {}).length : 0;
      const playerNames = room ? Object.values(room.players || {}).map(p => p.name || 'Player').join(', ') : '';
      const statusBadge = status === 'idle'
        ? '<span class="mp-status-idle">idle</span>'
        : status === 'betting'
          ? `<span class="mp-status-betting">betting (${players}p)</span>`
          : status === 'running'
            ? '<span class="mp-status-live">LIVE</span>'
            : `<span class="mp-status-done">done</span>`;
      return `<div class="admin-room-card">
        <div class="admin-room-header">
          <span class="admin-room-game">${gameLabels[g]}</span>
          ${statusBadge}
        </div>
        ${players > 0 ? `<div class="admin-room-players">${playerNames}</div>` : ''}
        <div class="admin-room-btns">
          <button onclick="MainRoom.adminOpen('${g}',30)">30s</button>
          <button onclick="MainRoom.adminOpen('${g}',60)">60s</button>
          <button onclick="MainRoom.adminForceStart('${g}')" style="background:#ff9100;color:#000;font-weight:700">▶ Start</button>
          <button onclick="MainRoom.adminClose('${g}')" class="danger">✕ Close</button>
        </div>
      </div>`;
    }).join('');
    return `
      <div class="admin-section">
        <h3>Multiplayer Rooms</h3>
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">Tap Refresh or reopen this tab to update status.</div>
        <div class="admin-rooms-grid">${rows}</div>
        <button class="admin-btn" style="margin-top:10px;width:100%" onclick="Admin.setTab('rooms')">Refresh</button>
      </div>
    `;
  },

  _renderEconomyTab() {
    return `
      <div class="admin-section">
        <h3>Balance</h3>
        <div class="admin-row">
          <input type="number" id="admin-balance" placeholder="Amount">
          <button onclick="Admin.setBalance()">Set</button>
          <button onclick="Admin.addMoney()">Add</button>
        </div>
        <div class="admin-quick-money">
          <button onclick="Admin.quickAdd(1000)">+$1K</button>
          <button onclick="Admin.quickAdd(10000)">+$10K</button>
          <button onclick="Admin.quickAdd(100000)">+$100K</button>
          <button onclick="Admin.quickAdd(1000000)">+$1M</button>
          <button onclick="Admin.quickAdd(1000000000)">+$1B</button>
        </div>
      </div>
      <div class="admin-section">
        <h3>Loan Shark</h3>
        <div class="admin-row">
          <label>Current Debt:</label>
          <input type="number" id="admin-debt" min="0" value="0">
          <button onclick="Loans.debt=+document.getElementById('admin-debt').value||0;Loans.updateUI();Loans.updateDebtDisplay()">Set</button>
        </div>
        <div class="admin-actions" style="margin-top:8px">
          <button class="admin-btn win-btn" onclick="Loans.debt=0;Loans.loanTime=0;Loans.stopInterest();Loans.updateUI();Loans.updateDebtDisplay()">Clear All Debt</button>
        </div>
      </div>
    `;
  },

  _renderPlayerTab() {
    return `
      <div class="admin-section">
        <h3>Rebirth & Upgrades</h3>
        <div class="admin-row">
          <label>Rebirth Level:</label>
          <input type="number" id="admin-rebirth" min="0" value="0">
          <button onclick="Admin.setRebirth()">Set</button>
        </div>
        <div class="admin-row">
          <label>Click Value Lv:</label>
          <input type="number" id="admin-click-level" min="0" value="0">
          <button onclick="Admin.setClickLevel()">Set</button>
        </div>
        <div class="admin-row">
          <label>Auto Clicker Lv:</label>
          <input type="number" id="admin-auto-level" min="0" value="0">
          <button onclick="Admin.setAutoLevel()">Set</button>
        </div>
      </div>
      <div class="admin-section">
        <h3>Stats</h3>
        <div class="admin-row">
          <label>Total Earned:</label>
          <input type="number" id="admin-earned" min="0">
          <button onclick="Admin.setEarned()">Set</button>
        </div>
        <div class="admin-row">
          <label>Total Clicks:</label>
          <input type="number" id="admin-clicks" min="0">
          <button onclick="Admin.setClicks()">Set</button>
        </div>
      </div>
    `;
  },

  _renderMarketTab() {
    return `
      <div class="admin-section">
        <h3>Hunger Controls</h3>
        <div class="admin-actions">
          <button class="admin-btn win-btn" onclick="Admin.feedEveryone(100)">Feed Everyone (100%)</button>
          <button class="admin-btn danger" onclick="Admin.feedEveryone(10)">Starve Everyone (10%)</button>
        </div>
        <div class="admin-row">
          <label>Set My Hunger:</label>
          <input type="number" id="admin-hunger-val" min="0" max="100" value="100" style="width:60px">
          <button onclick="Admin.setHunger()">Set</button>
        </div>
      </div>
      <div class="admin-section">
        <h3>Player Stocks</h3>
        <div class="admin-actions">
          <button class="admin-btn win-btn" onclick="Admin.playerStocksBoom()">Player Boom (+100%)</button>
          <button class="admin-btn danger" onclick="Admin.playerStocksCrash()">Player Crash (-50%)</button>
        </div>
        <div id="admin-player-stock-controls" class="admin-stock-controls"></div>
      </div>
      <div class="admin-section">
        <h3>Player Coins</h3>
        <div id="admin-player-coin-controls" class="admin-stock-controls"></div>
      </div>
      <div class="admin-section">
        <h3>Player Banks</h3>
        <div id="admin-bank-controls" class="admin-stock-controls"></div>
      </div>
      <div class="admin-section">
        <h3>Stock Market</h3>
        <div class="admin-actions">
          <button class="admin-btn win-btn" onclick="Admin.stocksBoom()">Bull Run (+100%)</button>
          <button class="admin-btn danger" onclick="Admin.stocksCrash()">Market Crash (-50%)</button>
          <button class="admin-btn win-btn" onclick="Admin.stocksGiveShares()">+100 All Shares</button>
          <button class="admin-btn" onclick="Admin.stocksResetPrices()">Reset Prices</button>
          <button class="admin-btn danger" onclick="Admin.stocksResetPortfolio()">Clear Portfolio</button>
        </div>
        <div id="admin-stock-controls" class="admin-stock-controls"></div>
        <div class="admin-news-input" style="margin-top:10px">
          <h4 style="color:var(--green);margin:0 0 6px">Custom News (all players see this)</h4>
          <div class="admin-row">
            <input type="text" id="admin-stock-news" placeholder="Breaking: CEO caught eating crayons..." maxlength="200" style="flex:1">
            <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap">
              <input type="checkbox" id="admin-stock-news-good"> Good?
            </label>
            <button class="admin-btn win-btn" onclick="Admin.sendStockNews()" style="min-width:60px">Send</button>
          </div>
        </div>
      </div>
      <div class="admin-section">
        <h3>Crypto Mining</h3>
        <div class="admin-actions">
          <button class="admin-btn win-btn" onclick="Admin.cryptoPump()">Pump All (3x)</button>
          <button class="admin-btn danger" onclick="Admin.cryptoDump()">Dump All (-70%)</button>
          <button class="admin-btn win-btn" onclick="Admin.cryptoGiveCoins()">Give Coins (BTC+ETH+DOGE+...)</button>
          <button class="admin-btn win-btn" onclick="Admin.cryptoMaxRigs()">Max All Rigs</button>
          <button class="admin-btn win-btn" onclick="Admin.cryptoMaxUpgrades()">Max Upgrades + Cooling</button>
          <button class="admin-btn" onclick="Admin.cryptoResetHeat()">Reset Heat</button>
          <button class="admin-btn danger" onclick="Admin.cryptoResetAll()">Reset All Crypto</button>
        </div>
        <div id="admin-crypto-controls" class="admin-stock-controls"></div>
      </div>
    `;
  },

  _renderDataTab() {
    return `
      <div class="admin-section">
        <h3>Properties</h3>
        <div class="admin-actions">
          <button class="admin-btn win-btn" onclick="Properties.maxAll()">Max All Properties</button>
          <button class="admin-btn danger" onclick="Properties.resetAll()">Reset Properties</button>
        </div>
      </div>
      <div class="admin-section">
        <h3>Change Company Personality</h3>
        <div id="admin-personality-section"></div>
      </div>
      <div class="admin-section">
        <h3>Remove Player Stock</h3>
        <div id="admin-remove-stock-list"></div>
      </div>
      <div class="admin-section">
        <h3>Manage Admins</h3>
        <div id="admin-admins-list"></div>
      </div>
      <div class="admin-section">
        <h3>Leaderboard</h3>
        <div class="admin-actions">
          <button class="admin-btn" onclick="Admin.refreshLeaderboard()">Refresh</button>
          <button class="admin-btn danger" onclick="Admin.cleanDuplicateNames()">Clean Dupes</button>
        </div>
        <div id="admin-lb-list" class="admin-lb-list"></div>
      </div>
      <div class="admin-section">
        <h3>Game History</h3>
        <div id="admin-history" class="admin-history">No games played yet.</div>
        <button class="admin-btn" onclick="Admin.clearHistory()" style="margin-top:8px">Clear History</button>
      </div>
      <div class="admin-section">
        <h3>Save Data</h3>
        <div class="admin-actions">
          <button class="admin-btn save" onclick="Admin.forceSave()">Force Save</button>
          <button class="admin-btn danger" onclick="Admin.resetAll()">Reset All Data</button>
          <button class="admin-btn" onclick="Admin.exportData()">Export Save</button>
          <button class="admin-btn" onclick="Admin.importData()">Import Save</button>
        </div>
        <textarea id="admin-data" rows="4" placeholder="Paste save data here for import..."></textarea>
      </div>
    `;
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
    const el = document.getElementById('admin-balance');
    if (el) el.value = Math.floor(App.balance);
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
    if (!container) return;
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
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushAdminStockCommand({ type: 'crash' });
  },

  stocksBoom() {
    if (typeof Stocks === 'undefined') return;
    Stocks.setGradualAll(2, 20);
    Stocks._addNews('Market rally! Stocks climbing...', true);
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushAdminStockCommand({ type: 'boom' });
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
    // Reset system stocks
    Stocks.stocks.forEach((s, i) => {
      Stocks.prices[i] = s.basePrice;
      Stocks.priceHistory[i] = [];
      for (let j = 0; j < 60; j++) Stocks.priceHistory[i].push(s.basePrice);
    });
    this._pushStockPricesNow();
    // Reset player stocks — broadcast 'resetAll' so the stock authority clears its in-memory targets
    if (typeof Companies !== 'undefined') {
      Companies.applyAdminCommand({ type: 'resetAll' }); // apply locally (handles admin-as-authority too)
      if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
        Firebase.pushAdminPlayerStockCommand({ type: 'resetAll' }); // tell the real authority
      }
    }
    if (App.currentScreen === 'stocks') Stocks.render();
    this.renderStockControls();
  },

  stockAdjust(idx, mult) {
    if (typeof Stocks === 'undefined') return;
    const target = Math.max(1, Stocks.prices[idx] * mult);
    Stocks.setGradualTarget(idx, target, 15);
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushAdminStockCommand({ type: 'adjust', idx, mult });
  },

  stockSetPrice(idx) {
    if (typeof Stocks === 'undefined') return;
    const input = document.getElementById('admin-stock-price-' + idx);
    if (!input) return;
    const val = App.parseAmount(input.value);
    if (isNaN(val) || val < 1) return;
    Stocks.setGradualTarget(idx, val, 15);
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushAdminStockCommand({ type: 'target', idx, target: val, steps: 15 });
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
          <input type="text" inputmode="decimal" id="admin-stock-price-${i}" value="${Math.round(price)}" style="width:70px">
          <button onclick="Admin.stockSetPrice(${i})">Set</button>
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  },

  // === Player Stock Admin ===
  renderPlayerStockControls() {
    const container = document.getElementById('admin-player-stock-controls');
    if (!container) return;
    // Don't wipe price inputs while admin is typing a custom value
    const focused = document.activeElement;
    if (focused && focused.id && focused.id.startsWith('admin-pstock-price-')) return;
    if (typeof Companies === 'undefined' || !Object.keys(Companies._allPlayerStocks).length) {
      container.innerHTML = '<span style="color:#888;font-size:13px">No player stocks online yet.</span>';
      return;
    }
    let html = '<div class="admin-stock-grid">';
    Object.values(Companies._allPlayerStocks).forEach(s => {
      const sym = s.symbol;
      const price = s.price;
      html += `<div class="admin-stock-row">
        <span class="admin-stock-sym">${sym}</span>
        <span class="admin-stock-price">${App.formatMoney(price)}</span>
        <div class="admin-stock-btns">
          <button class="rig-btn lose" onclick="Admin.playerStockAdjust('${sym}',0.5)">-50%</button>
          <button class="rig-btn lose" onclick="Admin.playerStockAdjust('${sym}',0.8)">-20%</button>
          <button class="rig-btn win" onclick="Admin.playerStockAdjust('${sym}',1.25)">+25%</button>
          <button class="rig-btn win" onclick="Admin.playerStockAdjust('${sym}',2)">+100%</button>
          <button class="rig-btn lose" style="background:#7B0000;border-color:#7B0000;color:#fff" onclick="Admin.playerStockForceBankrupt('${sym}')">Bankrupt</button>
        </div>
        <div class="admin-stock-set">
          <input type="text" inputmode="decimal" id="admin-pstock-price-${sym}" value="${Math.round(price)}" style="width:70px">
          <button onclick="Admin.playerStockSetPrice('${sym}')">Set</button>
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  },

  playerStockAdjust(sym, mult) {
    if (typeof Companies === 'undefined' || !Companies._allPlayerStocks[sym]) return;
    const cmd = { type: 'adjust', sym, mult };
    Companies.applyAdminCommand(cmd);
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushAdminPlayerStockCommand(cmd);
    this.renderPlayerStockControls();
  },

  playerStockSetPrice(sym) {
    const input = document.getElementById('admin-pstock-price-' + sym);
    if (!input) return;
    const val = App.parseAmount(input.value);
    if (isNaN(val) || val < 0.01) return;
    const cmd = { type: 'set', sym, target: val };
    if (typeof Companies !== 'undefined') Companies.applyAdminCommand(cmd);
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushAdminPlayerStockCommand(cmd);
    this.renderPlayerStockControls();
  },

  feedEveryone(value) {
    // Broadcast admin hunger command to all players
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.db.ref('adminHunger').set({ value, ts: Date.now() });
    }
    // Apply locally
    if (typeof Food !== 'undefined') Food.applyAdminHunger(value);
    Toast.show(value >= 50 ? '\u{1F357} Admin: Everyone fed to ' + value + '%!' : '\u26A0\uFE0F Admin: Everyone starved to ' + value + '%!', '#27ae60');
  },

  setHunger() {
    const val = parseInt(document.getElementById('admin-hunger-val')?.value) || 100;
    const clamped = Math.max(0, Math.min(100, val));
    if (typeof Food !== 'undefined') Food.applyAdminHunger(clamped);
  },

  playerStocksBoom() {
    if (typeof Companies === 'undefined') return;
    const cmd = { type: 'boom' };
    Companies.applyAdminCommand(cmd);
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushAdminPlayerStockCommand(cmd);
    const msg = '\u{1F4C8} Player company stocks surging! Investors piling in!';
    if (typeof Stocks !== 'undefined') Stocks._addNews(msg, true);
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushStockNews(msg, true);
  },

  playerStocksCrash() {
    if (typeof Companies === 'undefined') return;
    const cmd = { type: 'crash' };
    Companies.applyAdminCommand(cmd);
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushAdminPlayerStockCommand(cmd);
    const msg = '\u{1F4C9} Player company stocks in freefall! Mass sell-off detected!';
    if (typeof Stocks !== 'undefined') Stocks._addNews(msg, false);
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushStockNews(msg, false);
  },

  playerStockForceBankrupt(sym) {
    if (!confirm(`Force ${sym} into bankruptcy? Owner can bail out or another player can acquire it.`)) return;
    const cmd = { type: 'forceBankrupt', sym };
    if (typeof Companies !== 'undefined') Companies.applyAdminCommand(cmd);
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushAdminPlayerStockCommand(cmd);
    this.renderPlayerStockControls();
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
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushAdminCryptoCommand({ type: 'pump' });
  },

  cryptoDump() {
    if (typeof Crypto === 'undefined') return;
    Crypto.setGradualAll(0.3, 12);
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushAdminCryptoCommand({ type: 'dump' });
  },

  cryptoAdjust(idx, mult) {
    if (typeof Crypto === 'undefined') return;
    const target = Math.max(0.01, Crypto.coinPrices[idx] * mult);
    Crypto.setGradualTarget(idx, target, 10);
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushAdminCryptoCommand({ type: 'adjust', idx, mult });
  },

  cryptoSetPrice(idx) {
    if (typeof Crypto === 'undefined') return;
    const input = document.getElementById('admin-crypto-price-' + idx);
    if (!input) return;
    const val = App.parseAmount(input.value);
    if (isNaN(val) || val < 0.01) return;
    Crypto.setGradualTarget(idx, val, 10);
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushAdminCryptoCommand({ type: 'target', idx, target: val, steps: 10 });
  },

  // === Player Coin Admin ===
  renderPlayerCoinControls() {
    const container = document.getElementById('admin-player-coin-controls');
    if (!container || typeof Crypto === 'undefined') return;
    const focused = document.activeElement;
    if (focused && focused.id && focused.id.startsWith('admin-pcoin-price-')) return;
    const coins = Crypto._getPublicPlayerCoins();
    if (!coins.length) { container.innerHTML = '<div style="color:var(--text-dim);font-size:12px;padding:8px">No public player coins</div>'; return; }
    let html = '<div class="admin-stock-grid">';
    coins.forEach(({ uid, coin }) => {
      const sym = coin.symbol;
      const price = Crypto._playerCoinPrices[sym] || coin.baseValue || 100;
      const safeSym = sym.replace(/'/g, '');
      html += `<div class="admin-stock-row">
        <span class="admin-stock-sym">${coin.emoji || '\u{1FA99}'} ${safeSym}</span>
        <span class="admin-stock-price" style="font-size:11px">${App.formatMoney(price)} <span style="color:var(--text-dim)">${coin.ownerName || ''}</span></span>
        <div class="admin-stock-btns">
          <button class="rig-btn lose" onclick="Admin.playerCoinAdjust('${safeSym}',0.5)">-50%</button>
          <button class="rig-btn lose" onclick="Admin.playerCoinAdjust('${safeSym}',0.8)">-20%</button>
          <button class="rig-btn win" onclick="Admin.playerCoinAdjust('${safeSym}',1.25)">+25%</button>
          <button class="rig-btn win" onclick="Admin.playerCoinAdjust('${safeSym}',2)">+100%</button>
          <button class="rig-btn danger" style="background:#8b0000;color:#fff" onclick="Admin.playerCoinRugPull('${safeSym}')">Rug Pull</button>
          <button class="rig-btn danger" style="background:#3d0000;color:#ff6b6b;border:1px solid #8b0000" onclick="Admin.playerCoinDelete('${safeSym}')">\u{1F5D1}\uFE0F Delete</button>
        </div>
        <div class="admin-stock-set">
          <input type="text" inputmode="decimal" id="admin-pcoin-price-${safeSym}" value="${price.toFixed(4)}" style="width:80px">
          <button onclick="Admin.playerCoinSetPrice('${safeSym}')">Set</button>
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  },

  playerCoinAdjust(sym, mult) {
    if (typeof Crypto === 'undefined') return;
    const cmd = { type: 'pcoin-adjust', sym, mult };
    Crypto.applyPlayerCoinAdminCommand(cmd);
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushAdminCoinCommand(cmd);
    this.renderPlayerCoinControls();
  },

  playerCoinSetPrice(sym) {
    const input = document.getElementById('admin-pcoin-price-' + sym);
    if (!input) return;
    const val = App.parseAmount(input.value);
    if (isNaN(val) || val < 0.0001) return;
    const cmd = { type: 'pcoin-set', sym, target: val };
    if (typeof Crypto !== 'undefined') Crypto.applyPlayerCoinAdminCommand(cmd);
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushAdminCoinCommand(cmd);
    this.renderPlayerCoinControls();
  },

  playerCoinRugPull(sym) {
    if (!confirm(`Rug pull ${sym}? This crashes the price to $0.0001 and delists the coin.`)) return;
    const cmd = { type: 'pcoin-rugPull', sym };
    if (typeof Crypto !== 'undefined') Crypto.applyPlayerCoinAdminCommand(cmd);
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushAdminCoinCommand(cmd);
    Toast.show(`\u{1F4A5} Rug pull executed on ${sym}!`, '#c0392b', 4000);
    this.renderPlayerCoinControls();
  },

  playerCoinDelete(sym) {
    if (!confirm(`Permanently DELETE coin ${sym}?\n\nThis removes it from the game entirely. Cannot be undone.`)) return;
    const uid = typeof Crypto !== 'undefined' ? Crypto._getPlayerCoinUidBySym(sym) : null;
    if (!uid && typeof Crypto !== 'undefined') {
      Toast.show('Coin not found in registry', '#ff5252'); return;
    }
    const cmd = { type: 'pcoin-delete', sym, ownerUid: uid };
    if (typeof Crypto !== 'undefined') Crypto.applyPlayerCoinAdminCommand(cmd);
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.pushAdminCoinCommand(cmd);
      if (uid) Firebase.removePlayerCoin(uid);
    }
    Toast.show(`\u{1F5D1}\uFE0F Coin ${sym} deleted.`, '#c0392b', 4000);
    this.renderPlayerCoinControls();
  },

  // === Player Bank Admin ===
  renderBankControls() {
    const container = document.getElementById('admin-bank-controls');
    if (!container) return;
    if (typeof Banking === 'undefined' || !Object.keys(Banking._banks).length) {
      container.innerHTML = '<span style="color:#888;font-size:13px">No active player banks.</span>';
      return;
    }

    const banks = Object.entries(Banking._banks);

    // Fast path: same banks already rendered — update stress in-place (CSS transition animates it)
    const existingRows = container.querySelectorAll('[data-admin-bank-uid]');
    const existingUids = new Set([...existingRows].map(el => el.dataset.adminBankUid));
    const newUids = new Set(banks.map(([uid]) => uid));
    const sameSet = existingUids.size === newUids.size && [...newUids].every(u => existingUids.has(u));

    if (sameSet && existingRows.length > 0) {
      banks.forEach(([ownerUid, bank]) => {
        const stress = bank.stressLevel || 0;
        const color = stress >= 70 ? '#e74c3c' : stress >= 40 ? '#f39c12' : '#27ae60';
        const fill = container.querySelector(`[data-admin-bank-uid="${ownerUid}"] .admin-bank-fill`);
        const label = container.querySelector(`[data-admin-bank-uid="${ownerUid}"] .admin-bank-label`);
        if (fill) { fill.style.width = stress + '%'; fill.style.background = color; }
        if (label) { label.style.color = color; label.textContent = stress + '%'; }
      });
      return;
    }

    let html = '<div class="admin-stock-grid">';
    banks.forEach(([ownerUid, bank]) => {
      const stress = bank.stressLevel || 0;
      const stressColor = stress >= 70 ? '#e74c3c' : stress >= 40 ? '#f39c12' : '#27ae60';
      const safeName = (bank.ownerName || 'Unknown').replace(/'/g, '');
      html += `<div class="admin-stock-row" data-admin-bank-uid="${ownerUid}" style="flex-wrap:wrap;gap:4px">
        <div style="display:flex;align-items:center;gap:8px;width:100%;margin-bottom:4px">
          <span class="admin-stock-sym" style="font-size:12px">🏦 ${safeName}</span>
          <span style="font-size:11px;color:var(--text-dim)">${bank.companyTicker || ''}</span>
          <div style="flex:1;height:8px;background:var(--bg3);border-radius:4px;overflow:hidden;min-width:60px">
            <div class="admin-bank-fill bank-stress-fill" style="--stress-w:${stress}%;background:${stressColor}"></div>
          </div>
          <span class="admin-bank-label" style="font-size:12px;color:${stressColor};font-weight:700">${stress}%</span>
        </div>
        <div class="admin-stock-btns">
          <button class="rig-btn win" onclick="Admin.adminBankStress('${ownerUid}', -20)">-20 Stress</button>
          <button class="rig-btn win" onclick="Admin.adminBankStress('${ownerUid}', -100)">Zero Stress</button>
          <button class="rig-btn lose" onclick="Admin.adminBankStress('${ownerUid}', 20)">+20 Stress</button>
          <button class="rig-btn lose" onclick="Admin.adminBankStress('${ownerUid}', 100)">Max Stress</button>
          <button class="rig-btn lose" style="background:#7B0000;border-color:#7B0000;color:#fff" onclick="Admin.adminForceCloseBank('${ownerUid}')">Force Close</button>
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  },

  adminBankStress(ownerUid, delta) {
    if (typeof Banking === 'undefined' || !Firebase || !Firebase.isOnline()) return;
    const bank = Banking._banks[ownerUid];
    if (!bank) return;
    const newStress = Math.max(0, Math.min(100, (bank.stressLevel || 0) + delta));
    // Just update the value — no auto-bankruptcy; use Force Close for that
    Firebase.updateBank(ownerUid, { stressLevel: newStress });
  },

  adminForceCloseBank(ownerUid) {
    if (!confirm('Force close this bank? All depositors lose everything.')) return;
    if (typeof Banking !== 'undefined') Banking.bankruptBank(ownerUid, 'Admin force close');
    setTimeout(() => this.renderBankControls(), 1000);
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
          <input type="text" inputmode="decimal" id="admin-crypto-price-${i}" value="${price.toFixed(2)}" style="width:80px">
          <button onclick="Admin.cryptoSetPrice(${i})">Set</button>
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  },

  cryptoGiveCoins() {
    if (typeof Crypto === 'undefined') return;
    Crypto.wallet.BTC = (Crypto.wallet.BTC || 0) + 10;
    Crypto.wallet.ETH = (Crypto.wallet.ETH || 0) + 100;
    Crypto.wallet.DOGE = (Crypto.wallet.DOGE || 0) + 100000;
    Crypto.wallet.SOL = (Crypto.wallet.SOL || 0) + 50;
    Crypto.wallet.XRP = (Crypto.wallet.XRP || 0) + 10000;
    Crypto.wallet.PEPE = (Crypto.wallet.PEPE || 0) + 1000000000;
    Crypto.wallet.LINK = (Crypto.wallet.LINK || 0) + 500;
    Crypto.wallet.ADA = (Crypto.wallet.ADA || 0) + 5000;
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
    const emptyW = {};
    Crypto.coins.forEach(c => { emptyW[c.symbol] = 0; });
    Crypto.wallet = { ...emptyW };
    Crypto.totalMined = { ...emptyW };
    Crypto.rigOwned = Crypto.rigs.map(() => false);
    Crypto.rigLevels = Crypto.rigs.map(() => 0);
    Crypto.rigTargetCoins = Crypto.rigs.map((r, i) => Crypto.coins.findIndex(c => c.symbol === r.coin));
    Crypto.upgrades = { cpu: 0, gpu: 0, overclock: 0 };
    Crypto.cooling = Crypto.coolingUpgrades.map(() => false);
    Crypto.heat = 0;
    if (App.currentScreen === 'crypto') Crypto.render();
  },

  cryptoPumpPrices() {
    if (typeof Crypto === 'undefined') return;
    Crypto.setGradualAll(3, 12);
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushAdminCryptoCommand({ type: 'pump' });
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
  },

  // === Leaderboard Admin ===
  renderAdminLeaderboard() {
    const container = document.getElementById('admin-lb-list');
    if (!container) return;
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) {
      container.innerHTML = '<span style="color:#888">Offline</span>';
      return;
    }
    const data = Firebase.leaderboardData || [];
    if (data.length === 0) {
      container.innerHTML = '<span style="color:#888">No players</span>';
      return;
    }
    container.innerHTML = data.map(e =>
      `<div class="admin-lb-row">
        <span class="admin-lb-name">${e.name || 'Player'} <span class="admin-lb-uid">(${(e.uid || '').slice(0,6)})</span></span>
        <span class="admin-lb-earned">${App.formatMoney(e.totalEarned || 0)}</span>
        <button class="admin-btn danger admin-lb-del" onclick="Admin.deleteLeaderboardEntry('${e.uid}')" title="Remove from leaderboard only">LB</button>
        <button class="admin-btn danger admin-lb-del" onclick="Admin.purgePlayer('${e.uid}','${(e.name||'Player').replace(/'/g,"\\'")}')" title="Delete all player data">Purge</button>
      </div>`
    ).join('');
  },

  deleteLeaderboardEntry(uid) {
    if (!uid) return;
    if (!confirm('Delete leaderboard entry for ' + uid.slice(0,6) + '?')) return;
    if (typeof Firebase === 'undefined' || !Firebase.db) return;
    Firebase.db.ref('leaderboard/' + uid).remove().then(() => {
      Firebase.leaderboardData = Firebase.leaderboardData.filter(e => e.uid !== uid);
      this.renderAdminLeaderboard();
      if (App.currentScreen === 'leaderboard') Firebase.renderLeaderboard();
    }).catch(err => alert('Delete failed: ' + err.message));
  },

  refreshLeaderboard() {
    if (typeof Firebase !== 'undefined') Firebase.renderLeaderboard();
    this.renderAdminLeaderboard();
  },

  purgePlayer(uid, name) {
    if (!confirm(`Purge ALL data for "${name}" (${uid.slice(0,6)})?\n\nThis removes their leaderboard entry, cloud save, companies, and account. Cannot be undone.`)) return;
    if (typeof Firebase === 'undefined' || !Firebase.db) return;
    Firebase.deletePlayerData(uid).then(() => {
      Firebase.leaderboardData = Firebase.leaderboardData.filter(e => e.uid !== uid);
      this.renderAdminLeaderboard();
      if (App.currentScreen === 'leaderboard') Firebase.renderLeaderboard();
      alert('Player data purged.');
    }).catch(err => alert('Purge failed: ' + err.message));
  },

  // === ADMIN MANAGEMENT ===
  onAdminsUpdate(data) {
    this._adminsList = data || {};
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    // Auto-enable admin mode if this player was granted admin via Firebase
    if (myUid && this._adminsList[myUid] && !this.adminMode) {
      this.adminMode = true;
      this.showGameAdmins();
      if (!this.badgeHidden) {
        document.getElementById('admin-indicator')?.classList.remove('hidden');
      }
    }
    // Re-render the admins section if the data tab is open
    if (this.activeTab === 'data') this.renderAdminsSection();
  },

  renderAdminsSection() {
    const container = document.getElementById('admin-admins-list');
    if (!container) return;
    const isSuperAdmin = typeof Settings !== 'undefined' && Settings.profile.name === this.adminName;
    const players = (typeof Firebase !== 'undefined' && Firebase.leaderboardData) || [];
    const admins = this._adminsList;

    // Dropdown: players NOT already admins
    const eligiblePlayers = players.filter(p => p.uid && !admins[p.uid]);
    const dropdownOpts = eligiblePlayers.length
      ? eligiblePlayers.map(p => `<option value="${p.uid}">${p.name || 'Player'} (${p.uid.slice(0,6)})</option>`).join('')
      : '<option value="">No eligible players</option>';

    let html = '';
    if (isSuperAdmin) {
      html += `<div style="display:flex;gap:6px;margin-bottom:10px">
        <select id="admin-grant-select" style="flex:1;padding:6px;background:var(--bg);color:var(--text);border:1px solid var(--bg3);border-radius:6px;font-size:13px">
          ${dropdownOpts}
        </select>
        <button class="admin-btn win-btn" onclick="Admin.grantAdminToSelected()" style="white-space:nowrap">Grant Admin</button>
      </div>`;
    }

    const adminEntries = Object.entries(admins);
    if (adminEntries.length === 0) {
      html += '<div style="font-size:12px;color:var(--text-dim)">No granted admins.</div>';
    } else {
      html += adminEntries.map(([uid, info]) =>
        `<div class="admin-lb-row">
          <span class="admin-lb-name">${info.name || 'Player'} <span class="admin-lb-uid">(${uid.slice(0,6)})</span></span>
          <span style="font-size:11px;color:var(--text-dim)">${new Date(info.grantedAt || 0).toLocaleDateString()}</span>
          ${isSuperAdmin ? `<button class="admin-btn danger admin-lb-del" onclick="Admin.revokeAdmin('${uid}','${(info.name||'').replace(/'/g,"\\'")}')">Revoke</button>` : ''}
        </div>`
      ).join('');
    }

    container.innerHTML = html;
  },

  grantAdminToSelected() {
    const sel = document.getElementById('admin-grant-select');
    if (!sel || !sel.value) return;
    const uid = sel.value;
    const player = (Firebase.leaderboardData || []).find(p => p.uid === uid);
    if (!player) return;
    if (!confirm(`Grant admin to ${player.name || uid.slice(0,6)}?`)) return;
    Firebase.grantAdmin(uid, player.name || 'Player');
  },

  revokeAdmin(uid, name) {
    if (!confirm(`Revoke admin from ${name || uid.slice(0,6)}?`)) return;
    Firebase.revokeAdmin(uid);
  },

  // === CHANGE COMPANY PERSONALITY ===
  renderPersonalitySection() {
    const container = document.getElementById('admin-personality-section');
    if (!container) return;
    const stocks = typeof Companies !== 'undefined' ? Companies._allPlayerStocks : {};
    const companies = new Map();
    for (const sym in stocks) {
      const s = stocks[sym];
      if (s.companyTicker && !companies.has(s.companyTicker)) {
        companies.set(s.companyTicker, {
          ticker: s.companyTicker,
          name: s.companyName || s.companyTicker,
          ownerUid: s.ownerUid,
          ownerName: s.ownerName || 'Unknown',
          personality: s.companyPersonality || 'standard',
        });
      }
    }
    if (!companies.size) {
      container.innerHTML = '<div style="font-size:12px;color:var(--text-dim)">No player companies found.</div>';
      return;
    }
    const opts = [...companies.values()].map(c =>
      `<option value="${c.ticker}|${c.ownerUid}">[${c.ticker}] ${c.name} — ${c.ownerName} (${c.personality})</option>`
    ).join('');
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:6px">
        <select id="admin-personality-company" style="padding:6px;background:var(--bg);color:var(--text);border:1px solid var(--bg3);border-radius:6px;font-size:13px">${opts}</select>
        <div style="display:flex;gap:6px">
          <select id="admin-personality-value" style="flex:1;padding:6px;background:var(--bg);color:var(--text);border:1px solid var(--bg3);border-radius:6px;font-size:13px">
            <option value="standard">📊 Standard</option>
            <option value="extreme">🌋 Extreme</option>
            <option value="penny">🪙 Penny</option>
          </select>
          <button class="admin-btn win-btn" onclick="Admin.changeCompanyPersonality()" style="white-space:nowrap">Apply</button>
        </div>
      </div>`;
  },

  changeCompanyPersonality() {
    const compSel = document.getElementById('admin-personality-company');
    const pSel = document.getElementById('admin-personality-value');
    if (!compSel || !pSel || !compSel.value) return;
    const [ticker, ownerUid] = compSel.value.split('|');
    const newPersonality = pSel.value;
    if (!confirm(`Change [${ticker}] personality to ${newPersonality}?`)) return;
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) return;
    const PD = { standard: { basePrice: 100, vol: 0.05 }, extreme: { basePrice: 100, vol: 0.18 }, penny: { basePrice: 0.50, vol: 0.25 } };
    const pd = PD[newPersonality] || PD.standard;
    const cmd = { type: 'personality', ticker, ownerUid, personality: newPersonality, vol: pd.vol, basePrice: pd.basePrice };
    Firebase.adminSetCompanyPersonality(ownerUid, ticker, newPersonality).then(() => {
      // Broadcast so the owner's client updates _companies (prevents _pushToFirebase from reverting the change)
      if (typeof Companies !== 'undefined') Companies.applyAdminCommand(cmd);
      Firebase.pushAdminPlayerStockCommand(cmd);
      this.renderPersonalitySection();
      this.renderPlayerStockControls();
    });
  },

  // === REMOVE PLAYER STOCK ===
  renderPlayerStockRemoveSection() {
    const container = document.getElementById('admin-remove-stock-list');
    if (!container) return;
    const stocks = typeof Companies !== 'undefined' ? Companies._allPlayerStocks : {};
    const entries = Object.values(stocks);
    if (!entries.length) {
      container.innerHTML = '<div style="font-size:12px;color:var(--text-dim)">No player stocks found.</div>';
      return;
    }
    const opts = entries.map(s =>
      `<option value="${s.symbol}|${s.ownerUid}">${s.symbol} — ${s.companyName || ''} (${s.ownerName || 'Unknown'})</option>`
    ).join('');
    container.innerHTML = `
      <div style="display:flex;gap:6px">
        <select id="admin-remove-stock-select" style="flex:1;padding:6px;background:var(--bg);color:var(--text);border:1px solid var(--bg3);border-radius:6px;font-size:13px">
          ${opts}
        </select>
        <button class="admin-btn danger" onclick="Admin.removePlayerStock()" style="white-space:nowrap">Remove</button>
      </div>`;
  },

  removePlayerStock() {
    const sel = document.getElementById('admin-remove-stock-select');
    if (!sel || !sel.value) return;
    const [sym, ownerUid] = sel.value.split('|');
    const s = typeof Companies !== 'undefined' && Companies._allPlayerStocks[sym];
    const label = s ? `${sym} (${s.companyName || ''} by ${s.ownerName || 'Unknown'})` : sym;
    if (!confirm(`Force-remove stock ${label}?\n\nThis will delist it immediately with no refund.`)) return;
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) return;
    Firebase.adminRemoveStock(sym, ownerUid).then(() => {
      this.renderPlayerStockRemoveSection();
      if (typeof Admin !== 'undefined' && Admin.activeTab === 'market') Admin.renderPlayerStockControls();
    });
  },

  cleanDuplicateNames() {
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) return;
    if (!confirm('Remove lower-score duplicates by name?')) return;
    const data = Firebase.leaderboardData || [];
    const byName = {};
    data.forEach(e => {
      const key = (e.name || '').toLowerCase();
      if (!byName[key] || (e.totalEarned || 0) > (byName[key].totalEarned || 0)) {
        byName[key] = e;
      }
    });
    const toKeep = new Set(Object.values(byName).map(e => e.uid));
    const toDelete = data.filter(e => !toKeep.has(e.uid));
    if (toDelete.length === 0) { alert('No duplicates found.'); return; }
    toDelete.forEach(e => {
      Firebase.db.ref('leaderboard/' + e.uid).remove();
    });
    Firebase.leaderboardData = data.filter(e => toKeep.has(e.uid));
    this.renderAdminLeaderboard();
    if (App.currentScreen === 'leaderboard') Firebase.renderLeaderboard();
    alert('Removed ' + toDelete.length + ' duplicate(s).');
  },
};

// Console backdoor: type console.log(1984) in DevTools to unlock admin
(function() {
  const _origLog = console.log;
  console.log = function(...args) {
    _origLog.apply(console, args);
    if (args.some(a => String(a) === '1984')) Admin._consoleUnlock();
  };
})();
