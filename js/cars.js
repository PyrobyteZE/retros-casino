// ===== Car System =====
const Cars = {

  // === ENGINES ===
  ENGINES: {
    eco:         { name:'Eco 1.0L',        speedBonus:0,   efficiencyBonus:20,  cost:5_000,   req:1 },
    inline4:     { name:'2.0L Inline-4',   speedBonus:10,  efficiencyBonus:10,  cost:20_000,  req:1 },
    v6:          { name:'V6 Turbo',        speedBonus:25,  efficiencyBonus:-5,  cost:80_000,  req:2 },
    hybrid:      { name:'Hybrid V6',       speedBonus:20,  efficiencyBonus:20,  cost:150_000, req:2 },
    electric:    { name:'Quad Motor EV',   speedBonus:35,  efficiencyBonus:30,  cost:300_000, req:3 },
    v8:          { name:'V8 Supercharged', speedBonus:40,  efficiencyBonus:-15, cost:200_000, req:3 },
    v12:         { name:'V12 Twin-Turbo',  speedBonus:55,  efficiencyBonus:-20, cost:500_000, req:4 },
    racing:      { name:'F1-Derived',      speedBonus:65,  efficiencyBonus:-30, cost:1_000_000,req:5 },
  },

  BODIES: {
    compact:  { name:'Compact',    speedMult:0.93, comfortBonus:-5, category:'economy', cost:5_000,   req:1 },
    sedan:    { name:'Sedan',      speedMult:0.97, comfortBonus:5,  category:'sedan',   cost:15_000,  req:1 },
    suv:      { name:'SUV',        speedMult:0.88, comfortBonus:12, category:'suv',     cost:25_000,  req:1 },
    sports:   { name:'Sports',     speedMult:1.08, comfortBonus:0,  category:'sports',  cost:50_000,  req:2 },
    luxury:   { name:'Luxury',     speedMult:1.00, comfortBonus:20, category:'luxury',  cost:120_000, req:3 },
    supercar: { name:'Supercar',   speedMult:1.18, comfortBonus:5,  category:'supercar',cost:350_000, req:4 },
    hypercar: { name:'Hypercar',   speedMult:1.38, comfortBonus:0,  category:'hypercar',cost:900_000, req:5 },
  },

  INTERIORS: {
    basic:    { name:'Basic',       luxuryBonus:0,  comfortBonus:0,  cost:3_000,   req:1 },
    standard: { name:'Standard',    luxuryBonus:10, comfortBonus:5,  cost:12_000,  req:1 },
    premium:  { name:'Premium',     luxuryBonus:25, comfortBonus:15, cost:45_000,  req:2 },
    ultra:    { name:'Ultra-Luxury',luxuryBonus:50, comfortBonus:30, cost:180_000, req:3 },
    bespoke:  { name:'Bespoke',     luxuryBonus:70, comfortBonus:40, cost:400_000, req:4 },
  },

  DRIVETRAINS: {
    fwd: { name:'FWD', speedMult:0.94, reliabilityBonus:5,  cost:4_000,  req:1 },
    rwd: { name:'RWD', speedMult:1.04, reliabilityBonus:-5, cost:8_000,  req:1 },
    awd: { name:'AWD', speedMult:1.00, reliabilityBonus:10, cost:25_000, req:2 },
    '4wd':{ name:'4WD',speedMult:0.97, reliabilityBonus:15, cost:20_000, req:2 },
  },

  // === FLAWS POOL ===
  FLAWS: [
    { id:'engine_knock',   name:'Engine Knock',       emoji:'💥', stat:'speed',       minPen:0.10, maxPen:0.25, maxFix:0.40, fixCostMult:0.5 },
    { id:'faulty_brakes',  name:'Faulty Brakes',      emoji:'🛑', stat:'reliability', minPen:0.15, maxPen:0.35, maxFix:0.50, fixCostMult:0.3 },
    { id:'electrical',     name:'Electrical Issues',  emoji:'⚡', stat:'efficiency',  minPen:0.10, maxPen:0.22, maxFix:0.60, fixCostMult:0.4 },
    { id:'chassis',        name:'Chassis Misalign',   emoji:'🔩', stat:'speed',       minPen:0.05, maxPen:0.15, maxFix:0.30, fixCostMult:0.6 },
    { id:'interior_defect',name:'Interior Defects',   emoji:'🪑', stat:'comfort',     minPen:0.10, maxPen:0.25, maxFix:0.80, fixCostMult:0.2 },
    { id:'transmission',   name:'Transmission Slip',  emoji:'⚙️', stat:'speed',       minPen:0.12, maxPen:0.28, maxFix:0.25, fixCostMult:0.9 },
    { id:'rust',           name:'Rust Spots',         emoji:'🧱', stat:'all',         minPen:0.02, maxPen:0.08, maxFix:0.15, fixCostMult:1.5 },
    { id:'suspension',     name:'Suspension Wear',    emoji:'🌀', stat:'comfort',     minPen:0.10, maxPen:0.20, maxFix:0.55, fixCostMult:0.4 },
    { id:'poor_paint',     name:'Poor Paint Quality', emoji:'🎨', stat:'luxury',      minPen:0.05, maxPen:0.15, maxFix:0.90, fixCostMult:0.1 },
    { id:'overheating',    name:'Overheating',        emoji:'🌡️', stat:'efficiency',  minPen:0.15, maxPen:0.30, maxFix:0.30, fixCostMult:0.8 },
    { id:'turbo_lag',      name:'Turbo Lag',          emoji:'⏳', stat:'speed',       minPen:0.08, maxPen:0.18, maxFix:0.50, fixCostMult:0.5 },
    { id:'brake_fade',     name:'Brake Fade',         emoji:'🔥', stat:'reliability', minPen:0.08, maxPen:0.20, maxFix:0.45, fixCostMult:0.35},
  ],

  // Flaws count distribution by category
  FLAW_DIST: {
    economy:  [[0,0.50],[1,0.85],[2,1.00]],
    sedan:    [[0,0.45],[1,0.80],[2,1.00]],
    suv:      [[0,0.45],[1,0.80],[2,1.00]],
    sports:   [[0,0.35],[1,0.70],[2,0.90],[3,1.00]],
    luxury:   [[0,0.50],[1,0.80],[2,1.00]],
    supercar: [[0,0.25],[1,0.55],[2,0.80],[3,0.95],[4,1.00]],
    hypercar: [[0,0.15],[1,0.40],[2,0.65],[3,0.85],[4,1.00]],
  },

  CATEGORY_ICONS: {
    economy:'🚘', sedan:'🚗', suv:'🚙', sports:'🏎️', luxury:'🚐', supercar:'🚀', hypercar:'⚡',
  },

  // Base values and passive income ($/s) per overall score point
  CATEGORY_DATA: {
    economy:  { baseValue:5_000,     passivePerScore:0,     label:'Economy'  },
    sedan:    { baseValue:15_000,    passivePerScore:0,     label:'Sedan'    },
    suv:      { baseValue:20_000,    passivePerScore:0,     label:'SUV'      },
    sports:   { baseValue:40_000,    passivePerScore:0,     label:'Sports'   },
    luxury:   { baseValue:80_000,    passivePerScore:0.008, label:'Luxury'   },
    supercar: { baseValue:250_000,   passivePerScore:0.035, label:'Supercar' },
    hypercar: { baseValue:1_000_000, passivePerScore:0.17,  label:'Hypercar' },
  },

  // === STATE ===
  _company: null,     // { id, name, slogan, foundedAt, manufacturingLevel, totalSold, reputation, ownerUid, ownerName }
  _models: [],        // [ car model design templates ]
  _garage: [],        // [ manufactured car instances ]
  _carListings: {},   // { listingId: { sellerUid, sellerName, car, price, listedAt } }
  _activeTab: 'garage',
  _activeRaceCar: null,
  _raceResult: null,
  _designDraft: null, // { name, bodyKey, engineKey, interiorKey, drivetrainKey }
  _tickInterval: null,

  // === INIT ===
  init() {
    this._startTick();
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.listenCarListings(data => {
        this._carListings = data || {};
        this._triggerRender();
      });
    }
  },

  _startTick() {
    if (this._tickInterval) clearInterval(this._tickInterval);
    this._tickInterval = setInterval(() => this.tick(), 1000);
  },

  tick() {
    const income = this.getPassiveIncome();
    if (income > 0) App.addBalance(income);
  },

  getPassiveIncome() {
    let total = 0;
    const vaultCars = (typeof Houses !== 'undefined' && Houses._vault && Houses._vault.cars) ? Houses._vault.cars : [];
    const allCars = [...this._garage, ...vaultCars];
    for (const car of allCars) {
      const cd = this.CATEGORY_DATA[car.category];
      if (!cd || cd.passivePerScore <= 0) continue;
      const score = car.overallScore || 0;
      const condMult = (car.condition || 100) / 100;
      total += score * cd.passivePerScore * condMult;
    }
    return total;
  },

  // === COMPANY ===
  foundCompany(name, slogan) {
    if (!name || !name.trim()) { Toast.show('Enter a brand name', '#f44336', 2000); return; }
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    const cost = 5_000_000;
    if (!isGod && App.balance < cost) { Toast.show('Need ' + App.formatMoney(cost) + ' to found a car company', '#f44336', 2500); return; }
    if (!isGod) App.addBalance(-cost);
    this._company = {
      id: 'brand_' + Date.now().toString(36),
      name: name.trim(),
      slogan: (slogan || '').trim(),
      foundedAt: Date.now(),
      manufacturingLevel: 1,
      totalSold: 0,
      reputation: 0,
      ownerUid: typeof Firebase !== 'undefined' ? Firebase.uid : 'local',
      ownerName: typeof Settings !== 'undefined' ? Settings.options.playerName : 'You',
    };
    App.save();
    Toast.show('🏭 ' + this._company.name + ' founded!', '#4caf50', 3000);
    this._triggerRender();
  },

  upgradeManufacturing() {
    if (!this._company) return;
    const lvl = this._company.manufacturingLevel;
    if (lvl >= 5) { Toast.show('Max level!', '#f44336', 2000); return; }
    const costs = [0, 5_000_000, 20_000_000, 75_000_000, 250_000_000];
    const cost = costs[lvl];
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (!isGod && App.balance < cost) { Toast.show('Need ' + App.formatMoney(cost), '#f44336', 2500); return; }
    if (!isGod) App.addBalance(-cost);
    this._company.manufacturingLevel++;
    App.save();
    Toast.show('Manufacturing upgraded to level ' + this._company.manufacturingLevel, '#4caf50', 2500);
    this._triggerRender();
  },

  // === DESIGN + MANUFACTURE ===
  openDesignModal() {
    this._designDraft = { name: '', bodyKey: 'compact', engineKey: 'eco', interiorKey: 'basic', drivetrainKey: 'fwd' };
    this._renderDesignModal();
  },

  _renderDesignModal() {
    const existing = document.getElementById('car-design-modal');
    if (existing) existing.remove();
    const draft = this._designDraft;
    const mlvl = this._company ? this._company.manufacturingLevel : 1;

    const engineOptions = Object.entries(this.ENGINES)
      .filter(([,e]) => e.req <= mlvl)
      .map(([k,e]) => `<option value="${k}" ${draft.engineKey===k?'selected':''}>${e.name} (+${e.speedBonus} spd) — ${App.formatMoney(e.cost)}</option>`).join('');

    const bodyOptions = Object.entries(this.BODIES)
      .filter(([,b]) => b.req <= mlvl)
      .map(([k,b]) => `<option value="${k}" ${draft.bodyKey===k?'selected':''}>${b.name} (${b.category}) — ${App.formatMoney(b.cost)}</option>`).join('');

    const interiorOptions = Object.entries(this.INTERIORS)
      .filter(([,i]) => i.req <= mlvl)
      .map(([k,i]) => `<option value="${k}" ${draft.interiorKey===k?'selected':''}>${i.name} (+${i.luxuryBonus} lux) — ${App.formatMoney(i.cost)}</option>`).join('');

    const drivetrainOptions = Object.entries(this.DRIVETRAINS)
      .filter(([,d]) => d.req <= mlvl)
      .map(([k,d]) => `<option value="${k}" ${draft.drivetrainKey===k?'selected':''}>${d.name} (${d.speedMult >= 1 ? '+' : ''}${Math.round((d.speedMult-1)*100)}% spd) — ${App.formatMoney(d.cost)}</option>`).join('');

    const previewStats = this._calcStats(draft);
    const totalCost = this._designTotalCost(draft);

    const modal = document.createElement('div');
    modal.id = 'car-design-modal';
    modal.className = 'house-modal-overlay';
    modal.innerHTML = `
      <div class="house-modal-box car-design-modal-box">
        <div class="house-modal-title">🔨 Design a Car Model</div>
        <div class="car-design-row">
          <label class="car-design-label">Model Name</label>
          <input id="car-design-name" type="text" maxlength="24" placeholder="e.g. Phantom GT" class="house-modal-input" value="${this._esc(draft.name)}"
            oninput="Cars._designDraft.name=this.value">
        </div>
        <div class="car-design-row">
          <label class="car-design-label">Body Style</label>
          <select class="furnish-select car-design-select" onchange="Cars._designDraft.bodyKey=this.value;Cars._updateDesignPreview()">${bodyOptions}</select>
        </div>
        <div class="car-design-row">
          <label class="car-design-label">Engine</label>
          <select class="furnish-select car-design-select" onchange="Cars._designDraft.engineKey=this.value;Cars._updateDesignPreview()">${engineOptions}</select>
        </div>
        <div class="car-design-row">
          <label class="car-design-label">Interior</label>
          <select class="furnish-select car-design-select" onchange="Cars._designDraft.interiorKey=this.value;Cars._updateDesignPreview()">${interiorOptions}</select>
        </div>
        <div class="car-design-row">
          <label class="car-design-label">Drivetrain</label>
          <select class="furnish-select car-design-select" onchange="Cars._designDraft.drivetrainKey=this.value;Cars._updateDesignPreview()">${drivetrainOptions}</select>
        </div>
        <div id="car-design-preview" class="car-design-preview">${this._renderStatPreview(previewStats)}</div>
        <div class="car-design-cost">Manufacture Cost: <strong>${App.formatMoney(totalCost)}</strong></div>
        <div class="house-modal-actions">
          <button class="house-modal-btn" onclick="Cars._confirmDesign()">Design Model</button>
          <button class="house-modal-btn house-modal-cancel" onclick="document.getElementById('car-design-modal').remove()">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  },

  _updateDesignPreview() {
    const preview = document.getElementById('car-design-preview');
    if (!preview) return;
    const stats = this._calcStats(this._designDraft);
    const cost = this._designTotalCost(this._designDraft);
    preview.innerHTML = this._renderStatPreview(stats);
    const costEl = document.querySelector('.car-design-cost strong');
    if (costEl) costEl.textContent = App.formatMoney(cost);
  },

  _renderStatPreview(stats) {
    const bar = (v) => `<div class="car-stat-bar-wrap"><div class="car-stat-bar-fill" style="width:${Math.round(Math.min(100,v))}%"></div></div>`;
    return `<div class="car-stat-preview">
      <div class="car-stat-row">${bar(stats.speed)}<span>Speed ${Math.round(stats.speed)}</span></div>
      <div class="car-stat-row">${bar(stats.comfort)}<span>Comfort ${Math.round(stats.comfort)}</span></div>
      <div class="car-stat-row">${bar(stats.luxury)}<span>Luxury ${Math.round(stats.luxury)}</span></div>
      <div class="car-stat-row">${bar(stats.reliability)}<span>Reliability ${Math.round(stats.reliability)}</span></div>
      <div class="car-stat-row">${bar(stats.efficiency)}<span>Efficiency ${Math.round(stats.efficiency)}</span></div>
    </div>`;
  },

  _confirmDesign() {
    const nameInp = document.getElementById('car-design-name');
    if (nameInp) this._designDraft.name = nameInp.value.trim();
    if (!this._designDraft.name) { Toast.show('Enter a model name', '#f44336', 2000); return; }

    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    const cost = this._designTotalCost(this._designDraft);
    if (!isGod && App.balance < cost) { Toast.show('Not enough money! Need ' + App.formatMoney(cost), '#f44336', 2500); return; }
    if (!isGod) App.addBalance(-cost);

    const model = {
      id: 'model_' + Date.now().toString(36),
      name: this._designDraft.name,
      bodyKey: this._designDraft.bodyKey,
      engineKey: this._designDraft.engineKey,
      interiorKey: this._designDraft.interiorKey,
      drivetrainKey: this._designDraft.drivetrainKey,
      category: this.BODIES[this._designDraft.bodyKey]?.category || 'sedan',
      baseStats: this._calcStats(this._designDraft),
      manufactureCost: cost,
      designedAt: Date.now(),
    };
    this._models.push(model);
    document.getElementById('car-design-modal')?.remove();
    App.save();
    Toast.show('🚗 ' + model.name + ' designed! Now manufacture it.', '#4caf50', 3000);
    this._triggerRender();
  },

  _designTotalCost(draft) {
    const e = this.ENGINES[draft.engineKey] || this.ENGINES.eco;
    const b = this.BODIES[draft.bodyKey] || this.BODIES.compact;
    const i = this.INTERIORS[draft.interiorKey] || this.INTERIORS.basic;
    const d = this.DRIVETRAINS[draft.drivetrainKey] || this.DRIVETRAINS.fwd;
    return e.cost + b.cost + i.cost + d.cost;
  },

  _calcStats(draft) {
    const e = this.ENGINES[draft.engineKey] || this.ENGINES.eco;
    const b = this.BODIES[draft.bodyKey] || this.BODIES.compact;
    const i = this.INTERIORS[draft.interiorKey] || this.INTERIORS.basic;
    const d = this.DRIVETRAINS[draft.drivetrainKey] || this.DRIVETRAINS.fwd;

    const baseSpeed = 30 + e.speedBonus;
    const speed = Math.min(100, Math.max(0, baseSpeed * b.speedMult * d.speedMult));
    const comfort = Math.min(100, Math.max(0, 30 + b.comfortBonus + i.comfortBonus));
    const luxury = Math.min(100, Math.max(0, 10 + i.luxuryBonus));
    const reliability = Math.min(100, Math.max(0, 50 + d.reliabilityBonus));
    const efficiency = Math.min(100, Math.max(0, 40 + e.efficiencyBonus));
    return { speed, comfort, luxury, reliability, efficiency };
  },

  manufactureModel(modelId) {
    const model = this._models.find(m => m.id === modelId);
    if (!model) return;

    const garageSlots = typeof Houses !== 'undefined' ? Houses.getTotalGarageSlots() : 0;
    const vaultCars = typeof Houses !== 'undefined' && Houses._vault ? (Houses._vault.cars || []).length : 0;
    if (this._garage.length + vaultCars >= garageSlots) {
      Toast.show('Garage full! Buy a house with more garage space.', '#f44336', 3000); return;
    }

    // Roll flaws
    const rng = this._seededRng(Date.now());
    const dist = this.FLAW_DIST[model.category] || this.FLAW_DIST.sedan;
    const roll = rng();
    let flawCount = 0;
    for (const [count, threshold] of dist) {
      if (roll <= threshold) { flawCount = count; break; }
    }
    flawCount = Math.min(flawCount, this.FLAWS.length);

    const flaws = [];
    const availFlaws = [...this.FLAWS];
    for (let i = 0; i < flawCount; i++) {
      const idx = Math.floor(rng() * availFlaws.length);
      const flawDef = availFlaws.splice(idx, 1)[0];
      const penalty = flawDef.minPen + rng() * (flawDef.maxPen - flawDef.minPen);
      flaws.push({
        id: flawDef.id,
        name: flawDef.name,
        emoji: flawDef.emoji,
        stat: flawDef.stat,
        originalPenalty: Math.round(penalty * 100) / 100,
        currentPenalty: Math.round(penalty * 100) / 100,
        maxFix: flawDef.maxFix,
        fixCostMult: flawDef.fixCostMult,
        repaired: false,
      });
    }

    // Apply flaws to stats
    const stats = JSON.parse(JSON.stringify(model.baseStats));
    for (const flaw of flaws) {
      if (flaw.stat === 'all') {
        stats.speed       *= (1 - flaw.currentPenalty);
        stats.comfort     *= (1 - flaw.currentPenalty);
        stats.luxury      *= (1 - flaw.currentPenalty);
        stats.reliability *= (1 - flaw.currentPenalty);
        stats.efficiency  *= (1 - flaw.currentPenalty);
      } else if (stats[flaw.stat] !== undefined) {
        stats[flaw.stat] *= (1 - flaw.currentPenalty);
      }
    }
    // Clamp
    for (const k in stats) stats[k] = Math.max(0, Math.min(100, Math.round(stats[k] * 10) / 10));

    const overallScore = this._calcOverallScore(stats);
    const category = model.category;
    const cd = this.CATEGORY_DATA[category] || this.CATEGORY_DATA.sedan;

    const car = {
      id: 'car_' + Date.now().toString(36) + '_' + Math.floor(rng() * 9999).toString(36),
      modelId: model.id,
      modelName: model.name,
      brandId: this._company ? this._company.id : null,
      brandName: this._company ? this._company.name : 'Independent',
      category,
      icon: this.CATEGORY_ICONS[category] || '🚗',
      stats,
      flaws,
      rarity: cd.label,
      overallScore: Math.round(overallScore * 10) / 10,
      value: this._calcValue(category, overallScore, flaws),
      condition: 100,
      odometer: 0,
      crafterUid: typeof Firebase !== 'undefined' ? Firebase.uid : 'local',
      crafterName: typeof Settings !== 'undefined' ? Settings.options.playerName : 'You',
      createdAt: Date.now(),
    };

    this._garage.push(car);
    if (this._company) {
      this._company.totalSold = (this._company.totalSold || 0);
    }
    App.save();

    const flawMsg = flaws.length > 0 ? ` (${flaws.length} flaw${flaws.length>1?'s':''} found!)` : ' (flawless!)';
    Toast.show(`${car.icon} ${car.modelName} manufactured!${flawMsg}`, flaws.length > 0 ? '#ff9800' : '#4caf50', 3000);
    this._triggerRender();
  },

  _calcOverallScore(stats) {
    return stats.speed * 0.30 + stats.comfort * 0.15 + stats.luxury * 0.20 + stats.reliability * 0.20 + stats.efficiency * 0.15;
  },

  _calcValue(category, score, flaws) {
    const cd = this.CATEGORY_DATA[category] || this.CATEGORY_DATA.sedan;
    let val = cd.baseValue * (score / 50);
    // Flaws reduce value based on remaining penalty
    const totalPenalty = flaws.reduce((sum, f) => sum + f.currentPenalty, 0);
    val *= Math.max(0.3, 1 - totalPenalty * 0.5);
    return Math.round(val);
  },

  // === FLAW REPAIR ===
  repairFlaw(carId, flawId) {
    const car = this._garage.find(c => c.id === carId);
    if (!car) return;
    const flaw = car.flaws.find(f => f.id === flawId);
    if (!flaw || flaw.repaired) return;

    // Cost = car base value * flaw.fixCostMult
    const repairCost = Math.max(1000, Math.floor(car.value * flaw.fixCostMult * 0.1));
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (!isGod && App.balance < repairCost) {
      Toast.show('Need ' + App.formatMoney(repairCost) + ' to repair', '#f44336', 2500); return;
    }
    if (!isGod) App.addBalance(-repairCost);

    // Apply partial fix: remove maxFix% of the penalty
    const removed = flaw.currentPenalty * flaw.maxFix;
    const remaining = flaw.currentPenalty - removed;
    flaw.currentPenalty = Math.round(remaining * 100) / 100;
    flaw.repaired = true;

    // Recalculate car stats from scratch
    const model = this._models.find(m => m.id === car.modelId);
    if (model) {
      const fresh = JSON.parse(JSON.stringify(model.baseStats));
      for (const f of car.flaws) {
        if (f.stat === 'all') {
          for (const k in fresh) fresh[k] *= (1 - f.currentPenalty);
        } else if (fresh[f.stat] !== undefined) {
          fresh[f.stat] *= (1 - f.currentPenalty);
        }
      }
      for (const k in fresh) fresh[k] = Math.max(0, Math.min(100, Math.round(fresh[k] * 10) / 10));
      car.stats = fresh;
      car.overallScore = Math.round(this._calcOverallScore(fresh) * 10) / 10;
      car.value = this._calcValue(car.category, car.overallScore, car.flaws);
    }

    App.save();
    const leftPct = Math.round(remaining * 100);
    Toast.show(`${flaw.emoji} Partially repaired! ${leftPct}% penalty remaining (cannot be fully fixed)`, '#4caf50', 3500);
    this._triggerRender();
  },

  // === RACING ===
  raceNpc(carId, betAmount) {
    const car = this._garage.find(c => c.id === carId);
    if (!car) return;
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (!isGod && App.balance < betAmount) { Toast.show('Not enough money!', '#f44336', 2500); return; }
    if (!isGod) App.addBalance(-betAmount);

    // NPC car: speed range based on bet tier
    const betTier = Math.log10(Math.max(1, betAmount));
    const npcBaseSpeed = Math.min(95, 25 + betTier * 7);
    const npcSpeed = npcBaseSpeed + Math.random() * 20;

    // Your car's effective speed (condition matters)
    const yourSpeed = car.stats.speed * (car.condition / 100) + Math.random() * 20;

    const won = yourSpeed > npcSpeed;
    const npcSpeedFinal = Math.round(npcSpeed * 10) / 10;
    const yourSpeedFinal = Math.round(yourSpeed * 10) / 10;

    // Condition degradation
    const condLoss = 1 + Math.floor(Math.random() * 4);
    car.condition = Math.max(0, car.condition - condLoss);
    car.odometer = (car.odometer || 0) + Math.floor(10 + Math.random() * 40);

    // Payout (5% house edge)
    if (won) {
      const payout = Math.floor(betAmount * 1.90);
      App.addBalance(payout);
      this._raceResult = { won: true, yourSpeed: yourSpeedFinal, npcSpeed: npcSpeedFinal, payout, condLoss };
    } else {
      this._raceResult = { won: false, yourSpeed: yourSpeedFinal, npcSpeed: npcSpeedFinal, payout: 0, condLoss };
    }

    App.save();
    this._triggerRender();
  },

  repairCar(carId) {
    const car = this._garage.find(c => c.id === carId);
    if (!car || car.condition >= 100) return;
    const cost = Math.max(500, Math.floor(car.value * 0.02 * (1 - car.condition / 100)));
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (!isGod && App.balance < cost) { Toast.show('Need ' + App.formatMoney(cost) + ' to repair', '#f44336', 2500); return; }
    if (!isGod) App.addBalance(-cost);
    car.condition = 100;
    App.save();
    Toast.show('🔧 Car fully repaired!', '#4caf50', 2000);
    this._triggerRender();
  },

  // === MARKETPLACE ===
  getBrandDiscount() {
    if (!this._company) return 0;
    return 0.20; // 20% off their own brand
  },

  listCar(carId, price) {
    const idx = this._garage.findIndex(c => c.id === carId);
    if (idx < 0) return;
    if (price <= 0) { Toast.show('Invalid price', '#f44336', 2000); return; }
    const car = this._garage.splice(idx, 1)[0];
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.listCarForSale(car, price);
    } else {
      // Local listing
      this._carListings['local_' + car.id] = {
        sellerUid: 'local', sellerName: 'You', car, price, listedAt: Date.now()
      };
    }
    App.save();
    Toast.show(car.icon + ' ' + car.modelName + ' listed for ' + App.formatMoney(price), '#4caf50', 2500);
    this._triggerRender();
  },

  async buyListing(listingId) {
    const listing = this._carListings[listingId];
    if (!listing) { Toast.show('Not found', '#f44336', 2000); return; }
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;

    // Check if buyer owns the brand — apply discount
    let price = listing.price;
    const car = listing.car;
    const isBrand = this._company && car.brandId === this._company.id;
    if (isBrand) {
      price = Math.floor(price * (1 - this.getBrandDiscount()));
      Toast.show('🏷️ Brand owner discount applied!', '#4caf50', 2000);
    }

    if (!isGod && App.balance < price) { Toast.show('Not enough money!', '#f44336', 2500); return; }
    if (!isGod) App.addBalance(-price);

    const garageSlots = typeof Houses !== 'undefined' ? Houses.getTotalGarageSlots() : 0;
    if (this._garage.length >= garageSlots) {
      App.addBalance(price); // refund
      Toast.show('Garage full! Buy a bigger house.', '#f44336', 3000); return;
    }

    const boughtCar = JSON.parse(JSON.stringify(car));
    this._garage.push(boughtCar);

    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      await Firebase.buyCarListing(listingId, listing.price, listing.sellerUid);
    } else {
      delete this._carListings[listingId];
    }

    // Brand reputation
    if (this._company && listing.sellerUid !== (typeof Firebase !== 'undefined' ? Firebase.uid : 'local')) {
      this._company.reputation = (this._company.reputation || 0) + 1;
    }

    App.save();
    Toast.show(boughtCar.icon + ' ' + boughtCar.modelName + ' purchased!', '#4caf50', 2500);
    this._triggerRender();
  },

  delistCar(listingId) {
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.delistCar(listingId);
    } else {
      const listing = this._carListings[listingId];
      if (listing && listing.car) {
        this._garage.push(listing.car);
        delete this._carListings[listingId];
      }
    }
    App.save();
    this._triggerRender();
  },

  _showListCarModal(carId) {
    const existing = document.getElementById('car-list-modal');
    if (existing) existing.remove();
    const car = this._garage.find(c => c.id === carId);
    if (!car) return;
    const modal = document.createElement('div');
    modal.id = 'car-list-modal';
    modal.className = 'house-modal-overlay';
    modal.innerHTML = `
      <div class="house-modal-box">
        <div class="house-modal-title">${car.icon} Sell ${this._esc(car.modelName)}</div>
        <div class="car-list-value-hint">Estimated value: ${App.formatMoney(car.value)}</div>
        <input id="car-list-price" type="text" class="sh-input house-modal-input" placeholder="Price (e.g. 500k)">
        <span class="sh-preview" style="display:none"></span>
        <div class="house-modal-actions">
          <button class="house-modal-btn" onclick="Cars._confirmListCar('${carId}')">List</button>
          <button class="house-modal-btn house-modal-cancel" onclick="document.getElementById('car-list-modal').remove()">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('car-list-price')?.focus(), 50);
  },

  _confirmListCar(carId) {
    const inp = document.getElementById('car-list-price');
    if (!inp) return;
    const price = App.parseAmount(inp.value);
    if (isNaN(price) || price <= 0) { Toast.show('Invalid price', '#f44336', 2000); return; }
    document.getElementById('car-list-modal')?.remove();
    this.listCar(carId, price);
  },

  // === TABS ===
  setTab(tab) {
    this._activeTab = tab;
    this._raceResult = null;
    this._triggerRender();
  },

  // === RENDER ===
  _triggerRender() {
    if (typeof App !== 'undefined' && App.currentScreen === 'cars') this.render();
  },

  render() {
    const container = document.getElementById('cars-content');
    if (!container) return;

    const focused = document.activeElement;
    if (focused && container.contains(focused) &&
        (focused.tagName === 'SELECT' || focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA')) return;

    const garageSlots = typeof Houses !== 'undefined' ? Houses.getTotalGarageSlots() : 0;
    const passiveIncome = this.getPassiveIncome();

    let html = `<div class="cars-stat-bar">
      🚗 Garage: ${this._garage.length}/${garageSlots} &nbsp;|&nbsp;
      💰 Passive: ${App.formatMoney(passiveIncome)}/s
      ${this._company ? ` &nbsp;|&nbsp; 🏭 ${this._esc(this._company.name)} Lv${this._company.manufacturingLevel}` : ''}
    </div>`;

    const tabs = this._company
      ? ['garage','brand','market','race']
      : ['garage','brand','market'];
    const tabLabels = { garage:'🚗 Garage', brand:'🏭 My Brand', market:'🛒 Market', race:'🏎️ Race' };

    html += `<div class="cars-tabs">`;
    tabs.forEach(t => {
      html += `<button class="cars-tab${this._activeTab===t?' active':''}" onclick="Cars.setTab('${t}')">${tabLabels[t]}</button>`;
    });
    html += `</div>`;

    if (this._activeTab === 'garage')  html += this._renderGarage(garageSlots);
    else if (this._activeTab === 'brand')  html += this._renderBrand();
    else if (this._activeTab === 'market') html += this._renderMarket();
    else if (this._activeTab === 'race')   html += this._renderRace();

    container.innerHTML = html;
  },

  _renderGarage(garageSlots) {
    if (garageSlots === 0) {
      return `<div class="cars-empty">Your houses don't have a garage yet.<br>Buy a house that comes with one, or upgrade to a higher tier!</div>`;
    }
    if (this._garage.length === 0) {
      return `<div class="cars-empty">Garage empty!<br>Manufacture cars from the <strong>My Brand</strong> tab, or buy from the <strong>Market</strong>.</div>`;
    }

    let html = `<div class="car-grid">`;
    for (const car of this._garage) {
      const flawCount = (car.flaws || []).filter(f => f.currentPenalty > 0).length;
      const cdData = this.CATEGORY_DATA[car.category] || this.CATEGORY_DATA.sedan;
      html += `<div class="car-card">
        <div class="car-card-top">
          <span class="car-card-icon">${car.icon}</span>
          <div class="car-card-info">
            <div class="car-card-name">${this._esc(car.modelName)}</div>
            <div class="car-card-brand">${this._esc(car.brandName)}</div>
            <div class="car-card-rarity" style="color:${this._rarityColor(car.category)}">${cdData.label}</div>
          </div>
        </div>
        <div class="car-stats-mini">
          ${this._miniStatBar('⚡', car.stats.speed)}
          ${this._miniStatBar('🛋', car.stats.comfort)}
          ${this._miniStatBar('💎', car.stats.luxury)}
          ${this._miniStatBar('🔩', car.stats.reliability)}
          ${this._miniStatBar('🌿', car.stats.efficiency)}
        </div>
        <div class="car-card-meta">
          <span>Score: ${car.overallScore}</span>
          <span>Cond: ${car.condition}%</span>
          <span>ODO: ${car.odometer || 0}km</span>
        </div>
        ${flawCount > 0 ? `<div class="car-flaw-badge">${flawCount} flaw${flawCount>1?'s':''}</div>` : ''}
        <div class="car-card-value">Est. ${App.formatMoney(car.value)}</div>
        ${cdData.passivePerScore > 0 ? `<div class="car-passive-badge">+${App.formatMoney(car.overallScore * cdData.passivePerScore)}/s passive</div>` : ''}
        <div class="car-card-actions">
          ${flawCount > 0 ? `<button class="car-btn" onclick="Cars._showFlawsModal('${car.id}')">🔧 Flaws</button>` : ''}
          <button class="car-btn" onclick="Cars.repairCar('${car.id}')">🛠️ Repair (${car.condition < 100 ? App.formatMoney(Math.floor(car.value*0.02*(1-car.condition/100))) : 'OK'})</button>
          <button class="car-btn car-btn-race" onclick="Cars.setTab('race');Cars._activeRaceCar='${car.id}'">🏎️ Race</button>
          <button class="car-btn car-btn-sell" onclick="Cars._showListCarModal('${car.id}')">💰 Sell</button>
          <button class="car-btn" onclick="Houses.depositCar('${car.id}')">🏦 Vault</button>
        </div>
      </div>`;
    }
    html += `</div>`;
    return html;
  },

  _miniStatBar(emoji, val) {
    return `<div class="car-mini-stat">
      <span>${emoji}</span>
      <div class="car-mini-bar"><div class="car-mini-fill" style="width:${Math.round(Math.min(100,val))}%"></div></div>
      <span class="car-mini-val">${Math.round(val)}</span>
    </div>`;
  },

  _rarityColor(category) {
    const colors = { economy:'#aaa', sedan:'#aaa', suv:'#4caf50', sports:'#2196f3', luxury:'#9c27b0', supercar:'#ff9800', hypercar:'#f44336' };
    return colors[category] || '#aaa';
  },

  _showFlawsModal(carId) {
    const car = this._garage.find(c => c.id === carId);
    if (!car) return;
    const existing = document.getElementById('car-flaws-modal');
    if (existing) existing.remove();

    let flawsHtml = '';
    for (const flaw of (car.flaws || [])) {
      const repairCost = Math.max(1000, Math.floor(car.value * flaw.fixCostMult * 0.1));
      const penPct = Math.round(flaw.currentPenalty * 100);
      const maxFixPct = Math.round(flaw.maxFix * 100);
      const canAfford = App.balance >= repairCost || (typeof Admin !== 'undefined' && Admin.godMode);
      flawsHtml += `<div class="flaw-row">
        <div class="flaw-row-top">
          <span class="flaw-emoji">${flaw.emoji}</span>
          <div class="flaw-info">
            <div class="flaw-name">${flaw.name}</div>
            <div class="flaw-stat">-${penPct}% ${flaw.stat} ${flaw.repaired ? `<span class="flaw-repaired">(partially repaired)</span>` : ''}</div>
            <div class="flaw-fixability">Max fixable: ${maxFixPct}% of penalty removed</div>
          </div>
        </div>
        ${!flaw.repaired
          ? `<button class="flaw-repair-btn${canAfford?'':' unaffordable'}" onclick="Cars.repairFlaw('${carId}','${flaw.id}')">
              Repair for ${App.formatMoney(repairCost)}
             </button>`
          : `<div class="flaw-done">Partially fixed ✓</div>`}
      </div>`;
    }

    const modal = document.createElement('div');
    modal.id = 'car-flaws-modal';
    modal.className = 'house-modal-overlay';
    modal.innerHTML = `
      <div class="house-modal-box car-flaws-modal-box">
        <div class="house-modal-title">${car.icon} ${this._esc(car.modelName)} — Flaws</div>
        <div class="flaw-note">⚠️ Flaws can only be partially repaired. Some permanently reduce performance.</div>
        ${flawsHtml || '<div style="color:var(--text-dim);text-align:center;padding:12px">No flaws — great build!</div>'}
        <button class="house-modal-btn" onclick="document.getElementById('car-flaws-modal').remove()">Close</button>
      </div>`;
    document.body.appendChild(modal);
  },

  _renderBrand() {
    if (!this._company) {
      return `<div class="cars-empty">
        <div class="brand-found-intro">
          <div style="font-size:40px;margin-bottom:8px">🏭</div>
          <div style="font-size:16px;font-weight:700;margin-bottom:6px">Start Your Car Brand</div>
          <div style="font-size:12px;color:var(--text-dim);margin-bottom:16px">Found a car company, design models, manufacture cars, and sell to other players.</div>
          <div style="font-size:13px;color:var(--green);margin-bottom:12px">Cost: ${App.formatMoney(5_000_000)}</div>
        </div>
        <input id="brand-name-inp" type="text" maxlength="24" placeholder="Brand Name (e.g. Retro Motors)" class="house-modal-input" style="margin-bottom:8px">
        <input id="brand-slogan-inp" type="text" maxlength="40" placeholder="Slogan (optional)" class="house-modal-input" style="margin-bottom:12px">
        <button class="house-buy-btn" onclick="Cars.foundCompany(document.getElementById('brand-name-inp').value,document.getElementById('brand-slogan-inp').value)">
          🏭 Found Company
        </button>
      </div>`;
    }

    const co = this._company;
    const upgCosts = [0, 5_000_000, 20_000_000, 75_000_000, 250_000_000];
    const nextCost = co.manufacturingLevel < 5 ? upgCosts[co.manufacturingLevel] : null;
    const canUpgrade = nextCost && (App.balance >= nextCost || (typeof Admin !== 'undefined' && Admin.godMode));

    let html = `<div class="brand-header">
      <div class="brand-name">${this._esc(co.name)}</div>
      ${co.slogan ? `<div class="brand-slogan">"${this._esc(co.slogan)}"</div>` : ''}
      <div class="brand-meta">
        Lv ${co.manufacturingLevel} manufacturing &nbsp;|&nbsp;
        ⭐ Reputation: ${co.reputation || 0} &nbsp;|&nbsp;
        Cars sold: ${co.totalSold || 0}
      </div>
      ${nextCost ? `<button class="house-action-btn${canUpgrade?'':' unaffordable'}" onclick="Cars.upgradeManufacturing()">
        ⬆️ Upgrade Manufacturing → Lv${co.manufacturingLevel+1} (${App.formatMoney(nextCost)})
      </button>` : '<div class="brand-meta">✅ Max manufacturing level</div>'}
    </div>`;

    // Model designs
    html += `<div class="brand-section-label">Your Model Designs</div>`;
    if (this._models.length === 0) {
      html += `<div class="cars-empty" style="padding:12px">No designs yet. Design your first model!</div>`;
    } else {
      html += `<div class="model-list">`;
      for (const model of this._models) {
        const bodyDef = this.BODIES[model.bodyKey] || {};
        html += `<div class="model-row">
          <span class="model-icon">${this.CATEGORY_ICONS[model.category] || '🚗'}</span>
          <div class="model-info">
            <div class="model-name">${this._esc(model.name)}</div>
            <div class="model-cat">${model.category} • ${this._esc(bodyDef.name || '')}</div>
          </div>
          <button class="house-action-btn" onclick="Cars.manufactureModel('${model.id}')">🔨 Manufacture</button>
        </div>`;
      }
      html += `</div>`;
    }

    html += `<button class="house-buy-btn" style="margin-top:12px" onclick="Cars.openDesignModal()">+ Design New Model</button>`;
    return html;
  },

  _renderMarket() {
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : 'local';
    const listings = Object.entries(this._carListings);
    if (listings.length === 0) {
      return `<div class="cars-empty">No cars listed.<br>Manufacture cars and sell them from your Garage!</div>`;
    }

    let html = `<div class="car-grid">`;
    for (const [lid, listing] of listings) {
      const car = listing.car;
      if (!car) continue;
      const isMine = listing.sellerUid === myUid;
      const isBrand = this._company && car.brandId === this._company.id && !isMine;
      const effectivePrice = isBrand ? Math.floor(listing.price * (1 - this.getBrandDiscount())) : listing.price;
      const canAfford = App.balance >= effectivePrice || (typeof Admin !== 'undefined' && Admin.godMode);
      const flawCount = (car.flaws || []).filter(f => f.currentPenalty > 0).length;

      html += `<div class="car-card">
        <div class="car-card-top">
          <span class="car-card-icon">${car.icon}</span>
          <div class="car-card-info">
            <div class="car-card-name">${this._esc(car.modelName)}</div>
            <div class="car-card-brand">${this._esc(car.brandName)} • by ${this._esc(listing.sellerName || '?')}</div>
            <div class="car-card-rarity" style="color:${this._rarityColor(car.category)}">${car.rarity}</div>
          </div>
        </div>
        <div class="car-stats-mini">
          ${this._miniStatBar('⚡', car.stats.speed)}
          ${this._miniStatBar('💎', car.stats.luxury)}
          ${this._miniStatBar('🔩', car.stats.reliability)}
        </div>
        ${flawCount > 0 ? `<div class="car-flaw-badge">${flawCount} flaw${flawCount>1?'s':''}</div>` : '<div class="car-flaw-badge car-flaw-ok">No flaws</div>'}
        ${isBrand ? `<div class="car-brand-discount-badge">🏷️ -20% (Your Brand)</div>` : ''}
        <div class="car-card-value">Score: ${car.overallScore}</div>
        <div class="car-card-actions">
          ${isMine
            ? `<button class="car-btn" onclick="Cars.delistCar('${lid}')">Delist</button>`
            : `<button class="house-buy-btn${canAfford?'':' unaffordable'}" onclick="Cars.buyListing('${lid}')">
                Buy ${App.formatMoney(effectivePrice)}${isBrand ? ' ✓' : ''}
              </button>`}
        </div>
      </div>`;
    }
    html += `</div>`;
    return html;
  },

  _renderRace() {
    const garageLen = this._garage.length;
    if (garageLen === 0) {
      return `<div class="cars-empty">You need a car to race!<br>Get one from My Brand or Market.</div>`;
    }

    // If there's a pending race result, show it
    if (this._raceResult) {
      const r = this._raceResult;
      const html = `<div class="race-result ${r.won ? 'race-win' : 'race-lose'}">
        <div class="race-result-icon">${r.won ? '🏆' : '❌'}</div>
        <div class="race-result-title">${r.won ? 'YOU WON!' : 'YOU LOST'}</div>
        <div class="race-result-speeds">
          Your speed: <strong>${r.yourSpeed}</strong> &nbsp;|&nbsp; NPC speed: <strong>${r.npcSpeed}</strong>
        </div>
        ${r.won ? `<div class="race-result-payout">+ ${App.formatMoney(r.payout)}</div>` : ''}
        <div class="race-result-cond">Condition -${r.condLoss}%</div>
        <button class="house-buy-btn" style="margin-top:12px" onclick="Cars._raceResult=null;Cars._triggerRender()">Race Again</button>
      </div>`;
      return html;
    }

    // Car picker
    const carOptions = this._garage
      .map(c => `<option value="${c.id}">${c.icon} ${this._esc(c.modelName)} (spd ${Math.round(c.stats.speed)}, cond ${c.condition}%)</option>`).join('');

    return `<div class="race-panel">
      <div class="race-panel-title">🏎️ NPC Race</div>
      <div class="race-rule">Win to earn ~1.9x your bet. Each race wears down your car's condition.</div>
      <div class="race-row">
        <label class="car-design-label">Your Car</label>
        <select id="race-car-sel" class="furnish-select">${carOptions}</select>
      </div>
      <div class="race-row">
        <label class="car-design-label">Bet Amount</label>
        <input id="race-bet-inp" type="text" class="sh-input house-modal-input" placeholder="Amount (e.g. 10k)">
        <span class="sh-preview" style="display:none"></span>
      </div>
      <button class="house-buy-btn" style="margin-top:12px;width:100%" onclick="Cars._startRace()">🏁 Start Race</button>
    </div>`;
  },

  _startRace() {
    const sel = document.getElementById('race-car-sel');
    const bet = document.getElementById('race-bet-inp');
    if (!sel || !bet) return;
    const carId = sel.value;
    const betAmt = App.parseAmount(bet.value);
    if (isNaN(betAmt) || betAmt <= 0) { Toast.show('Enter a valid bet', '#f44336', 2000); return; }
    this.raceNpc(carId, betAmt);
  },

  // === ADMIN GRANT ===
  adminGrantCar(category) {
    const validCats = Object.keys(this.CATEGORY_DATA);
    if (!validCats.includes(category)) category = 'economy';
    const cd = this.CATEGORY_DATA[category];

    // Pick a matching body
    const matchingBody = Object.entries(this.BODIES).find(([, b]) => b.category === category);
    const bodyKey = matchingBody ? matchingBody[0] : 'compact';
    const bodyDef = this.BODIES[bodyKey];

    // Base stats scaled by category
    const scoreBase = { economy:50, sedan:55, suv:52, sports:68, luxury:72, supercar:82, hypercar:92 }[category] || 60;
    const rng = this._seededRng(Date.now() ^ Math.random() * 0xffffffff);
    const variance = () => scoreBase + (rng() - 0.5) * 20;
    const stats = {
      speed:       Math.max(10, Math.min(100, Math.round(variance() * bodyDef.speedMult))),
      comfort:     Math.max(10, Math.min(100, Math.round(variance() + bodyDef.comfortBonus))),
      luxury:      Math.max(10, Math.min(100, Math.round(variance()))),
      reliability: Math.max(10, Math.min(100, Math.round(variance()))),
      efficiency:  Math.max(10, Math.min(100, Math.round(variance()))),
    };
    const overallScore = this._calcOverallScore(stats);
    const car = {
      id: 'car_admin_' + Date.now().toString(36),
      modelId: 'admin',
      modelName: 'Admin ' + cd.label,
      brandId: null,
      brandName: 'Admin',
      category,
      icon: this.CATEGORY_ICONS[category] || '🚗',
      stats,
      flaws: [],
      rarity: cd.label,
      overallScore: Math.round(overallScore * 10) / 10,
      value: cd.baseValue * 1.5,
      condition: 100,
      odometer: 0,
      crafterUid: 'admin',
      crafterName: 'Admin',
      createdAt: Date.now(),
    };
    this._garage.push(car);
    App.save();
    if (App.currentScreen === 'cars') this._triggerRender();
  },

  // === SAVE / LOAD ===
  getSaveData() {
    return {
      company: this._company,
      models: this._models,
      garage: this._garage,
    };
  },

  loadSaveData(d) {
    if (!d) return;
    this._company = d.company || null;
    this._models = d.models || [];
    this._garage = d.garage || [];
  },

  // === HELPERS ===
  _seededRng(seed) {
    let s = seed | 0;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  },

  _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },
};
