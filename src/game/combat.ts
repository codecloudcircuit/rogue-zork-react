import { enemies } from '../data/enemies';
import { items } from '../data/items';
import { GameState, EnemyData } from './types';
import { LogEntry } from './types';

export type LogFn = (text: string, type?: LogEntry['type']) => void;

export interface CombatCallbacks {
  log: LogFn;
  savePreviousState: () => void;
  unlockAchievement: (name: string) => void;
}

const COMBAT_BASE_DAMAGE_MIN = 5;
const COMBAT_BASE_DAMAGE_MAX = 15;
const CRITICAL_HIT_CHANCE = 0.15;
const CRITICAL_MULTIPLIER = 2;
const FLEE_SUCCESS_CHANCE = 0.4;
const FLEE_DAMAGE = 10;
const ENEMY_DAMAGE_VARIANCE = 7;
const BOSS_SCORE = 150;
const REGULAR_SCORE = 50;
const VICTORY_ACHIEVEMENT = 'Victor';
const FALLEN_HERO_ACHIEVEMENT = 'Fallen Hero';

export function createCombatModule(
  state: GameState,
  callbacks: CombatCallbacks,
  getPlayerDefense: () => number,
  getWeaponBonus: () => number
) {
  const startCombat = (enemyId: string) => {
    const enemy = enemies[enemyId];
    if (!enemy) return;

    state.inCombat = true;
    state.currentEnemy = { ...enemy };
    state.enemyHealth = enemy.health;
    callbacks.log(`\nCOMBAT BEGINS!`, 'combat');
    callbacks.log(`${enemy.name}: ${enemy.dialogue_before}`, 'combat');
    callbacks.log(`Enemy HP: ${enemy.health} | Attack: ${enemy.attack} | Defense: ${enemy.defense}`, 'warning');
    if (enemy.boss) callbacks.log('WARNING: This is a BOSS enemy!', 'error');
  };

  const combatAction = (action: 'attack' | 'flee') => {
    if (!state.inCombat || !state.currentEnemy) return;
    const enemy = state.currentEnemy;

    callbacks.savePreviousState();

    if (action === 'attack') {
      const weaponBonus = getWeaponBonus();
      let dmg = Math.floor(Math.random() * (COMBAT_BASE_DAMAGE_MAX - COMBAT_BASE_DAMAGE_MIN + 1)) + COMBAT_BASE_DAMAGE_MIN + weaponBonus;

      if (enemy.weakness?.some((w: string) => state.inventory.includes(w))) {
        dmg = Math.floor(dmg * 1.5);
      }
      if (Math.random() < CRITICAL_HIT_CHANCE) {
        dmg = Math.floor(dmg * CRITICAL_MULTIPLIER);
        callbacks.log('CRITICAL HIT!', 'combat');
      }

      const actualDmg = Math.max(1, dmg - Math.floor(enemy.defense / 3));
      state.enemyHealth -= actualDmg;
      callbacks.log(`You deal ${actualDmg} damage to ${enemy.name}!`, 'combat');

      if (state.enemyHealth <= 0) {
        combatVictory(enemy);
        return;
      }
    } else if (action === 'flee') {
      if (Math.random() < FLEE_SUCCESS_CHANCE) {
        callbacks.log('You successfully flee from combat!', 'success');
        state.inCombat = false;
        state.currentEnemy = null;
        state.enemyHealth = 0;
        state.health = Math.max(0, state.health - FLEE_DAMAGE);
        return;
      } else {
        callbacks.log('You fail to escape!', 'error');
      }
    }

    const playerDef = getPlayerDefense();
    const enemyDmg = Math.max(1, enemy.attack - Math.floor(playerDef / 3) + Math.floor(Math.random() * ENEMY_DAMAGE_VARIANCE) - Math.floor(ENEMY_DAMAGE_VARIANCE / 2));
    state.health -= enemyDmg;
    callbacks.log(`${enemy.name} deals ${enemyDmg} damage to you!`, 'error');

    if (state.health <= 0) {
      state.health = 0;
      state.game_over = true;
      callbacks.log(`You have been defeated by ${enemy.name}!`, 'error');
      callbacks.unlockAchievement(FALLEN_HERO_ACHIEVEMENT);
    }
  };

  const combatVictory = (enemy: EnemyData) => {
    callbacks.log(`VICTORY! You defeated ${enemy.name}!`, 'success');
    state.score += enemy.boss ? BOSS_SCORE : REGULAR_SCORE;
    state.inCombat = false;

    for (const drop of (enemy.drops || [])) {
      if (!state.inventory.includes(drop)) {
        state.inventory.push(drop);
        callbacks.log(`You found: ${drop}!`, 'success');
      }
    }

    if (enemy.boss && enemy.name === 'Dragon') {
      state.dragonDefeated = true;
    }

    state.currentEnemy = null;
    state.enemyHealth = 0;
    callbacks.unlockAchievement(VICTORY_ACHIEVEMENT);
  };

  return {
    startCombat,
    combatAction,
    combatVictory,
  };
}