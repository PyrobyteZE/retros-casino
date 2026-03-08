// Social screen — Party, Hitman, Fake News Market
const Social = {
  _tab: 'party',
  _partyInput: '',
  _partyCooldown: 0,
  _hitmanContracts: {},
  _newsStories: {},
  _hitmanActive: false,
  _hitmanExpiresAt: 0,
  _initialized: false,
  _styleInjected: false,
  _tickTimer: null,

  _injectStyle() {
    if (this._styleInjected) return;
    this._styleInjected = true;
    const css = `
      .social-tabs { display: flex; gap: 4px; margin-bottom: 14px; }
      .social-tab { flex: 1; padding: 9px 6px; border: none; border-radius: 8px; background: var(--bg3, #16213e); color: var(--text-dim, #aaa); font-size: 12px; cursor: pointer; }
      .social-tab.active { background: var(--green, #00e676); color: #000; font-weight: 700; }
      .social-section { background: var(--bg3, #16213e); border-radius: 12px; padding: 14px; margin-bottom: 12px; }
      .social-section h3 { margin: 0 0 10px; font-size: 14px; color: var(--text, #eee); }
      .social-input-row { display: flex; gap: 8px; margin-bottom: 10px; }
      .social-input { flex: 1; padding: 9px; border-radius: 6px; border: 1px solid #333; background: var(--bg, #0f0f1a); color: var(--text, #eee); font-size: 13px; }
      .social-btn { padding: 9px 16px; border: none; border-radius: 6px; background: var(--green, #00e676); color: #000; font-weight: 700; font-size: 13px; cursor: pointer; white-space: nowrap; }
      .social-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .social-btn.danger { background: #e53935; color: #fff; }
      .social-info { font-size: 12px; color: var(--text-dim, #aaa); margin-bottom: 8px; }
      .social-player-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
      .social-player-row:last-child { border-bottom: none; }
      .social-player-name { font-size: 13px; font-weight: 600; }
      .social-player-bal { font-size: 12px; color: var(--text-dim, #aaa); }
      .social-story-card { background: var(--bg, #0f0f1a); border-radius: 8px; padding: 10px; margin-bottom: 8px; }
      .social-story-header { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
      .social-story-meta { font-size: 11px; color: var(--text-dim, #aaa); }
      .social-hitman-active { background: #b71c1c; border-radius: 8px; padding: 10px; margin-bottom: 10px; font-size: 13px; color: #fff; }
      .social-label { font-size: 12px; color: var(--text-dim, #aaa); margin-bottom: 4px; }
      .social-select { width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #333; background: var(--bg, #0f0f1a); color: var(--text, #eee); font-size: 13px; margin-bottom: 8px; }
      .social-radio-row { display: flex; gap: 12px; margin-bottom: 10px; }
      .social-radio-label { font-size: 13px; color: var(--text, #eee); display: flex; align-items: center; gap: 4px; cursor: pointer; }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  },

  init() {
    this._injectStyle();
    this._initialized = true;
    this._initFirebaseListeners();
    if (!this._tickTimer) {
      this._tickTimer = setInterval(() => this._checkHitman(), 60000);
    }
    this._render();
  },

  _initFirebaseListeners() {
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) return;

    // Listen for parties
    Firebase.listenParties(data => {
      if (!data) return;
      const myUid = Firebase.uid;
      const perPlayer = data.perPlayer || 0;
      // Don't credit yourself — you already paid
      if (data.throwerUid !== myUid && perPlayer > 0) {
        App.addBalance(perPlayer);
        const name = data.throwerName || 'Someone';
        const total = App.formatMoney(data.amount || 0);
        const share = App.formatMoney(perPlayer);
        Toast.show('\u{1F389} ' + name + ' threw a party! You got +' + share, '#4caf50', 5000);
      }
    });

    // Listen for hitman contracts on self
    if (Firebase.uid) {
      Firebase.listenHitmanContracts(Firebase.uid, contracts => {
        this._hitmanContracts = contracts || {};
        const now = Date.now();
        let found = false;
        let latest = 0;
        Object.values(this._hitmanContracts).forEach(c => {
          if (c && c.expiresAt && c.expiresAt > now) {
            found = true;
            if (c.expiresAt > latest) latest = c.expiresAt;
          }
        });
        if (found && !this._hitmanActive) {
          this._hitmanActive = true;
          this._hitmanExpiresAt = latest;
          Toast.show('\u2620\uFE0F A hitman is on your trail! Income reduced for 1h.', '#e53935', 6000);
        }
        if (!found) {
          this._hitmanActive = false;
          this._hitmanExpiresAt = 0;
        }
      });
    }

    // Listen for news market stories
    Firebase.listenNewsMarket(stories => {
      this._newsStories = stories || {};
      if (App.currentScreen === 'social' && this._tab === 'news') this._render();
    });

    // Listen for news market receipts (credit when someone buys your story)
    if (Firebase.uid) {
      Firebase.db.ref('newsMarket_receipts/' + Firebase.uid).on('child_added', snap => {
        const r = snap.val();
        if (!r || !r.amount) return;
        App.addBalance(r.amount);
        Toast.show('\u{1F4F0} News story sold! +' + App.formatMoney(r.amount), '#4caf50', 4000);
        App.save();
        snap.ref.remove().catch(() => {});
      });
    }
  },

  setTab(tab) {
    this._tab = tab;
    this._render();
  },

  throwParty(amountStr) {
    const now = Date.now();
    if (this._partyCooldown > now) {
      const remaining = Math.ceil((this._partyCooldown - now) / 60000);
      Toast.show('Party cooldown! ' + remaining + ' min remaining.', '#f39c12', 3000);
      return;
    }

    const amount = App.parseAmount ? App.parseAmount(amountStr) : parseFloat(amountStr);
    if (!amount || amount < 10_000_000) {
      Toast.show('Minimum party size: $10M', '#e74c3c', 3000);
      return;
    }
    const capped = Math.min(amount, Math.min(App.balance, 1_000_000_000));
    if (App.balance < capped) {
      Toast.show('Not enough balance!', '#e74c3c', 3000);
      return;
    }

    App.addBalance(-capped);

    const onlinePlayers = (typeof Firebase !== 'undefined' && Firebase.onlinePlayers)
      ? Object.values(Firebase.onlinePlayers).filter(p => p.uid !== Firebase.uid)
      : [];
    const numPlayers = Math.max(onlinePlayers.length, 1);
    const perPlayer = Math.floor(capped / 2 / numPlayers);

    const name = (typeof Settings !== 'undefined') ? (Settings.profile.name || 'Someone') : 'Someone';
    const data = {
      throwerUid: typeof Firebase !== 'undefined' ? Firebase.uid : '',
      throwerName: name,
      amount: capped,
      perPlayer,
      timestamp: Date.now(),
    };

    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.postParty(data);
      Firebase.pushSystemAnnouncement('\u{1F389} ' + name + ' threw a ' + App.formatMoney(capped) + ' party! Everyone got ' + App.formatMoney(perPlayer) + '!');
    }

    this._partyCooldown = now + 3600_000;
    Toast.show('\u{1F389} Party thrown! ' + App.formatMoney(perPlayer) + ' sent to each online player.', '#4caf50', 5000);
    App.save();
    this._render();
  },

  hireHitman(targetUid, targetName, targetBalance) {
    const minCost = 1_000_000;
    const cost = Math.max(minCost, (targetBalance || 0) * 0.005);

    if (App.balance < cost) {
      Toast.show('Not enough money! Need ' + App.formatMoney(cost), '#e74c3c', 3000);
      return;
    }

    App.addBalance(-cost);

    const contractData = {
      expiresAt: Date.now() + 3_600_000,
      hiredAt: Date.now(),
    };

    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.postHitmanContract(targetUid, contractData);
    }

    Toast.show('\u{1F5E1}\uFE0F Hitman hired against ' + targetName + ' for ' + App.formatMoney(cost) + '!', '#e53935', 4000);
    App.save();
    this._render();
  },

  postStory(symbol, direction, priceStr) {
    const price = App.parseAmount ? App.parseAmount(priceStr) : parseFloat(priceStr);
    if (!price || price <= 0) {
      Toast.show('Enter a valid price!', '#e74c3c', 2000);
      return;
    }
    if (!symbol) {
      Toast.show('Select a stock symbol!', '#e74c3c', 2000);
      return;
    }

    const name = (typeof Settings !== 'undefined') ? (Settings.profile.name || 'Player') : 'Player';
    const storyData = {
      sellerUid: typeof Firebase !== 'undefined' ? Firebase.uid : '',
      sellerName: name,
      symbol,
      direction,
      price,
      postedAt: Date.now(),
      expiresAt: Date.now() + 86_400_000,
    };

    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.postNewsStory(storyData);
    }

    Toast.show('\u{1F4F0} Story posted for ' + App.formatMoney(price) + '!', '#4caf50', 3000);
    App.save();
    this._render();
  },

  buyStory(storyId) {
    const story = this._newsStories[storyId];
    if (!story) { Toast.show('Story no longer available!', '#e74c3c', 2000); return; }

    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : '';
    if (story.sellerUid === myUid) {
      Toast.show("You can't buy your own story!", '#e74c3c', 2000);
      return;
    }

    if (App.balance < story.price) {
      Toast.show('Need ' + App.formatMoney(story.price), '#e74c3c', 3000);
      return;
    }

    App.addBalance(-story.price);

    // Credit seller
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.newsMarketReceipt(story.sellerUid, story.price, 'News story: ' + story.symbol);
      Firebase.removeNewsStory(storyId);
    }

    // Apply stock nudge
    this._applyNewsNudge(story.symbol, story.direction, story.price);

    Toast.show('\u{1F4F0} Story purchased! ' + story.symbol + ' ' + story.direction + ' nudge applied.', '#4caf50', 4000);
    App.save();
  },

  _applyNewsNudge(symbol, direction, price) {
    if (typeof Stocks === 'undefined' || !Stocks._stocks) return;
    const stock = Stocks._stocks.find(s => s.ticker === symbol || s.symbol === symbol);
    if (!stock) return;
    // Price magnitude: $10M = 1% nudge, cap at 10%
    const nudgePct = Math.min(0.10, price / 1_000_000_000);
    const mult = direction === 'boost' ? (1 + nudgePct) : (1 - nudgePct);
    stock.price = Math.max(1, (stock.price || 100) * mult);
  },

  _checkHitman() {
    const now = Date.now();
    if (this._hitmanActive && this._hitmanExpiresAt <= now) {
      this._hitmanActive = false;
      this._hitmanExpiresAt = 0;
      Toast.show('\u2714 Hitman contract expired. Income restored.', '#4caf50', 3000);
    }
  },

  getIncomeMultiplier() {
    if (!this._hitmanActive) return 1.0;
    if (Date.now() >= this._hitmanExpiresAt) {
      this._hitmanActive = false;
      return 1.0;
    }
    return 0.3;
  },

  _renderParty() {
    const now = Date.now();
    const onCooldown = this._partyCooldown > now;
    const cooldownMin = onCooldown ? Math.ceil((this._partyCooldown - now) / 60000) : 0;

    let html = `<div class="social-section">
      <h3>\u{1F389} Throw a Party</h3>
      <div class="social-info">Spend $10M–$1B. Half goes to all online players equally, half is spent. 1-hour cooldown.</div>
      <div class="social-input-row">
        <input id="social-party-input" class="social-input sh-input" placeholder="e.g. 100m" value="${this._partyInput}">
        <span class="sh-preview" style="display:none;font-size:11px;color:var(--text-dim);margin-top:4px"></span>
        <button class="social-btn" onclick="Social.throwParty(document.getElementById('social-party-input').value)" ${onCooldown ? 'disabled' : ''}>\u{1F389} Throw Party</button>
      </div>
      ${onCooldown ? `<div style="color:#f39c12;font-size:12px">\u23F3 Cooldown: ${cooldownMin} min remaining</div>` : ''}
    </div>`;
    return html;
  },

  _renderHitman() {
    const now = Date.now();
    let html = '';

    if (this._hitmanActive) {
      const remaining = Math.ceil((this._hitmanExpiresAt - now) / 60000);
      html += `<div class="social-hitman-active">\u2620\uFE0F HITMAN ACTIVE &mdash; Your income is reduced to 30% for ${remaining} more min.</div>`;
    }

    html += `<div class="social-section">
      <h3>\u{1F5E1}\uFE0F Hire a Hitman</h3>
      <div class="social-info">Target an online player to reduce their income by 70% for 1 hour. Cost: 0.5% of their balance (min $1M). Anonymous.</div>`;

    const onlinePlayers = (typeof Firebase !== 'undefined' && Firebase.onlinePlayers)
      ? Object.values(Firebase.onlinePlayers)
      : [];
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : '';
    const others = onlinePlayers.filter(p => p.uid !== myUid);

    if (others.length === 0) {
      html += '<div class="social-info">No other players online right now.</div>';
    } else {
      others.forEach(p => {
        const bal = p.balance || 0;
        const cost = Math.max(1_000_000, bal * 0.005);
        html += `<div class="social-player-row">
          <div>
            <div class="social-player-name">${p.name || 'Player'}</div>
            <div class="social-player-bal">Cost: ${App.formatMoney(cost)}</div>
          </div>
          <button class="social-btn danger" onclick="Social.hireHitman('${p.uid}','${(p.name||'Player').replace(/'/g,"\\'")}',${bal})">\u{1F5E1}\uFE0F Hire</button>
        </div>`;
      });
    }

    html += '</div>';
    return html;
  },

  _renderNewsMarket() {
    // Get available stock symbols
    let symbols = [];
    if (typeof Stocks !== 'undefined' && Stocks._stocks) {
      symbols = Stocks._stocks.map(s => s.ticker || s.symbol).filter(Boolean);
    }
    if (typeof Companies !== 'undefined' && Companies._allPlayerStocks) {
      Companies._allPlayerStocks.forEach(s => {
        if (s.ticker && !symbols.includes(s.ticker)) symbols.push(s.ticker);
      });
    }
    if (symbols.length === 0) symbols = ['AAPL', 'TSLA', 'GOOG'];

    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : '';
    const now = Date.now();

    let html = `<div class="social-section">
      <h3>\u{1F4F0} Post a Story</h3>
      <div class="social-info">Requires a News Org (from Companies). Post a fake news story to move a stock. Other players can buy it to apply the effect.</div>
      <div class="social-label">Stock Symbol</div>
      <select id="social-news-symbol" class="social-select">
        ${symbols.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
      <div class="social-label">Direction</div>
      <div class="social-radio-row">
        <label class="social-radio-label"><input type="radio" name="social-direction" value="boost" checked> \u{1F4C8} Boost</label>
        <label class="social-radio-label"><input type="radio" name="social-direction" value="hit"> \u{1F4C9} Hit Piece</label>
      </div>
      <div class="social-label">Asking Price</div>
      <div class="social-input-row">
        <input id="social-news-price" class="social-input sh-input" placeholder="e.g. 50m">
        <span class="sh-preview" style="display:none;font-size:11px;color:var(--text-dim);margin-top:4px"></span>
        <button class="social-btn" onclick="Social._submitStory()">\u{1F4E4} Post</button>
      </div>
    </div>`;

    const stories = Object.entries(this._newsStories).filter(([id, s]) => s && s.expiresAt > now);

    html += `<div class="social-section">
      <h3>\u{1F4F0} Stories for Sale (${stories.length})</h3>`;

    if (stories.length === 0) {
      html += '<div class="social-info">No stories currently listed.</div>';
    } else {
      stories.forEach(([id, s]) => {
        const dir = s.direction === 'boost' ? '\u{1F4C8} Boost' : '\u{1F4C9} Hit Piece';
        const expiresIn = Math.ceil((s.expiresAt - now) / 3600000);
        const isMine = s.sellerUid === myUid;
        html += `<div class="social-story-card">
          <div class="social-story-header">
            <span><strong>${s.symbol}</strong> &mdash; ${dir}</span>
            <span style="color:var(--green,#00e676)">${App.formatMoney(s.price)}</span>
          </div>
          <div class="social-story-meta">by ${s.sellerName || 'Unknown'} &bull; expires in ${expiresIn}h</div>
          ${isMine
            ? `<button class="social-btn" style="margin-top:8px;background:#333;color:#aaa;" onclick="Social._removeMyStory('${id}')">\u{1F5D1}\uFE0F Remove</button>`
            : `<button class="social-btn" style="margin-top:8px;" onclick="Social.buyStory('${id}')">\u{1F4B0} Buy & Apply</button>`
          }
        </div>`;
      });
    }

    html += '</div>';
    return html;
  },

  _submitStory() {
    const symbol = document.getElementById('social-news-symbol')?.value || '';
    const dirEl = document.querySelector('input[name="social-direction"]:checked');
    const direction = dirEl ? dirEl.value : 'boost';
    const priceInput = document.getElementById('social-news-price')?.value || '';
    this.postStory(symbol, direction, priceInput);
  },

  _removeMyStory(storyId) {
    if (typeof Firebase !== 'undefined' && Firebase.isOnline()) {
      Firebase.removeNewsStory(storyId);
    }
    Toast.show('Story removed.', '#aaa', 2000);
  },

  _render() {
    const container = document.getElementById('social-content');
    if (!container) return;

    const tabs = [
      { id: 'party',  label: '\u{1F389} Party'    },
      { id: 'hitman', label: '\u{1F5E1}\uFE0F Hitman'  },
      { id: 'news',   label: '\u{1F4F0} Fake News' },
    ];

    let tabsHtml = '<div class="social-tabs">';
    tabs.forEach(t => {
      tabsHtml += `<button class="social-tab ${this._tab === t.id ? 'active' : ''}" onclick="Social.setTab('${t.id}')">${t.label}</button>`;
    });
    tabsHtml += '</div>';

    let bodyHtml = '';
    if (this._tab === 'party')  bodyHtml = this._renderParty();
    if (this._tab === 'hitman') bodyHtml = this._renderHitman();
    if (this._tab === 'news')   bodyHtml = this._renderNewsMarket();

    container.innerHTML = `<div style="padding:12px;max-width:480px;margin:0 auto">${tabsHtml}${bodyHtml}</div>`;
  },

  getSaveData() {
    return { partyCooldown: this._partyCooldown };
  },

  loadSaveData(d) {
    if (!d) return;
    this._partyCooldown = d.partyCooldown || 0;
  },
};
