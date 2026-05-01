import { locations } from '../data/locations';
import { items } from '../data/items';
import { characters } from '../data/characters';
import { enemies } from '../data/enemies';
import { quests } from '../data/quests';
import { puzzles } from '../data/puzzles';
import {
  GameState, GameStateSnapshot, LogEntry, EnemyData,
} from './types';
import { createInventoryModule } from './inventory';
import { createCombatModule } from './combat';
import { createQuestModule } from './quests';

const TIME_CYCLE = ['dawn', 'day', 'dusk', 'night'] as const;
const WEATHER_TYPES = ['clear', 'rain', 'storm', 'fog'] as const;

const CHANCE_TIME_CHANGE = 0.1;
const CHANCE_WEATHER_CHANGE = 0.05;
const CRITICAL_HIT_CHANCE = 0.15;
const CRITICAL_MULTIPLIER = 2;
const FLEE_SUCCESS_CHANCE = 0.4;
const FLEE_DAMAGE = 10;
const COMBAT_BASE_DAMAGE_MIN = 5;
const COMBAT_BASE_DAMAGE_MAX = 15;
const ENEMY_DAMAGE_VARIANCE = 7;
const STORM_DAMAGE = 5;
const MAX_LOG_ENTRIES = 500;
const ACHIEVEMENT_SCORE = 25;

export function createInitialState(): GameState {
  const locationItems: Record<string, string[]> = {};
  const locationCharacters: Record<string, string[]> = {};
  for (const [id, data] of Object.entries(locations)) {
    locationItems[id] = [...data.items];
    locationCharacters[id] = [...data.characters];
  }

  return {
    location: 'forest',
    inventory: [],
    health: 100,
    maxHealth: 100,
    score: 0,
    moves: 0,
    maxMoves: 50,
    visitedLocations: new Set(),
    achievements: [],
    timeOfDay: 'day',
    weather: 'clear',
    activeQuests: [],
    completedQuests: [],
    locationItems,
    locationCharacters,
    solvedPuzzles: [],
    freedPrincess: false,
    dragonDefeated: false,
    completedObjectives: {},
    previousState: null,
    inCombat: false,
    currentEnemy: null,
    enemyHealth: 0,
    endingTriggered: null,
    game_over: false,
  };
}

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    visitedLocations: new Set(state.visitedLocations),
    locationItems: JSON.parse(JSON.stringify(state.locationItems)),
    locationCharacters: JSON.parse(JSON.stringify(state.locationCharacters)),
    completedObjectives: JSON.parse(JSON.stringify(state.completedObjectives)),
  };
}

export class GameEngine {
  state: GameState;
  logs: LogEntry[];
  private inventoryModule: ReturnType<typeof createInventoryModule>;
  private combatModule: ReturnType<typeof createCombatModule>;
  private questModule: ReturnType<typeof createQuestModule>;

  constructor() {
    this.state = createInitialState();
    this.logs = [];

    const callbacks = {
      log: (text: string, type?: LogEntry['type']) => this.log(text, type),
      savePreviousState: () => this.savePreviousState(),
      unlockAchievement: (name: string) => this.unlockAchievement(name),
    };

    this.inventoryModule = createInventoryModule(this.state, callbacks, {
      checkEnding: (type: string) => this.checkEnding(type),
      checkQuestProgress: (qid, t, v) => this.questModule.checkQuestProgress(qid, t, v),
    });
    this.combatModule = createCombatModule(
      this.state,
      callbacks,
      () => this.inventoryModule.getPlayerDefense(),
      () => this.inventoryModule.getWeaponBonus()
    );
    this.questModule = createQuestModule(this.state, callbacks);

    this.state.weather = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
    this.changeWeather();
  }

  log(text: string, type: LogEntry['type'] = 'info') {
    this.logs.push({ text, type });
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs = this.logs.slice(-MAX_LOG_ENTRIES);
    }
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  savePreviousState() {
    const s = this.state;
    s.previousState = {
      location: s.location,
      inventory: [...s.inventory],
      health: s.health,
      score: s.score,
      moves: s.moves,
      locationItems: JSON.parse(JSON.stringify(s.locationItems)),
      locationCharacters: JSON.parse(JSON.stringify(s.locationCharacters)),
      timeOfDay: s.timeOfDay,
      weather: s.weather,
      enemyHealth: s.enemyHealth,
      inCombat: s.inCombat,
    };
  }

  undo(): boolean {
    const s = this.state;
    if (!s.previousState) return false;
    const p = s.previousState;
    s.location = p.location;
    s.inventory = p.inventory;
    s.health = p.health;
    s.score = p.score;
    s.moves = p.moves;
    s.locationItems = p.locationItems;
    s.locationCharacters = p.locationCharacters;
    s.timeOfDay = p.timeOfDay;
    s.weather = p.weather;
    s.enemyHealth = p.enemyHealth;
    s.inCombat = p.inCombat;
    s.previousState = null;
    this.log('Undone last action.', 'info');
    return true;
  }

  resolveCommand(cmd: string): string {
    const aliases: Record<string, string> = {
      n: 'north', s: 'south', e: 'east', w: 'west',
      ne: 'northeast', nw: 'northwest', se: 'southeast', sw: 'southwest',
      u: 'up', d: 'down', i: 'inventory', inv: 'inventory',
      h: 'health', q: 'score', m: 'map', tea: 'talk',
    };
    return aliases[cmd] || cmd;
  }

  move(direction: string): boolean {
    direction = this.resolveCommand(direction);
    const locData = locations[this.state.location];
    if (!locData?.exits[direction]) {
      this.log("You can't go that way!", 'error');
      return false;
    }

    const target = locData.exits[direction];
    if (locData.required_items && !this.state.visitedLocations.has(target)) {
      const hasAll = locData.required_items.every((item: string) => this.state.inventory.includes(item));
      if (!hasAll) {
        this.log(`A magical barrier blocks the way. You need: ${locData.required_items.join(', ')}`, 'warning');
        return false;
      }
    }

    this.savePreviousState();
    this.state.location = target;
    this.state.moves++;
    this.state.visitedLocations.add(target);
    this.log(`\nYou move ${direction}...`);

    if (Math.random() < CHANCE_TIME_CHANGE) this.changeTime();
    if (Math.random() < CHANCE_WEATHER_CHANGE) this.changeWeather();

    this.checkConditions();
    this.handleLocationEvents();
    return true;
  }

  takeItem(itemName: string): boolean {
    return this.inventoryModule.takeItem(itemName, this.state.locationItems);
  }

  talkTo(characterId: string): boolean {
    const charsHere = this.state.locationCharacters[this.state.location] || [];
    const found = charsHere.find((c: string) => c.toLowerCase() === characterId.toLowerCase());
    if (!found) {
      this.log(`There is no ${characterId} here.`, 'error');
      return false;
    }

    const charData = characters[found];
    if (!charData) return false;

    this.log(`${charData.name}: "${charData.dialogue}"`, 'info');
    this.handleCharacterAction(found, charData);
    return true;
  }

  handleCharacterAction(charId: string, charData: import('./types').CharacterData) {
    const { action } = charData;

    if (action === 'give_torch' && !this.state.inventory.includes('torch')) {
      this.state.inventory.push('torch');
      this.log('The wizard gives you a torch!', 'success');
    }
    if (action === 'serve_drink') {
      this.state.health = Math.min(this.state.maxHealth, this.state.health + 5);
      this.log('The ale refreshes you slightly!');
    }
    if (action === 'sell_items') {
      if (this.state.inventory.includes('coins') && !this.state.inventory.includes('sword')) {
        this.state.inventory = this.state.inventory.filter((i: string) => i !== 'coins');
        this.state.inventory.push('sword');
        this.log('You buy a sword from the blacksmith!', 'success');
        this.state.score += 10;
      } else if (!this.state.inventory.includes('coins')) {
        this.log("But you don't have enough coins to buy anything!");
      }
    }
    if (action === 'bless') {
      this.state.health = Math.min(this.state.maxHealth, this.state.health + 25);
      this.log('The forest spirit blesses you with healing energy!', 'success');
    }
    if (action === 'offer_potion') {
      if (this.state.inventory.includes('glowing_mushroom')) {
        this.state.inventory = this.state.inventory.filter((i: string) => i !== 'glowing_mushroom');
        this.state.inventory.push('enhanced_potion');
        this.log('The alchemist creates an enhanced potion for you!', 'success');
        this.state.score += 10;
      } else {
        this.log('The alchemist needs rare ingredients to make special potions.');
      }
    }
    if (action === 'demand_tribute') {
      const tribute = enemies['lake_monster']?.tribute_item || 'shiny_pebble';
      if (this.state.inventory.includes(tribute)) {
        this.state.inventory = this.state.inventory.filter((i: string) => i !== tribute);
        const locItems = this.state.locationItems[this.state.location];
        if (locItems?.includes('mystic_shell')) {
          this.state.locationItems[this.state.location] = locItems.filter((i: string) => i !== 'mystic_shell');
          this.state.inventory.push('mystic_shell');
        }
        this.log('The lake monster accepts your offering!', 'success');
        this.state.score += 25;
      } else {
        this.log(`The lake monster demands tribute! Bring a ${tribute} from the waterfall!`);
      }
    }
    if (action === 'provide_hint') {
      this.log('The villager shares useful information about nearby locations.');
      this.state.score += 5;
    }
    if (action === 'offer_help') {
      this.log('The princess whispers a secret passage location to you!');
      this.state.score += 15;
    }
    if (action === 'share_news') {
      this.log('The traveler warns you of dangers ahead but mentions a shortcut.');
      this.state.score += 5;
    }
    if (action === 'announce') {
      this.log("The town crier announces: 'Beware the dragon in the cave! A reward awaits its slayer!'");
      this.state.score += 5;
    }
    if (action === 'warn') {
      if (this.state.inventory.includes('coins')) {
        this.log("The beggar warns: 'Watch out for goblins in the marketplace at night!'");
      } else {
        this.log('The beggar mutters darkly about unseen dangers...');
      }
    }
    if (action === 'teach_magic') {
      this.log('The scholar teaches you protective magic!');
      this.state.health = Math.min(this.state.maxHealth, this.state.health + 10);
      this.state.score += 15;
    }
    if (action === 'reveal_secrets') {
      if (this.state.inventory.includes('magnifying_glass')) {
        this.log('With the magnifying glass, the scholar reveals a hidden passage!', 'success');
        this.state.score += 20;
      } else {
        this.log('The scholar hints at hidden passages but you lack the tools to see them.');
      }
    }
    if (action === 'provide_map') {
      this.log('The archivist shows you records of the area layout.');
      this.state.score += 5;
    }
    if (action === 'haunt') {
      this.log('The ghost child points to an old diary on the shelf...');
      this.state.score += 5;
    }
    if (action === 'heal') {
      this.state.health = Math.min(this.state.maxHealth, this.state.health + 20);
      this.log("The apothecary's herbs heal your wounds!", 'success');
    }
    if (action === 'demand') {
      const bribeItem = enemies['troll']?.bribe_item || 'coins';
      if (this.state.inventory.includes(bribeItem)) {
        this.state.inventory = this.state.inventory.filter((i: string) => i !== bribeItem);
        this.log('The troll accepts your payment and lets you pass!', 'success');
        this.state.score += 20;
      } else {
        this.log('The troll attacks you for not paying the toll!');
        this.state.health -= 30;
      }
    }
    if (action === 'offer_berries') {
      if (Math.random() > 0.5) {
        this.state.health = Math.min(this.state.maxHealth, this.state.health + 15);
        this.log('The berries were nutritious! Your health increases!', 'success');
      } else {
        this.state.health -= 10;
        this.log('The berries were poisonous! You lose health!', 'error');
      }
    }
    if (action === 'grant_wish') {
      this.triggerPuzzle('wishing_fountain');
    }
    if (action === 'provide_quest') {
      this.offerQuest('defeat_dragon');
    }
    if (action === 'check_suspicious') {
      this.log('The guard eyes you suspiciously but lets you pass.');
    }
    if (action === 'bureaucratic') {
      this.log('The clerk returns to their paperwork, ignoring you.');
    }
    if (action === 'test_worthiness') {
      this.triggerPuzzle('riddle_guardian');
    }
    if (action === 'trade') {
      this.log('The merchant offers exotic goods from distant lands.');
    }
    if (action === 'perform') {
      if (Math.random() > 0.5) {
        this.state.score += 10;
        this.log("The performer's tricks reveal a hidden coin! You pick it up.", 'success');
        if (!this.state.inventory.includes('coin')) this.state.inventory.push('coin');
      } else {
        this.log("The performer's tricks distract you. Nothing gained.");
      }
    }
    if (action === 'challenge') {
      this.startCombat('dragon');
    }
    if (action === 'spooky') {
      this.log("The ghost knight's armor clanks ominously.");
    }
    if (action === 'hint') {
      this.log("The fisher hints: 'Some answers are simpler than they appear...'");
    }

    if (charData.quest_giver && charData.quest) {
      const qid = charData.quest;
      if (qid && !this.state.activeQuests.includes(qid) && !this.state.completedQuests.includes(qid)) {
        this.offerQuest(qid);
      }
    }
  }

  offerQuest(questId: string) {
    this.questModule.offerQuest(questId);
  }

  useItem(itemName: string): boolean {
    return this.inventoryModule.useItem(itemName, this.state.locationItems);
  }

  startCombat(enemyId: string) {
    this.combatModule.startCombat(enemyId);
  }

  combatAction(action: 'attack' | 'flee') {
    this.combatModule.combatAction(action);
    if (this.state.inCombat && this.state.currentEnemy?.boss && this.state.currentEnemy.name === 'Dragon' && this.state.dragonDefeated) {
      this.questModule.checkQuestProgress('defeat_dragon', 'action', 'defeat_dragon');
      this.checkEnding('dragon_slayer');
    }
  }

  getPlayerDefense(): number {
    return this.inventoryModule.getPlayerDefense();
  }

  combatVictory(enemy: EnemyData) {
    this.combatModule.combatVictory(enemy);
  }

  triggerPuzzle(puzzleId: string) {
    const puzzle = puzzles[puzzleId];
    if (!puzzle || this.state.solvedPuzzles.includes(puzzleId)) return;

    if (puzzle.riddle && puzzle.answers) {
      this.log(`\nRIDDLE: ${puzzle.riddle}`, 'warning');
      this.log(`(Type your answer below)`, 'info');
      this.log(`__RIDDLE:${puzzleId}`, 'info');
    } else if (puzzle.required_items) {
      const hasAll = puzzle.required_items.every((i: string) => this.state.inventory.includes(i));
      if (hasAll) {
        this.log(puzzle.success_message, 'success');
        if (puzzle.consumes_item) {
          for (const i of puzzle.required_items) {
            this.state.inventory = this.state.inventory.filter((inv: string) => inv !== i);
          }
        }
        if (puzzle.result_item && !this.state.inventory.includes(puzzle.result_item)) {
          this.state.inventory.push(puzzle.result_item);
        }
        if (puzzle.reward?.score) this.state.score += puzzle.reward.score;
        this.state.solvedPuzzles.push(puzzleId);
      } else {
        this.log(`You need: ${puzzle.required_items.join(', ')}`, 'warning');
      }
    } else if (puzzle.outcomes) {
      const outcome = puzzle.outcomes[Math.floor(Math.random() * puzzle.outcomes.length)];
      this.log(outcome.message);
      if (outcome.health) this.state.health = Math.min(this.state.maxHealth, this.state.health + outcome.health);
      if (outcome.score) this.state.score += outcome.score;
      for (const i of (outcome.items || [])) {
        if (!this.state.inventory.includes(i)) this.state.inventory.push(i);
      }
      if (puzzle.consumes_item) {
        for (const i of (puzzle.required_items || [])) {
          this.state.inventory = this.state.inventory.filter((inv: string) => inv !== i);
        }
      }
      this.state.solvedPuzzles.push(puzzleId);
    }
  }

  answerRiddle(puzzleId: string, answer: string) {
    const puzzle = puzzles[puzzleId];
    if (!puzzle || !puzzle.answers) return false;

    if (puzzle.answers.includes(answer.toLowerCase())) {
      this.log(puzzle.success_message, 'success');
      if (puzzle.reward?.score) this.state.score += puzzle.reward.score;
      if (puzzle.reward?.health) this.state.health = Math.min(this.state.maxHealth, this.state.health + puzzle.reward.health);
      for (const i of (puzzle.reward?.items || [])) {
        if (!this.state.inventory.includes(i)) this.state.inventory.push(i);
      }
      this.state.solvedPuzzles.push(puzzleId);
      return true;
    } else {
      this.log(puzzle.failure_message, 'error');
      if (puzzle.penalty?.health) this.state.health = Math.max(0, this.state.health + puzzle.penalty.health);
      return false;
    }
  }

  checkQuestProgress(questId: string, objType: string, objValue: string) {
    this.questModule.checkQuestProgress(questId, objType, objValue);
  }

  completeQuest(questId: string) {
    this.questModule.completeQuest(questId);
  }

  checkEnding(endingType: string) {
    const checks: Record<string, boolean> = {
      treasure: this.state.inventory.includes('ultimate_treasure'),
      dragon_slayer: this.state.dragonDefeated && this.state.location === 'town_square',
      hero: this.state.freedPrincess && this.state.location === 'village',
      artifact_collector: ['crystal_orb', 'ancient_artifact', 'family_heirloom'].every((i: string) => this.state.inventory.includes(i)),
      spirit_ending: this.state.completedQuests.includes('help_ghost_child'),
    };
    if (checks[endingType]) {
      this.state.endingTriggered = endingType;
    }
  }

  showEnding() {
    const endings: Record<string, [string, string]> = {
      treasure: ['Treasure Hunter Ending', 'You found the ultimate treasure and claimed legendary wealth!'],
      dragon_slayer: ['Dragon Slayer Ending', 'You defeated the dragon and returned as a hero! The village celebrates your victory.'],
      hero: ['Hero Ending', 'You freed the captive princess and proved yourself a true hero!'],
      artifact_collector: ['Artifact Collector Ending', 'You collected all three ancient artifacts for the wizard!'],
      spirit_ending: ['Spirit Whisperer Ending', 'You helped the ghost child find peace.'],
    };
    const [title, desc] = endings[this.state.endingTriggered || ''] || ['Unknown Ending', 'You finished the game.'];
    this.log(`\n=== ${title} ===`, 'success');
    this.log(desc);
    this.state.game_over = true;
  }

  handleLocationEvents() {
    const locData = locations[this.state.location];
    if (locData?.special === 'wishing_fountain' && this.state.inventory.includes('wishing_coin')) {
      this.log('You toss the wishing coin into the fountain...', 'warning');
      const outcomes = [
        { msg: 'Your health is fully restored!', fn: () => { this.state.health = this.state.maxHealth; } },
        { msg: 'Your score increases dramatically!', fn: () => { this.state.score += 50; } },
        { msg: 'You receive a magic ring!', fn: () => { if (!this.state.inventory.includes('magic_ring')) this.state.inventory.push('magic_ring'); } },
        { msg: 'Nothing happens. The fountain seems unimpressed.', fn: () => {} },
      ];
      const o = outcomes[Math.floor(Math.random() * outcomes.length)];
      o.fn();
      this.log(o.msg, 'success');
      this.state.inventory = this.state.inventory.filter((i: string) => i !== 'wishing_coin');
    }

    if (this.state.location === 'marketplace') {
      const chars = this.state.locationCharacters[this.state.location];
      if (this.state.timeOfDay === 'day' && !chars.includes('merchant')) chars.push('merchant');
      if (this.state.timeOfDay === 'night' && chars.includes('merchant')) {
        this.state.locationCharacters[this.state.location] = chars.filter((c: string) => c !== 'merchant');
      }
    }

    if (this.state.weather === 'fog' && this.state.location === 'forest' && Math.random() < 0.3) {
      this.log('You get lost in the fog!', 'warning');
    }
  }

  changeTime() {
    const idx = TIME_CYCLE.indexOf(this.state.timeOfDay as typeof TIME_CYCLE[number]);
    this.state.timeOfDay = TIME_CYCLE[(idx + 1) % TIME_CYCLE.length];
    const msgs: Record<string, string> = { night: 'Night falls.', dawn: 'Dawn breaks.', dusk: 'Dusk approaches.', day: 'Daylight returns.' };
    this.log(msgs[this.state.timeOfDay] || '', 'info');
  }

  changeWeather() {
    this.state.weather = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
    const msgs: Record<string, string> = { rain: 'Rain starts to fall.', storm: 'A fierce storm erupts!', fog: 'Thick fog rolls in.', clear: 'The weather clears up.' };
    this.log(msgs[this.state.weather] || '', 'info');
    if (this.state.weather === 'storm') {
      this.state.health -= STORM_DAMAGE;
      this.log(`The storm damages you slightly! (-${STORM_DAMAGE} HP)`, 'error');
    }
  }

  unlockAchievement(name: string) {
    if (!this.state.achievements.includes(name)) {
      this.state.achievements.push(name);
      this.log(`Achievement unlocked: ${name}`, 'achievement');
      this.state.score += ACHIEVEMENT_SCORE;
    }
  }

  checkConditions() {
    if (this.state.health <= 0) {
      this.state.health = 0;
      this.state.game_over = true;
      this.log('You have died! Game over.', 'error');
      this.unlockAchievement('Final Journey');
    } else if (this.state.moves >= this.state.maxMoves) {
      this.state.game_over = true;
      this.log('Time has run out!', 'warning');
      this.unlockAchievement('Explorer');
    }

    if (this.state.visitedLocations.size >= 10 && !this.state.achievements.includes('World Traveler')) {
      this.unlockAchievement('World Traveler');
    }
    if (this.state.score >= 200 && !this.state.achievements.includes('High Scorer')) {
      this.unlockAchievement('High Scorer');
    }

    if (!this.state.inCombat && this.state.endingTriggered && !this.state.game_over) {
      this.showEnding();
    }
  }

  processInput(input: string) {
    const trimmed = input.trim();
    if (!trimmed) return;

    const sanitized = trimmed.replace(/[<>]/g, '');
    if (!sanitized) return;

    if (/^\d+$/.test(sanitized)) {
      return;
    }

    const parts = sanitized.toLowerCase().split(' ');
    const action = this.resolveCommand(parts[0]);

    if (this.state._pendingRiddle) {
      const puzzleId = this.state._pendingRiddle;
      delete this.state._pendingRiddle;
      this.answerRiddle(puzzleId, trimmed);
      return;
    }

    switch (action) {
      case 'n': case 's': case 'e': case 'w': case 'ne': case 'nw': case 'se': case 'sw': case 'u': case 'd':
      case 'north': case 'south': case 'east': case 'west': case 'northeast': case 'northwest': case 'southeast': case 'southwest': case 'up': case 'down':
        this.move(action);
        break;
      case 'go': case 'move': case 'walk':
        if (parts[1]) this.move(parts.slice(1).join(' '));
        break;
      case 'take': case 'get': case 'grab':
        if (parts[1]) this.takeItem(parts.slice(1).join(' '));
        break;
      case 'use':
        if (parts[1]) this.useItem(parts.slice(1).join(' '));
        break;
      case 'talk': case 'speak': case 'interact':
        if (parts[1]) this.talkTo(parts.slice(1).join(' '));
        break;
      case 'attack':
        if (this.state.inCombat) this.combatAction('attack');
        else this.log("You're not in combat.", 'warning');
        break;
      case 'flee':
        if (this.state.inCombat) this.combatAction('flee');
        else this.log("You're not in combat.", 'warning');
        break;
      case 'mix':
        this.triggerPuzzle('item_potion_mix');
        break;
      case 'inventory': case 'i':
        this.log(this.state.inventory.length ? `Inventory: ${this.state.inventory.join(', ')}` : 'Your inventory is empty.');
        break;
      case 'health': case 'h':
        this.log(`Health: ${this.state.health}/${this.state.maxHealth}`);
        break;
      case 'score': case 'q':
        this.log(`Score: ${this.state.score}`);
        break;
      case 'status':
        this.log(`Location: ${locations[this.state.location]?.name || this.state.location}`);
        this.log(`Health: ${this.state.health}/${this.state.maxHealth}`);
        this.log(`Score: ${this.state.score}`);
        this.log(`Moves: ${this.state.moves}/${this.state.maxMoves}`);
        this.log(`Time: ${this.state.timeOfDay} | Weather: ${this.state.weather}`);
        this.log(`Visited: ${this.state.visitedLocations.size} locations`);
        if (this.state.dragonDefeated) this.log('Dragon: Defeated', 'success');
        if (this.state.freedPrincess) this.log('Princess: Freed', 'success');
        break;
      case 'quests':
        if (this.state.activeQuests.length) {
          this.log('Active Quests:', 'quest');
          for (const qid of this.state.activeQuests) {
            const q = quests[qid];
            if (q) this.log(`  ${q.name}: ${q.description}`);
          }
        } else {
          this.log('No active quests.');
        }
        break;
      case 'undo':
        this.undo();
        break;
      case 'save':
        this.saveToStorage();
        this.log('Game saved!', 'success');
        break;
      case 'load':
        this.loadFromStorage();
        break;
      case 'help':
      case '?':
        this.log('\n=== Available Commands ===', 'info');
        this.log('Movement: north/south/east/west (or n/s/e/w), northeast/northwest/southeast/southwest (or ne/nw/se/sw), up/down (or u/d)');
        this.log('Actions: take <item>, use <item>, talk <character>, look, map');
        this.log('Combat: attack, flee');
        this.log('Info: inventory (or i), health (or h), score, status, quests');
        this.log('System: save, load, undo');
        this.log('Special: mix (combine items at alchemist)');
        break;
      default:
        this.log(`I don't understand that. Type 'help' for commands.`, 'warning');
    }

    this.checkConditions();
    if (this.state._pendingRiddle) {
      this.log('(Waiting for your answer...)', 'info');
    }
  }

  getActionMenu(): Array<{ type: string; label: string; action: string; data?: Record<string, unknown> }> {
    const menu: Array<{ type: string; label: string; action: string; data?: Record<string, unknown> }> = [];
    const locData = locations[this.state.location];
    if (!locData) return menu;

    if (this.state.inCombat) {
      menu.push({ type: 'section', label: 'Combat', action: '' });
      menu.push({ type: 'attack', label: 'Attack', action: 'attack' });
      menu.push({ type: 'flee', label: 'Flee', action: 'flee' });
      menu.push({ type: 'info', label: 'Check Health', action: 'health' });
      menu.push({ type: 'info', label: 'Check Inventory', action: 'inventory' });
      menu.push({ type: 'save', label: 'Save Game', action: 'save' });
      return menu;
    }

    const itemsHere = this.state.locationItems[this.state.location] || [];
    const charsHere = this.state.locationCharacters[this.state.location] || [];

    menu.push({ type: 'section', label: 'Move', action: '' });
    const dirShort: Record<string, string> = { north: 'N', south: 'S', east: 'E', west: 'W', northeast: 'NE', northwest: 'NW', southeast: 'SE', southwest: 'SW', up: 'UP', down: 'DN' };
    for (const [dir, target] of Object.entries(locData.exits)) {
      if (dir === 'hidden') continue;
      const locName = locations[target]?.name || target;
      const visited = this.state.visitedLocations.has(target);
      menu.push({ type: 'move', label: `${dirShort[dir] || dir} → ${locName}`, action: dir, data: { target, visited } });
    }

    if (itemsHere.length) {
      menu.push({ type: 'section', label: 'Items', action: '' });
      for (const item of itemsHere) {
        menu.push({ type: 'take', label: `Take ${item}`, action: `take ${item}` });
      }
    }

    if (charsHere.length) {
      menu.push({ type: 'section', label: 'Talk', action: '' });
      if (charsHere.length === 1) {
        const charData = characters[charsHere[0]];
        menu.push({ type: 'talk', label: `Talk to ${charData?.name || charsHere[0]}`, action: `talk ${charsHere[0]}` });
      } else {
        for (const c of charsHere) {
          const charData = characters[c];
          menu.push({ type: 'talk', label: `Talk to ${charData?.name || c}`, action: `talk ${c}` });
        }
      }
    }

    menu.push({ type: 'section', label: 'Commands', action: '' });
    menu.push({ type: 'info', label: 'Look Around', action: 'look' });
    menu.push({ type: 'info', label: 'Inventory', action: 'inventory' });
    menu.push({ type: 'info', label: 'Health', action: 'health' });
    menu.push({ type: 'info', label: 'Quests', action: 'quests' });
    menu.push({ type: 'info', label: 'World Map', action: 'map' });
    menu.push({ type: 'info', label: 'Status', action: 'status' });
    menu.push({ type: 'save', label: 'Save Game', action: 'save' });
    if (this.state.previousState) {
      menu.push({ type: 'info', label: 'Undo', action: 'undo' });
    }

    return menu;
  }

  saveToStorage() {
    try {
      const data = {
        location: this.state.location,
        inventory: this.state.inventory,
        health: this.state.health,
        score: this.state.score,
        moves: this.state.moves,
        visitedLocations: Array.from(this.state.visitedLocations),
        achievements: this.state.achievements,
        timeOfDay: this.state.timeOfDay,
        weather: this.state.weather,
        activeQuests: this.state.activeQuests,
        completedQuests: this.state.completedQuests,
        locationItems: this.state.locationItems,
        locationCharacters: this.state.locationCharacters,
        solvedPuzzles: this.state.solvedPuzzles,
        freedPrincess: this.state.freedPrincess,
        dragonDefeated: this.state.dragonDefeated,
        completedObjectives: this.state.completedObjectives,
      };
      localStorage.setItem('rogueZorkSave', JSON.stringify(data));
    } catch {
    }
  }

  loadFromStorage(): boolean {
    try {
      const raw = localStorage.getItem('rogueZorkSave');
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!this.validateSaveData(data)) {
        return false;
      }
      this.state.location = data.location;
      this.state.inventory = data.inventory;
      this.state.health = data.health;
      this.state.score = data.score;
      this.state.moves = data.moves;
      this.state.visitedLocations = new Set(data.visitedLocations);
      this.state.achievements = data.achievements;
      this.state.timeOfDay = data.timeOfDay;
      this.state.weather = data.weather;
      this.state.activeQuests = data.activeQuests;
      this.state.completedQuests = data.completedQuests;
      this.state.locationItems = data.locationItems;
      this.state.locationCharacters = data.locationCharacters;
      this.state.solvedPuzzles = data.solvedPuzzles;
      this.state.freedPrincess = data.freedPrincess;
      this.state.dragonDefeated = data.dragonDefeated;
      this.state.completedObjectives = data.completedObjectives;
      this.log('Game loaded!', 'success');
      return true;
    } catch {
      return false;
    }
  }

  private validateSaveData(data: unknown): data is {
    location: string;
    inventory: string[];
    health: number;
    score: number;
    moves: number;
    visitedLocations: string[];
    achievements: string[];
    timeOfDay: string;
    weather: string;
    activeQuests: string[];
    completedQuests: string[];
    locationItems: Record<string, string[]>;
    locationCharacters: Record<string, string[]>;
    solvedPuzzles: string[];
    freedPrincess: boolean;
    dragonDefeated: boolean;
    completedObjectives: Record<string, string[]>;
  } {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      typeof d.location === 'string' &&
      Array.isArray(d.inventory) &&
      typeof d.health === 'number' &&
      typeof d.score === 'number' &&
      typeof d.moves === 'number' &&
      Array.isArray(d.visitedLocations)
    );
  }

  getDataRefs() {
    return { characters, quests, items, enemies, puzzles, locations };
  }
}
