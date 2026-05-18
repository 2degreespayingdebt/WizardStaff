export interface Season {
    id: string;
    leagueId: string;
    name: string;
    isActive: boolean;
    createdAt: Date;
}
export interface SeasonTeam {
    id: string;
    seasonId: string;
    teamId: string;
    seed: number | null;
    drinkCount: number;
    teamName?: string;
    createdAt: Date;
}
export declare function createSeason(leagueId: string, name: string): Promise<Season>;
export declare function findSeasonById(id: string): Promise<Season | null>;
export declare function findSeasonsByLeague(leagueId: string): Promise<Season[]>;
export declare function updateSeason(id: string, name: string): Promise<Season>;
export declare function setActiveSeason(seasonId: string): Promise<Season>;
export declare function addTeamToSeason(seasonId: string, teamId: string, seed?: number): Promise<SeasonTeam>;
export declare function removeTeamFromSeason(seasonId: string, teamId: string): Promise<void>;
export declare function updateSeasonTeamOrder(seasonId: string, teamId: string, order: number): Promise<void>;
export declare function getSeasonTeams(seasonId: string): Promise<SeasonTeam[]>;
export declare function setSeasonTeams(seasonId: string, teamIds: string[]): Promise<SeasonTeam[]>;
export declare function updateDrinkCount(seasonId: string, teamId: string, change: number): Promise<SeasonTeam>;
export declare function getSeasonLeaderboard(seasonId: string): Promise<SeasonTeam[]>;
export declare function deleteSeason(seasonId: string): Promise<void>;
//# sourceMappingURL=season.d.ts.map