import React, { useState, useEffect } from 'react';
import { X, User, GraduationCap, Users, FileText, CheckCircle, XCircle } from 'lucide-react';
import { superAdminAPI, placementOfficerAPI } from '../services/api';

const StudentDetailModal = ({ isOpen, onClose, studentId, applicationId, userRole = 'super-admin' }) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Student Details</h2>
            {student && (
              <p className="text-sm text-gray-600 mt-1">
                {student.prn} - {student.name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : student ? (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
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
                  <DetailRow label="Semester 1 CGPA" value={student.cgpa_sem1} />
                  <DetailRow label="Semester 2 CGPA" value={student.cgpa_sem2} />
                  <DetailRow label="Semester 3 CGPA" value={student.cgpa_sem3} />
                  <DetailRow label="Semester 4 CGPA" value={student.cgpa_sem4} />
                  <DetailRow label="Semester 5 CGPA" value={student.cgpa_sem5} />
                  <DetailRow label="Semester 6 CGPA" value={student.cgpa_sem6} />
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
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">SSLC (10th Standard)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <DetailRow label="Marks %" value={student.sslc_marks || '-'} />
                      <DetailRow label="Year" value={student.sslc_year || '-'} />
                      <DetailRow label="Board" value={student.sslc_board || '-'} />
                    </div>
                  </div>

                  {/* 12th Details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">12th Standard / Diploma</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <DetailRow label="Marks %" value={student.twelfth_marks || '-'} />
                      <DetailRow label="Year" value={student.twelfth_year || '-'} />
                      <DetailRow label="Board" value={student.twelfth_board || '-'} />
                    </div>
                  </div>

                  {/* Engineering Details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">Engineering Details</h3>
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
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">Family Details</h3>
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
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">Personal Details</h3>
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
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">Education Preferences</h3>
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
                    number={student.pan_number}
                  />
                  <DocumentCard
                    title="Aadhar Card"
                    hasDocument={student.has_aadhar_card}
                    number={student.aadhar_number}
                  />
                  <DocumentCard
                    title="Passport"
                    hasDocument={student.has_passport}
                    number={student.passport_number}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center p-12">
            <p className="text-gray-500">Failed to load student details</p>
          </div>
        )}
      </div>
    </div>
  );
};

const DetailRow = ({ label, value }) => (
  <div>
    <dt className="text-sm font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900">{value || '-'}</dd>
  </div>
);

const BooleanRow = ({ label, value }) => (
  <div className="flex items-center gap-2">
    {value ? (
      <CheckCircle className="text-green-600" size={20} />
    ) : (
      <XCircle className="text-red-600" size={20} />
    )}
    <span className="text-sm text-gray-900">{label}</span>
  </div>
);

const DocumentCard = ({ title, hasDocument, number }) => (
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
      {hasDocument ? (number || 'Available') : 'Not Available'}
    </p>
  </div>
);

export default StudentDetailModal;
