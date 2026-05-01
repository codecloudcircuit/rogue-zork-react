export const characters: Record<string, import('../game/types').CharacterData> = {
  "old_wizard": {
    "name": "Old Wizard",
    "dialogue": "Hail, young adventurer! Take this torch if you wish to venture into dark places. Knowledge comes at a price, though - be wary.",
    "action": "give_torch",
    "personality": "wise",
    "helpfulness": "helpful",
    "quest_giver": true,
    "quest": "find_artifacts"
  },
  "ghost_knight": {
    "name": "Ghost Knight",
    "dialogue": "Beware, traveler! This castle holds many secrets... and many traps. I guard the entrance still, though I no longer draw breath.",
    "action": "spooky",
    "personality": "honorable",
    "helpfulness": "somewhat_helpful",
    "combat_enemy": true,
    "enemy_stats": {"health": 40, "attack": 12, "defense": 8}
  },
  "mysterious_fisher": {
    "name": "Mysterious Fisher",
    "dialogue": "Fishing in these waters brings more than fish... if you know how to look. But knowledge requires patience, and patience requires sacrifice.",
    "action": "hint",
    "personality": "cryptic",
    "helpfulness": "somewhat_helpful",
    "riddle_master": true
  },
  "dragon": {
    "name": "Dragon",
    "dialogue": "RRRROOOAAARRR! This treasure is MINE! Only those brave enough to face me shall claim it. But beware - I am not easily defeated!",
    "action": "challenge",
    "personality": "aggressive",
    "helpfulness": "not_helpful",
    "combat_enemy": true,
    "enemy_stats": {"health": 80, "attack": 20, "defense": 15, "boss": true}
  },
  "mad_gardener": {
    "name": "Mad Gardener",
    "dialogue": "Plants, plants, everywhere plants! Some heal, some harm, some taste quite nice! Would you like to try my special berries?",
    "action": "offer_berries",
    "personality": "eccentric",
    "helpfulness": "random",
    "random_effect": true
  },
  "troll": {
    "name": "Bridge Troll",
    "dialogue": "Fee-fi-fiddly-fee! Pay me in gold or face my mighty club! I've been guarding this bridge for decades!",
    "action": "demand",
    "personality": "greedy",
    "helpfulness": "not_helpful",
    "combat_enemy": true,
    "enemy_stats": {"health": 50, "attack": 15, "defense": 10},
    "bribe_item": "coins"
  },
  "wise_villager": {
    "name": "Wise Villager",
    "dialogue": "Welcome, stranger! Our village has seen many adventurers like yourself. Take heed of our warnings - danger lurks in many forms.",
    "action": "provide_hint",
    "personality": "knowledgeable",
    "helpfulness": "helpful",
    "quest_giver": true,
    "quest": "find_lost_pet"
  },
  "friendly_bartender": {
    "name": "Friendly Bartender",
    "dialogue": "Ah, a new face! Sit and have a drink! I've heard many tales from travelers passing through. Perhaps I can share some wisdom?",
    "action": "serve_drink",
    "personality": "welcoming",
    "helpfulness": "helpful"
  },
  "gruff_blacksmith": {
    "name": "Gruff Blacksmith",
    "dialogue": "Weapons and armor, that's what I make. Quality steel for brave hearts. But metal alone won't save you - it's what's in here that counts.",
    "action": "sell_items",
    "personality": "practical",
    "helpfulness": "helpful",
    "shopkeeper": true
  },
  "captive_princess": {
    "name": "Captive Princess",
    "dialogue": "Oh, brave soul! I have been trapped in this tower for years. Perhaps you could aid me? I know secrets of this realm that might help you.",
    "action": "offer_help",
    "personality": "manipulative",
    "helpfulness": "somewhat_helpful",
    "quest_giver": true,
    "quest": "free_princess"
  },
  "forest_spirit": {
    "name": "Forest Spirit",
    "dialogue": "*ethereal whisper* Those pure of heart may find what they seek here. Others may find only despair. Choose your path wisely.",
    "action": "bless",
    "personality": "mystical",
    "helpfulness": "helpful"
  },
  "alchemist": {
    "name": "Alchemist",
    "dialogue": "Ah, a visitor! My experiments yield both wonder and peril. Mix the wrong ingredients and... well, explosions happen! But mix correctly...",
    "action": "offer_potion",
    "personality": "curious",
    "helpfulness": "somewhat_helpful",
    "craftsman": true,
    "recipe": {"glowing_mushroom": "enhanced_potion"}
  },
  "lake_monster": {
    "name": "Lake Monster",
    "dialogue": "GURGLE... GURGLE... Disturb not my domain, surface dweller, unless you bring tribute worthy of the depths!",
    "action": "demand_tribute",
    "personality": "ancient",
    "helpfulness": "not_helpful",
    "combat_enemy": true,
    "enemy_stats": {"health": 60, "attack": 18, "defense": 12},
    "tribute_item": "shiny_pebble"
  },
  "sleepy_traveler": {
    "name": "Sleepy Traveler",
    "dialogue": "*yawns* Oh, hello there. Been a long journey from the eastern lands. Terrible storms there. You should head south if you value your skin.",
    "action": "share_news",
    "personality": "weary",
    "helpfulness": "somewhat_helpful"
  },
  "scholar": {
    "name": "Scholar",
    "dialogue": "Knowledge is power, young one. These ancient scrolls contain secrets that could save or doom you. Choose wisely what you learn.",
    "action": "teach_magic",
    "personality": "scholarly",
    "helpfulness": "helpful",
    "quest_giver": true,
    "quest": "collect_scroll"
  },
  "reclusive_scholar": {
    "name": "Reclusive Scholar",
    "dialogue": "I've studied these ruins for decades. There are patterns here that others miss. Perhaps you have the eyes to see what I see?",
    "action": "reveal_secrets",
    "personality": "obsessed",
    "helpfulness": "somewhat_helpful"
  },
  "archivist": {
    "name": "Archivist",
    "dialogue": "The past is preserved here, but not all knowledge is meant for the present. Some truths are better left buried.",
    "action": "provide_map",
    "personality": "cautious",
    "helpfulness": "helpful"
  },
  "ghost_child": {
    "name": "Ghost Child",
    "dialogue": "*whisper* I'm lost... can you help me find my way home? My diary holds the key to many secrets...",
    "action": "haunt",
    "personality": "sad",
    "helpfulness": "helpful",
    "quest_giver": true,
    "quest": "help_ghost_child"
  },
  "guardian_spirit": {
    "name": "Guardian Spirit",
    "dialogue": "Only those who seek knowledge, not power, may enter this sacred chamber. The ancient artifact here is not a toy.",
    "action": "test_worthiness",
    "personality": "wise",
    "helpfulness": "helpful",
    "riddle_master": true
  },
  "merchant": {
    "name": "Merchant",
    "dialogue": "Rare spices from distant lands! Exotic fruits that can heal or harm! Take your pick, but choose carefully.",
    "action": "trade",
    "personality": "businesslike",
    "helpfulness": "helpful",
    "shopkeeper": true
  },
  "street_performer": {
    "name": "Street Performer",
    "dialogue": "Step right up! Witness amazing feats of skill and daring! For a small donation, I might share what I've seen...",
    "action": "perform",
    "personality": "enthusiastic",
    "helpfulness": "random"
  },
  "town_crier": {
    "name": "Town Crier",
    "dialogue": "Hear ye, hear ye! Important announcements for all citizens and travelers alike! Knowledge is power!",
    "action": "announce",
    "personality": "loud",
    "helpfulness": "helpful"
  },
  "beggar": {
    "name": "Beggar",
    "dialogue": "Spare a coin, kind traveler? I've seen things in these streets that would make your blood run cold...",
    "action": "warn",
    "personality": "desperate",
    "helpfulness": "somewhat_helpful",
    "quest_giver": true,
    "quest": "give_coin_to_beggar"
  },
  "master_apothecary": {
    "name": "Master Apothecary",
    "dialogue": "Healing herbs, potent potions, mysterious ingredients! What ailment troubles you, brave adventurer?",
    "action": "heal",
    "personality": "knowledgeable",
    "helpfulness": "helpful",
    "shopkeeper": true
  },
  "weaponsmith": {
    "name": "Weaponsmith",
    "dialogue": "Fine weapons and sturdy armor! Crafted with care and enchanted with ancient magic. What will it be?",
    "action": "equip",
    "personality": "proud",
    "helpfulness": "helpful",
    "shopkeeper": true
  },
  "water_spirit": {
    "name": "Water Spirit",
    "dialogue": "Make a wish at the fountain, traveler. But be careful what you wish for... water spirits are tricky beings.",
    "action": "grant_wish",
    "personality": "mischievous",
    "helpfulness": "random"
  },
  "mayor": {
    "name": "Mayor",
    "dialogue": "Welcome to our village! I am the mayor. We value peace and prosperity here. How may I assist you?",
    "action": "provide_quest",
    "personality": "diplomatic",
    "helpfulness": "helpful",
    "quest_giver": true,
    "quest": "defeat_dragon"
  },
  "town_guard": {
    "name": "Town Guard",
    "dialogue": "Halt! State your business in the village. We don't take kindly to troublemakers around here.",
    "action": "check_suspicious",
    "personality": "suspicious",
    "helpfulness": "not_helpful",
    "combat_enemy": true,
    "enemy_stats": {"health": 30, "attack": 10, "defense": 10}
  },
  "clerk": {
    "name": "Clerk",
    "dialogue": "Official business only, please. The town hall handles all administrative matters for the village.",
    "action": "bureaucratic",
    "personality": "formal",
    "helpfulness": "not_helpful"
  }
}
