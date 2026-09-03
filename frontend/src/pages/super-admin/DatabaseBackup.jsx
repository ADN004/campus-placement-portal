import { useState } from 'react';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../services/api';
import useDeviceType from '../../hooks/useDeviceType';
import BackupBody from './backup/BackupBody';

/**
 * Database backup — container.
 *
 * Read-only apart from the download itself: this page cannot restore anything,
 * which is why the one button is not behind a confirmation. The restore is a
 * command run on the server, printed on the page so it can be copied.
 *
 * No skeleton, because there is nothing to fetch before it can be shown.
 */
export default function DatabaseBackup() {
  const deviceType = useDeviceType();
  const [downloading, setDownloading] = useState(false);
  const [lastDownload, setLastDownload] = useState(null);

  const handleDownload = async () => {
    setDownloading(true);
    const toastId = toast.loading('Generating database backup... This may take a moment.');

    try {
      const response = await superAdminAPI.downloadDatabaseBackup();

      // Build filename from Content-Disposition header or fallback
      const contentDisposition = response.headers?.['content-disposition'] || '';
      const match = contentDisposition.match(/filename="(.+?)"/);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = match ? match[1] : `spc_backup_${timestamp}.sql`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      const now = new Date().toLocaleString('en-IN');
      setLastDownload({ filename, time: now });
      toast.success('Backup downloaded successfully!', { id: toastId });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Backup failed. Please try again.', { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <BackupBody
      layout={deviceType}
      downloading={downloading}
      lastDownload={lastDownload}
      onDownload={handleDownload}
    />
  );
}
