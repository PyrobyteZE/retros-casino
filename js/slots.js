const Slots = {
  symbols: ['\u{1F352}', '\u{1F34B}', '\u{1F3B0}', '7\uFE0F\u20E3', '\u{1F48E}'],
  payouts3: [5, 8, 15, 30, 50],
  reels: 3,
  rows: 3,
  spinning: false,
  grid: [],
  initialized: false,

  // Auto spin
  autoSpinning: false,
  autoTimer: null,
  autoRemaining: 0,

  getBet() { const v = App.parseAmount(document.getElementById('slots-bet').value); return Math.max(0.01, isNaN(v) ? 0.01 : v); },
  halfBet() { App.setBetInput(document.getElementById('slots-bet'), this.getBet() / 2); },
  doubleBet() { App.setBetInput(document.getElementById('slots-bet'), this.getBet() * 2); },
  maxBet() {
    const lines = this.getPaylines();
    App.setBetInput(document.getElementById('slots-bet'), App.balance / lines);
  },

  getPaylines() { return parseInt(document.getElementById('slots-lines').value); },
  updatePaylines() { this.renderLines(); this.updateTotalBet(); },

  updateTotalBet() {
    const el = document.getElementById('slots-total-bet');
    if (el) {
      const total = this.getBet() * this.getPaylines();
      el.textContent = 'Total bet: ' + App.formatMoney(total) + ' (' + this.getPaylines() + ' lines)';
    }
  },

  init() {
    if (this.initialized) return;
    this.initialized = true;
    const container = document.getElementById('slots-reels');
    container.innerHTML = '';

    this.grid = [];
    for (let r = 0; r < this.reels; r++) {
      this.grid[r] = [];
      for (let row = 0; row < this.rows; row++) {
        this.grid[r][row] = Math.floor(Math.random() * this.symbols.length);
      }
    }

    for (let r = 0; r < this.reels; r++) {
      const reel = document.createElement('div');
      reel.className = 'reel';
      reel.id = 'reel-' + r;

      const strip = document.createElement('div');
      strip.className = 'reel-strip';
      strip.id = 'reel-strip-' + r;

      for (let row = 0; row < this.rows; row++) {
        const sym = document.createElement('div');
        sym.className = 'reel-symbol';
        sym.textContent = this.symbols[this.grid[r][row]];
        strip.appendChild(sym);
      }
      strip.style.top = '0px';
      reel.appendChild(strip);
      container.appendChild(reel);
    }
    this.renderLines();
    this.updateTotalBet();
  },

  renderLines() {
    document.querySelectorAll('.reel-line').forEach(l => l.remove());
    const lines = this.getPaylines();
    const positions = [1, 0, 2];
    for (let i = 0; i < lines; i++) {
      document.querySelectorAll('.reel').forEach(reel => {
        const line = document.createElement('div');
        line.className = 'reel-line';
        line.style.top = (positions[i] * 56) + 'px';
        line.style.opacity = 0.3 + (i === 0 ? 0.3 : 0);
        reel.appendChild(line);
      });
    }
  },

  spin() {
    if (this.spinning) return;
    const bet = this.getBet();
    const lines = this.getPaylines();
    const totalBet = bet * lines;

    if (totalBet > App.balance && !Admin.godMode) {
      this.showResult('Not enough money!', 'lose');
      this.stopAutoSpin();
      return;
    }

    this.spinning = true;
    if (!Admin.godMode) App.addBalance(-totalBet);
    document.getElementById('slots-spin-btn').disabled = true;
    this.showResult('', '');

    const g = Rig.games.slots;
    const newGrid = [];

    if (g.forceJackpot) {
      for (let r = 0; r < this.reels; r++) {
        newGrid[r] = [];
        for (let row = 0; row < this.rows; row++) {
          newGrid[r][row] = row === 1 ? 4 : Math.floor(Math.random() * this.symbols.length);
        }
      }
      g.forceJackpot = false;
    } else if (g.forceSymbol >= 0) {
      for (let r = 0; r < this.reels; r++) {
        newGrid[r] = [];
        for (let row = 0; row < this.rows; row++) {
          newGrid[r][row] = row === 1 ? g.forceSymbol : Math.floor(Math.random() * this.symbols.length);
        }
      }
    } else if (Rig.enabled && Rig.shouldWin()) {
      const winSymbol = Math.floor(Math.random() * this.symbols.length);
      for (let r = 0; r < this.reels; r++) {
        newGrid[r] = [];
        for (let row = 0; row < this.rows; row++) {
          if (row === 1) {
            newGrid[r][row] = winSymbol;
          } else {
            newGrid[r][row] = Math.floor(Math.random() * this.symbols.length);
          }
        }
      }
    } else {
      for (let r = 0; r < this.reels; r++) {
        newGrid[r] = [];
        for (let row = 0; row < this.rows; row++) {
          newGrid[r][row] = Math.floor(Math.random() * this.symbols.length);
        }
      }
    }

    // Animate
    for (let r = 0; r < this.reels; r++) {
      const strip = document.getElementById('reel-strip-' + r);
      const extraCount = 8 + r * 3;
      strip.innerHTML = '';

      for (let i = 0; i < extraCount; i++) {
        const sym = document.createElement('div');
        sym.className = 'reel-symbol';
        sym.textContent = this.symbols[Math.floor(Math.random() * this.symbols.length)];
        strip.appendChild(sym);
      }
      for (let row = 0; row < this.rows; row++) {
        const sym = document.createElement('div');
        sym.className = 'reel-symbol';
        sym.textContent = this.symbols[newGrid[r][row]];
        strip.appendChild(sym);
      }

      strip.style.transition = 'none';
      strip.style.top = '0px';
      strip.offsetHeight;

      const finalTop = -(extraCount * 56);
      strip.style.transition = `top ${0.5 + r * 0.15}s cubic-bezier(0.2, 0.8, 0.3, 1)`;
      strip.style.top = finalTop + 'px';
    }

    this.grid = newGrid;

    setTimeout(() => {
      for (let r = 0; r < this.reels; r++) {
        const strip = document.getElementById('reel-strip-' + r);
        strip.style.transition = 'none';
        strip.innerHTML = '';
        for (let row = 0; row < this.rows; row++) {
          const sym = document.createElement('div');
          sym.className = 'reel-symbol';
          sym.textContent = this.symbols[newGrid[r][row]];
          strip.appendChild(sym);
        }
        strip.style.top = '0px';
      }

      let payout = this.calculatePayout(newGrid, bet, lines);
      // Apply hacking crime bonus to payout
      if (typeof Crime !== 'undefined' && payout > 0) {
        payout = Math.floor(payout * Crime.getSlotsBonus());
      }
      // Apply house/item slotsBonus and gamblingBonus
      if (typeof App !== 'undefined' && payout > 0) {
        const boosts = App.getAllBoosts();
        payout = Math.floor(payout * (1 + (boosts.slotsBonus || 0) + (boosts.gamblingBonus || 0)));
      }
      // Apply hunger penalty to payout
      if (typeof App !== 'undefined' && payout > 0) {
        payout = Math.floor(payout * (1 - App.getHungerPenalty()));
      }
      if (payout > 0) {
        App.addBalance(payout);
        this.showResult('Won ' + App.formatMoney(payout) + '!', 'win');
        GameStats.record('slots', 'win', payout - totalBet);
        App.recordWin();
      } else {
        this.showResult('No win', 'lose');
        GameStats.record('slots', 'lose', totalBet);
        App.recordLoss();
      }

      this.spinning = false;
      document.getElementById('slots-spin-btn').disabled = false;
      this.renderLines();

      // Auto spin continuation
      if (this.autoSpinning && this.autoRemaining > 0) {
        this.autoRemaining--;
        this.updateAutoStatus();
        if (this.autoRemaining <= 0) {
          this.stopAutoSpin();
        } else {
          const nextBet = this.getBet() * this.getPaylines();
          if (nextBet > App.balance && !Admin.godMode) {
            this.stopAutoSpin();
          } else {
            this.autoTimer = setTimeout(() => this.spin(), 200);
          }
        }
      }
    }, 500 + this.reels * 150 + 200);
  },

  calculatePayout(grid, bet, lines) {
    let total = 0;
    const lineRows = [1, 0, 2];

    for (let l = 0; l < lines; l++) {
      const row = lineRows[l];
      const lineSymbols = [];
      for (let r = 0; r < this.reels; r++) {
        lineSymbols.push(grid[r][row]);
      }

      const first = lineSymbols[0];
      let count = 1;
      for (let i = 1; i < lineSymbols.length; i++) {
        if (lineSymbols[i] === first) count++;
        else break;
      }

      if (count === 3) {
        total += bet * this.payouts3[first];
      }
    }
    return total;
  },

  // Auto spin
  toggleAutoSpin() {
    if (this.autoSpinning) {
      this.stopAutoSpin();
    } else {
      this.startAutoSpin();
    }
  },

  startAutoSpin() {
    const countEl = document.getElementById('slots-auto-count');
    const count = Math.max(1, Math.min(500, parseInt(countEl.value) || 10));
    this.autoSpinning = true;
    this.autoRemaining = count;

    const btn = document.getElementById('slots-auto-btn');
    btn.textContent = 'Auto: ON';
    btn.classList.add('slots-auto-active');

    this.updateAutoStatus();

    if (!this.spinning) {
      this.spin();
    }
  },

  stopAutoSpin() {
    this.autoSpinning = false;
    this.autoRemaining = 0;
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }

    const btn = document.getElementById('slots-auto-btn');
    if (btn) {
      btn.textContent = 'Auto: OFF';
      btn.classList.remove('slots-auto-active');
    }

    const status = document.getElementById('slots-auto-status');
    if (status) status.textContent = '';
  },

  updateAutoStatus() {
    const status = document.getElementById('slots-auto-status');
    if (status && this.autoSpinning) {
      const countEl = document.getElementById('slots-auto-count');
      const total = parseInt(countEl.value) || 10;
      status.textContent = 'Auto: ' + this.autoRemaining + '/' + total + ' remaining';
    }
  },

  showResult(text, cls) {
    const el = document.getElementById('slots-result');
    el.textContent = text;
    el.className = 'game-result ' + cls;
  }
};
