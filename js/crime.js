const Crime = {
  businesses: [
    { id: 0, name: 'Bootleg DVDs',   icon: '\u{1F4C0}', baseCost: 200,       baseIncome: 0.30,  vipReq: 1, maxLevel: 10 },
    { id: 1, name: 'Fake ID Shop',   icon: '\u{1FAAA}', baseCost: 2000,      baseIncome: 2.5,   vipReq: 1, maxLevel: 10 },
    { id: 2, name: 'Chop Shop',      icon: '\u{1F527}', baseCost: 20000,     baseIncome: 18,    vipReq: 2, maxLevel: 10 },
    { id: 3, name: 'Cookie Smuggling',icon: '\u{1F36A}', baseCost: 150000,    baseIncome: 120,   vipReq: 2, maxLevel: 10 },
    { id: 4, name: 'Counterfeiting', icon: '\u{1F5A8}\uFE0F', baseCost: 1500000,   baseIncome: 900,   vipReq: 3, maxLevel: 10 },
    { id: 5, name: 'Money Laundering',icon: '\u{1F9FA}', baseCost: 20000000,  baseIncome: 7000,  vipReq: 4, maxLevel: 10 },
    { id: 6, name: 'Arms Dealing',   icon: '\u{1F4A3}', baseCost: 200000000, baseIncome: 50000, vipReq: 5, maxLevel: 10 },
  ],

  owned: [],
  levels: [],
  managers: [],
  tickInterval: null,
  initialized: false,

  // Raid system
  raid: null, // { targetId, expiresAt, active, shutdownUntil, shutdownBizId }
  raidTimer: null,

  managerTiers: [
    { name: 'None',      mult: 1.0,  costMult: 0 },
    { name: 'Trainee',   mult: 1.25, costMult: 2 },
    { name: 'Expert',    mult: 1.5,  costMult: 5 },
    { name: 'Executive', mult: 2.0,  costMult: 15 },
  ],

  init() {
    if (this.owned.length === 0) {
      this.owned = this.businesses.map(() => false);
      this.levels = this.businesses.map(() => 0);
      this.managers = this.businesses.map(() => 0);
    }
    while (this.managers.length < this.businesses.length) this.managers.push(0);
    while (this.owned.length < this.businesses.length) this.owned.push(false);
    while (this.levels.length < this.businesses.length) this.levels.push(0);
    this.initialized = true;
    this.render();
    this.startTick();
    this.startRaids();
  },

  startTick() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = setInterval(() => this.tick(), 1000);
  },

  tick() {
    // Check if raid defend window expired
    if (this.raid && this.raid.active && Date.now() >= this.raid.expiresAt) {
      this.raidMissed();
    }

    // Check if shutdown expired
    if (this.raid && this.raid.shutdownUntil && Date.now() >= this.raid.shutdownUntil) {
      this.raid.shutdownUntil = null;
      this.raid.shutdownBizId = null;
      this.render();
    }

    const income = this.getTotalIncome();
    if (income > 0) {
      App.addBalance(income);
    }

    // Update total income display
    const totalEl = document.getElementById('crime-total-income');
    if (totalEl) totalEl.textContent = App.formatMoney(this.getTotalIncome()) + '/s';

    // Re-render raid timer if active
    if (this.raid && this.raid.active) {
      this.render();
    }
  },

  getRebirthMultiplier() {
    return typeof Clicker !== 'undefined' ? Clicker.getEarningsMultiplier() : 1;
  },

  getManagerMultiplier(id) {
    const tier = this.managers[id] || 0;
    return this.managerTiers[tier].mult;
  },

  isShutdown(id) {
    return this.raid && this.raid.shutdownBizId === id && this.raid.shutdownUntil && Date.now() < this.raid.shutdownUntil;
  },

  getIncome(id) {
    if (!this.owned[id]) return 0;
    if (this.isShutdown(id)) return 0;
    const biz = this.businesses[id];
    let income = biz.baseIncome * (this.levels[id] + 1) * this.getRebirthMultiplier() * this.getManagerMultiplier(id);
    if (typeof Pets !== 'undefined') income *= Pets.getBoosts().incomeMult;
    return income;
  },

  getTotalIncome() {
    let total = 0;
    for (let i = 0; i < this.businesses.length; i++) {
      total += this.getIncome(i);
    }
    return total;
  },

  getBuyCost(id) {
    return this.businesses[id].baseCost;
  },

  getUpgradeCost(id) {
    return this.businesses[id].baseCost * Math.pow(2, this.levels[id]);
  },

  getManagerCost(id, tier) {
    return this.businesses[id].baseCost * this.managerTiers[tier].costMult;
  },

  canAccess(id) {
    return App.rebirth >= this.businesses[id].vipReq || (typeof Admin !== 'undefined' && Admin.godMode);
  },

  buy(id) {
    if (this.owned[id]) return;
    if (!this.canAccess(id)) return;
    const cost = this.getBuyCost(id);
    if (App.balance < cost && !(typeof Admin !== 'undefined' && Admin.godMode)) return;
    if (!(typeof Admin !== 'undefined' && Admin.godMode)) App.addBalance(-cost);
    this.owned[id] = true;
    this.levels[id] = 0;
    App.save();
    this.render();
  },

  upgrade(id) {
    if (!this.owned[id]) return;
    if (this.levels[id] >= this.businesses[id].maxLevel) return;
    const cost = this.getUpgradeCost(id);
    if (App.balance < cost && !(typeof Admin !== 'undefined' && Admin.godMode)) return;
    if (!(typeof Admin !== 'undefined' && Admin.godMode)) App.addBalance(-cost);
    this.levels[id]++;
    App.save();
    this.render();
  },

  hireManager(id) {
    if (!this.owned[id]) return;
    const currentTier = this.managers[id] || 0;
    const nextTier = currentTier + 1;
    if (nextTier > 3) return;
    const cost = this.getManagerCost(id, nextTier);
    if (App.balance < cost && !(typeof Admin !== 'undefined' && Admin.godMode)) return;
    if (!(typeof Admin !== 'undefined' && Admin.godMode)) App.addBalance(-cost);
    this.managers[id] = nextTier;
    App.save();
    this.render();
  },

  // Raid system
  startRaids() {
    if (this.raidTimer) clearTimeout(this.raidTimer);
    const scheduleNext = () => {
      const ownedCount = this.getOwnedCount();
      if (ownedCount === 0) {
        this.raidTimer = setTimeout(() => scheduleNext(), 5000);
        return;
      }
      const baseDelay = 20000 + Math.random() * 20000; // 20-40s base
      const delay = baseDelay / (1 + ownedCount * 0.15);
      this.raidTimer = setTimeout(() => {
        this.triggerRaid();
        scheduleNext();
      }, delay);
    };
    scheduleNext();
  },

  triggerRaid() {
    const ownedIds = this.owned.map((o, i) => o ? i : -1).filter(i => i >= 0);
    if (ownedIds.length === 0) return;
    // Don't raid if already raiding or shutdown active
    if (this.raid && this.raid.active) return;

    const targetId = ownedIds[Math.floor(Math.random() * ownedIds.length)];
    this.raid = {
      targetId,
      expiresAt: Date.now() + 8000, // 8s to bribe
      active: true,
      shutdownUntil: this.raid ? this.raid.shutdownUntil : null,
      shutdownBizId: this.raid ? this.raid.shutdownBizId : null,
    };
    this.render();
  },

  bribeRaid() {
    if (!this.raid || !this.raid.active) return;
    const bizId = this.raid.targetId;
    const biz = this.businesses[bizId];
    const bribeCost = biz.baseCost * 0.2;

    if (App.balance < bribeCost && !(typeof Admin !== 'undefined' && Admin.godMode)) {
      // Can't afford bribe - treat as missed
      this.raidMissed();
      return;
    }

    if (!(typeof Admin !== 'undefined' && Admin.godMode)) App.addBalance(-bribeCost);
    this.raid.active = false;
    this.render();
  },

  raidMissed() {
    if (!this.raid || !this.raid.active) return;
    const bizId = this.raid.targetId;
    const biz = this.businesses[bizId];

    // Fine: 5x current income
    const fine = this.getIncome(bizId) * 5;
    if (fine > 0) App.addBalance(-Math.min(fine, App.balance));

    // Shutdown for 30s
    this.raid.active = false;
    this.raid.shutdownBizId = bizId;
    this.raid.shutdownUntil = Date.now() + 30000;
    this.render();
  },

  getOwnedCount() {
    return this.owned.filter(o => o).length;
  },

  render() {
    const grid = document.getElementById('crime-grid');
    if (!grid) return;

    const mult = this.getRebirthMultiplier();

    // Check VIP gate
    const lockOverlay = document.getElementById('crime-lock-overlay');
    if (lockOverlay) {
      lockOverlay.classList.toggle('hidden', App.rebirth >= 1 || (typeof Admin !== 'undefined' && Admin.godMode));
    }

    grid.innerHTML = this.businesses.map(biz => {
      const locked = !this.canAccess(biz.id);
      const owned = this.owned[biz.id];
      const level = this.levels[biz.id];
      const maxed = level >= biz.maxLevel;
      const income = this.getIncome(biz.id);
      const shutdown = this.isShutdown(biz.id);
      const managerTier = this.managers[biz.id] || 0;

      if (locked) {
        return `<div class="prop-card crime-card locked">
          <div class="prop-icon">${biz.icon}</div>
          <div class="prop-name">${biz.name}</div>
          <div class="prop-lock">VIP ${biz.vipReq} Required</div>
        </div>`;
      }

      if (!owned) {
        const cost = this.getBuyCost(biz.id);
        const affordable = App.balance >= cost;
        return `<div class="prop-card crime-card${affordable ? ' affordable' : ''}" onclick="Crime.buy(${biz.id})">
          <div class="prop-icon">${biz.icon}</div>
          <div class="prop-name">${biz.name}</div>
          <div class="prop-detail">${App.formatMoney(biz.baseIncome * mult)}/s</div>
          <button class="prop-btn prop-buy-btn">Buy: ${App.formatMoney(cost)}</button>
        </div>`;
      }

      // Owned
      const nextTier = managerTier + 1;
      let managerHtml = '';
      if (managerTier > 0) {
        managerHtml += `<div class="prop-manager-badge">${this.managerTiers[managerTier].name} (${this.managerTiers[managerTier].mult}x)</div>`;
      }
      if (nextTier <= 3) {
        const mCost = this.getManagerCost(biz.id, nextTier);
        const mAffordable = App.balance >= mCost;
        managerHtml += `<button class="prop-manager-btn${mAffordable ? ' affordable' : ''}" onclick="event.stopPropagation();Crime.hireManager(${biz.id})">Hire ${this.managerTiers[nextTier].name}: ${App.formatMoney(mCost)}</button>`;
      } else {
        managerHtml += `<div class="prop-manager-badge maxed">Executive (2x)</div>`;
      }

      // Raid alert
      let raidHtml = '';
      if (this.raid && this.raid.active && this.raid.targetId === biz.id) {
        const remainSec = Math.max(0, Math.ceil((this.raid.expiresAt - Date.now()) / 1000));
        raidHtml = `<div class="crime-raid-alert" onclick="event.stopPropagation();Crime.bribeRaid()">\u{1F6A8} RAID! Bribe! (${remainSec}s)</div>`;
      }

      // Shutdown overlay
      let shutdownHtml = '';
      if (shutdown) {
        const remainSec = Math.max(0, Math.ceil((this.raid.shutdownUntil - Date.now()) / 1000));
        shutdownHtml = `<div class="crime-shutdown-overlay">SHUT DOWN (${remainSec}s)</div>`;
      }

      const upgCost = this.getUpgradeCost(biz.id);
      const affordable = !maxed && App.balance >= upgCost;
      return `<div class="prop-card crime-card owned">
        ${raidHtml}
        ${shutdownHtml}
        <div class="prop-icon">${biz.icon}</div>
        <div class="prop-name">${biz.name}</div>
        <div class="prop-level">Lv ${level}/${biz.maxLevel}</div>
        <div class="prop-detail prop-income-val">${shutdown ? '<span style="color:var(--red)">SHUTDOWN</span>' : App.formatMoney(income) + '/s'}</div>
        ${managerHtml}
        ${maxed
          ? '<button class="prop-btn prop-maxed" disabled>MAXED</button>'
          : `<button class="prop-btn${affordable ? ' affordable' : ''}" onclick="Crime.upgrade(${biz.id})">Upgrade: ${App.formatMoney(upgCost)}</button>`
        }
      </div>`;
    }).join('');

    // Update header income
    const totalEl = document.getElementById('crime-total-income');
    if (totalEl) totalEl.textContent = App.formatMoney(this.getTotalIncome()) + '/s';
  },

  // Save/load
  getSaveData() {
    return {
      owned: this.owned.slice(),
      levels: this.levels.slice(),
      managers: this.managers.slice(),
    };
  },

  loadSaveData(data) {
    if (!data) return;
    if (data.owned) this.owned = data.owned;
    if (data.levels) this.levels = data.levels;
    if (data.managers) this.managers = data.managers;
    while (this.owned.length < this.businesses.length) this.owned.push(false);
    while (this.levels.length < this.businesses.length) this.levels.push(0);
    while (this.managers.length < this.businesses.length) this.managers.push(0);
  },

  // Admin
  maxAll() {
    for (let i = 0; i < this.businesses.length; i++) {
      this.owned[i] = true;
      this.levels[i] = this.businesses[i].maxLevel;
      this.managers[i] = 3;
    }
    App.save();
    this.render();
  },

  resetAll() {
    this.owned = this.businesses.map(() => false);
    this.levels = this.businesses.map(() => 0);
    this.managers = this.businesses.map(() => 0);
    this.raid = null;
    App.save();
    this.render();
  }
};
