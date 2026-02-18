const Clicker = {
  // Base upgrades
  upgradeDefs: [
    {
      id: 'clickValue',
      name: 'Click Value',
      desc: 'Increase money per click',
      baseCost: 0.50,
      costScale: 1.9,
      maxLevel: 50,
      effect(level) { return 0.01 + level * 0.01; } // +$0.01 per level
    },
    {
      id: 'autoClicker',
      name: 'Auto Clicker',
      desc: 'Earn money automatically',
      baseCost: 5,
      costScale: 2.3,
      maxLevel: 50,
      effect(level) { return level * 0.008; } // $0.008/sec per level
    }
  ],

  // Rebirth unlock upgrades (only visible after enough rebirths)
  rebirthUpgrades: [
    {
      id: 'luckyClick',
      name: 'Lucky Click',
      desc: '10% chance for 10x click value',
      baseCost: 500,
      costScale: 2.5,
      maxLevel: 10,
      requiredRebirths: 1,
      effect(level) { return level * 0.01; } // chance per level (1% per level)
    },
    {
      id: 'critClick',
      name: 'Critical Click',
      desc: '2% chance for 100x click value',
      baseCost: 5000,
      costScale: 3,
      maxLevel: 5,
      requiredRebirths: 2,
      effect(level) { return level * 0.004; } // 0.4% per level
    },
    {
      id: 'autoBet',
      name: 'Auto Bet',
      desc: 'Auto-play casino games for passive income',
      baseCost: 25000,
      costScale: 3,
      maxLevel: 5,
      requiredRebirths: 3,
      effect(level) { return level * 0.5; } // $ per 10 seconds
    }
  ],

  autoInterval: null,
  autoBetInterval: null,

  init() {
    this.renderUpgrades();
    this.updateStats();
    this.updateRebirthUI();
    this.startAutoClicker();
    this.startAutoBet();
  },

  // === Rebirth System ===
  getRebirths() { return App.rebirth || 0; },

  getEarningsMultiplier() {
    const r = this.getRebirths();
    return Math.pow(1.5, r); // 1.5x per rebirth, stacks multiplicatively
  },

  getCostDiscount() {
    const r = this.getRebirths();
    return Math.max(0.5, 1 - r * 0.1); // 10% cheaper per rebirth, max 50%
  },

  getStartingCash() {
    const r = this.getRebirths();
    const base = (typeof Admin !== 'undefined') ? Admin.startingBalance : 0.02;
    return base * Math.pow(5, r); // 5x more starting cash per rebirth
  },

  canRebirth() {
    return (App.upgrades.clickValue || 0) >= 50 && (App.upgrades.autoClicker || 0) >= 50;
  },

  doRebirth() {
    if (!this.canRebirth()) return;
    if (!confirm('REBIRTH: Reset all progress for permanent bonuses?\n\n' +
      'You will get:\n' +
      '• 1.5x earnings multiplier (stacks)\n' +
      '• 10% cheaper upgrades\n' +
      '• ' + App.formatMoney(this.getStartingCash() * 5) + ' starting cash\n' +
      (this.getRebirths() === 0 ? '• UNLOCK: Lucky Click upgrade\n' : '') +
      (this.getRebirths() === 1 ? '• UNLOCK: Critical Click upgrade\n' : '') +
      (this.getRebirths() === 2 ? '• UNLOCK: Auto Bet upgrade\n' : '') +
      '• VIP Level ' + (this.getRebirths() + 1) + ' casino perks'
    )) return;

    App.rebirth = (App.rebirth || 0) + 1;

    // Preserve coinLuck through rebirth
    const savedCoinLuck = App.upgrades.coinLuck || 0;

    // Reset progress but keep rebirth count + preserved data
    App.balance = this.getStartingCash();
    App.totalEarned = 0;
    App.totalClicks = 0;
    App.upgrades = { clickValue: 0, autoClicker: 0, luckyClick: 0, critClick: 0, autoBet: 0, coinLuck: savedCoinLuck };
    App.updateBalance();
    App.save();

    this.startAutoClicker();
    this.startAutoBet();
    this.renderUpgrades();
    this.updateStats();
    this.updateRebirthUI();
  },

  updateRebirthUI() {
    const r = this.getRebirths();

    // Rebirth counter
    const counterEl = document.getElementById('rebirth-count');
    if (counterEl) counterEl.textContent = r;

    // Multiplier display
    const multEl = document.getElementById('rebirth-mult');
    if (multEl) multEl.textContent = this.getEarningsMultiplier().toFixed(2) + 'x';

    // Discount display
    const discEl = document.getElementById('rebirth-discount');
    if (discEl) discEl.textContent = Math.round((1 - this.getCostDiscount()) * 100) + '%';

    // VIP level
    const vipEl = document.getElementById('vip-level');
    if (vipEl) {
      if (r > 0) {
        vipEl.textContent = 'VIP ' + r;
        vipEl.classList.remove('hidden');
      } else {
        vipEl.classList.add('hidden');
      }
    }

    // Rebirth button visibility
    const btnEl = document.getElementById('rebirth-btn');
    if (btnEl) {
      btnEl.classList.toggle('hidden', !this.canRebirth());
    }

    // Rebirth info panel
    const infoEl = document.getElementById('rebirth-info');
    if (infoEl) {
      infoEl.classList.toggle('hidden', r === 0 && !this.canRebirth());
    }
  },

  // === Click Value ===
  getClickValue() {
    const level = App.upgrades.clickValue || 0;
    let base = this.upgradeDefs[0].effect(level);

    // Apply rebirth multiplier
    base *= this.getEarningsMultiplier();

    // Apply pet boost
    if (typeof Pets !== 'undefined') base *= Pets.getBoosts().clickMult;

    return base;
  },

  // Click with lucky/crit chances
  getClickValueWithLuck() {
    let value = this.getClickValue();
    const r = this.getRebirths();

    // Lucky click (rebirth 1+)
    if (r >= 1) {
      const luckyChance = this.rebirthUpgrades[0].effect(App.upgrades.luckyClick || 0);
      if (Math.random() < luckyChance) {
        value *= 10;
        return { value, type: 'lucky' };
      }
    }

    // Critical click (rebirth 2+)
    if (r >= 2) {
      const critChance = this.rebirthUpgrades[1].effect(App.upgrades.critClick || 0);
      if (Math.random() < critChance) {
        value *= 100;
        return { value, type: 'crit' };
      }
    }

    return { value, type: 'normal' };
  },

  getAutoRate() {
    const level = App.upgrades.autoClicker || 0;
    let rate = this.upgradeDefs[1].effect(level);
    rate *= this.getEarningsMultiplier();
    if (typeof Pets !== 'undefined') rate *= Pets.getBoosts().incomeMult;
    return rate;
  },

  getCost(def) {
    const level = App.upgrades[def.id] || 0;
    const discount = this.getCostDiscount();
    return Math.floor(def.baseCost * Math.pow(def.costScale, level) * discount);
  },

  click(event) {
    const result = this.getClickValueWithLuck();
    App.addBalance(result.value);
    App.totalClicks++;
    if (typeof Pets !== 'undefined') Pets.checkEasterEgg('click_count', App.totalClicks);
    this.updateStats();
    this.renderUpgrades();
    this.updateRebirthUI();

    // Float text with color based on type
    if (event) {
      const el = document.createElement('div');
      el.className = 'float-text';
      if (result.type === 'lucky') {
        el.className += ' float-lucky';
        el.textContent = 'LUCKY +' + App.formatMoney(result.value);
      } else if (result.type === 'crit') {
        el.className += ' float-crit';
        el.textContent = 'CRIT! +' + App.formatMoney(result.value);
      } else {
        el.textContent = '+' + App.formatMoney(result.value);
      }
      el.style.left = (event.clientX - 30) + 'px';
      el.style.top = (event.clientY - 20) + 'px';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 800);
    }
  },

  buyUpgrade(id) {
    const allDefs = [...this.upgradeDefs, ...this.rebirthUpgrades];
    const def = allDefs.find(d => d.id === id);
    if (!def) return;

    const level = App.upgrades[id] || 0;
    if (def.maxLevel && level >= def.maxLevel) return;

    const cost = this.getCost(def);
    if (App.balance < cost) return;

    App.balance -= cost;
    App.upgrades[id] = level + 1;
    App.updateBalance();
    this.renderUpgrades();
    this.updateStats();
    this.updateRebirthUI();

    if (id === 'autoClicker') this.startAutoClicker();
    if (id === 'autoBet') this.startAutoBet();
  },

  startAutoClicker() {
    if (this.autoInterval) clearInterval(this.autoInterval);
    const rate = this.getAutoRate();
    if (rate <= 0) return;

    const speedMult = (typeof Admin !== 'undefined') ? Admin.speedMultiplier : 1;
    // rate is $/sec, tick 10 times per second
    this.autoInterval = setInterval(() => {
      App.addBalance(rate * speedMult / 10);
      this.updateStats();
    }, 100);
  },

  startAutoBet() {
    if (this.autoBetInterval) clearInterval(this.autoBetInterval);
    const level = App.upgrades.autoBet || 0;
    if (level <= 0 || this.getRebirths() < 3) return;

    const income = this.rebirthUpgrades[2].effect(level) * this.getEarningsMultiplier();
    this.autoBetInterval = setInterval(() => {
      App.addBalance(income);
      this.updateStats();
    }, 10000);
  },

  updateStats() {
    document.getElementById('stat-vpc').textContent = App.formatMoney(this.getClickValue());
    document.getElementById('stat-cps').textContent = App.formatMoney(this.getAutoRate());
    document.getElementById('stat-earned').textContent = App.formatMoney(App.totalEarned);
    document.getElementById('stat-clicks').textContent = App.totalClicks.toLocaleString();
    document.getElementById('click-value').textContent = App.formatMoney(this.getClickValue());
  },

  renderUpgrades() {
    const list = document.getElementById('upgrade-list');
    list.innerHTML = '';
    const r = this.getRebirths();

    // Base upgrades
    this.upgradeDefs.forEach(def => this._renderUpgrade(list, def));

    // Rebirth upgrades (only show if unlocked)
    this.rebirthUpgrades.forEach(def => {
      if (r >= def.requiredRebirths) {
        this._renderUpgrade(list, def, true);
      }
    });
  },

  _renderUpgrade(list, def, isRebirth) {
    const level = App.upgrades[def.id] || 0;
    const maxed = def.maxLevel && level >= def.maxLevel;
    const cost = maxed ? 0 : this.getCost(def);
    const affordable = !maxed && App.balance >= cost;

    let effectStr;
    if (def.id === 'clickValue') {
      effectStr = App.formatMoney(def.effect(level) * this.getEarningsMultiplier()) + '/click';
      if (!maxed) effectStr += ' \u2192 ' + App.formatMoney(def.effect(level + 1) * this.getEarningsMultiplier()) + '/click';
    } else if (def.id === 'autoClicker') {
      effectStr = App.formatMoney(def.effect(level) * this.getEarningsMultiplier()) + '/sec';
      if (!maxed) effectStr += ' \u2192 ' + App.formatMoney(def.effect(level + 1) * this.getEarningsMultiplier()) + '/sec';
    } else if (def.id === 'luckyClick') {
      effectStr = (level * 1) + '% chance \u2192 ' + ((level + 1) * 1) + '% for 10x';
    } else if (def.id === 'critClick') {
      effectStr = (level * 0.4).toFixed(1) + '% chance \u2192 ' + ((level + 1) * 0.4).toFixed(1) + '% for 100x';
    } else if (def.id === 'autoBet') {
      const em = this.getEarningsMultiplier();
      effectStr = App.formatMoney(def.effect(level) * em) + '/10s \u2192 ' + App.formatMoney(def.effect(level + 1) * em) + '/10s';
    } else {
      effectStr = def.desc;
    }

    const item = document.createElement('div');
    item.className = 'upgrade-item' + (affordable ? ' affordable' : '') + (isRebirth ? ' rebirth-upgrade' : '');
    if (!maxed) item.onclick = () => this.buyUpgrade(def.id);
    item.innerHTML = `
      <div class="upgrade-info">
        <div class="upgrade-name">${def.name}${isRebirth ? ' <span class="rebirth-tag">R' + def.requiredRebirths + '</span>' : ''}</div>
        <div class="upgrade-desc">${effectStr}</div>
        <div class="upgrade-level">Level ${level}${def.maxLevel ? '/' + def.maxLevel : ''}</div>
      </div>
      <div class="upgrade-cost">${maxed ? 'MAX' : App.formatMoney(cost)}</div>
    `;
    list.appendChild(item);
  }
};
