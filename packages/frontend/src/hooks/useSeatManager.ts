import { useState, useEffect, useCallback } from 'react';
import { LiveSeatStatus } from '@my-app/shared';

interface UseSeatManagerProps {
  roomId: string | null;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

export function useSeatManager({ roomId, addToast }: UseSeatManagerProps) {
  const [liveStatuses, setLiveStatuses] = useState<Record<string, LiveSeatStatus>>({});
  const [isSeatLocked, setIsSeatLocked] = useState(false);

  // Response data is intentionally kept only in memory for the active class.
  useEffect(() => {
    setLiveStatuses({});
  }, [roomId]);

  const removeLiveStatus = useCallback((key: string) => {
    setLiveStatuses((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const bulkResetLiveStatuses = useCallback(() => {
    if (!roomId) {
      addToast('error', '一括リセットを行うには、まず教室データを保存またはロードしてください');
      return false;
    }

    // Preserve student seating registration but reset status, comments, and times
    setLiveStatuses((prev) => {
      const next: Record<string, LiveSeatStatus> = {};
      Object.keys(prev).forEach((seatId) => {
        const current = prev[seatId];
        if (current) {
          next[seatId] = {
            ...current,
            status: 'none',          // Reset to neutral state (gray/blue)
            comment: '',             // Clear comments
            answeredAt: undefined,   // Clear the latest answer timestamp
          };
        }
      });
      return next;
    });

    addToast('success', '学生の着席は維持したまま、回答状態とコメントをリセットしました。');
    return true;
  }, [roomId, addToast]);

  const toggleSeatLock = useCallback(() => {
    const nextValue = !isSeatLocked;
    setIsSeatLocked(nextValue);
    addToast('info', `座席変更の制限を ${nextValue ? 'ロック(有効)しました' : '解除(無効)しました'}`);
    return nextValue;
  }, [isSeatLocked, addToast]);

  return {
    liveStatuses,
    setLiveStatuses,
    isSeatLocked,
    setIsSeatLocked,
    removeLiveStatus,
    bulkResetLiveStatuses,
    toggleSeatLock,
  };
}
