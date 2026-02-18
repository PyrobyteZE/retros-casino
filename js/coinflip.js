const CoinFlip = {
  flipping: false,
  history: [],

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

  getBet() { return Math.max(0.01, Math.round((Number(document.getElementById('cf-bet').value) || 0) * 100) / 100); },
  halfBet() { document.getElementById('cf-bet').value = Math.max(0.01, Math.round(this.getBet() / 2 * 100) / 100); },
  doubleBet() { document.getElementById('cf-bet').value = this.getBet() * 2; },
  maxBet() { document.getElementById('cf-bet').value = Math.floor(App.balance * 100) / 100; },

  init() {
    this.luckLevel = App.upgrades.coinLuck || 0;
    this.updateLuckUI();
    this.renderHistory();
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
      // Use lucky coin chance
      const winChance = this.getWinChance() / 100;
      result = Math.random() < winChance ? choice : (choice === 'heads' ? 'tails' : 'heads');
    }
    const won = choice === result;

    coin.classList.add('flipping');
    coin.textContent = '?';
    this.showResult('', '');

    setTimeout(() => {
      coin.classList.remove('flipping');
      coin.textContent = result === 'heads' ? 'H' : 'T';

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
    const edge = ((1 - ev) * 100).toFixed(1);
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
    el.textContent = text;
    el.className = 'game-result ' + cls;
  }
};
