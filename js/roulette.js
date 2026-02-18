const Roulette = {
  // American roulette wheel order (38 slots)
  wheelOrder: [
    0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1,
    '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2
  ],
  reds: [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36],
  blacks: [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35],

  spinning: false,
  bets: {},
  totalBet: 0,
  lastResult: null,
  history: [],

  // Auto-spin
  autoSpin: false,
  autoTimer: null,
  autoCountdown: 0,
  countdownInterval: null,

  // Canvas / animation state
  canvas: null,
  ctx: null,
  dpr: 1,
  wheelAngle: 0,  // will be set in init
  ballAngle: 0,   // will be set in init
  ballRadius: 0,
  ballSettled: true,

  getBet() { return Math.max(0.01, Math.round((Number(document.getElementById('rl-bet').value) || 0) * 100) / 100); },
  halfBet() { document.getElementById('rl-bet').value = Math.max(0.01, Math.round(this.getBet() / 2 * 100) / 100); },
  doubleBet() { document.getElementById('rl-bet').value = this.getBet() * 2; },
  maxBet() { document.getElementById('rl-bet').value = Math.floor(App.balance * 100) / 100; },

  init() {
    this.canvas = document.getElementById('rl-wheel');
    if (!this.canvas) return;
    this.dpr = window.devicePixelRatio || 1;
    const size = 300;
    this.canvas.width = size * this.dpr;
    this.canvas.height = size * this.dpr;
    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';
    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(this.dpr, this.dpr);
    // Position wheel so slot 0 is under the pointer (top = -PI/2)
    const sliceA = (Math.PI * 2) / this.wheelOrder.length;
    this.wheelAngle = -Math.PI / 2 - sliceA / 2;
    this.ballAngle = -Math.PI / 2 - this.wheelAngle; // ball at top
    this.ballRadius = 108;
    this.drawWheel(this.wheelAngle, 1);
    this.renderBoard();
    this.renderBets();
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

    this.renderBets();
    this.highlightBoard();
    this.onBetChange();
  },

  clearBets() {
    if (this.spinning) return;
    if (!Admin.godMode) App.addBalance(this.totalBet);
    this.bets = {};
    this.totalBet = 0;
    this.renderBets();
    this.highlightBoard();
    this.showResult('', '');
    this.onBetChange();
  },

  // === SPIN ===
  spin() {
    if (this.spinning) return;
    if (this.totalBet === 0) {
      this.showResult('Place a bet first!', 'lose');
      return;
    }

    this.spinning = true;
    this.showResult('', '');

    // Determine result
    const g = Rig.games.roulette;
    let resultIdx;

    if (g && g.forceNumber !== null && g.forceNumber !== undefined && g.forceNumber !== -1) {
      resultIdx = this.wheelOrder.indexOf(g.forceNumber);
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

    // The pointer is at the top (-PI/2).
    // Wheel slice i starts at: wheelAngle + i * sliceAngle
    // For slot resultIdx to be under the pointer:
    //   wheelAngle + resultIdx * sliceAngle + sliceAngle/2 = -PI/2  (mod 2PI)
    // So target wheelAngle = -PI/2 - resultIdx * sliceAngle - sliceAngle/2

    const sliceAngle = (Math.PI * 2) / this.wheelOrder.length;
    const targetSlotAngle = -Math.PI / 2 - resultIdx * sliceAngle - sliceAngle / 2;
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const targetWheelAngle = targetSlotAngle - extraSpins * Math.PI * 2;

    const startWheelAngle = this.wheelAngle;
    const totalWheelRotation = targetWheelAngle - startWheelAngle;
    const duration = 4500;
    const startTime = performance.now();

    // Ball spins opposite direction, then settles into the winning slot
    const ballExtraSpins = 7 + Math.floor(Math.random() * 3);
    // Ball final angle: sit in the winning slot (top = -PI/2 in world coords)
    // Ball is drawn at ballAngle + wheelAngle, so for it to be at -PI/2:
    //   ballAngle + targetWheelAngle = -PI/2
    //   ballAngle = -PI/2 - targetWheelAngle
    const targetBallAngle = -Math.PI / 2 - targetWheelAngle;
    const startBallAngle = this.ballAngle || 0;
    const totalBallRotation = targetBallAngle + ballExtraSpins * Math.PI * 2 - startBallAngle;

    this.ballSettled = false;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Wheel: ease out cubic
      const wheelEase = 1 - Math.pow(1 - progress, 3);
      this.wheelAngle = startWheelAngle + totalWheelRotation * wheelEase;

      // Ball: ease out quartic (slightly different timing for realism)
      const ballEase = 1 - Math.pow(1 - progress, 4);
      this.ballAngle = startBallAngle + totalBallRotation * ballEase;

      // Ball radius: starts outer, spirals inward in last 30%
      const outerBallR = 125;
      const innerBallR = 108;
      if (progress < 0.7) {
        this.ballRadius = outerBallR;
      } else {
        const settleProgress = (progress - 0.7) / 0.3;
        const settleEase = settleProgress * settleProgress;
        this.ballRadius = outerBallR - (outerBallR - innerBallR) * settleEase;
      }

      this.drawWheel(this.wheelAngle, progress < 0.05 ? -1 : 1);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.ballSettled = true;
        this.ballRadius = innerBallR;
        this.drawWheel(this.wheelAngle, 1);
        this.finishSpin(resultNum);
      }
    };

    requestAnimationFrame(animate);
  },

  finishSpin(resultNum) {
    this.spinning = false;
    const color = this.getColor(resultNum);

    let totalWin = 0;
    for (const [type, amount] of Object.entries(this.bets)) {
      const mult = this.checkWin(type, resultNum);
      if (mult > 0) totalWin += amount * mult;
    }

    App.addBalance(totalWin);

    const numStr = resultNum === '00' ? '00' : resultNum.toString();
    if (totalWin > 0) {
      this.showResult(numStr + ' ' + color.toUpperCase() + ' \u2014 Won ' + App.formatMoney(totalWin) + '!', 'win');
      GameStats.record('roulette', 'win', totalWin - this.totalBet);
    } else {
      this.showResult(numStr + ' ' + color.toUpperCase() + ' \u2014 Lost ' + App.formatMoney(this.totalBet), 'lose');
      GameStats.record('roulette', 'lose', this.totalBet);
    }

    this.history.unshift({ num: resultNum, color });
    if (this.history.length > 20) this.history.length = 20;
    this.renderHistory();

    // In auto mode, re-place the same bets for next round
    if (this.autoSpin) {
      const prevBets = { ...this.bets };
      const prevTotal = this.totalBet;
      this.bets = {};
      this.totalBet = 0;

      // Re-place bets if player can afford it
      if (prevTotal <= App.balance || Admin.godMode) {
        this.bets = prevBets;
        this.totalBet = prevTotal;
        if (!Admin.godMode) App.addBalance(-prevTotal);
        this.renderBets();
        this.highlightBoard();
        this.startAutoCountdown();
      } else {
        // Can't afford, stop auto
        this.autoSpin = false;
        const btn = document.getElementById('rl-auto-btn');
        if (btn) { btn.textContent = 'Auto: OFF'; btn.classList.remove('rl-auto-active'); }
        this.renderBets();
        this.highlightBoard();
        this.showResult('Auto stopped \u2014 not enough money', 'lose');
      }
    } else {
      this.bets = {};
      this.totalBet = 0;
      this.renderBets();
      this.highlightBoard();
    }
  },

  // === DRAW WHEEL ===
  drawWheel(angle, ballSlotIdx) {
    const ctx = this.ctx;
    const size = 300;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = 140;
    const innerR = 100;
    const sliceAngle = (Math.PI * 2) / this.wheelOrder.length;

    ctx.clearRect(0, 0, size, size);

    // Outer wooden rim with 3D effect
    const rimGrad = ctx.createRadialGradient(cx, cy, outerR - 5, cx, cy, outerR + 4);
    rimGrad.addColorStop(0, '#5d4037');
    rimGrad.addColorStop(0.5, '#8d6e63');
    rimGrad.addColorStop(1, '#3e2723');
    ctx.beginPath();
    ctx.arc(cx, cy, outerR + 4, 0, Math.PI * 2);
    ctx.fillStyle = rimGrad;
    ctx.fill();

    // Ball track (chrome ring)
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw slices - full radius so color covers both inner and number ring
    for (let i = 0; i < this.wheelOrder.length; i++) {
      const start = angle + i * sliceAngle;
      const end = start + sliceAngle;
      const num = this.wheelOrder[i];
      const color = this.getColor(num);
      const midAngle = start + sliceAngle / 2;

      // Full colored slice from center to outer edge
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR - 2, start, end);
      ctx.closePath();

      if (color === 'red') {
        ctx.fillStyle = '#c62828';
      } else if (color === 'black') {
        ctx.fillStyle = '#1a1a1a';
      } else {
        ctx.fillStyle = '#2e7d32';
      }
      ctx.fill();

      // Gold divider line between slices
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(start) * 22, cy + Math.sin(start) * 22);
      ctx.lineTo(cx + Math.cos(start) * (outerR - 2), cy + Math.sin(start) * (outerR - 2));
      ctx.strokeStyle = '#ffd74055';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Subtle inner darker shade for 3D depth
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, innerR, start, end);
      ctx.closePath();

      if (color === 'red') {
        ctx.fillStyle = '#b71c1c';
      } else if (color === 'black') {
        ctx.fillStyle = '#111';
      } else {
        ctx.fillStyle = '#1b5e20';
      }
      ctx.fill();

      // Number text in the outer colored ring
      const textR = (innerR + outerR - 2) / 2;
      const tx = cx + Math.cos(midAngle) * textR;
      const ty = cy + Math.sin(midAngle) * textR;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(midAngle + Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 2;
      ctx.fillText(num === '00' ? '00' : num.toString(), 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Ring divider between number ring and inner ring
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffd740';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center hub - 3D metallic look
    const hubGrad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, 22);
    hubGrad.addColorStop(0, '#ffd740');
    hubGrad.addColorStop(0.3, '#c8a415');
    hubGrad.addColorStop(0.7, '#8d6e00');
    hubGrad.addColorStop(1, '#3e2c00');
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.strokeStyle = '#ffd740';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Hub spokes
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 / 8) * i + angle * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8);
      ctx.lineTo(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18);
      ctx.strokeStyle = '#ffd74088';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Ball - ballAngle is in world coordinates (includes wheel offset)
    if (ballSlotIdx >= 0) {
      const ballA = this.ballAngle + angle;
      const br = this.ballRadius || 108;
      const bx = cx + Math.cos(ballA) * br;
      const by = cy + Math.sin(ballA) * br;

      // Ball shadow
      ctx.beginPath();
      ctx.arc(bx + 2, by + 2, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fill();

      // Ball with 3D shine
      const ballGrad = ctx.createRadialGradient(bx - 2, by - 2, 1, bx, by, 6);
      ballGrad.addColorStop(0, '#ffffff');
      ballGrad.addColorStop(0.4, '#e0e0e0');
      ballGrad.addColorStop(1, '#999');
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fillStyle = ballGrad;
      ctx.fill();
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Pointer triangle at top
    ctx.fillStyle = '#ffd740';
    ctx.beginPath();
    ctx.moveTo(cx - 10, 3);
    ctx.lineTo(cx + 10, 3);
    ctx.lineTo(cx, 20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c8a415';
    ctx.lineWidth = 1;
    ctx.stroke();
  },

  // === WINNING LOGIC ===
  getWinningNumbers(betType) {
    if (betType === 'red') return [...this.reds];
    if (betType === 'black') return [...this.blacks];
    if (betType === 'green') return [0, '00'];
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
    // Split bets (e.g. "split:1,2")
    if (betType.startsWith('split:')) {
      return betType.slice(6).split(',').map(n => n === '00' ? '00' : parseInt(n));
    }
    // Street bets (e.g. "street:1")
    if (betType.startsWith('street:')) {
      const base = parseInt(betType.slice(7));
      return [base, base + 1, base + 2];
    }
    // Corner bets (e.g. "corner:1")
    if (betType.startsWith('corner:')) {
      const base = parseInt(betType.slice(7));
      return [base, base + 1, base + 3, base + 4];
    }
    // Single number
    const num = betType === '00' ? '00' : parseInt(betType);
    return [num];
  },

  checkWin(betType, resultNum) {
    const n = resultNum === '00' ? -1 : resultNum;

    if (betType === 'red') return this.reds.includes(resultNum) ? 2 : 0;
    if (betType === 'black') return this.blacks.includes(resultNum) ? 2 : 0;
    if (betType === 'green') return (resultNum === 0 || resultNum === '00') ? 18 : 0;
    if (betType === 'odd') return (n > 0 && n % 2 === 1) ? 2 : 0;
    if (betType === 'even') return (n > 0 && n % 2 === 0) ? 2 : 0;
    if (betType === '1-18') return (n >= 1 && n <= 18) ? 2 : 0;
    if (betType === '19-36') return (n >= 19 && n <= 36) ? 2 : 0;
    if (betType === '1st12') return (n >= 1 && n <= 12) ? 3 : 0;
    if (betType === '2nd12') return (n >= 13 && n <= 24) ? 3 : 0;
    if (betType === '3rd12') return (n >= 25 && n <= 36) ? 3 : 0;
    if (betType === 'col1') return [1,4,7,10,13,16,19,22,25,28,31,34].includes(n) ? 3 : 0;
    if (betType === 'col2') return [2,5,8,11,14,17,20,23,26,29,32,35].includes(n) ? 3 : 0;
    if (betType === 'col3') return [3,6,9,12,15,18,21,24,27,30,33,36].includes(n) ? 3 : 0;
    // Split (2 numbers)
    if (betType.startsWith('split:')) {
      const nums = betType.slice(6).split(',').map(x => x === '00' ? '00' : parseInt(x));
      return nums.some(x => x === resultNum || (x === '00' && resultNum === '00')) ? 18 : 0;
    }
    // Street (3 numbers)
    if (betType.startsWith('street:')) {
      const base = parseInt(betType.slice(7));
      return (n >= base && n <= base + 2) ? 12 : 0;
    }
    // Corner (4 numbers)
    if (betType.startsWith('corner:')) {
      const base = parseInt(betType.slice(7));
      return [base, base+1, base+3, base+4].includes(n) ? 9 : 0;
    }

    // Straight number bet
    const betNum = betType === '00' ? '00' : parseInt(betType);
    return resultNum === betNum ? 36 : 0;
  },

  // === RENDER BOARD ===
  renderBoard() {
    const board = document.getElementById('rl-board');
    if (!board) return;
    board.innerHTML = '';

    // --- Classic 3-column table layout ---
    const table = document.createElement('div');
    table.className = 'rl-table';

    // Zero row (0 and 00 spanning left side)
    const zeroRow = document.createElement('div');
    zeroRow.className = 'rl-zero-row';
    for (const z of [0, '00']) {
      const btn = document.createElement('button');
      btn.className = 'rl-cell rl-green';
      btn.textContent = z === '00' ? '00' : '0';
      btn.dataset.bet = z.toString();
      btn.onclick = () => this.placeBet(z.toString());
      zeroRow.appendChild(btn);
    }
    table.appendChild(zeroRow);

    // Main 12x3 number grid (rows of 3: 1-2-3, 4-5-6, ... 34-35-36)
    const numGrid = document.createElement('div');
    numGrid.className = 'rl-num-grid';

    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 3; col++) {
        const num = row * 3 + col + 1;
        const color = this.getColor(num);
        const btn = document.createElement('button');
        btn.className = 'rl-cell rl-' + color;
        btn.textContent = num;
        btn.dataset.bet = num.toString();
        btn.onclick = () => this.placeBet(num.toString());
        numGrid.appendChild(btn);
      }
    }
    table.appendChild(numGrid);

    // Column bets (2:1)
    const colRow = document.createElement('div');
    colRow.className = 'rl-col-row';
    for (let c = 1; c <= 3; c++) {
      const btn = document.createElement('button');
      btn.className = 'rl-cell rl-outside';
      btn.textContent = '2:1';
      btn.dataset.bet = 'col' + c;
      btn.onclick = () => this.placeBet('col' + c);
      colRow.appendChild(btn);
    }
    table.appendChild(colRow);

    // Dozen bets
    const dozRow = document.createElement('div');
    dozRow.className = 'rl-doz-row';
    for (const [label, type] of [['1st 12', '1st12'], ['2nd 12', '2nd12'], ['3rd 12', '3rd12']]) {
      const btn = document.createElement('button');
      btn.className = 'rl-cell rl-outside rl-wide';
      btn.textContent = label;
      btn.dataset.bet = type;
      btn.onclick = () => this.placeBet(type);
      dozRow.appendChild(btn);
    }
    table.appendChild(dozRow);

    // Outside bets (bottom row)
    const outsideRow = document.createElement('div');
    outsideRow.className = 'rl-outside-row';
    const outsideBets = [
      { label: '1-18', type: '1-18' },
      { label: 'EVEN', type: 'even' },
      { label: 'RED', type: 'red', cls: 'rl-red' },
      { label: 'BLK', type: 'black', cls: 'rl-black' },
      { label: 'ODD', type: 'odd' },
      { label: '19-36', type: '19-36' },
    ];
    for (const b of outsideBets) {
      const btn = document.createElement('button');
      btn.className = 'rl-cell rl-outside-btn ' + (b.cls || '');
      btn.textContent = b.label;
      btn.dataset.bet = b.type;
      btn.onclick = () => this.placeBet(b.type);
      outsideRow.appendChild(btn);
    }
    table.appendChild(outsideRow);

    // Green bet shortcut
    const greenRow = document.createElement('div');
    greenRow.className = 'rl-green-row';
    const greenBtn = document.createElement('button');
    greenBtn.className = 'rl-cell rl-green rl-green-bet';
    greenBtn.textContent = 'GREEN (18x)';
    greenBtn.dataset.bet = 'green';
    greenBtn.onclick = () => this.placeBet('green');
    greenRow.appendChild(greenBtn);
    table.appendChild(greenRow);

    board.appendChild(table);
  },

  highlightBoard() {
    // Highlight cells that have bets
    document.querySelectorAll('.rl-cell').forEach(cell => {
      const bet = cell.dataset.bet;
      if (bet && this.bets[bet]) {
        cell.classList.add('rl-has-bet');
        // Show chip on cell
        let chip = cell.querySelector('.rl-chip');
        if (!chip) {
          chip = document.createElement('span');
          chip.className = 'rl-chip';
          cell.appendChild(chip);
        }
        chip.textContent = App.formatMoney(this.bets[bet]).replace('$', '');
      } else {
        cell.classList.remove('rl-has-bet');
        const chip = cell.querySelector('.rl-chip');
        if (chip) chip.remove();
      }
    });
  },

  renderBets() {
    const el = document.getElementById('rl-current-bets');
    if (!el) return;
    const entries = Object.entries(this.bets);
    if (entries.length === 0) {
      el.innerHTML = '<span style="color:var(--text-dim)">No bets placed</span>';
      return;
    }
    const total = entries.reduce((s, [, a]) => s + a, 0);
    el.innerHTML = '<span style="color:var(--gold);font-weight:700">Total: ' + App.formatMoney(total) + '</span> &mdash; ' +
      entries.map(([type, amount]) =>
        `<span class="rl-bet-chip">${this.betLabel(type)}: ${App.formatMoney(amount)}</span>`
      ).join(' ');
  },

  betLabel(type) {
    const labels = {
      'red': 'Red', 'black': 'Black', 'green': 'Green',
      'odd': 'Odd', 'even': 'Even',
      '1-18': '1-18', '19-36': '19-36',
      '1st12': '1st 12', '2nd12': '2nd 12', '3rd12': '3rd 12',
      'col1': 'Col 1', 'col2': 'Col 2', 'col3': 'Col 3'
    };
    if (labels[type]) return labels[type];
    if (type.startsWith('split:')) return 'Split ' + type.slice(6);
    if (type.startsWith('street:')) return 'Street ' + type.slice(7);
    if (type.startsWith('corner:')) return 'Corner ' + type.slice(7);
    return '#' + type;
  },

  renderHistory() {
    const el = document.getElementById('rl-history');
    if (!el) return;
    el.innerHTML = this.history.map(h => {
      const numStr = h.num === '00' ? '00' : h.num.toString();
      return `<span class="rl-h-${h.color}">${numStr}</span>`;
    }).join('');
  },

  // === AUTO-SPIN ===
  toggleAutoSpin() {
    this.autoSpin = !this.autoSpin;
    const btn = document.getElementById('rl-auto-btn');
    const display = document.getElementById('rl-auto-timer');

    if (this.autoSpin) {
      btn.textContent = 'Auto: ON';
      btn.classList.add('rl-auto-active');
      // If we have bets and not spinning, start countdown
      if (this.totalBet > 0 && !this.spinning) {
        this.startAutoCountdown();
      }
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
    if (display) display.textContent = 'Spinning in 5s...';

    this.countdownInterval = setInterval(() => {
      this.autoCountdown--;
      if (display) {
        if (this.autoCountdown > 0) {
          display.textContent = 'Spinning in ' + this.autoCountdown + 's...';
        } else {
          display.textContent = '';
        }
      }

      if (this.autoCountdown <= 0) {
        this.clearAutoCountdown();
        if (this.autoSpin && this.totalBet > 0 && !this.spinning) {
          this.spin();
        }
      }
    }, 1000);
  },

  clearAutoCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  },

  // Called when placing/clearing bets to reset auto-timer
  onBetChange() {
    if (this.autoSpin && this.totalBet > 0 && !this.spinning) {
      this.startAutoCountdown();
    } else {
      this.clearAutoCountdown();
      const display = document.getElementById('rl-auto-timer');
      if (display) display.textContent = '';
    }
  },

  showResult(text, cls) {
    const el = document.getElementById('rl-result');
    el.textContent = text;
    el.className = 'game-result ' + cls;
  }
};
