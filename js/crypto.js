// Crypto Mining System - Click + Idle
const Crypto = {
  // System coins (8 total) — lower base prices, higher vol for bigger % swings like IRL crypto
  coins: [
    { symbol: 'BTC',  name: 'Bitcoin',    baseValue: 200,    vol: 0.08, color: '#f7931a', emoji: '\u20BF' },
    { symbol: 'ETH',  name: 'Ethereum',   baseValue: 20,     vol: 0.10, color: '#627eea', emoji: '\u039E' },
    { symbol: 'DOGE', name: 'Dogecoin',   baseValue: 0.08,   vol: 0.20, color: '#c2a633', emoji: '\u{1F436}' },
    { symbol: 'SOL',  name: 'Solana',     baseValue: 50,     vol: 0.13, color: '#9945ff', emoji: '\u25CE' },
    { symbol: 'XRP',  name: 'Ripple',     baseValue: 0.30,   vol: 0.10, color: '#346aa9', emoji: '\u2715' },
    { symbol: 'PEPE', name: 'PepeCoin',   baseValue: 0.0001, vol: 0.40, color: '#479747', emoji: '\u{1F438}' },
    { symbol: 'LINK', name: 'Chainlink',  baseValue: 8,      vol: 0.14, color: '#2a5ada', emoji: '\u2B21' },
    { symbol: 'ADA',  name: 'Cardano',    baseValue: 0.20,   vol: 0.11, color: '#0d1e2d', emoji: '\u20B3' },
  ],

  // Mining rigs (idle income) — baseRates scaled up to keep dollar income stable after BTC price drop
  rigs: [
    { name: 'USB Miner',   icon: '\u{1F50C}',        cost: 1000,    baseRate: 0.00025, coin: 'BTC',  maxLevel: 10 },
    { name: 'Gaming PC',   icon: '\u{1F5A5}\uFE0F',  cost: 10000,   baseRate: 0.0025,  coin: 'ETH',  maxLevel: 10 },
    { name: 'Mining Rig',  icon: '\u2699\uFE0F',      cost: 100000,  baseRate: 0.025,   coin: 'ETH',  maxLevel: 10 },
    { name: 'ASIC Miner',  icon: '\u{1F4A0}',         cost: 500000,  baseRate: 0.0125,  coin: 'BTC',  maxLevel: 10 },
    { name: 'Server Farm', icon: '\u{1F3ED}',         cost: 5000000, baseRate: 0.125,   coin: 'BTC',  maxLevel: 10 },
    { name: 'DOGE Farm',   icon: '\u{1F436}',         cost: 50000,   baseRate: 25,      coin: 'DOGE', maxLevel: 10 },
  ],

  // Click mining upgrades
  clickUpgrades: [
    { name: 'Better CPU',   desc: '+50% hash rate/level', maxLevel: 10, baseCost: 5000,   costMult: 2, effect: 0.5 },
    { name: 'GPU Boost',    desc: '+100% hash rate/level', maxLevel: 5,  baseCost: 50000,  costMult: 3, effect: 1.0 },
    { name: 'Overclocking', desc: '5% chance 10x block/level', maxLevel: 5, baseCost: 100000, costMult: 3, effect: 0.05 },
  ],

  // Cooling upgrades
  coolingUpgrades: [
    { name: 'Case Fans',      cost: 5000,   heatCapBonus: 20 },
    { name: 'Liquid Cooling', cost: 50000,  heatCapBonus: 30 },
    { name: 'Cryo System',    cost: 500000, heatCapBonus: 50 },
  ],

  // State
  wallet: {},
  totalMined: {},
  rigOwned: [],
  rigLevels: [],
  rigTargetCoins: [], // index into coins[] per rig
  clickTargetCoin: 0, // index into coins[] for manual click mining
  upgrades: { cpu: 0, gpu: 0, overclock: 0 },
  cooling: [],
  heat: 0,
  coinPrices: [],
  priceHistory: [],
  activeTab: 'market',
  tickTimer: null,
  priceTimer: null,
  initialized: false,
  mineAnimating: false,
  _priceTargets: [],

  // Player coins
  _playerCoins: {},   // { [uid]: { name, symbol, emoji, supply, ... } }
  _playerCoinPrices: {}, // { [SYM]: price }
  _playerCoinHistory: {}, // { [SYM]: price[] }
  _myPlayerCoin: null,    // local copy of own coin
  _playerCoinHoldings: {}, // { [SYM]: amount }
  _playerCoinTickTimer: null,

  init() {
    if (!this.initialized) {
      // Init wallet for all system coins
      this.wallet = {};
      this.totalMined = {};
      this.coins.forEach(c => {
        this.wallet[c.symbol] = 0;
        this.totalMined[c.symbol] = 0;
      });
      this.rigOwned = this.rigs.map(() => false);
      this.rigLevels = this.rigs.map(() => 0);
      this.rigTargetCoins = this.rigs.map((r, i) => this.coins.findIndex(c => c.symbol === r.coin));
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
    this._startPlayerCoinTick();
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

  _startPlayerCoinTick() {
    if (this._playerCoinTickTimer) clearInterval(this._playerCoinTickTimer);
    this._playerCoinTickTimer = setInterval(() => this._tickPlayerCoinPrices(), 6000);
  },

  tick() {
    const totalHeatGen = this._getHeatGeneration();
    const heatDissipation = 2 + this._getCoolingBonus() * 0.5;
    this.heat = Math.max(0, Math.min(100, this.heat + totalHeatGen - heatDissipation));

    const efficiency = this._getHeatEfficiency();

    if (this.heat > 95 && Math.random() < 0.1) {
      const ownedRigs = this.rigOwned.map((o, i) => o ? i : -1).filter(i => i >= 0);
      if (ownedRigs.length > 0) {
        const shutIdx = ownedRigs[Math.floor(Math.random() * ownedRigs.length)];
        this.rigOwned[shutIdx] = false;
        this._addMineLog('Rig "' + this.rigs[shutIdx].name + '" overheated and shut down!');
      }
    }

    // Apply hunger penalty to passive income (half of base penalty)
    const hungerMult = typeof App !== 'undefined' ? (1 - App.getHungerPenalty() * 0.5) : 1;

    for (let i = 0; i < this.rigs.length; i++) {
      if (!this.rigOwned[i]) continue;
      const rig = this.rigs[i];
      const targetIdx = (this.rigTargetCoins[i] !== undefined && this.rigTargetCoins[i] >= 0)
        ? this.rigTargetCoins[i] : this.coins.findIndex(c => c.symbol === rig.coin);
      const safeTgt = Math.max(0, Math.min(this.coins.length - 1, targetIdx));
      const targetCoin = this.coins[safeTgt];
      const origCoin = this.coins.find(c => c.symbol === rig.coin) || this.coins[0];

      // Normalize: same dollar yield regardless of target coin
      let rate = rig.baseRate * (this.rigLevels[i] + 1) * efficiency * hungerMult;
      rate = rate * (origCoin.baseValue / targetCoin.baseValue);

      const sym = targetCoin.symbol;
      this.wallet[sym] = (this.wallet[sym] || 0) + rate;
      this.totalMined[sym] = (this.totalMined[sym] || 0) + rate;
    }

    if (App.currentScreen === 'crypto') this.render();
  },

  priceTick() {
    const isAuthority = typeof Firebase !== 'undefined' && Firebase.isOnline() && Firebase._isCryptoAuthority;
    const isFollower = typeof Firebase !== 'undefined' && Firebase.isOnline() && !Firebase._isCryptoAuthority;

    if (isFollower && !this._hasActiveTargets()) {
      this._showOutOfSyncBanner(false);
      return;
    }
    if (!isAuthority && typeof Firebase !== 'undefined' && Firebase._hasConfig()) {
      this._showOutOfSyncBanner(true);
    } else {
      this._showOutOfSyncBanner(false);
    }

    for (let i = 0; i < this.coins.length; i++) {
      let change = this.coinPrices[i] * (Math.random() - 0.5) * (this.coins[i].vol || 0.03) * 2;

      const tgt = this._priceTargets[i];
      if (tgt && tgt.stepsLeft > 0) {
        const drift = (tgt.target - this.coinPrices[i]) / tgt.stepsLeft;
        change = drift + this.coinPrices[i] * (Math.random() - 0.5) * 0.01;
        tgt.stepsLeft--;
        if (tgt.stepsLeft <= 0) this._priceTargets[i] = null;
      }

      this.coinPrices[i] = Math.max(this.coins[i].baseValue * 0.1, this.coinPrices[i] + change);
      if (!this.priceHistory[i]) this.priceHistory[i] = [this.coinPrices[i]];
      this.priceHistory[i].push(this.coinPrices[i]);
      if (this.priceHistory[i].length > 30) this.priceHistory[i].shift();
    }

    if (isAuthority) {
      Firebase.pushCryptoPrices(this.coinPrices.slice());
    }

    if (App.currentScreen === 'crypto') this.render();
  },

  _tickPlayerCoinPrices() {
    // Simple local tick for player coin prices — gentle drift toward base
    const changed = Object.keys(this._playerCoinPrices);
    if (!changed.length) return;
    let any = false;
    for (const sym of changed) {
      const coin = this._getPlayerCoinBySym(sym);
      if (!coin) continue;
      const base = coin.baseValue || 100;
      const price = this._playerCoinPrices[sym] || base;
      const drift = (base - price) * 0.005; // gentle mean reversion
      const noise = price * (Math.random() - 0.5) * 0.04;
      const newPrice = Math.max(0.001, price + drift + noise);
      this._playerCoinPrices[sym] = newPrice;
      if (!this._playerCoinHistory[sym]) this._playerCoinHistory[sym] = [newPrice];
      this._playerCoinHistory[sym].push(newPrice);
      if (this._playerCoinHistory[sym].length > 30) this._playerCoinHistory[sym].shift();
      any = true;
    }
    // Push if we're authority
    if (any && typeof Firebase !== 'undefined' && Firebase._isPlayerCoinAuthority) {
      Firebase.pushPlayerCoinPrices({ ...this._playerCoinPrices });
    }
    if (App.currentScreen === 'crypto') this.render();
  },

  _getPlayerCoinBySym(sym) {
    for (const uid in this._playerCoins) {
      if (this._playerCoins[uid].symbol === sym) return this._playerCoins[uid];
    }
    return null;
  },

  _getPlayerCoinUidBySym(sym) {
    for (const uid in this._playerCoins) {
      if (this._playerCoins[uid].symbol === sym) return uid;
    }
    return null;
  },

  applyServerPrices(prices) {
    if (!prices || prices.length !== this.coins.length) return;
    this.coinPrices = prices.slice();
    for (let i = 0; i < this.coins.length; i++) {
      this._safeHistoryPush(i, this.coinPrices[i]);
    }
    this._showOutOfSyncBanner(false);
    if (App.currentScreen === 'crypto') this.render();
  },

  applyServerPlayerCoinPrices(prices) {
    if (!prices || typeof prices !== 'object') return;
    for (const sym in prices) {
      if (typeof prices[sym] === 'number') {
        this._playerCoinPrices[sym] = prices[sym];
      }
    }
    if (App.currentScreen === 'crypto') this.render();
  },

  updatePlayerCoins(data) {
    this._playerCoins = data || {};
    // Init prices for new coins
    for (const uid in this._playerCoins) {
      const coin = this._playerCoins[uid];
      if (!coin || !coin.symbol) continue;
      if (this._playerCoinPrices[coin.symbol] === undefined) {
        this._playerCoinPrices[coin.symbol] = coin.baseValue || 100;
      }
      // Track my coin
      if (typeof Firebase !== 'undefined' && Firebase.uid === uid) {
        this._myPlayerCoin = coin;
      }
    }
    if (App.currentScreen === 'crypto') this.render();
  },

  _safeHistoryPush(idx, val) {
    if (!this.priceHistory[idx]) this.priceHistory[idx] = [];
    this.priceHistory[idx].push(val);
    if (this.priceHistory[idx].length > 30) this.priceHistory[idx].shift();
  },

  _showOutOfSyncBanner(show) {
    let banner = document.getElementById('crypto-sync-banner');
    if (show) {
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'crypto-sync-banner';
        banner.className = 'out-of-sync-banner';
        banner.textContent = 'Crypto exchange out of sync \u2014 prices are local only';
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
    const btcBase = this.coins[0]; // BTC is the reference coin
    const safeTgt = Math.max(0, Math.min(this.coins.length - 1, this.clickTargetCoin || 0));
    const tgtCoin = this.coins[safeTgt];
    // 10x less than before — clicking is slow grind, rigs are real income
    // ±30% variance per click so it feels organic, not mechanical
    const variance = 0.7 + Math.random() * 0.6;
    let amount = 0.0001 * hashPower * variance * (btcBase.baseValue / tgtCoin.baseValue);

    const ocLevel = this.upgrades.overclock;
    if (ocLevel > 0 && Math.random() < ocLevel * 0.05) {
      amount *= 10;
      this._showMineResult('10x BLOCK!', true);
    }

    this.wallet[tgtCoin.symbol] = (this.wallet[tgtCoin.symbol] || 0) + amount;
    this.totalMined[tgtCoin.symbol] = (this.totalMined[tgtCoin.symbol] || 0) + amount;
    // More heat per click — spam clicking overheats without proper cooling
    this.heat = Math.min(100, this.heat + 2);

    this._animateMine();
    if (App.currentScreen === 'crypto') this.render();
  },

  setClickCoin(idx) {
    this.clickTargetCoin = Math.max(0, Math.min(this.coins.length - 1, idx));
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
    this.coolingUpgrades.forEach((c, i) => { if (this.cooling[i]) bonus += c.heatCapBonus; });
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
  _showMineResult(text) { this._addMineLog(text); },

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

  setRigCoin(idx, coinIdx) {
    this.rigTargetCoins[idx] = coinIdx;
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
  _hasActiveTargets() {
    return this._priceTargets.some(t => t && t.stepsLeft > 0);
  },

  setGradualTarget(idx, targetPrice, steps) {
    if (!this._priceTargets.length) this._priceTargets = this.coins.map(() => null);
    this._priceTargets[idx] = { target: targetPrice, stepsLeft: steps || 10 };
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase._isCryptoAuthority = true;
      Firebase._tryClaimCryptoAuthority();
    }
  },

  setGradualAll(multiplier, steps) {
    if (!this._priceTargets.length) this._priceTargets = this.coins.map(() => null);
    for (let i = 0; i < this.coins.length; i++) {
      this._priceTargets[i] = { target: this.coinPrices[i] * multiplier, stepsLeft: steps || 10 };
    }
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase._isCryptoAuthority = true;
      Firebase._tryClaimCryptoAuthority();
    }
  },

  applyAdminCommand(cmd) {
    if (!cmd || !cmd.type) return;
    if (!this._priceTargets.length) this._priceTargets = this.coins.map(() => null);
    switch (cmd.type) {
      case 'target':
        if (cmd.idx >= 0 && cmd.idx < this.coins.length)
          this.setGradualTarget(cmd.idx, cmd.target, cmd.steps || 10);
        break;
      case 'adjust':
        if (cmd.idx >= 0 && cmd.idx < this.coins.length)
          this.setGradualTarget(cmd.idx, Math.max(0.01, this.coinPrices[cmd.idx] * cmd.mult), 10);
        break;
      case 'pump': this.setGradualAll(3, 12); break;
      case 'dump': this.setGradualAll(0.3, 12); break;
    }
  },

  applyPlayerCoinAdminCommand(cmd) {
    if (!cmd || !cmd.type || !cmd.sym) return;
    const sym = cmd.sym;
    const _syncBase = (newPrice) => {
      // Update local baseValue so mean reversion targets new price, not old one
      const coin = this._getPlayerCoinBySym(sym);
      if (coin) {
        coin.baseValue = newPrice;
        // Only write Firebase once — from admin's session (online + not follower-only)
        const uid = this._getPlayerCoinUidBySym(sym);
        if (uid && typeof Firebase !== 'undefined' && Firebase.isOnline()) {
          Firebase.updatePlayerCoin(uid, { baseValue: newPrice })
            .catch(() => {});
        }
      }
    };
    switch (cmd.type) {
      case 'pcoin-adjust': {
        const cur = this._playerCoinPrices[sym];
        if (cur !== undefined) {
          const newPrice = Math.max(0.001, cur * cmd.mult);
          this._playerCoinPrices[sym] = newPrice;
          _syncBase(newPrice);
        }
        break;
      }
      case 'pcoin-set':
        if (cmd.target > 0) {
          this._playerCoinPrices[sym] = cmd.target;
          _syncBase(cmd.target);
        }
        break;
      case 'pcoin-rugPull': {
        this._playerCoinPrices[sym] = 0.0001;
        _syncBase(0.0001);
        const coin = this._getPlayerCoinBySym(sym);
        if (coin) coin.type = 'private';
        break;
      }
      case 'pcoin-delete': {
        const ownerUid = cmd.ownerUid || this._getPlayerCoinUidBySym(sym);
        delete this._playerCoinPrices[sym];
        delete this._playerCoinHistory[sym];
        if (ownerUid && this._playerCoins[ownerUid]) delete this._playerCoins[ownerUid];
        if (this._myPlayerCoin && this._myPlayerCoin.symbol === sym) this._myPlayerCoin = null;
        break;
      }
    }
    if (App.currentScreen === 'crypto') this.render();
  },

  // === Exchange ===
  buyCoin(symbol, cashAmount) {
    // Check both system and player coins
    const sysIdx = this.coins.findIndex(c => c.symbol === symbol);
    if (sysIdx >= 0) {
      if (cashAmount <= 0 || App.balance < cashAmount) return;
      const coinAmount = cashAmount / this.coinPrices[sysIdx];
      App.addBalance(-cashAmount);
      this.wallet[symbol] = (this.wallet[symbol] || 0) + coinAmount;
      App.save(); this.render(); return;
    }
    // Player coin
    const price = this._playerCoinPrices[symbol];
    if (!price) return;
    if (cashAmount <= 0 || App.balance < cashAmount) return;
    const coinAmount = cashAmount / price;
    App.addBalance(-cashAmount);
    this._playerCoinHoldings[symbol] = (this._playerCoinHoldings[symbol] || 0) + coinAmount;
    // If owner buys their own coin — update reserve stake
    if (typeof Firebase !== 'undefined' && Firebase.uid) {
      const ownerUid = this._getPlayerCoinUidBySym(symbol);
      if (ownerUid === Firebase.uid) {
        const coin = this._playerCoins[ownerUid];
        if (coin) {
          coin.reserveAmt = (coin.reserveAmt || 0) + coinAmount;
          Firebase.updatePlayerCoin(ownerUid, { reserveAmt: coin.reserveAmt }).catch(() => {});
        }
      }
    }
    if (typeof Firebase !== 'undefined') Firebase.tradeInfluenceCoin(symbol, 'buy');
    App.save(); this.render();
  },

  promptBuyCoin(symbol) {
    const sysIdx = this.coins.findIndex(c => c.symbol === symbol);
    const price = sysIdx >= 0 ? this.coinPrices[sysIdx] : (this._playerCoinPrices[symbol] || 0);
    if (!price) return;
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
    const sysIdx = this.coins.findIndex(c => c.symbol === symbol);
    const price = sysIdx >= 0 ? this.coinPrices[sysIdx] : (this._playerCoinPrices[symbol] || 0);
    const owned = sysIdx >= 0 ? (this.wallet[symbol] || 0) : (this._playerCoinHoldings[symbol] || 0);
    if (owned <= 0 || !price) return;
    const amounts = [0.25, 0.5, 1.0].map(pct => owned * pct);
    const labels = ['25%', '50%', 'All'];
    let html = `<div class="stock-trade-modal">
      <div class="stock-trade-title">Sell ${symbol} @ ${App.formatMoney(price)}</div>
      <div class="stock-trade-buttons">`;
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

  promptSendCoin(symbol) {
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) {
      Toast.show('Must be online to send coins', '#ff5252'); return;
    }
    const held = this._playerCoinHoldings[symbol] || 0;
    if (held <= 0) { Toast.show('You have no ' + symbol + ' to send', '#ff5252'); return; }
    const price = this._playerCoinPrices[symbol] || 0;
    const html = `<div class="stock-trade-modal">
      <div class="stock-trade-title">\u{1FA99} Send ${symbol}</div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px">You hold: ${held.toFixed(4)} ${symbol} (${App.formatMoney(held * price)})</div>
      <div class="admin-row"><label style="min-width:70px;font-size:12px">To:</label>
        <input type="text" id="send-coin-name" placeholder="Player name" style="flex:1;font-size:14px"></div>
      <div class="admin-row"><label style="min-width:70px;font-size:12px">Amount:</label>
        <input type="number" id="send-coin-amount" value="${held.toFixed(4)}" min="0.0001" max="${held}" step="0.0001" style="flex:1;font-size:14px"></div>
      <div class="stock-trade-buttons" style="margin-top:10px">
        <button class="stock-buy-btn" onclick="Crypto._doSendCoin('${symbol}')">Send</button>
        <button class="stock-trade-cancel" onclick="Crypto.closeModal()">Cancel</button>
      </div>
    </div>`;
    this._showModal(html);
  },

  _doSendCoin(symbol) {
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) return;
    const nameInput = document.getElementById('send-coin-name');
    const amtInput = document.getElementById('send-coin-amount');
    if (!nameInput || !amtInput) return;
    const recipientName = nameInput.value.trim();
    const amount = parseFloat(amtInput.value);
    if (!recipientName) { Toast.show('Enter recipient name', '#ff5252'); return; }
    if (isNaN(amount) || amount <= 0) { Toast.show('Invalid amount', '#ff5252'); return; }
    const held = this._playerCoinHoldings[symbol] || 0;
    if (amount > held + 0.000001) { Toast.show('Not enough ' + symbol, '#ff5252'); return; }
    const nameLower = recipientName.toLowerCase();
    const entry = Firebase._registeredNames[nameLower];
    if (!entry || !entry.uid) { Toast.show('Player "' + recipientName + '" not found', '#ff5252'); return; }
    if (entry.uid === Firebase.uid) { Toast.show('Cannot send to yourself', '#ff5252'); return; }
    const fromName = typeof Settings !== 'undefined' ? Settings.profile.name : 'Player';
    const sendAmt = Math.min(amount, held);
    this._playerCoinHoldings[symbol] = Math.max(0, held - sendAmt);
    // If owner, update reserve
    const ownerUid = this._getPlayerCoinUidBySym(symbol);
    if (ownerUid === Firebase.uid) {
      const coin = this._playerCoins[ownerUid];
      if (coin) {
        coin.reserveAmt = Math.max(0, (coin.reserveAmt || 0) - sendAmt);
        Firebase.updatePlayerCoin(ownerUid, { reserveAmt: coin.reserveAmt }).catch(() => {});
      }
    }
    Firebase.sendCoinTransfer(entry.uid, symbol, sendAmt, fromName);
    App.save();
    this.closeModal();
    this.render();
    Toast.show('\u2705 Sent ' + sendAmt.toFixed(4) + ' ' + symbol + ' to ' + recipientName + '!', '#00e676', 3000);
  },

  _receiveCoinTransfer(transfer) {
    const { sym, amount, fromName } = transfer;
    if (!sym || !amount) return;
    this._playerCoinHoldings[sym] = (this._playerCoinHoldings[sym] || 0) + amount;
    // If owner receives their own coin — update reserve
    if (typeof Firebase !== 'undefined' && Firebase.uid) {
      const ownerUid = this._getPlayerCoinUidBySym(sym);
      if (ownerUid === Firebase.uid) {
        const coin = this._playerCoins[ownerUid];
        if (coin) {
          coin.reserveAmt = (coin.reserveAmt || 0) + amount;
          Firebase.updatePlayerCoin(ownerUid, { reserveAmt: coin.reserveAmt }).catch(() => {});
        }
      }
    }
    App.save();
    if (App.currentScreen === 'crypto') this.render();
    const price = this._playerCoinPrices[sym] || 0;
    Toast.show('\u{1FA99} Received ' + amount.toFixed(4) + ' ' + sym + ' from ' + (fromName || 'someone') + (price > 0 ? ' (\u2248' + App.formatMoney(amount * price) + ')' : ''), '#9945ff', 5000);
  },

  sellCoin(symbol, amount) {
    const sysIdx = this.coins.findIndex(c => c.symbol === symbol);
    if (sysIdx >= 0) {
      if ((this.wallet[symbol] || 0) < amount) amount = this.wallet[symbol] || 0;
      if (amount <= 0) return;
      const value = amount * this.coinPrices[sysIdx];
      this.wallet[symbol] -= amount;
      App.addBalance(value);
      App.save(); this.render(); return;
    }
    // Player coin
    const price = this._playerCoinPrices[symbol];
    if (!price) return;
    const owned = this._playerCoinHoldings[symbol] || 0;
    if (owned < amount) amount = owned;
    if (amount <= 0) return;
    const value = amount * price;
    this._playerCoinHoldings[symbol] -= amount;
    App.addBalance(value);
    // If owner sells their own coin — update reserve stake
    if (typeof Firebase !== 'undefined' && Firebase.uid) {
      const ownerUid = this._getPlayerCoinUidBySym(symbol);
      if (ownerUid === Firebase.uid) {
        const coin = this._playerCoins[ownerUid];
        if (coin) {
          const newReserve = Math.max(0, (coin.reserveAmt || 0) - amount);
          coin.reserveAmt = newReserve;
          Firebase.updatePlayerCoin(ownerUid, { reserveAmt: newReserve }).catch(() => {});
          if (newReserve <= 0) {
            Toast.show('\u26A0\uFE0F You sold your entire reserve — you have no stake in ' + symbol, '#ff9100', 5000);
          }
        }
      }
    }
    if (typeof Firebase !== 'undefined') Firebase.tradeInfluenceCoin(symbol, 'sell');
    App.save(); this.render();
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
    // Don't rebuild while user is interacting with any input/select inside the crypto panel
    const focused = document.activeElement;
    if (focused && container.contains(focused) &&
        (focused.tagName === 'SELECT' || focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA')) {
      return;
    }
    document.querySelectorAll('.crypto-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === this.activeTab);
    });
    if (this.activeTab === 'market')  this._renderMarket(container);
    else if (this.activeTab === 'mining') this._renderMining(container);
    else if (this.activeTab === 'mycoin') this._renderMyCoin(container);
    else if (this.activeTab === 'browse') this._renderBrowse(container);
  },

  // ── Market Tab ─────────────────────────────────────────────────────
  _renderMarket(container) {
    let html = '<div class="stock-grid">';

    // System coins
    this.coins.forEach((coin, i) => {
      const price = (typeof this.coinPrices[i] === 'number' && isFinite(this.coinPrices[i])) ? this.coinPrices[i] : coin.baseValue;
      const amount = this.wallet[coin.symbol] || 0;
      const hist = this.priceHistory[i] || [price, price];
      const prev = hist.length >= 2 ? hist[hist.length - 2] : price;
      const pct = ((price - prev) / (prev || 1) * 100);
      const pctStr = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
      const isUp = pct >= 0;

      html += `<div class="stock-card">
        <div class="stock-card-header">
          <div class="stock-symbol" style="color:${coin.color}">${coin.emoji} ${coin.symbol}</div>
          <div class="stock-sector">CRYPTO</div>
        </div>
        <div class="stock-name">${coin.name}</div>
        ${amount > 0 ? `<div style="font-size:10px;color:var(--text-dim);margin-bottom:2px">${amount.toFixed(4)} ${coin.symbol}</div>` : ''}
        <div class="stock-price">${App.formatMoney(price)}</div>
        <div class="stock-change ${isUp ? 'stock-up' : 'stock-down'}">${pctStr}</div>
        <canvas id="spark-c-${coin.symbol}" class="stock-sparkline" width="80" height="30"></canvas>
        <div class="stock-actions">
          <button class="stock-buy-btn" onclick="Crypto.promptBuyCoin('${coin.symbol}')">Buy</button>
          <button class="stock-sell-btn" onclick="Crypto.promptSellCoin('${coin.symbol}')" ${amount > 0 ? '' : 'disabled'}>Sell</button>
        </div>
      </div>`;
    });

    // Player coins
    const publicCoins = this._getPublicPlayerCoins();
    if (publicCoins.length > 0) {
      html += `</div><div class="player-stocks-market-header">\u{1F464} Player Coins</div><div class="stock-grid">`;
      publicCoins.forEach(({ uid, coin }) => {
        const sym = coin.symbol;
        const price = this._playerCoinPrices[sym] || coin.baseValue || 100;
        const held = this._playerCoinHoldings[sym] || 0;
        const hist = this._playerCoinHistory[sym] || [price, price];
        const prev = hist.length >= 2 ? hist[hist.length - 2] : price;
        const pct = ((price - prev) / (prev || 1) * 100);
        const pctStr = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
        const isUp = pct >= 0;
        const isOwn = typeof Firebase !== 'undefined' && Firebase.uid === uid;

        html += `<div class="stock-card">
          <div class="stock-card-header">
            <div class="stock-symbol" style="color:#bb86fc">${coin.emoji || '\u{1FA99}'} ${sym}</div>
            <div class="player-stock-badge">${isOwn ? 'YOURS' : 'COIN'}</div>
          </div>
          <div class="stock-name">${this._esc(coin.name)}</div>
          <div style="font-size:10px;color:var(--text-dim);margin-bottom:2px">by ${this._esc(coin.ownerName || 'Player')}</div>
          ${held > 0 ? `<div style="font-size:10px;color:var(--text-dim);margin-bottom:2px">${held.toFixed(2)} ${sym}</div>` : ''}
          <div class="stock-price">${App.formatMoney(price)}</div>
          <div class="stock-change ${isUp ? 'stock-up' : 'stock-down'}">${pctStr}</div>
          <canvas id="spark-pc-${sym}" class="stock-sparkline" width="80" height="30"></canvas>
          <div class="stock-actions">
            <button class="stock-buy-btn" onclick="Crypto.promptBuyCoin('${sym}')">Buy</button>
            <button class="stock-sell-btn" onclick="Crypto.promptSellCoin('${sym}')" ${held > 0 ? '' : 'disabled'}>Sell</button>
            ${held > 0 ? `<button class="admin-btn" style="font-size:10px;padding:2px 6px" onclick="Crypto.promptSendCoin('${sym}')">Send</button>` : ''}
          </div>
        </div>`;
      });
    }

    html += '</div>';
    container.innerHTML = html;

    // Draw sparklines
    this.coins.forEach((coin, i) => {
      this._drawPriceChart('spark-c-' + coin.symbol, this.priceHistory[i], coin.color);
    });
    publicCoins.forEach(({ coin }) => {
      this._drawPriceChart('spark-pc-' + coin.symbol, this._playerCoinHistory[coin.symbol] || [], '#bb86fc');
    });
  },

  // ── Mining Tab ─────────────────────────────────────────────────────
  _renderMining(container) {
    const hashPower = this._getHashPower();
    const efficiency = this._getHeatEfficiency();
    const safeTgt = Math.max(0, Math.min(this.coins.length - 1, this.clickTargetCoin || 0));
    const tgtCoin = this.coins[safeTgt];
    const btcBase = this.coins[0];
    const clickAmt = 0.0001 * hashPower * (btcBase.baseValue / tgtCoin.baseValue);
    const clickFmt = clickAmt < 0.0001 ? clickAmt.toExponential(2) : clickAmt.toFixed(tgtCoin.baseValue < 1 ? 2 : 6);

    const coinSelector = `<select class="coin-selector" style="margin:6px auto;display:block;font-size:13px" onchange="Crypto.setClickCoin(+this.value)">
      ${this.coins.map((c, i) => `<option value="${i}" ${i === safeTgt ? 'selected' : ''}>${c.emoji} ${c.symbol} — ${c.name}</option>`).join('')}
    </select>`;

    let html = `
      <div class="mine-stats">
        <div class="mine-stat"><span class="stat-label">Hash Power</span><span>${hashPower.toFixed(1)}x</span></div>
        <div class="mine-stat"><span class="stat-label">${tgtCoin.symbol}/Click</span><span>~${clickFmt}</span></div>
        <div class="mine-stat"><span class="stat-label">Heat</span><span class="${this.heat > 80 ? 'heat-danger' : ''}">${this.heat.toFixed(0)}%</span></div>
      </div>
      <div class="heat-bar-wrap">
        <div class="heat-bar" style="width:${this.heat}%;background:${this.heat > 95 ? '#ff5252' : this.heat > 80 ? '#ff9100' : '#00e676'}"></div>
      </div>
      <div class="mine-hash-display" id="mine-hash-display">
        <div class="hash-text">${this._randomHash()}</div>
      </div>
      ${coinSelector}
      <button id="crypto-mine-btn" class="mine-btn" onclick="Crypto.mine()">
        MINE<br><span class="mine-btn-sub" style="color:${tgtCoin.color}">+${clickFmt} ${tgtCoin.symbol}</span>
      </button>
      <div class="mine-wallet-mini">`;

    this.coins.forEach(c => {
      const amt = this.wallet[c.symbol] || 0;
      if (amt > 0) {
        const display = amt < 0.0001 ? amt.toExponential(2) : amt.toFixed(c.baseValue < 1 ? 2 : 4);
        html += `<span style="color:${c.color}">${display} ${c.symbol}</span>`;
      }
    });

    html += `</div>
      <div class="mine-upgrades"><h3>Hash Upgrades</h3>`;

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

    // Cooling
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

    // Rigs section
    html += `<div class="mine-upgrades"><h3>Mining Rigs <span style="font-size:12px;color:var(--text-dim)">Efficiency: ${(efficiency * 100).toFixed(0)}%</span></h3>`;
    html += '<div class="rig-grid">';
    this.rigs.forEach((rig, i) => {
      const owned = this.rigOwned[i];
      const level = this.rigLevels[i];
      const maxed = level >= rig.maxLevel;
      const tgtIdx = (this.rigTargetCoins[i] !== undefined && this.rigTargetCoins[i] >= 0)
        ? this.rigTargetCoins[i] : this.coins.findIndex(c => c.symbol === rig.coin);
      const safeTgt = Math.max(0, Math.min(this.coins.length - 1, tgtIdx));
      const tgtCoin = this.coins[safeTgt];
      const origCoin = this.coins.find(c => c.symbol === rig.coin) || this.coins[0];
      const rate = rig.baseRate * (level + 1) * efficiency * (origCoin.baseValue / tgtCoin.baseValue);

      const coinSelectorHtml = `<select class="coin-selector" onchange="Crypto.setRigCoin(${i},+this.value)">
        ${this.coins.map((c, ci) => `<option value="${ci}" ${ci === safeTgt ? 'selected' : ''}>${c.symbol} ${c.emoji}</option>`).join('')}
      </select>`;

      if (!owned) {
        const affordable = App.balance >= rig.cost;
        html += `<div class="rig-card ${affordable ? 'affordable' : ''}" onclick="Crypto.buyRig(${i})">
          <div class="rig-icon">${rig.icon}</div>
          <div class="rig-name">${rig.name}</div>
          <div class="rig-detail" style="color:${origCoin.color}">${rig.baseRate} ${rig.coin}/s</div>
          <button class="prop-btn prop-buy-btn">Buy: ${App.formatMoney(rig.cost)}</button>
        </div>`;
      } else {
        const upgCost = rig.cost * Math.pow(2, level);
        const affordable = !maxed && App.balance >= upgCost;
        html += `<div class="rig-card owned">
          <div class="rig-icon">${rig.icon}</div>
          <div class="rig-name">${rig.name}</div>
          <div class="rig-level">Lv ${level}/${rig.maxLevel}</div>
          <div class="rig-detail" style="color:${tgtCoin.color}">${rate.toFixed(4)} ${tgtCoin.symbol}/s</div>
          ${coinSelectorHtml}
          ${maxed
            ? '<button class="prop-btn prop-maxed" disabled>MAXED</button>'
            : `<button class="prop-btn ${affordable ? 'affordable' : ''}" onclick="Crypto.upgradeRig(${i})">Upgrade: ${App.formatMoney(upgCost)}</button>`
          }
        </div>`;
      }
    });
    html += '</div></div>';

    // Total mined
    html += '<div class="mine-total-stats"><h3>Total Mined</h3>';
    this.coins.forEach(c => {
      const val = this.totalMined[c.symbol] || 0;
      if (val > 0) html += `<div class="mine-total-row"><span style="color:${c.color}">${c.symbol}</span><span>${val.toFixed(4)}</span></div>`;
    });
    html += '</div>';

    container.innerHTML = html;
  },

  // ── My Coin Tab ────────────────────────────────────────────────────
  _renderMyCoin(container) {
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;

    // Check if user has an existing coin
    const existing = myUid && this._playerCoins[myUid] ? this._playerCoins[myUid] : this._myPlayerCoin;

    if (existing) {
      this._renderManageCoin(container, existing, myUid);
    } else {
      this._renderCreateCoin(container);
    }
  },

  _renderCreateCoin(container) {
    const isOnline = typeof Firebase !== 'undefined' && Firebase.isOnline();
    container.innerHTML = `
      <div class="game-container" style="padding:12px">
        <h3 style="color:var(--green);margin:0 0 8px">Create Your Coin</h3>
        <p style="font-size:12px;color:var(--text-dim);margin-bottom:12px">Launch your own crypto coin. Players can buy, hold, and trade it.</p>
        ${!isOnline ? '<div class="out-of-sync-banner">Must be online to create a coin</div>' : ''}
        <div class="admin-row"><label style="min-width:80px">Name:</label>
          <input type="text" id="pcoin-name" maxlength="20" placeholder="e.g. RetroToken" style="flex:1"></div>
        <div class="admin-row"><label style="min-width:80px">Ticker:</label>
          <input type="text" id="pcoin-sym" maxlength="5" placeholder="e.g. RETK" style="flex:1;text-transform:uppercase" oninput="this.value=this.value.toUpperCase()">
          <span id="pcoin-sym-err" style="font-size:11px;color:var(--red);margin-left:6px"></span>
        </div>
        <div class="admin-row"><label style="min-width:80px">Emoji:</label>
          <input type="text" id="pcoin-emoji" maxlength="2" placeholder="\u{1FA99}" style="width:50px;font-size:20px"></div>
        <div class="admin-row"><label style="min-width:80px">Supply:</label>
          <select id="pcoin-supply" style="flex:1">
            <option value="1000000">1M</option>
            <option value="10000000">10M</option>
            <option value="100000000">100M</option>
            <option value="1000000000" selected>1B</option>
            <option value="1000000000000">1T</option>
          </select></div>
        <div class="admin-row"><label style="min-width:80px">Start Price:</label>
          <input type="number" id="pcoin-price" value="100" min="0.01" step="0.01" style="flex:1">
          <span style="font-size:11px;color:var(--text-dim);margin-left:4px">per coin</span></div>
        <div style="font-size:11px;color:var(--text-dim);margin:8px 0">Cost: ${App.formatMoney(500000)} • You keep 30% of supply as reserve</div>
        <button class="game-btn" style="width:100%;margin-top:8px" onclick="Crypto._submitCreateCoin()" ${!isOnline ? 'disabled' : ''}>
          Create Coin — ${App.formatMoney(500000)}
        </button>
      </div>`;
  },

  _submitCreateCoin() {
    if (!Firebase || !Firebase.isOnline()) return;
    const cost = 500000;
    if (App.balance < cost) { alert('Need ' + App.formatMoney(cost)); return; }

    const name = document.getElementById('pcoin-name')?.value?.trim();
    const sym = document.getElementById('pcoin-sym')?.value?.trim().toUpperCase();
    const emoji = document.getElementById('pcoin-emoji')?.value?.trim() || '\u{1FA99}';
    const supply = parseInt(document.getElementById('pcoin-supply')?.value) || 1e9;
    const baseValue = parseFloat(document.getElementById('pcoin-price')?.value) || 100;

    if (!name) { alert('Enter a coin name.'); return; }
    if (!sym || sym.length < 2) { alert('Enter a ticker (2-5 chars).'); return; }

    // Validate ticker uniqueness
    const sysSyms = this.coins.map(c => c.symbol);
    if (sysSyms.includes(sym)) {
      document.getElementById('pcoin-sym-err').textContent = 'Ticker taken';
      return;
    }
    for (const uid in this._playerCoins) {
      if (this._playerCoins[uid].symbol === sym) {
        document.getElementById('pcoin-sym-err').textContent = 'Ticker taken';
        return;
      }
    }
    // Check against player stocks
    if (typeof Companies !== 'undefined' && Companies._allPlayerStocks) {
      if (Companies._allPlayerStocks[sym]) {
        document.getElementById('pcoin-sym-err').textContent = 'Ticker taken by a stock';
        return;
      }
    }

    const coinData = {
      name, symbol: sym, emoji, supply,
      reserveAmt: Math.floor(supply * 0.30),
      ownerName: (typeof Settings !== 'undefined') ? Settings.profile.name : 'Player',
      baseValue, type: 'public',
      upgrades: { pumpEngine: 0, stability: 0, marketing: 0, liquidity: 0 },
    };

    App.addBalance(-cost);
    Firebase.createPlayerCoin(coinData).then(() => {
      this._myPlayerCoin = coinData;
      this._playerCoinPrices[sym] = baseValue;
      App.save();
      Toast.show('\u{1FA99} Coin "' + name + '" (' + sym + ') launched!', '#9945ff', 4000);
      this.render();
    }).catch(err => { App.addBalance(cost); alert('Error: ' + err); });
  },

  _renderManageCoin(container, coin, myUid) {
    const sym = coin.symbol;
    const price = this._playerCoinPrices[sym] || coin.baseValue || 100;
    const isOwner = typeof Firebase !== 'undefined' && Firebase.uid === myUid;
    const upgrades = coin.upgrades || {};

    const upgradeList = [
      { key: 'pumpEngine', name: '\u{1F680} Pump Engine', max: 3, desc: '+0.1% upward drift/tick per level', costs: [50000, 200000, 500000] },
      { key: 'stability',  name: '\u{1F6E1}\uFE0F Stability',  max: 3, desc: 'Soft price floor; crash damping', costs: [50000, 200000, 500000] },
      { key: 'marketing',  name: '\u{1F4E3} Marketing',  max: 3, desc: '+$1K/$5K/$20K cap; +0.1% mania/level', costs: [75000, 300000, 750000] },
      { key: 'liquidity',  name: '\u{1F4A7} Liquidity',  max: 2, desc: 'Sells hurt 50%/25% less', costs: [100000, 400000] },
      { key: 'burn',       name: '\u{1F525} Burn Protocol', max: 1, desc: 'One-time 10% supply burn; permanent', costs: [1000000] },
    ];

    const upgHtml = upgradeList.map(u => {
      const lvl = upgrades[u.key] || 0;
      const maxed = lvl >= u.max;
      const nextCost = !maxed ? u.costs[lvl] : 0;
      const affordable = !maxed && App.balance >= nextCost;
      return `<div class="mine-upgrade-item ${affordable ? 'affordable' : ''}">
        <div class="upgrade-info">
          <div class="upgrade-name">${u.name} <span class="upgrade-level">Lv${lvl}/${u.max}</span></div>
          <div class="upgrade-desc">${u.desc}</div>
        </div>
        ${maxed
          ? '<div class="upgrade-cost" style="color:var(--green)">MAX</div>'
          : `<button class="upgrade-cost" onclick="Crypto._buyCoinUpgrade('${u.key}')">${App.formatMoney(nextCost)}</button>`
        }
      </div>`;
    }).join('');

    container.innerHTML = `
      <div style="padding:10px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <span style="font-size:30px">${coin.emoji || '\u{1FA99}'}</span>
          <div>
            <div style="font-weight:700;font-size:16px">${this._esc(coin.name)} <span class="player-coin-badge">COIN</span></div>
            <div style="font-size:12px;color:#bb86fc">${sym} \u2022 ${App.formatMoney(price)}</div>
            <div style="font-size:11px;color:var(--text-dim)">Supply: ${(coin.supply||0).toLocaleString()} \u2022 Reserve: ${(coin.reserveAmt||0).toLocaleString()}</div>
            ${(coin.reserveAmt || 0) <= 0 ? '<div style="font-size:11px;color:#ff9100;margin-top:2px">\u26A0\uFE0F No owner stake \u2014 buy back to regain stake</div>' : ''}
          </div>
        </div>
        ${isOwner ? `
        <div class="exchange-actions" style="margin-bottom:12px">
          <button class="stock-buy-btn" onclick="Crypto._ownerAction('pump')">Pump</button>
          <button class="stock-sell-btn" onclick="Crypto._ownerAction('dump')">Dump</button>
          <button class="admin-btn" onclick="Crypto._ownerAction('mint')" style="font-size:12px">Mint</button>
          <button class="admin-btn" onclick="Crypto._ownerAction('burn')" style="font-size:12px">Burn Supply</button>
        </div>
        <div class="exchange-actions" style="margin-bottom:12px">
          <button class="admin-btn danger" onclick="Crypto._ownerAction('delist')" style="font-size:12px">${coin.type === 'private' ? 'Relist' : 'Delist'}</button>
        </div>` : ''}
        <div class="mine-upgrades"><h3>Upgrades</h3>${upgHtml}</div>
      </div>`;
  },

  _buyCoinUpgrade(key) {
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    if (!myUid || !Firebase.isOnline()) return;
    const coin = this._playerCoins[myUid] || this._myPlayerCoin;
    if (!coin) return;
    const upgradeList = [
      { key: 'pumpEngine', max: 3, costs: [50000, 200000, 500000] },
      { key: 'stability',  max: 3, costs: [50000, 200000, 500000] },
      { key: 'marketing',  max: 3, costs: [75000, 300000, 750000] },
      { key: 'liquidity',  max: 2, costs: [100000, 400000] },
      { key: 'burn',       max: 1, costs: [1000000] },
    ];
    const u = upgradeList.find(x => x.key === key);
    if (!u) return;
    const upgrades = coin.upgrades || {};
    const lvl = upgrades[key] || 0;
    if (lvl >= u.max) return;
    const cost = u.costs[lvl];
    if (App.balance < cost) { alert('Not enough funds.'); return; }
    App.addBalance(-cost);
    const newLevel = lvl + 1;
    const updates = { ['upgrades/' + key]: newLevel };
    Firebase.updatePlayerCoin(myUid, updates).then(() => {
      if (!coin.upgrades) coin.upgrades = {};
      coin.upgrades[key] = newLevel;
      App.save();
      this.render();
    }).catch(err => { App.addBalance(cost); alert('Error: ' + err); });
  },

  _ownerAction(action) {
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    if (!myUid || !Firebase.isOnline()) return;
    const coin = this._playerCoins[myUid] || this._myPlayerCoin;
    if (!coin) return;
    const sym = coin.symbol;

    const now = Date.now();
    const cooldowns = this._ownerCooldowns || (this._ownerCooldowns = {});
    const COOL_SHORT = 2 * 60 * 1000;
    const COOL_LONG = 10 * 60 * 1000;

    if (action === 'pump') {
      if (cooldowns.pump && now < cooldowns.pump) { Toast.show('Pump on cooldown!', '#ff5252'); return; }
      const cost = Math.floor(this._playerCoinPrices[sym] * 100);
      if (App.balance < cost) { alert('Need ' + App.formatMoney(cost)); return; }
      App.addBalance(-cost);
      const boost = 0.05 + Math.random() * 0.15;
      this._playerCoinPrices[sym] *= (1 + boost);
      cooldowns.pump = now + COOL_SHORT;
      App.save(); this.render();
      Toast.show('\u{1F680} Pumped ' + sym + ' +' + Math.round(boost * 100) + '%!', '#00e676', 3000);
    } else if (action === 'dump') {
      if (cooldowns.dump && now < cooldowns.dump) { Toast.show('Dump on cooldown!', '#ff5252'); return; }
      const drop = 0.10 + Math.random() * 0.20;
      this._playerCoinPrices[sym] = Math.max(0.001, this._playerCoinPrices[sym] * (1 - drop));
      cooldowns.dump = now + COOL_SHORT;
      App.save(); this.render();
      Toast.show('\u{1F4C9} Dumped ' + sym + ' -' + Math.round(drop * 100) + '%', '#ff5252', 3000);
    } else if (action === 'mint') {
      if (cooldowns.mint && now < cooldowns.mint) { Toast.show('Mint on cooldown!', '#ff5252'); return; }
      const mintPct = 0.05 + Math.random() * 0.05;
      const newSupply = Math.floor((coin.supply || 1e9) * (1 + mintPct));
      const earnings = Math.floor(newSupply - (coin.supply || 1e9)) * (this._playerCoinPrices[sym] || coin.baseValue);
      App.addBalance(earnings * 0.1); // earn 10% of minted value
      Firebase.updatePlayerCoin(myUid, { supply: newSupply }).then(() => { coin.supply = newSupply; });
      cooldowns.mint = now + COOL_LONG;
      App.save(); this.render();
      Toast.show('\u{1F4B0} Minted ' + Math.round(mintPct * 100) + '% supply', '#9945ff', 3000);
    } else if (action === 'burn') {
      if (cooldowns.burnAct && now < cooldowns.burnAct) { Toast.show('Burn on cooldown!', '#ff5252'); return; }
      const burnPct = 0.05;
      const newSupply = Math.floor((coin.supply || 1e9) * (1 - burnPct));
      const newReserve = Math.floor((coin.reserveAmt || 0) * (1 - burnPct));
      this._playerCoinPrices[sym] = (this._playerCoinPrices[sym] || coin.baseValue) * (1 + burnPct * 0.8);
      Firebase.updatePlayerCoin(myUid, { supply: newSupply, reserveAmt: newReserve });
      cooldowns.burnAct = now + COOL_LONG;
      App.save(); this.render();
      Toast.show('\u{1F525} Burned 5% supply — price up!', '#ff9100', 3000);
    } else if (action === 'delist') {
      const newType = coin.type === 'private' ? 'public' : 'private';
      if (newType === 'public') {
        const fee = 50000;
        if (App.balance < fee) { alert('Relist fee: ' + App.formatMoney(fee)); return; }
        App.addBalance(-fee);
      }
      Firebase.updatePlayerCoin(myUid, { type: newType }).then(() => {
        coin.type = newType;
        App.save(); this.render();
        Toast.show(newType === 'public' ? '\u2705 Coin relisted!' : '\u{1F4E4} Coin delisted (private)', '#9945ff', 3000);
      });
    }
  },

  // ── Browse Tab ─────────────────────────────────────────────────────
  _renderBrowse(container) {
    const isOnline = typeof Firebase !== 'undefined' && Firebase.isOnline();
    if (!isOnline) {
      container.innerHTML = '<div class="pvp-empty">Connect to Firebase to browse player coins</div>';
      return;
    }

    const publicCoins = this._getPublicPlayerCoins();
    if (publicCoins.length === 0) {
      container.innerHTML = '<div class="pvp-empty">No player coins listed yet. Create one in My Coin!</div>';
      return;
    }

    let html = '<div class="exchange-list">';
    publicCoins.forEach(({ uid, coin }) => {
      const sym = coin.symbol;
      const price = this._playerCoinPrices[sym] || coin.baseValue || 100;
      const held = this._playerCoinHoldings[sym] || 0;
      const isOwn = typeof Firebase !== 'undefined' && Firebase.uid === uid;
      html += `<div class="exchange-card">
        <div class="exchange-header">
          <span style="font-size:18px">${coin.emoji || '\u{1FA99}'}</span>
          <span class="exchange-symbol" style="color:#bb86fc">${sym}</span>
          <span class="player-coin-badge">COIN</span>
          <span style="font-size:10px;color:var(--text-dim)">${this._esc(coin.name)}</span>
          <span class="exchange-price">${App.formatMoney(price)}</span>
        </div>
        <div style="font-size:11px;color:var(--text-dim);margin:4px 0">By ${this._esc(coin.ownerName || 'Player')} \u2022 Supply: ${(coin.supply||0).toLocaleString()}</div>
        <div class="exchange-balance">
          <span>Held: ${held.toFixed(2)} ${sym}</span>
          <span class="exchange-value">= ${App.formatMoney(held * price)}</span>
        </div>
        <div class="exchange-actions">
          <button class="stock-buy-btn" onclick="Crypto.promptBuyCoin('${sym}')">${isOwn ? 'Buy Back' : 'Buy'}</button>
          <button class="stock-sell-btn" onclick="Crypto.promptSellCoin('${sym}')" ${held > 0 ? '' : 'disabled'}>Sell</button>
          ${held > 0 ? `<button class="admin-btn" style="font-size:11px" onclick="Crypto.promptSendCoin('${sym}')">Send</button>` : ''}
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  },

  _getPublicPlayerCoins() {
    const result = [];
    for (const uid in this._playerCoins) {
      const coin = this._playerCoins[uid];
      if (coin && coin.symbol && coin.type !== 'private') {
        result.push({ uid, coin });
      }
    }
    return result;
  },

  _esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  },

  _drawPriceChart(canvasId, data, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!data || data.length < 2) return;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
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
      rigTargetCoins: this.rigTargetCoins.slice(),
      clickTargetCoin: this.clickTargetCoin,
      upgrades: { ...this.upgrades },
      cooling: this.cooling.slice(),
      heat: this.heat,
      coinPrices: this.coinPrices.slice(),
      playerCoinHoldings: { ...this._playerCoinHoldings },
    };
  },

  loadSaveData(data) {
    if (!data) return;
    // Wallet: fill defaults for all system coins first
    const defaultWallet = {};
    this.coins.forEach(c => { defaultWallet[c.symbol] = 0; });
    if (data.wallet) this.wallet = { ...defaultWallet, ...data.wallet };
    else this.wallet = defaultWallet;

    const defaultMined = {};
    this.coins.forEach(c => { defaultMined[c.symbol] = 0; });
    if (data.totalMined) this.totalMined = { ...defaultMined, ...data.totalMined };
    else this.totalMined = defaultMined;

    if (data.rigOwned) this.rigOwned = data.rigOwned;
    if (data.rigLevels) this.rigLevels = data.rigLevels;
    if (data.rigTargetCoins) this.rigTargetCoins = data.rigTargetCoins;
    if (data.clickTargetCoin !== undefined) this.clickTargetCoin = data.clickTargetCoin;
    if (data.upgrades) this.upgrades = { cpu: 0, gpu: 0, overclock: 0, ...data.upgrades };
    if (data.cooling) this.cooling = data.cooling;
    if (data.heat !== undefined) this.heat = data.heat;
    if (data.coinPrices && data.coinPrices.length) {
      // Migrate: map by index for existing coins, fall back to baseValue for new coins
      this.coinPrices = this.coins.map((c, i) => {
        const saved = data.coinPrices[i];
        return (typeof saved === 'number' && isFinite(saved) && saved > 0) ? saved : c.baseValue;
      });
      this.priceHistory = this.coinPrices.map(p => {
        const arr = [];
        for (let i = 0; i < 30; i++) arr.push(p);
        return arr;
      });
    }
    if (data.playerCoinHoldings) this._playerCoinHoldings = data.playerCoinHoldings;

    // Ensure correct lengths
    while (this.rigOwned.length < this.rigs.length) this.rigOwned.push(false);
    while (this.rigLevels.length < this.rigs.length) this.rigLevels.push(0);
    while (this.rigTargetCoins.length < this.rigs.length) {
      const i = this.rigTargetCoins.length;
      this.rigTargetCoins.push(this.coins.findIndex(c => c.symbol === this.rigs[i]?.coin) ?? 0);
    }
    while (this.cooling.length < this.coolingUpgrades.length) this.cooling.push(false);
    this.initialized = true;
  },
};
