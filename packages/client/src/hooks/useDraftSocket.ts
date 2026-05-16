import { useEffect, useCallback, useState } from 'react';
import { draftSocket } from '../services/socket';
import type { DraftBoard, DraftPick, Draft } from '../types';

interface UseDraftSocketProps {
  draftId: string | null;
  enabled?: boolean;
}

export function useDraftSocket({ draftId, enabled = true }: UseDraftSocketProps) {
  const [board, setBoard] = useState<DraftBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draftId || !enabled) return;

    draftSocket.connect();

    draftSocket.onDraftState((newBoard) => {
      setBoard(newBoard);
      setLoading(false);
    });

    draftSocket.onPickMade(({ draft, pick }) => {
      setError(null);
      // State update comes via draft:state
    });

    draftSocket.onDraftError(({ error }) => {
      setError(error);
      setLoading(false);
    });

    draftSocket.joinDraft(draftId);

    return () => {
      draftSocket.offAll();
    };
  }, [draftId, enabled]);

  const makePick = useCallback(
    (teamId: string, playerId: string) => {
      if (!draftId) return;
      setLoading(true);
      setError(null);
      draftSocket.makePick(draftId, teamId, playerId);
    },
    [draftId]
  );

  return { board, loading, error, makePick };
}