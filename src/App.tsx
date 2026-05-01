import { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from './game/engine';
import { locations } from './data/locations';
import './index.css';

function App() {
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [logs, setLogs] = useState<{ text: string; type: string }[]>([]);
  const [input, setInput] = useState('');
  const [started, setStarted] = useState(false);
  const [tab, setTab] = useState<'play' | 'map' | 'info'>('play');
  const [showInv, setShowInv] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

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
      const names = charsHere.map((c: string) => (g as unknown as Record<string, Record<string, { name: string }>>).characters?.[c]?.name || c);
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

  const handleAction = useCallback((action: string) => {
    if (!engine) return;
    if (action === 'look') {
      const loc = locations[engine.state.location];
      if (loc) {
        engine.log(`\n=== ${loc.name} ===`, 'achievement');
        engine.log(loc.description, 'room-desc');
        const itemsHere = engine.state.locationItems[engine.state.location];
        if (itemsHere?.length) engine.log(`You see: ${itemsHere.join(', ')}`, 'warning');
        const charsHere = engine.state.locationCharacters[engine.state.location];
        if (charsHere?.length) {
          const charNames = charsHere.map((c: string) => {
            const allChars = (engine as unknown as { characters: Record<string, { name: string }> }).characters;
            return allChars?.[c]?.name || c;
          });
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
          <p style={{ color: '#8b949e', fontSize: 13 }}>
            Tap directional buttons to move, or type commands for full control.
          </p>
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
          {/* Direction Pad */}
          <div className="dir-pad">
            <div className={`dir-btn ${loc?.exits['northwest'] ? 'move' : 'empty'}`}
              onClick={() => loc?.exits['northwest'] && handleAction('northwest')}>
              {loc?.exits['northwest'] ? 'NW' : ''}
            </div>
            <div className={`dir-btn ${loc?.exits['north'] ? 'move' : 'empty'}`}
              onClick={() => loc?.exits['north'] && handleAction('north')}>
              {loc?.exits['north'] ? 'N' : ''}
            </div>
            <div className={`dir-btn ${loc?.exits['northeast'] ? 'move' : 'empty'}`}
              onClick={() => loc?.exits['northeast'] && handleAction('northeast')}>
              {loc?.exits['northeast'] ? 'NE' : ''}
            </div>
            <div className={`dir-btn ${loc?.exits['west'] ? 'move' : 'empty'}`}
              onClick={() => loc?.exits['west'] && handleAction('west')}>
              {loc?.exits['west'] ? 'W' : ''}
            </div>
            <div className="dir-btn here">*</div>
            <div className={`dir-btn ${loc?.exits['east'] ? 'move' : 'empty'}`}
              onClick={() => loc?.exits['east'] && handleAction('east')}>
              {loc?.exits['east'] ? 'E' : ''}
            </div>
            <div className={`dir-btn ${loc?.exits['southwest'] ? 'move' : 'empty'}`}
              onClick={() => loc?.exits['southwest'] && handleAction('southwest')}>
              {loc?.exits['southwest'] ? 'SW' : ''}
            </div>
            <div className={`dir-btn ${loc?.exits['south'] ? 'move' : 'empty'}`}
              onClick={() => loc?.exits['south'] && handleAction('south')}>
              {loc?.exits['south'] ? 'S' : ''}
            </div>
            <div className={`dir-btn ${loc?.exits['southeast'] ? 'move' : 'empty'}`}
              onClick={() => loc?.exits['southeast'] && handleAction('southeast')}>
              {loc?.exits['southeast'] ? 'SE' : ''}
            </div>
          </div>
          {(loc?.exits['up'] || loc?.exits['down']) && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '0 12px 8px' }}>
              {loc?.exits['up'] && (
                <button className="action-btn move" onClick={() => handleAction('up')}>Up</button>
              )}
              {loc?.exits['down'] && (
                <button className="action-btn move" onClick={() => handleAction('down')}>Down</button>
              )}
            </div>
          )}

          {/* Game Log */}
          <div className="game-log" ref={logRef}>
            {logs.map((entry, i) => (
              <div key={i} className={`log-entry ${entry.type}`}>
                {entry.text}
              </div>
            ))}
          </div>

          {/* Action Menu */}
          <div className="action-menu">
            {menuItems.map((item, i) => {
              if (item.type === 'section') {
                return <span key={i} style={{ width: '100%', fontSize: 11, color: '#484f58', textTransform: 'uppercase', letterSpacing: 0.5, padding: '4px 0 2px' }}>{item.label}</span>;
              }
              let cls = 'action-btn';
              if (item.type === 'move') cls += ' move';
              else if (item.type === 'take') cls += ' take';
              else if (item.type === 'talk') cls += ' talk';
              else if (item.type === 'attack') cls += ' attack';
              else if (item.type === 'flee') cls += ' flee';
              else if (item.type === 'save') cls += ' save';
              return (
                <button key={i} className={cls} onClick={() => handleAction(item.action)}>
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Inventory Toggle */}
          {s.inventory.length > 0 && (
            <div className="inventory-panel">
              <div className="inv-title" style={{ cursor: 'pointer' }} onClick={() => setShowInv(!showInv)}>
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
          <p style={{ marginTop: 12 }}>Visited: {s.visitedLocations.size}/{Object.keys(locations).length} locations</p>
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
                const allQuests = (engine as unknown as { quests: Record<string, { name: string; description: string }> }).quests;
                const q = allQuests?.[qid];
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
                const allQuests = (engine as unknown as { quests: Record<string, { name: string; description: string }> }).quests;
                const q = allQuests?.[qid];
                return q ? (
                  <div key={qid} className="quest-item" style={{ opacity: 0.6 }}>
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

          {s.dragonDefeated && <p style={{ color: '#3fb950' }}>Dragon: Defeated</p>}
          {s.freedPrincess && <p style={{ color: '#3fb950' }}>Princess: Freed</p>}
        </div>
      )}
    </div>
  );
}

export default App;
