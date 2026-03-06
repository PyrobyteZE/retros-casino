// ===== Player-Crafted Items + Inventory + Pixel Painter =====
const Crafting = {

  // === CRAFT TYPES ===
  CRAFT_TYPES: {
    pharma:        { category:'Potion',      icon:'⚗️',  statPool:['luckBoost','earningsMult','slotsBonus'] },
    food:          { category:'Food Item',   icon:'🍱',  statPool:['luckBoost','earningsMult','gamblingBonus'] },
    tech:          { category:'Gadget',      icon:'📱',  statPool:['slotsBonus','earningsMult','hackingBonus'] },
    entertainment: { category:'Collectible', icon:'🎭',  statPool:['luckBoost','gamblingBonus','earningsMult'] },
    military:      { category:'Gear',        icon:'🪖',  statPool:['raidReduction','crimeBonus','earningsMult'] },
    crime:         { category:'Contraband',  icon:'📦',  statPool:['earningsMult','raidReduction','luckBoost'] },
    energy:        { category:'Power Cell',  icon:'⚡',  statPool:['passiveIncome','earningsMult','slotsBonus'] },
    finance:       { category:'Certificate', icon:'📜',  statPool:['earningsMult','stocksBonus','passiveIncome'] },
    space:         { category:'Artifact',    icon:'🌌',  statPool:['luckBoost','slotsBonus','earningsMult'] },
    vibes:         { category:'Crystal',     icon:'🔮',  statPool:['luckBoost','gamblingBonus','earningsMult'] },
  },

  RARITY_COLORS: {
    common:    '#aaa',
    uncommon:  '#4caf50',
    rare:      '#2196f3',
    legendary: '#ff9800',
  },

  STAT_LABELS: {
    luckBoost:     'Luck',
    earningsMult:  'Earnings',
    slotsBonus:    'Slots',
    gamblingBonus: 'Gambling',
    hackingBonus:  'Hacking',
    raidReduction: 'Raid Defense',
    crimeBonus:    'Crime',
    passiveIncome: 'Passive Income',
    stocksBonus:   'Stocks',
  },

  // 20 palette colors (index 0 = transparent)
  PALETTE: [
    null,       // 0 = transparent
    '#1a1a2e',  // 1 dark bg
    '#ffffff',  // 2 white
    '#f44336',  // 3 red
    '#e91e63',  // 4 pink
    '#9c27b0',  // 5 purple
    '#3f51b5',  // 6 indigo
    '#2196f3',  // 7 blue
    '#00bcd4',  // 8 cyan
    '#4caf50',  // 9 green
    '#8bc34a',  // a lime
    '#ffeb3b',  // b yellow
    '#ff9800',  // c orange
    '#795548',  // d brown
    '#607d8b',  // e blue-grey
    '#9e9e9e',  // f grey
    '#ff5722',  // g deep-orange
    '#673ab7',  // h deep-purple
    '#009688',  // i teal
    '#ffc107',  // j amber
  ],

  PALETTE_CHARS: '0123456789abcdefghij',

  // === STATE ===
  _inventory: [],       // [ itemObj ]
  _equipped: { slot0: null, slot1: null, slot2: null },
  _activeBuffs: [],     // [ { id, itemName, icon, stats, expiresAt } ] — consumed food buffs
  _foodMenus: {},       // { [ownerUid]: { [menuItemId]: menuEntry } }
  _itemListings: {},    // { listingId: { sellerUid, sellerName, item, price, listedAt } }
  _templates: {},       // { [templateId]: templateObj } — limited edition listings from Firebase
  _activeTab: 'bag',    // 'bag' | 'market'

  // Pixel painter state
  _ppPixels: null,      // 256-char string or null
  _ppColor: 1,          // selected palette index
  _ppTool: 'brush',     // 'brush' | 'fill'
  _ppPainting: false,
  _ppItemDraft: null,   // item being crafted (waiting for paint), or 'template:[id]'

  // Craft setup modal draft
  _craftSetupDraft: null, // { name, isTemplate, price, mintLimit, cIdx, industry }

  _listenersInited: false,

  // === INIT ===
  init() {
    if (typeof Firebase !== 'undefined' && Firebase.isOnline() && !this._listenersInited) {
      this._listenersInited = true;
      Firebase.listenItemListings(data => {
        this._itemListings = data || {};
        this._triggerRender();
      });
      Firebase.listenItemTemplates(data => {
        this._templates = data || {};
        this._triggerRender();
      });
      Firebase.listenFoodMenus(data => {
        this._foodMenus = data || {};
        this._triggerRender();
      });
    }
    // Refresh buff countdowns every 15s while inventory screen is open
    setInterval(() => {
      const before = this._activeBuffs.length;
      this._activeBuffs = this._activeBuffs.filter(b => Date.now() < b.expiresAt);
      if (this._activeBuffs.length !== before) App.save();
      this._triggerRender();
    }, 15000);
  },

  // === BOOST CALCULATION ===
  getEquippedBoosts() {
    const out = {
      earningsMult: 0, slotsBonus: 0, gamblingBonus: 0, luckBoost: 0,
      stocksBonus: 0, passiveIncome: 0, raidReductionMult: 0,
      crimeBonus: 0, hackingBonus: 0, spaceBonus: 0,
    };
    const applyStats = stats => {
      for (const stat of (stats || [])) {
        switch (stat.statType) {
          case 'earningsMult':  out.earningsMult  += stat.value; break;
          case 'slotsBonus':    out.slotsBonus    += stat.value; break;
          case 'gamblingBonus': out.gamblingBonus += stat.value; break;
          case 'luckBoost':     out.luckBoost     += stat.value; break;
          case 'stocksBonus':   out.stocksBonus   += stat.value; break;
          case 'passiveIncome': out.passiveIncome += stat.value; break;
          case 'raidReduction': out.raidReductionMult += stat.value; break;
          case 'crimeBonus':    out.crimeBonus    += stat.value; break;
          case 'hackingBonus':  out.hackingBonus  += stat.value; break;
          case 'spaceBonus':    out.spaceBonus    += stat.value; break;
        }
      }
    };
    // Equipped items
    for (const slotKey of ['slot0','slot1','slot2']) {
      const itemId = this._equipped[slotKey];
      if (!itemId) continue;
      const item = this._inventory.find(i => i.id === itemId);
      if (item) applyStats(item.stats);
    }
    // Active food buffs (not expired)
    const now = Date.now();
    for (const buff of this._activeBuffs) {
      if (now < buff.expiresAt) applyStats(buff.stats);
    }
    return out;
  },

  // === FOOD / EAT ===
  BUFF_DURATIONS: { common: 3 * 60_000, uncommon: 7 * 60_000, rare: 15 * 60_000, legendary: 30 * 60_000 },

  eatItem(itemId) {
    const idx = this._inventory.findIndex(i => i.id === itemId);
    if (idx < 0) return;
    const item = this._inventory[idx];
    if (item.industry !== 'food') return;
    const dur = this.BUFF_DURATIONS[item.rarity] || this.BUFF_DURATIONS.common;
    const mins = dur / 60_000;
    this._activeBuffs.push({
      id: itemId,
      itemName: item.name,
      icon: item.icon || '🍱',
      stats: item.stats,
      expiresAt: Date.now() + dur,
    });
    this._inventory.splice(idx, 1);
    // Unequip if it was equipped
    for (const slotKey of ['slot0','slot1','slot2']) {
      if (this._equipped[slotKey] === itemId) this._equipped[slotKey] = null;
    }
    App.save();
    this._triggerRender();
    const statSummary = (item.stats || []).map(s => {
      const sign = s.value >= 0 ? '+' : '';
      return s.statType === 'passiveIncome'
        ? sign + App.formatMoney(s.value) + '/s'
        : sign + Math.round(s.value * 100) + '% ' + (this.STAT_LABELS[s.statType] || s.statType);
    }).join(', ');
    Toast.show(`🍽️ Ate ${item.name}! ${statSummary} for ${mins}m`, '#4caf50', 5000);
  },

  // === CRAFTING ===
  getAvailableTypes(company) {
    const types = new Set([company.industry || 'tech']);
    const mainIdx = company.mainIdx || 0;
    company.stocks.forEach((s, i) => {
      if (i !== mainIdx && s.industry) types.add(s.industry);
    });
    return [...types].filter(t => this.CRAFT_TYPES[t]);
  },

  getCraftCost(company) {
    const mainIdx = company.mainIdx || 0;
    const level = company.stocks[mainIdx] ? (company.stocks[mainIdx].level || 1) : 1;
    return Math.max(10_000, level * 50_000);
  },

  craftItem(company, industry, overrideName) {
    const craftType = this.CRAFT_TYPES[industry];
    if (!craftType) { Toast.show('Invalid craft type', '#f44336', 2000); return; }
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    const cost = this.getCraftCost(company);
    if (!isGod && App.balance < cost) { Toast.show('Not enough money!', '#f44336', 2500); return; }
    if (!isGod) App.addBalance(-cost);

    // Check inventory cap
    const MAX_INVENTORY = 20;
    if (this._inventory.length >= MAX_INVENTORY && !isGod) {
      Toast.show(`Inventory full! (${MAX_INVENTORY} max) — sell or equip items first`, '#ff5252', 3000);
      if (!isGod) App.addBalance(cost); // refund
      return;
    }

    // Rebirth scaling: each rebirth improves rarity thresholds and stat values
    const rebirths = typeof App !== 'undefined' ? (App.rebirth || 0) : 0;
    // Rarity thresholds improve by 0.5% per rebirth (capped so legendary doesn't become trivial)
    const rarityBoost = Math.min(rebirths * 0.005, 0.25);  // max +25%
    const roll = Math.random();
    let rarity, statCount;
    if      (roll < 0.02 + rarityBoost * 0.5) { rarity = 'legendary'; statCount = 3; }
    else if (roll < 0.10 + rarityBoost * 0.8) { rarity = 'rare';      statCount = 3; }
    else if (roll < 0.30 + rarityBoost)        { rarity = 'uncommon';  statCount = 2; }
    else                                        { rarity = 'common';    statCount = 1; }

    // Roll stats (seeded by timestamp)
    const seed = Date.now();
    const rng = this._seededRng(seed);
    const statPool = [...craftType.statPool];
    const stats = [];
    // Stat value ranges — each rebirth adds +3% to max value (capped at 3x base max)
    const rebirthStatBoost = 1 + Math.min(rebirths * 0.03, 2.0);
    const ranges = {
      common:    [0.01, 0.05 * rebirthStatBoost],
      uncommon:  [0.03, 0.10 * rebirthStatBoost],
      rare:      [0.05, 0.15 * rebirthStatBoost],
      legendary: [0.10, 0.25 * rebirthStatBoost],
    };
    const [minV, maxV] = ranges[rarity];

    // Apply boosts: craftingBonus increases max range
    const boosts = typeof App !== 'undefined' ? App.getAllBoosts() : { craftingBonus: 0 };
    const craftMult = 1 + (boosts.craftingBonus || 0);

    // Curse stats pool (negative effects that appear on some items)
    const CURSE_POOL = ['luckBoost','gamblingBonus','slotsBonus','crimeBonus','hackingBonus'];
    // Curse chance by rarity: common 35%, uncommon 25%, rare 15%, legendary 5%
    const curseChancs = { common: 0.35, uncommon: 0.25, rare: 0.15, legendary: 0.05 };
    const curseChance = curseChancs[rarity] || 0.25;

    for (let i = 0; i < statCount && statPool.length > 0; i++) {
      const idx = Math.floor(rng() * statPool.length);
      const statType = statPool.splice(idx, 1)[0];
      let value = minV + rng() * (maxV - minV) * craftMult;

      // passiveIncome is a flat $, not %
      if (statType === 'passiveIncome') value = Math.round(value * 10000);
      else value = Math.round(value * 100) / 100;

      stats.push({ statType, value, label: this.STAT_LABELS[statType] || statType });
    }

    // Possibly add a curse stat (negative side effect)
    if (rng() < curseChance) {
      // Pick a curse stat not already in stats
      const usedTypes = new Set(stats.map(s => s.statType));
      const available = CURSE_POOL.filter(t => !usedTypes.has(t));
      if (available.length > 0) {
        const cType = available[Math.floor(rng() * available.length)];
        // Curse value is negative, smaller than the positive stats
        const curseVal = -(Math.round((minV * 0.4 + rng() * minV * 0.6) * 100) / 100);
        stats.push({ statType: cType, value: curseVal, label: this.STAT_LABELS[cType] || cType, isCurse: true });
      }
    }

    // Generate hex ID suffix
    const hexSuffix = Math.floor(rng() * 0xffff).toString(16).toUpperCase().padStart(4, '0');

    const item = {
      id: 'item_' + seed.toString(36) + '_' + Math.floor(rng() * 9999).toString(36),
      name: overrideName || (craftType.category + ' #' + hexSuffix),
      category: craftType.category,
      icon: craftType.icon,
      pixels: '0'.repeat(256),
      industry,
      rarity,
      stats,
      crafterUid: typeof Firebase !== 'undefined' ? Firebase.uid : 'local',
      crafterName: typeof Settings !== 'undefined' ? Settings.options.playerName : 'You',
      createdAt: Date.now(),
    };

    this._inventory.push(item);
    App.save();
    Toast.show(`${craftType.icon} Crafted ${rarity} ${craftType.category}!`, this.RARITY_COLORS[rarity], 3000);

    // Open pixel painter
    this.openPixelPainter(item.id);
    this._triggerRender();
  },

  // === EQUIP ===
  equipItem(itemId, slotKey) {
    if (!this._equipped.hasOwnProperty(slotKey)) return;
    // Unequip existing item in that slot
    if (this._equipped[slotKey]) {
      // it stays in inventory
    }
    // Check if item is equipped in another slot, unequip
    for (const s of ['slot0','slot1','slot2']) {
      if (this._equipped[s] === itemId) this._equipped[s] = null;
    }
    this._equipped[slotKey] = itemId;
    App.save();
    this._triggerRender();
  },

  unequipSlot(slotKey) {
    this._equipped[slotKey] = null;
    App.save();
    this._triggerRender();
  },

  // === MARKETPLACE ===
  listItem(itemId, price) {
    const item = this._inventory.find(i => i.id === itemId);
    if (!item) return;
    if (price <= 0) { Toast.show('Invalid price', '#f44336', 2000); return; }
    // Remove from inventory while listed
    this._inventory = this._inventory.filter(i => i.id !== itemId);
    // Unequip if equipped
    for (const s of ['slot0','slot1','slot2']) {
      if (this._equipped[s] === itemId) this._equipped[s] = null;
    }
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.listItem(item, price);
    }
    App.save();
    Toast.show('Item listed for ' + App.formatMoney(price), '#4caf50', 2500);
    this._triggerRender();
  },

  async buyItem(listingId) {
    const listing = this._itemListings[listingId];
    if (!listing) { Toast.show('Listing not found', '#f44336', 2000); return; }
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (!isGod && App.balance < listing.price) { Toast.show('Not enough money!', '#f44336', 2500); return; }
    if (!isGod) App.addBalance(-listing.price);
    const item = JSON.parse(JSON.stringify(listing.item));
    this._inventory.push(item);
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      await Firebase.buyItem(listingId, listing.price, listing.sellerUid);
    }
    App.save();
    Toast.show(item.icon + ' Item purchased!', '#4caf50', 2500);
    this._triggerRender();
  },

  _showListItemModal(itemId) {
    const item = this._inventory.find(i => i.id === itemId);
    if (!item) return;
    const existing = document.getElementById('item-list-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'item-list-modal';
    modal.className = 'house-modal-overlay';
    modal.innerHTML = `
      <div class="house-modal-box">
        <div class="house-modal-title">${item.icon} List ${this._esc(item.name)}</div>
        <input id="item-list-price" type="text" class="sh-input house-modal-input" placeholder="Price (e.g. 500k)">
        <span class="sh-preview" style="display:none"></span>
        <div class="house-modal-actions">
          <button class="house-modal-btn" onclick="Crafting._confirmListItem('${itemId}')">List</button>
          <button class="house-modal-btn house-modal-cancel" onclick="document.getElementById('item-list-modal').remove()">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('item-list-price')?.focus(), 50);
  },

  _confirmListItem(itemId) {
    const inp = document.getElementById('item-list-price');
    if (!inp) return;
    const price = App.parseAmount(inp.value);
    if (isNaN(price) || price <= 0) { Toast.show('Invalid price', '#f44336', 2000); return; }
    const modal = document.getElementById('item-list-modal');
    if (modal) modal.remove();
    this.listItem(itemId, price);
  },

  // === PIXEL PAINTER ===
  openPixelPainter(itemId) {
    const item = this._inventory.find(i => i.id === itemId);
    if (!item) return;
    this._ppItemDraft = itemId;
    this._ppPixels = item.pixels || '0'.repeat(256);
    this._ppColor = 1;
    this._ppTool = 'brush';

    const modal = document.getElementById('pixel-painter-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    this._buildPpGrid();
    this._buildPpPalette();
  },

  closePixelPainter() {
    const modal = document.getElementById('pixel-painter-modal');
    if (modal) {
      modal.classList.add('hidden');
      const header = modal.querySelector('.pp-header');
      if (header) header.textContent = '🎨 Paint Your Item';
    }
    this._ppItemDraft = null;
    this._ppPixels = null;
  },

  openPixelPainterForPet(rarity) {
    this._ppItemDraft = 'pet_draft';
    this._ppPixels = '0'.repeat(256);
    this._ppColor = 1;
    this._ppTool = 'brush';
    const modal = document.getElementById('pixel-painter-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    const rc = { common: '#9badb7', uncommon: '#99e550', rare: '#639bff', legendary: '#f4b41b' };
    const ppHeader = modal.querySelector('.pp-header');
    if (ppHeader) ppHeader.textContent = '🐾 Paint Your ' + rarity[0].toUpperCase() + rarity.slice(1) + ' Pet';
    this._buildPpGrid();
  },

  savePixels() {
    if (!this._ppItemDraft || !this._ppPixels) { this.closePixelPainter(); return; }

    // Pet creation path
    if (this._ppItemDraft === 'pet_draft') {
      const pixels = this._ppPixels;
      this.closePixelPainter();
      const ppHeader = document.getElementById('pixel-painter-modal')?.querySelector('.pp-header');
      if (ppHeader) ppHeader.textContent = '🎨 Paint Your Item';
      if (typeof Pets !== 'undefined') Pets._showNamePetModal(pixels);
      return;
    }

    // Auto-list path: itemId + ':list:' + price (entertainment content listings)
    if (this._ppItemDraft.includes(':list:')) {
      const sepIdx = this._ppItemDraft.indexOf(':list:');
      const itemId = this._ppItemDraft.slice(0, sepIdx);
      const price  = parseFloat(this._ppItemDraft.slice(sepIdx + 6)) || 0;
      const item = this._inventory.find(i => i.id === itemId);
      if (item) item.pixels = this._ppPixels;
      // Restore default header text
      const ppHeader = document.getElementById('pixel-painter-modal')?.querySelector('.pp-header');
      if (ppHeader) ppHeader.textContent = '🎨 Paint Your Item';
      App.save();
      this.closePixelPainter();
      this._triggerRender();
      if (price > 0 && item) {
        this.listItem(itemId, price);
      }
      return;
    }

    // Template path
    if (this._ppItemDraft.startsWith('template:')) {
      const templateId = this._ppItemDraft.slice(9);
      const tpl = this._templates[templateId];
      if (tpl) tpl.baseItem.pixels = this._ppPixels;
      if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
        Firebase.updateItemTemplatePixels(templateId, this._ppPixels);
      }
      this.closePixelPainter();
      this._toast('🖼️ Art saved for Limited Edition!');
      this._triggerRender();
      return;
    }
    const item = this._inventory.find(i => i.id === this._ppItemDraft);
    if (item) {
      item.pixels = this._ppPixels;
    }
    App.save();
    this.closePixelPainter();
    this._triggerRender();
    Toast.show('🎨 Pixel art saved!', '#4caf50', 2000);
  },

  setPpTool(tool) {
    this._ppTool = tool;
    document.getElementById('pp-brush')?.classList.toggle('pp-tool-active', tool === 'brush');
    document.getElementById('pp-fill')?.classList.toggle('pp-tool-active', tool === 'fill');
  },

  clearAll() {
    this._ppPixels = '0'.repeat(256);
    this._buildPpGrid();
  },

  _buildPpGrid() {
    const grid = document.getElementById('pp-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < 256; i++) {
      const cell = document.createElement('div');
      cell.className = 'pp-cell';
      cell.dataset.idx = i;
      const colorIdx = this._ppCharToInt(this._ppPixels[i] || '0');
      cell.style.background = this.PALETTE[colorIdx] || 'transparent';
      if (!this.PALETTE[colorIdx]) cell.classList.add('pp-cell-transparent');

      cell.addEventListener('mousedown', e => { e.preventDefault(); this._ppPainting = true; this._ppPaintCell(i); });
      cell.addEventListener('mouseover', e => { if (this._ppPainting) this._ppPaintCell(i); });
      cell.addEventListener('touchstart', e => { e.preventDefault(); this._ppPainting = true; this._ppPaintCell(i); }, { passive: false });
      cell.addEventListener('touchmove', e => {
        e.preventDefault();
        const touch = e.touches[0];
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        if (el && el.dataset.idx !== undefined) this._ppPaintCell(parseInt(el.dataset.idx));
      }, { passive: false });

      grid.appendChild(cell);
    }
    document.addEventListener('mouseup', () => { this._ppPainting = false; }, { once: false });
  },

  _ppPaintCell(idx) {
    if (this._ppTool === 'fill') {
      this._ppFloodFill(idx, this._ppCharToInt(this._ppPixels[idx] || '0'), this._ppColor);
      this._buildPpGrid();
      return;
    }
    const chars = this._ppPixels.split('');
    chars[idx] = this.PALETTE_CHARS[this._ppColor];
    this._ppPixels = chars.join('');
    const cell = document.querySelector(`#pp-grid .pp-cell[data-idx="${idx}"]`);
    if (cell) {
      cell.style.background = this.PALETTE[this._ppColor] || 'transparent';
      cell.classList.toggle('pp-cell-transparent', !this.PALETTE[this._ppColor]);
    }
  },

  _ppFloodFill(startIdx, targetColor, fillColor) {
    if (targetColor === fillColor) return;
    const pixels = this._ppPixels.split('');
    const queue = [startIdx];
    const visited = new Set();
    while (queue.length) {
      const idx = queue.shift();
      if (visited.has(idx)) continue;
      if (idx < 0 || idx >= 256) continue;
      if (this._ppCharToInt(pixels[idx]) !== targetColor) continue;
      visited.add(idx);
      pixels[idx] = this.PALETTE_CHARS[fillColor];
      const row = Math.floor(idx / 16), col = idx % 16;
      if (col > 0) queue.push(idx - 1);
      if (col < 15) queue.push(idx + 1);
      if (row > 0) queue.push(idx - 16);
      if (row < 15) queue.push(idx + 16);
    }
    this._ppPixels = pixels.join('');
  },

  _buildPpPalette() {
    const palette = document.getElementById('pp-palette');
    if (!palette) return;
    palette.innerHTML = '';
    this.PALETTE.forEach((color, i) => {
      const swatch = document.createElement('div');
      swatch.className = 'pp-swatch' + (i === this._ppColor ? ' pp-swatch-active' : '');
      swatch.style.background = color || 'transparent';
      if (!color) swatch.classList.add('pp-swatch-transparent');
      swatch.title = color || 'Eraser';
      swatch.addEventListener('click', () => {
        this._ppColor = i;
        palette.querySelectorAll('.pp-swatch').forEach((s, j) => s.classList.toggle('pp-swatch-active', j === i));
      });
      palette.appendChild(swatch);
    });
  },

  _ppCharToInt(c) {
    const idx = this.PALETTE_CHARS.indexOf(c);
    return idx >= 0 ? idx : 0;
  },

  // Render a 16×16 pixel art as a small canvas-like element
  renderPixelArt(pixels, size = 32) {
    if (!pixels || pixels.length < 256) pixels = '0'.repeat(256);
    const cellSize = Math.max(1, Math.floor(size / 16));
    let html = `<div class="pixel-art-preview" style="width:${cellSize*16}px;height:${cellSize*16}px;display:grid;grid-template-columns:repeat(16,${cellSize}px);grid-template-rows:repeat(16,${cellSize}px);image-rendering:pixelated;gap:0">`;
    for (let i = 0; i < 256; i++) {
      const colorIdx = this._ppCharToInt(pixels[i] || '0');
      const color = this.PALETTE[colorIdx] || 'transparent';
      html += `<div style="width:${cellSize}px;height:${cellSize}px;background:${color}"></div>`;
    }
    html += `</div>`;
    return html;
  },

  // === TABS ===
  setTab(tab) {
    this._activeTab = tab;
    this._triggerRender();
  },

  // === RENDER ===
  _triggerRender() {
    if (App.currentScreen === 'inventory') this.render();
    if (App.currentScreen === 'shop') this.renderShopScreen();
  },

  renderShopScreen() {
    const container = document.getElementById('shop-content');
    if (!container) return;
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    const listings = Object.entries(this._itemListings);
    const templates = Object.entries(this._templates);
    const total = listings.length + templates.length;

    let html = `<div style="padding:4px 0 10px">
      <div style="font-size:15px;font-weight:700;margin-bottom:2px">🛒 Player Shop</div>
      <div style="font-size:12px;color:var(--text-dim)">${total} item${total !== 1 ? 's' : ''} listed by players</div>
    </div>`;

    if (total === 0) {
      html += `<div class="inv-empty">No items in the shop yet.<br>Craft &amp; list items from your Inventory!</div>`;
      container.innerHTML = html;
      return;
    }

    // Limited editions first
    if (templates.length > 0) {
      html += `<div style="font-weight:700;font-size:13px;margin:8px 0 6px">🏭 Limited Editions</div><div class="inv-item-grid">`;
      for (const [tid, tpl] of templates) {
        const item = tpl.baseItem;
        if (!item) continue;
        const rarityColor = this.RARITY_COLORS[item.rarity] || '#aaa';
        const isMine = tpl.crafterUid === myUid;
        const soldOut = tpl.mintCount >= tpl.mintLimit;
        const canAfford = App.balance >= tpl.price || (typeof Admin !== 'undefined' && Admin.godMode);
        html += `<div class="inv-item-card" style="border-color:${rarityColor}">
          <div class="inv-item-top">
            <div class="inv-item-art">${this.renderPixelArt(item.pixels, 48)}</div>
            <div class="inv-item-info">
              <div class="inv-item-name">${this._esc(item.name)}</div>
              <div class="inv-item-rarity" style="color:${rarityColor}">${item.rarity} · ${item.category}</div>
              <div class="inv-item-crafter">by ${this._esc(tpl.crafterName || '?')} · ${tpl.mintCount}/${tpl.mintLimit} minted</div>
            </div>
          </div>
          <div class="inv-item-actions">
            ${isMine
              ? `<span style="color:var(--text-dim);font-size:11px">Your listing</span>
                 <button class="inv-sell-btn" onclick="Firebase.delistItemTemplate('${tid}')">🗑 Delist</button>`
              : soldOut
                ? `<span style="color:var(--text-dim);font-size:12px">Sold Out</span>`
                : `<button class="house-buy-btn${canAfford ? '' : ' unaffordable'}" onclick="Crafting.mintTemplate('${tid}')">${App.formatMoney(tpl.price)}</button>`}
          </div>
        </div>`;
      }
      html += `</div>`;
    }

    // Single listings
    if (listings.length > 0) {
      html += `<div style="font-weight:700;font-size:13px;margin:8px 0 6px">🛍 For Sale</div><div class="inv-item-grid">`;
      for (const [lid, listing] of listings) {
        const item = listing.item;
        if (!item) continue;
        const rarityColor = this.RARITY_COLORS[item.rarity] || '#aaa';
        const isMine = listing.sellerUid === myUid;
        const canAfford = App.balance >= listing.price || (typeof Admin !== 'undefined' && Admin.godMode);
        html += `<div class="inv-item-card" style="border-color:${rarityColor}">
          <div class="inv-item-top">
            <div class="inv-item-art">${this.renderPixelArt(item.pixels, 48)}</div>
            <div class="inv-item-info">
              <div class="inv-item-name">${this._esc(item.name)}</div>
              <div class="inv-item-rarity" style="color:${rarityColor}">${item.rarity} · ${item.category}</div>
              <div class="inv-item-crafter">by ${this._esc(listing.sellerName || '?')}</div>
            </div>
          </div>
          <div class="inv-item-actions">
            ${isMine
              ? `<button class="inv-sell-btn" onclick="Firebase.delistItem('${lid}')">Delist</button>`
              : `<button class="house-buy-btn${canAfford ? '' : ' unaffordable'}" onclick="Crafting.buyItem('${lid}')">${App.formatMoney(listing.price)}</button>`}
          </div>
        </div>`;
      }
      html += `</div>`;
    }

    container.innerHTML = html;
  },

  render() {
    const container = document.getElementById('inventory-content');
    if (!container) return;

    const focused = document.activeElement;
    if (focused && container.contains(focused) &&
        (focused.tagName === 'SELECT' || focused.tagName === 'INPUT')) {
      return;
    }

    // Equip slots (always visible)
    let html = `<div class="inv-equip-bar">`;
    for (const slotKey of ['slot0','slot1','slot2']) {
      const itemId = this._equipped[slotKey];
      const item = itemId ? this._inventory.find(i => i.id === itemId) : null;
      const slotNum = parseInt(slotKey.slice(4)) + 1;
      if (item) {
        const rarityColor = this.RARITY_COLORS[item.rarity] || '#aaa';
        html += `<div class="inv-equip-slot inv-equip-slot-filled" style="border-color:${rarityColor}">
          <div class="inv-equip-icon">${item.icon}</div>
          <div class="inv-equip-name">${this._esc(item.name)}</div>
          <div class="inv-equip-rarity" style="color:${rarityColor}">${item.rarity}</div>
          <button class="inv-equip-unequip" onclick="Crafting.unequipSlot('${slotKey}')">✕</button>
        </div>`;
      } else {
        html += `<div class="inv-equip-slot inv-equip-slot-empty">
          <div class="inv-equip-empty-label">Slot ${slotNum}</div>
          <div class="inv-equip-empty-hint">Empty</div>
        </div>`;
      }
    }
    html += `</div>`;

    // Tabs
    html += `<div class="inv-tabs">
      <button class="inv-tab${this._activeTab==='bag'?' active':''}" onclick="Crafting.setTab('bag')">🎒 Bag</button>
      <button class="inv-tab${this._activeTab==='market'?' active':''}" onclick="Crafting.setTab('market')">🛒 Market</button>
    </div>`;

    if (this._activeTab === 'bag') html += this._renderBag();
    else html += this._renderMarket();

    container.innerHTML = html;
  },

  _renderBag() {
    const MAX_INVENTORY = 20;
    const capHtml = `<div class="inv-cap-bar">
      <span class="inv-cap-label">🎒 ${this._inventory.length}/${MAX_INVENTORY} slots</span>
      ${this._inventory.length >= MAX_INVENTORY ? '<span class="inv-cap-full">FULL</span>' : ''}
    </div>`;

    // Active food buffs banner
    const now = Date.now();
    const liveBuffs = this._activeBuffs.filter(b => now < b.expiresAt);
    let buffHtml = '';
    if (liveBuffs.length > 0) {
      buffHtml = `<div class="active-buffs-bar">`;
      for (const buff of liveBuffs) {
        const remaining = Math.ceil((buff.expiresAt - now) / 60000);
        buffHtml += `<span class="active-buff-chip" title="${this._esc(buff.itemName)}">${buff.icon} ${this._esc(buff.itemName)} <span class="buff-timer">${remaining}m</span></span>`;
      }
      buffHtml += `</div>`;
    }

    if (this._inventory.length === 0) {
      return capHtml + buffHtml + `<div class="inv-empty">Your bag is empty.<br>Craft items from your company's Craft tab!</div>`;
    }
    let html = capHtml + buffHtml + `<div class="inv-item-grid">`;
    for (const item of this._inventory) {
      const rarityColor = this.RARITY_COLORS[item.rarity] || '#aaa';
      const isEquipped = Object.values(this._equipped).includes(item.id);
      const isFood = item.industry === 'food';
      html += `<div class="inv-item-card${isEquipped?' inv-item-equipped':''}" style="border-color:${rarityColor}">
        <div class="inv-item-top">
          <div class="inv-item-art">${this.renderPixelArt(item.pixels, 48)}</div>
          <div class="inv-item-info">
            <div class="inv-item-name">${this._esc(item.name)}</div>
            <div class="inv-item-rarity" style="color:${rarityColor}">${item.rarity} ${item.category}</div>
            <div class="inv-item-crafter">by ${this._esc(item.crafterName || '?')}</div>
          </div>
        </div>
        <div class="inv-item-stats">`;
      for (const stat of (item.stats || [])) {
        const isCurse = stat.isCurse || stat.value < 0;
        const sign = (!isCurse && stat.value >= 0) ? '+' : '';
        const pct = stat.statType === 'passiveIncome'
          ? sign + App.formatMoney(stat.value) + '/s'
          : sign + Math.round(stat.value * 100) + '% ' + (this.STAT_LABELS[stat.statType] || stat.statType);
        html += `<span class="inv-stat-tag${isCurse ? ' inv-stat-curse' : ''}">${pct}</span>`;
      }
      if (isFood) {
        const durMins = (this.BUFF_DURATIONS[item.rarity] || this.BUFF_DURATIONS.common) / 60_000;
        html += `<span class="inv-stat-tag" style="color:#4caf50;border-color:#4caf5055">⏱ ${durMins}m buff</span>`;
      }
      html += `</div>
        <div class="inv-item-actions">
          ${isFood
            ? `<button class="inv-eat-btn" onclick="Crafting.eatItem('${item.id}')">🍽️ Eat</button>
               <button class="inv-menu-btn" onclick="Crafting._showFoodMenuModal('${item.id}')">📋 Menu</button>`
            : isEquipped
              ? `<span class="inv-equipped-badge">Equipped</span>`
              : `<select class="inv-equip-select" onchange="Crafting.equipItem('${item.id}',this.value);this.value=''">
                  <option value="">Equip to...</option>
                  <option value="slot0">Slot 1</option>
                  <option value="slot1">Slot 2</option>
                  <option value="slot2">Slot 3</option>
                </select>`}
          ${item.crafterUid === ((typeof Firebase !== 'undefined' ? Firebase.uid : null) || 'local') ? `<button class="inv-edit-art-btn" onclick="Crafting.renameItem('${item.id}')">✏️</button>` : ''}
          <button class="inv-edit-art-btn" onclick="Crafting.openPixelPainter('${item.id}')">🎨 Edit Art</button>
          <button class="inv-sell-btn" onclick="Crafting._showListItemModal('${item.id}')">💰 Sell</button>
        </div>
      </div>`;
    }
    html += `</div>`;
    return html;
  },

  _renderMarket() {
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    const now = Date.now();

    // === Food Market section ===
    const allMenuEntries = [];
    for (const uid in this._foodMenus) {
      for (const mid in this._foodMenus[uid]) {
        const e = this._foodMenus[uid][mid];
        if (!e || !e.item) continue;
        if (e.expiresAt && now > e.expiresAt) continue;
        if (e.qty !== null && e.qty !== undefined && e.qty <= 0) continue;
        allMenuEntries.push({ uid, mid, e });
      }
    }
    let foodHtml = '';
    if (allMenuEntries.length > 0) {
      foodHtml += `<div style="font-weight:700;font-size:13px;margin:8px 0 6px">🍔 Food Market</div>
        <div class="inv-item-grid" style="margin-bottom:14px">`;
      for (const { uid, mid, e } of allMenuEntries) {
        const item = e.item;
        const rarityColor = this.RARITY_COLORS[item.rarity] || '#aaa';
        const isMine = uid === myUid;
        const canAfford = App.balance >= e.price || (typeof Admin !== 'undefined' && Admin.godMode);
        const typeTag = e.listType === 'permanent' ? '♾️ Always' :
          e.listType === 'limited' ? `📦 ${e.qty} left` :
          e.listType === 'timed' ? `⏳ ${Math.max(1, Math.ceil(((e.expiresAt||0)-now)/60000))}m left` :
          `📦 ${e.qty} · ⏳ ${Math.max(1, Math.ceil(((e.expiresAt||0)-now)/60000))}m`;
        const durMins = (this.BUFF_DURATIONS[item.rarity] || this.BUFF_DURATIONS.common) / 60_000;
        foodHtml += `<div class="inv-item-card food-menu-card" style="border-color:${rarityColor}">
          <div class="inv-item-top">
            <div class="inv-item-art">${this.renderPixelArt(item.pixels, 48)}</div>
            <div class="inv-item-info">
              <div class="inv-item-name">${this._esc(item.name)}</div>
              <div class="inv-item-rarity" style="color:${rarityColor}">${item.rarity} ${item.category}</div>
              <div class="inv-item-crafter">🍴 ${this._esc(e.companyName || e.ownerName || '?')}</div>
            </div>
          </div>
          <div class="inv-item-stats">`;
        for (const stat of (item.stats || [])) {
          const isCurse = stat.isCurse || stat.value < 0;
          const sign = (!isCurse && stat.value >= 0) ? '+' : '';
          const pct = stat.statType === 'passiveIncome'
            ? sign + App.formatMoney(stat.value) + '/s'
            : sign + Math.round(stat.value * 100) + '% ' + (this.STAT_LABELS[stat.statType] || stat.statType);
          foodHtml += `<span class="inv-stat-tag${isCurse ? ' inv-stat-curse' : ''}">${pct}</span>`;
        }
        foodHtml += `<span class="inv-stat-tag" style="color:#4caf50;border-color:#4caf5055">⏱ ${durMins}m buff</span>
          <span class="inv-stat-tag food-menu-type-tag">${typeTag}</span>
          </div>
          <div class="inv-item-actions">
            ${isMine
              ? `<button class="inv-sell-btn" onclick="Crafting.delistFoodItem('${uid}','${mid}')">Delist</button>`
              : `<button class="inv-eat-btn${canAfford?'':' unaffordable'}" style="flex:1" onclick="Crafting.buyFoodMenuItem('${uid}','${mid}')">Buy ${App.formatMoney(e.price)}</button>`}
          </div>
        </div>`;
      }
      foodHtml += `</div>`;
    }

    // === Limited Edition Templates section ===
    const tplEntries = Object.entries(this._templates);
    let html = '';
    if (tplEntries.length > 0) {
      html += `<div style="font-weight:700;font-size:13px;margin:8px 0 6px">🏭 Limited Editions</div>
        <div class="inv-item-grid" style="margin-bottom:14px">`;
      for (const [tid, tpl] of tplEntries) {
        const item = tpl.baseItem;
        const rarityColor = this.RARITY_COLORS[item.rarity] || '#aaa';
        const isMine = tpl.crafterUid === myUid;
        const soldOut = tpl.mintCount >= tpl.mintLimit;
        const canAfford = App.balance >= tpl.price || (typeof Admin !== 'undefined' && Admin.godMode);
        html += `<div class="inv-item-card" style="border-color:${rarityColor}">
          <div class="inv-item-top">
            <div class="inv-item-art">${this.renderPixelArt(item.pixels, 48)}</div>
            <div class="inv-item-info">
              <div class="inv-item-name">${this._esc(item.name)}</div>
              <div class="inv-item-rarity" style="color:${rarityColor}">${item.rarity} ${item.category}</div>
              <div class="inv-item-crafter">by ${this._esc(tpl.crafterName || '?')} | ${tpl.mintCount}/${tpl.mintLimit} minted</div>
            </div>
          </div>
          <div class="inv-item-actions">
            ${isMine
              ? `<button class="inv-edit-art-btn" onclick="Crafting.renameTemplate('${tid}')">✏️ Rename</button>
                 <button class="inv-sell-btn" onclick="Firebase.delistItemTemplate('${tid}')">🗑 Delist</button>`
              : soldOut
                ? `<span style="color:var(--text-dim);font-size:12px">Sold Out</span>`
                : `<button class="house-buy-btn${canAfford?'':' unaffordable'}" onclick="Crafting.mintTemplate('${tid}')">Mint ${App.formatMoney(tpl.price)}</button>`}
          </div>
        </div>`;
      }
      html += `</div>`;
    }

    const listings = Object.entries(this._itemListings);
    if (listings.length === 0 && tplEntries.length === 0 && allMenuEntries.length === 0) {
      return `<div class="inv-empty">No items listed yet.<br>Craft items and sell them from your Bag!</div>`;
    }
    html = foodHtml + html;
    if (listings.length > 0) {
      html += `<div style="font-weight:700;font-size:13px;margin:8px 0 6px">🛒 Listed Items</div>`;
    }
    html += `<div class="inv-item-grid">`;
    for (const [lid, listing] of listings) {
      const item = listing.item;
      if (!item) continue;
      const rarityColor = this.RARITY_COLORS[item.rarity] || '#aaa';
      const isMine = listing.sellerUid === myUid;
      const canAfford = App.balance >= listing.price || (typeof Admin !== 'undefined' && Admin.godMode);
      html += `<div class="inv-item-card" style="border-color:${rarityColor}">
        <div class="inv-item-top">
          <div class="inv-item-art">${this.renderPixelArt(item.pixels, 48)}</div>
          <div class="inv-item-info">
            <div class="inv-item-name">${this._esc(item.name)}</div>
            <div class="inv-item-rarity" style="color:${rarityColor}">${item.rarity} ${item.category}</div>
            <div class="inv-item-crafter">by ${this._esc(listing.sellerName || '?')}</div>
          </div>
        </div>
        <div class="inv-item-stats">`;
      for (const stat of (item.stats || [])) {
        const isCurse = stat.isCurse || stat.value < 0;
        const sign = (!isCurse && stat.value >= 0) ? '+' : '';
        const pct = stat.statType === 'passiveIncome'
          ? sign + App.formatMoney(stat.value) + '/s'
          : sign + Math.round(stat.value * 100) + '% ' + (this.STAT_LABELS[stat.statType] || stat.statType);
        html += `<span class="inv-stat-tag${isCurse ? ' inv-stat-curse' : ''}">${pct}</span>`;
      }
      html += `</div>
        <div class="inv-item-actions">
          ${isMine
            ? `<button class="inv-sell-btn" onclick="Firebase.delistItem('${lid}')">Delist</button>`
            : `<button class="house-buy-btn${canAfford?'':' unaffordable'}" onclick="Crafting.buyItem('${lid}')">Buy ${App.formatMoney(listing.price)}</button>`}
        </div>
      </div>`;
    }
    html += `</div>`;
    return html;
  },

  // Render a craft tab for a specific company (called from companies.js)
  renderCraftTab(cIdx) {
    const company = typeof Companies !== 'undefined' ? Companies._companies[cIdx] : null;
    if (!company) return '<div class="craft-empty">No company data</div>';

    // Industry-specific intercepts
    if (company.industry === 'automotive') {
      return typeof Cars !== 'undefined' ? Cars.renderBrandCraftTab(cIdx) : '<div class="craft-empty">Cars not loaded</div>';
    }
    if (company.industry === 'entertainment') {
      return this._renderEntertainmentCraftTab(cIdx);
    }

    const types = this.getAvailableTypes(company);
    const cost = this.getCraftCost(company);
    const canAfford = App.balance >= cost || (typeof Admin !== 'undefined' && Admin.godMode);

    let html = `<div class="craft-tab-content">
      <div class="craft-tab-header">
        <div class="craft-tab-title">🔨 Craft Items</div>
        <div class="craft-tab-cost">Cost: ${App.formatMoney(cost)}</div>
      </div>
      <div class="craft-type-grid">`;

    for (const industry of types) {
      const ct = this.CRAFT_TYPES[industry];
      if (!ct) continue;
      html += `<button class="craft-type-btn${canAfford?'':' unaffordable'}"
        onclick="Crafting.showCraftSetupModal(${cIdx},'${industry}')">
        <span class="craft-type-icon">${ct.icon}</span>
        <span class="craft-type-name">${ct.category}</span>
        <span class="craft-type-industry">${industry}</span>
      </button>`;
    }
    html += `</div>`;

    // Rebirth bonus display
    const rebirths = typeof App !== 'undefined' ? (App.rebirth || 0) : 0;
    const rarityBoost = Math.min(rebirths * 0.005, 0.25);
    const rebirthStatBoost = 1 + Math.min(rebirths * 0.03, 2.0);
    const legendaryPct = Math.round((0.02 + rarityBoost * 0.5) * 100);
    const rarePct      = Math.round((0.10 + rarityBoost * 0.8) * 100) - legendaryPct;
    const uncommonPct  = Math.round((0.30 + rarityBoost) * 100) - legendaryPct - rarePct;
    const commonPct    = 100 - legendaryPct - rarePct - uncommonPct;
    const invCount = this._inventory.length;
    const MAX_INVENTORY = 20;

    // Rarity odds
    html += `<div class="craft-odds">
      <div class="craft-odds-title">Drop rates${rebirths > 0 ? ` (${rebirths} rebirth${rebirths>1?'s':''} bonus)` : ''}:</div>
      <span class="craft-odd-tag" style="color:#aaa">Common ${commonPct}%</span>
      <span class="craft-odd-tag" style="color:#4caf50">Uncommon ${uncommonPct}%</span>
      <span class="craft-odd-tag" style="color:#2196f3">Rare ${rarePct}%</span>
      <span class="craft-odd-tag" style="color:#ff9800">Legendary ${legendaryPct}%</span>
    </div>
    ${rebirths > 0 ? `<div class="craft-rebirth-bonus">+${((rebirthStatBoost - 1) * 100).toFixed(0)}% stat value from rebirths</div>` : ''}
    <div class="craft-inv-usage${invCount >= MAX_INVENTORY ? ' craft-inv-full' : ''}">🎒 ${invCount}/${MAX_INVENTORY} inventory slots</div>`;

    // Recent inventory preview
    if (this._inventory.length > 0) {
      html += `<div class="craft-recent-label">Recent crafts:</div>
        <div class="craft-recent-list">`;
      const recent = [...this._inventory].reverse().slice(0, 3);
      for (const item of recent) {
        const rc = this.RARITY_COLORS[item.rarity];
        html += `<div class="craft-recent-item" style="border-left:3px solid ${rc}">
          ${item.icon} <span style="color:${rc}">${this._esc(item.name)}</span>
        </div>`;
      }
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  },

  // === FOOD MENU ===
  _showFoodMenuModal(itemId) {
    const item = this._inventory.find(i => i.id === itemId);
    if (!item || item.industry !== 'food') return;
    const existing = document.getElementById('food-menu-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'food-menu-modal';
    modal.className = 'house-modal-overlay';
    modal.innerHTML = `
      <div class="house-modal-box" style="max-width:320px">
        <div class="house-modal-title">🍔 List on Food Menu</div>
        <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px">${this._esc(item.name)} — ${item.rarity} ${item.category}</div>
        <label style="font-size:12px;color:var(--text-dim);display:block;margin-bottom:4px">Price per item</label>
        <input id="fm-price" type="text" class="sh-input house-modal-input" placeholder="e.g. 50k" style="margin-bottom:10px">
        <label style="font-size:12px;color:var(--text-dim);display:block;margin-bottom:4px">Listing type</label>
        <select id="fm-type" class="inv-equip-select" style="width:100%;margin-bottom:10px" onchange="Crafting._onFoodMenuTypeChange()">
          <option value="permanent">♾️ Permanent (infinite stock)</option>
          <option value="limited">📦 Limited stock</option>
          <option value="timed">⏳ Time-limited</option>
          <option value="both">📦⏳ Limited + Timed</option>
        </select>
        <div id="fm-qty-row" style="display:none;margin-bottom:10px">
          <label style="font-size:12px;color:var(--text-dim);display:block;margin-bottom:4px">Quantity (portions)</label>
          <input id="fm-qty" type="number" min="1" class="sh-input house-modal-input" placeholder="e.g. 20">
        </div>
        <div id="fm-time-row" style="display:none;margin-bottom:10px">
          <label style="font-size:12px;color:var(--text-dim);display:block;margin-bottom:4px">Available for (minutes)</label>
          <input id="fm-mins" type="number" min="1" class="sh-input house-modal-input" placeholder="e.g. 60">
        </div>
        <div class="house-modal-actions">
          <button class="house-modal-btn" onclick="Crafting._confirmFoodMenu('${itemId}')">List</button>
          <button class="house-modal-btn house-modal-cancel" onclick="document.getElementById('food-menu-modal').remove()">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('fm-price')?.focus(), 50);
  },

  _onFoodMenuTypeChange() {
    const type = document.getElementById('fm-type')?.value;
    const qtyRow = document.getElementById('fm-qty-row');
    const timeRow = document.getElementById('fm-time-row');
    if (qtyRow) qtyRow.style.display = (type === 'limited' || type === 'both') ? 'block' : 'none';
    if (timeRow) timeRow.style.display = (type === 'timed' || type === 'both') ? 'block' : 'none';
  },

  _confirmFoodMenu(itemId) {
    const item = this._inventory.find(i => i.id === itemId);
    if (!item) return;
    const price = App.parseAmount(document.getElementById('fm-price')?.value || '');
    if (isNaN(price) || price <= 0) { Toast.show('Enter a valid price', '#f44336', 2000); return; }
    const type = document.getElementById('fm-type')?.value || 'permanent';
    let qty = null, expiresAt = null;
    if (type === 'limited' || type === 'both') {
      qty = parseInt(document.getElementById('fm-qty')?.value) || 0;
      if (qty <= 0) { Toast.show('Enter a valid quantity', '#f44336', 2000); return; }
    }
    if (type === 'timed' || type === 'both') {
      const mins = parseInt(document.getElementById('fm-mins')?.value) || 0;
      if (mins <= 0) { Toast.show('Enter a valid duration', '#f44336', 2000); return; }
      expiresAt = Date.now() + mins * 60_000;
    }
    document.getElementById('food-menu-modal')?.remove();

    // Find which food company owns this listing (first food company the player has)
    const foodCo = typeof Companies !== 'undefined'
      ? (Companies._companies.find(c => c.industry === 'food') ||
         Companies._companies.find(c => (c.stocks || []).some(s => (s.industry || c.industry) === 'food')))
      : null;
    const companyName = foodCo ? foodCo.name : 'Food Co';
    const menuItemId = 'fm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : 'local';

    // Consume item from inventory (stored as template in listing)
    this._inventory = this._inventory.filter(i => i.id !== itemId);
    for (const s of ['slot0','slot1','slot2']) {
      if (this._equipped[s] === itemId) this._equipped[s] = null;
    }

    const entry = {
      menuItemId, ownerUid: myUid,
      ownerName: typeof Settings !== 'undefined' ? Settings.options.playerName : 'Chef',
      companyName,
      item: { ...item, id: itemId },
      price, listType: type, qty, expiresAt,
      listedAt: Date.now(), totalSold: 0,
    };
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.createFoodMenuItem(myUid, menuItemId, entry);
    }
    App.save();
    this._triggerRender();
    Toast.show('🍔 Listed on food menu!', '#4caf50', 2500);
  },

  async buyFoodMenuItem(ownerUid, menuItemId) {
    if (!Firebase || !Firebase.isOnline()) { alert('Must be online.'); return; }
    const ownerData = this._foodMenus[ownerUid];
    const entry = ownerData && ownerData[menuItemId];
    if (!entry) { Toast.show('Item no longer available', '#f44336', 2000); return; }
    if (entry.expiresAt && Date.now() > entry.expiresAt) { Toast.show('This listing has expired', '#f44336', 2000); return; }
    if (entry.qty !== null && entry.qty !== undefined && entry.qty <= 0) { Toast.show('Sold out!', '#f44336', 2000); return; }
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (!isGod && App.balance < entry.price) { Toast.show('Not enough money!', '#f44336', 2000); return; }
    if (!isGod) App.addBalance(-entry.price);

    const result = await Firebase.buyFoodMenuItem(ownerUid, menuItemId, entry.price);
    if (!result || !result.ok) {
      App.addBalance(entry.price); // refund
      Toast.show(result?.reason === 'sold_out' ? 'Sold out!' : 'Purchase failed', '#f44336', 2000);
      return;
    }
    // Give buyer a fresh copy of the food item
    const copy = { ...entry.item, id: 'item_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4) };
    this._inventory.push(copy);
    App.save();
    this._triggerRender();
    Toast.show(`${entry.item.icon} Bought ${entry.item.name} — eat it from your bag!`, '#4caf50', 3000);
  },

  delistFoodItem(ownerUid, menuItemId) {
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : 'local';
    if (ownerUid !== myUid) return;
    const entry = this._foodMenus[ownerUid]?.[menuItemId];
    if (!entry) return;
    if (!confirm('Remove "' + entry.item.name + '" from your menu? It returns to your bag.')) return;
    // Return item to inventory
    this._inventory.push({ ...entry.item });
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.removeFoodMenuItem(ownerUid, menuItemId);
    }
    App.save();
    this._triggerRender();
    Toast.show('Item returned to bag', '#4caf50', 2000);
  },

  _renderFoodMenuManagement(cIdx, company) {
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    const myMenuEntries = Object.entries((this._foodMenus[myUid] || {}))
      .filter(([, e]) => e.companyName === company.name || !e.companyName);
    const now = Date.now();
    let html = `<div style="margin-top:14px;border-top:1px solid var(--bg3);padding-top:12px">
      <div style="font-weight:700;font-size:13px;margin-bottom:8px">🍔 My Menu</div>`;
    if (myMenuEntries.length === 0) {
      html += `<div style="font-size:12px;color:var(--text-dim);margin-bottom:8px">No items on the menu yet.<br>Craft food items and use 📋 Menu in your bag to list them.</div>`;
    } else {
      for (const [mid, e] of myMenuEntries) {
        const expired = e.expiresAt && now > e.expiresAt;
        const soldOut = e.qty !== null && e.qty !== undefined && e.qty <= 0;
        const statusColor = expired || soldOut ? 'var(--red)' : 'var(--green)';
        const statusLabel = expired ? '⏰ Expired' : soldOut ? '📭 Sold Out' : '✅ Active';
        const typeLabel = e.listType === 'permanent' ? '♾️' : e.listType === 'limited' ? `📦 ${e.qty ?? 0} left` : e.listType === 'timed' ? `⏳ ${Math.max(0, Math.ceil(((e.expiresAt||0)-now)/60000))}m left` : `📦⏳`;
        html += `<div class="food-menu-manage-row">
          <span style="font-size:13px">${e.item.icon} <strong>${this._esc(e.item.name)}</strong></span>
          <span style="font-size:11px;color:var(--text-dim)">${typeLabel} · ${App.formatMoney(e.price)} · sold ${e.totalSold||0}</span>
          <span style="font-size:11px;color:${statusColor}">${statusLabel}</span>
          <button class="inv-sell-btn" style="font-size:11px" onclick="Crafting.delistFoodItem('${myUid}','${mid}')">Delist</button>
        </div>`;
      }
    }
    // Food menu management section
    if (company.industry === 'food' || (company.stocks || []).some(s => (s.industry || company.industry) === 'food')) {
      html += this._renderFoodMenuManagement(cIdx, company);
    }

    html += `</div>`;
    return html;
  },

  // === CRAFT SETUP MODAL ===
  showCraftSetupModal(cIdx, industry) {
    const company = typeof Companies !== 'undefined' ? Companies._companies[cIdx] : null;
    if (!company) return;
    const craftType = this.CRAFT_TYPES[industry];
    if (!craftType) return;
    const hexSuffix = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
    const defaultName = craftType.category + ' #' + hexSuffix;

    const existing = document.getElementById('craft-setup-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'craft-setup-modal';
    modal.className = 'house-modal-overlay';
    modal.innerHTML = `
      <div class="house-modal-box" style="max-width:340px">
        <div class="house-modal-title">${craftType.icon} Craft ${craftType.category}</div>
        <div class="car-design-row">
          <label class="car-design-label">Item Name</label>
          <input id="craft-setup-name" type="text" maxlength="32" class="house-modal-input" value="${this._esc(defaultName)}">
        </div>
        <div class="car-design-row" style="gap:8px;margin-bottom:10px">
          <label style="font-size:13px;color:var(--text-dim)">Mode:</label>
          <label style="font-size:13px;cursor:pointer"><input type="radio" name="craft-mode" value="inventory" checked onchange="document.getElementById('craft-template-opts').style.display='none'"> To Inventory</label>
          <label style="font-size:13px;cursor:pointer"><input type="radio" name="craft-mode" value="template" onchange="document.getElementById('craft-template-opts').style.display='block'"> Limited Edition</label>
        </div>
        <div id="craft-template-opts" style="display:none">
          <div class="car-design-row">
            <label class="car-design-label">Price ($)</label>
            <input id="craft-setup-price" type="text" class="sh-input house-modal-input" placeholder="e.g. 50k">
            <span class="sh-preview" style="display:none"></span>
          </div>
          <div class="car-design-row">
            <label class="car-design-label">Mint Limit (2–50)</label>
            <input id="craft-setup-mint" type="number" min="2" max="50" value="10" class="house-modal-input">
          </div>
        </div>
        <div class="house-modal-actions">
          <button class="house-modal-btn" onclick="Crafting.confirmCraftSetup(${cIdx},'${industry}')">Confirm</button>
          <button class="house-modal-btn house-modal-cancel" onclick="document.getElementById('craft-setup-modal').remove()">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('craft-setup-name').focus();
  },

  confirmCraftSetup(cIdx, industry) {
    const company = typeof Companies !== 'undefined' ? Companies._companies[cIdx] : null;
    if (!company) return;
    const nameEl = document.getElementById('craft-setup-name');
    const modeEl = document.querySelector('input[name="craft-mode"]:checked');
    const name = (nameEl ? nameEl.value.trim() : '') || industry + ' item';
    const isTemplate = modeEl && modeEl.value === 'template';

    if (isTemplate) {
      const priceEl = document.getElementById('craft-setup-price');
      const mintEl = document.getElementById('craft-setup-mint');
      const price = App.parseAmount(priceEl ? priceEl.value : '0');
      const mintLimit = Math.max(2, Math.min(50, parseInt(mintEl ? mintEl.value : '10') || 10));
      if (isNaN(price) || price <= 0) { alert('Enter a valid price'); return; }
      this._craftSetupDraft = { name, isTemplate: true, price, mintLimit, cIdx, industry };
      document.getElementById('craft-setup-modal')?.remove();
      this.craftTemplate();
    } else {
      this._craftSetupDraft = { name, isTemplate: false, cIdx, industry };
      document.getElementById('craft-setup-modal')?.remove();
      this.craftItem(company, industry, name);
    }
  },

  // === TEMPLATE CRAFTING (Limited Edition) ===
  craftTemplate() {
    const draft = this._craftSetupDraft;
    if (!draft || !draft.isTemplate) return;
    const company = typeof Companies !== 'undefined' ? Companies._companies[draft.cIdx] : null;
    if (!company) return;
    const craftType = this.CRAFT_TYPES[draft.industry];
    if (!craftType) return;
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    const cost = this.getCraftCost(company);
    if (!isGod && App.balance < cost) { this._toast('Not enough money!'); return; }
    if (!isGod) App.addBalance(-cost);

    // Roll base stats (same logic as craftItem)
    const rebirths = App.rebirth || 0;
    const rarityBoost = Math.min(rebirths * 0.005, 0.25);
    const roll = Math.random();
    let rarity, statCount;
    if      (roll < 0.02 + rarityBoost * 0.5) { rarity = 'legendary'; statCount = 3; }
    else if (roll < 0.10 + rarityBoost * 0.8) { rarity = 'rare';      statCount = 3; }
    else if (roll < 0.30 + rarityBoost)        { rarity = 'uncommon';  statCount = 2; }
    else                                        { rarity = 'common';    statCount = 1; }

    const seed = Date.now();
    const rng = this._seededRng(seed);
    const statPool = [...craftType.statPool];
    const rebirthStatBoost = 1 + Math.min(rebirths * 0.03, 2.0);
    const ranges = { common:[0.01,0.05*rebirthStatBoost], uncommon:[0.03,0.10*rebirthStatBoost], rare:[0.05,0.15*rebirthStatBoost], legendary:[0.10,0.25*rebirthStatBoost] };
    const [minV, maxV] = ranges[rarity];
    const boosts = App.getAllBoosts();
    const craftMult = 1 + (boosts.craftingBonus || 0);
    const stats = [];
    for (let i = 0; i < statCount && statPool.length > 0; i++) {
      const idx = Math.floor(rng() * statPool.length);
      const statType = statPool.splice(idx, 1)[0];
      let value = minV + rng() * (maxV - minV) * craftMult;
      if (statType === 'passiveIncome') value = Math.round(value * 10000);
      else value = Math.round(value * 100) / 100;
      stats.push({ statType, value, label: this.STAT_LABELS[statType] || statType });
    }

    const templateId = 'tpl_' + seed.toString(36) + '_' + Math.floor(rng() * 9999).toString(36);
    const baseItem = {
      name: draft.name,
      category: craftType.category,
      icon: craftType.icon,
      pixels: '0'.repeat(256),
      industry: draft.industry,
      rarity,
      stats,
    };
    const templateData = {
      templateId,
      crafterUid: typeof Firebase !== 'undefined' ? Firebase.uid : 'local',
      crafterName: typeof Settings !== 'undefined' ? Settings.options.playerName : 'You',
      baseItem,
      price: draft.price,
      mintLimit: draft.mintLimit,
      mintCount: 0,
      listedAt: Date.now(),
    };

    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.postItemTemplate(templateId, templateData);
    } else {
      this._templates[templateId] = templateData;
    }

    this._ppItemDraft = 'template:' + templateId;
    this._ppPixels = '0'.repeat(256);
    this._ppColor = 1;
    this._ppTool = 'brush';
    const modal = document.getElementById('pixel-painter-modal');
    if (modal) {
      modal.classList.remove('hidden');
      this._buildPpGrid();
      this._buildPpPalette();
    }
    this._craftSetupDraft = null;
    this._toast(`${craftType.icon} Template created! Paint your art, then save.`);
  },

  mintTemplate(templateId) {
    const tpl = this._templates[templateId];
    if (!tpl) { this._toast('Template not found'); return; }
    if (tpl.mintCount >= tpl.mintLimit) { this._toast('Sold out!'); return; }
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (!isGod && App.balance < tpl.price) { this._toast('Not enough money!'); return; }
    if (!isGod) App.addBalance(-tpl.price);

    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.mintItemTemplate(templateId).then(result => {
        if (!result.ok) { App.addBalance(tpl.price); this._toast('Sold out!'); return; }
        const item = Object.assign({}, tpl.baseItem, {
          id: 'item_' + Date.now().toString(36) + '_' + Math.floor(Math.random()*9999).toString(36),
          crafterUid: tpl.crafterUid,
          crafterName: tpl.crafterName,
          createdAt: Date.now(),
        });
        this._inventory.push(item);
        App.save();
        this._toast(`${item.icon} Minted "${item.name}"!`);
        this._triggerRender();
      });
    } else {
      // Offline: just add directly
      tpl.mintCount = (tpl.mintCount || 0) + 1;
      const item = Object.assign({}, tpl.baseItem, {
        id: 'item_' + Date.now().toString(36),
        crafterUid: tpl.crafterUid,
        crafterName: tpl.crafterName,
        createdAt: Date.now(),
      });
      this._inventory.push(item);
      App.save();
      this._toast(`${item.icon} Minted "${item.name}"!`);
      this._triggerRender();
    }
  },

  renameTemplate(templateId) {
    const tpl = this._templates[templateId];
    if (!tpl) return;
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : 'local';
    if (tpl.crafterUid !== myUid) return;
    const newName = prompt('Rename template:', tpl.baseItem.name);
    if (!newName || !newName.trim()) return;
    tpl.baseItem.name = newName.trim();
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.updateItemTemplateName(templateId, newName.trim());
    }
    this._triggerRender();
  },

  renameItem(itemId) {
    const item = this._inventory.find(i => i.id === itemId);
    if (!item) return;
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : 'local';
    if (item.crafterUid !== myUid) { this._toast('Only the creator can rename this item'); return; }
    const newName = prompt('Rename item:', item.name);
    if (!newName || !newName.trim()) return;
    item.name = newName.trim();
    App.save();
    this._triggerRender();
  },

  // === ENTERTAINMENT CONTENT CREATION ===
  _renderEntertainmentCraftTab(cIdx) {
    const co = typeof Companies !== 'undefined' ? Companies._companies[cIdx] : null;
    if (!co) return '<div class="craft-empty">No company data</div>';
    const props = co.properties || [];
    const cds = co.contentCooldowns || {};
    const now = Date.now();

    const LABELS = { music:'🎵 Music Single', movie:'🎬 Movie', tv:'📺 TV Show' };

    let html = `<div class="craft-tab-content"><div class="craft-tab-header"><div class="craft-tab-title">🎭 Produce Content</div>
      <div style="font-size:11px;color:var(--text-dim)">Producing always adds the item to your bag — paint cover art &amp; sell from inventory!</div>
    </div>`;
    for (const [type, cfg] of Object.entries(this._CONTENT_TYPES)) {
      cfg.label = LABELS[type] || type;
      const hasProp = props.includes(cfg.prop);
      const lastProd = cds[type] || 0;
      const cdLeft = Math.max(0, cfg.cd - (now - lastProd));
      const onCd = cdLeft > 0;
      const cdStr = onCd ? Math.ceil(cdLeft / 60000) + 'm left' : 'Ready';
      const canAfford = App.balance >= cfg.cost || (typeof Admin !== 'undefined' && Admin.godMode);
      const disabled = !hasProp || onCd || (!canAfford);
      html += `<div class="craft-recent-item" style="margin-bottom:10px;padding:12px;border:1px solid var(--bg3);border-radius:8px;display:flex;flex-direction:column;gap:6px">
        <div style="font-weight:700">${cfg.label} <span style="font-size:11px;color:${this.RARITY_COLORS[cfg.itemRarity]||'#aaa'}">(${cfg.itemRarity})</span></div>
        <div style="font-size:12px;color:var(--text-dim)">Cost: ${App.formatMoney(cfg.cost)} → Reward: +${App.formatMoney(cfg.reward)} | +${Math.round(cfg.stockPct*100)}% stock</div>
        <div style="font-size:12px;color:${onCd?'var(--red)':'var(--green)'}">Cooldown: ${cdStr} (${cfg.cdLabel})</div>
        ${hasProp ? `
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            <button class="house-action-btn${disabled?' unaffordable':''}" ${disabled?'disabled':''} onclick="Crafting.produceContent(${cIdx},'${type}')">🎬 Produce</button>
            <button class="house-action-btn${disabled?' unaffordable':''}" ${disabled?'disabled':''} onclick="Crafting.showContentListingModal(${cIdx},'${type}')">📦 Create &amp; List</button>
          </div>` : `<button class="house-action-btn unaffordable" disabled>🔒 Need property tier</button>`}
      </div>`;
    }
    html += `</div>`;
    return html;
  },

  _CONTENT_TYPES: {
    music: { prop:'ent_1', cost:50_000,   reward:150_000,   stockPct:0.01, cd:15*60_000,   cdLabel:'15m', itemIcon:'🎵', itemCategory:'Music Single', itemRarity:'uncommon'  },
    movie: { prop:'ent_2', cost:250_000,  reward:750_000,   stockPct:0.03, cd:60*60_000,   cdLabel:'1h',  itemIcon:'🎬', itemCategory:'Movie',        itemRarity:'rare'       },
    tv:    { prop:'ent_3', cost:600_000,  reward:2_000_000, stockPct:0.05, cd:120*60_000,  cdLabel:'2h',  itemIcon:'📺', itemCategory:'TV Show',       itemRarity:'legendary'  },
  },

  _buildContentItem(co, type, title) {
    const cfg = this._CONTENT_TYPES[type]; if (!cfg) return null;
    const seed = Date.now();
    const rng = this._seededRng(seed);
    const statPool = ['luckBoost', 'gamblingBonus', 'earningsMult'];
    const rarity = cfg.itemRarity;
    const statCount = rarity === 'uncommon' ? 2 : 3;
    const rebirths = typeof App !== 'undefined' ? (App.rebirth || 0) : 0;
    const rebirthBoost = 1 + Math.min(rebirths * 0.03, 2.0);
    const ranges = { uncommon:[0.03,0.10*rebirthBoost], rare:[0.05,0.15*rebirthBoost], legendary:[0.10,0.25*rebirthBoost] };
    const [minV, maxV] = ranges[rarity] || [0.03, 0.10];
    const pool = [...statPool];
    const stats = [];
    for (let i = 0; i < statCount && pool.length > 0; i++) {
      const statType = pool.splice(Math.floor(rng() * pool.length), 1)[0];
      const value = Math.round((minV + rng() * (maxV - minV)) * 100) / 100;
      stats.push({ statType, value, label: this.STAT_LABELS[statType] || statType });
    }
    return {
      id: 'item_' + seed.toString(36) + '_' + Math.floor(rng() * 9999).toString(36),
      name: title || (co.name + ' — ' + cfg.itemCategory),
      category: cfg.itemCategory, icon: cfg.itemIcon,
      pixels: '0'.repeat(256), industry: 'entertainment', rarity, stats,
      crafterUid: typeof Firebase !== 'undefined' ? (Firebase.uid || 'local') : 'local',
      crafterName: typeof Settings !== 'undefined' ? Settings.options.playerName : 'You',
      createdAt: seed,
    };
  },

  _applyContentEffects(co, cfg, type) {
    const sym = co.stocks && co.stocks[co.mainIdx || 0] ? co.stocks[co.mainIdx || 0].symbol : null;
    if (sym && typeof Companies !== 'undefined' && Companies._allPlayerStocks[sym]) {
      Companies._allPlayerStocks[sym].price *= (1 + cfg.stockPct);
      if (typeof Firebase !== 'undefined' && Firebase.isOnline()) Firebase.pushTradeInfluence(sym, 1, cfg.stockPct);
    }
    App.addBalance(cfg.reward);
    if (!co.contentCooldowns) co.contentCooldowns = {};
    co.contentCooldowns[type] = Date.now();
    if ((type === 'movie' || type === 'tv') && typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      const labels = { movie:'🎬 New movie release!', tv:'📺 Hit TV show premieres!' };
      Firebase.pushStockNews(labels[type] + ' ' + co.name + ' stock is climbing.', true);
    }
    if (typeof Companies !== 'undefined') { Companies._saveLocal(); Companies._pushToFirebase(); }
  },

  produceContent(cIdx, type) {
    const co = typeof Companies !== 'undefined' ? Companies._companies[cIdx] : null;
    if (!co) return;
    const cfg = this._CONTENT_TYPES[type]; if (!cfg) return;
    if (!(co.properties || []).includes(cfg.prop)) return;
    if (Date.now() - ((co.contentCooldowns || {})[type] || 0) < cfg.cd) return;
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (!isGod && App.balance < cfg.cost) { this._toast('Not enough funds'); return; }
    if (!isGod) App.addBalance(-cfg.cost);

    this._applyContentEffects(co, cfg, type);

    // Always create an item — player can paint cover art and sell it from bag
    const item = this._buildContentItem(co, type, null);
    if (item) {
      this._inventory.push(item);
      this._toast('✅ +' + App.formatMoney(cfg.reward) + ' · ' + cfg.itemIcon + ' ' + item.name + ' added to bag — paint & sell from inventory!');
    } else {
      this._toast('✅ Content produced! +' + App.formatMoney(cfg.reward));
    }

    App.save();
    this._triggerRender();
  },

  showContentListingModal(cIdx, type) {
    const co = typeof Companies !== 'undefined' ? Companies._companies[cIdx] : null;
    if (!co) return;
    const LABELS = { music: '🎵 Music Single', movie: '🎬 Movie', tv: '📺 TV Show' };
    const ICONS  = { music: '🎵', movie: '🎬', tv: '📺' };
    const PLACEHOLDERS = { music: 'e.g. Midnight Drive', movie: 'e.g. The Last Heist', tv: 'e.g. Empire Rising' };
    const label = LABELS[type] || type;
    const icon  = ICONS[type] || '🎭';
    const ph = PLACEHOLDERS[type] || 'Title…';
    document.getElementById('content-listing-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'content-listing-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box" style="max-width:340px;width:92%">
        <div class="modal-title" style="margin-bottom:14px">${icon} Create ${label}</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div>
            <div style="font-size:12px;color:var(--text-dim);margin-bottom:4px">Title</div>
            <input type="text" id="cl-name" class="sh-input" maxlength="50"
              placeholder="${ph}" style="width:100%;box-sizing:border-box">
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-dim);margin-bottom:4px">Listing Price</div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="color:var(--green);font-weight:700">$</span>
              <input type="text" inputmode="decimal" id="cl-price" class="sh-input"
                placeholder="e.g. 50000" style="flex:1">
            </div>
          </div>
          <div style="font-size:11px;color:var(--text-dim)">
            After confirming, you'll paint the cover art in the pixel editor.
          </div>
          <div style="display:flex;gap:8px;margin-top:2px">
            <button class="company-found-btn" style="flex:1"
              onclick="Crafting.confirmContentListing(${cIdx},'${type}')">🎨 Paint Cover →</button>
            <button class="company-found-btn" style="background:var(--bg3);flex:0;padding:10px 14px"
              onclick="document.getElementById('content-listing-modal').remove()">Cancel</button>
          </div>
        </div>
      </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.getElementById('app').appendChild(modal);
    setTimeout(() => document.getElementById('cl-name')?.focus(), 50);
  },

  confirmContentListing(cIdx, type) {
    const co = typeof Companies !== 'undefined' ? Companies._companies[cIdx] : null;
    if (!co) return;
    const name  = (document.getElementById('cl-name')?.value.trim()) || (co.name + ' — Content');
    const price = App.parseAmount(document.getElementById('cl-price')?.value || '0');
    if (!price || price <= 0) { this._toast('Enter a listing price'); return; }
    document.getElementById('content-listing-modal')?.remove();

    const cfg = this._CONTENT_TYPES[type]; if (!cfg) return;
    if (!(co.properties || []).includes(cfg.prop)) return;
    if (Date.now() - ((co.contentCooldowns || {})[type] || 0) < cfg.cd) return;
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (!isGod && App.balance < cfg.cost) { this._toast('Not enough funds'); return; }
    if (!isGod) App.addBalance(-cfg.cost);

    this._applyContentEffects(co, cfg, type);

    const item = this._buildContentItem(co, type, name);
    if (!item) return;
    this._inventory.push(item);
    if (typeof Companies !== 'undefined') { Companies._saveLocal(); Companies._pushToFirebase(); }
    App.save();

    // Open pixel painter — ':list:PRICE' suffix triggers auto-listing on save
    this._ppItemDraft = itemId + ':list:' + price;
    this._ppPixels = '0'.repeat(256);
    this._ppColor = 1;
    this._ppTool = 'brush';
    const ppModal = document.getElementById('pixel-painter-modal');
    if (ppModal) {
      const header = ppModal.querySelector('.pp-header');
      if (header) header.textContent = cfg.itemIcon + ' Paint Cover Art';
      ppModal.classList.remove('hidden');
      this._buildPpGrid();
      this._buildPpPalette();
    }
    this._triggerRender();
  },

  // === SAVE / LOAD ===
  getSaveData() {
    return {
      inventory: this._inventory,
      equipped: this._equipped,
      activeBuffs: this._activeBuffs.filter(b => Date.now() < b.expiresAt),
    };
  },

  loadSaveData(d) {
    if (!d) return;
    this._inventory = d.inventory || [];
    this._equipped = d.equipped || { slot0: null, slot1: null, slot2: null };
    this._activeBuffs = (d.activeBuffs || []).filter(b => Date.now() < b.expiresAt);
  },

  // === HELPERS ===
  _seededRng(seed) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  },

  _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },
};
