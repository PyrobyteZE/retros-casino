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
  connectionState: 'disconnected',
  // Name registry cache { nameLower: { uid, displayName, claimedAt } }
  _registeredNames: {},
  _registeredNamesLastFetch: 0,
  // Per-tab session ID (unique per browser tab for authority + PvP)
  _sessionId: Math.random().toString(36).slice(2) + Date.now().toString(36),
  // Stock/Crypto sync
  _isStockAuthority: false,
  _isCryptoAuthority: false,
  _stockAuthorityInterval: null,
  _cryptoAuthorityInterval: null,
  _lastStockCmdTs: 0,
  _lastCryptoCmdTs: 0,
  _chatUnreadCount: 0,

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
    } catch (e) {
      this.online = false;
      this.connectionState = 'disconnected';
      this._updateChatStatus('Error: ' + e.message);
      console.error('Firebase init error:', e);
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
      console.log('Firebase: signed in as', this.uid);
      this._setupPresence();
      this._startListeners();
      // Auto-claim current name on sign-in (migration)
      const currentName = typeof Settings !== 'undefined' ? Settings.profile.name : null;
      if (currentName && currentName !== 'Player') {
        this.checkAndClaimName(currentName, null, () => {});
      }
      // Refresh name registry every 5 min
      setInterval(() => this._fetchRegisteredNames(), 300000);
      this._fetchRegisteredNames();
    }).catch(err => {
      this.online = false;
      this.connectionState = 'disconnected';
      this._updateChatStatus('Auth failed: ' + err.code);
      console.error('Firebase auth error:', err.code, err.message);
    });
  },

  _startListeners() {
    this._listenLeaderboard();
    this._listenChat();
    this._listenTrades();
    this._listenPvpFlips();
    // Monitor connection
    this.db.ref('.info/connected').on('value', snap => {
      if (snap.val() === true) {
        this._updateChatStatus('Online');
        this._setupPresence(); // Ensure presence is set up on reconnect
      } else if (this.connectionState === 'connected') {
        this._updateChatStatus('Reconnecting...');
      }
    });
    // Listen for synced stock news
    this._listenStockNews();
    // Stock & crypto price sync
    this._listenStockPrices();
    this._listenCryptoPrices();
    this._tryClaimStockAuthority();
    this._tryClaimCryptoAuthority();
    this._stockAuthorityInterval = setInterval(() => this._tryClaimStockAuthority(), 30000);
    this._cryptoAuthorityInterval = setInterval(() => this._tryClaimCryptoAuthority(), 30000);
    // Presence listener
    this._listenPresence(); // Re-add presence listener
    // Push leaderboard every 60s
    setInterval(() => this.pushLeaderboard(), 60000);
    // Initial push after auth (no throttle on first push)
    this.lastLeaderboardPush = 0;
    this.pushLeaderboard();
    // Init Firebase-dependent features in other modules
    if (typeof Stocks !== 'undefined') Stocks._initFirebaseFeatures();
    if (typeof Loans !== 'undefined' && Loans._counterLoan && Loans._counterLoan.amount > 0) {
      Loans._startCounterLoanTimer();
    }
  },

  // === PRESENCE ===
  _setupPresence() {
    if (!this.isOnline()) return;
    const name = typeof Settings !== 'undefined' ? Settings.profile.name : 'Player';
    const avatar = typeof Settings !== 'undefined' ? Settings.avatars[Settings.profile.avatar] : '';
    const ref = this.db.ref('presence/' + this.uid);
    ref.set({
      name,
      avatar,
      sessionId: this._sessionId,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
    });
    ref.onDisconnect().remove();
  },

  _listenPresence() {
    this.db.ref('presence').on('value', snap => {
      const data = snap.val() || {};
      this.onlinePlayers = data;
      this.onlineCount = Object.keys(data).length;
      this._updateOnlineCount();
    });
  },

  _updateOnlineCount() {
    const badge = document.getElementById('lb-online-badge');
    if (badge) {
      if (this.isOnline()) {
        badge.textContent = this.onlineCount + ' Player' + (this.onlineCount !== 1 ? 's' : '') + ' Online';
        badge.className = 'lb-online-badge lb-badge-online';
      } else {
        badge.textContent = 'Offline';
        badge.className = 'lb-online-badge';
      }
    }
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
    this.db.ref('leaderboard/' + this.uid).set(data).then(() => {
      console.log('Firebase: leaderboard pushed');
    }).catch(err => {
      console.error('Firebase leaderboard write error:', err.code, err.message);
      this._updateChatStatus('DB write denied');
    });
  },

  _listenLeaderboard() {
    if (this.leaderboardListener) this.leaderboardListener();
    const ref = this.db.ref('leaderboard').orderByChild('totalEarned').limitToLast(50);
    this.leaderboardListener = ref.on('value', snap => {
      const data = snap.val() || {};
      this.leaderboardData = Object.entries(data)
        .map(([uid, d]) => ({ uid, ...d }))
        .sort((a, b) => (b.totalEarned || 0) - (a.totalEarned || 0));
      console.log('Firebase: leaderboard updated,', this.leaderboardData.length, 'players');
      if (App.currentScreen === 'leaderboard') this.renderLeaderboard();
    }, err => {
      console.error('Firebase leaderboard listen error:', err.code, err.message);
      this._updateChatStatus('DB read denied');
    });
  },

  // === CHAT ===
  sendChat(text) {
    if (!this.isOnline()) {
      console.warn('Firebase: chat send failed - not online');
      return;
    }
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
    this.db.ref('chat').push(msg).then(() => {
      console.log('Firebase: chat message sent');
    }).catch(err => {
      console.error('Firebase chat write error:', err.code, err.message);
    });

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
      const prevCount = this.chatMessages.length;
      this.chatMessages = Object.values(data).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      console.log('Firebase: chat updated,', this.chatMessages.length, 'messages');
      this._renderChatMessages();
      const panel = document.getElementById('chat-panel');
      if (this.chatMessages.length > prevCount && panel && !panel.classList.contains('chat-open')) {
        this._showChatUnread();
      }
    }, err => {
      console.error('Firebase chat listen error:', err.code, err.message);
    });
  },

  // === STOCK NEWS (synced to all players) ===
  pushStockNews(text, good) {
    if (!this.isOnline()) return;
    this.db.ref('stockNews').push({
      text,
      good: !!good,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
    }).catch(err => console.error('Firebase stockNews write error:', err));
  },

  _listenStockNews() {
    this.db.ref('stockNews').orderByChild('timestamp').limitToLast(10).on('child_added', snap => {
      const news = snap.val();
      if (!news || !news.text) return;
      // Only show news from last 5 minutes
      if (news.timestamp && Date.now() - news.timestamp > 300000) return;
      if (typeof Stocks !== 'undefined') {
        Stocks._addNews(news.text, news.good);
        if (App.currentScreen === 'stocks') Stocks.render();
      }
    });
  },

  // === PET TRADING ===
  listPet(petId, price) {
    if (!this.isOnline()) return;
    const pet = Pets.pets[petId];
    if (!pet || !Pets.owned[petId]) return;
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
      Pets.owned[petId] = false;
      Pets.levels[petId] = 0;
      Pets.instanceIds[petId] = '';
      App.save();
      if (App.currentScreen === 'pets') Pets.render();
    }).catch(err => {
      console.error('Firebase trade write error:', err.code, err.message);
    });
  },

  buyTrade(tradeId, listing) {
    if (!this.isOnline()) return;
    if (listing.sellerUid === this.uid) return;
    if (App.balance < listing.price) return;

    const tradeRef = this.db.ref('trades/' + tradeId);
    tradeRef.transaction(current => {
      if (current === null) return;
      return null;
    }, (error, committed) => {
      if (error || !committed) return;
      App.addBalance(-listing.price);
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
    }, err => {
      console.error('Firebase trades listen error:', err.code, err.message);
    });
  },

  // === RENDERING ===
  renderLeaderboard() {
    const container = document.getElementById('leaderboard-content');
    if (!container) return;

    if (!this.isOnline()) {
      container.innerHTML = '<div class="lb-offline">Offline - Firebase not connected</div>';
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
    if (!panel) return;
    const isOpen = panel.classList.toggle('chat-open');
    if (isOpen) {
      this._chatUnreadCount = 0;
      this._updateChatBadge();
      const msgs = document.getElementById('chat-messages');
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }
  },

  _showChatUnread() {
    this._chatUnreadCount++;
    this._updateChatBadge();
  },

  _updateChatBadge() {
    const btn = document.getElementById('chat-toggle-btn');
    if (!btn) return;
    let badge = btn.querySelector('.chat-badge-count');
    if (this._chatUnreadCount > 0) {
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'chat-badge-count';
        btn.appendChild(badge);
      }
      badge.textContent = this._chatUnreadCount > 99 ? '99+' : String(this._chatUnreadCount);
    } else {
      if (badge) badge.remove();
    }
  },

  _clearChatUnread() {
    this._chatUnreadCount = 0;
    this._updateChatBadge();
    document.querySelectorAll('.chat-unread-dot').forEach(el => el.remove());
  },

  _renderChatMessages() {
    const list = document.getElementById('chat-messages');
    if (!list) return;
    if (this.chatMessages.length === 0) {
      list.innerHTML = '<div class="chat-empty">No messages yet. Say hi!</div>';
      return;
    }
    list.innerHTML = this.chatMessages.map(m => {
      const isMe = m.uid === this.uid;
      // Check if name matches the registered owner for this uid
      let namePrefix = '';
      const nameLower = (m.name || '').toLowerCase();
      const reg = this._registeredNames[nameLower];
      if (reg && reg.uid !== m.uid) {
        // Name is registered to a different uid — possible impersonation
        namePrefix = '<span class="chat-unverified" title="Unverified name">[?] </span>';
      }
      return `<div class="chat-msg ${isMe ? 'chat-me' : ''}">
        <span class="chat-avatar">${m.avatar || ''}</span>
        <span class="chat-name">${namePrefix}${this._escapeHtml(m.name || 'Player')}</span>
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

  // === Pet Market Rendering ===
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

  // === PVP COIN FLIP ===
  createPvpFlip(amount, choice) {
    if (!this.isOnline()) return;
    const name = typeof Settings !== 'undefined' ? Settings.profile.name : 'Player';
    const avatar = typeof Settings !== 'undefined' ? Settings.avatars[Settings.profile.avatar] : '';
    const flipData = {
      creatorUid: this.uid,
      creatorSessionId: this._sessionId,
      creatorName: name,
      creatorAvatar: avatar,
      amount,
      creatorChoice: choice,
      status: 'open',
      timestamp: firebase.database.ServerValue.TIMESTAMP,
    };
    this.db.ref('pvpFlips').push(flipData).catch(err => {
      console.error('Firebase pvpFlip write error:', err);
      App.addBalance(amount); // refund on failure
    });
    // Stale cleanup: delete completed flips older than 1 hour
    this._cleanupPvpFlips();
  },

  acceptPvpFlip(flipId, listing) {
    if (!this.isOnline()) return;
    const flipRef = this.db.ref('pvpFlips/' + flipId);
    const name = typeof Settings !== 'undefined' ? Settings.profile.name : 'Player';
    const avatar = typeof Settings !== 'undefined' ? Settings.avatars[Settings.profile.avatar] : '';
    const acceptorUid = this.uid;
    const acceptorSessionId = this._sessionId;

    flipRef.transaction(current => {
      if (!current || current.status !== 'open') return; // abort
      current.status = 'matched';
      current.acceptorUid = acceptorUid;
      current.acceptorSessionId = acceptorSessionId;
      current.acceptorName = name;
      current.acceptorAvatar = avatar;
      return current;
    }, (error, committed, snap) => {
      if (error || !committed) {
        App.addBalance(listing.amount); // refund
        return;
      }
      const data = snap.val();
      if (!data || data.status !== 'matched') {
        App.addBalance(listing.amount); // refund
        return;
      }

      // Flip the coin — 50/50
      const coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
      const creatorWon = data.creatorChoice === coinResult;
      const winnerSessionId = creatorWon ? data.creatorSessionId : acceptorSessionId;
      const winnerName = creatorWon ? data.creatorName : name;
      const loserSessionId = creatorWon ? acceptorSessionId : data.creatorSessionId;
      const loserName = creatorWon ? name : data.creatorName;

      // If acceptor won, add prize locally
      if (!creatorWon) {
        App.addBalance(data.amount * 2);
      }

      // Write complete result
      flipRef.update({
        status: 'complete',
        coinResult,
        winnerSessionId,
        winnerName,
        loserSessionId,
        loserName,
        completedAt: firebase.database.ServerValue.TIMESTAMP,
      });
    });
  },

  cancelPvpFlip(flipId, amount) {
    if (!this.isOnline()) return;
    const flipRef = this.db.ref('pvpFlips/' + flipId);
    const sessionId = this._sessionId;
    flipRef.transaction(current => {
      if (!current || current.status !== 'open' || current.creatorSessionId !== sessionId) return;
      return null; // delete
    }, (error, committed) => {
      if (!error && committed) {
        App.addBalance(amount); // refund
      }
    });
  },

  _listenPvpFlips() {
    const ref = this.db.ref('pvpFlips').orderByChild('timestamp').limitToLast(30);
    ref.on('value', snap => {
      const data = snap.val() || {};
      const flips = Object.entries(data)
        .map(([id, d]) => ({ id, ...d }))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      // Detect creator wins (when creator wins, the listener tells them to add balance)
      const mySession = this._sessionId;
      flips.forEach(f => {
        if (f.status === 'complete' && f.winnerSessionId === mySession && f.creatorSessionId === mySession) {
          const dedupKey = 'pvp_win_' + f.id;
          if (!sessionStorage.getItem(dedupKey)) {
            sessionStorage.setItem(dedupKey, '1');
            App.addBalance(f.amount * 2);
          }
        }
      });

      if (typeof CoinFlip !== 'undefined') {
        CoinFlip.updateFromPvpFlips(flips);
      }
    }, err => {
      console.error('Firebase pvpFlips listen error:', err.code, err.message);
    });
  },

  _cleanupPvpFlips() {
    if (!this.isOnline()) return;
    const oneHourAgo = Date.now() - 3600000;
    // startAt(1) skips flips without completedAt (open/matched flips have null which sorts first)
    this.db.ref('pvpFlips').orderByChild('completedAt').startAt(1).endAt(oneHourAgo).once('value', snap => {
      snap.forEach(child => child.ref.remove());
    });
  },

  // === STOCK PRICE SYNC ===
  _tryClaimStockAuthority() {
    if (!this.isOnline()) return;
    const sessionId = this._sessionId;
    const ref = this.db.ref('stockPrices/authority');
    ref.transaction(current => {
      const now = Date.now();
      if (!current || current.sessionId === sessionId || (now - (current.timestamp || 0) > 45000)) {
        return { sessionId, uid: this.uid, timestamp: now };
      }
      return; // abort — someone else is authority
    }, (error, committed, snap) => {
      if (!error && committed && snap.val() && snap.val().sessionId === sessionId) {
        this._isStockAuthority = true;
      } else {
        this._isStockAuthority = false;
      }
    });
  },

  pushStockPrices(prices) {
    if (!this.isOnline() || !this._isStockAuthority) return;
    this.db.ref('stockPrices/data').set({
      prices,
      timestamp: Date.now(),
      sessionId: this._sessionId,
    }).catch(err => console.error('Firebase stockPrices write error:', err));
    // Refresh authority timestamp
    this.db.ref('stockPrices/authority').update({ timestamp: Date.now() });
  },

  _listenStockPrices() {
    this.db.ref('stockPrices/data').on('value', snap => {
      const data = snap.val();
      if (!data || !data.prices) return;
      // Only apply if we're NOT the authority (different session)
      if (data.sessionId === this._sessionId) return;
      if (typeof Stocks !== 'undefined') {
        Stocks.applyServerPrices(data.prices);
      }
    }, err => console.error('Firebase stockPrices/data read denied:', err.code));
    // Track authority changes
    this.db.ref('stockPrices/authority').on('value', snap => {
      const data = snap.val();
      if (data && data.sessionId === this._sessionId) {
        this._isStockAuthority = true;
      } else {
        this._isStockAuthority = false;
      }
    }, err => console.error('Firebase stockPrices/authority read denied:', err.code));
    // Admin commands — only the stock authority processes these; it pushes results via stockPrices/data
    // (applying on every tab caused all tabs to fight for authority, breaking sync)
    this.db.ref('stockPrices/adminCommand').on('value', snap => {
      const cmd = snap.val();
      if (!cmd || !cmd.ts || cmd.ts <= this._lastStockCmdTs) return;
      this._lastStockCmdTs = cmd.ts;
      if (typeof Stocks !== 'undefined' && this._isStockAuthority) Stocks.applyAdminCommand(cmd);
    }, err => console.error('Firebase stockPrices/adminCommand read denied:', err.code));
  },

  // === CRYPTO PRICE SYNC ===
  _tryClaimCryptoAuthority() {
    if (!this.isOnline()) return;
    const sessionId = this._sessionId;
    const ref = this.db.ref('cryptoPrices/authority');
    ref.transaction(current => {
      const now = Date.now();
      if (!current || current.sessionId === sessionId || (now - (current.timestamp || 0) > 45000)) {
        return { sessionId, uid: this.uid, timestamp: now };
      }
      return;
    }, (error, committed, snap) => {
      if (!error && committed && snap.val() && snap.val().sessionId === sessionId) {
        this._isCryptoAuthority = true;
      } else {
        this._isCryptoAuthority = false;
      }
    });
  },

  pushCryptoPrices(prices) {
    if (!this.isOnline() || !this._isCryptoAuthority) return;
    this.db.ref('cryptoPrices/data').set({
      prices,
      timestamp: Date.now(),
      sessionId: this._sessionId,
    }).catch(err => console.error('Firebase cryptoPrices write error:', err));
    this.db.ref('cryptoPrices/authority').update({ timestamp: Date.now() });
  },

  _listenCryptoPrices() {
    this.db.ref('cryptoPrices/data').on('value', snap => {
      const data = snap.val();
      if (!data || !data.prices) return;
      if (data.sessionId === this._sessionId) return;
      if (typeof Crypto !== 'undefined') {
        Crypto.applyServerPrices(data.prices);
      }
    }, err => console.error('Firebase cryptoPrices/data read denied:', err.code));
    this.db.ref('cryptoPrices/authority').on('value', snap => {
      const data = snap.val();
      if (data && data.sessionId === this._sessionId) {
        this._isCryptoAuthority = true;
      } else {
        this._isCryptoAuthority = false;
      }
    }, err => console.error('Firebase cryptoPrices/authority read denied:', err.code));
    // Admin commands — only the crypto authority processes these
    this.db.ref('cryptoPrices/adminCommand').on('value', snap => {
      const cmd = snap.val();
      if (!cmd || !cmd.ts || cmd.ts <= this._lastCryptoCmdTs) return;
      this._lastCryptoCmdTs = cmd.ts;
      if (typeof Crypto !== 'undefined' && this._isCryptoAuthority) Crypto.applyAdminCommand(cmd);
    }, err => console.error('Firebase cryptoPrices/adminCommand read denied:', err.code));
  },

  // === BOUNTY BOARD ===
  listenBounties(callback) {
    if (!this.isOnline()) return;
    this.db.ref('bounties').on('value', snap => {
      callback(snap.val() || {});
    });
  },

  postBounty(id, data) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('bounties/' + id).set(data);
  },

  claimBounty(id) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('bounties/' + id).remove();
  },

  refundExpiredBounty(id, posterId, amount) {
    if (!this.isOnline()) return;
    this.db.ref('bounties/' + id).remove();
    // Credit refund to poster via leaderboard credit queue
    this.db.ref('bountyRefunds/' + posterId).push({ amount, bountyId: id, timestamp: Date.now() });
  },

  listenBountyRefunds(uid, callback) {
    if (!this.isOnline()) return;
    this.db.ref('bountyRefunds/' + uid).on('child_added', snap => {
      const data = snap.val();
      if (data) { callback(data); snap.ref.remove(); }
    });
  },

  pushAdminStockCommand(cmd) {
    if (!this.isOnline()) return;
    this.db.ref('stockPrices/adminCommand').set({ ...cmd, ts: Date.now() })
      .catch(err => console.error('Firebase adminStockCommand write error:', err));
  },

  pushAdminCryptoCommand(cmd) {
    if (!this.isOnline()) return;
    this.db.ref('cryptoPrices/adminCommand').set({ ...cmd, ts: Date.now() })
      .catch(err => console.error('Firebase adminCryptoCommand write error:', err));
  },

  // === PLAYER COMPANIES ===
  listenPlayerStocks(callback) {
    if (!this.isOnline()) return;
    this.db.ref('companies').on('value', snap => {
      callback(snap.val() || {});
    }, err => console.warn('Firebase companies listen denied:', err.code));
  },

  listenPlayerStockPrices(callback) {
    if (!this.isOnline()) return;
    this.db.ref('playerStockPrices').on('value', snap => {
      callback(snap.val() || {});
    }, err => console.warn('Firebase playerStockPrices listen denied:', err.code));
  },

  postCompany(uid, data) {
    if (!this.isOnline()) return;
    this.db.ref('companies/' + uid).set(data)
      .catch(err => console.error('Firebase postCompany error:', err));
  },

  pushPlayerStockPrices(prices) {
    if (!this.isOnline() || !this._isStockAuthority) return;
    this.db.ref('playerStockPrices').update(prices)
      .catch(err => console.error('Firebase playerStockPrices error:', err));
  },

  pushPlayerDividend(symbol, perShare, ownerUid) {
    if (!this.isOnline()) return;
    this.db.ref('playerDividends').push({ symbol, perShare, ownerUid, ts: Date.now() })
      .catch(err => console.error('Firebase pushPlayerDividend error:', err));
  },

  // === NAME REGISTRY ===
  _fetchRegisteredNames() {
    if (!this.isOnline()) return;
    this._registeredNamesLastFetch = Date.now();
    this.db.ref('registeredNames').once('value', snap => {
      this._registeredNames = snap.val() || {};
    }).catch(() => {});
  },

  checkAndClaimName(newName, oldName, callback) {
    if (!this.isOnline()) {
      // Offline: allow locally, warn user
      callback({ ok: true, offline: true });
      return;
    }
    const newNameLower = newName.toLowerCase();
    const ref = this.db.ref('registeredNames/' + newNameLower);
    ref.transaction(current => {
      if (!current) {
        // Unclaimed — claim it
        return { uid: this.uid, displayName: newName, claimedAt: Date.now() };
      }
      if (current.uid === this.uid) {
        // Already owned by me — update display name
        return { ...current, displayName: newName };
      }
      // Owned by someone else — abort
      return; // undefined = abort
    }, (error, committed, snap) => {
      if (error) {
        callback({ ok: false, error: 'Firebase error' });
        return;
      }
      if (!committed) {
        // Aborted — name is taken by another uid
        callback({ ok: false, error: 'Name taken by another player' });
        return;
      }
      // Success — release old name if different
      if (oldName && oldName.toLowerCase() !== newNameLower) {
        this._releaseName(oldName);
      }
      // Update local cache
      this._registeredNames[newNameLower] = { uid: this.uid, displayName: newName, claimedAt: Date.now() };
      callback({ ok: true });
    });
  },

  _releaseName(name) {
    if (!this.isOnline() || !name) return;
    const nameLower = name.toLowerCase();
    const ref = this.db.ref('registeredNames/' + nameLower);
    ref.transaction(current => {
      if (current && current.uid === this.uid) return null; // delete
      return; // abort if not mine
    }, () => {
      delete this._registeredNames[nameLower];
    });
  },

  _claimName(name) {
    if (!this.isOnline() || !name) return;
    const nameLower = name.toLowerCase();
    this.db.ref('registeredNames/' + nameLower).set({
      uid: this.uid,
      displayName: name,
      claimedAt: Date.now(),
    }).catch(() => {});
  },

  // === ACCOUNT PASSWORDS ===
  async _hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async saveAccountPassword(name, password) {
    if (!this.isOnline()) { return { ok: false, error: 'Offline' }; }
    const nameLower = name.toLowerCase();
    const hash = await this._hashPassword(password);
    const save = localStorage.getItem('retros_casino_save') || '{}';
    await this.db.ref('accounts/' + nameLower).set({
      passwordHash: hash,
      uid: this.uid,
      save,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },

  async loginWithPassword(name, password) {
    if (!this.isOnline()) { return { ok: false, error: 'Offline' }; }
    const nameLower = name.toLowerCase();
    // Rate limit
    const rateLimitKey = 'retros_pw_attempts_' + nameLower;
    const lockKey = 'retros_pw_lockout_' + nameLower;
    const lockUntil = parseInt(localStorage.getItem(lockKey) || '0');
    if (Date.now() < lockUntil) {
      const secs = Math.ceil((lockUntil - Date.now()) / 1000);
      return { ok: false, error: 'Too many attempts. Wait ' + secs + 's.' };
    }
    const hash = await this._hashPassword(password);
    const snap = await this.db.ref('accounts/' + nameLower).once('value');
    const account = snap.val();
    if (!account) { return { ok: false, error: 'No account found for that name.' }; }

    const attempts = parseInt(localStorage.getItem(rateLimitKey) || '0') + 1;
    if (account.passwordHash !== hash) {
      localStorage.setItem(rateLimitKey, String(attempts));
      if (attempts >= 3) {
        localStorage.setItem(lockKey, String(Date.now() + 60000));
        localStorage.removeItem(rateLimitKey);
        return { ok: false, error: 'Too many attempts. Locked for 60s.' };
      }
      return { ok: false, error: 'Wrong password. (' + (3 - attempts) + ' left)' };
    }

    // Success — clear rate limit
    localStorage.removeItem(rateLimitKey);
    localStorage.removeItem(lockKey);
    // Load save
    if (account.save) {
      localStorage.setItem('retros_casino_save', account.save);
      App.load();
      App.updateBalance();
      if (typeof Clicker !== 'undefined') { Clicker.startAutoClicker(); Clicker.updateStats(); Clicker.renderUpgrades(); }
    }
    return { ok: true };
  },

  // Push save to account on every App.save() (called from settings.js)
  pushAccountSave() {
    if (!this.isOnline()) return;
    const name = typeof Settings !== 'undefined' ? Settings.profile.name : null;
    if (!name || name === 'Player') return;
    const nameLower = name.toLowerCase();
    const save = localStorage.getItem('retros_casino_save') || '{}';
    // Only push if account exists for this uid
    this.db.ref('accounts/' + nameLower).once('value', snap => {
      const account = snap.val();
      if (account && account.uid === this.uid) {
        this.db.ref('accounts/' + nameLower + '/save').set(save).catch(() => {});
      }
    }).catch(() => {});
  },

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
};
