import { useState, useEffect } from 'react';
import client from '../lib/hc';
import { GridItem } from '@my-app/shared';
import { createClient } from '@supabase/supabase-js';
import { activeRoom, supabaseConfig, teacherAuth } from '../lib/storage';
import { readResponseBody, extractErrorMessage } from '../lib/apiResponse';
import { createAuthorizedPrivateChannel } from '../lib/realtimeChannel';

const cleanSupabaseUrl = (url: string): string => {
  return url
    .trim()
    .replace(/\/realtime\/v1\/?$/, '')
    .replace(/\/rest\/v1\/?$/, '')
    .trim();
};

export interface EditorCase {
  caseName: string;
  grid: Record<string, GridItem['type']>;
}

interface UseRoomLayoutProps {
  addToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  onClearLiveStatuses: () => void;
  supabaseUrl: string;
  supabaseAnonKey: string;
  setSupabaseUrl: (val: string) => void;
  setSupabaseAnonKey: (val: string) => void;
}

export function useRoomLayout({
  addToast,
  onClearLiveStatuses,
  supabaseUrl,
  supabaseAnonKey,
  setSupabaseUrl,
  setSupabaseAnonKey,
}: UseRoomLayoutProps) {
  const [roomName, setRoomName] = useState('一般講義室 301');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [cases, setCases] = useState<EditorCase[]>([
    { caseName: '通常講義 (標準)', grid: {} }
  ]);
  const [activeCaseIdx, setActiveCaseIdx] = useState(0);
  const [savedRooms, setSavedRooms] = useState<{ id: string; name: string; supabaseUrl?: string; supabaseAnonKey?: string; }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const fetchRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const res = await client.api.rooms.$get();
      if (res.ok) {
        const data = await res.json();
        setSavedRooms(data.rooms);
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const loadClassroom = async (id: string) => {
    try {
      const res = await client.api.rooms[':id'].$get({
        param: { id },
      });

      if (res.ok) {
        const data = await res.json();
        setRoomId(data.id);
        setRoomName(data.name);
        setIsActive(data.isActive !== false);
        
        try {
          activeRoom.save(data.id);
        } catch (e) {
          console.warn('Failed to save room ID to localStorage:', e);
        }

        // Load Supabase configurations into state
        setSupabaseUrl(data.supabaseUrl);
        setSupabaseAnonKey(data.supabaseAnonKey);

        const gridObj: Record<string, GridItem['type']> = {};
        if (data.grid) {
          data.grid.forEach((item: GridItem) => {
            gridObj[`${item.x},${item.y}`] = item.type;
          });
        }

        const loadedCases: EditorCase[] = [{
          caseName: '通常講義 (標準)',
          grid: gridObj,
        }];

        setCases(loadedCases);
        setActiveCaseIdx(0);
        addToast('success', `教室「${data.name}」を復元しました`);
      } else {
        addToast('error', '教室データの読み込みに失敗しました');
      }
    } catch (err: any) {
      addToast('error', `読み込みエラー: ${err.message}`);
    }
  };

  const saveClassroom = async (): Promise<boolean> => {
    if (!roomName.trim()) {
      addToast('error', '教室名を入力してください');
      return false;
    }

    const rawUrl = supabaseUrl.trim() || supabaseConfig.getUrl();
    const finalSupabaseUrl = cleanSupabaseUrl(rawUrl);
    const finalSupabaseAnonKey = supabaseAnonKey.trim() || supabaseConfig.getKey();

    if (!finalSupabaseUrl || !finalSupabaseAnonKey) {
      addToast('error', 'Supabase URL と Anon Key を設定してから保存してください');
      return false;
    }
    try {
      const parsedUrl = new URL(finalSupabaseUrl);
      if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password) throw new Error();
    } catch {
      addToast('error', 'Supabase URL には有効な HTTPS URL を指定してください');
      return false;
    }

    setIsSaving(true);
    
    const gridItems: GridItem[] = Object.entries(cases[0].grid).map(([coord, type]) => {
      const [xStr, yStr] = coord.split(',');
      return {
        x: parseInt(xStr, 10),
        y: parseInt(yStr, 10),
        type,
      };
    });

    try {
      if (roomId) {
        const res = await client.api.rooms[':id'].$put({
          param: { id: roomId },
          json: {
            name: roomName,
            grid: gridItems,
            supabaseUrl: finalSupabaseUrl,
            supabaseAnonKey: finalSupabaseAnonKey,
            isActive: isActive,
          },
        });

        if (res.ok) {
          addToast('success', `教室「${roomName}」のレイアウトを更新しました！`);
          try {
            activeRoom.save(roomId);
          } catch (e) {}
          fetchRooms();
          return true;
        } else {
          const body = await readResponseBody(res);
          const errorMsg = extractErrorMessage(body, '不明なエラー');
          addToast('error', `保存に失敗しました: ${errorMsg}`);
          return false;
        }
      } else {
        const res = await client.api.rooms.$post({
          json: {
            name: roomName,
            grid: gridItems,
            supabaseUrl: finalSupabaseUrl,
            supabaseAnonKey: finalSupabaseAnonKey,
            isActive: isActive,
          },
        });

        if (res.ok) {
          const body = await readResponseBody(res);
          if (body && typeof body === 'object' && 'id' in body) {
            const id = (body as any).id;
            setRoomId(id);
            try {
              activeRoom.save(id);
            } catch (e) {}
          }
          addToast('success', `新規教室「${roomName}」を作成・保存しました！`);
          fetchRooms();
          return true;
        } else {
          const body = await readResponseBody(res);
          const errorMsg = extractErrorMessage(body, '不明なエラー');
          addToast('error', `作成に失敗しました: ${errorMsg}`);
          return false;
        }
      }
    } catch (err: any) {
      addToast('error', `通信エラーが発生しました: ${err.message}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const createNewClassroomSession = () => {
    setRoomId(null);
    setRoomName('新規講義室');
    setCases([{ caseName: '通常講義 (標準)', grid: {} }]);
    setActiveCaseIdx(0);
    setIsActive(true);
    onClearLiveStatuses();
    try {
      activeRoom.clear();
    } catch (e) {}
    addToast('info', '新しい教室の編集スタジオを開始しました');
  };

  const addNewCase = () => {
    addToast('info', 'レイアウトパターンは現在1教室につき1つに簡素化されています。別教室としてご作成ください。');
  };

  const deleteCurrentCase = () => {
    addToast('warning', '教室全体のレイアウト削除はサポートされていません。');
  };

  const updateActiveCaseName = (newName: string) => {
    setCases((prevCases) => {
      const updated = [...prevCases];
      updated[activeCaseIdx] = {
        ...updated[activeCaseIdx],
        caseName: newName,
      };
      return updated;
    });
  };

  const updateGridCell = (x: number, y: number, type?: GridItem['type'], onRemoveStatus?: (key: string) => void) => {
    setCases((prevCases) => {
      const updated = [...prevCases];
      const key = `${x},${y}`;
      const newGrid = { ...updated[activeCaseIdx].grid };

      if (type) {
        newGrid[key] = type;
      } else {
        delete newGrid[key];
        if (onRemoveStatus) {
          onRemoveStatus(key);
        }
      }

      updated[activeCaseIdx] = {
        ...updated[activeCaseIdx],
        grid: newGrid,
      };
      return updated;
    });
  };

  const clearCurrentGrid = () => {
    setCases((prevCases) => {
      const updated = [...prevCases];
      updated[activeCaseIdx] = {
        ...updated[activeCaseIdx],
        grid: {},
      };
      return updated;
    });
  };

  const deleteClassroom = async (id: string, sbUrl?: string, sbKey?: string) => {
    if (!window.confirm('この講義室を完全に削除しますか？（この操作は取り消せません）')) {
      return;
    }

    // 1. Properly notify students by sending a teacher_reset broadcast before deletion
    const finalSbUrl = sbUrl || supabaseUrl;
    const finalSbKey = sbKey || supabaseAnonKey;
    if (finalSbUrl && finalSbKey) {
      try {
        const sb = createClient(finalSbUrl, finalSbKey);
        const channel = await createAuthorizedPrivateChannel(sb, teacherAuth.getSupabaseToken(), `room:${id}`);
        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.send({
              type: 'broadcast',
              event: 'teacher_reset',
              payload: { timestamp: new Date().toISOString() },
            });
            sb.removeChannel(channel);
          }
        });
      } catch (err) {
        console.error('Failed to send closing broadcast to Supabase:', err);
      }
    }

    // 2. Call the physical DELETE API
    try {
      const res = await client.api.rooms[':id'].$delete({
        param: { id },
      });

      if (res.ok) {
        addToast('success', '講義室を物理削除しました。');
        // If we are currently editing the deleted classroom, clear the editor state
        if (roomId === id) {
          setRoomId(null);
          setRoomName('新規講義室');
          setCases([{ caseName: '通常講義 (標準)', grid: {} }]);
          setActiveCaseIdx(0);
          setIsActive(true);
          onClearLiveStatuses();
        }
        fetchRooms();
      } else {
        const body = await readResponseBody(res);
        const errorMsg = extractErrorMessage(body, '不明なエラー');
        addToast('error', `講義室の削除に失敗しました: ${errorMsg}`);
      }
    } catch (err: any) {
      addToast('error', `削除中に通信エラーが発生しました: ${err.message}`);
    }
  };

  return {
    roomName,
    setRoomName,
    roomId,
    setRoomId,
    cases,
    setCases,
    activeCaseIdx,
    setActiveCaseIdx,
    savedRooms,
    isLoadingRooms,
    isSaving,
    isActive,
    setIsActive,
    fetchRooms,
    loadClassroom,
    saveClassroom,
    createNewClassroomSession,
    addNewCase,
    deleteCurrentCase,
    updateActiveCaseName,
    updateGridCell,
    clearCurrentGrid,
    deleteClassroom,
  };
}
