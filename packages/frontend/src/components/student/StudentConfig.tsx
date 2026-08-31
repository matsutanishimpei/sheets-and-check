import React from 'react';
import { LogIn, AlertTriangle, CornerDownRight } from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';
import { filterStudentId } from '../../lib/studentIdHelper';

interface StudentConfigProps {
  supabase: SupabaseClient | null;
  studentClassroomId: string;
  setStudentClassroomId: (val: string) => void;
  studentId: string;
  setStudentId: (val: string) => void;
  studentName: string;
  setStudentName: (val: string) => void;
  onLogin: () => void;
}

export const StudentConfig: React.FC<StudentConfigProps> = React.memo(({
  supabase,
  studentClassroomId,
  setStudentClassroomId,
  studentId,
  setStudentId,
  studentName,
  setStudentName,
  onLogin,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="student-title-group">
        <h2 className="student-title">
          <LogIn size={24} style={{ color: 'var(--color-student)' }} /> 学生ログイン
        </h2>
        <p className="student-subtitle">教室を選択して授業に登録（固定席を確定）します</p>
      </div>

      {!supabase && (
        <div style={{ display: 'flex', gap: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.85rem', color: 'var(--color-obstacle)' }}>
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <span>Realtime 接続を開始できません。システム管理者に接続環境を確認してください。</span>
        </div>
      )}

      <div className="input-group">
        <label className="input-label">教室の UUID (Channel ID)</label>
        <input
          type="text"
          className="text-input"
          placeholder="教員画面の UUID チャンネルをここにペースト"
          value={studentClassroomId}
          onChange={(e) => setStudentClassroomId(e.target.value)}
        />
      </div>

      <div className="input-group">
        <label className="input-label">学籍番号 (半角英数字 5〜15文字)</label>
        <input
          type="text"
          className="text-input"
          placeholder="例: 24TE1234"
          value={studentId}
          onChange={(e) => setStudentId(filterStudentId(e.target.value))}
        />
      </div>

      <div className="input-group">
        <label className="input-label">あなたのお名前 (全角)</label>
        <input
          type="text"
          className="text-input"
          placeholder="例: 山田太郎"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
        />
      </div>

      <button 
        className="btn btn-primary" 
        style={{ width: '100%', padding: '1rem', fontSize: '1rem', justifyContent: 'center' }}
        onClick={onLogin}
        disabled={!supabase}
      >
        <CornerDownRight size={18} /> 教室に入る
      </button>
    </div>
  );
});

StudentConfig.displayName = 'StudentConfig';
