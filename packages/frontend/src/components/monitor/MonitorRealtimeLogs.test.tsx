// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MonitorRealtimeLogs } from './MonitorRealtimeLogs';

describe('MonitorRealtimeLogs', () => {
  it('shows each student latest answer even when there is no comment', () => {
    render(<MonitorRealtimeLogs realtimeLogs={[
      { id: '1', studentId: 'STU001', studentName: '山田 太郎', seatId: '1,1', status: 'ok', timestamp: '10:00:01' },
      { id: '2', studentId: 'STU002', studentName: '鈴木 花子', seatId: '1,2', status: 'ng', comment: '難しい', timestamp: '10:00:02' },
    ]} />);

    for (const text of ['STU001', '山田 太郎', '席 1,1', 'OK', '10:00:01', 'コメントなし', 'STU002', '鈴木 花子', '要確認', '難しい']) {
      expect(screen.getByText(text)).toBeTruthy();
    }
  });
});
