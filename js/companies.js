// ===== Player-Owned Companies =====
const Companies = {
  // === CONSTANTS ===
  FOUND_COST:     1_000_000,
  STOCK2_COST:      500_000,
  STOCK3_COST:    1_000_000,
  MAX_STOCKS: 3,

  // === STATE ===
  _company: null,         // { name, ticker, foundedAt, stocks: [{symbol,name,type:'public'|'private',price,vol,basePrice}], mainIdx:0 }
  _allPlayerStocks: {},   // { [symbol]: { ownerUid, ownerName, name, symbol, type, price, history:[], vol, foundedAt } }
  _holdings: {},          // { [symbol]: { shares, avgCost } }
  activeTab: 'browse',

  // === INIT ===
  init() {
    this._loadLocal();
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.listenPlayerStocks(data => this._onPlayerStocksUpdate(data));
      Firebase.listenPlayerStockPrices(prices => this._onPriceUpdate(prices));
    }
  },

  _loadLocal() {
    try {
      const raw = localStorage.getItem('retros_companies');
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.company) this._company = d.company;
      if (d.holdings) this._holdings = d.holdings;
    } catch (e) {}
  },

  _saveLocal() {
    localStorage.setItem('retros_companies', JSON.stringify({
      company: this._company,
      holdings: this._holdings,
    }));
  },

  getSaveData() {
    return { company: this._company, holdings: this._holdings };
  },

  loadSaveData(data) {
    if (!data) return;
    if (data.company) this._company = data.company;
    if (data.holdings) this._holdings = data.holdings;
  },

  // === FIREBASE CALLBACKS ===
  _onPlayerStocksUpdate(data) {
    if (!data) { this._allPlayerStocks = {}; return; }
    // data is { [uid]: { name, ticker, stocks: [...] } }
    const result = {};
    for (const uid in data) {
      const comp = data[uid];
      if (!comp || !comp.stocks) continue;
      comp.stocks.forEach(s => {
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
          foundedAt: comp.foundedAt || 0,
        };
      });
    }
    this._allPlayerStocks = result;
    if (App.currentScreen === 'companies') this.render();
  },

  _onPriceUpdate(prices) {
    if (!prices) return;
    for (const sym in prices) {
      if (this._allPlayerStocks[sym]) {
        const old = this._allPlayerStocks[sym].price;
        this._allPlayerStocks[sym].price = prices[sym];
        // Keep a short history
        const hist = this._allPlayerStocks[sym].history;
        hist.push(prices[sym]);
        if (hist.length > 60) hist.shift();
      }
    }
    // Also update my company's stock prices locally
    if (this._company) {
      this._company.stocks.forEach(s => {
        if (prices[s.symbol] !== undefined) {
          s.price = prices[s.symbol];
        }
      });
    }
    if (App.currentScreen === 'companies') this.render();
  },

  // === TICK (called by Stocks.tick if authority) ===
  tickPrices() {
    if (!this._allPlayerStocks || !Object.keys(this._allPlayerStocks).length) return;
    const updates = {};
    for (const sym in this._allPlayerStocks) {
      const s = this._allPlayerStocks[sym];
      const change = s.price * (Math.random() - 0.5) * 2 * (s.vol || 0.05);
      s.price = Math.max(0.01, s.price + change);
      updates[sym] = s.price;
    }
    if (typeof Firebase !== 'undefined' && Firebase.isOnline() && Firebase._isStockAuthority) {
      Firebase.pushPlayerStockPrices(updates);
    }
  },

  // === FOUND COMPANY ===
  foundCompany() {
    if (this._company) { alert('You already own a company!'); return; }
    const nameEl = document.getElementById('co-found-name');
    const tickerEl = document.getElementById('co-found-ticker');
    if (!nameEl || !tickerEl) return;
    const name = nameEl.value.trim();
    const ticker = tickerEl.value.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
    if (!name) { alert('Enter a company name.'); return; }
    if (!ticker || ticker.length < 2) { alert('Enter a ticker (2-5 letters).'); return; }
    if (App.balance < this.FOUND_COST) { alert('Not enough funds. You need $' + App.formatMoney(this.FOUND_COST)); return; }

    // Check ticker uniqueness against system stocks + other player stocks
    const allTickers = new Set([
      ...(typeof Stocks !== 'undefined' ? Stocks.stocks.map(s => s.symbol) : []),
      ...Object.keys(this._allPlayerStocks),
    ]);
    if (allTickers.has(ticker)) { alert('Ticker "' + ticker + '" is already taken. Choose another.'); return; }

    App.balance -= this.FOUND_COST;
    App.updateBalance();

    this._company = {
      name,
      ticker,
      ownerName: typeof Settings !== 'undefined' ? Settings.profile.name : 'Player',
      foundedAt: Date.now(),
      stocks: [],
      mainIdx: 0,
    };
    // Auto-add main stock with same ticker
    this._addStockToCompany(ticker, name + ' Stock', 'private', 100, 0.05, true);
    this._saveLocal();
    this._pushToFirebase();
    this.render();
  },

  _addStockToCompany(symbol, stockName, type, price, vol, isMain) {
    if (!this._company) return;
    this._company.stocks.push({ symbol, name: stockName, type, price, vol, basePrice: price });
    if (isMain) this._company.mainIdx = this._company.stocks.length - 1;
  },

  addStock() {
    if (!this._company) return;
    const count = this._company.stocks.length;
    if (count >= this.MAX_STOCKS) { alert('Maximum 3 stocks per company.'); return; }
    const cost = count === 1 ? this.STOCK2_COST : this.STOCK3_COST;
    if (App.balance < cost) { alert('Need $' + App.formatMoney(cost) + ' to add another stock.'); return; }

    const sym = prompt('New stock ticker (2-5 letters):')?.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
    if (!sym || sym.length < 2) { alert('Invalid ticker.'); return; }
    const allTickers = new Set([
      ...(typeof Stocks !== 'undefined' ? Stocks.stocks.map(s => s.symbol) : []),
      ...Object.keys(this._allPlayerStocks),
      ...this._company.stocks.map(s => s.symbol),
    ]);
    if (allTickers.has(sym)) { alert('Ticker "' + sym + '" is already taken.'); return; }

    const sName = prompt('Stock name:')?.trim();
    if (!sName) return;

    App.balance -= cost;
    App.updateBalance();
    this._addStockToCompany(sym, sName, 'private', 100, 0.05, false);
    this._saveLocal();
    this._pushToFirebase();
    this.render();
  },

  togglePublic(idx) {
    if (!this._company || !this._company.stocks[idx]) return;
    const s = this._company.stocks[idx];
    s.type = s.type === 'public' ? 'private' : 'public';
    this._saveLocal();
    this._pushToFirebase();
    this.render();
  },

  setMainStock(idx) {
    if (!this._company) return;
    this._company.mainIdx = idx;
    this._saveLocal();
    this._pushToFirebase();
    this.render();
  },

  issueDividend(idx) {
    if (!this._company || !this._company.stocks[idx]) return;
    const s = this._company.stocks[idx];
    const perShareStr = prompt('Dividend amount per share ($):');
    if (!perShareStr) return;
    const perShare = parseFloat(perShareStr);
    if (isNaN(perShare) || perShare <= 0) { alert('Invalid amount.'); return; }

    // Count total shares (holdings of this symbol across all players, just this player for now)
    let totalShares = 0;
    for (const sym in this._holdings) {
      if (sym === s.symbol) totalShares += this._holdings[sym].shares || 0;
    }
    // Also push dividend to Firebase for all holders via presence
    const totalCost = perShare * Math.max(1, totalShares);
    if (App.balance < totalCost) { alert('Not enough funds. Need $' + App.formatMoney(totalCost)); return; }
    App.balance -= totalCost;
    App.updateBalance();
    // Pay local holdings
    if (this._holdings[s.symbol] && this._holdings[s.symbol].shares > 0) {
      const payout = perShare * this._holdings[s.symbol].shares;
      App.addBalance(payout);
      this._toast('\u{1F4B0} Dividend received: +$' + App.formatMoney(payout));
    }
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.pushPlayerDividend(s.symbol, perShare, Firebase.uid);
    }
    this.render();
  },

  // === TRADING ===
  promptBuy(symbol) {
    const s = this._allPlayerStocks[symbol];
    if (!s) return;
    const qtyStr = prompt(`Buy ${symbol} @ $${s.price.toFixed(2)}\nHow many shares?`);
    if (!qtyStr) return;
    const qty = parseInt(qtyStr);
    if (isNaN(qty) || qty <= 0) return;
    const total = qty * s.price;
    if (App.balance < total) { alert('Not enough funds.'); return; }
    if (typeof Settings !== 'undefined' && Settings.shouldConfirmBet(total)) {
      if (!confirm(`Buy ${qty} shares of ${symbol} for $${App.formatMoney(total)}?`)) return;
    }
    App.balance -= total;
    App.updateBalance();
    if (!this._holdings[symbol]) this._holdings[symbol] = { shares: 0, avgCost: 0 };
    const h = this._holdings[symbol];
    const prev = h.shares * h.avgCost;
    h.shares += qty;
    h.avgCost = (prev + total) / h.shares;
    this._saveLocal();
    this._toast('\u2705 Bought ' + qty + 'x ' + symbol);
    if (App.currentScreen === 'companies') this.render();
  },

  promptSell(symbol) {
    const s = this._allPlayerStocks[symbol];
    if (!s) return;
    const h = this._holdings[symbol];
    if (!h || h.shares <= 0) { alert("You don't own any " + symbol + " shares."); return; }
    const qtyStr = prompt(`Sell ${symbol} @ $${s.price.toFixed(2)}\nYou own ${h.shares} shares. How many to sell?`);
    if (!qtyStr) return;
    const qty = Math.min(parseInt(qtyStr), h.shares);
    if (isNaN(qty) || qty <= 0) return;
    const total = qty * s.price;
    App.addBalance(total);
    h.shares -= qty;
    if (h.shares === 0) delete this._holdings[symbol];
    this._saveLocal();
    this._toast('\u{1F4B0} Sold ' + qty + 'x ' + symbol + ' +$' + App.formatMoney(total));
    if (App.currentScreen === 'companies') this.render();
  },

  // === FIREBASE PUSH ===
  _pushToFirebase() {
    if (typeof Firebase === 'undefined' || !Firebase.isOnline() || !this._company) return;
    Firebase.postCompany(Firebase.uid, {
      ...this._company,
      ownerName: typeof Settings !== 'undefined' ? Settings.profile.name : 'Player',
    });
  },

  // === RENDER ===
  setTab(tab) {
    this.activeTab = tab;
    this.render();
  },

  render() {
    const container = document.getElementById('companies-content');
    if (!container) return;

    // Update tab buttons
    document.querySelectorAll('.company-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === this.activeTab);
    });

    if (this.activeTab === 'browse') this._renderBrowse(container);
    else this._renderManage(container);
  },

  _renderBrowse(container) {
    const publicStocks = Object.values(this._allPlayerStocks).filter(s => s.type === 'public');
    if (publicStocks.length === 0) {
      container.innerHTML = `<div class="company-empty" style="text-align:center;color:var(--text-dim);padding:32px 16px">
        <div style="font-size:48px;margin-bottom:12px">&#x1F3E2;</div>
        <div style="font-weight:700;margin-bottom:6px">No public player stocks yet</div>
        <div style="font-size:13px">Found a company and go public to list your stocks here!</div>
      </div>`;
      return;
    }
    let html = '<div style="display:flex;flex-direction:column;gap:10px">';
    publicStocks.forEach(s => {
      const h = this._holdings[s.symbol];
      const owned = h ? h.shares : 0;
      const hist = s.history;
      const prev = hist.length >= 2 ? hist[hist.length - 2] : s.price;
      const pct = prev > 0 ? ((s.price - prev) / prev * 100) : 0;
      const isUp = pct >= 0;
      html += `<div class="company-card">
        <div class="company-card-header">
          <div>
            <span class="company-card-sym">${this._esc(s.symbol)}</span>
            <span class="player-stock-badge">PLAYER</span>
          </div>
          <div class="company-card-price ${isUp ? 'ticker-up' : 'ticker-dn'}">
            $${s.price < 10 ? s.price.toFixed(2) : Math.round(s.price).toLocaleString()}
            <span style="font-size:12px">${isUp ? '&#x25B2;' : '&#x25BC;'}${Math.abs(pct).toFixed(2)}%</span>
          </div>
        </div>
        <div class="company-card-name">${this._esc(s.name)}</div>
        <div class="company-card-owner">by ${this._esc(s.ownerName)}${owned > 0 ? ' &bull; You own <strong>' + owned + '</strong> shares' : ''}</div>
        <div class="company-card-actions">
          <button class="company-buy-btn" onclick="Companies.promptBuy('${s.symbol}')">Buy</button>
          ${owned > 0 ? `<button class="company-sell-btn" onclick="Companies.promptSell('${s.symbol}')">Sell</button>` : ''}
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  },

  _renderManage(container) {
    if (!this._company) {
      container.innerHTML = `
        <div class="company-found-form">
          <div style="font-size:36px;text-align:center;margin-bottom:8px">&#x1F3E2;</div>
          <div style="font-weight:800;font-size:18px;text-align:center;margin-bottom:4px">Found a Company</div>
          <div class="company-found-cost">Cost: $${App.formatMoney(this.FOUND_COST)}</div>
          <input type="text" id="co-found-name" placeholder="Company Name (e.g. Retro Corp)" maxlength="32" style="font-size:16px">
          <input type="text" id="co-found-ticker" placeholder="Ticker (e.g. RETRO)" maxlength="5" style="text-transform:uppercase;font-size:16px">
          <button class="company-found-btn" onclick="Companies.foundCompany()">Found Company — $${App.formatMoney(this.FOUND_COST)}</button>
        </div>`;
      return;
    }

    const c = this._company;
    let html = `
      <div class="company-manage-section">
        <h3>&#x1F3E2; ${this._esc(c.name)} <span style="color:var(--text-dim);font-weight:400">(${this._esc(c.ticker)})</span></h3>
        <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px">
          Founded ${new Date(c.foundedAt).toLocaleDateString()}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">`;

    c.stocks.forEach((s, i) => {
      const isMain = i === c.mainIdx;
      const h = this._holdings[s.symbol];
      html += `<div class="company-stock-row">
        <div>
          <span class="csr-sym">${this._esc(s.symbol)}</span>
          ${isMain ? '<span style="font-size:10px;color:var(--gold);margin-left:4px">MAIN</span>' : ''}
          <div class="company-card-name">${this._esc(s.name)}</div>
        </div>
        <div style="text-align:right">
          <div class="csr-price">$${s.price < 10 ? s.price.toFixed(2) : Math.round(s.price).toLocaleString()}</div>
          <div class="csr-type ${s.type === 'public' ? 'csr-type-public' : 'csr-type-private'}">${s.type}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <button class="csr-toggle-btn" onclick="Companies.togglePublic(${i})">${s.type === 'public' ? 'Make Private' : 'Go Public'}</button>
          ${!isMain ? `<button class="csr-toggle-btn" onclick="Companies.setMainStock(${i})" style="font-size:10px">Set Main</button>` : ''}
          <button class="csr-toggle-btn" onclick="Companies.issueDividend(${i})" style="color:var(--gold);border-color:var(--gold)">Dividend</button>
        </div>
      </div>`;
    });

    html += `</div>`;

    if (c.stocks.length < this.MAX_STOCKS) {
      const cost = c.stocks.length === 1 ? this.STOCK2_COST : this.STOCK3_COST;
      html += `<button class="add-stock-btn" onclick="Companies.addStock()">+ Add Stock — $${App.formatMoney(cost)}</button>`;
    } else {
      html += `<div style="text-align:center;color:var(--text-dim);font-size:12px;margin-top:8px">Maximum 3 stocks reached</div>`;
    }

    html += `</div>`;

    // Holdings
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
            <div class="csr-price">$${App.formatMoney(value)}</div>
            <div style="font-size:12px;${pl >= 0 ? 'color:var(--green)' : 'color:var(--red)'}">${pl >= 0 ? '+' : ''}$${App.formatMoney(pl)}</div>
          </div>
        </div>`;
      });
      html += `</div></div>`;
    }

    container.innerHTML = html;
  },

  _esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  _toast(msg) {
    const el = document.createElement('div');
    el.className = 'insider-tip-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  },
};
