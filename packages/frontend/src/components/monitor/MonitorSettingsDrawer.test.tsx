// @vitest-environment jsdom
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MonitorSettingsDrawer } from './MonitorSettingsDrawer';

describe('MonitorSettingsDrawer', () => {
  afterEach(() => cleanup());

  it('shows the Student QR whenever a roomId exists without Supabase controls', () => {
    render(<MonitorSettingsDrawer roomId="room-123" />);

    expect(screen.getByAltText('Student QR Code')).toHaveAttribute(
      'src',
      expect.stringContaining(encodeURIComponent(`${window.location.origin}/student/room-123`)),
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', `${window.location.origin}/student/room-123`);
    expect(screen.queryByText('Supabase 接続設定')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('API URL')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('ANON KEY')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '設定を保存して接続' })).not.toBeInTheDocument();
    expect(screen.queryByText('Supabase 接続未設定')).not.toBeInTheDocument();
  });

  it('renders nothing until a roomId exists', () => {
    const { container } = render(<MonitorSettingsDrawer roomId={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
