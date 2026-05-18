export interface Draft {
    id: string;
    leagueId: string;
    seasonId: string | null;
    status: 'scheduled' | 'active' | 'paused' | 'completed';
    currentPick: number;
    currentRound: number;
    currentManagerId: string | null;
    draftOrder: string[];
    pickTimeSeconds: number;
    pausedAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
}
export interface DraftPick {
    id: string;
    draftId: string;
    round: number;
    pick: number;
    teamId: string;
    playerId: string | null;
    selectedAt: Date;
}
export declare function createDraft(leagueId: string, pickTimeSeconds?: number): Promise<Draft>;
export declare function findDraftById(id: string): Promise<Draft | null>;
export declare function findDraftByLeague(leagueId: string): Promise<Draft | null>;
export declare function findDraftBySeason(seasonId: string): Promise<Draft | null>;
export declare function createDraftForSeason(leagueId: string, seasonId: string, teamIds: string[], pickTimeSeconds?: number): Promise<Draft>;
export declare function startDraft(draftId: string, teamIds: string[]): Promise<Draft>;
export declare function makePick(draftId: string, teamId: string, playerId: string): Promise<{
    draft: Draft;
    pick: DraftPick;
}>;
export declare function pauseDraft(draftId: string): Promise<Draft>;
export declare function undoPick(draftId: string): Promise<{
    draft: Draft;
    pick: DraftPick | null;
}>;
export declare function resumeDraft(draftId: string): Promise<Draft>;
export declare function getDraftBoard(draftId: string): Promise<{
    draft: Draft | null;
    picks: DraftPick[];
    availablePlayers: unknown[];
} | null>;
//# sourceMappingURL=draft.d.ts.map