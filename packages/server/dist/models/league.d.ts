export interface LeagueSettings {
    scoringFormat: 'standard' | 'ppr' | 'half-ppr';
    rosterPositions: RosterPosition[];
    tradeDeadline: string | null;
    playoffTeams: number;
    waiverType: 'fab' | 'faab' | 'rolling';
}
export interface RosterPosition {
    pos: string;
    count: number;
}
export interface League {
    id: string;
    name: string;
    commissionerId: string;
    maxTeams: number;
    draftStatus: 'pending' | 'in_progress' | 'completed';
    draftDate: Date | null;
    scoringFormat: string;
    rosterPositions: RosterPosition[];
    tradeDeadline: Date | null;
    playoffTeams: number;
    waiverType: string;
    createdAt: Date;
}
export interface LeagueWithSettings extends League {
    settings: LeagueSettings;
}
export declare function createLeague(name: string, commissionerId: string, options?: Partial<Pick<League, 'maxTeams' | 'scoringFormat' | 'rosterPositions'>>): Promise<LeagueWithSettings>;
export declare function findLeagueById(id: string): Promise<LeagueWithSettings | null>;
export declare function findAllLeagues(): Promise<LeagueWithSettings[]>;
export declare function findLeaguesByUser(userId: string): Promise<LeagueWithSettings[]>;
export declare function findLeagueByInviteCode(code: string): Promise<LeagueWithSettings | null>;
export declare function generateInviteCode(leagueId: string): Promise<string>;
export declare function updateLeague(id: string, updates: Partial<Pick<League, 'name' | 'maxTeams' | 'scoringFormat' | 'draftDate' | 'draftStatus'> & {
    rosterPositions: string;
}>): Promise<LeagueWithSettings | null>;
export declare function deleteLeague(id: string): Promise<void>;
//# sourceMappingURL=league.d.ts.map