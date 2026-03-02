const Crime = {
  _path: null,        // chosen path key or null
  _upgrades: {},      // { upgradeId: true }
  _confirmPath: null, // path key pending confirmation
  _cookieEventTimer: null,
  raid: null,
  raidTimer: null,
  tickInterval: null,
  initialized: false,

  paths: {
    counterfeiting: {
      name: 'Counterfeiting', icon: '🖨️', vipReq: 1, color: '#4CAF50',
      desc: 'Print fake bills and distribute them through black market channels.',
      upgrades: [
        { id: 'cf1', name: 'Copper Plates',      cost: 5000,      income: 50,    desc: 'Start printing low-quality fake bills.' },
        { id: 'cf2', name: 'Better Ink',          cost: 25000,     income: 200,   desc: 'Higher quality prints that pass inspection.' },
        { id: 'cf3', name: 'Distribution Ring',   cost: 100000,    income: 800,   desc: 'Network of street-level distributors.' },
        { id: 'cf4', name: 'High-End Press',      cost: 500000,    income: 3000,  desc: 'Industrial printing equipment.' },
        { id: 'cf5', name: 'Overseas Accounts',   cost: 2000000,   income: 12000, desc: 'Launder proceeds internationally. Fines reduced 30%.', fineMult: 0.7 },
        { id: 'cf6', name: 'Shadow Bank',          cost: 10000000,  income: 50000, desc: 'Your own underground banking system. Raids 50% less frequent.', raidMult: 0.5 },
      ]
    },
    arms: {
      name: 'Arms Dealing', icon: '💣', vipReq: 2, color: '#F44336',
      desc: 'Source and sell illegal weapons to the highest bidder.',
      upgrades: [
        { id: 'ar1', name: 'Back Alley Contacts',   cost: 10000,     income: 80,    desc: 'Find your first weapons suppliers.' },
        { id: 'ar2', name: 'Better Suppliers',       cost: 50000,     income: 400,   desc: 'Quality goods, higher margins.' },
        { id: 'ar3', name: 'International Brokers',  cost: 250000,    income: 2000,  desc: 'Connect buyers and sellers worldwide.' },
        { id: 'ar4', name: 'Weapons Cache',           cost: 1000000,   income: 8000,  desc: 'Store inventory to meet high demand.' },
        { id: 'ar5', name: 'Military Contracts',      cost: 5000000,   income: 30000, desc: 'Supply to conflict zones for top dollar.' },
        { id: 'ar6', name: 'Global Cartel',           cost: 25000000,  income: 120000,desc: 'Dominate the black market supply chain.' },
      ]
    },
    hacking: {
      name: 'Hacking / Piracy', icon: '💻', vipReq: 1, color: '#2196F3',
      desc: 'Hack systems and run piracy operations for profit. Gives a passive bonus to Slots winnings.',
      upgrades: [
        { id: 'hk1', name: 'Script Kiddie',       cost: 3000,      income: 30,    slotsBonus: 0.05, desc: 'Basic exploits for quick cash.' },
        { id: 'hk2', name: 'SQL Injection',        cost: 15000,     income: 150,   slotsBonus: 0.05, desc: 'Target business databases for bigger scores.' },
        { id: 'hk3', name: 'VPN Network',          cost: 75000,     income: 600,   slotsBonus: 0.05, raidMult: 0.75, desc: 'Stay anonymous. Raids 25% less frequent.' },
        { id: 'hk4', name: 'Zero-Day Exploits',    cost: 400000,    income: 2500,  slotsBonus: 0.10, desc: 'High-value government and bank targets.' },
        { id: 'hk5', name: 'Casino Backdoor',      cost: 2000000,   income: 10000, slotsBonus: 0.15, desc: 'Rig the casino slots in your favor.' },
        { id: 'hk6', name: 'Dark Web Empire',      cost: 10000000,  income: 40000, slotsBonus: 0.20, desc: 'Operate across the dark web unchallenged.' },
      ]
    },
    cookies: {
      name: 'Cookie Smuggling', icon: '🍪', vipReq: 1, color: '#FF9800',
      desc: 'Run a secret underground cookie empire and flood the market with contraband treats.',
      upgrades: [
        { id: 'ck1', name: "Grandma's Recipe",      cost: 2000,      income: 20,    desc: 'The secret ingredient is crime.' },
        { id: 'ck2', name: 'Secret Ingredients',    cost: 10000,     income: 100,   desc: 'Enhance cookies with premium contraband.' },
        { id: 'ck3', name: 'Delivery Network',      cost: 60000,     income: 500,   desc: 'Distribute cookies disguised as gift baskets.' },
        { id: 'ck4', name: 'Hidden Bakeries',       cost: 300000,    income: 2000,  desc: 'Underground baking facilities nationwide.' },
        { id: 'ck5', name: 'International Tunnels', cost: 1500000,   income: 8000,  cookieEvent: true, desc: 'Smuggle cookies across borders. Unlocks random cookie shipment bonuses.' },
        { id: 'ck6', name: 'Cookie Cartel',          cost: 8000000,   income: 35000, desc: 'Corner the global underground cookie market.' },
      ]
    }
  },

  // ── Initialization ──────────────────────────────────────────────────────────

  init() {
    this.initialized = true;
    this.render();
    this.startTick();
    if (this._path) {
      this.startRaids();
      if (this._path === 'cookies') this.startCookieEvents();
    }
  },

  startTick() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = setInterval(() => this.tick(), 1000);
  },

  tick() {
    if (this.raid && this.raid.active && Date.now() >= this.raid.expiresAt) {
      this.raidMissed();
    }
    if (this.raid && this.raid.shutdownUntil && Date.now() >= this.raid.shutdownUntil) {
      this.raid.shutdownUntil = null;
      this.render();
    }

    const income = this.getTotalIncome();
    if (income > 0) App.addBalance(income);

    const el = document.getElementById('crime-total-income');
    if (el) el.textContent = App.formatMoney(income) + '/s';

    if (this.raid && this.raid.active) this.render();
  },

  // ── Path System ─────────────────────────────────────────────────────────────

  choosePath(key) {
    if (this._path) return;
    const p = this.paths[key];
    if (!p) return;
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (App.rebirth < p.vipReq && !isGod) return;
    this._confirmPath = key;
    this.render();
  },

  confirmChoosePath() {
    if (!this._confirmPath) return;
    this._path = this._confirmPath;
    this._confirmPath = null;
    App.save();
    this.render();
    this.startRaids();
    if (this._path === 'cookies') this.startCookieEvents();
    if (typeof Toast !== 'undefined') Toast.show(`${this.paths[this._path].icon} Empire chosen: ${this.paths[this._path].name}`, '#bb86fc', 3000);
  },

  cancelChoosePath() {
    this._confirmPath = null;
    this.render();
  },

  // ── Upgrades ────────────────────────────────────────────────────────────────

  buyUpgrade(id) {
    if (!this._path) return;
    const path = this.paths[this._path];
    const idx = path.upgrades.findIndex(u => u.id === id);
    if (idx < 0 || this._upgrades[id]) return;
    if (idx > 0 && !this._upgrades[path.upgrades[idx - 1].id]) return;
    const upg = path.upgrades[idx];
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (!isGod && App.balance < upg.cost) return;
    if (!isGod) App.addBalance(-upg.cost);
    this._upgrades[id] = true;
    if (upg.cookieEvent && this._path === 'cookies') this.startCookieEvents();
    App.save();
    this.render();
  },

  getTotalIncome() {
    if (!this._path) return 0;
    if (this.isShutdown()) return 0;
    const path = this.paths[this._path];
    let total = 0;
    path.upgrades.forEach(upg => {
      if (this._upgrades[upg.id]) total += upg.income;
    });
    const rebirthMult = typeof Clicker !== 'undefined' ? Clicker.getEarningsMultiplier() : 1;
    const petsMult = typeof Pets !== 'undefined' ? Pets.getBoosts().incomeMult : 1;
    const boosts = typeof App !== 'undefined' ? App.getAllBoosts() : {};
    const crimeMult = 1 + (boosts.crimeBonus || 0);
    // Hacking path gets hackingBonus on top
    const hackMult = (this._path === 'hacking') ? 1 + (boosts.hackingBonus || 0) : 1;
    // World event crime multiplier
    const eventMult = typeof Events !== 'undefined' ? Events.getCrimeMultiplier() : 1;
    return total * rebirthMult * petsMult * crimeMult * hackMult * eventMult;
  },

  getSlotsBonus() {
    if (this._path !== 'hacking') return 1.0;
    let bonus = 0;
    this.paths.hacking.upgrades.forEach(upg => {
      if (this._upgrades[upg.id] && upg.slotsBonus) bonus += upg.slotsBonus;
    });
    return 1 + bonus;
  },

  isShutdown() {
    return !!(this.raid && this.raid.shutdownUntil && Date.now() < this.raid.shutdownUntil);
  },

  getRaidMult() {
    if (!this._path) return 1;
    let mult = 1;
    this.paths[this._path].upgrades.forEach(upg => {
      if (this._upgrades[upg.id] && upg.raidMult) mult *= upg.raidMult;
    });
    // Apply house/item raidReduction (bigger raidReductionMult = longer delay = fewer raids)
    const boosts = typeof App !== 'undefined' ? App.getAllBoosts() : {};
    mult *= (1 + (boosts.raidReductionMult || 0));
    return mult;
  },

  getFineMult() {
    if (!this._path) return 1;
    let mult = 1;
    this.paths[this._path].upgrades.forEach(upg => {
      if (this._upgrades[upg.id] && upg.fineMult) mult *= upg.fineMult;
    });
    return mult;
  },

  // ── Raid System ─────────────────────────────────────────────────────────────

  startRaids() {
    if (this.raidTimer) clearTimeout(this.raidTimer);
    const scheduleNext = () => {
      if (!this._path) return;
      if (Object.keys(this._upgrades).length === 0) {
        this.raidTimer = setTimeout(scheduleNext, 15000);
        return;
      }
      const baseDelay = 25000 + Math.random() * 25000;
      const delay = baseDelay * this.getRaidMult();
      this.raidTimer = setTimeout(() => {
        this.triggerRaid();
        scheduleNext();
      }, delay);
    };
    scheduleNext();
  },

  triggerRaid() {
    if (!this._path || (this.raid && this.raid.active)) return;
    this.raid = {
      expiresAt: Date.now() + 10000,
      active: true,
      shutdownUntil: this.raid ? this.raid.shutdownUntil : null,
    };
    this.render();
  },

  bribeRaid() {
    if (!this.raid || !this.raid.active) return;
    const bribeCost = Math.max(100, Math.floor(this.getTotalIncome() * 8));
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (!isGod && App.balance < bribeCost) { this.raidMissed(); return; }
    if (!isGod) App.addBalance(-bribeCost);
    this.raid.active = false;
    if (typeof Toast !== 'undefined') Toast.show('🚔 Raid bribed off!', '#4caf50', 2500);
    this.render();
  },

  raidMissed() {
    if (!this.raid || !this.raid.active) return;
    const fine = Math.max(100, Math.floor(this.getTotalIncome() * 20 * this.getFineMult()));
    App.addBalance(-Math.min(fine, App.balance));
    this.raid.active = false;
    this.raid.shutdownUntil = Date.now() + 45000;
    if (typeof Toast !== 'undefined') Toast.show('🚔 RAIDED! Shut down for 45s!', '#f44336', 4000);
    this.render();
  },

  // ── Cookie Events ────────────────────────────────────────────────────────────

  startCookieEvents() {
    if (this._cookieEventTimer) clearTimeout(this._cookieEventTimer);
    const scheduleNext = () => {
      if (this._path !== 'cookies' || !this._upgrades['ck5']) {
        this._cookieEventTimer = setTimeout(scheduleNext, 5000);
        return;
      }
      const delay = 60000 + Math.random() * 60000;
      this._cookieEventTimer = setTimeout(() => {
        this._triggerCookieEvent();
        scheduleNext();
      }, delay);
    };
    scheduleNext();
  },

  _triggerCookieEvent() {
    if (this._path !== 'cookies') return;
    const income = this.getTotalIncome();
    const bonus = Math.floor(income * (30 + Math.random() * 30));
    if (bonus > 0) {
      App.addBalance(bonus);
      if (typeof Toast !== 'undefined') Toast.show(`🍪 Secret shipment arrived! +${App.formatMoney(bonus)}`, '#FF9800', 4000);
    }
  },

  // ── Render ──────────────────────────────────────────────────────────────────

  render() {
    const grid = document.getElementById('crime-grid');
    if (!grid) return;

    const lockOverlay = document.getElementById('crime-lock-overlay');
    if (lockOverlay) {
      lockOverlay.classList.toggle('hidden', App.rebirth >= 1 || (typeof Admin !== 'undefined' && Admin.godMode));
    }

    const totalEl = document.getElementById('crime-total-income');
    if (totalEl) totalEl.textContent = App.formatMoney(this.getTotalIncome()) + '/s';

    if (!this._path) {
      grid.innerHTML = this._confirmPath ? this._renderConfirm() : this._renderPathSelect();
    } else {
      grid.innerHTML = this._renderUpgradeTree();
    }
  },

  _renderPathSelect() {
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    const cards = Object.entries(this.paths).map(([key, p]) => {
      const locked = App.rebirth < p.vipReq && !isGod;
      return `
        <div class="crime-path-card${locked ? ' locked' : ''}" style="--path-color:${p.color}"
             ${locked ? '' : `onclick="Crime.choosePath('${key}')"`}>
          <div class="crime-path-icon">${p.icon}</div>
          <div class="crime-path-name">${p.name}</div>
          <div class="crime-path-desc">${p.desc}</div>
          ${locked
            ? `<div class="crime-path-lock">🔒 VIP ${p.vipReq} Required</div>`
            : '<div class="crime-path-start">Tap to Select</div>'
          }
        </div>`;
    }).join('');

    return `
      <div class="crime-path-header">
        <div class="crime-path-title">Choose Your Criminal Empire</div>
        <div class="crime-path-subtitle">This choice is <strong>permanent</strong>. Choose wisely.</div>
      </div>
      <div class="crime-path-grid">${cards}</div>`;
  },

  _renderConfirm() {
    const p = this.paths[this._confirmPath];
    return `
      <div class="crime-confirm-overlay">
        <div class="crime-confirm-box">
          <div class="crime-confirm-icon">${p.icon}</div>
          <div class="crime-confirm-title">${p.name}</div>
          <div class="crime-confirm-desc">${p.desc}</div>
          <div class="crime-confirm-warning">⚠️ This choice is <strong>permanent</strong> and cannot be undone.</div>
          <div class="crime-confirm-btns">
            <button class="crime-confirm-yes" onclick="Crime.confirmChoosePath()">Choose Forever</button>
            <button class="crime-confirm-no" onclick="Crime.cancelChoosePath()">Cancel</button>
          </div>
        </div>
      </div>`;
  },

  _renderUpgradeTree() {
    const path = this.paths[this._path];
    const rebirthMult = typeof Clicker !== 'undefined' ? Clicker.getEarningsMultiplier() : 1;
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;

    // Raid / shutdown banner
    let raidHtml = '';
    if (this.raid && this.raid.active) {
      const remainSec = Math.max(0, Math.ceil((this.raid.expiresAt - Date.now()) / 1000));
      const bribeCost = Math.max(100, Math.floor(this.getTotalIncome() * 8));
      const canAfford = isGod || App.balance >= bribeCost;
      raidHtml = `
        <div class="crime-raid-banner">
          🚔 RAID IN PROGRESS! ${remainSec}s
          <button class="crime-bribe-btn${canAfford ? '' : ' unaffordable'}" onclick="Crime.bribeRaid()">
            Bribe ${App.formatMoney(bribeCost)}
          </button>
        </div>`;
    } else if (this.isShutdown()) {
      const remainSec = Math.max(0, Math.ceil((this.raid.shutdownUntil - Date.now()) / 1000));
      raidHtml = `<div class="crime-shutdown-banner">🚔 SHUT DOWN — ${remainSec}s remaining</div>`;
    }

    // Hacking slots bonus badge
    let specialHtml = '';
    if (this._path === 'hacking') {
      const bonusPct = Math.round((this.getSlotsBonus() - 1) * 100);
      if (bonusPct > 0) specialHtml = `<div class="crime-special-badge">🎰 Slots Bonus: +${bonusPct}%</div>`;
    }

    // Upgrade list
    const upgradesHtml = path.upgrades.map((upg, idx) => {
      const owned = !!this._upgrades[upg.id];
      const prevOwned = idx === 0 || !!this._upgrades[path.upgrades[idx - 1].id];
      const locked = !prevOwned;
      const affordable = !owned && !locked && (isGod || App.balance >= upg.cost);

      let incomeHtml = upg.income
        ? `<span class="crime-upg-income">+${App.formatMoney(upg.income * rebirthMult)}/s</span>`
        : '';

      const bonusBits = [];
      if (upg.slotsBonus) bonusBits.push(`+${Math.round(upg.slotsBonus * 100)}% slots`);
      if (upg.raidMult) bonusBits.push(`${Math.round((1 - upg.raidMult) * 100)}% fewer raids`);
      if (upg.fineMult) bonusBits.push(`${Math.round((1 - upg.fineMult) * 100)}% lower fines`);
      if (upg.cookieEvent) bonusBits.push('Cookie shipment events');
      const bonusHtml = bonusBits.length ? `<span class="crime-upg-bonus">${bonusBits.join(' · ')}</span>` : '';

      let actionHtml;
      if (owned) {
        actionHtml = '<div class="crime-upg-owned-badge">✓</div>';
      } else if (locked) {
        actionHtml = '<div class="crime-upg-locked-icon">🔒</div>';
      } else {
        actionHtml = `<button class="crime-upg-btn${affordable ? ' affordable' : ''}" onclick="Crime.buyUpgrade('${upg.id}')">${App.formatMoney(upg.cost)}</button>`;
      }

      return `
        <div class="crime-upg-item${owned ? ' owned' : ''}${locked ? ' locked' : ''}${affordable ? ' affordable' : ''}">
          <div class="crime-upg-num">${idx + 1}</div>
          <div class="crime-upg-info">
            <div class="crime-upg-name">${upg.name}</div>
            <div class="crime-upg-desc">${upg.desc}</div>
            <div class="crime-upg-stats">${incomeHtml}${bonusHtml}</div>
          </div>
          <div class="crime-upg-action">${actionHtml}</div>
        </div>`;
    }).join('');

    return `
      <div class="crime-empire-header" style="--path-color:${path.color}">
        <div class="crime-empire-icon">${path.icon}</div>
        <div class="crime-empire-info">
          <div class="crime-empire-name">${path.name}</div>
          <div class="crime-empire-income">${App.formatMoney(this.getTotalIncome())}/s${this.isShutdown() ? ' <span style="color:var(--red)">(OFFLINE)</span>' : ''}</div>
        </div>
        ${specialHtml}
      </div>
      ${raidHtml}
      <div class="crime-upg-list">${upgradesHtml}</div>`;
  },

  // ── Save / Load ─────────────────────────────────────────────────────────────

  getSaveData() {
    return { path: this._path, upgrades: { ...this._upgrades } };
  },

  loadSaveData(data) {
    if (!data) return;
    if (data.path && this.paths[data.path]) this._path = data.path;
    if (data.upgrades && typeof data.upgrades === 'object') this._upgrades = { ...data.upgrades };
  },

  // ── Admin ────────────────────────────────────────────────────────────────────

  maxAll() {
    if (!this._path) return;
    this.paths[this._path].upgrades.forEach(upg => { this._upgrades[upg.id] = true; });
    App.save();
    this.render();
  },

  resetAll() {
    this._path = null;
    this._upgrades = {};
    this._confirmPath = null;
    this.raid = null;
    App.save();
    this.render();
  }
};
