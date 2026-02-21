const Horses = {
  horses: [
    { name: 'Thunder',  emoji: '🟥', color: '#ff5252', odds: 2.0 },
    { name: 'Shadow',   emoji: '🟦', color: '#448aff', odds: 3.0 },
    { name: 'Goose',    emoji: '🟧', color: '#ff9100', odds: 4.0 },
    { name: 'Storm',    emoji: '🟩', color: '#00e676', odds: 6.0 },
    { name: 'Lucky',    emoji: '🟪', color: '#ce93d8', odds: 10.0 },
    { name: 'Phantom',  emoji: '⬜', color: '#e0e0e0', odds: 15.0 }
  ],

  selected: -1,
  racing: false,
  positions: [],
  speeds: [],
  animFrame: null,
  trackLength: 0,

  init() {
    this.renderHorseButtons();
    this.initCanvas();
  },

  renderHorseButtons() {
    const grid = document.getElementById('horses-grid');
    if (!grid) return;
    grid.innerHTML = this.horses.map((h, i) => `
      <button class="horse-pick${this.selected === i ? ' selected' : ''}"
        style="border-color:${h.color};${this.selected === i ? 'background:' + h.color + '22' : ''}"
        onclick="Horses.pickHorse(${i})" ${this.racing ? 'disabled' : ''}>
        <span class="horse-emoji">${h.emoji}</span>
        <span class="horse-name">${h.name}</span>
        <span class="horse-odds">${h.odds}x</span>
      </button>
    `).join('');
  },

  pickHorse(i) {
    if (this.racing) return;
    this.selected = i;
    this.renderHorseButtons();
  },

  initCanvas() {
    const canvas = document.getElementById('horses-canvas');
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 350;
    const h = canvas.clientHeight || 240;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    this.trackLength = w - 60;
    this.drawTrack(ctx, w, h);
  },

  drawTrack(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    const count = this.horses.length;
    const laneH = Math.floor((h - 10) / count);

    for (let i = 0; i < count; i++) {
      const y = i * laneH + 5;
      // Lane background
      ctx.fillStyle = i % 2 === 0 ? '#1a1a2e' : '#252540';
      ctx.fillRect(0, y, w, laneH);

      // Lane line
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + laneH);
      ctx.lineTo(w, y + laneH);
      ctx.stroke();

      // Horse name on left
      ctx.fillStyle = this.horses[i].color;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(this.horses[i].name, 4, y + laneH / 2 + 4);

      // Horse position marker
      const pos = this.positions[i] || 0;
      const x = 50 + pos;
      ctx.font = '20px sans-serif';
      ctx.fillText('🏇', x, y + laneH / 2 + 7);
    }

    // Finish line
    ctx.strokeStyle = '#ffd740';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(w - 10, 0);
    ctx.lineTo(w - 10, h);
    ctx.stroke();
    ctx.setLineDash([]);
  },

  getBet() {
    return Math.floor(Number(document.getElementById('horses-bet').value) * 100) / 100 || 0;
  },

  halfBet() {
    const el = document.getElementById('horses-bet');
    el.value = Math.max(0.01, Math.floor(Number(el.value) / 2 * 100) / 100);
  },

  doubleBet() {
    const el = document.getElementById('horses-bet');
    el.value = Math.floor(Number(el.value) * 2 * 100) / 100;
  },

  maxBet() {
    document.getElementById('horses-bet').value = Math.floor(App.balance * 100) / 100;
  },

  race() {
    if (this.racing) return;
    if (this.selected < 0) {
      document.getElementById('horses-result').textContent = 'Pick a horse first!';
      document.getElementById('horses-result').className = 'game-result push';
      return;
    }

    const bet = this.getBet();
    if (bet < 0.01) return;
    if (bet > App.balance && !Admin.godMode) {
      document.getElementById('horses-result').textContent = 'Not enough money!';
      document.getElementById('horses-result').className = 'game-result lose';
      return;
    }

    if (!Admin.godMode) App.addBalance(-bet);

    this.racing = true;
    this.positions = this.horses.map(() => 0);
    this.speeds = this.horses.map(() => 0);
    document.getElementById('horses-result').textContent = 'Racing...';
    document.getElementById('horses-result').className = 'game-result';
    document.getElementById('horses-race-btn').disabled = true;
    this.renderHorseButtons();

    // Determine winner based on rig
    let rigWinner = -1;
    const g = Rig.games.horses;
    if (g && g.forceWinner >= 0) {
      rigWinner = g.forceWinner;
      g.forceWinner = -1;
      document.getElementById('horses-rig-winner').value = '-1';
    } else if (Rig.enabled && Rig.shouldWin()) {
      rigWinner = this.selected; // rig player to win
    }

    // Generate base speeds (lower odds = faster base speed)
    const baseSpeeds = this.horses.map((h, i) => {
      let speed = (1 / h.odds) * 3 + Math.random() * 2;
      if (i === rigWinner) speed += 1.5; // boost rigged winner
      return speed;
    });

    const canvas = document.getElementById('horses-canvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const finishLine = this.trackLength;
    let winner = -1;

    const animate = () => {
      // Update positions with random speed variation
      for (let i = 0; i < this.horses.length; i++) {
        if (this.positions[i] < finishLine) {
          const variation = (Math.random() - 0.3) * 1.5;
          this.speeds[i] = Math.max(0.5, baseSpeeds[i] + variation);
          this.positions[i] += this.speeds[i];

          if (this.positions[i] >= finishLine && winner < 0) {
            winner = i;
          }
        }
      }

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      this.drawTrack(ctx, w, h);

      if (winner < 0) {
        this.animFrame = requestAnimationFrame(animate);
      } else {
        this.finishRace(winner, bet);
      }
    };

    this.animFrame = requestAnimationFrame(animate);
  },

  finishRace(winner, bet) {
    this.racing = false;
    document.getElementById('horses-race-btn').disabled = false;
    const resultEl = document.getElementById('horses-result');
    const horse = this.horses[winner];

    if (winner === this.selected) {
      const payout = bet * horse.odds;
      App.addBalance(payout);
      resultEl.textContent = horse.name + ' wins! +' + App.formatMoney(payout);
      resultEl.className = 'game-result win';
      GameStats.record('horses', 'win', payout - bet);
      App.recordWin();
    } else {
      resultEl.textContent = horse.name + ' wins! You lost ' + App.formatMoney(bet);
      resultEl.className = 'game-result lose';
      GameStats.record('horses', 'lose', bet);
      App.recordLoss();
      if (typeof Stocks !== 'undefined') Stocks.onCasinoLoss(bet);
    }

    this.renderHorseButtons();
  }
};
