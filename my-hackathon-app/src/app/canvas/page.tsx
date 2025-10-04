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
  type?: 'draw' | 'ai_text';
  text?: string;
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

  // --- get room ID (client-side only) ---
  useEffect(() => {
    const room = searchParams.get("room");
    if (room) setRoomId(room.toUpperCase());
    else router.push("/join");
  }, [searchParams, router]);

  // --- redraw canvas ---
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
  }, []);

  // --- load existing strokes ---
  const loadStrokes = useCallback(async () => {
    if (!roomId) return;
    const { data, error } = await supabase
      .from("strokes")
      .select("*")
      .eq("room_id", roomId)
      .order("sequence", { ascending: true });
    if (data) {
      setHistory(data);
      sequenceRef.current = Math.max(0, ...data.map(s => s.sequence || 0));
      redrawCanvas(data);
    }
    if (error) console.error(error);
  }, [roomId, redrawCanvas]);

  // --- realtime subscription ---
  useEffect(() => {
    if (!roomId) return;
    loadStrokes();

    if (channelRef.current) supabase.removeChannel(channelRef.current);

    channelRef.current = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'strokes', filter: `room_id=eq.${roomId}` },
        (payload: any) => {
          if (payload.new.user_id !== userId) {
            setHistory(prev => {
              const exists = prev.some(s => s.id === payload.new.id);
              if (!exists) {
                const updated = [...prev, payload.new].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
                redrawCanvas(updated);
                return updated;
              }
              return prev;
            });
          }
        }
      )
      .subscribe((status, err) => {
        if (err) console.error(err);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [roomId, userId, loadStrokes, redrawCanvas]);

  // --- canvas pointer helpers ---
  const getPointer = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPointer(e);
    setIsDrawing(true);
    setCurrentStroke([pos]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pos = getPointer(e);
    setCurrentStroke(prev => [...prev, pos]);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    const last = currentStroke[currentStroke.length - 1] || pos;
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
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
      sequence: ++sequenceRef.current
    };
    setIsDrawing(false);
    setCurrentStroke([]);
    setHistory(prev => [...prev, newStroke]);

    try {
      const { data, error } = await supabase.from("strokes").insert([newStroke]).select().single();
      if (data) setHistory(prev => prev.map(s => (s === newStroke ? { ...s, id: data.id } : s)));
      if (error) console.error(error);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-zinc-900 min-h-screen flex flex-col">
      <nav className="bg-zinc-800 border-b border-zinc-700 p-4 flex justify-between items-center">
        <span className="text-white font-light">Room: {roomId}</span>
        <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"} animate-pulse`} />
      </nav>

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
  );
}
