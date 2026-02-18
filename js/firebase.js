// Firebase Multiplayer - Leaderboard, Trading, Chat, Profiles
const Firebase = {
  // === CONFIG ===
  config: {
    apiKey: 'AIzaSyBjMFWLOks_IfOi-xma3hBJnh_qVZBzt-Q',
    authDomain: 'retros-casino.firebaseapp.com',
    databaseURL: 'https://retros-casino-default-rtdb.firebaseio.com',
    projectId: 'retros-casino',
    storageBucket: 'retros-casino.firebasestorage.app',
    messagingSenderId: '843660779109',
    appId: '1:843660779109:web:2730bc041e9b26f5bdb08c',
  },

  // State
  uid: null,
  online: false,
  app: null,
  db: null,
  auth: null,
  leaderboardData: [],
  chatMessages: [],
  tradeListings: [],
  lastLeaderboardPush: 0,
  lastChatMessage: 0,
  chatListener: null,
  tradeListener: null,
  leaderboardListener: null,
  viewingProfile: null,
  connectionState: 'disconnected', // 'disconnected', 'connecting', 'connected'

  // === INIT ===
  init() {
    this._updateChatStatus('Connecting...');
    if (!this._hasConfig()) {
      this.online = false;
      this._updateChatStatus('No config');
      return;
    }
    try {
      if (typeof firebase === 'undefined') {
        this.online = false;
        this._updateChatStatus('SDK not loaded');
        return;
      }
      this.connectionState = 'connecting';
      if (!firebase.apps.length) {
        this.app = firebase.initializeApp(this.config);
      } else {
        this.app = firebase.apps[0];
      }
      this.db = firebase.database();
      this.auth = firebase.auth();
      this._signIn();
      // Monitor connection state
      this.db.ref('.info/connected').on('value', snap => {
        if (snap.val() === true) {
          this._updateChatStatus('Online');
        } else if (this.connectionState === 'connected') {
          this._updateChatStatus('Reconnecting...');
        }
      });
    } catch (e) {
      this.online = false;
      this.connectionState = 'disconnected';
      this._updateChatStatus('Error: ' + e.message);
    }
  },

  _hasConfig() {
    return this.config.apiKey && this.config.databaseURL && this.config.projectId;
  },

  isOnline() {
    return this.online && this.uid && this.db;
  },

  _updateChatStatus(text) {
    const el = document.getElementById('chat-status');
    if (el) {
      el.textContent = text;
      el.className = 'chat-status ' + (this.isOnline() ? 'chat-status-online' : 'chat-status-offline');
    }
    // Update leaderboard badge too
    const badge = document.getElementById('lb-online-badge');
    if (badge) {
      badge.textContent = this.isOnline() ? 'Online' : text;
      badge.className = 'lb-online-badge ' + (this.isOnline() ? 'lb-badge-online' : '');
    }
  },

  _signIn() {
    this._updateChatStatus('Signing in...');
    this.auth.signInAnonymously().then(cred => {
      this.uid = cred.user.uid;
      localStorage.setItem('retros_casino_uid', this.uid);
      this.online = true;
      this.connectionState = 'connected';
      this._updateChatStatus('Online');
      this._startListeners();
    }).catch(err => {
      this.online = false;
      this.connectionState = 'disconnected';
      this._updateChatStatus('Auth failed');
      console.error('Firebase auth error:', err.code, err.message);
    });
  },

  _startListeners() {
    this._listenLeaderboard();
    this._listenChat();
    this._listenTrades();
    // Push leaderboard every 60s
    setInterval(() => this.pushLeaderboard(), 60000);
    // Initial push
    setTimeout(() => this.pushLeaderboard(), 3000);
  },

  // === LEADERBOARD ===
  pushLeaderboard() {
    if (!this.isOnline()) return;
    const now = Date.now();
    if (now - this.lastLeaderboardPush < 55000) return;
    this.lastLeaderboardPush = now;

    const name = typeof Settings !== 'undefined' ? Settings.profile.name : 'Player';
    const avatar = typeof Settings !== 'undefined' ? Settings.avatars[Settings.profile.avatar] : '';
    const data = {
      name,
      avatar,
      balance: App.balance,
      totalEarned: App.totalEarned,
      rebirths: App.rebirth,
      vipLevel: App.rebirth,
      petCount: typeof Pets !== 'undefined' ? Pets.owned.filter(o => o).length : 0,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
    };
    this.db.ref('leaderboard/' + this.uid).set(data).catch(() => {});
  },

  _listenLeaderboard() {
    if (this.leaderboardListener) this.leaderboardListener();
    const ref = this.db.ref('leaderboard').orderByChild('totalEarned').limitToLast(50);
    this.leaderboardListener = ref.on('value', snap => {
      const data = snap.val() || {};
      this.leaderboardData = Object.entries(data)
        .map(([uid, d]) => ({ uid, ...d }))
        .sort((a, b) => (b.totalEarned || 0) - (a.totalEarned || 0));
      if (App.currentScreen === 'leaderboard') this.renderLeaderboard();
    });
  },

  // === CHAT ===
  sendChat(text) {
    if (!this.isOnline()) return;
    text = (text || '').trim().slice(0, 200);
    if (!text) return;

    // Rate limit: 3s
    const now = Date.now();
    if (now - this.lastChatMessage < 3000) return;
    this.lastChatMessage = now;

    const name = typeof Settings !== 'undefined' ? Settings.profile.name : 'Player';
    const avatar = typeof Settings !== 'undefined' ? Settings.avatars[Settings.profile.avatar] : '';
    const msg = {
      uid: this.uid,
      name,
      avatar,
      text,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
    };
    this.db.ref('chat').push(msg).catch(() => {});

    // Cleanup: keep last 50
    this.db.ref('chat').orderByChild('timestamp').limitToFirst(1).once('value', snap => {
      const count = this.chatMessages.length;
      if (count > 50) {
        snap.forEach(child => child.ref.remove());
      }
    });
  },

  _listenChat() {
    const ref = this.db.ref('chat').orderByChild('timestamp').limitToLast(50);
    ref.on('value', snap => {
      const data = snap.val() || {};
      this.chatMessages = Object.values(data).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      this._renderChatMessages();
    });
  },

  // === PET TRADING ===
  listPet(petId, price) {
    if (!this.isOnline()) return;
    const pet = Pets.pets[petId];
    if (!pet || !Pets.owned[petId]) return;
    // Can't trade mythics or easter eggs
    if (pet.rarity >= 5 || pet.easterEgg) return;
    if (price <= 0) return;

    const name = typeof Settings !== 'undefined' ? Settings.profile.name : 'Player';
    const listing = {
      sellerUid: this.uid,
      sellerName: name,
      petId,
      petName: pet.name,
      petRarity: pet.rarity,
      petLevel: Pets.levels[petId],
      price,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
    };

    const tradeRef = this.db.ref('trades').push();
    tradeRef.set(listing).then(() => {
      // Remove pet from owner
      Pets.owned[petId] = false;
      Pets.levels[petId] = 0;
      Pets.instanceIds[petId] = '';
      App.save();
      if (App.currentScreen === 'pets') Pets.render();
    }).catch(() => {});
  },

  buyTrade(tradeId, listing) {
    if (!this.isOnline()) return;
    if (listing.sellerUid === this.uid) return; // Can't buy own listing
    if (App.balance < listing.price) return;

    const tradeRef = this.db.ref('trades/' + tradeId);
    // Atomic check & remove
    tradeRef.transaction(current => {
      if (current === null) return; // Already bought
      return null; // Remove listing
    }, (error, committed) => {
      if (error || !committed) return;
      // Transfer
      App.addBalance(-listing.price);
      // Add balance to seller via leaderboard (simplified)
      // Give pet to buyer
      Pets.owned[listing.petId] = true;
      Pets.levels[listing.petId] = listing.petLevel || 1;
      Pets.instanceIds[listing.petId] = Pets.generateId();
      App.save();
      if (App.currentScreen === 'pets') Pets.render();
    });
  },

  _listenTrades() {
    const ref = this.db.ref('trades').orderByChild('price').limitToFirst(50);
    ref.on('value', snap => {
      const data = snap.val() || {};
      this.tradeListings = Object.entries(data)
        .map(([id, d]) => ({ id, ...d }))
        .sort((a, b) => a.price - b.price);
      if (App.currentScreen === 'pets' && Pets.activeTab === 'market') Pets.render();
    });
  },

  // === RENDERING ===
  renderLeaderboard() {
    const container = document.getElementById('leaderboard-content');
    if (!container) return;

    if (!this.isOnline()) {
      container.innerHTML = '<div class="lb-offline">Offline - Configure Firebase to enable multiplayer</div>';
      return;
    }

    if (this.leaderboardData.length === 0) {
      container.innerHTML = '<div class="lb-empty">No players yet. Play to join!</div>';
      return;
    }

    let html = '<div class="lb-list">';
    this.leaderboardData.forEach((entry, i) => {
      const isMe = entry.uid === this.uid;
      const rank = i + 1;
      const medal = rank === 1 ? '\u{1F947}' : rank === 2 ? '\u{1F948}' : rank === 3 ? '\u{1F949}' : '#' + rank;
      html += `<div class="lb-row ${isMe ? 'lb-me' : ''}" onclick="Firebase.showProfile('${entry.uid}')">
        <span class="lb-rank">${medal}</span>
        <span class="lb-avatar">${entry.avatar || ''}</span>
        <span class="lb-name">${this._escapeHtml(entry.name || 'Player')}</span>
        <span class="lb-earned">${App.formatMoney(entry.totalEarned || 0)}</span>
        <span class="lb-rebirths">R${entry.rebirths || 0}</span>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  },

  showProfile(uid) {
    const entry = this.leaderboardData.find(e => e.uid === uid);
    if (!entry) return;

    let modal = document.getElementById('profile-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'profile-modal';
      modal.className = 'profile-modal-overlay hidden';
      document.getElementById('app').appendChild(modal);
    }

    modal.innerHTML = `<div class="profile-modal-content">
      <div class="profile-modal-avatar">${entry.avatar || '\u{1F3B2}'}</div>
      <div class="profile-modal-name">${this._escapeHtml(entry.name || 'Player')}</div>
      <div class="profile-modal-stats">
        <div class="profile-stat"><span class="stat-label">Balance</span><span>${App.formatMoney(entry.balance || 0)}</span></div>
        <div class="profile-stat"><span class="stat-label">Total Earned</span><span>${App.formatMoney(entry.totalEarned || 0)}</span></div>
        <div class="profile-stat"><span class="stat-label">Rebirths</span><span>${entry.rebirths || 0}</span></div>
        <div class="profile-stat"><span class="stat-label">Pets</span><span>${entry.petCount || 0}</span></div>
      </div>
      <button class="game-btn" onclick="Firebase.closeProfile()" style="margin-top:12px">Close</button>
    </div>`;
    modal.classList.remove('hidden');
  },

  closeProfile() {
    const modal = document.getElementById('profile-modal');
    if (modal) modal.classList.add('hidden');
  },

  // === Chat Panel ===
  toggleChat() {
    const panel = document.getElementById('chat-panel');
    if (panel) panel.classList.toggle('chat-open');
  },

  _renderChatMessages() {
    const list = document.getElementById('chat-messages');
    if (!list) return;
    list.innerHTML = this.chatMessages.map(m => {
      const isMe = m.uid === this.uid;
      return `<div class="chat-msg ${isMe ? 'chat-me' : ''}">
        <span class="chat-avatar">${m.avatar || ''}</span>
        <span class="chat-name">${this._escapeHtml(m.name || 'Player')}</span>
        <span class="chat-text">${this._escapeHtml(m.text || '')}</span>
      </div>`;
    }).join('');
    list.scrollTop = list.scrollHeight;
  },

  submitChat() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    this.sendChat(input.value);
    input.value = '';
  },

  // === Pet Market Rendering (called from Pets) ===
  renderMarketTab() {
    if (!this.isOnline()) {
      return '<div class="lb-offline">Offline - Configure Firebase to enable pet trading</div>';
    }
    if (this.tradeListings.length === 0) {
      return '<div class="lb-empty">No pets listed. List your pets from the Collection tab!</div>';
    }
    let html = '<div class="market-list">';
    this.tradeListings.forEach(listing => {
      const pet = Pets.pets[listing.petId];
      if (!pet) return;
      const r = Pets.rarities[listing.petRarity || pet.rarity];
      const isMine = listing.sellerUid === this.uid;
      html += `<div class="market-item" style="border-color:${r.color}">
        <img src="${Pets.getPetImage(listing.petId)}" class="pet-pixel-img" alt="${listing.petName}">
        <div class="market-info">
          <div class="pet-card-name" style="color:${r.color}">${listing.petName}</div>
          <div class="pet-card-rarity" style="color:${r.color}">${r.name} Lv${listing.petLevel || 1}</div>
          <div class="market-seller">by ${this._escapeHtml(listing.sellerName || 'Player')}</div>
        </div>
        <div class="market-price">
          <div>${App.formatMoney(listing.price)}</div>
          ${isMine
            ? '<button class="stock-sell-btn" disabled>Your Listing</button>'
            : `<button class="stock-buy-btn" onclick="Firebase.buyTrade('${listing.id}',${JSON.stringify(listing).replace(/'/g, "\\'")})" ${App.balance >= listing.price ? '' : 'disabled'}>Buy</button>`
          }
        </div>
      </div>`;
    });
    html += '</div>';
    return html;
  },

  // Prompt to list a pet for sale
  promptListPet(petId) {
    if (!this.isOnline()) return;
    const pet = Pets.pets[petId];
    if (!pet || pet.rarity >= 5 || pet.easterEgg) return;

    let modal = document.getElementById('trade-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'trade-modal';
      modal.className = 'profile-modal-overlay hidden';
      document.getElementById('app').appendChild(modal);
    }
    const r = Pets.rarities[pet.rarity];
    modal.innerHTML = `<div class="profile-modal-content">
      <img src="${Pets.getPetImage(petId)}" class="pet-pixel-img" alt="${pet.name}">
      <div class="pet-card-name" style="color:${r.color}">${pet.name}</div>
      <div class="pet-card-rarity" style="color:${r.color}">${r.name} Lv${Pets.levels[petId]}</div>
      <label style="margin-top:12px;font-size:14px;font-weight:600">Price: $<input type="number" id="trade-price" value="${this._suggestPrice(petId)}" min="1" style="width:120px;background:var(--bg);border:1px solid var(--bg3);border-radius:6px;color:var(--green);font-size:16px;padding:6px 10px;font-weight:700"></label>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="game-btn" onclick="Firebase.confirmListPet(${petId})">List for Sale</button>
        <button class="game-btn" style="background:var(--bg3);color:var(--text)" onclick="Firebase.closeListModal()">Cancel</button>
      </div>
    </div>`;
    modal.classList.remove('hidden');
  },

  _suggestPrice(petId) {
    const pet = Pets.pets[petId];
    const basePrices = [1000, 5000, 25000, 100000, 500000, 1000000];
    return basePrices[pet.rarity] || 10000;
  },

  confirmListPet(petId) {
    const input = document.getElementById('trade-price');
    const price = parseFloat(input?.value) || 0;
    if (price <= 0) return;
    this.listPet(petId, price);
    this.closeListModal();
  },

  closeListModal() {
    const modal = document.getElementById('trade-modal');
    if (modal) modal.classList.add('hidden');
  },

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
};
