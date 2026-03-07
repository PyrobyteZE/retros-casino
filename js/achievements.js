// ===== Achievements & Weekly Tournament =====

const ACHIEVEMENT_DEFS = [
  // 🎰 GAMBLER
  { id: 'games_won', name: 'Lucky Streak', icon: '🎰', cat: 'gambler',
    tiers: [
      { label: 'Bronze', req: 10,   reward: 5_000,     desc: 'Win 10 casino games' },
      { label: 'Silver', req: 100,  reward: 50_000,    desc: 'Win 100 casino games' },
      { label: 'Gold',   req: 1000, reward: 500_000,   desc: 'Win 1,000 casino games' },
    ]
  },
  { id: 'crash_high', name: 'To The Moon', icon: '🚀', cat: 'gambler',
    tiers: [
      { label: 'Bronze', req: 5,  reward: 10_000,    desc: 'Cash out crash at 5×+' },
      { label: 'Silver', req: 10, reward: 100_000,   desc: 'Cash out crash at 10×+' },
      { label: 'Gold',   req: 50, reward: 1_000_000, desc: 'Cash out crash at 50×+' },
    ]
  },
  { id: 'big_bet', name: 'High Roller', icon: '💎', cat: 'gambler',
    tiers: [
      { label: 'Bronze', req: 100_000,       reward: 10_000,    desc: 'Place a single bet of $100K+' },
      { label: 'Silver', req: 10_000_000,    reward: 100_000,   desc: 'Place a single bet of $10M+' },
      { label: 'Gold',   req: 1_000_000_000, reward: 1_000_000, desc: 'Place a single bet of $1B+' },
    ]
  },
  // 🕵️ CRIMINAL
  { id: 'debt_paid', name: 'Debt Slayer', icon: '🦈', cat: 'criminal',
    tiers: [
      { label: 'Bronze', req: 1_000_000,         reward: 100_000,    desc: 'Pay off $1M in debt' },
      { label: 'Silver', req: 1_000_000_000,     reward: 1_000_000,  desc: 'Pay off $1B in debt' },
      { label: 'Gold',   req: 1_000_000_000_000, reward: 10_000_000, desc: 'Pay off $1T in debt' },
    ]
  },
  { id: 'crime_income', name: 'Crime Baron', icon: '🕵️', cat: 'criminal',
    tiers: [
      { label: 'Bronze', req: 1_000,     reward: 10_000,    desc: 'Earn $1K/s from crime' },
      { label: 'Silver', req: 100_000,   reward: 500_000,   desc: 'Earn $100K/s from crime' },
      { label: 'Gold',   req: 10_000_000,reward: 5_000_000, desc: 'Earn $10M/s from crime' },
    ]
  },
  // 🏭 TYCOON
  { id: 'total_earned', name: 'Money Bags', icon: '💰', cat: 'tycoon',
    tiers: [
      { label: 'Bronze', req: 1_000_000,         reward: 50_000,     desc: 'Earn $1M total' },
      { label: 'Silver', req: 1_000_000_000,     reward: 5_000_000,  desc: 'Earn $1B total' },
      { label: 'Gold',   req: 1_000_000_000_000, reward: 50_000_000, desc: 'Earn $1T total' },
    ]
  },
  { id: 'rebirth', name: 'Reborn', icon: '⭐', cat: 'tycoon',
    tiers: [
      { label: 'Bronze', req: 1,  reward: 100_000,    desc: 'Rebirth once' },
      { label: 'Silver', req: 10, reward: 1_000_000,  desc: 'Rebirth 10 times' },
      { label: 'Gold',   req: 50, reward: 10_000_000, desc: 'Rebirth 50 times' },
    ]
  },
  { id: 'companies', name: 'Mogul', icon: '🏭', cat: 'tycoon',
    tiers: [
      { label: 'Bronze', req: 1, reward: 50_000,  desc: 'Found a company' },
      { label: 'Silver', req: 2, reward: 200_000, desc: 'Own 2 companies' },
      { label: 'Gold',   req: 3, reward: 500_000, desc: 'Own 3 companies' },
    ]
  },
  { id: 'clicks', name: 'Clicker', icon: '👆', cat: 'tycoon',
    tiers: [
      { label: 'Bronze', req: 1_000,     reward: 5_000,   desc: 'Click 1,000 times' },
      { label: 'Silver', req: 50_000,    reward: 50_000,  desc: 'Click 50,000 times' },
      { label: 'Gold',   req: 1_000_000, reward: 500_000, desc: 'Click 1,000,000 times' },
    ]
  },
  // 👥 SOCIAL
  { id: 'friends', name: 'Social Butterfly', icon: '👥', cat: 'social',
    tiers: [
      { label: 'Bronze', req: 1,  reward: 10_000,  desc: 'Add your first friend' },
      { label: 'Silver', req: 5,  reward: 50_000,  desc: 'Have 5 friends' },
      { label: 'Gold',   req: 10, reward: 200_000, desc: 'Have 10 friends' },
    ]
  },
  { id: 'chat_msgs', name: 'Chatterbox', icon: '💬', cat: 'social',
    tiers: [
      { label: 'Bronze', req: 10,   reward: 5_000,   desc: 'Send 10 chat messages' },
      { label: 'Silver', req: 100,  reward: 25_000,  desc: 'Send 100 chat messages' },
      { label: 'Gold',   req: 1000, reward: 100_000, desc: 'Send 1,000 chat messages' },
    ]
  },
  { id: 'gifts_sent', name: 'Generous', icon: '🎁', cat: 'social',
    tiers: [
      { label: 'Bronze', req: 1,  reward: 10_000,  desc: 'Send a gift' },
      { label: 'Silver', req: 10, reward: 50_000,  desc: 'Send 10 gifts' },
      { label: 'Gold',   req: 50, reward: 200_000, desc: 'Send 50 gifts' },
    ]
  },
];

const Achievements = {
  // Extra stats tracked by this module (beyond what App already has)
  _stats: {
    crashHighest: 0,
    biggestBet:   0,
    chatMsgs:     0,
    giftsSent:    0,
    friendCount:  0,
  },

  // Highest tier unlocked per achievement (-1 = none)
  _progress: {},

  _activeCat: 'all',

  // ── Save / Load ──────────────────────────────────────────────────────────────
  getSaveData() {
    return {
      stats:    this._stats,
      progress: this._progress,
    };
  },

  loadSaveData(d) {
    if (!d) return;
    if (d.stats)    this._stats    = { ...this._stats, ...d.stats };
    if (d.progress) this._progress = d.progress;
  },

  // ── Tracking hooks (called by other modules) ─────────────────────────────────
  trackCrash(mult) {
    if (mult > (this._stats.crashHighest || 0)) {
      this._stats.crashHighest = mult;
      this._evaluate();
    }
  },

  trackBet(amount) {
    if (amount > (this._stats.biggestBet || 0)) {
      this._stats.biggestBet = amount;
      this._evaluate();
    }
  },

  trackChatMsg() {
    this._stats.chatMsgs = (this._stats.chatMsgs || 0) + 1;
    this._evaluate();
  },

  trackGift() {
    this._stats.giftsSent = (this._stats.giftsSent || 0) + 1;
    this._evaluate();
  },

  trackFriends(count) {
    this._stats.friendCount = count;
    this._evaluate();
  },

  // Called after any stat-changing event (rebirth, win, etc.)
  checkAll() {
    this._evaluate();
  },

  // ── Core evaluation ──────────────────────────────────────────────────────────
  _evaluate() {
    const vals = {
      games_won:    (App.stats && App.stats.gamesWon) || 0,
      crash_high:   this._stats.crashHighest || 0,
      big_bet:      this._stats.biggestBet || 0,
      debt_paid:    (typeof Loans !== 'undefined' ? (Loans._totalPaid || 0) : 0),
      crime_income: (typeof Crime !== 'undefined' ? Crime.getTotalIncome() : 0),
      total_earned: App.totalEarned || 0,
      rebirth:      App.rebirth || 0,
      companies:    (typeof Companies !== 'undefined' ? (Companies._companies || []).length : 0),
      clicks:       App.totalClicks || 0,
      friends:      this._stats.friendCount || 0,
      chat_msgs:    this._stats.chatMsgs || 0,
      gifts_sent:   this._stats.giftsSent || 0,
    };

    let anyNew = false;
    for (const def of ACHIEVEMENT_DEFS) {
      const val = vals[def.id] || 0;
      const prev = this._progress[def.id] !== undefined ? this._progress[def.id] : -1;
      let highest = -1;
      for (let i = 0; i < def.tiers.length; i++) {
        if (val >= def.tiers[i].req) highest = i;
        else break;
      }
      if (highest > prev) {
        this._progress[def.id] = highest;
        for (let i = prev + 1; i <= highest; i++) {
          this._award(def, i);
          anyNew = true;
        }
      }
    }
    if (anyNew) App.save();
  },

  _award(def, tierIdx) {
    const tier = def.tiers[tierIdx];
    App.addBalance(tier.reward);
    Toast.show(
      `🏆 Achievement: ${def.icon} ${def.name} — ${tier.label}!  +${App.formatMoney(tier.reward)}`,
      '#ffd740', 5000
    );
    // Push to leaderboard so badge count updates
    if (typeof Firebase !== 'undefined') setTimeout(() => Firebase.pushLeaderboard(), 1000);
  },

  getUnlockedCount() {
    let n = 0;
    for (const def of ACHIEVEMENT_DEFS) {
      if ((this._progress[def.id] || -1) >= 0) n++;
    }
    return n;
  },

  getTotalTiers() {
    return ACHIEVEMENT_DEFS.reduce((s, d) => s + d.tiers.length, 0);
  },

  getUnlockedTiers() {
    let n = 0;
    for (const def of ACHIEVEMENT_DEFS) {
      n += Math.max(0, (this._progress[def.id] !== undefined ? this._progress[def.id] : -1) + 1);
    }
    return n;
  },

  // ── Render ───────────────────────────────────────────────────────────────────
  render() {
    const el = document.getElementById('achievements-content');
    if (!el) return;

    const vals = {
      games_won:    (App.stats && App.stats.gamesWon) || 0,
      crash_high:   this._stats.crashHighest || 0,
      big_bet:      this._stats.biggestBet || 0,
      debt_paid:    (typeof Loans !== 'undefined' ? (Loans._totalPaid || 0) : 0),
      crime_income: (typeof Crime !== 'undefined' ? Crime.getTotalIncome() : 0),
      total_earned: App.totalEarned || 0,
      rebirth:      App.rebirth || 0,
      companies:    (typeof Companies !== 'undefined' ? (Companies._companies || []).length : 0),
      clicks:       App.totalClicks || 0,
      friends:      this._stats.friendCount || 0,
      chat_msgs:    this._stats.chatMsgs || 0,
      gifts_sent:   this._stats.giftsSent || 0,
    };

    const unlocked = this.getUnlockedTiers();
    const total    = this.getTotalTiers();

    const cats = [
      { id: 'all',      label: 'All' },
      { id: 'gambler',  label: '🎰 Gambler' },
      { id: 'criminal', label: '🕵️ Criminal' },
      { id: 'tycoon',   label: '🏭 Tycoon' },
      { id: 'social',   label: '👥 Social' },
    ];

    const activeCat = this._activeCat || 'all';
    const shown = ACHIEVEMENT_DEFS.filter(d => activeCat === 'all' || d.cat === activeCat);

    const fmtVal = (id, val) => {
      const moneyIds = ['debt_paid','crime_income','total_earned','big_bet'];
      if (moneyIds.includes(id)) return App.formatMoney(val);
      if (id === 'crash_high') return val.toFixed(2) + '×';
      return Math.floor(val).toLocaleString();
    };

    const fmtReq = (id, req) => {
      const moneyIds = ['debt_paid','crime_income','total_earned','big_bet'];
      if (moneyIds.includes(id)) return App.formatMoney(req);
      if (id === 'crash_high') return req + '×';
      return req.toLocaleString();
    };

    el.innerHTML = `
      <div class="ach-header">
        <div class="ach-title-row">
          <span class="ach-title">🏆 Achievements</span>
          <span class="ach-count">${unlocked} / ${total} tiers</span>
        </div>
        <div class="ach-bar-outer"><div class="ach-bar-fill" style="width:${Math.round(unlocked/total*100)}%"></div></div>
      </div>
      <div class="ach-cat-tabs">
        ${cats.map(c => `<button class="ach-cat-btn${activeCat===c.id?' active':''}" onclick="Achievements._setcat('${c.id}')">${c.label}</button>`).join('')}
      </div>
      <div class="ach-list">
        ${shown.map(def => {
          const val = vals[def.id] || 0;
          const prog = this._progress[def.id] !== undefined ? this._progress[def.id] : -1;
          const nextTierIdx = prog + 1;
          const nextTier = def.tiers[nextTierIdx];
          const maxed = prog >= def.tiers.length - 1;
          const pct = nextTier ? Math.min(100, (val / nextTier.req) * 100) : 100;
          return `<div class="ach-card${prog >= 0 ? ' ach-unlocked' : ''}">
            <div class="ach-icon-col">
              <span class="ach-icon">${def.icon}</span>
              <span class="ach-tiers-row">
                ${def.tiers.map((t, i) => `<span class="ach-dot${i <= prog ? ' done' : ''}" title="${t.label}"></span>`).join('')}
              </span>
            </div>
            <div class="ach-body">
              <div class="ach-name">${def.name}</div>
              ${maxed
                ? `<div class="ach-maxed">✨ All tiers complete!</div>`
                : nextTier
                  ? `<div class="ach-next-desc">${nextTier.desc}</div>
                     <div class="ach-prog-bar"><div class="ach-prog-fill" style="width:${pct}%"></div></div>
                     <div class="ach-prog-label">${fmtVal(def.id, val)} / ${fmtReq(def.id, nextTier.req)} &nbsp;·&nbsp; ${nextTier.label} · +${App.formatMoney(nextTier.reward)}</div>`
                  : ''
              }
            </div>
          </div>`;
        }).join('')}
      </div>
      <div id="tourney-section"></div>
    `;

    Tournaments.renderInto(document.getElementById('tourney-section'));
  },

  _setcat(cat) {
    this._activeCat = cat;
    this.render();
  },
};

// ===== Weekly Tournament =====
const Tournaments = {
  _entry: { weekId: -1, earned: 0, wins: 0 },
  _lb: [],
  _lbListener: null,

  _weekId() {
    // Count Mondays since epoch (UTC)
    const now = Date.now();
    const day = new Date(now).getUTCDay(); // 0=Sun
    const msSinceMon = ((day + 6) % 7) * 86400000 + (now % 86400000);
    return Math.floor((now - msSinceMon) / (7 * 86400000));
  },

  _reset() {
    const wid = this._weekId();
    if (this._entry.weekId !== wid) {
      this._entry = { weekId: wid, earned: 0, wins: 0 };
      this._lb = [];
    }
  },

  trackEarned(amount) {
    if (amount <= 0) return;
    this._reset();
    this._entry.earned += amount;
  },

  trackWin() {
    this._reset();
    this._entry.wins++;
  },

  push() {
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) return;
    this._reset();
    const name = typeof Settings !== 'undefined' ? Settings.profile.name : 'Player';
    if (!name || name === 'Player') return;
    Firebase.db.ref('weeklyTournament/' + this._entry.weekId + '/entries/' + Firebase.uid).set({
      name,
      earned: this._entry.earned,
      wins:   this._entry.wins,
      updatedAt: Date.now(),
    }).catch(() => {});
  },

  listen() {
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) return;
    this._reset();
    const wid = this._entry.weekId;
    if (this._lbListener) this._lbListener.off();
    const ref = Firebase.db.ref('weeklyTournament/' + wid + '/entries')
      .orderByChild('earned').limitToLast(20);
    ref.on('value', snap => {
      const data = snap.val() || {};
      this._lb = Object.values(data).sort((a, b) => (b.earned || 0) - (a.earned || 0));
      if (App.currentScreen === 'achievements') {
        const el = document.getElementById('tourney-section');
        if (el) this.renderInto(el);
      }
    });
    this._lbListener = ref;
  },

  getSaveData() { return this._entry; },
  loadSaveData(d) {
    if (d && d.weekId !== undefined) {
      this._entry = d;
      this._reset(); // will clear if week changed
    }
  },

  _timeLeft() {
    const now = Date.now();
    const day = new Date(now).getUTCDay();
    const dUntilMon = (8 - day) % 7 || 7;
    const next = new Date(now);
    next.setUTCDate(next.getUTCDate() + dUntilMon);
    next.setUTCHours(0, 0, 0, 0);
    const ms = next.getTime() - now;
    const d2 = Math.floor(ms / 86400000);
    const h  = Math.floor((ms % 86400000) / 3600000);
    const m  = Math.floor((ms % 3600000) / 60000);
    if (d2 > 0) return d2 + 'd ' + h + 'h';
    if (h > 0)  return h + 'h ' + m + 'm';
    return m + 'm';
  },

  renderInto(el) {
    if (!el) return;
    this._reset();
    const myName = typeof Settings !== 'undefined' ? Settings.profile.name : '';
    const myRank = this._lb.findIndex(e => e.name === myName) + 1;

    const medals = ['🥇','🥈','🥉'];
    const rows = this._lb.slice(0, 10).map((e, i) => {
      const isMine = e.name === myName;
      return `<div class="tourney-row${isMine ? ' mine' : ''}">
        <span class="tourney-rank">${medals[i] || ('#' + (i+1))}</span>
        <span class="tourney-name">${e.name || 'Player'}</span>
        <span class="tourney-score">${App.formatMoney(e.earned || 0)}</span>
        <span class="tourney-wins">${(e.wins || 0)}W</span>
      </div>`;
    }).join('') || '<div class="tourney-empty">No entries yet — start playing to appear!</div>';

    el.innerHTML = `
      <div class="tourney-wrap">
        <div class="tourney-header">
          <span>🏅 Weekly Tournament</span>
          <span class="tourney-reset">Resets in ${this._timeLeft()}</span>
        </div>
        <div class="tourney-mystats">
          This week: <strong>${App.formatMoney(this._entry.earned)}</strong> earned &nbsp;·&nbsp;
          <strong>${this._entry.wins}</strong> wins
          ${myRank > 0 ? `&nbsp;·&nbsp; Rank <strong>#${myRank}</strong>` : ''}
        </div>
        <div class="tourney-lb">${rows}</div>
      </div>
    `;
  },
};
