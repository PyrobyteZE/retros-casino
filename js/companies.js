// ===== Player-Owned Companies =====
const Companies = {
  // === CONSTANTS ===
  FOUND_COST:     1_000_000,
  STOCK2_COST:      500_000,
  STOCK3_COST:    1_000_000,
  MAX_STOCKS: 3,
  MAX_COMPANIES_HARD: 10,
  SLOT_COSTS: [0, 5_000_000, 15_000_000], // cost to unlock slot 2 then 3

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
  ],

  // === STATE ===
  _companies: [],          // [{ name, ticker, industry, foundedAt, stocks:[{symbol,name,type,price,vol,basePrice}], mainIdx }]
  _companySlots: 1,        // number of slots unlocked (1–3); founding requires a free slot
  _allPlayerStocks: {},    // { [symbol]: { ownerUid, ownerName, name, symbol, type, price, history:[], vol, basePrice, companyTicker, companyName, companyStocks, companyMainIdx, companyFoundedAt, companyIndustry } }
  _holdings: {},           // { [symbol]: { shares, avgCost } }
  _playerStockTargets: {}, // { [symbol]: { target, stepsLeft } }
  _playerManiaCooldowns: {},// { [symbol]: timestamp } — prevent mania stacking
  _bankruptCompanies: {},  // { [ticker]: { ticker, name, debtCost, bankruptAt, originalOwnerUid, originalOwnerName, stocks, mainIdx, foundedAt } }
  _companyListings: {},    // { [ticker]: { ticker, name, company, salePrice, ownerUid, ownerName, listedAt } }
  _processedBankrupt: null,// Set<string> of tickers already handled locally
  _scandals: {},           // { [symbol]: { text, ownerUid, firedAt, suppressed } }
  _scandalCooldowns: {},   // { [symbol]: timestamp } — prevent spam
  _competitors: {},        // { [theirUid]: { name, ticker, setAt } }
  activeTab: 'browse',

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
      Firebase.listenSabotageNotifications(notif => this._onSabotageNotification(notif));
      Firebase.listenSaleReceipts(Firebase.uid, receipt => {
        App.addBalance(receipt.amount);
        App.save();
        Toast.show('\u{1F3E2} Company sold! +' + App.formatMoney(receipt.amount) + ' received.', 'var(--green-dark)', 5000);
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
      if (d.holdings) this._holdings = d.holdings;
    } catch (e) {}
  },

  _saveLocal() {
    localStorage.setItem('retros_companies', JSON.stringify({
      companies: this._companies,
      companySlots: this._companySlots,
      holdings: this._holdings,
    }));
  },

  getSaveData() {
    return { companies: this._companies, companySlots: this._companySlots, holdings: this._holdings };
  },

  loadSaveData(data) {
    if (!data) return;
    if (data.companies && Array.isArray(data.companies)) {
      this._companies = data.companies;
    } else if (data.company) {
      this._companies = [data.company]; // migration
    }
    if (data.companySlots) this._companySlots = Math.max(1, data.companySlots);
    if (data.holdings) this._holdings = data.holdings;
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
            companyIndustry: company.industry || 'tech',
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
    const userTyping = focusedEl && (focusedEl.tagName === 'INPUT' || focusedEl.tagName === 'TEXTAREA');
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

      if (t && t.stepsLeft > 0) {
        // Admin / trade-influence gradual target
        s.price = Math.max(0.01, s.price + (t.target - s.price) / t.stepsLeft);
        t.stepsLeft--;
        if (t.stepsLeft <= 0) delete this._playerStockTargets[sym];
      } else {
        const base = s.basePrice || 100;
        const vol = s.vol || 0.05;
        const ratio = s.price / base;

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
        if (bullLv > 0) delta += s.price * bullLv * 0.001; // +0.1–0.5%/tick

        // --- Hard price cap: if price exceeds 20× base, force it back down ---
        if (ratio > 20) {
          this._playerStockTargets[sym] = { target: base * 12, stepsLeft: 8 };
          this._playerManiaCooldowns[sym] = Date.now(); // reset cooldown so no new mania immediately
          s.price = Math.max(0.01, s.price + delta);
          if (upg.resilience > 0) { const floor = base * 0.05 * upg.resilience; if (s.price < floor) s.price = floor; }
          updates[sym] = s.price;
          continue;
        }

        // --- Mania event: rare explosive spike (cooldown prevents stacking) ---
        const maniaCooldownOk = (Date.now() - (this._playerManiaCooldowns[sym] || 0)) > 120000;
        if (maniaCooldownOk && Math.random() < 0.002) {
          const mult = 3 + Math.random() * 8; // 3x to 11x spike
          this._playerStockTargets[sym] = { target: s.price * mult, stepsLeft: 5, isMania: true };
          this._playerManiaCooldowns[sym] = Date.now();
          const pctUp = Math.round((mult - 1) * 100);
          const msg = '\u{1F680} MANIA: ' + sym + ' (\u200B' + (s.companyName || '') + ') \u2014 buying frenzy! +' + pctUp + '%!';
          if (typeof Stocks !== 'undefined') Stocks._addNews(msg, true);
          if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushStockNews(msg, true);
        }

        // --- Mean reversion: scales aggressively at extreme prices ---
        const revStr = ratio > 5 ? 0.025 : 0.005;
        delta -= s.price * (ratio - 1) * revStr;

        // --- High-price crash risk (escalates at very high ratios) ---
        if (ratio > 2.5) {
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
          const floor = base * 0.05 * resLv; // lv1=5% of base … lv3=15%
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
        // $1000 reinvested per tick → +0.001% price boost (micro but real)
        const boostPct = reinvestedIncome * 0.00001;
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
      case 'adjust':
        if (this._allPlayerStocks[cmd.sym])
          this._playerStockTargets[cmd.sym] = { target: Math.max(0.01, this._allPlayerStocks[cmd.sym].price * cmd.mult), stepsLeft: 15 };
        break;
      case 'set':
        if (this._allPlayerStocks[cmd.sym])
          this._playerStockTargets[cmd.sym] = { target: Math.max(0.01, cmd.target), stepsLeft: 15 };
        break;
      case 'crash':
        for (const sym in this._allPlayerStocks)
          this._playerStockTargets[sym] = { target: Math.max(0.01, this._allPlayerStocks[sym].price * 0.5), stepsLeft: 20 };
        break;
      case 'boom':
        for (const sym in this._allPlayerStocks)
          this._playerStockTargets[sym] = { target: this._allPlayerStocks[sym].price * 2, stepsLeft: 20 };
        break;
    }
  },

  // === BANKRUPTCY ===
  _declareBankruptcy(sym) {
    const s = this._allPlayerStocks[sym];
    if (!s || s._bankruptDeclared) return;
    s._bankruptDeclared = true;

    const ownerUid = s.ownerUid;
    const ticker = s.companyTicker || sym;
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
    // Clear processed flag so future bankruptcies on this ticker are handled correctly
    if (this._processedBankrupt) this._processedBankrupt.delete(ticker);
    this._companies.push(company);
    this._saveLocal();
    this._pushToFirebase();
    if (typeof Firebase !== 'undefined') Firebase.bailOutCompany(ticker);
    App.save();
    this._triggerRender();
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
      const entry = { name: theirName, ticker: theirTicker, setAt: Date.now() };
      this._competitors[theirUid] = entry;
      if (typeof Firebase !== 'undefined') Firebase.pushCompetitor(theirUid, entry);
      this._toast('\u{1F3AF} Marked as competitor: ' + this._esc(theirName));
    }
    this._triggerRender();
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
      ownerName: typeof Settings !== 'undefined' ? Settings.profile.name : 'Player',
      foundedAt: Date.now(),
      stocks: [{ symbol: ticker, name: name + ' Stock', type: 'private', price: 100, vol: 0.05, basePrice: 100 }],
      mainIdx: 0,
      upgrades: {},
    };
    this._companies.push(newCompany);
    this._saveLocal();
    this._pushToFirebase();
    this.render();
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
    c.stocks.push({ symbol: sym, name: sName, type: 'private', price: 100, vol: 0.05, basePrice: 100 });
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
    if (!s) return;
    const qtyStr = prompt('Buy ' + symbol + ' @ $' + s.price.toFixed(2) + '\nHow many shares?');
    if (!qtyStr) return;
    const qty = parseInt(qtyStr);
    if (isNaN(qty) || qty <= 0) return;
    const total = qty * s.price;
    if (App.balance < total) { alert('Not enough funds.'); return; }
    if (typeof Settings !== 'undefined' && Settings.shouldConfirmBet(total)) {
      if (!confirm('Buy ' + qty + ' shares of ' + symbol + ' for ' + App.formatMoney(total) + '?')) return;
    }
    App.balance -= total;
    App.updateBalance();
    if (!this._holdings[symbol]) this._holdings[symbol] = { shares: 0, avgCost: 0 };
    const h = this._holdings[symbol];
    const prev = h.shares * h.avgCost;
    h.shares += qty;
    h.avgCost = (prev + total) / h.shares;
    const impactPct = this._calcPlayerTradeImpact(s, total);
    if (impactPct >= 0.0005) {
      this._playerStockTargets[symbol] = { target: Math.max(0.01, s.price * (1 + impactPct)), stepsLeft: 8 };
      if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushTradeInfluence(symbol, 1, impactPct);
    }
    this._saveLocal();
    this._toast('\u2705 Bought ' + qty + 'x ' + symbol);
    this._triggerRender();
  },

  promptSell(symbol) {
    const s = this._allPlayerStocks[symbol];
    if (!s) return;
    const h = this._holdings[symbol];
    if (!h || h.shares <= 0) { alert("You don't own any " + symbol + " shares."); return; }
    const qtyStr = prompt('Sell ' + symbol + ' @ $' + s.price.toFixed(2) + '\nYou own ' + h.shares + ' shares. How many to sell?');
    if (!qtyStr) return;
    const qty = Math.min(parseInt(qtyStr), h.shares);
    if (isNaN(qty) || qty <= 0) return;
    const total = qty * s.price;
    App.addBalance(total);
    h.shares -= qty;
    if (h.shares === 0) delete this._holdings[symbol];
    const impactPct = this._calcPlayerTradeImpact(s, total);
    if (impactPct >= 0.0005) {
      this._playerStockTargets[symbol] = { target: Math.max(0.01, s.price * (1 - impactPct)), stepsLeft: 8 };
      if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushTradeInfluence(symbol, -1, impactPct);
    }
    this._saveLocal();
    this._toast('\u{1F4B0} Sold ' + qty + 'x ' + symbol + ' +' + App.formatMoney(total));
    this._triggerRender();
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
        const scandal = this._scandals[s.symbol];
        const hasActiveScandal = scandal && !scandal.suppressed && Date.now() - (scandal.firedAt || 0) < 120000;

        // Competitor/sabotage controls — one block per owner
        let compControls = '';
        if (!isMyStock && !ownersSeen.has(s.ownerUid)) {
          ownersSeen.add(s.ownerUid);
          const compCost = App.formatMoney(this.sabotageCost(s.ownerUid));
          compControls = `<div class="competitor-controls">
            <button class="competitor-btn${isComp ? ' competitor-active' : ''}" onclick="Companies.toggleCompetitor('${s.ownerUid}','${this._esc(s.ownerName)}','${this._esc(s.companyTicker || s.symbol)}')">
              ${isComp ? '\u{1F3AF} Competitor' : '+ Set Competitor'}
            </button>
            ${isComp ? `<button class="sabotage-btn" onclick="Companies.sabotage('${s.ownerUid}')">Sabotage — ${compCost}</button>` : ''}
          </div>`;
        }

        html += `<div class="company-card${isComp ? ' competitor-card' : ''}">
          <div class="company-card-header">
            <div>
              <span class="company-card-sym">${this._esc(s.symbol)}</span>
              <span class="player-stock-badge">PLAYER</span>
              ${isComp ? '<span class="competitor-badge">RIVAL</span>' : ''}
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

    container.innerHTML = html;
  },

  _renderManage(container) {
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    let html = '';

    // Each existing company
    this._companies.forEach((c, cIdx) => {
      const listing = this._companyListings[c.ticker];
      const isListed = listing && listing.ownerUid === myUid;
      html += `<div class="company-manage-section" style="margin-bottom:10px">
        <h3>&#x1F3E2; ${this._esc(c.name)} <span style="color:var(--text-dim);font-weight:400">(${this._esc(c.ticker)})</span></h3>
        <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px">
          Founded ${new Date(c.foundedAt || 0).toLocaleDateString()}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">`;

      c.stocks.forEach((s, sIdx) => {
        const isMain = sIdx === (c.mainIdx || 0);
        const scandal = this._scandals[s.symbol];
        const hasActiveScandal = scandal && !scandal.suppressed && Date.now() - (scandal.firedAt || 0) < 120000;
        const suppressCost = App.formatMoney(Math.max(100_000, Math.round((s.basePrice || 100) * 1000)));
        html += `<div class="company-stock-row">
          <div style="flex:1;min-width:0">
            <span class="csr-sym">${this._esc(s.symbol)}</span>
            ${isMain ? '<span style="font-size:10px;color:var(--gold);margin-left:4px">MAIN</span>' : ''}
            <div class="company-card-name">${this._esc(s.name)}</div>
            ${hasActiveScandal ? `<div class="scandal-alert">\u{1F4F0} ${this._esc(scandal.text)}<br><button class="scandal-suppress-btn" onclick="Companies.suppressScandal('${s.symbol}')">Suppress — ${suppressCost}</button></div>` : ''}
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div class="csr-price">$${(s.price || 0) < 10 ? (s.price || 0).toFixed(2) : Math.round(s.price || 0).toLocaleString()}</div>
            <div class="csr-type ${s.type === 'public' ? 'csr-type-public' : 'csr-type-private'}">${s.type}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
            <button class="csr-toggle-btn" onclick="Companies.togglePublic(${cIdx},${sIdx})">${s.type === 'public' ? 'Make Private' : 'Go Public'}</button>
            ${!isMain ? `<button class="csr-toggle-btn" onclick="Companies.setMainStock(${cIdx},${sIdx})" style="font-size:10px">Set Main</button>` : ''}
            <button class="csr-toggle-btn" onclick="Companies.issueDividend(${cIdx},${sIdx})" style="color:var(--gold);border-color:var(--gold)" title="Pay cash per-share to all holders.">Dividend \u{2139}\uFE0F</button>
            ${c.stocks.length > 1 ? `<button class="csr-toggle-btn" style="color:var(--red);border-color:var(--red);font-size:10px" onclick="Companies.removeStock(${cIdx},${sIdx})">Remove</button>` : ''}
          </div>
        </div>`;
      });

      html += `</div>`;

      if (c.stocks.length < this.MAX_STOCKS) {
        const cost = c.stocks.length === 1 ? this.STOCK2_COST : this.STOCK3_COST;
        html += `<button class="add-stock-btn" onclick="Companies.addStock(${cIdx})">+ Add Stock — ${App.formatMoney(cost)}</button>`;
      } else {
        html += `<div style="text-align:center;color:var(--text-dim);font-size:12px;margin-top:8px">Maximum 3 stocks reached</div>`;
      }

      // Sell section
      html += `<div class="company-sale-section">
        <div style="font-weight:700;margin-bottom:6px">&#x1F4B8; Sell Company</div>`;
      if (isListed) {
        html += `<div style="font-size:13px;color:var(--text-dim);margin-bottom:6px">Listed for ${App.formatMoney(listing.salePrice)}</div>
          <button class="csr-toggle-btn" style="color:var(--red);border-color:var(--red)" onclick="Companies.cancelSale('${c.ticker}')">Cancel Listing</button>`;
      } else {
        html += `<div style="display:flex;gap:6px;align-items:center">
          <input id="co-sale-price-${cIdx}" type="number" placeholder="Ask price ($)" style="flex:1;font-size:14px;padding:6px;background:var(--bg);border:1px solid var(--bg3);border-radius:6px;color:var(--text)">
          <button class="company-buy-btn" onclick="Companies.listForSale(${cIdx})">List</button>
        </div>`;
      }
      // ── Insider Intel (if insiderAccess upgrade >= 1) ──────────────────
      const insLv = (c.upgrades && c.upgrades.insiderAccess) || 0;
      if (insLv > 0) {
        html += `<div class="company-insider-panel">
          <div style="font-weight:700;margin-bottom:4px">\u{1F50D} Insider Intel</div>`;
        c.stocks.forEach(s => {
          const tgt = this._playerStockTargets[s.symbol];
          if (tgt && tgt.stepsLeft > 0) {
            const dir = tgt.target > (s.price || 1) ? 'up' : 'down';
            const pct = Math.abs((tgt.target - (s.price || 1)) / (s.price || 1) * 100);
            let hint = dir === 'up' ? '\u{1F4C8} Buying pressure on ' : '\u{1F4C9} Selling pressure on ';
            hint += this._esc(s.symbol);
            if (insLv >= 2) hint += ' (~' + pct.toFixed(1) + '%)';
            if (insLv >= 3) hint += ' \u2192 target $' + App.formatMoney(tgt.target);
            html += `<div style="font-size:12px;padding:2px 0">${hint}</div>`;
          } else {
            html += `<div style="font-size:12px;color:var(--text-dim);padding:2px 0">${this._esc(s.symbol)}: market neutral</div>`;
          }
        });
        html += `</div>`;
      }

      // ── Company Upgrades ────────────────────────────────────────────────
      html += `<div class="company-upgrades-section">
        <div style="font-weight:700;margin-bottom:8px">\u{1F527} Company Upgrades</div>
        <div style="display:flex;flex-direction:column;gap:6px">`;
      for (const [key, def] of Object.entries(this.COMPANY_UPGRADES)) {
        const lvl = (c.upgrades && c.upgrades[key]) || 0;
        const maxed = lvl >= def.maxLevel;
        const nextCost = maxed ? 0 : def.costs[lvl];
        html += `<div class="company-upgrade-row">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:16px">${def.icon}</span>
              <span style="font-weight:700;font-size:13px">${this._esc(def.name)}</span>
              <span class="upgrade-level-badge ${maxed ? 'upgrade-maxed' : ''}">Lv ${lvl}/${def.maxLevel}</span>
            </div>
            <div style="font-size:11px;color:var(--text-dim);margin-top:2px">${this._esc(def.desc)}</div>
          </div>
          <div style="flex-shrink:0;margin-left:8px">
            ${maxed
              ? `<span style="font-size:11px;color:var(--gold);font-weight:700">MAX</span>`
              : `<button class="csr-toggle-btn" style="font-size:11px;white-space:nowrap" onclick="Companies.upgradeCompany(${cIdx},'${key}')">
                   \u25B2 ${App.formatMoney(nextCost)}
                 </button>`
            }
          </div>
        </div>`;
      }
      html += `</div></div>`;

      // ── Company Properties ───────────────────────────────────────────────
      {
        const ind = c.industry || 'tech';
        const indDef = this.INDUSTRIES.find(i => i.id === ind);
        const indLabel = indDef ? indDef.label : ind;
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

        html += `<div class="company-properties-section">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div style="font-weight:700">&#x1F3D7; Properties</div>
            <div style="font-size:11px">
              <span style="color:var(--text-dim)">${this._esc(indLabel)}</span>
              &nbsp;&bull;&nbsp;
              <span style="color:${multColor};font-weight:700">World: ${multPct}%</span>
            </div>
          </div>`;

        if (totalBaseIncome > 0) {
          html += `<div style="font-size:12px;color:var(--text-dim);margin-bottom:8px">
            /5s &mdash; <strong style="color:var(--green)">${App.formatMoney(personalIncome)} personal</strong>
            &nbsp;+&nbsp;<strong style="color:var(--gold)">${App.formatMoney(reinvestIncome)} reinvest</strong>
          </div>
          <div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-dim);margin-bottom:3px">
              <span>Personal ${incomeShareVal}%</span>
              <span>Reinvest ${100 - incomeShareVal}%</span>
            </div>
            <input type="range" min="0" max="100" value="${incomeShareVal}"
              style="width:100%;accent-color:var(--green)"
              oninput="Companies.setIncomeShare(${cIdx}, this.value)">
          </div>`;
        } else {
          html += `<div style="font-size:12px;color:var(--text-dim);margin-bottom:8px">Buy properties to earn passive income every 5 seconds.</div>`;
        }

        html += `<div class="company-property-grid">`;
        propDefs.forEach(def => {
          const owned = ownedProps.includes(def.key);
          html += `<div class="company-property-card${owned ? ' owned' : ''}">
            ${owned ? '<div class="cprop-owned-badge">&#x2713; Owned</div>' : ''}
            <div class="cprop-name">${this._esc(def.name)}</div>
            <div class="cprop-income">${App.formatMoney(def.income)}<span style="font-size:10px;color:var(--text-dim)">/5s</span></div>
            ${owned ? '' : `<div class="cprop-cost">${App.formatMoney(def.cost)}</div>
              <button class="cprop-buy-btn" onclick="Companies.buyProperty(${cIdx},'${def.key}')">Buy</button>`}
          </div>`;
        });
        html += `</div></div>`;
      }

      html += `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bg3);text-align:center">
        <button class="csr-toggle-btn" style="color:var(--red);border-color:var(--red);font-size:12px" onclick="Companies.deleteCompany(${cIdx})">&#x1F5D1; Delete Company</button>
      </div>`;

      html += `</div></div>`;
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

    // Portfolio (holdings of other players' stocks)
    const myHoldings = Object.entries(this._holdings).filter(([, h]) => h.shares > 0);
    if (myHoldings.length > 0) {
      html += `<div class="company-manage-section" style="margin-top:10px">
        <h3>My Portfolio (Player Stocks)</h3>
        <div style="display:flex;flex-direction:column;gap:6px">`;
      myHoldings.forEach(([sym, h]) => {
        const s = this._allPlayerStocks[sym];
        const value = s ? s.price * h.shares : 0;
        const pl = s ? (s.price - h.avgCost) * h.shares : 0;
        html += `<div class="company-stock-row">
          <div>
            <span class="csr-sym">${this._esc(sym)}</span>
            <div style="font-size:12px;color:var(--text-dim)">${h.shares} shares @ avg $${h.avgCost.toFixed(2)}</div>
          </div>
          <div style="text-align:right">
            <div class="csr-price">${App.formatMoney(value)}</div>
            <div style="font-size:12px;${pl >= 0 ? 'color:var(--green)' : 'color:var(--red)'}">${pl >= 0 ? '+' : ''}${App.formatMoney(pl)}</div>
          </div>
        </div>`;
      });
      html += `</div></div>`;
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
        <button class="company-found-btn" onclick="Companies.foundCompany()">Found Company — ${App.formatMoney(this.FOUND_COST)}</button>
      </div>`;
    }

    container.innerHTML = html;
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
      if (!c.properties || !c.properties.length) return;
      const ind = c.industry || 'tech';
      const defs = this.COMPANY_PROPERTIES[ind] || [];
      const worldMult = this._getWorldPriceMult(ind);
      const shareToOwner = typeof c.incomeShare === 'number' ? c.incomeShare / 100 : 1;
      defs.forEach(def => {
        if (c.properties.includes(def.key)) {
          totalIncome += def.income * worldMult * shareToOwner;
        }
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
};
