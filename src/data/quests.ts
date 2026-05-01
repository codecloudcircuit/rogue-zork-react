export const quests: Record<string, import('../game/types').QuestData> = {
  "find_artifacts": {
    "name": "The Wizard's Collection",
    "description": "The old wizard seeks three ancient artifacts: the crystal_orb, ancient_artifact, and family_heirloom.",
    "giver": "old_wizard",
    "objectives": [
      {"item": "crystal_orb", "description": "Find the crystal orb in the secret chamber"},
      {"item": "ancient_artifact", "description": "Retrieve the ancient artifact"},
      {"item": "family_heirloom", "description": "Find the family heirloom in the attic"}
    ],
    "reward": {"score": 100, "items": ["ghost_sword"], "message": "The wizard rewards you with a ghostly blade!"},
    "ending_path": "wizard_ending"
  },
  "find_lost_pet": {
    "name": "The Lost Pet",
    "description": "A villager's pet has gone missing. Find the lost_pet note and return it.",
    "giver": "wise_villager",
    "objectives": [
      {"item": "lost_pet", "description": "Find the lost pet notice in town square"}
    ],
    "reward": {"score": 30, "health": 20, "message": "The villager gratefully heals your wounds!"}
  },
  "free_princess": {
    "name": "Tower Rescue",
    "description": "Free the captive princess from the tower by using the rusty_key on her chains.",
    "giver": "captive_princess",
    "objectives": [
      {"action": "use_rusty_key_at_tower", "description": "Use the rusty key to free the princess"}
    ],
    "reward": {"score": 75, "items": ["ancient_map"], "message": "The princess rewards you with knowledge of ancient paths!"},
    "ending_path": "hero_ending"
  },
  "collect_scroll": {
    "name": "The Scholar's Research",
    "description": "The scholar needs the ancient_scroll and research_notes to complete their work.",
    "giver": "scholar",
    "objectives": [
      {"item": "ancient_scroll", "description": "Find the ancient scroll in the library"},
      {"item": "research_notes", "description": "Find the research notes in the study"}
    ],
    "reward": {"score": 50, "health": 30, "message": "The scholar shares healing magic with you!"}
  },
  "help_ghost_child": {
    "name": "A Spirit at Rest",
    "description": "Help the ghost child find peace by returning the family_heirloom and old_diary.",
    "giver": "ghost_child",
    "objectives": [
      {"item": "family_heirloom", "description": "Find the family heirloom"},
      {"item": "old_diary", "description": "Find the old diary in the attic"}
    ],
    "reward": {"score": 60, "items": ["lucky_charm"], "message": "The ghost child finds peace and leaves you a lucky charm!"},
    "ending_path": "spirit_ending"
  },
  "give_coin_to_beggar": {
    "name": "An Act of Kindness",
    "description": "The beggar asks for a coin. Show compassion.",
    "giver": "beggar",
    "objectives": [
      {"action": "give_coins_to_beggar", "description": "Give coins to the beggar"}
    ],
    "reward": {"score": 25, "message": "The beggar reveals a secret passage!"}
  },
  "defeat_dragon": {
    "name": "Dragon Slayer",
    "description": "The mayor asks you to defeat the dragon terrorizing the cave.",
    "giver": "mayor",
    "objectives": [
      {"action": "defeat_dragon", "description": "Defeat the dragon in combat"}
    ],
    "reward": {"score": 150, "items": ["official_seal"], "message": "You are declared a hero of the village!"},
    "ending_path": "slayer_ending"
  }
}
