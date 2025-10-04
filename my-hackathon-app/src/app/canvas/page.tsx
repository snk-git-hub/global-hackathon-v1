"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";

interface Point { x: number; y: number; }
interface DrawAction {
  id?: string;
  room_id: string;
  color: string;
  line_width: number;
  points: Point[];
  user_id?: string;
  sequence?: number;
  type?: 'draw' | 'ai_text';
  text?: string;
}

function CanvasPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [history, setHistory] = useState<DrawAction[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#3b82f6");
  const [lineWidth, setLineWidth] = useState(3);
  const [roomId] = useState("DEMO-ROOM");
  const [userId] = useState(() => `user_${Math.random().toString(36).substr(2, 9)}`);
  const sequenceRef = useRef(0);
  
  // AI Selection tool state
  const [tool, setTool] = useState<'draw' | 'select'>('draw');
  const [selectionStart, setSelectionStart] = useState<Point | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState<{text: string, pos: Point} | null>(null);

  // Redraw canvas function
  const redrawCanvas = useCallback((actions: DrawAction[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    actions.forEach(stroke => {
      if (stroke.points && stroke.points.length >= 2) {
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.line_width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        stroke.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }
    });

    // Draw AI response if exists (temporary, not saved)
    if (aiResponse) {
      ctx.font = '28px "Caveat", cursive';
      ctx.fillStyle = "#10b981";
      ctx.shadowColor = "#10b981";
      ctx.shadowBlur = 8;
      const lines = aiResponse.text.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, aiResponse.pos.x, aiResponse.pos.y + i * 35);
      });
      ctx.shadowBlur = 0;
    }
  }, [aiResponse]);

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (data.width > 1 && data.height > 1) ctx.putImageData(data, 0, 0);
      redrawCanvas(history);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [history, redrawCanvas]);

  const getPointer = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPointer(e);

    // Clear AI response when starting any new action
    if (aiResponse) {
      setAiResponse(null);
    }

    // Selection mode
    if (tool === 'select') {
      setIsSelecting(true);
      setSelectionStart(pos);
      setSelectionEnd(pos);
      return;
    }

    // Draw mode
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    
    setIsDrawing(true);
    setCurrentStroke([pos]);
    
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    
    // Selection mode - draw rectangle
    if (tool === 'select' && isSelecting && selectionStart) {
      const pos = getPointer(e);
      setSelectionEnd(pos);
      
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;
      
      redrawCanvas(history);
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        selectionStart.x,
        selectionStart.y,
        pos.x - selectionStart.x,
        pos.y - selectionStart.y
      );
      ctx.setLineDash([]);
      return;
    }

    // Draw mode
    if (!isDrawing) return;
    
    const pos = getPointer(e);
    setCurrentStroke(prev => [...prev, pos]);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const processSelection = async () => {
    if (!selectionStart || !selectionEnd || !canvasRef.current) return;
    
    setIsProcessing(true);
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Get selection bounds
      const x = Math.min(selectionStart.x, selectionEnd.x);
      const y = Math.min(selectionStart.y, selectionEnd.y);
      const w = Math.abs(selectionEnd.x - selectionStart.x);
      const h = Math.abs(selectionEnd.y - selectionStart.y);

      if (w < 10 || h < 10) {
        setIsProcessing(false);
        setIsSelecting(false);
        setSelectionStart(null);
        setSelectionEnd(null);
        redrawCanvas(history);
        return;
      }

      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const rightX = Math.max(selectionStart.x, selectionEnd.x);
      const centerY = (selectionStart.y + selectionEnd.y) / 2;
      
      const responsePos = { x: rightX + 20, y: centerY };
      const mockResponse = "42";
      setAiResponse({ text: mockResponse, pos: responsePos });
      
      animateTextResponse(mockResponse, responsePos);
    } catch (error) {
      console.error('Error processing selection:', error);
    } finally {
      setIsProcessing(false);
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  };

  const animateTextResponse = (text: string, startPos: Point) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    let charIndex = 0;
    const lines = text.split('\n');
    
    const animate = () => {
      if (charIndex <= text.length) {
        redrawCanvas(history);
        
        ctx.font = '28px "Caveat", cursive';
        ctx.fillStyle = "#10b981";
        ctx.shadowColor = "#10b981";
        ctx.shadowBlur = 8;
        
        let currentLine = 0;
        let charsInLine = 0;
        
        for (let i = 0; i < charIndex && i < text.length; i++) {
          if (text[i] === '\n') {
            currentLine++;
            charsInLine = 0;
          } else {
            charsInLine++;
          }
        }
        
        lines.forEach((line, i) => {
          if (i < currentLine) {
            const waveOffset = Math.sin(Date.now() / 500 + i) * 0.5;
            ctx.fillText(line, startPos.x, startPos.y + i * 35 + waveOffset);
          } else if (i === currentLine) {
            const displayText = line.substring(0, charsInLine);
            const waveOffset = Math.sin(Date.now() / 500 + i) * 0.5;
            ctx.fillText(displayText, startPos.x, startPos.y + i * 35 + waveOffset);
            
            if (charIndex < text.length && text[charIndex] !== '\n') {
              const textWidth = ctx.measureText(displayText).width;
              ctx.beginPath();
              ctx.arc(
                startPos.x + textWidth + 5,
                startPos.y + i * 35 + waveOffset - 5,
                3,
                0,
                Math.PI * 2
              );
              ctx.fillStyle = "#10b981";
              ctx.shadowBlur = 15;
              ctx.fill();
            }
          }
        });
        
        ctx.shadowBlur = 0;
        charIndex++;
        
        const delay = text[charIndex - 1] === ' ' ? 20 : 40;
        setTimeout(animate, delay);
      }
    };
    
    animate();
  };

  const stopDrawing = async () => {
    // Handle selection mode
    if (tool === 'select' && isSelecting) {
      await processSelection();
      return;
    }

    // Handle draw mode
    if (!isDrawing || currentStroke.length < 2) {
      setIsDrawing(false);
      setCurrentStroke([]);
      return;
    }

    const newStroke: DrawAction = {
      room_id: roomId,
      color,
      line_width: lineWidth,
      points: currentStroke,
      user_id: userId,
      sequence: ++sequenceRef.current
    };

    setIsDrawing(false);
    setCurrentStroke([]);
    setHistory(prev => [...prev, newStroke]);
  };

  const undo = () => {
    const userStrokes = history.filter(s => s.user_id === userId);
    const last = userStrokes[userStrokes.length - 1];
    if (!last) return;

    const updated = history.filter(s => s !== last);
    setHistory(updated);
    redrawCanvas(updated);
  };

  const clearCanvas = () => {
    setAiResponse(null);
    setHistory([]);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    sequenceRef.current = 0;
  };

  return (
    <div className="bg-zinc-900 min-h-screen flex flex-col">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap');
      `}</style>
      <nav className="bg-[#2a2a2a] px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-gray-400 text-sm ml-4">DRW.app/canvas/team-brainstorm</span>
        </div>
        <div className="flex items-center gap-3">
          {isProcessing && (
            <div className="flex items-center gap-2 text-blue-400">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">AI Processing...</span>
            </div>
          )}
          <div className="flex gap-2">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold border-2 border-gray-700">A</div>
            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-semibold border-2 border-gray-700">B</div>
            <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center text-white text-sm font-semibold border-2 border-gray-700">C</div>
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-semibold border-2 border-gray-700">+2</div>
          </div>
        </div>
      </nav>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="bg-[#1a1a1a] p-4 w-20 flex flex-col items-center space-y-3">
          <button
            onClick={() => setTool('draw')}
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              tool === 'draw' ? 'bg-white text-black' : 'bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]'
            } transition-colors`}
            title="Draw Tool"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
            </svg>
          </button>
          
          <button
            onClick={() => setTool('draw')}
            className={`w-12 h-12 rounded-xl flex items-center justify-center bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] transition-colors`}
            title="Line Tool"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="19" x2="19" y2="5" />
            </svg>
          </button>

          <button
            onClick={() => setTool('select')}
            className={`w-12 h-12 rounded-xl flex items-center justify-center bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] transition-colors`}
            title="Circle Tool"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
            </svg>
          </button>

          <button
            className={`w-12 h-12 rounded-xl flex items-center justify-center bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] transition-colors`}
            title="Text Tool"
          >
            <span className="text-lg font-semibold">T</span>
          </button>

          <div className="w-full h-px bg-[#3a3a3a] my-1" />
          
          <button onClick={undo} className="w-12 h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-xl flex items-center justify-center transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
            </svg>
          </button>
          <button onClick={clearCanvas} className="w-12 h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-xl flex items-center justify-center transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 bg-[#1a1a1a]">
          <canvas
            ref={canvasRef}
            className={`w-full h-full ${
              tool === 'select' ? 'cursor-crosshair' : 'cursor-crosshair'
            }`}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="bg-zinc-900 min-h-screen flex items-center justify-center text-white">
        Loading...
      </div>
    }>
      <CanvasPage />
    </Suspense>
  );
}