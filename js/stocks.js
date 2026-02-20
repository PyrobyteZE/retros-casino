// Stock Market Simulator
const Stocks = {
  stocks: [
    { symbol: 'RETRO', name: 'Retro Corp',    basePrice: 100, volatility: 0.04, sector: 'Tech' },
    { symbol: 'LUCKY', name: 'Lucky Gaming',   basePrice: 50,  volatility: 0.08, sector: 'Casino' },
    { symbol: 'VAULT', name: 'Vault Bank',     basePrice: 200, volatility: 0.02, sector: 'Finance' },
    { symbol: 'NEON',  name: 'Neon Energy',    basePrice: 75,  volatility: 0.08, sector: 'Energy' },
    { symbol: 'PIXEL', name: 'Pixel Media',    basePrice: 30,  volatility: 0.04, sector: 'Media' },
    { symbol: 'SHARK', name: 'Shark Loans',    basePrice: 150, volatility: 0.04, sector: 'Finance' },
    { symbol: 'BLAZE', name: 'Blaze Foods',    basePrice: 40,  volatility: 0.02, sector: 'Consumer' },
    { symbol: 'MOON',  name: 'MoonCoin Inc',   basePrice: 10,  volatility: 0.15, sector: 'Crypto' },
    { symbol: 'JOY',   name: 'JoyCorp Defense', basePrice: 500, volatility: 0.03, sector: 'Defense' },
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
    const isFollower = typeof Firebase !== 'undefined' && Firebase.isOnline() && !Firebase._isStockAuthority;

    if (isFollower && !this._hasActiveTargets()) {
      // Follower: prices come from listener, skip local math
      this._showOutOfSyncBanner(false);
      return;
    }

    if (!isAuthority && typeof Firebase !== 'undefined' && Firebase._hasConfig()) {
      // Offline — local math continues but show warning
      this._showOutOfSyncBanner(true);
    } else {
      this._showOutOfSyncBanner(false);
    }

    for (let i = 0; i < this.stocks.length; i++) {
      const s = this.stocks[i];
      let change = this.prices[i] * (Math.random() - 0.48) * s.volatility;

      // JOY special mechanic: 0.5% chance of sudden crash dip
      if (s.symbol === 'JOY' && Math.random() < 0.005) {
        const dipPct = -(0.20 + Math.random() * 0.20); // -20% to -40%
        change = this.prices[i] * dipPct;
      }

      // Admin gradual price target drift
      const tgt = this._priceTargets[i];
      if (tgt && tgt.stepsLeft > 0) {
        const drift = (tgt.target - this.prices[i]) / tgt.stepsLeft;
        // Add drift + some noise so it looks natural
        change = drift + this.prices[i] * (Math.random() - 0.5) * s.volatility * 0.3;
        tgt.stepsLeft--;
        if (tgt.stepsLeft <= 0) this._priceTargets[i] = null;
      }

      this.prices[i] = Math.max(1, this.prices[i] + change);
      this.priceHistory[i].push(this.prices[i]);
      if (this.priceHistory[i].length > 60) this.priceHistory[i].shift();
    }

    // Authority pushes prices to Firebase
    if (isAuthority) {
      Firebase.pushStockPrices(this.prices.slice());
    }

    if (App.currentScreen === 'stocks') this.render();
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
    // Only authority pushes events when online
    const isFollower = typeof Firebase !== 'undefined' && Firebase.isOnline() && !Firebase._isStockAuthority;
    if (isFollower) return;

    const events = [
      { type: 'earnings', text: '{stock} beat earnings!', min: 0.15, max: 0.30, single: true, good: true },
      { type: 'scandal', text: '{stock} hit by scandal!', min: -0.30, max: -0.15, single: true, good: false },
      { type: 'crash', text: 'Market Crash! All stocks down!', min: -0.20, max: -0.10, single: false, good: false },
      { type: 'bull', text: 'Bull Run! All stocks surge!', min: 0.10, max: 0.20, single: false, good: true },
      { type: 'joy_contract', text: 'JOY: Defense contract cancelled!', min: -0.30, max: -0.20, joyOnly: true, good: false },
      { type: 'joy_pump', text: 'JOY: New military contract awarded!', min: 0.15, max: 0.30, joyOnly: true, good: true },
    ];
    const event = events[Math.floor(Math.random() * events.length)];
    const pct = event.min + Math.random() * (event.max - event.min);

    if (event.joyOnly) {
      const joyIdx = this.stocks.findIndex(s => s.symbol === 'JOY');
      if (joyIdx >= 0) {
        this.prices[joyIdx] = Math.max(1, this.prices[joyIdx] * (1 + pct));
        this._addNews(event.text + ` (${pct > 0 ? '+' : ''}${(pct * 100).toFixed(1)}%)`, event.good);
      }
    } else if (event.single) {
      const idx = Math.floor(Math.random() * this.stocks.length);
      this.prices[idx] = Math.max(1, this.prices[idx] * (1 + pct));
      const news = event.text.replace('{stock}', this.stocks[idx].symbol) +
        ` (${pct > 0 ? '+' : ''}${(pct * 100).toFixed(1)}%)`;
      this._addNews(news, event.good);
    } else {
      for (let i = 0; i < this.stocks.length; i++) {
        const iPct = pct * (0.8 + Math.random() * 0.4);
        this.prices[i] = Math.max(1, this.prices[i] * (1 + iPct));
      }
      this._addNews(event.text + ` (${pct > 0 ? '+' : ''}${(pct * 100).toFixed(1)}%)`, event.good);
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
    if (!this.holdings[symbol] || this.holdings[symbol].shares < amount) return;
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
        <input type="number" id="stock-buy-amount-input" placeholder="Enter amount to invest" oninput="Stocks.updateBuyButton(this.value, ${price}, '${symbol}')">
        <button onclick="document.getElementById('stock-buy-amount-input').value = App.balance; Stocks.updateBuyButton(App.balance, ${price}, '${symbol}')">Max</button>
      </div>
      <div id="stock-buy-summary"></div>
      <div class="stock-trade-buttons">
        <button id="stock-buy-confirm-btn" class="stock-trade-btn" onclick="Stocks.buyWithMoney('${symbol}', ${price})" disabled>Buy</button>
      </div>
      <button class="stock-trade-cancel" onclick="Stocks.closeModal()">Cancel</button>
    </div>`;
    this._showModal(html);
  },

  updateBuyButton(money, price, symbol) {
    const amount = parseFloat(money);
    const summaryEl = document.getElementById('stock-buy-summary');
    const buyBtn = document.getElementById('stock-buy-confirm-btn');
    if (!summaryEl || !buyBtn) return;

    if (isNaN(amount) || amount <= 0) {
      summaryEl.textContent = '';
      buyBtn.disabled = true;
      return;
    }

    const shares = amount / price;
    summaryEl.textContent = `You will get ~${shares.toFixed(4)} shares`;
    buyBtn.disabled = amount > App.balance;
  },

  buyWithMoney(symbol, price) {
    const moneyInput = document.getElementById('stock-buy-amount-input');
    if (!moneyInput) return;

    const amount = parseFloat(moneyInput.value);
    if (isNaN(amount) || amount <= 0 || amount > App.balance) return;

    const shares = amount / price;
    this.buy(symbol, shares);
    this.closeModal();
  },

  promptSell(symbol) {
    if (!this.holdings[symbol]) return;
    const idx = this.stocks.findIndex(s => s.symbol === symbol);
    if (idx < 0) return;
    const price = this.prices[idx];
    const owned = this.holdings[symbol].shares;

    const amounts = [1, 5, 10, owned].filter(a => a <= owned && a > 0);
    const unique = [...new Set(amounts.map(a => Math.round(a * 100) / 100))];

    let html = `<div class="stock-trade-modal">
      <div class="stock-trade-title">Sell ${symbol} @ ${App.formatMoney(price)}</div>
      <div class="stock-trade-buttons">`;
    unique.forEach(a => {
      const label = a === owned ? 'ALL' : a + ' share' + (a>1?'s':'');
      html += `<button class="stock-trade-btn stock-sell-btn" onclick="Stocks.sell('${symbol}',${a});Stocks.closeModal()">${label}<br>${App.formatMoney(price*a)}</button>`;
    });
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

  // === Save/Load ===
  getSaveData() {
    return {
      prices: this.prices.slice(),
      holdings: JSON.parse(JSON.stringify(this.holdings)),
      cashInvested: this.cashInvested,
      totalProfit: this.totalProfit,
      newsHistory: this.newsHistory.slice(0, 10),
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
    this.initialized = true;
  },
};
