"use client"
import Link from 'next/link'
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { User } from '@supabase/supabase-js';
export default function JoinRoom() {
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [roomId, setRoomId] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [createdRoomId, setCreatedRoomId] = useState(""); // Store the successfully created room ID

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);

    const getUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.log('Session error:', sessionError);
          setUser(null);
          return;
        }

        if (session) {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.log('User error:', userError);
            setUser(null);
          } else {
            setUser(user);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Unexpected error getting user:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        if (event === 'SIGNED_IN' && session) {
          const { data: { user } } = await supabase.auth.getUser();
          setUser(user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      subscription.unsubscribe();
    };
  }, []);

  const generateRoomId = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) {
      alert('Please enter a room ID');
      return;
    }

    if (!user) {
      alert('Please sign in to join a room');
      router.push('/signin');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Your session has expired. Please sign in again.');
        router.push('/signin');
        return;
      }

      // Use the exact room ID from input (uppercase)
      const roomCode = roomId.toUpperCase().trim();
      
      const { data: room, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking room:', error);
        
        if (error.code === '42501') {
          alert('Permission denied. Please check if RLS policies are properly configured.');
        } else {
          alert('Error joining room: ' + error.message);
        }
        return;
      }

      if (!room) {
        alert('Room not found. Please check the room ID.');
        return;
      }

      const { error: memberError } = await supabase
        .from('room_members')
        .insert({
          room_id: room.id,
          user_id: user.id
        });

      if (memberError) {
        console.error('Error joining room:', memberError);
        if (memberError.code !== '23505') {
          alert('Error joining room: ' + memberError.message);
          return;
        }
      }

      console.log("Joining room:", roomCode);
      // Use the exact room code that was verified
      router.push(`/canvas?room=${roomCode}`);
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Unexpected error joining room');
    }
  };

  const handleCreateRoom = async () => {
    if (!user) {
      alert('Please sign in to create a room');
      router.push('/signin');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('Your session has expired. Please sign in again.');
      router.push('/signin');
      return;
    }

    setIsCreatingRoom(true);
    
    try {
      const newRoomId = generateRoomId();
      
      console.log('Creating room with ID:', newRoomId, 'for user:', user.id);
      
      // Create room in database
      const { data: room, error } = await supabase
        .from('rooms')
        .insert({
          name: `Room ${newRoomId}`,
          code: newRoomId,
          creator_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Full error object:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        if (error.code === '42P17') {
          alert('Database policy error (infinite recursion). Please check RLS policies.');
        } else if (error.code === '42501') {
          alert('Permission denied. RLS policies are blocking room creation.');
        } else if (error.code === '23505') {
          const retryId = generateRoomId();
          setRoomId(retryId);
          alert('Room ID already exists. Try again with the new generated ID.');
          return;
        } else if (error.code === 'PGRST116') {
          alert('No data returned after room creation. Check if RLS policies allow SELECT after INSERT.');
        } else {
          alert(`Error creating room: ${error.message || 'Unknown error'}`);
        }
        return;
      }

      if (!room) {
        alert('Room was created but no data returned. This might be an RLS policy issue.');
        return;
      }

      console.log('Room created successfully:', room);

      // Verify the room code matches what we intended to create
      if (room.code !== newRoomId) {
        console.warn('Room code mismatch! Expected:', newRoomId, 'Got:', room.code);
        // Use the actual code from the database
        setCreatedRoomId(room.code);
        setRoomId(room.code);
      } else {
        setCreatedRoomId(newRoomId);
        setRoomId(newRoomId);
      }

      // Add creator as room member
      const { error: memberError } = await supabase
        .from('room_members')
        .insert({
          room_id: room.id,
          user_id: user.id
        });

      if (memberError) {
        console.error('Error adding user to room:', memberError);
        if (memberError.code !== '23505') {
          alert('Warning: Could not add you as room member, but room was created.');
        }
      }

      // Initialize canvas state
      const { error: canvasError } = await supabase
        .from('canvas_state')
        .insert({
          room_id: room.id,
          state: { strokes: [] }
        });

      if (canvasError) {
        console.error('Error initializing canvas:', canvasError);
        alert('Warning: Could not initialize canvas, but room was created.');
      }

      console.log("Created new room. Database code:", room.code, "Our code:", newRoomId);
      
      // Use the actual room code from the database for redirection
      const roomCodeToUse = room.code || newRoomId;
      
      // Redirect to canvas with the verified room code
      setTimeout(() => {
        router.push(`/canvas?room=${roomCodeToUse}`);
      }, 500);
    } catch (error) {
      console.error('Unexpected error creating room:', error);
      console.error('Error type:', typeof error);
      console.error('Error string:', String(error));
      
      alert('Unexpected error creating room. Check console for details.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Unexpected error signing out:', error);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

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

      {/* Display created room ID at the top */}
      {createdRoomId && (
        <div className="relative z-50 bg-blue-900/50 border border-blue-700/50 backdrop-blur-sm py-3 px-8">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-white font-medium">Room Created: <span className="text-blue-300">{createdRoomId}</span></span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(createdRoomId);
                alert('Room ID copied to clipboard!');
              }}
              className="px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              Copy Room ID
            </button>
          </div>
        </div>
      )}

      <nav className="relative z-50 flex justify-between items-center p-8">
        <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-black rounded-sm"></div>
          </div>
          <span className="text-white font-light text-lg tracking-wide">DRW</span>
        </Link>
        
        {user ? (
          <div className="flex items-center space-x-4">
            <span className="text-white text-sm">Welcome, {user.email}</span>
            <button
              onClick={handleSignOut}
              className="px-6 py-2 bg-zinc-800 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-all duration-200 uppercase tracking-wide"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link 
            href="/signin"
            className="px-6 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-100 transition-all duration-200 uppercase tracking-wide"
          >
            Sign In
          </Link>
        )}
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
              {user ? 'Enter a room ID or create a new drawing session' : 'Sign in to join or create a drawing room'}
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
                disabled={isCreatingRoom || !user}
                className="w-full px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-all duration-200 text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!user ? 'Sign In Required' : isCreatingRoom ? 'Creating...' : 'Create Room'}
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
                  disabled={!user}
                />
                <p className="text-xs text-zinc-500 mt-2 font-light text-center">
                  {!user ? 'Please sign in to join a room' : 'Enter the 8-character room code'}
                </p>
              </div>

              <button
                type="submit"
                disabled={!user}
                className="w-full px-8 py-4 bg-white text-black font-medium rounded-lg hover:bg-zinc-100 transform hover:scale-[1.02] transition-all duration-200 text-sm uppercase tracking-wide shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!user ? 'Sign In Required' : 'Join Room'}
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
                  disabled={!user}
                  className="px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white font-light hover:bg-zinc-800 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                  disabled={!roomId || !user}
                  className="px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white font-light hover:bg-zinc-800 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Copy ID
                </button>
              </div>
            </form>
          </div>

          {!user && (
            <div className="mt-8 bg-amber-900/20 backdrop-blur-sm rounded-2xl border border-amber-800/30 p-6">
              <h3 className="text-lg font-light text-amber-300 mb-4 flex items-center">
                <svg className="w-5 h-5 text-amber-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Authentication Required
              </h3>
              <div className="space-y-3 text-sm text-amber-200 font-light">
                <p>You need to sign in to create or join drawing rooms.</p>
                <p>This ensures your drawings are saved and synced across all devices.</p>
              </div>
            </div>
          )}

          <div className="mt-12 bg-zinc-900/30 backdrop-blur-sm rounded-2xl border border-zinc-800/30 p-6">
            <h3 className="text-lg font-light text-white mb-4 flex items-center">
              <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How it works
            </h3>
            <div className="space-y-3 text-sm text-zinc-400 font-light">
              <p>1. Sign in to your account</p>
              <p>2. Create a new room or enter an existing room ID</p>
              <p>3. Share the room ID with your team members</p>
              <p>4. Start drawing together in real-time</p>
              <p>5. All changes sync instantly across all devices</p>
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