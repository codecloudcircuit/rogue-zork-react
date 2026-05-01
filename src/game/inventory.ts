import { items } from '../data/items';
import { GameState } from './types';
import { LogEntry } from './types';

export type LogFn = (text: string, type?: LogEntry['type']) => void;

export interface InventoryCallbacks {
  log: LogFn;
  savePreviousState: () => void;
  unlockAchievement: (name: string) => void;
}

export interface InventoryDependencies {
  checkEnding: (type: string) => void;
  checkQuestProgress: (qid: string, t: string, v: string) => void;
}

export function createInventoryModule(
  state: GameState,
  callbacks: InventoryCallbacks,
  deps?: InventoryDependencies
) {
  const takeItem = (itemName: string, locationItems: Record<string, string[]>): boolean => {
    const itemsHere = locationItems[state.location] || [];
    const found = itemsHere.find((i: string) => i.toLowerCase() === itemName.toLowerCase());
    if (!found) {
      callbacks.log(`There is no ${itemName} here.`, 'error');
      return false;
    }

    callbacks.savePreviousState();
    state.locationItems[state.location] = itemsHere.filter((i: string) => i !== found);
    state.inventory.push(found);
    state.score += 10;
    callbacks.log(`You take the ${found}.`, 'success');
    if (state.inventory.length >= 15 && !state.achievements.includes('Collector')) {
      callbacks.unlockAchievement('Collector');
    }
    return true;
  };

  const getPlayerDefense = (): number => {
    let def = 0;
    for (const item of state.inventory) {
      const d = items[item];
      if (d?.type === 'armor') def = Math.max(def, d.defense || 0);
    }
    return def;
  };

  const getWeaponBonus = (): number => {
    let bonus = 0;
    for (const item of state.inventory) {
      const d = items[item];
      if (d?.type === 'weapon') bonus = Math.max(bonus, d.attack || 0);
    }
    return bonus;
  };

  const useItem = (itemName: string, locationItems: Record<string, string[]>): boolean => {
    const item = state.inventory.find((i: string) => i.toLowerCase() === itemName.toLowerCase());
    if (!item) {
      callbacks.log(`You don't have a ${itemName} in your inventory.`, 'error');
      return false;
    }

    const itemData = items[item];

    if (itemData?.consumable && itemData.health) {
      state.health = Math.min(state.maxHealth, state.health + itemData.health);
      state.inventory = state.inventory.filter((i: string) => i !== item);
      callbacks.log(`You use the ${item} and feel better!`, 'success');
      if (itemData.score) state.score += itemData.score;
      return true;
    }

    if (item === 'treasure_chest' && state.inventory.includes('rusty_key')) {
      state.inventory = state.inventory.filter((i: string) => i !== 'treasure_chest' && i !== 'rusty_key');
      state.inventory.push('ultimate_treasure');
      callbacks.log('You open the treasure chest and find the ULTIMATE TREASURE!', 'success');
      state.score += 100;
      deps?.checkEnding('treasure');
      return true;
    }
    if (item === 'rusty_key' && state.location === 'tower' && !state.freedPrincess) {
      state.inventory = state.inventory.filter((i: string) => i !== 'rusty_key');
      state.freedPrincess = true;
      callbacks.log('You unlock the princess chains! She is free!', 'success');
      state.score += 75;
      deps?.checkQuestProgress('free_princess', 'action', 'use_rusty_key_at_tower');
      deps?.checkEnding('hero');
      return true;
    }
    if (item === 'torch' && state.location === 'underground_lake') {
      callbacks.log('The torch reveals a hidden alcove with a mystic shell!', 'success');
      const locItems = locationItems[state.location];
      if (locItems?.includes('mystic_shell')) {
        state.locationItems[state.location] = locItems.filter((i: string) => i !== 'mystic_shell');
        state.inventory.push('mystic_shell');
      }
      return true;
    }
    if (item === 'ancient_map') {
      callbacks.log('The ancient map reveals the location of the ultimate treasure!');
      state.score += 20;
      return true;
    }
    if (item === 'telescope') {
      callbacks.log('Through the telescope, you spot distant lands and secret paths!');
      state.score += 10;
      return true;
    }
    if (item === 'mystic_shell') {
      state.health = Math.min(state.maxHealth, state.health + 20);
      state.score += 30;
      callbacks.log('The mystic shell resonates with ancient power!', 'success');
      return true;
    }
    if (item === 'travel_guide') {
      callbacks.log('The travel guide reveals shortcuts and secret locations!');
      state.score += 15;
      return true;
    }
    if (item === 'spell_book') {
      callbacks.log('You study the spell book and learn protective magic!');
      state.health = Math.min(state.maxHealth, state.health + 10);
      state.score += 15;
      return true;
    }
    if (item === 'old_diary' && state.inventory.includes('magnifying_glass')) {
      callbacks.log('The magnifying glass reveals invisible ink pointing to the secret chamber!', 'success');
      state.score += 35;
      return true;
    }
    if (item === 'sword') {
      callbacks.log('Your sword gleams in the light, ready for battle!');
      return true;
    }
    if (item === 'shield') {
      state.health = Math.min(state.maxHealth, state.health + 5);
      callbacks.log('Your shield provides protection against attacks!');
      return true;
    }
    if (item === 'rope' && state.location === 'underground_lake') {
      callbacks.log('You use the rope to safely explore deeper into the cavern!', 'success');
      state.score += 15;
      return true;
    }
    if (item === 'bread') {
      state.health = Math.min(state.maxHealth, state.health + 10);
      state.inventory = state.inventory.filter((i: string) => i !== item);
      callbacks.log('The bread satisfies your hunger!', 'success');
      return true;
    }

    callbacks.log(`You can't figure out how to use the ${item}.`);
    return false;
  };

  return {
    takeItem,
    useItem,
    getPlayerDefense,
    getWeaponBonus,
  };
}