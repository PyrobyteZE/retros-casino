// Auction House — list items, cars, and cash prizes for auction
const Auction = {
  _auctions: {},       // { [id]: auction record }
  _myPrizes: {},       // { [auctionId]: prize }
  _initialized: false,
  _auctionsListener: null,
  _prizesListener: null,
  _tab: 'browse',      // 'browse' | 'mine' | 'list'
  _listType: 'cash',   // 'cash' | 'item' | 'car' | 'card'
  _endCheckTimer: null,

  get _db() { return typeof Firebase !== 'undefined' && Firebase.isOnline() ? Firebase.db : null; },
  get _uid() { return typeof Firebase !== 'undefined' ? Firebase.uid : null; },
  get _name() { return typeof Settings !== 'undefined' ? Settings.profile.name : 'Player'; },

  init() {
    const el = document.getElementById('auction-content');
    if (!el) return;
    if (!this._db) { this._renderOffline(); return; }
    if (!this._initialized) {
      this._startListeners();
      this._initialized = true;
    } else {
      this._render();
    }
  },

  _startListeners() {
    if (!this._db) return;
    // All auctions
    this._db.ref('auctionHouse').orderByChild('endsAt').limitToLast(50).on('value', snap => {
      this._auctions = snap.val() || {};
      this._render();
      this._scheduleEndCheck();
    });
    // My prizes
    if (this._uid) {
      this._db.ref('auctionPrizes/' + this._uid).on('value', snap => {
        this._myPrizes = snap.val() || {};
        this._render();
      });
    }
  },

  _scheduleEndCheck() {
    if (this._endCheckTimer) clearTimeout(this._endCheckTimer);
    const now = Date.now();
    const expired = Object.values(this._auctions)
      .filter(a => !a.claimed && a.endsAt < now);
    if (expired.length) {
      expired.forEach(a => this._tryEndAuction(a.id));
    }
    // Re-check in 30s
    this._endCheckTimer = setTimeout(() => this._scheduleEndCheck(), 30000);
  },

  async _tryEndAuction(id) {
    if (!this._db) return;
    const ref = this._db.ref('auctionHouse/' + id);
    const txResult = await ref.transaction(current => {
      if (!current || current.claimed || Date.now() < current.endsAt) return undefined;
      return { ...current, claimed: true };
    });
    if (!txResult.committed) return;

    const auction = txResult.snapshot.val();
    if (!auction) return;

    if (auction.currentBidderUid) {
      // Bidder gets the goods
      const winnerPrize = { type: auction.type, description: auction.title, auctionId: id };
      if (auction.type === 'cash') winnerPrize.amount = auction.amount;
      else if (auction.type === 'item') winnerPrize.itemData = auction.itemData;
      else if (auction.type === 'car') winnerPrize.carData = auction.carData;
      else if (auction.type === 'card') winnerPrize.cardData = auction.cardData;
      await this._db.ref('auctionPrizes/' + auction.currentBidderUid + '/' + id).set(winnerPrize);

      // Seller gets the bid amount
      if (auction.currentBid > 0) {
        await this._db.ref('auctionPrizes/' + auction.sellerUid + '/' + id + '_payment').set({
          type: 'cash', amount: auction.currentBid,
          description: 'Sale: ' + auction.title, auctionId: id,
        });
      }

      // Announce
      Firebase.pushSystemAnnouncement('🔨 SOLD! "' + auction.title + '" — ' + auction.currentBidderName + ' won for ' + App.formatMoney(auction.currentBid) + '!');
    } else {
      // No bids — return to seller
      const returnPrize = { type: auction.type, description: 'Unsold: ' + auction.title, auctionId: id };
      if (auction.type === 'cash') returnPrize.amount = auction.amount;
      else if (auction.type === 'item') returnPrize.itemData = auction.itemData;
      else if (auction.type === 'car') returnPrize.carData = auction.carData;
      else if (auction.type === 'card') returnPrize.cardData = auction.cardData;
      await this._db.ref('auctionPrizes/' + auction.sellerUid + '/' + id + '_return').set(returnPrize);
    }
  },

  async claimPrize(prizeKey) {
    if (!this._db || !this._uid) return;
    const prize = this._myPrizes[prizeKey];
    if (!prize) return;

    await this._db.ref('auctionPrizes/' + this._uid + '/' + prizeKey).remove();

    if (prize.type === 'cash' || !prize.type) {
      App.addBalance(prize.amount || 0);
      App.save();
      Toast.show('🔨 Auction prize: +' + App.formatMoney(prize.amount || 0), '#00e676', 6000);
    } else if (prize.type === 'item' && prize.itemData) {
      if (typeof Crafting !== 'undefined') {
        Crafting._inventory.push({ ...prize.itemData, id: Date.now() + Math.random() });
        App.save();
        Toast.show('🔨 Item received: ' + prize.itemData.name, '#bb86fc', 6000);
      }
    } else if (prize.type === 'car' && prize.carData) {
      if (typeof Cars !== 'undefined') {
        Cars._garage.push({ ...prize.carData, id: Date.now() + Math.random() });
        App.save();
        Toast.show('🔨 Car received: ' + prize.carData.name, '#03dac6', 6000);
      }
    } else if (prize.type === 'card' && prize.cardData) {
      if (typeof Cards !== 'undefined') {
        const card = { ...prize.cardData };
        Cards._cards[card.id] = card;
        if (Cards._db && Cards._uid) {
          Cards._db.ref('playerCards/' + Cards._uid + '/' + card.id).set(card);
        }
        App.save();
        if (App.currentScreen === 'cards') Cards._render();
        Toast.show('🃏 Card received: ' + card.name + ' (' + card.rarity + ')!', Cards.RARITY_COLORS[card.rarity] || '#bb86fc', 6000);
      }
    }
  },

  claimAll() {
    Object.keys(this._myPrizes).forEach(k => this.claimPrize(k));
  },

  async bid(id, bidStr) {
    const auction = this._auctions[id];
    if (!auction) return;
    const amount = App.parseAmount(bidStr || document.getElementById('bid-input-' + id)?.value);
    if (isNaN(amount) || amount <= 0) { Toast.show('Invalid bid amount', '#f44336', 3000); return; }
    if (amount <= auction.currentBid) {
      Toast.show('Bid must be higher than current: ' + App.formatMoney(auction.currentBid), '#f44336', 3000);
      return;
    }
    if (App.balance < amount) { Toast.show('Not enough funds!', '#f44336', 3000); return; }
    if (auction.sellerUid === this._uid) { Toast.show("Can't bid on your own auction", '#f44336', 3000); return; }
    if (Date.now() > auction.endsAt) { Toast.show('Auction has ended', '#f44336', 3000); return; }

    // Deduct immediately (refund previous bidder if outbid)
    App.addBalance(-amount);
    App.save();

    const ref = this._db.ref('auctionHouse/' + id);
    const txResult = await ref.transaction(current => {
      if (!current || current.claimed) return undefined;
      if (Date.now() > current.endsAt) return undefined;
      if (amount <= current.currentBid) return undefined;
      const newAuction = { ...current, currentBid: amount, currentBidderUid: this._uid, currentBidderName: this._name };
      // Anti-snipe: extend by 5 min if bid within last 5 min
      if (current.endsAt - Date.now() < 5 * 60000) {
        newAuction.endsAt = Date.now() + 5 * 60000;
      }
      return newAuction;
    });

    if (!txResult.committed) {
      // Refund on abort
      App.addBalance(amount);
      App.save();
      Toast.show('Bid failed — try again', '#f44336', 3000);
      return;
    }

    // Refund outbid previous bidder
    const prev = txResult.snapshot.val();
    const prevBidder = auction.currentBidderUid;
    const prevBid = auction.currentBid;
    if (prevBidder && prevBidder !== this._uid && prevBid > 0) {
      this._db.ref('auctionPrizes/' + prevBidder + '/refund_' + id).set({
        type: 'cash', amount: prevBid,
        description: 'Outbid refund: ' + auction.title, auctionId: id,
      });
    }

    Toast.show('🔨 Bid placed: ' + App.formatMoney(amount), '#00e676', 3000);
  },

  listCash() {
    const titleEl = document.getElementById('list-title');
    const priceEl = document.getElementById('list-start-bid');
    const amtEl = document.getElementById('list-cash-amount');
    const durEl = document.getElementById('list-duration');
    if (!titleEl || !priceEl || !durEl) return;

    const title = titleEl.value.trim();
    const startBid = App.parseAmount(priceEl.value);
    const duration = parseInt(durEl.value) || 1;
    const amount = amtEl ? App.parseAmount(amtEl.value) : 0;

    if (!title) { Toast.show('Enter a title', '#f44336', 3000); return; }
    if (isNaN(startBid) || startBid < 1) { Toast.show('Enter a valid starting bid', '#f44336', 3000); return; }
    if (this._listType === 'cash' && (isNaN(amount) || amount < 1)) { Toast.show('Enter amount to auction', '#f44336', 3000); return; }
    if (this._listType === 'cash' && App.balance < amount) { Toast.show('Not enough funds!', '#f44336', 3000); return; }

    if (this._listType === 'cash') App.addBalance(-amount);
    App.save();

    const id = 'a_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const record = {
      id, type: this._listType, title,
      sellerUid: this._uid, sellerName: this._name,
      startBid, currentBid: startBid,
      currentBidderUid: null, currentBidderName: null,
      endsAt: Date.now() + duration * 3600000,
      createdAt: Date.now(), claimed: false,
    };
    if (this._listType === 'cash') record.amount = amount;

    this._db.ref('auctionHouse/' + id).set(record);
    this._tab = 'mine';
    Toast.show('🔨 Auction listed!', '#00e676', 3000);
    this._render();
  },

  listItem(itemId) {
    const priceEl = document.getElementById('list-item-start-bid');
    const durEl = document.getElementById('list-item-duration');
    if (!priceEl || !durEl) return;
    const startBid = App.parseAmount(priceEl.value);
    const duration = parseInt(durEl.value) || 1;
    if (isNaN(startBid) || startBid < 1) { Toast.show('Enter a valid starting bid', '#f44336', 3000); return; }
    if (!this._db) return;

    const inv = typeof Crafting !== 'undefined' ? Crafting._inventory : [];
    const idx = inv.findIndex(i => i.id == itemId);
    if (idx < 0) { Toast.show('Item not found', '#f44336', 3000); return; }
    const item = inv[idx];
    inv.splice(idx, 1);
    App.save();

    const id = 'a_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    this._db.ref('auctionHouse/' + id).set({
      id, type: 'item', title: item.name || 'Item',
      sellerUid: this._uid, sellerName: this._name,
      startBid, currentBid: startBid,
      currentBidderUid: null, currentBidderName: null,
      endsAt: Date.now() + duration * 3600000,
      createdAt: Date.now(), claimed: false,
      itemData: { ...item },
    });
    this._tab = 'mine';
    Toast.show('🔨 Item listed for auction!', '#00e676', 3000);
    this._render();
  },

  listCar(carId) {
    const priceEl = document.getElementById('list-car-start-bid');
    const durEl = document.getElementById('list-car-duration');
    if (!priceEl || !durEl) return;
    const startBid = App.parseAmount(priceEl.value);
    const duration = parseInt(durEl.value) || 1;
    if (isNaN(startBid) || startBid < 1) { Toast.show('Enter a valid starting bid', '#f44336', 3000); return; }
    if (!this._db) return;

    const garage = typeof Cars !== 'undefined' ? Cars._garage : [];
    const idx = garage.findIndex(c => c.id == carId);
    if (idx < 0) { Toast.show('Car not found', '#f44336', 3000); return; }
    const car = garage[idx];
    garage.splice(idx, 1);
    App.save();

    const id = 'a_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    this._db.ref('auctionHouse/' + id).set({
      id, type: 'car', title: car.name || 'Car',
      sellerUid: this._uid, sellerName: this._name,
      startBid, currentBid: startBid,
      currentBidderUid: null, currentBidderName: null,
      endsAt: Date.now() + duration * 3600000,
      createdAt: Date.now(), claimed: false,
      carData: { ...car },
    });
    this._tab = 'mine';
    Toast.show('🔨 Car listed for auction!', '#03dac6', 3000);
    this._render();
  },

  listCard(cardId) {
    const priceEl = document.getElementById('list-card-start-bid');
    const durEl = document.getElementById('list-card-duration');
    if (!priceEl || !durEl) return;
    const startBid = App.parseAmount(priceEl.value);
    const duration = parseInt(durEl.value) || 1;
    if (isNaN(startBid) || startBid < 1) { Toast.show('Enter a valid starting bid', '#f44336', 3000); return; }
    if (!this._db) return;

    const card = typeof Cards !== 'undefined' ? Cards._cards[cardId] : null;
    if (!card) { Toast.show('Card not found', '#f44336', 3000); return; }

    // Unequip if equipped
    if (typeof Cards !== 'undefined' && Cards._equipped) {
      Cards._equipped = Cards._equipped.map(id => id === cardId ? null : id);
    }
    delete Cards._cards[cardId];
    Cards._db.ref('playerCards/' + Cards._uid + '/' + cardId).remove();
    App.save();

    const id = 'a_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    this._db.ref('auctionHouse/' + id).set({
      id, type: 'card', title: card.name + ' (' + card.rarity + ')',
      sellerUid: this._uid, sellerName: this._name,
      startBid, currentBid: startBid,
      currentBidderUid: null, currentBidderName: null,
      endsAt: Date.now() + duration * 3600000,
      createdAt: Date.now(), claimed: false,
      cardData: { ...card },
    });
    this._tab = 'mine';
    if (typeof Cards !== 'undefined') Cards._render();
    Toast.show('🃏 Card listed for auction!', '#bb86fc', 3000);
    this._render();
  },

  cancelAuction(id) {
    const a = this._auctions[id];
    if (!a || a.sellerUid !== this._uid) return;
    if (a.currentBidderUid) { Toast.show("Can't cancel — has bids", '#f44336', 3000); return; }
    if (!confirm('Cancel this auction?')) return;
    this._db.ref('auctionHouse/' + id).update({ claimed: true });
    // Return goods to seller
    const returnPrize = { type: a.type, description: 'Cancelled: ' + a.title, auctionId: id };
    if (a.type === 'cash') returnPrize.amount = a.amount;
    else if (a.type === 'item') returnPrize.itemData = a.itemData;
    else if (a.type === 'car') returnPrize.carData = a.carData;
    else if (a.type === 'card') returnPrize.cardData = a.cardData;
    this._db.ref('auctionPrizes/' + this._uid + '/' + id + '_cancel').set(returnPrize);
    Toast.show('Auction cancelled', '#f39c12', 3000);
  },

  _render() {
    const el = document.getElementById('auction-content');
    if (!el) return;
    const focused = document.activeElement;
    if (focused && el.contains(focused) && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA')) return;
    el.innerHTML = this._buildHtml();
  },

  _renderOffline() {
    const el = document.getElementById('auction-content');
    if (el) el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim)">🔌 Sign in online to use the Auction House.</div>';
  },

  _buildHtml() {
    const hasPrizes = Object.keys(this._myPrizes).length > 0;
    const tabs = `
      <div class="auction-tabs">
        <button class="auction-tab-btn${this._tab === 'browse' ? ' active' : ''}" onclick="Auction._tab='browse';Auction._render()">🔨 Browse</button>
        <button class="auction-tab-btn${this._tab === 'mine' ? ' active' : ''}" onclick="Auction._tab='mine';Auction._render()">📦 My Auctions</button>
        <button class="auction-tab-btn${this._tab === 'list' ? ' active' : ''}" onclick="Auction._tab='list';Auction._render()">➕ List</button>
        ${hasPrizes ? `<button class="auction-tab-btn auction-tab-prizes" onclick="Auction._tab='prizes';Auction._render()">🎁 Prizes (${Object.keys(this._myPrizes).length})</button>` : ''}
      </div>`;

    let body = '';
    if (this._tab === 'browse') body = this._renderBrowse();
    else if (this._tab === 'mine') body = this._renderMine();
    else if (this._tab === 'list') body = this._renderList();
    else if (this._tab === 'prizes') body = this._renderPrizes();

    return tabs + body;
  },

  _renderBrowse() {
    const now = Date.now();
    const active = Object.values(this._auctions)
      .filter(a => !a.claimed && a.endsAt > now)
      .sort((a, b) => a.endsAt - b.endsAt);

    if (!active.length) return '<div class="auction-empty">No active auctions. Be the first to list something!</div>';

    return '<div class="auction-list">' + active.map(a => this._renderAuctionCard(a)).join('') + '</div>';
  },

  _renderMine() {
    const mine = Object.values(this._auctions)
      .filter(a => a.sellerUid === this._uid)
      .sort((a, b) => b.createdAt - a.createdAt);
    if (!mine.length) return '<div class="auction-empty">You have no active auctions.</div>';
    return '<div class="auction-list">' + mine.map(a => this._renderAuctionCard(a, true)).join('') + '</div>';
  },

  _renderPrizes() {
    const prizes = Object.entries(this._myPrizes);
    if (!prizes.length) return '<div class="auction-empty">No pending prizes.</div>';
    const html = prizes.map(([key, p]) => `
      <div class="auction-prize-card">
        <div class="auction-prize-icon">${p.type === 'car' ? '🚗' : p.type === 'item' ? '🎒' : p.type === 'card' ? '🃏' : '💵'}</div>
        <div class="auction-prize-info">
          <div class="auction-prize-desc">${this._esc(p.description || 'Prize')}</div>
          ${p.amount ? '<div class="auction-prize-amount">' + App.formatMoney(p.amount) + '</div>' : ''}
          ${p.itemData ? '<div class="auction-prize-amount">' + this._esc(p.itemData.name || 'Item') + '</div>' : ''}
          ${p.carData ? '<div class="auction-prize-amount">' + this._esc(p.carData.name || 'Car') + '</div>' : ''}
          ${p.cardData ? '<div class="auction-prize-amount">' + this._esc(p.cardData.name || 'Card') + ' (' + this._esc(p.cardData.rarity || '') + ')</div>' : ''}
        </div>
        <button class="auction-claim-btn" onclick="Auction.claimPrize('${this._esc(key)}')">CLAIM</button>
      </div>`).join('');
    return `<div class="auction-prizes-list">${html}<button class="auction-claim-all-btn" onclick="Auction.claimAll()">Claim All</button></div>`;
  },

  _renderAuctionCard(a, isMine = false) {
    const now = Date.now();
    const ended = a.claimed || a.endsAt <= now;
    const timeLeft = ended ? 'Ended' : this._msToHuman(a.endsAt - now);
    const typeIcon = a.type === 'car' ? '🚗' : a.type === 'item' ? '🎒' : a.type === 'card' ? '🃏' : '💵';
    const isMyBid = a.currentBidderUid === this._uid;
    const canBid = !ended && !isMine && !isMyBid;

    const bidRow = canBid ? `
      <div class="auction-bid-row">
        <input id="bid-input-${a.id}" type="text" class="sh-input" placeholder="Bid amount">
        <span class="sh-preview" style="display:none"></span>
        <button class="auction-bid-btn" onclick="Auction.bid('${a.id}', document.getElementById('bid-input-${a.id}').value)">Bid</button>
      </div>` : '';

    const cancelBtn = isMine && !a.currentBidderUid && !ended
      ? `<button class="auction-cancel-btn" onclick="Auction.cancelAuction('${a.id}')">Cancel</button>` : '';

    return `
      <div class="auction-card${ended ? ' auction-ended' : ''}${isMyBid ? ' auction-winning' : ''}">
        <div class="auction-card-header">
          <span class="auction-type-icon">${typeIcon}</span>
          <span class="auction-title">${this._esc(a.title)}</span>
          <span class="auction-time${ended ? ' auction-time-ended' : ''}">${timeLeft}</span>
        </div>
        <div class="auction-card-body">
          ${a.type === 'card' && a.cardData ? `<div class="auction-card-preview" style="font-size:13px;margin-bottom:4px">
            <span style="font-size:20px;margin-right:6px">${a.cardData.art || '🃏'}</span>
            <span style="color:${(typeof Cards !== 'undefined' && Cards.RARITY_COLORS[a.cardData.rarity]) || '#bb86fc'};font-weight:700">${this._esc(a.cardData.rarity?.toUpperCase() || '')} #${a.cardData.serial || ''}</span>
            <span style="color:var(--text-dim);margin-left:6px">+${Math.round((a.cardData.statValue || 0) * 100)}% ${(typeof Cards !== 'undefined' && Cards.STAT_LABELS[a.cardData.statType]) || a.cardData.statType || ''}</span>
          </div>` : ''}
          <div class="auction-bid-info">
            <span class="auction-label">Current bid</span>
            <span class="auction-bid-val">${App.formatMoney(a.currentBid)}</span>
          </div>
          ${a.currentBidderName ? `<div class="auction-bidder">Leading: ${this._esc(a.currentBidderName)}${isMyBid ? ' (you)' : ''}</div>` : '<div class="auction-bidder">No bids yet</div>'}
          <div class="auction-seller">Listed by ${this._esc(a.sellerName)}</div>
        </div>
        ${bidRow}
        ${cancelBtn}
      </div>`;
  },

  _renderList() {
    const durOptions = [1, 3, 6, 12, 24].map(h => `<option value="${h}">${h}h</option>`).join('');

    const typeTabs = `
      <div class="auction-list-type-tabs">
        <button class="auction-list-type${this._listType === 'cash' ? ' active' : ''}" onclick="Auction._listType='cash';Auction._render()">💵 Cash</button>
        <button class="auction-list-type${this._listType === 'item' ? ' active' : ''}" onclick="Auction._listType='item';Auction._render()">🎒 Item</button>
        <button class="auction-list-type${this._listType === 'car' ? ' active' : ''}" onclick="Auction._listType='car';Auction._render()">🚗 Car</button>
        <button class="auction-list-type${this._listType === 'card' ? ' active' : ''}" onclick="Auction._listType='card';Auction._render()">🃏 Card</button>
      </div>`;

    if (this._listType === 'cash') {
      return typeTabs + `
        <div class="auction-list-form">
          <div class="auction-list-field"><label>Auction Title</label><input id="list-title" type="text" class="sh-input" placeholder="What are you auctioning?"></div>
          <div class="auction-list-field"><label>Cash Amount</label><input id="list-cash-amount" type="text" class="sh-input" placeholder="e.g. 100m"><span class="sh-preview" style="display:none"></span></div>
          <div class="auction-list-field"><label>Starting Bid</label><input id="list-start-bid" type="text" class="sh-input" placeholder="e.g. 10m"><span class="sh-preview" style="display:none"></span></div>
          <div class="auction-list-field"><label>Duration</label><select id="list-duration" class="sh-input">${durOptions}</select></div>
          <button class="auction-list-btn" onclick="Auction.listCash()">List Auction</button>
        </div>`;
    }

    if (this._listType === 'item') {
      const inv = typeof Crafting !== 'undefined' ? Crafting._inventory : [];
      if (!inv.length) return typeTabs + '<div class="auction-empty">No items in inventory to list.</div>';
      const itemOpts = inv.map(item => `<option value="${item.id}">${this._esc(item.name || 'Item')}</option>`).join('');
      return typeTabs + `
        <div class="auction-list-form">
          <div class="auction-list-field"><label>Select Item</label><select id="list-item-select" class="sh-input">${itemOpts}</select></div>
          <div class="auction-list-field"><label>Starting Bid</label><input id="list-item-start-bid" type="text" class="sh-input" placeholder="e.g. 50m"><span class="sh-preview" style="display:none"></span></div>
          <div class="auction-list-field"><label>Duration</label><select id="list-item-duration" class="sh-input">${durOptions}</select></div>
          <button class="auction-list-btn" onclick="Auction.listItem(document.getElementById('list-item-select').value)">List Item</button>
        </div>`;
    }

    if (this._listType === 'car') {
      const garage = typeof Cars !== 'undefined' ? Cars._garage : [];
      if (!garage.length) return typeTabs + '<div class="auction-empty">No cars in garage to list.</div>';
      const carOpts = garage.map(car => `<option value="${car.id}">${this._esc(car.name || 'Car')}</option>`).join('');
      return typeTabs + `
        <div class="auction-list-form">
          <div class="auction-list-field"><label>Select Car</label><select id="list-car-select" class="sh-input">${carOpts}</select></div>
          <div class="auction-list-field"><label>Starting Bid</label><input id="list-car-start-bid" type="text" class="sh-input" placeholder="e.g. 1b"><span class="sh-preview" style="display:none"></span></div>
          <div class="auction-list-field"><label>Duration</label><select id="list-car-duration" class="sh-input">${durOptions}</select></div>
          <button class="auction-list-btn" onclick="Auction.listCar(document.getElementById('list-car-select').value)">List Car</button>
        </div>`;
    }

    if (this._listType === 'card') {
      const allCards = typeof Cards !== 'undefined' ? Object.values(Cards._cards) : [];
      if (!allCards.length) return typeTabs + '<div class="auction-empty">No cards in collection to list.</div>';
      const rarityColor = c => (typeof Cards !== 'undefined' && Cards.RARITY_COLORS[c]) || '#9e9e9e';
      const statLabel = s => (typeof Cards !== 'undefined' && Cards.STAT_LABELS[s]) || s;
      const cardOpts = allCards
        .sort((a, b) => (Cards.RARITIES.indexOf(b.rarity) - Cards.RARITIES.indexOf(a.rarity)))
        .map(c => `<option value="${c.id}">${c.art} ${this._esc(c.name)} — ${c.rarity} +${Math.round(c.statValue * 100)}% ${statLabel(c.statType)}</option>`)
        .join('');
      return typeTabs + `
        <div class="auction-list-form">
          <div class="auction-list-field"><label>Select Card</label><select id="list-card-select" class="sh-input">${cardOpts}</select></div>
          <div class="auction-list-field"><label>Starting Bid</label><input id="list-card-start-bid" type="text" class="sh-input" placeholder="e.g. 5m"><span class="sh-preview" style="display:none"></span></div>
          <div class="auction-list-field"><label>Duration</label><select id="list-card-duration" class="sh-input">${durOptions}</select></div>
          <button class="auction-list-btn" onclick="Auction.listCard(document.getElementById('list-card-select').value)">List Card</button>
        </div>`;
    }

    return typeTabs;
  },

  _msToHuman(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (h > 0) return h + 'h ' + m + 'm';
    if (m > 0) return m + 'm ' + s + 's';
    return s + 's';
  },

  _esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },
};
