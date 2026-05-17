import { useRole } from './useRole';

// Role check hook for components
export function useCan(role: 'admin' | 'teamLead'): boolean {
  const { role: currentRole } = useRole();
  return currentRole === role;
}

// Admin check
export function useIsAdmin(): boolean {
  const { isAdmin } = useRole();
  return isAdmin;
}

// Team Lead check  
export function useIsTeamLead(): boolean {
  const { isTeamLead } = useRole();
  return isTeamLead;
}

// Permission checks for specific features
export function usePermissions() {
  const { isAdmin, isTeamLead, role } = useRole();
  
  return {
    // League Management
    canCreateLeague: isAdmin,
    canEditLeague: isAdmin,
    canDeleteLeague: isAdmin,
    
    // Season Management
    canCreateSeason: isAdmin,
    canEditSeason: isAdmin,
    canActivateSeason: isAdmin,
    canSetSeasonTeams: isAdmin,
    
    // Draft Control
    canStartDraft: isAdmin,
    canPauseDraft: isAdmin,
    canResumeDraft: isAdmin,
    canUndoPick: isAdmin,
    
    // Drink Tracking
    canViewAllLeaderboards: isAdmin || isTeamLead, // Both can view
    canEditAnyTeamDrinks: isAdmin,
    canEditOwnTeamDrinks: isAdmin || isTeamLead, // Both can edit their own
    
    // Team View
    canViewAllTeams: isAdmin || isTeamLead, // Both can view
    canEditAnyTeam: isAdmin,
    canEditOwnTeam: isAdmin || isTeamLead, // Both can edit their own
    
    // Player Management
    canCreatePlayer: isAdmin,
    canEditAnyPlayer: isAdmin,
    
    // General
    isAdmin: isAdmin,
    isTeamLead: isTeamLead,
    role: role,
  };
}