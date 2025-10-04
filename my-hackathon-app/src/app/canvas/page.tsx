"use client"
import Link from 'next/link'
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from 'next/navigation';

interface Point {
  x: number;
  y: number;
}

function CanvasContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#3b82f6');
  const [lineWidth, setLineWidth] = useState(3);
  const [roomId, setRoomId] = useState('');

  useEffect(() => {
    const roomParam = searchParams.get('room');
    if (roomParam) {
      setRoomId(roomParam.toUpperCase());
    } else {
      router.push('/join');
    }
  }, [searchParams, router]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getMousePos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const colors = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Green', value: '#10b981' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'White', value: '#ffffff' },
  ];

  return (
    <div className="bg-zinc-900 min-h-screen flex flex-col">
      <nav className="bg-zinc-800 border-b border-zinc-700 p-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-black rounded-sm"></div>
            </div>
            <span className="text-white font-light text-lg tracking-wide">DRW</span>
          </Link>
          <div className="flex items-center space-x-2">
            <span className="text-zinc-400 text-sm font-light">
              Room: <span className="text-white font-medium">{roomId || 'Loading...'}</span>
            </span>
            {roomId && (
              <button onClick={() => { navigator.clipboard.writeText(roomId); alert('Copied!'); }} className="px-3 py-1 bg-zinc-700 text-zinc-300 text-xs rounded hover:bg-zinc-600">Copy</button>
            )}
            <div className="w-8 h-8 bg-blue-500 rounded-full border-2 border-zinc-700 flex items-center justify-center text-xs text-white font-medium ml-4">You</div>
          </div>
        </div>
      </nav>
      <div className="flex flex-1 overflow-hidden">
        <div className="bg-zinc-800 border-r border-zinc-700 p-4 w-20 flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-lg bg-blue-500 text-white flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </div>
          <div className="border-t border-zinc-700 w-full my-2"></div>
          <div className="space-y-2">
            {colors.map(c => <button key={c.value} onClick={() => setColor(c.value)} className={\`w-12 h-12 rounded-lg border-2 transition-all \${color === c.value ? 'border-white scale-110' : 'border-zinc-600'}\`} style={{ backgroundColor: c.value }} title={c.name} />)}
          </div>
          <div className="border-t border-zinc-700 w-full my-2"></div>
          <div className="space-y-2">
            <input type="range" min="1" max="20" value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))} className="w-12" style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical', height: '80px' }} />
            <div className="text-zinc-400 text-xs text-center">{lineWidth}px</div>
          </div>
          <div className="flex-1"></div>
          <button onClick={clearCanvas} className="w-12 h-12 rounded-lg bg-red-500 text-white hover:bg-red-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 p-4 overflow-auto bg-zinc-900">
          <div className="w-full h-full bg-black rounded-lg shadow-2xl">
            <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} className="w-full h-full cursor-crosshair" style={{ touchAction: 'none' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Canvas() {
  return <Suspense fallback={<div className="bg-zinc-900 min-h-screen flex items-center justify-center"><div className="text-white">Loading...</div></div>}><CanvasContent /></Suspense>;
}
