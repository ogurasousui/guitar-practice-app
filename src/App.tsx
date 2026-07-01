import { useEffect, useMemo, useRef, useState } from "react";
import {
  BackingTrackEngine,
  type AudioLevels,
  type MusicalKey,
  type RhythmPatternId,
  type ScaleMode,
} from "./audioEngine";
import { phrases, type Difficulty } from "./phrases";
import TabNotation, { type TabEvent } from "./TabNotation";

type DifficultyFilter = "all" | Difficulty;
type BarFilter = "all" | "1" | "2";
type SortMode = "library" | "title" | "difficulty" | "bars";

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

const SCALE_MODES: Array<{
  id: ScaleMode;
  label: string;
}> = [
  { id: "minor", label: "Minor" },
  { id: "major", label: "Major" },
];

const RHYTHM_PATTERNS: Array<{
  id: RhythmPatternId;
  label: string;
}> = [
  { id: "straight-rock", label: "Straight Rock" },
  { id: "half-time", label: "Half Time" },
  { id: "funk-eighths", label: "Funk Eighths" },
];

const DIFFICULTY_FILTERS: Array<{
  id: DifficultyFilter;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "Easy", label: "Easy" },
  { id: "Medium", label: "Medium" },
  { id: "Hard", label: "Hard" },
];

const BAR_FILTERS: Array<{
  id: BarFilter;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "1", label: "1 bar" },
  { id: "2", label: "2 bars" },
];

const SORT_OPTIONS: Array<{
  id: SortMode;
  label: string;
}> = [
  { id: "library", label: "Library" },
  { id: "title", label: "Title" },
  { id: "difficulty", label: "Difficulty" },
  { id: "bars", label: "Bars" },
];

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  Easy: 0,
  Medium: 1,
  Hard: 2,
};

const FAVORITE_STORAGE_KEY = "guitar-practice-favorite-phrases";

function App() {
  const [bpm, setBpm] = useState(90);
  const [practiceKey, setPracticeKey] = useState<MusicalKey>("A");
  const [scaleMode, setScaleMode] = useState<ScaleMode>("minor");
  const [halfStepDown, setHalfStepDown] = useState(false);
  const [rhythmPattern, setRhythmPattern] =
    useState<RhythmPatternId>("straight-rock");
  const [levels, setLevels] = useState<AudioLevels>({
    master: 0.72,
    drums: 0.9,
    bass: 0.85,
  });
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>("all");
  const [barFilter, setBarFilter] = useState<BarFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("library");
  const [searchTerm, setSearchTerm] = useState("");
  const [favoritePhraseIds, setFavoritePhraseIds] = useState<string[]>(
    getStoredFavoritePhraseIds,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const engineRef = useRef<BackingTrackEngine | null>(null);

  useEffect(() => {
    engineRef.current?.setBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    engineRef.current?.setKey(practiceKey);
  }, [practiceKey]);

  useEffect(() => {
    engineRef.current?.setScaleMode(scaleMode);
  }, [scaleMode]);

  useEffect(() => {
    engineRef.current?.setHalfStepDown(halfStepDown);
  }, [halfStepDown]);

  useEffect(() => {
    engineRef.current?.setRhythmPattern(rhythmPattern);
  }, [rhythmPattern]);

  useEffect(() => {
    engineRef.current?.setLevels(levels);
  }, [levels]);

  useEffect(() => {
    storeFavoritePhraseIds(favoritePhraseIds);
  }, [favoritePhraseIds]);

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
    };
  }, []);

  const favoritePhraseIdSet = useMemo(
    () => new Set(favoritePhraseIds),
    [favoritePhraseIds],
  );

  const visiblePhrases = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return phrases
      .filter((phrase) => {
        const matchesDifficulty =
          difficultyFilter === "all" || phrase.difficulty === difficultyFilter;
        const matchesBars = barFilter === "all" || phrase.bars === Number(barFilter);
        const matchesSearch =
          normalizedSearchTerm.length === 0 ||
          phrase.title.toLowerCase().includes(normalizedSearchTerm) ||
          phrase.memo.toLowerCase().includes(normalizedSearchTerm);

        return matchesDifficulty && matchesBars && matchesSearch;
      })
      .sort((firstPhrase, secondPhrase) => {
        const firstFavorite = favoritePhraseIdSet.has(firstPhrase.id);
        const secondFavorite = favoritePhraseIdSet.has(secondPhrase.id);

        if (firstFavorite !== secondFavorite) {
          return firstFavorite ? -1 : 1;
        }

        switch (sortMode) {
          case "title":
            return firstPhrase.title.localeCompare(secondPhrase.title);
          case "difficulty": {
            const difficultyDifference =
              DIFFICULTY_RANK[firstPhrase.difficulty] -
              DIFFICULTY_RANK[secondPhrase.difficulty];
            return (
              difficultyDifference || firstPhrase.title.localeCompare(secondPhrase.title)
            );
          }
          case "bars":
            return (
              firstPhrase.bars - secondPhrase.bars ||
              firstPhrase.title.localeCompare(secondPhrase.title)
            );
          case "library":
          default:
            return 0;
        }
      });
  }, [barFilter, difficultyFilter, favoritePhraseIdSet, searchTerm, sortMode]);

  const handlePlay = async () => {
    if (engineRef.current) {
      return;
    }

    setAudioError(null);
    const engine = new BackingTrackEngine(bpm, setCurrentStep, {
      key: practiceKey,
      scaleMode,
      halfStepDown,
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

  const toggleFavoritePhrase = (phraseId: string) => {
    setFavoritePhraseIds((currentFavoritePhraseIds) => {
      if (currentFavoritePhraseIds.includes(phraseId)) {
        return currentFavoritePhraseIds.filter((id) => id !== phraseId);
      }

      return [phraseId, ...currentFavoritePhraseIds];
    });
  };

  const currentBeat = Math.floor(currentStep / 4) + 1;
  const rhythmLabel =
    RHYTHM_PATTERNS.find((pattern) => pattern.id === rhythmPattern)?.label ??
    "Straight Rock";
  const keyOffset = KEY_OFFSETS[practiceKey] + getScaleOffset(scaleMode);
  const keyLabel = `${practiceKey} ${scaleMode}`;
  const tuningLabel = halfStepDown ? "Half step down" : "Standard";

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
          <p className="eyebrow">
            {keyLabel} pentatonic / {tuningLabel}
          </p>
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
                {key}
              </option>
            ))}
          </select>
        </label>
        <label className="select-control">
          <span>Scale</span>
          <select
            value={scaleMode}
            onChange={(event) => setScaleMode(event.target.value as ScaleMode)}
          >
            {SCALE_MODES.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>
        <label className="toggle-control">
          <span>Tuning</span>
          <input
            aria-label="Half step down tuning"
            checked={halfStepDown}
            type="checkbox"
            onChange={(event) => setHalfStepDown(event.target.checked)}
          />
          <strong>{halfStepDown ? "Half Down" : "Standard"}</strong>
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

      <section className="library-toolbar" aria-label="Phrase filters">
        <label className="search-control">
          <span>Search</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Phrase or memo"
          />
        </label>
        <label className="select-control">
          <span>Difficulty</span>
          <select
            value={difficultyFilter}
            onChange={(event) =>
              setDifficultyFilter(event.target.value as DifficultyFilter)
            }
          >
            {DIFFICULTY_FILTERS.map((filter) => (
              <option key={filter.id} value={filter.id}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>
        <label className="select-control">
          <span>Bars</span>
          <select
            value={barFilter}
            onChange={(event) => setBarFilter(event.target.value as BarFilter)}
          >
            {BAR_FILTERS.map((filter) => (
              <option key={filter.id} value={filter.id}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>
        <label className="select-control">
          <span>Sort</span>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
          >
            {SORT_OPTIONS.map((sortOption) => (
              <option key={sortOption.id} value={sortOption.id}>
                {sortOption.label}
              </option>
            ))}
          </select>
        </label>
        <div className="result-count" aria-live="polite">
          <span>Showing</span>
          <strong>
            {visiblePhrases.length}/{phrases.length}
          </strong>
        </div>
      </section>

      <section className="phrase-grid" aria-label="Practice phrases">
        {visiblePhrases.length > 0 ? (
          visiblePhrases.map((phrase) => {
            const isFavorite = favoritePhraseIdSet.has(phrase.id);
            const difficultyClass = phrase.difficulty.toLowerCase();

            return (
              <article
                className={`phrase-card ${isFavorite ? "phrase-card-favorite" : ""}`}
                key={phrase.id}
              >
                <div className="phrase-header">
                  <div>
                    <h2>{phrase.title}</h2>
                    <p>{phrase.memo}</p>
                  </div>
                  <span className={`difficulty difficulty-${difficultyClass}`}>
                    {phrase.difficulty}
                  </span>
                  <label className="favorite-control">
                    <input
                      type="checkbox"
                      checked={isFavorite}
                      onChange={() => toggleFavoritePhrase(phrase.id)}
                    />
                    <span>Favorite</span>
                  </label>
                </div>
                <div className="phrase-meta">
                  <span>{keyLabel}</span>
                  <span>{tuningLabel}</span>
                  <span>{phrase.bars} bar{phrase.bars > 1 ? "s" : ""}</span>
                </div>
                <TabNotation
                  compact
                  events={transposeTabEvents(phrase.tabEvents, keyOffset)}
                  totalSteps={phrase.totalSteps}
                  title={phrase.title}
                />
              </article>
            );
          })
        ) : (
          <p className="empty-state">No phrases match the current filters.</p>
        )}
      </section>
    </main>
  );
}

function getStoredFavoritePhraseIds() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(FAVORITE_STORAGE_KEY);
    const parsedValue: unknown = storedValue ? JSON.parse(storedValue) : [];

    return Array.isArray(parsedValue)
      ? parsedValue.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function storeFavoritePhraseIds(favoritePhraseIds: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      FAVORITE_STORAGE_KEY,
      JSON.stringify(favoritePhraseIds),
    );
  } catch {
    // Favorites are optional; ignore storage failures in private browsing modes.
  }
}

function getScaleOffset(scaleMode: ScaleMode) {
  return scaleMode === "major" ? -3 : 0;
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
