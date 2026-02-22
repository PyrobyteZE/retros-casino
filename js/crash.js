const Crash = {
  running: false,
  multiplier: 1,
  crashPoint: 0,
  animFrame: null,
  startTime: 0,
  betPlaced: false,
  currentBet: 0,
  history: [],
  autoCashout: 0,
  points: [],  // stored graph points for smooth rendering

  getBet() { return Math.max(0.01, Math.round((Number(document.getElementById('crash-bet').value) || 0) * 100) / 100); },
  halfBet() { document.getElementById('crash-bet').value = Math.max(0.01, Math.round(this.getBet() / 2 * 100) / 100); },
  doubleBet() { document.getElementById('crash-bet').value = this.getBet() * 2; },
  maxBet() { document.getElementById('crash-bet').value = Math.floor(App.balance).toFixed(0); },

  getAutoCashout() {
    return parseFloat(document.getElementById('crash-auto').value) || 0;
  },

  toggle() {
    if (!this.running) this.start();
    else this.cashout();
  },

  start() {
    const bet = this.getBet();
    if (bet > App.balance && !Admin.godMode) {
      this.showResult('Not enough money!', 'lose');
      return;
    }

    if (!Admin.godMode) App.addBalance(-bet);
    this.currentBet = bet;
    this.betPlaced = true;
    this.running = true;
    this.multiplier = 1;
    this.startTime = Date.now();
    this.points = [];
    this.autoCashout = this.getAutoCashout();

    // Determine crash point
    const g = Rig.games.crash;
    if (g.neverCrash) {
      this.crashPoint = 999999;
    } else if (g.forceCrashAt > 0) {
      this.crashPoint = g.forceCrashAt;
      g.forceCrashAt = 0;
    } else if (g.minMultiplier > 1) {
      this.crashPoint = Math.max(g.minMultiplier, Math.max(1, 0.99 / Math.random()));
    } else if (Rig.enabled && Rig.forceWin !== null) {
      const forceWin = Rig.forceWin;
      Rig.forceWin = null;
      if (typeof Admin !== 'undefined') Admin.updateRigStatus();
      this.crashPoint = forceWin ? (5 + Math.random() * 20) : 1.01;
    } else if (Rig.enabled) {
      const r = Rig.biasedRandom();
      this.crashPoint = Math.max(1, 0.99 / r);
    } else {
      this.crashPoint = Math.max(1, 0.99 / Math.random());
    }

    // Apply hunger penalty: reduce crash point (game crashes sooner)
    if (typeof App !== 'undefined') {
      const penalty = App.getHungerPenalty();
      if (penalty > 0 && this.crashPoint < 900000) {
        this.crashPoint = Math.max(1.01, this.crashPoint * (1 - penalty * 0.5));
      }
    }

    const btn = document.getElementById('crash-btn');
    btn.textContent = 'Cash Out';
    btn.style.background = '#ff5252';

    const multEl = document.getElementById('crash-multiplier');
    multEl.classList.remove('crashed');
    multEl.style.color = '';
    this.showResult('', '');
    document.getElementById('crash-bet').disabled = true;
    document.getElementById('crash-auto').disabled = true;

    // Hide rocket at start
    const rocket = document.getElementById('crash-rocket');
    if (rocket) { rocket.style.display = 'block'; rocket.style.opacity = '1'; }

    this.animate();
  },

  animate() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    this.multiplier = Math.pow(Math.E, elapsed * 0.3);

    // Store point for smooth graph
    this.points.push({ t: elapsed, m: this.multiplier });

    // Auto cashout check
    if (this.autoCashout > 0 && this.multiplier >= this.autoCashout && this.multiplier < this.crashPoint) {
      this.cashout();
      return;
    }

    if (this.multiplier >= this.crashPoint) {
      this.crash();
      return;
    }

    // Update multiplier display with color gradient
    const multEl = document.getElementById('crash-multiplier');
    multEl.textContent = this.multiplier.toFixed(2) + 'x';
    multEl.style.color = this.getMultColor(this.multiplier);

    this.drawGraph(false);
    this.animFrame = requestAnimationFrame(() => this.animate());
  },

  getMultColor(m) {
    if (m < 1.5) return '#00e676';
    if (m < 3) return '#69f0ae';
    if (m < 5) return '#ffd740';
    if (m < 10) return '#ff9100';
    if (m < 20) return '#ff5252';
    return '#e040fb';  // purple for extreme multipliers
  },

  cashout() {
    if (!this.running || !this.betPlaced) return;
    cancelAnimationFrame(this.animFrame);

    const winnings = Math.floor(this.currentBet * this.multiplier);
    App.addBalance(winnings);

    const cashoutMult = this.multiplier.toFixed(2);
    this.showResult('Cashed out at ' + cashoutMult + 'x \u2014 Won ' + App.formatMoney(winnings), 'win');
    GameStats.record('crash', 'win', winnings - this.currentBet);
    App.recordWin();

    this.history.unshift({ mult: parseFloat(cashoutMult), crashed: false });
    if (this.history.length > 20) this.history.length = 20;
    this.renderHistory();
    this.reset();
  },

  crash() {
    cancelAnimationFrame(this.animFrame);

    this.multiplier = this.crashPoint;
    const multEl = document.getElementById('crash-multiplier');
    multEl.textContent = this.crashPoint.toFixed(2) + 'x';
    multEl.classList.add('crashed');
    multEl.style.color = '';

    // Rocket explosion effect
    const rocket = document.getElementById('crash-rocket');
    if (rocket) {
      rocket.style.opacity = '0';
      rocket.style.transform = 'scale(2)';
    }

    this.drawGraph(true);
    this.showResult('Crashed at ' + this.crashPoint.toFixed(2) + 'x \u2014 Lost ' + App.formatMoney(this.currentBet), 'lose');
    GameStats.record('crash', 'lose', this.currentBet);
    App.recordLoss();
    if (typeof Stocks !== 'undefined') Stocks.onCasinoLoss(this.currentBet);

    this.history.unshift({ mult: parseFloat(this.crashPoint.toFixed(2)), crashed: true });
    if (this.history.length > 20) this.history.length = 20;
    this.renderHistory();
    this.reset();
  },

  reset() {
    this.running = false;
    this.betPlaced = false;
    const btn = document.getElementById('crash-btn');
    btn.textContent = 'Start';
    btn.style.background = '';
    document.getElementById('crash-bet').disabled = false;
    document.getElementById('crash-auto').disabled = false;

    const rocket = document.getElementById('crash-rocket');
    if (rocket) { rocket.style.display = 'none'; rocket.style.transform = ''; }
  },

  drawGraph(crashed) {
    const canvas = document.getElementById('crash-canvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const dpr = window.devicePixelRatio || 1;

    // Handle HiDPI
    if (canvas.width !== Math.floor(canvas.clientWidth * dpr)) {
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      ctx.scale(dpr, dpr);
    }
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;

    ctx.clearRect(0, 0, cw, ch);

    // Grid
    const maxMult = Math.max(this.multiplier, 2);
    const gridLines = [1, 2, 5, 10, 20, 50, 100].filter(v => v <= maxMult * 1.2);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1;
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#444';
    ctx.textAlign = 'right';
    for (const v of gridLines) {
      const y = ch - ((v - 1) / (maxMult - 1)) * (ch * 0.85) - ch * 0.05;
      if (y < 5 || y > ch - 5) continue;
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(cw, y);
      ctx.stroke();
      ctx.fillText(v.toFixed(1) + 'x', 28, y + 3);
    }

    if (this.points.length < 2) return;

    const elapsed = this.points[this.points.length - 1].t;
    const maxTime = elapsed + 0.5;
    const graphL = 35;
    const graphW = cw - graphL - 5;

    // Gradient fill under curve
    const gradient = ctx.createLinearGradient(0, ch, 0, 0);
    if (crashed) {
      gradient.addColorStop(0, 'rgba(255,82,82,0.0)');
      gradient.addColorStop(1, 'rgba(255,82,82,0.25)');
    } else {
      gradient.addColorStop(0, 'rgba(0,230,118,0.0)');
      gradient.addColorStop(0.5, 'rgba(0,230,118,0.08)');
      gradient.addColorStop(1, 'rgba(0,230,118,0.2)');
    }

    // Draw filled area
    ctx.beginPath();
    const baseY = ch - ch * 0.05;
    ctx.moveTo(graphL, baseY);
    for (const p of this.points) {
      const x = graphL + (p.t / maxTime) * graphW;
      const y = ch - ((p.m - 1) / (maxMult - 1)) * (ch * 0.85) - ch * 0.05;
      ctx.lineTo(x, y);
    }
    const lastP = this.points[this.points.length - 1];
    const lastX = graphL + (lastP.t / maxTime) * graphW;
    ctx.lineTo(lastX, baseY);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw curve line
    ctx.beginPath();
    ctx.lineWidth = 3;
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const x = graphL + (p.t / maxTime) * graphW;
      const y = ch - ((p.m - 1) / (maxMult - 1)) * (ch * 0.85) - ch * 0.05;

      // Color gradient along the line
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = crashed ? '#ff5252' : this.getMultColor(this.multiplier);
    ctx.stroke();

    // Draw dot at current position
    if (!crashed && this.points.length > 0) {
      const lp = this.points[this.points.length - 1];
      const dx = graphL + (lp.t / maxTime) * graphW;
      const dy = ch - ((lp.m - 1) / (maxMult - 1)) * (ch * 0.85) - ch * 0.05;

      // Glow
      ctx.shadowColor = this.getMultColor(this.multiplier);
      ctx.shadowBlur = 12;
      ctx.fillStyle = this.getMultColor(this.multiplier);
      ctx.beginPath();
      ctx.arc(dx, dy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Rocket emoji near the dot
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('\u{1F680}', dx, dy - 12);
    }

    // Draw auto cashout line
    if (this.autoCashout > 1 && this.autoCashout <= maxMult * 1.5) {
      const acy = ch - ((this.autoCashout - 1) / (maxMult - 1)) * (ch * 0.85) - ch * 0.05;
      ctx.strokeStyle = '#ffd740';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(graphL, acy);
      ctx.lineTo(cw, acy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffd740';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Auto ' + this.autoCashout.toFixed(2) + 'x', graphL + 5, acy - 4);
    }
  },

  renderHistory() {
    const container = document.getElementById('crash-history');
    if (!container) return;
    container.innerHTML = this.history.map(h => {
      const cls = h.crashed ? 'crash-h-red' : 'crash-h-green';
      return `<span class="${cls}">${h.mult.toFixed(2)}x</span>`;
    }).join('');
  },

  showResult(text, cls) {
    const el = document.getElementById('crash-result');
    el.textContent = text;
    el.className = 'game-result ' + cls;
  }
};
