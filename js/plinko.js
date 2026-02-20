const Plinko = {
  canvas: null,
  ctx: null,
  balls: [],
  pegs: [],
  buckets: [],
  animFrame: null,
  canvasReady: false,

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

  getBet() { return Math.max(0.01, Math.round((Number(document.getElementById('plinko-bet').value) || 0) * 100) / 100); },
  halfBet() { document.getElementById('plinko-bet').value = Math.max(0.01, Math.round(this.getBet() / 2 * 100) / 100); },
  doubleBet() { document.getElementById('plinko-bet').value = this.getBet() * 2; },
  maxBet() { document.getElementById('plinko-bet').value = Math.floor(App.balance).toFixed(0); },

  getRows() { return parseInt(document.getElementById('plinko-rows').value); },
  getRisk() { return document.getElementById('plinko-risk').value; },

  initCanvas() {
    this.canvas = document.getElementById('plinko-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvasReady = true;
    this.balls = [];
    this.drawBoard();
    this.populateBucketSelect();
  },

  onSettingsChange() {
    this.balls = [];
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
    this.drawBoard();
    this.populateBucketSelect();
  },

  populateBucketSelect() {
    const sel = document.getElementById('plinko-rig-bucket');
    if (!sel) return;
    const rows = this.getRows();
    const risk = this.getRisk();
    const mults = this.multipliers[risk][rows];
    sel.innerHTML = '<option value="-1">Random</option>';
    mults.forEach((m, i) => {
      sel.innerHTML += `<option value="${i}">Bucket ${i} (${m}x)</option>`;
    });
  },

  drawBoard() {
    if (!this.canvasReady) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const rows = this.getRows();
    const risk = this.getRisk();
    const mults = this.multipliers[risk][rows];

    ctx.clearRect(0, 0, w, h);

    const pegRadius = 3;
    const topPadding = 30;
    const bottomPadding = 40;
    const rowSpacing = (h - topPadding - bottomPadding) / rows;
    const maxPegsInRow = rows + 1;
    const pegSpacing = (w - 40) / maxPegsInRow;

    this.pegs = [];

    ctx.fillStyle = '#888';
    for (let r = 0; r < rows; r++) {
      const pegsInRow = r + 3;
      const rowWidth = (pegsInRow - 1) * pegSpacing;
      const startX = (w - rowWidth) / 2;
      const y = topPadding + r * rowSpacing;

      for (let p = 0; p < pegsInRow; p++) {
        const x = startX + p * pegSpacing;
        this.pegs.push({ x, y, r: pegRadius });
        ctx.beginPath();
        ctx.arc(x, y, pegRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    this.buckets = [];
    const bucketCount = rows + 1;
    const lastRowPegs = rows + 2;
    const lastRowWidth = (lastRowPegs - 1) * pegSpacing;
    const lastStartX = (w - lastRowWidth) / 2;
    const bucketY = topPadding + rows * rowSpacing;
    const bucketW = pegSpacing;

    for (let i = 0; i < bucketCount; i++) {
      const bx = lastStartX + i * pegSpacing;
      this.buckets.push({ x: bx, y: bucketY, w: bucketW, mult: mults[i] });

      const mult = mults[i];
      let color;
      if (mult >= 10) color = '#ff1744';
      else if (mult >= 3) color = '#ff9100';
      else if (mult >= 1) color = '#ffd740';
      else color = '#69f0ae';

      ctx.fillStyle = color;
      ctx.fillRect(bx - bucketW / 2 + 2, bucketY + 8, bucketW - 4, 24);

      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(mult + 'x', bx, bucketY + 24);
    }

    for (const ball of this.balls) {
      ctx.fillStyle = '#00e676';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  drop() {
    const bet = this.getBet();
    if (bet > App.balance && !Admin.godMode) {
      this.showResult('Not enough money!', 'lose');
      return;
    }

    if (!Admin.godMode) App.addBalance(-bet);
    this.showResult('', '');

    const rows = this.getRows();
    const risk = this.getRisk();
    const w = this.canvas.width;
    const h = this.canvas.height;
    const topPadding = 30;
    const bottomPadding = 40;
    const rowSpacing = (h - topPadding - bottomPadding) / rows;
    const maxPegsInRow = rows + 1;
    const pegSpacing = (w - 40) / maxPegsInRow;
    const g = Rig.games.plinko;

    // Determine target bucket
    let targetBucket = -1;
    if (g.forceBucket >= 0) {
      targetBucket = g.forceBucket;
    } else if (g.alwaysEdge) {
      // Pick leftmost or rightmost (highest multiplier)
      const mults = this.multipliers[risk][rows];
      targetBucket = Math.random() < 0.5 ? 0 : mults.length - 1;
    }

    const path = [];
    let x = w / 2 + (Math.random() - 0.5) * 4;
    let y = topPadding - 20;
    path.push({ x, y });

    let position = 0;

    if (targetBucket >= 0) {
      // Guided path to target bucket
      for (let r = 0; r < rows; r++) {
        // Need to end up at targetBucket after 'rows' steps
        // remaining = targetBucket - position, remaining steps = rows - r
        const remaining = targetBucket - position;
        const stepsLeft = rows - r;
        // Probability of going right to reach target
        const goRight = remaining > 0 && (Math.random() < remaining / stepsLeft);
        if (goRight) position++;

        const targetPegsInNextRow = r + 4;
        const nextRowWidth = (targetPegsInNextRow - 1) * pegSpacing;
        const nextStartX = (w - nextRowWidth) / 2;

        x = nextStartX + position * pegSpacing;
        y = topPadding + r * rowSpacing + rowSpacing * 0.5;
        path.push({ x: x + (Math.random() - 0.5) * 6, y: y - rowSpacing * 0.3 });
        path.push({ x: x + (Math.random() - 0.5) * 3, y });
      }
    } else {
      for (let r = 0; r < rows; r++) {
        let goRight;
        if (Rig.enabled) {
          const bias = Rig.winRate / 100;
          const centerBias = position / (r + 1);
          if (centerBias < 0.3) goRight = Math.random() > bias;
          else if (centerBias > 0.7) goRight = Math.random() < (1 - bias);
          else goRight = Math.random() < (bias > 0.5 ? 0.8 : 0.2);
        } else {
          goRight = Math.random() < 0.5;
        }
        if (goRight) position++;

        const targetPegsInNextRow = r + 4;
        const nextRowWidth = (targetPegsInNextRow - 1) * pegSpacing;
        const nextStartX = (w - nextRowWidth) / 2;

        x = nextStartX + position * pegSpacing;
        y = topPadding + r * rowSpacing + rowSpacing * 0.5;
        path.push({ x: x + (Math.random() - 0.5) * 6, y: y - rowSpacing * 0.3 });
        path.push({ x: x + (Math.random() - 0.5) * 3, y });
      }
    }

    const bucketIndex = Math.min(position, rows);
    const mults = this.multipliers[risk][rows];
    const mult = mults[bucketIndex];

    const lastRowPegs = rows + 2;
    const lastRowWidth = (lastRowPegs - 1) * pegSpacing;
    const lastStartX = (w - lastRowWidth) / 2;
    const finalX = lastStartX + bucketIndex * pegSpacing;
    const finalY = topPadding + rows * rowSpacing + 20;
    path.push({ x: finalX, y: finalY });

    const ball = { x: path[0].x, y: path[0].y, pathIndex: 0, path, bet, mult };
    this.balls.push(ball);

    if (!this.animFrame) this.startAnimation();
  },

  startAnimation() {
    const animate = () => {
      let anyActive = false;

      for (const ball of this.balls) {
        if (ball.pathIndex < ball.path.length - 1) {
          anyActive = true;
          const target = ball.path[ball.pathIndex + 1];
          const speed = 0.15;
          ball.x += (target.x - ball.x) * speed;
          ball.y += (target.y - ball.y) * speed;

          const dist = Math.hypot(target.x - ball.x, target.y - ball.y);
          if (dist < 2) {
            ball.pathIndex++;
            ball.x = target.x;
            ball.y = target.y;
          }
        }
      }

      this.drawBoard();

      const finished = this.balls.filter(b => b.pathIndex >= b.path.length - 1);
      for (const ball of finished) {
        const winnings = Math.round(ball.bet * ball.mult * 100) / 100;
        if (winnings > 0) App.addBalance(winnings);

        const net = winnings - ball.bet;
        const isWin = net > 0;
        const result = isWin ? 'win' : winnings > 0 ? 'push' : 'lose';

        if (!this.autoDropping) {
          this.showResult(ball.mult + 'x \u2014 ' + (winnings > 0 ? 'Won ' + App.formatMoney(winnings) : 'Lost'), result);
        }

        if (isWin) GameStats.record('plinko', 'win', net);
        else {
          GameStats.record('plinko', 'lose', ball.bet - winnings);
          if (typeof Stocks !== 'undefined') Stocks.onCasinoLoss(ball.bet - winnings);
        }

        // Track auto-drop profit
        if (this.autoDropping || this.autoTotal > 0) {
          this.autoProfit = App.safeAdd(this.autoProfit, net);
          this.updateAutoStatus();
        }
      }
      this.balls = this.balls.filter(b => b.pathIndex < b.path.length - 1);

      if (anyActive || this.balls.length > 0) {
        this.animFrame = requestAnimationFrame(animate);
      } else {
        this.animFrame = null;
      }
    };

    this.animFrame = requestAnimationFrame(animate);
  },

  showResult(text, cls) {
    const el = document.getElementById('plinko-result');
    el.textContent = text;
    el.className = 'game-result ' + cls;
  },

  // === AUTO DROP ===
  toggleAuto() {
    if (this.autoDropping) {
      this.stopAuto();
    } else {
      this.startAuto();
    }
  },

  startAuto() {
    const count = parseInt(document.getElementById('plinko-auto-count').value) || 10;
    if (count < 1) return;

    const bet = this.getBet();
    const totalCost = bet * count;
    if (totalCost > App.balance && !Admin.godMode) {
      this.showResult('Not enough for ' + count + ' drops!', 'lose');
      return;
    }

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
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }

    const btn = document.getElementById('plinko-auto-btn');
    btn.textContent = 'Auto: OFF';
    btn.classList.remove('plinko-auto-active');

    const status = document.getElementById('plinko-auto-status');
    if (this.autoTotal > 0) {
      const profitText = this.autoProfit >= 0
        ? 'Profit: +' + App.formatMoney(this.autoProfit)
        : 'Loss: ' + App.formatMoney(this.autoProfit);
      status.textContent = 'Done! ' + (this.autoTotal - this.autoRemaining) + '/' + this.autoTotal + ' dropped. ' + profitText;
      status.className = 'plinko-auto-status ' + (this.autoProfit >= 0 ? 'auto-profit' : 'auto-loss');
    } else {
      status.textContent = '';
    }
  },

  autoDropNext() {
    if (!this.autoDropping || this.autoRemaining <= 0) {
      this.stopAuto();
      return;
    }

    const bet = this.getBet();
    if (bet > App.balance && !Admin.godMode) {
      this.showResult('Ran out of money!', 'lose');
      this.stopAuto();
      return;
    }

    // Track profit for this ball
    this.autoBetAmount = bet;
    this.drop();
    this.autoRemaining--;
    this.updateAutoStatus();

    // Schedule next drop (stagger slightly so balls spread out)
    const delay = Math.max(150, 400 - this.autoTotal * 2);
    this.autoTimer = setTimeout(() => {
      this.autoDropNext();
    }, delay);
  },

  updateAutoStatus() {
    const status = document.getElementById('plinko-auto-status');
    if (!status) return;
    const dropped = this.autoTotal - this.autoRemaining;
    const profitText = this.autoProfit >= 0
      ? '+' + App.formatMoney(this.autoProfit)
      : App.formatMoney(this.autoProfit);
    status.textContent = 'Dropping: ' + dropped + '/' + this.autoTotal + ' | ' + profitText;
    status.className = 'plinko-auto-status ' + (this.autoProfit >= 0 ? 'auto-profit' : 'auto-loss');
  }
};
