// ===== Houses System =====
const Houses = {

  // === TIERS (regular NPC-generated houses) ===
  TIERS: [
    { tier:1, name:'Cozy Home',      icon:'🏠', basePrice:    50_000, specials:2, slots:2, vaultCap:10,  garageChance:0.30, garageRange:[2,3]  },
    { tier:2, name:'Suburban House', icon:'🏡', basePrice:   500_000, specials:3, slots:3, vaultCap:25,  garageChance:0.50, garageRange:[2,4]  },
    { tier:3, name:'Luxury Condo',   icon:'🏘️', basePrice: 5_000_000, specials:4, slots:4, vaultCap:50,  garageChance:0.70, garageRange:[2,4]  },
    { tier:4, name:'Mansion',        icon:'🏰', basePrice:50_000_000, specials:5, slots:5, vaultCap:100, garageChance:0.85, garageRange:[3,5]  },
    { tier:5, name:'Mega Estate',    icon:'🏯', basePrice:500_000_000,specials:6, slots:6, vaultCap:200, garageChance:0.95, garageRange:[3,5]  },
  ],

  // === GOD-TIER MANSIONS (Tier 6 — globally exclusive, require 50 rebirths) ===
  GOD_MANSIONS: [
    {
      id:'gm_aurora', name:'Aurora Pinnacle', icon:'🌌',
      basePrice:1_000_000_000,
      specials:['observatory','art_gallery','lab','vault','server_room','pool','solar','library'],
      vaultCap:500, garageSlots:50,
      desc:'Perched above the clouds. Northern light views year-round.',
    },
    {
      id:'gm_golden', name:'Golden Citadel', icon:'🏆',
      basePrice:2_500_000_000,
      specials:['vault','wine_cellar','home_casino','rooftop','cinema','art_gallery','pool','kitchen'],
      vaultCap:500, garageSlots:45,
      desc:'A gilded fortress of power, prestige, and indulgence.',
    },
    {
      id:'gm_shadow', name:'Shadow Fortress', icon:'🕶️',
      basePrice:5_000_000_000,
      specials:['security','server_room','lab','gym','vault','observatory','gaming_den','rooftop'],
      vaultCap:500, garageSlots:40,
      desc:'Hidden from public view. Secured beyond measure.',
    },
    {
      id:'gm_crystal', name:'Crystal Spire', icon:'💎',
      basePrice:7_500_000_000,
      specials:['pool','waterfront','rooftop','observatory','art_gallery','cinema','wine_cellar','kitchen'],
      vaultCap:500, garageSlots:35,
      desc:'Glass and crystal rising directly above the ocean.',
    },
    {
      id:'gm_omega', name:'Omega Compound', icon:'⚛️',
      basePrice:10_000_000_000,
      specials:['lab','server_room','observatory','solar','vault','gym','library','office'],
      vaultCap:500, garageSlots:30,
      desc:'A secretive research compound with unlimited infrastructure.',
    },
    {
      id:'gm_crimson', name:'Crimson Keep', icon:'🏯',
      basePrice:15_000_000_000,
      specials:['security','home_casino','vault','wine_cellar','library','gaming_den','cinema','rec_room'],
      vaultCap:500, garageSlots:38,
      desc:'An ancient fortress modernized for absolute luxury and play.',
    },
    {
      id:'gm_titan', name:'Titan Estate', icon:'🗻',
      basePrice:25_000_000_000,
      specials:['gym','gaming_den','server_room','lab','solar','observatory','security','pool'],
      vaultCap:500, garageSlots:42,
      desc:'Built into a mountain. Immovable. Unstoppable.',
    },
    {
      id:'gm_nexus', name:'Nexus Tower', icon:'🌐',
      basePrice:40_000_000_000,
      specials:['server_room','library','office','lab','solar','observatory','security','rooftop'],
      vaultCap:500, garageSlots:25,
      desc:'The ultimate smart-home and private innovation hub.',
    },
    {
      id:'gm_eternal', name:'Eternal Palace', icon:'👑',
      basePrice:75_000_000_000,
      specials:['art_gallery','wine_cellar','cinema','pool','rooftop','waterfront','kitchen','home_casino'],
      vaultCap:500, garageSlots:48,
      desc:'A palace built to outlast empires.',
    },
    {
      id:'gm_zero', name:'Zero Point Sanctum', icon:'🌠',
      basePrice:200_000_000_000,
      specials:['observatory','lab','server_room','vault','solar','rec_room','security','library'],
      vaultCap:500, garageSlots:20,
      desc:'The rarest property in existence. Only one will ever exist.',
    },
  ],

  // === SPECIALS POOL ===
  SPECIALS_POOL: [
    { key:'pool',        name:'Swimming Pool',   icon:'🏊', statType:'slotsBonus',    value:0.05 },
    { key:'garden',      name:'Garden',          icon:'🌿', statType:'hungerDecay',   value:-0.10 },
    { key:'gaming_den',  name:'Gaming Den',      icon:'🎮', statType:'gamblingBonus', value:0.08 },
    { key:'library',     name:'Library',         icon:'📚', statType:'stocksBonus',   value:0.05 },
    { key:'wine_cellar', name:'Wine Cellar',     icon:'🍷', statType:'earningsMult',  value:0.03 },
    { key:'home_casino', name:'Home Casino',     icon:'🎰', statType:'gamblingBonus', value:0.07 },
    { key:'security',    name:'Security System', icon:'🔒', statType:'raidReduction', value:0.30 },
    { key:'solar',       name:'Solar Panels',    icon:'⚡', statType:'passiveIncome', value:500  },
    { key:'gym',         name:'Home Gym',        icon:'🏋️', statType:'crimeBonus',    value:0.05 },
    { key:'waterfront',  name:'Waterfront View', icon:'🌊', statType:'earningsMult',  value:0.07 },
    { key:'office',      name:'Home Office',     icon:'🏢', statType:'stocksBonus',   value:0.08 },
    { key:'observatory', name:'Observatory',     icon:'🔭', statType:'spaceBonus',    value:0.10 },
    { key:'art_gallery', name:'Art Gallery',     icon:'🎨', statType:'craftingBonus', value:0.15 },
    { key:'lab',         name:'Private Lab',     icon:'🧪', statType:'pharmaBonus',   value:0.10 },
    { key:'vault',       name:'Money Vault',     icon:'🏦', statType:'earningsMult',  value:0.05 },
    { key:'rooftop',     name:'Rooftop Terrace', icon:'🌆', statType:'luckBoost',     value:0.05 },
    { key:'cinema',      name:'Private Cinema',  icon:'🎬', statType:'gamblingBonus', value:0.05 },
    { key:'kitchen',     name:'Gourmet Kitchen', icon:'👨‍🍳', statType:'hungerDecay',   value:-0.15 },
    { key:'server_room', name:'Server Room',     icon:'🖥️', statType:'hackingBonus',  value:0.08 },
    { key:'rec_room',    name:'Rec Room',        icon:'👾', statType:'slotsBonus',    value:0.03 },
  ],

  // === FURNITURE SHOP ===
  FURNITURE: [
    { id:'sofa',        name:'Comfy Sofa',    icon:'🛋️', cost:10_000,  bonus:{statType:'luckBoost',     value:0.01} },
    { id:'tv',          name:'Big TV',        icon:'📺', cost:25_000,  bonus:{statType:'slotsBonus',    value:0.02} },
    { id:'bookshelf',   name:'Bookshelf',     icon:'📚', cost:15_000,  bonus:{statType:'stocksBonus',   value:0.01} },
    { id:'desk',        name:'Gaming Desk',   icon:'🖥️', cost:40_000,  bonus:{statType:'gamblingBonus', value:0.02} },
    { id:'piano',       name:'Grand Piano',   icon:'🎹', cost:80_000,  bonus:{statType:'earningsMult',  value:0.02} },
    { id:'aquarium',    name:'Aquarium',      icon:'🐠', cost:50_000,  bonus:{statType:'luckBoost',     value:0.02} },
    { id:'safe',        name:'Wall Safe',     icon:'🔐', cost:100_000, bonus:{statType:'earningsMult',  value:0.03} },
    { id:'hot_tub',     name:'Hot Tub',       icon:'🛁', cost:150_000, bonus:{statType:'hungerDecay',   value:-0.05} },
    { id:'pool_table',  name:'Pool Table',    icon:'🎱', cost:60_000,  bonus:{statType:'gamblingBonus', value:0.03} },
    { id:'arcade_cab',  name:'Arcade Cabinet',icon:'👾', cost:200_000, bonus:{statType:'slotsBonus',    value:0.03} },
    { id:'telescope',   name:'Telescope',     icon:'🔭', cost:120_000, bonus:{statType:'spaceBonus',    value:0.05} },
    { id:'mini_bar',    name:'Mini Bar',      icon:'🍸', cost:90_000,  bonus:{statType:'luckBoost',     value:0.03} },
    { id:'trophy_case', name:'Trophy Case',   icon:'🏆', cost:75_000,  bonus:{statType:'earningsMult',  value:0.02} },
    { id:'server_rack', name:'Server Rack',   icon:'⚙️', cost:250_000, bonus:{statType:'hackingBonus',  value:0.05} },
    { id:'art_piece',   name:'Framed Art',    icon:'🖼️', cost:300_000, bonus:{statType:'craftingBonus', value:0.10} },
    { id:'chem_set',    name:'Chemistry Set', icon:'⚗️', cost:400_000, bonus:{statType:'pharmaBonus',   value:0.08} },
  ],

  HOUSE_NAMES: [
    ['Maple Drive','Pine Ridge','Elm Court','Oak Lane','Cedar Blvd','Birch Way','Willow Creek'],
    ['Cottage','Bungalow','Villa','Retreat','Hideaway','Estate','Manor','Lodge'],
  ],

  // === STATE ===
  _owned: [],
  _furnitureStash: {},
  _npcMarket: [],
  _npcSeed: 0,
  _playerListings: {},
  _godMansionData: {},   // { [mansionId]: { ownedBy, ownerName, purchasedAt, listedForSale, listingPrice } }
  _activeTab: 'market',
  _furnishTarget: null,

  // Vault (global per player, not per-house)
  _vault: { stocks: {}, crypto: {}, items: [] },
  _vaultPublic: false,

  _tickInterval: null,

  // === INIT ===
  init() {
    this._refreshNpcMarket();
    this._startTick();
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.listenHouseListings(data => {
        this._playerListings = data || {};
        this._triggerRender();
      });
      Firebase.listenGodMansions(data => {
        this._godMansionData = data || {};
        this._triggerRender();
      });
    }
  },

  _startTick() {
    if (this._tickInterval) clearInterval(this._tickInterval);
    this._tickInterval = setInterval(() => this.tick(), 1000);
  },

  tick() {
    const boosts = typeof App !== 'undefined' ? App.getAllBoosts() : this.getBoosts();
    if (boosts.passiveIncome > 0) {
      App.addBalance(boosts.passiveIncome);
    }
  },

  // === SEEDED RNG ===
  _seededRng(seed) {
    let s = seed | 0;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  },

  _generateHouse(seed, tier) {
    const tierDef = this.TIERS[tier - 1];
    const rng = this._seededRng(seed);
    const id = 'h_' + (seed >>> 0).toString(36) + '_' + tier;

    // Pick specials
    const pool = [...this.SPECIALS_POOL];
    const specials = [];
    for (let i = 0; i < tierDef.specials; i++) {
      const idx = Math.floor(rng() * pool.length);
      specials.push({ ...pool[idx] });
      pool.splice(idx, 1);
    }

    // Name
    const streets = this.HOUSE_NAMES[0];
    const types = this.HOUSE_NAMES[1];
    const name = streets[Math.floor(rng() * streets.length)] + ' ' + types[Math.floor(rng() * types.length)];

    // Furniture slots
    const furniture = {};
    for (let i = 0; i < tierDef.slots; i++) furniture['slot' + i] = null;

    // Garage (seeded)
    const hasGarage = rng() < tierDef.garageChance;
    const [gMin, gMax] = tierDef.garageRange;
    const garageSlots = hasGarage ? gMin + Math.floor(rng() * (gMax - gMin + 1)) : 0;

    return {
      id, name, tier, icon: tierDef.icon,
      basePrice: tierDef.basePrice,
      vaultCap: tierDef.vaultCap,
      specials, furniture,
      garageSlots,
      ownerUid: null, ownerName: null,
      listedForSale: false, listingPrice: null,
      seed,
    };
  },

  _refreshNpcMarket() {
    const seed = Math.floor(Date.now() / 180000);
    if (seed === this._npcSeed) return;
    this._npcSeed = seed;
    this._npcMarket = [];
    for (let i = 0; i < 10; i++) {
      const tier = Math.min(5, Math.floor(i / 2) + 1);
      this._npcMarket.push(this._generateHouse(seed * 100 + i, tier));
    }
    const msUntilRefresh = 180000 - (Date.now() % 180000);
    setTimeout(() => this._refreshNpcMarket(), msUntilRefresh + 100);
  },

  // === BOOSTS ===
  getBoosts() {
    const out = {
      earningsMult: 0, slotsBonus: 0, gamblingBonus: 0, luckBoost: 0,
      stocksBonus: 0, passiveIncome: 0, hungerDecayMult: 0, raidReductionMult: 0,
      crimeBonus: 0, hackingBonus: 0, spaceBonus: 0, craftingBonus: 0, pharmaBonus: 0,
    };
    for (const house of this._owned) {
      for (const sp of house.specials) {
        this._applyStatToBoosts(out, sp.statType, sp.value);
      }
      for (const slotKey in house.furniture) {
        const fId = house.furniture[slotKey];
        if (!fId) continue;
        const fDef = this.FURNITURE.find(f => f.id === fId);
        if (fDef) this._applyStatToBoosts(out, fDef.bonus.statType, fDef.bonus.value);
      }
    }
    return out;
  },

  _applyStatToBoosts(out, statType, value) {
    switch (statType) {
      case 'earningsMult':  out.earningsMult  += value; break;
      case 'slotsBonus':    out.slotsBonus    += value; break;
      case 'gamblingBonus': out.gamblingBonus += value; break;
      case 'luckBoost':     out.luckBoost     += value; break;
      case 'stocksBonus':   out.stocksBonus   += value; break;
      case 'passiveIncome': out.passiveIncome += value; break;
      case 'hungerDecay':   out.hungerDecayMult += value; break;
      case 'raidReduction': out.raidReductionMult += value; break;
      case 'crimeBonus':    out.crimeBonus    += value; break;
      case 'hackingBonus':  out.hackingBonus  += value; break;
      case 'spaceBonus':    out.spaceBonus    += value; break;
      case 'craftingBonus': out.craftingBonus += value; break;
      case 'pharmaBonus':   out.pharmaBonus   += value; break;
    }
  },

  // === VAULT ===
  getVaultCapacity() {
    return this._owned.reduce((sum, h) => sum + (h.vaultCap || 0), 0);
  },

  getVaultUsed() {
    const v = this._vault;
    return Object.keys(v.stocks || {}).length +
           Object.keys(v.crypto || {}).length +
           (v.items || []).length;
  },

  getTotalGarageSlots() {
    return this._owned.reduce((sum, h) => sum + (h.garageSlots || 0), 0);
  },

  depositStock(ticker, shares) {
    if (!ticker || !shares || shares <= 0) return false;
    const cap = this.getVaultCapacity();
    const used = this.getVaultUsed();
    if (used >= cap) { Toast.show('Vault is full!', '#f44336', 2000); return false; }

    // Try Companies._holdings first, then Stocks._holdings
    let taken = false;
    if (typeof Companies !== 'undefined') {
      const h = Companies._holdings[ticker];
      if (h && h.shares >= shares) {
        h.shares -= shares;
        if (h.shares <= 0) delete Companies._holdings[ticker];
        taken = true;
      }
    }
    if (!taken && typeof Stocks !== 'undefined') {
      const h = Stocks._holdings && Stocks._holdings[ticker];
      if (h && h.shares >= shares) {
        h.shares -= shares;
        if (h.shares <= 0) delete Stocks._holdings[ticker];
        taken = true;
      }
    }
    if (!taken) { Toast.show('Insufficient shares', '#f44336', 2000); return false; }

    if (!this._vault.stocks) this._vault.stocks = {};
    this._vault.stocks[ticker] = (this._vault.stocks[ticker] || 0) + shares;
    App.save();
    Toast.show('🏦 ' + shares + ' ' + ticker + ' shares vaulted', '#4caf50', 2500);
    return true;
  },

  withdrawStock(ticker) {
    if (!this._vault.stocks || !this._vault.stocks[ticker]) return;
    const shares = this._vault.stocks[ticker];
    delete this._vault.stocks[ticker];
    // Return to Companies or Stocks holdings
    if (typeof Companies !== 'undefined') {
      if (!Companies._holdings[ticker]) Companies._holdings[ticker] = { shares: 0, avgCost: 0 };
      Companies._holdings[ticker].shares += shares;
    }
    App.save();
    Toast.show('🏦 ' + shares + ' ' + ticker + ' shares withdrawn', '#4caf50', 2500);
  },

  depositCrypto(coinSymbol, amount) {
    if (!coinSymbol || !amount || amount <= 0) return false;
    const cap = this.getVaultCapacity();
    const used = this.getVaultUsed();
    if (used >= cap) { Toast.show('Vault is full!', '#f44336', 2000); return false; }

    if (typeof Crypto !== 'undefined') {
      if (!Crypto.wallet[coinSymbol] || Crypto.wallet[coinSymbol] < amount) {
        Toast.show('Insufficient crypto', '#f44336', 2000); return false;
      }
      Crypto.wallet[coinSymbol] -= amount;
    }
    if (!this._vault.crypto) this._vault.crypto = {};
    this._vault.crypto[coinSymbol] = (this._vault.crypto[coinSymbol] || 0) + amount;
    App.save();
    Toast.show('🏦 ' + amount + ' ' + coinSymbol + ' vaulted', '#4caf50', 2500);
    return true;
  },

  withdrawCrypto(coinSymbol) {
    if (!this._vault.crypto || !this._vault.crypto[coinSymbol]) return;
    const amount = this._vault.crypto[coinSymbol];
    delete this._vault.crypto[coinSymbol];
    if (typeof Crypto !== 'undefined') {
      if (!Crypto.wallet[coinSymbol]) Crypto.wallet[coinSymbol] = 0;
      Crypto.wallet[coinSymbol] += amount;
    }
    App.save();
    Toast.show('🏦 ' + amount + ' ' + coinSymbol + ' withdrawn', '#4caf50', 2500);
  },

  depositItem(itemId) {
    if (typeof Crafting === 'undefined') return;
    const cap = this.getVaultCapacity();
    const used = this.getVaultUsed();
    if (used >= cap) { Toast.show('Vault is full!', '#f44336', 2000); return; }

    const idx = Crafting._inventory.findIndex(i => i.id === itemId);
    if (idx < 0) { Toast.show('Item not found', '#f44336', 2000); return; }
    const item = Crafting._inventory.splice(idx, 1)[0];
    // Unequip if equipped
    for (const s of ['slot0','slot1','slot2']) {
      if (Crafting._equipped[s] === itemId) Crafting._equipped[s] = null;
    }
    if (!this._vault.items) this._vault.items = [];
    this._vault.items.push(item);
    App.save();
    Toast.show('🏦 Item vaulted', '#4caf50', 2500);
  },

  withdrawItem(itemId) {
    if (!this._vault.items) return;
    const idx = this._vault.items.findIndex(i => i.id === itemId);
    if (idx < 0) return;
    const item = this._vault.items.splice(idx, 1)[0];
    if (typeof Crafting !== 'undefined') Crafting._inventory.push(item);
    App.save();
    Toast.show('🏦 Item withdrawn to inventory', '#4caf50', 2500);
  },

  depositCar(carId) {
    if (typeof Cars === 'undefined') return;
    const cap = this.getVaultCapacity();
    const used = this.getVaultUsed();
    if (used >= cap) { Toast.show('Vault is full!', '#f44336', 2000); return; }
    const idx = Cars._garage.findIndex(c => c.id === carId);
    if (idx < 0) { Toast.show('Car not found', '#f44336', 2000); return; }
    const car = Cars._garage.splice(idx, 1)[0];
    if (!this._vault.cars) this._vault.cars = [];
    this._vault.cars.push(car);
    App.save();
    Toast.show('🏦 Car vaulted', '#4caf50', 2500);
  },

  withdrawCar(carId) {
    if (!this._vault.cars) return;
    const idx = this._vault.cars.findIndex(c => c.id === carId);
    if (idx < 0) return;
    const car = this._vault.cars.splice(idx, 1)[0];
    if (typeof Cars !== 'undefined') Cars._garage.push(car);
    App.save();
    Toast.show('🏦 Car withdrawn to garage', '#4caf50', 2500);
  },

  // === GOD MANSION METHODS ===
  canSeeGodMansions() {
    return (App.rebirth || 0) >= 50 || (typeof Admin !== 'undefined' && Admin.godMode);
  },

  _resolveGodMansionSpecials(mansionDef) {
    return mansionDef.specials.map(key => {
      const sp = this.SPECIALS_POOL.find(s => s.key === key);
      return sp || { key, name: key, icon: '✨', statType: 'earningsMult', value: 0.01 };
    });
  },

  async buyGodMansion(mansionId) {
    const def = this.GOD_MANSIONS.find(m => m.id === mansionId);
    if (!def) return;

    const liveData = this._godMansionData[mansionId];
    const isOwned = liveData && liveData.ownedBy && !liveData.listedForSale;
    if (isOwned) { Toast.show('Already owned by someone!', '#f44336', 2500); return; }

    const price = (liveData && liveData.listedForSale && liveData.listingPrice) || def.basePrice;
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (!isGod && App.balance < price) { Toast.show('Not enough money!', '#f44336', 2500); return; }
    if (!isGod) App.addBalance(-price);

    const sellerUid = liveData && liveData.listedForSale ? liveData.ownedBy : null;

    // Resolve specials
    const specials = this._resolveGodMansionSpecials(def);
    const furniture = {};
    for (let i = 0; i < 6; i++) furniture['slot' + i] = null;

    const house = {
      id: mansionId,
      name: def.name,
      tier: 6,
      icon: def.icon,
      basePrice: def.basePrice,
      vaultCap: def.vaultCap,
      garageSlots: def.garageSlots,
      specials,
      furniture,
      ownerUid: typeof Firebase !== 'undefined' ? Firebase.uid : 'local',
      ownerName: typeof Settings !== 'undefined' ? Settings.options.playerName : 'You',
      listedForSale: false,
      listingPrice: null,
      isGodMansion: true,
    };

    this._owned.push(house);

    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      await Firebase.claimGodMansion(mansionId, price, sellerUid);
    }

    // Seller receipt handled by Firebase
    App.save();
    Toast.show(def.icon + ' ' + def.name + ' acquired!', '#ff9800', 4000);
    this._triggerRender();
  },

  listGodMansionForSale(houseId, price) {
    const house = this._owned.find(h => h.id === houseId && h.isGodMansion);
    if (!house) return;
    house.listedForSale = true;
    house.listingPrice = price;
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.updateGodMansionListing(houseId, price, true);
    }
    App.save();
    Toast.show(house.icon + ' Listed for ' + App.formatMoney(price), '#4caf50', 2500);
    this._triggerRender();
  },

  // === BUYING / SELLING (regular houses) ===
  buyFromNpc(houseId) {
    const house = this._npcMarket.find(h => h.id === houseId);
    if (!house) return;
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (!isGod && App.balance < house.basePrice) { Toast.show('Not enough money!', '#f44336', 2500); return; }
    if (!isGod) App.addBalance(-house.basePrice);
    const owned = JSON.parse(JSON.stringify(house));
    owned.ownerUid = typeof Firebase !== 'undefined' ? Firebase.uid : 'local';
    owned.ownerName = typeof Settings !== 'undefined' ? Settings.options.playerName : 'You';
    this._owned.push(owned);
    this._npcMarket = this._npcMarket.filter(h => h.id !== houseId);
    App.save();
    Toast.show('🏠 House purchased!', '#4caf50', 2500);
    this._triggerRender();
  },

  listForSale(houseId, price) {
    const house = this._owned.find(h => h.id === houseId && !h.isGodMansion);
    if (!house) return;
    if (price <= 0) { Toast.show('Invalid price', '#f44336', 2000); return; }
    house.listedForSale = true;
    house.listingPrice = price;
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.listHouseForSale(house, price);
    App.save();
    Toast.show('🏠 Listed for ' + App.formatMoney(price), '#4caf50', 2500);
    this._triggerRender();
  },

  cancelListing(houseId) {
    const house = this._owned.find(h => h.id === houseId);
    if (!house) return;
    house.listedForSale = false;
    house.listingPrice = null;
    if (house.isGodMansion) {
      if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.updateGodMansionListing(houseId, null, false);
    } else {
      if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.cancelHouseListing(houseId);
    }
    App.save();
    this._triggerRender();
  },

  async buyFromPlayer(listingId) {
    const listing = this._playerListings[listingId];
    if (!listing) { Toast.show('Listing not found', '#f44336', 2000); return; }
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (!isGod && App.balance < listing.listingPrice) { Toast.show('Not enough money!', '#f44336', 2500); return; }
    if (!isGod) App.addBalance(-listing.listingPrice);
    const house = JSON.parse(JSON.stringify(listing));
    house.ownerUid = typeof Firebase !== 'undefined' ? Firebase.uid : 'local';
    house.ownerName = typeof Settings !== 'undefined' ? Settings.options.playerName : 'You';
    house.listedForSale = false;
    house.listingPrice = null;
    delete house.sellerUid; delete house.sellerName;
    this._owned.push(house);
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      await Firebase.buyHouseListing(listingId, listing.listingPrice, listing.sellerUid);
    }
    App.save();
    Toast.show('🏠 House bought!', '#4caf50', 2500);
    this._triggerRender();
  },

  // === FURNITURE ===
  buyFurniture(fId) {
    const fDef = this.FURNITURE.find(f => f.id === fId);
    if (!fDef) return;
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (!isGod && App.balance < fDef.cost) { Toast.show('Not enough money!', '#f44336', 2500); return; }
    if (!isGod) App.addBalance(-fDef.cost);
    this._furnitureStash[fId] = (this._furnitureStash[fId] || 0) + 1;
    App.save();
    Toast.show(fDef.icon + ' ' + fDef.name + ' bought!', '#4caf50', 2000);
    this._triggerRender();
  },

  placeFurniture(houseId, slotKey, fId) {
    const house = this._owned.find(h => h.id === houseId);
    if (!house || !(slotKey in house.furniture)) return;
    if (!this._furnitureStash[fId] || this._furnitureStash[fId] <= 0) { Toast.show('Not in stash', '#f44336', 2000); return; }
    const existing = house.furniture[slotKey];
    if (existing) this._furnitureStash[existing] = (this._furnitureStash[existing] || 0) + 1;
    house.furniture[slotKey] = fId;
    this._furnitureStash[fId]--;
    if (this._furnitureStash[fId] <= 0) delete this._furnitureStash[fId];
    App.save();
    this._triggerRender();
  },

  removeFurniture(houseId, slotKey) {
    const house = this._owned.find(h => h.id === houseId);
    if (!house) return;
    const fId = house.furniture[slotKey];
    if (!fId) return;
    this._furnitureStash[fId] = (this._furnitureStash[fId] || 0) + 1;
    house.furniture[slotKey] = null;
    App.save();
    this._triggerRender();
  },

  // === TABS ===
  setTab(tab) {
    this._activeTab = tab;
    this._triggerRender();
  },

  // === RENDER ===
  _triggerRender() {
    if (typeof App !== 'undefined' && App.currentScreen === 'houses') this.render();
  },

  render() {
    const container = document.getElementById('houses-content');
    if (!container) return;
    const focused = document.activeElement;
    if (focused && container.contains(focused) &&
        (focused.tagName === 'SELECT' || focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA')) return;

    const tab = this._activeTab;
    const tabs = ['market','mine','furniture','vault'];
    const tabLabels = { market:'🏪 Market', mine:'🏠 My Houses', furniture:'🛋️ Furniture', vault:'🏦 Vault' };

    let html = `<div class="houses-tabs">`;
    tabs.forEach(t => {
      html += `<button class="houses-tab${tab===t?' active':''}" onclick="Houses.setTab('${t}')">${tabLabels[t]}</button>`;
    });
    html += `</div>`;

    if (tab === 'market')    html += this._renderMarket();
    else if (tab === 'mine') html += this._renderMine();
    else if (tab === 'furniture') html += this._renderFurnitureShop();
    else if (tab === 'vault')     html += this._renderVault();

    container.innerHTML = html;
  },

  _renderMarket() {
    let html = `<div class="houses-section-label">NPC Market <span class="houses-timer-note">(refreshes every 3 min)</span></div>`;
    html += `<div class="houses-grid">`;
    for (const h of this._npcMarket) {
      const tierDef = this.TIERS[h.tier - 1];
      const canAfford = App.balance >= h.basePrice || (typeof Admin !== 'undefined' && Admin.godMode);
      html += this._renderHouseCard(h, tierDef, `Houses.buyFromNpc('${h.id}')`, App.formatMoney(h.basePrice), canAfford);
    }
    html += `</div>`;

    // God Mansions section
    if (this.canSeeGodMansions()) {
      html += `<div class="houses-section-label" style="margin-top:18px">
        ✨ God-Tier Mansions <span class="houses-timer-note">(requires 50 rebirths • globally exclusive)</span>
      </div>`;
      html += `<div class="houses-grid">`;
      for (const def of this.GOD_MANSIONS) {
        const liveData = this._godMansionData[def.id] || {};
        const isOwned = !!(liveData.ownedBy && !liveData.listedForSale);
        const isMine = liveData.ownedBy === (typeof Firebase !== 'undefined' ? Firebase.uid : null);
        const listedForSale = !!(liveData.listedForSale);
        const price = listedForSale ? liveData.listingPrice : def.basePrice;
        const canAfford = App.balance >= price || (typeof Admin !== 'undefined' && Admin.godMode);

        const specials = this._resolveGodMansionSpecials(def);
        html += `<div class="house-card house-card-god${isOwned && !listedForSale ? ' house-card-taken' : ''}">
          <div class="house-card-icon">${def.icon}</div>
          <div class="house-card-name">${this._esc(def.name)}</div>
          <div class="house-god-desc">${this._esc(def.desc)}</div>
          <div class="house-card-tier">God Tier • 500 vault • ${def.garageSlots} car garage</div>
          <div class="house-specials">`;
        for (const sp of specials) {
          html += `<span class="house-special-tag">${sp.icon} ${sp.name}</span>`;
        }
        html += `</div>`;
        if (isMine) {
          html += `<div class="house-owned-badge">You own this</div>`;
        } else if (isOwned) {
          html += `<div class="house-taken-badge">Owned by ${this._esc(liveData.ownerName || 'Another player')}</div>`;
        } else {
          html += `<button class="house-buy-btn house-buy-btn-god${canAfford?'':' unaffordable'}" onclick="Houses.buyGodMansion('${def.id}')">
            ${listedForSale ? '🔄 Buy for ' : 'Claim for '}${App.formatMoney(price)}
          </button>`;
        }
        html += `</div>`;
      }
      html += `</div>`;
    } else {
      html += `<div class="houses-rebirth-lock">🔒 God-Tier Mansions unlock at 50 rebirths (current: ${App.rebirth || 0})</div>`;
    }

    // Player listings
    const listings = Object.entries(this._playerListings);
    if (listings.length > 0) {
      html += `<div class="houses-section-label" style="margin-top:16px">Player Listings</div>`;
      html += `<div class="houses-grid">`;
      const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
      for (const [lid, listing] of listings) {
        if (listing.sellerUid === myUid) continue;
        const canAfford = App.balance >= listing.listingPrice || (typeof Admin !== 'undefined' && Admin.godMode);
        html += `<div class="house-card">
          <div class="house-card-icon">${listing.icon}</div>
          <div class="house-card-name">${this._esc(listing.name)}</div>
          <div class="house-card-tier">Tier ${listing.tier} • by ${this._esc(listing.sellerName || '?')}</div>
          <div class="house-specials">`;
        for (const sp of (listing.specials || [])) html += `<span class="house-special-tag">${sp.icon} ${sp.name}</span>`;
        html += `</div>
          <button class="house-buy-btn${canAfford?'':' unaffordable'}" onclick="Houses.buyFromPlayer('${lid}')">
            Buy ${App.formatMoney(listing.listingPrice)}</button>
        </div>`;
      }
      html += `</div>`;
    }

    return html;
  },

  _renderHouseCard(h, tierDef, buyFn, priceLabel, canAfford) {
    let html = `<div class="house-card">
      <div class="house-card-icon">${h.icon}</div>
      <div class="house-card-name">${this._esc(h.name)}</div>
      <div class="house-card-tier">Tier ${h.tier} — ${tierDef ? tierDef.name : ''}</div>
      <div class="house-specials">`;
    for (const sp of h.specials) html += `<span class="house-special-tag">${sp.icon} ${sp.name}</span>`;
    html += `</div>`;
    html += `<div class="house-slots-note">${(tierDef ? tierDef.slots : 6)} furniture • ${h.garageSlots > 0 ? h.garageSlots + ' garage' : 'No garage'} • ${h.vaultCap || 0} vault</div>`;
    html += `<button class="house-buy-btn${canAfford?'':' unaffordable'}" onclick="${buyFn}">Buy ${priceLabel}</button>`;
    html += `</div>`;
    return html;
  },

  _renderMine() {
    const totalGarage = this.getTotalGarageSlots();
    const ownedCars = typeof Cars !== 'undefined' ? Cars._garage.length : 0;

    let html = `<div class="mine-summary-bar">
      <span>🏠 ${this._owned.length} houses</span>
      <span>🏦 Vault: ${this.getVaultUsed()}/${this.getVaultCapacity()}</span>
      <span>🚗 Garage: ${ownedCars}/${totalGarage}</span>
    </div>`;

    if (this._owned.length === 0) {
      return html + `<div class="houses-empty">You don't own any houses yet.<br>Visit the Market tab to buy one!</div>`;
    }
    html += `<div class="houses-grid">`;
    for (const house of this._owned) {
      const tierDef = house.tier <= 5 ? this.TIERS[house.tier - 1] : null;
      const furnishedCount = Object.values(house.furniture).filter(f => f !== null).length;
      const totalSlots = tierDef ? tierDef.slots : 6;
      html += `<div class="house-card house-card-owned${house.isGodMansion ? ' house-card-god' : ''}">
        <div class="house-card-icon">${house.icon}</div>
        <div class="house-card-name">${this._esc(house.name)}</div>
        <div class="house-card-tier">${house.isGodMansion ? 'God Tier' : 'Tier ' + house.tier + ' — ' + (tierDef ? tierDef.name : '')}</div>
        <div class="house-specials">`;
      for (const sp of house.specials) html += `<span class="house-special-tag">${sp.icon} ${sp.name}</span>`;
      html += `</div>
        <div class="house-slots-note">${furnishedCount}/${totalSlots} furniture • ${house.garageSlots || 0} garage • ${house.vaultCap || 0} vault</div>
        <div class="house-actions">
          <button class="house-action-btn" onclick="Houses.openFurnishModal('${house.id}')">🛋️ Furnish</button>`;
      if (house.listedForSale) {
        html += `<div class="house-listed-badge">Listed: ${App.formatMoney(house.listingPrice)}</div>
          <button class="house-action-btn house-cancel-btn" onclick="Houses.cancelListing('${house.id}')">Cancel</button>`;
      } else {
        html += `<button class="house-action-btn" onclick="Houses._showListModal('${house.id}')">💰 Sell</button>`;
      }
      html += `</div></div>`;
    }
    html += `</div>`;
    return html;
  },

  _renderVault() {
    const cap = this.getVaultCapacity();
    const used = this.getVaultUsed();
    const v = this._vault;

    if (cap === 0) {
      return `<div class="vault-empty-msg">Buy a house to unlock vault storage.<br>Vault capacity comes from each house you own.</div>`;
    }

    let html = `<div class="vault-header">
      <div class="vault-cap-bar">
        <div class="vault-cap-fill" style="width:${Math.min(100, Math.round(used/cap*100))}%"></div>
      </div>
      <div class="vault-cap-label">${used} / ${cap} slots used</div>
      <label class="vault-public-toggle">
        <input type="checkbox" ${this._vaultPublic ? 'checked' : ''} onchange="Houses._vaultPublic=this.checked;App.save()"> Public vault (others can see)
      </label>
    </div>`;

    // Stocks
    const stockKeys = Object.keys(v.stocks || {});
    if (stockKeys.length > 0) {
      html += `<div class="vault-section-label">📈 Stocks</div><div class="vault-items-list">`;
      for (const ticker of stockKeys) {
        const shares = v.stocks[ticker];
        html += `<div class="vault-item-row">
          <span class="vault-item-name">${this._esc(ticker)}</span>
          <span class="vault-item-val">${shares} shares</span>
          <button class="vault-withdraw-btn" onclick="Houses.withdrawStock('${ticker}')">Withdraw</button>
        </div>`;
      }
      html += `</div>`;
    }

    // Crypto
    const cryptoKeys = Object.keys(v.crypto || {});
    if (cryptoKeys.length > 0) {
      html += `<div class="vault-section-label">⛏️ Crypto</div><div class="vault-items-list">`;
      for (const sym of cryptoKeys) {
        const amount = v.crypto[sym];
        html += `<div class="vault-item-row">
          <span class="vault-item-name">${this._esc(sym)}</span>
          <span class="vault-item-val">${amount.toFixed(4)}</span>
          <button class="vault-withdraw-btn" onclick="Houses.withdrawCrypto('${sym}')">Withdraw</button>
        </div>`;
      }
      html += `</div>`;
    }

    // Items
    if ((v.items || []).length > 0) {
      html += `<div class="vault-section-label">🎒 Items</div><div class="vault-items-list">`;
      for (const item of v.items) {
        html += `<div class="vault-item-row">
          <span class="vault-item-name">${item.icon} ${this._esc(item.name)}</span>
          <span class="vault-item-val" style="color:${(typeof Crafting !== 'undefined' ? Crafting.RARITY_COLORS[item.rarity] : '#aaa') || '#aaa'}">${item.rarity}</span>
          <button class="vault-withdraw-btn" onclick="Houses.withdrawItem('${item.id}')">Withdraw</button>
        </div>`;
      }
      html += `</div>`;
    }

    // Cars in vault
    if ((v.cars || []).length > 0) {
      html += `<div class="vault-section-label">🚗 Cars</div><div class="vault-items-list">`;
      for (const car of v.cars) {
        html += `<div class="vault-item-row">
          <span class="vault-item-name">${car.icon || '🚗'} ${this._esc(car.modelName || car.brandName)}</span>
          <span class="vault-item-val">${car.rarity}</span>
          <button class="vault-withdraw-btn" onclick="Houses.withdrawCar('${car.id}')">Withdraw</button>
        </div>`;
      }
      html += `</div>`;
    }

    // Deposit buttons
    html += `<div class="vault-deposit-section">
      <div class="vault-section-label">Deposit to Vault</div>
      <div class="vault-deposit-grid">`;

    // Deposit stock
    const holdingTickers = typeof Companies !== 'undefined' ? Object.keys(Companies._holdings || {}) : [];
    if (holdingTickers.length > 0) {
      html += `<div class="vault-deposit-block">
        <div class="vault-deposit-label">Stock (ticker)</div>
        <select id="vault-stock-sel" class="vault-deposit-select">
          ${holdingTickers.map(t => `<option value="${this._esc(t)}">${this._esc(t)} (${Math.floor(Companies._holdings[t].shares || 0)})</option>`).join('')}
        </select>
        <input id="vault-stock-amt" type="number" min="1" placeholder="Shares" class="vault-deposit-input">
        <button class="vault-deposit-btn" onclick="Houses._depositStockUI()">Deposit</button>
      </div>`;
    }

    // Deposit crypto
    const cryptoWallet = typeof Crypto !== 'undefined' ? Crypto.wallet || {} : {};
    const cryptoHeld = Object.keys(cryptoWallet).filter(k => cryptoWallet[k] > 0);
    if (cryptoHeld.length > 0) {
      html += `<div class="vault-deposit-block">
        <div class="vault-deposit-label">Crypto</div>
        <select id="vault-crypto-sel" class="vault-deposit-select">
          ${cryptoHeld.map(k => `<option value="${this._esc(k)}">${this._esc(k)} (${cryptoWallet[k].toFixed(4)})</option>`).join('')}
        </select>
        <input id="vault-crypto-amt" type="number" min="0.0001" step="0.0001" placeholder="Amount" class="vault-deposit-input">
        <button class="vault-deposit-btn" onclick="Houses._depositCryptoUI()">Deposit</button>
      </div>`;
    }

    html += `</div></div>`;
    return html;
  },

  _depositStockUI() {
    const sel = document.getElementById('vault-stock-sel');
    const amt = document.getElementById('vault-stock-amt');
    if (!sel || !amt) return;
    const ticker = sel.value;
    const shares = Math.floor(parseFloat(amt.value));
    if (!ticker || isNaN(shares) || shares <= 0) { Toast.show('Invalid input', '#f44336', 2000); return; }
    if (this.depositStock(ticker, shares)) { amt.value = ''; this._triggerRender(); }
  },

  _depositCryptoUI() {
    const sel = document.getElementById('vault-crypto-sel');
    const amt = document.getElementById('vault-crypto-amt');
    if (!sel || !amt) return;
    const sym = sel.value;
    const amount = parseFloat(amt.value);
    if (!sym || isNaN(amount) || amount <= 0) { Toast.show('Invalid input', '#f44336', 2000); return; }
    if (this.depositCrypto(sym, amount)) { amt.value = ''; this._triggerRender(); }
  },

  _renderFurnitureShop() {
    let html = `<div class="houses-section-label">Furniture Shop — bonuses apply when placed in a house</div>`;
    const stashKeys = Object.keys(this._furnitureStash);
    html += `<div class="furniture-stash-info">${stashKeys.length > 0 ? 'Stash: ' + stashKeys.map(fId => {
      const fDef = this.FURNITURE.find(f => f.id === fId);
      return fDef ? fDef.icon + ' ' + fDef.name + ' ×' + this._furnitureStash[fId] : '';
    }).join('  ') : 'Stash empty'}</div>`;
    html += `<div class="furniture-grid">`;
    for (const fDef of this.FURNITURE) {
      const canAfford = App.balance >= fDef.cost || (typeof Admin !== 'undefined' && Admin.godMode);
      const owned = this._furnitureStash[fDef.id] || 0;
      html += `<div class="furniture-card">
        <div class="furniture-icon">${fDef.icon}</div>
        <div class="furniture-name">${fDef.name}</div>
        <div class="furniture-bonus">${this._statLabel(fDef.bonus.statType, fDef.bonus.value)}</div>
        ${owned > 0 ? `<div class="furniture-owned-badge">Owned: ${owned}</div>` : ''}
        <button class="furniture-buy-btn${canAfford?'':' unaffordable'}" onclick="Houses.buyFurniture('${fDef.id}')">Buy ${App.formatMoney(fDef.cost)}</button>
      </div>`;
    }
    html += `</div>`;
    return html;
  },

  _statLabel(statType, value) {
    const pct = v => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%';
    switch (statType) {
      case 'earningsMult':  return pct(value) + ' earnings';
      case 'slotsBonus':    return pct(value) + ' slots';
      case 'gamblingBonus': return pct(value) + ' gambling';
      case 'luckBoost':     return pct(value) + ' luck';
      case 'stocksBonus':   return pct(value) + ' stock income';
      case 'passiveIncome': return '+' + App.formatMoney(value) + '/s';
      case 'hungerDecay':   return pct(value) + ' hunger decay';
      case 'raidReduction': return pct(value) + ' raid protection';
      case 'crimeBonus':    return pct(value) + ' crime income';
      case 'hackingBonus':  return pct(value) + ' hacking';
      case 'spaceBonus':    return pct(value) + ' space income';
      case 'craftingBonus': return pct(value) + ' crafting quality';
      case 'pharmaBonus':   return pct(value) + ' pharma';
      default: return value;
    }
  },

  // === FURNISH MODAL ===
  openFurnishModal(houseId) {
    this._furnishTarget = houseId;
    this._renderFurnishModal();
  },

  closeFurnishModal() {
    this._furnishTarget = null;
    const m = document.getElementById('furnish-modal');
    if (m) m.remove();
  },

  _renderFurnishModal() {
    const house = this._owned.find(h => h.id === this._furnishTarget);
    if (!house) return;
    const tierDef = house.tier <= 5 ? this.TIERS[house.tier - 1] : { slots: 6 };
    const existing = document.getElementById('furnish-modal');
    if (existing) existing.remove();

    let slotsHtml = '';
    for (let i = 0; i < tierDef.slots; i++) {
      const slotKey = 'slot' + i;
      const fId = house.furniture[slotKey];
      const fDef = fId ? this.FURNITURE.find(f => f.id === fId) : null;
      slotsHtml += `<div class="furnish-slot">
        <div class="furnish-slot-label">Slot ${i+1}</div>
        ${fDef ? `<div class="furnish-slot-item">${fDef.icon} ${fDef.name}
          <button class="furnish-remove-btn" onclick="Houses.removeFurniture('${house.id}','${slotKey}')">✕</button>
        </div>` : `<div class="furnish-slot-empty">Empty</div>`}
        <select class="furnish-select" onchange="Houses._onFurnishSelect('${house.id}','${slotKey}',this.value)">
          <option value="">— Place furniture —</option>
          ${this.FURNITURE.filter(f => (this._furnitureStash[f.id] || 0) > 0)
            .map(f => `<option value="${f.id}">${f.icon} ${f.name} (×${this._furnitureStash[f.id]})</option>`).join('')}
        </select>
      </div>`;
    }

    const modal = document.createElement('div');
    modal.id = 'furnish-modal';
    modal.className = 'house-modal-overlay';
    modal.innerHTML = `
      <div class="house-modal-box furnish-modal-box">
        <div class="house-modal-title">🛋️ Furnish ${this._esc(house.name)}</div>
        <div class="furnish-slots-list">${slotsHtml}</div>
        <button class="house-modal-btn" onclick="Houses.closeFurnishModal()">Done</button>
      </div>`;
    document.body.appendChild(modal);
  },

  _onFurnishSelect(houseId, slotKey, fId) {
    if (!fId) return;
    this.placeFurniture(houseId, slotKey, fId);
    this._renderFurnishModal();
  },

  _showListModal(houseId) {
    const house = this._owned.find(h => h.id === houseId);
    if (!house) return;
    const existing = document.getElementById('house-list-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'house-list-modal';
    modal.className = 'house-modal-overlay';
    modal.innerHTML = `
      <div class="house-modal-box">
        <div class="house-modal-title">💰 List ${this._esc(house.name)} for sale</div>
        <input id="house-list-price" type="text" class="sh-input house-modal-input" placeholder="Price (e.g. 1m)">
        <span class="sh-preview" style="display:none"></span>
        <div class="house-modal-actions">
          <button class="house-modal-btn" onclick="Houses._confirmList('${houseId}')">List</button>
          <button class="house-modal-btn house-modal-cancel" onclick="document.getElementById('house-list-modal').remove()">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('house-list-price')?.focus(), 50);
  },

  _confirmList(houseId) {
    const inp = document.getElementById('house-list-price');
    if (!inp) return;
    const price = App.parseAmount(inp.value);
    if (isNaN(price) || price <= 0) { Toast.show('Invalid price', '#f44336', 2000); return; }
    document.getElementById('house-list-modal')?.remove();
    const house = this._owned.find(h => h.id === houseId);
    if (house && house.isGodMansion) this.listGodMansionForSale(houseId, price);
    else this.listForSale(houseId, price);
  },

  // === SAVE / LOAD ===
  getSaveData() {
    return {
      owned: this._owned,
      furnitureStash: this._furnitureStash,
      vault: this._vault,
      vaultPublic: this._vaultPublic,
    };
  },

  loadSaveData(d) {
    if (!d) return;
    this._owned = d.owned || [];
    this._furnitureStash = d.furnitureStash || {};
    this._vault = d.vault || { stocks: {}, crypto: {}, items: [], cars: [] };
    if (!this._vault.cars) this._vault.cars = [];
    this._vaultPublic = d.vaultPublic || false;
  },

  _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },
};
