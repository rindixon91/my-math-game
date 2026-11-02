import { AudioSettings } from './GameState';

interface TrackedAudioNode {
  source: AudioScheduledSourceNode;
  gain: GainNode;
}

/**
 * Procedural Web Audio API Sound & Ambience Engine
 * Provides zero-dependency synthesized character audio, ruler snaps,
 * Principal warning/pursuit/detention countdown audio, Playtime jump-rope cues,
 * Bully SFX, and school/horror ambience with zero overlapping playback.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private settings: AudioSettings = {
    masterVolume: 0.8,
    musicVolume: 0.55,
    sfxVolume: 0.85,
    muted: false,
  };

  private musicTimer: number | null = null;
  private musicMode: 'NONE' | 'SCHOOL' | 'HORROR' | 'PURSUIT' = 'NONE';
  private musicStep = 0;
  private simulationPaused = false;

  private detentionCountdownActive = false;
  private lastDetentionTickSecond = -1;

  private activeMusicNodes = new Set<TrackedAudioNode>();
  private activeDetentionNodes = new Set<TrackedAudioNode>();

  // Diagnostic telemetry counters (non-UI)
  private warningPlayCount = 0;
  private pursuitStartCount = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && !this.compressor) {
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-14, this.ctx.currentTime);
      comp.knee.setValueAtTime(12, this.ctx.currentTime);
      comp.ratio.setValueAtTime(4, this.ctx.currentTime);
      comp.attack.setValueAtTime(0.003, this.ctx.currentTime);
      comp.release.setValueAtTime(0.16, this.ctx.currentTime);
      comp.connect(this.ctx.destination);
      this.compressor = comp;
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getOutputNode(ctx: AudioContext): AudioNode {
    return this.compressor ?? ctx.destination;
  }

  private trackNode(
    bucket: Set<TrackedAudioNode>,
    source: AudioScheduledSourceNode,
    gain: GainNode
  ): void {
    const entry: TrackedAudioNode = { source, gain };
    bucket.add(entry);
    source.onended = () => {
      bucket.delete(entry);
    };
  }

  private fadeAndStopTrackedNodes(bucket: Set<TrackedAudioNode>): void {
    if (bucket.size === 0) return;
    const now = this.ctx ? this.ctx.currentTime : 0;
    for (const entry of bucket) {
      try {
        if (this.ctx) {
          entry.gain.gain.cancelScheduledValues(now);
          entry.gain.gain.setValueAtTime(Math.max(0.0001, entry.gain.gain.value || 0.01), now);
          entry.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
          entry.source.stop(now + 0.025);
        } else {
          entry.source.stop();
        }
      } catch {
        // Source already stopped
      }
    }
    bucket.clear();
  }

  public unlock(): void {
    this.ensureContext();
  }

  public applySettings(settings: AudioSettings): void {
    this.settings = { ...settings };
    if (this.settings.muted) {
      this.fadeAndStopTrackedNodes(this.activeMusicNodes);
      this.fadeAndStopTrackedNodes(this.activeDetentionNodes);
    }
  }

  public setSimulationPaused(paused: boolean): void {
    if (this.simulationPaused === paused) return;
    this.simulationPaused = paused;
    if (paused) {
      this.fadeAndStopTrackedNodes(this.activeMusicNodes);
      this.fadeAndStopTrackedNodes(this.activeDetentionNodes);
    } else if (this.detentionCountdownActive && !this.settings.muted) {
      this.startDetentionRoomBed();
    }
  }

  public getMusicMode(): 'NONE' | 'SCHOOL' | 'HORROR' | 'PURSUIT' {
    return this.musicMode;
  }

  public isDetentionCountdownRunning(): boolean {
    return this.detentionCountdownActive;
  }

  public getLastDetentionTickSecond(): number {
    return this.lastDetentionTickSecond;
  }

  public getWarningPlayCount(): number {
    return this.warningPlayCount;
  }

  public getPursuitStartCount(): number {
    return this.pursuitStartCount;
  }

  private getSfxGain(distanceScale = 1): number {
    if (this.settings.muted) return 0;
    return Math.max(
      0,
      Math.min(1, this.settings.masterVolume * this.settings.sfxVolume * distanceScale)
    );
  }

  private getMusicGain(): number {
    if (this.settings.muted) return 0;
    return Math.max(0, Math.min(1, this.settings.masterVolume * this.settings.musicVolume));
  }

  public startSchoolMusic(): void {
    if (this.musicMode === 'SCHOOL') return;
    this.stopMusic();
    this.musicMode = 'SCHOOL';
    this.musicStep = 0;

    // Quirky retro 90s edutainment classroom melody
    const notes = [261.63, 329.63, 392.0, 329.63, 293.66, 349.23, 392.0, 293.66];
    this.musicTimer = window.setInterval(() => {
      if (this.simulationPaused) return;
      const gainVal = this.getMusicGain() * 0.08;
      if (gainVal <= 0.001) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const freq = notes[this.musicStep % notes.length];
      this.musicStep++;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.34);
      osc.connect(gain);
      gain.connect(this.getOutputNode(ctx));
      this.trackNode(this.activeMusicNodes, osc, gain);
      osc.start(now);
      osc.stop(now + 0.36);
    }, 440);
  }

  /**
   * PRINCIPAL PURSUIT: Intense, fast-paced driving chase music.
   * Starts immediately on Beat 0 and loops continuously without restarting mid-chase.
   */
  public startPrincipalPursuitMusic(): void {
    if (this.musicMode === 'PURSUIT') return;
    this.stopMusic();
    this.musicMode = 'PURSUIT';
    this.musicStep = 0;
    this.pursuitStartCount += 1;

    const bassLine = [73.42, 73.42, 87.31, 98.0, 110.0, 116.54, 110.0, 87.31];
    const leadMotif = [293.66, 349.23, 440.0, 466.16, 440.0, 392.0, 349.23, 329.63];

    const playPursuitBeat = () => {
      if (this.simulationPaused || this.musicMode !== 'PURSUIT') return;
      const baseMusicGain = this.getMusicGain();
      if (baseMusicGain <= 0.001) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const step = this.musicStep++;
      // Slightly duck the first 2 steps (~290ms) so the initial warning whistle cuts cleanly on top
      const introDuck = step < 2 ? 0.68 : 1.0;

      // 1. Driving fast-paced bass pulse
      const bassFreq = bassLine[step % bassLine.length];
      const bassOsc = ctx.createOscillator();
      const bassFilter = ctx.createBiquadFilter();
      const bassGain = ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bassFreq, now);
      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(480 + (step % 2) * 160, now);

      const bLevel = baseMusicGain * 0.135 * introDuck;
      bassGain.gain.setValueAtTime(bLevel, now);
      bassGain.gain.exponentialRampToValueAtTime(0.0009, now + 0.125);

      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(this.getOutputNode(ctx));
      this.trackNode(this.activeMusicNodes, bassOsc, bassGain);
      bassOsc.start(now);
      bassOsc.stop(now + 0.13);

      // 2. Urgent staccato chase lead on alternating steps
      if (step % 2 === 0) {
        const leadIdx = Math.floor(step / 2) % leadMotif.length;
        const leadOsc = ctx.createOscillator();
        const leadGain = ctx.createGain();
        leadOsc.type = 'triangle';
        leadOsc.frequency.setValueAtTime(leadMotif[leadIdx], now);

        const lLevel = baseMusicGain * 0.085 * introDuck;
        leadGain.gain.setValueAtTime(lLevel, now);
        leadGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.105);

        leadOsc.connect(leadGain);
        leadGain.connect(this.getOutputNode(ctx));
        this.trackNode(this.activeMusicNodes, leadOsc, leadGain);
        leadOsc.start(now);
        leadOsc.stop(now + 0.11);
      }
    };

    // Immediate transition: fire Beat 0 right away with zero delay, then continue at 145ms
    playPursuitBeat();
    this.musicTimer = window.setInterval(playPursuitBeat, 145);
  }

  public startHorrorEscapeMusic(): void {
    if (this.musicMode === 'HORROR') return;
    this.stopMusic();
    this.musicMode = 'HORROR';
    this.musicStep = 0;

    // Urgent dark synth bassline & dissonant alarm pulse for Final Escape
    const bassNotes = [65.41, 65.41, 61.74, 65.41, 73.42, 61.74, 58.27, 61.74];
    this.musicTimer = window.setInterval(() => {
      if (this.simulationPaused) return;
      const gainVal = this.getMusicGain() * 0.16;
      if (gainVal <= 0.001) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const freq = bassNotes[this.musicStep % bassNotes.length];
      const step = this.musicStep++;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(340 + (step % 2) * 180, now);

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.21);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.getOutputNode(ctx));
      this.trackNode(this.activeMusicNodes, osc, gain);
      osc.start(now);
      osc.stop(now + 0.22);
    }, 230);
  }

  public stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.fadeAndStopTrackedNodes(this.activeMusicNodes);
    this.musicMode = 'NONE';
  }

  public stopAllGameplayAudio(): void {
    this.stopDetentionCountdown();
    this.stopMusic();
    this.simulationPaused = false;
  }

  /**
   * PRINCIPAL INITIAL DETECTION: Distinctive sharp hall-monitor referee whistle + alert sting.
   * Clearly audible over school ambience without excessive volume.
   */
  public playPrincipalWarning(): void {
    this.warningPlayCount += 1;
    const vol = this.getSfxGain(0.66);
    if (vol <= 0.002) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const out = this.getOutputNode(ctx);

    // Two-burst pea-whistle alert (short sharp chirp -> sustained authoritative blast)
    const bursts = [
      { start: 0, dur: 0.095, freqA: 987.77, freqB: 1046.5 },
      { start: 0.125, dur: 0.19, freqA: 1174.66, freqB: 1318.51 },
    ];

    for (const b of bursts) {
      const t0 = now + b.start;
      const carrier = ctx.createOscillator();
      const trillLfo = ctx.createOscillator();
      const trillDepth = ctx.createGain();
      const gain = ctx.createGain();

      carrier.type = 'triangle';
      carrier.frequency.setValueAtTime(b.freqA, t0);
      carrier.frequency.linearRampToValueAtTime(b.freqB, t0 + b.dur * 0.45);

      // 38 Hz pea-whistle modulation
      trillLfo.type = 'sine';
      trillLfo.frequency.setValueAtTime(38, t0);
      trillDepth.gain.setValueAtTime(34, t0);
      trillLfo.connect(trillDepth);
      trillDepth.connect(carrier.frequency);

      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(vol * 0.48, t0 + 0.015);
      gain.gain.setValueAtTime(vol * 0.44, t0 + b.dur - 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0008, t0 + b.dur);

      carrier.connect(gain);
      gain.connect(out);
      carrier.start(t0);
      trillLfo.start(t0);
      carrier.stop(t0 + b.dur + 0.01);
      trillLfo.stop(t0 + b.dur + 0.01);
    }

    // Crisp mid-range brassy alert accent underneath so warning reads unmistakably
    const accent = ctx.createOscillator();
    const accentGain = ctx.createGain();
    accent.type = 'square';
    accent.frequency.setValueAtTime(440, now);
    accent.frequency.setValueAtTime(587.33, now + 0.125);
    accentGain.gain.setValueAtTime(vol * 0.18, now);
    accentGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.31);
    accent.connect(accentGain);
    accentGain.connect(out);
    accent.start(now);
    accent.stop(now + 0.32);
  }

  private startDetentionRoomBed(): void {
    const vol = this.getSfxGain(0.18);
    if (vol <= 0.002) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const humOsc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    humOsc.type = 'triangle';
    humOsc.frequency.setValueAtTime(110, now);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(210, now);

    gain.gain.setValueAtTime(0.0008, now);
    gain.gain.linearRampToValueAtTime(vol * 0.16, now + 0.12);

    humOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.getOutputNode(ctx));
    this.trackNode(this.activeDetentionNodes, humOsc, gain);
    humOsc.start(now);
  }

  /**
   * DETENTION COUNTDOWN: Starts synchronised detention clock countdown & subtle room hum.
   */
  public startDetentionCountdown(initialWholeSeconds = 10): void {
    this.stopDetentionCountdown();
    this.stopMusic();
    this.detentionCountdownActive = true;
    this.lastDetentionTickSecond = -1;

    if (!this.simulationPaused && !this.settings.muted) {
      this.startDetentionRoomBed();
    }
    this.syncDetentionCountdownTick(initialWholeSeconds);
  }

  /**
   * Synchronised 1:1 with each integer second (10 -> 9 -> ... -> 1) of the Detention timer.
   * Never plays duplicate ticks for the same second and stops cleanly at 0.
   */
  public syncDetentionCountdownTick(remainingWholeSeconds: number): void {
    if (!this.detentionCountdownActive) return;
    if (remainingWholeSeconds <= 0 || remainingWholeSeconds === this.lastDetentionTickSecond) {
      return;
    }
    this.lastDetentionTickSecond = remainingWholeSeconds;

    if (this.simulationPaused) return;
    const vol = this.getSfxGain(0.62);
    if (vol <= 0.002) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const out = this.getOutputNode(ctx);
    const isEven = remainingWholeSeconds % 2 === 0;
    const isFinalThree = remainingWholeSeconds <= 3;

    // 1. Crisp institutional wall-clock tick/tock transient
    const clickSamples = Math.floor(ctx.sampleRate * 0.035);
    const clickBuf = ctx.createBuffer(1, clickSamples, ctx.sampleRate);
    const data = clickBuf.getChannelData(0);
    for (let i = 0; i < clickSamples; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / clickSamples, 3.2);
    }
    const clickSrc = ctx.createBufferSource();
    clickSrc.buffer = clickBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(isEven ? 2150 : 1620, now);
    bp.Q.setValueAtTime(3.5, now);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(vol * 0.52, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.035);

    clickSrc.connect(bp);
    bp.connect(clickGain);
    clickGain.connect(out);
    this.trackNode(this.activeDetentionNodes, clickSrc, clickGain);
    clickSrc.start(now);

    // 2. Synchronised countdown timer tone (steps up on final 3..2..1 seconds)
    let toneFreq = isEven ? 523.25 : 440.0;
    if (isFinalThree) {
      toneFreq = remainingWholeSeconds === 3 ? 587.33 : remainingWholeSeconds === 2 ? 659.25 : 783.99;
    }

    const toneOsc = ctx.createOscillator();
    const toneGain = ctx.createGain();
    toneOsc.type = isFinalThree ? 'square' : 'triangle';
    toneOsc.frequency.setValueAtTime(toneFreq, now);

    const tonePeak = isFinalThree ? vol * 0.28 : vol * 0.22;
    toneGain.gain.setValueAtTime(tonePeak, now);
    toneGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.14);

    toneOsc.connect(toneGain);
    toneGain.connect(out);
    this.trackNode(this.activeDetentionNodes, toneOsc, toneGain);
    toneOsc.start(now);
    toneOsc.stop(now + 0.15);
  }

  /**
   * Immediately halts the detention countdown sound & room bed when countdown reaches 0
   * (or when unlocked early / reset).
   */
  public stopDetentionCountdown(): void {
    this.detentionCountdownActive = false;
    this.lastDetentionTickSecond = -1;
    this.fadeAndStopTrackedNodes(this.activeDetentionNodes);
  }

  /**
   * BALDI: Iconic wooden ruler snap with distance-based intensity & threat sub-thump
   */
  public playBaldiRulerSnap(distanceUnits: number, isAggressive = false): void {
    const maxHearDist = 58;
    if (distanceUnits > maxHearDist) return;
    const proximity = Math.max(0.08, 1 - distanceUnits / maxHearDist);
    const vol = this.getSfxGain(proximity * proximity * 0.95);
    if (vol <= 0.002) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const out = this.getOutputNode(ctx);

    // Sharp wooden crack noise burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.065);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.pow(1 - i / bufferSize, 2.6);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(isAggressive ? 1450 : 1750, now);
    bandpass.Q.setValueAtTime(2.2, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.85, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    noise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(out);
    noise.start(now);

    // Woody slap body resonance
    const woodOsc = ctx.createOscillator();
    const woodGain = ctx.createGain();
    woodOsc.type = 'triangle';
    woodOsc.frequency.setValueAtTime(isAggressive ? 290 : 340, now);
    woodOsc.frequency.exponentialRampToValueAtTime(95, now + 0.055);
    woodGain.gain.setValueAtTime(vol * 0.55, now);
    woodGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    woodOsc.connect(woodGain);
    woodGain.connect(out);
    woodOsc.start(now);
    woodOsc.stop(now + 0.065);
  }

  /**
   * BALDI: Heavy attack strike sound
   */
  public playBaldiAttack(): void {
    const vol = this.getSfxGain(1);
    if (vol <= 0.002) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.32);
    gain.gain.setValueAtTime(vol * 0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));
    osc.start(now);
    osc.stop(now + 0.35);

    this.playBaldiRulerSnap(1, true);
  }

  /**
   * BALDI FURIOUS 7/7 TRANSFORMATION: Dramatic horror alarm roar + rapid triple ruler crack
   */
  public playBaldiFuriousRoar(): void {
    const vol = this.getSfxGain(0.95);
    if (vol <= 0.002) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const out = this.getOutputNode(ctx);
    // Dissonant descending brassy roar
    [146.83, 155.56, 207.65].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq * 1.35, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.65, now + 0.72);
      gain.gain.setValueAtTime(vol * 0.26, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.76);
    });

    // Rapid triple ruler crack
    [0, 130, 260].forEach((delayMs) => {
      window.setTimeout(() => {
        this.playBaldiRulerSnap(2, true);
      }, delayMs);
    });
  }

  /**
   * PRINCIPAL: Quiet patrolling whistle/hum
   */
  public playPrincipalHum(distanceUnits: number): void {
    const maxDist = 30;
    if (distanceUnits > maxDist) return;
    const proximity = Math.max(0.05, 1 - distanceUnits / maxDist);
    const vol = this.getSfxGain(proximity * 0.25);
    if (vol <= 0.002) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const whistleNotes = [587.33, 659.25, 783.99, 659.25];
    const f = whistleNotes[Math.floor(Math.random() * whistleNotes.length)];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.linearRampToValueAtTime(f * 1.03, now + 0.18);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));
    osc.start(now);
    osc.stop(now + 0.28);
  }

  /**
   * PRINCIPAL: Authoritative detention whistle + speech cadence
   */
  public playPrincipalDetention(): void {
    const vol = this.getSfxGain(0.8);
    if (vol <= 0.002) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const out = this.getOutputNode(ctx);
    const freqs = [523.25, 392.0, 311.13];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, now + idx * 0.11);
      gain.gain.setValueAtTime(vol * 0.28, now + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.1);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.11);
    });
  }

  /**
   * PLAYTIME: Greeting ("Let's play!"), rope swing, jump hit, failure, and success
   */
  public playPlaytimeGreeting(): void {
    this.playToneSequence([523.25, 659.25, 783.99], 'triangle', 0.09, 0.45);
  }

  public playRopeSwing(): void {
    const vol = this.getSfxGain(0.28);
    if (vol <= 0.002) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));
    osc.start(now);
    osc.stop(now + 0.095);
  }

  public playPlaytimeJumpSuccess(step: number): void {
    const base = 440 + step * 110;
    this.playToneSequence([base, base * 1.25], 'sine', 0.07, 0.5);
  }

  public playPlaytimeFail(): void {
    this.playToneSequence([330, 233.08], 'sawtooth', 0.12, 0.42);
  }

  public playPlaytimeComplete(): void {
    this.playToneSequence([523.25, 659.25, 783.99, 1046.5], 'triangle', 0.09, 0.55);
  }

  /**
   * BULLY: Item-stealing dialogue thud & swipe
   */
  public playBullySteal(): void {
    this.playToneSequence([146.83, 130.81, 110.0], 'sawtooth', 0.11, 0.5);
  }

  /**
   * GAME: Correct & Incorrect math answers, doors, items, game over, victory
   */
  public playNotebookCorrect(): void {
    this.playToneSequence([523.25, 659.25, 783.99, 1046.5], 'sine', 0.08, 0.6);
  }

  public playNotebookWrong(): void {
    const vol = this.getSfxGain(0.75);
    if (vol <= 0.002) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getOutputNode(ctx);
    // Dissonant tritone horror chord
    [155.56, 220.0, 233.08].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(vol * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.5);
    });
  }

  public playDoorSound(): void {
    this.playToneSequence([240, 300], 'triangle', 0.045, 0.22);
  }

  public playItemPickup(): void {
    this.playToneSequence([660, 880], 'sine', 0.055, 0.38);
  }

  public playBSodaSpray(): void {
    const vol = this.getSfxGain(0.55);
    if (vol <= 0.002) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.28);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(900, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.getOutputNode(ctx));
    src.start(now);
  }

  public playGameOver(): void {
    this.stopDetentionCountdown();
    this.stopMusic();
    const vol = this.getSfxGain(0.85);
    if (vol <= 0.002) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getOutputNode(ctx);
    [196, 185, 146.83, 98].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now + idx * 0.14);
      gain.gain.setValueAtTime(vol * 0.35, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.24);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.25);
    });
  }

  public playVictory(): void {
    this.stopDetentionCountdown();
    this.stopMusic();
    this.playToneSequence([523.25, 659.25, 783.99, 1046.5, 1318.5], 'triangle', 0.12, 0.65);
  }

  public playPlayerJump(): void {
    const vol = this.getSfxGain(0.42);
    if (vol <= 0.002) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getOutputNode(ctx);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(195, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.085);
    gain.gain.setValueAtTime(vol * 0.34, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  private playToneSequence(
    freqs: number[],
    type: OscillatorType,
    stepDur: number,
    volumeScale: number
  ): void {
    const vol = this.getSfxGain(volumeScale);
    if (vol <= 0.002) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.getOutputNode(ctx);

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f, now + idx * stepDur);
      gain.gain.setValueAtTime(vol * 0.4, now + idx * stepDur);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (idx + 1) * stepDur + 0.04);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now + idx * stepDur);
      osc.stop(now + (idx + 1) * stepDur + 0.05);
    });
  }

  public destroy(): void {
    this.stopDetentionCountdown();
    this.stopMusic();
    this.compressor = null;
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

