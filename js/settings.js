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

  // === STATE ===
  currentTheme: 'green',
  profile: { name: 'Player', avatar: 0 },
  options: {
    autoSaveInterval: 30,
    numberFormat: 'standard',
    confirmBets: false,
    showStreaks: true,
    fastAnimations: false,
    showStockTicker: false,
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
    const theme = this.themes.find(t => t.id === this.currentTheme) || this.themes[0];
    document.documentElement.style.setProperty('--green', theme.color);
    document.documentElement.style.setProperty('--green-dark', theme.dark);
    document.documentElement.setAttribute('data-theme', theme.id);
  },

  // === PROFILE ===
  setAvatar(index) {
    this.profile.avatar = index;
    this.updateProfileDisplay();
    this.save();
    this.render();
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

    container.innerHTML = `
      <!-- Profile -->
      <div class="settings-section">
        <h3>Profile</h3>
        <div class="settings-row">
          <label>Username:</label>
          <input type="text" id="settings-name" maxlength="16" value="${this.profile.name}" onchange="Settings.setName(this.value)" placeholder="Player">
        </div>
        <div class="avatar-grid">
          ${this.avatars.map((a, i) =>
            `<button class="avatar-option${i === this.profile.avatar ? ' selected' : ''}" onclick="Settings.setAvatar(${i})">${a}</button>`
          ).join('')}
        </div>
      </div>

      <!-- Theme -->
      <div class="settings-section">
        <h3>Theme</h3>
        <div class="theme-picker">
          ${this.themes.map(t =>
            `<button class="theme-circle${t.id === this.currentTheme ? ' selected' : ''}" style="background:${t.color}" onclick="Settings.setTheme('${t.id}')" title="${t.name}"></button>`
          ).join('')}
        </div>
        <div class="theme-name">${(this.themes.find(t => t.id === this.currentTheme) || this.themes[0]).name}</div>
      </div>

      <!-- Account / Save Transfer -->
      <div class="settings-section">
        <h3>Account (Save Transfer)</h3>
        <p class="settings-hint">Set a password to recover your save on any device.</p>
        <div class="settings-row">
          <label>New Password:</label>
          <input type="password" id="settings-set-pw" placeholder="Min 4 chars" autocomplete="new-password">
        </div>
        <div class="settings-row">
          <label>Confirm:</label>
          <input type="password" id="settings-confirm-pw" placeholder="Confirm password" autocomplete="new-password">
        </div>
        <button class="settings-btn" onclick="Settings.setAccountPassword()">Set Password</button>

        <div class="settings-divider"></div>
        <p class="settings-hint">On a new device, login to restore your save:</p>
        <div class="settings-row">
          <label>Username:</label>
          <input type="text" id="settings-login-name" placeholder="Your username" autocomplete="username">
        </div>
        <div class="settings-row">
          <label>Password:</label>
          <input type="password" id="settings-login-pw" placeholder="Your password" autocomplete="current-password">
        </div>
        <button class="settings-btn" onclick="Settings.loginWithPassword()">Login / Restore Save</button>
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
      alert('Password set! You can now recover your save on any device by logging in with your name and password.');
    } else {
      alert('Failed: ' + result.error);
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
      if (data.profile) {
        this.profile.name = data.profile.name || 'Player';
        this.profile.avatar = data.profile.avatar || 0;
      }
      if (data.options) {
        Object.assign(this.options, data.options);
      }
    } catch (e) {}
  }
};
