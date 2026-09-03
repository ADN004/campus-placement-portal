import React, { useState, useEffect, createContext, useContext } from 'react';
import { X, User, GraduationCap, Users, FileText, CheckCircle, XCircle } from 'lucide-react';
import Modal from './Modal';
import { superAdminAPI, placementOfficerAPI } from '../services/api';
import ResumeDownloadButton from './ResumeDownloadButton';
import { OFFICER_OVERLAY, officerPanel } from './officer/OfficerDialog';
import { ADMIN_OVERLAY, adminPanel } from './admin/AdminDialog';

/**
 * Everything a staff member is allowed to see about one student.
 *
 * `variant="officer"` renders the Register treatment; every other caller keeps
 * the original markup, class strings unchanged.
 *
 * The forty-odd rows in the body are shared between the two looks rather than
 * copied, because a duplicated list of fields is a list that will drift — one
 * variant gains a field, the other quietly does not. The variant travels by
 * context instead of through forty props. A context Provider renders no DOM, so
 * the default output is byte-identical.
 */
const VariantContext = createContext('default');
/*
 * Officer and super admin both render the token treatment; only the shell and
 * the radii differ, and those are chosen where the dialog is built. Sub-
 * components only need to know "am I on the token system or the legacy one",
 * which is what this answers.
 */
const useOfficerSkin = () => {
  const v = useContext(VariantContext);
  return v === 'officer' || v === 'admin';
};

const StudentDetailModal = ({ isOpen, onClose, studentId, applicationId, userRole = 'super-admin', variant }) => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (isOpen && studentId) {
      fetchStudentDetails();
    }
  }, [isOpen, studentId]);

  const fetchStudentDetails = async () => {
    try {
      setLoading(true);
      // Use the appropriate API based on user role
      const api = userRole === 'placement-officer' ? placementOfficerAPI : superAdminAPI;
      const response = await api.getDetailedStudentProfile(studentId);
      setStudent(response.data.data);
    } catch (error) {
      console.error('Error fetching student details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
    { id: 'extended', label: 'Extended Profile', icon: Users },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  const officerVariant = variant === 'officer';
  const admin = variant === 'admin';
  const officer = officerVariant || admin;

  return (
    <VariantContext.Provider value={admin ? 'admin' : officerVariant ? 'officer' : 'default'}>
    <Modal
      onClose={onClose}
      labelledBy="student-detail-title"
      overlayClassName={admin ? ADMIN_OVERLAY : officerVariant ? OFFICER_OVERLAY : undefined}
      panelClassName={
        admin
          ? adminPanel('xl', { scroll: true })
          : officerVariant
          ? officerPanel('xl', { scroll: true })
          : 'bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col'
      }
    >
        {/* Header */}
        <div
          className={
            officer
              ? 'flex items-center justify-between gap-3 px-5 py-4 border-b-[1.5px] border-spc-rule-structural flex-shrink-0'
              : 'flex items-center justify-between p-6 border-b border-gray-200'
          }
        >
          <div className="min-w-0">
            <h2
              id="student-detail-title"
              className={officer ? 'text-spc-h2 font-bold text-spc-ink' : 'text-2xl font-bold text-gray-900'}
            >
              {officer && student ? student.name || 'Student' : 'Student Details'}
            </h2>
            {student && (
              <p className={officer ? 'text-xs text-spc-muted mt-0.5 tabular-nums' : 'text-sm text-gray-600 mt-1'}>
                {officer ? `${student.prn}${student.branch ? ` · ${student.branch}` : ''}` : `${student.prn} - ${student.name}`}
              </p>
            )}
          </div>
          <div className={officer ? 'flex items-center gap-2 flex-shrink-0' : 'flex items-center gap-3'}>
            {student && (
              <ResumeDownloadButton
                studentId={studentId}
                studentName={student.name || student.prn}
                api={userRole === 'placement-officer' ? placementOfficerAPI : superAdminAPI}
                variant={variant}
              />
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className={
                officer
                  ? 'inline-flex items-center justify-center w-11 h-11 rounded-spc-control text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink transition-colors flex-shrink-0'
                  : 'p-2 hover:bg-gray-100 rounded-lg transition-colors'
              }
            >
              <X size={officer ? 20 : 24} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className={officer ? 'flex items-center justify-center p-12' : 'flex items-center justify-center p-12'}>
            {officer ? (
              <p className="text-spc-sm text-spc-muted font-medium">Loading student…</p>
            ) : (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            )}
          </div>
        ) : student ? (
          <>
            {/* Tabs */}
            <div
              className={
                officer
                  ? 'flex border-b border-spc-line px-5 overflow-x-auto flex-shrink-0'
                  : 'flex border-b border-gray-200 px-6 overflow-x-auto'
              }
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={activeTab === tab.id ? 'true' : undefined}
                  className={
                    officer
                      ? `flex items-center gap-2 px-3 min-h-[48px] text-spc-xs font-bold whitespace-nowrap transition-colors ${
                          activeTab === tab.id
                            ? 'text-spc-ink border-b-2 border-spc-accent'
                            : 'text-spc-muted hover:text-spc-ink'
                        }`
                      : `flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
                          activeTab === tab.id
                            ? 'text-indigo-600 border-b-2 border-indigo-600'
                            : 'text-gray-600 hover:text-gray-900'
                        }`
                  }
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className={officer ? 'flex-1 overflow-y-auto spc-scroll-contain px-5 py-4' : 'flex-1 overflow-y-auto p-6'}>
              {activeTab === 'basic' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DetailRow label="PRN" value={student.prn} />
                  <DetailRow label="Name" value={student.name} />
                  <DetailRow label="Email" value={student.email} />
                  <DetailRow label="Mobile" value={student.mobile_number} />
                  <DetailRow label="Gender" value={student.gender} />
                  <DetailRow label="Date of Birth" value={student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('en-IN') : '-'} />
                  <DetailRow label="Age" value={student.age} />
                  <DetailRow label="College" value={student.college_name} />
                  <DetailRow label="Region" value={student.region_name} />
                  <DetailRow label="Branch" value={student.branch} />
                  <DetailRow label="Programme CGPA" value={student.programme_cgpa} />
                  <DetailRow label="Semester 1 SGPA" value={student.cgpa_sem1} />
                  <DetailRow label="Semester 2 SGPA" value={student.cgpa_sem2} />
                  <DetailRow label="Semester 3 SGPA" value={student.cgpa_sem3} />
                  <DetailRow label="Semester 4 SGPA" value={student.cgpa_sem4} />
                  <DetailRow label="Semester 5 SGPA" value={student.cgpa_sem5} />
                  <DetailRow label="Semester 6 SGPA" value={student.cgpa_sem6} />
                  <DetailRow label="Backlogs" value={student.backlog_count || '0'} />
                  {student.backlog_details && (
                    <div className="md:col-span-2">
                      <DetailRow label="Backlog Details" value={student.backlog_details} />
                    </div>
                  )}
                  <DetailRow label="Height" value={student.height_cm ? `${student.height_cm} cm` : '-'} />
                  <DetailRow label="Weight" value={student.weight_kg ? `${student.weight_kg} kg` : '-'} />
                  <div className="md:col-span-2">
                    <DetailRow label="Address" value={student.permanent_address || student.complete_address || '-'} />
                  </div>
                  <BooleanRow label="Email Verified" value={student.email_verified} />
                  <DetailRow label="Registration Status" value={student.registration_status} />
                </div>
              )}

              {activeTab === 'academic' && (
                <div className="space-y-6">
                  {/* SSLC Details */}
                  <div>
                    <TabHeading>SSLC (10th Standard)</TabHeading>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <DetailRow label="Marks %" value={student.sslc_marks || '-'} />
                      <DetailRow label="Year" value={student.sslc_year || '-'} />
                      <DetailRow label="Board" value={student.sslc_board || '-'} />
                    </div>
                  </div>

                  {/* 12th Details */}
                  <div>
                    <TabHeading>12th Standard / Diploma</TabHeading>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <DetailRow label="Marks %" value={student.twelfth_marks || '-'} />
                      <DetailRow label="Year" value={student.twelfth_year || '-'} />
                      <DetailRow label="Board" value={student.twelfth_board || '-'} />
                    </div>
                  </div>

                  {/* Engineering Details */}
                  <div>
                    <TabHeading>Engineering Details</TabHeading>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DetailRow label="Branch" value={student.branch} />
                      <DetailRow label="Programme CGPA" value={student.programme_cgpa} />
                      <DetailRow label="Backlogs" value={student.backlog_count || '0'} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'extended' && (
                <div className="space-y-6">
                  {/* Family Details */}
                  <div>
                    <TabHeading>Family Details</TabHeading>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DetailRow label="Father Name" value={student.father_name || '-'} />
                      <DetailRow label="Father Occupation" value={student.father_occupation || '-'} />
                      <DetailRow label="Father Annual Income" value={student.father_annual_income ? `₹${student.father_annual_income}` : '-'} />
                      <DetailRow label="Mother Name" value={student.mother_name || '-'} />
                      <DetailRow label="Mother Occupation" value={student.mother_occupation || '-'} />
                      <DetailRow label="Mother Annual Income" value={student.mother_annual_income ? `₹${student.mother_annual_income}` : '-'} />
                      <DetailRow label="Siblings Count" value={student.siblings_count || '0'} />
                      {student.siblings_details && (
                        <div className="md:col-span-2">
                          <DetailRow label="Siblings Details" value={student.siblings_details} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Personal Details */}
                  <div>
                    <TabHeading>Personal Details</TabHeading>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DetailRow label="District" value={student.district || '-'} />
                      <BooleanRow label="Physically Handicapped" value={student.physically_handicapped} />
                      {student.handicap_details && (
                        <div className="md:col-span-2">
                          <DetailRow label="Handicap Details" value={student.handicap_details} />
                        </div>
                      )}
                      {student.interests_hobbies && (
                        <div className="md:col-span-2">
                          <DetailRow label="Interests & Hobbies" value={student.interests_hobbies} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Education Preferences */}
                  <div>
                    <TabHeading>Education Preferences</TabHeading>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <BooleanRow label="Interested in B.Tech" value={student.interested_in_btech} />
                      <BooleanRow label="Interested in M.Tech" value={student.interested_in_mtech} />
                      <DetailRow label="Preferred Study Mode" value={student.preferred_study_mode || '-'} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DocumentCard
                    title="Driving License"
                    hasDocument={student.has_driving_license}
                  />
                  <DocumentCard
                    title="PAN Card"
                    hasDocument={student.has_pan_card}
                  />
                  <DocumentCard
                    title="Aadhar Card"
                    hasDocument={student.has_aadhar_card}
                  />
                  <DocumentCard
                    title="Passport"
                    hasDocument={student.has_passport}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center p-12">
            <p className={officer ? 'text-spc-sm text-spc-muted font-medium' : 'text-gray-500'}>
              Failed to load student details
            </p>
          </div>
        )}
    </Modal>
    </VariantContext.Provider>
  );
};

/** A heading inside a tab. Khand for the officer, as everywhere else in the role. */
const TabHeading = ({ children }) =>
  useOfficerSkin() ? (
    <h3 className="font-khand font-medium uppercase tracking-[0.06em] text-spc-sm text-spc-ink mb-2">
      {children}
    </h3>
  ) : (
    <h3 className="text-lg font-semibold mb-3 text-gray-900">{children}</h3>
  );

const DetailRow = ({ label, value }) => {
  if (useOfficerSkin()) {
    return (
      <div className="py-2 border-b border-spc-line">
        <dt className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted">{label}</dt>
        <dd className="text-spc-sm text-spc-ink mt-0.5 break-words">{value || '—'}</dd>
      </div>
    );
  }
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value || '-'}</dd>
    </div>
  );
};

const BooleanRow = ({ label, value }) => {
  if (useOfficerSkin()) {
    return (
      <div className="py-2 border-b border-spc-line">
        <dt className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted">{label}</dt>
        <dd className="text-spc-sm text-spc-ink mt-0.5">{value ? 'Yes' : 'No'}</dd>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      {value ? (
        <CheckCircle className="text-green-600" size={20} />
      ) : (
        <XCircle className="text-red-600" size={20} />
      )}
      <span className="text-sm text-gray-900">{label}</span>
    </div>
  );
};

const DocumentCard = ({ title, hasDocument }) => {
  if (useOfficerSkin()) {
    return (
      <div className="flex items-center justify-between gap-3 py-2.5 border-b border-spc-line">
        <span className="text-spc-sm text-spc-ink">{title}</span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
          <span
            aria-hidden="true"
            className={`w-1.5 h-1.5 rounded-full ${hasDocument ? 'bg-spc-ok' : 'bg-spc-muted'}`}
          />
          <span className="text-spc-xs font-semibold text-spc-ink">
            {hasDocument ? 'Has it' : 'Does not'}
          </span>
        </span>
      </div>
    );
  }
  return (
    <div className={`p-4 rounded-lg border-2 ${hasDocument ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
      <div className="flex items-center gap-2 mb-2">
        {hasDocument ? (
          <CheckCircle className="text-green-600" size={24} />
        ) : (
          <XCircle className="text-gray-400" size={24} />
        )}
        <h4 className="font-semibold text-gray-900">{title}</h4>
      </div>
      <p className="text-sm text-gray-600">
        {hasDocument ? 'Available' : 'Not Available'}
      </p>
    </div>
  );
};

export default StudentDetailModal;
