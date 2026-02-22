// Food / Hunger System
const Food = {
  items: [
    { name: 'Ramen',  emoji: '\u{1F35C}', cost: 500,    restore: 15, luckBonus: 0,    luckDuration: 0,    decaySlow: 0,   decaySlowDuration: 0 },
    { name: 'Pizza',  emoji: '\u{1F355}', cost: 2000,   restore: 25, luckBonus: 0,    luckDuration: 0,    decaySlow: 0,   decaySlowDuration: 0 },
    { name: 'Burger', emoji: '\u{1F354}', cost: 8000,   restore: 40, luckBonus: 0,    luckDuration: 0,    decaySlow: 0,   decaySlowDuration: 0 },
    { name: 'Steak',  emoji: '\u{1F969}', cost: 25000,  restore: 60, luckBonus: 0.05, luckDuration: 600,  decaySlow: 0,   decaySlowDuration: 0 },
    { name: 'Feast',  emoji: '\u{1F382}', cost: 100000, restore: 100,luckBonus: 0.10, luckDuration: 1800, decaySlow: 0,   decaySlowDuration: 0 },
    { name: 'Pill',   emoji: '\u{1F48A}', cost: 500000, restore: 100,luckBonus: 0,    luckDuration: 0,    decaySlow: 0.5, decaySlowDuration: 7200 },
  ],

  _decayTimer: null,
  _warned25: false,
  _warned10: false,

  init() {
    this.startDecay();
    this.updateHUD();
    // Admin hunger listener is set up in Firebase._startListeners() once online
  },

  startDecay() {
    if (this._decayTimer) clearInterval(this._decayTimer);
    this._decayTimer = setInterval(() => this.tick(), 60000);
  },

  tick() {
    const r = App.rebirth || 0;
    // decayInterval = minutes per 1% hunger loss
    let decayInterval = 5 * (1 + r * 0.5);
    // Pill effect: slow decay 50%
    if (App.decaySlowUntil && Date.now() < App.decaySlowUntil) {
      decayInterval *= 2;
    }
    const decayPct = 1 / decayInterval; // % lost per minute

    const oldHunger = App.hunger || 0;
    App.hunger = Math.max(0, oldHunger - decayPct);
    App.lastHungerTick = Date.now();

    // One-time warnings
    if (oldHunger > 25 && App.hunger <= 25 && !this._warned25) {
      this._warned25 = true;
      Toast.show('\u{1F357} Hungry! Luck penalty now active — eat something!', '#e67e22');
    }
    if (oldHunger > 10 && App.hunger <= 10 && !this._warned10) {
      this._warned10 = true;
      Toast.show('\u26A0\uFE0F STARVING! -50% earnings — eat NOW!', '#c0392b');
    }
    // Reset warnings if hunger recovers
    if (App.hunger > 25) this._warned25 = false;
    if (App.hunger > 10) this._warned10 = false;

    this.updateHUD();
    App.save();
  },

  getColor(h) {
    if (h > 75) return '#00e676';
    if (h > 50) return '#ffd740';
    if (h > 25) return '#ff9100';
    return '#ff5252';
  },

  updateHUD() {
    const bar = document.getElementById('hunger-bar');
    const pct = document.getElementById('hunger-pct');
    const hud = document.getElementById('hunger-hud');
    if (!bar) return;
    const h = Math.max(0, Math.min(100, App.hunger || 0));
    bar.style.width = h.toFixed(1) + '%';
    bar.style.background = this.getColor(h);
    if (pct) pct.textContent = Math.round(h) + '%';
    if (hud) hud.classList.toggle('hunger-starving', h <= 10);
  },

  openShop() {
    const h = Math.round(App.hunger || 0);
    const pen = Math.round(App.getHungerPenalty() * 100);
    let html = `<div class="stock-trade-modal">
      <div class="stock-trade-title">\u{1F357} Food Shop</div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px">Hunger: ${h}%${pen > 0 ? ' \u2022 -' + pen + '% earnings penalty' : ' \u2022 Full!'}</div>
      <div class="food-shop-grid">`;

    this.items.forEach((item, i) => {
      const affordable = App.balance >= item.cost;
      let bonusHtml = '';
      if (item.luckBonus > 0) {
        bonusHtml = `<div class="food-bonus">+${Math.round(item.luckBonus * 100)}% luck ${Math.round(item.luckDuration / 60)}min</div>`;
      }
      if (item.decaySlow > 0) {
        bonusHtml = `<div class="food-bonus">Slows decay ${Math.round(item.decaySlowDuration / 3600)}hr</div>`;
      }
      html += `<div class="food-item ${affordable ? 'affordable' : 'unaffordable'}" onclick="Food._buy(${i})">
        <div class="food-emoji">${item.emoji}</div>
        <div class="food-name">${item.name}</div>
        <div class="food-restore">+${item.restore}%</div>
        ${bonusHtml}
        <div class="food-cost ${affordable ? '' : 'food-cost-cant'}">${App.formatMoney(item.cost)}</div>
      </div>`;
    });

    html += `</div><button class="stock-trade-cancel" onclick="Food.closeShop()">Close</button></div>`;

    let modal = document.getElementById('food-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'food-modal';
      modal.className = 'stock-modal-overlay';
      document.getElementById('app').appendChild(modal);
    }
    modal.innerHTML = html;
    modal.classList.remove('hidden');
  },

  closeShop() {
    const modal = document.getElementById('food-modal');
    if (modal) modal.classList.add('hidden');
  },

  _buy(idx) {
    const item = this.items[idx];
    if (!item) return;
    if (App.balance < item.cost) {
      Toast.show('Not enough money!', '#c0392b', 2000);
      return;
    }
    App.addBalance(-item.cost);
    App.hunger = Math.min(100, (App.hunger || 0) + item.restore);

    // Apply luck boost (stack with existing)
    if (item.luckBonus > 0) {
      App.luckBoostPct = Math.max(App.luckBoostPct || 0, item.luckBonus);
      App.luckBoostUntil = Math.max(App.luckBoostUntil || 0, Date.now() + item.luckDuration * 1000);
    }
    // Apply decay slow (stack duration)
    if (item.decaySlow > 0) {
      App.decaySlowUntil = Math.max(App.decaySlowUntil || 0, Date.now() + item.decaySlowDuration * 1000);
    }

    if (App.hunger > 25) this._warned25 = false;
    if (App.hunger > 10) this._warned10 = false;

    App.save();
    this.updateHUD();
    this.closeShop();

    let msg = `${item.emoji} Ate ${item.name}! Hunger: ${Math.round(App.hunger)}%`;
    if (item.luckBonus > 0) msg += ` +${Math.round(item.luckBonus * 100)}% luck!`;
    if (item.decaySlow > 0) msg += ` Decay slowed!`;
    Toast.show(msg, '#27ae60', 3000);
  },

  // Called by admin broadcast
  applyAdminHunger(value) {
    App.hunger = Math.max(0, Math.min(100, value));
    this.updateHUD();
    App.save();
  },
};
