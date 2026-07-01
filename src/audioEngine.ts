type StepListener = (step: number) => void;

export type MusicalKey =
  | "A"
  | "A#"
  | "B"
  | "C"
  | "C#"
  | "D"
  | "D#"
  | "E"
  | "F"
  | "F#"
  | "G"
  | "G#";

export type RhythmPatternId = "straight-rock" | "half-time" | "funk-eighths";

export type ScaleMode = "minor" | "major";

export type AudioLevels = {
  master: number;
  drums: number;
  bass: number;
};

export type BackingTrackOptions = {
  key: MusicalKey;
  scaleMode: ScaleMode;
  halfStepDown: boolean;
  rhythmPattern: RhythmPatternId;
  levels: AudioLevels;
  loopSteps: number;
};

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const STEPS_PER_BAR = 16;
const SCHEDULE_AHEAD_SECONDS = 0.12;
const LOOKAHEAD_MS = 25;

const KEY_ROOT_FREQUENCIES: Record<MusicalKey, number> = {
  A: 110,
  "A#": 116.54,
  B: 123.47,
  C: 130.81,
  "C#": 138.59,
  D: 146.83,
  "D#": 155.56,
  E: 164.81,
  F: 174.61,
  "F#": 185,
  G: 196,
  "G#": 207.65,
};

const BASS_INTERVALS: Record<ScaleMode, number[]> = {
  minor: [1, 6 / 5, 4 / 3, 3 / 2, 2],
  major: [1, 5 / 4, 3 / 2, 5 / 3, 2],
};

export class BackingTrackEngine {
  private audioContext: AudioContext | null = null;
  private master: GainNode | null = null;
  private drums: GainNode | null = null;
  private bass: GainNode | null = null;
  private timerId: number | null = null;
  private stepTimeoutIds: number[] = [];
  private nextStepTime = 0;
  private step = 0;
  private loopSteps: number;
  private bpm: number;
  private key: MusicalKey;
  private scaleMode: ScaleMode;
  private halfStepDown: boolean;
  private rhythmPattern: RhythmPatternId;
  private levels: AudioLevels;
  private readonly onStep: StepListener;

  constructor(
    bpm: number,
    onStep: StepListener,
    options: BackingTrackOptions,
  ) {
    this.bpm = bpm;
    this.onStep = onStep;
    this.key = options.key;
    this.scaleMode = options.scaleMode;
    this.halfStepDown = options.halfStepDown;
    this.rhythmPattern = options.rhythmPattern;
    this.levels = options.levels;
    this.loopSteps = normalizeLoopSteps(options.loopSteps);
  }

  async start() {
    if (this.timerId !== null) {
      return;
    }

    const AudioContextConstructor =
      window.AudioContext ?? window.webkitAudioContext;

    if (!AudioContextConstructor) {
      throw new Error("This browser does not support Web Audio API.");
    }

    this.audioContext = new AudioContextConstructor();
    this.master = this.audioContext.createGain();
    this.drums = this.audioContext.createGain();
    this.bass = this.audioContext.createGain();
    this.applyLevels();
    this.drums.connect(this.master);
    this.bass.connect(this.master);
    this.master.connect(this.audioContext.destination);

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    this.step = 0;
    this.nextStepTime = this.audioContext.currentTime + 0.05;
    this.onStep(0);
    this.scheduler();
    this.timerId = window.setInterval(() => this.scheduler(), LOOKAHEAD_MS);
  }

  stop() {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }

    this.stepTimeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    this.stepTimeoutIds = [];
    this.onStep(0);

    const context = this.audioContext;
    this.audioContext = null;
    this.master = null;
    this.drums = null;
    this.bass = null;

    if (context && context.state !== "closed") {
      void context.close();
    }
  }

  setBpm(bpm: number) {
    this.bpm = bpm;
  }

  setKey(key: MusicalKey) {
    this.key = key;
  }

  setScaleMode(scaleMode: ScaleMode) {
    this.scaleMode = scaleMode;
  }

  setHalfStepDown(halfStepDown: boolean) {
    this.halfStepDown = halfStepDown;
  }

  setRhythmPattern(rhythmPattern: RhythmPatternId) {
    this.rhythmPattern = rhythmPattern;
  }

  setLevels(levels: AudioLevels) {
    this.levels = levels;
    this.applyLevels();
  }

  setLoopSteps(loopSteps: number) {
    this.loopSteps = normalizeLoopSteps(loopSteps);
    this.step %= this.loopSteps;
  }

  private applyLevels() {
    if (!this.audioContext || !this.master || !this.drums || !this.bass) {
      return;
    }

    const now = this.audioContext.currentTime;
    this.master.gain.setTargetAtTime(this.levels.master, now, 0.01);
    this.drums.gain.setTargetAtTime(this.levels.drums, now, 0.01);
    this.bass.gain.setTargetAtTime(this.levels.bass, now, 0.01);
  }

  private scheduler() {
    if (!this.audioContext) {
      return;
    }

    while (
      this.nextStepTime <
      this.audioContext.currentTime + SCHEDULE_AHEAD_SECONDS
    ) {
      this.scheduleStep(this.step, this.nextStepTime);
      this.queueStepUpdate(this.step, this.nextStepTime);
      this.nextStepTime += this.getStepDuration();
      this.step = (this.step + 1) % this.loopSteps;
    }
  }

  private scheduleStep(step: number, time: number) {
    const drumPattern = this.getDrumPattern();
    const patternStep = step % STEPS_PER_BAR;

    if (drumPattern.hats.includes(patternStep)) {
      this.scheduleHiHat(time, patternStep % 4 === 0 ? 0.2 : 0.13);
    }

    if (drumPattern.kicks.includes(patternStep)) {
      this.scheduleKick(time);
    }

    if (drumPattern.snares.includes(patternStep)) {
      this.scheduleSnare(time);
    }

    const bassIndex = drumPattern.bass.indexOf(patternStep);
    if (bassIndex >= 0) {
      this.scheduleBass(patternStep, time, bassIndex);
    }
  }

  private queueStepUpdate(step: number, time: number) {
    if (!this.audioContext) {
      return;
    }

    const delay = Math.max(0, (time - this.audioContext.currentTime) * 1000);
    const timeoutId = window.setTimeout(() => this.onStep(step), delay);
    this.stepTimeoutIds.push(timeoutId);
  }

  private getStepDuration() {
    return 60 / this.bpm / 4;
  }

  private getDrumPattern() {
    switch (this.rhythmPattern) {
      case "half-time":
        return {
          hats: [0, 2, 4, 6, 8, 10, 12, 14],
          kicks: [0, 6],
          snares: [8],
          bass: [0, 6, 8, 12],
        };
      case "funk-eighths":
        return {
          hats: [0, 2, 3, 4, 6, 8, 10, 11, 12, 14],
          kicks: [0, 3, 10],
          snares: [4, 12],
          bass: [0, 3, 6, 10, 14],
        };
      case "straight-rock":
      default:
        return {
          hats: [0, 2, 4, 6, 8, 10, 12, 14],
          kicks: [0, 8],
          snares: [4, 12],
          bass: [0, 4, 8, 12],
        };
    }
  }

  private scheduleKick(time: number) {
    if (!this.audioContext || !this.drums) {
      return;
    }

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(120, time);
    oscillator.frequency.exponentialRampToValueAtTime(45, time + 0.12);

    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    oscillator.connect(gain).connect(this.drums);
    oscillator.start(time);
    oscillator.stop(time + 0.18);
  }

  private scheduleSnare(time: number) {
    if (!this.audioContext || !this.drums) {
      return;
    }

    const noise = this.createNoiseSource();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();

    filter.type = "highpass";
    filter.frequency.setValueAtTime(900, time);

    gain.gain.setValueAtTime(0.38, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    noise.connect(filter).connect(gain).connect(this.drums);
    noise.start(time);
    noise.stop(time + 0.13);
  }

  private scheduleHiHat(time: number, level: number) {
    if (!this.audioContext || !this.drums) {
      return;
    }

    const noise = this.createNoiseSource();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();

    filter.type = "highpass";
    filter.frequency.setValueAtTime(6000, time);

    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

    noise.connect(filter).connect(gain).connect(this.drums);
    noise.start(time);
    noise.stop(time + 0.05);
  }

  private scheduleBass(step: number, time: number, bassIndex: number) {
    if (!this.audioContext || !this.bass) {
      return;
    }

    const root =
      KEY_ROOT_FREQUENCIES[this.key] * (this.halfStepDown ? 2 ** (-1 / 12) : 1);
    const scaleIntervals = BASS_INTERVALS[this.scaleMode];
    const interval = scaleIntervals[bassIndex % scaleIntervals.length];
    const note = root * interval;
    const oscillator = this.audioContext.createOscillator();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();
    const duration = this.getStepDuration() * 3.4;

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(note, time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(420, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(0.34, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    oscillator.connect(filter).connect(gain).connect(this.bass);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
  }

  private createNoiseSource() {
    if (!this.audioContext) {
      throw new Error("Audio context is not ready.");
    }

    const bufferSize = this.audioContext.sampleRate * 0.18;
    const buffer = this.audioContext.createBuffer(
      1,
      bufferSize,
      this.audioContext.sampleRate,
    );
    const output = buffer.getChannelData(0);

    for (let index = 0; index < bufferSize; index += 1) {
      output[index] = Math.random() * 2 - 1;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    return source;
  }
}

function normalizeLoopSteps(loopSteps: number) {
  if (!Number.isFinite(loopSteps)) {
    return STEPS_PER_BAR;
  }

  return Math.max(
    STEPS_PER_BAR,
    Math.round(loopSteps / STEPS_PER_BAR) * STEPS_PER_BAR,
  );
}
