// Player Store System — company-owned shops with PvP rob/protect + franchise
const Stores = {
  _stores: {},
  _listenersInited: false,
  _logoEditTarget: null,
  _logoColors: [],
  _logoActiveColor: '#e74c3c',
  _logoPainting: false,
  _selectedListItemIdx: null,
  _selectedListStoreId: null,
  _robCooldowns: {},  // { [storeId]: timestamp }

  LOGO_SIZE: 8,           // 8×8 = 64 pixel logo
  OPEN_COST: 50_000,
  SEC_UPGRADE_COST: 25_000,

  STORE_TYPES: {
    food:          { icon: '🍔', label: 'Food Store' },
    tech:          { icon: '💻', label: 'Tech Shop' },
    entertainment: { icon: '🎮', label: 'Ent. Hub' },
    finance:       { icon: '💵', label: 'Exchange Kiosk' },
    energy:        { icon: '⛽', label: 'Gas Station' },
    space:         { icon: '🚀', label: 'Space Gear' },
    military:      { icon: '🪖', label: 'Army Surplus' },
    pharma:        { icon: '💊', label: 'Pharmacy' },
    crime:         { icon: '🕵️', label: 'Black Market' },
    vibes:         { icon: '✨', label: 'Boutique' },
    automotive:    { icon: '🔧', label: 'Parts Shop' },
  },

  LOGO_PALETTE: [
    '#e74c3c','#e67e22','#f1c40f','#2ecc71','#27ae60','#3498db','#2980b9','#9b59b6',
    '#8e44ad','#1abc9c','#e91e63','#ff5722','#795548','#9e9e9e','#ffffff','#111111',
  ],

  // ─── INIT ───────────────────────────────────────────────────────────────────

  init() {
    if (this._listenersInited) return;
    this._listenersInited = true;
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) return;
    Firebase.listenStores(data => {
      this._stores = data || {};
      this._triggerRender();
    });
  },

  _storesTab: 'browse',

  _triggerRender() {
    if (typeof Companies !== 'undefined') Companies._triggerRender();
    if (typeof App !== 'undefined' && App.currentScreen === 'stores') this.renderStoresScreen();
  },

  setStoresTab(tab) {
    this._storesTab = tab;
    this.renderStoresScreen();
  },

  renderStoresScreen() {
    const container = document.getElementById('stores-content');
    if (!container) return;

    const tab = this._storesTab;
    const storeCount = Object.keys(this._stores).length;
    const itemCount = typeof Crafting !== 'undefined'
      ? Object.keys(Crafting._itemListings || {}).length + Object.keys(Crafting._templates || {}).length
      : 0;

    const tabs = `<div class="inv-tabs" style="margin-bottom:12px">
      <button class="inv-tab${tab === 'browse' ? ' active' : ''}" onclick="Stores.setStoresTab('browse')">🏪 Player Stores ${storeCount > 0 ? `<span style="font-size:10px;background:var(--accent);color:#000;border-radius:8px;padding:1px 6px;margin-left:3px">${storeCount}</span>` : ''}</button>
      <button class="inv-tab${tab === 'market' ? ' active' : ''}" onclick="Stores.setStoresTab('market')">🛍 Item Market ${itemCount > 0 ? `<span style="font-size:10px;background:var(--accent);color:#000;border-radius:8px;padding:1px 6px;margin-left:3px">${itemCount}</span>` : ''}</button>
    </div>`;

    const browseHtml = tab === 'browse' ? this.renderBrowseStores() : '';
    container.innerHTML = `<div style="padding:4px 0 10px">
        <div style="font-size:15px;font-weight:700;margin-bottom:2px">\u{1F3EA} Shops</div>
        <div style="font-size:12px;color:var(--text-dim)">${tab === 'browse' ? `${storeCount} store${storeCount !== 1 ? 's' : ''} open across the city` : 'Items listed by players'}</div>
      </div>${tabs}${tab === 'browse' ? browseHtml : '<div id="stores-market-inner"></div>'}`;

    if (tab === 'market' && typeof Crafting !== 'undefined') {
      const inner = document.getElementById('stores-market-inner');
      if (inner) Crafting.renderShopScreen(inner);
    }
  },

  // ─── OPEN / CLOSE / COLLECT ─────────────────────────────────────────────────

  openStore(ticker, industry) {
    if (!Firebase || !Firebase.isOnline()) { alert('Must be online.'); return; }
    if (App.balance < this.OPEN_COST) { alert('Need ' + App.formatMoney(this.OPEN_COST)); return; }
    const myUid = Firebase.uid;
    const safe = ticker.replace(/[^a-zA-Z0-9]/g, '_');
    const storeName = (document.getElementById('store-name-' + safe)?.value || '').trim() || (ticker + ' Store');
    const description = (document.getElementById('store-desc-' + safe)?.value || '').trim();
    const myPlayerId = (typeof Firebase !== 'undefined' && Firebase._playerId !== null) ? Firebase._playerId : Date.now().toString(36);
    const myStoreCount = Object.values(this._stores).filter(s => s.ownerUid === myUid).length;
    const storeId = myPlayerId + '-' + (myStoreCount + 1);
    App.addBalance(-this.OPEN_COST);
    Firebase.createStore(storeId, {
      storeId, ownerUid: myUid,
      ownerName: typeof Settings !== 'undefined' ? Settings.profile.name : 'Player',
      companyTicker: ticker, storeName, industry: industry || 'tech', description,
      logoPixels: new Array(64).fill('#222222'),
      cashRegister: 0, totalSales: 0, reputation: 0, securityLevel: 0,
      protectedBy: null, inventory: {}, franchise: null,
    }).then(() => {
      Toast.show('🏪 Store opened!', '#27ae60', 3000);
      this._triggerRender();
    }).catch(err => { App.addBalance(this.OPEN_COST); alert('Error: ' + err); });
  },

  closeStore(storeId) {
    if (!Firebase || !Firebase.isOnline()) return;
    const store = this._stores[storeId];
    if (!store || store.ownerUid !== Firebase.uid) return;
    if (!confirm('Close this store? Inventory items return to your bag.')) return;
    if (typeof Crafting !== 'undefined' && store.inventory) {
      for (const e of Object.values(store.inventory)) {
        if (e.item) Crafting._inventory.push({ ...e.item, id: 'ret_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4) });
      }
    }
    if (store.cashRegister > 0) App.addBalance(store.cashRegister);
    App.save();
    Firebase.removeStore(storeId).then(() => {
      Toast.show('🏪 Store closed.', '#aaa', 2000);
      this._triggerRender();
    });
  },

  collectCash(storeId) {
    if (!Firebase || !Firebase.isOnline()) return;
    const store = this._stores[storeId];
    if (!store || store.ownerUid !== Firebase.uid) return;
    const cash = store.cashRegister || 0;
    if (cash <= 0) { Toast.show('Nothing to collect', '#aaa', 2000); return; }
    App.addBalance(cash);
    App.save();
    Firebase.updateStore(storeId, { cashRegister: 0 });
    Toast.show('💵 Collected ' + App.formatMoney(cash), '#27ae60', 3000);
  },

  upgradeSecurity(storeId) {
    if (!Firebase || !Firebase.isOnline()) return;
    const store = this._stores[storeId];
    if (!store || store.ownerUid !== Firebase.uid) return;
    const cur = store.securityLevel || 0;
    if (cur >= 100) { Toast.show('Security maxed!', '#27ae60', 2000); return; }
    if (App.balance < this.SEC_UPGRADE_COST) { alert('Need ' + App.formatMoney(this.SEC_UPGRADE_COST)); return; }
    App.addBalance(-this.SEC_UPGRADE_COST);
    Firebase.updateStore(storeId, { securityLevel: Math.min(100, cur + 10) });
    Toast.show('🔒 Security → ' + Math.min(100, cur + 10), '#27ae60', 2000);
  },

  // ─── INVENTORY ───────────────────────────────────────────────────────────────

  openListItemModal(storeId) {
    if (typeof Crafting === 'undefined' || !Crafting._inventory.length) {
      alert('Your crafting bag is empty.'); return;
    }
    const items = Crafting._inventory;
    const rows = items.map((item, idx) => {
      const rc = Crafting.RARITY_COLORS?.[item.rarity] || '#aaa';
      return `<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid var(--bg3);cursor:pointer" onclick="Stores._selectListItem(${idx},'${storeId}')">
        <div style="font-size:20px;width:28px;text-align:center">${item.icon || '📦'}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700">${this._esc(item.name)}</div>
          <div style="font-size:11px;color:${rc}">${item.rarity || 'common'} ${item.category || ''}</div>
        </div>
        <div style="color:var(--text-dim)">›</div>
      </div>`;
    }).join('');

    let m = document.getElementById('modal-overlay');
    if (!m) { m = document.createElement('div'); m.id = 'modal-overlay'; document.body.appendChild(m); }
    m.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center';
    m.innerHTML = `<div style="background:var(--bg2);border-radius:12px;max-height:82vh;display:flex;flex-direction:column;min-width:280px;max-width:360px;width:90vw">
      <div style="padding:12px;border-bottom:1px solid var(--bg3);flex-shrink:0">
        <div style="font-size:15px;font-weight:700;color:var(--green)">🏪 List Item for Sale</div>
        <div style="font-size:12px;color:var(--text-dim)">Select from your bag</div>
      </div>
      <div style="overflow-y:auto;flex:1">${rows}</div>
      <div id="list-price-section" style="padding:12px;border-top:1px solid var(--bg3);display:none;flex-shrink:0">
        <div style="font-weight:700;margin-bottom:8px" id="list-item-preview"></div>
        <div class="admin-row" style="margin-bottom:8px">
          <label style="min-width:60px;font-size:12px">Price ($):</label>
          <input type="number" id="list-item-price" min="1" placeholder="Set price" style="flex:1;font-size:14px;padding:6px">
        </div>
        <div class="admin-row" style="margin-bottom:8px">
          <label style="min-width:60px;font-size:12px">Copies:</label>
          <input type="number" id="list-item-qty" min="1" value="1" style="flex:1;font-size:14px;padding:6px">
        </div>
        <button class="game-btn" style="width:100%" onclick="Stores._confirmListItem()">List for Sale</button>
      </div>
      <button onclick="document.getElementById('modal-overlay').remove()" style="width:100%;padding:10px;background:var(--bg3);border:none;color:var(--text);font-size:14px;border-radius:0 0 12px 12px;cursor:pointer;flex-shrink:0">Cancel</button>
    </div>`;
  },

  _selectListItem(idx, storeId) {
    this._selectedListItemIdx = idx;
    this._selectedListStoreId = storeId;
    const item = Crafting._inventory[idx];
    if (!item) return;
    const prev = document.getElementById('list-item-preview');
    if (prev) prev.innerHTML = `${item.icon || '📦'} ${this._esc(item.name)} <span style="font-size:11px;color:#aaa">${item.rarity || ''}</span>`;
    const sec = document.getElementById('list-price-section');
    if (sec) { sec.style.display = 'block'; sec.scrollIntoView({ behavior: 'smooth' }); }
  },

  _confirmListItem() {
    const idx = this._selectedListItemIdx;
    const storeId = this._selectedListStoreId;
    if (idx === null || !storeId) return;
    const item = typeof Crafting !== 'undefined' ? Crafting._inventory[idx] : null;
    if (!item) return;
    const price = parseFloat(document.getElementById('list-item-price')?.value) || 0;
    const qty = Math.max(1, parseInt(document.getElementById('list-item-qty')?.value) || 1);
    if (price <= 0) { alert('Set a price.'); return; }
    Crafting._inventory.splice(idx, 1);
    App.save();
    Firebase.updateStore(storeId, { ['inventory/item_' + item.id]: { item, price, qty } }).then(() => {
      Toast.show('📦 Item listed!', '#27ae60', 2000);
      document.getElementById('modal-overlay')?.remove();
      this._triggerRender();
    }).catch(() => { Crafting._inventory.splice(idx, 0, item); App.save(); alert('Failed to list item.'); });
  },

  delistItem(storeId, itemKey) {
    const store = this._stores[storeId];
    if (!store || store.ownerUid !== Firebase.uid) return;
    const entry = store.inventory?.[itemKey];
    if (!entry) return;
    if (typeof Crafting !== 'undefined' && entry.item) {
      Crafting._inventory.push({ ...entry.item });
      App.save();
    }
    Firebase.updateStore(storeId, { ['inventory/' + itemKey]: null }).then(() => {
      Toast.show('Item returned to bag', '#aaa', 2000);
      this._triggerRender();
    });
  },

  async buyItem(storeId, itemKey) {
    if (!Firebase || !Firebase.isOnline()) { alert('Must be online.'); return; }
    const store = this._stores[storeId];
    if (!store) return;
    const e = store.inventory?.[itemKey];
    if (!e) { alert('Item no longer available.'); return; }
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (!isGod && App.balance < e.price) { alert('Not enough cash.'); return; }
    if (!isGod) App.addBalance(-e.price);
    if (typeof Crafting !== 'undefined') {
      Crafting._inventory.push({ ...e.item, id: 'bought_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4) });
    }
    App.save();

    const newQty = (e.qty || 1) - 1;
    const upd = {
      ['inventory/' + itemKey]: newQty <= 0 ? null : { ...e, qty: newQty },
      cashRegister: (store.cashRegister || 0) + e.price,
      totalSales: (store.totalSales || 0) + 1,
      reputation: Math.min(100, (store.reputation || 0) + 1),
    };

    // Royalty to franchisor
    if (store.franchise?.parentStoreId) {
      const parent = this._stores[store.franchise.parentStoreId];
      if (parent) {
        const royalty = Math.round(e.price * ((store.franchise.royaltyPct || 5) / 100));
        if (royalty > 0) Firebase.updateStore(store.franchise.parentStoreId, { cashRegister: (parent.cashRegister || 0) + royalty });
      }
    }

    Firebase.updateStore(storeId, upd).then(() => {
      Toast.show('🛍️ Bought ' + this._esc(e.item?.name || 'item') + '!', '#27ae60', 3000);
      this._triggerRender();
    }).catch(() => {
      if (!isGod) App.addBalance(e.price);
      if (typeof Crafting !== 'undefined') Crafting._inventory.pop();
      App.save(); alert('Purchase failed.');
    });
  },

  // ─── PvP — ROB ────────────────────────────────────────────────────────────────

  robStore(storeId) {
    if (!Firebase || !Firebase.isOnline()) { alert('Must be online.'); return; }
    const store = this._stores[storeId];
    if (!store) return;
    if (store.ownerUid === Firebase.uid) { alert("Can't rob your own store!"); return; }

    const cdMs = 10 * 60 * 1000;
    const cdLeft = cdMs - (Date.now() - (this._robCooldowns[storeId] || 0));
    if (cdLeft > 0) { alert('Robbery on cooldown: ' + Math.ceil(cdLeft / 60000) + ' min remaining.'); return; }

    const cash = store.cashRegister || 0;
    if (cash < 500) { alert('Register is near-empty, not worth robbing.'); return; }
    if (!confirm(`Rob "${this._esc(store.storeName)}"?\n✅ Win = steal 20–40% of register\n❌ Fail = pay fine`)) return;

    this._robCooldowns[storeId] = Date.now();

    // Attacker power: base 30 + military company level
    let attack = 30;
    if (typeof Companies !== 'undefined') {
      const milCo = Companies._companies.find(c => c.industry === 'military');
      if (milCo) attack += Math.min(50, ((milCo.properties || []).length * 6) + (milCo.stocks.length * 4));
    }

    // Defense: security level + active protection bonus (permanent once paid)
    const isActiveProtection = store.protectedBy && !store.protectedBy.isPending;
    const defense = (store.securityLevel || 0) * 0.4 + (isActiveProtection ? 35 : 0);

    const successPct = Math.max(5, Math.min(80, attack - defense));
    if (Math.random() * 100 < successPct) {
      const stolen = Math.round(cash * (0.2 + Math.random() * 0.2));
      App.addBalance(stolen);
      App.save();
      Firebase.updateStore(storeId, {
        cashRegister: Math.max(0, cash - stolen),
        reputation: Math.max(0, (store.reputation || 0) - 3),
      });
      Toast.show(`🦹 Robbed! +${App.formatMoney(stolen)}`, '#27ae60', 5000);
    } else {
      const fine = Math.round(cash * 0.08);
      const isGod = typeof Admin !== 'undefined' && Admin.godMode;
      if (!isGod) App.addBalance(-fine);
      App.save();
      Toast.show(`👮 Caught! −${App.formatMoney(fine)} fine`, '#e74c3c', 4000);
    }
    this._triggerRender();
  },

  // Military store owners offer one-time protection (permanent, no expiry)
  // Same-owner stores (protecting your own) are always FREE and activate instantly
  offerProtection(myMilStoreId, targetStoreId) {
    if (!Firebase || !Firebase.isOnline()) return;
    const myStore = this._stores[myMilStoreId];
    if (!myStore || myStore.ownerUid !== Firebase.uid || myStore.industry !== 'military') return;
    const target = this._stores[targetStoreId];
    if (!target) return;
    if (target.protectedBy && !target.protectedBy.isPending) {
      alert('This store already has active protection.'); return;
    }

    const sameOwner = target.ownerUid === Firebase.uid;
    let fee = 0;
    if (!sameOwner) {
      const feeStr = prompt('One-time protection fee ($) charged to store owner (0 = free):');
      if (feeStr === null) return;
      fee = Math.max(0, parseInt(feeStr) || 0);
    }

    // Same-owner or fee=0 → immediately active; otherwise pending acceptance
    const isPending = !sameOwner && fee > 0;
    Firebase.updateStore(targetStoreId, {
      protectedBy: {
        providerUid: Firebase.uid,
        providerName: myStore.storeName,
        providerStoreId: myMilStoreId,
        fee,
        isPending,
        offeredAt: Date.now(),
      }
    }).then(() => Toast.show(
      sameOwner ? '🛡️ Your store is now protected (free — same company)!'
        : fee > 0 ? '🛡️ Protection offer sent — waiting for acceptance.'
        : '🛡️ Protection activated (free)!',
      '#27ae60', 3000
    ));
  },

  // Store owner accepts and pays a pending protection offer
  acceptProtection(storeId) {
    if (!Firebase || !Firebase.isOnline()) return;
    const store = this._stores[storeId];
    if (!store || store.ownerUid !== Firebase.uid) return;
    const p = store.protectedBy;
    if (!p || !p.isPending) return;
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (!isGod && App.balance < p.fee) { alert('Need ' + App.formatMoney(p.fee)); return; }
    if (!isGod) App.addBalance(-p.fee);
    App.save();
    // Credit fee to military store owner's register
    const milStore = this._stores[p.providerStoreId];
    if (milStore && p.fee > 0) {
      Firebase.updateStore(p.providerStoreId, { cashRegister: (milStore.cashRegister || 0) + p.fee });
    }
    Firebase.updateStore(storeId, { 'protectedBy/isPending': false });
    Toast.show('🛡️ Protection activated! +' + App.formatMoney(p.fee) + ' to protector.', '#27ae60', 3000);
  },

  // Military owner can withdraw their protection
  withdrawProtection(targetStoreId) {
    if (!Firebase || !Firebase.isOnline()) return;
    const target = this._stores[targetStoreId];
    if (!target?.protectedBy) return;
    if (target.protectedBy.providerUid !== Firebase.uid) return;
    Firebase.updateStore(targetStoreId, { protectedBy: null });
    Toast.show('🛡️ Protection withdrawn.', '#aaa', 2000);
  },

  // === STORE SALES ===

  listStoreForSale(storeId) {
    if (!Firebase || !Firebase.isOnline()) return;
    const store = this._stores[storeId];
    if (!store || store.ownerUid !== Firebase.uid) return;
    const priceStr = prompt('List this store for sale — asking price ($):');
    if (!priceStr) return;
    const price = parseInt(priceStr) || 0;
    if (price <= 0) { alert('Invalid price.'); return; }
    Firebase.updateStore(storeId, { forSale: { price, listedAt: Date.now() } });
    Toast.show('🏪 Store listed for sale at ' + App.formatMoney(price), '#27ae60', 3000);
  },

  delistStore(storeId) {
    if (!Firebase || !Firebase.isOnline()) return;
    const store = this._stores[storeId];
    if (!store || store.ownerUid !== Firebase.uid) return;
    Firebase.updateStore(storeId, { forSale: null });
    Toast.show('Store sale listing removed.', '#aaa', 2000);
  },

  buyStore(storeId) {
    if (!Firebase || !Firebase.isOnline()) { alert('Must be online.'); return; }
    const store = this._stores[storeId];
    if (!store?.forSale) { alert('Not for sale.'); return; }
    if (store.ownerUid === Firebase.uid) { alert("Can't buy your own store."); return; }
    const price = store.forSale.price;
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (!isGod && App.balance < price) { alert('Need ' + App.formatMoney(price)); return; }
    if (!confirm(`Buy "${this._esc(store.storeName)}" for ${App.formatMoney(price)}?`)) return;
    if (!isGod) App.addBalance(-price);
    App.save();
    // Seller gets the cash (add to their register — they can collect later)
    Firebase.updateStore(storeId, {
      cashRegister: (store.cashRegister || 0) + price,
      ownerUid: Firebase.uid,
      ownerName: typeof Settings !== 'undefined' ? Settings.profile.name : 'Player',
      forSale: null,
      protectedBy: null, // protection resets on ownership change
    }).then(() => {
      Toast.show('🏪 Store purchased!', '#27ae60', 4000);
      this._triggerRender();
    }).catch(() => { if (!isGod) App.addBalance(price); App.save(); alert('Purchase failed.'); });
  },

  // ─── FRANCHISE ───────────────────────────────────────────────────────────────

  toggleFranchiseOffer(storeId) {
    const store = this._stores[storeId];
    if (!store || store.ownerUid !== Firebase.uid) return;
    if (store.franchise?.isOffering) {
      Firebase.updateStore(storeId, { 'franchise/isOffering': false });
      Toast.show('Franchise offer removed', '#aaa', 2000);
      return;
    }
    if ((store.reputation || 0) < 30) { alert('Need at least 30 reputation to offer a franchise.'); return; }
    const feeStr = prompt('Franchise license fee ($):');
    if (!feeStr) return;
    const fee = Math.max(0, parseInt(feeStr) || 10_000);
    const royaltyStr = prompt('Royalty % per sale (0–20):');
    const royaltyPct = Math.max(0, Math.min(20, parseInt(royaltyStr) || 5));
    Firebase.updateStore(storeId, {
      franchise: { isOffering: true, fee, royaltyPct, parentStoreId: null }
    });
    Toast.show('🏬 Franchise listed!', '#27ae60', 2000);
  },

  openBuyFranchiseModal(parentStoreId) {
    const parent = this._stores[parentStoreId];
    if (!parent?.franchise?.isOffering) { alert('Not available.'); return; }
    const myCompanies = typeof Companies !== 'undefined' ? Companies._companies : [];
    if (!myCompanies.length) { alert('You need a company to open a franchise.'); return; }

    const opts = myCompanies.map((c, i) =>
      `<option value="${i}">${this._esc(c.ticker)} — ${this._esc(c.name)}</option>`
    ).join('');

    let m = document.getElementById('modal-overlay');
    if (!m) { m = document.createElement('div'); m.id = 'modal-overlay'; document.body.appendChild(m); }
    m.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center';
    m.innerHTML = `<div style="background:var(--bg2);border-radius:12px;padding:16px;min-width:280px;max-width:360px;width:90vw">
      <div style="font-size:15px;font-weight:700;color:var(--gold);margin-bottom:10px">🏬 Buy Franchise</div>
      <div style="font-size:13px;margin-bottom:4px;font-weight:700">${this._esc(parent.storeName)}</div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:12px">License fee: ${App.formatMoney(parent.franchise.fee)} &bull; Royalty: ${parent.franchise.royaltyPct}%/sale</div>
      <div class="admin-row" style="margin-bottom:12px">
        <label style="min-width:100px;font-size:12px">Owned by:</label>
        <select id="franchise-co-select" style="flex:1;font-size:13px;padding:5px">${opts}</select>
      </div>
      <button class="game-btn" style="width:100%" onclick="Stores._confirmBuyFranchise('${parentStoreId}')">Buy — ${App.formatMoney(parent.franchise.fee)}</button>
      <button onclick="document.getElementById('modal-overlay').remove()" style="width:100%;padding:10px;background:var(--bg3);border:none;color:var(--text);font-size:14px;border-radius:0 0 12px 12px;margin-top:8px;cursor:pointer">Cancel</button>
    </div>`;
  },

  _confirmBuyFranchise(parentStoreId) {
    const parent = this._stores[parentStoreId];
    if (!parent?.franchise?.isOffering) { alert('Not available.'); return; }
    const cIdx = parseInt(document.getElementById('franchise-co-select')?.value) || 0;
    const c = typeof Companies !== 'undefined' ? Companies._companies[cIdx] : null;
    if (!c) return;
    const fee = parent.franchise.fee || 0;
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (!isGod && App.balance < fee) { alert('Need ' + App.formatMoney(fee)); return; }
    if (!isGod) App.addBalance(-fee);
    const myPlayerId2 = (typeof Firebase !== 'undefined' && Firebase._playerId !== null) ? Firebase._playerId : Date.now().toString(36);
    const myStoreCount2 = Object.values(this._stores).filter(s => s.ownerUid === Firebase.uid).length;
    const storeId = myPlayerId2 + '-' + (myStoreCount2 + 1);
    if (fee > 0) Firebase.updateStore(parentStoreId, { cashRegister: (parent.cashRegister || 0) + fee });
    Firebase.createStore(storeId, {
      storeId, ownerUid: Firebase.uid,
      ownerName: typeof Settings !== 'undefined' ? Settings.profile.name : 'Player',
      companyTicker: c.ticker,
      storeName: parent.storeName + ' (Franchise)',
      industry: parent.industry,
      description: 'Franchise of ' + parent.storeName,
      logoPixels: [...(parent.logoPixels || new Array(64).fill('#222222'))],
      cashRegister: 0, totalSales: 0, reputation: 0, securityLevel: 0,
      protectedBy: null, inventory: {},
      franchise: { isOffering: false, fee: 0, royaltyPct: parent.franchise.royaltyPct || 5, parentStoreId },
    }).then(() => {
      App.save();
      Toast.show('🏬 Franchise opened!', '#27ae60', 3000);
      document.getElementById('modal-overlay')?.remove();
      this._triggerRender();
    }).catch(() => { if (!isGod) App.addBalance(fee); alert('Error opening franchise.'); });
  },

  // ─── LOGO EDITOR ─────────────────────────────────────────────────────────────

  openLogoEditor(storeId) {
    const store = this._stores[storeId];
    if (!store || store.ownerUid !== Firebase.uid) return;
    this._logoEditTarget = storeId;
    this._logoColors = [...(store.logoPixels || new Array(64).fill('#222222'))];
    this._buildLogoModal();
  },

  _buildLogoModal() {
    const N = this.LOGO_SIZE;
    const px = 30;
    let m = document.getElementById('logo-editor-modal');
    if (!m) { m = document.createElement('div'); m.id = 'logo-editor-modal'; document.body.appendChild(m); }
    m.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.88);z-index:10000;display:flex;align-items:center;justify-content:center;touch-action:none';

    const palette = this.LOGO_PALETTE.map(c =>
      `<div style="width:24px;height:24px;background:${c};border-radius:4px;cursor:pointer;outline:${c === this._logoActiveColor ? '2px solid #fff' : 'none'};outline-offset:2px" onclick="Stores._setLogoColor('${c}')"></div>`
    ).join('');

    let grid = `<div id="logo-grid" style="display:grid;grid-template-columns:repeat(${N},${px}px);border:1px solid #444;border-radius:4px;overflow:hidden;touch-action:none;user-select:none">`;
    for (let i = 0; i < N * N; i++) {
      grid += `<div style="width:${px}px;height:${px}px;background:${this._logoColors[i] || '#222222'};cursor:crosshair" data-idx="${i}"
        onmousedown="Stores._logoPainting=true;Stores._paintPixel(${i})"
        onmouseenter="if(Stores._logoPainting)Stores._paintPixel(${i})"
        ontouchstart="Stores._logoPainting=true;Stores._paintPixel(${i});event.preventDefault()"
        ontouchmove="Stores._logoTouchMove(event);event.preventDefault()"></div>`;
    }
    grid += '</div>';

    m.innerHTML = `<div style="background:var(--bg2);border-radius:12px;padding:16px;max-width:440px;width:96vw">
      <div style="font-size:15px;font-weight:700;color:var(--green);margin-bottom:12px">🎨 Store Logo</div>
      <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">
        ${grid}
        <div style="flex-shrink:0">
          <div style="font-size:11px;color:var(--text-dim);margin-bottom:6px">Palette</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:8px">${palette}</div>
          <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px">Custom colour:</div>
          <input type="color" id="logo-custom-color" value="${this._logoActiveColor}"
            style="width:100%;height:30px;border:none;background:none;cursor:pointer"
            oninput="Stores._setLogoColor(this.value)">
          <button class="csr-toggle-btn" style="width:100%;margin-top:8px;font-size:11px" onclick="Stores._clearLogo()">🗑 Clear</button>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="game-btn" style="flex:1" onclick="Stores._saveLogo()">💾 Save</button>
        <button class="csr-toggle-btn" style="color:var(--red);border-color:var(--red)" onclick="document.getElementById('logo-editor-modal').remove()">Cancel</button>
      </div>
    </div>`;

    const stopPaint = () => { this._logoPainting = false; };
    document.addEventListener('mouseup', stopPaint, { once: false });
    document.addEventListener('touchend', stopPaint, { once: false });
  },

  _setLogoColor(color) { this._logoActiveColor = color; this._buildLogoModal(); },

  _paintPixel(idx) {
    this._logoColors[idx] = this._logoActiveColor;
    const cell = document.querySelector('#logo-grid [data-idx="' + idx + '"]');
    if (cell) cell.style.background = this._logoActiveColor;
  },

  _logoTouchMove(e) {
    const t = e.touches[0];
    const el = document.elementFromPoint(t.clientX, t.clientY);
    if (el?.dataset?.idx !== undefined) this._paintPixel(parseInt(el.dataset.idx));
  },

  _clearLogo() { this._logoColors = new Array(64).fill('#222222'); this._buildLogoModal(); },

  _saveLogo() {
    if (!this._logoEditTarget || !Firebase.isOnline()) return;
    Firebase.updateStore(this._logoEditTarget, { logoPixels: [...this._logoColors] }).then(() => {
      Toast.show('✅ Logo saved!', '#27ae60', 2000);
      document.getElementById('logo-editor-modal')?.remove();
      this._triggerRender();
    });
  },

  // ─── RENDER HELPERS ──────────────────────────────────────────────────────────

  _esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  // Render a tiny logo pixel grid (for display, not editing)
  renderLogo(pixels, cellSize = 4) {
    const N = this.LOGO_SIZE;
    const px = pixels && pixels.length === N * N ? pixels : new Array(N * N).fill('#222222');
    let h = `<div style="display:grid;grid-template-columns:repeat(${N},${cellSize}px);border-radius:3px;overflow:hidden;flex-shrink:0;line-height:0">`;
    for (let i = 0; i < N * N; i++) h += `<div style="width:${cellSize}px;height:${cellSize}px;background:${px[i] || '#222222'}"></div>`;
    return h + '</div>';
  },

  // ─── STORE SETUP (company manage panel) ──────────────────────────────────────

  // ticker = main company ticker OR sub-stock symbol; industry determines store type
  renderStoreSetup(ticker, industry) {
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    if (!myUid) return '';
    const stype = this.STORE_TYPES[industry] || { icon: '🏪', label: 'Store' };
    const myStores = Object.entries(this._stores)
      .filter(([, s]) => s.ownerUid === myUid && s.companyTicker === ticker);
    const safe = ticker.replace(/[^a-zA-Z0-9]/g, '_');

    let html = `<div class="bank-setup-section"><h3>${stype.icon} Stores</h3>`;
    for (const [id, s] of myStores) html += this._renderManageCard(id, s);

    html += `<div style="border:1px solid var(--bg3);border-radius:8px;padding:10px;margin-top:${myStores.length ? '10px' : '0'}">
      <div style="font-weight:700;font-size:13px;margin-bottom:8px">➕ Open ${stype.icon} ${stype.label} — ${App.formatMoney(this.OPEN_COST)}</div>
      <div class="admin-row" style="margin-bottom:6px">
        <label style="min-width:80px;font-size:12px">Name:</label>
        <input id="store-name-${safe}" placeholder="${this._esc(ticker)} Store" style="flex:1;font-size:13px;padding:5px">
      </div>
      <div class="admin-row" style="margin-bottom:8px">
        <label style="min-width:80px;font-size:12px">Description:</label>
        <input id="store-desc-${safe}" placeholder="What do you sell?" style="flex:1;font-size:13px;padding:5px">
      </div>
      <button class="company-buy-btn" style="width:100%" onclick="Stores.openStore('${ticker}','${industry || 'tech'}')">Open Store</button>
    </div></div>`;
    return html;
  },

  _renderManageCard(storeId, store) {
    const stype = this.STORE_TYPES[store.industry] || { icon: '🏪', label: 'Store' };
    const cash = store.cashRegister || 0;
    const inv = store.inventory || {};
    const itemKeys = Object.keys(inv);
    const isProtected = store.protectedBy && !store.protectedBy.isPending;
    const protectionPending = store.protectedBy?.isPending;
    const isFranchise = !!store.franchise?.parentStoreId;
    const isForSale = !!store.forSale;

    const itemRows = itemKeys.map(ik => {
      const e = inv[ik];
      const item = e.item || {};
      const rc = typeof Crafting !== 'undefined' ? (Crafting.RARITY_COLORS?.[item.rarity] || '#aaa') : '#aaa';
      return `<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid var(--bg3)">
        <div style="font-size:16px;width:22px;text-align:center">${item.icon || '📦'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._esc(item.name)}</div>
          <div style="font-size:10px;color:${rc}">${item.rarity || ''} · qty ${e.qty}</div>
        </div>
        <div style="font-size:12px;color:var(--green);font-weight:700;flex-shrink:0">${App.formatMoney(e.price)}</div>
        <button class="csr-toggle-btn" style="font-size:10px;padding:2px 5px;color:var(--red);border-color:var(--red);flex-shrink:0" onclick="Stores.delistItem('${storeId}','${ik}')">✕</button>
      </div>`;
    }).join('');

    return `<div style="border:1px solid var(--bg3);border-radius:8px;padding:10px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        ${this.renderLogo(store.logoPixels, 4)}
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${stype.icon} ${this._esc(store.storeName)}</div>
          <div style="font-size:11px;color:var(--text-dim)">${isFranchise ? '🏬 Franchise · ' : ''}${stype.label}</div>
        </div>
        <button class="csr-toggle-btn" style="font-size:11px;padding:4px 8px;flex-shrink:0" onclick="Stores.openLogoEditor('${storeId}')">🎨</button>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:12px;margin-bottom:8px">
        <span>💵 <strong style="color:var(--green)">${App.formatMoney(cash)}</strong></span>
        <span>⭐ <strong>${store.reputation || 0}</strong></span>
        <span>🔒 <strong>${store.securityLevel || 0}</strong></span>
        ${isProtected ? `<span style="color:var(--green)">🛡️ Protected</span>` : ''}
        ${isForSale ? `<span style="color:var(--gold)">💰 For Sale ${App.formatMoney(store.forSale.price)}</span>` : ''}
      </div>
      ${protectionPending ? `<div style="background:#1a2a1a;border:1px solid var(--green);border-radius:6px;padding:8px;margin-bottom:8px;font-size:12px">
        🛡️ Protection offered by <strong>${this._esc(store.protectedBy.providerName)}</strong> — ${store.protectedBy.fee > 0 ? 'One-time fee: ' + App.formatMoney(store.protectedBy.fee) : 'FREE'}
        <button class="company-buy-btn" style="width:100%;margin-top:6px" onclick="Stores.acceptProtection('${storeId}')">✅ Accept Protection</button>
      </div>` : ''}
      ${cash > 0 ? `<button class="company-buy-btn" style="width:100%;margin-bottom:8px" onclick="Stores.collectCash('${storeId}')">💵 Collect ${App.formatMoney(cash)}</button>` : ''}
      <div style="margin-bottom:8px">
        <div style="font-size:12px;font-weight:700;margin-bottom:4px">📦 Inventory (${itemKeys.length})</div>
        ${itemKeys.length ? itemRows : '<div style="font-size:11px;color:var(--text-dim)">No items listed yet.</div>'}
        <button class="csr-toggle-btn" style="width:100%;margin-top:6px;font-size:12px" onclick="Stores.openListItemModal('${storeId}')">+ List Item from Bag</button>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
        <button class="csr-toggle-btn" style="font-size:11px;flex:1" onclick="Stores.upgradeSecurity('${storeId}')">🔒 +10 Sec (${App.formatMoney(this.SEC_UPGRADE_COST)})</button>
        <button class="csr-toggle-btn" style="font-size:11px;flex:1" onclick="Stores.toggleFranchiseOffer('${storeId}')">${store.franchise?.isOffering ? '🏬 Remove Franchise' : '🏬 Offer Franchise'}</button>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
        ${isForSale
          ? `<button class="csr-toggle-btn" style="font-size:11px;flex:1;color:var(--red);border-color:var(--red)" onclick="Stores.delistStore('${storeId}')">❌ Delist Sale</button>`
          : `<button class="csr-toggle-btn" style="font-size:11px;flex:1;color:var(--gold);border-color:var(--gold)" onclick="Stores.listStoreForSale('${storeId}')">💰 Sell Store</button>`}
      </div>
      ${store.franchise?.isOffering ? `<div style="font-size:11px;color:var(--gold);margin-bottom:6px">🏬 Franchise: ${App.formatMoney(store.franchise.fee)} fee · ${store.franchise.royaltyPct}%/sale royalty</div>` : ''}
      <button class="csr-toggle-btn" style="color:var(--red);border-color:var(--red);width:100%;font-size:12px" onclick="Stores.closeStore('${storeId}')">⚠️ Close Store</button>
    </div>`;
  },

  // ─── BROWSE STORES (companies browse tab) ────────────────────────────────────

  renderBrowseStores() {
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    const all = Object.entries(this._stores);
    if (!all.length) return '<div style="font-size:12px;color:var(--text-dim);padding:12px 0;text-align:center">No stores open yet. Found a company to open one!</div>';

    const byInd = {};
    for (const [id, s] of all) (byInd[s.industry || 'tech'] = byInd[s.industry || 'tech'] || []).push([id, s]);

    let html = '';
    for (const [ind, stores] of Object.entries(byInd)) {
      const stype = this.STORE_TYPES[ind] || { icon: '🏪', label: 'Store' };
      html += `<div style="margin-bottom:14px"><div style="font-weight:700;font-size:13px;margin-bottom:6px;color:var(--text-dim)">${stype.icon} ${stype.label}s</div>`;
      for (const [id, s] of stores) html += this._renderBrowseCard(id, s, myUid);
      html += '</div>';
    }
    return html;
  },

  _renderBrowseCard(storeId, store, myUid) {
    const isOwner = store.ownerUid === myUid;
    const stype = this.STORE_TYPES[store.industry] || { icon: '🏪' };
    const inv = store.inventory || {};
    const itemEntries = Object.entries(inv);
    const cash = store.cashRegister || 0;
    const isProtected = store.protectedBy && !store.protectedBy.isPending;
    const hasFranchise = store.franchise?.isOffering && !isOwner;
    const isForSale = store.forSale && !isOwner;
    const isCopy = !!store.franchise?.parentStoreId;

    const itemCards = itemEntries.map(([ik, e]) => {
      const item = e.item || {};
      const rc = typeof Crafting !== 'undefined' ? (Crafting.RARITY_COLORS?.[item.rarity] || '#aaa') : '#aaa';
      return `<div style="background:var(--bg3);border-radius:8px;padding:8px;display:flex;flex-direction:column;align-items:center;gap:3px;width:90px;flex-shrink:0">
        <div style="font-size:26px">${item.icon || '📦'}</div>
        <div style="font-size:11px;font-weight:700;text-align:center;width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._esc(item.name)}</div>
        <div style="font-size:10px;color:${rc}">${item.rarity || ''}</div>
        <div style="font-size:10px;color:var(--text-dim)">×${e.qty}</div>
        <div style="font-size:12px;color:var(--green);font-weight:700">${App.formatMoney(e.price)}</div>
        ${!isOwner ? `<button class="company-buy-btn" style="font-size:11px;padding:3px 6px;width:100%" onclick="Stores.buyItem('${storeId}','${ik}')">Buy</button>` : ''}
      </div>`;
    }).join('');

    // Military store I own → can offer protection
    const myMilEntry = !isOwner && typeof Companies !== 'undefined'
      ? Object.entries(this._stores).find(([, s]) => s.ownerUid === myUid && s.industry === 'military')
      : null;

    return `<div style="background:var(--bg2);border:1px solid var(--bg3);border-radius:10px;padding:10px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        ${this.renderLogo(store.logoPixels, 5)}
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${stype.icon} ${this._esc(store.storeName)}</div>
          <div style="font-size:11px;color:var(--text-dim)">${this._esc(store.ownerName)} · ⭐${store.reputation || 0}${isProtected ? ' · 🛡️' : ''}${isCopy ? ' · 🏬 Franchise' : ''}</div>
          ${store.description ? `<div style="font-size:11px;color:var(--text-dim);font-style:italic">${this._esc(store.description)}</div>` : ''}
        </div>
      </div>
      ${itemEntries.length
        ? `<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch">${itemCards}</div>`
        : `<div style="font-size:12px;color:var(--text-dim);text-align:center;padding:8px 0">No items in stock</div>`}
      ${hasFranchise ? `<div style="margin-top:8px;background:var(--bg3);border-radius:6px;padding:8px">
        <div style="font-size:12px;font-weight:700">🏬 Franchise Available</div>
        <div style="font-size:11px;color:var(--text-dim)">License: ${App.formatMoney(store.franchise.fee)} · Royalty: ${store.franchise.royaltyPct}%/sale</div>
        <button class="csr-toggle-btn" style="font-size:11px;margin-top:4px" onclick="Stores.openBuyFranchiseModal('${storeId}')">Buy Franchise</button>
      </div>` : ''}
      ${isForSale ? `<div style="margin-top:8px;background:var(--bg3);border-radius:6px;padding:8px">
        <div style="font-size:12px;font-weight:700;color:var(--gold)">💰 For Sale — ${App.formatMoney(store.forSale.price)}</div>
        <div style="font-size:11px;color:var(--text-dim)">Buy the entire store + inventory ownership</div>
        <button class="company-buy-btn" style="width:100%;margin-top:6px" onclick="Stores.buyStore('${storeId}')">Buy Store</button>
      </div>` : ''}
      ${!isOwner ? `<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
        ${cash >= 500 ? `<button class="csr-toggle-btn" style="font-size:11px;color:var(--red);border-color:var(--red)" onclick="Stores.robStore('${storeId}')">🦹 Rob</button>` : ''}
        ${myMilEntry ? `<button class="csr-toggle-btn" style="font-size:11px;color:var(--green);border-color:var(--green)" onclick="Stores.offerProtection('${myMilEntry[0]}','${storeId}')">🛡️ Offer Protection</button>` : ''}
      </div>` : ''}
    </div>`;
  },
};
