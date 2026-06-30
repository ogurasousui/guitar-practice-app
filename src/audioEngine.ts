type StepListener = (step: number) => void;

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const STEPS_PER_BAR = 16;
const SCHEDULE_AHEAD_SECONDS = 0.12;
const LOOKAHEAD_MS = 25;

export class BackingTrackEngine {
  private audioContext: AudioContext | null = null;
  private master: GainNode | null = null;
  private timerId: number | null = null;
  private stepTimeoutIds: number[] = [];
  private nextStepTime = 0;
  private step = 0;
  private bpm: number;
  private readonly onStep: StepListener;

  constructor(bpm: number, onStep: StepListener) {
    this.bpm = bpm;
    this.onStep = onStep;
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
    this.master.gain.value = 0.72;
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

    if (context && context.state !== "closed") {
      void context.close();
    }
  }

  setBpm(bpm: number) {
    this.bpm = bpm;
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
      this.step = (this.step + 1) % STEPS_PER_BAR;
    }
  }

  private scheduleStep(step: number, time: number) {
    if (step % 2 === 0) {
      this.scheduleHiHat(time);
    }

    if (step === 0 || step === 8) {
      this.scheduleKick(time);
    }

    if (step === 4 || step === 12) {
      this.scheduleSnare(time);
    }

    if (step % 4 === 0) {
      this.scheduleBass(step, time);
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

  private scheduleKick(time: number) {
    if (!this.audioContext || !this.master) {
      return;
    }

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(120, time);
    oscillator.frequency.exponentialRampToValueAtTime(45, time + 0.12);

    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    oscillator.connect(gain).connect(this.master);
    oscillator.start(time);
    oscillator.stop(time + 0.18);
  }

  private scheduleSnare(time: number) {
    if (!this.audioContext || !this.master) {
      return;
    }

    const noise = this.createNoiseSource();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();

    filter.type = "highpass";
    filter.frequency.setValueAtTime(900, time);

    gain.gain.setValueAtTime(0.38, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    noise.connect(filter).connect(gain).connect(this.master);
    noise.start(time);
    noise.stop(time + 0.13);
  }

  private scheduleHiHat(time: number) {
    if (!this.audioContext || !this.master) {
      return;
    }

    const noise = this.createNoiseSource();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();

    filter.type = "highpass";
    filter.frequency.setValueAtTime(6000, time);

    gain.gain.setValueAtTime(0.16, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

    noise.connect(filter).connect(gain).connect(this.master);
    noise.start(time);
    noise.stop(time + 0.05);
  }

  private scheduleBass(step: number, time: number) {
    if (!this.audioContext || !this.master) {
      return;
    }

    const pattern = [110, 130.81, 146.83, 164.81];
    const note = pattern[(step / 4) % pattern.length];
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

    oscillator.connect(filter).connect(gain).connect(this.master);
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
