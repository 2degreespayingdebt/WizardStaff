import { useState, useEffect } from 'react';

type UserRole = 'admin' | 'teamLead' | 'player' | null;

export function useRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth on mount
    const storedRole = localStorage.getItem('wizardstaff_role') as UserRole;
    const auth = localStorage.getItem('wizardstaff_auth');
    
    if (auth === 'true' && storedRole) {
      setRole(storedRole);
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = (userRole: UserRole) => {
    localStorage.setItem('wizardstaff_role', userRole);
    localStorage.setItem('wizardstaff_auth', 'true');
    setRole(userRole);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('wizardstaff_role');
    localStorage.removeItem('wizardstaff_auth');
    setRole(null);
    setIsAuthenticated(false);
  };

  const isAdmin = role === 'admin';
  const isTeamLead = role === 'teamLead';
  const isPlayer = role === 'player';

  return {
    role,
    isAuthenticated,
    loading,
    login,
    logout,
    isAdmin,
    isTeamLead,
    isPlayer,
  };
}