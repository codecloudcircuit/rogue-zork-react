import { locations } from '../data/locations';
import { items } from '../data/items';
import { characters } from '../data/characters';
import { enemies } from '../data/enemies';
import { quests } from '../data/quests';
import { puzzles } from '../data/puzzles';
import {
  GameState, GameStateSnapshot, LogEntry, EnemyData,
} from './types';

const TIME_CYCLE = ['dawn', 'day', 'dusk', 'night'] as const;
const WEATHER_TYPES = ['clear', 'rain', 'storm', 'fog'] as const;

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

  constructor() {
    this.state = createInitialState();
    this.logs = [];
    this.state.weather = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
    this.changeWeather();
  }

  log(text: string, type: LogEntry['type'] = 'info') {
    this.logs.push({ text, type });
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

    if (Math.random() < 0.1) this.changeTime();
    if (Math.random() < 0.05) this.changeWeather();

    this.checkConditions();
    this.handleLocationEvents();
    return true;
  }

  takeItem(itemName: string): boolean {
    const itemsHere = this.state.locationItems[this.state.location] || [];
    const found = itemsHere.find((i: string) => i.toLowerCase() === itemName.toLowerCase());
    if (!found) {
      this.log(`There is no ${itemName} here.`, 'error');
      return false;
    }

    this.savePreviousState();
    this.state.locationItems[this.state.location] = itemsHere.filter((i: string) => i !== found);
    this.state.inventory.push(found);
    this.state.score += 10;
    this.log(`You take the ${found}.`, 'success');
    if (this.state.inventory.length >= 15 && !this.state.achievements.includes('Collector')) {
      this.unlockAchievement('Collector');
    }
    return true;
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
    if (quests[questId] && !this.state.activeQuests.includes(questId) && !this.state.completedQuests.includes(questId)) {
      this.state.activeQuests.push(questId);
      this.log(`\nQUEST OFFERED: ${quests[questId].name}`, 'quest');
      this.log(`  ${quests[questId].description}`);
      this.log('  (Quest auto-accepted)');
    }
  }

  useItem(itemName: string): boolean {
    const item = this.state.inventory.find((i: string) => i.toLowerCase() === itemName.toLowerCase());
    if (!item) {
      this.log(`You don't have a ${itemName} in your inventory.`, 'error');
      return false;
    }

    const itemData = items[item];

    if (itemData?.consumable && itemData.health) {
      this.state.health = Math.min(this.state.maxHealth, this.state.health + itemData.health);
      this.state.inventory = this.state.inventory.filter((i: string) => i !== item);
      this.log(`You use the ${item} and feel better!`, 'success');
      if (itemData.score) this.state.score += itemData.score;
      return true;
    }

    if (item === 'treasure_chest' && this.state.inventory.includes('rusty_key')) {
      this.state.inventory = this.state.inventory.filter((i: string) => i !== 'treasure_chest' && i !== 'rusty_key');
      this.state.inventory.push('ultimate_treasure');
      this.log('You open the treasure chest and find the ULTIMATE TREASURE!', 'success');
      this.state.score += 100;
      this.checkEnding('treasure');
      return true;
    }
    if (item === 'rusty_key' && this.state.location === 'tower' && !this.state.freedPrincess) {
      this.state.inventory = this.state.inventory.filter((i: string) => i !== 'rusty_key');
      this.state.freedPrincess = true;
      this.log('You unlock the princess chains! She is free!', 'success');
      this.state.score += 75;
      this.checkQuestProgress('free_princess', 'action', 'use_rusty_key_at_tower');
      this.checkEnding('hero');
      return true;
    }
    if (item === 'torch' && this.state.location === 'underground_lake') {
      this.log('The torch reveals a hidden alcove with a mystic shell!', 'success');
      const locItems = this.state.locationItems[this.state.location];
      if (locItems?.includes('mystic_shell')) {
        this.state.locationItems[this.state.location] = locItems.filter((i: string) => i !== 'mystic_shell');
        this.state.inventory.push('mystic_shell');
      }
      return true;
    }
    if (item === 'ancient_map') {
      this.log('The ancient map reveals the location of the ultimate treasure!');
      this.state.score += 20;
      return true;
    }
    if (item === 'telescope') {
      this.log('Through the telescope, you spot distant lands and secret paths!');
      this.state.score += 10;
      return true;
    }
    if (item === 'mystic_shell') {
      this.state.health = Math.min(this.state.maxHealth, this.state.health + 20);
      this.state.score += 30;
      this.log('The mystic shell resonates with ancient power!', 'success');
      return true;
    }
    if (item === 'travel_guide') {
      this.log('The travel guide reveals shortcuts and secret locations!');
      this.state.score += 15;
      return true;
    }
    if (item === 'spell_book') {
      this.log('You study the spell book and learn protective magic!');
      this.state.health = Math.min(this.state.maxHealth, this.state.health + 10);
      this.state.score += 15;
      return true;
    }
    if (item === 'old_diary' && this.state.inventory.includes('magnifying_glass')) {
      this.log('The magnifying glass reveals invisible ink pointing to the secret chamber!', 'success');
      this.state.score += 35;
      return true;
    }
    if (item === 'sword') {
      this.log('Your sword gleams in the light, ready for battle!');
      return true;
    }
    if (item === 'shield') {
      this.state.health = Math.min(this.state.maxHealth, this.state.health + 5);
      this.log('Your shield provides protection against attacks!');
      return true;
    }
    if (item === 'rope' && this.state.location === 'underground_lake') {
      this.log('You use the rope to safely explore deeper into the cavern!', 'success');
      this.state.score += 15;
      return true;
    }
    if (item === 'bread') {
      this.state.health = Math.min(this.state.maxHealth, this.state.health + 10);
      this.state.inventory = this.state.inventory.filter((i: string) => i !== item);
      this.log('The bread satisfies your hunger!', 'success');
      return true;
    }

    this.log(`You can't figure out how to use the ${item}.`);
    return false;
  }

  startCombat(enemyId: string) {
    const enemy = enemies[enemyId];
    if (!enemy) return;

    this.state.inCombat = true;
    this.state.currentEnemy = { ...enemy };
    this.state.enemyHealth = enemy.health;
    this.log(`\nCOMBAT BEGINS!`, 'combat');
    this.log(`${enemy.name}: ${enemy.dialogue_before}`, 'combat');
    this.log(`Enemy HP: ${enemy.health} | Attack: ${enemy.attack} | Defense: ${enemy.defense}`, 'warning');
    if (enemy.boss) this.log('WARNING: This is a BOSS enemy!', 'error');
  }

  combatAction(action: 'attack' | 'flee') {
    if (!this.state.inCombat || !this.state.currentEnemy) return;
    const enemy = this.state.currentEnemy;

    this.savePreviousState();

    if (action === 'attack') {
      let weaponBonus = 0;
      for (const item of this.state.inventory) {
        const d = items[item];
        if (d?.type === 'weapon') weaponBonus = Math.max(weaponBonus, d.attack || 0);
      }

      let dmg = Math.floor(Math.random() * 11) + 5 + weaponBonus;
      if (enemy.weakness?.some((w: string) => this.state.inventory.includes(w))) {
        dmg = Math.floor(dmg * 1.5);
      }
      if (Math.random() < 0.15) {
        dmg = Math.floor(dmg * 2);
        this.log('CRITICAL HIT!', 'combat');
      }

      const actualDmg = Math.max(1, dmg - Math.floor(enemy.defense / 3));
      this.state.enemyHealth -= actualDmg;
      this.log(`You deal ${actualDmg} damage to ${enemy.name}!`, 'combat');

      if (this.state.enemyHealth <= 0) {
        this.combatVictory(enemy);
        return;
      }
    } else if (action === 'flee') {
      if (Math.random() < 0.4) {
        this.log('You successfully flee from combat!', 'success');
        this.state.inCombat = false;
        this.state.currentEnemy = null;
        this.state.enemyHealth = 0;
        this.state.health = Math.max(0, this.state.health - 10);
        return;
      } else {
        this.log('You fail to escape!', 'error');
      }
    }

    const playerDef = this.getPlayerDefense();
    const enemyDmg = Math.max(1, enemy.attack - Math.floor(playerDef / 3) + Math.floor(Math.random() * 7) - 3);
    this.state.health -= enemyDmg;
    this.log(`${enemy.name} deals ${enemyDmg} damage to you!`, 'error');

    if (this.state.health <= 0) {
      this.state.health = 0;
      this.state.game_over = true;
      this.log(`You have been defeated by ${enemy.name}!`, 'error');
      this.unlockAchievement('Fallen Hero');
    }
  }

  getPlayerDefense(): number {
    let def = 0;
    for (const item of this.state.inventory) {
      const d = items[item];
      if (d?.type === 'armor') def = Math.max(def, d.defense || 0);
    }
    return def;
  }

  combatVictory(enemy: EnemyData) {
    this.log(`VICTORY! You defeated ${enemy.name}!`, 'success');
    this.state.score += enemy.boss ? 150 : 50;
    this.state.inCombat = false;

    for (const drop of (enemy.drops || [])) {
      if (!this.state.inventory.includes(drop)) {
        this.state.inventory.push(drop);
        this.log(`You found: ${drop}!`, 'success');
      }
    }

    if (enemy.boss && enemy.name === 'Dragon') {
      this.state.dragonDefeated = true;
      this.checkQuestProgress('defeat_dragon', 'action', 'defeat_dragon');
      this.checkEnding('dragon_slayer');
    }

    this.state.currentEnemy = null;
    this.state.enemyHealth = 0;
    this.unlockAchievement('Victor');
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
    if (!this.state.activeQuests.includes(questId)) return;
    const quest = quests[questId];
    if (!quest) return;

    for (const obj of quest.objectives) {
      if (objType === 'item' && obj.item === objValue && this.state.inventory.includes(objValue)) {
        this.completeQuestObjective(questId, obj);
      } else if (objType === 'action' && obj.action === objValue) {
        this.completeQuestObjective(questId, obj);
      }
    }
  }

  completeQuestObjective(questId: string, obj: import('./types').QuestObjective) {
    const quest = quests[questId];
    if (!this.state.completedObjectives[questId]) this.state.completedObjectives[questId] = [];
    const key = JSON.stringify(obj);
    if (!this.state.completedObjectives[questId].includes(key)) {
      this.state.completedObjectives[questId].push(key);
    }
    if (this.state.completedObjectives[questId].length >= quest.objectives.length) {
      this.completeQuest(questId);
    }
  }

  completeQuest(questId: string) {
    if (this.state.completedQuests.includes(questId)) return;
    const quest = quests[questId];
    this.state.activeQuests = this.state.activeQuests.filter((q: string) => q !== questId);
    this.state.completedQuests.push(questId);
    const reward = quest.reward;
    if (reward.score) this.state.score += reward.score;
    if (reward.health) this.state.health = Math.min(this.state.maxHealth, this.state.health + reward.health);
    for (const i of (reward.items || [])) {
      if (!this.state.inventory.includes(i)) this.state.inventory.push(i);
    }
    this.log(`\nQUEST COMPLETE: ${quest.name}`, 'quest');
    if (reward.message) this.log(`  ${reward.message}`);
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
      this.state.health -= 5;
      this.log('The storm damages you slightly! (-5 HP)', 'error');
    }
  }

  unlockAchievement(name: string) {
    if (!this.state.achievements.includes(name)) {
      this.state.achievements.push(name);
      this.log(`Achievement unlocked: ${name}`, 'achievement');
      this.state.score += 25;
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

    if (/^\d+$/.test(trimmed)) {
      return;
    }

    const parts = trimmed.toLowerCase().split(' ');
    const action = this.resolveCommand(parts[0]);

    if (this.state._pendingRiddle) {
      const puzzleId = this.state._pendingRiddle;
      delete this.state._pendingRiddle;
      this.answerRiddle(puzzleId, trimmed);
      return;
    }

    switch (action) {
      case 'n': case 's': case 'e': case 'w': case 'ne': case 'nw': case 'se': case 'sw': case 'u': case 'd':
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
}
