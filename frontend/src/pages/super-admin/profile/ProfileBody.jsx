import { User, Mail, Phone, Lock, Shield, Edit, Save, X } from 'lucide-react';
import {
  Panel, PanelHeading, PageHeading, SectionLabel, FieldLabel, FIELD_CLASS,
  PrimaryButton, SecondaryButton, formatDate,
} from '../../../components/admin/AdminUI';

/**
 * The super-admin profile, at every width.
 *
 * One body with a `layout` prop: the devices differ in whether the two columns
 * sit side by side and how large the heading is, not in what they contain.
 *
 * The page it replaces put each field in its own gradient card — blue-to-indigo
 * for the email, purple-to-pink for the role, green-to-emerald for a list of
 * privileges — which made a three-field form look like a dashboard. It is a
 * form; it reads as one now.
 */

/** A value that cannot be edited here, and says so rather than looking broken. */
function ReadOnlyField({ label, icon: Icon, value, note }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <p className="flex items-center gap-2 min-h-[44px] px-3.5 py-2.5 rounded-spc-admin-sm
        bg-spc-surface-2 border border-spc-line-strong text-spc-sm text-spc-ink break-all">
        <Icon size={16} className="text-spc-body flex-shrink-0" aria-hidden="true" />
        {value || '—'}
      </p>
      {note && <p className="text-spc-xs text-spc-body mt-1.5">{note}</p>}
    </div>
  );
}

/** One fact about the account: a label and its value, on a hairline. */
function Fact({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-3 border-b border-spc-line last:border-b-0">
      <dt className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body">{label}</dt>
      <dd className="text-spc-sm font-semibold text-spc-ink text-right min-w-0 break-words">{value}</dd>
    </div>
  );
}

export default function ProfileBody(p) {
  const { layout } = p;
  const twoColumn = layout === 'desktop';

  return (
    <div>
      <PageHeading
        eyebrow="Account"
        title="Profile"
        subline="Your details, and how you sign in"
        size={layout === 'mobile' ? 'sm' : 'md'}
      />

      <div className={twoColumn ? 'grid grid-cols-3 gap-4 items-start' : 'space-y-4'}>
        <section className={twoColumn ? 'col-span-2' : ''}>
          <SectionLabel>Your details</SectionLabel>
          <Panel>
            <PanelHeading
              action={p.editMode ? null : (
                <SecondaryButton onClick={p.onEdit}>
                  <Edit size={15} aria-hidden="true" />
                  Edit
                </SecondaryButton>
              )}
            >
              Name, email and phone
            </PanelHeading>

            <form onSubmit={p.onSubmit} className="p-4 space-y-4">
              <div>
                <FieldLabel htmlFor="profile-name">Full name *</FieldLabel>
                {p.editMode ? (
                  <input
                    id="profile-name"
                    name="name"
                    value={p.formData.name}
                    onChange={p.onChange}
                    className={FIELD_CLASS}
                    required
                  />
                ) : (
                  <p className="flex items-center gap-2 min-h-[44px] px-3.5 py-2.5 rounded-spc-admin-sm
                    bg-spc-surface-2 border border-spc-line-strong text-spc-sm text-spc-ink">
                    <User size={16} className="text-spc-body flex-shrink-0" aria-hidden="true" />
                    {p.profile?.name || '—'}
                  </p>
                )}
              </div>

              {/* The email is the sign-in identity and is not editable here —
                  the page it replaces said so in fine print, and so does this. */}
              <ReadOnlyField
                label="Email address"
                icon={Mail}
                value={p.email}
                note="Email cannot be changed."
              />

              <div>
                <FieldLabel htmlFor="profile-phone">Phone number *</FieldLabel>
                {p.editMode ? (
                  <input
                    id="profile-phone"
                    name="phone_number"
                    value={p.formData.phone_number}
                    onChange={p.onChange}
                    className={FIELD_CLASS}
                    required
                  />
                ) : (
                  <p className="flex items-center gap-2 min-h-[44px] px-3.5 py-2.5 rounded-spc-admin-sm
                    bg-spc-surface-2 border border-spc-line-strong text-spc-sm text-spc-ink">
                    <Phone size={16} className="text-spc-body flex-shrink-0" aria-hidden="true" />
                    {p.profile?.phone_number || '—'}
                  </p>
                )}
              </div>

              {p.editMode && (
                <div className="flex items-center gap-2 pt-1">
                  <PrimaryButton type="submit" disabled={p.saving}>
                    <Save size={15} aria-hidden="true" />
                    {p.saving ? 'Saving…' : 'Save changes'}
                  </PrimaryButton>
                  <SecondaryButton onClick={p.onCancel} disabled={p.saving}>
                    <X size={15} aria-hidden="true" />
                    Cancel
                  </SecondaryButton>
                </div>
              )}
            </form>
          </Panel>
        </section>

        <div className="space-y-4">
          <section>
            <SectionLabel>Security</SectionLabel>
            <Panel>
              <div className="p-4">
                <p className="flex items-center gap-2 text-spc-sm font-bold text-spc-ink">
                  <Lock size={16} className="text-spc-body" aria-hidden="true" />
                  Password
                </p>
                <p className="text-spc-xs text-spc-body mt-1 mb-3">
                  Change it regularly to keep this account secure.
                </p>
                <SecondaryButton onClick={p.onChangePassword} className="w-full">
                  <Lock size={15} aria-hidden="true" />
                  Change password
                </SecondaryButton>
              </div>
            </Panel>
          </section>

          <section>
            <SectionLabel>Account</SectionLabel>
            <Panel className="overflow-hidden">
              <dl>
                <Fact
                  label="Role"
                  value={(
                    <span className="inline-flex items-center gap-1.5">
                      <Shield size={14} className="text-spc-accent" aria-hidden="true" />
                      Super Admin
                    </span>
                  )}
                />
                <Fact
                  label="Last login"
                  value={p.profile?.last_login ? formatDate(p.profile.last_login) : 'First session'}
                />
              </dl>
            </Panel>
          </section>
        </div>
      </div>
    </div>
  );
}
