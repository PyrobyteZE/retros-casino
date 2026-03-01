// ===== Player-Owned Companies =====
const Companies = {
  // === CONSTANTS ===
  FOUND_COST:     1_000_000,
  STOCK2_COST:      500_000,
  STOCK3_COST:    1_000_000,
  MAX_STOCKS: 3,
  MAX_COMPANIES_HARD: 10,
  SLOT_COSTS: [0, 5_000_000, 15_000_000], // cost to unlock slot 2 then 3

  // Base price cap per Bull Propaganda level (0–5)
  BULL_PROP_BASE_CAPS: [100, 500, 1200, 2500, 5000, 10000],

  // Default stock parameters per personality type
  PERSONALITY_DEFAULTS: {
    standard: { basePrice: 100,  vol: 0.05 },
    extreme:  { basePrice: 100,  vol: 0.18 },
    penny:    { basePrice: 0.50, vol: 0.25 },
  },

  // === COMPANY PROPERTIES (4 tiers per industry, base income per 5 seconds) ===
  COMPANY_PROPERTIES: {
    energy: [
      { key: 'energy_1', name: '⛽ Gas Station',          cost:    200_000, income:    400 },
      { key: 'energy_2', name: '🛢️ Oil Rig',              cost:  1_000_000, income:  1_800 },
      { key: 'energy_3', name: '⚡ Fusion Reactor',        cost:  4_000_000, income:  7_500 },
      { key: 'energy_4', name: '🌞 Dyson Sphere Segment',  cost: 15_000_000, income: 28_000 },
    ],
    tech: [
      { key: 'tech_1',   name: '🖥️ Server Rack',          cost:    150_000, income:    350 },
      { key: 'tech_2',   name: '💾 Data Center',           cost:    800_000, income:  1_600 },
      { key: 'tech_3',   name: '🤖 AI Cluster',            cost:  3_500_000, income:  6_500 },
      { key: 'tech_4',   name: '⚛️ Quantum Core',          cost: 12_000_000, income: 24_000 },
    ],
    entertainment: [
      { key: 'ent_1',    name: '🕹️ Arcade Cabinet',        cost:    100_000, income:    300 },
      { key: 'ent_2',    name: '🎬 Movie Studio',           cost:    600_000, income:  1_400 },
      { key: 'ent_3',    name: '🎡 Theme Park',             cost:  2_500_000, income:  5_500 },
      { key: 'ent_4',    name: '📺 Global Media Empire',    cost: 10_000_000, income: 20_000 },
    ],
    finance: [
      { key: 'fin_1',    name: '🏧 ATM Network',            cost:    250_000, income:    500 },
      { key: 'fin_2',    name: '📊 Hedge Fund',             cost:  1_200_000, income:  2_200 },
      { key: 'fin_3',    name: '🏦 Investment Bank',        cost:  5_000_000, income:  9_000 },
      { key: 'fin_4',    name: '💳 Central Bank Seat',      cost: 18_000_000, income: 34_000 },
    ],
    space: [
      { key: 'space_1',  name: '📡 Satellite Link',         cost:    300_000, income:    600 },
      { key: 'space_2',  name: '🛸 Launch Pad',             cost:  1_500_000, income:  2_800 },
      { key: 'space_3',  name: '🛰️ Orbital Station',        cost:  6_000_000, income: 11_000 },
      { key: 'space_4',  name: '🌙 Mars Colony',            cost: 20_000_000, income: 38_000 },
    ],
    food: [
      { key: 'food_1',   name: '🌮 Food Truck',             cost:    100_000, income:    280 },
      { key: 'food_2',   name: '🍽️ Restaurant Chain',       cost:    500_000, income:  1_200 },
      { key: 'food_3',   name: '🏭 Megafarm',               cost:  2_200_000, income:  4_800 },
      { key: 'food_4',   name: '🌾 Global Food Corp',       cost:  9_000_000, income: 18_500 },
    ],
    military: [
      { key: 'mil_1',    name: '🔫 Arms Depot',             cost:    350_000, income:    700 },
      { key: 'mil_2',    name: '🏭 Weapons Factory',        cost:  1_800_000, income:  3_200 },
      { key: 'mil_3',    name: '🛡️ Defense Contractor HQ', cost:  7_000_000, income: 13_000 },
      { key: 'mil_4',    name: '🚀 Black Site',             cost: 18_000_000, income: 35_000 },
    ],
    pharma: [
      { key: 'pha_1',    name: '🧪 Lab Bench',              cost:    120_000, income:    320 },
      { key: 'pha_2',    name: '🏥 Clinical Trial Wing',    cost:    700_000, income:  1_500 },
      { key: 'pha_3',    name: '💊 Biotech Campus',         cost:  3_000_000, income:  6_000 },
      { key: 'pha_4',    name: '💉 Patent Monopoly',        cost: 11_000_000, income: 22_000 },
    ],
    crime: [
      { key: 'cri_1',    name: '🏪 Shell Company',          cost:    180_000, income:    420 },
      { key: 'cri_2',    name: '💸 Money Laundromat',       cost:    900_000, income:  1_900 },
      { key: 'cri_3',    name: '🕶️ Smuggling Ring',         cost:  4_500_000, income:  8_500 },
      { key: 'cri_4',    name: '🕵️ Shadow Syndicate',       cost: 16_000_000, income: 32_000 },
    ],
    vibes: [
      { key: 'vib_1',    name: '✨ Good Energy Crystal',    cost:     80_000, income:    250 },
      { key: 'vib_2',    name: '🪄 Vibe Consultancy',       cost:    450_000, income:  1_100 },
      { key: 'vib_3',    name: '🌀 Manifestation Campus',   cost:  2_000_000, income:  4_200 },
      { key: 'vib_4',    name: '🌌 The Vibes Dimension',    cost:  8_500_000, income: 17_000 },
    ],
    automotive: [
      { key: 'auto_1',   name: '🏪 Car Showroom',           cost:    300_000, income:    600 },
      { key: 'auto_2',   name: '🏭 Assembly Plant',          cost:  1_500_000, income:  3_000 },
      { key: 'auto_3',   name: '🏎️ Test Track',             cost:  5_000_000, income: 10_000 },
      { key: 'auto_4',   name: '🏟️ Hyperdrome',              cost: 20_000_000, income: 40_000 },
    ],
  },

  // Per-company upgrades definition
  COMPANY_UPGRADES: {
    volatility: {
      name: 'Volatile Engine',
      icon: '\u26A1',
      desc: 'Adds a rolling dice chance each tick for outsized price moves. Higher levels tilt the dice in your favour — but you can still roll bad.',
      maxLevel: 5,
      costs: [500_000, 1_500_000, 3_000_000, 6_000_000, 12_000_000],
    },
    bullBias: {
      name: 'Bull Propaganda',
      icon: '\u{1F4C8}',
      desc: 'Generates organic buy demand every tick, biasing your stock slightly upward over time.',
      maxLevel: 5,
      costs: [750_000, 2_000_000, 4_000_000, 8_000_000, 15_000_000],
    },
    resilience: {
      name: 'Market Resilience',
      icon: '\u{1F6E1}',
      desc: 'Cushions crash severity and softens sell-off damage. Will not prevent bankruptcy but slows the fall.',
      maxLevel: 3,
      costs: [1_000_000, 3_500_000, 9_000_000],
    },
    dividendBoost: {
      name: 'Dividend Yield',
      icon: '\u{1F4B0}',
      desc: 'Multiplies every dividend payout you issue. More rewards = more loyal shareholders.',
      maxLevel: 3,
      costs: [500_000, 2_000_000, 6_000_000],
    },
    insiderAccess: {
      name: 'Insider Network',
      icon: '\u{1F50D}',
      desc: 'Reveals current buy/sell pressure and price targets on your own stocks before the market reacts.',
      maxLevel: 3,
      costs: [2_000_000, 6_000_000, 15_000_000],
    },
    acquisitionLicense: {
      name: 'M&A Division',
      icon: '\u{1F91D}',
      desc: 'Enables acquisition offers on rival sub-stocks. Buy a sub-stock from another company and absorb it into yours. 7-stock portfolio cap total.',
      maxLevel: 1,
      costs: [5_000_000],
    },
  },

  // === INDUSTRIES (each links to system stock symbols for cross-influence) ===
  INDUSTRIES: [
    { id: 'energy',        label: '\u26FD Energy',        stocks: ['JOIL', 'ROIL'] },
    { id: 'tech',          label: '\u{1F4BB} Technology',    stocks: ['RETRO'] },
    { id: 'entertainment', label: '\u{1F3AE} Entertainment', stocks: ['JOY'] },
    { id: 'finance',       label: '\u{1F988} Finance',       stocks: ['SHARK'] },
    { id: 'space',         label: '\u{1F680} Space',          stocks: ['LUNA'] },
    { id: 'food',          label: '\u{1F354} Food',          stocks: [] },
    { id: 'military',      label: '\u{1FAA6} Military',      stocks: ['JOY'] },
    { id: 'pharma',        label: '\u{1F48A} Pharma',        stocks: [] },
    { id: 'crime',         label: '\u{1F977} Crime',         stocks: [] },
    { id: 'vibes',         label: '\u2728 Vibes-Based',     stocks: [] },
    { id: 'automotive',   label: '\u{1F697} Automotive',   stocks: [] },
  ],

  // === STATE ===
  _companies: [],          // [{ name, ticker, industry, foundedAt, stocks:[{symbol,name,type,price,vol,basePrice}], mainIdx }]
  _companySlots: 1,        // number of slots unlocked (1–3); founding requires a free slot
  _mainCompanyTicker: null, // ticker of the one company the player has locked as their main
  _allPlayerStocks: {},    // { [symbol]: { ownerUid, ownerName, name, symbol, type, price, history:[], vol, basePrice, companyTicker, companyName, companyStocks, companyMainIdx, companyFoundedAt, companyIndustry } }
  _holdings: {},           // { [symbol]: { shares, avgCost } }
  _playerStockTargets: {}, // { [symbol]: { target, stepsLeft } }
  _playerManiaCooldowns: {},// { [symbol]: timestamp } — prevent mania stacking
  _bankruptCompanies: {},  // { [ticker]: { ticker, name, debtCost, bankruptAt, originalOwnerUid, originalOwnerName, stocks, mainIdx, foundedAt } }
  _companyListings: {},    // { [ticker]: { ticker, name, company, salePrice, ownerUid, ownerName, listedAt } }
  _processedBankrupt: null,// Set<string> of tickers already handled locally
  _scandals: {},           // { [symbol]: { text, ownerUid, firedAt, suppressed } }
  _scandalCooldowns: {},   // { [symbol]: timestamp } — prevent spam
  _sabotageCooldowns: {},  // { [theirUid]: lastSabotageTimestamp }
  _competitors: {},        // { [theirUid]: { name, ticker, setAt } }
  _allies: {},             // { [theirUid]: { name, ticker, setAt } }
  _shareOffers: {},        // { [offerId]: offer } — incoming private share offers
  _peakHolds: {},          // { [sym]: ticksLeft } — plateau counter before hard-cap decay
  _monopolyTriggered: false, // anti-monopoly easter egg in-flight flag
  _stockOffers: {},           // { [targetTicker]: { [offererUid]: offerData } }
  _acquisitionTransfers: {},  // { [transferId]: transferData } — incoming absorbed stocks
  _appliedTransferIds: null,  // Set of already-applied transfer IDs
  _newsOrgs: {},              // { [ownerUid]: { enabled, companyTicker, reputation } }
  _newsPosts: {},             // { [ownerUid]: { [postId]: post } }
  activeTab: 'browse',
  _expandedCo: null,          // cIdx of currently-expanded company card (null = all collapsed)
  _coTab: {},                 // { [cIdx]: 'stocks'|'props'|'upgrades'|'more' }
  _activeSubStock: null,      // { cIdx, sIdx } when drilled into a sub-stock, else null

  // Scandal text templates ('{n}' replaced with company name)
  SCANDAL_EVENTS: [
    '{n} CEO caught embezzling lunch money — investors furious 💰',
    '{n} board meeting revealed to be a D&D campaign 🎲',
    '{n} CFO quit to pursue "vibes-based accounting" 🎯',
    '{n} CEO accidentally livestreamed full board meeting 📱',
    '{n} HQ under investigation for suspicious pizza deliveries 🍕',
    '{n} insider claims CEO is "completely making it up" 🤡',
    '{n} bear spotted in boardroom — unclear if metaphor 🐻',
    '{n} CEO named in rubber duck smuggling operation 🦆',
    '{n} annual report described as "very made up" by former intern 📋',
    '{n} CEO tests positive for performance-enhancing spreadsheets 💊',
    '{n} board used company funds to buy 200 gaming chairs 🪑',
    '{n} financial model revealed to be an astrology chart ♈',
    '{n} CEO spent 40 minutes arguing with a vending machine 🥤',
    '{n} accused of faking revenue with Monopoly money 🎩',
    '{n} "leaked" earnings call just CEO reading Wikipedia out loud 📖',
    '{n} CFO discovered the "ledger" was just a Minecraft chest 🎮',
    '{n} CEO claimed quarterly losses were "a social experiment" 🧪',
    '{n} janitor fired for knowing too much about quarterly earnings 🧹',
  ],

  // === INIT ===
  init() {
    this._loadLocal();
    if (!this._processedBankrupt) this._processedBankrupt = new Set();
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.listenPlayerStocks(data => this._onPlayerStocksUpdate(data));
      Firebase.listenPlayerStockPrices(prices => this._onPriceUpdate(prices));
      Firebase.listenBankruptCompanies(data => this._onBankruptcyUpdate(data));
      Firebase.listenCompanySales(data => { this._companyListings = data || {}; this._triggerRender(); });
      Firebase.listenScandals(data => { this._scandals = data || {}; this._triggerRender(); });
      Firebase.listenStockDeletions(data => this._onStockDeletion(data));
      Firebase.listenCompetitors(data => { this._competitors = data || {}; this._triggerRender(); });
      Firebase.listenAllies(data => { this._allies = data || {}; this._triggerRender(); });
      Firebase.listenAllyNotifications(notif => this._onAllyNotification(notif));
      Firebase.listenSabotageNotifications(notif => this._onSabotageNotification(notif));
      Firebase.listenShareOffers(Firebase.uid, data => {
        this._shareOffers = data || {};
        this._triggerRender();
      });
      Firebase.listenStockOffers(data => {
        this._stockOffers = data || {};
        this._triggerRender();
      });
      if (!this._appliedTransferIds) this._appliedTransferIds = new Set();
      Firebase.listenAcquisitionTransfers(Firebase.uid, data => {
        this._acquisitionTransfers = data || {};
        for (const id in this._acquisitionTransfers) {
          if (!this._appliedTransferIds.has(id)) {
            this._appliedTransferIds.add(id);
            this._applyAcquisitionTransfer(id, this._acquisitionTransfers[id]);
          }
        }
      });
      Firebase.listenNewsOrgs(data => { this._newsOrgs = data || {}; this._triggerRender(); });
      Firebase.listenNewsPosts(data => { this._newsPosts = data || {}; this._triggerRender(); });
      Firebase.listenSaleReceipts(Firebase.uid, receipt => {
        App.addBalance(receipt.amount);
        App.save();
        // Remove the sold company from seller's records so they don't remain ghost owner
        if (receipt.ticker && receipt.type !== 'shares') {
          const idx = this._companies.findIndex(co => co.ticker === receipt.ticker);
          if (idx >= 0) {
            this._companies.splice(idx, 1);
            this._saveLocal();
            this._pushToFirebase();
          }
        }
        const msg = receipt.type === 'shares'
          ? '\u{1F4C8} Shares sold! +' + App.formatMoney(receipt.amount) + (receipt.symbol ? ' for ' + receipt.symbol : '') + ' received.'
          : '\u{1F3E2} Company sold! +' + App.formatMoney(receipt.amount) + ' received.';
        Toast.show(msg, 'var(--green-dark)', 5000);
      });
    }
  },

  _loadLocal() {
    try {
      const raw = localStorage.getItem('retros_companies');
      if (!raw) return;
      const d = JSON.parse(raw);
      // Support new array format and old single-company format
      if (d.companies && Array.isArray(d.companies)) {
        this._companies = d.companies;
      } else if (d.company) {
        this._companies = [d.company]; // migration
      }
      if (d.companySlots) this._companySlots = Math.max(1, d.companySlots);
      if (d.mainCompanyTicker) this._mainCompanyTicker = d.mainCompanyTicker;
      if (d.holdings) this._holdings = d.holdings;
    } catch (e) {}
  },

  _saveLocal() {
    localStorage.setItem('retros_companies', JSON.stringify({
      companies: this._companies,
      companySlots: this._companySlots,
      mainCompanyTicker: this._mainCompanyTicker,
      holdings: this._holdings,
    }));
  },

  getSaveData() {
    return { companies: this._companies, companySlots: this._companySlots, mainCompanyTicker: this._mainCompanyTicker, holdings: this._holdings, sabotageCooldowns: this._sabotageCooldowns };
  },

  loadSaveData(data) {
    if (!data) return;
    if (data.companies && Array.isArray(data.companies)) {
      this._companies = data.companies;
    } else if (data.company) {
      this._companies = [data.company]; // migration
    }
    if (data.companySlots) this._companySlots = Math.max(1, data.companySlots);
    if (data.mainCompanyTicker) this._mainCompanyTicker = data.mainCompanyTicker;
    if (data.holdings) this._holdings = data.holdings;
    if (data.sabotageCooldowns) this._sabotageCooldowns = data.sabotageCooldowns;
    // Immediately persist so a hard-refresh doesn't lose the imported data
    this._saveLocal();
    this._pushToFirebase();
  },

  // === FIREBASE CALLBACKS ===
  _onPlayerStocksUpdate(data) {
    if (!data) { this._allPlayerStocks = {}; return; }
    if (!this._processedBankrupt) this._processedBankrupt = new Set();

    // data: { [uid]: { ownerName, companies:[...] } } (new) or { [uid]: { ownerName, name, ticker, stocks:[...] } } (old)
    const result = {};
    for (const uid in data) {
      const comp = data[uid];
      if (!comp) continue;
      const companyList = comp.companies && Array.isArray(comp.companies)
        ? comp.companies
        : (comp.stocks ? [comp] : []); // old format: comp itself is the company

      companyList.forEach(company => {
        if (!company || !company.stocks) return;
        company.stocks.forEach(s => {
          if (!s || !s.symbol) return;
          const existing = result[s.symbol] || {};
          result[s.symbol] = {
            ownerUid: uid,
            ownerName: comp.ownerName || 'Player',
            name: s.name,
            symbol: s.symbol,
            type: s.type || 'private',
            price: existing.price || s.price || s.basePrice || 100,
            history: existing.history || [],
            vol: s.vol || 0.05,
            basePrice: s.basePrice || s.price || 100,
            foundedAt: company.foundedAt || 0,
            companyTicker: company.ticker,
            companyName: company.name,
            companyStocks: company.stocks,
            companyMainIdx: company.mainIdx || 0,
            companyFoundedAt: company.foundedAt || 0,
            companyUpgrades: company.upgrades || {},
            companyIndustry: s.industry || company.industry || 'tech',
            companyPersonality: company.personality || 'standard',
            companyProperties: Array.isArray(company.properties) ? company.properties : [],
            companyIncomeShare: typeof company.incomeShare === 'number' ? company.incomeShare : 100,
          };
        });
      });
    }

    // Auto-restore own companies + holdings if localStorage was wiped
    if (typeof Firebase !== 'undefined' && Firebase.uid && data[Firebase.uid]) {
      const myComp = data[Firebase.uid];
      if (myComp) {
        if (!this._companies.length && myComp.companies && myComp.companies.length) {
          this._companies = myComp.companies.map(c => ({ ...c }));
          this._companySlots = Math.max(this._companySlots, this._companies.length);
        } else if (!this._companies.length && myComp.stocks && myComp.stocks.length) {
          // old single-company format migration
          this._companies = [{ name: myComp.name, ticker: myComp.ticker, foundedAt: myComp.foundedAt || 0, stocks: myComp.stocks, mainIdx: myComp.mainIdx || 0 }];
        }
        // Restore holdings if local copy is empty but Firebase has them
        if (!Object.keys(this._holdings).length && myComp.holdings) {
          this._holdings = myComp.holdings;
        }
        this._saveLocal();
      }
    }

    this._allPlayerStocks = result;
    this._triggerRender();
  },

  _onPriceUpdate(prices) {
    if (!prices) return;
    for (const sym in prices) {
      if (this._allPlayerStocks[sym]) {
        this._allPlayerStocks[sym].price = prices[sym];
        const hist = this._allPlayerStocks[sym].history;
        hist.push(prices[sym]);
        if (hist.length > 60) hist.shift();
      }
    }
    // Update all local company stock prices
    this._companies.forEach(c => {
      if (!c || !c.stocks) return;
      c.stocks.forEach(s => {
        if (prices[s.symbol] !== undefined) s.price = prices[s.symbol];
      });
    });
    this._triggerRender();
  },

  _onBankruptcyUpdate(data) {
    this._bankruptCompanies = data || {};
    if (!this._processedBankrupt) this._processedBankrupt = new Set();

    // Check if any of MY companies appear as bankrupt
    let needsSave = false;
    const myBankrupt = this._companies.filter(
      c => this._bankruptCompanies[c.ticker] && !this._processedBankrupt.has(c.ticker)
    );
    myBankrupt.forEach(c => {
      this._processedBankrupt.add(c.ticker);
      const idx = this._companies.findIndex(co => co.ticker === c.ticker);
      if (idx >= 0) {
        this._companies.splice(idx, 1);
        needsSave = true;
        Toast.show('\u{1F534} ' + c.ticker + ' went bankrupt! Pay the debt to recover it.', '#c0392b', 6000);
      }
    });
    if (needsSave) { this._saveLocal(); this._pushToFirebase(); }
    this._triggerRender();
    this._cleanupExpiredBankruptcies();
  },

  _cleanupExpiredBankruptcies() {
    const now = Date.now();
    for (const ticker in this._bankruptCompanies) {
      if (now - (this._bankruptCompanies[ticker].bankruptAt || 0) > 24 * 3600000) {
        if (typeof Firebase !== 'undefined') Firebase.bailOutCompany(ticker);
      }
    }
  },

  // Re-render wherever company UI is shown
  _triggerRender() {
    const inStocks = App.currentScreen === 'stocks' && typeof Stocks !== 'undefined' &&
      (Stocks.activeTab === 'players' || Stocks.activeTab === 'company' || Stocks.activeTab === 'market');
    // Don't wipe the company form while user is typing in an input/textarea
    const focusedEl = document.activeElement;
    const userTyping = focusedEl && (focusedEl.tagName === 'INPUT' || focusedEl.tagName === 'TEXTAREA' || focusedEl.tagName === 'SELECT');
    if (inStocks && !userTyping) Stocks.render();
    else if (App.currentScreen === 'companies' && !userTyping) this.render();
    if (typeof Stocks !== 'undefined') Stocks.updateTicker();
    // Keep admin market tab live while it's open
    if (typeof Admin !== 'undefined' && Admin.adminMode && Admin.activeTab === 'market') {
      Admin.renderPlayerStockControls();
    }
  },

  // === TICK (called by Stocks.tick if authority) ===
  tickPrices() {
    if (!this._allPlayerStocks || !Object.keys(this._allPlayerStocks).length) return;
    const updates = {};
    for (const sym in this._allPlayerStocks) {
      const s = this._allPlayerStocks[sym];
      if (s._bankruptDeclared) continue;
      const upg = s.companyUpgrades || {};
      const t = this._playerStockTargets[sym];

      // Forced crash — admin command: heavy downward pressure until bankruptcy triggers
      if (s._forceBankrupt && !s._bankruptDeclared) {
        const drop = 0.40 + Math.random() * 0.15; // -40% to -55% per tick
        s.price = Math.max(0.005, s.price * (1 - drop));
        updates[sym] = s.price;
        // Fall through to normal bankruptcy check below
      } else if (t && t.stepsLeft > 0) {
        // Admin / trade-influence gradual target
        s.price = Math.max(0.01, s.price + (t.target - s.price) / t.stepsLeft);
        t.stepsLeft--;
        if (t.stepsLeft <= 0 && (!t.holdUntil || Date.now() >= t.holdUntil)) {
          delete this._playerStockTargets[sym];
        }
        // If admin is pushing price above $1, cancel any active forced bankruptcy
        if (t.isAdminSet && t.target > 1 && s._forceBankrupt) {
          s._forceBankrupt = false;
          s._lowTicks = 0;
        }
      } else if (t && t.holdUntil && Date.now() < t.holdUntil) {
        // Hold phase: price stays near admin-set target with tiny wobble
        s.price = Math.max(0.01, t.target * (1 + (Math.random() - 0.5) * 0.04));
      } else {
        if (t) delete this._playerStockTargets[sym]; // clean up expired
        const personality = s.companyPersonality || 'standard';
        const effectiveBase = this._getEffectiveBase(s);
        const vol = s.vol || 0.05;
        const ratio = s.price / effectiveBase;

        // Hard cap scales with bull propaganda level (see _getHardCap)
        const hardCap = this._getHardCap(s);

        // --- Hard price cap: plateau then gradual decay ---
        // Stock holds near the cap for ~20 ticks (~40s), then decays over 50 ticks (~100s)
        if (s.price > hardCap || this._peakHolds[sym] !== undefined) {
          const holdLeft = this._peakHolds[sym];
          if (holdLeft === undefined) {
            // First cap hit: plateau length scales with overshoot (admin $1M holds longer near peak)
            const overshoot = Math.max(1, s.price / hardCap);
            this._peakHolds[sym] = Math.min(80, Math.round(20 * Math.log10(overshoot + 1) + 20));
            this._playerManiaCooldowns[sym] = Date.now();
          }
          if ((this._peakHolds[sym] || 0) > 0) {
            // Holding near cap: gentle wobble, keep price in [85%–102%] of hardCap
            this._peakHolds[sym]--;
            const w = s.price * (Math.random() - 0.5) * 2 * vol * 0.25;
            s.price = Math.max(hardCap * 0.85, Math.min(hardCap * 1.02, s.price + w));
          } else {
            // Plateau expired: decay back toward $150 (effectiveBase*1.5)
            // Decay speed scales with how far above cap the stock is — admin-set $1M declines slowly
            delete this._peakHolds[sym];
            const decayTarget = effectiveBase * 1.5;
            const overshootRatio = s.price / hardCap; // 1x = at cap, 10x = 10× above cap
            const decaySteps = Math.min(300, Math.max(80, Math.round(overshootRatio * 25)));
            this._playerStockTargets[sym] = { target: decayTarget, stepsLeft: decaySteps };
            this._playerManiaCooldowns[sym] = Date.now();
            s.price = Math.max(0.01, s.price + s.price * (Math.random() - 0.5) * 2 * vol);
          }
          const resLv2 = upg.resilience || 0;
          if (resLv2 > 0) { const fl = effectiveBase * 0.05 * resLv2; if (s.price < fl) s.price = fl; }
          updates[sym] = s.price;
          continue;
        }

        // Standard random walk
        let delta = s.price * (Math.random() - 0.5) * 2 * vol;

        // --- VOLATILE ENGINE upgrade: rolling dice for outsized moves ---
        const volLv = upg.volatility || 0;
        if (volLv > 0) {
          const chancePct = 0.10 + volLv * 0.08; // lv1=18% … lv5=50%
          if (Math.random() < chancePct) {
            const swingMult = 1 + volLv * 0.4;   // lv1=1.4x … lv5=3x
            const upBias = 0.50 + volLv * 0.03;  // lv1=53% … lv5=65% up
            const dir = Math.random() < upBias ? 1 : -1;
            delta = s.price * dir * vol * swingMult;
          }
        }

        // --- BULL PROPAGANDA upgrade: upward drift each tick ---
        const bullLv = upg.bullBias || 0;
        if (bullLv > 0 && personality !== 'penny') delta += s.price * bullLv * 0.001;

        // --- Mania event: spikes toward a random slice of the hard cap ---
        // Bull Propaganda raises the cap AND makes mania more frequent
        const maniaCooldownOk = (Date.now() - (this._playerManiaCooldowns[sym] || 0)) > 120000;
        const baseMania = personality === 'extreme' ? 0.006 : 0.002;
        const maniaChance = Math.min(0.015, baseMania + bullLv * 0.002); // +0.2%/level, max 1.5%
        // Penny stocks: skip mania above $80 (let vol do the work near cap)
        const maniaAllowed = personality !== 'penny' || s.price < 80;
        if (maniaCooldownOk && maniaAllowed && Math.random() < maniaChance) {
          // Target a random 20–90% of the hard cap — high bull = huge potential spike
          const maniaTarget = personality === 'penny'
            ? Math.min(s.price * (1.5 + Math.random()), 95)
            : Math.max(s.price * 1.1, hardCap * (0.20 + Math.random() * 0.70));
          this._playerStockTargets[sym] = { target: Math.min(maniaTarget, hardCap * 0.95), stepsLeft: 30, isMania: true };
          this._playerManiaCooldowns[sym] = Date.now();
          const pctUp = Math.round((maniaTarget / s.price - 1) * 100);
          const msg = '\u{1F680} MANIA: ' + sym + ' (\u200B' + (s.companyName || '') + ') \u2014 buying frenzy! +' + pctUp + '%!';
          // Global mania news cooldown: don't push more than 1 mania news per 20s across all player stocks
          if (Date.now() - (this._lastManiaPush || 0) > 20000) {
            this._lastManiaPush = Date.now();
            if (typeof Stocks !== 'undefined') Stocks._addNews(msg, true);
            if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushStockNews(msg, true);
          }
        }

        // --- Mean reversion toward effectiveBase ---
        // Penny: very gentle (revMult 0.15) — stocks drift but don't snap back hard
        // Extreme: weak (revMult 0.5) — more free-floating
        // Standard: full strength
        // Mean reversion: gentle pull toward $100 base; stocks naturally wander but
        // extreme over-extension gets progressively corrected
        const revMult = personality === 'penny' ? 0.15 : personality === 'extreme' ? 0.6 : 1.0;
        const revStr = ratio > 10 ? 0.040 * revMult
          : ratio > 7 ? 0.018 * revMult
          : ratio > 5 ? 0.008 * revMult
          : ratio > 3 ? 0.003 * revMult
          : ratio > 2 ? 0.001 * revMult
          : 0.0003 * revMult;
        delta -= s.price * (ratio - 1) * revStr;

        // --- High-price crash risk (disabled for penny — cap handles it) ---
        if (personality !== 'penny' && ratio > 2.5) {
          const crashChance = Math.min(0.20, (ratio - 2.5) * 0.025);
          if (Math.random() < crashChance) {
            const snapPct = ratio > 5 ? 0.15 + Math.random() * 0.25 : 0.08 + Math.random() * 0.12;
            delta -= s.price * snapPct;
          }
        }

        s.price = Math.max(0.01, s.price + delta);

        // --- MARKET RESILIENCE upgrade: price floor ---
        const resLv = upg.resilience || 0;
        if (resLv > 0) {
          const floor = effectiveBase * 0.05 * resLv;
          if (s.price < floor) s.price = floor;
        }
      }

      updates[sym] = s.price;

      // Bankruptcy check — only stock authority triggers this
      if (typeof Firebase !== 'undefined' && Firebase._isStockAuthority) {
        if (s.price < 0.10) {
          s._lowTicks = (s._lowTicks || 0) + 1;
        } else {
          s._lowTicks = 0;
        }
        if ((s._lowTicks || 0) >= 5) this._declareBankruptcy(sym);
      }
    }

    // === PROPERTY REINVEST → PLAYER STOCK MICRO-BOOST (authority only) ===
    if (typeof Firebase !== 'undefined' && Firebase._isStockAuthority) {
      for (const sym in this._allPlayerStocks) {
        const s = this._allPlayerStocks[sym];
        if (s._bankruptDeclared) continue;
        const props = s.companyProperties;
        if (!props || !props.length) continue;
        const ind = s.companyIndustry || 'tech';
        const defs = this.COMPANY_PROPERTIES[ind] || [];
        let rawIncome = 0;
        defs.forEach(def => { if (props.includes(def.key)) rawIncome += def.income; });
        if (rawIncome <= 0) continue;
        const worldMult = this._getWorldPriceMult(ind);
        const reinvestPct = (100 - (typeof s.companyIncomeShare === 'number' ? s.companyIncomeShare : 100)) / 100;
        const reinvestedIncome = rawIncome * worldMult * reinvestPct;
        if (reinvestedIncome <= 0) continue;
        // Property reinvest: micro boost capped at 0.05%/tick regardless of income
        // (was 0.00001 per dollar — caused $419K prices at max properties)
        const boostPct = Math.min(0.0005, reinvestedIncome * 0.000000007);
        s.price = Math.max(0.01, s.price * (1 + boostPct));
        updates[sym] = s.price;
      }
    }

    if (typeof Firebase !== 'undefined' && Firebase.isOnline() && Firebase._isStockAuthority) {
      Firebase.pushPlayerStockPrices(updates);
      // Scandal trigger — authority fires at most once per stock per 5 min, public stocks only
      for (const sym in this._allPlayerStocks) {
        const s = this._allPlayerStocks[sym];
        if (s.type !== 'public' || s._bankruptDeclared) continue;
        const existing = this._scandals[sym];
        if (existing && !existing.suppressed && Date.now() - (existing.firedAt || 0) < 120000) continue;
        if (Date.now() - (this._scandalCooldowns[sym] || 0) < 300000) continue;
        if (Math.random() < 0.002) this._triggerScandal(sym, s);
      }
    }

    // === INDUSTRY → SYSTEM STOCK INFLUENCE ===
    // Player company activity gently nudges linked system stocks.
    // Nudge is proportional to ratio deviation from base; capped at ±0.3%/tick.
    if (typeof Stocks !== 'undefined') {
      for (const sym in this._allPlayerStocks) {
        const s = this._allPlayerStocks[sym];
        if (s._bankruptDeclared) continue;
        const ind = this.INDUSTRIES.find(i => i.id === (s.companyIndustry || 'tech'));
        if (!ind || !ind.stocks.length) continue;
        const ratio = s.price / (s.basePrice || 100);
        // Only nudge when the stock is meaningfully above/below base; cap nudge at ±0.3%
        const raw = (ratio - 1) * 0.015;
        const nudgePct = Math.max(-0.003, Math.min(0.003, raw));
        if (Math.abs(nudgePct) < 0.0005) continue;
        ind.stocks.forEach(stockSym => {
          const idx = Stocks.stocks.findIndex(st => st.symbol === stockSym);
          if (idx < 0) return;
          const base = Stocks.stocks[idx].basePrice;
          // Don't push the system stock above 8× its base via industry nudges alone
          const sysRatio = Stocks.prices[idx] / base;
          if (nudgePct > 0 && sysRatio > 8) return;
          Stocks.prices[idx] = Math.max(1, Stocks.prices[idx] * (1 + nudgePct));
        });
      }
    }
  },

  // === ADMIN COMMAND ===
  applyAdminCommand(cmd) {
    if (!cmd || !cmd.type) return;
    switch (cmd.type) {
      case 'adjust': {
        const sAdj = this._allPlayerStocks[cmd.sym];
        if (sAdj) {
          const adjTarget = Math.max(0.01, sAdj.price * cmd.mult);
          const adjRatio = adjTarget / Math.max(1, sAdj.price);
          // Scale steps with size of move: small nudge=15, huge jump=up to 100
          const adjSteps = Math.min(100, Math.max(15, Math.round(Math.log10(Math.max(1.01, adjRatio)) * 40)));
          this._playerStockTargets[cmd.sym] = { target: adjTarget, stepsLeft: adjSteps, isAdminSet: true, holdUntil: Date.now() + 50000 };
          // Cancel forced bankruptcy if price is being raised back above $1
          if (adjTarget > 1 && sAdj._forceBankrupt) {
            sAdj._forceBankrupt = false;
            sAdj._lowTicks = 0;
          }
        }
        break;
      }
      case 'set': {
        const sSet = this._allPlayerStocks[cmd.sym];
        if (sSet) {
          const setTarget = Math.max(0.01, cmd.target);
          const setRatio = setTarget / Math.max(1, sSet.price);
          // Gradual incline: log-scaled steps so $1M doesn't arrive in 30s
          const setSteps = Math.min(150, Math.max(20, Math.round(Math.log10(Math.max(1.01, setRatio)) * 45)));
          this._playerStockTargets[cmd.sym] = { target: setTarget, stepsLeft: setSteps, isAdminSet: true, holdUntil: Date.now() + 50000 };
          // Cancel forced bankruptcy if price is being raised back above $1
          if (setTarget > 1 && sSet._forceBankrupt) {
            sSet._forceBankrupt = false;
            sSet._lowTicks = 0;
          }
        }
        break;
      }
      case 'crash':
        for (const sym in this._allPlayerStocks)
          this._playerStockTargets[sym] = { target: Math.max(0.01, this._allPlayerStocks[sym].price * 0.5), stepsLeft: 20, holdUntil: Date.now() + 50000 };
        break;
      case 'boom':
        for (const sym in this._allPlayerStocks) {
          const sB = this._allPlayerStocks[sym];
          this._playerStockTargets[sym] = { target: sB.price * 2, stepsLeft: 20, holdUntil: Date.now() + 50000 };
          // Boom bails out all stocks from forced bankruptcy
          if (sB._forceBankrupt) { sB._forceBankrupt = false; sB._lowTicks = 0; }
        }
        break;
      case 'personality': {
        // Update in-memory _allPlayerStocks for all stocks in this company
        for (const sym in this._allPlayerStocks) {
          const s = this._allPlayerStocks[sym];
          if (s.companyTicker === cmd.ticker && s.ownerUid === cmd.ownerUid) {
            s.companyPersonality = cmd.personality;
            s.vol = cmd.vol;
            if (cmd.basePrice) s.basePrice = cmd.basePrice;
          }
        }
        // If this is the owner's client, also update _companies so _pushToFirebase doesn't revert the change
        if (typeof Firebase !== 'undefined' && Firebase.uid === cmd.ownerUid) {
          this._companies.forEach(c => {
            if (c.ticker !== cmd.ticker) return;
            c.personality = cmd.personality;
            (c.stocks || []).forEach(s => {
              s.vol = cmd.vol;
              if (cmd.basePrice) s.basePrice = cmd.basePrice;
            });
          });
          this._saveLocal();
        }
        break;
      }
      case 'forceBankrupt': {
        // Gradual crash — set flag so tickPrices drives price down until bankruptcy fires naturally
        const fSym = cmd.sym;
        if (fSym && this._allPlayerStocks[fSym]) {
          const compTicker = this._allPlayerStocks[fSym].companyTicker;
          for (const sym in this._allPlayerStocks) {
            const s = this._allPlayerStocks[sym];
            if (s.companyTicker === compTicker && !s._bankruptDeclared) {
              s._forceBankrupt = true;
            }
          }
        }
        break;
      }
      case 'resetAll': {
        const resets = {};
        for (const sym in this._allPlayerStocks) {
          const s = this._allPlayerStocks[sym];
          const base = 100; // Always reset to natural base ($100); bull propaganda only affects cap
          s.price = base;
          s.history = [];
          for (let j = 0; j < 60; j++) s.history.push(base);
          delete this._playerStockTargets[sym];
          delete this._peakHolds[sym];
          delete s._lowTicks;
          delete s._bankruptDeclared;
          resets[sym] = base;
        }
        // Authority pushes the reset prices to Firebase
        if (typeof Firebase !== 'undefined' && Firebase.isOnline() && Firebase._isStockAuthority) {
          Firebase.pushPlayerStockPrices(resets);
        }
        break;
      }
    }
  },

  // === BANKRUPTCY ===
  _declareBankruptcy(sym) {
    const s = this._allPlayerStocks[sym];
    if (!s || s._bankruptDeclared) return;

    const ownerUid = s.ownerUid;
    const ticker = s.companyTicker || sym;

    // If this stock's company is the owner's locked main company, block full bankruptcy
    if (typeof Firebase !== 'undefined' && Firebase.uid === ownerUid && this.isMainCompany(ticker)) {
      s._bankruptDeclared = false; // allow it to recover
      s._lowTicks = 0;
      Toast.show('⭐ ' + ticker + ' is your main company — bankruptcy blocked!', '#f39c12', 4000);
      return;
    }

    s._bankruptDeclared = true;
    const debtCost = Math.max(5000, Math.round((s.basePrice || 100) * 50));
    const companyData = {
      name: s.companyName || s.name,
      ticker,
      stocks: s.companyStocks || [{ symbol: sym, name: s.name, type: s.type, price: s.price, basePrice: s.basePrice, vol: s.vol }],
      mainIdx: s.companyMainIdx || 0,
      foundedAt: s.companyFoundedAt || 0,
    };
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.declareBankruptcy(ticker, companyData, debtCost, ownerUid, s.ownerName);
    }
  },

  // Bail out OR acquire a bankrupt company — no slot limit check (always allowed)
  bailOut(ticker) {
    const b = this._bankruptCompanies[ticker];
    if (!b) return;
    if (this._companies.length >= this.MAX_COMPANIES_HARD) {
      alert('You have reached the absolute company limit (' + this.MAX_COMPANIES_HARD + ').');
      return;
    }
    const isOwner = typeof Firebase !== 'undefined' && Firebase.uid === b.originalOwnerUid;
    const label = isOwner ? 'Bail Out & Reclaim' : 'Acquire Company';
    if (!confirm(label + ': ' + this._esc(b.name || ticker) + ' for ' + App.formatMoney(b.debtCost) + '?')) return;
    if (App.balance < b.debtCost) { alert('Not enough funds.'); return; }
    App.addBalance(-b.debtCost);

    const company = {
      name: b.name || ticker,
      ticker,
      ownerName: typeof Settings !== 'undefined' ? Settings.profile.name : 'Player',
      foundedAt: b.foundedAt || 0,
      stocks: b.stocks || [{ symbol: ticker, name: (b.name || ticker) + ' Stock', type: 'private', price: 1, vol: 0.05, basePrice: b.stocks?.[0]?.basePrice || 100 }],
      mainIdx: b.mainIdx || 0,
    };

    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      // Atomically claim the bankruptcy record — if someone else already got it, abort
      Firebase.bailOutCompany(ticker).then(claimed => {
        if (!claimed) {
          App.addBalance(b.debtCost); // Refund
          Toast.show('\u26A0\uFE0F Already acquired by another player!', '#c0392b', 4000);
          return;
        }
        if (this._processedBankrupt) this._processedBankrupt.delete(ticker);
        this._companies.push(company);
        this._saveLocal();
        this._pushToFirebase();
        App.save();
        this._triggerRender();
        this._checkMonopolyThreshold();
      });
    } else {
      // Offline fallback
      if (this._processedBankrupt) this._processedBankrupt.delete(ticker);
      this._companies.push(company);
      this._saveLocal();
      App.save();
      this._triggerRender();
      this._checkMonopolyThreshold();
    }
  },

  // === SCANDALS ===
  _triggerScandal(sym, s) {
    const tpl = this.SCANDAL_EVENTS[Math.floor(Math.random() * this.SCANDAL_EVENTS.length)];
    const text = tpl.replace('{n}', s.companyName || sym);
    const drop = 0.15 + Math.random() * 0.15; // 15–30% price drop
    this._playerStockTargets[sym] = { target: Math.max(0.01, s.price * (1 - drop)), stepsLeft: 8 };
    this._scandalCooldowns[sym] = Date.now();
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.pushScandal(sym, text, s.ownerUid);
      Firebase.pushStockNews('\u{1F4F0} SCANDAL: ' + text, false);
    }
  },

  suppressScandal(sym) {
    const scandal = this._scandals[sym];
    if (!scandal) return;
    const s = this._allPlayerStocks[sym];
    const cost = Math.max(100_000, Math.round((s ? s.basePrice || 100 : 100) * 1000));
    if (!confirm('Suppress this scandal for ' + App.formatMoney(cost) + '?')) return;
    if (App.balance < cost) { alert('Not enough funds. Need ' + App.formatMoney(cost)); return; }
    App.addBalance(-cost);
    App.save();
    if (typeof Firebase !== 'undefined') Firebase.suppressScandal(sym);
    this._toast('\u{1F910} Scandal suppressed.');
  },

  // === REMOVE INDIVIDUAL STOCK ===
  removeStock(cIdx, sIdx) {
    const c = this._companies[cIdx];
    if (!c || !c.stocks[sIdx]) return;
    if (c.stocks.length <= 1) { alert("Can't remove your only stock. Delete the whole company instead."); return; }
    const s = c.stocks[sIdx];
    const priceStr = App.formatMoney(s.price || 0);
    const refund = confirm('Refund shareholders ' + priceStr + '/share?\n\nOK = pay all current holders at market price\nCancel = delete with no refund');
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.pushStockDeletion(s.symbol, refund ? (s.price || 0) : 0, refund);
    }
    c.stocks.splice(sIdx, 1);
    if ((c.mainIdx || 0) >= c.stocks.length) c.mainIdx = 0;
    this._saveLocal();
    this._pushToFirebase();
    if (typeof Firebase !== 'undefined') Firebase.removePlayerStockPrices([s.symbol]);
    this._triggerRender();
  },

  _onStockDeletion(data) {
    if (!data || !data.symbol) return;
    const sym = data.symbol;
    const h = this._holdings[sym];
    if (!h || h.shares <= 0) return;
    if (data.refund && data.pricePerShare > 0) {
      const total = Math.round(h.shares * data.pricePerShare * 100) / 100;
      App.addBalance(total);
      App.save();
      this._toast('\u{1F4CB} ' + sym + ' delisted \u2014 refund +' + App.formatMoney(total));
    } else {
      this._toast('\u{1F4CB} ' + sym + ' delisted by owner. No refund issued.');
    }
    delete this._holdings[sym];
    this._saveLocal();
  },

  // === COMPETITOR / SABOTAGE ===
  toggleCompetitor(theirUid, theirName, theirTicker) {
    if (this._competitors[theirUid]) {
      delete this._competitors[theirUid];
      if (typeof Firebase !== 'undefined') Firebase.removeCompetitor(theirUid);
      this._toast('\u274C Removed competitor: ' + this._esc(theirName));
    } else {
      // Mutually exclusive with ally
      if (this._allies[theirUid]) {
        delete this._allies[theirUid];
        if (typeof Firebase !== 'undefined') Firebase.removeAlly(theirUid);
      }
      const entry = { name: theirName, ticker: theirTicker, setAt: Date.now() };
      this._competitors[theirUid] = entry;
      if (typeof Firebase !== 'undefined') Firebase.pushCompetitor(theirUid, entry);
      this._toast('\u{1F3AF} Marked as competitor: ' + this._esc(theirName));
    }
    this._triggerRender();
  },

  toggleAlly(theirUid, theirName, theirTicker) {
    if (this._allies[theirUid]) {
      delete this._allies[theirUid];
      if (typeof Firebase !== 'undefined') Firebase.removeAlly(theirUid);
      this._toast('\u274C Removed ally: ' + this._esc(theirName));
    } else {
      // Mutually exclusive with competitor
      if (this._competitors[theirUid]) {
        delete this._competitors[theirUid];
        if (typeof Firebase !== 'undefined') Firebase.removeCompetitor(theirUid);
      }
      const entry = { name: theirName, ticker: theirTicker, setAt: Date.now() };
      this._allies[theirUid] = entry;
      if (typeof Firebase !== 'undefined') Firebase.pushAlly(theirUid, entry);
      this._toast('\u{1F91D} Allied with: ' + this._esc(theirName));
    }
    this._triggerRender();
  },

  allyBoostCost(theirUid) {
    let maxPrice = 100;
    for (const sym in this._allPlayerStocks) {
      const s = this._allPlayerStocks[sym];
      if (s.ownerUid === theirUid && s.type === 'public') maxPrice = Math.max(maxPrice, s.price || 100);
    }
    return Math.max(100_000, Math.round(maxPrice * 100));
  },

  boostAlly(theirUid) {
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    if (!myUid || theirUid === myUid) { alert("Can't boost yourself."); return; }
    const ally = this._allies[theirUid];
    if (!ally) return;
    const cost = this.allyBoostCost(theirUid);
    if (App.balance < cost) { alert('Not enough funds. Need ' + App.formatMoney(cost)); return; }
    if (!confirm('Boost ' + this._esc(ally.name || ally.ticker) + "'s stocks for " + App.formatMoney(cost) + '?\n\nTheir public stocks get a +10\u201320% price push.')) return;
    App.addBalance(-cost);
    App.save();
    const myName = typeof Settings !== 'undefined' ? Settings.profile.name : 'Ally';
    const targetSymbols = Object.keys(this._allPlayerStocks)
      .filter(sym => this._allPlayerStocks[sym].ownerUid === theirUid && this._allPlayerStocks[sym].type === 'public');
    targetSymbols.forEach(sym => {
      const s = this._allPlayerStocks[sym];
      const boost = 0.10 + Math.random() * 0.10;
      this._playerStockTargets[sym] = { target: s.price * (1 + boost), stepsLeft: 10 };
      if (typeof Firebase !== 'undefined') {
        Firebase.pushTradeInfluence(sym, 1, boost);
        Firebase.pushStockNews('\u{1F91D} ALLY BOOST: ' + (s.companyName || sym) + ' \u2014 allied support buying!', true);
      }
    });
    if (typeof Firebase !== 'undefined') Firebase.pushAllyNotification(theirUid, myName, ally.ticker || '');
    this._toast('\u2705 Boosted ' + this._esc(ally.ticker || ally.name) + "'s stocks!");
    this._triggerRender();
  },

  _onAllyNotification(notif) {
    Toast.show('\u{1F91D} ' + this._esc(notif.fromName || 'An ally') + ' boosted your company stocks!', '#27ae60', 7000);
  },

  sabotageCost(theirUid) {
    let maxPrice = 100;
    for (const sym in this._allPlayerStocks) {
      const s = this._allPlayerStocks[sym];
      if (s.ownerUid === theirUid && s.type === 'public') maxPrice = Math.max(maxPrice, s.price || 100);
    }
    return Math.max(500_000, Math.round(maxPrice * 200));
  },

  sabotage(theirUid) {
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    if (!myUid || theirUid === myUid) { alert("Can't sabotage yourself."); return; }
    const comp = this._competitors[theirUid];
    if (!comp) return;
    const cdMs = 10 * 60 * 1000; // 10 minutes
    const lastHit = this._sabotageCooldowns[theirUid] || 0;
    const remaining = cdMs - (Date.now() - lastHit);
    if (remaining > 0) {
      const mins = Math.ceil(remaining / 60000);
      alert('Sabotage on cooldown. Try again in ' + mins + ' min.');
      return;
    }
    const cost = this.sabotageCost(theirUid);
    if (App.balance < cost) { alert('Not enough funds. Need ' + App.formatMoney(cost)); return; }
    if (!confirm('Sabotage ' + this._esc(comp.name || comp.ticker) + ' for ' + App.formatMoney(cost) + '?\n\n65% success: their stock crashes\n35% fail: your stock drops + they get a warning')) return;
    App.addBalance(-cost);
    App.save();

    const success = Math.random() < 0.65;
    const myName = typeof Settings !== 'undefined' ? Settings.profile.name : 'Rival';

    if (success) {
      // Crash their public stocks
      const targetSymbols = Object.keys(this._allPlayerStocks)
        .filter(sym => this._allPlayerStocks[sym].ownerUid === theirUid && this._allPlayerStocks[sym].type === 'public');
      targetSymbols.forEach(sym => {
        const s = this._allPlayerStocks[sym];
        const drop = 0.20 + Math.random() * 0.20;
        this._playerStockTargets[sym] = { target: Math.max(0.01, s.price * (1 - drop)), stepsLeft: 10 };
        if (typeof Firebase !== 'undefined') {
          Firebase.pushTradeInfluence(sym, -1, drop);
          Firebase.pushStockNews('\u{1F3AF} SABOTAGE: ' + (s.companyName || sym) + ' \u2014 hostile attack! Stock in freefall!', false);
        }
      });
      if (typeof Firebase !== 'undefined') Firebase.pushSabotageNotification(theirUid, myName, true, comp.ticker || '');
      this._toast('\u2705 Sabotage landed! ' + this._esc(comp.ticker || '') + ' stock is crashing.');
    } else {
      // Backfire: your own main stock drops
      if (this._companies.length > 0) {
        const myMain = this._companies[0];
        const myMainSym = myMain.stocks && myMain.stocks[myMain.mainIdx || 0] ? myMain.stocks[myMain.mainIdx || 0].symbol : null;
        if (myMainSym && this._allPlayerStocks[myMainSym]) {
          const myS = this._allPlayerStocks[myMainSym];
          const backfire = 0.10 + Math.random() * 0.10;
          this._playerStockTargets[myMainSym] = { target: Math.max(0.01, myS.price * (1 - backfire)), stepsLeft: 8 };
          if (typeof Firebase !== 'undefined') Firebase.pushTradeInfluence(myMainSym, -1, backfire);
        }
      }
      if (typeof Firebase !== 'undefined') Firebase.pushSabotageNotification(theirUid, myName, false, comp.ticker || '');
      this._toast('\u274C Sabotage backfired! Your own stock took damage.');
    }
    this._sabotageCooldowns[theirUid] = Date.now();
    this._triggerRender();
  },

  _onSabotageNotification(notif) {
    if (notif.success) {
      Toast.show('\u26A0\uFE0F ' + this._esc(notif.fromName || 'Someone') + ' successfully sabotaged your company!', '#c0392b', 7000);
    } else {
      Toast.show('\u{1F6E1} Sabotage attempt by ' + this._esc(notif.fromName || 'Someone') + ' failed \u2014 they paid the price.', '#f39c12', 7000);
    }
  },

  // === DELETE COMPANY ===
  deleteCompany(cIdx) {
    const c = this._companies[cIdx];
    if (!c) return;
    if (!confirm(`Delete "${c.name}" (${c.ticker})? This permanently removes the company and all its stocks.`)) return;
    // Clean up Firebase: cancel sale listing + remove stock price entries
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.cancelCompanySale(c.ticker);
      const symbols = (c.stocks || []).map(s => s.symbol);
      if (symbols.length) Firebase.removePlayerStockPrices(symbols);
    }
    this._companies.splice(cIdx, 1);
    this._saveLocal();
    this._pushToFirebase();
    this._triggerRender();
  },

  setMainCompany(cIdx) {
    const c = this._companies[cIdx];
    if (!c) return;
    if (this._mainCompanyTicker === c.ticker) {
      // Toggle off
      this._mainCompanyTicker = null;
    } else {
      this._mainCompanyTicker = c.ticker;
    }
    this._saveLocal();
    this._triggerRender();
  },

  isMainCompany(ticker) {
    return this._mainCompanyTicker === ticker;
  },

  // === FOUND COMPANY ===
  foundCompany() {
    if (this._companies.length >= this._companySlots) {
      if (this._companySlots >= 3) {
        alert('Upgrade slots are maxed out. You can still acquire bankrupt companies or buy listed ones.');
      } else {
        alert('Upgrade your company slot first!');
      }
      return;
    }
    const nameEl = document.getElementById('co-found-name');
    const tickerEl = document.getElementById('co-found-ticker');
    const industryEl = document.getElementById('co-found-industry');
    if (!nameEl || !tickerEl) return;
    const name = nameEl.value.trim();
    const ticker = tickerEl.value.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
    const industry = industryEl ? industryEl.value : 'tech';
    // Personality is randomly rolled at founding — 60% standard, 25% extreme, 15% penny
    const _roll = Math.random();
    const personality = _roll < 0.15 ? 'penny' : _roll < 0.40 ? 'extreme' : 'standard';
    const pd = this.PERSONALITY_DEFAULTS[personality] || this.PERSONALITY_DEFAULTS.standard;
    if (!name) { alert('Enter a company name.'); return; }
    if (!ticker || ticker.length < 2) { alert('Enter a ticker (2-5 letters).'); return; }
    if (App.balance < this.FOUND_COST) { alert('Not enough funds. You need ' + App.formatMoney(this.FOUND_COST)); return; }

    const allTickers = new Set([
      ...(typeof Stocks !== 'undefined' ? Stocks.stocks.map(s => s.symbol) : []),
      ...Object.keys(this._allPlayerStocks),
      ...Object.keys(this._bankruptCompanies), // reserved until bankruptcy expires
    ]);
    if (allTickers.has(ticker)) { alert('Ticker "' + ticker + '" is already taken.'); return; }
    // Prevent duplicate company names (case-insensitive)
    const allNames = new Set(
      Object.values(this._allPlayerStocks).map(s => (s.companyName || '').toLowerCase())
    );
    if (allNames.has(name.toLowerCase())) { alert('A company named "' + name + '" already exists.'); return; }

    App.balance -= this.FOUND_COST;
    App.updateBalance();

    const newCompany = {
      name,
      ticker,
      industry,
      personality,
      ownerName: typeof Settings !== 'undefined' ? Settings.profile.name : 'Player',
      foundedAt: Date.now(),
      stocks: [{ symbol: ticker, name: name + ' Stock', type: 'private',
        price: pd.basePrice, vol: pd.vol, basePrice: pd.basePrice }],
      mainIdx: 0,
      upgrades: {},
    };
    this._companies.push(newCompany);
    this._saveLocal();
    this._pushToFirebase();
    // Reveal the personality roll
    const _pInfo = {
      standard: { color: 'var(--green-dark)', msg: '\u{1F4CA} Standard Stock! Balanced growth \u2014 Bull Propaganda will raise your base price over time.' },
      extreme:  { color: '#8e44ad',           msg: '\u{1F30B} Extreme Stock! Wild swings, 3\u00D7 mania chance, higher cap. High risk, high reward!' },
      penny:    { color: '#2980b9',            msg: '\u{1FA99} Penny Stock! Starts at $0.50 \u2014 hard cap $100. Cheap to buy, explosive upside.' },
    };
    const _pi = _pInfo[personality];
    Toast.show(_pi.msg, _pi.color, 7000);
    this.render();
    this._checkMonopolyThreshold();
  },

  addStock(cIdx) {
    const c = this._companies[cIdx];
    if (!c) return;
    const count = c.stocks.length;
    if (count >= this.MAX_STOCKS) { alert('Maximum 3 stocks per company.'); return; }
    const cost = count === 1 ? this.STOCK2_COST : this.STOCK3_COST;
    if (App.balance < cost) { alert('Need ' + App.formatMoney(cost) + ' to add another stock.'); return; }

    const sym = prompt('New stock ticker (2-5 letters):')?.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
    if (!sym || sym.length < 2) { alert('Invalid ticker.'); return; }

    const allTickers = new Set([
      ...(typeof Stocks !== 'undefined' ? Stocks.stocks.map(s => s.symbol) : []),
      ...Object.keys(this._allPlayerStocks),
      ...Object.keys(this._bankruptCompanies),
      ...this._companies.flatMap(co => co.stocks ? co.stocks.map(s => s.symbol) : []),
    ]);
    if (allTickers.has(sym)) { alert('Ticker "' + sym + '" is already taken.'); return; }

    const sName = prompt('Stock name:')?.trim();
    if (!sName) return;

    App.balance -= cost;
    App.updateBalance();
    const spd = this.PERSONALITY_DEFAULTS[c.personality || 'standard'] || this.PERSONALITY_DEFAULTS.standard;
    c.stocks.push({ symbol: sym, name: sName, type: 'private', price: spd.basePrice, vol: spd.vol, basePrice: spd.basePrice });
    this._saveLocal();
    this._pushToFirebase();
    this.render();
  },

  togglePublic(cIdx, sIdx) {
    const c = this._companies[cIdx];
    if (!c || !c.stocks[sIdx]) return;
    const s = c.stocks[sIdx];
    s.type = s.type === 'public' ? 'private' : 'public';
    this._saveLocal();
    this._pushToFirebase();
    this.render();
  },

  setMainStock(cIdx, sIdx) {
    const c = this._companies[cIdx];
    if (!c) return;
    c.mainIdx = sIdx;
    this._saveLocal();
    this._pushToFirebase();
    this.render();
  },

  issueDividend(cIdx, sIdx) {
    const c = this._companies[cIdx];
    if (!c || !c.stocks[sIdx]) return;
    const s = c.stocks[sIdx];
    const perShareStr = prompt('Dividend amount per share ($):');
    if (!perShareStr) return;
    const perShare = parseFloat(perShareStr);
    if (isNaN(perShare) || perShare <= 0) { alert('Invalid amount.'); return; }

    let totalShares = 0;
    if (this._holdings[s.symbol]) totalShares += this._holdings[s.symbol].shares || 0;
    const totalCost = perShare * Math.max(1, totalShares);
    if (App.balance < totalCost) { alert('Not enough funds. Need ' + App.formatMoney(totalCost)); return; }
    App.balance -= totalCost;
    App.updateBalance();
    // Apply dividend boost upgrade (1.5x per level)
    const divLv = (c.upgrades && c.upgrades.dividendBoost) || 0;
    const boostedPerShare = perShare * (1 + divLv * 0.5);

    if (this._holdings[s.symbol] && this._holdings[s.symbol].shares > 0) {
      const payout = boostedPerShare * this._holdings[s.symbol].shares;
      App.addBalance(payout);
      this._toast('\u{1F4B0} Dividend received: +' + App.formatMoney(payout) + (divLv > 0 ? ' (Lv' + divLv + ' boost)' : ''));
    }
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.pushPlayerDividend(s.symbol, boostedPerShare, Firebase.uid);
    }
    this.render();
  },

  // === COMPANY UPGRADES ===
  upgradeCompany(cIdx, upgradeKey) {
    const c = this._companies[cIdx];
    if (!c) return;
    if (!c.upgrades) c.upgrades = {};
    const def = this.COMPANY_UPGRADES[upgradeKey];
    if (!def) return;
    const current = c.upgrades[upgradeKey] || 0;
    if (current >= def.maxLevel) { alert('Already at max level!'); return; }
    const cost = def.costs[current];
    if (App.balance < cost) { alert('Need ' + App.formatMoney(cost) + ' to upgrade.'); return; }
    if (!confirm(def.icon + ' Upgrade ' + def.name + ' to Lv' + (current + 1) + ' for ' + App.formatMoney(cost) + '?')) return;
    App.addBalance(-cost);
    c.upgrades[upgradeKey] = current + 1;

    // Bull Propaganda: raises the hard cap and mania frequency (does NOT change basePrice)
    if (upgradeKey === 'bullBias' && (c.personality || 'standard') !== 'penny') {
      const newLevel = c.upgrades.bullBias;
      const CAPS = (c.personality || 'standard') === 'extreme'
        ? [1500, 3000, 7500, 22000, 60000, 100000]
        : [1000, 2000, 5000, 15000, 40000, 70000];
      const newCap = CAPS[Math.min(newLevel, 5)];
      Toast.show('\u{1F4C8} Bull Prop Lv' + newLevel + ' — stock cap raised to ' + App.formatMoney(newCap) + '! Mania more frequent.', 'var(--green-dark)', 4500);
    }

    this._saveLocal();
    this._pushToFirebase();
    App.save();
    this.render();
  },

  // Unlock another company slot (max 3 slots)
  upgradeSlots() {
    if (this._companySlots >= 3) { alert('Maximum 3 company slots already unlocked.'); return; }
    const cost = this.SLOT_COSTS[this._companySlots];
    if (App.balance < cost) { alert('Need ' + App.formatMoney(cost) + ' to unlock another slot.'); return; }
    if (!confirm('Unlock Company Slot #' + (this._companySlots + 1) + ' for ' + App.formatMoney(cost) + '?')) return;
    App.addBalance(-cost);
    this._companySlots++;
    this._saveLocal();
    App.save();
    this.render();
  },

  // === RENAME COMPANY ===
  renameCompany(cIdx) {
    const c = this._companies[cIdx];
    if (!c) return;
    const input = document.getElementById('co-rename-' + cIdx);
    if (!input) return;
    const newName = input.value.trim();
    if (!newName) { Toast.show('Enter a new name.', '#ff5252'); return; }
    if (newName.length > 24) { Toast.show('Name too long (max 24 chars).', '#ff5252'); return; }
    if (newName === c.name) { Toast.show('Same name — nothing changed.', '#ff9100'); return; }
    const cost = 100000;
    if (App.balance < cost) { alert('Need ' + App.formatMoney(cost) + ' to rename.'); return; }
    if (!confirm('Rename "' + c.name + '" to "' + newName + '" for ' + App.formatMoney(cost) + '?')) return;
    App.addBalance(-cost);
    c.name = newName;
    // Sync companyName on all matching stocks so market/ticker updates immediately
    for (const sym in this._allPlayerStocks) {
      if (this._allPlayerStocks[sym].companyTicker === c.ticker) {
        this._allPlayerStocks[sym].companyName = newName;
      }
    }
    this._saveLocal();
    this._pushToFirebase();
    App.save();
    this._triggerRender();
    Toast.show('\u{1F3E2} Renamed to "' + newName + '"!', 'var(--green-dark)', 3000);
  },

  // === SELL COMPANY ===
  listForSale(cIdx) {
    const c = this._companies[cIdx];
    if (!c) return;
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) { alert('Must be online to list.'); return; }
    const priceEl = document.getElementById('co-sale-price-' + cIdx);
    const price = parseFloat(priceEl?.value);
    if (!price || price <= 0) { alert('Enter a valid price.'); return; }
    Firebase.listCompanyForSale(
      c.ticker, c, price,
      typeof Settings !== 'undefined' ? Settings.profile.name : 'Player',
      Firebase.uid
    );
    this._triggerRender();
  },

  cancelSale(ticker) {
    if (typeof Firebase !== 'undefined') Firebase.cancelCompanySale(ticker);
    this._triggerRender();
  },

  buyCompany(ticker) {
    const listing = this._companyListings[ticker];
    if (!listing) return;
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    if (listing.ownerUid === myUid) { alert("That's your own listing."); return; }
    if (this._companies.length >= this.MAX_COMPANIES_HARD) {
      alert('You have reached the absolute company limit (' + this.MAX_COMPANIES_HARD + ').');
      return;
    }
    if (App.balance < listing.salePrice) { alert('Not enough funds.'); return; }
    if (!confirm('Buy ' + this._esc(listing.name || ticker) + ' for ' + App.formatMoney(listing.salePrice) + '?')) return;
    App.addBalance(-listing.salePrice);
    const company = {
      ...(listing.company || {}),
      name: listing.name || ticker,
      ticker,
      ownerName: typeof Settings !== 'undefined' ? Settings.profile.name : 'Player',
    };
    this._companies.push(company);
    this._saveLocal();
    this._pushToFirebase();
    if (typeof Firebase !== 'undefined') {
      Firebase.acquireListedCompany(
        listing.ownerUid, myUid,
        typeof Settings !== 'undefined' ? Settings.profile.name : 'Player',
        listing.company, listing.salePrice, ticker
      );
    }
    App.save();
    this._triggerRender();
  },

  // === TRADING ===
  _calcPlayerTradeImpact(s, tradeValue) {
    const baseSize = (s.price || 1) * 800;
    return Math.min(0.08, tradeValue / baseSize);
  },

  promptBuy(symbol) {
    const s = this._allPlayerStocks[symbol];
    if (!s || App.balance <= 0) return;
    const html = `<div class="stock-trade-modal">
      <div class="stock-trade-title">Buy ${symbol} @ ${App.formatMoney(s.price)}</div>
      <div class="stock-trade-custom-amount">
        <label for="ps-buy-input">$</label>
        <input type="text" inputmode="decimal" id="ps-buy-input" class="sh-input" placeholder="Amount (e.g. 10m)"
          oninput="Companies.updatePlayerBuyButton(this.value,'${symbol}')">
        <button onclick="document.getElementById('ps-buy-input').value=App.balance;Companies.updatePlayerBuyButton(App.balance,'${symbol}')">Max</button>
      </div>
      <div class="sh-preview" style="display:none;font-size:11px;color:var(--text-dim);margin:2px 0 4px 0"></div>
      <div id="ps-buy-summary"></div>
      <div class="stock-trade-buttons">
        <button id="ps-buy-confirm" class="stock-trade-btn" onclick="Companies.buyPlayerWithMoney('${symbol}')" disabled>Buy</button>
      </div>
      <button class="stock-trade-cancel" onclick="Stocks.closeModal()">Cancel</button>
    </div>`;
    Stocks._showModal(html);
  },

  updatePlayerBuyButton(money, symbol) {
    const amount = App.parseAmount(money);
    const summaryEl = document.getElementById('ps-buy-summary');
    const buyBtn = document.getElementById('ps-buy-confirm');
    if (!summaryEl || !buyBtn) return;
    if (isNaN(amount) || amount <= 0) { summaryEl.textContent = ''; buyBtn.disabled = true; return; }
    const s = this._allPlayerStocks[symbol];
    const price = s ? s.price : 1;
    const shares = Math.min(amount, App.balance) / price;
    summaryEl.textContent = `You will get ~${shares.toFixed(4)} shares @ ${App.formatMoney(price)}`;
    buyBtn.disabled = amount > App.balance || amount <= 0;
  },

  buyPlayerWithMoney(symbol) {
    const input = document.getElementById('ps-buy-input');
    if (!input) return;
    let amount = App.parseAmount(input.value);
    if (isNaN(amount) || amount <= 0) return;
    const s = this._allPlayerStocks[symbol];
    if (!s) return;
    amount = Math.min(amount, App.balance);
    if (amount <= 0) return;
    const shares = amount / s.price;
    App.balance -= amount;
    App.updateBalance();
    if (!this._holdings[symbol]) this._holdings[symbol] = { shares: 0, avgCost: 0 };
    const h = this._holdings[symbol];
    h.avgCost = (h.shares * h.avgCost + amount) / (h.shares + shares);
    h.shares += shares;
    const impactPct = this._calcPlayerTradeImpact(s, amount);
    if (impactPct >= 0.0005) {
      this._playerStockTargets[symbol] = { target: Math.max(0.01, s.price * (1 + impactPct)), stepsLeft: 8 };
      if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushTradeInfluence(symbol, 1, impactPct);
    }
    this._saveLocal();
    Stocks.closeModal();
    this._toast('\u2705 Bought ' + shares.toFixed(4) + 'x ' + symbol + ' for ' + App.formatMoney(amount));
    this._triggerRender();
  },

  promptSell(symbol) {
    const s = this._allPlayerStocks[symbol];
    if (!s) return;
    const h = this._holdings[symbol];
    if (!h || h.shares <= 0) return;
    const price = s.price;
    const owned = h.shares;
    const fmt = n => n % 1 === 0 ? n : parseFloat(n.toFixed(4));

    const pcts = [
      { label: '10%', shares: owned * 0.10 },
      { label: '25%', shares: owned * 0.25 },
      { label: '50%', shares: owned * 0.50 },
      { label: 'All',  shares: owned },
    ];

    let html = `<div class="stock-trade-modal">
      <div class="stock-trade-title" style="color:var(--red)">Sell ${symbol}</div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:12px">@ ${App.formatMoney(price)} &bull; ${fmt(owned)} shares &bull; ${App.formatMoney(price * owned)}</div>
      <div class="stock-trade-buttons">`;
    pcts.forEach(({ label, shares }) => {
      html += `<button class="stock-trade-btn stock-sell-btn" onclick="Companies.playerSellShares('${symbol}',${shares})">${label}<br><span style="font-size:11px;opacity:0.8">${App.formatMoney(price * shares)}</span></button>`;
    });
    html += `</div>
      <div class="stock-trade-custom-amount" style="margin-top:4px;margin-bottom:12px">
        <input type="text" inputmode="decimal" id="pstock-sell-custom" class="sh-input" placeholder="# of shares (e.g. 1.5m)" style="flex:1">
        <button onclick="Companies._confirmCustomSell('${symbol}')">Sell</button>
      </div>
      <button class="stock-trade-cancel" onclick="Stocks.closeModal()">Cancel</button>
    </div>`;
    Stocks._showModal(html);
  },

  _confirmCustomSell(symbol) {
    const input = document.getElementById('pstock-sell-custom');
    if (!input) return;
    const qty = App.parseAmount(input.value);
    if (isNaN(qty) || qty <= 0) return;
    this.playerSellShares(symbol, qty);
  },

  playerSellShares(symbol, qty) {
    const s = this._allPlayerStocks[symbol];
    if (!s) return;
    const h = this._holdings[symbol];
    if (!h || h.shares <= 0) return;
    const shares = Math.min(qty, h.shares);
    if (shares <= 0) return;
    const total = shares * s.price;
    App.addBalance(total);
    h.shares -= shares;
    if (h.shares < 0.0001) delete this._holdings[symbol];
    const impactPct = this._calcPlayerTradeImpact(s, total);
    if (impactPct >= 0.0005) {
      this._playerStockTargets[symbol] = { target: Math.max(0.01, s.price * (1 - impactPct)), stepsLeft: 8 };
      if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushTradeInfluence(symbol, -1, impactPct);
    }
    this._saveLocal();
    Stocks.closeModal();
    this._toast('\u{1F4B0} Sold ' + shares.toFixed(4) + 'x ' + symbol + ' +' + App.formatMoney(total));
    this._triggerRender();
  },

  // === PRIVATE SHARE OFFERS ===
  offerShares(cIdx, sIdx) {
    const c = this._companies[cIdx];
    if (!c || !c.stocks[sIdx]) return;
    const s = c.stocks[sIdx];
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) { alert('Must be online to send offers.'); return; }
    const myUid = Firebase.uid;
    const players = (Firebase.leaderboardData || []).filter(p => p.uid !== myUid);
    if (!players.length) { alert('No other players found. They need to have logged in at least once.'); return; }
    const opts = players.map(p => `<option value="${this._esc(p.uid)}">${this._esc(p.name || 'Player')}</option>`).join('');
    const curPrice = s.price < 10 ? s.price.toFixed(2) : Math.round(s.price);
    const html = `<div class="stock-trade-modal">
      <div class="stock-trade-title">Offer ${this._esc(s.symbol)} Shares</div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px">Private deal \u2014 only the recipient sees this offer</div>
      <div style="margin-bottom:8px">
        <div style="font-size:12px;color:var(--text-dim);margin-bottom:3px">Send to</div>
        <select id="offer-to" style="width:100%;padding:8px;background:var(--bg2);color:var(--text);border:1px solid var(--bg3);border-radius:6px;font-size:14px">${opts}</select>
      </div>
      <div style="margin-bottom:8px">
        <div style="font-size:12px;color:var(--text-dim);margin-bottom:3px">Quantity (shares)</div>
        <input type="number" id="offer-qty" min="0.0001" step="any" placeholder="e.g. 10" style="width:100%;padding:8px;box-sizing:border-box;background:var(--bg);border:1px solid var(--bg3);border-radius:6px;color:var(--text);font-size:14px">
      </div>
      <div style="margin-bottom:12px">
        <div style="font-size:12px;color:var(--text-dim);margin-bottom:3px">Price per share ($) <span style="color:var(--text-dim)">(market: $${curPrice})</span></div>
        <input type="number" id="offer-pps" min="0.01" step="any" placeholder="${curPrice}" style="width:100%;padding:8px;box-sizing:border-box;background:var(--bg);border:1px solid var(--bg3);border-radius:6px;color:var(--text);font-size:14px">
      </div>
      <div class="stock-trade-buttons">
        <button class="stock-trade-btn" onclick="Companies._sendOffer(${cIdx},${sIdx})">Send Offer</button>
      </div>
      <button class="stock-trade-cancel" onclick="Stocks.closeModal()">Cancel</button>
    </div>`;
    Stocks._showModal(html);
  },

  _sendOffer(cIdx, sIdx) {
    const c = this._companies[cIdx];
    if (!c || !c.stocks[sIdx]) return;
    const s = c.stocks[sIdx];
    const recipientUid = document.getElementById('offer-to')?.value;
    const qty = parseFloat(document.getElementById('offer-qty')?.value);
    const pps = parseFloat(document.getElementById('offer-pps')?.value);
    if (!recipientUid) { alert('Select a recipient.'); return; }
    if (isNaN(qty) || qty <= 0) { alert('Enter a valid quantity.'); return; }
    if (isNaN(pps) || pps <= 0) { alert('Enter a valid price per share.'); return; }
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    if (!myUid) return;
    const recipientEntry = (Firebase.leaderboardData || []).find(p => p.uid === recipientUid);
    const recipientName = recipientEntry ? (recipientEntry.name || 'Player') : 'Player';
    Firebase.sendShareOffer(recipientUid, {
      symbol: s.symbol, stockName: s.name, companyName: c.name, ticker: c.ticker,
      qty, pricePerShare: pps, totalCost: qty * pps,
      fromUid: myUid, fromName: typeof Settings !== 'undefined' ? Settings.profile.name : 'Player',
      sentAt: Date.now(),
    });
    Stocks.closeModal();
    Toast.show('\u{1F4E8} Offer sent to ' + this._esc(recipientName) + '!', '', 3500);
  },

  acceptShareOffer(offerId) {
    const offer = this._shareOffers[offerId];
    if (!offer) return;
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    if (!myUid) return;
    if (App.balance < offer.totalCost) { alert('Not enough funds. Need ' + App.formatMoney(offer.totalCost)); return; }
    if (!confirm('Buy ' + offer.qty + 'x ' + offer.symbol + ' from ' + this._esc(offer.fromName || 'Player') + ' for ' + App.formatMoney(offer.totalCost) + '?')) return;
    App.addBalance(-offer.totalCost);
    if (!this._holdings[offer.symbol]) this._holdings[offer.symbol] = { shares: 0, avgCost: 0 };
    const h = this._holdings[offer.symbol];
    h.avgCost = (h.shares * h.avgCost + offer.totalCost) / (h.shares + offer.qty);
    h.shares += offer.qty;
    this._saveLocal();
    App.save();
    // Credit the seller
    Firebase.db.ref('companySaleReceipts/' + offer.fromUid).push({ amount: offer.totalCost, ts: Date.now(), type: 'shares', symbol: offer.symbol });
    Firebase.removeShareOffer(myUid, offerId);
    Toast.show('\u2705 Bought ' + offer.qty + 'x ' + offer.symbol + ' for ' + App.formatMoney(offer.totalCost), 'var(--green-dark)', 4000);
    this._triggerRender();
  },

  declineShareOffer(offerId) {
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    if (!myUid) return;
    Firebase.removeShareOffer(myUid, offerId);
  },

  // === FIREBASE PUSH ===
  _pushToFirebase() {
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) return;
    Firebase.postCompany(Firebase.uid, {
      companies: this._companies,
      holdings: this._holdings,
      ownerName: typeof Settings !== 'undefined' ? Settings.profile.name : 'Player',
    });
  },

  // === RENDER ===
  setTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.company-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    this.render();
  },

  render() {
    const inStocks = App.currentScreen === 'stocks' && typeof Stocks !== 'undefined' &&
      (Stocks.activeTab === 'players' || Stocks.activeTab === 'company');
    if (inStocks) { Stocks.render(); return; }

    const container = document.getElementById('companies-content');
    if (!container) return;

    // Don't wipe the manage form while user is typing
    const focused = document.activeElement;
    const userTyping = focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA');
    if (this.activeTab === 'browse') this._renderBrowse(container);
    else if (this.activeTab === 'news') this._renderNewsTab(container);
    else if (!userTyping) this._renderManage(container);
  },

  _renderBrowse(container) {
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    const publicStocks = Object.values(this._allPlayerStocks).filter(s => s.type === 'public' && !s._bankruptDeclared);
    const bankruptList = Object.values(this._bankruptCompanies);
    const allListings = Object.values(this._companyListings);
    const mySale = allListings.filter(l => l.ownerUid === myUid);
    const otherSale = allListings.filter(l => l.ownerUid !== myUid);
    const hasAnything = publicStocks.length > 0 || bankruptList.length > 0 || allListings.length > 0;

    let html = '';

    if (!hasAnything) {
      container.innerHTML = `<div class="company-empty" style="text-align:center;color:var(--text-dim);padding:32px 16px">
        <div style="font-size:48px;margin-bottom:12px">&#x1F3E2;</div>
        <div style="font-weight:700;margin-bottom:6px">No public player stocks yet</div>
        <div style="font-size:13px">Found a company and go public to list your stocks here!</div>
      </div>`;
      return;
    }

    // Public player stocks
    if (publicStocks.length > 0) {
      // Group by ownerUid so each company gets one competitor/sabotage block
      const ownersSeen = new Set();
      html += '<div style="display:flex;flex-direction:column;gap:10px">';
      publicStocks.forEach(s => {
        const h = this._holdings[s.symbol];
        const owned = h ? h.shares : 0;
        const hist = s.history;
        const prev = hist.length >= 2 ? hist[hist.length - 2] : s.price;
        const pct = prev > 0 ? ((s.price - prev) / prev * 100) : 0;
        const isUp = pct >= 0;
        const isMyStock = s.ownerUid === myUid;
        const isComp = !isMyStock && !!this._competitors[s.ownerUid];
        const isAlly = !isMyStock && !!this._allies[s.ownerUid];
        const scandal = this._scandals[s.symbol];
        const hasActiveScandal = scandal && !scandal.suppressed && Date.now() - (scandal.firedAt || 0) < 120000;

        // Competitor/ally controls — one block per owner
        let compControls = '';
        if (!isMyStock && !ownersSeen.has(s.ownerUid)) {
          ownersSeen.add(s.ownerUid);
          const compCost = App.formatMoney(this.sabotageCost(s.ownerUid));
          const boostCost = App.formatMoney(this.allyBoostCost(s.ownerUid));
          compControls = `<div class="competitor-controls">
            <button class="ally-btn${isAlly ? ' ally-active' : ''}" onclick="Companies.toggleAlly('${s.ownerUid}','${this._esc(s.ownerName)}','${this._esc(s.companyTicker || s.symbol)}')">
              ${isAlly ? '\u{1F91D} Ally' : '+ Set Ally'}
            </button>
            ${isAlly ? `<button class="boost-btn" onclick="Companies.boostAlly('${s.ownerUid}')">Boost — ${boostCost}</button>` : ''}
            <button class="competitor-btn${isComp ? ' competitor-active' : ''}" onclick="Companies.toggleCompetitor('${s.ownerUid}','${this._esc(s.ownerName)}','${this._esc(s.companyTicker || s.symbol)}')">
              ${isComp ? '\u{1F3AF} Competitor' : '+ Set Competitor'}
            </button>
            ${isComp ? `<button class="sabotage-btn" onclick="Companies.sabotage('${s.ownerUid}')">Sabotage — ${compCost}</button>` : ''}
          </div>`;
        }

        html += `<div class="company-card${isComp ? ' competitor-card' : isAlly ? ' ally-card' : ''}">
          <div class="company-card-header">
            <div>
              <span class="company-card-sym">${this._esc(s.symbol)}</span>
              <span class="player-stock-badge">PLAYER</span>
              ${isComp ? '<span class="competitor-badge">RIVAL</span>' : ''}
              ${isAlly ? '<span class="ally-badge">ALLY</span>' : ''}
            </div>
            <div class="company-card-price ${isUp ? 'ticker-up' : 'ticker-dn'}">
              $${s.price < 10 ? s.price.toFixed(2) : Math.round(s.price).toLocaleString()}
              <span style="font-size:12px">${isUp ? '&#x25B2;' : '&#x25BC;'}${Math.abs(pct).toFixed(2)}%</span>
            </div>
          </div>
          <div class="company-card-name">${this._esc(s.name)}</div>
          <div class="company-card-owner">by ${this._esc(s.ownerName)}${owned > 0 ? ' &bull; You own <strong>' + owned + '</strong> shares' : ''}</div>
          ${hasActiveScandal ? `<div class="scandal-news-banner">\u{1F4F0} ${this._esc(scandal.text)}</div>` : ''}
          <div class="company-card-actions">
            <button class="company-buy-btn" onclick="Companies.promptBuy('${s.symbol}')">Buy</button>
            ${owned > 0 ? `<button class="company-sell-btn" onclick="Companies.promptSell('${s.symbol}')">Sell</button>` : ''}
            ${!isMyStock ? `<button class="company-buy-btn" style="background:var(--bg3);border-color:var(--accent)" onclick="Companies.promptStockOffer('${s.symbol}')">&#x1F4BC; Offer</button>` : ''}
            ${(() => {
              if (isMyStock) return '';
              const isSubStock = (s.companyStocks || []).length > 1 && (s.companyStocks[s.companyMainIdx || 0]?.symbol !== s.symbol);
              if (!isSubStock) return '';
              const hasMAD = this._companies.some(c => (c.upgrades?.acquisitionLicense || 0) >= 1);
              if (!hasMAD) return '';
              const totalStocks = this._countTotalPlayerStocks();
              if (totalStocks >= 7) return '<span style="font-size:10px;color:var(--text-dim)">Portfolio full (7)</span>';
              return `<button class="company-buy-btn" style="background:#1a2a4a;border-color:#82b1ff;color:#82b1ff" onclick="Companies.promptAcquisitionOffer('${s.symbol}')">&#x1F91D; Acquire</button>`;
            })()}
          </div>
          ${compControls}
        </div>`;
      });
      html += '</div>';
    }

    // Distressed Assets
    if (bankruptList.length > 0) {
      html += '<div class="player-stocks-market-header" style="color:#e74c3c;margin-top:16px">&#x1F534; Distressed Assets</div>';
      html += '<div style="display:flex;flex-direction:column;gap:10px">';
      bankruptList.forEach(b => {
        if (!b || !b.ticker) return;
        const isOwner = myUid === b.originalOwnerUid;
        const elapsed = Date.now() - (b.bankruptAt || 0);
        const remaining = Math.max(0, Math.ceil((24 * 3600000 - elapsed) / 3600000));
        html += `<div class="company-card bankrupt-card">
          <div class="company-card-header">
            <div>
              <span class="company-card-sym">${this._esc(b.ticker)}</span>
              <span class="distressed-badge">BANKRUPT</span>
            </div>
            <div class="company-card-price" style="color:#e74c3c">${App.formatMoney(b.debtCost)}</div>
          </div>
          <div class="company-card-name">${this._esc(b.name || b.ticker)}</div>
          <div class="company-card-owner">Owner: ${this._esc(b.originalOwnerName || 'Unknown')} &bull; ${remaining}h remaining</div>
          <div class="company-card-actions">
            <button class="company-buy-btn" style="background:${isOwner ? '#27ae60' : '#c0392b'};border-color:${isOwner ? '#27ae60' : '#c0392b'}" onclick="Companies.bailOut('${b.ticker}')">
              ${isOwner ? '&#x2705; Bail Out / Reclaim' : '&#x1F4BC; Acquire Company'}
            </button>
          </div>
        </div>`;
      });
      html += '</div>';
    }

    // Your own listings
    if (mySale.length > 0) {
      html += '<div class="player-stocks-market-header" style="margin-top:16px">&#x1F4E2; Your Listings</div>';
      html += '<div style="display:flex;flex-direction:column;gap:10px">';
      mySale.forEach(l => {
        html += `<div class="company-card" style="border-color:var(--gold)">
          <div class="company-card-header">
            <span class="company-card-sym">${this._esc(l.ticker)}</span>
            <div class="company-card-price" style="color:var(--gold)">${App.formatMoney(l.salePrice)}</div>
          </div>
          <div class="company-card-name">${this._esc(l.name || l.ticker)}</div>
          <div class="company-card-owner">Listed for sale</div>
          <div class="company-card-actions">
            <button class="company-sell-btn" onclick="Companies.cancelSale('${l.ticker}')">Cancel Listing</button>
          </div>
        </div>`;
      });
      html += '</div>';
    }

    // Other players' companies for sale
    if (otherSale.length > 0) {
      html += '<div class="player-stocks-market-header" style="margin-top:16px">&#x1F4B2; Companies for Sale</div>';
      html += '<div style="display:flex;flex-direction:column;gap:10px">';
      otherSale.forEach(l => {
        html += `<div class="company-card">
          <div class="company-card-header">
            <span class="company-card-sym">${this._esc(l.ticker)}</span>
            <div class="company-card-price" style="color:var(--green)">${App.formatMoney(l.salePrice)}</div>
          </div>
          <div class="company-card-name">${this._esc(l.name || l.ticker)}</div>
          <div class="company-card-owner">by ${this._esc(l.ownerName || 'Player')}</div>
          <div class="company-card-actions">
            <button class="company-buy-btn" onclick="Companies.buyCompany('${l.ticker}')">Buy Company</button>
          </div>
        </div>`;
      });
      html += '</div>';
    }

    // 🏦 Active Banks section
    html += `<div style="margin-top:16px">
      <div class="player-stocks-market-header">🏦 Active Banks</div>
      <div id="banking-browse-section"><div style="font-size:12px;color:var(--text-dim);padding:8px 0">Loading...</div></div>
    </div>`;

    // My Deposits section
    if (typeof Banking !== 'undefined') {
      const myDeps = Object.keys(Banking._myVaults).length;
      if (myDeps > 0) {
        html += `<div style="margin-top:12px">
          <div class="player-stocks-market-header">💰 My Deposits</div>
          <div class="my-deposits-section">${Banking.renderMyDeposits()}</div>
        </div>`;
      }
    }

    container.innerHTML = html;

    // Now render bank cards into the injected div
    if (typeof Banking !== 'undefined') Banking._renderBankCards();
  },

  setCompanyExpanded(cIdx) {
    this._expandedCo = (this._expandedCo === cIdx) ? null : cIdx;
    this._triggerRender();
  },

  setCompanyTab(cIdx, tab) {
    this._coTab[cIdx] = tab;
    this._triggerRender();
  },

  showSubStockPanel(cIdx, sIdx) {
    this._activeSubStock = { cIdx, sIdx };
    // Ensure the right company is expanded on the Stocks tab
    this._expandedCo = cIdx;
    this._coTab[cIdx] = 'stocks';
    this._triggerRender();
  },

  _closeSubStockPanel() {
    this._activeSubStock = null;
    this._triggerRender();
  },

  buySubStockProperty(cIdx, sIdx, propKey) {
    const c = this._companies[cIdx];
    if (!c) return;
    const s = c.stocks[sIdx];
    if (!s) return;
    const ind = s.industry || c.industry || 'tech';
    const defs = this.COMPANY_PROPERTIES[ind] || [];
    const def = defs.find(d => d.key === propKey);
    if (!def) return;
    if (!s.properties) s.properties = [];
    if (s.properties.includes(propKey)) { alert('Already owned.'); return; }
    if (App.balance < def.cost) { alert('Need ' + App.formatMoney(def.cost) + ' to buy this.'); return; }
    App.addBalance(-def.cost);
    s.properties.push(propKey);
    this._saveLocal();
    this._pushToFirebase();
    App.save();
    Toast.show('&#x1F3D7; ' + def.name + ' purchased!', 'var(--green)', 3000);
    this._triggerRender();
  },

  // Helper: total passive income for a company (main + sub-stocks)
  _calcCompanyIncome(c) {
    let total = 0;
    const worldMultMain = this._getWorldPriceMult(c.industry || 'tech');
    const shareToOwner = typeof c.incomeShare === 'number' ? c.incomeShare / 100 : 1;
    (this.COMPANY_PROPERTIES[c.industry || 'tech'] || []).forEach(def => {
      if (Array.isArray(c.properties) && c.properties.includes(def.key)) {
        total += def.income * worldMultMain * shareToOwner;
      }
    });
    (c.stocks || []).forEach((s, sIdx) => {
      if (sIdx === (c.mainIdx || 0)) return;
      const sInd = s.industry || c.industry || 'tech';
      const wm = this._getWorldPriceMult(sInd);
      (this.COMPANY_PROPERTIES[sInd] || []).forEach(def => {
        if (Array.isArray(s.properties) && s.properties.includes(def.key)) {
          total += def.income * wm * shareToOwner;
        }
      });
    });
    return total;
  },

  _renderManage(container) {
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    // Preserve founding form values so price-update re-renders don't wipe user's typing
    const _savedName     = document.getElementById('co-found-name')?.value     || '';
    const _savedTicker   = document.getElementById('co-found-ticker')?.value   || '';
    const _savedIndustry = document.getElementById('co-found-industry')?.value || '';
    let html = '';

    // Incoming private share offers
    const pendingOffers = Object.entries(this._shareOffers || {});
    if (pendingOffers.length > 0) {
      html += `<div class="company-manage-section" style="margin-bottom:10px;border-color:var(--gold)">
        <h3 style="color:var(--gold)">\u{1F4E8} Incoming Share Offers</h3>
        <div style="display:flex;flex-direction:column;gap:6px">`;
      pendingOffers.forEach(([offerId, offer]) => {
        html += `<div class="company-stock-row" style="align-items:flex-start">
          <div style="flex:1;min-width:0">
            <span class="csr-sym">${this._esc(offer.symbol)}</span>
            <div style="font-size:12px;color:var(--text-dim)">${offer.qty} shares &times; ${App.formatMoney(offer.pricePerShare)} = <strong>${App.formatMoney(offer.totalCost)}</strong></div>
            <div style="font-size:11px;color:var(--text-dim)">from ${this._esc(offer.fromName || 'Player')}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
            <button class="csr-toggle-btn" style="color:var(--green);border-color:var(--green);font-size:11px" onclick="Companies.acceptShareOffer('${offerId}')">Accept</button>
            <button class="csr-toggle-btn" style="color:var(--red);border-color:var(--red);font-size:11px" onclick="Companies.declineShareOffer('${offerId}')">Decline</button>
          </div>
        </div>`;
      });
      html += `</div></div>`;
    }

    // Incoming stock transfer offers for my stocks
    const mySymbols = this._companies.flatMap(c => (c.stocks || []).map(s => s.symbol));
    const incomingStockOffers = [];
    mySymbols.forEach(sym => {
      const offers = this._stockOffers[sym];
      if (offers) {
        Object.entries(offers).forEach(([offererUid, offer]) => {
          if (offererUid !== myUid) incomingStockOffers.push({ sym, offererUid, offer });
        });
      }
    });
    if (incomingStockOffers.length > 0) {
      html += `<div class="company-manage-section" style="margin-bottom:10px;border-color:#9945ff">
        <h3 style="color:#9945ff">\u{1F4EC} Stock Transfer Offers</h3>
        <div style="display:flex;flex-direction:column;gap:6px">`;
      incomingStockOffers.forEach(({ sym, offererUid, offer }) => {
        html += `<div class="company-stock-row" style="align-items:flex-start">
          <div style="flex:1;min-width:0">
            <span class="csr-sym">${this._esc(sym)}</span>
            ${offer.type === 'acquisition' ? '<span style="font-size:10px;background:#1a2a4a;color:#82b1ff;border:1px solid #82b1ff55;border-radius:4px;padding:1px 5px;margin-left:4px">&#x1F91D; ACQUISITION</span>' : ''}
            <div style="font-size:12px;color:var(--text-dim)">Offer: <strong>${App.formatMoney(offer.amount)}</strong></div>
            <div style="font-size:11px;color:var(--text-dim)">from ${this._esc(offer.offererName || 'Player')} (${this._esc(offer.offererCompanyTicker || '')})</div>
            ${offer.type === 'acquisition' ? `<div style="font-size:10px;color:#82b1ff">→ absorb into their ${this._esc(offer.recipientCompanyTicker || '')}</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
            <button class="csr-toggle-btn" style="color:var(--green);border-color:var(--green);font-size:11px" onclick="Companies.acceptStockOffer('${sym}','${offererUid}')">Accept</button>
            <button class="csr-toggle-btn" style="color:var(--red);border-color:var(--red);font-size:11px" onclick="Companies.declineStockOffer('${sym}','${offererUid}')">Decline</button>
          </div>
        </div>`;
      });
      html += `</div></div>`;
    }

    // Each existing company — collapsible card with sub-tabs
    this._companies.forEach((c, cIdx) => {
      const listing = this._companyListings[c.ticker];
      const isListed = listing && listing.ownerUid === myUid;
      const isExpanded = this._expandedCo === cIdx;
      const activeTab = this._coTab[cIdx] || 'stocks';
      const isMainCo = this.isMainCompany(c.ticker);
      const pBadge = c.personality === 'extreme' ? ' <span style="font-size:10px;background:#8e44ad;color:#fff;border-radius:4px;padding:1px 4px">🌋</span>'
        : c.personality === 'penny' ? ' <span style="font-size:10px;background:#2980b9;color:#fff;border-radius:4px;padding:1px 4px">🪙</span>'
        : '';
      const totalIncome = this._calcCompanyIncome(c);
      const indDef = this.INDUSTRIES.find(i => i.id === (c.industry || 'tech'));

      html += `<div class="co-card${isExpanded ? ' co-card-open' : ''}">
        <div class="co-card-header" onclick="Companies.setCompanyExpanded(${cIdx})">
          <div class="co-card-info">
            <span class="co-card-name">${this._esc(c.name)}${pBadge}</span>
            <span class="co-card-ticker">${this._esc(c.ticker)}</span>
            ${isMainCo ? '<span style="font-size:10px;color:var(--gold)">⭐ Main</span>' : ''}
          </div>
          <div class="co-card-meta">
            <span style="font-size:11px;color:var(--text-dim)">${c.stocks.length} stock${c.stocks.length!==1?'s':''}</span>
            ${totalIncome > 0 ? `<span style="font-size:11px;color:var(--green)">${App.formatMoney(totalIncome)}/5s</span>` : ''}
            <span style="font-size:11px;color:var(--text-dim)">${indDef ? indDef.label : (c.industry||'tech')}</span>
            <span class="co-card-chevron">${isExpanded ? '▲' : '▼'}</span>
          </div>
        </div>`;

      if (isExpanded) {
        const drillActive = this._activeSubStock && this._activeSubStock.cIdx === cIdx;
        const drillSIdx = drillActive ? this._activeSubStock.sIdx : -1;
        const drillSym = drillActive ? (c.stocks[drillSIdx]?.symbol || '') : '';
        const showingDrill = drillActive && activeTab === 'stocks';
        html += `<div class="co-sub-tabs">
          ${showingDrill
            ? `<button class="co-stab active" onclick="Companies._closeSubStockPanel()" style="text-align:left;flex:none;padding-left:10px;gap:4px">← ${this._esc(drillSym)}</button>
               <span style="flex:1;font-size:11px;color:var(--text-dim);padding:8px 6px;align-self:center">Sub-stock</span>`
            : `<button class="co-stab${activeTab==='stocks'?' active':''}" onclick="Companies.setCompanyTab(${cIdx},'stocks')">📈 Stocks</button>
               <button class="co-stab${activeTab==='props'?' active':''}" onclick="Companies.setCompanyTab(${cIdx},'props')">🏗️ Props</button>
               <button class="co-stab${activeTab==='upgrades'?' active':''}" onclick="Companies.setCompanyTab(${cIdx},'upgrades')">🔧 Upgrades</button>
               <button class="co-stab${activeTab==='craft'?' active':''}" onclick="Companies.setCompanyTab(${cIdx},'craft')">🔨 Craft</button>
               <button class="co-stab${activeTab==='more'?' active':''}" onclick="Companies.setCompanyTab(${cIdx},'more')">⚙️ More</button>`
          }
        </div>
        <div class="co-sub-content">`;

        // ── STOCKS TAB ───────────────────────────────────────────────────
        if (activeTab === 'stocks') {
          if (drillActive && drillSIdx >= 0) {
            // ── DRILL-DOWN: sub-stock detail ──────────────────────────
            const s = c.stocks[drillSIdx];
            const ind = s.industry || c.industry || 'tech';
            const indDef2 = this.INDUSTRIES.find(i => i.id === ind);
            const indLabel2 = indDef2 ? indDef2.label : ind;
            const scandal = this._scandals[s.symbol];
            const hasActiveScandal = scandal && !scandal.suppressed && Date.now()-(scandal.firedAt||0) < 120000;
            const suppressCost = App.formatMoney(Math.max(100_000, Math.round((s.basePrice||100)*1000)));
            const hasOverride = s.industry && s.industry !== (c.industry||'tech');

            // Header
            html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--bg3)">
              <div>
                <span class="csr-sym" style="font-size:16px">${this._esc(s.symbol)}</span>
                <span class="csr-industry-badge ${hasOverride?'csr-industry-custom':''}" style="margin-left:6px">${this._esc(indLabel2)}</span>
                <div style="font-size:12px;color:var(--text-dim);margin-top:2px">${this._esc(s.name)}</div>
              </div>
              <div style="text-align:right">
                <div class="csr-price">$${(s.price||0)<10?(s.price||0).toFixed(2):Math.round(s.price||0).toLocaleString()}</div>
                <div class="csr-type ${s.type==='public'?'csr-type-public':'csr-type-private'}">${s.type}</div>
              </div>
            </div>`;
            // Scandal
            if (hasActiveScandal) html += `<div class="scandal-alert" style="margin-bottom:8px">📰 ${this._esc(scandal.text)}<br><button class="scandal-suppress-btn" onclick="Companies.suppressScandal('${s.symbol}')">Suppress — ${suppressCost}</button></div>`;
            // Actions
            html += `<div style="margin-bottom:10px">
              <div style="font-size:12px;font-weight:700;color:var(--text-dim);margin-bottom:6px">⚡ Actions</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                <button class="csr-toggle-btn" onclick="Companies.togglePublic(${cIdx},${drillSIdx})">${s.type==='public'?'Make Private':'Go Public'}</button>
                <button class="csr-toggle-btn" style="color:var(--gold);border-color:var(--gold)" onclick="Companies.issueDividend(${cIdx},${drillSIdx})">💸 Dividend</button>
                <button class="csr-toggle-btn" style="color:#82b1ff;border-color:#82b1ff" onclick="Companies.promptRebrandIndustry(${cIdx},${drillSIdx})">🏭 Industry</button>
                ${s.type==='private'?`<button class="csr-toggle-btn" style="color:var(--gold);border-color:var(--gold)" onclick="Companies.offerShares(${cIdx},${drillSIdx})">Offer Shares</button>`:''}
                <button class="csr-toggle-btn" style="font-size:11px" onclick="Companies.setMainStock(${cIdx},${drillSIdx});Companies._closeSubStockPanel()">Set as Main</button>
                ${this._companies.length > 1 ? `<button class="csr-toggle-btn" style="color:#bb86fc;border-color:#bb86fc;font-size:11px" onclick="Companies.openTransferModal(${cIdx},${drillSIdx})">↔️ Transfer</button>` : ''}
                <button class="csr-toggle-btn" style="color:var(--red);border-color:var(--red);font-size:11px" onclick="if(confirm('Remove this sub-stock?')){Companies.removeStock(${cIdx},${drillSIdx});Companies._closeSubStockPanel()}">🗑 Remove</button>
              </div>
            </div>`;
            // Properties
            const propDefs2 = this.COMPANY_PROPERTIES[ind] || [];
            const ownedProps2 = Array.isArray(s.properties) ? s.properties : [];
            const wm2 = this._getWorldPriceMult(ind);
            let propIncome2 = 0;
            propDefs2.forEach(def => { if (ownedProps2.includes(def.key)) propIncome2 += def.income * wm2; });
            if (propDefs2.length) {
              html += `<div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                  <div style="font-size:12px;font-weight:700;color:var(--text-dim)">🏗️ Properties — ${this._esc(indLabel2)}</div>
                  ${propIncome2 > 0 ? `<span style="font-size:11px;color:var(--green)">${App.formatMoney(propIncome2)}/5s</span>` : ''}
                </div>
                <div class="company-property-grid">`;
              propDefs2.forEach(def => {
                const owned = ownedProps2.includes(def.key);
                html += `<div class="company-property-card${owned?' owned':''}">
                  ${owned ? '<div class="cprop-owned-badge">✓ Owned</div>' : ''}
                  <div class="cprop-name">${this._esc(def.name)}</div>
                  <div class="cprop-income">${App.formatMoney(def.income)}<span style="font-size:10px;color:var(--text-dim)">/5s</span></div>
                  ${owned ? '' : `<div class="cprop-cost">${App.formatMoney(def.cost)}</div><button class="cprop-buy-btn" onclick="Companies.buySubStockProperty(${cIdx},${drillSIdx},'${def.key}')">Buy</button>`}
                </div>`;
              });
              html += `</div></div>`;
            }
            // News Org if entertainment
            if (ind === 'entertainment') {
              const subOrg = this._getMyOrg(s.symbol);
              const subOrgEnabled = subOrg && subOrg.enabled;
              html += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--bg3)">
                <div style="font-size:12px;font-weight:700;color:var(--text-dim);margin-bottom:6px">📰 News Organization</div>`;
              if (!subOrgEnabled) {
                html += `<button class="add-stock-btn" style="color:var(--accent);border-color:var(--accent)" onclick="Companies.enableSubStockNewsOrg(${cIdx},${drillSIdx})">Enable News Org — Free</button>`;
              } else {
                const rep = subOrg.reputation || 50;
                html += `<div style="font-size:12px;color:var(--text-dim);margin-bottom:6px">Reputation: <strong style="color:${rep>=50?'var(--green)':'var(--red)'}">${Math.round(rep)}/100</strong></div>
                  <textarea id="news-post-input-sub-${cIdx}-${drillSIdx}" maxlength="120" placeholder="Write a headline…" style="width:100%;height:60px;background:var(--bg);border:1px solid var(--bg3);border-radius:6px;color:var(--text);padding:8px;font-size:13px;resize:none;box-sizing:border-box"></textarea>
                  <button class="company-found-btn" style="margin-top:6px;padding:8px 20px" onclick="Companies.postSubStockNews(${cIdx},${drillSIdx})">📢 Publish</button>`;
              }
              html += `</div>`;
            }
            // Bank if finance
            if (ind === 'finance' && typeof Banking !== 'undefined') {
              html += Banking.renderBankSetup(cIdx, true);
            }
          } else {
            // ── STOCK LIST ───────────────────────────────────────────
            c.stocks.forEach((s, sIdx) => {
              const isMain = sIdx === (c.mainIdx || 0);
              const scandal = this._scandals[s.symbol];
              const hasActiveScandal = scandal && !scandal.suppressed && Date.now() - (scandal.firedAt||0) < 120000;
              const suppressCost = App.formatMoney(Math.max(100_000, Math.round((s.basePrice||100)*1000)));
              const sInd = s.industry || c.industry || 'tech';
              const sIndDef = this.INDUSTRIES.find(i => i.id === sInd);
              const sIndLabel = sIndDef ? sIndDef.label : sInd;
              const hasOverride = !isMain && s.industry && s.industry !== (c.industry||'tech');
              html += `<div class="company-stock-row">
                <div style="flex:1;min-width:0">
                  <span class="csr-sym">${this._esc(s.symbol)}</span>
                  ${isMain ? '<span style="font-size:10px;color:var(--gold);margin-left:4px">MAIN</span>' : ''}
                  ${!isMain ? `<span class="csr-industry-badge ${hasOverride?'csr-industry-custom':''}">${sIndLabel}</span>` : ''}
                  <div class="company-card-name">${this._esc(s.name)}</div>
                  ${hasActiveScandal ? `<div class="scandal-alert">📰 ${this._esc(scandal.text)}<br><button class="scandal-suppress-btn" onclick="Companies.suppressScandal('${s.symbol}')">Suppress — ${suppressCost}</button></div>` : ''}
                </div>
                <div style="text-align:right;flex-shrink:0;margin-right:8px">
                  <div class="csr-price">$${(s.price||0)<10?(s.price||0).toFixed(2):Math.round(s.price||0).toLocaleString()}</div>
                  <div class="csr-type ${s.type==='public'?'csr-type-public':'csr-type-private'}">${s.type}</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
                  ${isMain
                    ? `<button class="csr-toggle-btn" onclick="Companies.togglePublic(${cIdx},${sIdx})">${s.type==='public'?'Make Private':'Go Public'}</button>
                       <button class="csr-toggle-btn" onclick="Companies.issueDividend(${cIdx},${sIdx})" style="color:var(--gold);border-color:var(--gold)">Dividend</button>`
                    : `<button class="csr-toggle-btn" onclick="Companies.showSubStockPanel(${cIdx},${sIdx})" style="color:#bb86fc;border-color:#bb86fc">⚙️ Manage</button>`
                  }
                </div>
              </div>`;
            });
            if (c.stocks.length < this.MAX_STOCKS) {
              const cost = c.stocks.length === 1 ? this.STOCK2_COST : this.STOCK3_COST;
              html += `<button class="add-stock-btn" style="margin-top:8px" onclick="Companies.addStock(${cIdx})">+ Add Sub-Stock — ${App.formatMoney(cost)}</button>`;
            } else {
              html += `<div style="text-align:center;color:var(--text-dim);font-size:12px;margin-top:8px">Maximum 3 stocks reached</div>`;
            }
          }
        }

        // ── PROPS TAB (main company industry) ────────────────────────────
        if (activeTab === 'props') {
          const ind = c.industry || 'tech';
          const indD = this.INDUSTRIES.find(i => i.id === ind);
          const indL = indD ? indD.label : ind;
          const worldMult = this._getWorldPriceMult(ind);
          const multPct = Math.round(worldMult * 100);
          const multColor = worldMult >= 1.0 ? 'var(--green)' : 'var(--red)';
          const propDefs = this.COMPANY_PROPERTIES[ind] || [];
          const ownedProps = Array.isArray(c.properties) ? c.properties : [];
          const incomeShareVal = typeof c.incomeShare === 'number' ? c.incomeShare : 100;
          let totalBaseIncome = 0;
          propDefs.forEach(def => { if (ownedProps.includes(def.key)) totalBaseIncome += def.income; });
          const totalScaled = totalBaseIncome * worldMult;
          const personalIncome = totalScaled * (incomeShareVal / 100);
          const reinvestIncome = totalScaled - personalIncome;
          html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div style="font-size:13px;font-weight:700">${this._esc(indL)}</div>
            <span style="font-size:11px;color:${multColor};font-weight:700">World: ${multPct}%</span>
          </div>`;
          if (totalBaseIncome > 0) {
            html += `<div style="font-size:12px;color:var(--text-dim);margin-bottom:8px">/5s — <strong style="color:var(--green)">${App.formatMoney(personalIncome)} personal</strong> + <strong style="color:var(--gold)">${App.formatMoney(reinvestIncome)} reinvest</strong></div>
            <div style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-dim);margin-bottom:3px"><span>Personal ${incomeShareVal}%</span><span>Reinvest ${100-incomeShareVal}%</span></div>
              <input type="range" min="0" max="100" value="${incomeShareVal}" style="width:100%;accent-color:var(--green)" oninput="Companies.setIncomeShare(${cIdx},this.value)">
            </div>`;
          } else {
            html += `<div style="font-size:12px;color:var(--text-dim);margin-bottom:8px">Buy properties to earn passive income every 5 seconds.</div>`;
          }
          html += `<div class="company-property-grid">`;
          propDefs.forEach(def => {
            const owned = ownedProps.includes(def.key);
            html += `<div class="company-property-card${owned?' owned':''}">
              ${owned ? '<div class="cprop-owned-badge">✓ Owned</div>' : ''}
              <div class="cprop-name">${this._esc(def.name)}</div>
              <div class="cprop-income">${App.formatMoney(def.income)}<span style="font-size:10px;color:var(--text-dim)">/5s</span></div>
              ${owned ? '' : `<div class="cprop-cost">${App.formatMoney(def.cost)}</div><button class="cprop-buy-btn" onclick="Companies.buyProperty(${cIdx},'${def.key}')">Buy</button>`}
            </div>`;
          });
          html += `</div>`;
        }

        // ── UPGRADES TAB ─────────────────────────────────────────────────
        if (activeTab === 'upgrades') {
          html += `<div style="display:flex;flex-direction:column;gap:6px">`;
          for (const [key, def] of Object.entries(this.COMPANY_UPGRADES)) {
            const lvl = (c.upgrades && c.upgrades[key]) || 0;
            const maxed = lvl >= def.maxLevel;
            const nextCost = maxed ? 0 : def.costs[lvl];
            html += `<div class="company-upgrade-row">
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:6px">
                  <span style="font-size:16px">${def.icon}</span>
                  <span style="font-weight:700;font-size:13px">${this._esc(def.name)}</span>
                  <span class="upgrade-level-badge ${maxed?'upgrade-maxed':''}">Lv ${lvl}/${def.maxLevel}</span>
                </div>
                <div style="font-size:11px;color:var(--text-dim);margin-top:2px">${this._esc(def.desc)}</div>
              </div>
              <div style="flex-shrink:0;margin-left:8px">
                ${maxed ? '<span style="font-size:11px;color:var(--gold);font-weight:700">MAX</span>'
                  : `<button class="csr-toggle-btn" style="font-size:11px;white-space:nowrap" onclick="Companies.upgradeCompany(${cIdx},'${key}')">▲ ${App.formatMoney(nextCost)}</button>`}
              </div>
            </div>`;
          }
          html += `</div>`;
        }

        // ── CRAFT TAB ─────────────────────────────────────────────────────
        if (activeTab === 'craft' && !drillActive) {
          if (typeof Crafting !== 'undefined') {
            html += Crafting.renderCraftTab(cIdx);
          } else {
            html += `<div class="craft-empty">Crafting system not loaded.</div>`;
          }
        }

        // ── MORE TAB (rename, sell, insider intel, news org, bank, main/delete) ─
        if (activeTab === 'more') {
          // Rename
          html += `<div style="display:flex;gap:6px;align-items:center;margin-bottom:10px">
            <input id="co-rename-${cIdx}" type="text" maxlength="24" placeholder="Rename…" value="${this._esc(c.name)}"
              style="flex:1;font-size:13px;padding:5px 8px;background:var(--bg);border:1px solid var(--bg3);border-radius:6px;color:var(--text)">
            <button class="csr-toggle-btn" style="font-size:11px;white-space:nowrap" onclick="Companies.renameCompany(${cIdx})">Rename — ${App.formatMoney(100000)}</button>
          </div>`;
          // Insider intel
          const insLv = (c.upgrades && c.upgrades.insiderAccess) || 0;
          if (insLv > 0) {
            html += `<div class="company-insider-panel" style="margin-bottom:8px">
              <div style="font-weight:700;margin-bottom:4px">🔍 Insider Intel</div>`;
            c.stocks.forEach(s => {
              const tgt = this._playerStockTargets[s.symbol];
              if (tgt && tgt.stepsLeft > 0) {
                const dir = tgt.target > (s.price||1) ? 'up' : 'down';
                const pct = Math.abs((tgt.target-(s.price||1))/(s.price||1)*100);
                let hint = dir==='up' ? '📈 Buying pressure on ' : '📉 Selling pressure on ';
                hint += this._esc(s.symbol);
                if (insLv >= 2) hint += ' (~' + pct.toFixed(1) + '%)';
                if (insLv >= 3) hint += ' → target $' + App.formatMoney(tgt.target);
                html += `<div style="font-size:12px;padding:2px 0">${hint}</div>`;
              } else {
                html += `<div style="font-size:12px;color:var(--text-dim);padding:2px 0">${this._esc(s.symbol)}: market neutral</div>`;
              }
            });
            html += `</div>`;
          }
          // News org (entertainment)
          if ((c.industry||'tech') === 'entertainment') {
            const myOrg = this._getMyOrg(c.ticker);
            const orgEnabled = myOrg && myOrg.enabled;
            html += `<div class="company-manage-section news-org-section" style="margin-bottom:8px"><h3>📰 News Organization</h3>`;
            if (!orgEnabled) {
              html += `<button class="add-stock-btn" style="color:var(--accent);border-color:var(--accent)" onclick="Companies.enableNewsOrg(${cIdx})">Enable News Org — Free</button>`;
            } else {
              const rep = myOrg.reputation || 50;
              html += `<div style="font-size:12px;color:var(--text-dim);margin-bottom:8px">Reputation: <strong style="color:${rep>=50?'var(--green)':'var(--red)'}">${Math.round(rep)}/100</strong></div>
                <textarea id="news-post-input-${cIdx}" maxlength="120" placeholder="Write a headline…" style="width:100%;height:60px;background:var(--bg);border:1px solid var(--bg3);border-radius:6px;color:var(--text);padding:8px;font-size:13px;resize:none;box-sizing:border-box"></textarea>
                <button class="company-found-btn" style="margin-top:6px;padding:8px 20px" onclick="Companies.postNews(${cIdx})">📢 Publish</button>`;
            }
            html += `</div>`;
          }
          // Bank (finance main company)
          if ((c.industry||'tech') === 'finance' && typeof Banking !== 'undefined') {
            html += Banking.renderBankSetup(cIdx);
          }
          // Sell
          html += `<div class="company-sale-section" style="margin-bottom:8px">
            <div style="font-weight:700;margin-bottom:6px">💸 Sell Company</div>`;
          if (isListed) {
            html += `<div style="font-size:13px;color:var(--text-dim);margin-bottom:6px">Listed for ${App.formatMoney(listing.salePrice)}</div>
              <button class="csr-toggle-btn" style="color:var(--red);border-color:var(--red)" onclick="Companies.cancelSale('${c.ticker}')">Cancel Listing</button>`;
          } else {
            html += `<div style="display:flex;gap:6px;align-items:center">
              <input id="co-sale-price-${cIdx}" type="number" placeholder="Ask price ($)" style="flex:1;font-size:14px;padding:6px;background:var(--bg);border:1px solid var(--bg3);border-radius:6px;color:var(--text)">
              <button class="company-buy-btn" onclick="Companies.listForSale(${cIdx})">List</button>
            </div>`;
          }
          html += `</div>`;
          // Main / delete
          html += `<div style="display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap">
            <button class="csr-toggle-btn" style="${isMainCo?'color:var(--gold);border-color:var(--gold);font-weight:700':'font-size:12px'}" onclick="Companies.setMainCompany(${cIdx})">
              ${isMainCo ? '⭐ Main (tap to unset)' : '⭐ Set as Main'}
            </button>
            <button class="csr-toggle-btn" style="color:var(--red);border-color:var(--red);font-size:12px" onclick="Companies.deleteCompany(${cIdx})">🗑 Delete</button>
          </div>`;
          if (isMainCo) html += `<div style="font-size:11px;color:var(--gold);text-align:center;margin-top:4px">🔒 Protected from full bankruptcy</div>`;
        }

        html += `</div>`; // co-sub-content
      }
      html += `</div>`; // co-card
    });

    // Found a new company form (only if slots available)
    if (this._companies.length < this._companySlots) {
      html += `<div class="company-found-form">
        <div style="font-size:36px;text-align:center;margin-bottom:8px">&#x1F3E2;</div>
        <div style="font-weight:800;font-size:18px;text-align:center;margin-bottom:4px">Found a Company</div>
        <div class="company-found-cost">Cost: ${App.formatMoney(this.FOUND_COST)}</div>
        <input type="text" id="co-found-name" placeholder="Company Name (e.g. Retro Corp)" maxlength="32" style="font-size:16px">
        <input type="text" id="co-found-ticker" placeholder="Ticker (e.g. RETRO)" maxlength="5" style="text-transform:uppercase;font-size:16px">
        <div style="font-size:12px;color:var(--text-dim);margin:4px 0 2px">Industry</div>
        ${this._industrySelectHtml()}
        <div style="font-size:12px;color:var(--text-dim);margin:6px 0 2px">&#x1F3B2; Stock personality is randomly rolled on founding (60% Standard / 25% Extreme / 15% Penny)</div>
        <button class="company-found-btn" onclick="Companies.foundCompany()">Found Company — ${App.formatMoney(this.FOUND_COST)}</button>
      </div>`;
    }

    // Upgrade slot button (if < 3 slots)
    if (this._companySlots < 3) {
      const cost = this.SLOT_COSTS[this._companySlots];
      html += `<div class="company-upgrade-section">
        <button class="add-stock-btn" onclick="Companies.upgradeSlots()" style="border-color:var(--gold);color:var(--gold);margin-top:4px">
          &#x1F3D7; Unlock Company Slot #${this._companySlots + 1} — ${App.formatMoney(cost)}
        </button>
      </div>`;
    }

    // Portfolio — system stocks + player stocks
    const playerHoldings = Object.entries(this._holdings).filter(([, h]) => h.shares > 0);
    const systemHoldings = typeof Stocks !== 'undefined'
      ? Object.entries(Stocks.holdings).filter(([, h]) => h.shares > 0)
      : [];
    if (playerHoldings.length > 0 || systemHoldings.length > 0) {
      let totalValue = 0;
      let rows = '';

      systemHoldings.forEach(([sym, h]) => {
        const idx = Stocks.stocks.findIndex(s => s.symbol === sym);
        const price = idx >= 0 ? (Stocks.prices[idx] || 0) : 0;
        const value = price * h.shares;
        const pl = (price - (h.avgCost || 0)) * h.shares;
        totalValue += value;
        rows += `<div class="company-stock-row">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:4px">
              <span class="csr-sym">${this._esc(sym)}</span>
              <span style="font-size:10px;color:var(--text-dim);background:var(--bg3);border-radius:3px;padding:1px 4px">SYS</span>
            </div>
            <div style="font-size:12px;color:var(--text-dim)">${h.shares.toLocaleString(undefined,{maximumFractionDigits:4})} shares &bull; avg ${App.formatMoney(h.avgCost || 0)}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div class="csr-price">${App.formatMoney(value)}</div>
            <div style="font-size:12px;${pl >= 0 ? 'color:var(--green)' : 'color:var(--red)'}">${pl >= 0 ? '+' : ''}${App.formatMoney(pl)}</div>
          </div>
        </div>`;
      });

      playerHoldings.forEach(([sym, h]) => {
        const s = this._allPlayerStocks[sym];
        const price = s ? (s.price || 0) : 0;
        const value = price * h.shares;
        const pl = (price - (h.avgCost || 0)) * h.shares;
        totalValue += value;
        rows += `<div class="company-stock-row">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:4px">
              <span class="csr-sym">${this._esc(sym)}</span>
              <span style="font-size:10px;color:#bb86fc;background:rgba(155,89,182,0.15);border-radius:3px;padding:1px 4px">PLAYER</span>
            </div>
            <div style="font-size:12px;color:var(--text-dim)">${h.shares.toLocaleString(undefined,{maximumFractionDigits:4})} shares &bull; avg ${App.formatMoney(h.avgCost || 0)}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div class="csr-price">${App.formatMoney(value)}</div>
            <div style="font-size:12px;${pl >= 0 ? 'color:var(--green)' : 'color:var(--red)'}">${pl >= 0 ? '+' : ''}${App.formatMoney(pl)}</div>
          </div>
        </div>`;
      });

      html += `<div class="company-manage-section" style="margin-top:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h3 style="margin:0">&#x1F4BC; Portfolio</h3>
          <span style="font-size:13px;color:var(--gold);font-weight:700">${App.formatMoney(totalValue)}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">${rows}</div>
      </div>`;
    }

    // Fallback: new player with no companies and slot available
    if (!html) {
      html = `<div class="company-found-form">
        <div style="font-size:36px;text-align:center;margin-bottom:8px">&#x1F3E2;</div>
        <div style="font-weight:800;font-size:18px;text-align:center;margin-bottom:4px">Found a Company</div>
        <div class="company-found-cost">Cost: ${App.formatMoney(this.FOUND_COST)}</div>
        <input type="text" id="co-found-name" placeholder="Company Name (e.g. Retro Corp)" maxlength="32" style="font-size:16px">
        <input type="text" id="co-found-ticker" placeholder="Ticker (e.g. RETRO)" maxlength="5" style="text-transform:uppercase;font-size:16px">
        <div style="font-size:12px;color:var(--text-dim);margin:4px 0 2px">Industry</div>
        ${this._industrySelectHtml()}
        <div style="font-size:12px;color:var(--text-dim);margin:6px 0 2px">\u{1F3B2} Stock personality is randomly rolled on founding (60% Standard / 25% Extreme / 15% Penny)</div>
        <button class="company-found-btn" onclick="Companies.foundCompany()">Found Company — ${App.formatMoney(this.FOUND_COST)}</button>
      </div>`;
    }

    container.innerHTML = html;
    // Restore founding form values after re-render
    if (_savedName)     { const el = document.getElementById('co-found-name');     if (el) el.value = _savedName; }
    if (_savedTicker)   { const el = document.getElementById('co-found-ticker');   if (el) el.value = _savedTicker; }
    if (_savedIndustry) { const el = document.getElementById('co-found-industry'); if (el) el.value = _savedIndustry; }
  },

  _esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  _industrySelectHtml() {
    const opts = this.INDUSTRIES.map(ind =>
      `<option value="${ind.id}">${ind.label}</option>`
    ).join('');
    return `<select id="co-found-industry" style="font-size:15px;padding:8px;border-radius:8px;background:var(--bg2);color:var(--text);border:1px solid var(--bg3);width:100%">${opts}</select>`;
  },

  // Natural equilibrium is always $100 for standard/extreme.
  // Bull Propaganda raises the HARD CAP and mania frequency, NOT the equilibrium.
  // Penny: $5 reversion anchor; absolute hard cap $100.
  _getEffectiveBase(s) {
    const p = s.companyPersonality || 'standard';
    if (p === 'penny') return 5;
    return 100;
  },

  // Hard cap per personality × bull propaganda level
  //   Standard: $1K → $2K → $5K → $15K → $40K → $70K
  //   Extreme:  $1.5K → $3K → $7.5K → $22K → $60K → $100K
  _getHardCap(s) {
    const p = s.companyPersonality || 'standard';
    if (p === 'penny') return 100;
    const bullLv = Math.min((s.companyUpgrades || {}).bullBias || 0, 5);
    const CAPS = p === 'extreme'
      ? [1500, 3000, 7500, 22000, 60000, 100000]
      : [1000, 2000, 5000, 15000, 40000, 70000];
    return CAPS[bullLv];
  },

  // Returns 0.3–2.0 world price multiplier based on linked system stocks
  _getWorldPriceMult(industry) {
    const ind = this.INDUSTRIES.find(i => i.id === industry);
    if (!ind || !ind.stocks.length || typeof Stocks === 'undefined') return 1.0;
    let totalRatio = 0, count = 0;
    ind.stocks.forEach(sym => {
      const idx = Stocks.stocks.findIndex(s => s.symbol === sym);
      if (idx < 0) return;
      const base = Stocks.stocks[idx].basePrice;
      const price = Stocks.prices[idx];
      if (!base || !price) return;
      totalRatio += price / base;
      count++;
    });
    if (!count) return 1.0;
    // Linear: ratio=1 → 1.0; ratio=2 → 1.7; ratio<1 → below 1.0; clamp [0.3, 2.0]
    return Math.min(2.0, Math.max(0.3, 0.3 + (totalRatio / count) * 0.7));
  },

  // === SET INCOME SHARE ===
  setIncomeShare(cIdx, val) {
    const c = this._companies[cIdx];
    if (!c) return;
    c.incomeShare = Math.max(0, Math.min(100, parseInt(val, 10)));
    this._saveLocal();
    clearTimeout(this._incomeShareDebounce);
    this._incomeShareDebounce = setTimeout(() => this._pushToFirebase(), 800);
  },

  // === BUY PROPERTY ===
  buyProperty(cIdx, propKey) {
    const c = this._companies[cIdx];
    if (!c) return;
    const ind = c.industry || 'tech';
    const defs = this.COMPANY_PROPERTIES[ind] || [];
    const def = defs.find(d => d.key === propKey);
    if (!def) return;
    if (!c.properties) c.properties = [];
    if (c.properties.includes(propKey)) { alert('Already owned.'); return; }
    if (App.balance < def.cost) { alert('Need ' + App.formatMoney(def.cost) + ' to buy this.'); return; }
    App.addBalance(-def.cost);
    c.properties.push(propKey);
    this._saveLocal();
    this._pushToFirebase();
    App.save();
    this._triggerRender();
  },

  // === PASSIVE PROPERTY INCOME (runs on all clients every 5s via Stocks timer) ===
  tickPropertyIncome() {
    if (!this._companies.length) return;
    let totalIncome = 0;
    this._companies.forEach(c => {
      const shareToOwner = typeof c.incomeShare === 'number' ? c.incomeShare / 100 : 1;
      // Main company properties
      if (c.properties && c.properties.length) {
        const ind = c.industry || 'tech';
        const worldMult = this._getWorldPriceMult(ind);
        (this.COMPANY_PROPERTIES[ind] || []).forEach(def => {
          if (c.properties.includes(def.key)) totalIncome += def.income * worldMult * shareToOwner;
        });
      }
      // Sub-stock properties (each uses its own effective industry)
      (c.stocks || []).forEach((s, sIdx) => {
        if (sIdx === (c.mainIdx || 0)) return; // main stock uses c.properties above
        if (!s.properties || !s.properties.length) return;
        const sInd = s.industry || c.industry || 'tech';
        const wm = this._getWorldPriceMult(sInd);
        (this.COMPANY_PROPERTIES[sInd] || []).forEach(def => {
          if (s.properties.includes(def.key)) totalIncome += def.income * wm * shareToOwner;
        });
      });
    });
    if (totalIncome > 0) {
      App.addBalance(totalIncome);
      App.save();
    }
  },

  _toast(msg, color) {
    Toast.show(msg, color || '', 3500);
  },

  // === NEWS ORG ===

  // Helper: get a player's org for a given entityKey (ticker or symbol)
  _getMyOrg(entityKey) {
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    if (!myUid) return null;
    const userOrgs = this._newsOrgs[myUid];
    if (!userOrgs) return null;
    // New nested format: { [entityKey]: orgData }
    if (userOrgs[entityKey] && typeof userOrgs[entityKey] === 'object' && userOrgs[entityKey].enabled !== undefined) {
      return userOrgs[entityKey];
    }
    // Old flat format: { enabled, companyTicker, reputation }
    if (userOrgs.enabled && (userOrgs.companyTicker === entityKey || userOrgs.entityKey === entityKey)) {
      return userOrgs;
    }
    return null;
  },

  enableNewsOrg(cIdx) {
    const c = this._companies[cIdx];
    if (!c) return;
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) { alert('Must be online.'); return; }
    const myUid = Firebase.uid;
    const orgData = { enabled: true, entityKey: c.ticker, reputation: 50 };
    Firebase.setNewsOrg(myUid, c.ticker, orgData).then(() => {
      if (!this._newsOrgs[myUid]) this._newsOrgs[myUid] = {};
      this._newsOrgs[myUid][c.ticker] = orgData;
      this.render();
      Toast.show('\u{1F4F0} News Org enabled!', '#27ae60', 3000);
    });
  },

  enableSubStockNewsOrg(cIdx, sIdx) {
    const c = this._companies[cIdx];
    if (!c) return;
    const s = c.stocks[sIdx];
    if (!s) return;
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) { alert('Must be online.'); return; }
    const myUid = Firebase.uid;
    const orgData = { enabled: true, entityKey: s.symbol, reputation: 50 };
    Firebase.setNewsOrg(myUid, s.symbol, orgData).then(() => {
      if (!this._newsOrgs[myUid]) this._newsOrgs[myUid] = {};
      this._newsOrgs[myUid][s.symbol] = orgData;
      this._triggerRender();
      Toast.show('\u{1F4F0} News Org enabled for ' + s.symbol + '!', '#27ae60', 3000);
    });
  },

  postNews(cIdx) {
    const c = this._companies[cIdx];
    if (!c) return;
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) return;
    const myUid = Firebase.uid;
    const myOrg = this._getMyOrg(c.ticker);
    if (!myOrg || !myOrg.enabled) { Toast.show('Enable News Org first', '#ff5252'); return; }
    const input = document.getElementById('news-post-input-' + cIdx);
    if (!input) return;
    const text = input.value.trim().slice(0, 120);
    if (!text) { Toast.show('Enter a headline', '#ff5252'); return; }
    Firebase.postNewsArticle(myUid, {
      text, ts: Date.now(), upvotes: 0, downvotes: 0,
      authorName: typeof Settings !== 'undefined' ? Settings.profile.name : 'Player',
      entityKey: c.ticker,
    }).then(() => {
      input.value = '';
      Toast.show('\u{1F4F0} Published: ' + text.slice(0, 40), '#27ae60', 3000);
    });
  },

  postSubStockNews(cIdx, sIdx) {
    const c = this._companies[cIdx];
    if (!c) return;
    const s = c.stocks[sIdx];
    if (!s) return;
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) return;
    const myUid = Firebase.uid;
    const myOrg = this._getMyOrg(s.symbol);
    if (!myOrg || !myOrg.enabled) { Toast.show('Enable News Org first', '#ff5252'); return; }
    const input = document.getElementById('news-post-input-sub-' + cIdx + '-' + sIdx);
    if (!input) return;
    const text = input.value.trim().slice(0, 120);
    if (!text) { Toast.show('Enter a headline', '#ff5252'); return; }
    Firebase.postNewsArticle(myUid, {
      text, ts: Date.now(), upvotes: 0, downvotes: 0,
      authorName: typeof Settings !== 'undefined' ? Settings.profile.name : 'Player',
      entityKey: s.symbol,
    }).then(() => {
      input.value = '';
      Toast.show('\u{1F4F0} Published: ' + text.slice(0, 40), '#27ae60', 3000);
    });
  },

  voteNews(ownerUid, postId, dir) {
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) return;
    Firebase.voteNewsPost(ownerUid, postId, dir);
    // Optimistic UI update
    if (!this._newsPosts[ownerUid]) this._newsPosts[ownerUid] = {};
    if (!this._newsPosts[ownerUid][postId]) return;
    const post = this._newsPosts[ownerUid][postId];
    if (dir === 'up') post.upvotes = (post.upvotes || 0) + 1;
    else post.downvotes = (post.downvotes || 0) + 1;
    this._triggerRender();
  },

  // Returns flat list of { uid, entityKey, org } for all enabled news orgs.
  // Handles old format (flat { enabled, companyTicker }), new format (nested { [key]: orgData }),
  // AND mixed (old flat fields coexisting with new nested keys after partial migration).
  _flatActiveOrgs() {
    const result = [];
    const seen = new Set();
    // Fields that belong to the old flat org object — not entity keys
    const OLD_ORG_FIELDS = new Set(['enabled', 'companyTicker', 'entityKey', 'reputation']);
    Object.entries(this._newsOrgs).forEach(([uid, val]) => {
      if (!val || typeof val !== 'object') return;
      // Old flat format: val has boolean `enabled` at root level
      if (val.enabled === true) {
        const ek = val.companyTicker || val.entityKey || uid;
        const key = uid + ':' + ek;
        if (!seen.has(key)) { seen.add(key); result.push({ uid, entityKey: ek, org: val }); }
      }
      // New nested format: sub-keys that are NOT old flat-format field names
      Object.entries(val).forEach(([entityKey, org]) => {
        if (OLD_ORG_FIELDS.has(entityKey)) return; // skip old flat fields
        if (org && org.enabled) {
          const key = uid + ':' + entityKey;
          if (!seen.has(key)) { seen.add(key); result.push({ uid, entityKey, org }); }
        }
      });
    });
    return result;
  },

  _renderNewsTab(container) {
    let html = '';
    const activeOrgs = this._flatActiveOrgs();
    if (activeOrgs.length === 0) {
      container.innerHTML = `<div style="text-align:center;color:var(--text-dim);padding:40px 16px">
        <div style="font-size:48px;margin-bottom:12px">\u{1F4F0}</div>
        <div style="font-weight:700;margin-bottom:6px">No News Organizations</div>
        <div style="font-size:13px">Entertainment companies/stocks can enable a news org in My Company.</div>
      </div>`;
      return;
    }
    activeOrgs.forEach(({ uid, entityKey, org }) => {
      const posts = this._newsPosts[uid] || {};
      // Show only posts for this entityKey, fall back to all posts if no entityKey on post
      const postList = Object.entries(posts)
        .filter(([, p]) => !p.entityKey || p.entityKey === entityKey)
        .sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0));
      postList.forEach(([postId, post]) => {
        const net = (post.upvotes || 0) - (post.downvotes || 0);
        const repColor = net > 0 ? '#27ae60' : net < 0 ? '#c0392b' : 'var(--text-dim)';
        const age = Date.now() - (post.ts || 0);
        const ageStr = age < 60000 ? 'just now' : age < 3600000 ? Math.floor(age / 60000) + 'm ago' : Math.floor(age / 3600000) + 'h ago';
        html += `<div class="company-card" style="border-color:var(--accent)">
          <div class="company-card-header">
            <div><span class="company-card-sym">\u{1F4F0}</span> <span>${this._esc(entityKey)}</span></div>
            <div style="font-size:11px;color:var(--text-dim)">${ageStr}</div>
          </div>
          <div class="company-card-name" style="font-size:14px;line-height:1.4">${this._esc(post.text)}</div>
          <div class="company-card-owner" style="font-size:11px;margin-bottom:8px">by ${this._esc(post.authorName || entityKey)} &bull; Rep: ${org.reputation || 50}</div>
          <div class="company-card-actions" style="justify-content:space-between">
            <div>
              <button class="company-buy-btn" style="background:#27ae60;padding:4px 12px;font-size:13px" onclick="Companies.voteNews('${uid}','${postId}','up')">\u{1F44D} ${post.upvotes || 0}</button>
              <button class="company-sell-btn" style="padding:4px 12px;font-size:13px" onclick="Companies.voteNews('${uid}','${postId}','down')">\u{1F44E} ${post.downvotes || 0}</button>
            </div>
            <div style="font-size:12px;color:${repColor};font-weight:700">${net > 0 ? '+' : ''}${net} net</div>
          </div>
        </div>`;
      });
    });
    if (!html) html = `<div style="text-align:center;color:var(--text-dim);padding:32px">No posts yet.</div>`;
    container.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;padding-top:8px">${html}</div>`;
  },

  _renderNewsFeed(html) {
    const activeOrgs = this._flatActiveOrgs();
    if (activeOrgs.length === 0) return html;
    html += '<div class="player-stocks-market-header" style="margin-top:16px">\u{1F4F0} News Feed</div>';
    html += '<div style="display:flex;flex-direction:column;gap:10px">';
    activeOrgs.forEach(({ uid, entityKey, org }) => {
      const posts = this._newsPosts[uid] || {};
      const postList = Object.entries(posts)
        .filter(([, p]) => !p.entityKey || p.entityKey === entityKey)
        .sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0));
      if (postList.length === 0) return;
      const [postId, latest] = postList[0];
      const net = (latest.upvotes || 0) - (latest.downvotes || 0);
      const repColor = net > 0 ? '#27ae60' : net < 0 ? '#c0392b' : 'var(--text-dim)';
      html += `<div class="company-card" style="border-color:var(--accent)">
        <div class="company-card-header">
          <div><span class="company-card-sym">\u{1F4F0}</span> <span>${this._esc(entityKey)}</span></div>
          <div style="font-size:11px;color:${repColor}">&#x2764; ${latest.upvotes || 0} &nbsp; \u{1F44E} ${latest.downvotes || 0}</div>
        </div>
        <div class="company-card-name" style="font-size:13px">${this._esc(latest.text)}</div>
        <div class="company-card-owner" style="font-size:11px">by ${this._esc(latest.authorName || entityKey)} &bull; Rep: ${org.reputation || 50}</div>
        <div class="company-card-actions">
          <button class="company-buy-btn" style="background:#27ae60;padding:4px 12px;font-size:13px" onclick="Companies.voteNews('${uid}','${postId}','up')">&#x1F44D; Like</button>
          <button class="company-sell-btn" style="padding:4px 12px;font-size:13px" onclick="Companies.voteNews('${uid}','${postId}','down')">&#x1F44E; Dislike</button>
        </div>
      </div>`;
    });
    html += '</div>';
    return html;
  },

  // === M&A HELPERS ===

  _countTotalPlayerStocks() {
    return this._companies.reduce((sum, c) => sum + (c.stocks || []).length, 0);
  },

  // === M&A ACQUISITION OFFERS ===

  promptAcquisitionOffer(sym) {
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) { alert('Must be online.'); return; }
    const s = this._allPlayerStocks[sym];
    if (!s) return;

    // Eligible recipient companies: has M&A upgrade + has room for a stock (< 3)
    const eligible = this._companies.filter(c => (c.upgrades?.acquisitionLicense || 0) >= 1 && (c.stocks || []).length < this.MAX_STOCKS);
    if (eligible.length === 0) { alert('No eligible company — buy the M&A Division upgrade and ensure a company has fewer than 3 stocks.'); return; }

    const totalStocks = this._countTotalPlayerStocks();
    if (totalStocks >= 7) { alert('Portfolio cap reached (7 stocks max). Sell or remove a stock to make room.'); return; }

    const companyOptions = eligible.map(c => `<option value="${this._esc(c.ticker)}">${this._esc(c.name)} (${c.stocks.length}/3 stocks)</option>`).join('');
    const html = `<div class="stock-trade-modal">
      <div class="stock-trade-title">&#x1F91D; Acquire ${this._esc(sym)}</div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:8px">Sub-stock of ${this._esc(s.companyName || '')} &bull; Price: ${App.formatMoney(s.price)}/share</div>
      <div style="font-size:13px;margin-bottom:6px">Receive into company:</div>
      <select id="acq-recipient" style="width:100%;font-size:13px;background:var(--bg);border:1px solid var(--bg3);border-radius:6px;color:var(--text);padding:7px;margin-bottom:10px">${companyOptions}</select>
      <div style="font-size:13px;margin-bottom:6px">Offer amount (total cash to seller):</div>
      <input type="number" id="acq-offer-amt" placeholder="Offer amount $" style="width:100%;font-size:14px;background:var(--bg);border:1px solid var(--bg3);border-radius:6px;color:var(--text);padding:8px;margin-bottom:10px">
      <div style="display:flex;gap:8px">
        <button class="stock-buy-btn" style="flex:1" onclick="Companies._sendAcquisitionOffer('${sym}')">Send Offer</button>
        <button class="stock-trade-cancel" onclick="Companies._closeStockOfferModal()">Cancel</button>
      </div>
    </div>`;

    let modal = document.getElementById('stock-offer-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'stock-offer-modal';
      modal.className = 'stock-modal-overlay';
      document.getElementById('app').appendChild(modal);
    }
    modal.innerHTML = html;
    modal.classList.remove('hidden');
  },

  _sendAcquisitionOffer(sym) {
    const amountInput = document.getElementById('acq-offer-amt');
    const recipientSelect = document.getElementById('acq-recipient');
    if (!amountInput || !recipientSelect) return;
    const amount = parseFloat(amountInput.value);
    if (!amount || amount <= 0) { Toast.show('Enter a valid amount', '#ff5252'); return; }
    if (amount > App.balance) { Toast.show('Not enough funds', '#ff5252'); return; }

    const recipientCompanyTicker = recipientSelect.value;
    const recipientComp = this._companies.find(c => c.ticker === recipientCompanyTicker);
    if (!recipientComp) { Toast.show('Company not found', '#ff5252'); return; }
    if ((recipientComp.stocks || []).length >= this.MAX_STOCKS) { Toast.show('That company is at max stocks (3)', '#ff5252'); return; }
    if (this._countTotalPlayerStocks() >= 7) { Toast.show('Portfolio cap reached (7 stocks max)', '#ff5252'); return; }

    const myName = typeof Settings !== 'undefined' ? Settings.profile.name : 'Player';
    const offerData = {
      amount,
      offererUid: Firebase.uid,
      offererName: myName,
      offererCompanyTicker: recipientCompanyTicker,
      type: 'acquisition',
      recipientCompanyTicker,
    };
    const s = this._allPlayerStocks[sym];
    if (!s) return;

    Firebase.postStockOffer(sym, Firebase.uid, offerData).then(() => {
      this._closeStockOfferModal();
      Toast.show('\u{1F91D} Acquisition offer sent for ' + sym + ' — ' + App.formatMoney(amount), '#82b1ff', 3000);
    });
  },

  _applyAcquisitionTransfer(transferId, data) {
    if (!data || !data.stock) return;
    const stock = data.stock;
    const recipientTicker = data.recipientCompanyTicker;

    // Find recipient company — prefer the requested one, fallback to any with space
    let targetComp = this._companies.find(c => c.ticker === recipientTicker && (c.stocks || []).length < this.MAX_STOCKS);
    if (!targetComp) targetComp = this._companies.find(c => (c.stocks || []).length < this.MAX_STOCKS);
    if (!targetComp) {
      Toast.show('\u{26A0} Acquisition transfer received but no company slot available!', '#ff5252', 6000);
      Firebase.removeAcquisitionTransfer(Firebase.uid, transferId).catch(() => {});
      return;
    }

    // Add the stock to the target company
    targetComp.stocks.push({ ...stock });
    this._saveLocal();
    this._pushToFirebase();
    App.save();
    Firebase.removeAcquisitionTransfer(Firebase.uid, transferId).catch(() => {});
    this._triggerRender();
    Toast.show('\u{1F91D} Acquired ' + stock.symbol + ' \u2192 added to ' + targetComp.name + '!', '#82b1ff', 5000);
  },

  // === SUB-STOCK INDUSTRY REBRAND ===

  promptRebrandIndustry(cIdx, sIdx) {
    const c = this._companies[cIdx];
    if (!c) return;
    const s = c.stocks[sIdx];
    if (!s) return;
    const isMain = sIdx === (c.mainIdx || 0);
    if (isMain) { Toast.show('Cannot rebrand main stock — change company industry instead', '#ff5252', 3000); return; }

    const COST = 500_000;
    const currentInd = s.industry || c.industry || 'tech';
    const opts = this.INDUSTRIES.map(ind =>
      `<option value="${ind.id}" ${ind.id === currentInd ? 'selected' : ''}>${ind.label}</option>`
    ).join('');

    const html = `<div class="stock-trade-modal">
      <div class="stock-trade-title">&#x1F3ED; Rebrand ${this._esc(s.symbol)} Industry</div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px">Change this sub-stock to a different industry.<br>Cost: <b>${App.formatMoney(COST)}</b></div>
      <select id="rebrand-industry-select" style="width:100%;font-size:14px;background:var(--bg);border:1px solid var(--bg3);border-radius:6px;color:var(--text);padding:8px;margin-bottom:12px">${opts}</select>
      <div style="display:flex;gap:8px">
        <button class="stock-buy-btn" style="flex:1" onclick="Companies.rebrandSubStockIndustry(${cIdx},${sIdx})">Rebrand — ${App.formatMoney(COST)}</button>
        <button class="stock-trade-cancel" onclick="Companies._closeStockOfferModal()">Cancel</button>
      </div>
    </div>`;

    let modal = document.getElementById('stock-offer-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'stock-offer-modal';
      modal.className = 'stock-modal-overlay';
      document.getElementById('app').appendChild(modal);
    }
    modal.innerHTML = html;
    modal.classList.remove('hidden');
  },

  rebrandSubStockIndustry(cIdx, sIdx) {
    const COST = 500_000;
    const sel = document.getElementById('rebrand-industry-select');
    if (!sel) return;
    const newInd = sel.value;
    const c = this._companies[cIdx];
    if (!c) return;
    const s = c.stocks[sIdx];
    if (!s) return;

    if (App.balance < COST) { Toast.show('Not enough funds — need ' + App.formatMoney(COST), '#ff5252', 3000); return; }
    const currentInd = s.industry || c.industry || 'tech';
    if (newInd === currentInd) { Toast.show('That is already the current industry', '#ff5252', 2500); return; }

    App.addBalance(-COST);
    s.industry = newInd;
    const indDef = this.INDUSTRIES.find(i => i.id === newInd);
    const label = indDef ? indDef.label : newInd;
    this._saveLocal();
    this._pushToFirebase();
    App.save();
    this._closeStockOfferModal();
    this._triggerRender();
    Toast.show('\u{1F3ED} ' + s.symbol + ' rebranded to ' + label + '!', '#82b1ff', 3000);
  },

  // === STOCK TRANSFER (company-to-company offers) ===

  promptStockOffer(sym) {
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) { alert('Must be online.'); return; }
    const s = this._allPlayerStocks[sym];
    if (!s) return;
    const myComp = this._companies.find(c => c.stocks && c.stocks.some(st => st.symbol === sym));
    if (myComp) { alert("You already own this stock's company."); return; }
    const price = s.price || 100;
    const html = `<div class="stock-trade-modal">
      <div class="stock-trade-title">\u{1F4BC} Make Offer on ${sym}</div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px">Company: ${this._esc(s.companyName || sym)} &bull; Current price: ${App.formatMoney(price)}/share</div>
      <div style="font-size:13px;margin-bottom:8px">Offer amount to buy this stock from its owner:</div>
      <input type="number" id="stock-offer-amt" placeholder="Offer amount $" style="width:100%;font-size:14px;background:var(--bg);border:1px solid var(--bg3);border-radius:6px;color:var(--text);padding:8px;margin-bottom:10px">
      <div style="display:flex;gap:8px">
        <button class="stock-buy-btn" style="flex:1" onclick="Companies._sendStockOffer('${sym}')">Send Offer</button>
        <button class="stock-trade-cancel" onclick="Companies._closeStockOfferModal()">Cancel</button>
      </div>
    </div>`;
    let modal = document.getElementById('stock-offer-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'stock-offer-modal';
      modal.className = 'stock-modal-overlay';
      document.getElementById('app').appendChild(modal);
    }
    modal.innerHTML = html;
    modal.classList.remove('hidden');
  },

  _closeStockOfferModal() {
    const modal = document.getElementById('stock-offer-modal');
    if (modal) modal.classList.add('hidden');
  },

  _sendStockOffer(sym) {
    const input = document.getElementById('stock-offer-amt');
    if (!input) return;
    const amount = parseFloat(input.value);
    if (!amount || amount <= 0) { Toast.show('Enter a valid amount', '#ff5252'); return; }
    const myComp = this._companies[0];
    if (!myComp) { Toast.show('You need a company to make offers', '#ff5252'); return; }
    Firebase.postStockOffer(sym, Firebase.uid, {
      offererUid: Firebase.uid,
      offererName: typeof Settings !== 'undefined' ? Settings.profile.name : 'Player',
      offererCompanyTicker: myComp.ticker,
      amount,
      ts: Date.now(),
    }).then(() => {
      this._closeStockOfferModal();
      Toast.show('\u{1F4EC} Offer sent for ' + sym + ' — ' + App.formatMoney(amount), '#9945ff', 3000);
    });
  },

  acceptStockOffer(sym, offererUid) {
    const offer = this._stockOffers[sym]?.[offererUid];
    if (!offer) return;
    const myComp = this._companies.find(c => c.stocks && c.stocks.some(s => s.symbol === sym));
    if (!myComp) { Toast.show('You no longer own this stock', '#ff5252'); return; }
    // Grab the stock object before removing (needed for acquisition transfer)
    const stockObj = myComp.stocks.find(s => s.symbol === sym);
    // Remove stock from my company
    myComp.stocks = myComp.stocks.filter(s => s.symbol !== sym);
    if ((myComp.mainIdx || 0) >= myComp.stocks.length) myComp.mainIdx = 0;
    App.addBalance(offer.amount);
    this._saveLocal();
    this._pushToFirebase();
    Firebase.removeStockOffer(sym, offererUid).catch(() => {});
    Firebase.removeStockOffer(sym, Firebase.uid).catch(() => {});
    App.save();
    this.render();
    if (offer.type === 'acquisition' && offererUid && stockObj) {
      // Send the stock directly to the buyer's company via Firebase transfer
      Firebase.sendAcquisitionTransfer(offererUid, {
        stock: stockObj,
        recipientCompanyTicker: offer.recipientCompanyTicker || '',
        sellerName: typeof Settings !== 'undefined' ? Settings.profile.name : 'Player',
        sym,
      }).catch(() => {});
      Toast.show('\u{1F91D} Acquisition accepted! ' + sym + ' transferred to ' + (offer.offererName || 'buyer') + ' for ' + App.formatMoney(offer.amount) + '!', '#82b1ff', 5000);
    } else {
      Toast.show('\u{1F4B0} Sold ' + sym + ' to ' + (offer.offererName || 'buyer') + ' for ' + App.formatMoney(offer.amount) + '!', '#27ae60', 5000);
    }
  },

  declineStockOffer(sym, offererUid) {
    Firebase.removeStockOffer(sym, offererUid).catch(() => {});
    Toast.show('Offer declined', '#ff5252', 2000);
  },

  // === SUB-STOCK TRANSFER ===
  _transferSrc: null,  // { cIdx, sIdx }

  openTransferModal(cIdx, sIdx) {
    const src = this._companies[cIdx];
    if (!src) return;
    const sub = src.stocks[sIdx];
    if (!sub || sIdx === (src.mainIdx || 0)) {
      alert('Cannot transfer the main stock.');
      return;
    }
    if (this._companies.length < 2) {
      alert('You need at least 2 companies to transfer between.');
      return;
    }
    this._transferSrc = { cIdx, sIdx };

    let modal = document.getElementById('transfer-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'transfer-modal';
      modal.className = 'modal-overlay hidden';
      modal.innerHTML = `
        <div class="modal-box">
          <div class="modal-title">↔️ Transfer Sub-Stock</div>
          <p id="transfer-sub-name" style="margin:10px 0;font-size:14px;color:var(--text-dim)"></p>
          <div id="transfer-dest-list" style="display:flex;flex-direction:column;gap:8px;margin:12px 0"></div>
          <button class="csr-toggle-btn" style="width:100%;margin-top:4px" onclick="Companies.closeTransferModal()">Cancel</button>
        </div>`;
      document.getElementById('app').appendChild(modal);
    }

    document.getElementById('transfer-sub-name').textContent = 'Move "' + sub.name + '" (' + sub.symbol + ') to:';
    const list = document.getElementById('transfer-dest-list');
    list.innerHTML = '';
    this._companies.forEach((co, i) => {
      if (i === cIdx) return;
      const btn = document.createElement('button');
      btn.className = 'transfer-dest-btn';
      btn.textContent = (co.icon || '🏢') + ' ' + co.name + ' (' + co.ticker + ')';
      btn.onclick = () => Companies.confirmTransfer(i);
      list.appendChild(btn);
    });

    modal.classList.remove('hidden');
  },

  confirmTransfer(destIdx) {
    const src = this._transferSrc;
    if (!src) return;
    const { cIdx, sIdx } = src;
    const srcCo = this._companies[cIdx];
    const destCo = this._companies[destIdx];
    if (!srcCo || !destCo) return;
    if (sIdx === (srcCo.mainIdx || 0)) { alert('Cannot transfer the main stock.'); return; }

    const [sub] = srcCo.stocks.splice(sIdx, 1);
    // Fix mainIdx if needed
    if ((srcCo.mainIdx || 0) >= srcCo.stocks.length) srcCo.mainIdx = 0;
    destCo.stocks.push(sub);

    this._saveLocal();
    this._pushToFirebase();
    App.save();
    this.closeTransferModal();
    this._activeSubStock = null;
    this._triggerRender();
    Toast.show('↔️ ' + sub.symbol + ' transferred to ' + destCo.name + '!', 'var(--green)', 3000);
  },

  closeTransferModal() {
    this._transferSrc = null;
    const modal = document.getElementById('transfer-modal');
    if (modal) modal.classList.add('hidden');
  },

  _checkMonopolyThreshold() {
    if (this._companies.length < 7 || this._monopolyTriggered) return;
    this._monopolyTriggered = true;
    const playerName = typeof Settings !== 'undefined' ? Settings.profile.name : 'A player';
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.pushSystemAnnouncement(
        '\u{1F3DB}\uFE0F GOVERNMENT INTERVENTION: ' + playerName + ' has been found guilty of monopolistic practices!'
      );
    }
    const tax = Math.floor(App.balance * 0.80);
    App.addBalance(-tax);
    Toast.show('\u{1F6A8} MONOPOLY BUST! Government seized ' + App.formatMoney(tax) + ' (80% tax)!', '#c0392b', 8000);
    // Force-remove 4 random non-main companies
    const nonMain = this._companies.filter(c => !this.isMainCompany(c.ticker));
    const toRemove = nonMain.sort(() => Math.random() - 0.5).slice(0, Math.min(4, nonMain.length));
    toRemove.forEach(c => {
      const idx = this._companies.indexOf(c);
      if (idx >= 0) this._companies.splice(idx, 1);
    });
    this._saveLocal();
    this._pushToFirebase();
    this._triggerRender();
    // Reset so it can fire again if they re-acquire 7+
    setTimeout(() => { this._monopolyTriggered = false; }, 5000);
  },
};
