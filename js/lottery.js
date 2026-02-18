const Lottery = {
  // Scratch card tiers
  tiers: [
    { name: 'Basic',   cost: 5,    color: '#888',    prizes: [0, 0, 0, 1, 2, 5, 10, 25] },
    { name: 'Silver',  cost: 25,   color: '#b0bec5', prizes: [0, 0, 0, 5, 10, 25, 50, 150] },
    { name: 'Gold',    cost: 100,  color: '#ffd740', prizes: [0, 0, 10, 25, 50, 100, 250, 1000] },
    { name: 'Diamond', cost: 500,  color: '#4fc3f7', prizes: [0, 0, 50, 100, 250, 500, 2500, 10000] },
    { name: 'Royal',   cost: 5000, color: '#ce93d8', prizes: [0, 0, 500, 1000, 2500, 5000, 25000, 100000] }
  ],

  currentTier: 0,
  card: null,      // { cells: [{value, revealed}], prize }
  scratching: false,

  init() {
    this.renderTierSelect();
    this.updateCostDisplay();
  },

  renderTierSelect() {
    const sel = document.getElementById('lottery-tier');
    if (!sel) return;
    sel.innerHTML = this.tiers.map((t, i) =>
      `<option value="${i}" style="color:${t.color}">${t.name} - ${App.formatMoney(t.cost)}</option>`
    ).join('');
    sel.value = this.currentTier;
  },

  setTier() {
    this.currentTier = parseInt(document.getElementById('lottery-tier').value);
    this.updateCostDisplay();
  },

  updateCostDisplay() {
    const el = document.getElementById('lottery-cost');
    if (el) el.textContent = App.formatMoney(this.tiers[this.currentTier].cost);
  },

  buyCard() {
    const tier = this.tiers[this.currentTier];
    if (App.balance < tier.cost && !Admin.godMode) {
      document.getElementById('lottery-result').textContent = 'Not enough money!';
      document.getElementById('lottery-result').className = 'game-result lose';
      return;
    }

    if (!Admin.godMode) App.addBalance(-tier.cost);

    // Generate scratch card
    const prizes = tier.prizes;
    let cells = [];

    // Determine prize: pick 3 matching symbols
    // Rig check
    let forceWin = false;
    const g = Rig.games.lottery;
    if (g.forceJackpot) {
      forceWin = true;
      g.forceJackpot = false;
    } else if (Rig.enabled) {
      forceWin = Rig.shouldWin();
    }

    // Build 9-cell grid (3x3)
    // 3 matching = win that prize amount
    const symbols = ['💎', '⭐', '🍀', '🎯', '💰', '🔥', '👑', '🎲'];
    let winSymbol, winPrize;

    if (forceWin) {
      // Force a good prize
      winPrize = prizes[prizes.length - 1]; // jackpot
      winSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    } else {
      // Random prize from tier
      const roll = Math.random();
      // Weight: mostly low prizes
      const idx = Math.floor(Math.pow(roll, 1.5) * prizes.length);
      winPrize = prizes[idx];
      winSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    }

    // Place 3 matching symbols + fill rest with random non-matching
    const matchPositions = this.pickRandom3of9();
    for (let i = 0; i < 9; i++) {
      if (matchPositions.includes(i)) {
        cells.push({ symbol: winSymbol, value: winPrize, revealed: false });
      } else {
        // Random different symbol
        let sym;
        do {
          sym = symbols[Math.floor(Math.random() * symbols.length)];
        } while (sym === winSymbol);
        cells.push({ symbol: sym, value: 0, revealed: false });
      }
    }

    this.card = { cells, prize: winPrize, tierIdx: this.currentTier, allRevealed: false };
    this.renderCard();
    document.getElementById('lottery-result').textContent = 'Scratch to reveal!';
    document.getElementById('lottery-result').className = 'game-result';
  },

  pickRandom3of9() {
    const indices = [0,1,2,3,4,5,6,7,8];
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.slice(0, 3);
  },

  renderCard() {
    const grid = document.getElementById('lottery-card');
    if (!grid || !this.card) {
      if (grid) grid.innerHTML = '<div class="lottery-empty">Buy a card to play!</div>';
      return;
    }

    const tier = this.tiers[this.card.tierIdx];
    grid.innerHTML = this.card.cells.map((cell, i) => {
      if (cell.revealed) {
        const isWin = cell.value > 0;
        return `<div class="scratch-cell revealed ${isWin ? 'scratch-win' : 'scratch-lose'}"
          style="${isWin ? 'border-color:' + tier.color : ''}">
          <span class="scratch-symbol">${cell.symbol}</span>
          ${isWin ? '<span class="scratch-value">' + App.formatMoney(cell.value) + '</span>' : ''}
        </div>`;
      } else {
        return `<div class="scratch-cell covered" onclick="Lottery.scratch(${i})" style="border-color:${tier.color}40">
          <span class="scratch-cover">?</span>
        </div>`;
      }
    }).join('');
  },

  scratch(i) {
    if (!this.card || this.card.cells[i].revealed) return;
    this.card.cells[i].revealed = true;
    this.renderCard();
    this.checkComplete();
  },

  revealAll() {
    if (!this.card) return;
    this.card.cells.forEach(c => c.revealed = true);
    this.renderCard();
    this.checkComplete();
  },

  checkComplete() {
    if (!this.card || this.card.allRevealed) return;
    const allDone = this.card.cells.every(c => c.revealed);
    if (!allDone) return;

    this.card.allRevealed = true;
    const prize = this.card.prize;
    const cost = this.tiers[this.card.tierIdx].cost;
    const resultEl = document.getElementById('lottery-result');

    if (prize > 0) {
      // Multiply by rebirth earnings
      const multiplier = Clicker.getEarningsMultiplier();
      const finalPrize = prize * multiplier;
      App.addBalance(finalPrize);
      resultEl.textContent = 'You won ' + App.formatMoney(finalPrize) + '!';
      resultEl.className = 'game-result win';
      GameStats.record('lottery', 'win', finalPrize);
    } else {
      resultEl.textContent = 'No match - better luck next time!';
      resultEl.className = 'game-result lose';
      GameStats.record('lottery', 'lose', cost);
    }
  }
};
