import { useState, useEffect, useRef, useCallback } from 'react';
import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { RealtimeLog, LiveSeatStatus } from '@my-app/shared';
import { playAlertSound } from '../lib/audio';
import { createAuthorizedPrivateChannel } from '../lib/realtimeChannel';

interface UseTeacherRealtimeProps {
  supabase: SupabaseClient | null;
  realtimeToken: string;
  roomId: string | null;
  isSeatLocked: boolean;
  setLiveStatuses: React.Dispatch<React.SetStateAction<Record<string, LiveSeatStatus>>>;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

export function useTeacherRealtime({
  supabase,
  realtimeToken,
  roomId,
  isSeatLocked,
  setLiveStatuses,
  addToast
}: UseTeacherRealtimeProps) {
  const [realtimeLogs, setRealtimeLogs] = useState<RealtimeLog[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const teacherChannelRef = useRef<RealtimeChannel | null>(null);
  const teacherInboxRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const inboxReconnectTimeoutRef = useRef<any>(null);

  const isSeatLockedRef = useRef(isSeatLocked);
  const addToastRef = useRef(addToast);
  const networkOnlineRef = useRef(typeof navigator === 'undefined' ? true : navigator.onLine);
  const mainSubscribedRef = useRef(false);
  const inboxSubscribedRef = useRef(false);

  useEffect(() => { isSeatLockedRef.current = isSeatLocked; }, [isSeatLocked]);
  useEffect(() => { addToastRef.current = addToast; }, [addToast]);

  const updateRealtimeOnlineState = useCallback(() => {
    setIsOnline(networkOnlineRef.current && mainSubscribedRef.current && inboxSubscribedRef.current);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      networkOnlineRef.current = true;
      updateRealtimeOnlineState();
      addToastRef.current('success', 'ネットワークに再接続しました');
    };
    const handleOffline = () => {
      networkOnlineRef.current = false;
      setIsOnline(false);
      addToastRef.current('error', 'ネットワーク接続が切れました。オフライン動作中...');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateRealtimeOnlineState]);

  // Keep only the active class's latest responses in memory.
  useEffect(() => {
    setRealtimeLogs([]);
  }, [roomId]);

  useEffect(() => {
    if (teacherChannelRef.current) {
      teacherChannelRef.current.unsubscribe();
      teacherChannelRef.current = null;
    }
    if (teacherInboxRef.current) {
      teacherInboxRef.current.unsubscribe();
      teacherInboxRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (inboxReconnectTimeoutRef.current) {
      clearTimeout(inboxReconnectTimeoutRef.current);
      inboxReconnectTimeoutRef.current = null;
    }

    mainSubscribedRef.current = false;
    inboxSubscribedRef.current = false;
    setIsOnline(false);

    if (!supabase || !roomId || !realtimeToken) return;
    let cancelled = false;

    void (async () => {
      try {
        const channel = await createAuthorizedPrivateChannel(supabase, realtimeToken, `room:${roomId}`);
        const inbox = await createAuthorizedPrivateChannel(supabase, realtimeToken, `room:${roomId}:teacher`);
        if (cancelled) {
          void supabase.removeChannel(channel);
          void supabase.removeChannel(inbox);
          return;
        }

        const handleInboxStatus = (status: string) => {
          if (cancelled) return;
          if (status === 'SUBSCRIBED') {
            inboxSubscribedRef.current = true;
            updateRealtimeOnlineState();
            console.log(`[Teacher] Successfully subscribed to answer inbox: ${roomId}`);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            inboxSubscribedRef.current = false;
            updateRealtimeOnlineState();
            console.error(`[Teacher] Answer inbox subscription failed: ${status}`);
            addToastRef.current('error', '学生回答の受信Channelに接続できません。Realtime設定と認可を確認してください。');
            if (inboxReconnectTimeoutRef.current) {
              clearTimeout(inboxReconnectTimeoutRef.current);
            }
            inboxReconnectTimeoutRef.current = setTimeout(() => {
              if (teacherInboxRef.current) {
                teacherInboxRef.current.subscribe(handleInboxStatus);
              }
            }, 10000);
          }
        };

        inbox
          .on('broadcast', { event: 'student_to_teacher' }, (response) => {
        const payload = response.payload;
        if (payload && payload.seatId && payload.status) {
          const receivedAt = new Date().toLocaleTimeString('ja-JP');
          setLiveStatuses((prev) => {
            const nextStatuses = { ...prev };
            if (payload.status === 'none') {
              delete nextStatuses[payload.seatId];
            } else {
              nextStatuses[payload.seatId] = {
                status: payload.status,
                name: payload.studentName || '匿名',
                studentId: payload.studentId || '不明',
                comment: payload.comment || undefined,
                answeredAt: receivedAt,
              };
            }
            return nextStatuses;
          });

          if (payload.status === 'none') {
            setRealtimeLogs((prev) => prev.filter((log) => log.seatId !== payload.seatId));
          } else {
            const logItem: RealtimeLog = {
              id: crypto.randomUUID(),
              studentName: payload.studentName || '匿名',
              studentId: payload.studentId || '不明',
              seatId: payload.seatId,
              status: payload.status,
              comment: payload.comment || undefined,
              timestamp: receivedAt,
            };
            setRealtimeLogs((prev) => [
              logItem,
              ...prev.filter((log) => log.seatId !== payload.seatId),
            ]);
          }

          if (payload.status === 'ng') {
            playAlertSound();
          }
        }
          })
          .subscribe(handleInboxStatus);

        channel.subscribe((status) => {
        if (cancelled) return;
        if (status === 'SUBSCRIBED') {
          mainSubscribedRef.current = true;
          updateRealtimeOnlineState();
          console.log(`[Teacher] Successfully subscribed to channel: ${roomId}`);
          channel.send({
            type: 'broadcast',
            event: 'teacher_lock_state',
            payload: { locked: isSeatLockedRef.current },
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          mainSubscribedRef.current = false;
          updateRealtimeOnlineState();
          console.warn(`[Teacher] Realtime subscription failed: ${status}. Scheduling auto-reconnect in 10s...`);
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            if (teacherChannelRef.current) {
              teacherChannelRef.current.subscribe();
            }
          }, 10000);
        }
        });

        teacherChannelRef.current = channel;
        teacherInboxRef.current = inbox;
      } catch (err) {
        mainSubscribedRef.current = false;
        inboxSubscribedRef.current = false;
        setIsOnline(false);
        console.error('[Teacher] Realtime authorization failed:', err);
        addToastRef.current('error', 'リアルタイム認証に失敗しました。再ログインしてください。');
      }
    })();

    return () => {
      cancelled = true;
      if (teacherChannelRef.current) {
        teacherChannelRef.current.unsubscribe();
        teacherChannelRef.current = null;
      }
      if (teacherInboxRef.current) {
        teacherInboxRef.current.unsubscribe();
        teacherInboxRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (inboxReconnectTimeoutRef.current) {
        clearTimeout(inboxReconnectTimeoutRef.current);
        inboxReconnectTimeoutRef.current = null;
      }
    };
  }, [supabase, roomId, realtimeToken, setLiveStatuses, updateRealtimeOnlineState]);

  const sendTeacherResetBroadcast = useCallback(async (): Promise<'ok' | 'error'> => {
    const channel = teacherChannelRef.current;
    if (!channel) return 'error';

    try {
      const res = await channel.send({
        type: 'broadcast',
        event: 'teacher_reset',
        payload: { timestamp: new Date().toISOString() },
      });
      if (res === 'ok') {
        setRealtimeLogs([]);
      }
      return res === 'ok' ? 'ok' : 'error';
    } catch (err) {
      console.error('Failed to send teacher reset:', err);
      return 'error';
    }
  }, []);

  const sendStudentEvictedBroadcast = useCallback(async (seatId: string): Promise<'ok' | 'error'> => {
    const channel = teacherChannelRef.current;
    if (!channel) return 'error';

    try {
      const res = await channel.send({
        type: 'broadcast',
        event: 'student_evicted',
        payload: { seatId, timestamp: new Date().toISOString() },
      });
      return res === 'ok' ? 'ok' : 'error';
    } catch (err) {
      console.error('Failed to send student evicted broadcast:', err);
      return 'error';
    }
  }, []);

  const sendTeacherLockStateBroadcast = useCallback(async (locked: boolean): Promise<'ok' | 'error'> => {
    const channel = teacherChannelRef.current;
    if (!channel) return 'error';

    try {
      const res = await channel.send({
        type: 'broadcast',
        event: 'teacher_lock_state',
        payload: { locked },
      });
      return res === 'ok' ? 'ok' : 'error';
    } catch (err) {
      console.error('Failed to send teacher lock state:', err);
      return 'error';
    }
  }, []);

  const sendRoomLayoutUpdatedBroadcast = useCallback(async (): Promise<'ok' | 'error'> => {
    const channel = teacherChannelRef.current;
    if (!channel) return 'error';

    try {
      const res = await channel.send({
        type: 'broadcast',
        event: 'room_layout_updated',
        payload: { timestamp: new Date().toISOString() },
      });
      return res === 'ok' ? 'ok' : 'error';
    } catch (err) {
      console.error('Failed to send room layout updated broadcast:', err);
      return 'error';
    }
  }, []);

  return {
    realtimeLogs,
    setRealtimeLogs,
    isOnline,
    sendTeacherResetBroadcast,
    sendStudentEvictedBroadcast,
    sendTeacherLockStateBroadcast,
    sendRoomLayoutUpdatedBroadcast
  };
}
