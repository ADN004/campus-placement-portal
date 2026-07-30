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
 * Tablet (`md` up to below `lg`) presenter.
 *
 * One column for the form — a form read top to bottom shouldn't zig-zag between
 * columns — but the fields inside each section pair up two and three across, and
 * the account cards sit side by side at the end rather than stacking. Edit and
 * Save live in a sticky header strip so they're reachable from anywhere in the
 * form without a bottom bar eating the screen.
 */
export default function TabletProfile({
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
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36 }}
        className="mb-5"
      >
        <h1 className="text-spc-display-lg font-extrabold text-spc-ink">My profile</h1>
        <p className="text-spc-body text-spc-muted mt-1.5">
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

      <div className="sticky top-16 z-10 -mx-6 px-6 py-3 mb-4 bg-spc-ground flex items-center justify-between gap-4">
        <p className="text-spc-label font-bold uppercase text-spc-muted">
          {editMode ? 'Editing' : 'Viewing'}
        </p>
        <EditActions
          editMode={editMode}
          saving={saving}
          onEdit={onEdit}
          onSave={onSubmit}
          onCancel={onCancel}
        />
      </div>

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
        <div className="grid grid-cols-2 gap-4 items-start">
          <DocumentsSection
            profile={profile}
            formData={formData}
            editMode={editMode}
            onChange={onChange}
          />
          <PhotoSection profile={profile} />
        </div>
      </form>

      <div className="space-y-4 mt-4">
        {!extendedProfileLoading && (
          <ExtendedProfileSummary extendedProfile={extendedProfile} cols={2} />
        )}
        <div className="grid grid-cols-2 gap-4 items-start">
          <SecurityCard onChangePassword={onChangePassword} />
          <AccountInfoCard profile={profile} user={user} />
        </div>
        <StatusNotice status={profile?.registration_status} />
      </div>
    </div>
  );
}

/** Loading skeleton shaped like the tablet profile. */
export function TabletProfileSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-10 w-64 bg-spc-surface-2 rounded-spc-sm animate-pulse mb-3" />
      <div className="h-4 w-52 bg-spc-surface-2 rounded animate-pulse mb-6" />
      <div className="flex justify-end mb-4">
        <div className="h-12 w-40 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
      </div>
      <div className="space-y-4">
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
    </div>
  );
}
