// Procedural WebAudio music — one looping style per character.
//   rave  : 128 bpm four-on-the-floor, saw bass, square arp, claps
//   folk  : 92 bpm fingerpicked triangle guitar, warm walking bass
//   polka : 138 bpm oompah tuba + offbeat squeeze-box chords, jaunty melody
// Lookahead scheduler (~120 ms) so tab jank never drops the groove.
const N = n => 440 * Math.pow(2, (n - 69) / 12); // midi → Hz

export function makeMusic(ctx, dest) {
  const out = ctx.createGain();
  out.gain.value = 0.14;
  out.connect(dest);

  let noiseBuf = null;
  function noise() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    return s;
  }
  function env(t, g, dur) {
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(g, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
    gn.connect(out);
    return gn;
  }
  function kick(t, g = 0.5) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    o.connect(env(t, g, 0.24));
    o.start(t); o.stop(t + 0.26);
  }
  function hat(t, g = 0.1, dur = 0.045) {
    const s = noise();
    const f = ctx.createBiquadFilter();
    f.type = "highpass"; f.frequency.value = 6500;
    s.connect(f); f.connect(env(t, g, dur));
    s.start(t); s.stop(t + dur + 0.02);
  }
  function clap(t, g = 0.2) {
    const s = noise();
    const f = ctx.createBiquadFilter();
    f.type = "bandpass"; f.frequency.value = 1800; f.Q.value = 1.2;
    s.connect(f); f.connect(env(t, g, 0.12));
    s.start(t); s.stop(t + 0.16);
  }
  function tone(t, freq, g, dur, type, lp) {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = freq;
    let node = o;
    if (lp) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = lp;
      o.connect(f); node = f;
    }
    node.connect(env(t, g, dur));
    o.start(t); o.stop(t + dur + 0.05);
  }

  const STYLES = {
    rave: {
      bpm: 128, div: 4, // 16ths
      seq(s, t) {
        const b = s % 16;
        if (b % 4 === 0) kick(t, 0.55);
        hat(t, b % 4 === 2 ? 0.14 : 0.05);
        if (b === 4 || b === 12) clap(t, 0.16);
        if (b % 2 === 0) {
          const bass = [33, 33, 36, 31][(b >> 2) % 4]; // A1 A1 C2 G1
          tone(t, N(bass), 0.3, 0.18, "sawtooth", 320);
        }
        const arp = [69, 72, 76, 79, 81, 79, 76, 72][b % 8];
        tone(t, N(arp), 0.05, 0.09, "square", 3200);
      },
    },
    folk: {
      bpm: 92, div: 2, // 8ths
      seq(s, t) {
        const b = s % 16;
        const pick = [55, 62, 59, 67, 59, 62, 55, 62, 52, 60, 57, 64, 57, 60, 52, 60][b];
        tone(t, N(pick), 0.16, 0.4, "triangle", 2400);
        if (b === 0) tone(t, N(43), 0.22, 0.55, "triangle", 500);  // G2
        if (b === 4) tone(t, N(38), 0.2, 0.55, "triangle", 500);   // D2
        if (b === 8) tone(t, N(40), 0.22, 0.55, "triangle", 500);  // E2
        if (b === 12) tone(t, N(38), 0.2, 0.55, "triangle", 500);
        if (b % 2 === 1) hat(t, 0.035, 0.09);
      },
    },
    polka: {
      bpm: 138, div: 2, // 8ths
      seq(s, t) {
        const b = s % 16;
        if (b % 2 === 0) tone(t, N(b % 4 === 0 ? 41 : 36), 0.3, 0.17, "square", 260); // F2/C2 tuba
        else for (const n of [65, 69, 72]) tone(t, N(n), 0.035, 0.1, "sawtooth", 1600); // offbeat F chord
        const mel = [77, 77, 76, 74, 72, 74, 76, 77, 79, 77, 76, 74, 72, 0, 74, 0][b];
        if (mel) tone(t, N(mel), 0.09, 0.13, "square", 4000);
        if (b === 0 || b === 6) hat(t, 0.07, 0.03); // clip-clop
      },
    },
  };

  let style = null, step = 0, nextT = 0, running = false, timer = null;
  function sched() {
    if (!running || !style) return;
    const st = STYLES[style];
    const spb = 60 / st.bpm / st.div;
    while (nextT < ctx.currentTime + 0.12) {
      st.seq(step, nextT);
      step++; nextT += spb;
    }
  }
  return {
    start(name) {
      style = name; step = 0;
      nextT = ctx.currentTime + 0.08;
      running = true;
      if (!timer) timer = setInterval(sched, 40);
    },
    stop() { running = false; },
    setGain(v) { out.gain.value = v; },
  };
}
