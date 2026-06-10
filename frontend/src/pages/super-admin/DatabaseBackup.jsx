import { useState } from 'react';
import { superAdminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Database,
  Download,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  Terminal,
  Info,
} from 'lucide-react';
import AnimatedSection from '../../components/animation/AnimatedSection';

export default function DatabaseBackup() {
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
    <div className="min-h-screen pb-8">
      {/* Header */}
      <AnimatedSection delay={0}>
        <div className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-600 rounded-2xl shadow-2xl mb-8 p-8">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative z-10 flex items-center space-x-4">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
              <Database className="text-white" size={36} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                Database Backup
              </h1>
              <p className="text-teal-100 text-lg">
                Download a full snapshot of the placement portal database
              </p>
            </div>
          </div>
        </div>
      </AnimatedSection>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* What's included */}
        <AnimatedSection delay={0.08} className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg p-6 h-full">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <Info className="text-teal-600" size={20} />
              <span>What the backup contains</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                'All student records & profiles',
                'Extended profiles (height, weight, SSLC, etc.)',
                'Job listings & applications',
                'Placement officers & colleges',
                'PRN ranges & whitelist requests',
                'Notifications & activity logs',
                'Super admin accounts',
                'Company requirement templates',
                'Academic year data',
                'All relationships & foreign keys',
              ].map((item) => (
                <div key={item} className="flex items-center space-x-2 text-sm text-gray-700">
                  <CheckCircle size={14} className="text-teal-500 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4">
              The file is a standard PostgreSQL SQL dump. It can be restored using{' '}
              <code className="font-mono bg-gray-100 px-1 rounded">psql</code> or{' '}
              <code className="font-mono bg-gray-100 px-1 rounded">make hub-db-restore</code>.
            </p>
          </div>
        </AnimatedSection>

        {/* Download panel */}
        <AnimatedSection delay={0.12}>
          <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col justify-between h-full">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center space-x-2">
                <Download className="text-teal-600" size={20} />
                <span>On-Demand Backup</span>
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Click to generate and download a live backup of the database right now.
                The file size is typically 1–10 MB depending on data volume.
              </p>

              {lastDownload && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                  <p className="text-xs font-semibold text-green-800 mb-1">Last download this session</p>
                  <p className="text-xs text-green-700 font-mono break-all">{lastDownload.filename}</p>
                  <p className="text-xs text-green-600 mt-1">{lastDownload.time}</p>
                </div>
              )}
            </div>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:transform-none"
            >
              {downloading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download size={20} />
                  <span>Download Backup (.sql)</span>
                </>
              )}
            </button>
          </div>
        </AnimatedSection>
      </div>

      {/* Security notice */}
      <AnimatedSection delay={0.16}>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-start space-x-3">
          <Shield className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-semibold text-amber-800 mb-1">Keep backups secure</p>
            <p className="text-sm text-amber-700">
              Backup files contain all student personal data including names, PRNs, CGPA, and contact details.
              Store them in a secure, access-controlled location. Delete them when no longer needed.
            </p>
          </div>
        </div>
      </AnimatedSection>

      {/* Automated backup instructions */}
      <AnimatedSection delay={0.2}>
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
            <Clock className="text-teal-600" size={20} />
            <span>Automated Daily Backups (Server Cron)</span>
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            For crash protection, set up an automated nightly backup on the server.
            SSH in and run these one-time setup commands:
          </p>

          <div className="space-y-3">
            <CronStep
              step="1"
              label="Install the cron job (runs daily at 2 AM)"
              code="make hub-cron-setup"
            />
            <CronStep
              step="2"
              label="Verify it was installed"
              code="crontab -l"
            />
            <CronStep
              step="3"
              label="Check backup logs"
              code="tail -f ~/spc-backup.log"
            />
            <CronStep
              step="4"
              label="List saved backup files"
              code="ls -lh ~/dockers/campus-placement-portal/backups/"
            />
          </div>

          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center space-x-1">
              <Terminal size={12} />
              <span>Restore from a backup file</span>
            </p>
            <code className="text-xs text-gray-800 font-mono">
              make hub-db-restore FILE=backups/hub_backup_YYYYMMDD_HHMMSS.sql
            </code>
          </div>

          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs text-blue-800">
              <strong>Rotation:</strong> The cron script automatically deletes backups older than 30 days to save disk space.
              You can also manually download backups from this page before doing major changes like Academic Year Reset.
            </p>
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}

function CronStep({ step, label, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-start space-x-3">
      <div className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-2">
        {step}
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-600 mb-1">{label}</p>
        <div className="flex items-center space-x-2">
          <code className="flex-1 text-sm font-mono bg-gray-900 text-green-400 px-4 py-2 rounded-lg">
            {code}
          </code>
          <button
            onClick={handleCopy}
            className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium flex-shrink-0"
          >
            {copied ? (
              <span className="text-green-600">Copied!</span>
            ) : (
              'Copy'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
