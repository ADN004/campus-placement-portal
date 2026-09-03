import { useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Shield, Check, Terminal } from 'lucide-react';
import {
  Panel, PanelHeading, PageHeading, SectionLabel, PrimaryButton, SecondaryButton,
} from '../../../components/admin/AdminUI';

/**
 * Take a copy of the database.
 *
 * Only a download. The restore is a command you run on the server, printed here
 * so it can be copied — this page cannot overwrite anything, which is why the
 * one button is not behind a confirmation.
 *
 * What it produces is every student's name, PRN, CGPA and contact details in one
 * plain-text file, so the handling notice is not boilerplate.
 */

const CONTENTS = [
  'Every student record and profile',
  'Extended profiles — height, weight, SSLC, and the rest',
  'Job listings and applications',
  'Placement officers and colleges',
  'PRN ranges and whitelist requests',
  'Notifications and activity logs',
  'Super-admin accounts',
  'Company requirement templates',
  'Academic year data',
  'Every relationship and foreign key',
];

const CRON_STEPS = [
  ['Install the nightly job — it runs at 2am', 'make hub-cron-setup'],
  ['Check it was installed', 'crontab -l'],
  ['Watch the backup log', 'tail -f ~/spc-backup.log'],
  ['List the saved files', 'ls -lh ~/dockers/campus-placement-portal/backups/'],
];

/**
 * A command, with a copy button.
 *
 * `navigator.clipboard` is undefined on an insecure origin and rejects when the
 * page is not focused, and the old handler awaited neither — so on plain HTTP
 * the button did nothing at all and said "Copied!" anyway.
 */
function Command({ code, block }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not reach the clipboard — select the command and copy it.');
    }
  };

  return (
    <div className="flex items-stretch gap-2">
      <code className={`flex-1 min-w-0 px-3 py-2 rounded-spc-admin-sm font-mono text-spc-xs
        bg-spc-surface-2 text-spc-ink border border-spc-line-strong overflow-x-auto
        ${block ? 'block' : ''}`}>
        {code}
      </code>
      <SecondaryButton onClick={handleCopy} className="flex-shrink-0">
        {copied ? <><Check size={14} aria-hidden="true" />Copied</> : 'Copy'}
      </SecondaryButton>
    </div>
  );
}

export default function BackupBody(p) {
  const { layout } = p;

  return (
    <div>
      <PageHeading
        eyebrow="Portal"
        title="Database Backup"
        subline="A full snapshot of the portal, as a PostgreSQL dump"
        size={layout === 'mobile' ? 'sm' : 'md'}
      />

      {/* -------------------------------------------------------- the button */}
      <Panel className="p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-spc-sm font-bold text-spc-ink">Take one now</h2>
            <p className="text-spc-xs text-spc-body mt-1 max-w-xl">
              Generates a live dump and downloads it. Usually 1–10&nbsp;MB, and it takes a moment.
              Worth doing before anything large — an academic year reset, say.
            </p>
          </div>
          <PrimaryButton onClick={p.onDownload} disabled={p.downloading} className="flex-shrink-0">
            <Download size={15} aria-hidden="true" />
            {p.downloading ? 'Generating…' : 'Download .sql'}
          </PrimaryButton>
        </div>

        {p.lastDownload && (
          <div className="mt-3 p-3 rounded-spc-admin bg-spc-ok-bg border border-spc-ok/30">
            <p className="text-spc-xs font-bold text-spc-ink">Downloaded this session</p>
            <p className="text-spc-xs text-spc-body font-mono break-all mt-0.5">
              {p.lastDownload.filename}
            </p>
            <p className="text-spc-xs text-spc-body">{p.lastDownload.time}</p>
          </div>
        )}
      </Panel>

      {/* ------------------------------------------------------- the warning */}
      <div className="flex gap-2.5 p-4 mb-4 rounded-spc-admin bg-spc-warn-bg border border-spc-warn/40">
        <Shield size={20} aria-hidden="true" className="text-spc-warn flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-spc-sm font-bold text-spc-ink">Handle the file carefully.</p>
          <p className="text-spc-xs text-spc-body mt-1">
            It holds every student&apos;s name, PRN, CGPA and contact details in plain text. Keep it
            somewhere access-controlled, and delete it once you are done with it.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------- what is in it */}
      <Panel className="mb-4">
        <PanelHeading>What the file contains</PanelHeading>
        <div className={`p-4 grid grid-cols-1 gap-1.5
          ${layout === 'desktop' ? 'sm:grid-cols-2' : ''}`}>
          {CONTENTS.map((item) => (
            <p key={item} className="flex items-start gap-2 text-spc-xs text-spc-ink">
              <Check size={14} aria-hidden="true" className="text-spc-ok flex-shrink-0 mt-0.5" />
              {item}
            </p>
          ))}
        </div>
        <div className="px-4 pb-4">
          <p className="text-spc-xs text-spc-body">
            A standard PostgreSQL dump — restore it with <span className="font-mono">psql</span>,
            or with the command below.
          </p>
        </div>
      </Panel>

      {/* ---------------------------------------------------------- the cron */}
      <Panel>
        <PanelHeading>Nightly backups, on the server</PanelHeading>
        <div className="p-4 space-y-4">
          <p className="text-spc-xs text-spc-body">
            This page is a manual copy. For crash protection you want the scheduled one — SSH in
            and run these once.
          </p>

          <ol className="space-y-3">
            {CRON_STEPS.map(([label, code], i) => (
              <li key={code} className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-6 h-6 flex-shrink-0
                  rounded-full bg-spc-surface-2 border border-spc-line-strong
                  text-spc-xs font-bold text-spc-ink tabular-nums mt-1.5">
                  {i + 1}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-spc-xs text-spc-body mb-1">{label}</span>
                  <Command code={code} />
                </span>
              </li>
            ))}
          </ol>

          <div className="pt-4 border-t border-spc-line">
            <SectionLabel>
              <span className="inline-flex items-center gap-1.5">
                <Terminal size={13} aria-hidden="true" />
                Restore from a file
              </span>
            </SectionLabel>
            <Command code="make hub-db-restore FILE=backups/hub_backup_YYYYMMDD_HHMMSS.sql" block />
            <p className="text-spc-xs text-spc-body mt-2">
              The cron script deletes backups older than 30 days on its own, so the disk does not
              fill up.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
