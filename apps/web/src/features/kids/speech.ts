// Read-aloud via the browser SpeechSynthesis API. Strips the tiny markdown used in lesson text.
export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export function plain(md: string): string {
  return md
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/[*_`#>]/g, '')
    .replace(/\b([KQRBN])x?([a-h][1-8])\b/g, (_, p: string, sq: string) => `${({ K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' } as Record<string, string>)[p]} ${sq}`)
    .replace(/\s+/g, ' ')
    .trim();
}

let voice: SpeechSynthesisVoice | null = null;
function pickVoice() {
  if (!canSpeak()) return null;
  const vs = window.speechSynthesis.getVoices();
  const lang = navigator.language?.slice(0, 2) || 'en';
  voice = vs.find((v) => v.lang.startsWith(lang) && /female|child|samantha|google/i.test(v.name)) ?? vs.find((v) => v.lang.startsWith(lang)) ?? null;
  return voice;
}

export function speak(text: string) {
  if (!canSpeak()) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(plain(text));
    u.rate = 0.92; u.pitch = 1.1;
    const v = voice ?? pickVoice();
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch { /* speech is optional */ }
}
export function stopSpeaking() { if (canSpeak()) try { window.speechSynthesis.cancel(); } catch { /* ignore */ } }
