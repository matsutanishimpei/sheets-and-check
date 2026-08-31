import React from 'react';
import { QrCode } from 'lucide-react';

interface MonitorSettingsDrawerProps {
  roomId: string | null;
}

export const MonitorSettingsDrawer: React.FC<MonitorSettingsDrawerProps> = ({
  roomId,
}) => {
  if (!roomId) return null;

  return (
    <div 
      className="card" 
      style={{ 
        width: '100%', 
        padding: '1.5rem', 
        display: 'flex', 
        gap: '1.5rem',
        border: '1px solid var(--border-color)',
      }}
    >
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flex: 1 }}>
          <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '12px', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
            <img 
               src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(window.location.origin + '/student/' + roomId)}`} 
              alt="Student QR Code" 
              style={{ width: '180px', height: '180px', display: 'block' }} 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <QrCode size={18} color="var(--color-student)" />
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>学生用チェックイン QR</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              学生はスマートフォンでこのQRコードを読み取ることで、アプリにログインして自分の座席を選択できます。
            </p>
            <a 
              href={`${window.location.origin}/student/${roomId}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ fontSize: '0.85rem', color: 'var(--color-student)', textDecoration: 'underline', marginTop: '0.5rem', wordBreak: 'break-all' }}
            >
              {window.location.origin}/student/{roomId}
            </a>
          </div>
      </div>
    </div>
  );
};
