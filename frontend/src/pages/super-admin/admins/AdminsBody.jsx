import { UserPlus, Trash2, Power } from 'lucide-react';
import {
  Panel, PageHeading, SectionLabel, EmptyState,
  PrimaryButton, SecondaryButton, formatDate,
} from '../../../components/admin/AdminUI';

/**
 * The accounts that can do everything.
 *
 * A short list — usually two or three rows — of accounts with unrestricted
 * access, so the page is mostly about being careful rather than about volume.
 *
 * Two rules the server enforces are now visible here rather than discovered by
 * clicking into an error: you cannot deactivate your own account, and you cannot
 * delete it. Your own row says so.
 *
 * Delete stays available only for an already-deactivated admin, exactly as
 * before — deactivate first, then delete, so the destructive step is never one
 * click away from a working account.
 */

function Metric({ label, value, tone }) {
  const toneClass = tone === 'ok' ? 'text-spc-ok' : tone === 'bad' ? 'text-spc-bad' : 'text-spc-ink';
  return (
    <div className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin
      min-w-[120px] flex-1">
      <p className={`text-spc-metric font-bold tabular-nums ${toneClass}`}>{value}</p>
      <p className="text-spc-xs text-spc-body mt-0.5">{label}</p>
    </div>
  );
}

function Standing({ active }) {
  return active
    ? <span className="text-spc-xs font-semibold text-spc-ok">Active</span>
    : <span className="text-spc-xs font-semibold text-spc-bad">Deactivated</span>;
}

function AdminControls({ admin, isSelf, onToggleStatus, onDelete }) {
  if (isSelf) {
    return (
      <span className="text-spc-xs text-spc-body">
        This is you — you cannot deactivate or delete your own account.
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2 justify-end flex-wrap">
      <SecondaryButton onClick={() => onToggleStatus(admin.id, admin.is_active)}>
        <Power size={14} aria-hidden="true" />
        {admin.is_active ? 'Deactivate' : 'Activate'}
      </SecondaryButton>

      {!admin.is_active && (
        <button
          type="button"
          onClick={() => onDelete(admin.id, admin.email)}
          aria-label={`Permanently delete ${admin.email}`}
          title="Delete permanently"
          className="inline-flex items-center justify-center w-11 h-11 rounded-spc-admin-sm
            text-spc-body border border-spc-control
            hover:bg-spc-bad-bg hover:text-spc-bad transition-colors"
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

function AdminsTable({ admins, currentUserId, onToggleStatus, onDelete }) {
  return (
    <Panel className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <caption className="sr-only">
            Every super-admin account, with controls to activate, deactivate or delete each one.
          </caption>
          <thead>
            <tr className="bg-spc-surface-2 border-b-2 border-spc-rule-structural">
              {['Email', 'Status', 'Created', 'Last sign-in'].map((h) => (
                <th key={h} scope="col"
                  className="font-khand text-spc-label font-medium uppercase tracking-[0.12em]
                    text-spc-body text-left px-4 py-2.5 whitespace-nowrap">
                  {h}
                </th>
              ))}
              <th scope="col" className="px-4 py-2.5 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id}
                className="border-b border-spc-line last:border-b-0 hover:bg-spc-surface-2">
                <th scope="row" className="px-4 py-3 text-left text-spc-sm font-bold
                  text-spc-ink break-words">
                  {admin.email}
                </th>
                <td className="px-4 py-3"><Standing active={admin.is_active} /></td>
                <td className="px-4 py-3 text-spc-xs text-spc-body tabular-nums">
                  {formatDate(admin.created_at)}
                </td>
                <td className="px-4 py-3 text-spc-xs text-spc-body tabular-nums">
                  {admin.last_login ? formatDate(admin.last_login) : 'Never'}
                </td>
                <td className="px-4 py-3 text-right">
                  <AdminControls
                    admin={admin}
                    isSelf={admin.id === currentUserId}
                    onToggleStatus={onToggleStatus}
                    onDelete={onDelete}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function AdminsList({ admins, currentUserId, onToggleStatus, onDelete }) {
  return (
    <Panel className="overflow-hidden">
      <ul className="divide-y divide-spc-line">
        {admins.map((admin) => (
          <li key={admin.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-spc-sm font-bold text-spc-ink break-words min-w-0">
                {admin.email}
              </p>
              <Standing active={admin.is_active} />
            </div>
            <p className="text-spc-xs text-spc-body mt-1 tabular-nums">
              Created {formatDate(admin.created_at)}
              {' · '}
              {admin.last_login ? `last in ${formatDate(admin.last_login)}` : 'never signed in'}
            </p>
            <div className="mt-2">
              <AdminControls
                admin={admin}
                isSelf={admin.id === currentUserId}
                onToggleStatus={onToggleStatus}
                onDelete={onDelete}
              />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function AdminsBody(p) {
  const { layout } = p;

  return (
    <div>
      <PageHeading
        eyebrow="Portal"
        title="Super Admins"
        subline="Accounts with unrestricted access to everything"
        size={layout === 'mobile' ? 'sm' : 'md'}
      >
        <PrimaryButton onClick={p.onAdd}>
          <UserPlus size={15} aria-hidden="true" />
          Add super admin
        </PrimaryButton>
      </PageHeading>

      <div className="flex gap-3 flex-wrap mb-5">
        <Metric label="accounts" value={p.admins.length} />
        <Metric label="active" value={p.activeCount} tone="ok" />
        <Metric label="deactivated" value={p.inactiveCount}
          tone={p.inactiveCount > 0 ? 'bad' : undefined} />
      </div>

      <SectionLabel>
        {p.admins.length} {p.admins.length === 1 ? 'account' : 'accounts'}
      </SectionLabel>

      {p.admins.length === 0 ? (
        <Panel>
          <EmptyState>
            No super-admin accounts are listed. That should not be possible while you are
            signed in — reload, and tell someone if it persists.
          </EmptyState>
        </Panel>
      ) : (
        layout === 'desktop'
          ? (
            <AdminsTable
              admins={p.admins}
              currentUserId={p.currentUserId}
              onToggleStatus={p.onToggleStatus}
              onDelete={p.onDelete}
            />
          ) : (
            <AdminsList
              admins={p.admins}
              currentUserId={p.currentUserId}
              onToggleStatus={p.onToggleStatus}
              onDelete={p.onDelete}
            />
          )
      )}
    </div>
  );
}
