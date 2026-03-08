// Vanity Shop — Titles, Chat Colors, Trophies, Display
const Vanity = {
  _tab: 'titles',
  _ownedTitles: [],
  _activeChatColor: null,  // { hex, expiresAt }
  _trophies: [],           // { id, name, rarity, icon, earnedAt, source }
  _featuredTrophies: [],   // array of up to 3 trophy indices
  _initialized: false,
  _styleInjected: false,

  TITLES: [
    { label: '\u{1F40B} The Whale',       price: 10_000_000  },
    { label: '\u{1F4B0} Money Printer',   price: 5_000_000   },
    { label: '\u{1F3B0} High Roller',     price: 5_000_000   },
    { label: '\u{1F480} Crime Lord',      price: 8_000_000   },
    { label: '\u{1F9E0} The Algorithm',   price: 15_000_000  },
    { label: '\u{1F451} King/Queen',       price: 25_000_000  },
    { label: '\u{1F52E} The Oracle',      price: 20_000_000  },
    { label: '\u{1F988} Loan Shark',      price: 12_000_000  },
    { label: '\u{1F3C6} Champion',        price: 30_000_000  },
    { label: '\u{1F319} Night Owl',       price: 8_000_000   },
    { label: '\u26A1 Speed Runner',    price: 10_000_000  },
    { label: '\u{1F3AD} The Hustler',     price: 15_000_000  },
  ],

  CHAT_COLORS: [
    { name: '\u{1F31F} Gold',      hex: '#ffd700', price: 2_000_000,  duration: 24  },
    { name: '\u{1F497} Pink',      hex: '#ff4081', price: 2_000_000,  duration: 24  },
    { name: '\u{1F4A7} Ice Blue',  hex: '#00e5ff', price: 2_000_000,  duration: 24  },
    { name: '\u{1F7E0} Orange',    hex: '#ff6d00', price: 2_000_000,  duration: 24  },
    { name: '\u2623\uFE0F Toxic',    hex: '#76ff03', price: 3_000_000,  duration: 24  },
    { name: '\u{1F534} Crimson',   hex: '#ff1744', price: 3_000_000,  duration: 24  },
    { name: '\u{1F308} Rainbow',   hex: 'rainbow', price: 10_000_000, duration: 24  },
    { name: '\u2B50 7-Day Gold',   hex: '#ffd700', price: 10_000_000, duration: 168 },
  ],

  TROPHY_RARITIES: {
    common:    { icon: '\u{1F3C5}', color: '#9e9e9e', label: 'Common'    },
    rare:      { icon: '\u{1F3C6}', color: '#2196f3', label: 'Rare'      },
    epic:      { icon: '\u{1F451}', color: '#9c27b0', label: 'Epic'      },
    legendary: { icon: '\u2728',    color: '#ff9800', label: 'Legendary' },
    mythic:    { icon: '\u{1F31F}', color: '#e91e63', label: 'Mythic'    },
  },

  TROPHY_NAMES: {
    common:    ['First Blood', 'Lucky Break', 'Penny Pincher', "Beginner's Luck", 'Small Timer', 'House Mouse', 'Grind Started'],
    rare:      ['High Roller', 'Market Watcher', 'Crime Starter', 'Steady Earner', 'Pack Rat', 'Sharp Eye', 'Night Grinder'],
    epic:      ['Whale Rising', "Fortune's Favorite", 'Dark Horse', 'Market Mover', 'Shadow Broker', 'The Untouchable', 'Risk Taker'],
    legendary: ['Legendary Status', 'The Algorithm', 'Phantom Profit', 'Golden Touch', 'Overlord', 'Apex Predator', 'The Syndicate'],
    mythic:    ['God Mode', 'Reality Glitch', 'The One', 'Infinite Edge', 'Beyond Mortal', 'Universe Breaker', 'Simulation Error'],
  },

  PULL_TIERS: {
    basic:   { cost: 1_000_000,    label: 'Basic',   costLabel: '$1M',   odds: { common: 60, rare: 30, epic: 8, legendary: 2, mythic: 0  } },
    premium: { cost: 10_000_000,   label: 'Premium', costLabel: '$10M',  odds: { common: 20, rare: 40, epic: 25, legendary: 12, mythic: 3  } },
    elite:   { cost: 100_000_000,  label: 'Elite',   costLabel: '$100M', odds: { common: 0,  rare: 15, epic: 35, legendary: 35, mythic: 15 } },
  },

  _injectStyle() {
    if (this._styleInjected) return;
    this._styleInjected = true;
    const css = `
      .vanity-tabs { display: flex; gap: 4px; margin-bottom: 14px; overflow-x: auto; }
      .vanity-tab { padding: 8px 12px; border: none; border-radius: 8px; background: var(--bg3, #16213e); color: var(--text-dim, #aaa); font-size: 12px; cursor: pointer; white-space: nowrap; }
      .vanity-tab.active { background: var(--green, #00e676); color: #000; font-weight: 700; }
      .vanity-title-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .vanity-title-card { background: var(--bg3, #16213e); border-radius: 10px; padding: 10px; text-align: center; }
      .vanity-title-label { font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--text, #eee); }
      .vanity-title-price { font-size: 11px; color: var(--text-dim, #aaa); margin-bottom: 8px; }
      .vanity-title-btn { width: 100%; padding: 6px; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600; }
      .vanity-title-btn.buy { background: var(--green, #00e676); color: #000; }
      .vanity-title-btn.equip { background: #1565c0; color: #fff; }
      .vanity-title-btn.equipped { background: #333; color: var(--text-dim, #aaa); }
      .vanity-color-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .vanity-color-card { background: var(--bg3, #16213e); border-radius: 10px; padding: 10px; }
      .vanity-color-swatch { height: 32px; border-radius: 6px; margin-bottom: 6px; }
      .vanity-color-name { font-size: 12px; font-weight: 600; margin-bottom: 4px; color: var(--text, #eee); }
      .vanity-color-meta { font-size: 11px; color: var(--text-dim, #aaa); margin-bottom: 8px; }
      .vanity-color-btn { width: 100%; padding: 6px; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600; background: var(--green, #00e676); color: #000; }
      .vanity-color-btn.active-color { background: #ff9800; color: #000; }
      .vanity-color-active-bar { background: var(--bg3, #16213e); border-radius: 8px; padding: 10px; margin-bottom: 12px; font-size: 13px; }
      .vanity-trophy-header { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
      .vanity-trophy-count { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; background: var(--bg3, #16213e); }
      .vanity-pull-btns { display: flex; gap: 6px; margin-bottom: 14px; }
      .vanity-pull-btn { flex: 1; padding: 8px 4px; border: none; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; background: var(--bg3, #16213e); color: var(--text, #eee); }
      .vanity-trophy-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .vanity-trophy-card { background: var(--bg3, #16213e); border-radius: 10px; padding: 10px; text-align: center; position: relative; }
      .vanity-trophy-card.featured { outline: 2px solid #ffd700; }
      .vanity-trophy-icon { font-size: 28px; margin-bottom: 4px; }
      .vanity-trophy-name { font-size: 12px; font-weight: 600; color: var(--text, #eee); margin-bottom: 4px; }
      .vanity-trophy-rarity { font-size: 11px; font-weight: 700; }
      .vanity-trophy-date { font-size: 10px; color: var(--text-dim, #aaa); margin-top: 2px; }
      .vanity-trophy-feature-btn { margin-top: 6px; padding: 4px 8px; border: none; border-radius: 6px; font-size: 11px; cursor: pointer; background: #333; color: #aaa; }
      .vanity-trophy-feature-btn.featured { background: #ffd700; color: #000; }
      .vanity-display-card { background: var(--bg3, #16213e); border-radius: 14px; padding: 18px; margin-bottom: 14px; }
      .vanity-display-title { font-size: 13px; font-weight: 700; color: var(--text-dim, #aaa); margin-bottom: 4px; }
      .vanity-display-value { font-size: 15px; font-weight: 600; color: var(--text, #eee); margin-bottom: 10px; }
      .vanity-display-trophies { display: flex; gap: 10px; flex-wrap: wrap; }
      .vanity-display-trophy { text-align: center; font-size: 24px; }
      .vanity-custom-title-row { display: flex; gap: 8px; margin-top: 10px; align-items: center; }
      .vanity-custom-title-input { flex: 1; padding: 8px; border-radius: 6px; border: 1px solid #333; background: var(--bg, #0f0f1a); color: var(--text, #eee); font-size: 13px; }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  },

  init() {
    this._injectStyle();
    this._initialized = true;
    this._render();
  },

  setTab(tab) {
    this._tab = tab;
    this._render();
  },

  buyTitle(label, price) {
    if (this._ownedTitles.includes(label)) {
      this.setTitle(label);
      return;
    }
    if (App.balance < price) {
      Toast.show('Not enough money! Need ' + App.formatMoney(price), '#e74c3c', 3000);
      return;
    }
    App.addBalance(-price);
    this._ownedTitles.push(label);
    this.setTitle(label);
    Toast.show('Title purchased: ' + label, '#ffd700', 3000);
    App.save();
    this._render();
  },

  setTitle(label) {
    if (typeof Settings !== 'undefined') {
      Settings.profile.title = label;
      Settings.save();
      Settings.updateProfileDisplay?.();
    }
    App.save();
    this._render();
  },

  buyCustomTitle() {
    const inp = document.getElementById('vanity-custom-title-input');
    const title = inp ? inp.value.trim() : '';
    if (!title) { Toast.show('Enter a title first!', '#e74c3c', 2000); return; }
    if (title.length > 20) { Toast.show('Max 20 characters!', '#e74c3c', 2000); return; }
    const price = 500_000_000;
    if (App.balance < price) {
      Toast.show('Need ' + App.formatMoney(price) + ' for a custom title!', '#e74c3c', 3000);
      return;
    }
    App.addBalance(-price);
    this._ownedTitles.push(title);
    this.setTitle(title);
    Toast.show('Custom title set: ' + title, '#ffd700', 3000);
    App.save();
    this._render();
  },

  buyChatColor(idx) {
    const c = this.CHAT_COLORS[idx];
    if (!c) return;
    if (App.balance < c.price) {
      Toast.show('Not enough money! Need ' + App.formatMoney(c.price), '#e74c3c', 3000);
      return;
    }
    App.addBalance(-c.price);
    const expiresAt = Date.now() + c.duration * 3600 * 1000;
    this._activeChatColor = { hex: c.hex, expiresAt };
    Toast.show('Chat color activated: ' + c.name + ' for ' + c.duration + 'h!', '#ffd700', 3000);
    App.save();
    this._render();
  },

  _rollTrophyRarity(tier) {
    const odds = this.PULL_TIERS[tier].odds;
    const total = Object.values(odds).reduce((s, v) => s + v, 0);
    let r = Math.random() * total;
    for (const [rarity, weight] of Object.entries(odds)) {
      r -= weight;
      if (r <= 0) return rarity;
    }
    return 'common';
  },

  pullTrophy(tier) {
    const t = this.PULL_TIERS[tier];
    if (!t) return;
    if (App.balance < t.cost) {
      Toast.show('Need ' + App.formatMoney(t.cost) + ' for a ' + t.label + ' pull!', '#e74c3c', 3000);
      return;
    }
    App.addBalance(-t.cost);
    const rarity = this._rollTrophyRarity(tier);
    this.grantTrophy(rarity, tier + ' pull');
    App.save();
    this._render();
  },

  grantTrophy(rarity, source) {
    const names = this.TROPHY_NAMES[rarity] || this.TROPHY_NAMES.common;
    const rarInfo = this.TROPHY_RARITIES[rarity] || this.TROPHY_RARITIES.common;
    const name = names[Math.floor(Math.random() * names.length)];
    const trophy = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2),
      name,
      rarity,
      icon: rarInfo.icon,
      earnedAt: Date.now(),
      source: source || 'unknown',
    };
    this._trophies.push(trophy);
    Toast.show(rarInfo.icon + ' ' + rarInfo.label + ' Trophy: "' + name + '"!', rarInfo.color, 4000);
    if (App.currentScreen === 'vanity') this._render();
  },

  featureTrophy(trophyIdx) {
    const idx = this._featuredTrophies.indexOf(trophyIdx);
    if (idx >= 0) {
      this._featuredTrophies.splice(idx, 1);
    } else {
      if (this._featuredTrophies.length >= 3) {
        Toast.show('Max 3 featured trophies!', '#e74c3c', 2000);
        return;
      }
      this._featuredTrophies.push(trophyIdx);
    }
    App.save();
    this._render();
  },

  _renderTitles() {
    const activeTitle = (typeof Settings !== 'undefined') ? Settings.profile.title : '';
    let html = '<div class="vanity-title-grid">';

    this.TITLES.forEach(t => {
      const owned = this._ownedTitles.includes(t.label);
      const isActive = t.label === activeTitle;
      let btnHtml;
      if (isActive) {
        btnHtml = `<button class="vanity-title-btn equipped" disabled>Equipped</button>`;
      } else if (owned) {
        btnHtml = `<button class="vanity-title-btn equip" onclick="Vanity.setTitle(${JSON.stringify(t.label)})">Equip</button>`;
      } else {
        btnHtml = `<button class="vanity-title-btn buy" onclick="Vanity.buyTitle(${JSON.stringify(t.label)},${t.price})">${App.formatMoney(t.price)}</button>`;
      }
      html += `<div class="vanity-title-card">
        <div class="vanity-title-label">${t.label}</div>
        ${btnHtml}
      </div>`;
    });

    html += '</div>';

    // Custom title section
    html += `<div style="margin-top:14px;background:var(--bg3,#16213e);border-radius:10px;padding:12px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:4px;">Custom Title</div>
      <div style="font-size:12px;color:var(--text-dim,#aaa);margin-bottom:8px;">Set any text as your title &mdash; ${App.formatMoney(500_000_000)}</div>
      <div class="vanity-custom-title-row">
        <input id="vanity-custom-title-input" class="vanity-custom-title-input" maxlength="20" placeholder="Your title (max 20 chars)">
        <button class="vanity-title-btn buy" style="width:auto;padding:8px 12px;" onclick="Vanity.buyCustomTitle()">Buy</button>
      </div>
    </div>`;

    // Show owned custom titles
    const customOwned = this._ownedTitles.filter(t => !this.TITLES.find(x => x.label === t));
    if (customOwned.length > 0) {
      html += `<div style="margin-top:10px;background:var(--bg3,#16213e);border-radius:10px;padding:12px;">
        <div style="font-size:13px;font-weight:700;margin-bottom:6px;">Your Custom Titles</div>`;
      customOwned.forEach(t => {
        const isActive = t === activeTitle;
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;">
          <span>${t}</span>
          ${isActive ? '<span style="color:var(--green,#00e676);font-size:12px">Equipped</span>' : `<button class="vanity-title-btn equip" style="width:auto;padding:4px 10px;" onclick="Vanity.setTitle(${JSON.stringify(t)})">Equip</button>`}
        </div>`;
      });
      html += '</div>';
    }

    return html;
  },

  _renderColors() {
    let html = '';

    // Active color status
    if (this._activeChatColor) {
      const now = Date.now();
      if (this._activeChatColor.expiresAt > now) {
        const remaining = Math.ceil((this._activeChatColor.expiresAt - now) / 3600000);
        const hex = this._activeChatColor.hex;
        let sampleStyle = hex === 'rainbow'
          ? 'background:linear-gradient(90deg,#ff0,#f0f,#0ff,#0f0,#f80);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text'
          : `color:${hex}`;
        html += `<div class="vanity-color-active-bar">Active color: <span style="${sampleStyle}">Sample Text</span> &mdash; ${remaining}h remaining <button onclick="Vanity._clearColor()" style="margin-left:8px;padding:2px 8px;border:none;border-radius:4px;background:#333;color:#aaa;cursor:pointer;font-size:11px">Clear</button></div>`;
      } else {
        this._activeChatColor = null;
      }
    }

    html += '<div class="vanity-color-grid">';
    this.CHAT_COLORS.forEach((c, idx) => {
      const isActive = this._activeChatColor && this._activeChatColor.hex === c.hex;
      const swatchStyle = c.hex === 'rainbow'
        ? 'background:linear-gradient(90deg,#ff0,#f0f,#0ff,#0f0,#f80)'
        : `background:${c.hex}`;
      html += `<div class="vanity-color-card">
        <div class="vanity-color-swatch" style="${swatchStyle}"></div>
        <div class="vanity-color-name">${c.name}</div>
        <div class="vanity-color-meta">${App.formatMoney(c.price)} &bull; ${c.duration}h</div>
        <button class="vanity-color-btn ${isActive ? 'active-color' : ''}" onclick="Vanity.buyChatColor(${idx})">${isActive ? 'Active' : 'Buy'}</button>
      </div>`;
    });
    html += '</div>';
    return html;
  },

  _clearColor() {
    this._activeChatColor = null;
    App.save();
    this._render();
  },

  _renderTrophies() {
    const counts = {};
    this._trophies.forEach(t => { counts[t.rarity] = (counts[t.rarity] || 0) + 1; });

    let html = '<div class="vanity-trophy-header">';
    Object.entries(this.TROPHY_RARITIES).forEach(([r, info]) => {
      if (counts[r]) {
        html += `<span class="vanity-trophy-count" style="color:${info.color}">${info.icon} ${info.label}: ${counts[r]}</span>`;
      }
    });
    if (!this._trophies.length) html += '<span style="color:var(--text-dim,#aaa);font-size:13px">No trophies yet. Spin the wheel or pull!</span>';
    html += '</div>';

    // Pull buttons
    html += '<div class="vanity-pull-btns">';
    Object.entries(this.PULL_TIERS).forEach(([tier, info]) => {
      html += `<button class="vanity-pull-btn" onclick="Vanity.pullTrophy('${tier}')" style="border:1px solid #333">${info.label}<br><small>${info.costLabel}</small></button>`;
    });
    html += '</div>';

    if (this._trophies.length === 0) return html;

    html += '<div class="vanity-trophy-grid">';
    this._trophies.forEach((t, idx) => {
      const rarInfo = this.TROPHY_RARITIES[t.rarity] || this.TROPHY_RARITIES.common;
      const isFeatured = this._featuredTrophies.includes(idx);
      const date = new Date(t.earnedAt).toLocaleDateString();
      html += `<div class="vanity-trophy-card ${isFeatured ? 'featured' : ''}">
        <div class="vanity-trophy-icon">${t.icon}</div>
        <div class="vanity-trophy-name">${t.name}</div>
        <div class="vanity-trophy-rarity" style="color:${rarInfo.color}">${rarInfo.label}</div>
        <div class="vanity-trophy-date">${date}</div>
        <button class="vanity-trophy-feature-btn ${isFeatured ? 'featured' : ''}" onclick="Vanity.featureTrophy(${idx})">${isFeatured ? '\u2B50 Featured' : 'Feature'}</button>
      </div>`;
    });
    html += '</div>';
    return html;
  },

  _renderDisplay() {
    const activeTitle = (typeof Settings !== 'undefined') ? Settings.profile.title : '';
    const name = (typeof Settings !== 'undefined') ? (Settings.profile.name || 'Player') : 'Player';
    const avatar = (typeof Settings !== 'undefined') ? (Settings.avatars?.[Settings.profile.avatar] || '\u{1F3B0}') : '\u{1F3B0}';

    let colorSampleHtml = 'Default (white)';
    if (this._activeChatColor && this._activeChatColor.expiresAt > Date.now()) {
      const hex = this._activeChatColor.hex;
      if (hex === 'rainbow') {
        colorSampleHtml = '<span style="background:linear-gradient(90deg,#ff0,#f0f,#0ff,#0f0,#f80);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">Rainbow Text</span>';
      } else {
        colorSampleHtml = `<span style="color:${hex}">Colored Text</span>`;
      }
    }

    const featured = this._featuredTrophies
      .map(i => this._trophies[i])
      .filter(Boolean);

    let featuredHtml = '';
    if (featured.length > 0) {
      featuredHtml = featured.map(t => {
        const rarInfo = this.TROPHY_RARITIES[t.rarity] || this.TROPHY_RARITIES.common;
        return `<div class="vanity-display-trophy" title="${t.name} (${rarInfo.label})">${t.icon}</div>`;
      }).join('');
    } else {
      featuredHtml = '<span style="color:var(--text-dim,#aaa);font-size:12px">No featured trophies. Feature them from the Trophies tab!</span>';
    }

    return `<div class="vanity-display-card">
      <div style="font-size:32px;text-align:center;margin-bottom:8px">${avatar}</div>
      <div style="text-align:center;font-size:18px;font-weight:700;margin-bottom:4px">${name}</div>
      ${activeTitle ? `<div style="text-align:center;font-size:13px;color:#ffd700;margin-bottom:10px">${activeTitle}</div>` : '<div style="text-align:center;font-size:13px;color:var(--text-dim,#aaa);margin-bottom:10px">No title equipped</div>'}
      <div class="vanity-display-title">Chat Color</div>
      <div class="vanity-display-value">${colorSampleHtml}</div>
      <div class="vanity-display-title">Featured Trophies</div>
      <div class="vanity-display-trophies">${featuredHtml}</div>
    </div>
    <div style="font-size:12px;color:var(--text-dim,#aaa);text-align:center">Go to the Trophies tab to feature up to 3 trophies on your profile.</div>`;
  },

  _render() {
    const container = document.getElementById('vanity-content');
    if (!container) return;

    const tabs = [
      { id: 'titles',   label: '\u{1F3F7}\uFE0F Titles'   },
      { id: 'colors',   label: '\u{1F4AC} Chat Colors' },
      { id: 'trophies', label: '\u{1F3C6} Trophies'   },
      { id: 'display',  label: '\u{1F5BC}\uFE0F Display'   },
    ];

    let tabsHtml = '<div class="vanity-tabs">';
    tabs.forEach(t => {
      tabsHtml += `<button class="vanity-tab ${this._tab === t.id ? 'active' : ''}" onclick="Vanity.setTab('${t.id}')">${t.label}</button>`;
    });
    tabsHtml += '</div>';

    let bodyHtml = '';
    if (this._tab === 'titles')   bodyHtml = this._renderTitles();
    if (this._tab === 'colors')   bodyHtml = this._renderColors();
    if (this._tab === 'trophies') bodyHtml = this._renderTrophies();
    if (this._tab === 'display')  bodyHtml = this._renderDisplay();

    container.innerHTML = `<div style="padding:12px;max-width:480px;margin:0 auto">${tabsHtml}${bodyHtml}</div>`;
  },

  getSaveData() {
    return {
      ownedTitles: this._ownedTitles,
      activeChatColor: this._activeChatColor,
      trophies: this._trophies,
      featuredTrophies: this._featuredTrophies,
    };
  },

  loadSaveData(d) {
    if (!d) return;
    this._ownedTitles = Array.isArray(d.ownedTitles) ? d.ownedTitles : [];
    this._activeChatColor = d.activeChatColor || null;
    this._trophies = Array.isArray(d.trophies) ? d.trophies : [];
    this._featuredTrophies = Array.isArray(d.featuredTrophies) ? d.featuredTrophies : [];
  },
};
