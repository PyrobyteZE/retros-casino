const Properties = {
  businesses: [
    { id: 0, name: 'Laundromat',     icon: '\u{1F9FA}', baseCost: 50,        baseIncome: 0.10,  vipReq: 0, maxLevel: 10 },
    { id: 1, name: 'Gas Station',    icon: '\u26FD',     baseCost: 500,       baseIncome: 0.80,  vipReq: 0, maxLevel: 10 },
    { id: 2, name: 'Restaurant',     icon: '\u{1F37D}\uFE0F', baseCost: 5000, baseIncome: 5,     vipReq: 1, maxLevel: 10 },
    { id: 3, name: 'Car Dealership', icon: '\u{1F697}',  baseCost: 50000,     baseIncome: 35,    vipReq: 2, maxLevel: 10 },
    { id: 4, name: 'Factory',        icon: '\u{1F3ED}',  baseCost: 500000,    baseIncome: 250,   vipReq: 3, maxLevel: 10 },
    { id: 5, name: 'Hotel',          icon: '\u{1F3E8}',  baseCost: 10000000,  baseIncome: 2500,  vipReq: 4, maxLevel: 10 },
    { id: 6, name: 'Casino Resort',  icon: '\u{1F3B0}',  baseCost: 100000000, baseIncome: 18000, vipReq: 5, maxLevel: 10 },
  ],

  owned: [],   // bool per business
  levels: [],  // 0-10 per business
  managers: [], // 0=none, 1=trainee, 2=expert, 3=executive per business

  // Gas station supplier: null = NPC oil, 'own' = player's own energy company
  _gasSupplier: null,  // null | 'npc' | 'own'
  // Factory production type
  _factoryGoods: 'generic',  // 'generic' | 'auto_parts' | 'electronics' | 'produce'

  // Other players' energy companies (populated from Firebase)
  _playerOilCompanies: [],  // [{ uid, ownerName, ticker, name }]

  FACTORY_GOODS: {
    generic:     { label: '🏭 Generic Goods',     mult: 1.00, desc: 'Standard production' },
    auto_parts:  { label: '🔩 Auto Parts',         mult: 1.18, desc: '+18% income. Bonus if you own Cars.' },
    electronics: { label: '📡 Electronics',        mult: 1.12, desc: '+12% income. Bonus with tech companies.' },
    produce:     { label: '🌽 Food Products',      mult: 1.08, desc: '+8% income. Bonus with Restaurant.' },
  },

  tickInterval: null,

  // Events system
  eventTimer: null,
  activeEvent: null, // { name, icon, effect, endsAt, type }
  events: [
    { name: 'Golden Hour',      icon: '\u2728', effect: 'all_3x',          duration: 15000, type: 'golden' },
    { name: 'Tax Audit',        icon: '\u{1F4CB}', effect: 'all_half',     duration: 30000, type: 'bad' },
    { name: 'Robbery',          icon: '\u{1F4A5}', effect: 'robbery',      duration: 0,     type: 'bad' },
    { name: 'Health Inspector', icon: '\u{1F6D1}', effect: 'restaurant_closed', duration: 20000, type: 'bad' },
    { name: 'Viral Marketing',  icon: '\u{1F4F1}', effect: 'one_5x',       duration: 20000, type: 'golden' },
    { name: 'Supply Shortage',  icon: '\u{1F4E6}', effect: 'factory_gas_half',  duration: 25000, type: 'bad' },
    { name: 'Lucky Break',      icon: '\u{1F340}', effect: 'lucky_break',  duration: 0,     type: 'golden' },
  ],

  // Rival system
  rival: null, // { targetId, expiresAt, active, bonusUntil, bonusBizId }
  rivalTimer: null,

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
    // Ensure managers array exists
    while (this.managers.length < this.businesses.length) this.managers.push(0);
    this.render();
    this.startTick();
    this.startEvents();
    this.startRival();
    // Listen for other players' energy companies for gas station supplier
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.listenAllCompaniesForProperties(data => {
        const myUid = Firebase.uid;
        this._playerOilCompanies = [];
        for (const [uid, playerData] of Object.entries(data || {})) {
          if (uid === myUid) continue; // own companies handled separately
          const companies = playerData.companies || [];
          for (const c of companies) {
            if ((c.industry || '') === 'energy') {
              this._playerOilCompanies.push({
                uid, ownerName: c.ownerName || playerData.ownerName || 'Unknown',
                name: c.name, ticker: c.ticker || c.stocks?.[0]?.symbol || 'OIL',
                stocks: c.stocks || [],
              });
            }
          }
        }
        if (App.currentScreen === 'properties') this.render();
      });
    }
  },

  startTick() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = setInterval(() => this.tick(), 1000);
  },

  tick() {
    // Check if active event expired
    if (this.activeEvent && this.activeEvent.endsAt && Date.now() >= this.activeEvent.endsAt) {
      this.activeEvent = null;
      this.renderEventBanner();
      this.render();
    }

    // Check if rival defend window expired
    if (this.rival && this.rival.active && Date.now() >= this.rival.expiresAt) {
      // Missed defend - rival damages business
      this.rivalDamage(this.rival.targetId);
      this.rival.active = false;
      this.render();
    }

    // Check if rival damage/bonus expired
    if (this.rival && this.rival.bonusUntil && Date.now() >= this.rival.bonusUntil) {
      this.rival.bonusUntil = null;
      this.rival.bonusBizId = null;
      this.rival.damageUntil = null;
      this.rival.damageBizId = null;
      this.render();
    }

    const income = this.getTotalIncome();
    if (income > 0) {
      App.addBalance(income);
    }
  },

  getRebirthMultiplier() {
    return typeof Clicker !== 'undefined' ? Clicker.getEarningsMultiplier() : 1;
  },

  getEventMultiplier(id) {
    if (!this.activeEvent) return 1;
    const ev = this.activeEvent;
    const now = Date.now();
    if (ev.endsAt && now >= ev.endsAt) return 1;

    switch (ev.effect) {
      case 'all_3x': return 3;
      case 'all_half': return 0.5;
      case 'restaurant_closed': return id === 2 ? 0 : 1;
      case 'one_5x': return ev.targetId === id ? 5 : 1;
      case 'factory_gas_half': return (id === 1 || id === 4) ? 0.5 : 1;
      default: return 1;
    }
  },

  getRivalMultiplier(id) {
    if (!this.rival) return 1;
    // Damage active
    if (this.rival.damageBizId === id && this.rival.damageUntil && Date.now() < this.rival.damageUntil) {
      return 0.5;
    }
    // Bonus active (defended successfully)
    if (this.rival.bonusBizId === id && this.rival.bonusUntil && Date.now() < this.rival.bonusUntil) {
      return 1.1;
    }
    return 1;
  },

  getManagerMultiplier(id) {
    const tier = this.managers[id] || 0;
    return this.managerTiers[tier].mult;
  },

  getIncome(id) {
    if (!this.owned[id]) return 0;
    const biz = this.businesses[id];
    let income = biz.baseIncome * (this.levels[id] + 1) * this.getRebirthMultiplier()
      * this.getManagerMultiplier(id)
      * this.getEventMultiplier(id)
      * this.getRivalMultiplier(id);
    if (typeof Pets !== 'undefined') income *= Pets.getBoosts().incomeMult;

    // Gas Station: supplier bonus
    if (id === 1) income *= this._getGasSupplierMult();

    // Factory: goods type bonus
    if (id === 4) income *= this._getFactoryGoodsMult();

    return income;
  },

  _getGasSupplierMult() {
    if (this._gasSupplier === 'own') {
      // Own energy company: free oil + premium brand = +30% income
      return 1.30;
    }
    if (this._gasSupplier && this._gasSupplier !== 'npc') {
      // Another player's energy company: +15% income (cheaper deal, mutual benefit)
      // Find the player company and check its stock price vs base for a small multiplier variation
      const pc = this._playerOilCompanies.find(c => c.uid === this._gasSupplier);
      if (pc && pc.stocks && pc.stocks.length > 0) {
        const s = pc.stocks[0];
        const ratio = s.price && s.basePrice ? s.price / s.basePrice : 1;
        // Cheaper stock = cheaper oil for us = slightly higher margin
        const bonus = Math.max(-0.05, Math.min(0.05, (1 - ratio) * 0.1));
        return 1.15 + bonus;
      }
      return 1.15;
    }
    // NPC oil: income reduced when oil stocks are high (market price)
    if (typeof Companies !== 'undefined') {
      let oilPrice = 0, oilBase = 0, count = 0;
      for (const c of Companies._companies) {
        if ((c.industry || '') === 'energy') {
          for (const s of (c.stocks || [])) {
            if (s.price && s.basePrice) { oilPrice += s.price; oilBase += s.basePrice; count++; }
          }
        }
      }
      if (count > 0 && oilBase > 0) {
        const ratio = oilPrice / oilBase;
        return Math.max(0.70, 1 - (ratio - 1) * 0.15);
      }
    }
    return 1;
  },

  _getFactoryGoodsMult() {
    const goods = this.FACTORY_GOODS[this._factoryGoods] || this.FACTORY_GOODS.generic;
    let mult = goods.mult;
    // Auto parts bonus if player has cars
    if (this._factoryGoods === 'auto_parts' && typeof Cars !== 'undefined' && Cars._garage.length > 0) mult += 0.07;
    // Electronics bonus if player has tech companies
    if (this._factoryGoods === 'electronics' && typeof Companies !== 'undefined') {
      const hasTech = Companies._companies.some(c => (c.industry || '') === 'tech');
      if (hasTech) mult += 0.08;
    }
    // Produce bonus if restaurant owned
    if (this._factoryGoods === 'produce' && this.owned[2]) mult += 0.05;
    return mult;
  },

  getSellPrice(id) {
    return Math.floor(this.businesses[id].baseCost * 0.5);
  },

  sell(id) {
    if (!this.owned[id]) return;
    const refund = this.getSellPrice(id);
    this.owned[id] = false;
    this.levels[id] = 0;
    this.managers[id] = 0;
    App.addBalance(refund);
    App.save();
    Toast.show(`Sold ${this.businesses[id].name} for ${App.formatMoney(refund)}`, '#00e676', 2500);
    this.render();
  },

  // Butler: unlocked at 70 rebirths — auto-defends rival, filters bad events
  _hasButler() { return (App.rebirth || 0) >= 70; },

  getTotalIncome() {
    let total = 0;
    for (let i = 0; i < this.businesses.length; i++) {
      total += this.getIncome(i);
    }
    return total;
  },

  getBuyCost(id) {
    const biz = this.businesses[id];
    return biz.baseCost;
  },

  getUpgradeCost(id) {
    const biz = this.businesses[id];
    return biz.baseCost * Math.pow(2, this.levels[id]);
  },

  getManagerCost(id, tier) {
    const biz = this.businesses[id];
    return biz.baseCost * this.managerTiers[tier].costMult;
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

  // Manager system
  hireManager(id) {
    if (!this.owned[id]) return;
    const currentTier = this.managers[id] || 0;
    const nextTier = currentTier + 1;
    if (nextTier > 3) return; // Already at max (Executive)
    const cost = this.getManagerCost(id, nextTier);
    if (App.balance < cost && !(typeof Admin !== 'undefined' && Admin.godMode)) return;
    if (!(typeof Admin !== 'undefined' && Admin.godMode)) App.addBalance(-cost);
    this.managers[id] = nextTier;
    App.save();
    this.render();
  },

  // Events system
  startEvents() {
    if (this.eventTimer) clearInterval(this.eventTimer);
    const scheduleNext = () => {
      const delay = 30000 + Math.random() * 30000; // 30-60s
      this.eventTimer = setTimeout(() => {
        this.fireEvent();
        scheduleNext();
      }, delay);
    };
    scheduleNext();
  },

  fireEvent() {
    // Only fire if player owns at least one property
    const ownedCount = this.owned.filter(o => o).length;
    if (ownedCount === 0) return;

    let event = this.events[Math.floor(Math.random() * this.events.length)];
    // Butler blocks bad events (re-roll once for a good event)
    if (this._hasButler() && event.type === 'bad') {
      const goodEvents = this.events.filter(e => e.type !== 'bad');
      if (goodEvents.length > 0) {
        event = goodEvents[Math.floor(Math.random() * goodEvents.length)];
        Toast.show('🛎️ Butler prevented a bad business event!', '#00e676', 2500);
      }
    }
    const now = Date.now();

    // Handle instant events
    if (event.effect === 'robbery') {
      const ownedIds = this.owned.map((o, i) => o ? i : -1).filter(i => i >= 0);
      const targetId = ownedIds[Math.floor(Math.random() * ownedIds.length)];
      const biz = this.businesses[targetId];
      const lossPercent = 0.1 + Math.random() * 0.2; // 10-30%
      const loss = biz.baseIncome * (this.levels[targetId] + 1) * lossPercent * 10;
      App.addBalance(-Math.min(loss, App.balance));
      this.activeEvent = { name: event.name + ' on ' + biz.name, icon: event.icon, effect: event.effect, endsAt: now + 3000, type: event.type };
      this.renderEventBanner();
      this.render();
      return;
    }

    if (event.effect === 'lucky_break') {
      const bonus = this.getTotalIncome() * 10;
      App.addBalance(bonus);
      this.activeEvent = { name: event.name + '! +' + App.formatMoney(bonus), icon: event.icon, effect: event.effect, endsAt: now + 3000, type: event.type };
      this.renderEventBanner();
      this.render();
      return;
    }

    // Duration events
    const ev = {
      name: event.name,
      icon: event.icon,
      effect: event.effect,
      endsAt: now + event.duration,
      type: event.type,
    };

    // For one_5x, pick a random owned business
    if (event.effect === 'one_5x') {
      const ownedIds = this.owned.map((o, i) => o ? i : -1).filter(i => i >= 0);
      ev.targetId = ownedIds[Math.floor(Math.random() * ownedIds.length)];
      ev.name = event.name + ': ' + this.businesses[ev.targetId].name;
    }

    this.activeEvent = ev;
    this.renderEventBanner();
    this.render();
  },

  renderEventBanner() {
    const banner = document.getElementById('prop-event-banner');
    if (!banner) return;
    if (!this.activeEvent || (this.activeEvent.endsAt && Date.now() >= this.activeEvent.endsAt)) {
      banner.classList.add('hidden');
      banner.className = 'prop-event hidden';
      return;
    }
    const ev = this.activeEvent;
    const remaining = ev.endsAt ? Math.max(0, Math.ceil((ev.endsAt - Date.now()) / 1000)) : 0;
    banner.className = 'prop-event ' + (ev.type || '');
    banner.classList.remove('hidden');
    banner.innerHTML = `${ev.icon} ${ev.name}${remaining > 0 ? ' (' + remaining + 's)' : ''}`;
  },

  // Rival system
  startRival() {
    if (this.rivalTimer) clearTimeout(this.rivalTimer);
    const scheduleNext = () => {
      const delay = 45000 + Math.random() * 45000; // 45-90s
      this.rivalTimer = setTimeout(() => {
        this.rivalAttack();
        scheduleNext();
      }, delay);
    };
    scheduleNext();
  },

  rivalAttack() {
    const ownedIds = this.owned.map((o, i) => o ? i : -1).filter(i => i >= 0);
    if (ownedIds.length === 0) return;

    const targetId = ownedIds[Math.floor(Math.random() * ownedIds.length)];

    // Butler auto-defends
    if (this._hasButler()) {
      // Auto-defend — grant bonus immediately
      this.rival = { targetId, expiresAt: Date.now(), active: false, bonusBizId: targetId, bonusUntil: Date.now() + 30000, damageUntil: null, damageBizId: null };
      Toast.show('🛎️ Butler defended a rival attack on ' + this.businesses[targetId].name + '!', '#00e676', 3000);
      this.render();
      return;
    }

    this.rival = {
      targetId,
      expiresAt: Date.now() + 10000, // 10s to defend
      active: true,
      bonusUntil: null,
      bonusBizId: null,
      damageUntil: null,
      damageBizId: null,
    };
    this.render();
  },

  defendRival() {
    if (!this.rival || !this.rival.active) return;
    const bizId = this.rival.targetId;
    this.rival.active = false;
    this.rival.bonusBizId = bizId;
    this.rival.bonusUntil = Date.now() + 30000; // 10% bonus for 30s
    this.render();
  },

  rivalDamage(bizId) {
    if (!this.rival) this.rival = {};
    this.rival.damageBizId = bizId;
    this.rival.damageUntil = Date.now() + 30000; // 50% income for 30s
  },

  getOwnedCount() {
    return this.owned.filter(o => o).length;
  },

  // Gas supplier setter (called from UI)
  setGasSupplier(val) {
    this._gasSupplier = val || null;
    App.save();
    this.render();
  },

  setFactoryGoods(val) {
    this._factoryGoods = val || 'generic';
    App.save();
    this.render();
  },

  render() {
    const grid = document.getElementById('prop-grid');
    if (!grid) return;

    const rebirth = App.rebirth || 0;
    const mult = this.getRebirthMultiplier();
    const hasButler = this._hasButler();

    // Update event banner timer
    this.renderEventBanner();

    // Butler status bar
    let butlerBar = '';
    if (hasButler) {
      butlerBar = `<div class="prop-butler-bar">🛎️ Butler Active — auto-defending all properties</div>`;
    } else if (rebirth >= 60) {
      butlerBar = `<div class="prop-butler-bar prop-butler-locked">🛎️ Butler at 70 rebirths (you have ${rebirth})</div>`;
    }
    const header = document.getElementById('prop-header-extra');
    if (header) header.innerHTML = butlerBar;

    grid.innerHTML = this.businesses.map(biz => {
      const locked = !this.canAccess(biz.id);
      const owned = this.owned[biz.id];
      const level = this.levels[biz.id];
      const maxed = level >= biz.maxLevel;
      const income = this.getIncome(biz.id);
      const managerTier = this.managers[biz.id] || 0;

      if (locked) {
        return `<div class="prop-card locked">
          <div class="prop-icon">${biz.icon}</div>
          <div class="prop-name">${biz.name}</div>
          <div class="prop-lock">Rebirth ${biz.vipReq} Required (you have ${rebirth})</div>
        </div>`;
      }

      if (!owned) {
        const cost = this.getBuyCost(biz.id);
        const affordable = App.balance >= cost;
        return `<div class="prop-card${affordable ? ' affordable' : ''}" onclick="Properties.buy(${biz.id})">
          <div class="prop-icon">${biz.icon}</div>
          <div class="prop-name">${biz.name}</div>
          <div class="prop-detail">${App.formatMoney(biz.baseIncome * mult)}/s base</div>
          <button class="prop-btn prop-buy-btn">Buy: ${App.formatMoney(cost)}</button>
        </div>`;
      }

      // Owned - build manager section
      const nextTier = managerTier + 1;
      let managerHtml = '';
      if (managerTier > 0) {
        managerHtml += `<div class="prop-manager-badge">${this.managerTiers[managerTier].name} (${this.managerTiers[managerTier].mult}x)</div>`;
      }
      if (nextTier <= 3) {
        const mCost = this.getManagerCost(biz.id, nextTier);
        const mAffordable = App.balance >= mCost;
        managerHtml += `<button class="prop-manager-btn${mAffordable ? ' affordable' : ''}" onclick="event.stopPropagation();Properties.hireManager(${biz.id})">Hire ${this.managerTiers[nextTier].name}: ${App.formatMoney(mCost)}</button>`;
      } else {
        managerHtml += `<div class="prop-manager-badge maxed">Executive (2x)</div>`;
      }

      // Rival defend alert
      let rivalHtml = '';
      if (this.rival && this.rival.active && this.rival.targetId === biz.id) {
        const remainSec = Math.max(0, Math.ceil((this.rival.expiresAt - Date.now()) / 1000));
        rivalHtml = `<div class="prop-rival-alert" onclick="event.stopPropagation();Properties.defendRival()">⚔️ DEFEND! (${remainSec}s)</div>`;
      }

      // Gas station supplier UI
      let specialHtml = '';
      if (biz.id === 1) {
        const supVal = this._gasSupplier || 'npc';
        const supMult = this._getGasSupplierMult();
        let hasOwnEnergy = false;
        if (typeof Companies !== 'undefined') {
          hasOwnEnergy = Companies._companies.some(c => (c.industry || '') === 'energy');
        }
        const playerOpts = this._playerOilCompanies.map(pc =>
          `<option value="${pc.uid}"${supVal===pc.uid?' selected':''}>${pc.ownerName}'s ${pc.name} (+15%)</option>`
        ).join('');
        specialHtml = `<div class="prop-special-row">
          <span class="prop-special-label">⛽ Oil Supplier:</span>
          <select class="prop-special-select" onchange="event.stopPropagation();Properties.setGasSupplier(this.value)">
            <option value="npc"${supVal==='npc'?' selected':''}>🌍 Open Market (price varies)</option>
            ${hasOwnEnergy ? `<option value="own"${supVal==='own'?' selected':''}>⭐ Own Oil Company (+30%)</option>` : ''}
            ${playerOpts}
          </select>
        </div>
        <div class="prop-special-note">Supply bonus: ${supMult >= 1 ? '+' : ''}${((supMult - 1) * 100).toFixed(0)}%</div>`;
      }

      // Factory goods UI
      if (biz.id === 4) {
        const goodsVal = this._factoryGoods || 'generic';
        const goodOpts = Object.entries(this.FACTORY_GOODS).map(([k, g]) =>
          `<option value="${k}"${goodsVal===k?' selected':''}>${g.label}</option>`
        ).join('');
        specialHtml = `<div class="prop-special-row">
          <span class="prop-special-label">🏭 Production:</span>
          <select class="prop-special-select" onchange="event.stopPropagation();Properties.setFactoryGoods(this.value)">
            ${goodOpts}
          </select>
        </div>
        <div class="prop-special-note">${this.FACTORY_GOODS[goodsVal]?.desc || ''}</div>`;
      }

      const upgCost = this.getUpgradeCost(biz.id);
      const affordable = !maxed && App.balance >= upgCost;
      const sellPrice = this.getSellPrice(biz.id);
      return `<div class="prop-card owned">
        ${rivalHtml}
        <div class="prop-icon">${biz.icon}</div>
        <div class="prop-name">${biz.name}</div>
        <div class="prop-level">Lv ${level}/${biz.maxLevel}</div>
        <div class="prop-detail prop-income-val">${App.formatMoney(income)}/s</div>
        ${specialHtml}
        ${managerHtml}
        <div class="prop-btn-row">
          ${maxed
            ? '<button class="prop-btn prop-maxed" disabled>MAXED</button>'
            : `<button class="prop-btn${affordable ? ' affordable' : ''}" onclick="Properties.upgrade(${biz.id})">Upgrade: ${App.formatMoney(upgCost)}</button>`
          }
          <button class="prop-sell-btn" onclick="event.stopPropagation();if(confirm('Sell ${biz.name} for ${App.formatMoney(sellPrice)}?'))Properties.sell(${biz.id})">Sell (${App.formatMoney(sellPrice)})</button>
        </div>
      </div>`;
    }).join('');

    // Update header income
    const totalEl = document.getElementById('prop-total-income');
    if (totalEl) totalEl.textContent = App.formatMoney(this.getTotalIncome()) + '/s';
  },

  // Admin helpers
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
    this.activeEvent = null;
    this.rival = null;
    this.renderEventBanner();
    App.save();
    this.render();
  },

  // Save/load data
  getSaveData() {
    return {
      owned: this.owned.slice(),
      levels: this.levels.slice(),
      managers: this.managers.slice(),
      gasSupplier: this._gasSupplier,
      factoryGoods: this._factoryGoods,
      eventEndTime: this.activeEvent && this.activeEvent.endsAt ? this.activeEvent.endsAt : null,
      eventEffect: this.activeEvent ? this.activeEvent.effect : null,
      eventName: this.activeEvent ? this.activeEvent.name : null,
      eventIcon: this.activeEvent ? this.activeEvent.icon : null,
      eventType: this.activeEvent ? this.activeEvent.type : null,
      eventTargetId: this.activeEvent ? this.activeEvent.targetId : null,
    };
  },

  loadSaveData(data) {
    if (!data) return;
    if (data.owned) this.owned = data.owned;
    if (data.levels) this.levels = data.levels;
    if (data.managers) this.managers = data.managers;
    if (data.gasSupplier !== undefined) this._gasSupplier = data.gasSupplier;
    if (data.factoryGoods) this._factoryGoods = data.factoryGoods;
    // Ensure arrays are correct length
    while (this.owned.length < this.businesses.length) this.owned.push(false);
    while (this.levels.length < this.businesses.length) this.levels.push(0);
    while (this.managers.length < this.businesses.length) this.managers.push(0);
    // Restore active event if still valid
    if (data.eventEndTime && Date.now() < data.eventEndTime && data.eventEffect) {
      this.activeEvent = {
        name: data.eventName || 'Event',
        icon: data.eventIcon || '',
        effect: data.eventEffect,
        endsAt: data.eventEndTime,
        type: data.eventType || '',
        targetId: data.eventTargetId,
      };
    }
  }
};
