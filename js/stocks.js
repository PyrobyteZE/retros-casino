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
    { symbol: 'GOOSE', name: 'Goose Foods',     basePrice: 40,   volatility: 0.02, sector: 'Consumer'  },
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

  // Ticker JS animation
  _tickerOffset: 0,
  _tickerAnimFrame: null,

  // Bounty board (R5+)
  _bounties: {},       // live data from Firebase

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

  // Called once after Firebase is online (from Firebase._startListeners or lazily)
  _initFirebaseFeatures() {
    if (this._firebaseFeaturesInit) return;
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) return;
    this._firebaseFeaturesInit = true;
    Firebase.listenBounties(data => {
      this._bounties = data;
      this._expireBounties();
      if (App.currentScreen === 'stocks' && this.activeTab === 'bounties') this.render();
    });
    Firebase.listenBountyRefunds(Firebase.uid, refund => {
      App.addBalance(refund.amount);
      App.save();
      Toast.show('\u{1F504} Bounty expired — ' + App.formatMoney(refund.amount) + ' refunded', 'var(--bg3)');
    });
    setInterval(() => this._expireBounties(), 300000);
    if (typeof Companies !== 'undefined') Companies.init();
  },

  startTick() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = setInterval(() => this.tick(), 2000);
    // Property income runs on all clients every 5 real seconds
    if (this._propertyIncomeTimer) clearInterval(this._propertyIncomeTimer);
    this._propertyIncomeTimer = setInterval(() => {
      if (typeof Companies !== 'undefined') Companies.tickPropertyIncome();
    }, 5000);
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
        if (tgt.stepsLeft <= 0 && (!tgt.holdUntil || Date.now() >= tgt.holdUntil)) {
          this._priceTargets[i] = null;
        }
        continue;
      } else if (tgt && tgt.holdUntil && Date.now() < tgt.holdUntil) {
        // Hold phase: stay pinned near admin target with tiny wobble
        this.prices[i] = Math.max(0.01, tgt.target * (1 + (Math.random() - 0.5) * 0.02));
        continue;
      } else if (tgt) {
        this._priceTargets[i] = null;
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
          if (retroDown && Date.now() - (this._lunaNewsAt || 0) > 60000) {
            this._lunaNewsAt = Date.now();
            this._addNews('LUNA: RETRO weakness detected — lunar volatility intensifying 🌑', false);
          }
        }

        // Rare super-moon: LUNA blasts to 1000%+ (0.2% chance, 5min cooldown, only when not already mooning)
        if (!this._lunaTrend?.isMoon && Date.now() - (this._lunaSuperMoonAt || 0) > 300000) {
          if (Math.random() < 0.002) {
            const moonMag = 1.5 + Math.random() * 1.5;  // 1.5–3.0 → 330%–1050% gain over run
            const moonSteps = 40 + Math.floor(Math.random() * 20);
            this._lunaTrend = { direction: 1, magnitude: moonMag, stepsLeft: moonSteps, totalSteps: moonSteps, isMoon: true };
            this._lunaSuperMoonAt = Date.now();
            const projPct = Math.round((Math.pow(1 + moonMag / moonSteps, moonSteps) - 1) * 100);
            const moonMsg = '\u{1F315} LUNA SUPER MOON \u2014 buying frenzy! Projected +' + projPct + '% surge!';
            this._addNews(moonMsg, true);
            if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushStockNews(moonMsg, true);
          }
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

        // Mania spike — ROIL/JOIL are correlated derivatives, no standalone mania
        const isDerivative = s.symbol === 'JOIL' || s.symbol === 'ROIL';
        if (!isDerivative) {
          if (!this._maniaCooldowns) this._maniaCooldowns = {};
          const maniaCooldownOk = (Date.now() - (this._maniaCooldowns[i] || 0)) > 120000;
          if (!tgt && maniaCooldownOk && Math.random() < 0.003) {
            const mult = 1.5 + Math.random() * 2.5; // 1.5x–4x (was 3x–11x)
            // Cap mania target at 5× base so correlated stocks can't compound to insane levels
            const target = Math.min(this.prices[i] * mult, s.basePrice * 5);
            this._priceTargets[i] = { target, stepsLeft: 5, isMania: true };
            this._maniaCooldowns[i] = Date.now();
            const pctUp = Math.round((target / this.prices[i] - 1) * 100);
            const msg = '\u{1F680} MANIA: ' + s.symbol + ' \u2014 irrational buying frenzy! +' + pctUp + '%!';
            this._addNews(msg, true);
            if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushStockNews(msg, true);
          }
        }
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

    // Apply all changes + mean reversion + high-price crash risk
    for (let i = 0; i < this.stocks.length; i++) {
      const s = this.stocks[i];
      const tgt = this._priceTargets[i];

      // Only apply reversion/crash logic when no admin target is running
      if (!tgt || tgt.stepsLeft <= 0) {
        const ratio = this.prices[i] / s.basePrice;

        // Hard price cap — non-LUNA stocks capped at 8× base, slow decay to 4× over 25 ticks
        if (s.symbol !== 'LUNA' && ratio > 8) {
          this._priceTargets[i] = { target: s.basePrice * 4, stepsLeft: 25 };
          if (!this._maniaCooldowns) this._maniaCooldowns = {};
          this._maniaCooldowns[i] = Date.now();
        }

        // LUNA has its own trend system — skip mean reversion so it can reach 1000%+
        if (s.symbol !== 'LUNA') {
          // Mean reversion — stronger at extreme ratios to prevent runaway prices
          const revStr = ratio > 6 ? 0.030 : ratio > 4 ? 0.015 : ratio > 2 ? 0.005 : 0.002;
          changes[i] -= this.prices[i] * (ratio - 1) * revStr;

          // High-price crash risk
          if (ratio > 2.5) {
            const crashChance = Math.min(0.20, (ratio - 2.5) * 0.025);
            if (Math.random() < crashChance) {
              const snapPct = ratio > 5 ? 0.15 + Math.random() * 0.20 : 0.08 + Math.random() * 0.12;
              changes[i] -= this.prices[i] * snapPct;
              if (ratio > 4) {
                if (!this._overvaluedNewsCooldowns) this._overvaluedNewsCooldowns = {};
                if (Date.now() - (this._overvaluedNewsCooldowns[s.symbol] || 0) > 60000) {
                  this._overvaluedNewsCooldowns[s.symbol] = Date.now();
                  this._addNews(s.symbol + ': Overvalued \u2014 market correction incoming!', false);
                  if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
                    Firebase.pushStockNews(s.symbol + ': Overvalued \u2014 market corrects hard!', false);
                  }
                }
              }
            }
          }

          // Low-price recovery bounce when very depressed
          if (ratio < 0.25) {
            changes[i] += this.prices[i] * 0.04;
          }
        }
      }

      this.prices[i] = Math.max(1, this.prices[i] + changes[i]);
      this.priceHistory[i].push(this.prices[i]);
      if (this.priceHistory[i].length > 60) this.priceHistory[i].shift();
    }

    // LUNA floor guard: prevent getting stuck at $1 with downward trend
    if (lunaIdx >= 0 && this.prices[lunaIdx] <= 1 && this._lunaTrend && this._lunaTrend.direction < 0) {
      this._lunaTrend.direction = 1;
    }

    if (isAuthority) Firebase.pushStockPrices(this.prices.slice());
    if (isAuthority && typeof Companies !== 'undefined') Companies.tickPrices();
    if (App.currentScreen === 'stocks') this.render();
    this.updateTicker();
  },

  _tickerFmtPrice(price) {
    if (typeof price !== 'number' || !isFinite(price)) return '$0.00';
    // Short compact format: $1.23, $999, $1.5K, $2.3M, etc.
    if (price < 10)    return '$' + price.toFixed(2);
    if (price < 1000)  return '$' + Math.round(price);
    if (price < 1e6)   return '$' + (price / 1e3).toFixed(1) + 'K';
    if (price < 1e9)   return '$' + (price / 1e6).toFixed(2) + 'M';
    return '$' + (price / 1e9).toFixed(2) + 'B';
  },

  _startTickerAnim() {
    if (this._tickerAnimFrame) return; // already running
    const step = () => {
      const el = document.getElementById('stock-ticker');
      const track = el ? el.querySelector('.ticker-track') : null;
      if (!track || !el || el.classList.contains('hidden')) {
        this._tickerAnimFrame = null;
        return;
      }
      // halfWidth = scrollable width of one copy
      const halfWidth = track.scrollWidth / 2;
      if (halfWidth > 0) {
        this._tickerOffset += 0.5; // px per frame ≈ 30px/s at 60fps
        if (this._tickerOffset >= halfWidth) this._tickerOffset -= halfWidth;
        track.style.transform = `translateX(-${this._tickerOffset}px)`;
      }
      this._tickerAnimFrame = requestAnimationFrame(step);
    };
    this._tickerAnimFrame = requestAnimationFrame(step);
  },

  updateTicker() {
    const el = document.getElementById('stock-ticker');
    if (!el || el.classList.contains('hidden')) return;

    // Build items: system stocks + public player stocks
    const items = this.stocks.map((s, i) => {
      const price = this.prices[i];
      const hist = this.priceHistory[i];
      const prev = hist.length >= 2 ? hist[hist.length - 2] : price;
      const pct = ((price - prev) / prev * 100);
      const dir = pct > 0.001 ? 'up' : pct < -0.001 ? 'dn' : 'flat';
      const arrow = dir === 'up' ? '\u25B2' : dir === 'dn' ? '\u25BC' : '\u25A0';
      const pctStr = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
      return { text: `${s.symbol} ${this._tickerFmtPrice(price)} ${arrow}${pctStr}`, dir };
    });

    // Add public player stocks
    if (typeof Companies !== 'undefined' && Companies._allPlayerStocks) {
      for (const sym in Companies._allPlayerStocks) {
        const s = Companies._allPlayerStocks[sym];
        if (s.type !== 'public') continue;
        const hist = s.history || [];
        const prev = hist.length >= 2 ? hist[hist.length - 2] : s.price;
        const pct = prev > 0 ? ((s.price - prev) / prev * 100) : 0;
        const dir = pct > 0.001 ? 'up' : pct < -0.001 ? 'dn' : 'flat';
        const arrow = dir === 'up' ? '\u25B2' : dir === 'dn' ? '\u25BC' : '\u25A0';
        const pctStr = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
        items.push({ text: `${sym} ${this._tickerFmtPrice(s.price)} ${arrow}${pctStr} \u{1F464}`, dir });
      }
    }

    // Add crypto coins section if enabled
    const showCoins = typeof Settings === 'undefined' || Settings.options.showCoinTicker !== false;
    if (showCoins && typeof Crypto !== 'undefined' && Crypto.coinPrices && Crypto.coinPrices.length) {
      items.push({ text: '\u25CF COINS \u25CF', dir: 'flat', isSep: true });
      Crypto.coins.forEach((coin, i) => {
        const price = (typeof Crypto.coinPrices[i] === 'number' && isFinite(Crypto.coinPrices[i])) ? Crypto.coinPrices[i] : coin.baseValue;
        const hist = Crypto.priceHistory[i] || [];
        const prev = hist.length >= 2 ? hist[hist.length - 2] : price;
        const pct = prev > 0 ? ((price - prev) / prev * 100) : 0;
        const dir = pct > 0.001 ? 'up' : pct < -0.001 ? 'dn' : 'flat';
        const arrow = dir === 'up' ? '\u25B2' : dir === 'dn' ? '\u25BC' : '\u25A0';
        const pctStr = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
        items.push({ text: `${coin.symbol} ${this._tickerFmtPrice(price)} ${arrow}${pctStr}`, dir });
      });
      // Public player coins
      for (const sym in Crypto._playerCoinPrices) {
        const price = Crypto._playerCoinPrices[sym];
        const hist = Crypto._playerCoinHistory[sym] || [price, price];
        const prev = hist.length >= 2 ? hist[hist.length - 2] : price;
        const pct = prev > 0 ? ((price - prev) / prev * 100) : 0;
        const dir = pct > 0.001 ? 'up' : pct < -0.001 ? 'dn' : 'flat';
        const arrow = dir === 'up' ? '\u25B2' : dir === 'dn' ? '\u25BC' : '\u25A0';
        const pctStr = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
        items.push({ text: `${sym} ${this._tickerFmtPrice(price)} ${arrow}${pctStr} \u{1F464}`, dir });
      }
    }

    // Update existing spans in-place — preserves scroll offset, no jump
    const existing = el.querySelectorAll('.ticker-item, .ticker-separator');
    if (existing.length === items.length * 2) {
      items.forEach((item, i) => {
        const cls = item.isSep ? 'ticker-separator' : `ticker-item ticker-${item.dir}`;
        existing[i].textContent = item.text;
        existing[i].className = cls;
        existing[i + items.length].textContent = item.text;
        existing[i + items.length].className = cls;
      });
      this._startTickerAnim();
      return;
    }

    // First run or item count changed — cancel old anim, reset offset, build fresh
    if (this._tickerAnimFrame) {
      cancelAnimationFrame(this._tickerAnimFrame);
      this._tickerAnimFrame = null;
    }
    this._tickerOffset = 0;
    const buildHtml = (items) => items.map(item =>
      item.isSep
        ? `<span class="ticker-separator">${item.text}</span>`
        : `<span class="ticker-item ticker-${item.dir}">${item.text}</span>`
    ).join('<span class="ticker-sep"> | </span>');
    const html = buildHtml(items);
    el.innerHTML = `<div class="ticker-track">${html}<span class="ticker-sep">&nbsp;&nbsp;&nbsp;</span>${html}</div>`;
    this._startTickerAnim();
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
      // ── RETRO vs JOY rivalry (RETRO founded by RetroByte) ──────────────────
      // retroPct/joyPct: affect RETRO & JOY; roilPct/joilPct: affect their oil subsidiaries
      { type: 'rivalry_retro', text: 'RETRO poaches 3 JOY executives — JOY furious',                                retroPct:  0.12, joyPct: -0.09, roilPct:  0.08, joilPct: -0.06, good: true  },
      { type: 'rivalry_joy',   text: 'JOY lands contract RETRO was chasing — RETRO blindsided',                     retroPct: -0.10, joyPct:  0.14, roilPct: -0.07, joilPct:  0.10, good: false },
      { type: 'rivalry_drama', text: 'RETRO vs JOY CEOs argue on livestream — both stocks swing',                   retroPct:  0.08, joyPct: -0.08, roilPct:  0.05, joilPct: -0.05, good: true  },
      { type: 'rivalry_suit',  text: 'JOY sues RETRO over stolen algorithm — RETRO denies everything',              retroPct: -0.12, joyPct:  0.07, roilPct: -0.08, joilPct:  0.05, good: false },
      { type: 'oil_war',       text: 'ROIL vs JOIL: Retro Oil underbids JoyCorp Oil on pipeline deal',              retroPct:  0.04, joyPct: -0.04, roilPct:  0.18, joilPct: -0.14, good: true  },
      { type: 'oil_war2',      text: 'JOIL secures exclusive Gulf rights — ROIL loses drilling permit',              retroPct: -0.03, joyPct:  0.03, roilPct: -0.16, joilPct:  0.20, good: false },
      { type: 'retro_rb1',     text: 'RETRO: RetroByte makes surprise earnings call — investors call it "unhinged but compelling"', retroPct: 0.15, joyPct: -0.05, roilPct: 0.10, joilPct: -0.03, good: true  },
      { type: 'retro_rb2',     text: 'RETRO: CEO RetroByte challenges JOY CEO to a duel on the trading floor',      retroPct:  0.10, joyPct:  0.10, roilPct:  0.06, joilPct:  0.06, good: true  },
      { type: 'retro_rb3',     text: 'RETRO: RetroByte unveils "Project Neon" — details classified, stock surges anyway', retroPct: 0.20, joyPct: -0.06, roilPct: 0.12, joilPct: -0.04, good: true  },
      { type: 'retro_rb4',     text: 'RETRO: RetroByte spotted at SEC hearing eating a sandwich, unperturbed',      retroPct: -0.08, joyPct:  0.05, roilPct: -0.05, joilPct:  0.03, good: false },
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
      // ── LUNA events (CEO is a cat; entire company run by cats) ─────────────
      { type: 'luna_nap',    text: 'LUNA: CEO refuses board meeting — was napping on keyboard',          sym: 'LUNA', min: -0.50, max:  0.50, good: true  },
      { type: 'luna_mrrp',   text: "LUNA: All-hands memo sent at 3AM contained only 'mrrp' — HR investigating", sym: 'LUNA', min: -0.30, max:  0.60, good: true  },
      { type: 'luna_desk',   text: "LUNA: CFO knocked quarterly report off desk. 'Was in the way,' sources confirm.", sym: 'LUNA', min: -0.45, max: -0.10, good: false },
      { type: 'luna_meow',   text: 'LUNA: Board of Directors meows in unison — analysts interpret as bullish', sym: 'LUNA', min:  0.35, max:  0.75, good: true  },
      { type: 'luna_laser',  text: 'LUNA: CEO chases laser pointer for 40 minutes; markets react accordingly', sym: 'LUNA', min: -0.60, max:  0.60, good: true  },
      { type: 'luna_headcount', text: 'LUNA: Company headcount: 12 cats, 0 humans — investors reportedly fine with this', sym: 'LUNA', min:  0.20, max:  0.55, good: true  },
      { type: 'luna_box',    text: "LUNA: CEO spotted sitting in empty cardboard box labeled 'office'",  sym: 'LUNA', min: -0.25, max:  0.40, good: true  },
      { type: 'luna_yarn',   text: 'LUNA: Stock direction set by batting a ball of yarn — somehow legal', sym: 'LUNA', min: -0.55, max:  0.55, good: true  },
      { type: 'luna_water',  text: 'LUNA: Entire C-suite knocked their water glasses off the table. Simultaneously.', sym: 'LUNA', min: -0.40, max: -0.15, good: false },
      { type: 'luna_memo',   text: 'LUNA: CEO sends all-hands memo consisting entirely of 🐱 emojis',   sym: 'LUNA', min:  0.40, max:  0.80, good: true  },
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
    // Deduplicate: ignore if identical text was already added within the last 5 seconds
    // (prevents authority double-fire: local call + Firebase listener echo)
    if (this.newsHistory.length > 0 &&
        this.newsHistory[0].text === text &&
        Date.now() - this.newsHistory[0].time < 5000) return;

    this.newsHistory.unshift({ text, good, time: Date.now() });
    if (this.newsHistory.length > 20) this.newsHistory.pop();

    if (typeof Settings !== 'undefined' && Settings.options.newsPopups) {
      // Rate-limit toasts: at most one news popup every 12 seconds
      if (Date.now() - (this._lastNewsToastAt || 0) > 12000) {
        this._lastNewsToastAt = Date.now();
        Toast.show((good ? '📈 ' : '📉 ') + text, good ? 'var(--green-dark)' : '#c0392b', 4500);
      }
    }
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

  applyAdminCommand(cmd) {
    if (!cmd || !cmd.type) return;
    if (!this._priceTargets.length) this._priceTargets = this.stocks.map(() => null);
    // NOTE: directly set targets without calling setGradualTarget() — that function steals
    // stock authority, which would cause every tab to fight for authority simultaneously.
    const _hold = () => Date.now() + 50000; // 50s hold after arriving at admin target
    switch (cmd.type) {
      case 'target':
        if (cmd.idx >= 0 && cmd.idx < this.stocks.length) {
          this._priceTargets[cmd.idx] = { target: cmd.target, stepsLeft: cmd.steps || 15, holdUntil: _hold() };
        }
        break;
      case 'adjust':
        if (cmd.idx >= 0 && cmd.idx < this.stocks.length) {
          this._priceTargets[cmd.idx] = { target: Math.max(1, this.prices[cmd.idx] * cmd.mult), stepsLeft: 15, holdUntil: _hold() };
        }
        break;
      case 'crash':
        for (let i = 0; i < this.stocks.length; i++) {
          this._priceTargets[i] = { target: Math.max(1, this.prices[i] * 0.5), stepsLeft: 20, holdUntil: _hold() };
        }
        break;
      case 'boom':
        for (let i = 0; i < this.stocks.length; i++) {
          this._priceTargets[i] = { target: this.prices[i] * 2.0, stepsLeft: 20, holdUntil: _hold() };
        }
        break;
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

  // === Market influence helpers ===
  // Impact: small % nudge based on trade value relative to stock size (capped at 8%)
  _calcTradeImpact(idx, tradeValue) {
    const baseSize = this.stocks[idx].basePrice * 800;
    return Math.min(0.08, tradeValue / baseSize);
  },

  _applyTradeInfluence(idx, dir, impactPct) {
    if (impactPct < 0.0005) return;
    const newTarget = Math.max(1, this.prices[idx] * (1 + dir * impactPct));
    // Accumulate with existing target if present
    const existing = this._priceTargets[idx];
    const target = existing ? (existing.target + newTarget) / 2 : newTarget;
    this._priceTargets[idx] = { target, stepsLeft: 8 };
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.pushTradeInfluence(this.stocks[idx].symbol, dir, impactPct);
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

    // Market influence: buying pushes price up slightly
    this._applyTradeInfluence(idx, 1, this._calcTradeImpact(idx, cost));

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

    // Market influence: selling pushes price down slightly
    this._applyTradeInfluence(idx, -1, this._calcTradeImpact(idx, revenue));

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
  _buyCooldowns: {},

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
        <input type="text" inputmode="decimal" id="stock-buy-amount-input" class="sh-input" placeholder="Amount (e.g. 10m)" oninput="Stocks.updateBuyButton(this.value, '${symbol}')">
        <button onclick="document.getElementById('stock-buy-amount-input').value = App.balance; Stocks.updateBuyButton(App.balance, '${symbol}')">Max</button>
      </div>
      <div class="sh-preview" style="display:none;font-size:11px;color:var(--text-dim);margin:2px 0 4px 0"></div>
      <div id="stock-buy-summary"></div>
      <div class="stock-trade-buttons">
        <button id="stock-buy-confirm-btn" class="stock-trade-btn" onclick="Stocks.buyWithMoney('${symbol}')" disabled>Buy</button>
      </div>
      <button class="stock-trade-cancel" onclick="Stocks.closeModal()">Cancel</button>
    </div>`;
    this._showModal(html);
  },

  updateBuyButton(money, symbol) {
    const amount = App.parseAmount(money);
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

    let amount = App.parseAmount(moneyInput.value);
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
      html += `<button class="stock-trade-btn stock-sell-btn" onclick="Stocks.sell('${symbol}',${shares});Stocks.closeModal()">${label}<br><span style="font-size:11px;opacity:0.8">${App.formatMoney(price * shares)}</span></button>`;
    });
    html += `</div>
      <div class="stock-trade-custom-amount" style="margin-top:4px;margin-bottom:12px">
        <input type="text" inputmode="decimal" id="stock-sell-custom" placeholder="# of shares" style="flex:1">
        <button onclick="Stocks._confirmCustomSell('${symbol}')">Sell</button>
      </div>
      <button class="stock-trade-cancel" onclick="Stocks.closeModal()">Cancel</button>
    </div>`;
    this._showModal(html);
  },

  _confirmCustomSell(symbol) {
    const input = document.getElementById('stock-sell-custom');
    if (!input) return;
    const qty = App.parseAmount(input.value);
    if (isNaN(qty) || qty <= 0) return;
    this.sell(symbol, qty);
    this.closeModal();
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

    // Show/hide R5 tabs dynamically
    const r5 = (App.rebirth || 0) >= 5;
    document.querySelectorAll('.stock-tab-r5').forEach(btn => {
      btn.classList.toggle('hidden', !r5);
    });

    // Tab buttons
    document.querySelectorAll('.stock-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === this.activeTab);
    });

    if (this.activeTab === 'market') this._renderMarket(container);
    else if (this.activeTab === 'portfolio') this._renderPortfolio(container);
    else if (this.activeTab === 'news') this._renderNews(container);
    else if (this.activeTab === 'bounties') this._renderBounties(container);
    else if (this.activeTab === 'players') { if (typeof Companies !== 'undefined') Companies._renderBrowse(container); else container.innerHTML = ''; }
    else if (this.activeTab === 'company') {
      // Skip re-render while user is typing in an input to preserve form state
      const focused = document.activeElement;
      const userTyping = focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA');
      if (!userTyping && typeof Companies !== 'undefined') Companies._renderManage(container);
      else if (!userTyping) container.innerHTML = '';
    }
  },

  _renderMarket(container) {
    const esc = str => typeof Companies !== 'undefined' ? Companies._esc(str) : str;
    let html = '<div class="stock-grid">';

    // System stocks
    this.stocks.forEach((s, i) => {
      const price = this.prices[i];
      const prev = this.priceHistory[i].length >= 2 ? this.priceHistory[i][this.priceHistory[i].length - 2] : price;
      const dayChange = ((price - s.basePrice) / s.basePrice * 100);
      const isUp = dayChange >= 0;
      const luckyShares = s.symbol === 'LUCKY' && this.holdings['LUCKY'] ? this.holdings['LUCKY'].shares : 0;
      const cutPct = luckyShares > 0 ? Math.min(0.05, luckyShares / 100 * 0.001) : 0;
      const luckyBadge = s.symbol === 'LUCKY' && luckyShares > 0 && (App.rebirth || 0) >= 5
        ? `<div class="lucky-owner-badge" title="You earn ${(cutPct*100).toFixed(2)}% of casino losses">\u{1F3B0} ${(cutPct*100).toFixed(2)}% cut</div>`
        : '';
      html += `<div class="stock-card">
        <div class="stock-card-header">
          <div class="stock-symbol">${s.symbol}</div>
          <div class="stock-sector">${s.sector}</div>
        </div>
        <div class="stock-name">${s.name}</div>
        ${luckyBadge}
        <div class="stock-price">${App.formatMoney(price)}</div>
        <div class="stock-change ${isUp ? 'stock-up' : 'stock-down'}">${isUp ? '+' : ''}${dayChange.toFixed(2)}%</div>
        <canvas id="spark-${s.symbol}" class="stock-sparkline" width="80" height="30"></canvas>
        <div class="stock-actions">
          <button class="stock-buy-btn" onclick="Stocks.promptBuy('${s.symbol}')">Buy</button>
          <button class="stock-sell-btn" onclick="Stocks.promptSell('${s.symbol}')" ${this.holdings[s.symbol] ? '' : 'disabled'}>Sell</button>
          ${(App.rebirth || 0) >= this.ATTACK_REBIRTH_REQ
              ? `<button class="stock-attack-btn" onclick="Stocks.promptAttack('${s.symbol}')" title="Market Sabotage">\u{1F3AF}</button>`
              : (App.rebirth || 0) >= 3
                ? `<button class="stock-attack-btn stock-attack-locked" disabled title="Unlocks at VIP 5">\u{1F512}</button>`
                : ''
            }
        </div>
      </div>`;
    });

    // Public player stocks — same card style, inline with system stocks
    if (typeof Companies !== 'undefined') {
      const myUidForInsider = typeof Firebase !== 'undefined' ? Firebase.uid : null;
      Object.values(Companies._allPlayerStocks)
        .filter(s => s.type === 'public' && !s._bankruptDeclared)
        .forEach(s => {
          const hist = s.history || [];
          const prev = hist.length >= 2 ? hist[hist.length - 2] : s.price;
          const pct = prev > 0 ? ((s.price - prev) / prev * 100) : 0;
          const isUp = pct >= 0;
          const ownedShares = (Companies._holdings[s.symbol] || {}).shares || 0;

          // Insider Intel — only shown to the owner if they have the upgrade
          let insiderHtml = '';
          if (myUidForInsider && s.ownerUid === myUidForInsider) {
            const myComp = Companies._companies.find(c => c.ticker === s.companyTicker);
            const insLv = (myComp && myComp.upgrades && myComp.upgrades.insiderAccess) || 0;
            if (insLv > 0) {
              const tgt = Companies._playerStockTargets[s.symbol];
              if (tgt && tgt.stepsLeft > 0) {
                const dir = tgt.target > s.price ? '\u{1F4C8}' : '\u{1F4C9}';
                const movePct = Math.abs((tgt.target - s.price) / (s.price || 1) * 100);
                let hint = dir + ' ' + (tgt.target > s.price ? 'Buy' : 'Sell') + ' pressure';
                if (insLv >= 2) hint += ' \u2248' + movePct.toFixed(1) + '%';
                if (insLv >= 3) hint += ' \u2192 ' + App.formatMoney(tgt.target);
                insiderHtml = `<div class="insider-inline-hint">\u{1F50D} ${hint}</div>`;
              } else {
                insiderHtml = `<div class="insider-inline-hint" style="color:var(--text-dim)">\u{1F50D} Neutral</div>`;
              }
            }
          }

          html += `<div class="stock-card">
            <div class="stock-card-header">
              <div class="stock-symbol">${esc(s.symbol)}</div>
              <div class="player-stock-badge">PLAYER</div>
            </div>
            <div class="stock-name">${esc(s.name)}</div>
            <div style="font-size:11px;color:var(--text-dim);margin-bottom:2px">by ${esc(s.ownerName)}</div>
            <div class="stock-price">${App.formatMoney(s.price)}</div>
            <div class="stock-change ${isUp ? 'stock-up' : 'stock-down'}">${isUp ? '+' : ''}${pct.toFixed(2)}%</div>
            ${insiderHtml}
            <canvas id="spark-p-${esc(s.symbol)}" class="stock-sparkline" width="80" height="30"></canvas>
            <div class="stock-actions">
              <button class="stock-buy-btn" onclick="Companies.promptBuy('${s.symbol}')">Buy</button>
              <button class="stock-sell-btn" onclick="Companies.promptSell('${s.symbol}')" ${ownedShares > 0 ? '' : 'disabled'}>Sell</button>
            </div>
          </div>`;
        });
    }

    html += '</div>';

    // Distressed assets — separate section below the main grid
    if (typeof Companies !== 'undefined') {
      const bankruptList = Object.values(Companies._bankruptCompanies || {});
      if (bankruptList.length > 0) {
        html += '<div class="player-stocks-market-header" style="color:#e74c3c">&#x1F534; Distressed Assets</div><div class="stock-grid">';
        bankruptList.forEach(b => {
          if (!b || !b.ticker) return;
          const isOwner = typeof Firebase !== 'undefined' && Firebase.uid === b.originalOwnerUid;
          const elapsed = Date.now() - (b.bankruptAt || 0);
          const remaining = Math.max(0, Math.ceil((24 * 3600000 - elapsed) / 3600000));
          html += `<div class="stock-card bankrupt-card">
            <div class="stock-card-header">
              <div class="stock-symbol">${esc(b.ticker)}</div>
              <div class="distressed-badge">BANKRUPT</div>
            </div>
            <div class="stock-name">${esc(b.name || b.ticker)}</div>
            <div style="font-size:11px;color:var(--text-dim)">Owner: ${esc(b.originalOwnerName || '?')}</div>
            <div class="stock-price" style="color:#e74c3c">${App.formatMoney(b.debtCost)}</div>
            <div style="font-size:11px;color:var(--text-dim)">${remaining}h left</div>
            <div class="stock-actions">
              <button class="stock-buy-btn" style="background:#c0392b;border-color:#c0392b" onclick="Companies.bailOut('${b.ticker}')">
                ${isOwner ? 'Bail Out' : 'Acquire'}
              </button>
            </div>
          </div>`;
        });
        html += '</div>';
      }
    }

    container.innerHTML = html;

    // Draw all sparklines
    this.stocks.forEach((s, i) => this.drawSparkline('spark-' + s.symbol, this.priceHistory[i]));
    if (typeof Companies !== 'undefined') {
      Object.values(Companies._allPlayerStocks)
        .filter(s => s.type === 'public' && !s._bankruptDeclared)
        .forEach(s => this.drawSparkline('spark-p-' + s.symbol, s.history || []));
    }
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

  // === Bounty Board (R5+) ===

  openBountyModal() {
    if ((App.rebirth || 0) < 5) return;
    const html = `<div class="stock-trade-modal">
      <div class="stock-trade-title">\u{1F3AF} Post a Bounty</div>
      <div class="attack-info" style="font-size:12px;color:var(--text-dim)">
        Anyone who successfully sabotages the target stock claims the pot.<br>Expires in 1 hour — auto-refunded if not claimed.
      </div>
      <div style="margin:10px 0">
        <select id="bounty-stock-select" style="width:100%;padding:8px;background:var(--bg);border:1px solid var(--bg3);border-radius:6px;color:var(--text);font-size:14px">
          ${this.stocks.map((s, i) => `<option value="${s.symbol}">${s.symbol} — ${s.name}</option>`).join('')}
        </select>
        <div class="stock-trade-custom-amount" style="margin-top:8px">
          <label>Pot: $</label>
          <input type="number" id="bounty-amount-input" placeholder="Bounty amount" min="1">
        </div>
      </div>
      <button class="stock-trade-btn stock-buy-btn" onclick="Stocks._confirmPostBounty()">Post Bounty</button>
      <button class="stock-trade-cancel" onclick="Stocks.closeModal()">Cancel</button>
    </div>`;
    this._showModal(html);
  },

  _confirmPostBounty() {
    const sym = document.getElementById('bounty-stock-select')?.value;
    const amount = parseFloat(document.getElementById('bounty-amount-input')?.value) || 0;
    if (!sym) return;
    if (amount < 1) { alert('Enter a bounty amount.'); return; }
    if (amount > App.balance) { alert('Not enough balance.'); return; }
    this.postBounty(sym, amount);
    this.closeModal();
  },

  postBounty(symbol, amount) {
    if (!Firebase.isOnline()) { alert('Must be online to post bounties.'); return; }
    App.addBalance(-amount);
    App.save();
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const data = {
      symbol, pot: amount,
      posterId: Firebase.uid,
      posterName: typeof Settings !== 'undefined' ? Settings.profile.name : 'Player',
      expiresAt: Date.now() + 3600000,
      ts: Date.now(),
    };
    Firebase.postBounty(id, data).then(() => {
      Toast.show('\u{1F3AF} Bounty posted on ' + symbol + ' — ' + App.formatMoney(amount), '#ff9100', 3000);
    }).catch(err => {
      App.addBalance(amount); // refund on failure
      console.error('Bounty post failed:', err);
    });
  },

  _checkBounty(symbol) {
    if (!Firebase.isOnline()) return;
    const matching = Object.entries(this._bounties).filter(([, b]) => b.symbol === symbol);
    if (matching.length === 0) return;
    // Claim the highest-pot bounty
    matching.sort(([, a], [, b]) => (b.pot || 0) - (a.pot || 0));
    const [id, bounty] = matching[0];
    Firebase.claimBounty(id).then(() => {
      App.addBalance(bounty.pot);
      App.save();
      Toast.show('\u{1F3AF} Bounty claimed on ' + symbol + '! +' + App.formatMoney(bounty.pot), 'var(--green)', 5000);
    }).catch(() => {});
  },

  _expireBounties() {
    if (!Firebase.isOnline()) return;
    const now = Date.now();
    Object.entries(this._bounties).forEach(([id, bounty]) => {
      if (bounty.expiresAt && now > bounty.expiresAt) {
        Firebase.refundExpiredBounty(id, bounty.posterId, bounty.pot);
      }
    });
  },

  _renderBounties(container) {
    const r5 = (App.rebirth || 0) >= 5;
    if (!r5) {
      container.innerHTML = '<div class="stock-empty">\u{1F512} Bounty Board unlocks at Rebirth 5</div>';
      return;
    }
    const now = Date.now();
    const active = Object.entries(this._bounties)
      .filter(([, b]) => !b.expiresAt || now < b.expiresAt)
      .sort(([, a], [, b]) => (b.pot || 0) - (a.pot || 0));

    let html = `<div class="bounties-header">
      <button class="stock-buy-btn" style="margin:8px 0" onclick="Stocks.openBountyModal()">+ Post Bounty</button>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:6px">Post a reward for sabotaging a stock. Expires in 1 hour.</div>
    </div>`;

    if (active.length === 0) {
      html += '<div class="stock-empty">No active bounties. Post one!</div>';
    } else {
      html += '<div class="bounty-list">';
      active.forEach(([id, b]) => {
        const remaining = Math.max(0, Math.ceil((b.expiresAt - now) / 60000));
        const isMe = Firebase.uid === b.posterId;
        html += `<div class="bounty-card">
          <div class="bounty-card-header">
            <span class="bounty-symbol">${b.symbol}</span>
            <span class="bounty-pot">${App.formatMoney(b.pot)}</span>
          </div>
          <div class="bounty-card-body">
            <span>Posted by ${this._escapeHtml(b.posterName || 'Player')}</span>
            <span class="bounty-timer">${remaining}m left</span>
          </div>
          ${isMe ? `<span style="font-size:11px;color:var(--text-dim)">Your bounty</span>` : ''}
        </div>`;
      });
      html += '</div>';
    }
    container.innerHTML = html;
  },

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
        this._checkBounty(symbol);
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
    let text, color;
    if (success) {
      text = `🎯 Attack on ${symbol} worked! -${(dropPct*100).toFixed(0)}% incoming`;
      color = 'var(--red)';
    } else if (dropPct < 0) {
      text = `💥 Attack on ${symbol} backfired — it's going UP`;
      color = '#ff8800';
    } else {
      text = `❌ Attack on ${symbol} failed — fee lost`;
      color = 'var(--bg3)';
    }
    Toast.show(text, color);
  },

  // === Casino Ownership (R5+ & LUCKY shares) ===
  onCasinoLoss(amount) {
    if ((App.rebirth || 0) < 5) return;
    const luckyIdx = this.stocks.findIndex(s => s.symbol === 'LUCKY');
    if (luckyIdx < 0) return;
    const luckyShares = this.holdings['LUCKY'] ? this.holdings['LUCKY'].shares : 0;
    if (luckyShares <= 0) return;
    const cut = Math.min(0.05, luckyShares / 100 * 0.001);
    const earned = amount * cut;
    if (earned < 0.01) return;
    App.addBalance(earned);
    Toast.show('\u{1F3B0} Casino cut: +' + App.formatMoney(earned), '#ff9100', 3000);
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
    if (data.attackCooldowns) {
      const now = Date.now();
      this._attackCooldowns = {};
      for (const sym in data.attackCooldowns) {
        if (data.attackCooldowns[sym] > now) {
          this._attackCooldowns[sym] = data.attackCooldowns[sym];
        }
      }
    }
    this.initialized = true;
  },
};
