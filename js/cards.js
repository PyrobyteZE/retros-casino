// ===== Collectible Casino Cards =====
const Cards = {

  RARITIES: ['common', 'rare', 'epic', 'legendary', 'mythic'],

  RARITY_COLORS: {
    common:    '#9e9e9e',
    rare:      '#2196f3',
    epic:      '#9c27b0',
    legendary: '#ff9800',
    mythic:    '#e91e63',
  },

  RARITY_WEIGHTS: {
    common: 50, rare: 30, epic: 15, legendary: 4, mythic: 1,
  },

  STAT_RANGES: {
    common:    [0.02, 0.05],
    rare:      [0.05, 0.10],
    epic:      [0.10, 0.18],
    legendary: [0.18, 0.28],
    mythic:    [0.28, 0.40],
  },

  STAT_TYPES: ['earningsMult', 'luckBoost', 'slotsBonus', 'gamblingBonus', 'crimeBonus', 'stocksBonus', 'hackingBonus', 'passiveIncome'],

  STAT_LABELS: {
    earningsMult:  'Earnings',
    luckBoost:     'Luck',
    slotsBonus:    'Slots',
    gamblingBonus: 'Gambling',
    crimeBonus:    'Crime',
    stocksBonus:   'Stocks',
    hackingBonus:  'Hacking',
    passiveIncome: 'Passive Income',
  },

  CARD_NAMES: [
    'The Ace',       'Wild Card',      'Lucky Chip',    'High Roller',   'The Oracle',
    'Jackpot',       'House Edge',     'Royal Flush',   'Loaded Dice',   'Black Swan',
    'Moonshot',      'Market Bull',    'Night Owl',     'Crime Lord',    'The Hacker',
    'Vault Key',     'Golden Ticket',  'Iron Will',     'Shadow Broker', 'The Shark',
    'Dark Horse',    'Whale Watch',    'Phantom Trade', 'Neon Ghost',    'The Syndicate',
    'Glitch God',    'Rug Pull',       'Insider Intel', 'Lucky Break',   'The Algorithm',
    'Chaos Theory',  'Fortune Cookie', 'Dead Man\'s Hand', 'All In',     'One Time',
  ],

  CARD_ARTS: ['🎲', '🃏', '🎰', '💎', '🍀', '⚡', '🚀', '🌙', '🦈', '🔮',
              '💰', '🎯', '🕵️', '💻', '🏆', '🎭', '🌟', '🔑', '🎪', '🌊'],

  CARD_SETS: [
    { id: 'casino',  name: '🎰 Casino Royale',  cards: ['The Ace', 'Wild Card', 'Royal Flush', 'Loaded Dice', 'House Edge'],   reward: 10_000_000,  rewardCard: { name: 'Dealer\'s Crown', art: '👑', rarity: 'legendary' } },
    { id: 'crime',   name: '🕵️ Crime Empire',   cards: ['Crime Lord', 'The Hacker', 'Shadow Broker', 'The Syndicate', 'Vault Key'], reward: 15_000_000, rewardCard: { name: 'Master Criminal', art: '🗡️', rarity: 'legendary' } },
    { id: 'market',  name: '📈 Market Masters',  cards: ['Market Bull', 'Black Swan', 'Moonshot', 'Phantom Trade', 'The Algorithm'], reward: 20_000_000, rewardCard: { name: 'Market Oracle', art: '🔮', rarity: 'legendary' } },
    { id: 'street',  name: '🌃 Street Legends',  cards: ['Night Owl', 'Dark Horse', 'Lucky Break', 'Fortune Cookie', 'One Time'], reward: 8_000_000, rewardCard: { name: 'Street King', art: '🌃', rarity: 'legendary' } },
    { id: 'chaos',   name: '💥 Chaos Theory',    cards: ['Chaos Theory', 'Rug Pull', 'Glitch God', 'All In', 'Golden Ticket'], reward: 25_000_000, rewardCard: { name: 'Chaos God', art: '💥', rarity: 'mythic' } },
    { id: 'cosmos',  name: '🌌 Cosmic Whales',   cards: ['The Oracle', 'Neon Ghost', 'Whale Watch', 'Jackpot', 'Iron Will'], reward: 30_000_000, rewardCard: { name: 'Cosmic Whale', art: '🌌', rarity: 'mythic' } },
  ],

  _completedSets: [],   // array of set ids already completed

  FLAVOR_TEXT: [
    'Fortune favors the bold.',          'The house always wins... usually.',
    'In chaos lies opportunity.',         'One bet changes everything.',
    'Knowledge is the ultimate edge.',    'Risk it for the biscuit.',
    'Calculated. Ruthless. Profitable.',  'The odds were never in their favor.',
    'Trust no one. Verify everything.',   'Sometimes you eat the bear.',
    'Past performance guarantees nothing.','Play the long game.',
    'Luck is just skill you haven\'t learned.', 'Stay greedy when others are fearful.',
    'The only losing move is not playing.',
  ],

  // Packs for sale
  SELL_PRICES: {
    common:    50_000,
    rare:      200_000,
    epic:      1_000_000,
    legendary: 5_000_000,
    mythic:    25_000_000,
  },

  PACKS: [
    { id: 'basic',   name: 'Basic Pack',    cost:    500_000, count: 5,  epicBonus: 0,     icon: '📦', desc: 'Standard rarity weights' },
    { id: 'premium', name: 'Premium Pack',  cost:  2_000_000, count: 5,  epicBonus: 0.10,  icon: '💠', desc: '+10% Epic chance, +5% Legendary chance' },
    { id: 'mythic',  name: 'Mythic Pack',   cost: 10_000_000, count: 5,  epicBonus: 0.20,  icon: '✨', desc: '+20% Epic, guaranteed Legendary or better' },
  ],

  // State
  _cards: {},        // { [cardId]: cardData } — local mirror of Firebase
  _equipped: [],     // Array of 3 cardIds or nulls [ null, null, null ]
  _initialized: false,
  _tab: 'collection', // 'collection' | 'shop' | 'binder'
  _selectedCard: null,
  _packResult: null, // last pack open result
  _binderIdx: 0,

  get _db() { return typeof Firebase !== 'undefined' && Firebase.isOnline() ? Firebase.db : null; },
  get _uid() { return typeof Firebase !== 'undefined' ? Firebase.uid : null; },

  init() {
    const el = document.getElementById('cards-content');
    if (!el) return;
    if (!this._initialized) {
      this._startListeners();
      this._initialized = true;
    } else {
      this._render();
    }
  },

  _startListeners() {
    if (!this._db || !this._uid) { this._render(); return; }
    this._db.ref('playerCards/' + this._uid).on('value', snap => {
      this._cards = snap.val() || {};
      this._render();
    });
  },

  getEquippedBoosts() {
    const out = {};
    for (const cardId of this._equipped) {
      if (!cardId) continue;
      const card = this._cards[cardId];
      if (!card) continue;
      out[card.statType] = (out[card.statType] || 0) + card.statValue;
    }
    return out;
  },

  openPack(packId) {
    if (typeof Admin !== 'undefined' && Admin.godMode) {
      // Free for god mode
    } else {
      const pack = this.PACKS.find(p => p.id === packId);
      if (!pack) return;
      if (App.balance < pack.cost) { Toast.show('Not enough funds!', '#f44336', 3000); return; }
      App.addBalance(-pack.cost);
    }

    const pack = this.PACKS.find(p => p.id === packId);
    const cards = [];
    for (let i = 0; i < (pack ? pack.count : 5); i++) {
      cards.push(this._generateCard(pack));
    }

    this._packResult = cards;

    // Push to Firebase + local
    if (this._db && this._uid) {
      const updates = {};
      for (const card of cards) {
        updates[card.id] = card;
      }
      this._db.ref('playerCards/' + this._uid).update(updates);
    } else {
      // Offline: just add to local
      for (const card of cards) {
        this._cards[card.id] = card;
      }
    }

    this._checkSets();
    App.save();
    this._tab = 'collection';
    this._render();
  },

  _generateCard(pack) {
    const rarity = this._rollRarity(pack);
    const [minV, maxV] = this.STAT_RANGES[rarity];
    const statType = this.STAT_TYPES[Math.floor(Math.random() * this.STAT_TYPES.length)];
    const statValue = Math.round((minV + Math.random() * (maxV - minV)) * 1000) / 1000;
    const name = this.CARD_NAMES[Math.floor(Math.random() * this.CARD_NAMES.length)];
    const art = this.CARD_ARTS[Math.floor(Math.random() * this.CARD_ARTS.length)];
    const flavor = this.FLAVOR_TEXT[Math.floor(Math.random() * this.FLAVOR_TEXT.length)];
    const serial = Math.floor(Math.random() * 999) + 1;
    const id = 'card_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    return { id, name, art, flavor, rarity, statType, statValue, serial, obtainedAt: Date.now() };
  },

  _rollRarity(pack) {
    const weights = { ...this.RARITY_WEIGHTS };
    if (pack && pack.id === 'premium') {
      weights.epic += 10; weights.legendary += 5; weights.common -= 15;
    } else if (pack && pack.id === 'mythic') {
      weights.epic += 20; weights.legendary += 10; weights.mythic += 5; weights.common -= 35;
      // Guarantee at least legendary
      if (Math.random() < 0.5) return 'legendary';
    }
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    for (const [r, w] of Object.entries(weights)) {
      rand -= w;
      if (rand <= 0) return r;
    }
    return 'common';
  },

  equip(cardId, slot) {
    if (slot < 0 || slot > 2) return;
    // Unequip this card from any other slot
    this._equipped = this._equipped.map(id => id === cardId ? null : id);
    if (!this._equipped[slot] && cardId === null) {
      // Unequip
    } else {
      this._equipped[slot] = cardId || null;
    }
    App.save();
    this._render();
  },

  listOnAuction(cardId) {
    if (typeof Auction === 'undefined') { Toast.show('Auction House not available', '#f44336', 3000); return; }
    if (!Auction._db) { Toast.show('Sign in online to use the Auction House', '#f44336', 3000); return; }
    // Navigate to auction list tab pre-set to card type
    Auction._listType = 'card';
    Auction._tab = 'list';
    App.showScreen('auction');
  },

  sellCard(cardId) {
    const card = this._cards[cardId];
    if (!card) return;
    const price = this.SELL_PRICES[card.rarity] || 50_000;
    if (!confirm(`Sell "${card.name}" (${card.rarity}) for ${App.formatMoney(price)}?`)) return;
    // Unequip if equipped
    if (this._equipped) {
      this._equipped = this._equipped.map(id => id === cardId ? null : id);
    }
    delete this._cards[cardId];
    if (this._selectedCard === cardId) this._selectedCard = null;
    if (this._db && this._uid) {
      this._db.ref('playerCards/' + this._uid + '/' + cardId).remove();
    }
    App.addBalance(price);
    App.save();
    Toast.show('💰 Sold for ' + App.formatMoney(price) + '!', '#00e676', 3000);
    this._render();
  },

  unequip(slot) {
    if (!this._equipped) this._equipped = [null, null, null];
    this._equipped[slot] = null;
    App.save();
    this._render();
  },

  selectCard(cardId) {
    this._selectedCard = this._selectedCard === cardId ? null : cardId;
    this._render();
  },

  getSaveData() {
    return {
      equipped: [...(this._equipped || [null, null, null])],
      completedSets: [...(this._completedSets || [])],
      binderIdx: this._binderIdx || 0,
    };
  },

  loadSaveData(data) {
    if (!data) return;
    if (Array.isArray(data.equipped)) this._equipped = data.equipped.slice(0, 3);
    while (this._equipped.length < 3) this._equipped.push(null);
    if (Array.isArray(data.completedSets)) this._completedSets = data.completedSets;
    if (typeof data.binderIdx === 'number') this._binderIdx = data.binderIdx;
  },

  _render() {
    const el = document.getElementById('cards-content');
    if (!el) return;
    const focused = document.activeElement;
    if (focused && el.contains(focused) && focused.tagName === 'INPUT') return;
    // Inject binder CSS once
    if (!document.querySelector('style[data-cards-binder]')) {
      const style = document.createElement('style');
      style.setAttribute('data-cards-binder', '1');
      style.textContent = `
.cards-binder { padding: 8px; }
.cards-binder-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.cards-binder-nav button { padding: 6px 14px; background: var(--bg3, #252540); color: var(--text); border: 1px solid var(--border, #252540); border-radius: 6px; cursor: pointer; font-size: 13px; }
.cards-binder-nav button:disabled { opacity: 0.3; cursor: default; }
.cards-binder-card { border-radius: 12px; padding: 16px; text-align: center; background: var(--card, #1a1a2e); margin: 0 auto; max-width: 260px; min-height: 300px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.cards-binder-art { font-size: 64px; margin: 8px 0; }
.cards-binder-name { font-size: 18px; font-weight: 800; }
.cards-binder-serial { font-size: 11px; }
.cards-binder-stat { font-size: 14px; font-weight: 700; color: var(--green); }
.cards-binder-flavor { font-size: 11px; color: var(--text-dim); font-style: italic; margin-top: 4px; }
.cards-binder-actions { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 12px; }
      `;
      document.head.appendChild(style);
    }
    el.innerHTML = this._buildHtml();
  },

  _buildHtml() {
    const tabs = `
      <div class="cards-tabs">
        <button class="cards-tab${this._tab === 'collection' ? ' active' : ''}" onclick="Cards._tab='collection';Cards._render()">🃏 Collection (${Object.keys(this._cards).length})</button>
        <button class="cards-tab${this._tab === 'shop' ? ' active' : ''}" onclick="Cards._tab='shop';Cards._render()">📦 Pack Shop</button>
        <button class="cards-tab${this._tab === 'binder' ? ' active' : ''}" onclick="Cards._tab='binder';Cards._binderIdx=0;Cards._render()">📖 Binder</button>
      </div>`;

    if (this._packResult) {
      const resultHtml = this._renderPackResult();
      return tabs + resultHtml;
    }

    if (this._tab === 'shop') return tabs + this._renderShop();
    if (this._tab === 'binder') return tabs + this._renderBinder();
    return tabs + this._renderCollection();
  },

  _renderPackResult() {
    const cards = this._packResult;
    const html = cards.map(c => this._cardHtml(c, false, true)).join('');
    return `
      <div class="cards-pack-result">
        <div class="cards-pack-result-title">🎉 Pack Opened!</div>
        <div class="cards-pack-result-grid">${html}</div>
        <button class="cards-pack-close-btn" onclick="Cards._packResult=null;Cards._render()">Collect Cards</button>
      </div>`;
  },

  _renderShop() {
    const packsHtml = this.PACKS.map(pack => `
      <div class="cards-pack-card">
        <div class="cards-pack-icon">${pack.icon}</div>
        <div class="cards-pack-info">
          <div class="cards-pack-name">${pack.name}</div>
          <div class="cards-pack-desc">${pack.desc}</div>
          <div class="cards-pack-count">${pack.count} cards per pack</div>
        </div>
        <div class="cards-pack-buy">
          <div class="cards-pack-cost">${App.formatMoney(pack.cost)}</div>
          <button class="cards-pack-btn${App.balance < pack.cost && !(typeof Admin !== 'undefined' && Admin.godMode) ? ' unaffordable' : ''}"
            onclick="Cards.openPack('${pack.id}')">Open</button>
        </div>
      </div>`).join('');

    // Equip loadout display
    const loadout = this._renderLoadout();

    // Rarity drop rates
    const ratesHtml = this.RARITIES.map(r => `
      <span style="color:${this.RARITY_COLORS[r]};font-size:12px">${r}: ${this.RARITY_WEIGHTS[r]}%</span>`).join(' · ');

    return `
      ${loadout}
      <div class="cards-shop">
        <div class="cards-shop-title">Pack Shop</div>
        ${packsHtml}
        <div class="cards-rates">Base Drop Rates: ${ratesHtml}</div>
      </div>`;
  },

  _renderLoadout() {
    if (!this._equipped) this._equipped = [null, null, null];
    const slots = this._equipped.map((cardId, i) => {
      const card = cardId ? this._cards[cardId] : null;
      if (!card) return `<div class="cards-slot empty" onclick="Cards._tab='collection';Cards._render()">+ Slot ${i + 1}</div>`;
      return `<div class="cards-slot equipped" style="border-color:${this.RARITY_COLORS[card.rarity]}">
        <div class="cards-slot-art">${card.art}</div>
        <div class="cards-slot-name">${this._esc(card.name)}</div>
        <div class="cards-slot-stat" style="color:${this.RARITY_COLORS[card.rarity]}">+${Math.round(card.statValue * 100)}% ${this.STAT_LABELS[card.statType]}</div>
        <button class="cards-slot-remove" onclick="Cards.unequip(${i})">✕</button>
      </div>`;
    }).join('');
    const boosts = this.getEquippedBoosts();
    const boostSummary = Object.entries(boosts).map(([k, v]) => `+${Math.round(v * 100)}% ${this.STAT_LABELS[k]}`).join(' · ') || 'No bonuses active';
    return `
      <div class="cards-loadout">
        <div class="cards-loadout-title">Equipped Cards</div>
        <div class="cards-loadout-slots">${slots}</div>
        <div class="cards-loadout-summary">${boostSummary}</div>
      </div>`;
  },

  _renderCollection() {
    const cards = Object.values(this._cards).sort((a, b) => {
      const ri = this.RARITIES;
      return ri.indexOf(b.rarity) - ri.indexOf(a.rarity) || b.obtainedAt - a.obtainedAt;
    });
    if (!cards.length) {
      return `<div class="cards-empty">No cards yet!<br>Visit the Pack Shop to open your first pack.</div>`;
    }

    const selectedCard = this._selectedCard ? this._cards[this._selectedCard] : null;
    const detailHtml = selectedCard ? this._cardDetailHtml(selectedCard) : '';
    const gridHtml = cards.map(c => this._cardHtml(c, c.id === this._selectedCard)).join('');

    return `
      ${this._renderLoadout()}
      ${detailHtml}
      <div class="cards-grid">${gridHtml}</div>`;
  },

  _cardDetailHtml(card) {
    const isEquipped = this._equipped && this._equipped.includes(card.id);
    const equipSlotOptions = [0, 1, 2].map(i =>
      `<option value="${i}" ${this._equipped[i] === card.id ? 'selected' : ''}>Slot ${i + 1}${this._equipped[i] && this._equipped[i] !== card.id ? ' (replace)' : ''}</option>`
    ).join('');
    return `
      <div class="cards-detail" style="border-color:${this.RARITY_COLORS[card.rarity]}">
        <div class="cards-detail-art">${card.art}</div>
        <div class="cards-detail-info">
          <div class="cards-detail-name" style="color:${this.RARITY_COLORS[card.rarity]}">${this._esc(card.name)}</div>
          <div class="cards-detail-rarity">${card.rarity.toUpperCase()} · #${String(card.serial).padStart(3,'0')}/1000</div>
          <div class="cards-detail-stat">+${Math.round(card.statValue * 100)}% ${this.STAT_LABELS[card.statType]}</div>
          <div class="cards-detail-flavor">${this._esc(card.flavor)}</div>
        </div>
        <div class="cards-detail-actions">
          <select id="cards-equip-slot" style="background:var(--card);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 8px;font-size:12px">${equipSlotOptions}</select>
          <button class="cards-equip-btn" onclick="Cards.equip('${card.id}', parseInt(document.getElementById('cards-equip-slot').value))">
            ${isEquipped ? 'Move' : 'Equip'}
          </button>
          ${isEquipped ? `<button class="cards-unequip-btn" onclick="Cards.equip('${card.id}',${this._equipped.indexOf(card.id)});Cards.unequip(${this._equipped.indexOf(card.id)})">Unequip</button>` : ''}
          <button class="cards-sell-btn" onclick="Cards.sellCard('${card.id}')" style="background:#b71c1c;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer">💰 Sell (${App.formatMoney(this.SELL_PRICES[card.rarity] || 50000)})</button>
          <button class="cards-auction-btn" onclick="Cards.listOnAuction('${card.id}')" style="background:#6a1b9a;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer">🔨 Auction</button>
        </div>
      </div>`;
  },

  _cardHtml(card, selected = false, large = false) {
    const col = this.RARITY_COLORS[card.rarity];
    const isEquipped = this._equipped && this._equipped.includes(card.id);
    return `
      <div class="cards-card${selected ? ' selected' : ''}${large ? ' large' : ''}${isEquipped ? ' equipped' : ''}"
           style="border-color:${col}"
           title="#${String(card.serial).padStart(3,'0')}/1000"
           onclick="Cards.selectCard('${card.id}')">
        <div class="cards-card-rarity" style="background:${col}">${card.rarity[0].toUpperCase()}</div>
        <div class="cards-card-art">${card.art}</div>
        <div class="cards-card-name" style="color:${col}">${this._esc(card.name)}</div>
        <div class="cards-card-stat">+${Math.round(card.statValue * 100)}%</div>
        <div class="cards-card-type">${this.STAT_LABELS[card.statType]}</div>
        ${isEquipped ? '<div class="cards-card-equipped-badge">E</div>' : ''}
      </div>`;
  },

  _checkSets() {
    const ownedNames = new Set(Object.values(this._cards).map(c => c.name));
    for (const set of this.CARD_SETS) {
      if (this._completedSets.includes(set.id)) continue;
      const complete = set.cards.every(name => ownedNames.has(name));
      if (!complete) continue;
      this._completedSets.push(set.id);
      // Grant cash reward
      App.addBalance(set.reward);
      // Grant the reward card
      const bonus = this._generateCard(null);
      bonus.rarity = set.rewardCard.rarity;
      bonus.name = set.rewardCard.name;
      bonus.art = set.rewardCard.art;
      const [minV, maxV] = this.STAT_RANGES[bonus.rarity];
      bonus.statValue = Math.round((minV + Math.random() * (maxV - minV)) * 1000) / 1000;
      bonus.id = 'set_reward_' + set.id + '_' + Date.now().toString(36);
      bonus.setReward = true;
      bonus.flavor = 'Awarded for completing the ' + set.name + ' set.';
      this._cards[bonus.id] = bonus;
      if (this._db && this._uid) this._db.ref('playerCards/' + this._uid + '/' + bonus.id).set(bonus);
      Toast.show('🃏 Set Complete! ' + set.name + ' — +' + App.formatMoney(set.reward) + ' + Bonus Card!', '#ffd740', 7000);
      App.save();
    }
  },

  _renderBinder() {
    const cards = Object.values(this._cards).sort((a, b) => {
      return this.RARITIES.indexOf(b.rarity) - this.RARITIES.indexOf(a.rarity) || b.obtainedAt - a.obtainedAt;
    });
    if (!cards.length) return '<div class="cards-empty">No cards in binder yet.</div>';

    const idx = Math.max(0, Math.min(this._binderIdx, cards.length - 1));
    this._binderIdx = idx;
    const card = cards[idx];
    const col = this.RARITY_COLORS[card.rarity];
    const isEquipped = this._equipped && this._equipped.includes(card.id);

    // Find which set this card belongs to
    const cardSet = this.CARD_SETS.find(s => s.cards.includes(card.name));
    const setOwnedCount = cardSet ? cardSet.cards.filter(n => Object.values(this._cards).some(c => c.name === n)).length : 0;

    // Set progress bars
    const setsHtml = this.CARD_SETS.map(s => {
      const owned = s.cards.filter(n => Object.values(this._cards).some(c => c.name === n)).length;
      const done = this._completedSets.includes(s.id);
      const pct = Math.round(owned / s.cards.length * 100);
      return `<div style="margin-bottom:4px">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-dim)">${s.name}${done ? ' ✅' : ''} <span>${owned}/${s.cards.length}</span></div>
        <div style="background:var(--bg3);border-radius:3px;height:4px"><div style="background:${done ? '#4caf50' : col};width:${pct}%;height:4px;border-radius:3px;transition:width 0.3s"></div></div>
      </div>`;
    }).join('');

    const mythicStyle = card.rarity === 'mythic' ? 'background:linear-gradient(135deg,#0a0a15 0%,#1a0030 50%,#0a0a15 100%);animation:holo-shimmer 3s linear infinite;' : '';

    return `
      <style>
      @keyframes holo-shimmer {
        0%{box-shadow:0 0 15px ${col},inset 0 0 15px rgba(233,30,99,0.1)}
        50%{box-shadow:0 0 30px ${col},inset 0 0 30px rgba(187,134,252,0.2)}
        100%{box-shadow:0 0 15px ${col},inset 0 0 15px rgba(233,30,99,0.1)}
      }
      </style>
      <div class="cards-binder">
        <div class="cards-binder-nav">
          <button onclick="Cards._binderIdx=Math.max(0,Cards._binderIdx-1);Cards._render()" ${idx===0?'disabled':''}>◀ Prev</button>
          <span style="font-size:12px;color:var(--text-dim)">${idx+1} / ${cards.length}</span>
          <button onclick="Cards._binderIdx=Math.min(${cards.length-1},Cards._binderIdx+1);Cards._render()" ${idx===cards.length-1?'disabled':''}>Next ▶</button>
        </div>

        <div class="cards-binder-card" style="border:2px solid ${col};${mythicStyle}">
          <div class="cards-binder-rarity-bar" style="background:${col};color:#fff;font-size:10px;font-weight:700;text-align:center;padding:3px;letter-spacing:1px;width:100%;border-radius:8px 8px 0 0;margin:-16px -16px 0 -16px;box-sizing:content-box">${card.rarity.toUpperCase()}${card.setReward ? ' · SET REWARD' : ''}${card.seasonal ? ' · '+card.seasonal.toUpperCase() : ''}</div>
          <div class="cards-binder-art">${card.art}</div>
          <div class="cards-binder-name" style="color:${col}">${this._esc(card.name)}</div>
          <div class="cards-binder-serial" style="color:var(--text-dim)">#${String(card.serial).padStart(3,'0')}/1000</div>
          <div class="cards-binder-stat">+${Math.round(card.statValue*100)}% ${this.STAT_LABELS[card.statType]}</div>
          <div class="cards-binder-flavor">${this._esc(card.flavor)}</div>
          ${cardSet ? `<div style="font-size:10px;color:${col};margin-top:6px">Part of: ${cardSet.name} (${setOwnedCount}/${cardSet.cards.length})</div>` : ''}
        </div>

        <div class="cards-binder-actions">
          ${!isEquipped ? `<select id="binder-equip-slot" style="padding:5px;background:var(--card);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px">
            <option value="0">Slot 1${this._equipped[0]?' (replace)':''}</option>
            <option value="1">Slot 2${this._equipped[1]?' (replace)':''}</option>
            <option value="2">Slot 3${this._equipped[2]?' (replace)':''}</option>
          </select>
          <button onclick="Cards.equip('${card.id}',+document.getElementById('binder-equip-slot').value)" style="padding:6px 12px;background:var(--green);color:#000;border:none;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer">Equip</button>` :
          `<button onclick="Cards.unequip(${this._equipped.indexOf(card.id)})" style="padding:6px 12px;background:var(--bg3);color:var(--text);border:none;border-radius:6px;font-size:12px;cursor:pointer">Unequip</button>`}
          <button onclick="Cards.sellCard('${card.id}')" style="padding:6px 12px;background:#b71c1c;color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer">💰 ${App.formatMoney(this.SELL_PRICES[card.rarity]||50000)}</button>
          <button onclick="Cards.listOnAuction('${card.id}')" style="padding:6px 12px;background:#6a1b9a;color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer">🔨 Auction</button>
        </div>

        <div style="margin-top:16px">
          <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:var(--text-dim)">📚 Set Progress</div>
          ${setsHtml}
        </div>
      </div>`;
  },

  grantAchievementCard(tier) {
    // tier: 0=Bronze(common), 1=Silver(rare), 2=Gold(legendary)
    const rarityMap = ['common', 'rare', 'legendary'];
    const rarity = rarityMap[Math.min(tier, 2)];
    const card = this._generateCard(null);
    card.rarity = rarity;
    const [minV, maxV] = this.STAT_RANGES[rarity];
    card.statValue = Math.round((minV + Math.random() * (maxV - minV)) * 1000) / 1000;
    card.id = 'ach_card_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6);
    card.achievementReward = true;
    this._cards[card.id] = card;
    if (this._db && this._uid) this._db.ref('playerCards/' + this._uid + '/' + card.id).set(card);
    App.save();
    Toast.show('🃏 Achievement Card Unlocked: ' + card.name + ' (' + rarity + ')!', this.RARITY_COLORS[rarity], 5000);
    this._checkSets();
    if (App.currentScreen === 'cards') this._render();
  },

  _esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },
};
