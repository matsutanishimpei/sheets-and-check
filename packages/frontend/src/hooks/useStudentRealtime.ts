import { useState, useEffect, useRef, useCallback } from 'react';
import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { createAuthorizedPrivateChannel } from '../lib/realtimeChannel';

interface UseStudentRealtimeProps {
  supabase: SupabaseClient | null;
  studentClassroomId: string;
  studentToken: string;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  onTeacherReset: () => void;
  onTeacherEvict: (seatId: string) => void;
  onTeacherLockState: (locked: boolean) => void;
  onRoomLayoutUpdated: () => void;
}

export function useStudentRealtime({
  supabase,
  studentClassroomId,
  studentToken,
  addToast,
  onTeacherReset,
  onTeacherEvict,
  onTeacherLockState,
  onRoomLayoutUpdated
}: UseStudentRealtimeProps) {
  const [isFallbackActive, setIsFallbackActive] = useState(false);
  const studentChannelRef = useRef<RealtimeChannel | null>(null);

  const addToastRef = useRef(addToast);
  const onTeacherResetRef = useRef(onTeacherReset);
  const onTeacherEvictRef = useRef(onTeacherEvict);
  const onTeacherLockStateRef = useRef(onTeacherLockState);
  const onRoomLayoutUpdatedRef = useRef(onRoomLayoutUpdated);

  useEffect(() => { addToastRef.current = addToast; }, [addToast]);
  useEffect(() => { onTeacherResetRef.current = onTeacherReset; }, [onTeacherReset]);
  useEffect(() => { onTeacherEvictRef.current = onTeacherEvict; }, [onTeacherEvict]);
  useEffect(() => { onTeacherLockStateRef.current = onTeacherLockState; }, [onTeacherLockState]);
  useEffect(() => { onRoomLayoutUpdatedRef.current = onRoomLayoutUpdated; }, [onRoomLayoutUpdated]);

  // HTTP Fallback Auto-Polling
  useEffect(() => {
    if (!isFallbackActive || !studentClassroomId) return;

    let timer: any;
    const pollClassroom = async () => {
      try {
        const res = await fetch(`/api/rooms/${studentClassroomId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && onRoomLayoutUpdatedRef.current) {
            onRoomLayoutUpdatedRef.current();
          }
        }
      } catch (err) {
        console.warn('HTTP Fallback polling failed:', err);
      }
    };

    timer = setInterval(pollClassroom, 7000);
    return () => clearInterval(timer);
  }, [isFallbackActive, studentClassroomId]);

  // Student Realtime Subscription
  useEffect(() => {
    if (studentChannelRef.current) {
      studentChannelRef.current.unsubscribe();
      studentChannelRef.current = null;
    }

    if (!supabase || !studentClassroomId.trim() || !studentToken) return;
    let cancelled = false;

    void (async () => {
      try {
        const channel = await createAuthorizedPrivateChannel(supabase, studentToken, `room:${studentClassroomId}`);
        if (cancelled) {
          void supabase.removeChannel(channel);
          return;
        }

        channel
      .on('broadcast', { event: 'teacher_reset' }, (response) => {
        onTeacherResetRef.current();
      })
      .on('broadcast', { event: 'student_evicted' }, (response) => {
        if (response.payload && typeof response.payload.seatId === 'string') {
          onTeacherEvictRef.current(response.payload.seatId);
        }
      })
      .on('broadcast', { event: 'teacher_lock_state' }, (response) => {
        if (response.payload && typeof response.payload.locked === 'boolean') {
          onTeacherLockStateRef.current(response.payload.locked);
        }
      })
      .on('broadcast', { event: 'room_layout_updated' }, (response) => {
        onRoomLayoutUpdatedRef.current();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsFallbackActive(false);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[Student] Realtime subscription status failed: ${status}. Fallback activated.`);
          setIsFallbackActive(true);
          addToastRef.current('warning', 'リアルタイム接続に失敗しました。教室の接続設定に問題がある可能性があります。教員に確認してください。バックアップの自動同期へ移行しました。');
          setTimeout(() => {
            if (studentChannelRef.current) {
              studentChannelRef.current.subscribe();
            }
          }, 10000);
        }
      });

        studentChannelRef.current = channel;
      } catch (err) {
        console.error('[Student] Realtime authorization failed:', err);
        setIsFallbackActive(true);
      }
    })();

    return () => {
      cancelled = true;
      if (studentChannelRef.current) {
        studentChannelRef.current.unsubscribe();
        studentChannelRef.current = null;
      }
    };
  }, [supabase, studentClassroomId, studentToken]);

  const sendStudentToTeacherBroadcast = useCallback(async (
    seatId: string,
    status: 'ok' | 'ng' | 'none',
    _studentName: string,
    _studentId: string,
    comment?: string | null
  ): Promise<'ok' | 'error'> => {
    if (!studentToken || !studentClassroomId) return 'error';

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/rooms/${encodeURIComponent(studentClassroomId)}/student-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
        body: JSON.stringify({
          seatId,
          status,
          comment: comment || null,
        }),
      });
      return res.ok ? 'ok' : 'error';
    } catch (err) {
      console.error('Failed to send student broadcast:', err);
      return 'error';
    }
  }, [studentClassroomId, studentToken]);

  return {
    isFallbackActive,
    sendStudentToTeacherBroadcast
  };
}
