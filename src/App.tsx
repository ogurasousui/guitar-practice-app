import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackingTrackEngine,
  type AudioLevels,
  type MusicalKey,
  type RhythmPatternId,
  type ScaleMode,
} from "./audioEngine";
import { PhrasePreviewEngine } from "./phrasePreviewEngine";
import { phrases, type Difficulty } from "./phrases";
import TabNotation, { type TabEvent } from "./TabNotation";

type DifficultyFilter = "all" | Difficulty;
type BarFilter = "all" | "1" | "2";
type SortMode = "library" | "title" | "difficulty" | "bars";
type ViewMode = "detail" | "compact";
type PracticeSettings = {
  bpm: number;
  practiceKey: MusicalKey;
  scaleMode: ScaleMode;
  halfStepDown: boolean;
  rhythmPattern: RhythmPatternId;
  levels: AudioLevels;
  difficultyFilter: DifficultyFilter;
  barFilter: BarFilter;
  sortMode: SortMode;
  viewMode: ViewMode;
  selectedPhraseId: string;
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

const VIEW_OPTIONS: Array<{
  id: ViewMode;
  label: string;
}> = [
  { id: "detail", label: "Detail" },
  { id: "compact", label: "Compact" },
];

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  Easy: 0,
  Medium: 1,
  Hard: 2,
};

const FAVORITE_STORAGE_KEY = "guitar-practice-favorite-phrases";
const PRACTICE_SETTINGS_STORAGE_KEY = "guitar-practice-settings";
const DEFAULT_PRACTICE_SETTINGS: PracticeSettings = {
  bpm: 90,
  practiceKey: "A",
  scaleMode: "minor",
  halfStepDown: false,
  rhythmPattern: "straight-rock",
  levels: {
    master: 0.72,
    drums: 0.9,
    bass: 0.85,
  },
  difficultyFilter: "all",
  barFilter: "all",
  sortMode: "library",
  viewMode: "detail",
  selectedPhraseId: phrases[0]?.id ?? "",
};

function App() {
  const [practiceSettings, setPracticeSettings] = useState<PracticeSettings>(
    getStoredPracticeSettings,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [favoritePhraseIds, setFavoritePhraseIds] = useState<string[]>(
    getStoredFavoritePhraseIds,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewingPhraseId, setPreviewingPhraseId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const engineRef = useRef<BackingTrackEngine | null>(null);
  const previewEngineRef = useRef<PhrasePreviewEngine | null>(null);
  const {
    bpm,
    practiceKey,
    scaleMode,
    halfStepDown,
    rhythmPattern,
    levels,
    difficultyFilter,
    barFilter,
    sortMode,
    viewMode,
    selectedPhraseId,
  } = practiceSettings;
  const selectedPhrase =
    phrases.find((phrase) => phrase.id === selectedPhraseId) ?? phrases[0]!;

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
    engineRef.current?.setLoopSteps(selectedPhrase.totalSteps);
  }, [selectedPhrase.totalSteps]);

  useEffect(() => {
    storePracticeSettings(practiceSettings);
  }, [practiceSettings]);

  useEffect(() => {
    storeFavoritePhraseIds(favoritePhraseIds);
  }, [favoritePhraseIds]);

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      previewEngineRef.current?.stop(false);
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

  const handlePlay = useCallback(async () => {
    if (engineRef.current) {
      return;
    }

    setAudioError(null);
    previewEngineRef.current?.stop(false);
    previewEngineRef.current = null;
    setPreviewingPhraseId(null);

    const engine = new BackingTrackEngine(bpm, setCurrentStep, {
      key: practiceKey,
      scaleMode,
      halfStepDown,
      rhythmPattern,
      levels,
      loopSteps: selectedPhrase.totalSteps,
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
  }, [
    bpm,
    halfStepDown,
    levels,
    practiceKey,
    rhythmPattern,
    scaleMode,
    selectedPhrase.totalSteps,
  ]);

  const handleStop = useCallback(() => {
    engineRef.current?.stop();
    engineRef.current = null;
    setIsPlaying(false);
    setCurrentStep(0);
  }, []);

  const handlePreview = useCallback(
    async (phraseId: string, events: TabEvent[], totalSteps: number) => {
      if (previewingPhraseId === phraseId) {
        previewEngineRef.current?.stop();
        previewEngineRef.current = null;
        return;
      }

      setAudioError(null);
      previewEngineRef.current?.stop(false);
      previewEngineRef.current = null;

      const previewEngine = new PhrasePreviewEngine({
        bpm,
        halfStepDown,
        events,
        totalSteps,
        onEnded: () => {
          previewEngineRef.current = null;
          setPreviewingPhraseId((currentPhraseId) =>
            currentPhraseId === phraseId ? null : currentPhraseId,
          );
        },
      });
      previewEngineRef.current = previewEngine;
      setPreviewingPhraseId(phraseId);

      try {
        await previewEngine.start();
      } catch (error) {
        previewEngine.stop(false);
        previewEngineRef.current = null;
        setPreviewingPhraseId(null);
        setAudioError(
          error instanceof Error ? error.message : "Could not preview phrase.",
        );
      }
    },
    [bpm, halfStepDown, previewingPhraseId],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || isKeyboardInputTarget(event.target)) {
        return;
      }

      event.preventDefault();

      if (engineRef.current) {
        handleStop();
      } else {
        void handlePlay();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePlay, handleStop]);

  const toggleFavoritePhrase = (phraseId: string) => {
    setFavoritePhraseIds((currentFavoritePhraseIds) => {
      if (currentFavoritePhraseIds.includes(phraseId)) {
        return currentFavoritePhraseIds.filter((id) => id !== phraseId);
      }

      return [phraseId, ...currentFavoritePhraseIds];
    });
  };

  const currentBar = Math.floor(currentStep / 16) + 1;
  const currentBeat = Math.floor((currentStep % 16) / 4) + 1;
  const selectedPhraseBars = Math.max(selectedPhrase.bars, 1);
  const rhythmLabel =
    RHYTHM_PATTERNS.find((pattern) => pattern.id === rhythmPattern)?.label ??
    "Straight Rock";
  const keyOffset = KEY_OFFSETS[practiceKey] + getScaleOffset(scaleMode);
  const keyLabel = `${practiceKey} ${scaleMode}`;
  const tuningLabel = halfStepDown ? "Half step down" : "Standard";
  const isCompactView = viewMode === "compact";

  const updatePracticeSettings = (settings: Partial<PracticeSettings>) => {
    setPracticeSettings((currentSettings) => ({
      ...currentSettings,
      ...settings,
    }));
  };

  const updateLevel = (level: keyof AudioLevels, value: number) => {
    setPracticeSettings((currentSettings) => ({
      ...currentSettings,
      levels: {
        ...currentSettings.levels,
        [level]: value,
      },
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
              onChange={(event) =>
                updatePracticeSettings({ bpm: Number(event.target.value) })
              }
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
            onChange={(event) =>
              updatePracticeSettings({
                practiceKey: event.target.value as MusicalKey,
              })
            }
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
            onChange={(event) =>
              updatePracticeSettings({
                scaleMode: event.target.value as ScaleMode,
              })
            }
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
            onChange={(event) =>
              updatePracticeSettings({ halfStepDown: event.target.checked })
            }
          />
          <strong>{halfStepDown ? "Half Down" : "Standard"}</strong>
        </label>
        <label className="select-control">
          <span>Rhythm</span>
          <select
            value={rhythmPattern}
            onChange={(event) =>
              updatePracticeSettings({
                rhythmPattern: event.target.value as RhythmPatternId,
              })
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
          <strong>
            {isPlaying
              ? `Bar ${currentBar}/${selectedPhraseBars} beat ${currentBeat}/4`
              : `${selectedPhraseBars} bar loop`}
          </strong>
        </div>
        <div>
          <span className="meter-label">Phrase</span>
          <strong>{selectedPhrase.title}</strong>
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
              updatePracticeSettings({
                difficultyFilter: event.target.value as DifficultyFilter,
              })
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
            onChange={(event) =>
              updatePracticeSettings({ barFilter: event.target.value as BarFilter })
            }
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
            onChange={(event) =>
              updatePracticeSettings({ sortMode: event.target.value as SortMode })
            }
          >
            {SORT_OPTIONS.map((sortOption) => (
              <option key={sortOption.id} value={sortOption.id}>
                {sortOption.label}
              </option>
            ))}
          </select>
        </label>
        <label className="select-control">
          <span>View</span>
          <select
            value={viewMode}
            onChange={(event) =>
              updatePracticeSettings({ viewMode: event.target.value as ViewMode })
            }
          >
            {VIEW_OPTIONS.map((viewOption) => (
              <option key={viewOption.id} value={viewOption.id}>
                {viewOption.label}
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

      <section
        className={`phrase-grid ${isCompactView ? "phrase-grid-compact" : ""}`}
        aria-label="Practice phrases"
      >
        {visiblePhrases.length > 0 ? (
          visiblePhrases.map((phrase) => {
            const isFavorite = favoritePhraseIdSet.has(phrase.id);
            const isSelected = phrase.id === selectedPhrase.id;
            const isPreviewing = phrase.id === previewingPhraseId;
            const difficultyClass = phrase.difficulty.toLowerCase();
            const transposedEvents = transposeTabEvents(phrase.tabEvents, keyOffset);

            return (
              <article
                className={`phrase-card ${isCompactView ? "phrase-card-compact" : ""} ${
                  isFavorite ? "phrase-card-favorite" : ""
                } ${isSelected ? "phrase-card-selected" : ""}`}
                key={phrase.id}
              >
                <div className="phrase-header">
                  <div>
                    <h2>{phrase.title}</h2>
                    {!isCompactView ? <p>{phrase.memo}</p> : null}
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
                    <span>{isCompactView ? "Fav" : "Favorite"}</span>
                  </label>
                  <div className="phrase-action-row">
                    <button
                      className="practice-select-button"
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() =>
                        updatePracticeSettings({ selectedPhraseId: phrase.id })
                      }
                    >
                      {isSelected ? "Practicing" : "Practice"}
                    </button>
                    <button
                      className="preview-button"
                      type="button"
                      aria-pressed={isPreviewing}
                      onClick={() =>
                        void handlePreview(
                          phrase.id,
                          transposedEvents,
                          phrase.totalSteps,
                        )
                      }
                    >
                      {isPreviewing ? "Stop" : "Preview"}
                    </button>
                  </div>
                </div>
                {!isCompactView ? (
                  <div className="phrase-meta">
                    <span>{keyLabel}</span>
                    <span>{tuningLabel}</span>
                    <span>{phrase.bars} bar{phrase.bars > 1 ? "s" : ""}</span>
                  </div>
                ) : null}
                <TabNotation
                  compact={isCompactView}
                  events={transposedEvents}
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

function getStoredPracticeSettings(): PracticeSettings {
  if (typeof window === "undefined") {
    return DEFAULT_PRACTICE_SETTINGS;
  }

  try {
    const storedValue = window.localStorage.getItem(PRACTICE_SETTINGS_STORAGE_KEY);
    const parsedValue: unknown = storedValue ? JSON.parse(storedValue) : null;

    if (!isRecord(parsedValue)) {
      return DEFAULT_PRACTICE_SETTINGS;
    }

    const levels = isRecord(parsedValue.levels) ? parsedValue.levels : {};

    return {
      bpm: normalizeNumber(parsedValue.bpm, 60, 160, DEFAULT_PRACTICE_SETTINGS.bpm),
      practiceKey: isMusicalKey(parsedValue.practiceKey)
        ? parsedValue.practiceKey
        : DEFAULT_PRACTICE_SETTINGS.practiceKey,
      scaleMode: isScaleMode(parsedValue.scaleMode)
        ? parsedValue.scaleMode
        : DEFAULT_PRACTICE_SETTINGS.scaleMode,
      halfStepDown:
        typeof parsedValue.halfStepDown === "boolean"
          ? parsedValue.halfStepDown
          : DEFAULT_PRACTICE_SETTINGS.halfStepDown,
      rhythmPattern: isRhythmPatternId(parsedValue.rhythmPattern)
        ? parsedValue.rhythmPattern
        : DEFAULT_PRACTICE_SETTINGS.rhythmPattern,
      levels: {
        master: normalizeNumber(
          levels.master,
          0,
          1,
          DEFAULT_PRACTICE_SETTINGS.levels.master,
        ),
        drums: normalizeNumber(
          levels.drums,
          0,
          1,
          DEFAULT_PRACTICE_SETTINGS.levels.drums,
        ),
        bass: normalizeNumber(
          levels.bass,
          0,
          1,
          DEFAULT_PRACTICE_SETTINGS.levels.bass,
        ),
      },
      difficultyFilter: isDifficultyFilter(parsedValue.difficultyFilter)
        ? parsedValue.difficultyFilter
        : DEFAULT_PRACTICE_SETTINGS.difficultyFilter,
      barFilter: isBarFilter(parsedValue.barFilter)
        ? parsedValue.barFilter
        : DEFAULT_PRACTICE_SETTINGS.barFilter,
      sortMode: isSortMode(parsedValue.sortMode)
        ? parsedValue.sortMode
        : DEFAULT_PRACTICE_SETTINGS.sortMode,
      viewMode: isViewMode(parsedValue.viewMode)
        ? parsedValue.viewMode
        : DEFAULT_PRACTICE_SETTINGS.viewMode,
      selectedPhraseId: isPhraseId(parsedValue.selectedPhraseId)
        ? parsedValue.selectedPhraseId
        : DEFAULT_PRACTICE_SETTINGS.selectedPhraseId,
    };
  } catch {
    return DEFAULT_PRACTICE_SETTINGS;
  }
}

function storePracticeSettings(practiceSettings: PracticeSettings) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      PRACTICE_SETTINGS_STORAGE_KEY,
      JSON.stringify(practiceSettings),
    );
  } catch {
    // Practice settings are recoverable; ignore storage failures in private browsing modes.
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(value, min), max);
}

function isMusicalKey(value: unknown): value is MusicalKey {
  return KEY_OPTIONS.includes(value as MusicalKey);
}

function isScaleMode(value: unknown): value is ScaleMode {
  return SCALE_MODES.some((mode) => mode.id === value);
}

function isRhythmPatternId(value: unknown): value is RhythmPatternId {
  return RHYTHM_PATTERNS.some((pattern) => pattern.id === value);
}

function isDifficultyFilter(value: unknown): value is DifficultyFilter {
  return DIFFICULTY_FILTERS.some((filter) => filter.id === value);
}

function isBarFilter(value: unknown): value is BarFilter {
  return BAR_FILTERS.some((filter) => filter.id === value);
}

function isSortMode(value: unknown): value is SortMode {
  return SORT_OPTIONS.some((sortOption) => sortOption.id === value);
}

function isViewMode(value: unknown): value is ViewMode {
  return VIEW_OPTIONS.some((viewOption) => viewOption.id === value);
}

function isPhraseId(value: unknown): value is string {
  return typeof value === "string" && phrases.some((phrase) => phrase.id === value);
}

function isKeyboardInputTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "select" ||
    tagName === "textarea" ||
    tagName === "button"
  );
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
