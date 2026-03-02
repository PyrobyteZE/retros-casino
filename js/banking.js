// Finance Company Banking System
const Banking = {
  _banks: {},        // { [bankId]: bankMeta }
  _myVaults: {},     // { [bankId]: vaultData } — my deposits, keyed by bankId
  _bankVaults: {},   // { [bankId]: { [depositorUid]: vaultData } } — if I own the bank
  _bankVaultListeners: null, // Set<bankId> of bankIds already subscribed
  _loansOwed: {},    // { [lenderUid]: { principal, loanRate, borrowedAt, lastInterestAt, totalOwed } }
  _myLoans: {},      // { [borrowerUid]: loanRecord } — visible to bank owner
  _tickTimer: null,
  _initialized: false,

  // Upgrade definitions
  UPGRADES: {
    vaultCap:      { name: '🏛️ Vault Capacity',  maxLevel: 5, costs: [500_000, 2_000_000, 8_000_000, 30_000_000, 100_000_000],
                     caps: [50_000, 250_000, 1_000_000, 5_000_000, 25_000_000, Infinity] },
    fraudProtect:  { name: '🔒 Fraud Protection', maxLevel: 3, costs: [1_000_000, 5_000_000, 20_000_000],
                     stressGain: [40, 30, 20, 10] },
    rateBoost:     { name: '📊 Rate Booster',     maxLevel: 3, costs: [2_000_000, 8_000_000, 30_000_000],
                     mult: [1, 1.2, 1.5, 2.0] },
    stressCushion: { name: '💼 Stress Cushion',   maxLevel: 3, costs: [1_000_000, 4_000_000, 15_000_000],
                     missedGain: [20, 15, 10, 5] },
  },

  ENABLE_COST: 100_000,
  MIN_REBIRTH: 5,

  init() {
    if (this._initialized) return; // prevent double listener registration
    this._initialized = true;
    this._bankVaultListeners = new Set();

    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) return;

    Firebase.listenBanks(data => {
      this._banks = data || {};
      this._renderBankCards();
      // Set up vault listeners for banks I own (once per bankId)
      const myUid = Firebase.uid;
      for (const [bankId, bank] of Object.entries(this._banks)) {
        if (bank.ownerUid === myUid && !this._bankVaultListeners.has(bankId)) {
          this._bankVaultListeners.add(bankId);
          Firebase.listenBankVaults(bankId, vaultData => {
            this._bankVaults[bankId] = vaultData || {};
          });
        }
      }
    });

    Firebase.listenMyVaults(Firebase.uid, data => {
      this._myVaults = data || {};
      this._renderBankCards();
    });

    Firebase.listenMyLoansOwed(Firebase.uid, data => {
      this._loansOwed = data || {};
      this._renderBankCards();
    });

    Firebase.listenBankLoans(Firebase.uid, data => {
      this._myLoans = data || {};
    });

    if (!this._tickTimer) {
      this._tickTimer = setInterval(() => this._tick(), 5 * 60 * 1000); // every 5 min
    }
  },

  // === OWNER ACTIONS ===

  enableBank(companyIdx) {
    if (!Firebase || !Firebase.isOnline()) { alert('Must be online.'); return; }
    if ((App.rebirth || 0) < this.MIN_REBIRTH) { alert('Requires Rebirth ' + this.MIN_REBIRTH + '.'); return; }
    const myUid = Firebase.uid;
    if (App.balance < this.ENABLE_COST) { alert('Need ' + App.formatMoney(this.ENABLE_COST)); return; }

    const c = typeof Companies !== 'undefined' ? Companies._companies[companyIdx] : null;
    if (!c) { alert('Company not found.'); return; }
    if ((c.industry || 'tech') !== 'finance') { alert('Only Finance industry companies can enable banking.'); return; }

    // Unique bankId — no longer limited to one per company
    const bankId = 'bank_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const bankName = (document.getElementById('bank-name-' + companyIdx)?.value || '').trim() || (c.name + ' Bank');
    const rawRate = parseFloat(document.getElementById('bank-rate-' + companyIdx)?.value) || 3;
    const interestRate = Math.max(0.01, Math.min(0.15, rawRate / 100));
    const loanRate = Math.max(1, Math.min(20, parseFloat(document.getElementById('bank-loanrate-' + companyIdx)?.value) || 5));
    const maxDeposit = parseInt(document.getElementById('bank-maxdeposit-' + companyIdx)?.value) || 0;

    App.addBalance(-this.ENABLE_COST);

    const bankData = {
      bankId,
      enabled: true,
      ownerUid: myUid,
      companyTicker: c.ticker,
      ownerName: (typeof Settings !== 'undefined') ? Settings.profile.name : 'Player',
      bankName,
      interestRate,
      loanRate,
      maxDeposit,
      totalDeposited: 0,
      depositorCount: 0,
      stressLevel: 0,
      upgrades: { vaultCap: 0, fraudProtect: 0, rateBoost: 0, stressCushion: 0 },
    };

    Firebase.createBank(bankId, bankData).then(() => {
      Toast.show('🏦 Bank opened!', '#27ae60', 3000);
      if (typeof Companies !== 'undefined') Companies._triggerRender();
    }).catch(err => { App.addBalance(this.ENABLE_COST); alert('Error: ' + err); });
  },

  closeBank(bankId) {
    if (!Firebase || !Firebase.isOnline()) return;
    if (!this._banks[bankId]) return;
    if (!confirm('Close this bank? All depositors will lose their deposits!')) return;
    this.bankruptBank(bankId, 'Owner closed bank');
  },

  buyUpgrade(upgradeKey, bankId) {
    if (!Firebase || !Firebase.isOnline()) return;
    const bank = this._banks[bankId];
    if (!bank) return;
    const def = this.UPGRADES[upgradeKey];
    if (!def) return;
    const lvl = (bank.upgrades && bank.upgrades[upgradeKey]) || 0;
    if (lvl >= def.maxLevel) { alert('Already maxed.'); return; }
    const cost = def.costs[lvl];
    if (App.balance < cost) { alert('Need ' + App.formatMoney(cost)); return; }
    App.addBalance(-cost);
    Firebase.updateBank(bankId, { ['upgrades/' + upgradeKey]: lvl + 1 }).then(() => {
      Toast.show('✅ Upgrade purchased!', '#27ae60', 2000);
      if (typeof Companies !== 'undefined') Companies._triggerRender();
    }).catch(err => { App.addBalance(cost); alert('Error: ' + err); });
  },

  setMaxDeposit(bankId) {
    if (!Firebase || !Firebase.isOnline()) return;
    if (!this._banks[bankId]) return;
    const val = parseInt(document.getElementById('bank-maxdeposit-set-' + bankId)?.value) || 0;
    Firebase.updateBank(bankId, { maxDeposit: val }).then(() => {
      Toast.show('Max deposit updated', '#27ae60', 2000);
      if (typeof Companies !== 'undefined') Companies._triggerRender();
    });
  },

  setInterestRate(bankId) {
    if (!Firebase || !Firebase.isOnline()) return;
    const bank = this._banks[bankId];
    if (!bank) return;
    const raw = parseFloat(document.getElementById('bank-rate-set-' + bankId)?.value) || 0;
    const clamped = Math.max(0.01, Math.min(0.15, raw / 100));
    Firebase.updateBank(bankId, { interestRate: clamped }).then(() => {
      Toast.show('Interest rate updated', '#27ae60', 2000);
      if (typeof Companies !== 'undefined') Companies._triggerRender();
    });
  },

  // === DEPOSIT / WITHDRAW ===

  openDepositModal(bankKey) {
    const bank = this._banks[bankKey];
    if (!bank) return;
    const myHoldings = typeof Companies !== 'undefined' ? Companies._holdings : {};
    const myCoinHoldings = typeof Crypto !== 'undefined' ? Crypto._playerCoinHoldings : {};

    const stockRows = Object.entries(myHoldings).filter(([, h]) => h.shares > 0).map(([sym, h]) =>
      `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <input type="checkbox" id="dep-stk-${sym}" style="width:16px;height:16px">
        <label for="dep-stk-${sym}" style="flex:1;font-size:13px">${sym} (${h.shares} shares)</label>
        <input type="number" id="dep-stk-qty-${sym}" min="1" max="${h.shares}" value="${h.shares}" style="width:70px;font-size:12px;padding:4px">
      </div>`
    ).join('');

    const coinRows = Object.entries(myCoinHoldings).filter(([, amt]) => amt > 0).map(([sym, amt]) =>
      `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <input type="checkbox" id="dep-coin-${sym}" style="width:16px;height:16px">
        <label for="dep-coin-${sym}" style="flex:1;font-size:13px">${sym} (${Crypto.formatCoin(amt)})</label>
        <input type="number" id="dep-coin-qty-${sym}" min="0" step="any" value="${amt}" style="width:80px;font-size:12px;padding:4px">
      </div>`
    ).join('');

    const vaultCap = this._getVaultCap(bankKey);
    const myVault = this._myVaults[bankKey];
    const currentDeposit = myVault ? (myVault.money || 0) : 0;

    const html = `<div style="padding:12px;max-width:340px">
      <h3 style="margin:0 0 8px;color:var(--green)">🏦 Deposit to ${this._esc(bank.bankName || bank.ownerName + "'s Bank")}</h3>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px">Rate: ${(bank.interestRate * 100).toFixed(1)}%/hr &bull; Your deposit: ${App.formatMoney(currentDeposit)}${vaultCap !== Infinity ? ' &bull; Cap: ' + App.formatMoney(vaultCap) : ''}</div>
      <div class="admin-row" style="margin-bottom:8px">
        <label style="min-width:80px">Cash ($):</label>
        <input type="number" id="dep-cash" min="0" step="any" placeholder="Amount" style="flex:1;font-size:14px;padding:6px">
        <button onclick="document.getElementById('dep-cash').value=App.balance" style="font-size:11px;padding:4px 8px;background:var(--bg3);border:1px solid var(--bg3);border-radius:6px;color:var(--text);cursor:pointer">Max</button>
      </div>
      ${stockRows ? `<div style="font-size:12px;font-weight:700;margin-bottom:4px">Stocks:</div>${stockRows}` : ''}
      ${coinRows ? `<div style="font-size:12px;font-weight:700;margin-bottom:4px">Coins:</div>${coinRows}` : ''}
      <button class="game-btn" style="width:100%;margin-top:8px" onclick="Banking.deposit('${bankKey}')">Deposit</button>
    </div>`;

    let modal = document.getElementById('modal-overlay');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-overlay';
      document.body.appendChild(modal);
    }
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center';
    modal.innerHTML = `<div style="background:var(--bg2);border-radius:12px;max-height:90vh;overflow-y:auto;min-width:280px">${html}
      <button onclick="document.getElementById('modal-overlay').remove()" style="width:100%;padding:10px;background:var(--bg3);border:none;color:var(--text);font-size:14px;border-radius:0 0 12px 12px;cursor:pointer">Cancel</button>
    </div>`;
  },

  deposit(bankKey) {
    const bank = this._banks[bankKey];
    if (!bank) return;
    const myUid = Firebase.uid;
    const ownerUid = bank.ownerUid;

    const cash = parseFloat(document.getElementById('dep-cash')?.value) || 0;
    if (cash < 0) { alert('Invalid amount.'); return; }
    if (cash > App.balance) { alert('Insufficient balance.'); return; }

    const vaultCap = this._getVaultCap(bankKey);
    const myVault = this._myVaults[bankKey];
    const currentCash = myVault ? (myVault.money || 0) : 0;
    if (vaultCap !== Infinity && currentCash + cash > vaultCap) {
      alert('Exceeds per-player cap of ' + App.formatMoney(vaultCap)); return;
    }

    // Collect stocks
    const stocks = {};
    const myHoldings = typeof Companies !== 'undefined' ? Companies._holdings : {};
    for (const sym in myHoldings) {
      const cb = document.getElementById('dep-stk-' + sym);
      if (cb && cb.checked) {
        const qty = parseInt(document.getElementById('dep-stk-qty-' + sym)?.value) || 0;
        if (qty > 0 && myHoldings[sym].shares >= qty) stocks[sym] = qty;
      }
    }

    // Collect coins
    const coins = {};
    const myCoinHoldings = typeof Crypto !== 'undefined' ? Crypto._playerCoinHoldings : {};
    for (const sym in myCoinHoldings) {
      const cb = document.getElementById('dep-coin-' + sym);
      if (cb && cb.checked) {
        const qty = parseFloat(document.getElementById('dep-coin-qty-' + sym)?.value) || 0;
        if (qty > 0 && myCoinHoldings[sym] >= qty) coins[sym] = qty;
      }
    }

    // Deduct from player
    if (cash > 0) App.addBalance(-cash);
    for (const sym in stocks) {
      if (typeof Companies !== 'undefined') Companies._holdings[sym].shares -= stocks[sym];
    }
    for (const sym in coins) {
      if (typeof Crypto !== 'undefined') Crypto._playerCoinHoldings[sym] -= coins[sym];
    }

    const vaultData = {
      money: currentCash + cash,
      stocks: { ...(myVault?.stocks || {}), ...Object.fromEntries(Object.entries(stocks).map(([s, q]) => [s, ((myVault?.stocks?.[s] || 0) + q)])) },
      coins: { ...(myVault?.coins || {}), ...Object.fromEntries(Object.entries(coins).map(([s, q]) => [s, ((myVault?.coins?.[s] || 0) + q)])) },
      depositedAt: myVault?.depositedAt || Date.now(),
      lastInterestPaid: myVault?.lastInterestPaid || Date.now(),
      depositorName: (typeof Settings !== 'undefined') ? Settings.profile.name : 'Player',
    };

    Firebase.depositToVault(bankKey, myUid, vaultData).then(() => {
      if (myUid !== ownerUid) {
        Firebase.updateBank(bankKey, {
          totalDeposited: (bank.totalDeposited || 0) + cash,
          depositorCount: Object.keys(this._myVaults).length + (this._myVaults[bankKey] ? 0 : 1),
        });
      }
      App.save();
      document.getElementById('modal-overlay')?.remove();
      Toast.show('🏦 Deposited!', '#27ae60', 3000);
      this._renderBankCards();
    }).catch(err => {
      App.addBalance(cash);
      for (const sym in stocks) { if (typeof Companies !== 'undefined') Companies._holdings[sym].shares += stocks[sym]; }
      for (const sym in coins) { if (typeof Crypto !== 'undefined') Crypto._playerCoinHoldings[sym] += coins[sym]; }
      alert('Deposit failed: ' + err);
    });
  },

  withdraw(bankKey, what) {
    const bank = this._banks[bankKey];
    const myVault = this._myVaults[bankKey];
    if (!myVault) return;
    const myUid = Firebase.uid;
    const ownerUid = bank ? bank.ownerUid : bankKey;

    // Track for bank run
    if (myUid !== ownerUid && bank) {
      const now = Date.now();
      if (!bank._recentWithdrawals) bank._recentWithdrawals = [];
      bank._recentWithdrawals = bank._recentWithdrawals.filter(t => now - t < 2 * 60 * 1000);
      bank._recentWithdrawals.push(now);
      if (bank._recentWithdrawals.length >= 3) {
        const fraudLvl = (bank.upgrades && bank.upgrades.fraudProtect) || 0;
        const stressGain = this.UPGRADES.fraudProtect.stressGain[fraudLvl];
        Firebase.updateBank(bankKey, { stressLevel: Math.min(100, (bank.stressLevel || 0) + stressGain) });
      }
    }

    const cash = myVault.money || 0;
    const stocks = myVault.stocks || {};
    const coins = myVault.coins || {};

    App.addBalance(cash);
    for (const sym in stocks) {
      if (typeof Companies !== 'undefined') {
        if (!Companies._holdings[sym]) Companies._holdings[sym] = { shares: 0 };
        Companies._holdings[sym].shares += stocks[sym];
      }
    }
    for (const sym in coins) {
      if (typeof Crypto !== 'undefined') {
        Crypto._playerCoinHoldings[sym] = (Crypto._playerCoinHoldings[sym] || 0) + coins[sym];
      }
    }

    Firebase.removeVault(bankKey, myUid).then(() => {
      if (myUid !== ownerUid && bank) {
        Firebase.updateBank(bankKey, {
          totalDeposited: Math.max(0, (bank.totalDeposited || 0) - cash),
        });
      }
      App.save();
      Toast.show('💸 Withdrawn!', '#27ae60', 3000);
      this._renderBankCards();
    }).catch(err => {
      App.addBalance(-cash);
      alert('Withdraw failed: ' + err);
    });
  },

  // === LOANS ===

  requestLoan(bankKey, amount) {
    if (!Firebase || !Firebase.isOnline()) { alert('Must be online.'); return; }
    const bank = this._banks[bankKey];
    if (!bank || !bank.enabled) { alert('Bank not available.'); return; }
    if (!bank.loanRate) { alert('This bank has not enabled loans.'); return; }
    const lenderUid = bank.ownerUid;
    if (this._loansOwed[lenderUid]) { alert('You already have a loan from this bank owner. Repay it first.'); return; }
    const maxBorrow = Math.min(500_000, (App.balance + App.totalEarned) * 0.25);
    if (amount <= 0 || amount > maxBorrow) { alert(`Loan amount must be between $1 and ${App.formatMoney(maxBorrow)}.`); return; }
    const myUid = Firebase.uid;
    const loanData = {
      principal: amount,
      loanRate: bank.loanRate,
      borrowedAt: Date.now(),
      lastInterestAt: Date.now(),
      totalOwed: amount,
    };
    Firebase.createBankLoan(lenderUid, myUid, loanData).then(() => {
      App.addBalance(amount);
      App.save();
      Toast.show('💸 Loan of ' + App.formatMoney(amount) + ' received! Rate: ' + bank.loanRate + '%/hr', '#27ae60', 4000);
      this._renderBankCards();
    }).catch(err => alert('Loan error: ' + err));
  },

  repayLoan(lenderUid) {
    if (!Firebase || !Firebase.isOnline()) { alert('Must be online.'); return; }
    const loan = this._loansOwed[lenderUid];
    if (!loan) { alert('No loan found from this bank.'); return; }
    const totalOwed = loan.totalOwed || loan.principal;
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (!isGod && App.balance < totalOwed) { alert('Not enough to repay. Need ' + App.formatMoney(totalOwed)); return; }
    if (!confirm('Repay ' + App.formatMoney(totalOwed) + ' to clear this loan?')) return;
    if (!isGod) App.addBalance(-totalOwed);
    const myUid = Firebase.uid;
    Firebase.repayBankLoan(lenderUid, myUid);
    // Find any bank owned by this lender to credit them
    const bankEntry = Object.entries(this._banks).find(([, b]) => b.ownerUid === lenderUid);
    if (bankEntry) {
      const [bankKey, bank] = bankEntry;
      const interestEarned = totalOwed - loan.principal;
      Firebase.updateBank(bankKey, { totalEarned: (bank.totalEarned || 0) + interestEarned });
    }
    App.save();
    Toast.show('✅ Loan repaid!', '#27ae60', 3000);
    this._renderBankCards();
  },

  // === INTEREST TICK ===

  _tick() {
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    if (!myUid) return;

    for (const [bankId, myBank] of Object.entries(this._banks)) {
      if ((myBank.ownerUid || '') !== myUid) continue;
      if (!myBank.enabled) continue;

      // Owner-set interest rate boosted by upgrade
      const rateBoostLvl = (myBank.upgrades && myBank.upgrades.rateBoost) || 0;
      const boostMult = this.UPGRADES.rateBoost.mult[rateBoostLvl];
      const effectiveRate = Math.min(0.15, (myBank.interestRate || 0.02) * boostMult);

      // Interest per 5-min slice (hourly rate / 12)
      const totalDeposited = myBank.totalDeposited || 0;
      const interest = totalDeposited * effectiveRate / 12;

      if (interest > 0 && App.balance >= interest) {
        App.addBalance(-interest);
        const vaults = this._bankVaults[bankId] || {};
        const total = Object.values(vaults).reduce((s, v) => s + (v.money || 0), 0);
        if (total > 0) {
          for (const depUid in vaults) {
            const v = vaults[depUid];
            const share = (v.money || 0) / total;
            const earned = interest * share;
            if (earned > 0.01) {
              Firebase.updateVault(bankId, depUid, { money: (v.money || 0) + earned, lastInterestPaid: Date.now() });
            }
          }
        }
        Firebase.updateBank(bankId, { stressLevel: Math.max(0, (myBank.stressLevel || 0) - 5) });
      } else if (interest > 0) {
        const cushionLvl = (myBank.upgrades && myBank.upgrades.stressCushion) || 0;
        const stressGain = this.UPGRADES.stressCushion.missedGain[cushionLvl];
        const newStress = (myBank.stressLevel || 0) + stressGain;
        Firebase.updateBank(bankId, { stressLevel: newStress });
        if (newStress >= 100) this.bankruptBank(bankId, 'Missed interest payments');
      }

      if (Math.random() < 0.005) this.bankruptBank(bankId, 'Regulatory audit');
    }

    // Accrue interest on player bank loans I owe
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    for (const lenderUid in this._loansOwed) {
      const loan = this._loansOwed[lenderUid];
      if (!loan) continue;
      const elapsed = Date.now() - (loan.lastInterestAt || loan.borrowedAt);
      const interest = (loan.totalOwed || loan.principal) * (loan.loanRate / 100) * (elapsed / 3600000);
      if (interest > 0.01) {
        if (!isGod) App.addBalance(-interest);
        if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
          Firebase.updateBankLoan(lenderUid, myUid, {
            totalOwed: (loan.totalOwed || loan.principal) + interest,
            lastInterestAt: Date.now(),
          });
        }
      }
    }
  },

  _getVaultCap(bankKey) {
    const bank = this._banks[bankKey];
    if (!bank) return 50_000;
    const lvl = (bank.upgrades && bank.upgrades.vaultCap) || 0;
    return this.UPGRADES.vaultCap.caps[lvl];
  },

  // === BANKRUPTCY ===

  bankruptBank(bankId, reason) {
    if (!Firebase || !Firebase.isOnline()) return;
    const bank = this._banks[bankId];
    Toast.show('🏦 BANK COLLAPSED: ' + ((bank && (bank.bankName || bank.ownerName)) || 'Unknown') + (reason ? ' — ' + reason : ''), '#c0392b', 6000);
    Firebase.removeAllVaults(bankId).then(() => {
      Firebase.removeBank(bankId);
    });
    if (bank && bank.companyTicker && typeof Companies !== 'undefined') {
      const sym = bank.companyTicker;
      if (Companies._allPlayerStocks && Companies._allPlayerStocks[sym]) {
        Companies._declareBankruptcy(sym);
      }
    }
  },

  // === RENDERING ===

  _stressColor(stress) {
    return stress >= 70 ? '#e74c3c' : stress >= 40 ? '#f39c12' : '#27ae60';
  },

  _renderBankCards() {
    const container = document.getElementById('banking-browse-section');
    if (!container) return;

    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    const banks = Object.entries(this._banks);

    if (banks.length === 0) {
      container.innerHTML = '<div style="font-size:12px;color:var(--text-dim);padding:8px 0">No active banks.</div>';
      return;
    }

    // Fast path: only update stress bars if bank set hasn't changed
    const existingKeys = new Set([...container.querySelectorAll('[data-bank-uid]')].map(el => el.dataset.bankUid));
    const newKeys = new Set(banks.map(([k]) => k));
    const sameSet = existingKeys.size === newKeys.size && [...newKeys].every(k => existingKeys.has(k));

    if (sameSet && existingKeys.size > 0) {
      for (const [bankId, bank] of banks) {
        const stress = bank.stressLevel || 0;
        const color = this._stressColor(stress);
        const fill = container.querySelector(`[data-bank-uid="${bankId}"] .bank-stress-fill`);
        const label = container.querySelector(`[data-bank-uid="${bankId}"] .bank-stress-label`);
        if (fill) { fill.style.width = stress + '%'; fill.style.background = color; }
        if (label) { label.style.color = color; label.textContent = stress + '%'; }
      }
      return;
    }

    let html = '';
    for (const [bankId, bank] of banks) {
      const ownerUid = bank.ownerUid;
      const myVault = this._myVaults[bankId];
      const myDeposit = myVault ? (myVault.money || 0) : 0;
      const stress = bank.stressLevel || 0;
      const stressColor = this._stressColor(stress);
      const vaultCap = this._getVaultCap(bankId);
      const capStr = vaultCap === Infinity ? 'Unlimited' : App.formatMoney(vaultCap) + ' cap';
      const loanOwed = this._loansOwed[ownerUid];
      const displayName = bank.bankName || (bank.ownerName + "'s Bank");
      html += `<div class="bank-card" data-bank-uid="${bankId}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div class="bank-name">🏦 ${this._esc(displayName)}</div>
            <div style="font-size:11px;color:var(--text-dim)">${this._esc(bank.ownerName)} &bull; ${this._esc(bank.companyTicker || '')} &bull; ${capStr}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:13px;font-weight:700;color:var(--green)">${(bank.interestRate * 100).toFixed(1)}%/hr</div>
            <div style="font-size:11px;color:var(--text-dim)">${bank.depositorCount || 0} depositors</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-dim);margin:4px 0">Vault: ${App.formatMoney(bank.totalDeposited || 0)}</div>
        <div style="display:flex;align-items:center;gap:6px;margin:4px 0">
          <div style="font-size:11px;color:var(--text-dim);flex-shrink:0">Stress:</div>
          <div class="bank-stress-bar">
            <div class="bank-stress-fill" style="width:${stress}%;background:${stressColor}"></div>
          </div>
          <span class="bank-stress-label" style="font-size:11px;color:${stressColor};flex-shrink:0">${stress}%</span>
        </div>
        ${myDeposit > 0 ? `<div style="font-size:12px;color:var(--gold);margin:4px 0">My deposit: ${App.formatMoney(myDeposit)}</div>` : ''}
        ${bank.loanRate ? `<div style="font-size:11px;color:var(--text-dim);margin:2px 0">💸 Loan rate: <strong>${bank.loanRate}%/hr</strong></div>` : ''}
        ${loanOwed ? `<div style="font-size:11px;color:var(--red);margin:2px 0">⚠️ Loan owed: ${App.formatMoney(loanOwed.totalOwed || loanOwed.principal)}</div>` : ''}
        <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
          <button class="company-buy-btn" style="flex:1" onclick="Banking.openDepositModal('${bankId}')">Deposit</button>
          ${myDeposit > 0 ? `<button class="csr-toggle-btn" style="color:var(--red);border-color:var(--red)" onclick="Banking.withdraw('${bankId}', 'all')">Withdraw</button>` : ''}
          ${bank.loanRate && !loanOwed && ownerUid !== myUid ? `<button class="csr-toggle-btn" onclick="(function(){const a=prompt('Borrow how much? (max ${App.formatMoney(Math.min(500_000,(App.balance+App.totalEarned)*0.25))})');if(a){Banking.requestLoan('${bankId}',App.parseAmount(a))}})()">💸 Borrow</button>` : ''}
          ${loanOwed ? `<button class="csr-toggle-btn" style="color:var(--red);border-color:var(--red)" onclick="Banking.repayLoan('${ownerUid}')">Repay Loan</button>` : ''}
        </div>
      </div>`;
    }
    container.innerHTML = html;
  },

  // Called from companies.js for Finance company management panel
  renderBankSetup(companyIdx, forceShow = false) {
    const c = typeof Companies !== 'undefined' ? Companies._companies[companyIdx] : null;
    if (!c || (!forceShow && (c.industry || 'tech') !== 'finance')) return '';
    const rebirth = typeof App !== 'undefined' ? (App.rebirth || 0) : 0;

    if (rebirth < this.MIN_REBIRTH) {
      return `<div class="bank-setup-section">
        <h3>🏦 Banking</h3>
        <div style="font-size:12px;color:var(--text-dim)">🔒 Requires Rebirth ${this.MIN_REBIRTH} to enable banking.</div>
      </div>`;
    }

    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    // All banks linked to this company
    const myBanks = Object.entries(this._banks)
      .filter(([, b]) => b.ownerUid === myUid && b.companyTicker === c.ticker);

    let html = '<div class="bank-setup-section"><h3>🏦 Banking</h3>';

    // Render each existing bank management card
    for (const [bankId, bank] of myBanks) {
      html += this._renderBankManagementUI(bankId, bank, companyIdx);
    }

    // "Open New Bank" form — always shown (no limit per company)
    html += `<div style="border:1px solid var(--bg3);border-radius:8px;padding:10px;margin-top:${myBanks.length > 0 ? '10px' : '0'}">
      <div style="font-weight:700;font-size:13px;margin-bottom:8px">➕ Open New Bank — ${App.formatMoney(this.ENABLE_COST)}</div>
      <div class="admin-row" style="margin-bottom:6px">
        <label style="min-width:100px;font-size:12px">Bank name:</label>
        <input id="bank-name-${companyIdx}" placeholder="${this._esc(c.name)} Bank" style="flex:1;font-size:13px;padding:5px">
      </div>
      <div class="admin-row" style="margin-bottom:6px">
        <label style="min-width:100px;font-size:12px">Interest rate:</label>
        <input type="number" id="bank-rate-${companyIdx}" min="1" max="15" value="3" style="flex:1;font-size:13px;padding:5px">
        <span style="font-size:12px;color:var(--text-dim);margin-left:4px">%/hr</span>
      </div>
      <div class="admin-row" style="margin-bottom:6px">
        <label style="min-width:100px;font-size:12px">Loan rate:</label>
        <input type="number" id="bank-loanrate-${companyIdx}" min="1" max="20" value="5" style="flex:1;font-size:13px;padding:5px">
        <span style="font-size:12px;color:var(--text-dim);margin-left:4px">%/hr</span>
      </div>
      <div class="admin-row" style="margin-bottom:8px">
        <label style="min-width:100px;font-size:12px">Max deposit/player:</label>
        <input type="number" id="bank-maxdeposit-${companyIdx}" placeholder="0 = unlimited" style="flex:1;font-size:13px;padding:5px">
      </div>
      <button class="company-buy-btn" style="width:100%" onclick="Banking.enableBank(${companyIdx})">Open Bank</button>
    </div>`;

    html += '</div>';
    return html;
  },

  _renderBankManagementUI(bankId, bank, companyIdx) {
    const upgHtml = Object.entries(this.UPGRADES).map(([key, def]) => {
      const lvl = (bank.upgrades && bank.upgrades[key]) || 0;
      const maxed = lvl >= def.maxLevel;
      const nextCost = maxed ? 0 : def.costs[lvl];
      return `<div class="company-upgrade-row">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700">${def.name} <span class="upgrade-level-badge ${maxed ? 'upgrade-maxed' : ''}">Lv${lvl}/${def.maxLevel}</span></div>
        </div>
        <div style="flex-shrink:0;margin-left:8px">
          ${maxed ? '<span style="font-size:11px;color:var(--gold);font-weight:700">MAX</span>' : `<button class="csr-toggle-btn" style="font-size:11px" onclick="Banking.buyUpgrade('${key}', '${bankId}')">${App.formatMoney(nextCost)}</button>`}
        </div>
      </div>`;
    }).join('');

    const stressColor = bank.stressLevel >= 70 ? 'var(--red)' : bank.stressLevel >= 40 ? '#f39c12' : 'var(--green)';
    const vaultCap = this._getVaultCap(bankId);
    const safeId = bankId.replace(/[^a-zA-Z0-9_]/g, '_');

    return `<div style="border:1px solid var(--bg3);border-radius:8px;padding:10px;margin-bottom:8px">
      <div style="font-weight:700;font-size:14px;margin-bottom:6px">🏦 ${this._esc(bank.bankName || bank.ownerName + "'s Bank")}</div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px">
        <span>Rate: <strong style="color:var(--green)">${(bank.interestRate * 100).toFixed(1)}%/hr</strong></span>
        <span>Depositors: <strong>${bank.depositorCount || 0}</strong></span>
        <span>Total: <strong>${App.formatMoney(bank.totalDeposited || 0)}</strong></span>
      </div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:4px">Vault Cap: ${vaultCap === Infinity ? 'Unlimited' : App.formatMoney(vaultCap) + '/player'}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
        <span style="font-size:12px;color:var(--text-dim)">Stress:</span>
        <div class="bank-stress-bar" style="flex:1"><div class="bank-stress-fill" style="width:${bank.stressLevel || 0}%;background:${stressColor}"></div></div>
        <span style="font-size:12px;color:${stressColor};font-weight:700">${bank.stressLevel || 0}%</span>
      </div>
      <div style="margin-bottom:8px">
        <div style="font-weight:700;font-size:12px;margin-bottom:6px">Bank Upgrades</div>
        ${upgHtml}
      </div>
      <div class="admin-row" style="margin-bottom:6px">
        <label style="min-width:100px;font-size:12px">Interest rate:</label>
        <input type="number" id="bank-rate-set-${safeId}" min="1" max="15" value="${((bank.interestRate || 0.03) * 100).toFixed(1)}" style="flex:1;font-size:13px;padding:5px">
        <span style="font-size:12px;color:var(--text-dim);margin:0 4px">%/hr</span>
        <button class="csr-toggle-btn" style="font-size:11px" onclick="Banking.setInterestRate('${bankId}')">Set</button>
      </div>
      <div class="admin-row" style="margin-bottom:8px">
        <label style="min-width:100px;font-size:12px">Max deposit/player:</label>
        <input type="number" id="bank-maxdeposit-set-${safeId}" value="${bank.maxDeposit || 0}" style="flex:1;font-size:13px;padding:5px">
        <button class="csr-toggle-btn" style="font-size:11px" onclick="Banking.setMaxDeposit('${bankId}')">Set</button>
      </div>
      <button class="csr-toggle-btn" style="color:var(--red);border-color:var(--red);width:100%;margin-top:4px" onclick="Banking.closeBank('${bankId}')">⚠️ Close Bank</button>
    </div>`;
  },

  _esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  // My deposits view — used in companies browse
  renderMyDeposits() {
    const deposits = Object.entries(this._myVaults);
    if (deposits.length === 0) return '<div style="font-size:12px;color:var(--text-dim);padding:8px 0">No active deposits.</div>';
    let html = '';
    for (const [bankId, vault] of deposits) {
      const bank = this._banks[bankId];
      if (!bank) continue;
      const stressColor = bank.stressLevel >= 70 ? 'var(--red)' : bank.stressLevel >= 40 ? '#f39c12' : 'var(--green)';
      const displayName = bank.bankName || (bank.ownerName + "'s Bank");
      html += `<div class="bank-card" style="border-color:var(--gold)">
        <div style="font-weight:700">🏦 ${this._esc(displayName)}</div>
        <div style="font-size:12px;margin:4px 0">Cash: <strong style="color:var(--green)">${App.formatMoney(vault.money || 0)}</strong></div>
        ${Object.keys(vault.stocks || {}).length > 0 ? '<div style="font-size:11px;color:var(--text-dim)">Stocks: ' + Object.entries(vault.stocks).map(([s,q]) => s+' ×'+q).join(', ') + '</div>' : ''}
        ${Object.keys(vault.coins || {}).length > 0 ? '<div style="font-size:11px;color:var(--text-dim)">Coins: ' + Object.entries(vault.coins).map(([s,q]) => s+' '+Crypto.formatCoin(q)).join(', ') + '</div>' : ''}
        <div style="display:flex;align-items:center;gap:6px;margin:4px 0">
          <span style="font-size:11px;color:var(--text-dim)">Stress:</span>
          <div class="bank-stress-bar" style="flex:1"><div class="bank-stress-fill" style="width:${bank.stressLevel||0}%;background:${stressColor}"></div></div>
          <span style="font-size:11px;color:${stressColor}">${bank.stressLevel||0}%</span>
        </div>
        <button class="csr-toggle-btn" style="color:var(--red);border-color:var(--red);width:100%;margin-top:6px" onclick="Banking.withdraw('${bankId}', 'all')">Withdraw All</button>
      </div>`;
    }
    return html;
  },
};
