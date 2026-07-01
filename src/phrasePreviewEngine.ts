import type { TabDuration, TabEvent } from "./TabNotation";

type PreviewOptions = {
  bpm: number;
  halfStepDown: boolean;
  events: TabEvent[];
  totalSteps: number;
  onEnded: () => void;
};

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const STRING_OPEN_MIDI: Record<1 | 2 | 3 | 4 | 5 | 6, number> = {
  1: 64,
  2: 59,
  3: 55,
  4: 50,
  5: 45,
  6: 40,
};

const DURATION_STEPS: Record<TabDuration, number> = {
  quarter: 4,
  eighth: 2,
  sixteenth: 1,
};

export class PhrasePreviewEngine {
  private audioContext: AudioContext | null = null;
  private endedTimeoutId: number | null = null;
  private readonly options: PreviewOptions;

  constructor(options: PreviewOptions) {
    this.options = options;
  }

  async start() {
    const AudioContextConstructor =
      window.AudioContext ?? window.webkitAudioContext;

    if (!AudioContextConstructor) {
      throw new Error("This browser does not support Web Audio API.");
    }

    this.audioContext = new AudioContextConstructor();

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    const startTime = this.audioContext.currentTime + 0.05;
    const stepDuration = 60 / this.options.bpm / 4;
    const output = this.audioContext.createGain();
    output.gain.setValueAtTime(0.24, this.audioContext.currentTime);
    output.connect(this.audioContext.destination);

    this.options.events.forEach((event) => {
      const eventTime = startTime + event.step * stepDuration;
      const duration =
        DURATION_STEPS[event.duration] * stepDuration * 0.92;

      event.notes.forEach((note) => {
        const frequency = getFrequency(note.string, note.fret, this.options.halfStepDown);

        if (frequency) {
          this.schedulePluck(output, frequency, eventTime, duration, event.notes.length);
        }
      });
    });

    const totalDuration = this.options.totalSteps * stepDuration + 0.35;
    this.endedTimeoutId = window.setTimeout(() => {
      this.stop(false);
      this.options.onEnded();
    }, totalDuration * 1000);
  }

  stop(callEnded = true) {
    if (this.endedTimeoutId !== null) {
      window.clearTimeout(this.endedTimeoutId);
      this.endedTimeoutId = null;
    }

    const context = this.audioContext;
    this.audioContext = null;

    if (context && context.state !== "closed") {
      void context.close();
    }

    if (callEnded) {
      this.options.onEnded();
    }
  }

  private schedulePluck(
    output: GainNode,
    frequency: number,
    time: number,
    duration: number,
    noteCount: number,
  ) {
    if (!this.audioContext) {
      return;
    }

    const oscillator = this.audioContext.createOscillator();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();
    const level = Math.min(0.22, 0.32 / noteCount);
    const endTime = time + Math.max(duration, 0.07);

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, time);
    filter.frequency.exponentialRampToValueAtTime(600, endTime);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, endTime);

    oscillator.connect(filter).connect(gain).connect(output);
    oscillator.start(time);
    oscillator.stop(endTime + 0.02);
  }
}

function getFrequency(
  string: 1 | 2 | 3 | 4 | 5 | 6,
  fretText: string,
  halfStepDown: boolean,
) {
  const fret = Number(fretText);

  if (!Number.isFinite(fret)) {
    return null;
  }

  const midi = STRING_OPEN_MIDI[string] + fret + (halfStepDown ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}
