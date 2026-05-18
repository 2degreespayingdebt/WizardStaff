export interface Player {
    id: string;
    name: string;
    position: 'drinker';
    team: string | null;
    status: 'active' | 'injured' | 'out' | 'suspended';
    projectedPoints: number | null;
    adp: number | null;
    profileImage: string | null;
    description: string | null;
    createdAt: Date;
}
export declare function findAllPlayers(options?: {
    team?: string;
    status?: string;
    limit?: number;
    offset?: number;
}): Promise<Player[]>;
export declare function findPlayerById(id: string): Promise<Player | null>;
export declare function findPlayersByIds(ids: string[]): Promise<Player[]>;
export declare function findAvailablePlayers(leagueId: string, options?: {
    limit?: number;
}): Promise<Player[]>;
export declare function searchPlayers(searchTerm: string, limit?: number): Promise<Player[]>;
export declare function getPlayerCount(): Promise<number>;
export declare function updatePlayer(id: string, updates: {
    name?: string;
    profileImage?: string;
    description?: string;
    projectedPoints?: number;
}): Promise<Player | null>;
export declare function createDrinker(name: string, description?: string, profileImage?: string, team?: string, projectedPoints?: number, adpValue?: number): Promise<Player>;
export declare function setPlayerStatus(playerId: string, status: 'active' | 'injured' | 'out' | 'suspended'): Promise<Player | null>;
export declare function checkPlayerDraftedInCurrentSeason(playerId: string, seasonId: string): Promise<boolean>;
export declare function deletePlayer(id: string): Promise<void>;
//# sourceMappingURL=player.d.ts.map