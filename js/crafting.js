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
  _itemListings: {},    // { listingId: { sellerUid, sellerName, item, price, listedAt } }
  _activeTab: 'bag',    // 'bag' | 'market'

  // Pixel painter state
  _ppPixels: null,      // 256-char string or null
  _ppColor: 1,          // selected palette index
  _ppTool: 'brush',     // 'brush' | 'fill'
  _ppPainting: false,
  _ppItemDraft: null,   // item being crafted (waiting for paint)

  // === INIT ===
  init() {
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.listenItemListings(data => {
        this._itemListings = data || {};
        this._triggerRender();
      });
    }
  },

  // === BOOST CALCULATION ===
  getEquippedBoosts() {
    const out = {
      earningsMult: 0, slotsBonus: 0, gamblingBonus: 0, luckBoost: 0,
      stocksBonus: 0, passiveIncome: 0, raidReductionMult: 0,
      crimeBonus: 0, hackingBonus: 0, spaceBonus: 0,
    };
    for (const slotKey of ['slot0','slot1','slot2']) {
      const itemId = this._equipped[slotKey];
      if (!itemId) continue;
      const item = this._inventory.find(i => i.id === itemId);
      if (!item) continue;
      for (const stat of (item.stats || [])) {
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
    }
    return out;
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

  craftItem(company, industry) {
    const craftType = this.CRAFT_TYPES[industry];
    if (!craftType) { Toast.show('Invalid craft type', '#f44336', 2000); return; }
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    const cost = this.getCraftCost(company);
    if (!isGod && App.balance < cost) { Toast.show('Not enough money!', '#f44336', 2500); return; }
    if (!isGod) App.addBalance(-cost);

    // Roll rarity
    const roll = Math.random();
    let rarity, statCount;
    if (roll < 0.02) { rarity = 'legendary'; statCount = 3; }
    else if (roll < 0.10) { rarity = 'rare'; statCount = 3; }
    else if (roll < 0.30) { rarity = 'uncommon'; statCount = 2; }
    else { rarity = 'common'; statCount = 1; }

    // Roll stats (seeded by timestamp)
    const seed = Date.now();
    const rng = this._seededRng(seed);
    const statPool = [...craftType.statPool];
    const stats = [];
    const ranges = { common: [0.01, 0.05], uncommon: [0.03, 0.10], rare: [0.05, 0.15], legendary: [0.10, 0.25] };
    const [minV, maxV] = ranges[rarity];

    // Apply boosts: craftingBonus increases max range
    const boosts = typeof App !== 'undefined' ? App.getAllBoosts() : { craftingBonus: 0 };
    const craftMult = 1 + (boosts.craftingBonus || 0);

    for (let i = 0; i < statCount && statPool.length > 0; i++) {
      const idx = Math.floor(rng() * statPool.length);
      const statType = statPool.splice(idx, 1)[0];
      let value = minV + rng() * (maxV - minV) * craftMult;

      // passiveIncome is a flat $, not %
      if (statType === 'passiveIncome') value = Math.round(value * 10000);
      else value = Math.round(value * 100) / 100;

      stats.push({ statType, value, label: this.STAT_LABELS[statType] || statType });
    }

    // Generate hex ID suffix
    const hexSuffix = Math.floor(rng() * 0xffff).toString(16).toUpperCase().padStart(4, '0');

    const item = {
      id: 'item_' + seed.toString(36) + '_' + Math.floor(rng() * 9999).toString(36),
      name: craftType.category + ' #' + hexSuffix,
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
    if (modal) modal.classList.add('hidden');
    this._ppItemDraft = null;
    this._ppPixels = null;
  },

  savePixels() {
    if (!this._ppItemDraft || !this._ppPixels) { this.closePixelPainter(); return; }
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
    if (this._inventory.length === 0) {
      return `<div class="inv-empty">Your bag is empty.<br>Craft items from your company's Craft tab!</div>`;
    }
    let html = `<div class="inv-item-grid">`;
    for (const item of this._inventory) {
      const rarityColor = this.RARITY_COLORS[item.rarity] || '#aaa';
      const isEquipped = Object.values(this._equipped).includes(item.id);
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
        const pct = stat.statType === 'passiveIncome'
          ? '+' + App.formatMoney(stat.value) + '/s'
          : '+' + Math.round(stat.value * 100) + '% ' + (this.STAT_LABELS[stat.statType] || stat.statType);
        html += `<span class="inv-stat-tag">${pct}</span>`;
      }
      html += `</div>
        <div class="inv-item-actions">
          ${isEquipped
            ? `<span class="inv-equipped-badge">Equipped</span>`
            : `<select class="inv-equip-select" onchange="Crafting.equipItem('${item.id}',this.value);this.value=''">
                <option value="">Equip to...</option>
                <option value="slot0">Slot 1</option>
                <option value="slot1">Slot 2</option>
                <option value="slot2">Slot 3</option>
              </select>`}
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
    const listings = Object.entries(this._itemListings);
    if (listings.length === 0) {
      return `<div class="inv-empty">No items listed yet.<br>Craft items and sell them from your Bag!</div>`;
    }
    let html = `<div class="inv-item-grid">`;
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
        const pct = stat.statType === 'passiveIncome'
          ? '+' + App.formatMoney(stat.value) + '/s'
          : '+' + Math.round(stat.value * 100) + '% ' + (this.STAT_LABELS[stat.statType] || stat.statType);
        html += `<span class="inv-stat-tag">${pct}</span>`;
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
        onclick="Crafting.craftItem(Companies._companies[${cIdx}],'${industry}')">
        <span class="craft-type-icon">${ct.icon}</span>
        <span class="craft-type-name">${ct.category}</span>
        <span class="craft-type-industry">${industry}</span>
      </button>`;
    }
    html += `</div>`;

    // Rarity odds
    html += `<div class="craft-odds">
      <div class="craft-odds-title">Drop rates:</div>
      <span class="craft-odd-tag" style="color:#aaa">Common 70%</span>
      <span class="craft-odd-tag" style="color:#4caf50">Uncommon 20%</span>
      <span class="craft-odd-tag" style="color:#2196f3">Rare 8%</span>
      <span class="craft-odd-tag" style="color:#ff9800">Legendary 2%</span>
    </div>`;

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

  // === SAVE / LOAD ===
  getSaveData() {
    return {
      inventory: this._inventory,
      equipped: this._equipped,
    };
  },

  loadSaveData(d) {
    if (!d) return;
    this._inventory = d.inventory || [];
    this._equipped = d.equipped || { slot0: null, slot1: null, slot2: null };
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
