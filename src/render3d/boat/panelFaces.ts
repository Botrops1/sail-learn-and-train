import type { PanelReadings } from '../../model/helmPanel';
import { DEG } from '../../model/angles';

/**
 * The faces of the helm panel's instruments, drawn on canvases (PHASE9_SPEC 8.4, M62). The printed
 * words are the instrument's own markings and stay English in every language (3.1).
 */
export type FaceContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type FaceCanvas = HTMLCanvasElement | OffscreenCanvas;

const RED = '#d6453d';
const GREEN = '#2fa05a';
const GREY = '#8a939c';
const DARK_DOT = '#3a3f45';

/** A canvas for a face: a page canvas in the browser, an OffscreenCanvas where only that exists, null without either (Node). */
export function makeFaceCanvas(width: number, height: number): FaceCanvas | null {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  return null;
}

function font(ctx: FaceContext, px: number): void {
  ctx.font = `bold ${px}px system-ui, sans-serif`;
}

function text(
  ctx: FaceContext,
  value: string,
  x: number,
  y: number,
  px: number,
  colour: string,
  align: CanvasTextAlign = 'left',
): void {
  font(ctx, px);
  ctx.fillStyle = colour;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function disc(ctx: FaceContext, colour: string, radius: number): void {
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(128, 128, radius, 0, 2 * Math.PI);
  ctx.fill();
}

/** The compass: a black disc, the card turned by −heading, the orange lubber line fixed at the top. */
export function drawCompass(ctx: FaceContext, headingDeg: number): void {
  disc(ctx, '#000000', 126);
  ctx.save();
  ctx.translate(128, 128);
  ctx.rotate(-headingDeg * DEG);
  ctx.strokeStyle = '#ffffff';
  for (let a = 0; a < 360; a += 10) {
    const major = a % 30 === 0;
    ctx.save();
    ctx.rotate(a * DEG);
    ctx.lineWidth = major ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(0, -(major ? 100 : 112));
    ctx.lineTo(0, -122);
    ctx.stroke();
    if (major) {
      const letter = a === 0 ? 'N' : a === 90 ? 'E' : a === 180 ? 'S' : a === 270 ? 'W' : null;
      if (letter) text(ctx, letter, 0, -82, 28, letter === 'N' ? '#e0392f' : '#ffffff', 'center');
      else text(ctx, String(a / 10), 0, -82, 20, '#ffffff', 'center');
    }
    ctx.restore();
  }
  ctx.restore();
  ctx.fillStyle = '#ff8a1f';
  ctx.beginPath();
  ctx.moveTo(128, 4);
  ctx.lineTo(118, 22);
  ctx.lineTo(138, 22);
  ctx.closePath();
  ctx.fill();
}

/** An arc of the wind display, 0° at the top and clockwise. */
function windArc(ctx: FaceContext, fromDeg: number, toDeg: number, colour: string): void {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(128, 128, 100, (fromDeg - 90) * DEG, (toDeg - 90) * DEG);
  ctx.stroke();
}

/** The wind display: the apparent wind angle on a ring (red port, green starboard) and its speed. */
export function drawWind(ctx: FaceContext, awaDeg: number, awsKn: number): void {
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = '#101418';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = GREY;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(128, 128, 100, 0, 2 * Math.PI);
  ctx.stroke();
  windArc(ctx, -60, -20, RED);
  windArc(ctx, 20, 60, GREEN);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(128, 92);
  ctx.lineTo(142, 130);
  ctx.lineTo(136, 162);
  ctx.lineTo(120, 162);
  ctx.lineTo(114, 130);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128 + 92 * Math.sin(awaDeg * DEG), 128 - 92 * Math.cos(awaDeg * DEG));
  ctx.stroke();
  text(ctx, 'AWA', 16, 28, 18, GREY);
  text(ctx, `${Math.abs(Math.round(awaDeg))}°`, 16, 60, 30, '#ffffff');
  text(ctx, `AWS ${awsKn.toFixed(1)} kn`, 128, 238, 24, '#ffffff', 'center');
}

/** A point on the rev counter's scale: 0 rpm on the left, 3,000 on the right, over the upper half circle. */
function tachAt(rpm: number, radius: number): [number, number] {
  const angle = Math.PI * (1 - Math.min(rpm, 3000) / 3000);
  return [128 + radius * Math.cos(angle), 128 - radius * Math.sin(angle)];
}

/** The rev counter (the Engine section's scale), with the START and STOP lamps under the needle. */
export function drawTach(ctx: FaceContext, rpm: number, running: boolean): void {
  disc(ctx, '#000000', 126);
  const arc = (from: number, to: number, colour: string, width: number) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(128, 128, 100, Math.PI + (Math.PI * from) / 3000, Math.PI + (Math.PI * to) / 3000);
    ctx.stroke();
  };
  arc(0, 3000, '#ffffff', 3);
  arc(2500, 3000, RED, 6);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for (let r = 0; r <= 3000; r += 500) {
    const [x1, y1] = tachAt(r, 88);
    const [x2, y2] = tachAt(r, 100);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  for (let r = 0; r <= 3000; r += 1000) {
    const [x, y] = tachAt(r, 72);
    text(ctx, String(r / 1000), x, y, 20, '#ffffff', 'center');
  }
  text(ctx, 'RPM ×1000', 128, 150, 16, GREY, 'center');
  const [nx, ny] = tachAt(rpm, 92);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(nx, ny);
  ctx.stroke();
  text(ctx, 'START', 84, 200, 16, '#ffffff', 'center');
  text(ctx, 'STOP', 172, 200, 16, '#ffffff', 'center');
  for (const [x, colour] of [
    [84, running ? GREEN : DARK_DOT],
    [172, DARK_DOT],
  ] as const) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(x, 216, 6, 0, 2 * Math.PI);
    ctx.fill();
  }
}

/** The autopilot keypad: a display line and the STBY and AUTO keys (the key of the mode lit). */
export function drawKeypad(
  ctx: FaceContext,
  mode: PanelReadings['autopilot'],
  courseText: string,
): void {
  ctx.clearRect(0, 0, 256, 110);
  ctx.fillStyle = '#1b1f24';
  ctx.fillRect(0, 0, 256, 110);
  ctx.fillStyle = '#0e2a1f';
  ctx.fillRect(8, 6, 240, 42);
  text(ctx, courseText, 128, 28, 24, '#7dffb5', 'center');
  const keys = [
    { label: 'STBY', x: 16, lit: mode === 'off' },
    { label: 'AUTO', x: 136, lit: mode !== 'off' },
  ];
  for (const key of keys) {
    ctx.fillStyle = key.lit ? '#ffb000' : '#2c3239';
    ctx.fillRect(key.x, 58, 104, 44);
    text(ctx, key.label, key.x + 52, 80, 20, key.lit ? '#000000' : '#ffffff', 'center');
  }
}
