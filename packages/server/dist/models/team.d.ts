export interface Team {
    id: string;
    leagueId: string;
    managerId: string | null;
    name: string;
    avatarUrl: string | null;
    createdAt: Date;
}
export interface RosterSlot {
    id: string;
    teamId: string;
    playerId: string | null;
    slotType: 'starter' | 'bench' | 'ir';
    position: string;
}
export declare function createTeam(leagueId: string, managerId: string, name: string): Promise<Team>;
export declare function findTeamById(id: string): Promise<Team | null>;
export declare function findTeamsByLeague(leagueId: string): Promise<Team[]>;
export declare function findTeamByUserAndLeague(userId: string, leagueId: string): Promise<Team | null>;
export declare function getTeamRoster(teamId: string): Promise<RosterSlot[]>;
export declare function addPlayerToRoster(teamId: string, playerId: string, position: string, slotType?: 'starter' | 'bench' | 'ir'): Promise<RosterSlot>;
export declare function updateRosterSlot(slotId: string, playerId: string | null): Promise<RosterSlot | null>;
export declare function updateTeam(id: string, updates: {
    teamName?: string;
    avatarUrl?: string;
}): Promise<Team | null>;
export declare function updateTeamOrder(teamId: string, order: number): Promise<void>;
//# sourceMappingURL=team.d.ts.map