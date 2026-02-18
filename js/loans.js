const Loans = {
  debt: 0,           // Total amount owed (principal + accrued interest)
  loanTime: 0,       // Timestamp when loan was taken
  interestRate: 0.1, // 10% interest per cycle
  interestCycle: 60, // Interest accrues every 60 seconds
  interestTimer: null,
  maxLoans: [
    { name: 'Quick Cash',    amount: 100,     interest: 5,   icon: '\u{1F4B5}' },
    { name: 'Small Loan',    amount: 1000,    interest: 8,   icon: '\u{1F4B0}' },
    { name: 'Big Loan',      amount: 10000,   interest: 12,  icon: '\u{1F3E6}' },
    { name: 'Shark Loan',    amount: 100000,  interest: 20,  icon: '\u{1F988}' },
    { name: 'Mega Loan',     amount: 1000000, interest: 30,  icon: '\u{1F480}' },
  ],

  // Duel system
  duelCooldown: 0,     // Timestamp when next duel is allowed
  duelState: null,     // { playerScore, sharkScore, round, playerCard, sharkCard, phase }
  duelActive: false,

  init() {
    this.updateUI();
    this.startInterest();
  },

  // Get max loan amount based on player progress
  getMaxLoan() {
    const earned = App.totalEarned;
    const rebirth = App.rebirth || 0;
    // Base: 500, scales with earnings and rebirths
    let max = 500 + earned * 0.1 + rebirth * 50000;
    return Math.floor(max);
  },

  // Get interest rate based on current debt level
  getInterestPercent() {
    if (this.debt <= 0) return 5;
    if (this.debt < 1000) return 5;
    if (this.debt < 10000) return 8;
    if (this.debt < 100000) return 12;
    if (this.debt < 1000000) return 20;
    return 30;
  },

  takeLoan(amount) {
    if (this.debt > this.getMaxLoan() * 3) {
      alert('The loan shark refuses! Your debt is too high.');
      return;
    }

    App.addBalance(amount);
    this.debt = App.safeAdd(this.debt, amount);
    if (this.loanTime === 0) this.loanTime = Date.now();
    this.startInterest();
    this.updateUI();
    this.updateDebtDisplay();
    App.save();
  },

  payBack(amount) {
    if (this.debt <= 0) return;
    const payAmount = Math.min(amount, this.debt, App.balance);
    if (payAmount <= 0) return;

    App.addBalance(-payAmount);
    this.debt = App.safeAdd(this.debt, -payAmount);
    if (this.debt <= 0.01) {
      this.debt = 0;
      this.loanTime = 0;
      this.stopInterest();
    }
    this.updateUI();
    this.updateDebtDisplay();
    App.save();
  },

  payAll() {
    this.payBack(this.debt);
  },

  // Interest accrues every cycle
  startInterest() {
    if (this.interestTimer) return;
    if (this.debt <= 0) return;

    this.interestTimer = setInterval(() => {
      if (this.debt <= 0) {
        this.stopInterest();
        return;
      }

      const rate = this.getInterestPercent() / 100;
      const interest = Math.max(0.01, this.debt * rate);
      this.debt = App.safeAdd(this.debt, interest);

      // If debt exceeds balance by a lot, player goes into negative
      if (this.debt > App.balance * 5 && App.balance > 0) {
        const take = Math.min(App.balance * 0.05, this.debt * 0.01);
        if (take > 0.01) {
          App.addBalance(-take);
          this.debt = App.safeAdd(this.debt, -take);
        }
      }

      this.updateUI();
      this.updateDebtDisplay();
    }, this.interestCycle * 1000);
  },

  stopInterest() {
    if (this.interestTimer) {
      clearInterval(this.interestTimer);
      this.interestTimer = null;
    }
  },

  // Check if player is in debt
  isInDebt() {
    return this.debt > 0;
  },

  updateUI() {
    const panel = document.getElementById('loan-panel');
    const debtDisplay = document.getElementById('loan-debt-amount');
    const interestDisplay = document.getElementById('loan-interest-rate');
    const paySection = document.getElementById('loan-pay-section');
    const warningEl = document.getElementById('loan-warning');
    const duelBtn = document.getElementById('shark-duel-btn');

    if (!panel) return;

    if (this.debt > 0) {
      debtDisplay.textContent = App.formatMoney(this.debt);
      interestDisplay.textContent = this.getInterestPercent() + '% / min';
      paySection.classList.remove('hidden');

      // Show duel button when in debt and not on cooldown
      if (duelBtn) {
        if (Date.now() >= this.duelCooldown) {
          duelBtn.classList.remove('hidden');
          duelBtn.textContent = '\u{1F3B2} Challenge Shark';
          duelBtn.disabled = false;
        } else {
          duelBtn.classList.remove('hidden');
          const remaining = Math.ceil((this.duelCooldown - Date.now()) / 1000);
          duelBtn.textContent = `Cooldown: ${remaining}s`;
          duelBtn.disabled = true;
        }
      }

      // Warning levels
      const ratio = this.debt / Math.max(App.balance, 1);
      if (ratio > 10) {
        warningEl.textContent = 'The loan shark is getting angry...';
        warningEl.className = 'loan-warning danger';
      } else if (ratio > 3) {
        warningEl.textContent = 'Your debt is growing fast!';
        warningEl.className = 'loan-warning caution';
      } else if (this.debt > 0) {
        warningEl.textContent = 'Remember to pay back your loan.';
        warningEl.className = 'loan-warning';
      }
    } else {
      debtDisplay.textContent = '$0';
      interestDisplay.textContent = '0%';
      paySection.classList.add('hidden');
      warningEl.textContent = '';
      warningEl.className = 'loan-warning';
      if (duelBtn) duelBtn.classList.add('hidden');
    }

    // Render loan buttons
    this.renderLoanButtons();
  },

  renderLoanButtons() {
    const grid = document.getElementById('loan-options');
    if (!grid) return;

    const maxLoan = this.getMaxLoan();
    grid.innerHTML = this.maxLoans
      .filter(l => l.amount <= maxLoan * 2)
      .map(l => {
        const canAfford = l.amount <= maxLoan && this.debt < maxLoan * 3;
        return `<button class="loan-btn ${canAfford ? '' : 'loan-locked'}"
          onclick="${canAfford ? 'Loans.takeLoan(' + l.amount + ')' : ''}"
          ${canAfford ? '' : 'disabled'}>
          <span class="loan-icon">${l.icon}</span>
          <span class="loan-name">${l.name}</span>
          <span class="loan-amount">${App.formatMoney(l.amount)}</span>
          <span class="loan-rate">${l.interest}% interest</span>
        </button>`;
      }).join('');
  },

  updateDebtDisplay() {
    const balDisplay = document.getElementById('balance-display');
    const debtBadge = document.getElementById('debt-badge');

    if (this.debt > 0) {
      if (debtBadge) {
        debtBadge.textContent = '-' + App.formatMoney(this.debt);
        debtBadge.classList.remove('hidden');
      }
      if (balDisplay) balDisplay.classList.add('in-debt');
    } else {
      if (debtBadge) debtBadge.classList.add('hidden');
      if (balDisplay) balDisplay.classList.remove('in-debt');
    }
  },

  // ============ DUEL SYSTEM ============

  startDuel() {
    if (this.debt <= 0) return;
    if (Date.now() < this.duelCooldown) return;
    if (this.duelActive) return;

    this.duelActive = true;
    this.duelState = {
      playerScore: 0,
      sharkScore: 0,
      round: 0,
      playerCard: null,
      sharkCard: null,
      phase: 'ready', // ready, revealed, done
    };

    const overlay = document.getElementById('shark-duel');
    if (overlay) {
      overlay.classList.remove('hidden');
      document.getElementById('duel-score').textContent = 'You 0 - 0 Shark';
      document.getElementById('duel-player-card').textContent = '?';
      document.getElementById('duel-player-card').className = 'duel-card';
      document.getElementById('duel-shark-card').textContent = '?';
      document.getElementById('duel-shark-card').className = 'duel-card';
      document.getElementById('duel-result').textContent = 'Best of 3 - Draw your card!';
      document.getElementById('duel-result').className = 'duel-result';
      document.getElementById('duel-draw-btn').textContent = 'DRAW!';
      document.getElementById('duel-draw-btn').disabled = false;
    }
  },

  getCardDisplay(value) {
    const faces = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
    return faces[value] || String(value);
  },

  getSharkCard() {
    // Shark cheats slightly - weighted toward higher values based on debt
    const bias = Math.min(0.4, this.debt / 1000000 * 0.3 + 0.1);
    if (Math.random() < bias) {
      return Math.floor(Math.random() * 5) + 9; // 9-13
    }
    return Math.floor(Math.random() * 13) + 1; // 1-13
  },

  duelDraw() {
    if (!this.duelActive || !this.duelState) return;
    const state = this.duelState;

    if (state.phase === 'done') {
      this.closeDuel();
      return;
    }

    if (state.phase === 'revealed') {
      // Reset for next round
      state.phase = 'ready';
      document.getElementById('duel-player-card').textContent = '?';
      document.getElementById('duel-player-card').className = 'duel-card';
      document.getElementById('duel-shark-card').textContent = '?';
      document.getElementById('duel-shark-card').className = 'duel-card';
      document.getElementById('duel-result').textContent = `Round ${state.round + 1} - Draw!`;
      document.getElementById('duel-result').className = 'duel-result';
      document.getElementById('duel-draw-btn').textContent = 'DRAW!';
      return;
    }

    // Draw cards
    state.round++;
    const playerCard = Math.floor(Math.random() * 13) + 1;
    const sharkCard = this.getSharkCard();
    state.playerCard = playerCard;
    state.sharkCard = sharkCard;

    const playerEl = document.getElementById('duel-player-card');
    const sharkEl = document.getElementById('duel-shark-card');
    const resultEl = document.getElementById('duel-result');
    const scoreEl = document.getElementById('duel-score');
    const drawBtn = document.getElementById('duel-draw-btn');

    // Show cards with animation
    playerEl.textContent = this.getCardDisplay(playerCard);
    sharkEl.textContent = this.getCardDisplay(sharkCard);
    playerEl.classList.add('duel-card-flip');
    sharkEl.classList.add('duel-card-flip');

    let roundResult = '';
    if (playerCard > sharkCard) {
      state.playerScore++;
      roundResult = 'You win this round!';
      playerEl.classList.add('duel-card-win');
      sharkEl.classList.add('duel-card-lose');
    } else if (sharkCard > playerCard) {
      state.sharkScore++;
      roundResult = 'Shark wins this round!';
      sharkEl.classList.add('duel-card-win');
      playerEl.classList.add('duel-card-lose');
    } else {
      roundResult = 'Tie! Redraw...';
      state.round--; // Don't count ties
    }

    scoreEl.textContent = `You ${state.playerScore} - ${state.sharkScore} Shark`;
    resultEl.textContent = roundResult;

    // Check if duel is over (best of 3)
    if (state.playerScore >= 2 || state.sharkScore >= 2) {
      state.phase = 'done';
      const isPerfect = state.playerScore >= 2 && state.sharkScore === 0;
      const playerWon = state.playerScore >= 2;

      if (playerWon) {
        const reduction = isPerfect ? 0.75 : 0.50;
        const saved = this.debt * reduction;
        this.debt = App.safeAdd(this.debt, -saved);
        if (this.debt < 0.01) this.debt = 0;
        resultEl.textContent = isPerfect
          ? `PERFECT WIN! Debt reduced 75%! (-${App.formatMoney(saved)})`
          : `YOU WIN! Debt reduced 50%! (-${App.formatMoney(saved)})`;
        resultEl.className = 'duel-result duel-win';
      } else {
        const increase = this.debt * 0.25;
        this.debt = App.safeAdd(this.debt, increase);
        resultEl.textContent = `YOU LOSE! Debt increased 25%! (+${App.formatMoney(increase)})`;
        resultEl.className = 'duel-result duel-lose';
      }

      this.duelCooldown = Date.now() + 60000; // 60s cooldown
      drawBtn.textContent = 'CLOSE';
      this.updateUI();
      this.updateDebtDisplay();
      App.save();
    } else {
      state.phase = 'revealed';
      drawBtn.textContent = 'NEXT ROUND';
    }
  },

  closeDuel() {
    this.duelActive = false;
    this.duelState = null;
    const overlay = document.getElementById('shark-duel');
    if (overlay) overlay.classList.add('hidden');
    this.updateUI();
  },
};
