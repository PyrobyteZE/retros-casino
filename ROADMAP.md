# Roadmap

## v1.0 - Initial Release (DONE)
- [x] Clicker with upgrades and rebirth
- [x] 8 casino games
- [x] Properties with managers and events
- [x] Crime Empire with police raids
- [x] 3-reel classic slots with auto spin
- [x] Loan shark with card duels
- [x] Admin panel
- [x] PWA + Android APK

## v1.1 - Multiplayer Foundation (DONE)
- [x] Player accounts (username, avatar, persistent ID)
- [x] Online leaderboard (total earned, rebirths, balance tabs)
- [x] Player profiles — view stats, send friend requests, DM
- [x] Global chat with clickable names and rebirth tags
- [x] Online player count (Firebase presence)

## v1.2 - PvP & Social (DONE)
- [x] **PvP Coin Flip** — challenge other players, wager money
- [x] **Friends system** — send/accept friend requests, toast notifications, remove friend
- [x] **Direct Messaging** — private DM threads; unread badge per friend; 👥 panel with friends list + DM thread view
- [x] **Leaderboard redesign** — podium cards, category tabs, online dots
- [x] **Leaderboard dedup** — admin cleanup, client-side deduplication
- [x] **Clickable names** — tap any name in chat or leaderboard to view profile, add friend, or open DM
- [ ] **Rob Players** — target another player's properties/crime businesses
- [ ] **Defend System** — spend money on security upgrades
- [ ] **Hit List** — bounty board

## v1.3 - Economy & Trading (DONE)
- [x] **Stock Market** — fake stocks with price sync across players
- [x] **Crypto Mining** — passive income with GPU rigs
- [x] **Player-Influenced Economy** — large buy/sell orders move prices
- [x] **Stock Insider Knowledge** — VIP 10+ tips with accuracy/cost
- [x] **Wealth Tax** — 0.1% every 60s on balances over $1T
- [x] **Admin price control** — gradual stock/crypto price manipulation
- [ ] **Black Market** — buy/sell rare items
- [ ] **Auction House** — bid on exclusive upgrades

## v1.4 - Progression (DONE)
- [x] **Rebirth system** — VIP levels, multiplier (linear +0.5x, cap 5x)
- [x] **Dynamic upgrade caps** — max level scales with VIP (10 + VIP×10)
- [x] **Pet system** — pets that boost earnings with forge/gacha
- [x] **Pet storage** — store pets across rebirths
- [x] **Name locking** — claim your username, buy from others
- [ ] **Weekly Tournaments** — highest profit in 7 days
- [ ] **Achievements** — unlockable badges and titles
- [ ] **Seasons** — 30-day seasons with ranks

## v1.5 - Loan Shark Overhaul (DONE)
- [x] **Simplified loan menu** — Quick Cash $100, custom amount, Bargain only
- [x] **Shark personality** — dialogue system with scummy/angry/understanding lines
- [x] **Bargain minigame** — higher/lower guessing to reduce interest (-5%/+3% per round)
- [x] **Desperate duel** — at $1T+ debt, better odds (5% shark bias, 90%/75% debt removal)
- [x] **Player-to-Player Loans** — custom amount, custom interest rate
  - Both players must agree (offer/accept system)
  - Lender can forgive debt at any time
  - Loans survive rebirth (stored in Firebase)
  - Payment notifications via toast

## v1.6 - Player Companies (DONE)
- [x] **Found a Company** — pay $1M to register a company with a unique ticker
- [x] **Multiple stocks per company** — up to 3 stocks (pay to unlock more)
- [x] **Public/Private toggle** — go public to list stocks for other players to trade
- [x] **Dividends** — issue per-share payouts to all shareholders (owner pays)
- [x] **Player stocks in Market tab** — public player stocks shown below system stocks with PLAYER badge
- [x] **Player stocks in ticker** — scrolling ticker includes public player stocks
- [x] **Trade influence** — buying/selling player stocks nudges prices like system stocks
- [x] **Multiple companies per player** — unlock up to 3 company slots ($5M / $15M upgrades)
- [x] **Company Upgrades** — per-company purchaseable upgrades:
  - ⚡ Volatile Engine (Lv5) — rolling dice for outsized moves, tilted upward at high levels
  - 📈 Bull Propaganda (Lv5) — small upward drift each tick, compounds over time
  - 🛡️ Market Resilience (Lv3) — soft price floor, cushions crash severity
  - 💰 Dividend Yield (Lv3) — multiplies dividend payouts (up to 2.5x at Lv3)
  - 🔍 Insider Network (Lv3) — see buy/sell pressure on your own stocks before market reacts
- [x] **Bankruptcy system** — stocks crashed below $0.10 for 5 ticks → company declared bankrupt
  - Appears as "Distressed Asset" in Players tab and Market tab
  - Original owner can Bail Out / Reclaim; other players can Acquire
  - Acquiring bankrupt companies bypasses slot limits
  - Auto-expires after 24 hours
- [x] **Sell Company** — list your company for sale; other players can buy it
  - Sale receipt automatically credited to seller via Firebase listener
- [x] **Mean reversion** — all stocks (system + player) gently pull back toward base price
  - High-price crash risk: price > 2.5× base triggers escalating snap-down chance
  - Low-price recovery: price < 0.25× base gets upward bounce
- [x] **Coordinated sell crash** — 2+ players selling heavy in 20s window triggers 25–35% panic crash
  - Broadcasts "PANIC SELL" news event to all players
- [x] **Rebirth compatibility** — player stock holdings reset on rebirth; owned companies + upgrades survive

## v1.7 - Fixes & Polish (DONE)
- [x] **Persistent game stats** — wins/losses tracked and saved across all 8 casino games; feeds leaderboard "Wins" tab correctly
- [x] **Loans: totalDebtPaid persists** — debt paid off stat now survives page reloads; fixes leaderboard "Debt Paid" tab
- [x] **Counter-loan cap raised** — max lend-to-shark increased from $50K → $1B (late-game viable)
- [x] **News Popups toggle** — settings option to enable/disable breaking news alerts
- [x] **Rebirth dialog** — clearly lists what resets (stock holdings) vs what survives (companies + upgrades)
- [x] **Admin panel live prices** — player stock prices update in real-time while market tab is open
- [x] **Admin boom/crash news** — global news event broadcast when admin manipulates player stocks
- [x] **Panic sell news** — coordinated dump on player stocks fires "PANIC SELL" news to all players

## v2.0 - Full Multiplayer
- [ ] Real-time multiplayer poker tables
- [ ] Live dealer blackjack
- [ ] Spectate other players' games
- [ ] Crew system — form crews for group heists
- [ ] Crew headquarters with shared upgrades

## Ideas / Maybe
- [ ] NFT-style collectible cards (fake, in-game only)
- [ ] Mini-games: lockpicking, safe cracking, getaway driver
- [ ] Story mode with missions
- [ ] Seasonal events (Halloween heist, Christmas jackpot)
- [ ] More casino games: Poker, Baccarat, Keno, Wheel of Fortune
- [ ] Sound effects & music
- [ ] Company wars — rival companies can sabotage each other's stock prices
- [ ] Stock options / derivatives trading
- [ ] Company mergers — two players merge companies into one
- [ ] IPO events — company goes public with a splash, players rush to buy in
