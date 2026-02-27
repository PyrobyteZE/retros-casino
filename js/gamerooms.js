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
