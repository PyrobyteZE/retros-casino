// Crypto Mining System - Click + Idle
const Crypto = {
  // Minable coins
  coins: [
    { symbol: 'BTC',  name: 'BitCoin',   baseValue: 500,  color: '#f7931a' },
    { symbol: 'ETH',  name: 'EtherCoin', baseValue: 50,   color: '#627eea' },
    { symbol: 'DOGE', name: 'DogeCoin',  baseValue: 0.10, color: '#c2a633' },
  ],

  // Mining rigs (idle income)
  rigs: [
    { name: 'USB Miner',   icon: '\u{1F50C}', cost: 1000,     baseRate: 0.0001, coin: 'BTC',  maxLevel: 10 },
    { name: 'Gaming PC',   icon: '\u{1F5A5}\uFE0F', cost: 10000,    baseRate: 0.001,  coin: 'ETH',  maxLevel: 10 },
    { name: 'Mining Rig',  icon: '\u2699\uFE0F',  cost: 100000,   baseRate: 0.01,   coin: 'ETH',  maxLevel: 10 },
    { name: 'ASIC Miner',  icon: '\u{1F4A0}', cost: 500000,   baseRate: 0.005,  coin: 'BTC',  maxLevel: 10 },
    { name: 'Server Farm',icon: '\u{1F3ED}', cost: 5000000,  baseRate: 0.05,   coin: 'BTC',  maxLevel: 10 },
    { name: 'DOGE Farm',   icon: '\u{1F436}', cost: 50000,    baseRate: 10,     coin: 'DOGE', maxLevel: 10 },
  ],

  // Click mining upgrades
  clickUpgrades: [
    { name: 'Better CPU',   desc: '+50% hash rate/level', maxLevel: 10, baseCost: 5000,    costMult: 2, effect: 0.5 },
    { name: 'GPU Boost',    desc: '+100% hash rate/level', maxLevel: 5,  baseCost: 50000,   costMult: 3, effect: 1.0 },
    { name: 'Overclocking', desc: '5% chance 10x block/level', maxLevel: 5,  baseCost: 100000,  costMult: 3, effect: 0.05 },
  ],

  // Cooling upgrades
  coolingUpgrades: [
    { name: 'Case Fans',     cost: 5000,     heatCapBonus: 20 },
    { name: 'Liquid Cooling', cost: 50000,   heatCapBonus: 30 },
    { name: 'Cryo System',   cost: 500000,  heatCapBonus: 50 },
  ],

  // State
  wallet: { BTC: 0, ETH: 0, DOGE: 0 },
  totalMined: { BTC: 0, ETH: 0, DOGE: 0 },
  rigOwned: [],     // bool[]
  rigLevels: [],    // number[]
  upgrades: { cpu: 0, gpu: 0, overclock: 0 },
  cooling: [],      // bool[] for cooling upgrades
  heat: 0,          // 0-100
  coinPrices: [],   // current exchange rates
  priceHistory: [], // last 30 per coin
  activeTab: 'mine',
  tickTimer: null,
  priceTimer: null,
  initialized: false,
  mineAnimating: false,
  _priceTargets: [],  // admin gradual targets

  init() {
    if (!this.initialized) {
      this.rigOwned = this.rigs.map(() => false);
      this.rigLevels = this.rigs.map(() => 0);
      this.cooling = this.coolingUpgrades.map(() => false);
      this.coinPrices = this.coins.map(c => c.baseValue);
      this.priceHistory = this.coins.map(c => {
        const arr = [];
        for (let i = 0; i < 30; i++) arr.push(c.baseValue);
        return arr;
      });
      this._priceTargets = this.coins.map(() => null);
      this.initialized = true;
    }
    this.startTick();
    this.startPriceTick();
    this.render();
  },

  startTick() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = setInterval(() => this.tick(), 1000);
  },

  startPriceTick() {
    if (this.priceTimer) clearInterval(this.priceTimer);
    this.priceTimer = setInterval(() => this.priceTick(), 5000);
  },

  tick() {
    // Heat management
    const totalHeatGen = this._getHeatGeneration();
    const heatDissipation = 2 + this._getCoolingBonus() * 0.5;
    this.heat = Math.max(0, Math.min(100, this.heat + totalHeatGen - heatDissipation));

    // Efficiency based on heat
    const efficiency = this._getHeatEfficiency();

    // Random rig shutdown at >95% heat
    if (this.heat > 95 && Math.random() < 0.1) {
      const ownedRigs = this.rigOwned.map((o, i) => o ? i : -1).filter(i => i >= 0);
      if (ownedRigs.length > 0) {
        const shutIdx = ownedRigs[Math.floor(Math.random() * ownedRigs.length)];
        this.rigOwned[shutIdx] = false;
        this._addMineLog('Rig "' + this.rigs[shutIdx].name + '" overheated and shut down!');
      }
    }

    // Idle rig income
    for (let i = 0; i < this.rigs.length; i++) {
      if (!this.rigOwned[i]) continue;
      const rig = this.rigs[i];
      const rate = rig.baseRate * (this.rigLevels[i] + 1) * efficiency;
      this.wallet[rig.coin] += rate;
      this.totalMined[rig.coin] += rate;
    }

    if (App.currentScreen === 'crypto') this.render();
  },

  priceTick() {
    const isAuthority = typeof Firebase !== 'undefined' && Firebase.isOnline() && Firebase._isCryptoAuthority;
    const isFollower = typeof Firebase !== 'undefined' && Firebase.isOnline() && !Firebase._isCryptoAuthority;

    if (isFollower) {
      // Follower: prices come from listener
      this._showOutOfSyncBanner(false);
      return;
    }

    if (!isAuthority && typeof Firebase !== 'undefined' && Firebase._hasConfig()) {
      this._showOutOfSyncBanner(true);
    } else {
      this._showOutOfSyncBanner(false);
    }

    for (let i = 0; i < this.coins.length; i++) {
      let change = this.coinPrices[i] * (Math.random() - 0.5) * 0.03;

      // Admin gradual price target drift
      const tgt = this._priceTargets[i];
      if (tgt && tgt.stepsLeft > 0) {
        const drift = (tgt.target - this.coinPrices[i]) / tgt.stepsLeft;
        change = drift + this.coinPrices[i] * (Math.random() - 0.5) * 0.01;
        tgt.stepsLeft--;
        if (tgt.stepsLeft <= 0) this._priceTargets[i] = null;
      }

      this.coinPrices[i] = Math.max(this.coins[i].baseValue * 0.1, this.coinPrices[i] + change);
      this.priceHistory[i].push(this.coinPrices[i]);
      if (this.priceHistory[i].length > 30) this.priceHistory[i].shift();
    }

    // Authority pushes prices
    if (isAuthority) {
      Firebase.pushCryptoPrices(this.coinPrices.slice());
    }

    if (App.currentScreen === 'crypto') this.render();
  },

  applyServerPrices(prices) {
    if (!prices || prices.length !== this.coins.length) return;
    this.coinPrices = prices.slice();
    for (let i = 0; i < this.coins.length; i++) {
      this.priceHistory[i].push(this.coinPrices[i]);
      if (this.priceHistory[i].length > 30) this.priceHistory[i].shift();
    }
    this._showOutOfSyncBanner(false);
    if (App.currentScreen === 'crypto') this.render();
  },

  _showOutOfSyncBanner(show) {
    let banner = document.getElementById('crypto-sync-banner');
    if (show) {
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'crypto-sync-banner';
        banner.className = 'out-of-sync-banner';
        banner.textContent = 'Crypto exchange out of sync — prices are local only';
        const container = document.querySelector('#screen-crypto .game-container');
        if (container) container.insertBefore(banner, container.firstChild);
      }
    } else if (banner) {
      banner.remove();
    }
  },

  // === Click Mining ===
  mine() {
    if (this.mineAnimating) return;
    const hashPower = this._getHashPower();
    let amount = 0.001 * hashPower;

    // Overclock chance
    const ocLevel = this.upgrades.overclock;
    if (ocLevel > 0 && Math.random() < ocLevel * 0.05) {
      amount *= 10;
      this._showMineResult('10x BLOCK!', true);
    }

    this.wallet.BTC += amount;
    this.totalMined.BTC += amount;

    // Heat from clicking
    this.heat = Math.min(100, this.heat + 0.5);

    this._animateMine();
    if (App.currentScreen === 'crypto') this.render();
  },

  _getHashPower() {
    let power = 1;
    power += this.upgrades.cpu * 0.5;
    power += this.upgrades.gpu * 1.0;
    return power;
  },

  _getHeatGeneration() {
    let heat = 0;
    for (let i = 0; i < this.rigs.length; i++) {
      if (this.rigOwned[i]) heat += 1 + this.rigLevels[i] * 0.5;
    }
    return heat;
  },

  _getCoolingBonus() {
    let bonus = 0;
    this.coolingUpgrades.forEach((c, i) => {
      if (this.cooling[i]) bonus += c.heatCapBonus;
    });
    return bonus;
  },

  _getHeatEfficiency() {
    if (this.heat > 95) return 0.5;
    if (this.heat > 80) return 0.8;
    return 1.0;
  },

  _animateMine() {
    this.mineAnimating = true;
    const btn = document.getElementById('crypto-mine-btn');
    if (btn) btn.classList.add('mining-active');
    setTimeout(() => {
      this.mineAnimating = false;
      if (btn) btn.classList.remove('mining-active');
    }, 200);
  },

  _mineLogMessages: [],

  _addMineLog(msg) {
    this._mineLogMessages.unshift(msg);
    if (this._mineLogMessages.length > 5) this._mineLogMessages.pop();
  },

  _showMineResult(text, special) {
    this._addMineLog(text);
  },

  // === Upgrades ===
  buyClickUpgrade(idx) {
    const up = this.clickUpgrades[idx];
    const keys = ['cpu', 'gpu', 'overclock'];
    const key = keys[idx];
    if (this.upgrades[key] >= up.maxLevel) return;
    const cost = up.baseCost * Math.pow(up.costMult, this.upgrades[key]);
    if (App.balance < cost) return;
    App.addBalance(-cost);
    this.upgrades[key]++;
    App.save();
    this.render();
  },

  // === Rigs ===
  buyRig(idx) {
    if (this.rigOwned[idx]) return;
    const cost = this.rigs[idx].cost;
    if (App.balance < cost) return;
    App.addBalance(-cost);
    this.rigOwned[idx] = true;
    this.rigLevels[idx] = 0;
    App.save();
    this.render();
  },

  upgradeRig(idx) {
    if (!this.rigOwned[idx]) return;
    if (this.rigLevels[idx] >= this.rigs[idx].maxLevel) return;
    const cost = this.rigs[idx].cost * Math.pow(2, this.rigLevels[idx]);
    if (App.balance < cost) return;
    App.addBalance(-cost);
    this.rigLevels[idx]++;
    App.save();
    this.render();
  },

  // === Cooling ===
  buyCooling(idx) {
    if (this.cooling[idx]) return;
    const cost = this.coolingUpgrades[idx].cost;
    if (App.balance < cost) return;
    App.addBalance(-cost);
    this.cooling[idx] = true;
    App.save();
    this.render();
  },

  // === Admin Gradual Price Control ===
  setGradualTarget(idx, targetPrice, steps) {
    if (!this._priceTargets.length) {
      this._priceTargets = this.coins.map(() => null);
    }
    this._priceTargets[idx] = { target: targetPrice, stepsLeft: steps || 10 };
  },

  setGradualAll(multiplier, steps) {
    if (!this._priceTargets.length) {
      this._priceTargets = this.coins.map(() => null);
    }
    for (let i = 0; i < this.coins.length; i++) {
      this._priceTargets[i] = { target: this.coinPrices[i] * multiplier, stepsLeft: steps || 10 };
    }
  },

  // === Exchange ===
  buyCoin(symbol, cashAmount) {
    const idx = this.coins.findIndex(c => c.symbol === symbol);
    if (idx < 0) return;
    if (cashAmount <= 0 || App.balance < cashAmount) return;
    const coinAmount = cashAmount / this.coinPrices[idx];
    App.addBalance(-cashAmount);
    this.wallet[symbol] += coinAmount;
    App.save();
    this.render();
  },

  promptBuyCoin(symbol) {
    const idx = this.coins.findIndex(c => c.symbol === symbol);
    if (idx < 0) return;
    const price = this.coinPrices[idx];
    const maxCash = App.balance;
    if (maxCash < 1) return;

    const amounts = [100, 1000, 10000, Math.floor(maxCash)].filter(a => a > 0 && a <= maxCash);
    const unique = [...new Set(amounts)];

    let html = `<div class="stock-trade-modal">
      <div class="stock-trade-title">Buy ${symbol} @ ${App.formatMoney(price)}</div>
      <div class="stock-trade-buttons">`;
    unique.forEach(a => {
      const coins = a / price;
      html += `<button class="stock-trade-btn" onclick="Crypto.buyCoin('${symbol}',${a});Crypto.closeModal()">${App.formatMoney(a)}<br>${coins.toFixed(4)} ${symbol}</button>`;
    });
    html += `</div><button class="stock-trade-cancel" onclick="Crypto.closeModal()">Cancel</button></div>`;
    this._showModal(html);
  },

  promptSellCoin(symbol) {
    const idx = this.coins.findIndex(c => c.symbol === symbol);
    if (idx < 0) return;
    const price = this.coinPrices[idx];
    const owned = this.wallet[symbol];
    if (owned <= 0) return;

    const amounts = [0.25, 0.5, 1.0].map(pct => owned * pct).filter(a => a > 0);
    let html = `<div class="stock-trade-modal">
      <div class="stock-trade-title">Sell ${symbol} @ ${App.formatMoney(price)}</div>
      <div class="stock-trade-buttons">`;
    const labels = ['25%', '50%', 'All'];
    amounts.forEach((a, i) => {
      html += `<button class="stock-trade-btn stock-sell-btn" onclick="Crypto.sellCoin('${symbol}',${a});Crypto.closeModal()">${labels[i]}<br>${App.formatMoney(a * price)}</button>`;
    });
    html += `</div><button class="stock-trade-cancel" onclick="Crypto.closeModal()">Cancel</button></div>`;
    this._showModal(html);
  },

  _showModal(html) {
    let modal = document.getElementById('crypto-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'crypto-modal';
      modal.className = 'stock-modal-overlay';
      document.getElementById('app').appendChild(modal);
    }
    modal.innerHTML = html;
    modal.classList.remove('hidden');
  },

  closeModal() {
    const modal = document.getElementById('crypto-modal');
    if (modal) modal.classList.add('hidden');
  },

  sellCoin(symbol, amount) {
    const idx = this.coins.findIndex(c => c.symbol === symbol);
    if (idx < 0) return;
    if (this.wallet[symbol] < amount) amount = this.wallet[symbol];
    if (amount <= 0) return;
    const value = amount * this.coinPrices[idx];
    this.wallet[symbol] -= amount;
    App.addBalance(value);
    App.save();
    this.render();
  },

  sellAllCoin(symbol) {
    this.sellCoin(symbol, this.wallet[symbol]);
  },

  // === Tabs ===
  setTab(tab) {
    this.activeTab = tab;
    this.render();
  },

  // === Rendering ===
  render() {
    const container = document.getElementById('crypto-content');
    if (!container) return;

    // Tab buttons
    document.querySelectorAll('.crypto-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === this.activeTab);
    });

    if (this.activeTab === 'mine') this._renderMine(container);
    else if (this.activeTab === 'rigs') this._renderRigs(container);
    else if (this.activeTab === 'exchange') this._renderExchange(container);
  },

  _renderMine(container) {
    const hashPower = this._getHashPower();
    const btcPerClick = 0.001 * hashPower;

    let html = `
      <div class="mine-stats">
        <div class="mine-stat"><span class="stat-label">Hash Power</span><span>${hashPower.toFixed(1)}x</span></div>
        <div class="mine-stat"><span class="stat-label">BTC/Click</span><span>${btcPerClick.toFixed(4)}</span></div>
        <div class="mine-stat"><span class="stat-label">Heat</span><span class="${this.heat > 80 ? 'heat-danger' : ''}">${this.heat.toFixed(0)}%</span></div>
      </div>

      <div class="heat-bar-wrap">
        <div class="heat-bar" style="width:${this.heat}%;background:${this.heat > 95 ? '#ff5252' : this.heat > 80 ? '#ff9100' : '#00e676'}"></div>
      </div>

      <div class="mine-hash-display" id="mine-hash-display">
        <div class="hash-text">${this._randomHash()}</div>
      </div>

      <button id="crypto-mine-btn" class="mine-btn" onclick="Crypto.mine()">
        MINE<br><span class="mine-btn-sub">+${btcPerClick.toFixed(4)} BTC</span>
      </button>

      <div class="mine-wallet-mini">
        <span style="color:#f7931a">${this.wallet.BTC.toFixed(4)} BTC</span>
        <span style="color:#627eea">${this.wallet.ETH.toFixed(4)} ETH</span>
        <span style="color:#c2a633">${this.wallet.DOGE.toFixed(2)} DOGE</span>
      </div>

      <div class="mine-upgrades">
        <h3>Hash Upgrades</h3>`;

    const keys = ['cpu', 'gpu', 'overclock'];
    this.clickUpgrades.forEach((up, i) => {
      const level = this.upgrades[keys[i]];
      const maxed = level >= up.maxLevel;
      const cost = up.baseCost * Math.pow(up.costMult, level);
      const affordable = App.balance >= cost;
      html += `<div class="mine-upgrade-item ${affordable && !maxed ? 'affordable' : ''}">
        <div class="upgrade-info">
          <div class="upgrade-name">${up.name} <span class="upgrade-level">Lv ${level}/${up.maxLevel}</span></div>
          <div class="upgrade-desc">${up.desc}</div>
        </div>
        ${maxed
          ? '<div class="upgrade-cost" style="color:var(--green)">MAX</div>'
          : `<button class="upgrade-cost" onclick="Crypto.buyClickUpgrade(${i})">${App.formatMoney(cost)}</button>`
        }
      </div>`;
    });

    html += '</div>';

    // Cooling section
    html += '<div class="mine-upgrades"><h3>Cooling</h3>';
    this.coolingUpgrades.forEach((c, i) => {
      const owned = this.cooling[i];
      const affordable = App.balance >= c.cost;
      html += `<div class="mine-upgrade-item ${!owned && affordable ? 'affordable' : ''}">
        <div class="upgrade-info">
          <div class="upgrade-name">${c.name}</div>
          <div class="upgrade-desc">+${c.heatCapBonus}% heat tolerance</div>
        </div>
        ${owned
          ? '<div class="upgrade-cost" style="color:var(--green)">OWNED</div>'
          : `<button class="upgrade-cost" onclick="Crypto.buyCooling(${i})">${App.formatMoney(c.cost)}</button>`
        }
      </div>`;
    });
    html += '</div>';

    container.innerHTML = html;
  },

  _renderRigs(container) {
    const efficiency = this._getHeatEfficiency();
    let html = `<div class="rig-efficiency">Efficiency: <span class="${efficiency < 1 ? 'heat-danger' : ''}">${(efficiency * 100).toFixed(0)}%</span></div>`;
    html += '<div class="rig-grid">';

    this.rigs.forEach((rig, i) => {
      const owned = this.rigOwned[i];
      const level = this.rigLevels[i];
      const maxed = level >= rig.maxLevel;
      const rate = rig.baseRate * (level + 1) * efficiency;
      const coinColor = this.coins.find(c => c.symbol === rig.coin).color;

      if (!owned) {
        const affordable = App.balance >= rig.cost;
        html += `<div class="rig-card ${affordable ? 'affordable' : ''}" onclick="Crypto.buyRig(${i})">
          <div class="rig-icon">${rig.icon}</div>
          <div class="rig-name">${rig.name}</div>
          <div class="rig-detail" style="color:${coinColor}">${rig.baseRate} ${rig.coin}/s</div>
          <button class="prop-btn prop-buy-btn">Buy: ${App.formatMoney(rig.cost)}</button>
        </div>`;
      } else {
        const upgCost = rig.cost * Math.pow(2, level);
        const affordable = !maxed && App.balance >= upgCost;
        html += `<div class="rig-card owned">
          <div class="rig-icon">${rig.icon}</div>
          <div class="rig-name">${rig.name}</div>
          <div class="rig-level">Lv ${level}/${rig.maxLevel}</div>
          <div class="rig-detail" style="color:${coinColor}">${rate.toFixed(4)} ${rig.coin}/s</div>
          ${maxed
            ? '<button class="prop-btn prop-maxed" disabled>MAXED</button>'
            : `<button class="prop-btn ${affordable ? 'affordable' : ''}" onclick="Crypto.upgradeRig(${i})">Upgrade: ${App.formatMoney(upgCost)}</button>`
          }
        </div>`;
      }
    });

    html += '</div>';
    container.innerHTML = html;
  },

  _renderExchange(container) {
    let html = '<div class="exchange-list">';
    this.coins.forEach((coin, i) => {
      const price = this.coinPrices[i];
      const amount = this.wallet[coin.symbol];
      const value = amount * price;

      html += `<div class="exchange-card">
        <div class="exchange-header">
          <span class="exchange-symbol" style="color:${coin.color}">${coin.symbol}</span>
          <span class="exchange-price">${App.formatMoney(price)} / ${coin.symbol}</span>
        </div>
        <div class="exchange-balance">
          <span>${amount.toFixed(4)} ${coin.symbol}</span>
          <span class="exchange-value">= ${App.formatMoney(value)}</span>
        </div>
        <canvas id="crypto-chart-${coin.symbol}" class="crypto-chart" width="200" height="40"></canvas>
        <div class="exchange-actions">
          <button class="stock-buy-btn" onclick="Crypto.promptBuyCoin('${coin.symbol}')">Buy</button>
          <button class="stock-sell-btn" onclick="Crypto.promptSellCoin('${coin.symbol}')" ${amount > 0 ? '' : 'disabled'}>Sell</button>
        </div>
      </div>`;
    });
    html += '</div>';

    // Total mined stats
    html += '<div class="mine-total-stats"><h3>Total Mined</h3>';
    this.coins.forEach(coin => {
      html += `<div class="mine-total-row"><span style="color:${coin.color}">${coin.symbol}</span><span>${this.totalMined[coin.symbol].toFixed(4)}</span></div>`;
    });
    html += '</div>';

    container.innerHTML = html;

    // Draw price charts
    this.coins.forEach((coin, i) => {
      this._drawPriceChart('crypto-chart-' + coin.symbol, this.priceHistory[i], coin.color);
    });
  },

  _drawPriceChart(canvasId, data, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (data.length < 2) return;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    ctx.strokeStyle = color;
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

  _randomHash() {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 32; i++) hash += chars[Math.floor(Math.random() * 16)];
    return hash;
  },

  // === Save/Load ===
  getSaveData() {
    return {
      wallet: { ...this.wallet },
      totalMined: { ...this.totalMined },
      rigOwned: this.rigOwned.slice(),
      rigLevels: this.rigLevels.slice(),
      upgrades: { ...this.upgrades },
      cooling: this.cooling.slice(),
      heat: this.heat,
      coinPrices: this.coinPrices.slice(),
    };
  },

  loadSaveData(data) {
    if (!data) return;
    if (data.wallet) this.wallet = { BTC: 0, ETH: 0, DOGE: 0, ...data.wallet };
    if (data.totalMined) this.totalMined = { BTC: 0, ETH: 0, DOGE: 0, ...data.totalMined };
    if (data.rigOwned) this.rigOwned = data.rigOwned;
    if (data.rigLevels) this.rigLevels = data.rigLevels;
    if (data.upgrades) this.upgrades = { cpu: 0, gpu: 0, overclock: 0, ...data.upgrades };
    if (data.cooling) this.cooling = data.cooling;
    if (data.heat !== undefined) this.heat = data.heat;
    if (data.coinPrices) {
      this.coinPrices = data.coinPrices;
      this.priceHistory = this.coinPrices.map(p => {
        const arr = [];
        for (let i = 0; i < 30; i++) arr.push(p);
        return arr;
      });
    }
    // Ensure correct lengths
    while (this.rigOwned.length < this.rigs.length) this.rigOwned.push(false);
    while (this.rigLevels.length < this.rigs.length) this.rigLevels.push(0);
    while (this.cooling.length < this.coolingUpgrades.length) this.cooling.push(false);
    this.initialized = true;
  },
};
