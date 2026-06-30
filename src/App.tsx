import { useState } from "react";

type Phrase = {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium";
  key: string;
  bars: number;
  memo: string;
  tab: string[];
};

const phrases: Phrase[] = [
  {
    id: "minor-pentatonic-up",
    title: "Minor Pentatonic Up",
    difficulty: "Easy",
    key: "A minor",
    bars: 1,
    memo: "A minor pentatonic ascending line",
    tab: [
      "e|----------------5-8-|",
      "B|------------5-8-----|",
      "G|--------5-7---------|",
      "D|----5-7-------------|",
      "A|5-7-----------------|",
      "E|--------------------|",
    ],
  },
  {
    id: "minor-pentatonic-down",
    title: "Minor Pentatonic Down",
    difficulty: "Easy",
    key: "A minor",
    bars: 1,
    memo: "Descending line for return practice",
    tab: [
      "e|8-5-----------------|",
      "B|----8-5-------------|",
      "G|--------7-5---------|",
      "D|------------7-5-----|",
      "A|----------------7-5-|",
      "E|--------------------|",
    ],
  },
  {
    id: "low-string-riff",
    title: "Low String Riff",
    difficulty: "Easy",
    key: "A minor",
    bars: 2,
    memo: "Muted eighth-note rock pattern",
    tab: [
      "e|----------------|----------------|",
      "B|----------------|----------------|",
      "G|----------------|----------------|",
      "D|----------------|----------------|",
      "A|7-7-5---7-7-5---|7-7-5---8-7-5---|",
      "E|5-5-5---5-5-5---|5-5-5---5-5-5---|",
    ],
  },
  {
    id: "blues-box",
    title: "Blues Box",
    difficulty: "Medium",
    key: "A minor",
    bars: 1,
    memo: "Small box phrase without bending",
    tab: [
      "e|--------5--------|",
      "B|----5-8---8-5----|",
      "G|5-7-----------7-5|",
      "D|-----------------|",
      "A|-----------------|",
      "E|-----------------|",
    ],
  },
  {
    id: "rest-practice",
    title: "Rest Practice",
    difficulty: "Easy",
    key: "A minor",
    bars: 1,
    memo: "Short rests inside an eighth-note line",
    tab: [
      "e|----------------|",
      "B|----------------|",
      "G|----5---7---5---|",
      "D|7-----7---7---7-|",
      "A|----------------|",
      "E|----------------|",
    ],
  },
  {
    id: "two-bar-run",
    title: "Two Bar Run",
    difficulty: "Medium",
    key: "A minor",
    bars: 2,
    memo: "Connect low and high positions",
    tab: [
      "e|----------------|--------5-8-5---|",
      "B|----------------|----5-8-------8-|",
      "G|------------5-7-|5-7-------------|",
      "D|--------5-7-----|----------------|",
      "A|5-7-5-7---------|----------------|",
      "E|----------------|----------------|",
    ],
  },
];

function App() {
  const [bpm, setBpm] = useState(90);

  return (
    <main className="app-shell">
      <section className="control-band" aria-label="Practice controls">
        <div className="brand-block">
          <p className="eyebrow">A minor pentatonic</p>
          <h1>Guitar Practice</h1>
        </div>

        <div className="transport-panel">
          <button className="transport-button" type="button" disabled>
            Play
          </button>
          <button className="transport-button secondary" type="button" disabled>
            Stop
          </button>
          <label className="bpm-control">
            <span>BPM</span>
            <strong>{bpm}</strong>
            <input
              aria-label="BPM"
              type="range"
              min="60"
              max="160"
              value={bpm}
              onChange={(event) => setBpm(Number(event.target.value))}
            />
          </label>
        </div>
      </section>

      <section className="meter-band" aria-label="Current backing">
        <div>
          <span className="meter-label">Backing</span>
          <strong>Drums + Bass</strong>
        </div>
        <div>
          <span className="meter-label">Time</span>
          <strong>4/4</strong>
        </div>
        <div>
          <span className="meter-label">Loop</span>
          <strong>1-2 bars</strong>
        </div>
      </section>

      <section className="phrase-grid" aria-label="Practice phrases">
        {phrases.map((phrase) => (
          <article className="phrase-card" key={phrase.id}>
            <div className="phrase-header">
              <div>
                <h2>{phrase.title}</h2>
                <p>{phrase.memo}</p>
              </div>
              <span className="difficulty">{phrase.difficulty}</span>
            </div>
            <div className="phrase-meta">
              <span>{phrase.key}</span>
              <span>{phrase.bars} bar{phrase.bars > 1 ? "s" : ""}</span>
            </div>
            <pre aria-label={`${phrase.title} tab`}>
              {phrase.tab.join("\n")}
            </pre>
          </article>
        ))}
      </section>
    </main>
  );
}

export default App;
