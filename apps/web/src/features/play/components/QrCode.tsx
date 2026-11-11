import { useMemo } from 'react';
import { encodeQr, qrSvgPath } from '../lib/qr.ts';

/** QR code rendered locally as SVG (no network). Dark modules on white for reliable scanning in both themes. */
export function QrCode({ text, size = 176, label }: { text: string; size?: number; label?: string }) {
  const q = useMemo(() => { try { return qrSvgPath(encodeQr(text)); } catch { return null; } }, [text]);
  if (!q) return null;
  return (
    <svg className="play-qr" width={size} height={size} viewBox={`0 0 ${q.dim} ${q.dim}`} role="img" aria-label={label ?? `QR code for ${text}`} shapeRendering="crispEdges">
      <rect width={q.dim} height={q.dim} fill="#ffffff" />
      <path d={q.path} fill="#000000" />
    </svg>
  );
}
