const Settings = {
  // === THEMES ===
  themes: [
    { id: 'green',  name: 'Neon Green',  color: '#00e676', dark: '#00c853' },
    { id: 'purple', name: 'Royal Purple', color: '#bb86fc', dark: '#9c64e8' },
    { id: 'red',    name: 'Hot Red',      color: '#ff5252', dark: '#e04848' },
    { id: 'blue',   name: 'Ocean Blue',   color: '#448aff', dark: '#2979ff' },
    { id: 'gold',   name: 'Gold Rush',    color: '#ffd740', dark: '#ffc400' },
    { id: 'pink',   name: 'Cyber Pink',   color: '#ff4081', dark: '#f50057' },
  ],

  // === AVATARS ===
  avatars: [
    '\u{1F3B2}', '\u{1F451}', '\u{1F48E}', '\u2660\uFE0F', '\u2764\uFE0F', '\u2663\uFE0F',
    '\u2B50', '\u{1F525}', '\u{1F680}', '\u{1F480}', '\u{1F47D}', '\u{1F916}'
  ],

  // === BANNER COLORS ===
  bannerColors: [
    '#00e676','#bb86fc','#ff5252','#448aff',
    '#ffd740','#ff4081','#00bcd4','#ff9100',
    '#69f0ae','#ea80fc',
  ],

  // === STATE ===
  currentTheme: 'green',
  customThemeColor: '#00e676',
  profile: { name: 'Player', avatar: 0, bio: '', bannerColor: '#00e676', title: '' },
  options: {
    autoSaveInterval: 30,
    numberFormat: 'standard',
    confirmBets: false,
    showStreaks: true,
    fastAnimations: false,
    showStockTicker: false,
    showCoinTicker: true,
    newsPopups: false,
  },

  init() {
    this.load();
    this.applyTheme();
    this.applyOptions();
    this.updateProfileDisplay();
  },

  // === THEME ===
  setTheme(id) {
    this.currentTheme = id;
    this.applyTheme();
    this.save();
    this.render();
  },

  applyTheme() {
    let color, dark, id;
    if (this.currentTheme === 'custom') {
      color = this.customThemeColor || '#00e676';
      dark = color;
      id = 'custom';
    } else {
      const theme = this.themes.find(t => t.id === this.currentTheme) || this.themes[0];
      color = theme.color; dark = theme.dark; id = theme.id;
    }
    document.documentElement.style.setProperty('--green', color);
    document.documentElement.style.setProperty('--green-dark', dark);
    document.documentElement.setAttribute('data-theme', id);
  },

  setCustomTheme(color) {
    this.customThemeColor = color;
    this.currentTheme = 'custom';
    this.applyTheme();
    this.save();
    this.render();
  },

  // === PROFILE ===
  setAvatar(index) {
    this.profile.avatar = index;
    this.updateProfileDisplay();
    this.save();
    this.render();
  },

  setBio(text) {
    this.profile.bio = text.slice(0, 80);
    this.save();
  },

  setBannerColor(color) {
    this.profile.bannerColor = color;
    this.save();
    this.render();
  },

  setTitle(title) {
    this.profile.title = title;
    this.save();
    this.render();
  },

  getAvailableTitles() {
    const titles = [''];   // '' = no title
    const r = App.rebirth || 0;
    const achProg = (typeof Achievements !== 'undefined') ? Achievements._progress : {};

    // Rebirth-based titles
    if (r >= 1)  titles.push('VIP ' + r);
    if (r >= 10) titles.push('Veteran');
    if (r >= 25) titles.push('Master');
    if (r >= 50) titles.push('Legend');

    // Achievement-based (gold tier = index 2)
    const map = {
      games_won:    'Lucky Streak',
      crash_high:   'Moonwalker',
      big_bet:      'High Roller',
      debt_paid:    'Debt Slayer',
      crime_income: 'Crime Baron',
      total_earned: 'Billionaire',
      companies:    'Mogul',
      clicks:       'Click God',
      friends:      'Social Butterfly',
      chat_msgs:    'Chatterbox',
      gifts_sent:   'Philanthropist',
    };
    for (const [id, label] of Object.entries(map)) {
      if ((achProg[id] || -1) >= 2) titles.push(label);
    }

    // Admin / owner
    if (typeof Admin !== 'undefined' && Admin.isAdmin()) titles.push('Admin');
    if (typeof Firebase !== 'undefined' && Firebase._playerId === 0) titles.push('👑 Owner');

    return [...new Set(titles)];
  },

  setName(name) {
    const newName = name.slice(0, 16) || 'Player';
    const oldName = this.profile.name;

    // Skip registry for generic default name
    if (newName === 'Player' || typeof Firebase === 'undefined' || !Firebase.isOnline()) {
      this.profile.name = newName;
      this.updateProfileDisplay();
      this.save();
      if (typeof Admin !== 'undefined') Admin.checkAdminRevoke();
      if (newName === 'Player' && oldName !== 'Player' && typeof Firebase !== 'undefined') {
        Firebase._releaseName(oldName);
      }
      // Guest upgrading to a real name — init Firebase now (it'll auto-claim name on sign-in)
      if (newName !== 'Player' && typeof _initFirebase !== 'undefined') _initFirebase();
      return;
    }

    Firebase.checkAndClaimName(newName, oldName, result => {
      if (!result.ok) {
        alert('Name not available: ' + result.error);
        // Revert input field
        const input = document.getElementById('settings-name');
        if (input) input.value = this.profile.name;
        return;
      }
      if (result.offline) {
        console.warn('Name change: offline, not verified');
      }
      this.profile.name = newName;
      this.updateProfileDisplay();
      this.save();
      if (typeof Admin !== 'undefined') Admin.checkAdminRevoke();
    });
  },

  updateProfileDisplay() {
    const el = document.getElementById('profile-display');
    if (!el) return;
    el.innerHTML = `<span class="profile-avatar">${this.avatars[this.profile.avatar]}</span><span class="profile-name">${this.profile.name}</span>`;
  },

  // === OPTIONS ===
  setOption(key, value) {
    this.options[key] = value;
    this.applyOptions();
    this.save();
  },

  applyOptions() {
    // Auto-save interval
    if (typeof App !== 'undefined' && App._autoSaveTimer) {
      clearInterval(App._autoSaveTimer);
    }
    if (typeof App !== 'undefined') {
      App._autoSaveTimer = setInterval(() => App.save(), this.options.autoSaveInterval * 1000);
    }

    // Fast animations
    document.documentElement.classList.toggle('fast-animations', this.options.fastAnimations);

    // Streaks banner
    const banner = document.getElementById('streak-banner');
    if (banner && !this.options.showStreaks) {
      banner.classList.add('hidden');
    }

    // Stock ticker
    const ticker = document.getElementById('stock-ticker');
    if (ticker) ticker.classList.toggle('hidden', !this.options.showStockTicker);
  },

  // === FORMAT MONEY OVERRIDE ===
  formatMoneyFull(n) {
    if (n < 0) return '-' + this.formatMoneyFull(-n);
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  // === CONFIRM BET ===
  shouldConfirmBet(bet) {
    if (!this.options.confirmBets) return false;
    return typeof App !== 'undefined' && bet > App.balance * 0.5;
  },

  // === RENDER SETTINGS SCREEN ===
  render() {
    // Don't re-render if user is actively typing in the name field
    if (document.activeElement?.id === 'settings-name') return;
    const container = document.getElementById('settings-content');
    if (!container) return;

    const playerIdStr = typeof Firebase !== 'undefined' && Firebase._playerId !== null
      ? '#' + Firebase._playerId : '#???';
    const isOwner = typeof Firebase !== 'undefined' && Firebase._playerId === 0;

    container.innerHTML = `
      <!-- Profile -->
      <div class="settings-section">
        <h3>Profile</h3>
        <div style="border-radius:10px;overflow:hidden;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,0.4)">
          <div style="height:56px;background:linear-gradient(135deg,${this.profile.bannerColor}cc,${this.profile.bannerColor}55)"></div>
          <div style="background:var(--bg);padding:0 12px 12px;display:flex;align-items:flex-start;gap:10px">
            <div style="margin-top:-22px;width:44px;height:44px;border-radius:50%;background:var(--bg2);border:3px solid var(--bg);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">${this.avatars[this.profile.avatar]}</div>
            <div style="flex:1;min-width:0;padding-top:4px">
              <div style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escapeHtml(this.profile.name||'Player')}</div>
              ${this.profile.title ? `<div style="font-size:11px;color:${this.profile.bannerColor};font-weight:600">${this._escapeHtml(this.profile.title)}</div>` : ''}
              ${this.profile.bio ? `<div style="font-size:11px;color:var(--text-dim);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._escapeHtml(this.profile.bio)}</div>` : ''}
            </div>
          </div>
        </div>
        <div class="settings-row">
          <label>Username:</label>
          <input type="text" id="settings-name" maxlength="16" value="${this.profile.name}" onchange="Settings.setName(this.value)" placeholder="Player">
        </div>
        <div class="settings-row">
          <label>Player ID:</label>
          <span id="settings-player-id" class="settings-player-id">${playerIdStr}${isOwner ? ' 👑 Owner' : ''}</span>
        </div>
        <div class="settings-hint">Share your Player ID so others can gift you or find you.</div>
        <div class="settings-row" style="margin-top:6px">
          <label>Gift by #ID:</label>
          <input type="number" id="gift-player-id-input" placeholder="e.g. 42" min="0" max="999999" style="width:90px">
          <button class="settings-btn" style="margin-left:6px;padding:4px 10px" onclick="Firebase.giftByPlayerId(document.getElementById('gift-player-id-input').value)">🎁 Gift</button>
        </div>
        <div class="avatar-grid">
          ${this.avatars.map((a, i) =>
            `<button class="avatar-option${i === this.profile.avatar ? ' selected' : ''}" onclick="Settings.setAvatar(${i})">${a}</button>`
          ).join('')}
        </div>
        <div class="settings-row" style="align-items:flex-start;margin-top:8px">
          <label style="padding-top:6px">Bio:</label>
          <div style="flex:1">
            <textarea id="settings-bio" maxlength="80" rows="2"
              style="width:100%;resize:none;background:var(--bg);border:1px solid var(--bg3);border-radius:6px;color:var(--text);font-size:13px;padding:6px 8px;box-sizing:border-box"
              placeholder="Tell players about yourself..."
              onchange="Settings.setBio(this.value)">${this._escapeHtml(this.profile.bio||'')}</textarea>
            <div style="font-size:10px;color:var(--text-dim);text-align:right">${(this.profile.bio||'').length}/80</div>
          </div>
        </div>
        <div class="settings-row" style="margin-top:4px">
          <label>Banner:</label>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            ${this.bannerColors.map(c =>
              `<button onclick="Settings.setBannerColor('${c}')"
                style="width:24px;height:24px;border-radius:50%;background:${c};border:2px solid ${c===this.profile.bannerColor?'#fff':'transparent'};cursor:pointer;padding:0"></button>`
            ).join('')}
            <div title="Custom color" style="position:relative;width:24px;height:24px;border-radius:50%;overflow:hidden;border:2px solid ${this.bannerColors.includes(this.profile.bannerColor)?'#444':'#fff'};flex-shrink:0;cursor:pointer">
              <input type="color" value="${this.profile.bannerColor}" oninput="Settings.setBannerColor(this.value)"
                style="position:absolute;top:-4px;left:-4px;width:calc(100% + 8px);height:calc(100% + 8px);border:none;padding:0;cursor:pointer">
            </div>
          </div>
        </div>
        <div class="settings-row" style="margin-top:4px">
          <label>Title:</label>
          <select onchange="Settings.setTitle(this.value)"
            style="flex:1;background:var(--bg);border:1px solid var(--bg3);border-radius:6px;color:var(--text);padding:5px 8px;font-size:13px">
            ${this.getAvailableTitles().map(t =>
              `<option value="${t}" ${t===this.profile.title?'selected':''}>${t||'(no title)'}</option>`
            ).join('')}
          </select>
        </div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:4px">Earn achievements and rebirths to unlock more titles.</div>
      </div>

      <!-- Theme -->
      <div class="settings-section">
        <h3>Theme</h3>
        <div class="theme-picker" style="align-items:center">
          ${this.themes.map(t =>
            `<button class="theme-circle${t.id === this.currentTheme ? ' selected' : ''}" style="background:${t.color}" onclick="Settings.setTheme('${t.id}')" title="${t.name}"></button>`
          ).join('')}
          <div title="Custom color" style="position:relative;width:28px;height:28px;border-radius:50%;overflow:hidden;border:2px solid ${this.currentTheme === 'custom' ? '#fff' : '#444'};flex-shrink:0;cursor:pointer">
            <input type="color" value="${this.customThemeColor || '#00e676'}" oninput="Settings.setCustomTheme(this.value)"
              style="position:absolute;top:-4px;left:-4px;width:calc(100% + 8px);height:calc(100% + 8px);border:none;padding:0;cursor:pointer">
          </div>
        </div>
        <div class="theme-name">${this.currentTheme === 'custom' ? 'Custom' : (this.themes.find(t => t.id === this.currentTheme) || this.themes[0]).name}</div>
      </div>

      <!-- Account / Save Transfer -->
      <div class="settings-section">
        <h3>Account (Save Transfer)</h3>
        <p class="settings-hint">Set a password to recover your save on any device. A one-time recovery code will be shown — save it somewhere safe.</p>
        <div class="settings-row">
          <label>New Password:</label>
          <input type="password" id="settings-set-pw" placeholder="Min 4 chars" autocomplete="new-password">
        </div>
        <div class="settings-row">
          <label>Confirm:</label>
          <input type="password" id="settings-confirm-pw" placeholder="Confirm password" autocomplete="new-password">
        </div>
        <button class="settings-btn" onclick="Settings.setAccountPassword()">Set Password</button>
        <div id="settings-recovery-box" style="display:none;margin-top:10px;background:var(--bg3);border-radius:8px;padding:10px">
          <div style="font-size:12px;color:var(--gold);font-weight:700;margin-bottom:4px">Recovery Code (save this!)</div>
          <div style="display:flex;gap:6px;align-items:center">
            <code id="settings-recovery-code" style="flex:1;font-size:15px;letter-spacing:2px;color:var(--text);background:var(--bg);padding:6px 8px;border-radius:6px;text-align:center"></code>
            <button onclick="Settings.copyRecoveryCode()" style="font-size:11px;padding:5px 8px;border-radius:6px;border:1px solid var(--bg3);background:var(--bg);color:var(--text);cursor:pointer">Copy</button>
          </div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:6px">This code is shown once. Use it if you forget your password.</div>
        </div>

        <div class="settings-divider"></div>
        <p class="settings-hint">On a new device, login with your name + password:</p>
        <div class="settings-row">
          <label>Username:</label>
          <input type="text" id="settings-login-name" placeholder="Your username" autocomplete="username">
        </div>
        <div class="settings-row">
          <label>Password:</label>
          <input type="password" id="settings-login-pw" placeholder="Your password" autocomplete="current-password">
        </div>
        <button class="settings-btn" onclick="Settings.loginWithPassword()">Login / Restore Save</button>

        <div class="settings-divider"></div>
        <p class="settings-hint">Forgot your password? Use your recovery code:</p>
        <div class="settings-row">
          <label>Username:</label>
          <input type="text" id="settings-recover-name" placeholder="Your username" autocomplete="username">
        </div>
        <div class="settings-row">
          <label>Code:</label>
          <input type="text" id="settings-recover-code" placeholder="XXXX-XXXX-XXXX" autocomplete="off" maxlength="14" style="text-transform:uppercase;letter-spacing:1px">
        </div>
        <button class="settings-btn" onclick="Settings.recoverWithCode()">Recover Account</button>
      </div>

      <!-- Options -->
      <div class="settings-section">
        <h3>Options</h3>
        <div class="settings-row">
          <label>Auto-Save:</label>
          <select onchange="Settings.setOption('autoSaveInterval', +this.value)">
            <option value="15"${this.options.autoSaveInterval === 15 ? ' selected' : ''}>15s</option>
            <option value="30"${this.options.autoSaveInterval === 30 ? ' selected' : ''}>30s</option>
            <option value="60"${this.options.autoSaveInterval === 60 ? ' selected' : ''}>60s</option>
          </select>
        </div>
        <div class="settings-row">
          <label>Number Format:</label>
          <select onchange="Settings.setOption('numberFormat', this.value)">
            <option value="standard"${this.options.numberFormat === 'standard' ? ' selected' : ''}>Short ($1.5M)</option>
            <option value="full"${this.options.numberFormat === 'full' ? ' selected' : ''}>Full ($1,500,000)</option>
          </select>
        </div>
        <div class="settings-row">
          <label>Confirm Large Bets:</label>
          <label class="toggle-switch">
            <input type="checkbox" ${this.options.confirmBets ? 'checked' : ''} onchange="Settings.setOption('confirmBets', this.checked)">
            <span class="toggle-slider"></span>
          </label>
          <span class="rig-hint">&gt;50% balance</span>
        </div>
        <div class="settings-row">
          <label>Show Streaks:</label>
          <label class="toggle-switch">
            <input type="checkbox" ${this.options.showStreaks ? 'checked' : ''} onchange="Settings.setOption('showStreaks', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row">
          <label>Fast Animations:</label>
          <label class="toggle-switch">
            <input type="checkbox" ${this.options.fastAnimations ? 'checked' : ''} onchange="Settings.setOption('fastAnimations', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row">
          <label>Stock Ticker:</label>
          <label class="toggle-switch">
            <input type="checkbox" ${this.options.showStockTicker ? 'checked' : ''} onchange="Settings.setOption('showStockTicker', this.checked)">
            <span class="toggle-slider"></span>
          </label>
          <span class="rig-hint">Live price bar</span>
        </div>
        <div class="settings-row">
          <label>Coin Ticker:</label>
          <label class="toggle-switch">
            <input type="checkbox" ${this.options.showCoinTicker !== false ? 'checked' : ''} onchange="Settings.setOption('showCoinTicker', this.checked)">
            <span class="toggle-slider"></span>
          </label>
          <span class="rig-hint">Show crypto in ticker</span>
        </div>
        <div class="settings-row">
          <label>News Popups:</label>
          <label class="toggle-switch">
            <input type="checkbox" ${this.options.newsPopups ? 'checked' : ''} onchange="Settings.setOption('newsPopups', this.checked)">
            <span class="toggle-slider"></span>
          </label>
          <span class="rig-hint">Breaking news alerts</span>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="settings-section">
        <h3 style="color:var(--red)">Danger Zone</h3>
        <p class="settings-hint">Remove your public data from the leaderboard, cloud save, and company listings. Your local game save is not affected. Costs $5M.</p>
        <button class="settings-btn" style="background:var(--red);border-color:var(--red);color:#fff" onclick="Settings.deleteSelfData()">Remove Public Data — ${App.formatMoney(5_000_000)}</button>
      </div>
    `;
  },

  // === ACCOUNT PASSWORD ===
  async setAccountPassword() {
    const pw = document.getElementById('settings-set-pw')?.value?.trim();
    const confirm = document.getElementById('settings-confirm-pw')?.value?.trim();
    if (!pw) { alert('Enter a password.'); return; }
    if (pw !== confirm) { alert('Passwords do not match.'); return; }
    if (pw.length < 4) { alert('Password must be at least 4 characters.'); return; }
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) { alert('Must be online to set a password.'); return; }
    const name = this.profile.name;
    if (!name || name === 'Player') { alert('Set a unique username first.'); return; }

    const result = await Firebase.saveAccountPassword(name, pw);
    if (result.ok) {
      document.getElementById('settings-set-pw').value = '';
      document.getElementById('settings-confirm-pw').value = '';
      // Show recovery code
      const box = document.getElementById('settings-recovery-box');
      const codeEl = document.getElementById('settings-recovery-code');
      if (box && codeEl) {
        codeEl.textContent = result.recoveryCode;
        box.style.display = 'block';
      } else {
        alert('Password set!\n\nYour recovery code: ' + result.recoveryCode + '\n\nSave this! It lets you recover your account if you forget your password.');
      }
    } else {
      alert('Failed: ' + result.error);
    }
  },

  copyRecoveryCode() {
    const code = document.getElementById('settings-recovery-code')?.textContent;
    if (code) navigator.clipboard.writeText(code).then(() => Toast.show('Recovery code copied!', '#00e676', 2000));
  },

  async recoverWithCode() {
    const name = document.getElementById('settings-recover-name')?.value?.trim();
    const code = document.getElementById('settings-recover-code')?.value?.trim();
    if (!name || !code) { alert('Enter your username and recovery code.'); return; }
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) { alert('Must be online to recover.'); return; }

    const result = await Firebase.recoverAccount(name, code);
    if (result.ok) {
      document.getElementById('settings-recover-name').value = '';
      document.getElementById('settings-recover-code').value = '';
      alert('Account recovered! Your save has been restored.');
      this.profile.name = name;
      this.updateProfileDisplay();
      this.save();
      this.render();
    } else {
      alert('Recovery failed: ' + result.error);
    }
  },

  async loginWithPassword() {
    const name = document.getElementById('settings-login-name')?.value?.trim();
    const pw = document.getElementById('settings-login-pw')?.value?.trim();
    if (!name || !pw) { alert('Enter name and password.'); return; }
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) { alert('Must be online to log in.'); return; }

    const result = await Firebase.loginWithPassword(name, pw);
    if (result.ok) {
      document.getElementById('settings-login-name').value = '';
      document.getElementById('settings-login-pw').value = '';
      alert('Logged in! Save data loaded from ' + name + '\'s account.');
      this.profile.name = name;
      this.updateProfileDisplay();
      this.save();
      this.render();
    } else {
      alert('Login failed: ' + result.error);
    }
  },

  async deleteSelfData() {
    const cost = 5_000_000;
    if (App.balance < cost) { alert('You need ' + App.formatMoney(cost) + ' to remove your public data.'); return; }
    if (!confirm('Remove your public data from the leaderboard, cloud save, and company listings?\n\nCosts ' + App.formatMoney(cost) + '. Your local game is NOT deleted.')) return;
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) { alert('Must be online to remove public data.'); return; }
    App.addBalance(-cost);
    App.save();
    await Firebase.deleteSelfData();
    alert('Public data removed successfully.');
  },

  // === SAVE / LOAD ===
  save() {
    const data = {
      theme: this.currentTheme,
      customThemeColor: this.customThemeColor,
      profile: this.profile,
      options: this.options
    };
    localStorage.setItem('retros_casino_settings', JSON.stringify(data));
  },

  load() {
    const raw = localStorage.getItem('retros_casino_settings');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.theme) this.currentTheme = data.theme;
      if (data.customThemeColor) this.customThemeColor = data.customThemeColor;
      if (data.profile) {
        this.profile.name        = data.profile.name || 'Player';
        this.profile.avatar      = data.profile.avatar || 0;
        this.profile.bio         = data.profile.bio || '';
        this.profile.bannerColor = data.profile.bannerColor || '#00e676';
        this.profile.title       = data.profile.title || '';
      }
      if (data.options) {
        Object.assign(this.options, data.options);
      }
    } catch (e) {}
  },

  _escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },
};
