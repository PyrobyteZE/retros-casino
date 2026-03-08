// ===== Seasonal Events =====
const Seasonal = {

  SEASONS: {
    halloween: {
      id: 'halloween',
      name: '🎃 Halloween',
      color: '#ff6d00',
      bodyClass: 'season-halloween',
      crimeMultiplier: 2.0,
      desc: 'Crime pays 2× but haunted. Ghost Heist exclusive cards.',
      seasonalCards: [
        { name: 'Ghost Heist',    art: '👻', flavor: 'The dead make excellent getaway drivers.' },
        { name: 'Pumpkin King',   art: '🎃', flavor: 'He carved a path through the market.' },
        { name: 'Haunted Vault',  art: '🏚️', flavor: 'The interest accrues even after death.' },
        { name: 'Shadow Bat',     art: '🦇', flavor: 'Flies by night. Profits by dawn.' },
        { name: 'Skeleton Key',   art: '💀', flavor: 'Opens every door, including the one you shouldn\'t.' },
      ],
    },
    christmas: {
      id: 'christmas',
      name: '🎄 Christmas',
      color: '#00c853',
      bodyClass: 'season-christmas',
      giftDropMs: 3_600_000,    // gift every 1 hour
      giftPct: 0.005,           // 0.5% of balance
      desc: 'Santa drops random cash every hour. Exchange gifts with friends.',
      seasonalCards: [
        { name: "Santa's Sack",   art: '🎅', flavor: 'Infinite capacity. Zero taxes declared.' },
        { name: 'Winter Miracle', art: '❄️', flavor: 'Sometimes the market just goes up for no reason.' },
        { name: 'Gift Giver',     art: '🎁', flavor: 'Generosity is a strategy.' },
        { name: 'Candy Cane',     art: '🍬', flavor: 'Sweet outside. Ruthless inside.' },
        { name: 'North Star',     art: '⭐', flavor: 'Always points toward profit.' },
      ],
    },
    newyear: {
      id: 'newyear',
      name: '🎆 New Year',
      color: '#ffd740',
      bodyClass: 'season-newyear',
      slotsJackpotMult: 2.0,    // doubles slots jackpot for duration
      desc: 'Slots jackpot doubled! Year-end earnings bonus.',
      seasonalCards: [
        { name: 'Midnight Strike', art: '🕛', flavor: 'The moment everything resets. Except debt.' },
        { name: 'Fireworks King',  art: '🎆', flavor: 'Spectacle is a valid business model.' },
        { name: 'Champagne Rain',  art: '🥂', flavor: 'Celebrate early. Celebrate often.' },
        { name: 'Auld Lang Syne',  art: '🎊', flavor: 'For old time\'s sake — just one more bet.' },
        { name: 'Fresh Start',     art: '🌅', flavor: 'New year. Same casino. Different excuses.' },
      ],
    },
    summer: {
      id: 'summer',
      name: '☀️ Summer',
      color: '#ff9800',
      bodyClass: 'season-summer',
      rouletteBeach: true,
      desc: 'Beach vibes. Roulette goes surfside. Exclusive summer cards.',
      seasonalCards: [
        { name: 'Beach Bum',    art: '🏖️', flavor: 'Technically still working. Technically.' },
        { name: 'Tidal Wave',   art: '🌊', flavor: 'Market crashes hit different at the beach.' },
        { name: 'Sunburn City', art: '☀️', flavor: 'High exposure. High returns.' },
        { name: 'Surf God',     art: '🏄', flavor: 'Ride every wave. Bail on none.' },
        { name: 'Coco Wealth',  art: '🥥', flavor: 'Portfolio diversified into coconuts.' },
      ],
    },
  },

  _active: null,       // season id or null
  _seasonData: null,   // full Firebase record { id, name, startAt, endAt }
  _myEarned: 0,        // earnings tracked this season
  _leaderboard: {},    // { [uid]: { name, earned, avatar } }
  _giftTimer: null,
  _lbPushTimer: null,
  _initialized: false,
  _seasonalPackCooldown: 0,

  get _db() { return typeof Firebase !== 'undefined' && Firebase.isOnline() ? Firebase.db : null; },
  get _uid() { return typeof Firebase !== 'undefined' ? Firebase.uid : null; },
  get _name() { return typeof Settings !== 'undefined' ? Settings.profile.name : 'Player'; },
  get _avatar() { return typeof Settings !== 'undefined' ? Settings.avatars[Settings.profile.avatar] : ''; },

  init() {
    const el = document.getElementById('seasonal-content');
    if (!el) return;
    if (!this._initialized) {
      this._startListeners();
      this._initialized = true;
    } else {
      this._render();
    }
  },

  _startListeners() {
    if (!this._db) { this._render(); return; }

    // Listen to the active world season
    this._db.ref('worldSeason').on('value', snap => {
      const prev = this._active;
      const data = snap.val();
      if (data && data.active && data.endAt > Date.now()) {
        this._active = data.id;
        this._seasonData = data;
      } else {
        this._active = null;
        this._seasonData = null;
      }
      if (prev !== this._active) {
        this._applyEffects();
      }
      // Subscribe to leaderboard for this season
      if (this._active) {
        this._db.ref('seasonLeaderboard/' + this._active).orderByChild('earned').limitToLast(20).on('value', lbSnap => {
          this._leaderboard = lbSnap.val() || {};
          if (App.currentScreen === 'seasonal') this._render();
        });
      }
      this._render();
    });
  },

  _applyEffects() {
    // Remove all season body classes
    ['season-halloween','season-christmas','season-newyear','season-summer'].forEach(c => document.body.classList.remove(c));
    clearInterval(this._giftTimer);
    this._giftTimer = null;

    if (!this._active) return;
    const season = this.SEASONS[this._active];
    if (!season) return;

    document.body.classList.add(season.bodyClass);

    // Christmas gift drops
    if (season.giftDropMs) {
      this._giftTimer = setInterval(() => {
        const bonus = Math.max(1000, Math.floor(App.balance * (season.giftPct || 0.005)));
        App.addBalance(bonus);
        App.save();
        Toast.show('🎅 Santa dropped a gift! +' + App.formatMoney(bonus), season.color, 6000);
      }, season.giftDropMs);
    }

    // Announce season start
    Toast.show(season.name + ' Season is LIVE! ' + season.desc, season.color, 8000);
  },

  // Called from App.addBalance when amount > 0 — track seasonal earnings
  trackEarning(amount) {
    if (!this._active || !this._uid || amount <= 0) return;
    this._myEarned += amount;
    // Debounced push to Firebase — every 30s max
    if (!this._lbPushTimer) {
      this._lbPushTimer = setTimeout(() => {
        this._lbPushTimer = null;
        this._pushLeaderboard();
      }, 30000);
    }
  },

  _pushLeaderboard() {
    if (!this._db || !this._uid || !this._active) return;
    this._db.ref('seasonLeaderboard/' + this._active + '/' + this._uid).set({
      name: this._name,
      avatar: this._avatar,
      earned: this._myEarned,
      uid: this._uid,
    });
  },

  // === Season effect getters (called by other modules) ===
  getCrimeMultiplier() {
    if (!this._active) return 1;
    return this.SEASONS[this._active]?.crimeMultiplier || 1;
  },

  getSlotsJackpotMult() {
    if (!this._active) return 1;
    return this.SEASONS[this._active]?.slotsJackpotMult || 1;
  },

  isBeachRoulette() {
    return this._active === 'summer';
  },

  // === Seasonal card pack ===
  openSeasonalPack() {
    if (!this._active) { Toast.show('No active season', '#f44336', 3000); return; }
    const cost = 5_000_000;
    if (App.balance < cost && !(typeof Admin !== 'undefined' && Admin.godMode)) {
      Toast.show('Need ' + App.formatMoney(cost) + ' to open a Seasonal Pack', '#f44336', 3000);
      return;
    }
    if (!(typeof Admin !== 'undefined' && Admin.godMode)) App.addBalance(-cost);

    const season = this.SEASONS[this._active];
    // Pick 3 random seasonal cards
    const picks = [...season.seasonalCards].sort(() => Math.random() - 0.5).slice(0, 3);
    const results = picks.map(template => {
      const rarity = this._rollSeasonalRarity();
      const [minV, maxV] = Cards.STAT_RANGES[rarity];
      const statType = Cards.STAT_TYPES[Math.floor(Math.random() * Cards.STAT_TYPES.length)];
      const card = {
        id: 'seasonal_' + this._active + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,5),
        name: template.name,
        art: template.art,
        flavor: template.flavor,
        rarity,
        statType,
        statValue: Math.round((minV + Math.random() * (maxV - minV)) * 1000) / 1000,
        serial: Math.floor(Math.random() * 999) + 1,
        obtainedAt: Date.now(),
        seasonal: this._active,
      };
      if (typeof Cards !== 'undefined') {
        Cards._cards[card.id] = card;
        if (Cards._db && Cards._uid) Cards._db.ref('playerCards/' + Cards._uid + '/' + card.id).set(card);
      }
      return card;
    });

    if (typeof Cards !== 'undefined') Cards._checkSets();
    App.save();
    Toast.show('🎴 Seasonal Pack opened! Got ' + results.map(c => c.name).join(', '), season.color, 6000);
    if (App.currentScreen === 'cards') Cards._render();
    this._render();
  },

  _rollSeasonalRarity() {
    // Better odds than normal packs
    const r = Math.random();
    if (r < 0.05) return 'mythic';
    if (r < 0.20) return 'legendary';
    if (r < 0.45) return 'epic';
    if (r < 0.70) return 'rare';
    return 'common';
  },

  // === Leaderboard resolution (called by authority at season end) ===
  async resolveLeaderboard() {
    if (!this._db || !this._active) return;
    const snap = await this._db.ref('seasonLeaderboard/' + this._active).orderByChild('earned').limitToLast(3).once('value');
    const entries = Object.values(snap.val() || {}).sort((a,b) => b.earned - a.earned);
    const trophyRarities = ['mythic', 'legendary', 'epic'];
    const prizes = ['1st Place', '2nd Place', '3rd Place'];
    entries.slice(0, 3).forEach((entry, i) => {
      if (!entry.uid) return;
      // Grant trophy via auctionPrizes-style delivery
      this._db.ref('auctionPrizes/' + entry.uid + '/season_trophy_' + this._active + '_' + i).set({
        type: 'season_trophy',
        description: prizes[i] + ' — ' + this.SEASONS[this._active]?.name + ' Season',
        trophyRarity: trophyRarities[i],
        seasonId: this._active,
      });
      // Also grant a seasonal card
      this._db.ref('adminPlayerCommands/' + entry.uid).push({
        cmd: 'grantSeasonTrophy',
        rarity: trophyRarities[i],
        seasonId: this._active,
        place: i + 1,
      });
    });
    Toast.show('🏆 Season resolved! Top 3 prizes sent.', '#ffd740', 5000);
  },

  // === Admin controls ===
  adminStartSeason(seasonId, durationHours) {
    if (!this._db) return;
    const season = this.SEASONS[seasonId];
    if (!season) return;
    const now = Date.now();
    this._db.ref('worldSeason').set({
      id: seasonId,
      name: season.name,
      active: true,
      startAt: now,
      endAt: now + durationHours * 3_600_000,
    });
    Toast.show('🌍 Season started: ' + season.name + ' for ' + durationHours + 'h', season.color, 5000);
  },

  adminEndSeason() {
    if (!this._db) return;
    this._db.ref('worldSeason/active').set(false);
    Toast.show('Season ended.', '#f39c12', 3000);
  },

  // === Render ===
  _render() {
    const el = document.getElementById('seasonal-content');
    if (!el) return;
    el.innerHTML = this._buildHtml();
  },

  _buildHtml() {
    if (!this._active || !this.SEASONS[this._active]) {
      return this._renderNoSeason();
    }
    const season = this.SEASONS[this._active];
    const endsIn = this._seasonData?.endAt ? this._seasonData.endAt - Date.now() : 0;
    const endsStr = endsIn > 0 ? this._msToHuman(endsIn) : 'Ending soon';

    return `
      <div style="background:linear-gradient(135deg,${season.color}22,transparent);border:1px solid ${season.color}44;border-radius:12px;padding:16px;margin-bottom:12px">
        <div style="font-size:24px;font-weight:800;color:${season.color}">${season.name}</div>
        <div style="font-size:12px;color:var(--text-dim);margin-top:4px">${season.desc}</div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:4px">Ends in: ${endsStr}</div>
        <div style="font-size:13px;margin-top:8px">Your seasonal earnings: <strong style="color:${season.color}">${App.formatMoney(this._myEarned)}</strong></div>
      </div>

      <div style="background:var(--card,#1a1a2e);border-radius:10px;padding:14px;margin-bottom:12px">
        <div style="font-weight:700;margin-bottom:10px">🎴 Seasonal Card Pack — ${App.formatMoney(5_000_000)}</div>
        <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px">3 exclusive ${season.name} cards per pack. Better rarity odds. Cards unavailable outside this season.</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">
          ${season.seasonalCards.map(c => `
            <div style="background:var(--bg3,#252540);border-radius:8px;padding:8px;text-align:center;min-width:70px">
              <div style="font-size:24px">${c.art}</div>
              <div style="font-size:10px;color:var(--text-dim)">${c.name}</div>
            </div>`).join('')}
        </div>
        <button onclick="Seasonal.openSeasonalPack()" style="width:100%;padding:10px;background:${season.color};color:#000;font-weight:800;border:none;border-radius:8px;font-size:14px;cursor:pointer">Open Seasonal Pack</button>
      </div>

      ${this._renderLeaderboard(season)}
    `;
  },

  _renderNoSeason() {
    const seasonList = Object.values(this.SEASONS).map(s => `
      <div style="background:var(--card,#1a1a2e);border-radius:10px;padding:12px;margin-bottom:8px;border:1px solid ${s.color}44">
        <div style="font-size:18px;font-weight:700;color:${s.color}">${s.name}</div>
        <div style="font-size:12px;color:var(--text-dim);margin-top:4px">${s.desc}</div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:4px">Exclusive cards: ${s.seasonalCards.map(c=>c.art+' '+c.name).join(', ')}</div>
      </div>`).join('');

    return `
      <div style="text-align:center;padding:20px 16px 12px">
        <div style="font-size:32px">🗓️</div>
        <div style="font-size:18px;font-weight:700;margin-top:8px">No Active Season</div>
        <div style="font-size:13px;color:var(--text-dim);margin-top:4px">Seasonal events run for 2–4 weeks with exclusive cards, special effects, and a seasonal leaderboard.</div>
      </div>
      <div style="padding:0 8px">${seasonList}</div>`;
  },

  _renderLeaderboard(season) {
    const entries = Object.values(this._leaderboard).sort((a,b) => b.earned - a.earned).slice(0, 10);
    if (!entries.length) return `<div style="text-align:center;padding:16px;color:var(--text-dim)">Be the first on the seasonal leaderboard!</div>`;

    const medals = ['🥇','🥈','🥉'];
    const rows = entries.map((e, i) => {
      const isMe = e.uid === this._uid;
      return `<div style="display:flex;align-items:center;gap:8px;padding:8px;background:${isMe ? 'rgba('+this._hexToRgb(season.color)+',0.1)' : 'var(--bg3,#252540)'};border-radius:8px;margin-bottom:4px">
        <span style="font-size:16px;min-width:24px">${medals[i] || (i+1)}</span>
        <span style="font-size:16px">${e.avatar || '🎲'}</span>
        <span style="flex:1;font-weight:${isMe?700:400};color:${isMe?season.color:'var(--text)'}">${this._esc(e.name)}${isMe?' (you)':''}</span>
        <span style="color:${season.color};font-weight:700">${App.formatMoney(e.earned)}</span>
      </div>`;
    }).join('');

    return `
      <div style="background:var(--card,#1a1a2e);border-radius:10px;padding:14px">
        <div style="font-weight:700;margin-bottom:10px">🏆 Seasonal Leaderboard <span style="font-size:11px;color:var(--text-dim)">(Top 3 win exclusive trophies)</span></div>
        ${rows}
      </div>`;
  },

  _hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return r+','+g+','+b;
  },

  _msToHuman(ms) {
    const d = Math.floor(ms/86400000);
    const h = Math.floor((ms%86400000)/3600000);
    const m = Math.floor((ms%3600000)/60000);
    if (d > 0) return d+'d '+h+'h';
    if (h > 0) return h+'h '+m+'m';
    return m+'m';
  },

  _esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); },

  getSaveData() { return { myEarned: this._myEarned }; },
  loadSaveData(d) { if (d) this._myEarned = d.myEarned || 0; },
};
