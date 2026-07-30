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
 * Mobile (below `md`) presenter — one column, every section full width.
 *
 * While editing, Save and Cancel are pinned to the bottom of the screen. This
 * form is long enough that on a phone the buttons would otherwise sit far above
 * whatever field you were typing in, and you'd have to scroll back up to save.
 */
export default function MobileProfile({
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
    <div className={editMode ? "pb-32" : ""}>
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
        className="mb-5"
      >
        <h1 className="text-spc-display font-extrabold text-spc-ink">My profile</h1>
        <p className="text-spc-sm text-spc-muted mt-1">
          {profile?.student_name || 'View and manage your details'}
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

      {!editMode && (
        <div className="mb-5">
          <EditActions editMode={false} onEdit={onEdit} full />
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <RegistrationDetails
          profile={profile}
          formData={formData}
          editMode={editMode}
          onChange={onChange}
          collegeBranches={collegeBranches}
          userEmail={user?.email}
          cols={1}
        />
        <ContactDetails
          profile={profile}
          formData={formData}
          editMode={editMode}
          onChange={onChange}
          cols={1}
        />
        <AcademicSection
          profile={profile}
          formData={formData}
          editMode={editMode}
          onChange={onChange}
          cgpaLocked={cgpaLocked}
          cgpaUnlockEnd={cgpaUnlockEnd}
          cols={2}
        />
        <BacklogsSection
          profile={profile}
          formData={formData}
          editMode={editMode}
          onChange={onChange}
          backlogLocked={backlogLocked}
          backlogUnlockEnd={backlogUnlockEnd}
          cols={2}
        />
        <DocumentsSection
          profile={profile}
          formData={formData}
          editMode={editMode}
          onChange={onChange}
        />
        <PhotoSection profile={profile} />
      </form>

      <div className="space-y-4 mt-4">
        {!extendedProfileLoading && (
          <ExtendedProfileSummary extendedProfile={extendedProfile} cols={1} />
        )}
        <SecurityCard onChangePassword={onChangePassword} />
        <AccountInfoCard profile={profile} user={user} />
        <StatusNotice status={profile?.registration_status} />
      </div>

      {/* Thumb-reachable save bar — only while editing. */}
      {editMode && (
        <div
          className="spc-above-tabbar fixed inset-x-0 z-20 px-4 pt-3 bg-spc-surface border-t border-spc-line"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
        >
          <EditActions
            editMode
            saving={saving}
            onSave={onSubmit}
            onCancel={onCancel}
            full
          />
        </div>
      )}
    </div>
  );
}

/** Loading skeleton shaped like the mobile profile. */
export function MobileProfileSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-8 w-44 bg-spc-surface-2 rounded-spc-sm animate-pulse mb-2" />
      <div className="h-4 w-56 bg-spc-surface-2 rounded animate-pulse mb-5" />
      <div className="h-12 w-full bg-spc-surface-2 rounded-spc-sm animate-pulse mb-5" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-spc border border-spc-line bg-spc-surface p-5">
            <div className="h-5 w-40 bg-spc-surface-2 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j}>
                  <div className="h-3 w-20 bg-spc-surface-2 rounded animate-pulse mb-2" />
                  <div className="h-5 w-36 bg-spc-surface-2 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
