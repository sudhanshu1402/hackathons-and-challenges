import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';

export default function Dashboard() {
  const { user } = useAuth();
  const [restoreId, setRestoreId] = useState('');
  const [message, setMessage] = useState('');

  const triggerBackup = async () => {
    try {
      setMessage('');
      await api.post('/backup/backup');
      setMessage('Backup completed. Check Google Drive.');
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Backup failed');
    }
  };

  const triggerRestore = async () => {
    try {
      setMessage('');
      await api.post('/backup/restore', { fileId: restoreId });
      setMessage('Restore initiated.');
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Restore failed');
    }
  };

  return (
    <div>
      <h1 className="text-2xl mb-4">Welcome, {user?.username}</h1>
      <p className="mb-4">Use the navigation to manage people, users, and reports.</p>

      {user?.role === 'ADMIN' && (
        <div className="p-4 border rounded space-y-3 max-w-xl">
          <h2 className="text-lg font-semibold">Backup & Restore</h2>
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={triggerBackup} className="btn">Backup to Drive</button>
            <input
              className="input"
              placeholder="Google Drive fileId for restore"
              value={restoreId}
              onChange={e => setRestoreId(e.target.value)}
            />
            <button onClick={triggerRestore} className="btn bg-red-600 text-white">Restore</button>
          </div>
          {message && <p className="text-sm text-gray-700">{message}</p>}
        </div>
      )}
    </div>
  );
}
