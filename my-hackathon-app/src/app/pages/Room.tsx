import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, LogIn, Pencil, Users } from "lucide-react";
import { toast } from "sonner";

const Rooms = () => {
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    toast.success(`Room created: ${newRoomCode}`);
    // In a real app, navigate to the drawing canvas
    console.log("Navigate to room:", newRoomCode);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      toast.error("Please enter a room code");
      return;
    }
    toast.success(`Joining room: ${roomCode}`);
    // In a real app, navigate to the drawing canvas
    console.log("Navigate to room:", roomCode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Pencil className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">DrawSync</span>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Your Drawing Rooms</h1>
            <p className="text-lg text-muted-foreground">
              Create a new room or join an existing one
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Create a Room</CardTitle>
                <CardDescription>
                  Start a new collaborative drawing session
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleCreateRoom} className="w-full" size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Room
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-2">
                  <LogIn className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Join a Room</CardTitle>
                <CardDescription>
                  Enter a room code to join a session
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleJoinRoom} className="space-y-4">
                  <Input
                    placeholder="Enter room code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="font-mono text-center text-lg"
                    maxLength={6}
                  />
                  <Button type="submit" variant="secondary" className="w-full" size="lg">
                    <LogIn className="w-4 h-4 mr-2" />
                    Join Room
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Users className="w-6 h-6" />
              Recent Rooms
            </h2>
            <div className="text-center py-12 text-muted-foreground">
              <p>No recent rooms yet. Create or join a room to get started!</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Rooms;
