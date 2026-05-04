import { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from './game/engine';
import { locations } from './data/locations';
import { characters } from './data/characters';
import { quests } from './data/quests';
import './index.css';

type Theme = 'dark' | 'light';
const THEME_STORAGE_KEY = 'rogue-zork-theme';

function App() {
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [logs, setLogs] = useState<{ text: string; type: string }[]>([]);
  const [input, setInput] = useState('');
  const [started, setStarted] = useState(false);
  const [tab, setTab] = useState<'play' | 'map' | 'info'>('play');
  const [showInv, setShowInv] = useState(false);
  const [showDpad, setShowDpad] = useState(true);
  const [showActionsPopup, setShowActionsPopup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [textSize, setTextSize] = useState(14);
  const [showTalkPopup, setShowTalkPopup] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';

    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // Ignore storage errors and fall back to the system preference.
    }

    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.textSize = String(textSize);
    document.body.dataset.theme = theme;

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#0d1117' : '#f5f1e8');
    }

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures; the selected theme still applies in memory.
    }
  }, [theme, textSize]);

  const initGame = useCallback(() => {
    const g = new GameEngine();
    g.log('Welcome to Rogue Zork!', 'achievement');
    g.log('A rich text adventure with combat, quests, puzzles, and multiple endings.', 'info');
    g.log('Tap the buttons below or type commands to play.', 'info');
    g.log('Your journey begins in a dark forest...', 'info');
    g.log(`\n=== ${locations['forest']?.name || 'Dark Forest'} ===`, 'achievement');
    g.log(locations['forest']?.description || '', 'room-desc');

    const itemsHere = g.state.locationItems['forest'];
    if (itemsHere?.length) g.log(`You see: ${itemsHere.join(', ')}`, 'warning');
    const charsHere = g.state.locationCharacters['forest'];
    if (charsHere?.length) {
      const names = charsHere.map((c: string) => characters[c]?.name || c);
      g.log(`You encounter: ${names.join(', ')}`, 'info');
    }
    g.log(`Exits: ${Object.keys(locations['forest']?.exits || {}).join(', ')}`, 'success');
    g.log(`Health: ${g.state.health}/${g.state.maxHealth} | Score: ${g.state.score} | Moves: ${g.state.moves}/${g.state.maxMoves}`, 'info');

    setEngine(g);
    setLogs(g.getLogs());
    setStarted(true);
  }, []);

  const loadGame = useCallback(() => {
    const g = new GameEngine();
    if (g.loadFromStorage()) {
      g.log('Game loaded!', 'success');
      g.log(`Location: ${locations[g.state.location]?.name || g.state.location}`, 'info');
      setEngine(g);
      setLogs(g.getLogs());
      setStarted(true);
    } else {
      initGame();
    }
  }, [initGame]);

  const handleSend = useCallback(() => {
    if (!engine || !input.trim()) return;
    engine.processInput(input.trim());
    setLogs(engine.getLogs());
    setInput('');
  }, [engine, input]);

  const handleTakeAll = useCallback(() => {
    if (!engine) return;
    const items = engine.state.locationItems[engine.state.location] || [];
    if (items.length === 0) {
      engine.log('There is nothing here to take.', 'info');
    } else {
      for (const item of items) {
        engine.processInput(`take ${item}`);
      }
    }
    setLogs(engine.getLogs());
  }, [engine]);

  const handleAction = useCallback((action: string) => {
    if (!engine) return;
    if (action === 'look') {
      const loc = locations[engine.state.location];
      const isVisited = engine.state.visitedLocations.has(engine.state.location);
      if (loc) {
        engine.log(`\n=== ${loc.name} ===`, 'achievement');
        if (!isVisited) {
          engine.log(loc.description, 'room-desc');
        } else {
          engine.log(loc.briefDescription || `(You've been here)`, 'info');
        }
        const itemsHere = engine.state.locationItems[engine.state.location];
        if (itemsHere?.length) engine.log(`You see: ${itemsHere.join(', ')}`, 'warning');
        const charsHere = engine.state.locationCharacters[engine.state.location];
        if (charsHere?.length) {
          const charNames = charsHere.map((c: string) => characters[c]?.name || c);
          engine.log(`You encounter: ${charNames.join(', ')}`, 'info');
        }
        engine.log(`Exits: ${Object.keys(loc.exits).join(', ')}`, 'success');
      }
    } else if (action === 'map') {
      const visited = Array.from(engine.state.visitedLocations);
      engine.log('\n=== World Map ===', 'achievement');
      if (visited.length === 0) {
        engine.log('You haven\'t explored anywhere yet!', 'info');
      } else {
        for (const locId of visited) {
          const marker = locId === engine.state.location ? '*' : '?';
          const loc = locations[locId];
          if (loc) engine.log(`  ${marker} ${loc.name}`, 'info');
        }
      }
      engine.log(`Visited: ${visited.length}/${Object.keys(locations).length} locations`, 'info');
    } else if (action === 'save') {
      setSaveStatus('saving');
      engine.processInput(action);
      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 300);
    } else if (action === 'help') {
      engine.processInput(action);
    } else {
      engine.processInput(action);
    }
    setLogs(engine.getLogs());
  }, [engine]);

  if (!started) {
    return (
      <div className="app">
        <div className="welcome">
          <h1>Rogue Zork</h1>
          <p>A text adventure with combat, quests, puzzles, and multiple endings.</p>
          <p className="welcome-subtitle">
            Tap directional buttons to move, or type commands for full control.
          </p>
          <button
            className="start-btn secondary"
            onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </button>
          <button className="start-btn" onClick={initGame}>New Game</button>
          <button className="start-btn secondary" onClick={loadGame}>Continue</button>
        </div>
      </div>
    );
  }

  if (!engine) return null;

  const s = engine.state;
  const loc = locations[s.location];
  const menuItems = engine.getActionMenu();
  const hpPercent = Math.max(0, (s.health / s.maxHealth) * 100);
  const hpClass = hpPercent > 60 ? 'health' : hpPercent > 30 ? 'health med' : 'health low';
  const charsHere = s.locationCharacters[s.location] || [];
  const charsInRoom = charsHere.map((c: string) => characters[c]).filter(Boolean);
  const itemsHere = s.locationItems[s.location] || [];

  const dirs = ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest', 'up', 'down'];
  const dirLabels: Record<string, string> = { north: 'N', south: 'S', east: 'E', west: 'W', northeast: 'NE', northwest: 'NW', southeast: 'SE', southwest: 'SW', up: 'U', down: 'D' };

  return (
    <div className="app">
      {/* Status Bar */}
      <div className="status-bar">
        <span className="location-name">{loc?.name || s.location}</span>
        <span className={hpClass}>{s.health}/{s.maxHealth}</span>
        <span className="stat score">{s.score}pts</span>
        <span className="stat">{s.moves}/{s.maxMoves}</span>
        {saveStatus === 'saving' && <span className="stat save-status saving">Saving...</span>}
        {saveStatus === 'saved' && <span className="stat save-status saved">Saved!</span>}
        <button
          className="settings-btn"
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
        >
          ⚙
        </button>
      </div>

      {/* Combat Panel */}
      {s.inCombat && s.currentEnemy && (
        <div className="combat-panel">
          <span className="enemy-name">{s.currentEnemy.name}</span>
          <div className="hp-bar">
            <div className="hp-bar-fill" style={{ width: `${(s.enemyHealth / s.currentEnemy.health) * 100}%` }} />
          </div>
          <span className="enemy-hp">{s.enemyHealth}/{s.currentEnemy.health}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'play' ? 'active' : ''}`} onClick={() => setTab('play')}>Play</button>
        <button className={`tab ${tab === 'map' ? 'active' : ''}`} onClick={() => setTab('map')}>Map</button>
        <button className={`tab ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>Info</button>
      </div>

      {tab === 'play' && (
        <>
          {/* Game Log */}
          <div className="game-log" ref={logRef}>
            {logs.map((entry, i) => (
              <div key={i} className={`log-entry ${entry.type}`}>
                {entry.text}
              </div>
            ))}
          </div>

          {/* Bottom Controls */}
          <div className={`controls-row ${showDpad ? 'expanded' : 'collapsed'}`}>
            <button className="controls-toggle" onClick={() => setShowDpad(!showDpad)}>
              {showDpad ? '▼' : '▲'}
            </button>
            {showDpad && (
              <>
                {/* Large D-Pad */}
                <div className="dpad-wrapper">
                  <div className="dpad-section" role="navigation" aria-label="Directional movement">
                    <button className={`ld-btn ${loc?.exits['northwest'] ? 'move' : 'empty'}`}
                      onClick={() => loc?.exits['northwest'] && handleAction('northwest')}
                      disabled={!loc?.exits['northwest']}>
                      NW
                    </button>
                    <button className={`ld-btn ${loc?.exits['north'] ? 'move' : 'empty'}`}
                      onClick={() => loc?.exits['north'] && handleAction('north')}
                      disabled={!loc?.exits['north']}>
                      N
                    </button>
                    <button className={`ld-btn ${loc?.exits['northeast'] ? 'move' : 'empty'}`}
                      onClick={() => loc?.exits['northeast'] && handleAction('northeast')}
                      disabled={!loc?.exits['northeast']}>
                      NE
                    </button>
                    <button className={`ld-btn ${loc?.exits['west'] ? 'move' : 'empty'}`}
                      onClick={() => loc?.exits['west'] && handleAction('west')}
                      disabled={!loc?.exits['west']}>
                      W
                    </button>
                    <div className="ld-btn here">*</div>
                    <button className={`ld-btn ${loc?.exits['east'] ? 'move' : 'empty'}`}
                      onClick={() => loc?.exits['east'] && handleAction('east')}
                      disabled={!loc?.exits['east']}>
                      E
                    </button>
                    <button className={`ld-btn ${loc?.exits['southwest'] ? 'move' : 'empty'}`}
                      onClick={() => loc?.exits['southwest'] && handleAction('southwest')}
                      disabled={!loc?.exits['southwest']}>
                      SW
                    </button>
                    <button className={`ld-btn ${loc?.exits['south'] ? 'move' : 'empty'}`}
                      onClick={() => loc?.exits['south'] && handleAction('south')}
                      disabled={!loc?.exits['south']}>
                      S
                    </button>
                    <button className={`ld-btn ${loc?.exits['southeast'] ? 'move' : 'empty'}`}
                      onClick={() => loc?.exits['southeast'] && handleAction('southeast')}
                      disabled={!loc?.exits['southeast']}>
                      SE
                    </button>
                  </div>
                  <div className="vertical-btns">
                    <button className={`vd-btn ${loc?.exits['up'] ? 'move' : 'empty'}`}
                      onClick={() => loc?.exits['up'] && handleAction('up')}
                      disabled={!loc?.exits['up']}>▲</button>
                    <button className={`vd-btn ${loc?.exits['down'] ? 'move' : 'empty'}`}
                      onClick={() => loc?.exits['down'] && handleAction('down')}
                      disabled={!loc?.exits['down']}>▼</button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="quick-actions">
                  <button className="qa-btn" onClick={() => handleAction('look')}>👁</button>
                  <button className={`qa-btn ${charsInRoom.length === 0 ? 'disabled' : ''}`}
                    onClick={() => charsInRoom.length === 1 ? handleAction(`talk ${charsHere[0]}`) : charsInRoom.length > 1 ? setShowTalkPopup(true) : null}
                    disabled={charsInRoom.length === 0}>💬</button>
                  <button className={`qa-btn ${itemsHere.length === 0 ? 'disabled' : ''}`}
                    onClick={itemsHere.length > 0 ? handleTakeAll : undefined}
                    disabled={itemsHere.length === 0}>✋</button>
                  <button className="qa-btn" onClick={() => handleAction('inventory')}>🎒</button>
                  <button className="qa-btn" onClick={() => handleAction('health')}>❤</button>
                  <button className="qa-btn" onClick={() => handleAction('map')}>🗺</button>
                  <button className="qa-btn" onClick={() => handleAction('quests')}>📜</button>
                  <button className="qa-btn" onClick={() => handleAction('save')}>💾</button>
                  <button className="qa-btn more" onClick={() => setShowActionsPopup(true)}>≡</button>
                </div>
              </>
            )}
          </div>

          {/* Actions Popup */}
          {showActionsPopup && (
            <div className="actions-popup-overlay" onClick={() => setShowActionsPopup(false)}>
              <div className="actions-popup" onClick={(e) => e.stopPropagation()}>
                <div className="popup-header">
                  <div className="popup-header-content">
                    <span>Actions</span>
                    <span className="popup-stats">❤{s.health} | 💰{s.score} | 🎯{s.moves}/{s.maxMoves}</span>
                  </div>
                  <button className="popup-close" onClick={() => setShowActionsPopup(false)}>✕</button>
                </div>
                <div className="popup-content">
                  {menuItems.map((item, i) => {
                    if (item.type === 'section') {
                      return <span key={i} className="menu-section-label">{item.label}</span>;
                    }
                    let cls = 'action-btn';
                    let icon = '';
                    if (item.action === 'look') icon = '👁 ';
                    else if (item.action === 'inventory') icon = '🎒 ';
                    else if (item.action === 'health') icon = '❤ ';
                    else if (item.action === 'map') icon = '🗺 ';
                    else if (item.action === 'quests') icon = '📜 ';
                    else if (item.action === 'status') icon = '⚙ ';
                    else if (item.action === 'save') icon = '💾 ';
                    else if (item.action === 'undo') icon = '↩ ';
                    else if (item.type === 'move') icon = '⬆ ';
                    else if (item.type === 'take') icon = '✋ ';
                    else if (item.type === 'talk') icon = '💬 ';
                    else if (item.type === 'attack') icon = '⚔ ';
                    else if (item.type === 'flee') icon = '🏃 ';
                    return (
                      <button key={i} className={cls} onClick={() => { handleAction(item.action); setShowActionsPopup(false); }}>
                        {icon}{item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Talk Character Selection Popup */}
          {showTalkPopup && (
            <div className="talk-popup-overlay" onClick={() => setShowTalkPopup(false)}>
              <div className="talk-popup" onClick={(e) => e.stopPropagation()}>
                <div className="popup-header">
                  <span>Talk to...</span>
                  <button className="popup-close" onClick={() => setShowTalkPopup(false)}>✕</button>
                </div>
                <div className="talk-list">
                  {charsHere.map((charId: string, i: number) => {
                    const char = characters[charId];
                    return (
                      <button
                        key={i}
                        className="talk-char-btn"
                        onClick={() => { handleAction(`talk ${charId}`); setShowTalkPopup(false); }}
                      >
                        <span className="char-name">{char?.name || charId}</span>
                        <span className="char-desc">{char?.personality}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Settings Popup */}
          {showSettings && (
            <div className="settings-popup-overlay" onClick={() => setShowSettings(false)}>
              <div className="settings-popup" onClick={(e) => e.stopPropagation()}>
                <div className="settings-header">
                  <span>Settings</span>
                  <button className="popup-close" onClick={() => setShowSettings(false)}>✕</button>
                </div>
                <div className="settings-content">
                  <div className="setting-item">
                    <label>Theme</label>
                    <div className="theme-toggle-row">
                      <button
                        className={`theme-opt ${theme === 'dark' ? 'active' : ''}`}
                        onClick={() => setTheme('dark')}
                      >
                        🌙 Dark
                      </button>
                      <button
                        className={`theme-opt ${theme === 'light' ? 'active' : ''}`}
                        onClick={() => setTheme('light')}
                      >
                        ☀️ Light
                      </button>
                    </div>
                  </div>
                  <div className="setting-item">
                    <label>Text Size: {textSize}px</label>
                    <input
                      type="range"
                      min="12"
                      max="20"
                      value={textSize}
                      onChange={(e) => setTextSize(parseInt(e.target.value))}
                      className="text-size-slider"
                    />
                  </div>
                  <div className="setting-item">
                    <label>Game Stats</label>
                    <div className="stats-display">
                      <span>Health: {s.health}/{s.maxHealth}</span>
                      <span>Score: {s.score}</span>
                      <span>Moves: {s.moves}/{s.maxMoves}</span>
                    </div>
                  </div>
                  <div className="setting-item">
                    <button className="settings-action-btn" onClick={() => { engine?.saveToStorage(); setShowSettings(false); }}>
                      💾 Save Game
                    </button>
                  </div>
                  <div className="setting-item">
                    <button className="settings-action-btn" onClick={() => { engine?.loadFromStorage(); setShowSettings(false); }}>
                      📂 Load Game
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Toggle */}
          {s.inventory.length > 0 && (
            <div className="inventory-panel">
              <div className="inv-title" onClick={() => setShowInv(!showInv)}>
                Inventory ({s.inventory.length}) {showInv ? '▼' : '▶'}
              </div>
              {showInv && (
                <div className="inv-items">
                  {s.inventory.map((item: string, i: number) => (
                    <span key={i} className="inv-item" onClick={() => handleAction(`use ${item}`)}>
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Input */}
          <div className="input-area">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a command..."
              autoComplete="off"
            />
            <button onClick={handleSend}>Send</button>
          </div>
        </>
      )}

      {tab === 'map' && (
        <div className="detail-panel">
          <h3>World Map</h3>
          <p>Locations you have visited:</p>
          {Array.from(s.visitedLocations).map((locId: string) => {
            const l = locations[locId];
            if (!l) return null;
            const isCurrent = locId === s.location;
            return (
              <div key={locId} className="quest-item">
                <div className="quest-name">{isCurrent ? '★ ' : '? '}{l.name}</div>
                <div className="quest-desc">{Object.keys(l.exits).join(', ')}</div>
              </div>
            );
          })}
          {s.visitedLocations.size === 0 && <p>No locations explored yet.</p>}
          <p className="visited-count">Visited: {s.visitedLocations.size}/{Object.keys(locations).length} locations</p>
        </div>
      )}

      {tab === 'info' && (
        <div className="detail-panel">
          <h3>Status</h3>
          <p>Location: {loc?.name || s.location}</p>
          <p>Health: {s.health}/{s.maxHealth}</p>
          <p>Score: {s.score}</p>
          <p>Moves: {s.moves}/{s.maxMoves}</p>
          <p>Time: {s.timeOfDay} | Weather: {s.weather}</p>
          <p>Visited: {s.visitedLocations.size} locations</p>

          {s.activeQuests.length > 0 && (
            <>
              <h3>Active Quests</h3>
              {s.activeQuests.map((qid: string) => {
                const q = quests[qid];
                return q ? (
                  <div key={qid} className="quest-item">
                    <div className="quest-name">{q.name}</div>
                    <div className="quest-desc">{q.description}</div>
                  </div>
                ) : null;
              })}
            </>
          )}

          {s.completedQuests.length > 0 && (
            <>
              <h3>Completed Quests</h3>
              {s.completedQuests.map((qid: string) => {
                const q = quests[qid];
                return q ? (
                  <div key={qid} className="quest-item quest-item-completed">
                    <div className="quest-name">✓ {q.name}</div>
                  </div>
                ) : null;
              })}
            </>
          )}

          {s.achievements.length > 0 && (
            <>
              <h3>Achievements</h3>
              {s.achievements.map((a: string, i: number) => (
                <div key={i} className="achievement-item">{a}</div>
              ))}
            </>
          )}

          {s.dragonDefeated && <p className="status-accent-green">Dragon: Defeated</p>}
          {s.freedPrincess && <p className="status-accent-green">Princess: Freed</p>}
        </div>
      )}
    </div>
  );
}

export default App;
