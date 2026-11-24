/** Krátká vibrace a pípnutí po potvrzení skenu. Prohlížeč je může odmítnout, pak se nic nestane. */
let audioCtx = null;

export function playScanFeedback(kind = "success") {
    if (typeof window === "undefined") return;
    try {
        if (navigator.vibrate) navigator.vibrate(kind === "success" ? 60 : [40, 60, 40]);
    } catch (_e) {
        /* ignore */
    }
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioCtx = audioCtx || new Ctx();
        if (audioCtx.state === "suspended") audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = kind === "success" ? 880 : 330;
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.16);
    } catch (_e) {
        /* ignore */
    }
}
