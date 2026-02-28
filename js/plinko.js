const Plinko = {
  canvas: null,
  ctx: null,
  balls: [],
  pegs: [],
  buckets: [],
  pegFlash: [],
  animFrame: null,
  canvasReady: false,
  _layout: null,

  // Physics constants
  GRAVITY: 0.3,
  RESTITUTION: 0.5,
  FRICTION: 0.97,
  BALL_R: 5,
  PEG_R: 4,
  TRAIL_LEN: 10,

  // Auto-drop state
  autoDropping: false,
  autoRemaining: 0,
  autoTotal: 0,
  autoTimer: null,
  autoProfit: 0,

  multipliers: {
    low: {
      8:  [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
      10: [8.9, 3, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 3, 8.9],
      12: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
      14: [7.1, 4, 1.9, 1.4, 1.3, 1.1, 1, 0.5, 1, 1.1, 1.3, 1.4, 1.9, 4, 7.1],
      16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16]
    },
    medium: {
      8:  [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
      10: [22, 5, 2, 1.4, 0.6, 0.4, 0.6, 1.4, 2, 5, 22],
      12: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
      14: [43, 13, 6, 3, 1.3, 0.7, 0.4, 0.2, 0.4, 0.7, 1.3, 3, 6, 13, 43],
      16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110]
    },
    high: {
      8:  [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
      10: [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76],
      12: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
      14: [420, 56, 18, 5, 1.9, 0.3, 0.2, 0.2, 0.2, 0.3, 1.9, 5, 18, 56, 420],
      16: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000]
    }
  },

  getBet()    { const v = App.parseAmount(document.getElementById('plinko-bet').value); return Math.max(0.01, isNaN(v) ? 0.01 : v); },
  halfBet()   { App.setBetInput(document.getElementById('plinko-bet'), this.getBet() / 2); },
  doubleBet() { App.setBetInput(document.getElementById('plinko-bet'), this.getBet() * 2); },
  maxBet()    { document.getElementById('plinko-bet').value = 'max'; },
  getRows()   { return parseInt(document.getElementById('plinko-rows').value); },
  getRisk()   { return document.getElementById('plinko-risk').value; },

  initCanvas() {
    this.canvas = document.getElementById('plinko-canvas');
    const parent = this.canvas.parentElement;
    const w = Math.min(parent.clientWidth || 350, 430);
    this.canvas.width  = w;
    this.canvas.height = Math.round(w * 1.12);
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = this.canvas.height + 'px';
    this.ctx = this.canvas.getContext('2d');
    this.canvasReady = true;
    this.balls = [];
    this._buildBoard();
    this._draw();
    this.populateBucketSelect();
  },

  onSettingsChange() {
    this.balls = [];
    if (this.animFrame) { cancelAnimationFrame(this.animFrame); this.animFrame = null; }
    if (this.canvasReady) { this._buildBoard(); this._draw(); }
    this.populateBucketSelect();
  },

  populateBucketSelect() {
    const sel = document.getElementById('plinko-rig-bucket');
    if (!sel) return;
    const mults = this.multipliers[this.getRisk()][this.getRows()];
    sel.innerHTML = '<option value="-1">Random</option>';
    mults.forEach((m, i) => { sel.innerHTML += `<option value="${i}">Bucket ${i} (${m}x)</option>`; });
  },

  // Build peg and bucket data arrays from current rows/risk settings
  _buildBoard() {
    const rows     = this.getRows();
    const risk     = this.getRisk();
    const mults    = this.multipliers[risk][rows];
    const w        = this.canvas.width;
    const h        = this.canvas.height;
    const topPad   = 32;
    const botPad   = 44;
    const rowH     = (h - topPad - botPad) / rows;
    const maxPegs  = rows + 1;
    const pegSpac  = (w - 40) / maxPegs;

    this._layout = { topPad, botPad, rowH, pegSpac, w, h, rows, mults };

    this.pegs = [];
    for (let r = 0; r < rows; r++) {
      const cnt = r + 3;
      const rowW = (cnt - 1) * pegSpac;
      const sx   = (w - rowW) / 2;
      const y    = topPad + r * rowH;
      for (let p = 0; p < cnt; p++) {
        this.pegs.push({ x: sx + p * pegSpac, y, r: this.PEG_R, row: r, col: p });
      }
    }
    this.pegFlash = new Array(this.pegs.length).fill(0);

    this.buckets = [];
    const lastCnt = rows + 2;
    const lastW   = (lastCnt - 1) * pegSpac;
    const lastSX  = (w - lastW) / 2;
    const bucketY = topPad + rows * rowH;
    for (let i = 0; i <= rows; i++) {
      this.buckets.push({ x: lastSX + i * pegSpac, y: bucketY, w: pegSpac, mult: mults[i] });
    }
  },

  // Full canvas redraw
  _draw() {
    if (!this.canvasReady || !this._layout) return;
    const ctx  = this.ctx;
    const { w, h, botPad } = this._layout;
    ctx.clearRect(0, 0, w, h);

    // Pegs
    for (let i = 0; i < this.pegs.length; i++) {
      const peg   = this.pegs[i];
      const flash = this.pegFlash[i];
      if (flash > 0) {
        ctx.fillStyle = `rgba(255, 220, 60, ${flash / 10 * 0.5})`;
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.r + 4, 0, Math.PI * 2);
        ctx.fill();
        this.pegFlash[i] = Math.max(0, flash - 1);
      }
      ctx.fillStyle = flash > 0 ? '#ffe066' : '#9a9a9a';
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Buckets
    const bh = 30;
    for (const b of this.buckets) {
      const m = b.mult;
      let color;
      if (m >= 10) color = '#ff1744';
      else if (m >= 3) color = '#ff9100';
      else if (m >= 1) color = '#ffd740';
      else color = '#69f0ae';

      ctx.fillStyle = color + '33';
      ctx.fillRect(b.x - b.w / 2 + 2, b.y + 4, b.w - 4, bh);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x - b.w / 2 + 2, b.y + 4, b.w - 4, bh);

      ctx.fillStyle = color;
      const fs = Math.max(7, Math.min(11, Math.floor(b.w * 0.38)));
      ctx.font = `bold ${fs}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(m + 'x', b.x, b.y + 4 + bh * 0.66);
    }

    // Balls
    for (const ball of this.balls) {
      // Trail
      for (let t = 0; t < ball.trail.length; t++) {
        const frac  = t / ball.trail.length;
        const alpha = frac * 0.35;
        const r     = this.BALL_R * frac * 0.75;
        if (r < 1) continue;
        ctx.fillStyle = `rgba(0,230,118,${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(ball.trail[t].x, ball.trail[t].y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // Ball
      ctx.fillStyle = ball.done ? '#00e67688' : '#00e676';
      ctx.shadowColor = '#00e676';
      ctx.shadowBlur  = ball.done ? 0 : 10;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, this.BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  },

  drop() {
    const bet = this.getBet();
    if (bet > App.balance && !Admin.godMode) { this.showResult('Not enough money!', 'lose'); return; }
    if (!Admin.godMode) App.addBalance(-bet);
    this.showResult('', '');
    if (!this.canvasReady || !this._layout) return;

    const { w, topPad, rows, mults } = this._layout;
    const g = Rig.games.plinko;

    // Decide target bucket
    let targetBucket = -1;
    if (g.forceBucket >= 0)      targetBucket = g.forceBucket;
    else if (g.alwaysEdge)       targetBucket = Math.random() < 0.5 ? 0 : mults.length - 1;

    // Pre-compute per-row left/right decisions for guided drops
    let decisions = null;
    if (targetBucket >= 0) {
      decisions = [];
      let pos = 0;
      for (let r = 0; r < rows; r++) {
        const remaining   = targetBucket - pos;
        const stepsLeft   = rows - r;
        const goRight     = remaining > 0 && (Math.random() < remaining / stepsLeft);
        if (goRight) pos++;
        decisions.push(goRight);
      }
    }

    // Soft rig bias (persistent horizontal drift each frame)
    let hBias = 0;
    if (!decisions && Rig.enabled) {
      const winRate = Rig.winRate / 100;
      if (winRate < 0.45) {
        hBias = (Math.random() < 0.5 ? -1 : 1) * (0.45 - winRate) * 0.15;
      }
    }

    const ball = {
      x: w / 2 + (Math.random() - 0.5) * 5,
      y: topPad - 14,
      vx: (Math.random() - 0.5) * 1.2,
      vy: 0.5,
      hBias,
      decisions,
      lastHitRow: -1,
      bet,
      mults,
      trail: [],
      done: false,
      _doneFrames: 0,
    };

    this.balls.push(ball);
    if (!this.animFrame) this._startAnim();
  },

  _startAnim() {
    const step = () => {
      this._physicsStep();
      this._draw();
      if (this.balls.length > 0) {
        this.animFrame = requestAnimationFrame(step);
      } else {
        this.animFrame = null;
      }
    };
    this.animFrame = requestAnimationFrame(step);
  },

  _physicsStep() {
    const { w, h, botPad, topPad } = this._layout;
    const G    = this.GRAVITY;
    const REST = this.RESTITUTION;
    const FRIC = this.FRICTION;
    const BR   = this.BALL_R;
    const PR   = this.PEG_R;
    const floor = h - botPad + 20;
    const wallL = 8 + BR;
    const wallR = w - 8 - BR;

    for (const ball of this.balls) {
      if (ball.done) {
        ball._doneFrames++;
        continue;
      }

      // Trail
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > this.TRAIL_LEN) ball.trail.shift();

      // Gravity + persistent horizontal bias
      ball.vy += G;
      if (ball.hBias) { ball.vx += ball.hBias; ball.vx *= 0.997; }

      ball.x += ball.vx;
      ball.y += ball.vy;

      // Side walls
      if (ball.x < wallL) { ball.x = wallL; ball.vx =  Math.abs(ball.vx) * 0.6; }
      if (ball.x > wallR) { ball.x = wallR; ball.vx = -Math.abs(ball.vx) * 0.6; }

      // Peg collisions
      for (let i = 0; i < this.pegs.length; i++) {
        const peg = this.pegs[i];
        const dx  = ball.x - peg.x;
        const dy  = ball.y - peg.y;
        const d2  = dx * dx + dy * dy;
        const min = BR + PR;
        if (d2 >= min * min || d2 === 0) continue;

        const dist = Math.sqrt(d2);
        const nx   = dx / dist;
        const ny   = dy / dist;

        // Reflect velocity
        const dot = ball.vx * nx + ball.vy * ny;
        ball.vx = (ball.vx - 2 * dot * nx) * REST;
        ball.vy = (ball.vy - 2 * dot * ny) * REST;
        ball.vx *= FRIC;

        // Always keep some downward momentum
        if (ball.vy < 0.3) ball.vy = 0.3;

        // Separate from peg
        const overlap = min - dist + 0.5;
        ball.x += nx * overlap;
        ball.y += ny * overlap;

        // Flash
        this.pegFlash[i] = 10;

        // Guided row decision (rig / force bucket)
        const row = peg.row;
        if (ball.decisions && row !== undefined && row > ball.lastHitRow) {
          ball.lastHitRow = row;
          const goRight = ball.decisions[row];
          // If ball is already going the right direction, leave it alone
          // Otherwise give it a push — looks natural since pegs have randomness
          if (goRight && ball.vx < 0.2) {
            ball.vx = Math.abs(ball.vx) + 0.8;
          } else if (!goRight && ball.vx > -0.2) {
            ball.vx = -(Math.abs(ball.vx) + 0.8);
          }
        }
      }

      // Bucket floor
      if (ball.y + BR >= floor) {
        ball.y  = floor - BR;
        ball.vy = 0;
        ball.vx = 0;
        ball.done = true;

        const bIdx    = this._findBucket(ball.x);
        const mult    = ball.mults[bIdx];
        const winning = Math.round(ball.bet * mult * 100) / 100;
        if (winning > 0) App.addBalance(winning);

        const net    = winning - ball.bet;
        const isWin  = net > 0;
        const result = isWin ? 'win' : winning > 0 ? 'push' : 'lose';

        if (!this.autoDropping) {
          this.showResult(mult + 'x \u2014 ' + (winning > 0 ? 'Won ' + App.formatMoney(winning) : 'Lost'), result);
        }

        if (isWin) { GameStats.record('plinko', 'win', net); App.recordWin(); }
        else {
          GameStats.record('plinko', 'lose', ball.bet - winning);
          App.recordLoss();
          if (typeof Stocks !== 'undefined') Stocks.onCasinoLoss(ball.bet - winning);
        }

        if (this.autoDropping || this.autoTotal > 0) {
          this.autoProfit = App.safeAdd(this.autoProfit, net);
          this.updateAutoStatus();
        }
      }
    }

    // Remove balls that have been settled for a short while
    this.balls = this.balls.filter(b => !b.done || b._doneFrames < 18);
  },

  _findBucket(x) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < this.buckets.length; i++) {
      const d = Math.abs(x - this.buckets[i].x);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  },

  showResult(text, cls) {
    const el = document.getElementById('plinko-result');
    if (!el) return;
    el.textContent = text;
    el.className = 'game-result ' + cls;
  },

  // === AUTO DROP ===
  toggleAuto() { this.autoDropping ? this.stopAuto() : this.startAuto(); },

  startAuto() {
    const count = parseInt(document.getElementById('plinko-auto-count').value) || 10;
    if (count < 1) return;
    const bet = this.getBet();
    if (bet * count > App.balance && !Admin.godMode) { this.showResult('Not enough for ' + count + ' drops!', 'lose'); return; }

    this.autoDropping = true;
    this.autoRemaining = count;
    this.autoTotal = count;
    this.autoProfit = 0;

    const btn = document.getElementById('plinko-auto-btn');
    btn.textContent = 'STOP';
    btn.classList.add('plinko-auto-active');

    this.updateAutoStatus();
    this.autoDropNext();
  },

  stopAuto() {
    this.autoDropping = false;
    this.autoRemaining = 0;
    if (this.autoTimer) { clearTimeout(this.autoTimer); this.autoTimer = null; }

    const btn = document.getElementById('plinko-auto-btn');
    btn.textContent = 'Auto: OFF';
    btn.classList.remove('plinko-auto-active');

    const status = document.getElementById('plinko-auto-status');
    if (this.autoTotal > 0) {
      const profitText = this.autoProfit >= 0
        ? 'Profit: +' + App.formatMoney(this.autoProfit)
        : 'Loss: '    + App.formatMoney(this.autoProfit);
      status.textContent = 'Done! ' + (this.autoTotal - this.autoRemaining) + '/' + this.autoTotal + ' dropped. ' + profitText;
      status.className = 'plinko-auto-status ' + (this.autoProfit >= 0 ? 'auto-profit' : 'auto-loss');
    } else {
      status.textContent = '';
    }
  },

  autoDropNext() {
    if (!this.autoDropping || this.autoRemaining <= 0) { this.stopAuto(); return; }
    const bet = this.getBet();
    if (bet > App.balance && !Admin.godMode) { this.showResult('Ran out of money!', 'lose'); this.stopAuto(); return; }

    this.drop();
    this.autoRemaining--;
    this.updateAutoStatus();

    const delay = Math.max(100, 380 - this.autoTotal * 2);
    this.autoTimer = setTimeout(() => this.autoDropNext(), delay);
  },

  updateAutoStatus() {
    const status = document.getElementById('plinko-auto-status');
    if (!status) return;
    const dropped = this.autoTotal - this.autoRemaining;
    const profitText = this.autoProfit >= 0 ? '+' + App.formatMoney(this.autoProfit) : App.formatMoney(this.autoProfit);
    status.textContent = 'Dropping: ' + dropped + '/' + this.autoTotal + ' | ' + profitText;
    status.className = 'plinko-auto-status ' + (this.autoProfit >= 0 ? 'auto-profit' : 'auto-loss');
  },
};
