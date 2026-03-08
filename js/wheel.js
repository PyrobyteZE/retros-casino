// Wheel of Fortune
const Wheel = {
  SEGMENTS: [
    { id: 'bust',     label: 'BUST',       color: '#1c2833', text: '#e74c3c', weight: 14 },
    { id: 'cash_1',   label: '$1M',        color: '#1a3a1a', text: '#2ecc71', weight: 18 },
    { id: 'cash_5',   label: '$5M',        color: '#3d2b00', text: '#f39c12', weight: 12 },
    { id: 'cash_25',  label: '$25M',       color: '#4a1800', text: '#e67e22', weight: 8  },
    { id: 'cash_100', label: '$100M',      color: '#4d0000', text: '#e74c3c', weight: 5  },
    { id: 'cash_500', label: '$500M',      color: '#2d0040', text: '#9b59b6', weight: 3  },
    { id: 'debt',     label: '\u{1F480} DEBT',    color: '#1a1a2e', text: '#7f8c8d', weight: 10 },
    { id: 'free',     label: '\u{1F3A1} FREE',    color: '#00838f', text: '#00e5ff', weight: 6  },
    { id: 'jackpot',  label: '\u{1F3B0} JACKPOT', color: '#4d3800', text: '#ffd700', weight: 1  },
    { id: 'double',   label: '\u26A1 DOUBLE',  color: '#001a40', text: '#3498db', weight: 2  },
    { id: 'trophy_c', label: '\u{1F3C5} TROPHY',  color: '#2a2a2a', text: '#bdc3c7', weight: 8  },
    { id: 'trophy_r', label: '\u{1F3C6} RARE',    color: '#001133', text: '#3498db', weight: 4  },
    { id: 'trophy_e', label: '\u{1F451} EPIC',    color: '#1a0033', text: '#8e44ad', weight: 2  },
    { id: 'trophy_l', label: '\u2728 LEGEND',  color: '#332200', text: '#f39c12', weight: 1  },
    { id: 'bankrupt', label: 'BANKRUPT',   color: '#330000', text: '#c0392b', weight: 6  },
  ],

  TIERS: {
    basic:   { cost: 500_000,    mult: 1,   label: 'Basic',   costLabel: '$500K' },
    premium: { cost: 5_000_000,  mult: 10,  label: 'Premium', costLabel: '$5M'   },
    vip:     { cost: 50_000_000, mult: 100, label: 'VIP',     costLabel: '$50M'  },
  },

  CASH_VALUES: {
    cash_1:   1_000_000,
    cash_5:   5_000_000,
    cash_25:  25_000_000,
    cash_100: 100_000_000,
    cash_500: 500_000_000,
  },

  _angle: 0,
  _spinning: false,
  _freeSpin: false,
  _doubleNext: false,
  _spinType: 'basic',
  _lastResult: null,
  _initialized: false,
  _styleInjected: false,

  _injectStyle() {
    if (this._styleInjected) return;
    this._styleInjected = true;
    const css = `
      .wheel-screen { padding: 12px; max-width: 480px; margin: 0 auto; }
      .wheel-tier-tabs { display: flex; gap: 6px; margin-bottom: 14px; }
      .wheel-tier-tab { flex: 1; padding: 8px 4px; border: none; border-radius: 8px; background: var(--bg3, #16213e); color: var(--text-dim, #aaa); font-size: 12px; cursor: pointer; transition: background 0.2s, color 0.2s; }
      .wheel-tier-tab.active { background: var(--green, #00e676); color: #000; font-weight: 700; }
      .wheel-container { position: relative; display: flex; justify-content: center; align-items: center; margin: 8px auto 16px; width: 300px; height: 300px; }
      .wheel-pointer { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); font-size: 28px; color: #ffd700; z-index: 10; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8)); }
      #wheel-svg { display: block; border-radius: 50%; box-shadow: 0 0 24px rgba(0,0,0,0.8), 0 0 0 3px #ffd700; }
      #wheel-svg-group { transform-origin: 150px 150px; }
      .wheel-spin-btn { display: block; width: 100%; padding: 14px; border: none; border-radius: 10px; background: var(--green, #00e676); color: #000; font-size: 16px; font-weight: 700; cursor: pointer; margin-bottom: 12px; transition: opacity 0.2s; }
      .wheel-spin-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .wheel-result { padding: 12px; border-radius: 10px; background: var(--bg3, #16213e); margin-bottom: 12px; min-height: 48px; text-align: center; font-size: 15px; font-weight: 600; }
      .wheel-status-flags { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
      .wheel-flag { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
      .wheel-flag-free { background: #00838f; color: #fff; }
      .wheel-flag-double { background: #1565c0; color: #fff; }
      .wheel-prize-table { background: var(--bg3, #16213e); border-radius: 10px; padding: 10px; }
      .wheel-prize-table h4 { margin: 0 0 8px; color: var(--text-dim, #aaa); font-size: 13px; }
      .wheel-prize-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 12px; }
      .wheel-prize-row:last-child { border-bottom: none; }
      .wheel-prize-seg { display: flex; align-items: center; gap: 6px; }
      .wheel-prize-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  },

  init() {
    this._injectStyle();
    this._initialized = true;
    this._render();
  },

  setTier(id) {
    this._spinType = id;
    this._render();
  },

  _rollWinner() {
    const total = this.SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
    let r = Math.random() * total;
    for (const seg of this.SEGMENTS) {
      r -= seg.weight;
      if (r <= 0) return seg;
    }
    return this.SEGMENTS[this.SEGMENTS.length - 1];
  },

  _buildWheelSvg() {
    const cx = 150, cy = 150, r = 130, textR = 85;
    const total = this.SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
    let currentAngle = 0;
    let slices = '';

    const toRad = a => (a - 90) * Math.PI / 180;

    for (const seg of this.SEGMENTS) {
      const sweep = (seg.weight / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sweep;
      const midAngle = startAngle + sweep / 2;

      const x1 = cx + r * Math.cos(toRad(startAngle));
      const y1 = cy + r * Math.sin(toRad(startAngle));
      const x2 = cx + r * Math.cos(toRad(endAngle));
      const y2 = cy + r * Math.sin(toRad(endAngle));
      const large = sweep > 180 ? 1 : 0;
      const path = `M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;

      const tx = cx + textR * Math.cos(toRad(midAngle));
      const ty = cy + textR * Math.sin(toRad(midAngle));

      slices += `<path d="${path}" fill="${seg.color}" stroke="rgba(0,0,0,0.4)" stroke-width="1"/>`;
      slices += `<text x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" fill="${seg.text}" font-size="${sweep < 30 ? 7 : sweep < 45 ? 8 : 9}" font-weight="bold" text-anchor="middle" dominant-baseline="middle" transform="rotate(${midAngle},${tx.toFixed(2)},${ty.toFixed(2)})">${seg.label}</text>`;

      currentAngle = endAngle;
    }

    // Center hub
    slices += `<circle cx="${cx}" cy="${cy}" r="18" fill="#111" stroke="#ffd700" stroke-width="2"/>`;
    slices += `<text x="${cx}" y="${cy}" fill="#ffd700" font-size="11" font-weight="bold" text-anchor="middle" dominant-baseline="middle">\u{1F3B0}</text>`;

    return slices;
  },

  _getSegmentStartAngle(targetSeg) {
    const total = this.SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
    let currentAngle = 0;
    for (const seg of this.SEGMENTS) {
      const sweep = (seg.weight / total) * 360;
      if (seg.id === targetSeg.id) return currentAngle;
      currentAngle += sweep;
    }
    return 0;
  },

  _getSegmentMidAngle(targetSeg) {
    const total = this.SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
    let currentAngle = 0;
    for (const seg of this.SEGMENTS) {
      const sweep = (seg.weight / total) * 360;
      if (seg.id === targetSeg.id) return currentAngle + sweep / 2;
      currentAngle += sweep;
    }
    return 0;
  },

  spin() {
    if (this._spinning) return;
    const tier = this.TIERS[this._spinType];
    const cost = tier.cost;

    if (!this._freeSpin) {
      if (App.balance < cost) {
        Toast.show('Not enough money! Need ' + App.formatMoney(cost), '#e74c3c', 3000);
        return;
      }
      App.addBalance(-cost);
    } else {
      this._freeSpin = false;
      Toast.show('\u{1F3A1} Free spin used!', '#00e5ff', 2000);
    }

    this._spinning = true;
    const btn = document.getElementById('wheel-spin-btn');
    if (btn) btn.disabled = true;

    const winner = this._rollWinner();
    const segMidAngle = this._getSegmentMidAngle(winner);
    // We want the winning segment to land at the pointer (top = 0 degrees)
    // The wheel rotates clockwise; pointer is at top.
    // After rotation, the segment that was at segMidAngle in SVG space should be at 0 (top).
    // So we need to rotate by -(segMidAngle % 360) extra beyond full spins
    const extra = (360 - (segMidAngle % 360)) % 360;
    const newAngle = this._angle + 1800 + extra;
    this._angle = newAngle;

    const group = document.getElementById('wheel-svg-group');
    if (group) {
      group.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
      group.style.transform = `rotate(${newAngle}deg)`;
    }

    setTimeout(() => {
      this._spinning = false;
      this._applyPrize(winner);
      const btn2 = document.getElementById('wheel-spin-btn');
      if (btn2) btn2.disabled = false;
      this._updateStatusFlags();
      App.save();
    }, 4100);
  },

  _applyPrize(seg) {
    const tier = this.TIERS[this._spinType];
    const mult = tier.mult;
    let prizeText = '';
    let prizeColor = seg.text;

    if (seg.id === 'bust') {
      prizeText = 'BUST — nothing. Better luck next time.';
      prizeColor = '#e74c3c';
    } else if (seg.id.startsWith('cash_')) {
      let amount = (this.CASH_VALUES[seg.id] || 0) * mult;
      if (this._doubleNext) {
        amount *= 2;
        this._doubleNext = false;
        prizeText = '\u26A1 DOUBLED! +' + App.formatMoney(amount);
      } else {
        prizeText = '+' + App.formatMoney(amount);
      }
      App.addBalance(amount);
      prizeColor = '#2ecc71';
    } else if (seg.id === 'jackpot') {
      const amount = tier.cost * 100;
      prizeText = '\u{1F3B0} JACKPOT! +' + App.formatMoney(amount);
      App.addBalance(amount);
      prizeColor = '#ffd700';
    } else if (seg.id === 'debt') {
      const debtAmount = (seg.id === 'debt') ? (mult === 1 ? 3_000_000 : mult === 10 ? 30_000_000 : 300_000_000) : 0;
      if (typeof Loans !== 'undefined') {
        Loans.debt = (Loans.debt || 0) + debtAmount;
        Loans.updateDebtDisplay?.();
        Loans.updateUI?.();
      }
      prizeText = '\u{1F480} DEBT! Added ' + App.formatMoney(debtAmount) + ' debt.';
      prizeColor = '#7f8c8d';
    } else if (seg.id === 'free') {
      this._freeSpin = true;
      prizeText = '\u{1F3A1} FREE SPIN! Next spin is free.';
      prizeColor = '#00e5ff';
    } else if (seg.id === 'double') {
      this._doubleNext = true;
      prizeText = '\u26A1 DOUBLE UP! Your next cash win is doubled!';
      prizeColor = '#3498db';
    } else if (seg.id === 'bankrupt') {
      const lost = App.balance * 0.25;
      App.addBalance(-lost);
      prizeText = 'BANKRUPT! Lost ' + App.formatMoney(lost);
      prizeColor = '#c0392b';
    } else if (seg.id === 'trophy_c') {
      if (typeof Vanity !== 'undefined') Vanity.grantTrophy('common');
      prizeText = '\u{1F3C5} Common Trophy earned!';
      prizeColor = '#9e9e9e';
    } else if (seg.id === 'trophy_r') {
      if (typeof Vanity !== 'undefined') Vanity.grantTrophy('rare');
      prizeText = '\u{1F3C6} Rare Trophy earned!';
      prizeColor = '#2196f3';
    } else if (seg.id === 'trophy_e') {
      if (typeof Vanity !== 'undefined') Vanity.grantTrophy('epic');
      prizeText = '\u{1F451} Epic Trophy earned!';
      prizeColor = '#9c27b0';
    } else if (seg.id === 'trophy_l') {
      if (typeof Vanity !== 'undefined') Vanity.grantTrophy('legendary');
      prizeText = '\u2728 Legendary Trophy earned!';
      prizeColor = '#f39c12';
    }

    this._lastResult = { segment: seg, prizeText, color: prizeColor };
    this._showResult(seg, prizeText, prizeColor);
  },

  _showResult(seg, prizeText, color) {
    const el = document.getElementById('wheel-result');
    if (!el) return;
    el.style.color = color || seg.text;
    el.textContent = prizeText;
  },

  _updateStatusFlags() {
    const el = document.getElementById('wheel-status-flags');
    if (!el) return;
    let html = '';
    if (this._freeSpin) html += '<span class="wheel-flag wheel-flag-free">\u{1F3A1} Free Spin Ready</span>';
    if (this._doubleNext) html += '<span class="wheel-flag wheel-flag-double">\u26A1 Double Active</span>';
    el.innerHTML = html;
  },

  _render() {
    const container = document.getElementById('wheel-content');
    if (!container) return;

    const tier = this.TIERS[this._spinType];
    const svgInner = this._buildWheelSvg();
    const currentAngle = this._angle;

    const prizeRows = this.SEGMENTS.map(seg => {
      let desc = '';
      if (seg.id === 'bust') desc = 'No prize';
      else if (seg.id.startsWith('cash_')) desc = App.formatMoney((this.CASH_VALUES[seg.id] || 0) * tier.mult);
      else if (seg.id === 'jackpot') desc = App.formatMoney(tier.cost * 100);
      else if (seg.id === 'debt') desc = 'Add debt';
      else if (seg.id === 'free') desc = 'Free next spin';
      else if (seg.id === 'double') desc = 'Double next cash';
      else if (seg.id === 'bankrupt') desc = 'Lose 25% balance';
      else if (seg.id.startsWith('trophy_')) desc = seg.label + ' Trophy';
      return `<div class="wheel-prize-row">
        <span class="wheel-prize-seg"><span class="wheel-prize-dot" style="background:${seg.color};border:1px solid ${seg.text}"></span><span style="color:${seg.text}">${seg.label}</span></span>
        <span style="color:var(--text-dim,#aaa);font-size:11px">${desc} (${seg.weight}%)</span>
      </div>`;
    }).join('');

    let resultHtml = this._lastResult ? `<div id="wheel-result" style="color:${this._lastResult.color}">${this._lastResult.prizeText}</div>` : `<div id="wheel-result" style="color:var(--text-dim,#aaa)">Spin to win!</div>`;

    let flagsHtml = '';
    if (this._freeSpin) flagsHtml += '<span class="wheel-flag wheel-flag-free">\u{1F3A1} Free Spin Ready</span>';
    if (this._doubleNext) flagsHtml += '<span class="wheel-flag wheel-flag-double">\u26A1 Double Active</span>';

    container.innerHTML = `
      <div class="wheel-screen">
        <div class="wheel-tier-tabs">
          <button class="wheel-tier-tab ${this._spinType === 'basic' ? 'active' : ''}" onclick="Wheel.setTier('basic')">Basic<br><small>$500K</small></button>
          <button class="wheel-tier-tab ${this._spinType === 'premium' ? 'active' : ''}" onclick="Wheel.setTier('premium')">Premium<br><small>$5M</small></button>
          <button class="wheel-tier-tab ${this._spinType === 'vip' ? 'active' : ''}" onclick="Wheel.setTier('vip')">VIP<br><small>$50M</small></button>
        </div>
        <div class="wheel-container">
          <div class="wheel-pointer">&#x25BC;</div>
          <svg id="wheel-svg" viewBox="0 0 300 300" width="280" height="280">
            <g id="wheel-svg-group" style="transform-origin:150px 150px;transform:rotate(${currentAngle}deg)">
              ${svgInner}
            </g>
          </svg>
        </div>
        <div id="wheel-status-flags" class="wheel-status-flags">${flagsHtml}</div>
        <button id="wheel-spin-btn" class="wheel-spin-btn" onclick="Wheel.spin()" ${this._spinning ? 'disabled' : ''}>
          \u{1F3A1} SPIN &mdash; ${this._freeSpin ? 'FREE!' : tier.costLabel}
        </button>
        ${resultHtml}
        <div class="wheel-prize-table">
          <h4>Prize Table (${tier.label} &times;${tier.mult})</h4>
          ${prizeRows}
        </div>
      </div>
    `;
  },

  getSaveData() {
    return {
      angle: this._angle,
      freeSpin: this._freeSpin,
      doubleNext: this._doubleNext,
      spinType: this._spinType,
    };
  },

  loadSaveData(d) {
    if (!d) return;
    this._angle = d.angle || 0;
    this._freeSpin = d.freeSpin || false;
    this._doubleNext = d.doubleNext || false;
    if (d.spinType && this.TIERS[d.spinType]) this._spinType = d.spinType;
  },
};
