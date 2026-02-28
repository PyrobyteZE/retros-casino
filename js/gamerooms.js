// === MainRoom — Global Multiplayer Rooms ===
// All players auto-connect when they open a game screen.
// An admin triggers games from the admin panel.
// Host runs the simulation; non-hosts apply the result from Firebase.

const MainRoom = {
  _rooms: {},        // { horses: data, crash: data, roulette: data }
  _myBets: {},       // { horses: { bet, pick }, roulette: { bet } }
  _payoutTrack: {},  // dedup: 'horses_startedAt' -> true
  _countdowns: {},   // setInterval ids

  _gameMap: {
    horses: 'screen-horses',
    crash: 'screen-crash',
    roulette: 'screen-roulette',
  },

  init() {
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) return;
    for (const g of ['horses', 'crash', 'roulette']) {
      Firebase.listenMainRoom(g, data => this._onUpdate(g, data));
    }
  },

  joinScreen(game) {
    if (typeof Firebase === 'undefined' || !Firebase.isOnline()) return;
    const room = this._rooms[game];
    if (!room) return; // no active room for this game
    const uid = Firebase.uid;
    if (!uid) return;
    if (room.players && room.players[uid]) return; // already in
    Firebase.joinMainRoom(game, uid, {
      name: (typeof Settings !== 'undefined') ? Settings.profile.name : 'Player',
      spectating: true,
      joinedAt: Date.now(),
    });
  },

  // ─── Admin Controls ────────────────────────────────────────────

  adminOpen(game, durationSec) {
    if (!Admin.isAdmin() || !Firebase.isOnline()) return;
    durationSec = parseInt(durationSec) || 30;
    const name = typeof Settings !== 'undefined' ? Settings.profile.name : 'Admin';
    Firebase.setMainRoom(game, {
      status: 'betting',
      host: Firebase.uid,
      hostSession: Firebase._sessionId,
      hostName: name,
      betWindowEnd: Date.now() + durationSec * 1000,
      startedAt: 0,
      seed: 0,
      result: null,
      players: {},
    });
    Toast.show('🎮 ' + game + ' room open — ' + durationSec + 's to bet', '#bb86fc', 3000);
  },

  adminForceStart(game) {
    if (!Admin.isAdmin()) return;
    const room = this._rooms[game];
    if (!room) { Toast.show('No room open for ' + game, '#ff5252'); return; }
    Firebase.updateMainRoom(game, { betWindowEnd: Date.now() - 1 });
    if (this._isHost(game)) this._hostStartGame(game, room);
  },

  adminClose(game) {
    if (!Admin.isAdmin()) return;
    Firebase.setMainRoom(game, null);
    Toast.show('Room closed', '#ff5252', 2000);
  },

  // ─── State ─────────────────────────────────────────────────────

  _isHost(game) {
    const r = this._rooms[game];
    return r && r.host === Firebase.uid && r.hostSession === Firebase._sessionId;
  },

  // ─── Firebase Listener ────────────────────────────────────────

  _onUpdate(game, data) {
    this._rooms[game] = data;
    this._clearCountdown(game);

    if (!data) { this._removeOverlay(game); return; }

    if (data.status === 'betting') {
      this._showBettingOverlay(game, data);
      this._startCountdown(game, data);
      // If host and window already expired, start now
      if (this._isHost(game) && Date.now() >= data.betWindowEnd) {
        this._hostStartGame(game, data);
      }
    } else if (data.status === 'running') {
      this._showRunningOverlay(game, data);
      // Non-hosts wait for 'done' — nothing to run
    } else if (data.status === 'done') {
      this._applyResult(game, data);
    }
  },

  _startCountdown(game, data) {
    const tick = () => {
      const room = this._rooms[game];
      if (!room || room.status !== 'betting') { this._clearCountdown(game); return; }

      const ms = data.betWindowEnd - Date.now();
      const timerEl = document.getElementById('mp-timer-' + game);
      if (timerEl) timerEl.textContent = Math.max(0, Math.ceil(ms / 1000)) + 's';

      if (ms <= 0) {
        this._clearCountdown(game);
        if (this._isHost(game)) {
          this._hostStartGame(game, room);
        } else {
          // Non-host: wait 6s for host to push result, then try to claim host
          setTimeout(() => {
            const r = this._rooms[game];
            if (r && r.status === 'betting') {
              Firebase.claimMainRoomHost(game, claimed => {
                if (claimed) {
                  // Reload fresh room data then start
                  const fresh = this._rooms[game];
                  if (fresh) this._hostStartGame(game, fresh);
                }
              });
            }
          }, 6000);
        }
      }
    };
    tick();
    this._countdowns[game] = setInterval(tick, 500);
  },

  _clearCountdown(game) {
    if (this._countdowns[game]) { clearInterval(this._countdowns[game]); delete this._countdowns[game]; }
  },

  // ─── Host: Run the Game ────────────────────────────────────────

  _hostStartGame(game, room) {
    const seed = Math.floor(Math.random() * 1e9);
    Firebase.updateMainRoom(game, { status: 'running', seed, startedAt: Date.now() });
    this._showRunningOverlay(game, room);
    if (game === 'horses') this._hostRunHorses(seed, room);
    else if (game === 'crash') this._hostRunCrash(seed, room);
    else if (game === 'roulette') this._hostRunRoulette(seed, room);
  },

  _hostRunHorses(seed, room) {
    const seeded = this._seededRand(seed);
    const winner = typeof Horses !== 'undefined' ? Horses.pickWinnerSeeded(seeded) : 'Thunder';
    Horses.raceMultiplayer(winner, () => {
      const players = room.players || {};
      const updates = { status: 'done', result: { winner } };
      for (const uid in players) {
        const p = players[uid];
        if (p.pick === winner) {
          const horse = Horses.horses.find(h => h.name === winner);
          updates['players/' + uid + '/payout'] = Math.floor(p.bet * (horse ? horse.odds : 2));
        } else {
          updates['players/' + uid + '/payout'] = 0;
        }
      }
      Firebase.updateMainRoom('horses', updates);
    });
  },

  _hostRunCrash(seed, room) {
    const seeded = this._seededRand(seed);
    const crashPoint = Math.max(1.01, 0.99 / seeded());
    // Host runs normal crash with forced crash point
    // Crash multiplayer handled by finishSpin after result
    Firebase.updateMainRoom('crash', {
      status: 'done',
      result: { crashPoint },
      // For crash, players who set cashoutAt < crashPoint win
      ...Object.fromEntries(
        Object.entries(room.players || {}).map(([uid, p]) => {
          const cashoutMult = p.cashoutAt > 0 && p.cashoutAt < crashPoint ? p.cashoutAt : 0;
          return ['players/' + uid + '/payout', cashoutMult > 0 ? Math.floor(p.bet * cashoutMult) : 0];
        })
      ),
    });
  },

  _hostRunRoulette(seed, room) {
    const seeded = this._seededRand(seed);
    const idx = Math.floor(seeded() * Roulette.wheelOrder.length);
    const resultNum = Roulette.wheelOrder[idx];
    // Spin animation locally, then push result
    Roulette._doSpinAnimation(resultNum, () => {
      Roulette.finishSpin(resultNum);  // host resolves own bets
      Firebase.updateMainRoom('roulette', { status: 'done', result: { number: resultNum } });
    });
  },

  // ─── Non-Host: Apply Result ────────────────────────────────────

  _applyResult(game, data) {
    const key = game + '_' + (data.startedAt || data.betWindowEnd || 0);
    if (this._payoutTrack[key]) return;
    this._payoutTrack[key] = true;

    const myData = (data.players || {})[Firebase.uid];

    if (game === 'horses') {
      const winner = data.result && data.result.winner;
      if (!this._isHost(game) && winner) {
        Horses.raceMultiplayer(winner, null);
      }
      if (myData) {
        if (myData.payout > 0) {
          App.addBalance(myData.payout);
          const net = myData.payout - (myData.bet || 0);
          Toast.show('🏇 +' + App.formatMoney(net) + ' (multiplayer)', '#00e676', 4000);
          GameStats.record('horses', 'win', net);
          App.recordWin();
        } else if (myData.bet > 0) {
          Toast.show('🏇 Lost ' + App.formatMoney(myData.bet) + ' (multiplayer)', '#ff5252', 3000);
          GameStats.record('horses', 'lose', myData.bet);
          App.recordLoss();
        }
      }

    } else if (game === 'crash') {
      if (myData) {
        if (myData.payout > 0) {
          App.addBalance(myData.payout);
          const net = myData.payout - (myData.bet || 0);
          Toast.show('🚀 +' + App.formatMoney(net) + ' (multiplayer crash)', '#00e676', 4000);
          GameStats.record('crash', 'win', net);
          App.recordWin();
        } else if (myData.bet > 0) {
          const cp = data.result && data.result.crashPoint;
          Toast.show('💥 Crashed at ' + (cp ? cp.toFixed(2) + 'x' : '?') + ' — lost ' + App.formatMoney(myData.bet), '#ff5252', 3000);
          GameStats.record('crash', 'lose', myData.bet);
          App.recordLoss();
        }
      }

    } else if (game === 'roulette') {
      // Non-host: run animation then resolve own local bets
      if (!this._isHost(game) && data.result && data.result.number !== undefined) {
        Roulette._doSpinAnimation(data.result.number, () => {
          Roulette.finishSpin(data.result.number);
        });
      }
    }

    // Clean up room after 8s (host only)
    if (this._isHost(game)) {
      setTimeout(() => Firebase.setMainRoom(game, null), 8000);
    }
    setTimeout(() => this._removeOverlay(game), 8000);
  },

  // ─── Bet Placement ─────────────────────────────────────────────

  placeBet(game) {
    const room = this._rooms[game];
    if (!room || room.status !== 'betting') { Toast.show('No active room', '#ff5252'); return; }
    if (Date.now() >= room.betWindowEnd) { Toast.show('Betting window closed!', '#ff5252'); return; }
    if (!Firebase.isOnline()) { Toast.show('Not connected', '#ff5252'); return; }

    const name = typeof Settings !== 'undefined' ? Settings.profile.name : 'Player';
    let betData = { bet: 0, payout: 0, name };

    if (game === 'horses') {
      const el = document.getElementById('mp-horses-bet');
      const bet = App.parseAmount(el ? el.value : '0');
      if (isNaN(bet) || bet < 1) { Toast.show('Enter a valid bet', '#ff5252'); return; }
      if (bet > App.balance && !Admin.godMode) { Toast.show('Not enough funds', '#ff5252'); return; }
      const pick = Horses.selected >= 0 ? Horses.horses[Horses.selected]?.name : null;
      if (!pick) { Toast.show('Pick a horse first!', '#ff5252'); return; }
      if (!Admin.godMode) App.addBalance(-bet);
      betData = { ...betData, bet, pick };

    } else if (game === 'crash') {
      const betEl = document.getElementById('crash-bet');
      const bet = App.parseAmount(betEl ? betEl.value : '0');
      if (isNaN(bet) || bet < 1) { Toast.show('Enter a valid bet', '#ff5252'); return; }
      if (bet > App.balance && !Admin.godMode) { Toast.show('Not enough funds', '#ff5252'); return; }
      const cashoutAt = parseFloat(document.getElementById('crash-auto')?.value) || 0;
      if (!Admin.godMode) App.addBalance(-bet);
      betData = { ...betData, bet, cashoutAt };

    } else if (game === 'roulette') {
      // Balance already deducted by normal roulette board
      if (Roulette.totalBet === 0) { Toast.show('Place bets on the board below first!', '#ff5252'); return; }
      betData = { ...betData, bet: Roulette.totalBet };
    }

    this._myBets[game] = betData;
    Firebase.joinMainRoom(game, Firebase.uid, betData);

    const btn = document.getElementById('mp-bet-btn-' + game);
    if (btn) { btn.textContent = '✓ Locked In'; btn.disabled = true; }
    Toast.show('✓ Bet locked in!', '#bb86fc', 2000);
  },

  // ─── Overlay Rendering ─────────────────────────────────────────

  _getScreen(game) {
    const id = this._gameMap[game];
    return id ? document.getElementById(id) : null;
  },

  _removeOverlay(game) {
    const s = this._getScreen(game);
    if (!s) return;
    const o = s.querySelector('.mp-room-overlay');
    if (o) o.remove();
    delete this._myBets[game];
  },

  _showBettingOverlay(game, data) {
    const screen = this._getScreen(game);
    if (!screen) return;

    let overlay = screen.querySelector('.mp-room-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'mp-room-overlay';
      screen.insertBefore(overlay, screen.firstChild);
    }

    const timeLeft = Math.max(0, Math.ceil((data.betWindowEnd - Date.now()) / 1000));
    const players = data.players || {};
    const myJoined = !!players[Firebase.uid];
    const playerChips = Object.values(players)
      .map(p => `<span class="mp-player-chip">${p.name}${p.pick ? ' (' + p.pick + ')' : ''}</span>`)
      .join('');

    let betUI = '';
    if (!myJoined) {
      if (game === 'horses') {
        betUI = `
          <div id="mp-horses-grid" class="mp-horse-picker"></div>
          <div class="mp-bet-row">
            <span class="mp-dollar">$</span>
            <input type="text" inputmode="decimal" id="mp-horses-bet" class="sh-input" placeholder="Bet amount" style="flex:1">
            <button id="mp-bet-btn-horses" class="mp-bet-btn" onclick="MainRoom.placeBet('horses')">Place Bet</button>
          </div>`;
      } else if (game === 'crash') {
        betUI = `
          <div style="font-size:12px;color:var(--text-dim);margin-bottom:4px">Use your bet &amp; auto-cashout fields below, then lock in:</div>
          <div class="mp-bet-row">
            <button id="mp-bet-btn-crash" class="mp-bet-btn" onclick="MainRoom.placeBet('crash')">Lock In Bet</button>
          </div>`;
      } else if (game === 'roulette') {
        betUI = `
          <div style="font-size:12px;color:var(--text-dim);margin-bottom:4px">Place your bets on the board below, then lock in:</div>
          <div class="mp-bet-row">
            <button id="mp-bet-btn-roulette" class="mp-bet-btn" onclick="MainRoom.placeBet('roulette')">Lock In Bets</button>
          </div>`;
      }
    } else {
      const mine = players[Firebase.uid];
      betUI = `<div class="mp-bet-confirmed">✓ ${App.formatMoney(mine.bet)}${mine.pick ? ' on ' + mine.pick : ''} — waiting for start</div>`;
    }

    overlay.innerHTML = `
      <div class="mp-room-header">
        <span class="mp-room-badge">🎮 MULTIPLAYER</span>
        <span class="mp-room-host">Host: ${data.hostName}</span>
        <span class="mp-room-timer" id="mp-timer-${game}">${timeLeft}s</span>
      </div>
      <div class="mp-room-players">${playerChips || '<span style="color:var(--text-dim);font-size:11px">No players yet</span>'}</div>
      ${betUI}
    `;

    if (game === 'horses' && !myJoined) {
      const grid = document.getElementById('mp-horses-grid');
      if (grid) Horses.renderHorseButtons(grid);
    }
  },

  _showRunningOverlay(game, data) {
    const screen = this._getScreen(game);
    if (!screen) return;
    let overlay = screen.querySelector('.mp-room-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'mp-room-overlay';
      screen.insertBefore(overlay, screen.firstChild);
    }
    const count = Object.keys((data && data.players) || {}).length;
    overlay.innerHTML = `
      <div class="mp-room-header">
        <span class="mp-room-badge mp-room-live">🔴 LIVE</span>
        <span class="mp-room-host">${count} player${count !== 1 ? 's' : ''} in this room</span>
      </div>
    `;
  },

  // ─── Seeded RNG ────────────────────────────────────────────────

  _seededRand(seed) {
    let s = seed >>> 0;
    return () => {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  },
};

// === PrivateRoom — Player-created private game lobbies ===
const PrivateRoom = {
  _roomId: null,
  _game: null,
  _data: null,
  _isHost: false,
  _payoutTrack: {},
  _countdown: null,

  // ─── Entry Point ────────────────────────────────────────────────

  showRoomPanel(game) {
    let modal = document.getElementById('private-room-modal');
    if (modal) { modal.remove(); return; }
    modal = document.createElement('div');
    modal.id = 'private-room-modal';
    modal.className = 'private-room-modal';
    modal.innerHTML = '<div class="private-room-inner" id="prm-inner"></div>';
    document.getElementById('app').appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    this._renderModal(game);
  },

  _renderModal(game) {
    const inner = document.getElementById('prm-inner');
    if (!inner) return;
    if (!this._roomId) {
      inner.innerHTML = `
        <div class="prm-title">\u{1F512} Private Room — ${game.charAt(0).toUpperCase() + game.slice(1)}</div>
        <button class="prm-btn prm-create" onclick="PrivateRoom.create('${game}')">Create Room</button>
        <div class="prm-divider">— or join by code —</div>
        <div class="prm-join-row">
          <input type="text" id="prm-code-input" class="prm-code-input" placeholder="Enter code (e.g. A4X9K2)" maxlength="6">
          <button class="prm-btn" onclick="PrivateRoom._joinByCode('${game}')">Join</button>
        </div>
        <button class="prm-close-btn" onclick="document.getElementById('private-room-modal').remove()">✕</button>`;
    } else if (this._isHost) {
      const data = this._data || {};
      const players = data.players || {};
      const chips = Object.values(players).map(p => `<span class="mp-player-chip">${p.name}</span>`).join('') || '<span style="color:var(--text-dim);font-size:11px">No players yet</span>';
      const onlineRows = Object.entries(Firebase.onlinePlayers || {})
        .filter(([uid]) => uid !== Firebase.uid)
        .map(([uid, p]) => `<div class="online-pick-row">${this._escapeHtml(p.name || 'Player')} <button class="prm-invite-btn" onclick="PrivateRoom.invite('${uid}')">Invite</button></div>`)
        .join('') || '<div style="color:var(--text-dim);font-size:11px">No players online</div>';
      inner.innerHTML = `
        <div class="prm-title">\u{1F512} Your Room — ${game.charAt(0).toUpperCase() + game.slice(1)}</div>
        <div class="prm-code-display">Code: <span class="private-room-code">${data.code || ''}</span></div>
        <div class="mp-room-players" style="margin:8px 0">${chips}</div>
        <div class="prm-section-label">Invite a player:</div>
        <div class="online-pick-list">${onlineRows}</div>
        <div class="prm-start-row">
          <button class="prm-btn" onclick="PrivateRoom.startBetting(30)">Start Betting 30s</button>
          <button class="prm-btn" onclick="PrivateRoom.startBetting(60)">Start Betting 60s</button>
        </div>
        <button class="prm-btn prm-danger" onclick="PrivateRoom.leave()">Close Room</button>
        <button class="prm-close-btn" onclick="document.getElementById('private-room-modal').remove()">✕</button>`;
    } else {
      const data = this._data || {};
      const players = data.players || {};
      const chips = Object.values(players).map(p => `<span class="mp-player-chip">${p.name}</span>`).join('') || '<span style="color:var(--text-dim);font-size:11px">No players yet</span>';
      inner.innerHTML = `
        <div class="prm-title">\u{1F512} Private Room — ${game.charAt(0).toUpperCase() + game.slice(1)}</div>
        <div class="prm-code-display">Code: <span class="private-room-code">${data.code || ''}</span></div>
        <div class="mp-room-players" style="margin:8px 0">${chips}</div>
        <div style="color:var(--text-dim);font-size:12px;margin:8px 0">Waiting for host to start…</div>
        <button class="prm-btn prm-danger" onclick="PrivateRoom.leave()">Leave Room</button>
        <button class="prm-close-btn" onclick="document.getElementById('private-room-modal').remove()">✕</button>`;
    }
  },

  // ─── Create / Join ───────────────────────────────────────────────

  create(game) {
    if (!Firebase.isOnline()) { Toast.show('Not connected', '#ff5252'); return; }
    const roomId = Math.random().toString(36).slice(2, 10);
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const name = typeof Settings !== 'undefined' ? Settings.profile.name : 'Player';
    const data = {
      game,
      code,
      hostUid: Firebase.uid,
      hostName: name,
      hostSession: Firebase._sessionId,
      status: 'lobby',
      betWindowEnd: 0,
      startedAt: 0,
      seed: 0,
      result: null,
      players: {
        [Firebase.uid]: { name, spectating: true, bet: 0, payout: 0, joinedAt: Date.now() },
      },
    };
    Firebase.createPrivateRoom(roomId, data).then(() => {
      this._roomId = roomId;
      this._game = game;
      this._isHost = true;
      Firebase.listenPrivateRoom(roomId, d => this._onUpdate(d));
      this._renderModal(game);
      Toast.show('\u{1F512} Room created! Code: ' + code, '#bb86fc', 5000);
    });
  },

  join(roomId, game) {
    if (!Firebase.isOnline()) { Toast.show('Not connected', '#ff5252'); return; }
    const name = typeof Settings !== 'undefined' ? Settings.profile.name : 'Player';
    Firebase.joinPrivateRoom(roomId, Firebase.uid, { name, spectating: true, bet: 0, payout: 0, joinedAt: Date.now() });
    this._roomId = roomId;
    this._game = game;
    this._isHost = false;
    Firebase.listenPrivateRoom(roomId, d => this._onUpdate(d));
    const modal = document.getElementById('private-room-modal');
    if (modal) this._renderModal(game);
    Toast.show('\u{1F512} Joined room!', '#bb86fc', 2000);
  },

  _joinByCode(game) {
    const input = document.getElementById('prm-code-input');
    const code = (input ? input.value : '').trim().toUpperCase();
    if (!code || code.length < 4) { Toast.show('Enter a valid code', '#ff5252'); return; }
    if (!Firebase.isOnline()) { Toast.show('Not connected', '#ff5252'); return; }
    // Search for a room with this code and game
    Firebase.db.ref('privateRooms').orderByChild('code').equalTo(code).once('value', snap => {
      const all = snap.val();
      if (!all) { Toast.show('Room not found', '#ff5252'); return; }
      const [roomId, data] = Object.entries(all).find(([, d]) => d.game === game) || [];
      if (!roomId) { Toast.show('No ' + game + ' room with that code', '#ff5252'); return; }
      if (data.status === 'done') { Toast.show('That room has already finished', '#ff5252'); return; }
      this.join(roomId, game);
    });
  },

  invite(targetUid) {
    if (!this._roomId || !Firebase.isOnline()) return;
    const data = this._data || {};
    const hostName = typeof Settings !== 'undefined' ? Settings.profile.name : 'Player';
    Firebase.sendInvite(targetUid, {
      roomId: this._roomId,
      game: this._game,
      code: data.code || '',
      hostUid: Firebase.uid,
      hostName,
      ts: Date.now(),
    });
    Firebase.pushSystemAnnouncement('\u{1F4E8} ' + hostName + ' invited someone to a private ' + this._game + ' room');
    Toast.show('\u{1F4E8} Invite sent!', '#bb86fc', 2000);
  },

  leave() {
    if (!this._roomId) return;
    document.getElementById('private-room-modal')?.remove();
    if (this._isHost) {
      Firebase.deletePrivateRoom(this._roomId);
      Toast.show('Room closed', '#ff5252', 2000);
    } else {
      Firebase.db.ref('privateRooms/' + this._roomId + '/players/' + Firebase.uid).remove();
    }
    Firebase.stopListenPrivateRoom(this._roomId);
    this._clearState();
  },

  _clearState() {
    this._roomId = null;
    this._game = null;
    this._data = null;
    this._isHost = false;
    this._payoutTrack = {};
    this._clearCountdown();
    this._removeOverlay();
  },

  // ─── Host Controls ───────────────────────────────────────────────

  startBetting(sec) {
    if (!this._isHost || !this._roomId) return;
    document.getElementById('private-room-modal')?.remove();
    Firebase.updatePrivateRoom(this._roomId, {
      status: 'betting',
      betWindowEnd: Date.now() + sec * 1000,
    });
  },

  placeBet() {
    if (!this._roomId || !this._data) { Toast.show('No active room', '#ff5252'); return; }
    if (this._data.status !== 'betting') { Toast.show('Not in betting phase', '#ff5252'); return; }
    if (Date.now() >= this._data.betWindowEnd) { Toast.show('Betting window closed!', '#ff5252'); return; }
    const game = this._game;
    const name = typeof Settings !== 'undefined' ? Settings.profile.name : 'Player';
    let betData = { bet: 0, payout: 0, name, spectating: false };

    if (game === 'horses') {
      const el = document.getElementById('pr-horses-bet');
      const bet = App.parseAmount(el ? el.value : '0');
      if (isNaN(bet) || bet < 1) { Toast.show('Enter a valid bet', '#ff5252'); return; }
      if (bet > App.balance && !Admin.godMode) { Toast.show('Not enough funds', '#ff5252'); return; }
      const pick = Horses.selected >= 0 ? Horses.horses[Horses.selected]?.name : null;
      if (!pick) { Toast.show('Pick a horse first!', '#ff5252'); return; }
      if (!Admin.godMode) App.addBalance(-bet);
      betData = { ...betData, bet, pick };
    } else if (game === 'crash') {
      const betEl = document.getElementById('crash-bet');
      const bet = App.parseAmount(betEl ? betEl.value : '0');
      if (isNaN(bet) || bet < 1) { Toast.show('Enter a valid bet', '#ff5252'); return; }
      if (bet > App.balance && !Admin.godMode) { Toast.show('Not enough funds', '#ff5252'); return; }
      const cashoutAt = parseFloat(document.getElementById('crash-auto')?.value) || 0;
      if (!Admin.godMode) App.addBalance(-bet);
      betData = { ...betData, bet, cashoutAt };
    } else if (game === 'roulette') {
      if (Roulette.totalBet === 0) { Toast.show('Place bets on the board below first!', '#ff5252'); return; }
      betData = { ...betData, bet: Roulette.totalBet };
    }

    Firebase.joinPrivateRoom(this._roomId, Firebase.uid, betData);
    const btn = document.getElementById('pr-bet-btn');
    if (btn) { btn.textContent = '✓ Locked In'; btn.disabled = true; }
    Toast.show('✓ Bet locked in!', '#bb86fc', 2000);
  },

  // ─── Firebase Listener ────────────────────────────────────────

  _onUpdate(data) {
    if (!data) { this._clearState(); return; }
    this._data = data;
    // Check if we're still host
    if (data.hostUid === Firebase.uid && data.hostSession === Firebase._sessionId) {
      this._isHost = true;
    }
    // Refresh modal if open
    const modal = document.getElementById('private-room-modal');
    if (modal && data.status === 'lobby') { this._renderModal(this._game); return; }

    this._clearCountdown();
    if (data.status === 'betting') {
      this._showBettingOverlay(data);
      this._startCountdown(data);
      if (this._isHost && Date.now() >= data.betWindowEnd) this._hostStartGame(data);
    } else if (data.status === 'running') {
      this._showRunningOverlay(data);
    } else if (data.status === 'done') {
      this._applyResult(data);
    }
  },

  _startCountdown(data) {
    const tick = () => {
      const d = this._data;
      if (!d || d.status !== 'betting') { this._clearCountdown(); return; }
      const ms = data.betWindowEnd - Date.now();
      const el = document.getElementById('pr-timer');
      if (el) el.textContent = Math.max(0, Math.ceil(ms / 1000)) + 's';
      if (ms <= 0) {
        this._clearCountdown();
        if (this._isHost) this._hostStartGame(d);
      }
    };
    tick();
    this._countdown = setInterval(tick, 500);
  },

  _clearCountdown() {
    if (this._countdown) { clearInterval(this._countdown); this._countdown = null; }
  },

  // ─── Host: Run the Game ────────────────────────────────────────

  _hostStartGame(data) {
    const seed = Math.floor(Math.random() * 1e9);
    Firebase.updatePrivateRoom(this._roomId, { status: 'running', seed, startedAt: Date.now() });
    this._showRunningOverlay(data);
    if (this._game === 'horses') this._hostRunHorses(seed, data);
    else if (this._game === 'crash') this._hostRunCrash(seed, data);
    else if (this._game === 'roulette') this._hostRunRoulette(seed, data);
  },

  _hostRunHorses(seed, data) {
    const seeded = MainRoom._seededRand(seed);
    const winner = typeof Horses !== 'undefined' ? Horses.pickWinnerSeeded(seeded) : 'Thunder';
    Horses.raceMultiplayer(winner, () => {
      const players = data.players || {};
      const updates = { status: 'done', result: { winner } };
      for (const uid in players) {
        const p = players[uid];
        if (p.pick === winner) {
          const horse = Horses.horses.find(h => h.name === winner);
          updates['players/' + uid + '/payout'] = Math.floor(p.bet * (horse ? horse.odds : 2));
        } else {
          updates['players/' + uid + '/payout'] = 0;
        }
      }
      Firebase.updatePrivateRoom(this._roomId, updates);
    });
  },

  _hostRunCrash(seed, data) {
    const seeded = MainRoom._seededRand(seed);
    const crashPoint = Math.max(1.01, 0.99 / seeded());
    Firebase.updatePrivateRoom(this._roomId, {
      status: 'done',
      result: { crashPoint },
      ...Object.fromEntries(
        Object.entries(data.players || {}).map(([uid, p]) => {
          const cashoutMult = p.cashoutAt > 0 && p.cashoutAt < crashPoint ? p.cashoutAt : 0;
          return ['players/' + uid + '/payout', cashoutMult > 0 ? Math.floor(p.bet * cashoutMult) : 0];
        })
      ),
    });
  },

  _hostRunRoulette(seed, data) {
    const seeded = MainRoom._seededRand(seed);
    const idx = Math.floor(seeded() * Roulette.wheelOrder.length);
    const resultNum = Roulette.wheelOrder[idx];
    Roulette._doSpinAnimation(resultNum, () => {
      Roulette.finishSpin(resultNum);
      Firebase.updatePrivateRoom(this._roomId, { status: 'done', result: { number: resultNum } });
    });
  },

  // ─── Non-Host: Apply Result ────────────────────────────────────

  _applyResult(data) {
    const key = this._game + '_' + (data.startedAt || data.betWindowEnd || 0);
    if (this._payoutTrack[key]) return;
    this._payoutTrack[key] = true;
    const myData = (data.players || {})[Firebase.uid];

    if (this._game === 'horses') {
      const winner = data.result && data.result.winner;
      if (!this._isHost && winner) Horses.raceMultiplayer(winner, null);
      if (myData && myData.bet > 0) {
        if (myData.payout > 0) {
          App.addBalance(myData.payout);
          Toast.show('\u{1F40E} +' + App.formatMoney(myData.payout - myData.bet) + ' (private room)', '#00e676', 4000);
          GameStats.record('horses', 'win', myData.payout - myData.bet);
          App.recordWin();
        } else {
          Toast.show('\u{1F40E} Lost ' + App.formatMoney(myData.bet) + ' (private room)', '#ff5252', 3000);
          GameStats.record('horses', 'lose', myData.bet);
          App.recordLoss();
        }
      }
    } else if (this._game === 'crash') {
      if (myData && myData.bet > 0) {
        if (myData.payout > 0) {
          App.addBalance(myData.payout);
          Toast.show('\u{1F680} +' + App.formatMoney(myData.payout - myData.bet) + ' (private crash)', '#00e676', 4000);
          GameStats.record('crash', 'win', myData.payout - myData.bet);
          App.recordWin();
        } else {
          const cp = data.result && data.result.crashPoint;
          Toast.show('\u{1F4A5} Crashed at ' + (cp ? cp.toFixed(2) + 'x' : '?') + ' — lost ' + App.formatMoney(myData.bet), '#ff5252', 3000);
          GameStats.record('crash', 'lose', myData.bet);
          App.recordLoss();
        }
      }
    } else if (this._game === 'roulette') {
      if (!this._isHost && data.result && data.result.number !== undefined) {
        Roulette._doSpinAnimation(data.result.number, () => { Roulette.finishSpin(data.result.number); });
      }
    }

    if (this._isHost) setTimeout(() => Firebase.deletePrivateRoom(this._roomId), 8000);
    setTimeout(() => {
      this._removeOverlay();
      this._clearState();
    }, 8000);
  },

  // ─── Overlay Rendering ─────────────────────────────────────────

  _getScreen() {
    const map = { horses: 'screen-horses', crash: 'screen-crash', roulette: 'screen-roulette' };
    const id = map[this._game];
    return id ? document.getElementById(id) : null;
  },

  _removeOverlay() {
    const s = this._getScreen();
    if (!s) return;
    const o = s.querySelector('.mp-private-overlay');
    if (o) o.remove();
  },

  _showBettingOverlay(data) {
    const screen = this._getScreen();
    if (!screen) return;
    let overlay = screen.querySelector('.mp-private-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'mp-room-overlay mp-private-overlay';
      screen.insertBefore(overlay, screen.firstChild);
    }
    const timeLeft = Math.max(0, Math.ceil((data.betWindowEnd - Date.now()) / 1000));
    const players = data.players || {};
    const myJoined = !!(players[Firebase.uid] && players[Firebase.uid].bet > 0);
    const chips = Object.values(players).map(p => `<span class="mp-player-chip">${p.name}${p.pick ? ' (' + p.pick + ')' : ''}</span>`).join('');
    let betUI = '';
    if (!myJoined) {
      if (this._game === 'horses') {
        betUI = `<div id="pr-horses-grid" class="mp-horse-picker"></div>
          <div class="mp-bet-row">
            <span class="mp-dollar">$</span>
            <input type="text" inputmode="decimal" id="pr-horses-bet" class="sh-input" placeholder="Bet amount" style="flex:1">
            <button id="pr-bet-btn" class="mp-bet-btn" onclick="PrivateRoom.placeBet()">Place Bet</button>
          </div>`;
      } else if (this._game === 'crash') {
        betUI = `<div style="font-size:12px;color:var(--text-dim);margin-bottom:4px">Use your bet &amp; auto-cashout fields below, then lock in:</div>
          <div class="mp-bet-row"><button id="pr-bet-btn" class="mp-bet-btn" onclick="PrivateRoom.placeBet()">Lock In Bet</button></div>`;
      } else if (this._game === 'roulette') {
        betUI = `<div style="font-size:12px;color:var(--text-dim);margin-bottom:4px">Place your bets on the board below, then lock in:</div>
          <div class="mp-bet-row"><button id="pr-bet-btn" class="mp-bet-btn" onclick="PrivateRoom.placeBet()">Lock In Bets</button></div>`;
      }
    } else {
      const mine = players[Firebase.uid];
      betUI = `<div class="mp-bet-confirmed">✓ ${App.formatMoney(mine.bet)}${mine.pick ? ' on ' + mine.pick : ''} — waiting for start</div>`;
    }
    overlay.innerHTML = `
      <div class="mp-room-header">
        <span class="mp-room-badge mp-private-badge">\u{1F512} PRIVATE</span>
        <span class="mp-room-host">Host: ${data.hostName || 'Host'}</span>
        <span class="mp-room-timer" id="pr-timer">${timeLeft}s</span>
      </div>
      <div class="mp-room-players">${chips || '<span style="color:var(--text-dim);font-size:11px">No players yet</span>'}</div>
      ${betUI}`;
    if (this._game === 'horses' && !myJoined) {
      const grid = document.getElementById('pr-horses-grid');
      if (grid) Horses.renderHorseButtons(grid);
    }
  },

  _showRunningOverlay(data) {
    const screen = this._getScreen();
    if (!screen) return;
    let overlay = screen.querySelector('.mp-private-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'mp-room-overlay mp-private-overlay';
      screen.insertBefore(overlay, screen.firstChild);
    }
    const count = Object.keys((data && data.players) || {}).length;
    overlay.innerHTML = `
      <div class="mp-room-header">
        <span class="mp-room-badge mp-room-live">\u{1F534} LIVE</span>
        <span class="mp-room-host">\u{1F512} Private — ${count} player${count !== 1 ? 's' : ''}</span>
      </div>`;
  },

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
};
