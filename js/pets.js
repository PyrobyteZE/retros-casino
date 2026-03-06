const Pets = {
  // 16-color palette
  palette: [
    'transparent',   // 0
    '#222034',       // 1 dark
    '#45283c',       // 2 brown-dark
    '#663931',       // 3 brown
    '#8f563b',       // 4 tan
    '#df7126',       // 5 orange
    '#d9a066',       // 6 peach
    '#eec39a',       // 7 light-peach
    '#fbf236',       // 8 yellow
    '#99e550',       // 9 green
    '#6abe30',       // 10 green-dark
    '#37946e',       // 11 teal
    '#4b692f',       // 12 dark-green
    '#524b24',       // 13 olive
    '#323c39',       // 14 gray-dark
    '#3f3f74',       // 15 purple-dark
    '#306082',       // 16 blue
    '#5b6ee1',       // 17 blue-light
    '#639bff',       // 18 sky
    '#5fcde4',       // 19 cyan
    '#cbdbfc',       // 20 white-blue
    '#ffffff',       // 21 white
    '#9badb7',       // 22 gray
    '#847e87',       // 23 gray-med
    '#696a6a',       // 24 gray-dark2
    '#595652',       // 25 warm-gray
    '#76428a',       // 26 purple
    '#ac3232',       // 27 red
    '#d95763',       // 28 pink
    '#d77bba',       // 29 magenta
    '#8f974a',       // 30 lime
    '#f4b41b',       // 31 gold
  ],

  rarities: [
    { name: 'Common',    color: '#9badb7', glow: 'rgba(155,173,183,0.3)', gachaWeight: 40, dustValue: 100,  levelMult: 1   },
    { name: 'Uncommon',  color: '#99e550', glow: 'rgba(153,229,80,0.3)',  gachaWeight: 25, dustValue: 200,  levelMult: 3   },
    { name: 'Rare',      color: '#639bff', glow: 'rgba(99,155,255,0.3)',  gachaWeight: 18, dustValue: 500,  levelMult: 10  },
    { name: 'Epic',      color: '#ac3232', glow: 'rgba(172,50,50,0.3)',   gachaWeight: 12, dustValue: 1500, levelMult: 30  },
    { name: 'Legendary', color: '#f4b41b', glow: 'rgba(244,180,27,0.3)',  gachaWeight: 5,  dustValue: 5000, levelMult: 100 },
    { name: 'Mythic',    color: '#d77bba', glow: 'rgba(215,123,186,0.4)', gachaWeight: 0,  dustValue: 0,    levelMult: 500 },
  ],

  // Pet definitions: 19 pets
  pets: [
    // Shop pets (0-5)
    { id: 0,  name: 'Chip',           desc: 'Hamster',       rarity: 0, shopCost: 500,     boost: { click: 5 } },
    { id: 1,  name: 'Clover',         desc: 'Frog',          rarity: 0, shopCost: 2000,    boost: { luck: 1 } },
    { id: 2,  name: 'Piggy',          desc: 'Pig',           rarity: 1, shopCost: 15000,   boost: { income: 8 } },
    { id: 3,  name: 'Neon Fox',       desc: 'Fox',           rarity: 1, shopCost: 75000,   boost: { click: 12 } },
    { id: 4,  name: 'Vault Turtle',   desc: 'Turtle',        rarity: 2, shopCost: 500000,  boost: { income: 20 } },
    { id: 5,  name: 'Card Shark',     desc: 'Shark',         rarity: 2, shopCost: 2500000, boost: { luck: 3 } },
    // Gacha pets (6-14)
    { id: 6,  name: 'Dice Mouse',     desc: 'Mouse',         rarity: 0, boost: { click: 4 } },
    { id: 7,  name: 'Coin Bug',       desc: 'Bug',           rarity: 0, boost: { income: 5 } },
    { id: 8,  name: 'Lucky Cat',      desc: 'Cat',           rarity: 1, boost: { luck: 2 } },
    { id: 9,  name: 'Slot Parrot',    desc: 'Parrot',        rarity: 1, boost: { click: 10 } },
    { id: 10, name: 'Roulette Snake', desc: 'Snake',         rarity: 2, boost: { luck: 4 } },
    { id: 11, name: 'Diamond Dog',    desc: 'Dog',           rarity: 2, boost: { income: 18 } },
    { id: 12, name: 'Ghost Dealer',   desc: 'Ghost',         rarity: 3, boost: { luck: 6 } },
    { id: 13, name: 'Gold Dragon',    desc: 'Dragon',        rarity: 3, boost: { income: 30 } },
    { id: 14, name: 'Jackpot Phoenix',desc: 'Phoenix',       rarity: 4, boost: { click: 15, income: 15, luck: 5 } },
    // Craftable mythics (15-18)
    { id: 15, name: 'Casino King',    desc: 'Crown Lion',    rarity: 5, boost: { click: 25, income: 25, luck: 8 },
      recipe: { pets: [[5, 5], [12, 5]], cost: 10000000, consumePets: true } },
    { id: 16, name: 'Midas Scorpion', desc: 'Gold Scorpion', rarity: 5, boost: { income: 80 },
      recipe: { pets: [[7, 5], [13, 5]], cost: 50000000, consumePets: true } },
    { id: 17, name: 'Void Cat',       desc: 'Shadow Cat',    rarity: 5, boost: { luck: 15 },
      recipe: { pets: [[8, 5], [14, 3]], cost: 100000000, consumePets: true } },
    { id: 18, name: 'Retro Bot',      desc: 'Robot',         rarity: 5, boost: { click: 100 },
      recipe: { requireAllShop: true, cost: 25000000, consumePets: false } },
    // Easter egg pets (19-22) - hidden, found via secret actions
    { id: 19, name: 'Blobby',         desc: 'Slime',         rarity: 1, boost: { click: 3, income: 3, luck: 1 }, easterEgg: true, eggHint: 'Click 1000 times' },
    { id: 20, name: 'Voidmaw',        desc: 'Black Hole',    rarity: 4, boost: { income: 40, luck: 3 }, easterEgg: true, eggHint: 'Lose $1M total' },
    { id: 21, name: 'Lil Devil',      desc: 'Devil',         rarity: 3, boost: { click: 20, luck: -2 }, easterEgg: true, eggHint: 'Win 6 coin flips in a row' },
    { id: 22, name: 'Lil Angel',      desc: 'Angel',         rarity: 3, boost: { luck: 8, income: 5 }, easterEgg: true, eggHint: 'Donate $500K to the Loan Shark' },
  ],

  // 8x8 pixel art for each pet (palette indices)
  pixelArt: [
    // 0: Chip (Hamster) - small round body
    [
      [0,0,0,6,6,0,0,0],
      [0,0,6,7,7,6,0,0],
      [0,6,7,1,7,1,6,0],
      [0,6,7,7,7,7,6,0],
      [6,4,6,7,7,6,4,6],
      [0,6,6,6,6,6,6,0],
      [0,0,6,4,4,6,0,0],
      [0,0,4,0,0,4,0,0],
    ],
    // 1: Clover (Frog)
    [
      [0,0,9,9,9,9,0,0],
      [0,9,10,9,9,10,9,0],
      [9,9,21,1,21,1,9,9],
      [9,9,9,9,9,9,9,9],
      [0,9,9,27,9,9,9,0],
      [0,0,9,9,9,9,0,0],
      [0,9,0,9,9,0,9,0],
      [0,9,0,0,0,0,9,0],
    ],
    // 2: Piggy
    [
      [0,0,28,28,28,28,0,0],
      [0,28,29,29,29,29,28,0],
      [28,29,1,29,29,1,29,28],
      [28,29,29,29,29,29,29,28],
      [0,28,28,29,29,28,28,0],
      [0,28,29,1,1,29,28,0],
      [0,0,28,28,28,28,0,0],
      [0,28,0,0,0,0,28,0],
    ],
    // 3: Neon Fox
    [
      [5,0,0,0,0,0,0,5],
      [5,5,0,0,0,0,5,5],
      [0,5,5,5,5,5,5,0],
      [0,5,21,1,21,1,5,0],
      [0,5,5,5,5,5,5,0],
      [0,0,5,7,7,5,0,0],
      [0,5,5,5,5,5,5,0],
      [0,5,0,0,0,0,5,0],
    ],
    // 4: Vault Turtle
    [
      [0,0,11,11,11,11,0,0],
      [0,11,10,10,10,10,11,0],
      [11,10,11,10,10,11,10,11],
      [11,10,10,10,10,10,10,11],
      [0,11,10,10,10,10,11,0],
      [11,0,11,11,11,11,0,11],
      [11,0,0,11,11,0,0,11],
      [0,0,0,11,11,0,0,0],
    ],
    // 5: Card Shark
    [
      [0,0,16,16,16,0,0,0],
      [0,16,16,16,16,16,0,0],
      [16,16,21,1,16,16,16,0],
      [16,16,16,16,16,16,16,16],
      [0,16,16,21,21,16,16,0],
      [0,0,16,16,16,16,0,0],
      [0,0,0,16,16,16,0,0],
      [0,0,0,0,16,0,0,0],
    ],
    // 6: Dice Mouse
    [
      [0,0,22,22,0,0,0,0],
      [0,22,22,22,22,0,0,0],
      [22,22,1,22,1,22,0,0],
      [22,22,22,22,22,22,0,0],
      [22,22,28,22,22,22,22,0],
      [0,22,22,22,22,22,22,22],
      [0,0,22,0,22,0,0,0],
      [0,0,22,0,22,0,0,0],
    ],
    // 7: Coin Bug
    [
      [0,0,0,31,31,0,0,0],
      [0,0,31,31,31,31,0,0],
      [0,31,31,1,1,31,31,0],
      [31,8,31,31,31,31,8,31],
      [0,31,31,31,31,31,31,0],
      [0,0,31,31,31,31,0,0],
      [0,31,0,31,31,0,31,0],
      [0,0,0,0,0,0,0,0],
    ],
    // 8: Lucky Cat
    [
      [0,21,0,0,0,0,21,0],
      [0,21,21,21,21,21,21,0],
      [0,21,9,1,9,1,21,0],
      [0,21,21,21,21,21,21,0],
      [21,21,21,28,21,21,21,21],
      [21,21,21,21,21,21,21,0],
      [0,21,31,21,21,21,0,0],
      [0,0,21,0,0,21,0,0],
    ],
    // 9: Slot Parrot
    [
      [0,0,27,27,0,0,0,0],
      [0,27,27,27,27,0,0,0],
      [0,27,21,1,27,0,0,0],
      [0,27,27,27,27,0,0,0],
      [0,9,8,27,27,9,0,0],
      [9,9,27,27,9,9,9,0],
      [0,0,27,27,0,0,0,0],
      [0,0,27,0,27,0,0,0],
    ],
    // 10: Roulette Snake
    [
      [0,0,10,10,0,0,0,0],
      [0,10,21,1,10,0,0,0],
      [0,10,10,10,10,0,0,0],
      [0,0,10,10,10,10,0,0],
      [0,0,0,10,10,10,10,0],
      [0,0,10,10,0,10,10,0],
      [0,10,10,0,0,0,10,10],
      [10,10,0,0,0,0,0,27],
    ],
    // 11: Diamond Dog
    [
      [0,19,0,0,0,0,19,0],
      [0,19,19,19,19,19,19,0],
      [19,19,18,1,18,1,19,19],
      [19,19,19,19,19,19,19,19],
      [0,19,19,19,19,19,19,0],
      [0,0,19,19,19,19,0,0],
      [0,19,0,19,19,0,19,0],
      [0,19,0,0,0,0,19,0],
    ],
    // 12: Ghost Dealer
    [
      [0,0,20,20,20,20,0,0],
      [0,20,20,20,20,20,20,0],
      [20,20,15,20,20,15,20,20],
      [20,20,20,20,20,20,20,20],
      [20,20,20,20,20,20,20,20],
      [0,20,20,20,20,20,20,0],
      [0,20,0,20,20,0,20,0],
      [0,0,0,20,0,20,0,0],
    ],
    // 13: Gold Dragon
    [
      [0,31,0,0,0,0,31,0],
      [31,5,31,31,31,31,5,31],
      [0,5,21,1,21,1,5,0],
      [0,5,5,5,5,5,5,0],
      [31,0,5,5,5,5,0,31],
      [0,0,5,5,5,5,0,0],
      [0,5,0,5,5,0,5,0],
      [0,5,0,0,0,0,5,0],
    ],
    // 14: Jackpot Phoenix
    [
      [0,27,8,8,8,8,27,0],
      [27,8,31,8,8,31,8,27],
      [0,8,21,1,21,1,8,0],
      [0,8,8,8,8,8,8,0],
      [8,5,8,8,8,8,5,8],
      [0,5,8,8,8,8,5,0],
      [5,0,8,0,0,8,0,5],
      [8,0,8,0,0,8,0,8],
    ],
    // 15: Casino King (Crown Lion)
    [
      [31,0,31,0,31,0,31,0],
      [0,31,31,31,31,31,0,0],
      [0,5,5,5,5,5,5,0],
      [5,5,21,1,21,1,5,5],
      [5,5,5,5,5,5,5,5],
      [5,4,5,5,5,5,4,5],
      [0,5,5,5,5,5,5,0],
      [0,5,0,0,0,0,5,0],
    ],
    // 16: Midas Scorpion
    [
      [0,0,0,0,0,0,31,8],
      [31,0,0,0,0,31,31,0],
      [0,31,31,31,31,31,0,0],
      [0,31,21,1,21,1,0,0],
      [31,31,31,31,31,31,31,0],
      [0,31,0,31,31,0,31,0],
      [31,0,0,0,0,0,0,31],
      [0,0,0,0,0,0,0,0],
    ],
    // 17: Void Cat
    [
      [0,15,0,0,0,0,15,0],
      [0,15,15,15,15,15,15,0],
      [15,15,26,1,26,1,15,15],
      [15,15,15,15,15,15,15,15],
      [0,15,15,26,15,15,15,0],
      [0,15,15,15,15,15,15,0],
      [0,0,15,0,0,15,0,0],
      [0,26,15,0,0,15,26,0],
    ],
    // 18: Retro Bot
    [
      [0,22,22,22,22,22,22,0],
      [22,22,9,22,22,9,22,22],
      [22,22,22,22,22,22,22,22],
      [0,22,22,27,27,22,22,0],
      [0,0,22,22,22,22,0,0],
      [0,22,22,22,22,22,22,0],
      [0,22,0,22,22,0,22,0],
      [0,22,0,0,0,0,22,0],
    ],
    // 19: Blobby (Slime) - green blob
    [
      [0,0,0,9,9,0,0,0],
      [0,0,9,9,9,9,0,0],
      [0,9,9,9,9,9,9,0],
      [0,9,21,1,21,1,9,0],
      [9,9,9,9,9,9,9,9],
      [9,9,9,9,9,9,9,9],
      [9,10,9,9,9,9,10,9],
      [0,9,9,9,9,9,9,0],
    ],
    // 20: Voidmaw (Black Hole) - purple swirl
    [
      [0,0,15,26,26,15,0,0],
      [0,15,26,29,29,26,15,0],
      [15,26,29,1,1,29,26,15],
      [26,29,1,1,1,1,29,26],
      [26,29,1,1,1,1,29,26],
      [15,26,29,29,29,29,26,15],
      [0,15,26,29,29,26,15,0],
      [0,0,15,26,26,15,0,0],
    ],
    // 21: Lil Devil - red with horns and tail
    [
      [27,0,0,0,0,0,0,27],
      [0,27,0,0,0,0,27,0],
      [0,27,27,27,27,27,27,0],
      [0,27,21,1,21,1,27,0],
      [0,27,27,27,27,27,27,0],
      [0,0,27,28,27,27,0,0],
      [0,27,0,27,27,0,27,0],
      [27,0,0,0,0,0,0,0],
    ],
    // 22: Lil Angel - white with halo and wings
    [
      [0,0,31,31,31,31,0,0],
      [0,0,21,21,21,21,0,0],
      [0,21,21,21,21,21,21,0],
      [0,21,18,1,18,1,21,0],
      [20,21,21,21,21,21,21,20],
      [20,0,21,28,21,21,0,20],
      [0,0,21,0,0,21,0,0],
      [0,0,21,0,0,21,0,0],
    ],
  ],

  // State
  owned: [],       // bool[19]
  levels: [],      // number[19] (1-10, 0 = not owned)
  instanceIds: [], // string[19] for future trading
  gacha: { totalRolls: 0, pityEpic: 0, pityLegendary: 0, dust: 0 },
  imageCache: {},  // id -> data URL
  initialized: false,
  activeTab: 'collection',

  init() {
    if (!this.initialized) {
      this.owned = new Array(this.pets.length).fill(false);
      this.levels = new Array(this.pets.length).fill(0);
      this.instanceIds = new Array(this.pets.length).fill('');
      this.initialized = true;
    }
    this.renderPixelArt();
    this.initCustomPets();
    this.render();
  },

  // === Pixel Art Rendering ===
  renderPixelArt() {
    if (Object.keys(this.imageCache).length > 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < this.pixelArt.length; i++) {
      const grid = this.pixelArt[i];
      ctx.clearRect(0, 0, 8, 8);
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const idx = grid[y][x];
          if (idx === 0) continue;
          ctx.fillStyle = this.palette[idx] || '#ff00ff';
          ctx.fillRect(x, y, 1, 1);
        }
      }
      // Scale up to 48x48
      const big = document.createElement('canvas');
      big.width = 48;
      big.height = 48;
      const bctx = big.getContext('2d');
      bctx.imageSmoothingEnabled = false;
      bctx.drawImage(canvas, 0, 0, 48, 48);
      this.imageCache[i] = big.toDataURL();
    }
  },

  getPetImage(id) {
    return this.imageCache[id] || '';
  },

  // === Boosts ===
  getBoostForPet(id) {
    if (!this.owned[id]) return { click: 0, income: 0, luck: 0 };
    const pet = this.pets[id];
    const level = this.levels[id] || 1;
    const scale = 1 + (level - 1) * 0.15;
    return {
      click:  (pet.boost.click  || 0) * scale,
      income: (pet.boost.income || 0) * scale,
      luck:   (pet.boost.luck   || 0) * scale,
    };
  },

  getBoosts() {
    let click = 0, income = 0, luck = 0;
    for (let i = 0; i < this.pets.length; i++) {
      if (!this.owned[i]) continue;
      const b = this.getBoostForPet(i);
      click  += b.click;
      income += b.income;
      luck   += b.luck;
    }
    // Merge custom pet boosts
    const cb = this.getCustomPetBoosts();
    income += (cb.earningsMult || 0) * 100;
    luck   += (cb.luckBoost || 0) * 100;
    return {
      clickMult:  1 + click / 100,
      incomeMult: 1 + income / 100,
      luckAdd:    luck,
      gamblingBonus: cb.gamblingBonus || 0,
      passiveIncome: cb.passiveIncome || 0,
      crimeBonus:    cb.crimeBonus || 0,
      hackingBonus:  cb.hackingBonus || 0,
    };
  },

  // === Shop ===
  buyShopPet(id) {
    const pet = this.pets[id];
    if (!pet || !pet.shopCost) return;
    if (this.owned[id]) return;
    if (App.balance < pet.shopCost) return;
    App.addBalance(-pet.shopCost);
    this.owned[id] = true;
    this.levels[id] = 1;
    this.instanceIds[id] = this.generateId();
    App.save();
    this.render();
  },

  // === Gacha ===
  gachaRoll1() {
    const cost = 50000;
    if (App.balance < cost) return;
    App.addBalance(-cost);
    const results = [this._rollOne()];
    this._processGachaResults(results);
  },

  gachaRoll10() {
    const cost = 450000;
    if (App.balance < cost) return;
    App.addBalance(-cost);
    const results = [];
    let hasUncommonPlus = false;
    for (let i = 0; i < 10; i++) {
      const r = this._rollOne();
      results.push(r);
      if (this.pets[r].rarity >= 1) hasUncommonPlus = true;
    }
    // Guarantee at least 1 Uncommon+ on x10
    if (!hasUncommonPlus) {
      const gachaPets = this.pets.filter(p => !p.shopCost && !p.recipe && !p.easterEgg && p.rarity >= 1);
      const pick = gachaPets[Math.floor(Math.random() * gachaPets.length)];
      results[9] = pick.id;
    }
    this._processGachaResults(results);
  },

  dustRollRare() {
    if (this.gacha.dust < 5000) return;
    this.gacha.dust -= 5000;
    const pool = this.pets.filter(p => !p.shopCost && !p.recipe && !p.easterEgg && p.rarity >= 2);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    this._processGachaResults([pick.id]);
  },

  dustRollEpic() {
    if (this.gacha.dust < 15000) return;
    this.gacha.dust -= 15000;
    const pool = this.pets.filter(p => !p.shopCost && !p.recipe && !p.easterEgg && p.rarity >= 3);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    this._processGachaResults([pick.id]);
  },

  _rollOne() {
    this.gacha.totalRolls++;
    this.gacha.pityEpic++;
    this.gacha.pityLegendary++;

    // Pity system
    if (this.gacha.pityLegendary >= 100) {
      this.gacha.pityLegendary = 0;
      this.gacha.pityEpic = 0;
      return 14; // Jackpot Phoenix
    }
    if (this.gacha.pityEpic >= 50) {
      this.gacha.pityEpic = 0;
      // Random Epic
      const epics = this.pets.filter(p => !p.shopCost && !p.recipe && !p.easterEgg && p.rarity === 3);
      return epics[Math.floor(Math.random() * epics.length)].id;
    }

    // Weighted random from gacha pool
    const pool = this.pets.filter(p => !p.shopCost && !p.recipe && !p.easterEgg);
    let totalWeight = 0;
    const weights = pool.map(p => {
      const w = this.rarities[p.rarity].gachaWeight;
      totalWeight += w;
      return w;
    });
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < pool.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        const pet = pool[i];
        if (pet.rarity >= 3) this.gacha.pityEpic = 0;
        if (pet.rarity >= 4) this.gacha.pityLegendary = 0;
        return pet.id;
      }
    }
    return pool[0].id;
  },

  _processGachaResults(ids) {
    let dustGained = 0;
    const newPets = [];
    const dupes = [];

    ids.forEach(id => {
      if (this.owned[id]) {
        const dv = this.rarities[this.pets[id].rarity].dustValue;
        dustGained += dv;
        dupes.push({ id, dust: dv });
      } else {
        this.owned[id] = true;
        this.levels[id] = 1;
        this.instanceIds[id] = this.generateId();
        newPets.push(id);
      }
    });

    this.gacha.dust += dustGained;
    App.save();

    // Show results
    this._showGachaResults(ids, newPets, dupes, dustGained);
    this.render();
  },

  _showGachaResults(ids, newPets, dupes, dustGained) {
    const overlay = document.getElementById('pet-gacha-result');
    if (!overlay) return;

    let html = '<div class="gacha-results-grid">';
    ids.forEach(id => {
      const pet = this.pets[id];
      const r = this.rarities[pet.rarity];
      const isNew = newPets.includes(id);
      html += `<div class="gacha-result-card" style="border-color:${r.color}">
        <img src="${this.getPetImage(id)}" class="pet-pixel-img" alt="${pet.name}">
        <div class="gacha-result-name" style="color:${r.color}">${pet.name}</div>
        <div class="gacha-result-rarity" style="color:${r.color}">${r.name}</div>
        ${isNew ? '<div class="gacha-new-badge">NEW!</div>' : '<div class="gacha-dust-badge">+' + this.rarities[pet.rarity].dustValue + ' Dust</div>'}
      </div>`;
    });
    html += '</div>';
    if (dustGained > 0) {
      html += `<div class="gacha-dust-total">+${dustGained} Pet Dust</div>`;
    }
    html += '<button class="game-btn" onclick="Pets.closeGachaResult()" style="margin-top:12px">OK</button>';

    overlay.innerHTML = html;
    overlay.classList.remove('hidden');
  },

  closeGachaResult() {
    const el = document.getElementById('pet-gacha-result');
    if (el) el.classList.add('hidden');
  },

  // === Leveling ===
  getLevelCost(id) {
    const pet = this.pets[id];
    if (!this.owned[id]) return Infinity;
    const level = this.levels[id];
    if (level >= 10) return Infinity;
    const rm = this.rarities[pet.rarity].levelMult;
    return 10000 * rm * Math.pow(2, level - 1);
  },

  levelUp(id) {
    if (!this.owned[id]) return;
    if (this.levels[id] >= 10) return;
    const cost = this.getLevelCost(id);
    if (App.balance < cost) return;
    App.addBalance(-cost);
    this.levels[id]++;
    App.save();
    this.render();
  },

  // === Crafting ===
  canCraft(id) {
    const pet = this.pets[id];
    if (!pet || !pet.recipe) return false;
    if (this.owned[id]) return false;
    if (App.balance < pet.recipe.cost) return false;

    if (pet.recipe.requireAllShop) {
      for (let i = 0; i <= 5; i++) {
        if (!this.owned[i]) return false;
      }
      return true;
    }

    if (pet.recipe.pets) {
      for (const [reqId, reqLevel] of pet.recipe.pets) {
        if (!this.owned[reqId]) return false;
        if (this.levels[reqId] < reqLevel) return false;
      }
    }
    return true;
  },

  craft(id) {
    if (!this.canCraft(id)) return;
    const pet = this.pets[id];
    App.addBalance(-pet.recipe.cost);

    if (pet.recipe.consumePets && pet.recipe.pets) {
      for (const [reqId] of pet.recipe.pets) {
        this.owned[reqId] = false;
        this.levels[reqId] = 0;
        this.instanceIds[reqId] = '';
      }
    }

    this.owned[id] = true;
    this.levels[id] = 1;
    this.instanceIds[id] = this.generateId();
    App.save();
    this.render();
  },

  // === Save/Load ===
  getSaveData() {
    return {
      owned: this.owned.slice(),
      levels: this.levels.slice(),
      instanceIds: this.instanceIds.slice(),
      gacha: { ...this.gacha },
      eggStats: { ...this.eggStats },
      customPets: this._customPets,
      equippedCustom: { ...this._equippedCustom },
    };
  },

  loadSaveData(data) {
    if (!data) return;
    if (data.owned) this.owned = data.owned;
    if (data.levels) this.levels = data.levels;
    if (data.instanceIds) this.instanceIds = data.instanceIds;
    if (data.gacha) this.gacha = { ...this.gacha, ...data.gacha };
    if (data.eggStats) this.eggStats = { ...this.eggStats, ...data.eggStats };
    if (data.customPets) this._customPets = data.customPets;
    if (data.equippedCustom) this._equippedCustom = data.equippedCustom;
    while (this.owned.length < this.pets.length) this.owned.push(false);
    while (this.levels.length < this.pets.length) this.levels.push(0);
    while (this.instanceIds.length < this.pets.length) this.instanceIds.push('');
    this.initialized = true;
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },

  // === Easter Egg Tracking ===
  eggStats: { totalLost: 0, cfStreak: 0 },

  // Called from other modules to check triggers
  checkEasterEgg(event, value) {
    switch (event) {
      case 'click_count':
        if (value >= 1000 && !this.owned[19]) this._unlockEgg(19);
        break;
      case 'money_lost':
        this.eggStats.totalLost += value;
        if (this.eggStats.totalLost >= 1000000 && !this.owned[20]) this._unlockEgg(20);
        break;
      case 'cf_win_streak':
        this.eggStats.cfStreak = value;
        if (value >= 6 && !this.owned[21]) this._unlockEgg(21);
        break;
      case 'cf_streak_reset':
        this.eggStats.cfStreak = 0;
        break;
      case 'loan_overpay':
        if (value >= 500000 && !this.owned[22]) this._unlockEgg(22);
        break;
    }
  },

  _unlockEgg(id) {
    if (this.owned[id]) return;
    this.owned[id] = true;
    this.levels[id] = 1;
    this.instanceIds[id] = this.generateId();
    App.save();
    // Show discovery notification
    const pet = this.pets[id];
    const r = this.rarities[pet.rarity];
    const notif = document.createElement('div');
    notif.className = 'pet-egg-notif';
    notif.innerHTML = `<img src="${this.getPetImage(id)}" class="pet-pixel-img"><span style="color:${r.color}">Secret Pet Found: ${pet.name}!</span>`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
  },

  // === UI Rendering ===
  setTab(tab) {
    this.activeTab = tab;
    this.render();
  },

  render() {
    const container = document.getElementById('pet-content');
    if (!container) return;

    // Update tab buttons
    document.querySelectorAll('.pet-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === this.activeTab);
    });

    // Boost banner
    const boosts = this.getBoosts();
    const bannerEl = document.getElementById('pet-boost-banner');
    if (bannerEl) {
      const parts = [];
      if (boosts.clickMult > 1) parts.push('Click ' + ((boosts.clickMult - 1) * 100).toFixed(0) + '%');
      if (boosts.incomeMult > 1) parts.push('Income ' + ((boosts.incomeMult - 1) * 100).toFixed(0) + '%');
      if (boosts.luckAdd > 0) parts.push('Luck +' + boosts.luckAdd.toFixed(1) + '%');
      bannerEl.textContent = parts.length > 0 ? parts.join(' | ') : 'No active boosts';
    }

    if (this.activeTab === 'collection') this._renderCollection(container);
    else if (this.activeTab === 'gacha') this._renderGacha(container);
    else if (this.activeTab === 'forge') this._renderForge(container);
    else if (this.activeTab === 'custom') this._renderCustom(container);
    else if (this.activeTab === 'market') this._renderMarket(container);
  },

  _renderCollection(container) {
    let html = '<div class="pet-grid">';
    this.pets.forEach(pet => {
      const owned = this.owned[pet.id];
      const r = this.rarities[pet.rarity];
      const level = this.levels[pet.id];
      const b = this.getBoostForPet(pet.id);
      const boostStr = this._boostStr(pet.boost, owned ? level : 1);

      // Hide undiscovered easter eggs entirely
      if (pet.easterEgg && !owned) {
        html += `<div class="pet-card pet-locked pet-mystery" style="border-color:var(--bg3)">
          <div class="pet-mystery-icon">?</div>
          <div class="pet-card-name" style="color:var(--text-dim)">???</div>
          <div class="pet-card-rarity" style="color:var(--text-dim)">Secret</div>
          <div class="pet-card-boost pet-card-boost-preview">${pet.eggHint}</div>
        </div>`;
        return;
      }

      html += `<div class="pet-card ${owned ? 'pet-owned' : 'pet-locked'}" style="border-color:${owned ? r.color : 'var(--bg3)'}">
        ${pet.easterEgg && owned ? '<div class="pet-egg-badge">SECRET</div>' : ''}
        <img src="${this.getPetImage(pet.id)}" class="pet-pixel-img ${owned ? '' : 'pet-img-locked'}" alt="${pet.name}">
        <div class="pet-card-name" style="color:${r.color}">${pet.name}</div>
        <div class="pet-card-rarity" style="color:${r.color}">${r.name}</div>`;

      if (owned) {
        html += `<div class="pet-card-level">Lv ${level}/10</div>
          <div class="pet-card-boost">${boostStr}</div>`;
        if (level < 10) {
          const cost = this.getLevelCost(pet.id);
          const afford = App.balance >= cost;
          html += `<button class="pet-lvl-btn ${afford ? 'affordable' : ''}" onclick="Pets.levelUp(${pet.id})">Lv Up: ${App.formatMoney(cost)}</button>`;
        } else {
          html += `<div class="pet-card-maxed">MAX</div>`;
        }
        // List on Market button (non-mythic, non-easter-egg)
        if (typeof Firebase !== 'undefined' && Firebase.isOnline() && pet.rarity < 5 && !pet.easterEgg) {
          html += `<button class="pet-list-btn" onclick="event.stopPropagation();Firebase.promptListPet(${pet.id})">List on Market</button>`;
        }
      } else {
        html += `<div class="pet-card-boost pet-card-boost-preview">${boostStr}</div>`;
        if (pet.shopCost) {
          const afford = App.balance >= pet.shopCost;
          html += `<button class="pet-buy-btn ${afford ? 'affordable' : ''}" onclick="Pets.buyShopPet(${pet.id})">Buy: ${App.formatMoney(pet.shopCost)}</button>`;
        } else if (pet.recipe) {
          html += `<div class="pet-card-source">Craftable</div>`;
        } else {
          html += `<div class="pet-card-source">Gacha</div>`;
        }
      }

      html += '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  },

  _renderGacha(container) {
    const boosts = this.getBoosts();
    let html = `<div class="gacha-panel">
      <div class="gacha-info">
        <div class="gacha-stat"><span class="stat-label">Total Rolls</span><span>${this.gacha.totalRolls}</span></div>
        <div class="gacha-stat"><span class="stat-label">Pet Dust</span><span class="gacha-dust-val">${this.gacha.dust.toLocaleString()}</span></div>
        <div class="gacha-stat"><span class="stat-label">Epic Pity</span><span>${this.gacha.pityEpic}/50</span></div>
        <div class="gacha-stat"><span class="stat-label">Leg. Pity</span><span>${this.gacha.pityLegendary}/100</span></div>
      </div>

      <div class="gacha-actions">
        <button class="game-btn gacha-btn" onclick="Pets.gachaRoll1()" ${App.balance < 50000 ? 'disabled' : ''}>
          Roll x1<br><span class="gacha-cost">${App.formatMoney(50000)}</span>
        </button>
        <button class="game-btn gacha-btn gacha-btn-10" onclick="Pets.gachaRoll10()" ${App.balance < 450000 ? 'disabled' : ''}>
          Roll x10<br><span class="gacha-cost">${App.formatMoney(450000)}</span>
        </button>
      </div>

      <div class="gacha-dust-shop">
        <h3>Dust Shop</h3>
        <div class="gacha-dust-actions">
          <button class="pet-buy-btn ${this.gacha.dust >= 5000 ? 'affordable' : ''}" onclick="Pets.dustRollRare()" ${this.gacha.dust < 5000 ? 'disabled' : ''}>
            Rare+ Roll<br><span class="gacha-cost">5,000 Dust</span>
          </button>
          <button class="pet-buy-btn ${this.gacha.dust >= 15000 ? 'affordable' : ''}" onclick="Pets.dustRollEpic()" ${this.gacha.dust < 15000 ? 'disabled' : ''}>
            Epic+ Roll<br><span class="gacha-cost">15,000 Dust</span>
          </button>
        </div>
      </div>

      <div class="gacha-rates">
        <h3>Drop Rates</h3>
        <div class="gacha-rate-list">`;
    this.rarities.forEach((r, i) => {
      if (r.gachaWeight > 0) {
        html += `<div class="gacha-rate-row"><span style="color:${r.color}">${r.name}</span><span>${r.gachaWeight}%</span></div>`;
      }
    });
    html += `</div>
        <div class="gacha-pity-info">Pity: 50 rolls = Epic guaranteed, 100 = Legendary</div>
      </div>
    </div>`;
    container.innerHTML = html;
  },

  _renderForge(container) {
    const mythics = this.pets.filter(p => p.recipe);
    let html = '<div class="forge-panel">';

    mythics.forEach(pet => {
      const r = this.rarities[pet.rarity];
      const owned = this.owned[pet.id];
      const can = this.canCraft(pet.id);
      const boostStr = this._boostStr(pet.boost, owned ? this.levels[pet.id] : 1);

      html += `<div class="forge-card" style="border-color:${owned ? r.color : 'var(--bg3)'}">
        <img src="${this.getPetImage(pet.id)}" class="pet-pixel-img ${owned ? '' : (can ? '' : 'pet-img-locked')}" alt="${pet.name}">
        <div class="forge-info">
          <div class="pet-card-name" style="color:${r.color}">${pet.name}</div>
          <div class="pet-card-rarity" style="color:${r.color}">${r.name}</div>
          <div class="pet-card-boost">${boostStr}</div>`;

      if (owned) {
        html += `<div class="pet-card-level">Lv ${this.levels[pet.id]}/10</div>`;
        if (this.levels[pet.id] < 10) {
          const cost = this.getLevelCost(pet.id);
          const afford = App.balance >= cost;
          html += `<button class="pet-lvl-btn ${afford ? 'affordable' : ''}" onclick="Pets.levelUp(${pet.id})">Lv Up: ${App.formatMoney(cost)}</button>`;
        } else {
          html += `<div class="pet-card-maxed">MAX</div>`;
        }
      } else {
        html += `<div class="forge-recipe">${this._recipeStr(pet)}</div>
          <button class="pet-buy-btn ${can ? 'affordable' : ''}" onclick="Pets.craft(${pet.id})" ${can ? '' : 'disabled'}>Forge: ${App.formatMoney(pet.recipe.cost)}</button>`;
      }

      html += '</div></div>';
    });

    html += '</div>';
    container.innerHTML = html;
  },

  _renderMarket(container) {
    if (typeof Firebase !== 'undefined') {
      container.innerHTML = Firebase.renderMarketTab();
    } else {
      container.innerHTML = '<div class="lb-offline">Firebase not loaded - pet trading unavailable</div>';
    }
  },

  _boostStr(boost, level) {
    const scale = 1 + ((level || 1) - 1) * 0.15;
    const parts = [];
    if (boost.click)  parts.push('+' + (boost.click * scale).toFixed(0) + '% click');
    if (boost.income) parts.push('+' + (boost.income * scale).toFixed(0) + '% income');
    if (boost.luck)   parts.push('+' + (boost.luck * scale).toFixed(1) + '% luck');
    return parts.join(', ');
  },

  // =============================================
  // === CUSTOM PETS =============================
  // =============================================

  // State
  _customPets: [],          // [{ id, name, pixels, rarity, stats, level, crafterUid, crafterName, createdAt }]
  _equippedCustom: { slot0: null, slot1: null, slot2: null },
  _petListings: {},         // Firebase marketplace { [listingId]: listing }
  _petDraft: null,          // { rarity, stats } — in-progress creation

  CUSTOM_PET_CREATE_COST: 500_000,
  CUSTOM_PET_STAT_POOL: ['luckBoost', 'earningsMult', 'gamblingBonus', 'passiveIncome', 'crimeBonus', 'hackingBonus'],
  CUSTOM_PET_STAT_LABELS: { luckBoost: 'Luck', earningsMult: 'Earnings', gamblingBonus: 'Gambling', passiveIncome: 'Passive/s', crimeBonus: 'Crime', hackingBonus: 'Hacking' },
  CUSTOM_PET_RARITY_COLORS: { common: '#9badb7', uncommon: '#99e550', rare: '#639bff', legendary: '#f4b41b' },

  initCustomPets() {
    if (typeof Firebase !== 'undefined') {
      Firebase.listenPetListings(data => {
        this._petListings = data || {};
        if (this.activeTab === 'custom') this.render();
      });
    }
  },

  getCustomPetBoosts() {
    const out = { luckBoost: 0, earningsMult: 0, gamblingBonus: 0, passiveIncome: 0, crimeBonus: 0, hackingBonus: 0 };
    for (const slotKey of ['slot0', 'slot1', 'slot2']) {
      const petId = this._equippedCustom[slotKey];
      if (!petId) continue;
      const pet = this._customPets.find(p => p.id === petId);
      if (!pet) continue;
      const lvlScale = 1 + ((pet.level || 1) - 1) * 0.2;
      for (const stat of (pet.stats || [])) {
        if (stat.statType in out) out[stat.statType] += stat.value * lvlScale;
      }
    }
    return out;
  },

  _rollCustomPetRarity() {
    const rebirth = typeof App !== 'undefined' ? (App.rebirth || 0) : 0;
    const legBonus = Math.min(rebirth * 0.002, 0.1);
    const rareBonus = Math.min(rebirth * 0.005, 0.12);
    const r = Math.random();
    if (r < 0.07 + legBonus) return 'legendary';
    if (r < 0.25 + rareBonus) return 'rare';
    if (r < 0.55) return 'uncommon';
    return 'common';
  },

  _rollCustomPetStats(rarity) {
    const COUNT = { common: 1, uncommon: 1, rare: 2, legendary: 3 }[rarity] || 1;
    const RANGE = { common: [0.03, 0.08], uncommon: [0.05, 0.12], rare: [0.08, 0.18], legendary: [0.12, 0.28] }[rarity];
    const rebirth = typeof App !== 'undefined' ? (App.rebirth || 0) : 0;
    const rebirthMult = 1 + Math.min(rebirth * 0.03, 2.0);
    const pool = [...this.CUSTOM_PET_STAT_POOL];
    const stats = [];
    for (let i = 0; i < COUNT; i++) {
      if (!pool.length) break;
      const idx = Math.floor(Math.random() * pool.length);
      const statType = pool.splice(idx, 1)[0];
      const [min, max] = RANGE;
      let value = min + Math.random() * (max - min);
      if (statType === 'passiveIncome') {
        value = Math.round(value * 10000 * rebirthMult);
      } else {
        value = Math.round(value * rebirthMult * 100) / 100;
      }
      stats.push({ statType, value, label: this.CUSTOM_PET_STAT_LABELS[statType] || statType });
    }
    return stats;
  },

  startCustomPetCreate() {
    if (!Firebase || !Firebase.isOnline()) { alert('Must be online to create custom pets.'); return; }
    if (App.balance < this.CUSTOM_PET_CREATE_COST) { alert('Need ' + App.formatMoney(this.CUSTOM_PET_CREATE_COST) + ' to create a custom pet.'); return; }
    App.addBalance(-this.CUSTOM_PET_CREATE_COST);
    const rarity = this._rollCustomPetRarity();
    const stats = this._rollCustomPetStats(rarity);
    this._petDraft = { rarity, stats };
    App.save();
    Toast.show('🐾 ' + rarity[0].toUpperCase() + rarity.slice(1) + ' pet slot unlocked! Paint your pet.', this.CUSTOM_PET_RARITY_COLORS[rarity], 4000);
    if (typeof Crafting !== 'undefined') Crafting.openPixelPainterForPet(rarity);
  },

  _showNamePetModal(pixels, customPalette) {
    if (!this._petDraft) return;
    // Store pixels + customPalette in draft so _finalizePet can read them
    this._petDraft.pixels = pixels;
    this._petDraft.customPalette = customPalette || null;
    const { rarity } = this._petDraft;
    const rc = this.CUSTOM_PET_RARITY_COLORS[rarity] || '#aaa';
    const existing = document.getElementById('pet-name-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'pet-name-modal';
    modal.className = 'house-modal-overlay';
    modal.innerHTML = `
      <div class="house-modal-box" style="max-width:300px;text-align:center">
        <div class="house-modal-title" style="color:${rc}">🐾 Name Your ${rarity[0].toUpperCase() + rarity.slice(1)} Pet</div>
        <div style="margin:10px auto;display:inline-block">${typeof Crafting !== 'undefined' ? Crafting.renderPixelArt(pixels, 64, customPalette) : ''}</div>
        <div class="inv-item-stats" style="justify-content:center;margin:8px 0">
          ${this._petDraft.stats.map(s => {
            const sign = s.value >= 0 ? '+' : '';
            const val = s.statType === 'passiveIncome'
              ? sign + App.formatMoney(s.value) + '/s'
              : sign + Math.round(s.value * 100) + '% ' + (s.label || s.statType);
            return `<span class="inv-stat-tag" style="color:${rc}">${val}</span>`;
          }).join('')}
        </div>
        <input id="pet-name-input" type="text" maxlength="20" placeholder="Enter a name..." class="sh-input house-modal-input">
        <div class="house-modal-actions">
          <button class="house-modal-btn" onclick="Pets._finalizePet()">Create</button>
          <button class="house-modal-btn house-modal-cancel" onclick="document.getElementById('pet-name-modal').remove();Pets._petDraft=null">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('pet-name-input')?.focus(), 50);
  },

  _finalizePet() {
    if (!this._petDraft) return;
    const nameEl = document.getElementById('pet-name-input');
    const name = (nameEl ? nameEl.value.trim() : '') || ('Custom ' + this._petDraft.rarity);
    document.getElementById('pet-name-modal')?.remove();
    const pet = {
      id: 'cpet_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      name,
      pixels: this._petDraft.pixels || '0'.repeat(256),
      customPalette: this._petDraft.customPalette || null,
      rarity: this._petDraft.rarity,
      stats: this._petDraft.stats,
      level: 1,
      crafterUid: typeof Firebase !== 'undefined' ? Firebase.uid : 'local',
      crafterName: typeof Settings !== 'undefined' ? Settings.profile.name : 'You',
      createdAt: Date.now(),
    };
    this._customPets.push(pet);
    this._petDraft = null;
    App.save();
    if (this.activeTab === 'custom') this.render();
    Toast.show('🐾 ' + name + ' created!', this.CUSTOM_PET_RARITY_COLORS[pet.rarity] || '#aaa', 3000);
  },

  equipCustomPet(petId, slotKey) {
    if (!this._equippedCustom.hasOwnProperty(slotKey)) return;
    for (const s of ['slot0', 'slot1', 'slot2']) {
      if (this._equippedCustom[s] === petId) this._equippedCustom[s] = null;
    }
    this._equippedCustom[slotKey] = petId;
    App.save();
    this.render();
  },

  unequipCustomSlot(slotKey) {
    this._equippedCustom[slotKey] = null;
    App.save();
    this.render();
  },

  levelUpCustomPet(petId) {
    const pet = this._customPets.find(p => p.id === petId);
    if (!pet) return;
    if ((pet.level || 1) >= 10) return;
    const LEVEL_COSTS = { common: 50_000, uncommon: 150_000, rare: 500_000, legendary: 2_000_000 };
    const cost = (LEVEL_COSTS[pet.rarity] || 50_000) * Math.pow(2, (pet.level || 1) - 1);
    if (App.balance < cost) { Toast.show('Need ' + App.formatMoney(cost), '#f44336', 2000); return; }
    App.addBalance(-cost);
    pet.level = (pet.level || 1) + 1;
    App.save();
    this.render();
    Toast.show('⬆️ ' + pet.name + ' → Lv ' + pet.level, this.CUSTOM_PET_RARITY_COLORS[pet.rarity], 2000);
  },

  listCustomPet(petId) {
    if (!Firebase || !Firebase.isOnline()) { alert('Must be online.'); return; }
    const pet = this._customPets.find(p => p.id === petId);
    if (!pet) return;
    const priceStr = prompt('List ' + pet.name + ' for how much?');
    if (!priceStr) return;
    const price = App.parseAmount(priceStr);
    if (isNaN(price) || price <= 0) { Toast.show('Invalid price', '#f44336', 2000); return; }
    this._customPets = this._customPets.filter(p => p.id !== petId);
    for (const s of ['slot0', 'slot1', 'slot2']) {
      if (this._equippedCustom[s] === petId) this._equippedCustom[s] = null;
    }
    Firebase.listCustomPet(pet, price);
    App.save();
    this.render();
    Toast.show('🐾 ' + pet.name + ' listed for ' + App.formatMoney(price), '#4caf50', 2500);
  },

  async buyCustomPet(listingId) {
    const listing = this._petListings[listingId];
    if (!listing) { Toast.show('Listing gone', '#f44336', 2000); return; }
    const isGod = typeof Admin !== 'undefined' && Admin.godMode;
    if (!isGod && App.balance < listing.price) { Toast.show('Not enough money!', '#f44336', 2000); return; }
    if (!isGod) App.addBalance(-listing.price);
    const pet = { ...listing.pet, id: 'cpet_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4) };
    this._customPets.push(pet);
    if (typeof Firebase !== 'undefined') await Firebase.buyCustomPet(listingId, listing.price, listing.sellerUid);
    App.save();
    this.render();
    Toast.show('🐾 ' + pet.name + ' adopted!', this.CUSTOM_PET_RARITY_COLORS[pet.rarity] || '#aaa', 3000);
  },

  _renderCustom(container) {
    const myUid = typeof Firebase !== 'undefined' ? Firebase.uid : null;
    const rc = this.CUSTOM_PET_RARITY_COLORS;

    // Equip slots
    let html = `<div class="custom-pet-equip-bar">`;
    for (const slotKey of ['slot0', 'slot1', 'slot2']) {
      const equippedId = this._equippedCustom[slotKey];
      const ep = equippedId ? this._customPets.find(p => p.id === equippedId) : null;
      if (ep) {
        html += `<div class="custom-pet-slot custom-pet-slot-filled" style="border-color:${rc[ep.rarity]}">
          ${typeof Crafting !== 'undefined' ? Crafting.renderPixelArt(ep.pixels, 40, ep.customPalette) : ''}
          <span class="cps-name" style="color:${rc[ep.rarity]}">${this._esc(ep.name)}</span>
          <button class="inv-sell-btn" style="font-size:10px" onclick="Pets.unequipCustomSlot('${slotKey}')">✕</button>
        </div>`;
      } else {
        html += `<div class="custom-pet-slot custom-pet-slot-empty"><span style="color:var(--text-dim);font-size:12px">Empty Slot</span></div>`;
      }
    }
    html += `</div>`;

    // Create button
    const canCreate = App.balance >= this.CUSTOM_PET_CREATE_COST;
    html += `<div style="margin:10px 0;text-align:center">
      <button class="pet-buy-btn ${canCreate ? 'affordable' : ''}" onclick="Pets.startCustomPetCreate()" style="width:100%;padding:10px">
        🎨 Create Custom Pet — ${App.formatMoney(this.CUSTOM_PET_CREATE_COST)}
      </button>
      <div style="font-size:11px;color:var(--text-dim);margin-top:4px">Roll rarity → paint pixel art → name it → equip for boosts</div>
    </div>`;

    // Owned custom pets
    if (this._customPets.length > 0) {
      html += `<div style="font-weight:700;font-size:13px;margin:10px 0 6px">🐾 My Custom Pets (${this._customPets.length})</div>
        <div class="inv-item-grid">`;
      for (const pet of this._customPets) {
        const isEquipped = Object.values(this._equippedCustom).includes(pet.id);
        const lvlCostBase = { common: 50_000, uncommon: 150_000, rare: 500_000, legendary: 2_000_000 }[pet.rarity] || 50_000;
        const lvlCost = lvlCostBase * Math.pow(2, (pet.level || 1) - 1);
        html += `<div class="inv-item-card${isEquipped ? ' inv-item-equipped' : ''}" style="border-color:${rc[pet.rarity]}">
          <div class="inv-item-top">
            <div class="inv-item-art">${typeof Crafting !== 'undefined' ? Crafting.renderPixelArt(pet.pixels, 48, pet.customPalette) : ''}</div>
            <div class="inv-item-info">
              <div class="inv-item-name">${this._esc(pet.name)}</div>
              <div class="inv-item-rarity" style="color:${rc[pet.rarity]}">${pet.rarity} pet · Lv ${pet.level || 1}</div>
              <div class="inv-item-crafter">by ${this._esc(pet.crafterName || '?')}</div>
            </div>
          </div>
          <div class="inv-item-stats">
            ${(pet.stats || []).map(s => {
              const val = s.statType === 'passiveIncome'
                ? '+' + App.formatMoney(s.value) + '/s'
                : '+' + Math.round(s.value * 100) + '% ' + (s.label || s.statType);
              return `<span class="inv-stat-tag" style="color:${rc[pet.rarity]}">${val}</span>`;
            }).join('')}
          </div>
          <div class="inv-item-actions">
            ${isEquipped
              ? `<span class="inv-equipped-badge">Equipped</span>`
              : `<select class="inv-equip-select" onchange="Pets.equipCustomPet('${pet.id}',this.value);this.value=''">
                  <option value="">Equip to...</option>
                  <option value="slot0">Slot 1</option>
                  <option value="slot1">Slot 2</option>
                  <option value="slot2">Slot 3</option>
                </select>`}
            ${(pet.level || 1) < 10
              ? `<button class="inv-edit-art-btn" onclick="Pets.levelUpCustomPet('${pet.id}')">⬆️ Lv Up ${App.formatMoney(lvlCost)}</button>`
              : `<span class="pet-card-maxed" style="font-size:10px">MAX</span>`}
            <button class="inv-sell-btn" onclick="Pets.listCustomPet('${pet.id}')">💰 Sell</button>
          </div>
        </div>`;
      }
      html += `</div>`;
    } else {
      html += `<div class="inv-empty" style="padding:16px">No custom pets yet.<br>Create one with the painter above!</div>`;
    }

    // Pet market
    const listings = Object.entries(this._petListings);
    const myListings = listings.filter(([, l]) => l.sellerUid === myUid);
    const otherListings = listings.filter(([, l]) => l.sellerUid !== myUid);

    if (listings.length > 0) {
      html += `<div style="font-weight:700;font-size:13px;margin:14px 0 6px;border-top:1px solid var(--bg3);padding-top:12px">🏪 Pet Market (${listings.length})</div>
        <div class="inv-item-grid">`;
      for (const [lid, listing] of [...myListings, ...otherListings]) {
        const pet = listing.pet;
        if (!pet) continue;
        const isMine = listing.sellerUid === myUid;
        const canAfford = App.balance >= listing.price || (typeof Admin !== 'undefined' && Admin.godMode);
        html += `<div class="inv-item-card" style="border-color:${rc[pet.rarity] || '#aaa'}">
          <div class="inv-item-top">
            <div class="inv-item-art">${typeof Crafting !== 'undefined' ? Crafting.renderPixelArt(pet.pixels, 48, pet.customPalette) : ''}</div>
            <div class="inv-item-info">
              <div class="inv-item-name">${this._esc(pet.name)}</div>
              <div class="inv-item-rarity" style="color:${rc[pet.rarity] || '#aaa'}">${pet.rarity} pet · Lv ${pet.level || 1}</div>
              <div class="inv-item-crafter">by ${this._esc(listing.sellerName || '?')}</div>
            </div>
          </div>
          <div class="inv-item-stats">
            ${(pet.stats || []).map(s => {
              const val = s.statType === 'passiveIncome'
                ? '+' + App.formatMoney(s.value) + '/s'
                : '+' + Math.round(s.value * 100) + '% ' + (s.label || s.statType);
              return `<span class="inv-stat-tag" style="color:${rc[pet.rarity] || '#aaa'}">${val}</span>`;
            }).join('')}
          </div>
          <div class="inv-item-actions">
            ${isMine
              ? `<button class="inv-sell-btn" onclick="Firebase.delistCustomPet('${lid}',this)">Delist</button>`
              : `<button class="house-buy-btn${canAfford ? '' : ' unaffordable'}" onclick="Pets.buyCustomPet('${lid}')">Adopt ${App.formatMoney(listing.price)}</button>`}
          </div>
        </div>`;
      }
      html += `</div>`;
    }

    container.innerHTML = html;
  },

  _esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); },

  // === SAVE / LOAD for custom pets ===
  getCustomPetSaveData() {
    return { customPets: this._customPets, equippedCustom: this._equippedCustom };
  },

  loadCustomPetSaveData(d) {
    if (!d) return;
    this._customPets = d.customPets || [];
    this._equippedCustom = d.equippedCustom || { slot0: null, slot1: null, slot2: null };
  },

  _recipeStr(pet) {
    if (pet.recipe.requireAllShop) {
      const status = [];
      for (let i = 0; i <= 5; i++) {
        const p = this.pets[i];
        const has = this.owned[i];
        status.push(`<span style="color:${has ? 'var(--green)' : 'var(--red)'}">${p.name}${has ? ' \u2713' : ''}</span>`);
      }
      return 'Own all shop pets: ' + status.join(', ');
    }
    if (pet.recipe.pets) {
      return pet.recipe.pets.map(([rid, rlvl]) => {
        const rp = this.pets[rid];
        const has = this.owned[rid] && this.levels[rid] >= rlvl;
        return `<span style="color:${has ? 'var(--green)' : 'var(--red)'}">${rp.name} Lv${rlvl}${has ? ' \u2713' : ''}</span>`;
      }).join(' + ') + (pet.recipe.consumePets ? ' (consumed)' : '');
    }
    return '';
  },
};
