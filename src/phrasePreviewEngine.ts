import type { TabDuration, TabEvent, TabTechnique } from "./TabNotation";

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
    const output = this.createAmpChain();

    this.options.events.forEach((event) => {
      const eventTime = startTime + event.step * stepDuration;
      const duration =
        DURATION_STEPS[event.duration] * stepDuration * 0.92;

      event.notes.forEach((note) => {
        const frequency = getFrequency(note.string, note.fret, this.options.halfStepDown);
        const targetFrequency =
          event.notes.length === 1 && event.technique
            ? getFrequency(
                note.string,
                event.technique.toFret,
                this.options.halfStepDown,
              )
            : null;

        if (frequency) {
          this.schedulePluck(
            output,
            frequency,
            targetFrequency,
            event.technique?.type,
            eventTime,
            duration,
            event.notes.length,
          );
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
    targetFrequency: number | null,
    techniqueType: TabTechnique["type"] | undefined,
    time: number,
    duration: number,
    noteCount: number,
  ) {
    if (!this.audioContext) {
      return;
    }

    const mainOscillator = this.audioContext.createOscillator();
    const edgeOscillator = this.audioContext.createOscillator();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();
    const level = Math.min(0.18, 0.28 / noteCount);
    const endTime = time + Math.max(duration, 0.07);

    mainOscillator.type = "sawtooth";
    mainOscillator.frequency.setValueAtTime(frequency, time);
    this.applyTechnique(
      mainOscillator,
      frequency,
      targetFrequency,
      techniqueType,
      time,
      duration,
    );

    edgeOscillator.type = "square";
    edgeOscillator.frequency.setValueAtTime(frequency * 2, time);
    edgeOscillator.detune.setValueAtTime(-7, time);
    this.applyTechnique(
      edgeOscillator,
      frequency * 2,
      targetFrequency ? targetFrequency * 2 : null,
      techniqueType,
      time,
      duration,
    );

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2600, time);
    filter.frequency.exponentialRampToValueAtTime(950, endTime);
    filter.Q.setValueAtTime(1.1, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, endTime);

    mainOscillator.connect(filter);
    edgeOscillator.connect(filter);
    filter.connect(gain).connect(output);
    mainOscillator.start(time);
    edgeOscillator.start(time);
    mainOscillator.stop(endTime + 0.02);
    edgeOscillator.stop(endTime + 0.02);
  }

  private createAmpChain() {
    if (!this.audioContext) {
      throw new Error("Audio context is not ready.");
    }

    const input = this.audioContext.createGain();
    const drive = this.audioContext.createWaveShaper();
    const lowCut = this.audioContext.createBiquadFilter();
    const midPush = this.audioContext.createBiquadFilter();
    const presence = this.audioContext.createBiquadFilter();
    const output = this.audioContext.createGain();

    input.gain.setValueAtTime(1.55, this.audioContext.currentTime);
    drive.curve = createSoftClipCurve(2.8);
    drive.oversample = "2x";

    lowCut.type = "highpass";
    lowCut.frequency.setValueAtTime(90, this.audioContext.currentTime);

    midPush.type = "peaking";
    midPush.frequency.setValueAtTime(900, this.audioContext.currentTime);
    midPush.Q.setValueAtTime(0.9, this.audioContext.currentTime);
    midPush.gain.setValueAtTime(4.5, this.audioContext.currentTime);

    presence.type = "lowpass";
    presence.frequency.setValueAtTime(4200, this.audioContext.currentTime);

    output.gain.setValueAtTime(0.18, this.audioContext.currentTime);

    input.connect(drive).connect(lowCut).connect(midPush).connect(presence);
    presence.connect(output).connect(this.audioContext.destination);

    return input;
  }

  private applyTechnique(
    oscillator: OscillatorNode,
    frequency: number,
    targetFrequency: number | null,
    techniqueType: TabTechnique["type"] | undefined,
    time: number,
    duration: number,
  ) {
    if (!targetFrequency) {
      return;
    }

    const transitionStart = time + Math.max(duration * 0.42, 0.035);
    const transitionEnd =
      techniqueType === "slide"
        ? time + Math.max(duration * 0.86, 0.08)
        : transitionStart + 0.018;

    oscillator.frequency.setValueAtTime(frequency, transitionStart);
    oscillator.frequency.exponentialRampToValueAtTime(
      targetFrequency,
      transitionEnd,
    );
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

function createSoftClipCurve(amount: number) {
  const sampleCount = 512;
  const curve = new Float32Array(sampleCount);

  for (let index = 0; index < sampleCount; index += 1) {
    const x = (index * 2) / sampleCount - 1;
    curve[index] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }

  return curve;
}
