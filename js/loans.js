const Loans = {
  debt: 0,           // Total amount owed (principal + accrued interest)
  loanTime: 0,       // Timestamp when loan was taken
  interestRate: 0.1, // 10% interest per cycle
  interestCycle: 60, // Interest accrues every 60 seconds
  interestTimer: null,
  maxLoans: [
    { name: 'Quick Cash',    amount: 100,     interest: 5,   icon: '\u{1F4B5}' },
  ],

  // Duel system
  duelCooldown: 0,     // Timestamp when next duel is allowed
  duelState: null,     // { playerScore, sharkScore, round, playerCard, sharkCard, phase }
  duelActive: false,

  // Reckoning system (10T debt cap)
  MAX_DEBT: 10_000_000_000_000,           // 10 trillion hard cap
  MAX_LOAN: 100_000_000_000,              // 100 billion max single loan
  _reckoningActive: false,
  _reckoningRebirthThreshold: 0,         // App.rebirth must reach this to borrow again

  // Bargain system
  _bargainState: null,
  _bargainDiscount: 0, // accumulated interest discount from bargaining
  _pendingLoanAmount: 0,

  // Shark Negotiator (R5+): one-time 10% interest reduction
  _negotiatorPurchased: false,
  _interestReduction: 0,

  // Counter-Loan (R5+): lend money to the shark
  _counterLoan: { amount: 0, startedAt: 0, lastPaidAt: 0, totalEarned: 0 },
  _counterLoanTimer: null,
  _counterLoanSkipMessages: [
    'The shark forgot his wallet',
    'The shark is at the dentist (those teeth aren\'t cheap)',
    'The shark is "in a meeting"',
    'The shark\'s kid ate the payment slip',
    'Connection error: shark offline',
  ],

  // Rigged Deck (R5+): consumable from shark's black market
  _riggedDecks: { blackjack: 0, coinflip: 0 },

  // Shark dialogue lines
  _sharkLines: {
    scummy: [
      "Interest? Oh, it's very reasonable... for me.",
      "You look desperate. I like that in a customer.",
      "Don't worry about the fine print. Nobody reads it.",
      "I'm practically giving this money away! ...with strings attached.",
      "Trust me, this is a great deal. Would I lie?",
    ],
    angry: [
      "You already owe me a fortune! Are you insane?!",
      "I should break something... like our agreement.",
      "Pay what you owe before asking for more!",
      "My patience has a price, and you can't afford it.",
    ],
    understanding: [
      "I've seen worse... barely.",
      "Look... I can see you're in deep. Tell you what...",
      "Even I have a heart. Somewhere. Maybe.",
      "At this point we're practically business partners.",
      "You owe so much I'm almost impressed.",
    ],
    duel: [
      "Think you can beat me? Ha!",
      "Let's make this interesting...",
      "I've never lost a duel! ...that I remember.",
    ],
    duelDesperate: [
      "You're in deep, kid. I'll give you better odds.",
      "Fine... I'll play fair. This once.",
      "I almost feel bad for you. Almost.",
    ],
    bargain: [
      "You think I'm running a charity here?",
      "Fine, but don't come crying when you can't pay.",
      "I like your guts, kid. Still gonna charge you though.",
      "Hmm... you drive a hard bargain. I hate that.",
      "Alright, alright, you win this one. Barely.",
    ],
    bargainFail: [
      "HA! Nice try, but no.",
      "Wrong! That'll cost you extra.",
      "You're terrible at this. I love it.",
    ],
  },

  init() {
    this.updateUI();
    this.startInterest();
    this.loadPlayerLoans();
    this.startPlayerLoanInterest();
    // Restart counter-loan timer if one was active
    if (this._counterLoan.amount > 0) this._startCounterLoanTimer();
    // Close P2P dropdown on outside click
    document.addEventListener('click', e => {
      const combo = document.querySelector('.p2p-name-combo');
      if (combo && !combo.contains(e.target)) {
        const dd = document.getElementById('p2p-name-dropdown');
        if (dd) dd.classList.add('hidden');
      }
    });
  },

  // Show shark dialogue bubble
  _showDialogue(category) {
    const lines = this._sharkLines[category];
    if (!lines || lines.length === 0) return;
    const line = lines[Math.floor(Math.random() * lines.length)];
    const el = document.getElementById('shark-dialogue');
    if (el) {
      el.textContent = '\u{1F988} "' + line + '"';
      el.classList.remove('hidden');
      clearTimeout(this._dialogueTimeout);
      this._dialogueTimeout = setTimeout(() => el.classList.add('hidden'), 5000);
    }
  },

  // Get max loan amount based on player progress (hard cap: 100 billion)
  getMaxLoan() {
    const earned = App.totalEarned;
    const rebirth = App.rebirth || 0;
    let max = 500 + earned * 0.1 + rebirth * 50000;
    return Math.floor(Math.min(max, this.MAX_LOAN));
  },

  // Is the player locked out of loans after a reckoning loss?
  isLoanLocked() {
    if (this._reckoningRebirthThreshold <= 0) return false;
    return (App.rebirth || 0) < this._reckoningRebirthThreshold;
  },

  getLoanLockMessage() {
    const needed = this._reckoningRebirthThreshold - (App.rebirth || 0);
    return `The Shark won't deal with you. Rebirth ${needed} more time${needed !== 1 ? 's' : ''} to restore credit.`;
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
    if (this.isLoanLocked()) {
      this._showDialogue('angry');
      alert(this.getLoanLockMessage());
      return;
    }
    if (this.debt > this.getMaxLoan() * 3) {
      this._showDialogue('angry');
      return;
    }

    App.addBalance(amount);
    this.debt = App.safeAdd(this.debt, amount);
    if (this.loanTime === 0) this.loanTime = Date.now();
    this.startInterest();
    this.updateUI();
    this.updateDebtDisplay();
    App.save();

    // Show dialogue based on debt level
    if (this.debt >= 1_000_000_000_000) {
      this._showDialogue('understanding');
    } else if (this.debt > this.getMaxLoan() * 2) {
      this._showDialogue('angry');
    } else {
      this._showDialogue('scummy');
    }
  },

  takeCustomLoan() {
    const input = document.getElementById('loan-custom-amount');
    if (!input) return;
    const amount = parseFloat(input.value);
    if (!amount || amount < 100) {
      alert('Minimum loan: $100');
      return;
    }
    const maxLoan = this.getMaxLoan();
    if (amount > maxLoan) {
      alert('Maximum loan: ' + App.formatMoney(maxLoan));
      return;
    }
    input.value = '';
    this.takeLoan(amount);
  },

  payBack(amount) {
    if (this.debt <= 0) return;
    const payAmount = Math.min(amount, this.debt, App.balance);
    if (payAmount <= 0) return;

    App.addBalance(-payAmount);
    this.debt = App.safeAdd(this.debt, -payAmount);
    this._totalPaid = (this._totalPaid || 0) + payAmount;
    if (typeof Pets !== 'undefined') Pets.checkEasterEgg('loan_overpay', this._totalPaid);
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

      let rate = this.getInterestPercent() / 100;
      // Apply any bargain discount
      if (this._bargainDiscount > 0) {
        rate = Math.max(0.01, rate - this._bargainDiscount / 100);
      }
      // Apply negotiator reduction
      if (this._interestReduction > 0) {
        rate = rate * (1 - this._interestReduction);
      }
      const interest = Math.max(0.01, this.debt * rate);
      this.debt = App.safeAdd(this.debt, interest);

      if (this.debt > App.balance * 5 && App.balance > 0) {
        const take = Math.min(App.balance * 0.05, this.debt * 0.01);
        if (take > 0.01) {
          App.addBalance(-take);
          this.debt = App.safeAdd(this.debt, -take);
        }
      }

      this.updateUI();
      this.updateDebtDisplay();

      // Hard cap: trigger reckoning at 10 trillion
      if (this.debt >= this.MAX_DEBT && !this._reckoningActive) {
        this.debt = this.MAX_DEBT;
        this._triggerReckoning();
      }
    }, this.interestCycle * 1000);
  },

  stopInterest() {
    if (this.interestTimer) {
      clearInterval(this.interestTimer);
      this.interestTimer = null;
    }
  },

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
      let effectiveRate = this.getInterestPercent();
      if (this._bargainDiscount > 0) effectiveRate = Math.max(1, effectiveRate - this._bargainDiscount);
      if (this._interestReduction > 0) effectiveRate = Math.max(1, Math.round(effectiveRate * (1 - this._interestReduction)));
      interestDisplay.textContent = effectiveRate + '% / min';
      paySection.classList.remove('hidden');

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

      const ratio = this.debt / Math.max(App.balance, 1);
      if (this.debt >= 1_000_000_000_000) {
        warningEl.textContent = 'The shark almost pities you... almost.';
        warningEl.className = 'loan-warning danger';
      } else if (ratio > 10) {
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

    this.renderLoanButtons();

    // R5 panels visibility
    const r5 = (App.rebirth || 0) >= 5;
    document.querySelectorAll('.r5-panel').forEach(el => {
      el.classList.toggle('hidden', !r5);
    });
    if (r5) {
      this._renderCounterLoanSection();
      this._renderNegotiatorSection();
      this._renderBlackMarketSection();
    }

    // Loan lock warning (after reckoning loss)
    const lockWarn = document.getElementById('loan-lock-warning');
    if (lockWarn) {
      if (this.isLoanLocked()) {
        lockWarn.textContent = this.getLoanLockMessage();
        lockWarn.classList.remove('hidden');
      } else {
        lockWarn.classList.add('hidden');
      }
    }
  },

  renderLoanButtons() {
    const grid = document.getElementById('loan-options');
    if (!grid) return;

    const maxLoan = this.getMaxLoan();
    const locked = this.isLoanLocked();
    // Quick Cash is smaller/secondary style
    grid.innerHTML = this.maxLoans
      .filter(l => l.amount <= maxLoan * 2)
      .map((l, i) => {
        const canAfford = !locked && l.amount <= maxLoan && this.debt < maxLoan * 3;
        const isQuickCash = i === 0;
        return `<button class="loan-btn ${canAfford ? '' : 'loan-locked'} ${isQuickCash ? 'loan-quick-cash' : ''}"
          onclick="${canAfford ? 'Loans.takeLoan(' + l.amount + ')' : ''}"
          ${canAfford ? '' : 'disabled'}>
          <span class="loan-icon">${l.icon}</span>
          <span class="loan-name">${l.name}</span>
          <span class="loan-amount">${App.formatMoney(l.amount)}</span>
          <span class="loan-rate">${l.interest}% interest</span>
        </button>`;
      }).join('');
  },

  renderPlayerLoans() {
    const container = document.getElementById('p2p-loan-content');
    if (!container) return;
    const uid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    const loans = Object.entries(this._p2pLoans || {});

    if (loans.length === 0) {
      container.innerHTML = '<div class="p2p-empty">No active player loans</div>';
      return;
    }

    const myNameLower = (typeof Settings !== 'undefined' ? Settings.profile.name : '').toLowerCase();
    const pending = loans.filter(([, l]) => l.status === 'pending' && l.borrowerNameLower === myNameLower);
    const borrowed = loans.filter(([, l]) => l.status === 'active' && l.borrowerId === uid);
    const lent = loans.filter(([, l]) => l.lenderId === uid && (l.status === 'active' || l.status === 'pending'));

    let html = '';

    if (pending.length > 0) {
      html += '<div class="p2p-section-title">\u{1F4E8} Loan Offers</div>';
      pending.forEach(([id, loan]) => {
        html += `<div class="p2p-loan-card p2p-pending">
          <div class="p2p-loan-info">
            <span class="p2p-lender">${loan.lenderName}</span> offers
            <span class="p2p-amount">${App.formatMoney(loan.amount)}</span>
            at <span class="p2p-rate">${loan.interestRate}%/min</span>
          </div>
          <div class="p2p-loan-actions">
            <button class="p2p-btn p2p-accept" onclick="Loans.acceptPlayerLoan('${id}')">Accept</button>
            <button class="p2p-btn p2p-decline" onclick="Loans.declinePlayerLoan('${id}')">Decline</button>
          </div>
        </div>`;
      });
    }

    if (borrowed.length > 0) {
      html += '<div class="p2p-section-title">\u{1F4B8} I Owe</div>';
      borrowed.forEach(([id, loan]) => {
        html += `<div class="p2p-loan-card p2p-borrowed">
          <div class="p2p-loan-info">
            To <span class="p2p-lender">${loan.lenderName}</span>:
            <span class="p2p-owed">${App.formatMoney(loan.totalOwed || loan.amount)}</span>
            (${loan.interestRate}%/min)
          </div>
          <button class="p2p-btn p2p-pay" onclick="Loans.payPlayerLoan('${id}')">Pay All</button>
        </div>`;
      });
    }

    if (lent.length > 0) {
      html += '<div class="p2p-section-title">\u{1F3E6} I Lent</div>';
      lent.forEach(([id, loan]) => {
        html += `<div class="p2p-loan-card p2p-lent">
          <div class="p2p-loan-info">
            <span class="p2p-lender">${loan.borrowerName}</span>:
            <span class="p2p-owed">${App.formatMoney(loan.totalOwed || loan.amount)}</span>
            ${loan.status === 'pending' ? '<span class="p2p-pending-text">(pending...)</span>' : ''}
          </div>
          ${loan.status === 'active' ? `
            <div class="loan-forgive-row">
              <span style="font-size:11px;color:var(--text-dim)">Forgive:</span>
              <button class="p2p-btn" onclick="Loans.forgivePartial('${id}', (Loans._p2pLoans['${id}']?.totalOwed||0)*0.10)">10%</button>
              <button class="p2p-btn" onclick="Loans.forgivePartial('${id}', 5000)">$5K</button>
              <button class="p2p-btn" onclick="Loans.forgivePartial('${id}', 1e9)">$1B</button>
              <button class="p2p-btn" onclick="Loans.forgivePartial('${id}', 1e12)">$1T</button>
              <input type="number" id="forgive-custom-${id}" placeholder="Custom $" style="width:80px;font-size:12px;background:var(--bg);border:1px solid var(--bg3);border-radius:4px;color:var(--text);padding:2px 4px">
              <button class="p2p-btn" onclick="Loans.forgivePartial('${id}', +document.getElementById('forgive-custom-${id}').value)">Set</button>
              <button class="p2p-btn p2p-forgive" onclick="Loans.forgivePlayerLoan('${id}')">All</button>
            </div>` : '<span class="p2p-pending-text">Waiting...</span>'}
        </div>`;
      });
    }

    container.innerHTML = html || '<div class="p2p-empty">No active player loans</div>';
  },

  updateDebtDisplay() {
    const debtBadge = document.getElementById('debt-badge');
    const balDisplay = document.getElementById('balance-display');
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
    const desperate = this.debt >= 1_000_000_000_000;
    this.duelState = {
      playerScore: 0, sharkScore: 0, round: 0,
      playerCard: null, sharkCard: null,
      phase: 'ready', desperate,
    };

    this._showDialogue(desperate ? 'duelDesperate' : 'duel');

    const overlay = document.getElementById('shark-duel');
    if (overlay) {
      overlay.classList.remove('hidden');
      document.getElementById('duel-score').textContent = 'You 0 - 0 Shark';
      document.getElementById('duel-player-card').textContent = '?';
      document.getElementById('duel-player-card').className = 'duel-card';
      document.getElementById('duel-shark-card').textContent = '?';
      document.getElementById('duel-shark-card').className = 'duel-card';
      document.getElementById('duel-result').textContent = desperate
        ? '\u{1F198} DESPERATE DUEL \u2014 Better odds!'
        : 'Best of 3 \u2014 Draw your card!';
      document.getElementById('duel-result').className = 'duel-result';
      document.getElementById('duel-draw-btn').textContent = 'DRAW!';
      document.getElementById('duel-draw-btn').disabled = false;
    }
  },

  getCardDisplay(value) {
    const faces = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
    return faces[value] || String(value);
  },

  getSharkCard(desperate) {
    if (desperate) {
      if (Math.random() < 0.05) return Math.floor(Math.random() * 5) + 9;
      return Math.floor(Math.random() * 13) + 1;
    }
    const bias = Math.min(0.4, this.debt / 1_000_000 * 0.3 + 0.1);
    if (Math.random() < bias) return Math.floor(Math.random() * 5) + 9;
    return Math.floor(Math.random() * 13) + 1;
  },

  duelDraw() {
    if (!this.duelActive || !this.duelState) return;
    const state = this.duelState;

    if (state.phase === 'done') {
      this.closeDuel();
      return;
    }

    if (state.phase === 'revealed') {
      state.phase = 'ready';
      document.getElementById('duel-player-card').textContent = '?';
      document.getElementById('duel-player-card').className = 'duel-card';
      document.getElementById('duel-shark-card').textContent = '?';
      document.getElementById('duel-shark-card').className = 'duel-card';
      document.getElementById('duel-result').textContent = `Round ${state.round + 1}`;
      document.getElementById('duel-result').className = 'duel-result';
      document.getElementById('duel-draw-btn').textContent = 'DRAW!';
      return;
    }

    state.round++;
    const playerCard = Math.floor(Math.random() * 13) + 1;
    const sharkCard = this.getSharkCard(state.desperate);
    state.playerCard = playerCard;
    state.sharkCard = sharkCard;

    const playerEl = document.getElementById('duel-player-card');
    const sharkEl = document.getElementById('duel-shark-card');
    const resultEl = document.getElementById('duel-result');
    const scoreEl = document.getElementById('duel-score');
    const drawBtn = document.getElementById('duel-draw-btn');

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
      state.round--;
    }

    scoreEl.textContent = `You ${state.playerScore} - ${state.sharkScore} Shark`;
    resultEl.textContent = roundResult;

    if (state.playerScore >= 2 || state.sharkScore >= 2) {
      state.phase = 'done';
      const isPerfect = state.playerScore >= 2 && state.sharkScore === 0;
      const playerWon = state.playerScore >= 2;

      if (playerWon) {
        const reduction = state.desperate
          ? (isPerfect ? 0.90 : 0.75)
          : (isPerfect ? 0.75 : 0.50);
        const saved = this.debt * reduction;
        this.debt = Math.max(0, App.safeAdd(this.debt, -saved));
        if (this.debt < 0.01) this.debt = 0;
        resultEl.textContent = `YOU WIN! Debt reduced ${Math.round(reduction * 100)}%! (-${App.formatMoney(saved)})`;
        resultEl.className = 'duel-result duel-win';
      } else {
        const penaltyPct = state.desperate ? 0.10 : 0.25;
        const increase = this.debt * penaltyPct;
        this.debt = App.safeAdd(this.debt, increase);
        resultEl.textContent = `YOU LOSE! Debt +${Math.round(penaltyPct * 100)}%! (+${App.formatMoney(increase)})`;
        resultEl.className = 'duel-result duel-lose';
      }

      this.duelCooldown = Date.now() + 60000;
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

  // ============ RECKONING (10T MAX DEBT) ============

  _triggerReckoning() {
    this._reckoningActive = true;
    this.stopInterest();

    // Show the reckoning overlay
    const overlay = document.getElementById('shark-reckoning');
    if (overlay) {
      document.getElementById('reckoning-result').textContent = '';
      document.getElementById('reckoning-result').className = 'duel-result';
      document.getElementById('reckoning-flip-btn').disabled = false;
      document.getElementById('reckoning-flip-btn').textContent = '\uD83E\uDE99 FLIP THE COIN';
      overlay.classList.remove('hidden');
    }
  },

  reckoningFlip() {
    const btn = document.getElementById('reckoning-flip-btn');
    const resultEl = document.getElementById('reckoning-result');
    if (!btn || !resultEl) return;

    btn.disabled = true;
    const win = Math.random() < 0.5;
    const coin = win ? 'HEADS' : 'TAILS';

    // Animate briefly then show result
    let ticks = 0;
    const faces = ['\uD83E\uDE99', '\u{1FA99}'];
    const anim = setInterval(() => {
      btn.textContent = faces[ticks % 2];
      ticks++;
      if (ticks >= 10) {
        clearInterval(anim);
        this._resolveReckoning(win, coin, resultEl, btn);
      }
    }, 100);
  },

  _resolveReckoning(win, coin, resultEl, btn) {
    this.debt = 0;
    this.loanTime = 0;
    this.stopInterest();
    this._reckoningActive = false;

    if (win) {
      resultEl.textContent = `${coin} — You WIN! The Shark spares you. Debt cleared!`;
      resultEl.className = 'duel-result duel-win';
      btn.textContent = 'CLOSE';
      btn.disabled = false;
      btn.onclick = () => this.closeReckoning();
    } else {
      // Lose: reset rebirths, lock loans for 10 rebirths
      this._reckoningRebirthThreshold = (App.rebirth || 0) + 10;
      App.rebirth = 0;
      if (typeof Clicker !== 'undefined') {
        Clicker.updateRebirthUI();
        Clicker.renderUpgrades();
        Clicker.updateStats();
        Clicker.startAutoClicker();
        Clicker.startAutoBet();
      }
      resultEl.textContent = `${coin} — You LOSE! The Shark takes everything. Rebirths RESET. Rebirth 10 times before borrowing again.`;
      resultEl.className = 'duel-result duel-lose';
      btn.textContent = 'CLOSE';
      btn.disabled = false;
      btn.onclick = () => this.closeReckoning();
    }

    this.updateUI();
    this.updateDebtDisplay();
    App.save();
  },

  closeReckoning() {
    const overlay = document.getElementById('shark-reckoning');
    if (overlay) overlay.classList.add('hidden');
    // Reset onclick back to reckoningFlip for next time
    const btn = document.getElementById('reckoning-flip-btn');
    if (btn) btn.onclick = () => Loans.reckoningFlip();
  },

  // ============ BARGAIN SYSTEM ============

  startBargain() {
    const input = document.getElementById('loan-custom-amount');
    const amount = parseFloat(input?.value || 0);
    if (!amount || amount < 100) {
      alert('Enter a custom loan amount first, then click Bargain.');
      return;
    }
    const maxLoan = this.getMaxLoan();
    if (amount > maxLoan) {
      alert('Amount exceeds your max loan: ' + App.formatMoney(maxLoan));
      return;
    }

    this._pendingLoanAmount = amount;
    this._bargainState = {
      secret: Math.floor(Math.random() * 100) + 1,
      discount: 0,
      round: 0,
      maxRounds: 5,
      lastHint: null,
      lastGuess: null,
      range: { low: 1, high: 100 },
    };

    this._showDialogue('bargain');
    this._renderBargainOverlay();
  },

  _renderBargainOverlay() {
    const state = this._bargainState;
    if (!state) return;
    const overlay = document.getElementById('bargain-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');

    const roundEl = document.getElementById('bargain-round');
    const statusEl = document.getElementById('bargain-status');
    const discountEl = document.getElementById('bargain-discount');

    if (roundEl) roundEl.textContent = `Round ${state.round}/${state.maxRounds}`;
    if (statusEl) {
      if (state.round === 0) {
        statusEl.textContent = 'The shark thinks of a number 1-100. Guess Higher or Lower each round!';
      } else if (state.lastHint) {
        statusEl.textContent = `The number is ${state.lastHint} than ${state.lastGuess}!`;
      }
    }
    if (discountEl) {
      const d = state.discount;
      discountEl.textContent = d >= 0 ? `-${d}% interest discount` : `+${Math.abs(d)}% interest penalty`;
      discountEl.style.color = d >= 0 ? 'var(--green)' : 'var(--red)';
    }

    const highBtn = document.getElementById('bargain-high');
    const lowBtn = document.getElementById('bargain-low');
    const doneBtn = document.getElementById('bargain-done');
    const guessing = state.round < state.maxRounds;
    if (highBtn) highBtn.disabled = !guessing;
    if (lowBtn) lowBtn.disabled = !guessing;
    if (doneBtn) doneBtn.textContent = guessing ? `Take Loan (${state.discount >= 0 ? '-' : '+'}${Math.abs(state.discount)}%)` : 'Take Loan';
  },

  bargainGuess(direction) {
    const state = this._bargainState;
    if (!state || state.round >= state.maxRounds) return;

    state.round++;
    const mid = Math.floor((state.range.low + state.range.high) / 2);
    const correct = (direction === 'high' && state.secret > mid) || (direction === 'low' && state.secret <= mid);

    state.lastGuess = mid;
    state.lastHint = state.secret > mid ? 'higher' : 'lower';

    if (correct) {
      state.discount += 5;
      if (direction === 'high') state.range.low = mid + 1;
      else state.range.high = mid;
      this._showDialogue('bargain');
    } else {
      state.discount -= 3;
      if (direction === 'high') state.range.high = mid;
      else state.range.low = mid + 1;
      this._showDialogue('bargainFail');
    }

    this._renderBargainOverlay();
  },

  closeBargain(takeLoan) {
    const state = this._bargainState;
    const overlay = document.getElementById('bargain-overlay');
    if (overlay) overlay.classList.add('hidden');

    if (takeLoan && state) {
      this._bargainDiscount = Math.max(-20, Math.min(20, state.discount));
      const amount = this._pendingLoanAmount;
      this._bargainState = null;
      this._pendingLoanAmount = 0;
      const input = document.getElementById('loan-custom-amount');
      if (input) input.value = '';
      this.takeLoan(amount);
    } else {
      this._bargainState = null;
      this._pendingLoanAmount = 0;
    }
  },

  // ============ P2P LOANS ============

  _p2pLoans: {},
  _loanCache: {},   // { [loanId]: loanData } — localStorage-persisted for persistence
  _p2pTargetUid: null,

  filterBorrowerDropdown() {
    const input = document.getElementById('p2p-borrower-name');
    const dropdown = document.getElementById('p2p-name-dropdown');
    if (!input || !dropdown) return;
    const q = input.value.toLowerCase().trim();
    this._p2pTargetUid = null; // reset on typing

    if (!q || typeof Firebase === 'undefined') {
      dropdown.classList.add('hidden');
      return;
    }

    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    const matches = (Firebase.leaderboardData || [])
      .filter(e => e.uid !== myUid && (e.name || '').toLowerCase().includes(q))
      .slice(0, 5);

    if (matches.length === 0) {
      dropdown.classList.add('hidden');
      return;
    }

    dropdown.innerHTML = matches.map(e =>
      `<div class="p2p-name-option" onclick="Loans.selectBorrower('${(e.name || '').replace(/'/g, "\\'")}', '${e.uid}')">
        <span class="p2p-name-opt-avatar">${e.avatar || '\u{1F3B2}'}</span>
        <span class="p2p-name-opt-name">${e.name || 'Player'}</span>
        <span class="p2p-name-opt-tag">R${e.rebirths || 0}</span>
      </div>`
    ).join('');
    dropdown.classList.remove('hidden');
  },

  selectBorrower(name, uid) {
    const input = document.getElementById('p2p-borrower-name');
    const dropdown = document.getElementById('p2p-name-dropdown');
    if (input) input.value = name;
    if (dropdown) dropdown.classList.add('hidden');
    this._p2pTargetUid = uid;
  },

  _mergeLoans(incoming) {
    // Update cache with incoming data; never remove active entries
    for (const id in incoming) this._loanCache[id] = incoming[id];
    // Remove only fully resolved (paid/declined/forgiven) entries older than 5 minutes
    for (const id in this._loanCache) {
      const l = this._loanCache[id];
      if ((l.status === 'paid' || l.status === 'declined' || l.status === 'forgiven') &&
          Date.now() - (l.createdAt || 0) > 300000) {
        delete this._loanCache[id];
      }
    }
    this._p2pLoans = { ...this._loanCache };
    this._saveLoanCache();
  },

  _saveLoanCache() {
    try { localStorage.setItem('retros_loan_cache', JSON.stringify(this._loanCache)); } catch (e) {}
  },

  _loadLoanCache() {
    try {
      const raw = localStorage.getItem('retros_loan_cache');
      if (raw) this._loanCache = JSON.parse(raw);
    } catch (e) {}
    this._p2pLoans = { ...this._loanCache };
  },

  loadPlayerLoans() {
    // Pre-populate from cache while waiting for Firebase
    this._loadLoanCache();

    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) {
      setTimeout(() => this.loadPlayerLoans(), 3000);
      return;
    }
    const db = Firebase.db;
    const uid = Firebase.uid;
    if (!db || !uid) {
      setTimeout(() => this.loadPlayerLoans(), 3000);
      return;
    }

    // Listen for loans where I'm the lender
    db.ref('playerLoans').orderByChild('lenderId').equalTo(uid).on('value', snap => {
      const loans = snap.val() || {};
      this._mergeLoans(loans);
      this.renderPlayerLoans();
    });

    // Listen for loans where I'm the borrower
    db.ref('playerLoans').orderByChild('borrowerId').equalTo(uid).on('value', snap => {
      const loans = snap.val() || {};
      this._mergeLoans(loans);
      this.renderPlayerLoans();
    });

    // Listen for pending offers by my name
    const myName = (typeof Settings !== 'undefined' ? Settings.profile.name : '').toLowerCase();
    if (myName) {
      db.ref('playerLoans').orderByChild('borrowerNameLower').equalTo(myName).on('value', snap => {
        const loans = snap.val() || {};
        Object.entries(loans).forEach(([id, loan]) => {
          if (loan.status === 'pending') this._p2pLoans[id] = loan;
        });
        this.renderPlayerLoans();
      });
    }

    // Listen for payments received (as lender)
    db.ref('playerLoanPayments/' + uid).on('child_added', snap => {
      const payment = snap.val();
      if (!payment) return;
      App.addBalance(payment.amount);
      App.save();
      snap.ref.remove();
      Toast.show('\u{1F4B8} ' + payment.borrowerName + ' paid back ' + App.formatMoney(payment.amount) + '!');
    });

    // Listen for returned loan money (declined offers)
    db.ref('playerLoanReturns/' + uid).on('child_added', snap => {
      const ret = snap.val();
      if (!ret) return;
      App.addBalance(ret.amount);
      App.save();
      snap.ref.remove();
      Toast.show('\u{1F504} Loan declined \u2014 ' + App.formatMoney(ret.amount) + ' returned!');
    });
  },

  startPlayerLoanInterest() {
    this._p2pInterestTimer = setInterval(() => {
      const uid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
      const db = typeof Firebase !== 'undefined' ? Firebase.db : null;
      if (!uid || !db) return;
      Object.entries(this._p2pLoans).forEach(([id, loan]) => {
        if (loan.borrowerId !== uid || loan.status !== 'active') return;
        const rate = (loan.interestRate || 5) / 100;
        const current = loan.totalOwed || loan.amount;
        const newOwed = App.safeAdd(current, current * rate);
        db.ref('playerLoans/' + id + '/totalOwed').set(newOwed);
        this._p2pLoans[id].totalOwed = newOwed;
      });
      this.renderPlayerLoans();
    }, 60000);
  },

  createPlayerLoan() {
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) {
      alert('You need to be online to offer player loans.');
      return;
    }
    const nameInput = document.getElementById('p2p-borrower-name');
    const amountInput = document.getElementById('p2p-loan-amount');
    const rateInput = document.getElementById('p2p-interest-rate');

    const borrowerName = nameInput?.value?.trim();
    const amount = parseFloat(amountInput?.value || 0);
    const rate = parseFloat(rateInput?.value || 5);

    if (!borrowerName) { alert('Enter the borrower\'s name.'); return; }
    if (!amount || amount < 1) { alert('Enter a valid loan amount.'); return; }
    if (amount > App.balance) { alert('You don\'t have enough money.'); return; }
    if (rate < 1 || rate > 100) { alert('Interest rate must be 1-100%.'); return; }
    if (borrowerName.toLowerCase() === (typeof Settings !== 'undefined' ? Settings.profile.name : '').toLowerCase()) {
      alert('You can\'t loan to yourself.'); return;
    }

    const db = Firebase.db;
    const uid = Firebase.uid;
    const loanRef = db.ref('playerLoans').push();
    loanRef.set({
      lenderId: uid,
      lenderName: (typeof Settings !== 'undefined' ? Settings.profile.name : null) || 'Unknown',
      borrowerName,
      borrowerNameLower: borrowerName.toLowerCase(),
      borrowerId: this._p2pTargetUid || null,
      amount,
      totalOwed: amount,
      interestRate: rate,
      status: 'pending',
      createdAt: Date.now(),
    }).then(() => {
      App.addBalance(-amount);
      App.save();
      if (nameInput) nameInput.value = '';
      if (amountInput) amountInput.value = '';
      this._p2pTargetUid = null;
      alert('Loan offer of ' + App.formatMoney(amount) + ' sent to ' + borrowerName + '!');
    }).catch(err => alert('Failed: ' + err.message));
  },

  acceptPlayerLoan(loanId) {
    const loan = this._p2pLoans[loanId];
    if (!loan || loan.status !== 'pending') return;
    const uid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    if (!uid) return;
    Firebase.db.ref('playerLoans/' + loanId).update({
      borrowerId: uid,
      status: 'active',
      acceptedAt: Date.now(),
    }).then(() => {
      App.addBalance(loan.amount);
      App.save();
    });
  },

  declinePlayerLoan(loanId) {
    const loan = this._p2pLoans[loanId];
    if (!loan || loan.status !== 'pending') return;
    if (!confirm('Decline loan of ' + App.formatMoney(loan.amount) + ' from ' + loan.lenderName + '?')) return;
    const db = Firebase.db;
    db.ref('playerLoans/' + loanId).update({ status: 'declined' }).then(() => {
      db.ref('playerLoanReturns/' + loan.lenderId).push({
        amount: loan.amount,
        reason: 'declined',
        loanId,
        timestamp: Date.now(),
      });
      delete this._p2pLoans[loanId];
      this.renderPlayerLoans();
    });
  },

  forgivePlayerLoan(loanId) {
    const loan = this._p2pLoans[loanId];
    if (!loan) return;
    if (loan.lenderId !== Firebase.uid) return;
    if (!confirm('Forgive ' + loan.borrowerName + '\'s debt of ' + App.formatMoney(loan.totalOwed || loan.amount) + '?')) return;
    Firebase.db.ref('playerLoans/' + loanId).update({ status: 'forgiven' }).then(() => {
      delete this._p2pLoans[loanId];
      delete this._loanCache[loanId];
      this._saveLoanCache();
      this.renderPlayerLoans();
    });
  },

  forgivePartial(loanId, amount) {
    const loan = this._p2pLoans[loanId];
    if (!loan || loan.lenderId !== Firebase.uid) return;
    if (!amount || amount <= 0) { Toast.show('Enter a valid amount', '#ff5252', 2000); return; }
    const forgive = Math.min(amount, loan.totalOwed || loan.amount);
    const newOwed = Math.max(0, (loan.totalOwed || loan.amount) - forgive);
    if (newOwed <= 0) {
      this.forgivePlayerLoan(loanId);
    } else {
      Firebase.updatePlayerLoan(loanId, { totalOwed: newOwed }).then(() => {
        this._p2pLoans[loanId].totalOwed = newOwed;
        if (this._loanCache[loanId]) this._loanCache[loanId].totalOwed = newOwed;
        this._saveLoanCache();
        this.renderPlayerLoans();
        Toast.show('\u{1F4B8} Forgave ' + App.formatMoney(forgive) + ' of loan', '#27ae60', 3000);
      });
    }
  },

  payPlayerLoan(loanId) {
    const loan = this._p2pLoans[loanId];
    if (!loan || loan.status !== 'active') return;
    const owed = loan.totalOwed || loan.amount;
    const payAmount = Math.min(owed, App.balance);
    if (payAmount <= 0) { alert('Not enough money.'); return; }

    const db = Firebase.db;
    const newOwed = Math.max(0, owed - payAmount);
    App.addBalance(-payAmount);

    db.ref('playerLoanPayments/' + loan.lenderId).push({
      amount: payAmount,
      loanId,
      borrowerName: (typeof Settings !== 'undefined' ? Settings.profile.name : null) || 'Unknown',
      timestamp: Date.now(),
    });

    if (newOwed < 0.01) {
      db.ref('playerLoans/' + loanId).update({ status: 'paid', totalOwed: 0 }).then(() => {
        App.save();
        delete this._p2pLoans[loanId];
        this.renderPlayerLoans();
      });
    } else {
      db.ref('playerLoans/' + loanId + '/totalOwed').set(newOwed).then(() => {
        this._p2pLoans[loanId].totalOwed = newOwed;
        App.save();
        this.renderPlayerLoans();
      });
    }
  },

  // ============ COUNTER-LOAN (R5+) ============

  lendToShark(amount) {
    const maxLend = 1_000_000_000;
    if ((App.rebirth || 0) < 5) { alert('Requires Rebirth 5'); return; }
    if (!amount || amount < 1) { alert('Enter a valid amount.'); return; }
    if (amount > maxLend) { alert('Max lend: ' + App.formatMoney(maxLend)); return; }
    if (amount > App.balance) { alert('Not enough money.'); return; }
    if (this._counterLoan.amount > 0) { alert('You already have an active counter-loan. Recall it first.'); return; }
    App.addBalance(-amount);
    this._counterLoan = { amount, startedAt: Date.now(), lastPaidAt: Date.now(), totalEarned: 0 };
    this._startCounterLoanTimer();
    App.save();
    this._renderCounterLoanSection();
  },

  _startCounterLoanTimer() {
    if (this._counterLoanTimer) clearInterval(this._counterLoanTimer);
    if (this._counterLoan.amount <= 0) return;
    this._counterLoanTimer = setInterval(() => this._collectSharkPayment(), 60000);
  },

  _collectSharkPayment() {
    if (this._counterLoan.amount <= 0) {
      clearInterval(this._counterLoanTimer);
      this._counterLoanTimer = null;
      return;
    }
    const roll = Math.random();
    if (roll < 0.80) {
      const payment = this._counterLoan.amount * 0.08;
      App.addBalance(payment);
      this._counterLoan.totalEarned += payment;
      this._counterLoan.lastPaidAt = Date.now();
      Toast.show('\u{1F4B0} Shark paid: +' + App.formatMoney(payment) + ' (Counter-Loan)', 'var(--green)');
    } else {
      const msg = this._counterLoanSkipMessages[Math.floor(Math.random() * this._counterLoanSkipMessages.length)];
      Toast.show('\u{1F988} ' + msg, 'var(--bg3)');
    }
    App.save();
    this._renderCounterLoanSection();
  },

  recallCounterLoan() {
    if (this._counterLoan.amount <= 0) return;
    App.addBalance(this._counterLoan.amount);
    Toast.show('\u{1F4B5} Counter-loan recalled: +' + App.formatMoney(this._counterLoan.amount) + ' returned', 'var(--green)', 3000);
    this._counterLoan = { amount: 0, startedAt: 0, lastPaidAt: 0, totalEarned: 0 };
    if (this._counterLoanTimer) { clearInterval(this._counterLoanTimer); this._counterLoanTimer = null; }
    App.save();
    this._renderCounterLoanSection();
  },

  _renderCounterLoanSection() {
    const el = document.getElementById('counter-loan-section');
    if (!el) return;
    const cl = this._counterLoan;
    if (cl.amount > 0) {
      const elapsed = Math.floor((Date.now() - cl.startedAt) / 60000);
      el.innerHTML = `<div class="counter-loan-active">
        <div class="cl-stat"><span>Lent:</span><strong>${App.formatMoney(cl.amount)}</strong></div>
        <div class="cl-stat"><span>Earned:</span><strong class="stock-up">+${App.formatMoney(cl.totalEarned)}</strong></div>
        <div class="cl-stat"><span>Time:</span><span>${elapsed}m ago</span></div>
        <div class="cl-note">Shark pays 8%/min (may skip)</div>
        <button class="loan-btn" onclick="Loans.recallCounterLoan()">Recall Principal</button>
      </div>`;
    } else {
      el.innerHTML = `<div class="counter-loan-form">
        <div class="cl-note">Lend up to $50,000 to the shark — earns 8%/min (80% chance each minute)</div>
        <div class="loan-custom-row">
          <input type="number" id="counter-loan-amount" class="loan-custom-input" placeholder="Amount to lend..." max="50000">
          <button class="loan-custom-btn" onclick="Loans.lendToShark(parseFloat(document.getElementById('counter-loan-amount').value))">Lend</button>
        </div>
      </div>`;
    }
  },

  // ============ SHARK NEGOTIATOR (R5+) ============

  buyNegotiator() {
    if ((App.rebirth || 0) < 5) { alert('Requires Rebirth 5'); return; }
    if (this._negotiatorPurchased) return;
    const cost = Math.floor(this.getMaxLoan() * 0.05);
    if (App.balance < cost) { alert('Need ' + App.formatMoney(cost)); return; }
    App.addBalance(-cost);
    this._negotiatorPurchased = true;
    this._interestReduction = 0.10;
    App.save();
    this._renderNegotiatorSection();
    Toast.show('\u{1F91D} Negotiator hired! Interest permanently -10%', 'var(--green)');
  },

  _renderNegotiatorSection() {
    const el = document.getElementById('negotiator-section');
    if (!el) return;
    const cost = Math.floor(this.getMaxLoan() * 0.05);
    if (this._negotiatorPurchased) {
      el.innerHTML = `<div class="negotiator-purchased">
        \u{1F91D} Shark Negotiator active — interest -10% <span style="color:var(--green)">✓ Purchased</span>
      </div>`;
    } else {
      el.innerHTML = `<div class="negotiator-form">
        <div class="cl-note">Hire a negotiator to permanently reduce shark interest by 10%.</div>
        <button class="loan-btn ${App.balance >= cost ? '' : 'loan-locked'}" onclick="Loans.buyNegotiator()">
          Hire Negotiator — ${App.formatMoney(cost)}
        </button>
      </div>`;
    }
  },

  // ============ RIGGED DECK (R5+) ============

  buyRiggedDeck(type) {
    if ((App.rebirth || 0) < 5) { alert('Requires Rebirth 5'); return; }
    const cost = 25000;
    if (App.balance < cost) { alert('Need ' + App.formatMoney(cost)); return; }
    if (!this._riggedDecks[type] && this._riggedDecks[type] !== 0) { alert('Unknown deck type'); return; }
    App.addBalance(-cost);
    this._riggedDecks[type] += 3;
    App.save();
    this._renderBlackMarketSection();
    Toast.show('\u{1F0CF} Rigged ' + (type === 'blackjack' ? 'Blackjack Deck' : 'Coin') + ' — 3 uses added!', '#ff9100', 3000);
  },

  useRiggedDeck(type) {
    if (!this._riggedDecks[type] || this._riggedDecks[type] <= 0) return false;
    this._riggedDecks[type]--;
    App.save();
    return true;
  },

  _renderBlackMarketSection() {
    const el = document.getElementById('black-market-section');
    if (!el) return;
    const bjUses = this._riggedDecks.blackjack;
    const cfUses = this._riggedDecks.coinflip;
    el.innerHTML = `
      <div class="bm-item">
        <div class="bm-info">
          <span class="bm-name">\u{1F0CF} Rigged Blackjack Deck</span>
          <span class="bm-desc">Dealer hits to 18 instead of 17 (3 uses)</span>
          <span class="bm-uses">${bjUses} use${bjUses !== 1 ? 's' : ''} remaining</span>
        </div>
        <button class="loan-btn ${App.balance >= 25000 ? '' : 'loan-locked'}" onclick="Loans.buyRiggedDeck('blackjack')">$25,000</button>
      </div>
      <div class="bm-item">
        <div class="bm-info">
          <span class="bm-name">\u{1FA99} Rigged Coin</span>
          <span class="bm-desc">+5% win chance next flip (3 uses)</span>
          <span class="bm-uses">${cfUses} use${cfUses !== 1 ? 's' : ''} remaining</span>
        </div>
        <button class="loan-btn ${App.balance >= 25000 ? '' : 'loan-locked'}" onclick="Loans.buyRiggedDeck('coinflip')">$25,000</button>
      </div>`;
  },

  // ============ SAVE / LOAD ============

  getSaveData() {
    return {
      debt: this.debt,
      loanTime: this.loanTime,
      bargainDiscount: this._bargainDiscount,
      duelCooldown: this.duelCooldown,
      reckoningRebirthThreshold: this._reckoningRebirthThreshold,
      reckoningActive: this._reckoningActive,
      counterLoan: this._counterLoan,
      negotiatorPurchased: this._negotiatorPurchased,
      interestReduction: this._interestReduction,
      riggedDecks: this._riggedDecks,
      totalDebtPaid: this._totalPaid || 0,
    };
  },

  loadSaveData(data) {
    if (!data) return;
    this.debt = data.debt || 0;
    this.loanTime = data.loanTime || 0;
    this._bargainDiscount = data.bargainDiscount || 0;
    this.duelCooldown = data.duelCooldown || 0;
    this._reckoningRebirthThreshold = data.reckoningRebirthThreshold || 0;
    if (data.reckoningActive) {
      this._reckoningActive = true;
      // Re-show reckoning overlay on next tick (DOM may not be ready yet)
      setTimeout(() => {
        const overlay = document.getElementById('shark-reckoning');
        if (overlay) overlay.classList.remove('hidden');
      }, 500);
    }
    if (data.counterLoan) this._counterLoan = Object.assign(this._counterLoan, data.counterLoan);
    if (data.negotiatorPurchased) this._negotiatorPurchased = true;
    if (data.interestReduction) this._interestReduction = data.interestReduction;
    if (data.riggedDecks) this._riggedDecks = Object.assign(this._riggedDecks, data.riggedDecks);
    if (data.totalDebtPaid) this._totalPaid = data.totalDebtPaid;
  },
};
