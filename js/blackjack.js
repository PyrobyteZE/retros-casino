const Blackjack = {
  deck: [],
  playerHand: [],
  dealerHand: [],
  gameActive: false,
  currentBet: 0,

  suits: ['\u2660', '\u2665', '\u2666', '\u2663'],
  ranks: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],

  getBet() { return Math.max(0.01, Math.round((Number(document.getElementById('bj-bet').value) || 0) * 100) / 100); },
  halfBet() { document.getElementById('bj-bet').value = Math.max(0.01, Math.round(this.getBet() / 2 * 100) / 100); },
  doubleBet() { document.getElementById('bj-bet').value = this.getBet() * 2; },
  maxBet() { document.getElementById('bj-bet').value = Math.floor(App.balance).toFixed(0); },

  createDeck() {
    this.deck = [];
    for (const suit of this.suits) {
      for (const rank of this.ranks) {
        this.deck.push({ suit, rank });
      }
    }
    // Shuffle
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }

    const g = Rig.games.blackjack;

    // Force blackjack: put A + 10-value on top
    if (g.forceBlackjack) {
      g.forceBlackjack = false;
      const ace = this.deck.findIndex(c => c.rank === 'A');
      const ten = this.deck.findIndex(c => ['10','J','Q','K'].includes(c.rank) && this.deck.indexOf(c) !== ace);
      if (ace >= 0 && ten >= 0) {
        // Swap to top positions (player gets index 0,1)
        [this.deck[0], this.deck[ace]] = [this.deck[ace], this.deck[0]];
        const tenIdx = ten === 0 ? ace : ten; // ace might have moved
        [this.deck[1], this.deck[tenIdx]] = [this.deck[tenIdx], this.deck[1]];
      }
    } else if (Rig.enabled && Rig.shouldWin()) {
      // Stack deck: high cards for player
      const highCards = this.deck.filter(c => ['10','J','Q','K','A'].includes(c.rank));
      const lowCards = this.deck.filter(c => !['10','J','Q','K','A'].includes(c.rank));
      this.deck = [];
      this.deck.push(highCards.pop());
      this.deck.push(highCards.pop());
      this.deck.push(lowCards.pop());
      this.deck.push(lowCards.pop());
      const rest = [...highCards, ...lowCards];
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      this.deck.push(...rest);
    }
  },

  drawCard() {
    if (this.deck.length === 0) this.createDeck();
    return this.deck.pop();
  },

  handValue(hand) {
    let value = 0;
    let aces = 0;
    for (const card of hand) {
      if (card.rank === 'A') { value += 11; aces++; }
      else if (['K', 'Q', 'J'].includes(card.rank)) value += 10;
      else value += parseInt(card.rank);
    }
    while (value > 21 && aces > 0) { value -= 10; aces--; }
    return value;
  },

  deal() {
    const bet = this.getBet();
    if (bet > App.balance && !Admin.godMode) {
      this.showResult('Not enough money!', 'lose');
      return;
    }

    if (!Admin.godMode) App.addBalance(-bet);
    this.currentBet = bet;
    this.gameActive = true;
    this.createDeck();
    this.playerHand = [this.drawCard(), this.drawCard()];
    this.dealerHand = [this.drawCard(), this.drawCard()];

    this.showResult('', '');
    const peekDealer = Rig.games.blackjack.peekDealer;
    this.renderHands(!peekDealer);
    this.updateButtons(true);

    if (this.handValue(this.playerHand) === 21) {
      this.stand();
    }
  },

  hit() {
    if (!this.gameActive) return;

    const g = Rig.games.blackjack;

    // Never bust: if next card would bust, find a safe card
    if (g.neverBust) {
      const currentVal = this.handValue(this.playerHand);
      const safeMax = 21 - currentVal;
      // Find a card in deck that won't bust
      const safeIdx = this.deck.findIndex(c => {
        let v = ['K','Q','J'].includes(c.rank) ? 10 : c.rank === 'A' ? 1 : parseInt(c.rank);
        return v <= safeMax;
      });
      if (safeIdx >= 0 && safeIdx !== this.deck.length - 1) {
        // Swap to top of deck
        const top = this.deck.length - 1;
        [this.deck[safeIdx], this.deck[top]] = [this.deck[top], this.deck[safeIdx]];
      }
    }

    this.playerHand.push(this.drawCard());
    const peekDealer = g.peekDealer;
    this.renderHands(!peekDealer);

    if (this.handValue(this.playerHand) > 21) {
      this.endGame('bust');
    }
  },

  stand() {
    if (!this.gameActive) return;

    const dealerStand = (typeof Loans !== 'undefined' && Loans.useRiggedDeck('blackjack')) ? 18 : 17;
    while (this.handValue(this.dealerHand) < dealerStand) {
      this.dealerHand.push(this.drawCard());
    }
    this.renderHands(false);

    const playerVal = this.handValue(this.playerHand);
    const dealerVal = this.handValue(this.dealerHand);

    if (dealerVal > 21) this.endGame('dealer-bust');
    else if (playerVal > dealerVal) this.endGame('win');
    else if (playerVal < dealerVal) this.endGame('lose');
    else this.endGame('push');
  },

  endGame(result) {
    this.gameActive = false;
    this.renderHands(false);
    this.updateButtons(false);

    switch (result) {
      case 'bust':
        this.showResult('Bust! Lost ' + App.formatMoney(this.currentBet), 'lose');
        GameStats.record('blackjack', 'lose', this.currentBet);
        break;
      case 'dealer-bust':
        App.addBalance(this.currentBet * 2);
        this.showResult('Dealer busts! Won ' + App.formatMoney(this.currentBet * 2), 'win');
        GameStats.record('blackjack', 'win', this.currentBet);
        break;
      case 'win': {
        const isBlackjack = this.playerHand.length === 2 && this.handValue(this.playerHand) === 21;
        const payout = isBlackjack ? Math.floor(this.currentBet * 2.5) : this.currentBet * 2;
        App.addBalance(payout);
        this.showResult((isBlackjack ? 'Blackjack! ' : '') + 'Won ' + App.formatMoney(payout), 'win');
        GameStats.record('blackjack', 'win', payout - this.currentBet);
        break;
      }
      case 'lose':
        this.showResult('Dealer wins. Lost ' + App.formatMoney(this.currentBet), 'lose');
        GameStats.record('blackjack', 'lose', this.currentBet);
        break;
      case 'push':
        App.addBalance(this.currentBet);
        this.showResult('Push \u2014 bet returned', 'push');
        GameStats.record('blackjack', 'push', 0);
        break;
    }
  },

  updateButtons(playing) {
    document.getElementById('bj-deal-btn').classList.toggle('hidden', playing);
    document.getElementById('bj-hit-btn').classList.toggle('hidden', !playing);
    document.getElementById('bj-stand-btn').classList.toggle('hidden', !playing);
    document.getElementById('bj-bet').disabled = playing;
  },

  renderHands(hideDealer) {
    const playerCards = document.getElementById('bj-player-cards');
    const dealerCards = document.getElementById('bj-dealer-cards');

    playerCards.innerHTML = this.playerHand.map(c => this.renderCard(c)).join('');
    dealerCards.innerHTML = this.dealerHand.map((c, i) => {
      if (hideDealer && i === 1) return this.renderCard(null);
      return this.renderCard(c);
    }).join('');

    const playerScore = this.handValue(this.playerHand);
    document.getElementById('bj-player-score').textContent = '(' + playerScore + ')';

    if (hideDealer) {
      const firstVal = this.dealerHand[0].rank === 'A' ? 11 :
        ['K','Q','J'].includes(this.dealerHand[0].rank) ? 10 : parseInt(this.dealerHand[0].rank);
      document.getElementById('bj-dealer-score').textContent = '(' + firstVal + ' + ?)';
    } else {
      document.getElementById('bj-dealer-score').textContent = '(' + this.handValue(this.dealerHand) + ')';
    }
  },

  renderCard(card) {
    if (!card) {
      return '<div class="card card-facedown"><div>?</div></div>';
    }
    const isRed = card.suit === '\u2665' || card.suit === '\u2666';
    return `<div class="card ${isRed ? 'red' : 'black'}">
      <div>${card.rank}</div>
      <div class="card-suit">${card.suit}</div>
    </div>`;
  },

  showResult(text, cls) {
    const el = document.getElementById('bj-result');
    el.textContent = text;
    el.className = 'game-result ' + cls;
  }
};
