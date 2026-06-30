import { useEffect, useRef, useState } from "react";
import { BackingTrackEngine } from "./audioEngine";

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPhraseId, setSelectedPhraseId] = useState(phrases[0].id);
  const [audioError, setAudioError] = useState<string | null>(null);
  const engineRef = useRef<BackingTrackEngine | null>(null);
  const selectedPhrase =
    phrases.find((phrase) => phrase.id === selectedPhraseId) ?? phrases[0];

  useEffect(() => {
    engineRef.current?.setBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
    };
  }, []);

  const handlePlay = async () => {
    if (engineRef.current) {
      return;
    }

    setAudioError(null);
    const engine = new BackingTrackEngine(bpm, setCurrentStep);
    engineRef.current = engine;

    try {
      await engine.start();
      setIsPlaying(true);
    } catch (error) {
      engine.stop();
      engineRef.current = null;
      setIsPlaying(false);
      setAudioError(
        error instanceof Error ? error.message : "Could not start audio.",
      );
    }
  };

  const handleStop = () => {
    engineRef.current?.stop();
    engineRef.current = null;
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const currentBeat = Math.floor(currentStep / 4) + 1;

  return (
    <main className="app-shell">
      <section className="control-band" aria-label="Practice controls">
        <div className="brand-block">
          <p className="eyebrow">A minor pentatonic</p>
          <h1>Guitar Practice</h1>
        </div>

        <div className="transport-panel">
          <button
            className="transport-button"
            type="button"
            onClick={handlePlay}
            disabled={isPlaying}
          >
            Play
          </button>
          <button
            className="transport-button secondary"
            type="button"
            onClick={handleStop}
            disabled={!isPlaying}
          >
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

      {audioError ? (
        <p className="audio-error" role="alert">
          {audioError}
        </p>
      ) : null}

      <section className="meter-band" aria-label="Current backing">
        <div className={isPlaying ? "meter-active" : undefined}>
          <span className="meter-label">Backing</span>
          <strong>{isPlaying ? "Playing" : "Drums + Bass"}</strong>
        </div>
        <div>
          <span className="meter-label">Beat</span>
          <strong>{isPlaying ? `${currentBeat}/4` : "4/4"}</strong>
        </div>
        <div>
          <span className="meter-label">Loop</span>
          <strong>{isPlaying ? "1 bar backing" : "1-2 bars"}</strong>
        </div>
      </section>

      <section className="focus-panel" aria-label="Selected phrase">
        <div className="focus-copy">
          <span className="meter-label">Selected phrase</span>
          <h2>{selectedPhrase.title}</h2>
          <p>{selectedPhrase.memo}</p>
          <div className="phrase-meta">
            <span>{selectedPhrase.key}</span>
            <span>
              {selectedPhrase.bars} bar{selectedPhrase.bars > 1 ? "s" : ""}
            </span>
            <span>{selectedPhrase.difficulty}</span>
          </div>
        </div>
        <pre
          className="focus-tab"
          aria-label={`${selectedPhrase.title} selected tab`}
        >
          {selectedPhrase.tab.join("\n")}
        </pre>
      </section>

      <section className="phrase-grid" aria-label="Practice phrases">
        {phrases.map((phrase) => (
          <article
            className={`phrase-card ${
              phrase.id === selectedPhrase.id ? "phrase-card-selected" : ""
            }`}
            key={phrase.id}
          >
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
            <button
              className="select-phrase-button"
              type="button"
              aria-pressed={phrase.id === selectedPhrase.id}
              onClick={() => setSelectedPhraseId(phrase.id)}
            >
              {phrase.id === selectedPhrase.id ? "Selected" : "Practice this"}
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}

export default App;
