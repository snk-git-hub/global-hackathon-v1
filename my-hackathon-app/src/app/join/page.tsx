"use client"
import Link from 'next/link'
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';

export default function JoinRoom() {
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [roomId, setRoomId] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const generateRoomId = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      console.log("Joining room:", roomId);
      // router.push(`/canvas/${roomId}`);
      alert(`Joining room: ${roomId}`);
    }
  };

  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();
    console.log("Creating new room:", newRoomId);
    setRoomId(newRoomId);
    setIsCreatingRoom(true);
    setTimeout(() => {
      // router.push(`/canvas/${newRoomId}`);
      alert(`Created new room: ${newRoomId}`);
    }, 500);
  };

  return (
    <div className="bg-black min-h-screen relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent)] opacity-30"></div>
        <div 
          className="absolute inset-0 opacity-20" 
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
            transform: `translate(${mousePosition.x * 0.01}px, ${mousePosition.y * 0.01}px)`
          }}
        ></div>
      </div>

      <div 
        className="fixed w-96 h-96 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(147, 197, 253, 0.15) 0%, transparent 70%)',
          left: mousePosition.x - 192,
          top: mousePosition.y - 192,
          transition: 'all 0.1s ease-out'
        }}
      ></div>

      <nav className="relative z-50 flex justify-between items-center p-8">
        <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-black rounded-sm"></div>
          </div>
          <span className="text-white font-light text-lg tracking-wide">DRW</span>
        </Link>
        
        <Link 
          href="/signin"
          className="px-6 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-100 transition-all duration-200 uppercase tracking-wide"
        >
          Sign In
        </Link>
      </nav>

      <main className="relative z-10 px-8 py-20">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-6xl font-extralight text-white mb-6 tracking-tight">
              Join a
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                Drawing Room
              </span>
            </h1>
            <p className="text-xl text-zinc-400 font-light max-w-xl mx-auto">
              Enter a room ID to join an existing session or create a new one
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800/50 p-8 hover:bg-zinc-900/70 transition-all duration-300">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-xl font-light text-white mb-3">Create New Room</h3>
              <p className="text-zinc-400 font-light text-sm mb-4">
                Start a fresh canvas and invite others to join
              </p>
              <button
                onClick={handleCreateRoom}
                disabled={isCreatingRoom}
                className="w-full px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-all duration-200 text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingRoom ? 'Creating...' : 'Create Room'}
              </button>
            </div>

            <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800/50 p-8 hover:bg-zinc-900/70 transition-all duration-300">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-light text-white mb-3">Join Existing Room</h3>
              <p className="text-zinc-400 font-light text-sm mb-4">
                Enter a room ID shared by your team
              </p>
            </div>
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-xl rounded-3xl border border-zinc-800/50 p-8">
            <form onSubmit={handleJoinRoom} className="space-y-6">
              <div>
                <label htmlFor="roomId" className="block text-sm font-light text-zinc-300 mb-3">
                  Room ID
                </label>
                <input
                  type="text"
                  id="roomId"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  className="w-full px-6 py-4 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white text-2xl font-light placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors text-center tracking-widest"
                  placeholder="ABCD1234"
                  maxLength={8}
                  required
                />
                <p className="text-xs text-zinc-500 mt-2 font-light text-center">
                  Enter the 8-character room code
                </p>
              </div>

              <button
                type="submit"
                className="w-full px-8 py-4 bg-white text-black font-medium rounded-lg hover:bg-zinc-100 transform hover:scale-[1.02] transition-all duration-200 text-sm uppercase tracking-wide shadow-2xl"
              >
                Join Room
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-zinc-900/50 text-zinc-500 font-light">Quick Actions</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const randomId = generateRoomId();
                    setRoomId(randomId);
                  }}
                  className="px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white font-light hover:bg-zinc-800 transition-all duration-200 text-sm"
                >
                  Generate ID
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (roomId) {
                      navigator.clipboard.writeText(roomId);
                      alert('Room ID copied to clipboard!');
                    }
                  }}
                  disabled={!roomId}
                  className="px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white font-light hover:bg-zinc-800 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Copy ID
                </button>
              </div>
            </form>
          </div>

          <div className="mt-12 bg-zinc-900/30 backdrop-blur-sm rounded-2xl border border-zinc-800/30 p-6">
            <h3 className="text-lg font-light text-white mb-4 flex items-center">
              <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How it works
            </h3>
            <div className="space-y-3 text-sm text-zinc-400 font-light">
              <p>1. Create a new room or enter an existing room ID</p>
              <p>2. Share the room ID with your team members</p>
              <p>3. Start drawing together in real-time</p>
              <p>4. All changes sync instantly across all devices</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-8 py-12 border-t border-zinc-800/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
              <div className="w-3 h-3 bg-black rounded-sm"></div>
            </div>
            <span className="text-zinc-400 font-light">DRW</span>
          </div>
          
          <div className="text-zinc-500 text-sm font-light">
            © 2025 DRW. Built for creators.
          </div>
        </div>
      </footer>
    </div>
  );
}