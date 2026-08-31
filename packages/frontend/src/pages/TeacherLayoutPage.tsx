import React from 'react';
import { useTeacherSession } from '../hooks/useTeacherSession';
import { TeacherView } from '../containers/TeacherView';
import { useRequireAuth, useLogout } from '../hooks/useRequireAuth';
import { TeacherHeader } from '../components/layout/TeacherHeader';

export const TeacherLayoutPage: React.FC = () => {
  useRequireAuth();
  const handleLogout = useLogout();

  const session = useTeacherSession();

  return (
    <div style={{ height: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', minWidth: '1280px', background: 'linear-gradient(135deg, rgba(210, 95, 55, 0.08) 0%, rgba(248, 250, 252, 0) 50%)' }}>
      <TeacherHeader activePage="layout" subtitle="教室設定" onLogout={handleLogout} />

      <TeacherView
        roomName={session.roomName}
        setRoomName={session.setRoomName}
        onCreateNewSession={session.createNewClassroomSession}
        cases={session.cases}
        activeCaseIdx={session.activeCaseIdx}
        setActiveCaseIdx={session.setActiveCaseIdx}
        onUpdateActiveCaseName={session.updateActiveCaseName}
        onAddNewCase={session.addNewCase}
        onDeleteCurrentCase={session.deleteCurrentCase}
        isLoadingRooms={session.isLoadingRooms}
        savedRooms={session.savedRooms}
        roomId={session.roomId}
        onLoadClassroom={session.loadClassroom}
        onFetchRooms={session.fetchRooms}
        realtimeLogs={session.realtimeLogs}
        isSeatLocked={session.isSeatLocked}
        onToggleSeatLock={session.handleToggleSeatLock}
        onClearGrid={session.clearCurrentGrid}
        onBulkReset={session.handleBulkReset}
        onSaveClassroom={session.saveClassroom}
        onDeleteClassroom={session.deleteClassroom}
        isSaving={session.isSaving}
        onDragEnd={session.handleDragEnd}
        onCellCycle={session.handleCellCycle}
        liveStatuses={session.liveStatuses}
      />
    </div>
  );
};
