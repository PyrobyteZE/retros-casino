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
- [x] **Wealth Tax** — 0.5–5%/day progressive on balances $1B+; rebirth discount; god mode immune
- [x] **Admin price control** — gradual stock/crypto price manipulation
- [x] **Black Market** — crime tab with dirty money currency, rotating daily items, temp boosts
- [x] **Auction House** — bid on items/cars/cash; anti-snipe; auto prize delivery

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

## v1.8 - Company Wars & Market Chaos (DONE)
- [x] **Company Scandals** — authority randomly triggers funny scandals on public stocks (18 templates)
  - Drops price 15–30%, broadcasts news to all players
  - Owner can pay to suppress the scandal (cost scales with base price)
  - 5-minute cooldown per stock to prevent spam
- [x] **Competitor & Sabotage system** — set rival companies, pay to sabotage their stocks
  - 65% success: target stocks crash 20–40%
  - 35% fail: your own main stock drops 10–20% and target is notified
  - RIVAL badge shown on competitor cards in Browse tab
- [x] **Remove Stock from Company** — owner can delete individual stocks (with optional shareholder refund)
- [x] **Admin: Purge player** — admin can wipe a player's Firebase data from the leaderboard
- [x] **Mania events** — rare explosive price spikes on system and player stocks
  - System stocks: 1.5–4× spike; LUNA has super moon events for 1000%+ surges
  - Player stocks: spike to 20–90% of hard cap; frequency scales with Bull Propaganda level
  - 120s cooldown per stock after mania to prevent stacking
- [x] **Hard price caps** — system stocks capped at 8× base; player stocks by personality × bull level
  - Plateau near cap for 20+ ticks then gradual decay back to base (never stays permanently high)
- [x] **Industry picker** — companies now declare an industry on founding:
  - ⛽ Energy → nudges JOIL & ROIL
  - 💻 Technology → nudges RETRO
  - 🎮 Entertainment / 🪖 Military → nudges JOY
  - 🦈 Finance → nudges SHARK
  - 🚀 Space → nudges LUNA
  - 🍔 Food, 💊 Pharma, 🕵️ Crime, ✨ Vibes-Based (no linked stock)
  - Nudge ±0.3%/tick max; won't push system stocks above 8× base via industry alone

## v1.9 - Company Properties & World Prices (DONE)
- [x] **40 purchaseable properties** — 4 tiers per industry (progressive costs $80K → $20M)
  - ⛽ Energy: Gas Station, Oil Rig, Fusion Reactor, Dyson Sphere Segment
  - 💻 Tech: Server Rack, Data Center, AI Cluster, Quantum Core
  - 🎮 Entertainment: Arcade Cabinet, Movie Studio, Theme Park, Global Media Empire
  - 🦈 Finance: ATM Network, Hedge Fund, Investment Bank, Central Bank Seat
  - 🚀 Space: Satellite Link, Launch Pad, Orbital Station, Mars Colony
  - 🍔 Food: Food Truck, Restaurant Chain, Megafarm, Global Food Corp
  - 🪖 Military: Arms Depot, Weapons Factory, Defense Contractor HQ, Black Site
  - 💊 Pharma: Lab Bench, Clinical Trial Wing, Biotech Campus, Patent Monopoly
  - 🕵️ Crime: Shell Company, Money Laundromat, Smuggling Ring, Shadow Syndicate
  - ✨ Vibes: Good Energy Crystal, Vibe Consultancy, Manifestation Campus, The Vibes Dimension
- [x] **World price multiplier** — property income scales 0.3×–2.0× based on linked system stocks
  - Energy scales with JOIL & ROIL; Tech with RETRO; Entertainment/Military with JOY
  - Finance with SHARK; Space with LUNA; others fixed at 1.0×
- [x] **Income split slider** — 0–100% personal vs reinvest per company
  - Personal portion credited to owner's balance every 5 seconds
  - Reinvest portion micro-boosts the company's main stock price (stock authority)
- [x] **Properties UI** in company Manage tab — 2-column grid, world price indicator (green/red)

## v2.0 - Company & Market Phase 2 (DONE)
- [x] **Private share offers** — offer shares in your stock directly to a specific player (P2P deal)
  - Set qty and price per share; recipient sees incoming offer panel and can accept/decline
- [x] **Ally system** — mark another company as an ally (mutually exclusive with competitor)
  - Ally badge shown on their card; pay to boost their stock price; they get notified
  - Allies vs Rivals creates a faction-style company war dynamic
- [x] **Sell modal redesign** — all stocks (system + player) now show: 10% / 25% / 50% / custom amount / All
  - Each button shows dollar value; custom input for exact share count
- [x] **Company sell system** — list your company for sale at a set price
  - Listed companies appear in Players tab; buyer pays; seller receives receipt automatically
  - Company ownership transfers fully in Firebase; seller's local record cleaned up
- [x] **Bankruptcy system** — player stocks below $0.10 for 5 consecutive ticks go bankrupt
  - Distressed Assets section appears in Players tab and Market tab
  - Original owner can Bail Out / Reclaim; any player can Acquire the company
  - Auto-expires after 24 hours
- [x] **Admin: Force Bankruptcy** — dark red Bankrupt button per player stock in admin panel
  - Broadcasts `forceBankrupt` command so stock authority + all clients trigger it
- [x] **Count-based trade impact** — concurrent sellers within 20s compound the crash:
  - 1 seller → raw individual impact; 2 → 1–10%; 3 → 5–20% + panic news; 4 → 10–30%; 5+ → 15–40%
  - Applies to both system stocks and player stocks
  - Panic/pump news shows player count ("3 players dumping!")
- [x] **Bull Propaganda redesign** — raises the HARD CAP and mania frequency, not the equilibrium
  - Natural price always reverts toward $100; bull propaganda makes spikes higher and more frequent
  - Standard caps: $1K→$2K→$5K→$15K→$40K→$70K (lv0–5)
  - Extreme caps: $1.5K→$3K→$7.5K→$22K→$60K→$100K
  - Mania now targets 20–90% of the hard cap (not 3× current price)
- [x] **Admin stock reset broadcasts to authority** — `resetAll` command via Firebase so the stock
  authority clears its in-memory targets; prices actually stay at $100 instead of bouncing back
- [x] **Admin set/adjust: gradual incline** — log-scaled steps; setting $1M takes ~5 min to reach
  - Plateau hold and decay speed both scale with how far above cap the stock is
- [x] **Stock price stability** — mean reversion tuned to allow natural movement without locking high:
  - ratio>10→4%/tick, >7→1.8%, >5→0.8%, >3→0.3%, >2→0.1%; very gentle near base
- [x] **LUNA super moon events** — 0.2% chance every 5 min of a 1.5–3.0 magnitude trend (330–1050% surge)
- [x] **Stock plateau at cap** — stocks hold near their hard cap for 20+ ticks then decay gradually
  - Always decays back toward $150 (effectiveBase × 1.5); never stays permanently high
- [x] **Rename Blaze → Goose** — system stock BLAZE/Blaze Foods and horse Blaze both renamed

## v2.1 - Multiplayer Rooms & Platform Fixes (DONE)
- [x] **Multiplayer Roulette** — auto-start room loops; 10s betting window; lock-in bets overlay showing all players; full MP spin with payout sync; solo SPIN disabled during MP round
- [x] **Multiplayer Crash** — same auto-start system as roulette; solo play still works between MP rounds
- [x] **MP Horses** — unchanged; still requires 2+ players to open; 30s betting window
- [x] **Player comments on news posts** — Firebase rules child override allows any authed player to comment; fixed broken comment flow
- [x] **Online players panel** — panel no longer stuck behind stock ticker; removed `overflow:hidden` from top bar that was clipping the dropdown
- [x] **APK v3.0** — loads GitHub Pages URL instead of local assets; auto-updates on every push; added INTERNET permission to manifest
- [x] **Safe area / notch support** — top bar uses `env(safe-area-inset-*)` padding; admin overlay header also safe-area-aware; viewport `viewport-fit=cover`
- [x] **Bottom spacer** — `body` padding-bottom uses `env(safe-area-inset-bottom)` for Android gesture nav
- [x] **Name-based cloud saves** — `cloudSaves/[nameLower]` instead of UID-keyed; eliminates cross-device duplication and lets any device load the same save by account name
- [x] **Save transfer fix** — inventory, companies, houses, coins now transfer correctly on login/recovery; fixed 3 compounding root causes (Firebase rules blocked reads, `pushAccountSave` never called, UID-keyed saves inaccessible cross-device)
- [x] **Recovery code on start screen** — recover account from welcome modal without needing to log in first
- [x] **Stock sync banner fix** — removed false-positive out-of-sync alert that fired for all non-authority clients; banner now only shows after 2+ minutes of no price updates
- [x] **Top bar polish** — chat button moved left of balance; settings button removed from top bar; gap/padding tightened for narrow screens

## v2.2 - Achievements & Weekly Tournaments

### Achievements
- [ ] **Achievement system** — unlockable badges shown on profile and leaderboard
  - Categories: 🎰 Gambler, 🕵️ Criminal, 🏭 Tycoon, 👥 Social, 🌍 Explorer
  - Tiers: Bronze → Silver → Gold → Platinum (each tier raises the bar)
  - Rewards: in-game cash bonus + cosmetic badge displayed on profile card
  - Example achievements:
    - *First Million* — earn $1M total
    - *High Roller* — place a single bet of $1M+
    - *Crash Survivor* — cash out at 10×+ multiplier
    - *To The Moon* — cash out at 50×+
    - *Crime Lord* — complete 50 crimes
    - *Social Butterfly* — have 10 friends
    - *Founder* — found a company
    - *Market Maker* — issue a dividend to 5+ shareholders
    - *Bankrupt & Back* — go bankrupt and reclaim your company
    - *Rebirth I–X* — reach each rebirth milestone
  - Tracked in save; displayed in a new Achievements screen under profile

### Weekly Tournaments
- [ ] **Weekly Tournaments** — resets every Monday at midnight
  - Categories (players pick one to compete in):
    - 💰 Most $ earned in the week
    - 🎰 Most casino game wins
    - 📈 Best single stock return (% gain on a sell)
    - 💥 Highest crash cash-out multiplier
  - Optional entry fee ($100K default) goes to prize pool; admin can seed pool
  - Prizes: 1st gets 60% of pool, 2nd 25%, 3rd 15%
  - Winners get a trophy badge on their profile until next tournament
  - Tracked in Firebase `weeklyTournament/[weekId]/entries/[uid]`; authority client resolves at reset

---

## v2.3 - Black Market & Auction House (DONE)
- [x] **Black Market** — crime tab, dirty money currency (10% of crime income), 5 rotating daily items with temp boosts
- [x] **Auction House** — list items/cars/cash, atomic bidding, anti-snipe extension, auto prize delivery via Firebase

---

## v2.4 - Collectible Cards & Seasonal Events

### NFT-style Collectible Cards (fake, in-game only)
- [x] **Casino Cards** — collectible cards, no real value, fully in-game
  - Rarities: Common (grey), Rare (blue), Epic (purple), Legendary (gold), Mythic (holographic)
  - Each card has: pixel art face, flavor text, unique serial # (e.g. #0042/1000), stat bonus
  - Stat bonuses (passive while card is equipped in a loadout slot):
    - +% crime income, +% casino luck, +% stock dividends, etc.
  - Sources:
    - 🎴 Card Packs — buy with in-game cash; 5 cards per pack, weighted by rarity
    - 🏆 Achievement rewards — specific achievements drop specific cards
    - 🎃 Seasonal drops — exclusive cards available only during that season
    - 🔨 Auction House — trade with other players
  - Card binder UI — flip through owned cards, view serial/rarity/bonus
  - Sets — complete a full set for a bonus card + cash reward
  - Admin can mint new card types with custom pixel art

### Seasonal Events
- [ ] **Seasonal Events** — time-limited world events with exclusive rewards
  - Each season lasts 2–4 weeks with a themed aesthetic overlay
  - 🎃 **Halloween** — Ghost Heist (crime pays 2× but haunted), spooky slot symbols, skeleton pet, pumpkin coin currency
  - 🎄 **Christmas** — Santa gift drops (random balance bonus every hour), gift exchange with friends, winter leaderboard
  - 🎆 **New Year** — Fireworks Jackpot (slots max payout doubled for 24 hr), year-end bonus based on total earned
  - ☀️ **Summer** — Beach Casino (roulette plays as a surf-themed variant), exclusive car: surfboard van
  - Each season drops 3–5 exclusive cards unavailable outside the event
  - Seasonal leaderboard: highest earnings during the event window; exclusive trophy for top 3

---

## v3.0 - Full Multiplayer Casino
- [ ] **Multiplayer Poker** — Texas Hold'em tables, 2–6 players, real-time card reveal
- [ ] **Live Dealer Blackjack** — shared table, each player acts in turn, dealer plays after all
- [ ] **Spectate** — watch any active multiplayer game from a read-only view
- [ ] **Private Game Rooms** — invite-only tables with custom stakes

---

## v3.1 - Crew System

### Crew Basics
- [ ] **Form/Join a Crew** — player creates a crew (name, tag, emblem); others apply/are invited
  - Max 10 members per crew; crew leader can promote officers and kick members
  - Crew tag shown next to name in chat and leaderboard (e.g. `[YOLO] RetroByte`)

### Crew Treasury & HQ
- [ ] **Crew Treasury** — shared pool funded by member deposits; used to buy HQ upgrades
- [ ] **Crew HQ tiers** — 4 tiers, each unlocking more upgrade slots
  - 🏚️ Hideout → 🏠 Compound → 🏰 Fortress → 🛸 Sky Base

### Crew Shared Upgrades
- [ ] **Shared upgrades** — all crew members benefit passively
  - 💰 Crime Ring — +% crime income for all members
  - 📈 Stock Cartel — shared insider tips on 1 stock per day
  - 🛡️ Security Detail — reduces bounty income from hunters, reduces police raid chance
  - 🎰 House Edge Hack — +% casino win rate (small, like 1–3%)
  - 🚀 Crew Rocket Fund — passive treasury growth from shared stock auto-reinvest

### Crew Heists
- [ ] **Crew Heists** — 24-hour cooperative events
  - All members contribute cash/items to a shared "heist plan"
  - Progress bar fills as members contribute; on completion everyone gets a cut
  - Heist types: Bank Vault, Casino Safe, Government Reserve
  - Bigger heist = higher risk: if a member gets raided mid-heist, plan is set back 20%

### Crew Wars
- [ ] **Crew vs Crew** — declare war on another crew
  - 7-day war; objectives: earn more combined crime income, sabotage their companies, complete more heists
  - War score tallied daily; winner at end gets a % of the losing crew's treasury

---

## v3.2 - Corporate Endgame (Company Mergers, IPO Events, Company Wars)

### Company Mergers
- [ ] **Company Mergers** — two players agree to merge their companies into one
  - Merger offer: Player A sends offer to Player B with proposed terms
  - Terms: which company name/ticker survives (or new name), profit split % (e.g. 60/40), share exchange ratio
  - Both owners retain their split % of profits; shown on company page as co-owners
  - Combined company gets all properties from both (duplicates stack income)
  - All stocks from both companies exchanged for shares in merged entity at agreed ratio
  - Shareholders of both companies are notified and converted automatically
  - Advanced: hostile takeover — buy >50% of shares to force merger offer; target can use buyback to defend

### IPO Events
- [ ] **IPO Events** — going public becomes a server-wide event, not a quiet toggle
  - Pre-IPO phase (24 hr): players can register interest; owner sets opening price and share count
  - IPO broadcast: news post auto-generated; stock appears in ticker with "📢 IPO" badge
  - Opening bell: all pre-registered players fill first at opening price; remaining shares go to open market
  - Day-1 FOMO surge: price automatically trends up 20–50% in first hour, then corrects
  - IPO lockup: owner cannot sell shares for 48 hr after IPO (prevents pump and dump)
  - Admin can trigger a "hot IPO" modifier that doubles day-1 surge

### Company Wars (Full Update)
- [ ] **Formal war declaration** — replace current silent sabotage with an opt-in war system
  - Either: mutual agreement (both declare war on each other) OR unilateral attack (costs $500K deposit)
  - War lasts 7 days; tracked on a war leaderboard visible to all
  - War score: points from sabotage hits, property captures, ally boosts, stock manipulation
  - Property capture: targeted sabotage on a specific property; if it hits, you "capture" the income from it for 24 hr
  - Ceasefire: either side can pay to end war early; cost = current war score deficit × $100K
  - Victory: winner takes 10–25% of loser's treasury (negotiated at war start) OR a chosen property
  - Alliance battles: bring allied companies to your side; ally score adds to your war total
