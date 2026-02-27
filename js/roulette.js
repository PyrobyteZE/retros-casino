const Roulette = {
  // European roulette wheel order (37 slots, single zero)
  wheelOrder: [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ],
  reds: [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36],
  blacks: [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35],

  spinning: false,
  bets: {},
  totalBet: 0,
  lastResult: null,
  lastWin: 0,
  history: [],

  // Auto-spin
  autoSpin: false,
  autoTimer: null,
  autoCountdown: 0,
  countdownInterval: null,

  getBet() {
    const raw = document.getElementById('rl-bet')?.value || '0';
    const parsed = App.parseAmount(raw);
    if (isNaN(parsed) || parsed <= 0) return 0.01;
    return Math.max(0.01, Math.round(parsed * 100) / 100);
  },
  halfBet()   { const el = document.getElementById('rl-bet'); if (el) el.value = Math.max(0.01, Math.round(this.getBet() / 2 * 100) / 100); },
  doubleBet() { const el = document.getElementById('rl-bet'); if (el) el.value = this.getBet() * 2; },
  maxBet()    { const el = document.getElementById('rl-bet'); if (el) el.value = Math.floor(App.balance * 100) / 100; },
  minBet()    { const el = document.getElementById('rl-bet'); if (el) el.value = '1'; },
  pctBet()    { const el = document.getElementById('rl-bet'); if (el) el.value = Math.max(1, Math.floor(App.balance * 0.1 * 100) / 100); },

  init() {
    this.renderBoard();
    this.renderStats();
    this.renderHistory();
  },

  getColor(num) {
    if (num === 0 || num === '00') return 'green';
    if (this.reds.includes(typeof num === 'string' ? parseInt(num) : num)) return 'red';
    return 'black';
  },

  // === BETTING ===
  placeBet(type) {
    if (this.spinning) return;
    const amount = this.getBet();
    if (amount > App.balance && !Admin.godMode) return;

    if (!this.bets[type]) this.bets[type] = 0;
    this.bets[type] += amount;
    this.totalBet += amount;
    if (!Admin.godMode) App.addBalance(-amount);

    this.highlightBoard();
    this.renderStats();
    this.onBetChange();
  },

  clearBets() {
    if (this.spinning) return;
    if (!Admin.godMode) App.addBalance(this.totalBet);
    this.bets = {};
    this.totalBet = 0;
    this.highlightBoard();
    this.renderStats();
    this.showResult('', '');
    this.onBetChange();
  },

  // === SPIN ===
  spin() {
    if (this.spinning) return;
    if (this.totalBet === 0) {
      Toast.show('Place a bet first!', '#ff5252', 2000);
      return;
    }

    this.spinning = true;
    const spinBtn = document.getElementById('rl-spin-btn');
    if (spinBtn) { spinBtn.textContent = 'Spinning\u2026'; spinBtn.disabled = true; }

    // Determine result
    const g = Rig.games.roulette;
    let resultIdx;

    if (g && g.forceNumber !== null && g.forceNumber !== undefined && g.forceNumber !== -1) {
      resultIdx = this.wheelOrder.indexOf(+g.forceNumber);
      if (resultIdx < 0) resultIdx = Math.floor(Math.random() * this.wheelOrder.length);
      g.forceNumber = -1;
      const sel = document.getElementById('rl-rig-num');
      if (sel) sel.value = 'none';
    } else if (Rig.enabled && Rig.shouldWin() && Object.keys(this.bets).length > 0) {
      const bestBet = Object.entries(this.bets).sort((a, b) => b[1] - a[1])[0][0];
      const winners = this.getWinningNumbers(bestBet);
      if (winners.length > 0) {
        const winNum = winners[Math.floor(Math.random() * winners.length)];
        resultIdx = this.wheelOrder.indexOf(winNum);
      } else {
        resultIdx = Math.floor(Math.random() * this.wheelOrder.length);
      }
    } else {
      resultIdx = Math.floor(Math.random() * this.wheelOrder.length);
    }

    if (resultIdx < 0) resultIdx = 0;
    const resultNum = this.wheelOrder[resultIdx];

    this._doSpinAnimation(resultNum, () => {
      this.finishSpin(resultNum);
      if (spinBtn) spinBtn.disabled = false;
    });
  },

  _doSpinAnimation(resultNum, callback) {
    const box    = document.getElementById('rl-result-box');
    const numEl  = document.getElementById('rl-result-num');
    const labelEl = document.getElementById('rl-result-label');

    if (!numEl) { callback(); return; }

    if (box) box.className = 'rl-result-box rl-rb-spinning';
    if (labelEl) labelEl.textContent = 'Rolling\u2026';

    let step = 55;
    let elapsed = 0;
    const duration = 2600;

    const roll = () => {
      const n = Math.floor(Math.random() * 37);
      const c = this.getColor(n);
      numEl.textContent = n;
      numEl.className = 'rl-result-num rl-rn-' + c;

      elapsed += step;
      if (elapsed < duration) {
        if (elapsed > duration * 0.55) step = 110;
        if (elapsed > duration * 0.75) step = 230;
        if (elapsed > duration * 0.90) step = 450;
        setTimeout(roll, step);
      } else {
        const fc = this.getColor(resultNum);
        numEl.textContent = resultNum;
        numEl.className = 'rl-result-num rl-rn-' + fc;
        if (box) {
          box.className = 'rl-result-box rl-rb-' + fc + ' rl-rb-flash';
          setTimeout(() => { if (box) box.classList.remove('rl-rb-flash'); }, 600);
        }
        setTimeout(callback, 400);
      }
    };
    setTimeout(roll, step);
  },

  finishSpin(resultNum) {
    this.spinning = false;
    const color = this.getColor(resultNum);
    const spinBtn = document.getElementById('rl-spin-btn');

    let totalWin = 0;
    for (const [type, amount] of Object.entries(this.bets)) {
      const mult = this.checkWin(type, resultNum);
      if (mult > 0) totalWin += amount * mult;
    }

    App.addBalance(totalWin);

    const numStr = resultNum.toString();
    if (totalWin > 0) {
      const net = totalWin - this.totalBet;
      this.lastWin = net;
      this.showResult(numStr + ' ' + color.toUpperCase() + ' \u2014 Won ' + App.formatMoney(net) + '!', 'win');
      GameStats.record('roulette', 'win', net);
      App.recordWin();
    } else {
      this.lastWin = 0;
      this.showResult(numStr + ' ' + color.toUpperCase() + ' \u2014 Lost ' + App.formatMoney(this.totalBet), 'lose');
      GameStats.record('roulette', 'lose', this.totalBet);
      App.recordLoss();
    }

    this.history.unshift({ num: resultNum, color });
    if (this.history.length > 20) this.history.length = 20;
    this.renderHistory();

    if (this.autoSpin) {
      const prevBets = { ...this.bets };
      const prevTotal = this.totalBet;
      this.bets = {};
      this.totalBet = 0;

      if (prevTotal <= App.balance || Admin.godMode) {
        this.bets = prevBets;
        this.totalBet = prevTotal;
        if (!Admin.godMode) App.addBalance(-prevTotal);
        this.highlightBoard();
        this.renderStats();
        if (spinBtn) spinBtn.textContent = 'SPIN';
        this.startAutoCountdown();
      } else {
        this.autoSpin = false;
        const btn = document.getElementById('rl-auto-btn');
        if (btn) { btn.textContent = 'Auto: OFF'; btn.classList.remove('rl-auto-active'); }
        this.highlightBoard();
        this.renderStats();
        Toast.show('Auto stopped \u2014 not enough money', '#ff5252', 3000);
        if (spinBtn) spinBtn.textContent = 'SPIN';
      }
    } else {
      this.bets = {};
      this.totalBet = 0;
      this.highlightBoard();
      this.renderStats();
      if (spinBtn) spinBtn.textContent = 'SPIN';
    }
  },

  // === WINNING LOGIC ===
  getWinningNumbers(betType) {
    if (betType === 'red') return [...this.reds];
    if (betType === 'black') return [...this.blacks];
    if (betType === 'odd') return this.reds.concat(this.blacks).filter(n => n % 2 === 1);
    if (betType === 'even') return this.reds.concat(this.blacks).filter(n => n % 2 === 0);
    if (betType === '1-18') return Array.from({length: 18}, (_, i) => i + 1);
    if (betType === '19-36') return Array.from({length: 18}, (_, i) => i + 19);
    if (betType === '1st12') return Array.from({length: 12}, (_, i) => i + 1);
    if (betType === '2nd12') return Array.from({length: 12}, (_, i) => i + 13);
    if (betType === '3rd12') return Array.from({length: 12}, (_, i) => i + 25);
    if (betType === 'col1') return [1,4,7,10,13,16,19,22,25,28,31,34];
    if (betType === 'col2') return [2,5,8,11,14,17,20,23,26,29,32,35];
    if (betType === 'col3') return [3,6,9,12,15,18,21,24,27,30,33,36];
    if (betType.startsWith('split:')) return betType.slice(6).split(',').map(n => parseInt(n));
    if (betType.startsWith('street:')) { const b = parseInt(betType.slice(7)); return [b, b+1, b+2]; }
    if (betType.startsWith('corner:')) { const b = parseInt(betType.slice(7)); return [b, b+1, b+3, b+4]; }
    return [parseInt(betType)];
  },

  checkWin(betType, resultNum) {
    const n = typeof resultNum === 'number' ? resultNum : parseInt(resultNum);

    if (betType === 'red')    return this.reds.includes(n) ? 2 : 0;
    if (betType === 'black')  return this.blacks.includes(n) ? 2 : 0;
    if (betType === 'odd')    return (n > 0 && n % 2 === 1) ? 2 : 0;
    if (betType === 'even')   return (n > 0 && n % 2 === 0) ? 2 : 0;
    if (betType === '1-18')   return (n >= 1 && n <= 18) ? 2 : 0;
    if (betType === '19-36')  return (n >= 19 && n <= 36) ? 2 : 0;
    if (betType === '1st12')  return (n >= 1 && n <= 12) ? 3 : 0;
    if (betType === '2nd12')  return (n >= 13 && n <= 24) ? 3 : 0;
    if (betType === '3rd12')  return (n >= 25 && n <= 36) ? 3 : 0;
    if (betType === 'col1')   return [1,4,7,10,13,16,19,22,25,28,31,34].includes(n) ? 3 : 0;
    if (betType === 'col2')   return [2,5,8,11,14,17,20,23,26,29,32,35].includes(n) ? 3 : 0;
    if (betType === 'col3')   return [3,6,9,12,15,18,21,24,27,30,33,36].includes(n) ? 3 : 0;
    if (betType.startsWith('split:')) {
      const nums = betType.slice(6).split(',').map(x => parseInt(x));
      return nums.includes(n) ? 18 : 0;
    }
    if (betType.startsWith('street:')) {
      const b = parseInt(betType.slice(7));
      return (n >= b && n <= b + 2) ? 12 : 0;
    }
    if (betType.startsWith('corner:')) {
      const b = parseInt(betType.slice(7));
      return [b, b+1, b+3, b+4].includes(n) ? 9 : 0;
    }
    return resultNum === parseInt(betType) ? 36 : 0;
  },

  // === RENDER BOARD (horizontal European layout) ===
  renderBoard() {
    const board = document.getElementById('rl-board');
    if (!board) return;
    board.innerHTML = '';

    const table = document.createElement('div');
    table.className = 'rl-table';

    // === Main row: 0 | 3×12 number grid | Col bets ===
    const main = document.createElement('div');
    main.className = 'rl-table-main';

    // 0 cell (left, spans 3 rows)
    const zeroBtn = document.createElement('button');
    zeroBtn.className = 'rl-cell rl-green rl-zero-cell';
    zeroBtn.textContent = '0';
    zeroBtn.dataset.bet = '0';
    zeroBtn.onclick = () => this.placeBet('0');
    main.appendChild(zeroBtn);

    // Number grid: top row = col3 (3,6,9...), mid = col2 (2,5,8...), bot = col1 (1,4,7...)
    const numGrid = document.createElement('div');
    numGrid.className = 'rl-num-grid';
    const rows = [
      [3,6,9,12,15,18,21,24,27,30,33,36],
      [2,5,8,11,14,17,20,23,26,29,32,35],
      [1,4,7,10,13,16,19,22,25,28,31,34],
    ];
    for (const row of rows) {
      for (const num of row) {
        const color = this.getColor(num);
        const btn = document.createElement('button');
        btn.className = 'rl-cell rl-' + color;
        btn.textContent = num;
        btn.dataset.bet = num.toString();
        btn.onclick = () => this.placeBet(num.toString());
        numGrid.appendChild(btn);
      }
    }
    main.appendChild(numGrid);

    // Col bets (right, top-to-bottom = col3, col2, col1 matching rows)
    const colBets = document.createElement('div');
    colBets.className = 'rl-col-bets';
    for (let c = 3; c >= 1; c--) {
      const btn = document.createElement('button');
      btn.className = 'rl-cell rl-outside rl-col-btn';
      btn.textContent = '2:1';
      btn.dataset.bet = 'col' + c;
      btn.onclick = () => this.placeBet('col' + c);
      colBets.appendChild(btn);
    }
    main.appendChild(colBets);
    table.appendChild(main);

    // === Dozens ===
    const dozRow = document.createElement('div');
    dozRow.className = 'rl-doz-row';
    for (const [label, type] of [['1st 12','1st12'],['2nd 12','2nd12'],['3rd 12','3rd12']]) {
      const btn = document.createElement('button');
      btn.className = 'rl-cell rl-outside';
      btn.textContent = label;
      btn.dataset.bet = type;
      btn.onclick = () => this.placeBet(type);
      dozRow.appendChild(btn);
    }
    table.appendChild(dozRow);

    // === Outside bets ===
    const outsideRow = document.createElement('div');
    outsideRow.className = 'rl-outside-row';
    const outside = [
      { label:'1-18',  type:'1-18' },
      { label:'EVEN',  type:'even' },
      { label:'RED',   type:'red',   cls:'rl-red' },
      { label:'BLACK', type:'black', cls:'rl-black' },
      { label:'ODD',   type:'odd' },
      { label:'19-36', type:'19-36' },
    ];
    for (const b of outside) {
      const btn = document.createElement('button');
      btn.className = 'rl-cell rl-outside-btn' + (b.cls ? ' ' + b.cls : '');
      btn.textContent = b.label;
      btn.dataset.bet = b.type;
      btn.onclick = () => this.placeBet(b.type);
      outsideRow.appendChild(btn);
    }
    table.appendChild(outsideRow);
    board.appendChild(table);
  },

  highlightBoard() {
    document.querySelectorAll('.rl-cell').forEach(cell => {
      const bet = cell.dataset.bet;
      if (bet && this.bets[bet]) {
        cell.classList.add('rl-has-bet');
        let chip = cell.querySelector('.rl-chip');
        if (!chip) { chip = document.createElement('span'); chip.className = 'rl-chip'; cell.appendChild(chip); }
        chip.textContent = App.formatMoney(this.bets[bet]).replace('$', '');
      } else {
        cell.classList.remove('rl-has-bet');
        const chip = cell.querySelector('.rl-chip');
        if (chip) chip.remove();
      }
    });
  },

  // === STATS & BET INFO ===
  renderStats() {
    const betEl  = document.getElementById('rl-stat-bet');
    const potEl  = document.getElementById('rl-stat-pot');
    const lastEl = document.getElementById('rl-stat-last');
    const selEl  = document.getElementById('rl-bet-selection');
    const oddsEl = document.getElementById('rl-odds');
    const spinBtn = document.getElementById('rl-spin-btn');

    if (betEl) betEl.textContent = this.totalBet > 0 ? App.formatMoney(this.totalBet) : '$0';

    // Potential win = sum of each bet's gross return
    let potWin = 0;
    for (const [type, amount] of Object.entries(this.bets)) {
      potWin += amount * this._oddsMultiplier(type);
    }
    if (potEl) potEl.textContent = potWin > 0 ? App.formatMoney(potWin) : '$0';
    if (lastEl) lastEl.textContent = this.lastWin > 0 ? App.formatMoney(this.lastWin) : '$0';

    // Bet info bar
    const entries = Object.entries(this.bets);
    if (entries.length === 0) {
      if (selEl) selEl.textContent = 'No bet selected';
      if (oddsEl) oddsEl.textContent = '0:1';
    } else if (entries.length === 1) {
      const [type, amount] = entries[0];
      if (selEl) selEl.textContent = this.betLabel(type) + ': ' + App.formatMoney(amount);
      if (oddsEl) oddsEl.textContent = this._oddsText(type);
    } else {
      if (selEl) selEl.textContent = entries.length + ' bets \u2014 ' + App.formatMoney(this.totalBet);
      if (oddsEl) oddsEl.textContent = 'Mixed';
    }

    // Spin button label
    if (spinBtn && !this.spinning) {
      if (this.totalBet === 0) {
        spinBtn.textContent = 'ENTER BET AMOUNT';
        spinBtn.style.opacity = '0.6';
      } else {
        spinBtn.textContent = 'SPIN \u2014 ' + App.formatMoney(this.totalBet);
        spinBtn.style.opacity = '1';
      }
    }
  },

  _oddsMultiplier(betType) {
    if (!betType) return 0;
    if (betType.startsWith('split:')) return 18;
    if (betType.startsWith('street:')) return 12;
    if (betType.startsWith('corner:')) return 9;
    if (['1st12','2nd12','3rd12','col1','col2','col3'].includes(betType)) return 3;
    if (['red','black','odd','even','1-18','19-36'].includes(betType)) return 2;
    return 36; // straight number (including 0)
  },

  _oddsText(betType) {
    const m = this._oddsMultiplier(betType);
    return m > 0 ? (m - 1) + ':1' : '0:1';
  },

  renderHistory() {
    const el = document.getElementById('rl-history');
    if (!el) return;
    el.innerHTML = this.history.map(h => {
      const numStr = h.num.toString();
      return `<span class="rl-h-${h.color}">${numStr}</span>`;
    }).join('');
  },

  showResult(text, cls) {
    const labelEl = document.getElementById('rl-result-label');
    if (labelEl) {
      if (!text) {
        labelEl.textContent = 'Place your bet!';
        labelEl.style.color = 'var(--text-dim)';
      } else {
        labelEl.textContent = text;
        labelEl.style.color = cls === 'win' ? '#66bb6a' : cls === 'lose' ? '#ef5350' : 'var(--text-dim)';
      }
    }
    // Reset result box to neutral when clearing
    if (!text) {
      const box = document.getElementById('rl-result-box');
      const numEl = document.getElementById('rl-result-num');
      if (box) box.className = 'rl-result-box';
      if (numEl) { numEl.textContent = '-'; numEl.className = 'rl-result-num'; }
    }
  },

  betLabel(type) {
    const labels = {
      'red':'Red', 'black':'Black', 'odd':'Odd', 'even':'Even',
      '1-18':'1-18', '19-36':'19-36',
      '1st12':'1st 12', '2nd12':'2nd 12', '3rd12':'3rd 12',
      'col1':'Col 1', 'col2':'Col 2', 'col3':'Col 3'
    };
    if (labels[type]) return labels[type];
    if (type.startsWith('split:'))  return 'Split ' + type.slice(6);
    if (type.startsWith('street:')) return 'Street ' + type.slice(7);
    if (type.startsWith('corner:')) return 'Corner ' + type.slice(7);
    return '#' + type;
  },

  // === AUTO-SPIN ===
  toggleAutoSpin() {
    this.autoSpin = !this.autoSpin;
    const btn = document.getElementById('rl-auto-btn');
    const display = document.getElementById('rl-auto-timer');

    if (this.autoSpin) {
      btn.textContent = 'Auto: ON';
      btn.classList.add('rl-auto-active');
      if (this.totalBet > 0 && !this.spinning) this.startAutoCountdown();
    } else {
      btn.textContent = 'Auto: OFF';
      btn.classList.remove('rl-auto-active');
      this.clearAutoCountdown();
      if (display) display.textContent = '';
    }
  },

  startAutoCountdown() {
    this.clearAutoCountdown();
    if (!this.autoSpin) return;
    this.autoCountdown = 5;
    const display = document.getElementById('rl-auto-timer');
    if (display) display.textContent = 'Spinning in 5s\u2026';

    this.countdownInterval = setInterval(() => {
      this.autoCountdown--;
      if (display) {
        display.textContent = this.autoCountdown > 0 ? 'Spinning in ' + this.autoCountdown + 's\u2026' : '';
      }
      if (this.autoCountdown <= 0) {
        this.clearAutoCountdown();
        if (this.autoSpin && this.totalBet > 0 && !this.spinning) this.spin();
      }
    }, 1000);
  },

  clearAutoCountdown() {
    if (this.countdownInterval) { clearInterval(this.countdownInterval); this.countdownInterval = null; }
  },

  onBetChange() {
    if (this.autoSpin && this.totalBet > 0 && !this.spinning) {
      this.startAutoCountdown();
    } else {
      this.clearAutoCountdown();
      const display = document.getElementById('rl-auto-timer');
      if (display) display.textContent = '';
    }
  },
};
