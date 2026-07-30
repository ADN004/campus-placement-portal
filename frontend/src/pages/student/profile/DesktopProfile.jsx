import { motion } from 'framer-motion';
import {
  CorrectionBanner,
  EditActions,
  RegistrationDetails,
  ContactDetails,
  AcademicSection,
  DocumentsSection,
  BacklogsSection,
  PhotoSection,
  ExtendedProfileSummary,
  SecurityCard,
  AccountInfoCard,
  StatusNotice,
} from './profileSections';

/**
 * Desktop (`lg` and up) presenter — form on the left, account column on the
 * right, keeping the two-thirds / one-third split this page has always had.
 *
 * The Edit and Save controls sit in a sticky strip above the form: this page is
 * long, and having to scroll back to the top to save was the main friction on a
 * big screen.
 */
export default function DesktopProfile({
  profile,
  user,
  formData,
  editMode,
  saving,
  collegeBranches,
  cgpaLocked,
  cgpaUnlockEnd,
  backlogLocked,
  backlogUnlockEnd,
  extendedProfile,
  extendedProfileLoading,
  photoUploading,
  resolvingCorrection,
  onChange,
  onSubmit,
  onEdit,
  onCancel,
  onPhoto,
  onResolveCorrection,
  onChangePassword,
}) {
  return (
    <div>
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <h1 className="text-spc-display-lg font-extrabold text-spc-ink">My profile</h1>
        <p className="text-spc-body text-spc-muted mt-2">
          {profile?.student_name || 'View and manage your profile information'}
        </p>
      </motion.header>

      <CorrectionBanner
        profile={profile}
        editMode={editMode}
        photoUploading={photoUploading}
        resolvingCorrection={resolvingCorrection}
        onPhoto={onPhoto}
        onResolve={onResolveCorrection}
      />

      {/* Full width, above the grid. Keeping it inside the left column pushed
          that column's first card down while the right column started at the
          top, so the two never lined up. */}
      <div className="sticky top-16 z-10 -mx-2 px-2 py-3 mb-2 bg-spc-ground flex items-center justify-between gap-4">
        <p className="text-spc-label font-bold uppercase text-spc-muted">
          {editMode ? 'Editing your profile' : 'Profile information'}
        </p>
        <EditActions
          editMode={editMode}
          saving={saving}
          onEdit={onEdit}
          onSave={onSubmit}
          onCancel={onCancel}
        />
      </div>

      <div className="grid grid-cols-3 gap-5 items-start">
        <div className="col-span-2 space-y-4">
          <form onSubmit={onSubmit} className="space-y-4">
            <RegistrationDetails
              profile={profile}
              formData={formData}
              editMode={editMode}
              onChange={onChange}
              collegeBranches={collegeBranches}
              userEmail={user?.email}
              cols={2}
            />
            <ContactDetails
              profile={profile}
              formData={formData}
              editMode={editMode}
              onChange={onChange}
              cols={2}
            />
            <AcademicSection
              profile={profile}
              formData={formData}
              editMode={editMode}
              onChange={onChange}
              cgpaLocked={cgpaLocked}
              cgpaUnlockEnd={cgpaUnlockEnd}
              cols={3}
            />
            <BacklogsSection
              profile={profile}
              formData={formData}
              editMode={editMode}
              onChange={onChange}
              backlogLocked={backlogLocked}
              backlogUnlockEnd={backlogUnlockEnd}
              cols={3}
            />
            <DocumentsSection
              profile={profile}
              formData={formData}
              editMode={editMode}
              onChange={onChange}
            />
          </form>

          {!extendedProfileLoading && (
            <ExtendedProfileSummary extendedProfile={extendedProfile} cols={2} />
          )}
        </div>

        {/* Sticky: the form column is far taller, so without this the account
            column leaves a long empty gutter as you scroll past it. */}
        <div className="col-span-1 space-y-4 sticky top-32">
          <PhotoSection profile={profile} />
          <SecurityCard onChangePassword={onChangePassword} />
          <AccountInfoCard profile={profile} user={user} />
          <StatusNotice status={profile?.registration_status} />
        </div>
      </div>
    </div>
  );
}

/** Loading skeleton shaped like the desktop profile. */
export function DesktopProfileSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-11 w-72 bg-spc-surface-2 rounded-spc-sm animate-pulse mb-3" />
      <div className="h-4 w-60 bg-spc-surface-2 rounded animate-pulse mb-7" />

      <div className="grid grid-cols-3 gap-5 items-start">
        <div className="col-span-2 space-y-4">
          <div className="flex justify-end">
            <div className="h-12 w-40 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-spc border border-spc-line bg-spc-surface p-5">
              <div className="h-5 w-48 bg-spc-surface-2 rounded animate-pulse mb-4" />
              <div className="grid grid-cols-2 gap-4">
                {[...Array(6)].map((_, j) => (
                  <div key={j}>
                    <div className="h-3 w-20 bg-spc-surface-2 rounded animate-pulse mb-2" />
                    <div className="h-5 w-32 bg-spc-surface-2 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="col-span-1 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-spc border border-spc-line bg-spc-surface p-5">
              <div className="h-5 w-28 bg-spc-surface-2 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-4 w-full bg-spc-surface-2 rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
