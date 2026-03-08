// Donation / Lottery — "Retro's Casino Foundation"
const Donation = {
  _pool: 0,
  _myEntry: 0,
  _drawAt: 0,
  _lastWinner: null,
  _entries: {},
  _pendingPrize: 0,
  _initialized: false,
  _metaListener: null,
  _entriesListener: null,

  get _db() { return typeof Firebase !== 'undefined' && Firebase.isOnline() ? Firebase.db : null; },

  init() {
    const el = document.getElementById('donation-content');
    if (!el) return;
    if (!this._db) { this._renderOffline(); return; }
    if (!this._initialized) {
      this._startListeners();
      this._checkPrize();
      this._initialized = true;
    } else {
      this._render();
    }
  },

  _startListeners() {
    if (!this._db) return;
    // Meta listener
    this._db.ref('donationPool/meta').on('value', snap => {
      const m = snap.val() || {};
      this._pool = m.total || 0;
      this._drawAt = m.drawAt || 0;
      this._lastWinner = m.lastWinnerName ? { name: m.lastWinnerName, amount: m.lastWinnerAmount } : null;
      // Set initial drawAt if not set
      if (!this._drawAt) {
        const nextDraw = Date.now() + 24 * 3600000;
        this._db.ref('donationPool/meta/drawAt').transaction(cur => cur || nextDraw);
        this._drawAt = nextDraw;
      }
      this._render();
      if (this._pool > 0 && this._drawAt > 0 && Date.now() > this._drawAt) {
        this._tryDraw();
      }
    });
    // Entries listener
    this._db.ref('donationPool/entries').on('value', snap => {
      this._entries = snap.val() || {};
      const myUid = Firebase.uid;
      this._myEntry = myUid && this._entries[myUid] ? this._entries[myUid].amount : 0;
      this._render();
    });
  },

  async _checkPrize() {
    if (!this._db || !Firebase.uid) return;
    const snap = await this._db.ref('donationPool/prizes/' + Firebase.uid).once('value');
    const amount = snap.val();
    if (amount && amount > 0) {
      this._pendingPrize = amount;
      this._render();
    }
  },

  async claimPrize() {
    if (!this._pendingPrize || !this._db) return;
    const amount = this._pendingPrize;
    await this._db.ref('donationPool/prizes/' + Firebase.uid).remove();
    this._pendingPrize = 0;
    App.addBalance(amount);
    App.save();
    Toast.show('🎰 Lottery prize claimed! +' + App.formatMoney(amount), '#00e676', 8000);
    this._render();
  },

  donate() {
    const inp = document.getElementById('donation-amount');
    const amount = App.parseAmount(inp ? inp.value : '0');
    if (isNaN(amount) || amount < 1) { Toast.show('Enter a valid amount (min $1)', '#f44336', 3000); return; }
    if (App.balance < amount) { Toast.show('Not enough funds!', '#f44336', 3000); return; }
    if (!this._db) { Toast.show('Must be online to donate', '#f44336', 3000); return; }

    App.addBalance(-amount);
    App.save();

    const uid = Firebase.uid;
    const name = typeof Settings !== 'undefined' ? Settings.profile.name : 'Player';

    this._db.ref('donationPool/entries/' + uid).transaction(cur => ({
      name, uid, amount: ((cur && cur.amount) || 0) + amount,
    }));
    this._db.ref('donationPool/meta/total').transaction(cur => (cur || 0) + amount);
    this._db.ref('donationPool/meta/drawAt').transaction(cur => cur || (Date.now() + 24 * 3600000));

    Toast.show('🏛 Donated ' + App.formatMoney(amount) + ' to the Foundation!', '#bb86fc', 4000);
    if (inp) inp.value = '';
  },

  async _tryDraw() {
    if (!this._db || !Firebase.uid) return;
    const snap = await this._db.ref('donationPool/meta').once('value');
    const meta = snap.val() || {};
    if (!meta.drawAt || Date.now() < meta.drawAt) return;
    if (!meta.total || meta.total < 1) return;

    // Race: only one client executes the draw
    const txResult = await this._db.ref('donationPool/meta/drawAt').transaction(current => {
      if (current !== meta.drawAt) return undefined; // abort — someone else updated it
      return Date.now() + 24 * 3600000; // set next draw
    });
    if (!txResult.committed) return;

    // Read entries
    const entriesSnap = await this._db.ref('donationPool/entries').once('value');
    const entries = entriesSnap.val() || {};
    const entryList = Object.entries(entries);
    if (!entryList.length) return;

    // Proportional lottery
    const total = meta.total;
    let rand = Math.random() * total;
    let winner = null;
    for (const [uid, entry] of entryList) {
      rand -= entry.amount;
      if (rand <= 0) { winner = { uid, name: entry.name }; break; }
    }
    if (!winner) winner = { uid: entryList[0][0], name: entryList[0][1].name };

    // Deliver prize
    await this._db.ref('donationPool/prizes/' + winner.uid).set(total);

    // Update meta + clear entries
    await this._db.ref('donationPool/meta').update({
      lastWinnerName: winner.name,
      lastWinnerAmount: total,
      lastDrawAt: Date.now(),
      total: 0,
    });
    await this._db.ref('donationPool/entries').remove();

    // Announce in global chat
    Firebase.pushSystemAnnouncement('🎰 FOUNDATION LOTTERY: ' + winner.name + ' won ' + App.formatMoney(total) + '! Congratulations!');

    // If I won, pick up prize
    if (winner.uid === Firebase.uid) {
      this._pendingPrize = total;
      this._render();
    }
  },

  _render() {
    const el = document.getElementById('donation-content');
    if (!el) return;
    // Protect focused inputs
    const focused = document.activeElement;
    if (focused && el.contains(focused) && (focused.tagName === 'INPUT')) return;
    el.innerHTML = this._buildHtml();
  },

  _renderOffline() {
    const el = document.getElementById('donation-content');
    if (el) el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim)">🔌 Sign in online to participate in the Foundation lottery.</div>';
  },

  _buildHtml() {
    const myShare = this._pool > 0 && this._myEntry > 0
      ? ((this._myEntry / this._pool) * 100).toFixed(1) : '0.0';
    const timeLeft = this._drawAt > Date.now()
      ? this._msToHuman(this._drawAt - Date.now()) : 'Drawing soon...';

    const topDonors = Object.values(this._entries)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map((e, i) => `<div class="donation-donor">
        <span class="donation-donor-rank">#${i + 1}</span>
        <span class="donation-donor-name">${this._esc(e.name)}</span>
        <span class="donation-donor-amt">${App.formatMoney(e.amount)}</span>
      </div>`)
      .join('');

    const prizeHtml = this._pendingPrize ? `
      <div class="donation-prize-banner">
        <div class="donation-prize-text">🎉 You won ${App.formatMoney(this._pendingPrize)}!</div>
        <button class="donation-claim-btn" onclick="Donation.claimPrize()">CLAIM PRIZE</button>
      </div>` : '';

    const lastWinnerHtml = this._lastWinner ? `
      <div class="donation-last-winner">Last winner: <strong>${this._esc(this._lastWinner.name)}</strong> — ${App.formatMoney(this._lastWinner.amount)}</div>` : '';

    return `
      ${prizeHtml}
      <div class="donation-hero">
        <div class="donation-hero-logo">🏛</div>
        <div class="donation-hero-title">Retro's Casino Foundation</div>
        <div class="donation-hero-tagline">100% of proceeds go directly to the pot. We are a fully registered<br>non-profit in exactly 0 jurisdictions.</div>
      </div>

      <div class="donation-pool-card">
        <div class="donation-pool-label">CURRENT JACKPOT</div>
        <div class="donation-pool-amount">${App.formatMoney(this._pool)}</div>
        <div class="donation-pool-draw">Next draw: ${timeLeft}</div>
        ${lastWinnerHtml}
      </div>

      <div class="donation-stats-row">
        <div class="donation-stat">
          <div class="donation-stat-v">${App.formatMoney(this._myEntry)}</div>
          <div class="donation-stat-l">My Contribution</div>
        </div>
        <div class="donation-stat">
          <div class="donation-stat-v">${myShare}%</div>
          <div class="donation-stat-l">Win Chance</div>
        </div>
        <div class="donation-stat">
          <div class="donation-stat-v">${Object.keys(this._entries).length}</div>
          <div class="donation-stat-l">Participants</div>
        </div>
      </div>

      <div class="donation-form">
        <div class="donation-form-title">Make a Tax-Deductible Donation</div>
        <div class="donation-disclaimer">*Not actually tax deductible. Consult your nearest shady accountant.</div>
        <div class="donation-input-row">
          <input id="donation-amount" type="text" class="sh-input" placeholder="Amount (e.g. 1b)">
          <span class="sh-preview" style="display:none"></span>
        </div>
        <div class="donation-quick-btns">
          <button class="donation-quick-btn" onclick="document.getElementById('donation-amount').value='1m'">$1M</button>
          <button class="donation-quick-btn" onclick="document.getElementById('donation-amount').value='100m'">$100M</button>
          <button class="donation-quick-btn" onclick="document.getElementById('donation-amount').value='1b'">$1B</button>
          <button class="donation-quick-btn" onclick="document.getElementById('donation-amount').value='10b'">$10B</button>
          <button class="donation-quick-btn" onclick="document.getElementById('donation-amount').value='max'">MAX</button>
        </div>
        <button class="donation-donate-btn" onclick="Donation.donate()">
          💰 DONATE TO THE FOUNDATION
        </button>
        <div class="donation-warning">WARNING: This is a real lottery. Winners chosen proportionally by contribution.<br>By donating you acknowledge the Foundation does not legally exist.</div>
      </div>

      ${topDonors ? `<div class="donation-leaderboard">
        <div class="donation-lb-title">Top Donors</div>
        ${topDonors}
      </div>` : ''}
    `;
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
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },
};
