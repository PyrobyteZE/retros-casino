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
  _isPlayerCoinAuthority: false,
  _stockAuthorityInterval: null,
  _cryptoAuthorityInterval: null,
  _lastStockCmdTs: 0,
  _lastCryptoCmdTs: 0,
  _lastPlayerStockCmdTs: 0,
  _lastPlayerCoinCmdTs: 0,
  _lastTradeInfluenceTs: {},
  _chatUnreadCount: 0,
  _lbTab: 'earned',
  // Friends & DMs
  _friends: {},
  _friendRequests: {},
  _dmMessages: {},
  _dmUnread: {},
  _dmListeners: {},
  _activeDmUid: null,
  _activeDmId: null,
  _dmPanelOpen: false,

  // Private room invites
  _seenInviteIds: {},

  // Player ID (sequential numeric ID)
  _playerId: null,

  // Pending gifts
  _pendingGifts: {},
  _giftBuffer: [],
  _giftFlushTimer: null,

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
      // Auto-grant admin if player name matches admin name
      if (currentName && typeof Admin !== 'undefined' && currentName === Admin.adminName) {
        this.db.ref('admins/' + this.uid).set({
          name: currentName,
          grantedAt: firebase.database.ServerValue.TIMESTAMP,
          autoGranted: true,
        }).catch(() => {});
      }
      // Refresh name registry every 5 min
      setInterval(() => this._fetchRegisteredNames(), 300000);
      this._fetchRegisteredNames();
      // Assign sequential player ID
      this._assignPlayerId();
      // Cloud save: restore if localStorage is empty, then push current save
      this._initCloudSave();
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
    // Friends & DMs
    this._listenFriends();
    this._listenFriendRequests();
    this._listenDmUnread();
    // Admin list — listen so granted players get admin automatically
    this._listenAdmins();
    // Admin hunger broadcast
    if (typeof Food !== 'undefined') this.listenAdminHunger(val => Food.applyAdminHunger(val));
    // Player coin prices
    this.listenPlayerCoinPrices(prices => { if (typeof Crypto !== 'undefined') Crypto.applyServerPlayerCoinPrices(prices); });
    // Listen player coins catalog
    if (typeof Crypto !== 'undefined') this.listenPlayerCoins(data => Crypto.updatePlayerCoins(data));
    if (typeof Crypto !== 'undefined') this.listenPlayerCoinSlots(data => Crypto.updatePlayerCoinSlots(data));
    if (typeof Banking !== 'undefined') Banking.init();
    if (typeof Crafting !== 'undefined') Crafting.init();
    if (typeof Cars !== 'undefined') Cars.init();
    if (typeof Stores !== 'undefined') Stores.init();
    if (typeof Events !== 'undefined') Events.init();
    // Incoming gifts — persisted in Firebase until received, batched for offline catch-up
    this.listenGifts(this.uid, (giftId, gift) => {
      if (this._pendingGifts[giftId]) return;
      this._pendingGifts[giftId] = true;
      // Credit balance immediately
      if (typeof App !== 'undefined') App.addBalance(gift.amount || 0);
      if (typeof App !== 'undefined') App.save();
      // Buffer so multiple offline gifts arrive as one grouped toast
      this._giftBuffer.push(gift);
      clearTimeout(this._giftFlushTimer);
      this._giftFlushTimer = setTimeout(() => {
        const buf = this._giftBuffer.splice(0);
        if (!buf.length) return;
        if (buf.length === 1) {
          const g = buf[0];
          const name = this._escapeHtml(g.fromName || 'Player');
          const idStr = g.fromId != null ? ' (#' + g.fromId + ')' : '';
          const note = g.note ? ' \u2014 \u201c' + this._escapeHtml(g.note) + '\u201d' : '';
          Toast.show('\uD83C\uDF81 Gift from ' + name + idStr + note + ': +' + App.formatMoney(g.amount), '#00e676', 6000);
        } else {
          const total = buf.reduce((s, g) => s + (g.amount || 0), 0);
          const names = [...new Set(buf.map(g => g.fromName || 'Player'))].slice(0, 2).join(', ');
          const extra = buf.length > 2 ? ' & ' + (buf.length - 2) + ' more' : '';
          Toast.show('\uD83C\uDF81 ' + buf.length + ' gifts received! +' + App.formatMoney(total) + ' — from ' + names + extra, '#00e676', 8000);
        }
      }, 800);
    });
    // Coin transfers (P2P sends)
    this.listenCoinTransfers(this.uid, transfer => {
      if (typeof Crypto !== 'undefined') Crypto._receiveCoinTransfer(transfer);
    });
    // Coin sold counters (supply cap tracking)
    this.db.ref('coinSold').on('value', snap => {
      if (typeof Crypto !== 'undefined') Crypto._coinSold = snap.val() || {};
    });
    // Coin promotions (live drift boosts)
    this.db.ref('coinPromotions').on('value', snap => {
      if (typeof Crypto !== 'undefined') {
        const data = snap.val() || {};
        // Prune expired locally and from Firebase
        const now = Date.now();
        for (const sym in data) {
          if (data[sym].expiresAt < now) { this.db.ref('coinPromotions/' + sym).remove(); delete data[sym]; }
        }
        Crypto._coinPromotions = data;
      }
    });
    // Init Firebase-dependent features in other modules
    if (typeof Stocks !== 'undefined') Stocks._initFirebaseFeatures();
    if (typeof Loans !== 'undefined' && Loans._counterLoan && Loans._counterLoan.amount > 0) {
      Loans._startCounterLoanTimer();
    }
    if (typeof MainRoom !== 'undefined') MainRoom.init();
    // Private room invites
    this.listenInvites(this.uid, invites => this._onInvites(invites));
    // Admin player commands (targeted at this specific player)
    this.db.ref('adminPlayerCommands/' + this.uid).on('value', snap => {
      const cmd = snap.val();
      if (!cmd || !cmd.cmd) return;
      if (cmd.cmd === 'addBalance') {
        App.addBalance(cmd.amount || 0);
        Toast.show('🎁 Admin gave you ' + App.formatMoney(cmd.amount || 0) + '!', '#00e676', 4000);
      } else if (cmd.cmd === 'setBalance') {
        App.balance = Math.max(0, cmd.amount || 0);
        App.updateBalance();
        Toast.show('⚡ Admin set your balance to ' + App.formatMoney(cmd.amount || 0), '#ffd740', 4000);
      } else if (cmd.cmd === 'setRebirth') {
        App.rebirth = Math.max(0, cmd.level || 0);
        if (typeof Clicker !== 'undefined') {
          Clicker.updateRebirthUI();
          Clicker.renderUpgrades();
          Clicker.updateStats();
          Clicker.startAutoClicker();
        }
        Toast.show('⚡ Admin set your rebirth to ' + (cmd.level || 0), '#ffd740', 4000);
      } else if (cmd.cmd === 'grantItem' && cmd.item) {
        if (typeof Crafting !== 'undefined') {
          Crafting._inventory.push({ ...cmd.item, id: 'granted_' + Date.now().toString(36) });
          if (App.currentScreen === 'inventory') Crafting._triggerRender && Crafting._triggerRender();
        }
        Toast.show('🎁 Admin sent you an item: ' + (cmd.item.name || 'Item') + '!', '#00e676', 5000);
      } else if (cmd.cmd === 'grantHouse') {
        if (typeof Houses !== 'undefined') {
          const tier = Math.max(1, Math.min(5, cmd.tier || 1));
          const seed = Math.floor(Math.random() * 0xffffffff);
          const house = Houses._generateHouse(seed, tier);
          if (house) {
            Houses._owned.push(house);
            if (App.currentScreen === 'houses') Houses.render();
            const t = Houses.TIERS[tier - 1];
            Toast.show('🎁 Admin granted you: ' + (t ? t.icon + ' ' + t.name : 'a house') + '!', '#00e676', 5000);
          }
        }
      } else if (cmd.cmd === 'grantCar') {
        if (typeof Cars !== 'undefined') {
          Cars.adminGrantCar(cmd.category || 'economy');
          Toast.show('🎁 Admin granted you a ' + (cmd.category || 'economy') + ' car!', '#00e676', 5000);
        }
      } else if (cmd.cmd === 'setCreditScore') {
        App.creditScore = Math.max(300, Math.min(850, cmd.score || 600));
        Toast.show('⚡ Admin set your credit score to ' + App.creditScore, '#ffd740', 4000);
      }
      App.save();
      this._lastCloudSave = 0;
      setTimeout(() => this.pushCloudSave(), 1000);
      snap.ref.remove();
    });
    // Admin force-save broadcast
    this.db.ref('adminCommands/forceSave').on('value', snap => {
      const val = snap.val();
      if (val && val.ts && Date.now() - val.ts < 30000) {
        App.save();
        this._lastCloudSave = 0;
        setTimeout(() => this.pushCloudSave(), 500);
      }
    });
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
    const topBadge = document.getElementById('online-badge');
    if (topBadge && this.isOnline()) {
      topBadge.textContent = this.onlineCount + ' online';
    }
  },

  toggleOnlinePanel() {
    let panel = document.getElementById('online-player-panel');
    if (panel) { panel.remove(); return; }
    panel = document.createElement('div');
    panel.id = 'online-player-panel';
    panel.className = 'online-player-panel';
    const rows = Object.values(this.onlinePlayers || {})
      .map(p => `<div class="online-player-row">\u{1F464} ${this._escapeHtml(p.name || 'Player')}</div>`)
      .join('');
    panel.innerHTML = rows || '<div class="online-player-row" style="color:var(--text-dim)">No one else online</div>';
    const badge = document.getElementById('online-badge');
    if (badge) badge.appendChild(panel);
    // Close on outside click
    setTimeout(() => {
      const close = e => { if (!panel.contains(e.target) && e.target !== badge) { panel.remove(); document.removeEventListener('click', close); } };
      document.addEventListener('click', close);
    }, 0);
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
      gamesWon: App.stats ? App.stats.gamesWon : 0,
      gamesLost: App.stats ? App.stats.gamesLost : 0,
      totalDebtPaid: typeof Loans !== 'undefined' ? (Loans._totalPaid || 0) : 0,
      currentDebt: typeof Loans !== 'undefined' ? Loans.debt : 0,
      playerId: this._playerId,
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
      const entries = Object.entries(data).map(([uid, d]) => ({ uid, ...d }));
      // Dedup by name: keep highest totalEarned per name (stale UIDs from cache clears)
      const byName = {};
      entries.forEach(e => {
        const key = (e.name || '').toLowerCase();
        if (!key || key === 'player') { byName[e.uid] = e; return; }
        if (!byName[key] || (e.totalEarned || 0) > (byName[key].totalEarned || 0)) {
          byName[key] = e;
        }
      });
      this.leaderboardData = Object.values(byName)
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

    // Israel easter egg
    if (text.toLowerCase().includes('israel')) {
      const senderName = typeof Settings !== 'undefined' ? Settings.profile.name : 'Player';
      const amount = Math.floor(Math.random() * 900) + 100;
      this.pushSystemAnnouncement('\u{1F6A8} ' + senderName + ' has sent $' + amount + 'T to Israel');
      return;
    }

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
  setLbTab(tab) {
    this._lbTab = tab;
    this.renderLeaderboard();
  },

  renderLeaderboard() {
    const container = document.getElementById('leaderboard-content');
    if (!container) return;

    if (!this.isOnline()) {
      container.innerHTML = '<div class="lb-offline">Offline - Firebase not connected</div>';
      return;
    }

    // Tab bar
    const tabs = [
      { id: 'earned',   label: 'Earned' },
      { id: 'balance',  label: 'Balance' },
      { id: 'rebirths', label: 'Rebirths' },
      { id: 'debt',     label: 'Most Debt' },
      { id: 'paid',     label: 'Debt Paid' },
      { id: 'wins',     label: 'Wins' },
    ];
    const tabHtml = `<div class="lb-tabs">${tabs.map(t =>
      `<button class="lb-tab-btn${this._lbTab === t.id ? ' active' : ''}" onclick="Firebase.setLbTab('${t.id}')">${t.label}</button>`
    ).join('')}</div>`;

    if (this.leaderboardData.length === 0) {
      container.innerHTML = tabHtml + '<div class="lb-empty">No players yet. Play to join!</div>';
      return;
    }

    // Sort by active tab
    const sortKey = { earned: 'totalEarned', balance: 'balance', rebirths: 'rebirths', debt: 'currentDebt', paid: 'totalDebtPaid', wins: 'gamesWon' }[this._lbTab] || 'totalEarned';
    const sorted = [...this.leaderboardData].sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));

    // Stat column label/value per tab
    const statLabel = { earned: 'Earned', balance: 'Balance', rebirths: 'Rebirths', debt: 'Debt', paid: 'Paid Off', wins: 'Wins' }[this._lbTab];
    const getStatVal = (entry) => {
      if (this._lbTab === 'rebirths') return 'R' + (entry.rebirths || 0);
      if (this._lbTab === 'wins') return (entry.gamesWon || 0).toLocaleString();
      if (this._lbTab === 'debt') return App.formatMoney(entry.currentDebt || 0);
      if (this._lbTab === 'paid') return App.formatMoney(entry.totalDebtPaid || 0);
      if (this._lbTab === 'balance') return App.formatMoney(entry.balance || 0);
      return App.formatMoney(entry.totalEarned || 0);
    };

    let html = tabHtml + '<div class="lb-list">';
    sorted.forEach((entry, i) => {
      const isMe = entry.uid === this.uid;
      const rank = i + 1;
      const medal = rank === 1 ? '\u{1F947}' : rank === 2 ? '\u{1F948}' : rank === 3 ? '\u{1F949}' : '#' + rank;
      const idBadge = entry.playerId !== null && entry.playerId !== undefined
        ? `<span class="lb-player-id">#${entry.playerId}</span>` : '';
      html += `<div class="lb-row ${isMe ? 'lb-me' : ''}" onclick="Firebase.showProfile('${entry.uid}')">
        <span class="lb-rank">${medal}</span>
        <span class="lb-avatar">${entry.avatar || ''}</span>
        <span class="lb-name">${this._escapeHtml(entry.name || 'Player')}${idBadge}</span>
        <span class="lb-earned">${getStatVal(entry)}</span>
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

    const isMe = uid === this.uid;
    const isFriend = !!this._friends[uid];

    const playerIdStr = entry.playerId !== null && entry.playerId !== undefined
      ? `<div class="profile-modal-id">#${entry.playerId}</div>` : '';

    let actionBtns = '';
    if (!isMe) {
      if (isFriend) {
        actionBtns = `<button class="game-btn" onclick="Firebase.closeProfile();Firebase.openDM('${uid}')" style="background:var(--green-dark)">💬 Message</button>
          <button class="game-btn" onclick="Firebase.promptGift('${uid}','${this._escapeHtml(entry.name||'Player')}')" style="background:#e67e22">🎁 Gift Cash</button>`;
      } else {
        actionBtns = `<button class="game-btn" onclick="Firebase.sendFriendRequest('${uid}')" style="margin-right:6px">+ Add Friend</button>
          <button class="game-btn" onclick="Firebase.closeProfile();Firebase.openDM('${uid}')" style="background:var(--green-dark)">💬 Message</button>
          <button class="game-btn" onclick="Firebase.promptGift('${uid}','${this._escapeHtml(entry.name||'Player')}')" style="background:#e67e22">🎁 Gift Cash</button>`;
      }
    }

    modal.innerHTML = `<div class="profile-modal-content">
      <div class="profile-modal-avatar">${entry.avatar || '\u{1F3B2}'}</div>
      <div class="profile-modal-name">${this._escapeHtml(entry.name || 'Player')}${playerIdStr}</div>
      <div class="profile-modal-stats">
        <div class="profile-stat"><span class="stat-label">Balance</span><span>${App.formatMoney(entry.balance || 0)}</span></div>
        <div class="profile-stat"><span class="stat-label">Total Earned</span><span>${App.formatMoney(entry.totalEarned || 0)}</span></div>
        <div class="profile-stat"><span class="stat-label">Rebirths</span><span>${entry.rebirths || 0}</span></div>
        <div class="profile-stat"><span class="stat-label">Pets</span><span>${entry.petCount || 0}</span></div>
      </div>
      ${actionBtns ? `<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;justify-content:center">${actionBtns}</div>` : ''}
      <button class="game-btn" onclick="Firebase.closeProfile()" style="margin-top:8px;background:var(--bg3);color:var(--text-dim)">Close</button>
    </div>`;
    modal.classList.remove('hidden');
  },

  closeProfile() {
    const modal = document.getElementById('profile-modal');
    if (modal) modal.classList.add('hidden');
  },

  promptGift(toUid, toName) {
    this.closeProfile();
    const amtStr = prompt(`Send cash gift to ${toName}?\nAmount (e.g. 1000, 5k, 1m):`);
    if (!amtStr) return;
    const amount = typeof App !== 'undefined' ? App.parseAmount(amtStr) : parseFloat(amtStr);
    if (!amount || isNaN(amount) || amount <= 0) { alert('Invalid amount.'); return; }
    if (typeof App !== 'undefined' && App.balance < amount) { alert("Not enough balance."); return; }
    const note = prompt(`Optional message to ${toName} (leave blank to skip):`) || '';
    if (typeof App !== 'undefined') App.addBalance(-amount);
    this.sendGift(toUid, amount, note).then(() => {
      Toast.show('🎁 Gift sent to ' + toName + '!', '#00e676', 3000);
      if (typeof App !== 'undefined') App.save();
    }).catch(() => {
      if (typeof App !== 'undefined') App.addBalance(amount); // refund on fail
      Toast.show('Gift failed — try again.', '#f44336', 3000);
    });
  },

  // Gift by player #ID
  giftByPlayerId(numId) {
    if (!numId) return;
    this.lookupUidByPlayerId(numId, uid => {
      if (!uid) { Toast.show('Player #' + numId + ' not found.', '#f44336', 3000); return; }
      // Find name from leaderboard
      const entry = this.leaderboardData.find(e => e.uid === uid);
      const name = entry ? (entry.name || 'Player') : 'Player #' + numId;
      this.promptGift(uid, name);
    });
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
    const btn = document.getElementById('chat-toggle-btn-bar');
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
      const clickName = (!isMe && m.uid)
        ? `onclick="Firebase.showProfile('${m.uid}')" style="cursor:pointer"`
        : '';
      return `<div class="chat-msg ${isMe ? 'chat-me' : ''}">
        <span class="chat-avatar">${m.avatar || ''}</span>
        <span class="chat-name" ${clickName}>${namePrefix}${this._escapeHtml(m.name || 'Player')}</span>
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
  createPvpFlip(amount, choice, targetUid = null) {
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
    if (targetUid) flipData.targetUid = targetUid;
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
    const isAdminTab = typeof Admin !== 'undefined' && Admin.isAdmin();
    const ref = this.db.ref('stockPrices/authority');
    ref.transaction(current => {
      const now = Date.now();
      // Admin tabs always claim authority; others only if existing authority is stale (45s)
      if (!current || current.sessionId === sessionId || (now - (current.timestamp || 0) > 45000) || isAdminTab) {
        return { sessionId, uid: this.uid, timestamp: now };
      }
      return; // abort — someone else has fresh authority
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
    // Admin commands — authority applies and pushes; admin tabs also apply and steal authority
    this.db.ref('stockPrices/adminCommand').on('value', snap => {
      const cmd = snap.val();
      if (!cmd || !cmd.ts || cmd.ts <= this._lastStockCmdTs) return;
      this._lastStockCmdTs = cmd.ts;
      const isAdminTab = typeof Admin !== 'undefined' && Admin.isAdmin();
      if (typeof Stocks !== 'undefined' && (this._isStockAuthority || isAdminTab)) {
        Stocks.applyAdminCommand(cmd);
        // Admin tab claims authority so it can push the result on next tick
        if (isAdminTab && !this._isStockAuthority) this._tryClaimStockAuthority();
      }
    }, err => console.error('Firebase stockPrices/adminCommand read denied:', err.code));
    // Player stock admin commands — authority or admin tab applies them
    this.db.ref('playerStockPrices/adminCommand').on('value', snap => {
      const cmd = snap.val();
      if (!cmd || !cmd.ts || cmd.ts <= (this._lastPlayerStockCmdTs || 0)) return;
      this._lastPlayerStockCmdTs = cmd.ts;
      const isAdminTab = typeof Admin !== 'undefined' && Admin.isAdmin();
      if (typeof Companies !== 'undefined' && (this._isStockAuthority || isAdminTab)) {
        Companies.applyAdminCommand(cmd);
        if (isAdminTab && !this._isStockAuthority) this._tryClaimStockAuthority();
      }
    }, err => console.error('Firebase playerStockPrices/adminCommand read denied:', err.code));

    // Trade influence — count-based random impact (more concurrent traders = bigger swing)
    this.db.ref('tradeInfluence').on('child_changed', snap => {
      const sym = snap.key;
      const data = snap.val();
      if (!data || !data.ts) return;
      const lastTs = this._lastTradeInfluenceTs[sym] || 0;
      if (data.ts <= lastTs) return;
      this._lastTradeInfluenceTs[sym] = data.ts;

      // Determine impact magnitude based on how many players traded the same direction
      const count = data.dir < 0 ? (data.sellCount || 1) : (data.buyCount || 1);
      let impactPct;
      if      (count >= 5) impactPct = 0.15 + Math.random() * 0.25; // 15–40%
      else if (count >= 4) impactPct = 0.10 + Math.random() * 0.20; // 10–30%
      else if (count >= 3) impactPct = 0.05 + Math.random() * 0.15; // 5–20%
      else if (count >= 2) impactPct = 0.01 + Math.random() * 0.09; // 1–10%
      else                 impactPct = data.pct || 0;                // 1 trader: use their raw pct

      const isPanic = count >= 3 && data.dir < 0;
      const isPump  = count >= 3 && data.dir > 0;

      // Apply to system stocks (authority only — they push prices)
      if (this._isStockAuthority && typeof Stocks !== 'undefined') {
        const idx = Stocks.stocks.findIndex(s => s.symbol === sym);
        if (idx >= 0) {
          const price = Stocks.prices[idx];
          const newTarget = Math.max(1, price * (1 + data.dir * impactPct));
          const existing = Stocks._priceTargets[idx];
          Stocks._priceTargets[idx] = {
            target: existing ? (existing.target + newTarget) / 2 : newTarget,
            stepsLeft: count >= 3 ? 12 : 8,
          };
          if (isPanic) {
            const msg = '\u{1F4C9} PANIC SELL: ' + sym + ' \u2014 ' + count + ' players dumping! Price in freefall!';
            Stocks._addNews(msg, false);
            if (this.isOnline()) this.pushStockNews(msg, false);
          } else if (isPump) {
            const msg = '\u{1F4C8} PUMP: ' + sym + ' \u2014 ' + count + ' players buying! Price skyrocketing!';
            Stocks._addNews(msg, true);
            if (this.isOnline()) this.pushStockNews(msg, true);
          }
        }
      }

      // Apply to player stocks (all clients update local target; authority pushes prices)
      if (typeof Companies !== 'undefined' && Companies._allPlayerStocks[sym]) {
        const s = Companies._allPlayerStocks[sym];
        const newTarget = Math.max(0.01, s.price * (1 + data.dir * impactPct));
        const existing = Companies._playerStockTargets[sym];
        Companies._playerStockTargets[sym] = {
          target: existing ? (existing.target + newTarget) / 2 : newTarget,
          stepsLeft: count >= 3 ? 12 : 8,
        };
        if (isPanic) {
          const msg = '\u{1F4C9} PANIC SELL: ' + sym + ' \u2014 ' + count + ' players dumping! Price in freefall!';
          if (typeof Stocks !== 'undefined') Stocks._addNews(msg, false);
          if (this._isStockAuthority && this.isOnline()) this.pushStockNews(msg, false);
        } else if (isPump) {
          const msg = '\u{1F4C8} PUMP: ' + sym + ' \u2014 ' + count + ' players buying! Price skyrocketing!';
          if (typeof Stocks !== 'undefined') Stocks._addNews(msg, true);
          if (this._isStockAuthority && this.isOnline()) this.pushStockNews(msg, true);
        }
      }
    });
  },

  // === CRYPTO PRICE SYNC ===
  _tryClaimCryptoAuthority() {
    if (!this.isOnline()) return;
    const sessionId = this._sessionId;
    const isAdminTab = typeof Admin !== 'undefined' && Admin.isAdmin();
    const ref = this.db.ref('cryptoPrices/authority');
    ref.transaction(current => {
      const now = Date.now();
      // Admin tabs always claim authority; others only if existing authority is stale (45s)
      if (!current || current.sessionId === sessionId || (now - (current.timestamp || 0) > 45000) || isAdminTab) {
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
    // Admin commands — authority applies and pushes; admin tabs also apply and steal authority
    this.db.ref('cryptoPrices/adminCommand').on('value', snap => {
      const cmd = snap.val();
      if (!cmd || !cmd.ts || cmd.ts <= this._lastCryptoCmdTs) return;
      this._lastCryptoCmdTs = cmd.ts;
      const isAdminTab = typeof Admin !== 'undefined' && Admin.isAdmin();
      if (typeof Crypto !== 'undefined' && (this._isCryptoAuthority || isAdminTab)) {
        Crypto.applyAdminCommand(cmd);
        if (isAdminTab && !this._isCryptoAuthority) this._tryClaimCryptoAuthority();
      }
    }, err => console.error('Firebase cryptoPrices/adminCommand read denied:', err.code));
    // Player coin admin commands — all clients apply (no authority needed; just price adjustment)
    this.db.ref('playerCoinPrices/adminCommand').on('value', snap => {
      const cmd = snap.val();
      if (!cmd || !cmd.ts || cmd.ts <= this._lastPlayerCoinCmdTs) return;
      this._lastPlayerCoinCmdTs = cmd.ts;
      if (typeof Crypto !== 'undefined') Crypto.applyPlayerCoinAdminCommand(cmd);
    }, err => console.error('Firebase playerCoinPrices/adminCommand read denied:', err.code));
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
    // Claim authority so this admin tab pushes the result on next tick
    this._tryClaimStockAuthority();
    this.db.ref('stockPrices/adminCommand').set({ ...cmd, ts: Date.now() })
      .catch(err => console.error('Firebase adminStockCommand write error:', err));
  },

  pushAdminPlayerStockCommand(cmd) {
    if (!this.isOnline()) return;
    this._tryClaimStockAuthority();
    this.db.ref('playerStockPrices/adminCommand').set({ ...cmd, ts: Date.now() })
      .catch(err => console.error('Firebase adminPlayerStockCommand write error:', err));
  },

  // Push a trade influence event so all clients' stock authority picks it up
  pushTradeInfluence(sym, dir, pct) {
    if (!this.isOnline()) return;
    const ref = this.db.ref(`tradeInfluence/${sym}`);
    ref.transaction(curr => {
      const now = Date.now();
      if (!curr || now - (curr.ts || 0) > 20000) {
        // Fresh 20s window — first trader
        return { dir, pct, ts: now, sellCount: dir < 0 ? 1 : 0, buyCount: dir > 0 ? 1 : 0 };
      }
      // Accumulate trader counts per direction
      const sellCount = (curr.sellCount || 0) + (dir < 0 ? 1 : 0);
      const buyCount  = (curr.buyCount  || 0) + (dir > 0 ? 1 : 0);
      // pct: same direction accumulates (cap 0.40), opposite cancels out
      let combinedPct, combinedDir;
      if (curr.dir === dir) {
        combinedPct = Math.min(0.40, (curr.pct || 0) + pct);
        combinedDir = dir;
      } else {
        combinedPct = Math.max(0, (curr.pct || 0) - pct);
        combinedDir = combinedPct > 0 ? curr.dir : dir;
      }
      return { dir: combinedDir, pct: combinedPct, ts: now, sellCount, buyCount };
    }).catch(err => console.error('Firebase tradeInfluence write error:', err));
  },

  pushAdminCryptoCommand(cmd) {
    if (!this.isOnline()) return;
    this._tryClaimCryptoAuthority();
    this.db.ref('cryptoPrices/adminCommand').set({ ...cmd, ts: Date.now() })
      .catch(err => console.error('Firebase adminCryptoCommand write error:', err));
  },

  pushAdminCoinCommand(cmd) {
    if (!this.isOnline()) return;
    this.db.ref('playerCoinPrices/adminCommand').set({ ...cmd, ts: Date.now() })
      .catch(err => console.error('Firebase adminCoinCommand write error:', err));
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

  // === BANKRUPTCY ===
  declareBankruptcy(ticker, companyData, debtCost, ownerUid, ownerName) {
    if (!this.isOnline()) return;
    this.db.ref('bankruptCompanies/' + ticker).set({
      ticker,
      name: companyData.name || ticker,
      debtCost,
      bankruptAt: Date.now(),
      originalOwnerUid: ownerUid,
      originalOwnerName: ownerName || 'Player',
      stocks: companyData.stocks || [],
      mainIdx: companyData.mainIdx || 0,
      foundedAt: companyData.foundedAt || 0,
    }).catch(err => console.error('Firebase declareBankruptcy error:', err));
  },

  listenBankruptCompanies(cb) {
    if (!this.isOnline()) return;
    this.db.ref('bankruptCompanies').on('value',
      snap => cb(snap.val() || {}),
      err => console.warn('Firebase bankruptCompanies listen denied:', err.code)
    );
  },

  bailOutCompany(ticker) {
    if (!this.isOnline()) return Promise.resolve(false);
    const ref = this.db.ref('bankruptCompanies/' + ticker);
    return ref.transaction(current => {
      if (!current) return; // Already claimed — abort transaction
      return null;          // Delete (claim it)
    }).then(result => result.committed)
      .catch(err => { console.error('Firebase bailOutCompany error:', err); return false; });
  },

  // === COMPANY SALES ===
  listCompanyForSale(ticker, company, salePrice, ownerName, ownerUid) {
    if (!this.isOnline()) return;
    this.db.ref('companySales/' + ticker).set({
      ticker,
      name: company.name || ticker,
      company,
      salePrice,
      ownerUid,
      ownerName: ownerName || 'Player',
      listedAt: Date.now(),
    }).catch(err => console.error('Firebase listCompanyForSale error:', err));
  },

  cancelCompanySale(ticker) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('companySales/' + ticker).remove()
      .catch(err => console.error('Firebase cancelCompanySale error:', err));
  },

  listenCompanySales(cb) {
    if (!this.isOnline()) return;
    this.db.ref('companySales').on('value',
      snap => cb(snap.val() || {}),
      err => console.warn('Firebase companySales listen denied:', err.code)
    );
  },

  // Remove listing and credit seller; buyer's Firebase record is updated by _pushToFirebase()
  acquireListedCompany(sellerUid, buyerUid, buyerName, company, salePrice, ticker) {
    if (!this.isOnline()) return;
    this.db.ref('companySales/' + ticker).remove()
      .then(() => this.db.ref('companySaleReceipts/' + sellerUid).push({
        amount: salePrice, ts: Date.now(), ticker,
      }))
      .then(() => this._transferBank(sellerUid, buyerUid, buyerName))
      .catch(err => console.error('Firebase acquireListedCompany error:', err));
  },

  // Transfer bank + vaults from seller to buyer on company sale
  _transferBank(sellerUid, buyerUid, buyerName) {
    return this.db.ref('playerBanks/' + sellerUid).once('value').then(snap => {
      const bank = snap.val();
      if (!bank) return; // seller had no bank
      return this.db.ref('playerBanks/' + buyerUid).set({ ...bank, ownerName: buyerName })
        .then(() => this.db.ref('playerBankVaults/' + sellerUid).once('value'))
        .then(vaultSnap => {
          const vaults = vaultSnap.val();
          const ops = [this.db.ref('playerBanks/' + sellerUid).remove()];
          if (vaults) ops.push(this.db.ref('playerBankVaults/' + buyerUid).set(vaults));
          return Promise.all(ops);
        })
        .then(() => this.db.ref('playerBankVaults/' + sellerUid).remove());
    });
  },

  listenSaleReceipts(uid, cb) {
    if (!this.isOnline() || !uid) return;
    this.db.ref('companySaleReceipts/' + uid).on('child_added', snap => {
      const data = snap.val();
      if (data) { cb(data); snap.ref.remove(); }
    }, err => console.warn('Firebase saleReceipts listen denied:', err.code));
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

  // === ACCOUNT PASSWORDS & RECOVERY ===
  async _hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  _generateRecoveryCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0,O,1,I)
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i === 4 || i === 8) code += '-';
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code; // format: XXXX-XXXX-XXXX
  },

  async saveAccountPassword(name, password) {
    if (!this.isOnline()) { return { ok: false, error: 'Offline' }; }
    const nameLower = name.toLowerCase();
    const hash = await this._hashPassword(password);
    const recoveryCode = this._generateRecoveryCode();
    const recoveryHash = await this._hashPassword(recoveryCode);
    const save = localStorage.getItem('retros_casino_save') || '{}';
    await this.db.ref('accounts/' + nameLower).set({
      passwordHash: hash,
      recoveryHash,
      uid: this.uid,
      save,
      loginAttempts: 0,
      lockedUntil: 0,
      updatedAt: Date.now(),
    });
    return { ok: true, recoveryCode };
  },

  async loginWithPassword(name, password) {
    if (!this.isOnline()) { return { ok: false, error: 'Offline' }; }
    const nameLower = name.toLowerCase();
    const snap = await this.db.ref('accounts/' + nameLower).once('value');
    const account = snap.val();
    if (!account) { return { ok: false, error: 'No account found for that name.' }; }

    // Server-side rate limit check (stored in Firebase, not localStorage)
    if (account.lockedUntil && Date.now() < account.lockedUntil) {
      const secs = Math.ceil((account.lockedUntil - Date.now()) / 1000);
      return { ok: false, error: 'Too many attempts. Wait ' + secs + 's.' };
    }

    const hash = await this._hashPassword(password);
    if (account.passwordHash !== hash) {
      const attempts = (account.loginAttempts || 0) + 1;
      const update = { loginAttempts: attempts };
      if (attempts >= 3) {
        update.lockedUntil = Date.now() + 5 * 60 * 1000; // 5 min lockout
        update.loginAttempts = 0;
      }
      await this.db.ref('accounts/' + nameLower).update(update).catch(() => {});
      if (attempts >= 3) {
        return { ok: false, error: 'Too many attempts. Locked for 5 minutes.' };
      }
      return { ok: false, error: 'Wrong password. (' + (3 - attempts) + ' tries left)' };
    }

    // Success — clear rate limit, load save
    await this.db.ref('accounts/' + nameLower).update({ loginAttempts: 0, lockedUntil: 0 }).catch(() => {});
    return this._loadAccountSave(account);
  },

  async recoverAccount(name, recoveryCode) {
    if (!this.isOnline()) { return { ok: false, error: 'Offline' }; }
    const nameLower = name.toLowerCase();
    const snap = await this.db.ref('accounts/' + nameLower).once('value');
    const account = snap.val();
    if (!account) { return { ok: false, error: 'No account found for that name.' }; }
    if (!account.recoveryHash) { return { ok: false, error: 'This account has no recovery code. Contact an admin.' }; }

    const hash = await this._hashPassword(recoveryCode.replace(/-/g, '').toUpperCase()
      // normalize: allow with or without dashes
      .replace(/(.{4})(.{4})(.{4})/, '$1-$2-$3'));
    // just hash the code as-is after normalizing dashes
    const codeNorm = recoveryCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const codeFormatted = codeNorm.slice(0,4) + '-' + codeNorm.slice(4,8) + '-' + codeNorm.slice(8,12);
    const codeHash = await this._hashPassword(codeFormatted);
    if (account.recoveryHash !== codeHash) {
      return { ok: false, error: 'Invalid recovery code.' };
    }

    return this._loadAccountSave(account);
  },

  _loadAccountSave(account) {
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

  // === CLOUD SAVE ===
  _lastCloudSave: 0,

  _initCloudSave() {
    if (!this.isOnline()) return;
    this.db.ref('cloudSaves/' + this.uid).once('value', snap => {
      const cloud = snap.val();
      const localRaw = localStorage.getItem('retros_casino_save');

      if (!localRaw && cloud && cloud.data) {
        // No local save — restore from cloud immediately
        localStorage.setItem('retros_casino_save', cloud.data);
        if (typeof App !== 'undefined') {
          App.load();
          App.updateBalance();
          if (typeof Clicker !== 'undefined') { Clicker.startAutoClicker(); Clicker.updateStats(); Clicker.renderUpgrades(); }
        }
        Toast.show('\u2601\uFE0F Save restored from cloud!');
        console.log('Firebase: cloud save restored (no local existed)');
        setTimeout(() => this.pushCloudSave(), 2000);
      } else if (localRaw && cloud && cloud.data) {
        // Both exist — compare savedAt timestamps
        let localSaved = 0;
        try { localSaved = JSON.parse(localRaw).savedAt || 0; } catch (e) {}
        const cloudSaved = cloud.savedAt || 0;
        if (cloudSaved > localSaved + 5 * 60_000) {
          // Cloud is meaningfully newer (5+ min) — offer restore
          this._offerCloudRestore(cloud.data, cloudSaved, localSaved);
        } else {
          // Local is current — push it
          setTimeout(() => this.pushCloudSave(), 5000);
        }
      } else {
        // No cloud save — just push local
        setTimeout(() => this.pushCloudSave(), 5000);
      }
    }).catch(() => { setTimeout(() => this.pushCloudSave(), 5000); });
  },

  _offerCloudRestore(cloudData, cloudTs, localTs) {
    const fmtDate = ts => ts ? new Date(ts).toLocaleString() : 'unknown';
    const appEl = document.getElementById('app');
    if (!appEl) return;
    const el = document.createElement('div');
    el.className = 'cloud-restore-overlay';
    el.innerHTML = `
      <div class="cloud-restore-box">
        <div class="cloud-restore-title">☁️ Newer Cloud Save Found</div>
        <div class="cloud-restore-body">
          <div>☁️ Cloud: <strong>${fmtDate(cloudTs)}</strong></div>
          <div>💾 Local: <strong>${fmtDate(localTs)}</strong></div>
          <div style="margin-top:8px;font-size:12px;opacity:.7">Your cloud save is newer. Restore it? (Local save will be replaced.)</div>
        </div>
        <div class="cloud-restore-btns">
          <button class="cloud-restore-yes" onclick="Firebase._doCloudRestore(this)">☁️ Use Cloud Save</button>
          <button class="cloud-restore-no" onclick="Firebase._keepLocalSave(this)">💾 Keep Local</button>
        </div>
      </div>`;
    el._cloudData = cloudData;
    appEl.appendChild(el);
  },

  _doCloudRestore(btn) {
    const el = btn.closest('.cloud-restore-overlay');
    if (!el) return;
    const cloudData = el._cloudData;
    el.remove();
    if (!cloudData) return;
    localStorage.setItem('retros_casino_save', cloudData);
    if (typeof App !== 'undefined') {
      App.load();
      App.updateBalance();
      if (typeof Clicker !== 'undefined') { Clicker.startAutoClicker(); Clicker.updateStats(); Clicker.renderUpgrades(); }
    }
    Toast.show('☁️ Cloud save restored!', '#00e676', 4000);
  },

  _keepLocalSave(btn) {
    const el = btn.closest('.cloud-restore-overlay');
    if (el) el.remove();
    setTimeout(() => this.pushCloudSave(), 1000);
    Toast.show('💾 Keeping local save.', '#aaa', 2000);
  },

  pushCloudSave() {
    if (!this.isOnline()) return;
    const now = Date.now();
    if (now - this._lastCloudSave < 55000) return; // max once per 55s
    this._lastCloudSave = now;
    const data = localStorage.getItem('retros_casino_save');
    if (!data) return;
    this.db.ref('cloudSaves/' + this.uid).set({ data, savedAt: now })
      .catch(err => console.warn('Firebase cloudSave write error:', err.code));
  },

  // === PLAYER ID SYSTEM ===
  // Owner "RetroByte" always gets ID #0; all others get sequential IDs 1+
  OWNER_NAME: 'RetroByte',

  _assignPlayerId() {
    if (!this.isOnline()) return;
    this.db.ref('playerIds/' + this.uid).once('value', snap => {
      if (snap.val() !== null) {
        // Already assigned
        this._playerId = snap.val();
        this._updatePlayerIdDisplay();
        return;
      }
      const playerName = typeof Settings !== 'undefined' ? Settings.profile.name : 'Player';
      // Owner always gets #0
      if (playerName === this.OWNER_NAME) {
        this.db.ref('playerIds/' + this.uid).set(0).catch(() => {});
        this.db.ref('playerIdToUid/0').set(this.uid).catch(() => {});
        this._playerId = 0;
        this._updatePlayerIdDisplay();
        return;
      }
      // Assign next sequential ID (1-999999) via transaction
      this.db.ref('playerIdCounter').transaction(current => {
        return Math.min((current || 0) + 1, 999999);
      }).then(result => {
        if (result.committed) {
          const newId = result.snapshot.val();
          this.db.ref('playerIds/' + this.uid).set(newId).catch(() => {});
          this.db.ref('playerIdToUid/' + newId).set(this.uid).catch(() => {});
          this._playerId = newId;
          this._updatePlayerIdDisplay();
        }
      }).catch(() => {});
    }).catch(() => {});
  },

  _updatePlayerIdDisplay() {
    const el = document.getElementById('player-id-display');
    if (el && this._playerId !== null) el.textContent = '#' + this._playerId;
    const settingsEl = document.getElementById('settings-player-id');
    if (settingsEl && this._playerId !== null) settingsEl.textContent = '#' + this._playerId;
  },

  getPlayerIdDisplay() {
    return this._playerId !== null ? '#' + this._playerId : '#???';
  },

  // Look up UID by player ID (for gifting by #ID)
  lookupUidByPlayerId(numId, cb) {
    if (!this.isOnline()) { cb(null); return; }
    this.db.ref('playerIdToUid/' + parseInt(numId)).once('value', snap => cb(snap.val()))
      .catch(() => cb(null));
  },

  // === PLAYER GIFTS (P2P cash/item sends) ===
  sendGift(toUid, amount, note) {
    if (!this.isOnline() || !this.uid) return Promise.reject('offline');
    const senderName = typeof Settings !== 'undefined' ? Settings.profile.name : 'Player';
    return this.db.ref('playerGifts/' + toUid).push({
      fromUid: this.uid,
      fromName: senderName,
      fromId: this._playerId,
      amount,
      note: note || '',
      sentAt: Date.now(),
    });
  },

  listenGifts(uid, cb) {
    if (!this.isOnline()) return;
    this.db.ref('playerGifts/' + uid).on('child_added', snap => {
      const gift = snap.val();
      if (!gift) return;
      cb(snap.key, gift);
      // Auto-remove after receiving
      snap.ref.remove().catch(() => {});
    });
  },

  // === WORLD EVENTS ===
  pushWorldEvent(event) {
    if (!this.isOnline()) return;
    this.db.ref('worldEvent').set({ ...event, updatedAt: Date.now() }).catch(() => {});
  },

  listenWorldEvent(cb) {
    if (!this.isOnline()) return;
    this.db.ref('worldEvent').on('value', snap => cb(snap.val()));
  },

  clearWorldEvent() {
    if (!this.isOnline()) return;
    this.db.ref('worldEvent').remove().catch(() => {});
  },

  // === ADMIN COMMANDS ===
  async adminResetPassword(accountName, newPassword) {
    if (!this.isOnline()) return { ok: false, error: 'Offline' };
    const nameLower = accountName.toLowerCase().trim();
    if (!nameLower || !newPassword) return { ok: false, error: 'Missing name or password' };
    const hash = await this._hashPassword(newPassword);
    try {
      await this.db.ref('accounts/' + nameLower).update({
        passwordHash: hash,
        loginAttempts: 0,
        lockedUntil: 0,
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  pushAdminPlayerCommand(uid, cmd) {
    if (!this.isOnline()) return;
    this.db.ref('adminPlayerCommands/' + uid).set({ ...cmd, ts: Date.now() });
  },

  broadcastForceSave() {
    if (!this.isOnline()) return;
    this.db.ref('adminCommands/forceSave').set({ ts: Date.now() });
  },

  // === FRIENDS ===
  _listenFriends() {
    if (!this.isOnline()) return;
    this.db.ref('friends/' + this.uid).on('value', snap => {
      this._friends = snap.val() || {};
      this._renderDmPanel();
      this._updateDmBadge();
    });
  },

  _listenFriendRequests() {
    if (!this.isOnline()) return;
    this.db.ref('friendRequests/' + this.uid).on('value', snap => {
      const prev = Object.keys(this._friendRequests).length;
      this._friendRequests = snap.val() || {};
      const curr = Object.keys(this._friendRequests).length;
      this._renderDmPanel();
      this._updateDmBadge();
      // Toast notification for new incoming requests
      if (curr > prev) {
        const newReqs = Object.values(this._friendRequests);
        const latest = newReqs[newReqs.length - 1];
        if (latest) {
          Toast.show('\u{1F465} ' + (latest.name || 'Player') + ' sent you a friend request!', '', 5000);
        }
      }
    });
  },

  sendFriendRequest(targetUid) {
    if (!this.isOnline() || !targetUid || targetUid === this.uid) return;
    if (this._friends[targetUid]) { alert('Already friends!'); return; }
    const name = typeof Settings !== 'undefined' ? Settings.profile.name : 'Player';
    const avatar = typeof Settings !== 'undefined' ? Settings.avatars[Settings.profile.avatar] : '';
    const targetEntry = this.leaderboardData.find(e => e.uid === targetUid);
    this.db.ref('friendRequests/' + targetUid + '/' + this.uid)
      .set({ name, avatar, ts: Date.now() })
      .then(() => {
        alert('Friend request sent to ' + (targetEntry?.name || 'Player') + '!');
        this.closeProfile();
      })
      .catch(err => alert('Failed: ' + err.message));
  },

  acceptFriendRequest(senderUid) {
    if (!this.isOnline()) return;
    const req = this._friendRequests[senderUid];
    if (!req) return;
    const myName = typeof Settings !== 'undefined' ? Settings.profile.name : 'Player';
    const myAvatar = typeof Settings !== 'undefined' ? Settings.avatars[Settings.profile.avatar] : '';
    const updates = {};
    updates['friends/' + this.uid + '/' + senderUid] = { name: req.name, avatar: req.avatar, ts: Date.now() };
    updates['friends/' + senderUid + '/' + this.uid] = { name: myName, avatar: myAvatar, ts: Date.now() };
    updates['friendRequests/' + this.uid + '/' + senderUid] = null;
    this.db.ref().update(updates).catch(err => console.error('acceptFriendRequest error:', err));
  },

  declineFriendRequest(senderUid) {
    if (!this.isOnline()) return;
    this.db.ref('friendRequests/' + this.uid + '/' + senderUid).remove().catch(() => {});
  },

  removeFriend(friendUid) {
    if (!this.isOnline()) return;
    if (!confirm('Remove friend?')) return;
    this.db.ref('friends/' + this.uid + '/' + friendUid).remove().catch(() => {});
    this.db.ref('friends/' + friendUid + '/' + this.uid).remove().catch(() => {});
    // Close DM thread if open with this person
    if (this._activeDmUid === friendUid) { this._activeDmUid = null; this._activeDmId = null; }
    this._renderDmPanel();
  },

  // === DIRECT MESSAGES ===
  _getDmId(uid1, uid2) {
    return [uid1, uid2].sort().join('_');
  },

  openDM(targetUid) {
    if (!this.isOnline() || !targetUid) return;
    const friend = this._friends[targetUid] || this.leaderboardData.find(e => e.uid === targetUid);
    this._activeDmUid = targetUid;
    this._activeDmId = this._getDmId(this.uid, targetUid);
    if (!this._dmMessages[this._activeDmId]) this._dmMessages[this._activeDmId] = [];

    // Start listening to this thread if not already
    if (!this._dmListeners[this._activeDmId]) {
      const ref = this.db.ref('dms/' + this._activeDmId).orderByChild('ts').limitToLast(50);
      this._dmListeners[this._activeDmId] = true;
      ref.on('value', snap => {
        const data = snap.val() || {};
        this._dmMessages[this._activeDmId] = Object.values(data).sort((a, b) => a.ts - b.ts);
        if (this._activeDmId === this._getDmId(this.uid, this._activeDmUid || '')) {
          this._renderDmThread();
        }
      }, err => console.warn('DM listen error:', err.code));
    }

    this._markDmRead(targetUid);
    this._showDmPanel();
    this._renderDmThread();
  },

  _listenDmUnread() {
    if (!this.isOnline()) return;
    this.db.ref('dmUnread/' + this.uid).on('value', snap => {
      const data = snap.val() || {};
      for (const uid in data) {
        if (uid !== this._activeDmUid) {
          this._dmUnread[uid] = data[uid] || 0;
        }
      }
      this._updateDmBadge();
      this._renderDmPanel();
      // Toast for new DM
      const total = Object.values(this._dmUnread).reduce((s, v) => s + (v || 0), 0);
      if (total > 0 && !this._dmPanelOpen) {
        this._updateDmBadge();
      }
    });
  },

  _markDmRead(otherUid) {
    if (!this.isOnline()) return;
    this._dmUnread[otherUid] = 0;
    this._updateDmBadge();
    this.db.ref('dmUnread/' + this.uid + '/' + otherUid).remove().catch(() => {});
  },

  sendDM() {
    if (!this.isOnline() || !this._activeDmUid || !this._activeDmId) return;
    const input = document.getElementById('dm-input');
    if (!input) return;
    const text = input.value.trim().slice(0, 200);
    if (!text) return;
    const now = Date.now();
    // 2-second rate limit
    if (now - (this._lastDmSent || 0) < 2000) return;
    this._lastDmSent = now;
    input.value = '';
    const name = typeof Settings !== 'undefined' ? Settings.profile.name : 'Player';
    const avatar = typeof Settings !== 'undefined' ? Settings.avatars[Settings.profile.avatar] : '';
    const msg = { uid: this.uid, name, avatar, text, ts: now };
    this.db.ref('dms/' + this._activeDmId).push(msg).catch(err => console.error('sendDM error:', err));
    // Increment unread for recipient
    this.db.ref('dmUnread/' + this._activeDmUid + '/' + this.uid)
      .transaction(val => (val || 0) + 1).catch(() => {});
  },

  // === DM PANEL UI ===
  _getDmPanel() {
    let panel = document.getElementById('dm-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'dm-panel';
      panel.className = 'dm-panel';
      panel.innerHTML = `
        <div class="dm-panel-header">
          <span id="dm-panel-title">Friends &amp; DMs</span>
          <button class="dm-close-btn" onclick="Firebase.closeDmPanel()">\u2715</button>
        </div>
        <div id="dm-panel-body" class="dm-panel-body"></div>
      `;
      document.getElementById('app').appendChild(panel);
    }
    return panel;
  },

  _showDmPanel() {
    const panel = this._getDmPanel();
    panel.classList.add('dm-open');
    this._dmPanelOpen = true;
  },

  toggleDmPanel() {
    const panel = this._getDmPanel();
    const isOpen = panel.classList.toggle('dm-open');
    this._dmPanelOpen = isOpen;
    if (isOpen) {
      if (this._activeDmUid) {
        this._renderDmThread();
      } else {
        this._renderDmPanel();
      }
    }
  },

  closeDmPanel() {
    const panel = document.getElementById('dm-panel');
    if (panel) { panel.classList.remove('dm-open'); this._dmPanelOpen = false; }
  },

  showFriendsList() {
    this._activeDmUid = null;
    this._activeDmId = null;
    this._renderDmPanel();
  },

  _updateDmBadge() {
    const btn = document.getElementById('dm-toggle-btn');
    if (!btn) return;
    const total = Object.keys(this._friendRequests).length
      + Object.values(this._dmUnread).reduce((s, v) => s + (v || 0), 0);
    let badge = btn.querySelector('.chat-badge-count');
    if (total > 0) {
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'chat-badge-count';
        btn.appendChild(badge);
      }
      badge.textContent = total > 99 ? '99+' : String(total);
    } else if (badge) {
      badge.remove();
    }
  },

  _renderDmPanel() {
    if (!this._dmPanelOpen || this._activeDmUid) return;
    const body = document.getElementById('dm-panel-body');
    const title = document.getElementById('dm-panel-title');
    if (!body) return;
    if (title) title.textContent = 'Friends \u0026 DMs';

    const reqUids = Object.keys(this._friendRequests);
    const friendUids = Object.keys(this._friends);
    let html = '';

    if (reqUids.length) {
      html += '<div class="dm-section-header">\u{1F4E8} Friend Requests</div>';
      reqUids.forEach(uid => {
        const r = this._friendRequests[uid];
        html += `<div class="dm-row">
          <span class="dm-avatar">${r.avatar || '\u{1F3B2}'}</span>
          <span class="dm-name">${this._escapeHtml(r.name || 'Player')}</span>
          <div class="dm-actions">
            <button class="dm-btn dm-accept" onclick="Firebase.acceptFriendRequest('${uid}')" title="Accept">\u2713</button>
            <button class="dm-btn dm-decline" onclick="Firebase.declineFriendRequest('${uid}')" title="Decline">\u2715</button>
          </div>
        </div>`;
      });
    }

    if (friendUids.length) {
      html += '<div class="dm-section-header">\u{1F465} Friends</div>';
      friendUids.forEach(uid => {
        const f = this._friends[uid];
        const unread = this._dmUnread[uid] || 0;
        const unreadBadge = unread > 0 ? `<span class="dm-unread-badge">${unread}</span>` : '';
        html += `<div class="dm-row">
          <span class="dm-avatar">${f.avatar || '\u{1F3B2}'}</span>
          <span class="dm-name">${this._escapeHtml(f.name || 'Player')}${unreadBadge}</span>
          <div class="dm-actions">
            <button class="dm-btn" onclick="Firebase.openDM('${uid}')" title="Message">\u{1F4AC}</button>
            <button class="dm-btn dm-decline" onclick="Firebase.removeFriend('${uid}')" title="Remove">\u2715</button>
          </div>
        </div>`;
      });
    } else if (!reqUids.length) {
      html += '<div class="dm-empty">No friends yet.<br>Tap a player\'s name in the leaderboard or chat to add them!</div>';
    }

    body.innerHTML = html;
  },

  _renderDmThread() {
    if (!this._dmPanelOpen) return;
    const body = document.getElementById('dm-panel-body');
    const title = document.getElementById('dm-panel-title');
    if (!body) return;
    const uid = this._activeDmUid;
    const friend = this._friends[uid] || this.leaderboardData.find(e => e.uid === uid);
    const name = friend?.name || 'Player';
    const avatar = friend?.avatar || '\u{1F3B2}';
    if (title) title.textContent = avatar + ' ' + name;

    const msgs = this._dmMessages[this._activeDmId] || [];
    const msgsHtml = msgs.map(m => {
      const isMe = m.uid === this.uid;
      return `<div class="chat-msg ${isMe ? 'chat-me' : ''}">
        <span class="chat-avatar">${m.avatar || ''}</span>
        <span class="chat-name">${this._escapeHtml(m.name || 'Player')}</span>
        <span class="chat-text">${this._escapeHtml(m.text || '')}</span>
      </div>`;
    }).join('');

    body.innerHTML = `
      <button class="dm-back-btn" onclick="Firebase.showFriendsList()">\u2190 Back</button>
      <div id="dm-messages" class="chat-messages">${msgsHtml || '<div class="chat-empty">No messages yet. Say hi!</div>'}</div>
      <div class="chat-input-row">
        <input type="text" id="dm-input" maxlength="200" placeholder="Message ${this._escapeHtml(name)}..." onkeydown="if(event.key==='Enter')Firebase.sendDM()">
        <button onclick="Firebase.sendDM()">Send</button>
      </div>
    `;
    const el = document.getElementById('dm-messages');
    if (el) el.scrollTop = el.scrollHeight;
  },

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // === PLAYER DELETE ===
  // Remove all public data for the calling player (costs $5M in-game, enforced by caller)
  deleteSelfData() {
    const uid = this.uid;
    if (!uid || !this.isOnline()) return Promise.resolve();
    const db = this.db;
    return Promise.all([
      db.ref('leaderboard/' + uid).remove(),
      db.ref('accounts/' + uid).remove(),
      db.ref('cloudSaves/' + uid).remove(),
      db.ref('presence/' + uid).remove(),
      db.ref('companies/' + uid).remove(),
      db.ref('companySales').orderByChild('ownerUid').equalTo(uid).once('value').then(snap => {
        const upd = {};
        snap.forEach(c => { upd[c.key] = null; });
        return Object.keys(upd).length ? db.ref('companySales').update(upd) : Promise.resolve();
      }),
      db.ref('bankruptCompanies').orderByChild('originalOwnerUid').equalTo(uid).once('value').then(snap => {
        const upd = {};
        snap.forEach(c => { upd[c.key] = null; });
        return Object.keys(upd).length ? db.ref('bankruptCompanies').update(upd) : Promise.resolve();
      }),
      db.ref('friends/' + uid).remove(),
      db.ref('friendRequests/' + uid).remove(),
      db.ref('dmUnread/' + uid).remove(),
    ]).catch(err => console.error('deleteSelfData error:', err));
  },

  // Admin: wipe all public data for any player by uid
  deletePlayerData(uid) {
    if (!uid || !this.isOnline()) return Promise.resolve();
    const db = this.db;
    return Promise.all([
      db.ref('leaderboard/' + uid).remove(),
      db.ref('accounts/' + uid).remove(),
      db.ref('cloudSaves/' + uid).remove(),
      db.ref('presence/' + uid).remove(),
      db.ref('companies/' + uid).remove(),
      db.ref('friends/' + uid).remove(),
      db.ref('friendRequests/' + uid).remove(),
      db.ref('companySales').orderByChild('ownerUid').equalTo(uid).once('value').then(snap => {
        const upd = {};
        snap.forEach(c => { upd[c.key] = null; });
        return Object.keys(upd).length ? db.ref('companySales').update(upd) : Promise.resolve();
      }),
    ]).catch(err => console.error('deletePlayerData error:', err));
  },

  // === SCANDALS ===
  pushScandal(sym, text, ownerUid) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('scandals/' + sym).set({ text, ownerUid, firedAt: Date.now(), suppressed: false })
      .catch(err => console.error('pushScandal error:', err));
  },

  suppressScandal(sym) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('scandals/' + sym).update({ suppressed: true, suppressedAt: Date.now() })
      .catch(err => console.error('suppressScandal error:', err));
  },

  listenScandals(cb) {
    if (!this.isOnline()) return;
    this.db.ref('scandals').on('value', snap => cb(snap.val() || {}),
      err => console.warn('listenScandals denied:', err.code));
  },

  // === STOCK DELETION (remove individual stock from company) ===
  pushStockDeletion(symbol, pricePerShare, refund) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('stockDeletions/' + symbol).set({ symbol, pricePerShare: pricePerShare || 0, refund: !!refund, ts: Date.now() })
      .catch(err => console.error('pushStockDeletion error:', err));
  },

  listenStockDeletions(cb) {
    if (!this.isOnline()) return;
    this.db.ref('stockDeletions').on('child_added', snap => {
      const data = snap.val();
      if (!data || Date.now() - (data.ts || 0) > 30000) return;
      cb(data);
    }, err => console.warn('listenStockDeletions denied:', err.code));
  },

  // === COMPETITORS ===
  pushCompetitor(theirUid, data) {
    if (!this.isOnline() || !this.uid) return Promise.resolve();
    return this.db.ref('competitors/' + this.uid + '/' + theirUid).set(data)
      .catch(err => console.error('pushCompetitor error:', err));
  },

  removeCompetitor(theirUid) {
    if (!this.isOnline() || !this.uid) return Promise.resolve();
    return this.db.ref('competitors/' + this.uid + '/' + theirUid).remove()
      .catch(err => console.error('removeCompetitor error:', err));
  },

  listenCompetitors(cb) {
    if (!this.isOnline() || !this.uid) return;
    this.db.ref('competitors/' + this.uid).on('value', snap => cb(snap.val() || {}),
      err => console.warn('listenCompetitors denied:', err.code));
  },

  // === ALLIES ===
  pushAlly(theirUid, data) {
    if (!this.isOnline() || !this.uid) return Promise.resolve();
    return this.db.ref('allies/' + this.uid + '/' + theirUid).set(data)
      .catch(err => console.error('pushAlly error:', err));
  },

  removeAlly(theirUid) {
    if (!this.isOnline() || !this.uid) return Promise.resolve();
    return this.db.ref('allies/' + this.uid + '/' + theirUid).remove()
      .catch(err => console.error('removeAlly error:', err));
  },

  listenAllies(cb) {
    if (!this.isOnline() || !this.uid) return;
    this.db.ref('allies/' + this.uid).on('value', snap => cb(snap.val() || {}),
      err => console.warn('listenAllies denied:', err.code));
  },

  pushAllyNotification(targetUid, fromName, stockSym) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('allyNotifications/' + targetUid).push({ fromName, stockSym, ts: Date.now() })
      .catch(err => console.error('pushAllyNotification error:', err));
  },

  listenAllyNotifications(cb) {
    if (!this.isOnline() || !this.uid) return;
    this.db.ref('allyNotifications/' + this.uid).on('child_added', snap => {
      const data = snap.val();
      if (!data || Date.now() - (data.ts || 0) > 30000) return;
      cb(data);
    }, err => console.warn('listenAllyNotifications denied:', err.code));
  },

  // === SABOTAGE NOTIFICATIONS ===
  pushSabotageNotification(targetUid, fromName, success, stockSym) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('sabotageNotifications/' + targetUid).push({ fromName, success, stockSym, ts: Date.now() })
      .catch(err => console.error('pushSabotageNotification error:', err));
  },

  listenSabotageNotifications(cb) {
    if (!this.isOnline() || !this.uid) return;
    this.db.ref('sabotageNotifications/' + this.uid).on('child_added', snap => {
      const data = snap.val();
      if (!data || Date.now() - (data.ts || 0) > 30000) return;
      cb(data);
    }, err => console.warn('listenSabotageNotifications denied:', err.code));
  },

  // Clean up stale player stock prices for deleted symbols
  removePlayerStockPrices(symbols) {
    if (!this.isOnline() || !symbols || !symbols.length) return;
    const upd = {};
    symbols.forEach(sym => { upd[sym] = null; });
    this.db.ref('playerStockPrices').update(upd)
      .catch(err => console.error('removePlayerStockPrices error:', err));
  },

  // === ADMIN FORCE-REMOVE PLAYER STOCK ===
  adminRemoveStock(sym, ownerUid) {
    if (!this.isOnline()) return Promise.resolve();
    // 1. Signal all clients to drop holdings (no refund)
    this.pushStockDeletion(sym, 0, false);
    // 2. Remove price data
    this.removePlayerStockPrices([sym]);
    // 3. Remove stock from owner's company data in Firebase
    return this.db.ref('companies/' + ownerUid).once('value').then(snap => {
      const data = snap.val();
      if (!data) return;
      const companies = data.companies || (data.stocks ? [data] : []);
      let changed = false;
      companies.forEach(c => {
        if (!c.stocks) return;
        const idx = c.stocks.findIndex(s => s.symbol === sym);
        if (idx >= 0) { c.stocks.splice(idx, 1); changed = true; }
        if ((c.mainIdx || 0) >= c.stocks.length) c.mainIdx = 0;
      });
      if (!changed) return;
      return this.db.ref('companies/' + ownerUid).update({ companies });
    }).catch(err => console.error('adminRemoveStock error:', err));
  },

  // === ADMIN SET COMPANY PERSONALITY ===
  adminSetCompanyPersonality(ownerUid, ticker, newPersonality) {
    if (!this.isOnline()) return Promise.resolve();
    const PD = { standard: { basePrice: 100, vol: 0.05 }, extreme: { basePrice: 100, vol: 0.18 }, penny: { basePrice: 0.50, vol: 0.25 } };
    const pd = PD[newPersonality] || PD.standard;
    return this.db.ref('companies/' + ownerUid).once('value').then(snap => {
      const data = snap.val();
      if (!data) return;
      const companies = data.companies || (data.stocks ? [data] : []);
      let changed = false;
      companies.forEach(c => {
        if (c.ticker !== ticker) return;
        const oldPersonality = c.personality || 'standard';
        c.personality = newPersonality;
        (c.stocks || []).forEach(s => {
          s.vol = pd.vol;
          if (newPersonality === 'penny') {
            s.basePrice = pd.basePrice; // reset to $0.50
          } else if (oldPersonality === 'penny' || (s.basePrice || 100) < pd.basePrice) {
            s.basePrice = pd.basePrice; // lift to at least $100
          }
        });
        changed = true;
      });
      if (!changed) return;
      return this.db.ref('companies/' + ownerUid).update({ companies });
    }).catch(err => console.error('adminSetCompanyPersonality error:', err));
  },

  // === ADMIN MANAGEMENT ===
  _listenAdmins() {
    if (!this.isOnline()) return;
    this.db.ref('admins').on('value', snap => {
      const data = snap.val() || {};
      if (typeof Admin !== 'undefined') Admin.onAdminsUpdate(data);
    }, err => console.warn('Firebase admins listen denied:', err.code));
  },

  grantAdmin(uid, name) {
    if (!this.isOnline()) return;
    this.db.ref('admins/' + uid).set({ name, grantedAt: Date.now() })
      .catch(err => console.error('grantAdmin error:', err));
  },

  revokeAdmin(uid) {
    if (!this.isOnline()) return;
    this.db.ref('admins/' + uid).remove()
      .catch(err => console.error('revokeAdmin error:', err));
  },

  // === PRIVATE SHARE OFFERS ===
  sendShareOffer(recipientUid, offer) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('privateShareOffers/' + recipientUid).push(offer)
      .catch(err => console.error('sendShareOffer error:', err));
  },

  listenShareOffers(uid, cb) {
    if (!this.isOnline()) return;
    this.db.ref('privateShareOffers/' + uid).on('value', snap => cb(snap.val() || {}));
  },

  removeShareOffer(recipientUid, offerId) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('privateShareOffers/' + recipientUid + '/' + offerId).remove();
  },

  // === HUNGER ADMIN BROADCAST ===
  listenAdminHunger(cb) {
    if (!this.isOnline()) return;
    this.db.ref('adminHunger').on('value', snap => {
      const data = snap.val();
      if (data && typeof data.value === 'number') cb(data.value);
    }, err => console.error('adminHunger read error:', err.code));
  },

  // === PLAYER COINS ===
  createPlayerCoin(coinData) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('playerCoins/' + this.uid).set({ ...coinData, ownerUid: this.uid, foundedAt: Date.now() });
  },

  updatePlayerCoin(uid, updates) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('playerCoins/' + uid).update(updates);
  },

  removePlayerCoin(uid) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('playerCoins/' + uid).remove();
  },

  listenPlayerCoins(cb) {
    if (!this.isOnline()) return;
    this.db.ref('playerCoins').on('value', snap => cb(snap.val() || {}),
      err => console.error('playerCoins read error:', err.code));
  },

  pushPlayerCoinPrices(prices, sessionId) {
    if (!this.isOnline() || !this._isPlayerCoinAuthority) return;
    this.db.ref('playerCoinPrices/data').set({
      prices, timestamp: Date.now(), sessionId: sessionId || this._sessionId,
    }).catch(err => console.error('playerCoinPrices write error:', err));
  },

  listenPlayerCoinPrices(cb) {
    if (!this.isOnline()) return;
    this.db.ref('playerCoinPrices/data').on('value', snap => {
      const d = snap.val();
      if (d && d.prices && d.sessionId !== this._sessionId) cb(d.prices);
    }, err => console.error('playerCoinPrices read error:', err.code));
  },

  tradeInfluenceCoin(sym, dir) {
    if (!this.isOnline()) return;
    const ref = this.db.ref('tradeInfluenceCoin/' + sym);
    ref.transaction(cur => {
      const d = cur || { dir, sellCount: 0, buyCount: 0, pct: 0, ts: Date.now() };
      if (dir === 'buy') d.buyCount = (d.buyCount || 0) + 1;
      else d.sellCount = (d.sellCount || 0) + 1;
      d.ts = Date.now();
      return d;
    });
  },

  listenTradeInfluenceCoin(sym, cb) {
    if (!this.isOnline()) return;
    this.db.ref('tradeInfluenceCoin/' + sym).on('value', snap => cb(snap.val()));
  },

  // === COIN TRANSFERS ===
  sendCoinTransfer(toUid, sym, amount, fromName) {
    if (!this.isOnline() || !toUid) return;
    return this.db.ref('coinTransfers/' + toUid).push({
      sym, amount, fromName: fromName || 'Player', fromUid: this.uid, ts: Date.now(),
    }).catch(err => console.error('sendCoinTransfer error:', err));
  },

  listenCoinTransfers(uid, cb) {
    if (!this.isOnline() || !uid) return;
    this.db.ref('coinTransfers/' + uid).on('child_added', snap => {
      const data = snap.val();
      if (data) { cb(data); snap.ref.remove(); }
    }, err => console.warn('listenCoinTransfers denied:', err.code));
  },

  setCoinPromotion(sym, promo) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('coinPromotions/' + sym).set(promo);
  },

  updateCoinSold(sym, delta) {
    if (!this.isOnline()) return;
    this.db.ref('coinSold/' + sym).transaction(v => Math.max(0, (v || 0) + delta));
  },

  // === PLAYER COIN SLOTS ===
  postPlayerCoinSlot(uid, slotN, coinData) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('playerCoinSlots/' + uid + '/' + slotN).set({ ...coinData, ownerUid: uid, foundedAt: Date.now() });
  },

  removePlayerCoinSlot(uid, slotN) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('playerCoinSlots/' + uid + '/' + slotN).remove();
  },

  updatePlayerCoinSlot(uid, slotN, updates) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('playerCoinSlots/' + uid + '/' + slotN).update(updates);
  },

  listenPlayerCoinSlots(cb) {
    if (!this.isOnline()) return;
    this.db.ref('playerCoinSlots').on('value', snap => cb(snap.val() || {}),
      err => console.error('playerCoinSlots read error:', err.code));
  },

  // === PLAYER STORES ===
  createStore(storeId, data) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('playerStores/' + storeId).set({ ...data, createdAt: Date.now() });
  },

  updateStore(storeId, updates) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('playerStores/' + storeId).update(updates);
  },

  removeStore(storeId) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('playerStores/' + storeId).remove();
  },

  listenStores(cb) {
    if (!this.isOnline()) return;
    this.db.ref('playerStores').on('value', snap => cb(snap.val() || {}),
      err => console.error('playerStores read error:', err.code));
  },

  // === PLAYER BANKS ===
  createBank(ownerUid, bankData) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('playerBanks/' + ownerUid).set({ ...bankData, createdAt: Date.now() });
  },

  updateBank(ownerUid, updates) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('playerBanks/' + ownerUid).update(updates);
  },

  removeBank(ownerUid) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('playerBanks/' + ownerUid).remove();
  },

  listenBanks(cb) {
    if (!this.isOnline()) return;
    this.db.ref('playerBanks').on('value', snap => cb(snap.val() || {}),
      err => console.error('playerBanks read error:', err.code));
  },

  // Bank vault (deposits)
  depositToVault(ownerUid, depositorUid, vaultData) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('playerBankVaults/' + ownerUid + '/' + depositorUid).set(vaultData);
  },

  updateVault(ownerUid, depositorUid, updates) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('playerBankVaults/' + ownerUid + '/' + depositorUid).update(updates);
  },

  removeVault(ownerUid, depositorUid) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('playerBankVaults/' + ownerUid + '/' + depositorUid).remove();
  },

  removeAllVaults(ownerUid) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('playerBankVaults/' + ownerUid).remove();
  },

  listenMyVaults(depositorUid, cb) {
    if (!this.isOnline()) return;
    // Listen to all vaults where this depositorUid exists — we query per ownerUid as child
    this.db.ref('playerBankVaults').on('value', snap => {
      const all = snap.val() || {};
      const mine = {};
      for (const ownerUid in all) {
        if (all[ownerUid][depositorUid]) mine[ownerUid] = all[ownerUid][depositorUid];
      }
      cb(mine);
    }, err => console.error('playerBankVaults read error:', err.code));
  },

  listenBankVaults(ownerUid, cb) {
    if (!this.isOnline()) return;
    this.db.ref('playerBankVaults/' + ownerUid).on('value', snap => cb(snap.val() || {}),
      err => console.error('bankVaults read error:', err.code));
  },

  // === MAIN ROOM (Global Multiplayer) ===
  listenMainRoom(game, cb) {
    if (!this.isOnline()) return;
    this.db.ref('mainRoom/' + game).on('value', snap => cb(snap.val()));
  },
  setMainRoom(game, data) {
    if (!this.isOnline()) return Promise.resolve();
    return data === null
      ? this.db.ref('mainRoom/' + game).remove()
      : this.db.ref('mainRoom/' + game).set(data);
  },

  // Atomically create a room only if it doesn't exist (for auto-spin)
  tryOpenAutoRoom(game, roomData) {
    if (!this.isOnline()) return Promise.resolve(false);
    return new Promise(resolve => {
      this.db.ref('mainRoom/' + game).transaction(cur => {
        if (cur !== null) return; // abort — room already exists
        return roomData;
      }, (err, committed) => resolve(!!committed));
    });
  },
  updateMainRoom(game, updates) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('mainRoom/' + game).update(updates);
  },
  joinMainRoom(game, uid, playerData) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('mainRoom/' + game + '/players/' + uid).set(playerData);
  },
  claimMainRoomHost(game, cb) {
    if (!this.isOnline()) return;
    this.db.ref('mainRoom/' + game + '/host').transaction(cur => {
      if (!cur) return this.uid;
      return undefined;
    }, (err, committed, snap) => {
      if (committed) {
        this.db.ref('mainRoom/' + game + '/hostSession').set(this._sessionId);
      }
      cb(committed && snap && snap.val() === this.uid);
    });
  },

  // === NEWS ORGS ===
  setNewsOrg(ownerUid, entityKey, data) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('newsOrgs/' + ownerUid + '/' + entityKey).set(data);
  },

  postNewsArticle(ownerUid, postData) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('newsPosts/' + ownerUid).push(postData);
  },

  voteNewsPost(ownerUid, postId, dir) {
    // dir: 'up' or 'down'
    if (!this.isOnline()) return;
    this.db.ref('newsPosts/' + ownerUid + '/' + postId + '/' + dir + 'votes').transaction(v => (v || 0) + 1);
  },

  listenNewsOrgs(cb) {
    if (!this.isOnline()) return;
    this.db.ref('newsOrgs').on('value', snap => cb(snap.val() || {}),
      err => console.warn('listenNewsOrgs denied:', err.code));
  },

  listenNewsPosts(cb) {
    if (!this.isOnline()) return;
    this.db.ref('newsPosts').on('value', snap => cb(snap.val() || {}),
      err => console.warn('listenNewsPosts denied:', err.code));
  },

  // === STOCK OFFERS (company-to-company transfers) ===
  postStockOffer(targetTicker, offerUid, offerData) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('stockOffers/' + targetTicker + '/' + offerUid).set(offerData);
  },

  removeStockOffer(targetTicker, offerUid) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('stockOffers/' + targetTicker + '/' + offerUid).remove();
  },

  listenStockOffers(cb) {
    if (!this.isOnline()) return;
    this.db.ref('stockOffers').on('value', snap => cb(snap.val() || {}),
      err => console.warn('listenStockOffers denied:', err.code));
  },

  // === P2P LOANS ===
  updatePlayerLoan(loanId, updates) {
    if (!this.isOnline()) return Promise.reject('offline');
    return this.db.ref('playerLoans/' + loanId).update(updates);
  },

  // === SYSTEM ANNOUNCEMENTS ===
  pushSystemAnnouncement(text) {
    if (!this.isOnline()) return;
    this.db.ref('chat').push({
      name: '\u{1F4E2} SYSTEM', text, ts: Date.now(), uid: 'system', system: true,
    }).catch(() => {});
  },

  // === M&A ACQUISITION TRANSFERS ===
  sendAcquisitionTransfer(buyerUid, data) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('acquisitionTransfers/' + buyerUid).push(data);
  },
  listenAcquisitionTransfers(uid, cb) {
    if (!this.isOnline()) return;
    this.db.ref('acquisitionTransfers/' + uid).on('value', snap => cb(snap.val() || {}));
  },
  removeAcquisitionTransfer(uid, transferId) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('acquisitionTransfers/' + uid + '/' + transferId).remove();
  },

  // === PRIVATE ROOMS ===
  createPrivateRoom(roomId, data) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('privateRooms/' + roomId).set(data);
  },
  listenPrivateRoom(roomId, cb) {
    if (!this.isOnline()) return;
    this.db.ref('privateRooms/' + roomId).on('value', snap => cb(snap.val()));
  },
  stopListenPrivateRoom(roomId) {
    if (!this.db) return;
    this.db.ref('privateRooms/' + roomId).off();
  },
  updatePrivateRoom(roomId, updates) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('privateRooms/' + roomId).update(updates);
  },
  joinPrivateRoom(roomId, uid, playerData) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('privateRooms/' + roomId + '/players/' + uid).set(playerData);
  },
  deletePrivateRoom(roomId) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('privateRooms/' + roomId).remove();
  },
  sendInvite(targetUid, inviteData) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('playerInvites/' + targetUid).push(inviteData);
  },
  removeInvite(targetUid, inviteId) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('playerInvites/' + targetUid + '/' + inviteId).remove();
  },
  listenInvites(uid, cb) {
    if (!this.isOnline()) return;
    this.db.ref('playerInvites/' + uid).on('value', snap => cb(snap.val() || {}));
  },

  _onInvites(invites) {
    for (const id in invites) {
      if (!this._seenInviteIds[id]) {
        this._seenInviteIds[id] = true;
        this._showInviteOverlay(id, invites[id]);
      }
    }
  },

  _showInviteOverlay(inviteId, inv) {
    const appEl = document.getElementById('app');
    if (!appEl) return;
    const el = document.createElement('div');
    el.className = 'invite-overlay';
    el.id = 'invite-' + inviteId;
    const gameName = inv.type === 'coinflip' ? 'Coin Flip Challenge'
      : (inv.game ? inv.game.charAt(0).toUpperCase() + inv.game.slice(1) : 'Game');
    const hostName = this._escapeHtml(inv.hostName || 'Someone');
    const code = inv.code ? `<div class="invite-code">${this._escapeHtml(inv.code)}</div>` : '';
    el.innerHTML = `
      <div class="invite-box">
        <div class="invite-title">\u{1F514} ${hostName} invited you</div>
        <div class="invite-body">${gameName}${code}</div>
        <div class="invite-actions">
          <button class="invite-accept" onclick="Firebase._acceptInvite('${inviteId}','${inv.roomId || ''}','${inv.game || ''}',this)">Accept</button>
          <button class="invite-decline" onclick="Firebase._declineInvite('${inviteId}',this)">Decline</button>
        </div>
      </div>`;
    appEl.appendChild(el);
    // Slide in
    requestAnimationFrame(() => el.classList.add('invite-visible'));
    // Auto-remove after 30s
    setTimeout(() => { if (el.parentNode) { el.remove(); this.removeInvite(this.uid, inviteId); } }, 30000);
  },

  _acceptInvite(inviteId, roomId, game, btnEl) {
    const el = btnEl.closest('.invite-overlay');
    if (el) el.remove();
    this.removeInvite(this.uid, inviteId);
    if (game === 'coinflip') {
      App.showScreen('coinflip');
      if (typeof CoinFlip !== 'undefined') { CoinFlip.setTab('pvp'); }
    } else if (roomId && game) {
      App.showScreen(game);
      if (typeof PrivateRoom !== 'undefined') PrivateRoom.join(roomId, game);
    }
  },

  _declineInvite(inviteId, btnEl) {
    const el = btnEl.closest('.invite-overlay');
    if (el) el.remove();
    this.removeInvite(this.uid, inviteId);
  },

  // === HOUSES MARKETPLACE ===
  listHouseForSale(house, price) {
    if (!this.isOnline() || !this.uid) return Promise.resolve();
    const listing = Object.assign({}, house, {
      listingPrice: price,
      sellerUid: this.uid,
      sellerName: typeof Settings !== 'undefined' ? Settings.options.playerName : 'Unknown',
      listedAt: Date.now(),
    });
    return this.db.ref('houseListings/' + house.id).set(listing)
      .catch(err => console.error('listHouseForSale error:', err));
  },

  cancelHouseListing(houseId) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('houseListings/' + houseId).remove()
      .catch(err => console.error('cancelHouseListing error:', err));
  },

  async buyHouseListing(listingId, price, sellerUid) {
    if (!this.isOnline() || !this.uid) return;
    await this.db.ref('houseListings/' + listingId).remove()
      .catch(err => console.error('buyHouseListing remove error:', err));
    if (sellerUid) {
      await this.db.ref('saleReceipts/' + sellerUid).push({
        amount: price,
        type: 'house',
        houseId: listingId,
        buyerUid: this.uid,
        buyerName: typeof Settings !== 'undefined' ? Settings.options.playerName : 'Unknown',
        ts: Date.now(),
      }).catch(err => console.error('buyHouseListing receipt error:', err));
    }
  },

  listenHouseListings(cb) {
    if (!this.isOnline()) return;
    this.db.ref('houseListings').on('value', snap => cb(snap.val() || {}),
      err => console.warn('listenHouseListings denied:', err.code));
  },

  // === ITEM MARKETPLACE ===
  listItem(item, price) {
    if (!this.isOnline() || !this.uid) return Promise.resolve();
    const listing = {
      sellerUid: this.uid,
      sellerName: typeof Settings !== 'undefined' ? Settings.options.playerName : 'Unknown',
      item,
      price,
      listedAt: Date.now(),
    };
    return this.db.ref('itemListings').push(listing)
      .catch(err => console.error('listItem error:', err));
  },

  delistItem(listingId) {
    if (!this.isOnline()) return Promise.resolve();
    this.db.ref('itemListings/' + listingId).once('value').then(snap => {
      const listing = snap.val();
      if (listing && listing.sellerUid === this.uid && listing.item) {
        if (typeof Crafting !== 'undefined') {
          Crafting._inventory.push(listing.item);
          App.save();
          Crafting._triggerRender();
          Toast.show('Item returned to inventory', '#4caf50', 2000);
        }
      }
    });
    return this.db.ref('itemListings/' + listingId).remove()
      .catch(err => console.error('delistItem error:', err));
  },

  async buyItem(listingId, price, sellerUid) {
    if (!this.isOnline() || !this.uid) return;
    await this.db.ref('itemListings/' + listingId).remove()
      .catch(err => console.error('buyItem remove error:', err));
    if (sellerUid) {
      await this.db.ref('saleReceipts/' + sellerUid).push({
        amount: price,
        type: 'item',
        listingId,
        buyerUid: this.uid,
        buyerName: typeof Settings !== 'undefined' ? Settings.options.playerName : 'Unknown',
        ts: Date.now(),
      }).catch(err => console.error('buyItem receipt error:', err));
    }
  },

  listenItemListings(cb) {
    if (!this.isOnline()) return;
    this.db.ref('itemListings').limitToFirst(50).on('value', snap => cb(snap.val() || {}),
      err => console.warn('listenItemListings denied:', err.code));
  },

  // === CUSTOM PET MARKETPLACE ===
  listenPetListings(cb) {
    if (!this.isOnline()) return;
    this.db.ref('petListings').limitToFirst(100).on('value', snap => cb(snap.val() || {}),
      err => console.warn('listenPetListings denied:', err.code));
  },

  listCustomPet(pet, price) {
    if (!this.isOnline() || !this.uid) return Promise.resolve();
    return this.db.ref('petListings').push({
      sellerUid: this.uid,
      sellerName: typeof Settings !== 'undefined' ? Settings.options.playerName : 'Trainer',
      pet, price, listedAt: Date.now(),
    }).catch(err => console.error('listCustomPet error:', err));
  },

  async buyCustomPet(listingId, price, sellerUid) {
    if (!this.isOnline() || !this.uid) return;
    await this.db.ref('petListings/' + listingId).remove().catch(() => {});
    if (sellerUid) {
      await this.db.ref('saleReceipts/' + sellerUid).push({
        amount: price, type: 'custom_pet', listingId,
        buyerUid: this.uid,
        buyerName: typeof Settings !== 'undefined' ? Settings.options.playerName : 'Unknown',
        ts: Date.now(),
      }).catch(() => {});
    }
  },

  delistCustomPet(listingId, btn) {
    if (!this.isOnline()) return;
    this.db.ref('petListings/' + listingId).once('value').then(snap => {
      const listing = snap.val();
      if (listing && listing.sellerUid === this.uid && listing.pet) {
        if (typeof Pets !== 'undefined') {
          Pets._customPets.push({ ...listing.pet });
          App.save();
          Pets.render();
          Toast.show('🐾 Pet returned', '#4caf50', 2000);
        }
      }
    });
    this.db.ref('petListings/' + listingId).remove().catch(() => {});
  },

  // === FOOD MENUS ===
  listenFoodMenus(cb) {
    if (!this.isOnline()) return;
    this.db.ref('foodMenus').on('value', snap => cb(snap.val() || {}),
      err => console.warn('listenFoodMenus denied:', err.code));
  },

  createFoodMenuItem(ownerUid, menuItemId, data) {
    if (!this.isOnline() || !this.uid) return Promise.resolve();
    return this.db.ref('foodMenus/' + ownerUid + '/' + menuItemId).set(data)
      .catch(err => console.error('createFoodMenuItem error:', err));
  },

  removeFoodMenuItem(ownerUid, menuItemId) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('foodMenus/' + ownerUid + '/' + menuItemId).remove()
      .catch(err => console.error('removeFoodMenuItem error:', err));
  },

  async buyFoodMenuItem(ownerUid, menuItemId, price) {
    if (!this.isOnline() || !this.uid) return { ok: false };
    const ref = this.db.ref('foodMenus/' + ownerUid + '/' + menuItemId);
    const snap = await ref.once('value').catch(() => null);
    const entry = snap && snap.val();
    if (!entry) return { ok: false, reason: 'not_found' };
    if (entry.expiresAt && Date.now() > entry.expiresAt) return { ok: false, reason: 'expired' };

    if (entry.qty !== null && entry.qty !== undefined) {
      // Limited — use transaction to decrement
      const result = await ref.transaction(cur => {
        if (!cur || cur.qty <= 0) return; // abort
        return { ...cur, qty: cur.qty - 1, totalSold: (cur.totalSold || 0) + 1 };
      }).catch(() => ({ committed: false }));
      if (!result.committed) return { ok: false, reason: 'sold_out' };
      if ((result.snapshot.val()?.qty ?? 1) <= 0) await ref.remove().catch(() => {});
    } else {
      await ref.update({ totalSold: (entry.totalSold || 0) + 1 }).catch(() => {});
    }

    await this.db.ref('saleReceipts/' + ownerUid).push({
      amount: price, type: 'food_menu', menuItemId,
      buyerUid: this.uid,
      buyerName: typeof Settings !== 'undefined' ? Settings.options.playerName : 'Unknown',
      ts: Date.now(),
    }).catch(() => {});

    return { ok: true };
  },

  // === ITEM TEMPLATES (Limited Edition) ===
  listenItemTemplates(cb) {
    if (!this.isOnline()) return;
    this.db.ref('itemTemplates').limitToFirst(100).on('value', snap => cb(snap.val() || {}),
      err => console.warn('listenItemTemplates denied:', err.code));
  },

  postItemTemplate(id, data) {
    if (!this.isOnline() || !this.uid) return Promise.resolve();
    return this.db.ref('itemTemplates/' + id).set(data)
      .catch(err => console.error('postItemTemplate error:', err));
  },

  delistItemTemplate(id) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('itemTemplates/' + id).remove()
      .catch(err => console.error('delistItemTemplate error:', err));
  },

  updateItemTemplateName(id, name) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('itemTemplates/' + id + '/baseItem/name').set(name)
      .catch(err => console.error('updateItemTemplateName error:', err));
  },

  updateItemTemplatePixels(id, pixels) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('itemTemplates/' + id + '/baseItem/pixels').set(pixels)
      .catch(err => console.error('updateItemTemplatePixels error:', err));
  },

  async mintItemTemplate(id) {
    if (!this.isOnline() || !this.uid) return { ok: false };
    const ref = this.db.ref('itemTemplates/' + id + '/mintCount');
    const tplRef = this.db.ref('itemTemplates/' + id);
    // Read limit first
    const snap = await tplRef.once('value').catch(() => null);
    if (!snap) return { ok: false };
    const tpl = snap.val();
    if (!tpl) return { ok: false };
    const limit = tpl.mintLimit || 0;
    return new Promise(resolve => {
      ref.transaction(current => {
        const count = current || 0;
        if (count >= limit) return; // abort
        return count + 1;
      }, (err, committed, snap) => {
        if (err || !committed) { resolve({ ok: false }); return; }
        resolve({ ok: true, newCount: snap.val() });
      });
    });
  },

  // === BANK LOANS ===
  createBankLoan(lenderUid, borrowerUid, data) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('playerBankLoans/' + lenderUid + '/' + borrowerUid).set(data)
      .catch(err => console.error('createBankLoan error:', err));
  },

  updateBankLoan(lenderUid, borrowerUid, updates) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('playerBankLoans/' + lenderUid + '/' + borrowerUid).update(updates)
      .catch(err => console.error('updateBankLoan error:', err));
  },

  repayBankLoan(lenderUid, borrowerUid) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('playerBankLoans/' + lenderUid + '/' + borrowerUid).remove()
      .catch(err => console.error('repayBankLoan error:', err));
  },

  listenBankLoans(lenderUid, cb) {
    if (!this.isOnline()) return;
    this.db.ref('playerBankLoans/' + lenderUid).on('value', snap => cb(snap.val() || {}),
      err => console.warn('listenBankLoans denied:', err.code));
  },

  listenMyLoansOwed(myUid, cb) {
    if (!this.isOnline()) return;
    // Listen to all lender buckets for this borrower
    this.db.ref('playerBankLoans').on('value', snap => {
      const all = snap.val() || {};
      const owed = {};
      for (const lenderUid in all) {
        if (all[lenderUid] && all[lenderUid][myUid]) {
          owed[lenderUid] = all[lenderUid][myUid];
        }
      }
      cb(owed);
    }, err => console.warn('listenMyLoansOwed denied:', err.code));
  },

  // === GOD MANSIONS ===
  listenGodMansions(cb) {
    if (!this.isOnline()) return;
    this.db.ref('godMansions').on('value', snap => cb(snap.val() || {}),
      err => console.warn('listenGodMansions denied:', err.code));
  },

  async claimGodMansion(mansionId) {
    if (!this.isOnline() || !this.uid) return { ok: false, reason: 'offline' };
    const ref = this.db.ref('godMansions/' + mansionId);
    return new Promise(resolve => {
      ref.transaction(current => {
        if (current && current.ownerUid) return; // abort — already owned
        return {
          ownerUid: this.uid,
          ownerName: typeof Settings !== 'undefined' ? Settings.options.playerName : 'Unknown',
          claimedAt: Date.now(),
          listedForSale: false,
          listingPrice: null,
        };
      }, (err, committed, snap) => {
        if (err) { resolve({ ok: false, reason: err.message }); return; }
        if (!committed) { resolve({ ok: false, reason: 'taken' }); return; }
        resolve({ ok: true, data: snap.val() });
      });
    });
  },

  updateGodMansionListing(mansionId, listingPrice) {
    if (!this.isOnline() || !this.uid) return Promise.resolve();
    const update = listingPrice != null
      ? { listedForSale: true, listingPrice }
      : { listedForSale: false, listingPrice: null };
    return this.db.ref('godMansions/' + mansionId).update(update)
      .catch(err => console.error('updateGodMansionListing error:', err));
  },

  async buyGodMansionListing(mansionId, price, sellerUid) {
    if (!this.isOnline() || !this.uid) return { ok: false, reason: 'offline' };
    const ref = this.db.ref('godMansions/' + mansionId);
    return new Promise(resolve => {
      ref.transaction(current => {
        if (!current || !current.listedForSale || current.listingPrice !== price) return; // abort
        if (current.ownerUid !== sellerUid) return; // abort
        return {
          ...current,
          ownerUid: this.uid,
          ownerName: typeof Settings !== 'undefined' ? Settings.options.playerName : 'Unknown',
          listedForSale: false,
          listingPrice: null,
          boughtAt: Date.now(),
        };
      }, (err, committed, snap) => {
        if (err) { resolve({ ok: false, reason: err.message }); return; }
        if (!committed) { resolve({ ok: false, reason: 'stale' }); return; }
        // Send receipt to seller
        if (sellerUid) {
          this.db.ref('saleReceipts/' + sellerUid).push({
            amount: price, type: 'godMansion', mansionId,
            buyerUid: this.uid,
            buyerName: typeof Settings !== 'undefined' ? Settings.options.playerName : 'Unknown',
            ts: Date.now(),
          }).catch(() => {});
        }
        resolve({ ok: true, data: snap.val() });
      });
    });
  },

  // === CAR MARKETPLACE ===
  listCarForSale(car, price) {
    if (!this.isOnline() || !this.uid) return Promise.resolve(null);
    const listing = {
      sellerUid: this.uid,
      sellerName: typeof Settings !== 'undefined' ? Settings.options.playerName : 'Unknown',
      car,
      price,
      listedAt: Date.now(),
    };
    return this.db.ref('carListings').push(listing)
      .then(ref => ref.key)
      .catch(err => { console.error('listCarForSale error:', err); return null; });
  },

  delistCar(listingId) {
    if (!this.isOnline()) return Promise.resolve();
    return this.db.ref('carListings/' + listingId).once('value').then(snap => {
      const listing = snap.val();
      if (listing && listing.sellerUid === this.uid && listing.car) {
        if (typeof Cars !== 'undefined') {
          Cars._garage.push(listing.car);
          App.save();
          Cars._triggerRender && Cars._triggerRender();
          Toast.show('Car returned to garage', '#4caf50', 2000);
        }
      }
      return this.db.ref('carListings/' + listingId).remove();
    }).catch(err => console.error('delistCar error:', err));
  },

  async buyCarListing(listingId, price, sellerUid) {
    if (!this.isOnline() || !this.uid) return { ok: false, reason: 'offline' };
    const ref = this.db.ref('carListings/' + listingId);
    return new Promise(resolve => {
      ref.transaction(current => {
        if (!current || current.price !== price || current.sellerUid !== sellerUid) return; // abort
        return null; // remove listing
      }, (err, committed, snap) => {
        if (err) { resolve({ ok: false, reason: err.message }); return; }
        if (!committed) { resolve({ ok: false, reason: 'stale' }); return; }
        // Send receipt to seller
        if (sellerUid) {
          this.db.ref('saleReceipts/' + sellerUid).push({
            amount: price, type: 'car', listingId,
            buyerUid: this.uid,
            buyerName: typeof Settings !== 'undefined' ? Settings.options.playerName : 'Unknown',
            ts: Date.now(),
          }).catch(() => {});
        }
        resolve({ ok: true });
      });
    });
  },

  listenCarListings(cb) {
    if (!this.isOnline()) return;
    this.db.ref('carListings').limitToFirst(100).on('value', snap => cb(snap.val() || {}),
      err => console.warn('listenCarListings denied:', err.code));
  },

  // All player companies — used by Properties gas station supplier
  listenAllCompaniesForProperties(cb) {
    if (!this.isOnline()) return;
    this.db.ref('companies').on('value', snap => cb(snap.val() || {}),
      err => console.warn('listenAllCompanies denied:', err.code));
  },
};
