import { useEffect, useRef, useState } from "react";
import {
  BackingTrackEngine,
  type AudioLevels,
  type MusicalKey,
  type RhythmPatternId,
} from "./audioEngine";
import TabNotation, { type TabEvent } from "./TabNotation";

type Phrase = {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium";
  bars: number;
  memo: string;
  totalSteps: number;
  tabEvents: TabEvent[];
};

const KEY_OPTIONS: MusicalKey[] = [
  "A",
  "A#",
  "B",
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
];

const KEY_OFFSETS: Record<MusicalKey, number> = {
  A: 0,
  "A#": 1,
  B: 2,
  C: 3,
  "C#": 4,
  D: 5,
  "D#": 6,
  E: 7,
  F: 8,
  "F#": 9,
  G: 10,
  "G#": 11,
};

const RHYTHM_PATTERNS: Array<{
  id: RhythmPatternId;
  label: string;
}> = [
  { id: "straight-rock", label: "Straight Rock" },
  { id: "half-time", label: "Half Time" },
  { id: "funk-eighths", label: "Funk Eighths" },
];

const phrases: Phrase[] = [
  {
    id: "minor-pentatonic-up",
    title: "Minor Pentatonic Up",
    difficulty: "Easy",
    bars: 1,
    memo: "Minor pentatonic ascending line",
    totalSteps: 16,
    tabEvents: [
      { step: 0, duration: "eighth", notes: [{ string: 5, fret: "5" }] },
      { step: 2, duration: "eighth", notes: [{ string: 5, fret: "7" }] },
      { step: 4, duration: "eighth", notes: [{ string: 4, fret: "5" }] },
      { step: 6, duration: "eighth", notes: [{ string: 4, fret: "7" }] },
      { step: 8, duration: "eighth", notes: [{ string: 3, fret: "5" }] },
      { step: 10, duration: "eighth", notes: [{ string: 3, fret: "7" }] },
      { step: 12, duration: "eighth", notes: [{ string: 2, fret: "5" }] },
      { step: 14, duration: "eighth", notes: [{ string: 2, fret: "8" }] },
    ],
  },
  {
    id: "minor-pentatonic-down",
    title: "Minor Pentatonic Down",
    difficulty: "Easy",
    bars: 1,
    memo: "Descending line for return practice",
    totalSteps: 16,
    tabEvents: [
      { step: 0, duration: "eighth", notes: [{ string: 1, fret: "8" }] },
      { step: 2, duration: "eighth", notes: [{ string: 1, fret: "5" }] },
      { step: 4, duration: "eighth", notes: [{ string: 2, fret: "8" }] },
      { step: 6, duration: "eighth", notes: [{ string: 2, fret: "5" }] },
      { step: 8, duration: "eighth", notes: [{ string: 3, fret: "7" }] },
      { step: 10, duration: "eighth", notes: [{ string: 3, fret: "5" }] },
      { step: 12, duration: "eighth", notes: [{ string: 4, fret: "7" }] },
      { step: 14, duration: "eighth", notes: [{ string: 4, fret: "5" }] },
    ],
  },
  {
    id: "low-string-riff",
    title: "Low String Riff",
    difficulty: "Easy",
    bars: 2,
    memo: "Muted eighth-note rock pattern",
    totalSteps: 32,
    tabEvents: [
      {
        step: 0,
        duration: "eighth",
        notes: [
          { string: 5, fret: "7" },
          { string: 6, fret: "5" },
        ],
      },
      {
        step: 2,
        duration: "eighth",
        notes: [
          { string: 5, fret: "7" },
          { string: 6, fret: "5" },
        ],
      },
      {
        step: 4,
        duration: "quarter",
        notes: [
          { string: 5, fret: "5" },
          { string: 6, fret: "5" },
        ],
      },
      {
        step: 8,
        duration: "eighth",
        notes: [
          { string: 5, fret: "7" },
          { string: 6, fret: "5" },
        ],
      },
      {
        step: 10,
        duration: "eighth",
        notes: [
          { string: 5, fret: "7" },
          { string: 6, fret: "5" },
        ],
      },
      {
        step: 12,
        duration: "quarter",
        notes: [
          { string: 5, fret: "5" },
          { string: 6, fret: "5" },
        ],
      },
      {
        step: 16,
        duration: "eighth",
        notes: [
          { string: 5, fret: "7" },
          { string: 6, fret: "5" },
        ],
      },
      {
        step: 18,
        duration: "eighth",
        notes: [
          { string: 5, fret: "7" },
          { string: 6, fret: "5" },
        ],
      },
      {
        step: 20,
        duration: "eighth",
        notes: [
          { string: 5, fret: "5" },
          { string: 6, fret: "5" },
        ],
      },
      {
        step: 24,
        duration: "eighth",
        notes: [
          { string: 5, fret: "8" },
          { string: 6, fret: "5" },
        ],
      },
      {
        step: 26,
        duration: "eighth",
        notes: [
          { string: 5, fret: "7" },
          { string: 6, fret: "5" },
        ],
      },
      {
        step: 28,
        duration: "quarter",
        notes: [
          { string: 5, fret: "5" },
          { string: 6, fret: "5" },
        ],
      },
    ],
  },
  {
    id: "blues-box",
    title: "Blues Box",
    difficulty: "Medium",
    bars: 1,
    memo: "Small box phrase without bending",
    totalSteps: 16,
    tabEvents: [
      { step: 0, duration: "eighth", notes: [{ string: 3, fret: "5" }] },
      { step: 2, duration: "eighth", notes: [{ string: 3, fret: "7" }] },
      { step: 4, duration: "eighth", notes: [{ string: 2, fret: "5" }] },
      { step: 6, duration: "eighth", notes: [{ string: 2, fret: "8" }] },
      { step: 8, duration: "quarter", notes: [{ string: 1, fret: "5" }] },
      { step: 12, duration: "eighth", notes: [{ string: 2, fret: "8" }] },
      { step: 14, duration: "eighth", notes: [{ string: 2, fret: "5" }] },
    ],
  },
  {
    id: "rest-practice",
    title: "Rest Practice",
    difficulty: "Easy",
    bars: 1,
    memo: "Short rests inside an eighth-note line",
    totalSteps: 16,
    tabEvents: [
      { step: 0, duration: "quarter", notes: [{ string: 4, fret: "7" }] },
      { step: 4, duration: "eighth", notes: [{ string: 3, fret: "5" }] },
      { step: 6, duration: "eighth", notes: [{ string: 4, fret: "7" }] },
      { step: 8, duration: "eighth", notes: [{ string: 3, fret: "7" }] },
      { step: 10, duration: "eighth", notes: [{ string: 4, fret: "7" }] },
      { step: 12, duration: "eighth", notes: [{ string: 3, fret: "5" }] },
      { step: 14, duration: "eighth", notes: [{ string: 4, fret: "7" }] },
    ],
  },
  {
    id: "two-bar-run",
    title: "Two Bar Run",
    difficulty: "Medium",
    bars: 2,
    memo: "Connect low and high positions",
    totalSteps: 32,
    tabEvents: [
      { step: 0, duration: "eighth", notes: [{ string: 5, fret: "5" }] },
      { step: 2, duration: "eighth", notes: [{ string: 5, fret: "7" }] },
      { step: 4, duration: "eighth", notes: [{ string: 5, fret: "5" }] },
      { step: 6, duration: "eighth", notes: [{ string: 5, fret: "7" }] },
      { step: 8, duration: "eighth", notes: [{ string: 4, fret: "5" }] },
      { step: 10, duration: "eighth", notes: [{ string: 4, fret: "7" }] },
      { step: 12, duration: "eighth", notes: [{ string: 3, fret: "5" }] },
      { step: 14, duration: "eighth", notes: [{ string: 3, fret: "7" }] },
      { step: 16, duration: "eighth", notes: [{ string: 3, fret: "5" }] },
      { step: 18, duration: "eighth", notes: [{ string: 3, fret: "7" }] },
      { step: 20, duration: "eighth", notes: [{ string: 2, fret: "5" }] },
      { step: 22, duration: "eighth", notes: [{ string: 2, fret: "8" }] },
      { step: 24, duration: "eighth", notes: [{ string: 1, fret: "5" }] },
      { step: 26, duration: "eighth", notes: [{ string: 1, fret: "8" }] },
      { step: 28, duration: "quarter", notes: [{ string: 1, fret: "5" }] },
    ],
  },
];

function App() {
  const [bpm, setBpm] = useState(90);
  const [practiceKey, setPracticeKey] = useState<MusicalKey>("A");
  const [rhythmPattern, setRhythmPattern] =
    useState<RhythmPatternId>("straight-rock");
  const [levels, setLevels] = useState<AudioLevels>({
    master: 0.72,
    drums: 0.9,
    bass: 0.85,
  });
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
    engineRef.current?.setKey(practiceKey);
  }, [practiceKey]);

  useEffect(() => {
    engineRef.current?.setRhythmPattern(rhythmPattern);
  }, [rhythmPattern]);

  useEffect(() => {
    engineRef.current?.setLevels(levels);
  }, [levels]);

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
    const engine = new BackingTrackEngine(bpm, setCurrentStep, {
      key: practiceKey,
      rhythmPattern,
      levels,
    });
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
  const rhythmLabel =
    RHYTHM_PATTERNS.find((pattern) => pattern.id === rhythmPattern)?.label ??
    "Straight Rock";
  const keyOffset = KEY_OFFSETS[practiceKey];
  const selectedTabEvents = transposeTabEvents(
    selectedPhrase.tabEvents,
    keyOffset,
  );

  const updateLevel = (level: keyof AudioLevels, value: number) => {
    setLevels((currentLevels) => ({
      ...currentLevels,
      [level]: value,
    }));
  };

  return (
    <main className="app-shell">
      <section className="control-band" aria-label="Practice controls">
        <div className="brand-block">
          <p className="eyebrow">{practiceKey} minor pentatonic</p>
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

      <section className="settings-panel" aria-label="Practice settings">
        <label className="select-control">
          <span>Key</span>
          <select
            value={practiceKey}
            onChange={(event) => setPracticeKey(event.target.value as MusicalKey)}
          >
            {KEY_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {key} minor
              </option>
            ))}
          </select>
        </label>
        <label className="select-control">
          <span>Rhythm</span>
          <select
            value={rhythmPattern}
            onChange={(event) =>
              setRhythmPattern(event.target.value as RhythmPatternId)
            }
          >
            {RHYTHM_PATTERNS.map((pattern) => (
              <option key={pattern.id} value={pattern.id}>
                {pattern.label}
              </option>
            ))}
          </select>
        </label>
        {(["master", "drums", "bass"] as Array<keyof AudioLevels>).map(
          (level) => (
            <label className="volume-control" key={level}>
              <span>{level}</span>
              <strong>{Math.round(levels[level] * 100)}</strong>
              <input
                aria-label={`${level} volume`}
                type="range"
                min="0"
                max="100"
                value={Math.round(levels[level] * 100)}
                onChange={(event) =>
                  updateLevel(level, Number(event.target.value) / 100)
                }
              />
            </label>
          ),
        )}
      </section>

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
          <span className="meter-label">Rhythm</span>
          <strong>{rhythmLabel}</strong>
        </div>
      </section>

      <section className="focus-panel" aria-label="Selected phrase">
        <div className="focus-copy">
          <span className="meter-label">Selected phrase</span>
          <h2>{selectedPhrase.title}</h2>
          <p>{selectedPhrase.memo}</p>
          <div className="phrase-meta">
            <span>{practiceKey} minor</span>
            <span>
              {selectedPhrase.bars} bar{selectedPhrase.bars > 1 ? "s" : ""}
            </span>
            <span>{selectedPhrase.difficulty}</span>
          </div>
        </div>
        <div className="focus-tab">
          <TabNotation
            events={selectedTabEvents}
            totalSteps={selectedPhrase.totalSteps}
            title={selectedPhrase.title}
          />
        </div>
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
              <span>{practiceKey} minor</span>
              <span>{phrase.bars} bar{phrase.bars > 1 ? "s" : ""}</span>
            </div>
            <TabNotation
              compact
              events={transposeTabEvents(phrase.tabEvents, keyOffset)}
              totalSteps={phrase.totalSteps}
              title={phrase.title}
            />
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

function transposeTabEvents(events: TabEvent[], semitones: number): TabEvent[] {
  if (semitones === 0) {
    return events;
  }

  return events.map((event) => ({
    ...event,
    notes: event.notes.map((note) => {
      const fret = Number(note.fret);

      return {
        ...note,
        fret: Number.isFinite(fret) ? String(fret + semitones) : note.fret,
      };
    }),
  }));
}

export default App;
