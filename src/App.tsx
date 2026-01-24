import { useState, useEffect } from 'react';
import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer';
import { LogOut } from 'lucide-react';
import { Singularity } from '@/game';
import { Board } from '@/components/Board';
import { Lobby, clearStoredCredentials } from '@/components/Lobby';
import { Button } from '@/components/ui/button';
import type { GameState } from '@/game/types';

const getServerUrl = () => {
  const hostname = window.location.hostname;
  return `http://${hostname}:8000`;
};

interface GameSession {
  matchID: string;
  playerID: string;
  credentials: string;
}

export function App() {
  const [session, setSession] = useState<GameSession | null>(null);
  const [serverUrl] = useState(getServerUrl);

  const SingularityClient = Client<GameState>({
    game: Singularity,
    board: Board,
    multiplayer: SocketIO({ server: serverUrl }),
    debug: false,
  });

  const handleJoinMatch = (matchID: string, playerID: string, credentials: string) => {
    setSession({ matchID, playerID, credentials });
  };

  const handleLeaveMatch = () => {
    clearStoredCredentials();
    setSession(null);
  };

  useEffect(() => {
    return () => {};
  }, []);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Lobby serverUrl={serverUrl} onJoinMatch={handleJoinMatch} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-700">
        <div className="flex items-center justify-between px-4 py-2">
          <h1 className="text-xl font-bold text-white">
            <span className="text-purple-400">Singularity</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500">
              Match: {session.matchID.slice(0, 8)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLeaveMatch}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Leave
            </Button>
          </div>
        </div>
      </header>

      {/* Main game area with top padding for fixed header */}
      <main className="pt-14">
        <SingularityClient
          matchID={session.matchID}
          playerID={session.playerID}
          credentials={session.credentials}
        />
      </main>
    </div>
  );
}
