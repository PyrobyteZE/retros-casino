// Stock Market Simulator
const Stocks = {
  stocks: [
    { symbol: 'RETRO', name: 'Retro Corp',      basePrice: 100,  volatility: 0.04, sector: 'Tech'      },
    { symbol: 'LUCKY', name: 'Lucky Gaming',    basePrice: 50,   volatility: 0.08, sector: 'Casino'    },
    { symbol: 'VAULT', name: 'Vault Bank',      basePrice: 200,  volatility: 0.02, sector: 'Finance'   },
    { symbol: 'NEON',  name: 'Neon Energy',     basePrice: 75,   volatility: 0.08, sector: 'Energy'    },
    { symbol: 'PIXEL', name: 'Pixel Media',     basePrice: 30,   volatility: 0.04, sector: 'Media'     },
    // SHARK: price tracks loan debt + interest — not traded at random, driven by Loans state
    { symbol: 'SHARK', name: 'Shark Loans Inc', basePrice: 150,  volatility: 0.015,sector: 'Finance'   },
    { symbol: 'BLAZE', name: 'Blaze Foods',     basePrice: 40,   volatility: 0.02, sector: 'Consumer'  },
    { symbol: 'MOON',  name: 'MoonCoin Inc',    basePrice: 10,   volatility: 0.15, sector: 'Crypto'    },
    { symbol: 'JOY',   name: 'JoyCorp Defense', basePrice: 500,  volatility: 0.03, sector: 'Defense'   },
    // NEW: Luna Inc — chaotic long-swing stock, amplified when RETRO is down
    { symbol: 'LUNA',  name: 'Luna Inc',        basePrice: 5,    volatility: 0.20, sector: 'Volatile'  },
    // NEW: JoyCorp Oil — JOY subsidiary, correlated with JOY, own oil events
    { symbol: 'JOIL',  name: 'JoyCorp Oil',     basePrice: 80,   volatility: 0.06, sector: 'Energy'    },
    // NEW: Retro Oil — RETRO subsidiary, correlated with RETRO, rival to JOIL
    { symbol: 'ROIL',  name: 'Retro Oil',       basePrice: 65,   volatility: 0.06, sector: 'Energy'    },
  ],

  // Runtime state
  prices: [],
  priceHistory: [],   // array of arrays, last 60 per stock
  holdings: {},       // { RETRO: { shares: 5, avgCost: 102.50 }, ... }
  cashInvested: 0,
  totalProfit: 0,
  newsHistory: [],    // last 20 news items
  activeTab: 'market',
  tickTimer: null,
  eventTimer: null,
  initialized: false,
  _priceTargets: [],  // admin gradual price targets: [{ target, stepsLeft }] per stock
  // LUNA trend state: { direction, magnitude, stepsLeft, totalSteps }
  _lunaTrend: null,
  // SHARK: track last known interest rate to detect changes for news
  _lastSharkInterestPct: 5,
  // Market sabotage cooldowns: { SYMBOL: expiryTimestamp }
  _attackCooldowns: {},
  ATTACK_COOLDOWN_MS: 5 * 60 * 1000, // 5 minutes per stock
  ATTACK_REBIRTH_REQ: 5,             // rebirth level required

  init() {
    if (!this.initialized) {
      this.prices = this.stocks.map(s => s.basePrice);
      this.priceHistory = this.stocks.map(s => {
        const arr = [];
        for (let i = 0; i < 60; i++) arr.push(s.basePrice);
        return arr;
      });
      this._priceTargets = this.stocks.map(() => null);
      this.initialized = true;
    }
    this.startTick();
    this.startEvents();
    this.render();
  },

  startTick() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = setInterval(() => this.tick(), 2000);
  },

  tick() {
    const isAuthority = typeof Firebase !== 'undefined' && Firebase.isOnline() && Firebase._isStockAuthority;
    const isFollower  = typeof Firebase !== 'undefined' && Firebase.isOnline() && !Firebase._isStockAuthority;

    if (isFollower && !this._hasActiveTargets()) {
      this._showOutOfSyncBanner(false);
      return;
    }
    if (!isAuthority && typeof Firebase !== 'undefined' && Firebase._hasConfig()) {
      this._showOutOfSyncBanner(true);
    } else {
      this._showOutOfSyncBanner(false);
    }

    // Index shortcuts for cross-stock mechanics
    const retroIdx = this.stocks.findIndex(s => s.symbol === 'RETRO');
    const joyIdx   = this.stocks.findIndex(s => s.symbol === 'JOY');
    const lunaIdx  = this.stocks.findIndex(s => s.symbol === 'LUNA');
    const joilIdx  = this.stocks.findIndex(s => s.symbol === 'JOIL');
    const roilIdx  = this.stocks.findIndex(s => s.symbol === 'ROIL');
    const sharkIdx = this.stocks.findIndex(s => s.symbol === 'SHARK');

    const changes = new Array(this.stocks.length).fill(0);

    for (let i = 0; i < this.stocks.length; i++) {
      const s = this.stocks[i];

      // Admin gradual target overrides everything
      const tgt = this._priceTargets[i];
      if (tgt && tgt.stepsLeft > 0) {
        const drift = (tgt.target - this.prices[i]) / tgt.stepsLeft;
        changes[i] = drift + this.prices[i] * (Math.random() - 0.5) * s.volatility * 0.3;
        tgt.stepsLeft--;
        if (tgt.stepsLeft <= 0) this._priceTargets[i] = null;
        continue;
      }

      if (s.symbol === 'LUNA') {
        // ── Luna Inc: chaotic long-trending swings (±40–90%) ──────────────
        const retroDown = retroIdx >= 0 && this.prices[retroIdx] < this.stocks[retroIdx].basePrice;

        // Start or continue a trend
        if (!this._lunaTrend || this._lunaTrend.stepsLeft <= 0) {
          const baseMag = 0.40 + Math.random() * 0.50;          // 40–90% total swing
          const mag     = retroDown ? Math.min(0.90, baseMag * 1.35) : baseMag;
          const steps   = retroDown
            ? 15 + Math.floor(Math.random() * 15)               // 15–30 ticks (wilder)
            : 25 + Math.floor(Math.random() * 20);              // 25–45 ticks (long)
          this._lunaTrend = { direction: Math.random() < 0.5 ? 1 : -1, magnitude: mag, stepsLeft: steps, totalSteps: steps };
          if (retroDown) this._addNews('LUNA: RETRO weakness detected — lunar volatility intensifying 🌑', false);
        }

        const t = this._lunaTrend;
        const directional = t.direction * (t.magnitude / t.totalSteps) * this.prices[i];
        const noise = this.prices[i] * (Math.random() - 0.5) * 0.04;
        changes[i] = directional + noise;
        t.stepsLeft--;

      } else if (s.symbol === 'SHARK') {
        // ── Shark Loans: drifts with debt level + interest rate ───────────
        const debt        = typeof Loans !== 'undefined' ? Loans.debt : 0;
        const interestPct = typeof Loans !== 'undefined' ? Loans.getInterestPercent() : 5;
        // Log scale: $0 ≈ 0, $1M ≈ 0.15, $1B ≈ 0.29, $1T ≈ 0.43
        const debtLog     = debt > 0 ? Math.log10(Math.max(10, debt)) / 13 : 0;
        const interestBonus = (interestPct - 5) / 100;
        const targetPrice = this.stocks[i].basePrice * (1 + debtLog * 3 + interestBonus * 2);
        changes[i] = (targetPrice - this.prices[i]) * 0.08
                   + this.prices[i] * (Math.random() - 0.5) * 0.015;

        // Funny news when interest bracket changes
        if (interestPct !== this._lastSharkInterestPct) {
          const up = interestPct > this._lastSharkInterestPct;
          this._fireSharkInterestNews(up, interestPct);
          this._lastSharkInterestPct = interestPct;
        }

      } else if (s.symbol === 'JOY') {
        // ── JoyCorp Defense: standard + rare crash dip ───────────────────
        changes[i] = this.prices[i] * (Math.random() - 0.48) * s.volatility;
        if (Math.random() < 0.005) {
          changes[i] = this.prices[i] * -(0.20 + Math.random() * 0.20);
        }

      } else {
        // ── Standard random walk ──────────────────────────────────────────
        changes[i] = this.prices[i] * (Math.random() - 0.48) * s.volatility;
      }
    }

    // ── RETRO ↔ JOY rivalry: 30% inverse drag ───────────────────────────
    if (retroIdx >= 0 && joyIdx >= 0) {
      changes[retroIdx] += -changes[joyIdx] * 0.30;
      changes[joyIdx]   += -changes[retroIdx] * 0.30;
    }

    // ── JOIL correlated 50% with JOY ────────────────────────────────────
    if (joilIdx >= 0 && joyIdx >= 0) {
      const joyPct = changes[joyIdx] / Math.max(1, this.prices[joyIdx]);
      changes[joilIdx] += this.prices[joilIdx] * joyPct * 0.50;
    }

    // ── ROIL correlated 50% with RETRO ──────────────────────────────────
    if (roilIdx >= 0 && retroIdx >= 0) {
      const retroPct = changes[retroIdx] / Math.max(1, this.prices[retroIdx]);
      changes[roilIdx] += this.prices[roilIdx] * retroPct * 0.50;
    }

    // Apply all changes
    for (let i = 0; i < this.stocks.length; i++) {
      this.prices[i] = Math.max(1, this.prices[i] + changes[i]);
      this.priceHistory[i].push(this.prices[i]);
      if (this.priceHistory[i].length > 60) this.priceHistory[i].shift();
    }

    if (isAuthority) Firebase.pushStockPrices(this.prices.slice());
    if (App.currentScreen === 'stocks') this.render();
  },

  // Funny SHARK interest-rate news
  _fireSharkInterestNews(up, newRate) {
    const upLines = [
      `SHARK: CEO raised rates because "Mercury is in retrograde" (now ${newRate}%)`,
      `SHARK: Board approves hike after CEO had "a very vivid dream" (now ${newRate}%)`,
      `SHARK: Rate increase blamed on intern spilling coffee on the rate calculator`,
      `SHARK: CEO lost a bet to a dolphin — rates raised "as promised" (now ${newRate}%)`,
      `SHARK: New AI model set rates; turned out to be autocorrect (now ${newRate}%)`,
      `SHARK: Rates hiked because the office thermostat was "giving weird vibes"`,
    ];
    const downLines = [
      `SHARK: Rates slashed after CEO "felt bad for a whole minute"`,
      `SHARK: Mass repayments cause "existential crisis" at HQ — rates cut`,
      `SHARK: CFO cried during earnings call; board immediately lowered rates`,
      `SHARK: Audit reveals 1994 Magic 8-Ball has been setting rates since launch`,
      `SHARK: Rate cut approved after shark mascot bit a shareholder`,
    ];
    const lines = up ? upLines : downLines;
    this._addNews(lines[Math.floor(Math.random() * lines.length)], up);
  },

  applyServerPrices(prices) {
    if (!prices || prices.length !== this.stocks.length) return;
    this.prices = prices.slice();
    for (let i = 0; i < this.stocks.length; i++) {
      this.priceHistory[i].push(this.prices[i]);
      if (this.priceHistory[i].length > 60) this.priceHistory[i].shift();
    }
    this._showOutOfSyncBanner(false);
    if (App.currentScreen === 'stocks') this.render();
  },

  _showOutOfSyncBanner(show) {
    let banner = document.getElementById('stock-sync-banner');
    if (show) {
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'stock-sync-banner';
        banner.className = 'out-of-sync-banner';
        banner.textContent = 'Stock market out of sync — prices are local only';
        const container = document.querySelector('#screen-stocks .game-container');
        if (container) container.insertBefore(banner, container.firstChild);
      }
    } else if (banner) {
      banner.remove();
    }
  },

  startEvents() {
    if (this.eventTimer) clearTimeout(this.eventTimer);
    const scheduleNext = () => {
      const delay = 30000 + Math.random() * 60000; // 30-90s
      this.eventTimer = setTimeout(() => {
        this.fireEvent();
        scheduleNext();
      }, delay);
    };
    scheduleNext();
  },

  fireEvent() {
    const isFollower = typeof Firebase !== 'undefined' && Firebase.isOnline() && !Firebase._isStockAuthority;
    if (isFollower) return;

    const retroIdx = this.stocks.findIndex(s => s.symbol === 'RETRO');
    const joyIdx   = this.stocks.findIndex(s => s.symbol === 'JOY');
    const lunaIdx  = this.stocks.findIndex(s => s.symbol === 'LUNA');
    const joilIdx  = this.stocks.findIndex(s => s.symbol === 'JOIL');
    const roilIdx  = this.stocks.findIndex(s => s.symbol === 'ROIL');
    const sharkIdx = this.stocks.findIndex(s => s.symbol === 'SHARK');

    const events = [
      // ── Market-wide ────────────────────────────────────────────────────
      { type: 'crash',     text: 'Market Crash! All stocks down!',    min: -0.20, max: -0.10, all: true,  good: false },
      { type: 'bull',      text: 'Bull Run! All stocks surge!',        min:  0.10, max:  0.20, all: true,  good: true  },
      // ── Generic single stock ────────────────────────────────────────────
      { type: 'earnings',  text: '{stock} beat earnings!',             min:  0.15, max:  0.30, single: true, good: true  },
      { type: 'scandal',   text: '{stock} hit by scandal!',            min: -0.30, max: -0.15, single: true, good: false },
      // ── JOY events ─────────────────────────────────────────────────────
      { type: 'joy_win',   text: 'JOY: Massive defense contract awarded!',       min:  0.15, max:  0.30, sym: 'JOY', good: true  },
      { type: 'joy_lose',  text: 'JOY: Defense contract cancelled mid-project!', min: -0.30, max: -0.20, sym: 'JOY', good: false },
      // ── RETRO vs JOY rivalry ────────────────────────────────────────────
      // retroPct/joyPct: affect RETRO & JOY; roilPct/joilPct: affect their oil subsidiaries
      { type: 'rivalry_retro', text: 'RETRO poaches 3 JOY executives — JOY furious',                    retroPct:  0.12, joyPct: -0.09, roilPct:  0.08, joilPct: -0.06, good: true  },
      { type: 'rivalry_joy',   text: 'JOY lands contract RETRO was chasing — RETRO blindsided',         retroPct: -0.10, joyPct:  0.14, roilPct: -0.07, joilPct:  0.10, good: false },
      { type: 'rivalry_drama', text: 'RETRO vs JOY CEOs argue on livestream — both stocks swing',       retroPct:  0.08, joyPct: -0.08, roilPct:  0.05, joilPct: -0.05, good: true  },
      { type: 'rivalry_suit',  text: 'JOY sues RETRO over stolen algorithm — RETRO denies everything',  retroPct: -0.12, joyPct:  0.07, roilPct: -0.08, joilPct:  0.05, good: false },
      { type: 'oil_war',       text: 'ROIL vs JOIL: Retro Oil underbids JoyCorp Oil on pipeline deal',  retroPct:  0.04, joyPct: -0.04, roilPct:  0.18, joilPct: -0.14, good: true  },
      { type: 'oil_war2',      text: 'JOIL secures exclusive Gulf rights — ROIL loses drilling permit',  retroPct: -0.03, joyPct:  0.03, roilPct: -0.16, joilPct:  0.20, good: false },
      // ── JOIL events ─────────────────────────────────────────────────────
      { type: 'joil_spill',  text: 'JOIL: Spill discovered to be "mostly gravy," investigation ongoing', sym: 'JOIL', min: -0.25, max: -0.10, good: false },
      { type: 'joil_drill',  text: 'JOIL: Drill crew accidentally hit a Minecraft server',               sym: 'JOIL', min: -0.20, max: -0.08, good: false },
      { type: 'joil_find',   text: 'JOIL: Massive reserves found — workers name the field "Big Juicy"', sym: 'JOIL', min:  0.15, max:  0.30, good: true  },
      { type: 'joil_pipe',   text: 'JOIL: JoyPipe approved — employees vote to rename it "The Snout"',  sym: 'JOIL', min:  0.10, max:  0.22, good: true  },
      { type: 'joil_opec',   text: 'JOIL: JoyCorp refuses to attend OPEC meeting, cites "bad vibes"',   sym: 'JOIL', min: -0.15, max:  0.05, good: false },
      // ── ROIL events ─────────────────────────────────────────────────────
      { type: 'roil_gusher', text: 'ROIL: Massive gusher discovered — workers name it "The Retro Fountain"', sym: 'ROIL', min:  0.18, max:  0.35, good: true  },
      { type: 'roil_spill',  text: 'ROIL: Oil spill in sector 7 — CEO says it "adds character"',             sym: 'ROIL', min: -0.22, max: -0.10, good: false },
      { type: 'roil_deal',   text: 'ROIL: Long-term supply deal signed — RETRO Corp shares the news proudly',sym: 'ROIL', min:  0.12, max:  0.25, good: true  },
      { type: 'roil_dry',    text: 'ROIL: Three dry wells in a row — team blames "bad energy"',              sym: 'ROIL', min: -0.18, max: -0.08, good: false },
      { type: 'roil_retro',  text: 'ROIL: RETRO Corp increases stake in subsidiary — vote of confidence',    sym: 'ROIL', min:  0.10, max:  0.20, good: true  },
      // ── LUNA events ─────────────────────────────────────────────────────
      { type: 'luna_moon',   text: 'LUNA: CEO sends all-hands memo consisting entirely of 🌕 emojis',    sym: 'LUNA', min:  0.40, max:  0.80, good: true  },
      { type: 'luna_crash',  text: 'LUNA: Entire board quits to "go live in the woods"',                 sym: 'LUNA', min: -0.70, max: -0.35, good: false },
      { type: 'luna_flip',   text: 'LUNA: Stock direction set by coin flip — somehow legal',             sym: 'LUNA', min: -0.50, max:  0.50, good: true  },
      { type: 'luna_seer',   text: 'LUNA: New CFO is a psychic — investors cautiously optimistic',       sym: 'LUNA', min:  0.30, max:  0.70, good: true  },
      { type: 'luna_void',   text: 'LUNA: CEO says stock is "vibing in the abyss" — price reacts',      sym: 'LUNA', min: -0.60, max: -0.20, good: false },
      // ── SHARK funny events ───────────────────────────────────────────────
      { type: 'shark_hike',  text: 'SHARK: Rate hike approved after CEO "rolled a 6" on a dice',         sym: 'SHARK', min:  0.08, max:  0.20, good: true  },
      { type: 'shark_cut',   text: 'SHARK: Rates slashed — CFO cried during earnings call, board panicked', sym: 'SHARK', min: -0.18, max: -0.06, good: false },
      { type: 'shark_audit', text: 'SHARK: Auditors find rate-setting tool is a soaking-wet Magic 8-Ball', sym: 'SHARK', min: -0.10, max:  0.10, good: false },
      { type: 'shark_bite',  text: 'SHARK: Mascot bit a shareholder — rates raised "as apology"',         sym: 'SHARK', min:  0.06, max:  0.14, good: true  },
    ];

    const event = events[Math.floor(Math.random() * events.length)];
    const pct = event.min !== undefined ? event.min + Math.random() * (event.max - event.min) : 0;
    const fmt = v => (v > 0 ? '+' : '') + (v * 100).toFixed(1) + '%';

    if (event.all) {
      // Market-wide
      for (let i = 0; i < this.stocks.length; i++) {
        const iPct = pct * (0.8 + Math.random() * 0.4);
        this.prices[i] = Math.max(1, this.prices[i] * (1 + iPct));
      }
      this._addNews(event.text + ` (${fmt(pct)})`, event.good);

    } else if (event.single) {
      // Random single stock (skip LUNA and SHARK — they have own logic)
      const pool = this.stocks.map((s, i) => i).filter(i => !['LUNA','SHARK'].includes(this.stocks[i].symbol));
      const idx = pool[Math.floor(Math.random() * pool.length)];
      this.prices[idx] = Math.max(1, this.prices[idx] * (1 + pct));
      this._addNews(event.text.replace('{stock}', this.stocks[idx].symbol) + ` (${fmt(pct)})`, event.good);

    } else if (event.retroPct !== undefined) {
      // RETRO vs JOY rivalry (+ oil subsidiaries)
      if (retroIdx >= 0) this.prices[retroIdx] = Math.max(1, this.prices[retroIdx] * (1 + event.retroPct));
      if (joyIdx >= 0)   this.prices[joyIdx]   = Math.max(1, this.prices[joyIdx]   * (1 + event.joyPct));
      if (roilIdx >= 0)  this.prices[roilIdx]  = Math.max(1, this.prices[roilIdx]  * (1 + (event.roilPct ?? event.retroPct * 0.5)));
      if (joilIdx >= 0)  this.prices[joilIdx]  = Math.max(1, this.prices[joilIdx]  * (1 + (event.joilPct ?? event.joyPct * 0.5)));
      this._addNews(event.text + ` (RETRO ${fmt(event.retroPct)} / JOY ${fmt(event.joyPct)})`, event.good);

    } else if (event.sym) {
      // Named symbol event
      const idx = this.stocks.findIndex(s => s.symbol === event.sym);
      if (idx >= 0) {
        this.prices[idx] = Math.max(1, this.prices[idx] * (1 + pct));
        // LUNA: also reset trend so the swing compounds
        if (event.sym === 'LUNA') this._lunaTrend = null;
        this._addNews(event.text + ` (${fmt(pct)})`, event.good);
      }
    }

    if (App.currentScreen === 'stocks') this.render();
  },

  _addNews(text, good) {
    this.newsHistory.unshift({ text, good, time: Date.now() });
    if (this.newsHistory.length > 20) this.newsHistory.pop();
  },

  // === Admin Gradual Price Control ===
  _hasActiveTargets() {
    return this._priceTargets.some(t => t && t.stepsLeft > 0);
  },

  setGradualTarget(idx, targetPrice, steps) {
    if (!this._priceTargets.length) {
      this._priceTargets = this.stocks.map(() => null);
    }
    this._priceTargets[idx] = { target: targetPrice, stepsLeft: steps || 15 };
    // Force this tab to be authority so targets actually process
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase._isStockAuthority = true;
      Firebase._tryClaimStockAuthority();
    }
  },

  setGradualAll(multiplier, steps) {
    if (!this._priceTargets.length) {
      this._priceTargets = this.stocks.map(() => null);
    }
    for (let i = 0; i < this.stocks.length; i++) {
      this._priceTargets[i] = { target: this.prices[i] * multiplier, stepsLeft: steps || 15 };
    }
    // Force this tab to be authority so targets actually process
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase._isStockAuthority = true;
      Firebase._tryClaimStockAuthority();
    }
  },

  // === Trading ===
  buy(symbol, amount) {
    const idx = this.stocks.findIndex(s => s.symbol === symbol);
    if (idx < 0) return;
    const price = this.prices[idx];
    const cost = price * amount;
    if (App.balance < cost) return;

    App.addBalance(-cost);
    this.cashInvested += cost;

    if (!this.holdings[symbol]) {
      this.holdings[symbol] = { shares: 0, avgCost: 0 };
    }
    const h = this.holdings[symbol];
    const totalCost = h.avgCost * h.shares + cost;
    h.shares += amount;
    h.avgCost = totalCost / h.shares;

    App.save();
    this.render();
  },

  sell(symbol, amount) {
    if (!this.holdings[symbol]) return;
    // Clamp to actual shares — floating-point rounding in the modal can
    // produce an amount marginally above holdings.shares causing a silent fail
    amount = Math.min(amount, this.holdings[symbol].shares);
    const idx = this.stocks.findIndex(s => s.symbol === symbol);
    if (idx < 0) return;
    const price = this.prices[idx];
    const revenue = price * amount;
    const costBasis = this.holdings[symbol].avgCost * amount;

    App.addBalance(revenue);
    this.totalProfit += revenue - costBasis;
    this.holdings[symbol].shares -= amount;
    if (this.holdings[symbol].shares <= 0.0001) {
      delete this.holdings[symbol];
    }

    App.save();
    this.render();
  },

  sellAll(symbol) {
    if (!this.holdings[symbol]) return;
    this.sell(symbol, this.holdings[symbol].shares);
  },

  getPortfolioValue() {
    let total = 0;
    for (const sym in this.holdings) {
      const idx = this.stocks.findIndex(s => s.symbol === sym);
      if (idx >= 0) total += this.holdings[sym].shares * this.prices[idx];
    }
    return total;
  },

  // === Prompt-based buy/sell ===
  promptBuy(symbol) {
    const idx = this.stocks.findIndex(s => s.symbol === symbol);
    if (idx < 0) return;
    const price = this.prices[idx];
    const maxShares = Math.floor(App.balance / price * 100) / 100;
    if (maxShares <= 0) return;

    let html = `<div class="stock-trade-modal">
      <div class="stock-trade-title">Buy ${symbol} @ ${App.formatMoney(price)}</div>
      <div class="stock-trade-custom-amount">
        <label for="stock-buy-amount-input">$</label>
        <input type="number" id="stock-buy-amount-input" placeholder="Enter amount to invest" oninput="Stocks.updateBuyButton(this.value, '${symbol}')">
        <button onclick="document.getElementById('stock-buy-amount-input').value = App.balance; Stocks.updateBuyButton(App.balance, '${symbol}')">Max</button>
      </div>
      <div id="stock-buy-summary"></div>
      <div class="stock-trade-buttons">
        <button id="stock-buy-confirm-btn" class="stock-trade-btn" onclick="Stocks.buyWithMoney('${symbol}')" disabled>Buy</button>
      </div>
      <button class="stock-trade-cancel" onclick="Stocks.closeModal()">Cancel</button>
    </div>`;
    this._showModal(html);
  },

  updateBuyButton(money, symbol) {
    const amount = parseFloat(money);
    const summaryEl = document.getElementById('stock-buy-summary');
    const buyBtn = document.getElementById('stock-buy-confirm-btn');
    if (!summaryEl || !buyBtn) return;

    if (isNaN(amount) || amount <= 0) {
      summaryEl.textContent = '';
      buyBtn.disabled = true;
      return;
    }

    // Use live price for accurate share estimate
    const idx = this.stocks.findIndex(s => s.symbol === symbol);
    const currentPrice = idx >= 0 ? this.prices[idx] : 1;
    const capped = Math.min(amount, App.balance);
    const shares = capped / currentPrice;
    summaryEl.textContent = `You will get ~${shares.toFixed(4)} shares @ ${App.formatMoney(currentPrice)}`;
    buyBtn.disabled = amount > App.balance || amount <= 0;
  },

  buyWithMoney(symbol) {
    const moneyInput = document.getElementById('stock-buy-amount-input');
    if (!moneyInput) return;

    let amount = parseFloat(moneyInput.value);
    if (isNaN(amount) || amount <= 0) return;

    // Always use the current live price — the stale modal price can cause
    // buy() to silently reject when the stock ticked up between Max click and Buy click
    const idx = this.stocks.findIndex(s => s.symbol === symbol);
    if (idx < 0) return;
    const currentPrice = this.prices[idx];

    // Clamp to actual balance (floating-point safety)
    amount = Math.min(amount, App.balance);
    if (amount <= 0) return;

    const shares = amount / currentPrice;
    this.buy(symbol, shares);
    this.closeModal();
  },

  promptSell(symbol) {
    if (!this.holdings[symbol]) return;
    const idx = this.stocks.findIndex(s => s.symbol === symbol);
    if (idx < 0) return;
    const price = this.prices[idx];
    const owned = this.holdings[symbol].shares;

    // Fixed amounts only — ALL uses sellAll() so it always reads live holdings
    const fixedAmounts = [1, 5, 10].filter(a => a < owned);
    const showAll = owned > 0;

    let html = `<div class="stock-trade-modal">
      <div class="stock-trade-title">Sell ${symbol} @ ${App.formatMoney(price)}</div>
      <div class="stock-trade-buttons">`;
    fixedAmounts.forEach(a => {
      html += `<button class="stock-trade-btn stock-sell-btn" onclick="Stocks.sell('${symbol}',${a});Stocks.closeModal()">${a} share${a>1?'s':''}<br>${App.formatMoney(price*a)}</button>`;
    });
    if (showAll) {
      html += `<button class="stock-trade-btn stock-sell-btn" onclick="Stocks.sellAll('${symbol}');Stocks.closeModal()">ALL<br>${App.formatMoney(price*owned)}</button>`;
    }
    html += `</div><button class="stock-trade-cancel" onclick="Stocks.closeModal()">Cancel</button></div>`;
    this._showModal(html);
  },

  _showModal(html) {
    let modal = document.getElementById('stock-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'stock-modal';
      modal.className = 'stock-modal-overlay';
      document.getElementById('app').appendChild(modal);
    }
    modal.innerHTML = html;
    modal.classList.remove('hidden');
  },

  closeModal() {
    const modal = document.getElementById('stock-modal');
    if (modal) modal.classList.add('hidden');
  },

  // === Sparkline ===
  drawSparkline(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (data.length < 2) return;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const isUp = data[data.length - 1] >= data[0];
    ctx.strokeStyle = isUp ? '#00e676' : '#ff5252';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  },

  // === Tab System ===
  setTab(tab) {
    this.activeTab = tab;
    this.render();
  },

  // === Rendering ===
  render() {
    const container = document.getElementById('stocks-content');
    if (!container) return;

    // Tab buttons
    document.querySelectorAll('.stock-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === this.activeTab);
    });

    if (this.activeTab === 'market') this._renderMarket(container);
    else if (this.activeTab === 'portfolio') this._renderPortfolio(container);
    else if (this.activeTab === 'news') this._renderNews(container);
  },

  _renderMarket(container) {
    let html = '<div class="stock-grid">';
    this.stocks.forEach((s, i) => {
      const price = this.prices[i];
      const prev = this.priceHistory[i].length >= 2 ? this.priceHistory[i][this.priceHistory[i].length - 2] : price;
      const changePct = ((price - prev) / prev * 100);
      const dayChange = ((price - s.basePrice) / s.basePrice * 100);
      const isUp = dayChange >= 0;

      html += `<div class="stock-card">
        <div class="stock-card-header">
          <div class="stock-symbol">${s.symbol}</div>
          <div class="stock-sector">${s.sector}</div>
        </div>
        <div class="stock-name">${s.name}</div>
        <div class="stock-price">${App.formatMoney(price)}</div>
        <div class="stock-change ${isUp ? 'stock-up' : 'stock-down'}">${isUp ? '+' : ''}${dayChange.toFixed(2)}%</div>
        <canvas id="spark-${s.symbol}" class="stock-sparkline" width="80" height="30"></canvas>
        <div class="stock-actions">
          <button class="stock-buy-btn" onclick="Stocks.promptBuy('${s.symbol}')">Buy</button>
          <button class="stock-sell-btn" onclick="Stocks.promptSell('${s.symbol}')" ${this.holdings[s.symbol] ? '' : 'disabled'}>Sell</button>
          ${(App.rebirth || 0) >= this.ATTACK_REBIRTH_REQ
              ? `<button class="stock-attack-btn" onclick="Stocks.promptAttack('${s.symbol}')" title="Market Sabotage">🎯</button>`
              : (App.rebirth || 0) >= 3
                ? `<button class="stock-attack-btn stock-attack-locked" disabled title="Unlocks at VIP 5">🔒</button>`
                : ''
            }
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;

    // Draw sparklines after DOM update
    this.stocks.forEach((s, i) => {
      this.drawSparkline('spark-' + s.symbol, this.priceHistory[i]);
    });
  },

  _renderPortfolio(container) {
    const keys = Object.keys(this.holdings);
    if (keys.length === 0) {
      container.innerHTML = '<div class="stock-empty">No stocks owned. Go to Market tab to buy!</div>';
      return;
    }

    let html = '<div class="portfolio-summary">';
    html += `<div class="portfolio-stat"><span class="stat-label">Portfolio Value</span><span>${App.formatMoney(this.getPortfolioValue())}</span></div>`;
    html += `<div class="portfolio-stat"><span class="stat-label">Total P&L</span><span class="${this.totalProfit >= 0 ? 'stock-up' : 'stock-down'}">${this.totalProfit >= 0 ? '+' : ''}${App.formatMoney(this.totalProfit)}</span></div>`;
    html += '</div>';

    html += '<div class="portfolio-list">';
    keys.forEach(sym => {
      const h = this.holdings[sym];
      const idx = this.stocks.findIndex(s => s.symbol === sym);
      if (idx < 0) return;
      const price = this.prices[idx];
      const value = h.shares * price;
      const costBasis = h.shares * h.avgCost;
      const pl = value - costBasis;
      const plPct = costBasis > 0 ? (pl / costBasis * 100) : 0;

      html += `<div class="portfolio-item">
        <div class="portfolio-item-header">
          <span class="portfolio-symbol">${sym}</span>
          <span class="portfolio-value">${App.formatMoney(value)}</span>
        </div>
        <div class="portfolio-details">
          <span>${h.shares.toFixed(2)} shares @ ${App.formatMoney(h.avgCost)}</span>
          <span class="${pl >= 0 ? 'stock-up' : 'stock-down'}">${pl >= 0 ? '+' : ''}${App.formatMoney(pl)} (${plPct >= 0 ? '+' : ''}${plPct.toFixed(1)}%)</span>
        </div>
        <div class="stock-actions">
          <button class="stock-buy-btn" onclick="Stocks.promptBuy('${sym}')">Buy More</button>
          <button class="stock-sell-btn" onclick="Stocks.promptSell('${sym}')">Sell</button>
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  },

  _renderNews(container) {
    if (this.newsHistory.length === 0) {
      container.innerHTML = '<div class="stock-empty">No news yet. Events happen every 30-90 seconds.</div>';
      return;
    }
    let html = '<div class="news-feed">';
    this.newsHistory.forEach(n => {
      const ago = Math.floor((Date.now() - n.time) / 1000);
      const timeStr = ago < 60 ? ago + 's ago' : Math.floor(ago / 60) + 'm ago';
      html += `<div class="news-item ${n.good ? 'news-good' : 'news-bad'}">
        <span class="news-icon">${n.good ? '\u{1F4C8}' : '\u{1F4C9}'}</span>
        <span class="news-text">${n.text}</span>
        <span class="news-time">${timeStr}</span>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  },

  // === Market Sabotage (Rebirth 5+) ===

  // Cost scales with stock price — attacking a cheap stock is cheap, expensive is costly
  _attackCost(symbol) {
    const idx = this.stocks.findIndex(s => s.symbol === symbol);
    if (idx < 0) return 0;
    return Math.max(100, Math.floor(this.prices[idx] * 25));
  },

  _attackCooldownRemaining(symbol) {
    const expiry = this._attackCooldowns[symbol] || 0;
    return Math.max(0, expiry - Date.now());
  },

  promptAttack(symbol) {
    if ((App.rebirth || 0) < this.ATTACK_REBIRTH_REQ) return;
    const idx = this.stocks.findIndex(s => s.symbol === symbol);
    if (idx < 0) return;

    const cost = this._attackCost(symbol);
    const cooldownMs = this._attackCooldownRemaining(symbol);
    const cooldownSec = Math.ceil(cooldownMs / 1000);
    const canAfford = App.balance >= cost;

    let statusLine = '';
    if (cooldownMs > 0) {
      const m = Math.floor(cooldownSec / 60), s = cooldownSec % 60;
      statusLine = `<div class="attack-cooldown">⏳ Cooldown: ${m}:${s.toString().padStart(2,'0')}</div>`;
    } else if (!canAfford) {
      statusLine = `<div class="attack-cooldown" style="color:var(--red)">Not enough funds</div>`;
    }

    const html = `<div class="stock-trade-modal">
      <div class="stock-trade-title" style="color:var(--red)">🎯 Market Sabotage — ${symbol}</div>
      <div class="attack-info">
        <div>Cost: <strong>${App.formatMoney(cost)}</strong></div>
        <div>Success chance: <strong>~50%</strong></div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:6px">
          On success: stock drops 15–35% over ~40s<br>
          On backfire: stock may bounce up instead<br>
          Cooldown: 5 min per stock
        </div>
      </div>
      ${statusLine}
      <div class="stock-trade-buttons" style="margin-top:10px">
        <button class="stock-trade-btn stock-sell-btn" style="background:var(--red);color:#fff"
          onclick="Stocks.executeAttack('${symbol}')"
          ${cooldownMs > 0 || !canAfford ? 'disabled' : ''}>
          Launch Attack
        </button>
      </div>
      <button class="stock-trade-cancel" onclick="Stocks.closeModal()">Cancel</button>
    </div>`;
    this._showModal(html);
  },

  executeAttack(symbol) {
    if ((App.rebirth || 0) < this.ATTACK_REBIRTH_REQ) return;
    if (this._attackCooldownRemaining(symbol) > 0) return;

    const cost = this._attackCost(symbol);
    if (App.balance < cost) return;

    const idx = this.stocks.findIndex(s => s.symbol === symbol);
    if (idx < 0) return;

    App.addBalance(-cost);
    App.save();
    this._attackCooldowns[symbol] = Date.now() + this.ATTACK_COOLDOWN_MS;
    this.closeModal();

    // Roll success: 50% base chance
    const roll = Math.random();
    if (roll < 0.50) {
      // ✅ SUCCESS — gradual drop 15–35%
      const dropPct = 0.15 + Math.random() * 0.20;
      const target = Math.max(1, this.prices[idx] * (1 - dropPct));
      this.setGradualTarget(idx, target, 20);
      this._addNews(`⚠️ Suspicious sell-off in ${symbol} — source unknown (-${(dropPct*100).toFixed(1)}%)`, false);
      if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
        Firebase.pushStockNews(`⚠️ Suspicious sell-off in ${symbol} — source unknown`, false);
      }
      this._showAttackResult(symbol, true, dropPct);
    } else if (roll < 0.75) {
      // ❌ FAIL — nothing happens, fee wasted
      this._addNews(`📡 Unusual order flow in ${symbol} detected but neutralised`, false);
      this._showAttackResult(symbol, false, 0);
    } else {
      // 💥 BACKFIRE — 25% chance stock bounces up 5–15%
      const bouncePct = 0.05 + Math.random() * 0.10;
      const target = this.prices[idx] * (1 + bouncePct);
      this.setGradualTarget(idx, target, 10);
      this._addNews(`📈 ${symbol} surges on high buy volume after suspicious dip attempt`, true);
      this._showAttackResult(symbol, false, -bouncePct);
    }
    if (App.currentScreen === 'stocks') this.render();
  },

  _showAttackResult(symbol, success, dropPct) {
    const toast = document.createElement('div');
    toast.className = 'insider-tip-toast';
    if (success) {
      toast.textContent = `🎯 Attack on ${symbol} worked! -${(dropPct*100).toFixed(0)}% incoming`;
      toast.style.background = 'var(--red)';
    } else if (dropPct < 0) {
      toast.textContent = `💥 Attack on ${symbol} backfired — it's going UP`;
      toast.style.background = '#ff8800';
    } else {
      toast.textContent = `❌ Attack on ${symbol} failed — fee lost`;
      toast.style.background = 'var(--bg3)';
    }
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  },

  // === Save/Load ===
  getSaveData() {
    return {
      prices: this.prices.slice(),
      holdings: JSON.parse(JSON.stringify(this.holdings)),
      cashInvested: this.cashInvested,
      totalProfit: this.totalProfit,
      newsHistory: this.newsHistory.slice(0, 10),
      attackCooldowns: Object.assign({}, this._attackCooldowns),
    };
  },

  loadSaveData(data) {
    if (!data) return;
    if (data.prices) {
      this.prices = data.prices;
      // Handle new stocks added since save
      while (this.prices.length < this.stocks.length) {
        this.prices.push(this.stocks[this.prices.length].basePrice);
      }
      this.priceHistory = this.prices.map(p => {
        const arr = [];
        for (let i = 0; i < 60; i++) arr.push(p);
        return arr;
      });
    }
    if (data.holdings) this.holdings = data.holdings;
    if (data.cashInvested) this.cashInvested = data.cashInvested;
    if (data.totalProfit) this.totalProfit = data.totalProfit;
    if (data.newsHistory) this.newsHistory = data.newsHistory;
    if (data.attackCooldowns) this._attackCooldowns = data.attackCooldowns;
    this.initialized = true;
  },
};
