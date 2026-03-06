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

  _taxTimer: null,

  init() {
    this.renderUpgrades();
    this.updateStats();
    this.updateRebirthUI();
    this.startAutoClicker();
    this.startAutoBet();
    this.startWealthTax();
  },

  // Wealth tax: 0.1% every 60s on balances over $1T
  startWealthTax() {
    if (this._taxTimer) clearInterval(this._taxTimer);
    this._taxTimer = setInterval(() => {
      const threshold = 1_000_000_000_000; // 1T
      if (App.balance > threshold) {
        const tax = App.balance * 0.001; // 0.1%
        App.addBalance(-tax);
        // Show subtle tax notification
        const el = document.getElementById('tax-notice');
        if (el) {
          el.textContent = 'Wealth tax: -' + App.formatMoney(tax);
          el.classList.remove('hidden');
          clearTimeout(this._taxFade);
          this._taxFade = setTimeout(() => el.classList.add('hidden'), 3000);
        }
      }
    }, 60000);
  },

  // === Rebirth System ===
  getRebirths() { return App.rebirth || 0; },

  // VIP milestone perks — each level unlocks cumulative bonuses
  VIP_MILESTONES: [
    { level: 1,  label: 'Lucky Click unlocked' },
    { level: 2,  label: 'Critical Click unlocked' },
    { level: 3,  label: 'Auto Bet unlocked' },
    { level: 5,  label: 'Casino +10% · Loan interest -1%',    casinoMult: 0.10, interestFlat: -1 },
    { level: 10, label: 'Crime fines -25% · Passive +20%',    fineMult: -0.25,  passiveMult: 0.20 },
    { level: 25, label: 'All income +20% · Raids -15%',       incomeMult: 0.20, raidMult: -0.15 },
    { level: 50, label: 'All income +50% · SHARK rate -5%',   incomeMult: 0.50, interestFlat: -5 },
  ],

  // Sum up all bonuses earned from VIP milestones up to current level
  getVipBonus(type) {
    const r = this.getRebirths();
    let total = 0;
    for (const m of this.VIP_MILESTONES) {
      if (r >= m.level && m[type] !== undefined) total += m[type];
    }
    return total;
  },

  getEarningsMultiplier() {
    const r = this.getRebirths();
    // r 0-10: +0.5x per rebirth (1x → 5x); r 10+: +0.1x per rebirth (slower, no cap)
    let mult = r <= 10 ? (1 + r * 0.5) : (5 + (r - 10) * 0.1);
    // VIP passive income bonus
    mult *= (1 + this.getVipBonus('passiveMult'));
    mult *= (1 + this.getVipBonus('incomeMult'));
    if (typeof App !== 'undefined') mult *= (1 - App.getHungerPenalty());
    return mult;
  },

  getCostDiscount() {
    const r = this.getRebirths();
    // r 0-5: discount grows (50% off at r5)
    // r 5-15: flat 50% off
    // r 15+: costs creep back up (+5% per rebirth above 15)
    if (r <= 5)  return 1 - r * 0.10;          // 0% → 50% off
    if (r <= 15) return 0.5;                    // flat 50% off
    return 0.5 + (r - 15) * 0.05;              // 50% off → eventually more expensive
  },

  // Max upgrade level — no hard cap, grows with rebirth
  getMaxUpgradeLevel() {
    const r = this.getRebirths();
    // r 0-5: +10/rebirth (10 → 60); r 5+: +5/rebirth (slower, keeps growing)
    if (r <= 5) return 10 + r * 10;
    return 60 + (r - 5) * 5;
  },

  getStartingCash() {
    const r = this.getRebirths();
    const base = (typeof Admin !== 'undefined') ? Admin.startingBalance : 0.02;
    return base * Math.pow(5, r);
  },

  // Rebirth requirements scale with each rebirth
  getRebirthRequirements() {
    const r = this.getRebirths();
    const maxLvl = this.getMaxUpgradeLevel();
    const clickReq = maxLvl;
    const autoReq = maxLvl;
    // Each rebirth requires exponentially more total earned money
    const earnedReq = r === 0 ? 5000 : 5000 * Math.pow(10, r);
    return { clickReq, autoReq, earnedReq };
  },

  canRebirth() {
    const req = this.getRebirthRequirements();
    return (App.upgrades.clickValue || 0) >= req.clickReq &&
           (App.upgrades.autoClicker || 0) >= req.autoReq &&
           App.totalEarned >= req.earnedReq;
  },

  doRebirth() {
    if (!this.canRebirth()) return;
    const req = this.getRebirthRequirements();
    const unstoredPets = typeof Pets !== 'undefined' ? Pets.owned.filter(o => o).length : 0;
    const nextR = this.getRebirths() + 1;
    const nextMaxLvl = nextR <= 5 ? 10 + nextR * 10 : 60 + (nextR - 5) * 5;
    const newMilestone = this.VIP_MILESTONES.find(m => m.level === nextR);
    const costNote = nextR > 15
      ? '⚠️ Upgrade costs now ' + Math.round((0.5 + (nextR - 15) * 0.05) * 100) + '% of base (harder!)\n'
      : nextR > 5 ? '• Upgrade costs stay at 50% off\n'
      : '• Upgrades ' + (nextR * 10) + '% cheaper\n';
    if (!confirm('REBIRTH → VIP ' + nextR + '\n\n' +
      'RESET:\n' +
      '• All upgrades & balance\n' +
      '• Properties & Crime buildings\n' +
      '• Stock portfolio & crypto rigs\n' +
      '• Loans & debt\n' +
      '• Your player stock holdings\n' +
      (unstoredPets > 0 ? '• ' + unstoredPets + ' ACTIVE PETS WILL BE LOST!\n' : '') +
      '\nKEPT:\n' +
      '• Your companies, pets in storage\n\n' +
      'YOU GET:\n' +
      '• Earnings mult: ' + (nextR <= 10 ? (1 + nextR * 0.5).toFixed(1) : (5 + (nextR - 10) * 0.1).toFixed(1)) + 'x\n' +
      costNote +
      '• Starting cash: ' + App.formatMoney(this.getStartingCash() * 5) + '\n' +
      '• Max upgrade level: ' + nextMaxLvl + '\n' +
      (newMilestone ? '🌟 NEW VIP PERK: ' + newMilestone.label + '\n' : '') +
      '\n⚠️ Gets harder each rebirth!'
    )) return;

    App.rebirth = (App.rebirth || 0) + 1;

    // Preserve coinLuck through rebirth
    const savedCoinLuck = App.upgrades.coinLuck || 0;

    // Reset core progress
    App.balance = this.getStartingCash();
    App.totalEarned = 0;
    App.totalClicks = 0;
    App.upgrades = { clickValue: 0, autoClicker: 0, luckyClick: 0, critClick: 0, autoBet: 0, coinLuck: savedCoinLuck };

    // Reset properties
    if (typeof Properties !== 'undefined') Properties.resetAll();

    // Reset crime
    if (typeof Crime !== 'undefined' && Crime.resetAll) Crime.resetAll();

    // Reset loans
    if (typeof Loans !== 'undefined') {
      Loans.debt = 0;
      Loans.loanTime = 0;
      Loans.stopInterest();
      Loans.updateUI();
      Loans.updateDebtDisplay();
    }

    // Reset stocks
    if (typeof Stocks !== 'undefined') {
      Stocks.holdings = {};
      Stocks.cashInvested = 0;
      Stocks.totalProfit = 0;
      Stocks.newsHistory = [];
    }

    // Reset crypto
    if (typeof Crypto !== 'undefined') {
      const emptyWallet = {};
      Crypto.coins.forEach(c => { emptyWallet[c.symbol] = 0; });
      Crypto.wallet = { ...emptyWallet };
      Crypto.totalMined = { ...emptyWallet };
      Crypto.rigOwned = Crypto.rigs.map(() => false);
      Crypto.rigLevels = Crypto.rigs.map(() => 0);
      Crypto.rigTargetCoins = Crypto.rigs.map((r, i) => Crypto.coins.findIndex(c => c.symbol === r.coin));
      Crypto.upgrades = { cpu: 0, gpu: 0, overclock: 0 };
      Crypto.cooling = Crypto.coolingUpgrades.map(() => false);
      Crypto.heat = 0;
    }

    // Reset player stock holdings but keep owned companies + upgrades + slots
    if (typeof Companies !== 'undefined') {
      Companies._holdings = {};
      Companies._saveLocal();
    }

    // Reset pets (storage survives)
    if (typeof Pets !== 'undefined') {
      Pets.onRebirth();
    }

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

    // Discount/premium display
    const discEl = document.getElementById('rebirth-discount');
    if (discEl) {
      const disc = this.getCostDiscount();
      if (disc < 1) {
        discEl.textContent = Math.round((1 - disc) * 100) + '% off';
        discEl.style.color = '';
      } else {
        discEl.textContent = '+' + Math.round((disc - 1) * 100) + '% harder';
        discEl.style.color = '#ff5252';
      }
    }

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

    // VIP perks earned so far
    const perksEl = document.getElementById('vip-perks-list');
    if (perksEl) {
      const earned = this.VIP_MILESTONES.filter(m => r >= m.level);
      if (earned.length) {
        perksEl.innerHTML = earned.map(m =>
          `<div class="vip-perk-row">🌟 VIP ${m.level}: ${m.label}</div>`
        ).join('');
        perksEl.classList.remove('hidden');
      } else {
        perksEl.innerHTML = '<div style="color:var(--text-dim);font-size:12px">Reach VIP 5 for first bonus</div>';
        perksEl.classList.remove('hidden');
      }
      // Next milestone teaser
      const next = this.VIP_MILESTONES.find(m => r < m.level);
      if (next) {
        perksEl.innerHTML += `<div class="vip-perk-next">🔒 VIP ${next.level}: ${next.label}</div>`;
      }
    }

    // Rebirth button + requirement display
    const btnEl = document.getElementById('rebirth-btn');
    const reqEl = document.getElementById('rebirth-req');
    const req = this.getRebirthRequirements();
    const canDo = this.canRebirth();

    if (btnEl) {
      btnEl.classList.toggle('hidden', canDo ? false : true);
    }

    // Show requirements when not yet met
    if (reqEl) {
      const clickOk = (App.upgrades.clickValue || 0) >= req.clickReq;
      const autoOk = (App.upgrades.autoClicker || 0) >= req.autoReq;
      const earnOk = App.totalEarned >= req.earnedReq;
      if (canDo) {
        reqEl.innerHTML = '<span style="color:var(--green)">Ready to rebirth!</span>';
      } else {
        reqEl.innerHTML = '<span class="rebirth-req-title">Next Rebirth Requires:</span>' +
          '<span class="' + (clickOk ? 'req-met' : 'req-unmet') + '">Click Lv ' + (App.upgrades.clickValue||0) + '/' + req.clickReq + '</span>' +
          '<span class="' + (autoOk ? 'req-met' : 'req-unmet') + '">Auto Lv ' + (App.upgrades.autoClicker||0) + '/' + req.autoReq + '</span>' +
          '<span class="' + (earnOk ? 'req-met' : 'req-unmet') + '">Earned ' + App.formatMoney(App.totalEarned) + ' / ' + App.formatMoney(req.earnedReq) + '</span>';
      }
      reqEl.classList.remove('hidden');
    }

    // Rebirth info panel
    const infoEl = document.getElementById('rebirth-info');
    if (infoEl) {
      infoEl.classList.toggle('hidden', r === 0 && !canDo && App.totalEarned < req.earnedReq * 0.1);
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

    // World event click multiplier
    if (typeof Events !== 'undefined') base *= Events.getClickMultiplier();

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

    // Ripple effect on click button
    if (event) {
      const btn = document.getElementById('click-btn');
      if (btn) {
        const r = document.createElement('span');
        r.className = 'ripple';
        const rect = btn.getBoundingClientRect();
        const x = (event.clientX || rect.left + rect.width/2) - rect.left - 40;
        const y = (event.clientY || rect.top + rect.height/2) - rect.top - 40;
        r.style.left = x + 'px';
        r.style.top = y + 'px';
        btn.appendChild(r);
        setTimeout(() => r.remove(), 600);
      }
    }

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
