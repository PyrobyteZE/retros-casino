// World Events — server-wide events that affect all players
const Events = {
  _currentEvent: null,   // { type, startedAt, duration, authorUid }
  _isAuthority: false,
  _authorityInterval: null,
  _applyInterval: null,
  _renderInterval: null,
  _lastNotifiedEvent: null,
  _listenersInited: false,

  EVENT_TYPES: [
    {
      id: 'boom', label: '📈 Market Boom', color: '#00e676',
      duration: 8 * 60_000,
      desc: 'Global economy surging! All income +50%, stocks trending up.',
      effects: { incomeMult: 0.5, stockBias: 0.015 },
    },
    {
      id: 'crash', label: '📉 Market Crash', color: '#f44336',
      duration: 6 * 60_000,
      desc: 'Markets in freefall. Income cut 30%, stocks dropping.',
      effects: { incomeMult: -0.3, stockBias: -0.02 },
    },
    {
      id: 'crime_wave', label: '🕵️ Crime Wave', color: '#9c27b0',
      duration: 10 * 60_000,
      desc: 'Crime is rampant! Crime income ×2.5.',
      effects: { crimeBonus: 1.5 },
    },
    {
      id: 'festival', label: '🎉 City Festival', color: '#ffd740',
      duration: 10 * 60_000,
      desc: 'The city celebrates! Casino winnings boosted, click income ×2.',
      effects: { casinoBonus: 0.5, clickMult: 1.0 },
    },
    {
      id: 'tax_audit', label: '🏛️ Tax Audit', color: '#ff9800',
      duration: 5 * 60_000,
      desc: 'Government crackdown! All passive income cut 25%.',
      effects: { incomeMult: -0.25 },
    },
    {
      id: 'space_race', label: '🚀 Space Race', color: '#448aff',
      duration: 12 * 60_000,
      desc: 'Nations compete in space! Space stocks soaring +5%/tick.',
      effects: { spaceBias: 0.05 },
    },
    {
      id: 'energy_crisis', label: '⛽ Energy Crisis', color: '#ff5722',
      duration: 8 * 60_000,
      desc: 'Oil shortage! Energy stocks +4%/tick, all income -15%.',
      effects: { energyBias: 0.04, incomeMult: -0.15 },
    },
    {
      id: 'tech_bubble', label: '💻 Tech Bubble', color: '#00bcd4',
      duration: 7 * 60_000,
      desc: 'Tech stocks soaring! PIXEL up +4%/tick. Buy/sell wisely.',
      effects: { techBias: 0.04 },
    },
    {
      id: 'gold_rush', label: '🏅 Gold Rush', color: '#ffc400',
      duration: 9 * 60_000,
      desc: 'Treasure found! Click income ×5.',
      effects: { clickMult: 4.0 },
    },
    {
      id: 'blackout', label: '⚡ Power Blackout', color: '#607d8b',
      duration: 6 * 60_000,
      desc: 'Grid failure! Crypto cut 50%, crime thrives (+1.5×).',
      effects: { crimeBonus: 0.5, cryptoMult: -0.5 },
    },
    {
      id: 'lucky_streak', label: '🍀 Lucky Streak', color: '#4caf50',
      duration: 8 * 60_000,
      desc: 'Fortune smiles! All casino payouts +25%.',
      effects: { casinoBonus: 0.25 },
    },
    {
      id: 'heist_alert', label: '🚨 Heist Alert', color: '#e91e63',
      duration: 7 * 60_000,
      desc: 'Major heist reported! Crime income ×2, but raids +50% more frequent.',
      effects: { crimeBonus: 1.0, raidFreqMult: 1.5 },
    },
    {
      id: 'project_mayhem', label: '🧼 PROJECT MAYHEM', color: '#ff4400',
      duration: 15 * 60_000,
      adminOnly: true,
      desc: 'The first rule of Project Mayhem: you do not ask questions. All bank vaults zeroed. All NPC debt wiped. News hijacked by followers.',
      effects: { projectMayhem: true, crimeBonus: 2.0, incomeMult: -0.5 },
    },
  ],

  // === Init ===
  init() {
    if (this._listenersInited) return;
    this._listenersInited = true;

    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.listenWorldEvent(event => {
        const wasEvent = !!this._currentEvent;
        this._currentEvent = event;
        this._renderBanner();
        if (event && (!wasEvent || this._lastNotifiedEvent !== event.startedAt)) {
          this._lastNotifiedEvent = event.startedAt;
          const type = this.EVENT_TYPES.find(t => t.id === event.type);
          if (type) Toast.show(type.label + ' started!', type.color, 5000);
          if (event.type === 'project_mayhem') this._applyProjectMayhem();
        }
        if (!event && wasEvent) {
          Toast.show('World Event ended.', '#aaa', 3000);
        }
      });
    }

    // Render banner every 15s to update countdown
    this._renderInterval = setInterval(() => this._renderBanner(), 15000);

    // Claim authority and generate events
    this._authorityInterval = setInterval(() => this._tryClaimAuthority(), 30000);
    this._tryClaimAuthority();

    // Apply continuous effects (stock nudges) every 10s
    this._applyInterval = setInterval(() => this._applyTickEffects(), 10000);
  },

  // === Authority ===
  _tryClaimAuthority() {
    if (!Firebase.isOnline()) return;
    Firebase.db.ref('eventAuthority').transaction(current => {
      const now = Date.now();
      if (!current || now - current.ts > 35000) {
        return { uid: Firebase.uid, session: Firebase._sessionId, ts: now };
      }
      return undefined; // someone else owns it — abort
    }).then(result => {
      if (result.committed && result.snapshot.val()?.session === Firebase._sessionId) {
        if (!this._isAuthority) {
          this._isAuthority = true;
          this._scheduleNextEvent();
          console.log('Events: claimed authority');
        }
      } else {
        this._isAuthority = false;
      }
    }).catch(() => {});
  },

  _scheduleNextEvent() {
    // Events every 10-20 minutes
    const delay = (10 + Math.random() * 10) * 60_000;
    setTimeout(() => {
      if (!this._isAuthority) return;
      this._generateEvent();
      this._scheduleNextEvent();
    }, delay);
  },

  _generateEvent() {
    const pool = this.EVENT_TYPES.filter(t => !t.adminOnly);
    const type = pool[Math.floor(Math.random() * pool.length)];
    const startedAt = Date.now();
    Firebase.pushWorldEvent({
      type: type.id,
      startedAt,
      duration: type.duration,
      authorUid: Firebase.uid,
    });
    // Auto-clear after duration — skip if an admin has force-overridden
    setTimeout(() => {
      if (!this._isAuthority) return;
      const cur = this._currentEvent;
      if (cur && cur.type === type.id && cur.startedAt === startedAt && !cur.adminForced) {
        Firebase.clearWorldEvent();
      }
    }, type.duration + 5000);
  },

  isProjectMayhem() {
    const fx = this.getActiveEffect();
    return !!fx.projectMayhem;
  },

  // Called when Project Mayhem event starts on this client
  _applyProjectMayhem() {
    // Wipe NPC loan debt
    if (typeof Loans !== 'undefined' && Loans.debt > 0) {
      Loans.debt = 0;
      Loans.loanTime = 0;
      Loans.stopInterest();
      Loans.updateUI();
      Loans.updateDebtDisplay();
      Loans._pushDebt();
      App.save();
      Toast.show('🧼 Your NPC debt has been wiped — Project Mayhem!', '#ff4400', 8000);
    }
    // Push Fight Club news posts from "followers"
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      const posts = [
        "The things you own end up owning you.",
        "It's only after we've lost everything that we're free to do anything.",
        "You are not your balance. You are not how much money you have in the bank.",
        "We buy things we don't need with money we don't have to impress people we don't like.",
        "This is your life and it's ending one tick at a time.",
        "Sticking feathers up your butt does not make you a chicken.",
        "On a long enough timeline, the survival rate for everyone drops to zero.",
        "First rule of Project Mayhem: you do not ask questions.",
        "Second rule of Project Mayhem: you DO NOT ask questions.",
        "The liberator who destroys my property is fighting for my freedom.",
      ];
      const post = posts[Math.floor(Math.random() * posts.length)];
      Firebase.pushStockNews('🧼 ' + post, false);
      setTimeout(() => {
        const post2 = posts[Math.floor(Math.random() * posts.length)];
        Firebase.pushStockNews('🧼 SPACE MONKEY: ' + post2, false);
      }, 30000);
      setTimeout(() => {
        Firebase.pushStockNews('🧼 MAYHEM REPORT: Banks have been destabilized. SHARK is the only winner tonight.', true);
      }, 90000);
    }
  },

  // === Effect Accessors ===
  getActiveEffect() {
    if (!this._currentEvent) return {};
    const ev = this._currentEvent;
    if (Date.now() > ev.startedAt + ev.duration) return {};
    const type = this.EVENT_TYPES.find(t => t.id === ev.type);
    return type ? type.effects : {};
  },

  getIncomeMultiplier() {
    const fx = this.getActiveEffect();
    return 1 + (fx.incomeMult || 0);
  },

  getCrimeMultiplier() {
    const fx = this.getActiveEffect();
    return 1 + (fx.crimeBonus || 0);
  },

  getClickMultiplier() {
    const fx = this.getActiveEffect();
    return 1 + (fx.clickMult || 0);
  },

  getCasinoMultiplier() {
    const fx = this.getActiveEffect();
    const vipBonus = typeof Clicker !== 'undefined' ? Clicker.getVipBonus('casinoMult') : 0;
    return 1 + (fx.casinoBonus || 0) + vipBonus;
  },

  getCryptoMultiplier() {
    const fx = this.getActiveEffect();
    return 1 + (fx.cryptoMult || 0);
  },

  getRaidFreqMultiplier() {
    const fx = this.getActiveEffect();
    return 1 + (fx.raidFreqMult || 0);
  },

  // Returns a short one-line summary of active event (or '')
  getActiveSummary() {
    if (!this._currentEvent) return '';
    const ev = this._currentEvent;
    const remaining = Math.max(0, ev.startedAt + ev.duration - Date.now());
    if (remaining === 0) return '';
    const type = this.EVENT_TYPES.find(t => t.id === ev.type);
    if (!type) return '';
    const mins = Math.ceil(remaining / 60000);
    return `${type.label} (${mins}m)`;
  },

  // === Stock nudges (authority only, every 10s) ===
  _applyTickEffects() {
    const fx = this.getActiveEffect();
    if (Object.keys(fx).length === 0) return;
    if (!Firebase._isStockAuthority) return;
    if (typeof Stocks === 'undefined') return;

    const nudge = (stock, pct) => {
      stock.price = Math.max(0.01, stock.price * (1 + pct * (0.5 + Math.random() * 0.5)));
    };

    const allStocks = typeof Stocks !== 'undefined' ? Stocks.stocks : [];
    if (fx.stockBias) {
      allStocks.forEach((s, i) => {
        const obj = { price: Stocks.prices[i] };
        nudge(obj, fx.stockBias);
        Stocks.prices[i] = obj.price;
      });
    }
    if (fx.spaceBias) {
      const i = allStocks.findIndex(s => s.symbol === 'LUNA');
      if (i >= 0) { const obj = { price: Stocks.prices[i] }; nudge(obj, fx.spaceBias); Stocks.prices[i] = obj.price; }
    }
    if (fx.energyBias) {
      const i = allStocks.findIndex(s => s.symbol === 'NEON');
      if (i >= 0) { const obj = { price: Stocks.prices[i] }; nudge(obj, fx.energyBias); Stocks.prices[i] = obj.price; }
    }
    if (fx.techBias) {
      const i = allStocks.findIndex(s => s.symbol === 'PIXEL');
      if (i >= 0) { const obj = { price: Stocks.prices[i] }; nudge(obj, fx.techBias); Stocks.prices[i] = obj.price; }
    }
    if (fx.projectMayhem) {
      // Project Mayhem: SHARK moons, all other stocks crater
      allStocks.forEach((s, i) => {
        const obj = { price: Stocks.prices[i] };
        nudge(obj, s.symbol === 'SHARK' ? 0.08 : -0.03);
        Stocks.prices[i] = obj.price;
      });
    }
  },

  // === Banner Rendering ===
  _renderBanner() {
    const ev = this._currentEvent;
    let banner = document.getElementById('world-event-banner');

    if (!ev || Date.now() > ev.startedAt + ev.duration) {
      if (banner) banner.remove();
      return;
    }

    const type = this.EVENT_TYPES.find(t => t.id === ev.type);
    if (!type) { if (banner) banner.remove(); return; }

    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'world-event-banner';
      banner.className = 'world-event-banner';
      // Insert after stock ticker
      const ticker = document.getElementById('stock-ticker');
      if (ticker && ticker.parentNode) {
        ticker.parentNode.insertBefore(banner, ticker.nextSibling);
      } else {
        const topBar = document.getElementById('top-bar');
        if (topBar && topBar.parentNode) topBar.parentNode.insertBefore(banner, topBar.nextSibling);
      }
    }

    const remaining = Math.max(0, Math.ceil((ev.startedAt + ev.duration - Date.now()) / 60000));
    const adminBadge = ev.adminForced ? '<span class="event-admin-badge">ADMIN</span>' : '';
    banner.style.background = type.color + '22';
    banner.style.borderColor = type.color;
    banner.innerHTML = `
      <span class="event-label">${type.label}</span>
      ${adminBadge}
      <span class="event-desc">${type.desc}</span>
      <span class="event-timer">${remaining}m left</span>`;
  },

  // === Admin: Force a specific event (bypasses authority, pushes directly to Firebase) ===
  adminTriggerEvent(typeId, durationMins) {
    if (!Firebase.isOnline()) { alert('Not connected to Firebase.'); return; }
    const type = this.EVENT_TYPES.find(t => t.id === typeId);
    if (!type) return;
    const duration = durationMins ? durationMins * 60_000 : type.duration;
    Firebase.pushWorldEvent({
      type: type.id,
      startedAt: Date.now(),
      duration,
      authorUid: Firebase.uid,
      adminForced: true,
    });
  },

  adminClearEvent() {
    if (!Firebase.isOnline()) { alert('Not connected to Firebase.'); return; }
    Firebase.clearWorldEvent();
  },

  // Get a short description of the current active event for admin display
  getAdminStatus() {
    if (!this._currentEvent) return 'None';
    const ev = this._currentEvent;
    const remaining = Math.max(0, Math.ceil((ev.startedAt + ev.duration - Date.now()) / 60000));
    if (remaining === 0) return 'None (expired)';
    const type = this.EVENT_TYPES.find(t => t.id === ev.type);
    const forced = ev.adminForced ? ' [ADMIN]' : '';
    return `${type ? type.label : ev.type}${forced} — ${remaining}m left`;
  },
};
