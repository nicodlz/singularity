import { useState, useEffect, useCallback } from 'react';
import { LobbyClient } from 'boardgame.io/client';
import { Users, Plus, RefreshCw, LogIn, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LobbyMatch, PlayerCredentials } from '@/types/game';

const STORAGE_KEY = 'boardgame-lobby-credentials';
const GAME_NAME = 'singularity';

interface LobbyProps {
  serverUrl: string;
  onJoinMatch: (matchID: string, playerID: string, credentials: string) => void;
}

export function Lobby({ serverUrl, onJoinMatch }: LobbyProps) {
  const [matches, setMatches] = useState<LobbyMatch[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lobbyClient = new LobbyClient({ server: serverUrl });

  const loadMatches = useCallback(async () => {
    try {
      const { matches } = await lobbyClient.listMatches(GAME_NAME);
      setMatches(matches.filter((m: LobbyMatch) => !m.gameover));
      setError(null);
    } catch {
      setError('Failed to load matches');
    }
  }, []);

  useEffect(() => {
    loadMatches();
    const interval = setInterval(loadMatches, 3000);
    return () => clearInterval(interval);
  }, [loadMatches]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const creds: PlayerCredentials = JSON.parse(stored);
      setPlayerName(creds.playerName);
      onJoinMatch(creds.matchID, creds.playerID, creds.credentials);
    }
  }, []);

  const saveCredentials = (creds: PlayerCredentials) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
  };

  const handleCreateMatch = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { matchID } = await lobbyClient.createMatch(GAME_NAME, { numPlayers: 2 });
      const { playerCredentials } = await lobbyClient.joinMatch(GAME_NAME, matchID, {
        playerID: '0',
        playerName: playerName.trim(),
      });

      const creds: PlayerCredentials = {
        matchID,
        playerID: '0',
        credentials: playerCredentials,
        playerName: playerName.trim(),
      };

      saveCredentials(creds);
      onJoinMatch(matchID, '0', playerCredentials);
    } catch {
      setError('Failed to create match');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinMatch = async (match: LobbyMatch) => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    const availableSeat = match.players.find((p) => !p.name);
    if (!availableSeat) {
      setError('No available seats');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { playerCredentials } = await lobbyClient.joinMatch(GAME_NAME, match.matchID, {
        playerID: String(availableSeat.id),
        playerName: playerName.trim(),
      });

      const creds: PlayerCredentials = {
        matchID: match.matchID,
        playerID: String(availableSeat.id),
        credentials: playerCredentials,
        playerName: playerName.trim(),
      };

      saveCredentials(creds);
      onJoinMatch(match.matchID, String(availableSeat.id), playerCredentials);
    } catch {
      setError('Failed to join match');
    } finally {
      setIsLoading(false);
    }
  };

  const getMatchStatus = (match: LobbyMatch) => {
    const joinedPlayers = match.players.filter((p) => p.name);
    const availableSeats = match.players.length - joinedPlayers.length;

    return {
      joined: joinedPlayers.length,
      total: match.players.length,
      canJoin: availableSeats > 0,
    };
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">
          <span className="text-purple-400">Singularity</span>
        </h1>
        <p className="text-slate-400">Race to artificial superintelligence</p>
      </div>

      {/* Join Card */}
      <Card className="bg-slate-800/80 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-400" />
            Enter the Game
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            disabled={isLoading}
            maxLength={20}
            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
          />

          <Button
            onClick={handleCreateMatch}
            disabled={isLoading || !playerName.trim()}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            {isLoading ? 'Creating...' : 'Create New Match'}
          </Button>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Matches Card */}
      <Card className="bg-slate-800/80 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg text-white">Available Matches</CardTitle>
            <CardDescription className="text-slate-500">{matches.length} matches found</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadMatches}
            disabled={isLoading}
            className="text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No matches available</p>
              <p className="text-sm">Create one to start playing!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => {
                const status = getMatchStatus(match);
                const hostPlayer = match.players.find((p) => p.name);

                return (
                  <div
                    key={match.matchID}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-600 bg-slate-700/30"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-white">
                        {hostPlayer?.name || 'Unknown'}'s game
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={status.canJoin
                            ? 'border-purple-500 text-purple-400'
                            : 'border-slate-600 text-slate-500'
                          }
                        >
                          <Users className="h-3 w-3 mr-1" />
                          {status.joined}/{status.total}
                        </Badge>
                        {!status.canJoin && (
                          <Badge variant="outline" className="border-yellow-600 text-yellow-500">
                            Full
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleJoinMatch(match)}
                      disabled={isLoading || !status.canJoin || !playerName.trim()}
                      className="bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50"
                    >
                      <LogIn className="h-4 w-4 mr-1" />
                      Join
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function clearStoredCredentials() {
  localStorage.removeItem(STORAGE_KEY);
}
