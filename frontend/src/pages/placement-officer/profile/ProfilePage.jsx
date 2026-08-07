import { Edit, Save, X, Lock, User, Image as ImageIcon } from 'lucide-react';
import {
  PageHeading, Panel, PanelHeading, SectionLabel,
  PrimaryButton, SecondaryButton, PositiveButton,
} from '../../../components/officer/OfficerUI';
import { FactRow, EditableFields, MediaBlock } from './profileShared';

/**
 * My Profile.
 *
 * Three kinds of thing, kept apart: the two fields the officer can change, the
 * facts only the Super Admin can change, and the two images. The old page gave
 * all of them the same gradient tile, so there was no way to tell by looking
 * which lines were yours to edit.
 */
export default function ProfilePage({
  layout,
  profile,
  formData,
  editMode,
  saving,
  photo,
  logo,
  onChange,
  onEdit,
  onSave,
  onCancel,
  onChangePassword,
}) {
  const isDesktop = layout === 'desktop';
  const isMobile = layout === 'mobile';

  const details = (
    <section>
      <SectionLabel>Your details</SectionLabel>
      <Panel>
        <PanelHeading
          action={
            editMode ? null : (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-2 text-spc-xs
                  font-bold text-spc-ink hover:text-spc-accent transition-colors"
              >
                <Edit size={14} aria-hidden="true" />
                <span>Edit</span>
              </button>
            )
          }
        >
          What you can change
        </PanelHeading>

        <form onSubmit={onSave}>
          <EditableFields
            editMode={editMode}
            formData={formData}
            profile={profile}
            onChange={onChange}
          />

          {editMode && (
            <div className={`flex items-center gap-2 px-4 py-4 border-t border-spc-line
              ${isMobile ? 'flex-col-reverse' : 'flex-wrap'}`}>
              <SecondaryButton
                type="button"
                onClick={onCancel}
                disabled={saving}
                className={isMobile ? 'w-full' : undefined}
              >
                <X size={15} aria-hidden="true" />
                <span>Cancel</span>
              </SecondaryButton>
              <PositiveButton
                type="submit"
                disabled={saving}
                className={isMobile ? 'w-full' : undefined}
              >
                <Save size={15} aria-hidden="true" />
                <span>{saving ? 'Saving…' : 'Save changes'}</span>
              </PositiveButton>
            </div>
          )}
        </form>
      </Panel>
    </section>
  );

  const facts = (
    <section>
      <SectionLabel>Set by the Super Admin</SectionLabel>
      <Panel>
        <PanelHeading>Ask them to change any of these</PanelHeading>
        <FactRow
          label="Phone number"
          value={profile?.phone_number}
          note="This is also what you sign in with."
        />
        <FactRow label="College" value={profile?.college_name} />
        <FactRow label="Region" value={profile?.region_name} />
        <FactRow
          label="Appointed"
          value={
            profile?.appointed_date
              ? new Date(profile.appointed_date).toLocaleDateString('en-IN', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })
              : null
          }
        />
        <FactRow
          label="Last signed in"
          value={
            profile?.last_login
              ? new Date(profile.last_login).toLocaleString('en-IN', {
                  year: 'numeric', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })
              : null
          }
        />
      </Panel>
    </section>
  );

  const security = (
    <section>
      <SectionLabel>Security</SectionLabel>
      <Panel>
        <PanelHeading>Password</PanelHeading>
        <div className="px-4 py-4">
          <p className="text-spc-xs text-spc-body leading-snug mb-3">
            Change it if you think anyone else knows it, or if you are still on the one you were
            given.
          </p>
          <SecondaryButton onClick={onChangePassword} className={isMobile ? 'w-full' : undefined}>
            <Lock size={15} aria-hidden="true" />
            <span>Change password</span>
          </SecondaryButton>
        </div>
      </Panel>
    </section>
  );

  const photoBlock = (
    <section>
      <SectionLabel>Your photo</SectionLabel>
      <MediaBlock
        title="Profile photo"
        imageUrl={profile?.photo_url}
        alt={profile?.officer_name ? `${profile.officer_name}'s profile photo` : 'Profile photo'}
        emptyIcon={User}
        inputId="officer-photo-upload"
        inputRef={photo.inputRef}
        uploading={photo.uploading}
        deleting={photo.deleting}
        onSelect={photo.onSelect}
        onDelete={photo.onDelete}
        error={photo.error}
      />
    </section>
  );

  const logoBlock = (
    <section>
      <SectionLabel>College branding</SectionLabel>
      <MediaBlock
        title="College logo"
        hint="Goes on the placement poster and official documents. A square image, 500×500 or larger, reproduces best."
        imageUrl={logo.url}
        alt={profile?.college_name ? `${profile.college_name} logo` : 'College logo'}
        emptyIcon={ImageIcon}
        fit="contain"
        inputId="college-logo-upload"
        inputRef={logo.inputRef}
        uploading={logo.uploading}
        deleting={logo.deleting}
        onSelect={logo.onSelect}
        onDelete={logo.onDelete}
        error={logo.error}
        footNote={logo.url ? '' : 'The placement poster cannot be generated until this is uploaded.'}
      />
    </section>
  );

  return (
    <div className={isMobile ? 'pb-2' : undefined}>
      <PageHeading
        eyebrow={profile?.college_name || undefined}
        title="My Profile"
        subline={profile?.officer_name || undefined}
        size={isMobile ? 'sm' : 'md'}
      >
        {!editMode && !isMobile && (
          <PrimaryButton onClick={onEdit}>
            <Edit size={15} aria-hidden="true" />
            <span>Edit profile</span>
          </PrimaryButton>
        )}
      </PageHeading>

      {isDesktop ? (
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5 items-start">
          <div className="space-y-5">
            {details}
            {facts}
          </div>
          <div className="space-y-5">
            {photoBlock}
            {logoBlock}
            {security}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {details}
          {photoBlock}
          {facts}
          {logoBlock}
          {security}
        </div>
      )}
    </div>
  );
}
