import { quests } from '../data/quests';
import { GameState, QuestObjective } from './types';
import { LogEntry } from './types';

export type LogFn = (text: string, type?: LogEntry['type']) => void;

export interface QuestCallbacks {
  log: LogFn;
}

export function createQuestModule(
  state: GameState,
  callbacks: QuestCallbacks
) {
  const offerQuest = (questId: string) => {
    if (quests[questId] && !state.activeQuests.includes(questId) && !state.completedQuests.includes(questId)) {
      state.activeQuests.push(questId);
      callbacks.log(`\nQUEST OFFERED: ${quests[questId].name}`, 'quest');
      callbacks.log(`  ${quests[questId].description}`);
      callbacks.log('  (Quest auto-accepted)');
    }
  };

  const checkQuestProgress = (questId: string, objType: string, objValue: string) => {
    if (!state.activeQuests.includes(questId)) return;
    const quest = quests[questId];
    if (!quest) return;

    for (const obj of quest.objectives) {
      if (objType === 'item' && obj.item === objValue && state.inventory.includes(objValue)) {
        completeQuestObjective(questId, obj);
      } else if (objType === 'action' && obj.action === objValue) {
        completeQuestObjective(questId, obj);
      }
    }
  };

  const completeQuestObjective = (questId: string, obj: QuestObjective) => {
    const quest = quests[questId];
    if (!state.completedObjectives[questId]) state.completedObjectives[questId] = [];
    const key = JSON.stringify(obj);
    if (!state.completedObjectives[questId].includes(key)) {
      state.completedObjectives[questId].push(key);
    }
    if (state.completedObjectives[questId].length >= quest.objectives.length) {
      completeQuest(questId);
    }
  };

  const completeQuest = (questId: string) => {
    if (state.completedQuests.includes(questId)) return;
    const quest = quests[questId];
    state.activeQuests = state.activeQuests.filter((q: string) => q !== questId);
    state.completedQuests.push(questId);
    const reward = quest.reward;
    if (reward.score) state.score += reward.score;
    if (reward.health) state.health = Math.min(state.maxHealth, state.health + reward.health);
    for (const i of (reward.items || [])) {
      if (!state.inventory.includes(i)) state.inventory.push(i);
    }
    callbacks.log(`\nQUEST COMPLETE: ${quest.name}`, 'quest');
    if (reward.message) callbacks.log(`  ${reward.message}`);
  };

  return {
    offerQuest,
    checkQuestProgress,
    completeQuestObjective,
    completeQuest,
  };
}