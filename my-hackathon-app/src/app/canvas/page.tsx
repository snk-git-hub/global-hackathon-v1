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
    ctx.fillStyle = "#000000";
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

  // Load existing strokes
  const loadStrokes = useCallback(async () => {
    if (!roomId) return;
    const { data, error } = await supabase
      .from("strokes")
      .select("*")
      .eq("room_id", roomId)
      .order("sequence", { ascending: true });
    if (error) console.error(error);
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
      .subscribe(status => {
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
      ctx.fillStyle = "#000000";
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

      // Create temporary canvas for selected area
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      // Copy selected area
      tempCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
      
      // Convert to base64
      const imageData = tempCanvas.toDataURL('image/png');

      // Send to Next.js API route
      const response = await fetch('/api/process-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData, prompt: "" })
      });

      const result = await response.json();
      
      if (result.response) {
        // Find the rightmost point in the selection (where = sign likely is)
        const rightX = Math.max(selectionStart.x, selectionEnd.x);
        const centerY = (selectionStart.y + selectionEnd.y) / 2;
        
        // Position answer right after the selection (after the = sign)
        const responsePos = { x: rightX + 10, y: centerY };
        setAiResponse({ text: result.response, pos: responsePos });
        
        // Animate the response
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
    let totalDisplayed = '';
    
    const animate = () => {
      if (charIndex <= text.length) {
        redrawCanvas(history);
        
        // Handwriting style with glow effect
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
            // Add slight wave effect to completed lines
            const waveOffset = Math.sin(Date.now() / 500 + i) * 0.5;
            ctx.fillText(line, startPos.x, startPos.y + i * 35 + waveOffset);
          } else if (i === currentLine) {
            const displayText = line.substring(0, charsInLine);
            // Add writing cursor effect
            const waveOffset = Math.sin(Date.now() / 500 + i) * 0.5;
            ctx.fillText(displayText, startPos.x, startPos.y + i * 35 + waveOffset);
            
            // Add a glowing cursor dot at the end
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
        
        // Variable speed for more natural writing
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
    setAiResponse(null); // Clear AI response
    await supabase.from("strokes").delete().eq("room_id", roomId);
    setHistory([]);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    sequenceRef.current = 0;
  };

  const colors = ["#3b82f6", "#ef4444", "#10b981", "#eab308", "#8b5cf6", "#ffffff"];

  return (
    <div className="bg-zinc-900 min-h-screen flex flex-col">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Indie+Flower&family=Kalam:wght@300;400;700&display=swap');
      `}</style>
      <nav className="bg-zinc-800 border-b border-zinc-700 p-4 flex justify-between items-center">
        <span className="text-white font-light">Room: {roomId}</span>
        <div className="flex items-center gap-3">
          {isProcessing && (
            <div className="flex items-center gap-2 text-blue-400">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">AI Processing...</span>
            </div>
          )}
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"} animate-pulse`} />
        </div>
      </nav>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="bg-zinc-800 p-4 w-20 flex flex-col items-center space-y-4">
          <button
            onClick={() => setTool('draw')}
            className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
              tool === 'draw' ? 'bg-blue-500 text-white' : 'bg-zinc-700 text-gray-300'
            }`}
            title="Draw Tool"
          >
            ✏️
          </button>
          
          <button
            onClick={() => setTool('select')}
            className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
              tool === 'select' ? 'bg-blue-500 text-white' : 'bg-zinc-700 text-gray-300'
            }`}
            title="AI Select Tool"
          >
            ✨
          </button>

          <div className="w-full h-px bg-zinc-700 my-2" />
          
          {colors.map(c => (
            <button
              key={c}
              style={{ backgroundColor: c }}
              className={`w-12 h-12 rounded-lg ${color === c ? "border-white border-2" : ""}`}
              onClick={() => setColor(c)}
            />
          ))}
          
          <input 
            type="range" 
            min={1} 
            max={20} 
            value={lineWidth} 
            onChange={e => setLineWidth(Number(e.target.value))}
            className="w-12"
          />
          
          <button onClick={undo} className="w-12 h-12 bg-zinc-700 text-white rounded-lg text-xs">Undo</button>
          <button onClick={clearCanvas} className="w-12 h-12 bg-red-500 text-white rounded-lg text-xs">Clear</button>
        </div>
        
        <div className="flex-1 p-4">
          <canvas
            ref={canvasRef}
            className={`w-full h-full bg-black rounded-lg ${
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
export default function CanvasPageWrapper() {
  return (
    <Suspense fallback={<div className="bg-zinc-900 min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <CanvasPage />
    </Suspense>
  );
}
