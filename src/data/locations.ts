export const locations: Record<string, import('../game/types').LocationData> = {
  "forest": {
    "name": "Dark Forest",
    "description": "You are in a dark forest. Ancient trees tower above you.",
    "exits": {"north": "castle", "east": "river", "west": "cave", "northeast": "village"},
    "items": ["torch"],
    "characters": ["old_wizard"]
  },
  "castle": {
    "name": "Castle Gate",
    "description": "You stand before a crumbling castle gate. Ivy covers the ancient stones.",
    "exits": {"south": "forest", "east": "garden", "up": "tower"},
    "items": ["rusty_key"],
    "characters": ["ghost_knight"]
  },
  "river": {
    "name": "Rushing River",
    "description": "A rushing river blocks your path. The water looks deep and cold.",
    "exits": {"west": "forest", "north": "bridge", "east": "waterfall"},
    "items": ["fish", "rope"],
    "characters": ["mysterious_fisher"]
  },
  "cave": {
    "name": "Dark Cave",
    "description": "A damp cave stretches into darkness. You hear strange echoes.",
    "exits": {"east": "forest", "down": "underground_lake"},
    "items": ["treasure_chest", "ancient_map"],
    "characters": ["dragon"]
  },
  "garden": {
    "name": "Overgrown Garden",
    "description": "An overgrown garden filled with strange plants and flowers.",
    "exits": {"west": "castle", "north": "greenhouse"},
    "items": ["magic_potion", "berries"],
    "characters": ["mad_gardener"]
  },
  "bridge": {
    "name": "Rickety Bridge",
    "description": "A rickety wooden bridge spans across the river. It creaks ominously.",
    "exits": {"south": "river", "north": "village"},
    "items": ["wooden_plank"],
    "characters": ["troll"]
  },
  "village": {
    "name": "Small Village",
    "description": "A small village with thatched-roof cottages. Smoke rises from chimneys.",
    "exits": {"southwest": "forest", "south": "bridge", "east": "tavern", "west": "blacksmith"},
    "items": ["bread", "coins"],
    "characters": ["wise_villager"]
  },
  "library": {
    "name": "Ancient Library",
    "description": "A dusty library filled with ancient tomes and scrolls. Knowledge hangs heavy in the air.",
    "exits": {"south": "castle", "east": "study", "west": "archive"},
    "items": ["ancient_scroll", "quill", "ink"],
    "characters": ["scholar"],
    "required_items": ["spell_book"],
    "secret_exit": {"hidden": "secret_chamber"}
  },
  "study": {
    "name": "Private Study",
    "description": "A private study with a large desk and comfortable chair. Books line the walls.",
    "exits": {"west": "library", "north": "attic"},
    "items": ["research_notes", "magnifying_glass"],
    "characters": ["reclusive_scholar"]
  },
  "archive": {
    "name": "Archive",
    "description": "Rows upon rows of filing cabinets and storage boxes. Most are covered in dust.",
    "exits": {"east": "library"},
    "items": ["old_map", "blueprint"],
    "characters": ["archivist"]
  },
  "attic": {
    "name": "Cramped Attic",
    "description": "A cramped attic filled with forgotten treasures and cobwebs. Moonlight streams through a small window.",
    "exits": {"south": "study"},
    "items": ["family_heirloom", "old_diary"],
    "characters": ["ghost_child"]
  },
  "secret_chamber": {
    "name": "Secret Chamber",
    "description": "A hidden chamber revealed only to those with true knowledge. Ancient symbols glow on the walls.",
    "exits": {"east": "library"},
    "items": ["crystal_orb", "ancient_artifact"],
    "characters": ["guardian_spirit"],
    "secret": true
  },
  "tavern": {
    "name": "Cozy Tavern",
    "description": "A cozy tavern with a crackling fireplace and wooden tables.",
    "exits": {"west": "village", "up": "inn_room"},
    "items": ["ale", "secret_note"],
    "characters": ["friendly_bartender"]
  },
  "blacksmith": {
    "name": "Blacksmith Forge",
    "description": "A forge with tools scattered about. The smell of metal fills the air.",
    "exits": {"east": "village"},
    "items": ["sword", "shield"],
    "characters": ["gruff_blacksmith"]
  },
  "tower": {
    "name": "Tall Tower",
    "description": "A tall tower with a spiral staircase. From the top, you can see the whole area.",
    "exits": {"down": "castle"},
    "items": ["telescope", "spell_book"],
    "characters": ["captive_princess"]
  },
  "waterfall": {
    "name": "Magnificent Waterfall",
    "description": "A magnificent waterfall cascades into a crystal clear pool.",
    "exits": {"west": "river"},
    "items": ["shiny_pebble", "healing_crystal"],
    "characters": ["forest_spirit"]
  },
  "greenhouse": {
    "name": "Glass Greenhouse",
    "description": "A glass greenhouse filled with exotic plants and glowing fungi.",
    "exits": {"south": "garden"},
    "items": ["glowing_mushroom", "strange_seed"],
    "characters": ["alchemist"]
  },
  "underground_lake": {
    "name": "Underground Lake",
    "description": "A vast underground lake with luminescent algae illuminating the cavern.",
    "exits": {"up": "cave"},
    "items": ["glowworm", "mystic_shell"],
    "characters": ["lake_monster"]
  },
  "inn_room": {
    "name": "Inn Room",
    "description": "A small but comfortable room with a warm bed and a window overlooking the village.",
    "exits": {"down": "tavern"},
    "items": ["comfortable_blanket", "travel_guide"],
    "characters": ["sleepy_traveler"]
  },
  "marketplace": {
    "name": "Bustling Marketplace",
    "description": "A bustling marketplace with vendors selling various goods. People haggle and trade.",
    "exits": {"north": "village", "south": "market_square", "east": "apothecary", "west": "weapon_shop"},
    "items": ["rare_spices", "exotic_fruits", "trinkets"],
    "characters": ["merchant", "street_performer"],
    "time_sensitive": true
  },
  "market_square": {
    "name": "Market Square",
    "description": "The central square where announcements are made and public gatherings occur.",
    "exits": {"north": "marketplace", "east": "fountain", "west": "town_square"},
    "items": ["public_notice", "lost_wallet"],
    "characters": ["town_crier", "beggar"]
  },
  "apothecary": {
    "name": "Apothecary Shop",
    "description": "A shop filled with jars of herbs, potions, and mysterious ingredients.",
    "exits": {"west": "marketplace"},
    "items": ["healing_herb", "poison_antidote", "vision_potion"],
    "characters": ["master_apothecary"],
    "shop": true
  },
  "weapon_shop": {
    "name": "Weapon Shop",
    "description": "A well-organized shop displaying various weapons and armor.",
    "exits": {"east": "marketplace"},
    "items": ["enchanted_sword", "magic_shield", "throwing_daggers"],
    "characters": ["weaponsmith"],
    "shop": true
  },
  "fountain": {
    "name": "Stone Fountain",
    "description": "A beautiful stone fountain in the center of the square. Water flows gently.",
    "exits": {"west": "market_square"},
    "items": ["coin", "wishing_coin"],
    "characters": ["water_spirit"],
    "special": "wishing_fountain"
  },
  "town_square": {
    "name": "Town Square",
    "description": "The main gathering place for villagers. Often busy with activity.",
    "exits": {"east": "market_square", "north": "town_hall"},
    "items": ["public_bullitin", "lost_pet"],
    "characters": ["mayor", "town_guard"]
  },
  "town_hall": {
    "name": "Town Hall",
    "description": "The administrative building where important village matters are discussed.",
    "exits": {"south": "town_square"},
    "items": ["official_seal", "tax_records"],
    "characters": ["clerk", "mayor"]
  }
}
