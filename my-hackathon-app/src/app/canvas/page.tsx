"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [history, setHistory] = useState<DrawAction[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#3b82f6");
  const [lineWidth, setLineWidth] = useState(3);
  const [roomId, setRoomId] = useState("");
  const [userId] = useState(() => `user_${Math.random().toString(36).substr(2, 9)}`);
  const [isConnected, setIsConnected] = useState(false);
  const sequenceRef = useRef(0);
  const channelRef = useRef<any>(null);
  
  // AI Selection tool state
  const [tool, setTool] = useState<'draw' | 'select'>('draw');
  const [selectionStart, setSelectionStart] = useState<Point | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState<{text: string, pos: Point} | null>(null);

  // Get room ID
  useEffect(() => {
    const room = searchParams.get("room");
    if (room) setRoomId(room.toUpperCase());
    else router.push("/join");
  }, [searchParams, router]);

  // Redraw canvas function
  const redrawCanvas = useCallback((actions: DrawAction[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0a0a0a";
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

    // Draw AI response if exists
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

  // Load existing strokes
  const loadStrokes = useCallback(async () => {
    if (!roomId) return;
    const { data, error } = await supabase
      .from("strokes")
      .select("*")
      .eq("room_id", roomId)
      .order("sequence", { ascending: true });
    if (error) console.error('Error loading strokes:', error);
    if (data) {
      setHistory(data);
      sequenceRef.current = Math.max(0, ...data.map(s => s.sequence || 0));
      redrawCanvas(data);
    }
  }, [roomId, redrawCanvas]);

  // Realtime subscription
  useEffect(() => {
    if (!roomId) return;
    loadStrokes();

    if (channelRef.current) supabase.removeChannel(channelRef.current);

    channelRef.current = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'strokes',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: any) => {
          if (payload.new.user_id !== userId) {
            setHistory(prev => {
              const exists = prev.some(s => s.id === payload.new.id);
              if (!exists) {
                const updated = [...prev, payload.new].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
                setTimeout(() => redrawCanvas(updated), 0);
                return updated;
              }
              return prev;
            });
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });
    
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [roomId, userId, loadStrokes, redrawCanvas]);

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
      ctx.fillStyle = "#0a0a0a";
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

    if (aiResponse) {
      setAiResponse(null);
    }

    if (tool === 'select') {
      setIsSelecting(true);
      setSelectionStart(pos);
      setSelectionEnd(pos);
      return;
    }

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

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
      const imageData = tempCanvas.toDataURL('image/png');

      const response = await fetch('/api/process-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData, prompt: "" })
      });

      const result = await response.json();
      
      if (result.response) {
        const rightX = Math.max(selectionStart.x, selectionEnd.x);
        const centerY = (selectionStart.y + selectionEnd.y) / 2;
        const responsePos = { x: rightX + 10, y: centerY };
        setAiResponse({ text: result.response, pos: responsePos });
        animateTextResponse(result.response, responsePos);
      }
    } catch (error) {
      console.error('Error processing selection:', error);
      alert('Failed to process image. Make sure the API route is set up correctly.');
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
    if (tool === 'select' && isSelecting) {
      await processSelection();
      return;
    }

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

    try {
      const { data, error } = await supabase
        .from("strokes")
        .insert([newStroke])
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", JSON.stringify(error, null, 2));
        setHistory(prev => prev.filter(s => s !== newStroke));
        redrawCanvas(history);
        return;
      }

      if (data) {
        setHistory(prev => prev.map(s => (s === newStroke ? { ...s, id: data.id } : s)));
      }
    } catch (err) {
      console.error("Failed to save stroke:", err);
      setHistory(prev => prev.filter(s => s !== newStroke));
      redrawCanvas(history);
    }
  };

  const undo = async () => {
    const userStrokes = history.filter(s => s.user_id === userId);
    const last = userStrokes[userStrokes.length - 1];
    if (!last?.id) return;

    const { error } = await supabase.from("strokes").delete().eq("id", last.id);
    if (!error) {
      const updated = history.filter(s => s.id !== last.id);
      setHistory(updated);
      redrawCanvas(updated);
    }
  };

  const clearCanvas = async () => {
    setAiResponse(null);
    await supabase.from("strokes").delete().eq("room_id", roomId);
    setHistory([]);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    sequenceRef.current = 0;
  };

  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#ffffff"];

  return (
    <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 min-h-screen flex flex-col">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap');
      `}</style>
      
      {/* Enhanced Header */}
      <nav className="bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800/50 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">✏️</span>
              </div>
              <div>
                <h1 className="text-white font-semibold text-lg">Draw & Solve</h1>
                <p className="text-zinc-400 text-xs">Collaborative AI Canvas</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {isProcessing && (
              <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-blue-400 font-medium">AI Processing...</span>
              </div>
            )}
            
            <div className="flex items-center gap-3 bg-zinc-800/50 px-4 py-2 rounded-full border border-zinc-700/50">
              <span className="text-zinc-400 text-sm font-medium">Room:</span>
              <span className="text-white font-mono font-semibold tracking-wider">{roomId}</span>
              <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"} shadow-lg ${isConnected ? 'shadow-green-500/50' : 'shadow-red-500/50'}`} />
            </div>
          </div>
        </div>
      </nav>
      
      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        {/* Enhanced Sidebar */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-4 w-20 flex flex-col items-center gap-3 shadow-2xl">
          {/* Tools Section */}
          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={() => setTool('draw')}
              className={`w-full aspect-square rounded-xl flex items-center justify-center text-2xl transition-all duration-200 ${
                tool === 'draw' 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50 scale-105' 
                  : 'bg-zinc-800/50 text-gray-400 hover:bg-zinc-700/50 hover:scale-105'
              }`}
              title="Draw Tool"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            
            <button
              onClick={() => setTool('select')}
              className={`w-full aspect-square rounded-xl flex items-center justify-center text-2xl transition-all duration-200 ${
                tool === 'select' 
                  ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/50 scale-105' 
                  : 'bg-zinc-800/50 text-gray-400 hover:bg-zinc-700/50 hover:scale-105'
              }`}
              title="AI Select Tool"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </button>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent my-1" />
          
          {/* Color Palette */}
          <div className="flex flex-col gap-2 w-full">
            {colors.map(c => (
              <button
                key={c}
                style={{ backgroundColor: c }}
                className={`w-full aspect-square rounded-xl transition-all duration-200 ${
                  color === c 
                    ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110 shadow-lg" 
                    : "hover:scale-105 opacity-80 hover:opacity-100"
                }`}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          
          <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent my-1" />
          
          {/* Brush Size */}
          <div className="flex flex-col items-center gap-2 w-full py-2">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <div 
                className="rounded-full bg-white transition-all duration-200" 
                style={{ 
                  width: `${Math.max(4, Math.min(20, lineWidth))}px`, 
                  height: `${Math.max(4, Math.min(20, lineWidth))}px` 
                }}
              />
            </div>
            <input 
              type="range" 
              min={1} 
              max={20} 
              value={lineWidth} 
              onChange={e => setLineWidth(Number(e.target.value))}
              className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
            />
          </div>
          
          <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent my-1" />
          
          {/* Action Buttons */}
          <button 
            onClick={undo} 
            className="w-full aspect-square bg-zinc-800/50 hover:bg-zinc-700/50 text-white rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
            title="Undo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          
          <button 
            onClick={clearCanvas} 
            className="w-full aspect-square bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 border border-red-500/20"
            title="Clear Canvas"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        
        {/* Enhanced Canvas Container */}
        <div className="flex-1 bg-zinc-900/30 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-4 shadow-2xl overflow-hidden">
          <canvas
            ref={canvasRef}
            className={`w-full h-full bg-zinc-950 rounded-xl shadow-inner ${
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
      <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-medium">Loading Canvas...</p>
        </div>
      </div>
    }>
      <CanvasPage />
    </Suspense>
  );
}