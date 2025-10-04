"use client";
import { useState, useEffect, useRef, useCallback } from "react";
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
}

export default function CanvasPage() {
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

  // Get room ID
  useEffect(() => {
    const room = searchParams.get("room");
    if (room) setRoomId(room.toUpperCase());
    else router.push("/join");
  }, [searchParams, router]);

  // Redraw canvas function - memoized to prevent unnecessary recreations
  const redrawCanvas = useCallback((actions: DrawAction[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    actions.forEach(stroke => {
      if (!stroke.points || stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.line_width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      stroke.points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });
  }, []);

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

    // Remove old channel if exists
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
          // Only add strokes from other users
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
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    
    const pos = getPointer(e);
    setIsDrawing(true);
    setCurrentStroke([pos]);
    
    // Start new path for this stroke
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const pos = getPointer(e);
    setCurrentStroke(prev => [...prev, pos]);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = async () => {
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
      sequence: ++sequenceRef.current,
    };

    setIsDrawing(false);
    setCurrentStroke([]);
    
    // Optimistically update UI
    setHistory(prev => {
      const updated = [...prev, newStroke];
      return updated;
    });

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
      <nav className="bg-zinc-800 border-b border-zinc-700 p-4 flex justify-between items-center">
        <span className="text-white font-light">Room: {roomId}</span>
        <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"} animate-pulse`} />
      </nav>
      <div className="flex flex-1 overflow-hidden">
        <div className="bg-zinc-800 p-4 w-20 flex flex-col items-center space-y-4">
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
            className="w-full h-full bg-black rounded-lg cursor-crosshair"
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