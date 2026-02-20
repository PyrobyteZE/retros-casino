const CoinFlip = {
  flipping: false,
  history: [],
  activeTab: 'solo',
  pvpFlips: [],
  _pvpChoice: 'heads',

  // Lucky Coin tiers - slight edge boosts, expensive
  luckTiers: [
    { name: 'Fair Coin',     chance: 50,   cost: 0,      payout: 2.0 },
    { name: 'Worn Coin',     chance: 51,   cost: 500,    payout: 1.98 },
    { name: 'Bent Coin',     chance: 52.5, cost: 2500,   payout: 1.95 },
    { name: 'Weighted Coin', chance: 54,   cost: 15000,  payout: 1.92 },
    { name: 'Lucky Coin',    chance: 56,   cost: 100000, payout: 1.88 },
    { name: 'Magic Coin',    chance: 58,   cost: 750000, payout: 1.83 },
    { name: 'Rigged Coin',   chance: 60,   cost: 5000000,payout: 1.78 },
  ],
  luckLevel: 0, // saved in App

  getBet() { return Math.max(0.01, Math.round((Number(document.getElementById('cf-bet')?.value) || 0) * 100) / 100); },
  halfBet() { const el = document.getElementById('cf-bet'); if (el) el.value = Math.max(0.01, Math.round(this.getBet() / 2 * 100) / 100); },
  doubleBet() { const el = document.getElementById('cf-bet'); if (el) el.value = this.getBet() * 2; },
  maxBet() { const el = document.getElementById('cf-bet'); if (el) el.value = Math.floor(App.balance * 100) / 100; },

  init() {
    this.luckLevel = App.upgrades.coinLuck || 0;
    this.render();
  },

  // === Tab System ===
  setTab(tab) {
    this.activeTab = tab;
    this.render();
  },

  render() {
    const container = document.getElementById('cf-content');
    if (!container) return;

    // Update tab buttons
    document.querySelectorAll('.cf-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === this.activeTab);
    });

    if (this.activeTab === 'solo') this._renderSolo(container);
    else if (this.activeTab === 'pvp') this._renderPvp(container);
  },

  _renderSolo(container) {
    container.innerHTML = `
      <div class="game-container">
        <div class="game-hud">
          <div class="hud-item"><span class="hud-label">House Edge</span><span id="cf-house-edge">0%</span></div>
          <div class="hud-item"><span class="hud-label">W/L</span><span id="cf-record">0/0</span></div>
          <div class="hud-item"><span class="hud-label">Profit</span><span id="cf-profit">$0</span></div>
        </div>
        <div id="cf-history" class="cf-history"></div>
        <div id="cf-result" class="game-result"></div>
        <div id="cf-coin" class="coin">?</div>
        <div class="cf-luck-panel">
          <div id="cf-luck-locked" class="cf-luck-locked">Requires VIP 5</div>
          <div class="cf-luck-info">
            <span class="cf-luck-label" id="cf-luck-name">Fair Coin</span>
            <span class="cf-luck-stat">Win: <strong id="cf-luck-chance">50%</strong></span>
            <span class="cf-luck-stat">Pay: <strong id="cf-luck-payout">2.0x</strong></span>
          </div>
          <button class="cf-luck-btn" id="cf-luck-btn" onclick="CoinFlip.buyLuck()">Upgrade: $500</button>
        </div>
        <div class="bet-controls">
          <label>Bet: $<input type="number" id="cf-bet" value="10" min="0.01" step="0.01"></label>
          <div class="bet-buttons">
            <button onclick="CoinFlip.halfBet()">1/2</button>
            <button onclick="CoinFlip.doubleBet()">2x</button>
            <button onclick="CoinFlip.maxBet()">Max</button>
          </div>
        </div>
        <div class="game-actions">
          <button class="game-btn heads" onclick="CoinFlip.flip('heads')">Heads</button>
          <button class="game-btn tails" onclick="CoinFlip.flip('tails')">Tails</button>
        </div>
        <div class="game-admin hidden" id="cf-admin">
          <div class="game-admin-header" onclick="Admin.toggleGamePanel('cf-admin')">
            <span>Admin Controls</span><span class="game-admin-arrow">&#x25BC;</span>
          </div>
          <div class="game-admin-body">
            <div class="admin-row">
              <label>Force Result:</label>
              <button class="rig-btn win" onclick="Rig.games.coinflip.forceResult='heads';Admin.refreshGameRig()">Heads</button>
              <button class="rig-btn lose" onclick="Rig.games.coinflip.forceResult='tails';Admin.refreshGameRig()">Tails</button>
              <button class="rig-btn" onclick="Rig.games.coinflip.forceResult=null;Admin.refreshGameRig()">Off</button>
            </div>
            <div class="admin-row">
              <label>Win Streak:</label>
              <input type="number" id="cf-rig-streak" min="0" value="0" onchange="Rig.games.coinflip.winStreak=+this.value">
              <span class="rig-hint">Next N auto-win</span>
            </div>
          </div>
        </div>
      </div>`;

    // Restore admin visibility
    if (typeof Admin !== 'undefined' && Admin.adminMode) {
      const cfAdmin = document.getElementById('cf-admin');
      if (cfAdmin) cfAdmin.classList.remove('hidden');
    }

    this.updateLuckUI();
    this.renderHistory();
    GameStats.updateHUD('coinflip');
  },

  _renderPvp(container) {
    const isOnline = typeof Firebase !== 'undefined' && Firebase.isOnline();
    const mySession = typeof Firebase !== 'undefined' ? Firebase._sessionId : null;

    if (!isOnline) {
      container.innerHTML = '<div class="pvp-empty">Connect to Firebase to play PvP coin flips!</div>';
      return;
    }

    const selectedH = this._pvpChoice === 'heads' ? 'pvp-choice-selected' : '';
    const selectedT = this._pvpChoice === 'tails' ? 'pvp-choice-selected' : '';

    let html = `
      <div class="pvp-create-section">
        <h3>Create Coin Flip</h3>
        <div class="pvp-create-row">
          <span style="font-size:13px;color:var(--text-dim)">Bet: $</span>
          <input type="number" id="pvp-amount" value="100" min="1" step="1">
        </div>
        <div class="pvp-create-row">
          <span style="font-size:13px;color:var(--text-dim)">Your call:</span>
          <button class="pvp-choice-btn ${selectedH}" onclick="CoinFlip._selectChoice('heads')">Heads</button>
          <button class="pvp-choice-btn ${selectedT}" onclick="CoinFlip._selectChoice('tails')">Tails</button>
        </div>
        <button class="pvp-create-btn" onclick="CoinFlip._createPvpFlip()">Create Flip</button>
      </div>`;

    // Your pending flips
    const myPending = this.pvpFlips.filter(f => f.status === 'open' && f.creatorSessionId === mySession);
    html += '<div class="pvp-section-title">Your Pending Flips</div>';
    if (myPending.length === 0) {
      html += '<div class="pvp-empty">No pending flips</div>';
    } else {
      myPending.forEach(f => {
        html += `<div class="pvp-flip-card">
          <div class="pvp-flip-avatar">${f.creatorAvatar || '\u{1FA99}'}</div>
          <div class="pvp-flip-info">
            <div class="pvp-flip-name">You picked ${f.creatorChoice}</div>
            <div class="pvp-flip-details">Waiting for opponent...</div>
          </div>
          <div class="pvp-flip-amount">${App.formatMoney(f.amount)}</div>
          <div class="pvp-flip-actions">
            <button class="pvp-cancel-btn" onclick="CoinFlip._cancelPvpFlip('${f.id}',${f.amount})">Cancel</button>
          </div>
        </div>`;
      });
    }

    // Open challenges from others
    const openFlips = this.pvpFlips.filter(f => f.status === 'open' && f.creatorSessionId !== mySession);
    html += '<div class="pvp-section-title">Open Challenges</div>';
    if (openFlips.length === 0) {
      html += '<div class="pvp-empty">No open challenges</div>';
    } else {
      openFlips.forEach(f => {
        html += `<div class="pvp-flip-card">
          <div class="pvp-flip-avatar">${f.creatorAvatar || '\u{1FA99}'}</div>
          <div class="pvp-flip-info">
            <div class="pvp-flip-name">${this._escapeHtml(f.creatorName || 'Player')}</div>
            <div class="pvp-flip-details">Called ${f.creatorChoice}</div>
          </div>
          <div class="pvp-flip-amount">${App.formatMoney(f.amount)}</div>
          <div class="pvp-flip-actions">
            <button class="pvp-accept-btn" onclick="CoinFlip._acceptPvpFlip('${f.id}')" ${App.balance >= f.amount ? '' : 'disabled'}>Accept</button>
          </div>
        </div>`;
      });
    }

    // Recent results
    const results = this.pvpFlips.filter(f => f.status === 'complete').slice(0, 10);
    html += '<div class="pvp-section-title">Recent Results</div>';
    if (results.length === 0) {
      html += '<div class="pvp-empty">No completed flips yet</div>';
    } else {
      results.forEach(f => {
        const coinLetter = f.coinResult === 'heads' ? 'H' : 'T';
        html += `<div class="pvp-result-card">
          <div class="pvp-result-coin">${coinLetter}</div>
          <div style="flex:1">
            <span class="pvp-winner">${this._escapeHtml(f.winnerName || 'Winner')}</span>
            <span style="color:var(--text-dim)"> beat </span>
            <span class="pvp-loser">${this._escapeHtml(f.loserName || 'Loser')}</span>
          </div>
          <div style="color:var(--gold);font-weight:700">${App.formatMoney(f.amount * 2)}</div>
        </div>`;
      });
    }

    container.innerHTML = html;
  },

  _selectChoice(choice) {
    this._pvpChoice = choice;
    document.querySelectorAll('.pvp-choice-btn').forEach(btn => {
      btn.classList.toggle('pvp-choice-selected', btn.textContent.toLowerCase() === choice);
    });
  },

  _createPvpFlip() {
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) return;
    const input = document.getElementById('pvp-amount');
    const amount = Math.max(1, Math.round(Number(input?.value) || 0));
    if (amount > App.balance) {
      alert('Not enough money!');
      return;
    }
    App.addBalance(-amount);
    Firebase.createPvpFlip(amount, this._pvpChoice);
  },

  _acceptPvpFlip(flipId) {
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) return;
    const flip = this.pvpFlips.find(f => f.id === flipId);
    if (!flip || flip.status !== 'open') return;
    if (App.balance < flip.amount) {
      alert('Not enough money!');
      return;
    }
    App.addBalance(-flip.amount);
    Firebase.acceptPvpFlip(flipId, flip);
  },

  _cancelPvpFlip(flipId, amount) {
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) return;
    Firebase.cancelPvpFlip(flipId, amount);
  },

  updateFromPvpFlips(flips) {
    this.pvpFlips = flips;
    if (App.currentScreen === 'coinflip' && this.activeTab === 'pvp') {
      this.render();
    }
  },

  getCurrentTier() {
    return this.luckTiers[Math.min(this.luckLevel, this.luckTiers.length - 1)];
  },

  getWinChance() {
    let chance = this.getCurrentTier().chance;
    if (typeof Pets !== 'undefined') chance = Math.min(75, chance + Pets.getBoosts().luckAdd);
    return chance;
  },

  getPayout() {
    return this.getCurrentTier().payout;
  },

  flip(choice) {
    if (this.flipping) return;
    const bet = this.getBet();
    if (bet > App.balance && !Admin.godMode) {
      this.showResult('Not enough money!', 'lose');
      return;
    }

    this.flipping = true;
    if (!Admin.godMode) App.addBalance(-bet);

    const coin = document.getElementById('cf-coin');
    const g = Rig.games.coinflip;

    // Determine result
    let result;
    if (g.winStreak > 0) {
      result = choice;
      g.winStreak--;
      const streakInput = document.getElementById('cf-rig-streak');
      if (streakInput) streakInput.value = g.winStreak;
    } else if (g.forceResult) {
      result = g.forceResult;
    } else if (Rig.enabled) {
      const shouldWin = Rig.shouldWin();
      result = shouldWin ? choice : (choice === 'heads' ? 'tails' : 'heads');
    } else {
      // Use lucky coin chance (rigged coin adds +5%)
      let winChance = this.getWinChance() / 100;
      if (typeof Loans !== 'undefined' && Loans.useRiggedDeck('coinflip')) {
        winChance = Math.min(0.95, winChance + 0.05);
      }
      result = Math.random() < winChance ? choice : (choice === 'heads' ? 'tails' : 'heads');
    }
    const won = choice === result;

    if (coin) {
      coin.classList.add('flipping');
      coin.textContent = '?';
    }
    this.showResult('', '');

    setTimeout(() => {
      if (coin) {
        coin.classList.remove('flipping');
        coin.textContent = result === 'heads' ? 'H' : 'T';
      }

      if (won) {
        const payout = this.getPayout();
        const winnings = Math.round(bet * payout * 100) / 100;
        App.addBalance(winnings);
        this.showResult('Won ' + App.formatMoney(winnings) + '!', 'win');
        GameStats.record('coinflip', 'win', winnings - bet);
        this.addHistory(result, true, winnings - bet);
        // Easter egg: track win streak
        this._cfWinStreak = (this._cfWinStreak || 0) + 1;
        if (typeof Pets !== 'undefined') Pets.checkEasterEgg('cf_win_streak', this._cfWinStreak);
      } else {
        this.showResult('Lost ' + App.formatMoney(bet), 'lose');
        GameStats.record('coinflip', 'lose', bet);
        this.addHistory(result, false, bet);
        this._cfWinStreak = 0;
        if (typeof Pets !== 'undefined') {
          Pets.checkEasterEgg('cf_streak_reset');
          Pets.checkEasterEgg('money_lost', bet);
        }
      }
      this.flipping = false;
    }, 600);
  },

  // === HISTORY ===
  addHistory(result, won, amount) {
    this.history.unshift({ result, won, amount });
    if (this.history.length > 30) this.history.length = 30;
    this.renderHistory();
  },

  renderHistory() {
    const el = document.getElementById('cf-history');
    if (!el) return;
    if (this.history.length === 0) {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = this.history.slice(0, 20).map(h => {
      const letter = h.result === 'heads' ? 'H' : 'T';
      const cls = h.won ? 'cf-h-win' : 'cf-h-lose';
      return `<span class="${cls}">${letter}</span>`;
    }).join('');
  },

  // === LUCKY COIN UPGRADES ===
  isUnlocked() {
    return App.rebirth >= 5 || (typeof Admin !== 'undefined' && Admin.godMode);
  },

  buyLuck() {
    if (!this.isUnlocked()) return;

    const nextLevel = this.luckLevel + 1;
    if (nextLevel >= this.luckTiers.length) return; // maxed

    const tier = this.luckTiers[nextLevel];
    if (App.balance < tier.cost) {
      this.showResult('Need ' + App.formatMoney(tier.cost) + '!', 'lose');
      return;
    }

    App.addBalance(-tier.cost);
    this.luckLevel = nextLevel;
    App.upgrades.coinLuck = this.luckLevel;
    App.save();
    this.updateLuckUI();
  },

  updateLuckUI() {
    const tier = this.getCurrentTier();
    const nameEl = document.getElementById('cf-luck-name');
    const chanceEl = document.getElementById('cf-luck-chance');
    const payoutEl = document.getElementById('cf-luck-payout');
    const btnEl = document.getElementById('cf-luck-btn');
    const edgeEl = document.getElementById('cf-house-edge');
    const lockEl = document.getElementById('cf-luck-locked');

    // Handle lock overlay
    if (lockEl) {
      lockEl.classList.toggle('hidden', this.isUnlocked());
    }

    if (nameEl) nameEl.textContent = tier.name;
    if (chanceEl) chanceEl.textContent = tier.chance + '%';
    if (payoutEl) payoutEl.textContent = tier.payout + 'x';

    // House edge display: EV = chance * payout - 1
    const ev = (tier.chance / 100) * tier.payout;
    if (edgeEl) edgeEl.textContent = (ev >= 1 ? '+' : '') + ((ev - 1) * 100).toFixed(1) + '%';

    if (btnEl) {
      if (!this.isUnlocked()) {
        btnEl.textContent = 'Locked';
        btnEl.disabled = true;
        btnEl.classList.remove('cf-luck-maxed', 'affordable');
      } else {
        const nextLevel = this.luckLevel + 1;
        if (nextLevel >= this.luckTiers.length) {
          btnEl.textContent = 'MAXED';
          btnEl.disabled = true;
          btnEl.classList.add('cf-luck-maxed');
        } else {
          const next = this.luckTiers[nextLevel];
          btnEl.textContent = 'Upgrade: ' + App.formatMoney(next.cost);
          btnEl.disabled = false;
          btnEl.classList.remove('cf-luck-maxed');
          btnEl.classList.toggle('affordable', App.balance >= next.cost);
        }
      }
    }
  },

  showResult(text, cls) {
    const el = document.getElementById('cf-result');
    if (!el) return;
    el.textContent = text;
    el.className = 'game-result ' + cls;
  },

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
