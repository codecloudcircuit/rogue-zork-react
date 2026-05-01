export const puzzles: Record<string, import('../game/types').PuzzleData> = {
  "riddle_spider": {
    "location": "attic",
    "riddle": "I have keys but no locks. I have space but no room. You can enter but can't go inside. What am I?",
    "answers": ["keyboard"],
    "success_message": "The giant spider is confused by your answer and lets you pass!",
    "failure_message": "The spider attacks! Your answer was wrong!",
    "reward": {"score": 20, "items": ["spider_silk"]},
    "penalty": {"health": -15}
  },
  "riddle_guardian": {
    "location": "secret_chamber",
    "riddle": "The more you take, the more you leave behind. What am I?",
    "answers": ["footsteps", "footstep"],
    "success_message": "The guardian spirit smiles. 'You are truly wise.'",
    "failure_message": "The guardian is unimpressed. 'Think harder, mortal.'",
    "reward": {"score": 30, "health": 20},
    "penalty": {"health": -10},
    "attempts_allowed": 3
  },
  "riddle_fisher": {
    "location": "river",
    "riddle": "What has hands but can't clap?",
    "answers": ["clock"],
    "success_message": "The fisher nods approvingly. 'Perhaps you know more than I thought.'",
    "failure_message": "The fisher chuckles. 'Not quite, keep thinking.'",
    "reward": {"score": 15, "items": ["fish"]}
  },
  "item_potion_mix": {
    "location": "greenhouse",
    "riddle": "The alchemist asks you to mix glowing_mushroom and strange_seed for a powerful potion.",
    "answers": ["mix"],
    "required_items": ["glowing_mushroom", "strange_seed"],
    "result_item": "enhanced_potion",
    "success_message": "The mixture fizzes and transforms into an enhanced potion!",
    "failure_message": "The mixture explodes! You take damage.",
    "reward": {"score": 25},
    "penalty": {"health": -20}
  },
  "item_chest_open": {
    "riddle": "The treasure chest requires the rusty_key to open.",
    "answers": ["open"],
    "required_items": ["rusty_key", "treasure_chest"],
    "result_item": "ultimate_treasure",
    "success_message": "The rusty key turns and the chest opens to reveal the ultimate treasure!",
    "failure_message": "The chest won't budge without the right key.",
    "reward": {"score": 100}
  },
  "item_diary_reveals": {
    "location": "attic",
    "riddle": "Reading the old diary reveals a hidden clue.",
    "answers": ["read"],
    "required_items": ["old_diary", "magnifying_glass"],
    "success_message": "The magnifying glass reveals invisible ink in the diary pointing to the secret chamber!",
    "failure_message": "You need both the old diary and magnifying glass.",
    "reward": {"score": 35, "reveals": "secret_chamber"}
  },
  "wishing_fountain": {
    "location": "fountain",
    "riddle": "Toss a wishing coin into the fountain.",
    "answers": ["wish"],
    "required_items": ["wishing_coin"],
    "success_message": "The fountain glows with magic!",
    "failure_message": "Nothing happens.",
    "outcomes": [
      {"type": "health", "message": "Your health is fully restored!", "health": 100},
      {"type": "score", "message": "Your score increases dramatically!", "score": 50},
      {"type": "item", "message": "You receive a magical gift!", "items": ["magic_ring"]},
      {"type": "nothing", "message": "Nothing happens. The fountain seems unimpressed."}
    ],
    "consumes_item": true
  }
}
