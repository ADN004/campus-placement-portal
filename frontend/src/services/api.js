import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

// Request interceptor for adding auth token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect on 401 if user is already logged in (has a token)
    // This prevents redirecting on failed login attempts with wrong credentials
    if (error.response?.status === 401) {
      const token = localStorage.getItem('token');
      const isLoginRequest = error.config?.url?.includes('/auth/login');

      // Only redirect if:
      // 1. User has a token (meaning they were logged in) AND
      // 2. This is NOT a login request (to allow login errors to be displayed)
      if (token && !isLoginRequest) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (credentials) => API.post('/auth/login', credentials),
  registerStudent: (data) => API.post('/auth/register-student', data),
  getMe: () => API.get('/auth/me'),
  logout: () => API.get('/auth/logout'),
  changePassword: (data) => API.put('/auth/change-password', data),
  verifyEmail: (token) => API.get(`/auth/verify-email/${token}`),
  resendVerification: (email) => API.post('/auth/resend-verification', { email }),
};

// Common APIs
export const commonAPI = {
  getRegions: () => API.get('/common/regions'),
  getColleges: (regionId) => API.get(`/common/colleges${regionId ? `?region_id=${regionId}` : ''}`),
  getCollegeBranches: (collegeId) => API.get(`/common/colleges/${collegeId}/branches`),
  validatePRN: (prn) => API.post('/common/validate-prn', { prn }),
  getJobDetails: (jobId) => API.get(`/common/jobs/${jobId}`),
};

// Student APIs
export const studentAPI = {
  getDashboard: () => API.get('/students/dashboard'),
  getProfile: () => API.get('/students/profile'),
  updateProfile: (data) => API.put('/students/profile', data),
  getEligibleJobs: () => API.get('/students/eligible-jobs'),
  applyForJob: (jobId) => API.post(`/students/apply/${jobId}`),
  getMyApplications: () => API.get('/students/my-applications'),
  getNotifications: () => API.get('/students/notifications'),
  markNotificationRead: (notificationId) => API.put(`/students/notifications/${notificationId}/read`),
  resendVerificationEmail: () => API.post('/students/resend-verification'),
  getVerificationStatus: () => API.get('/students/verification-status'),

  // Extended Profile APIs
  getExtendedProfile: () => API.get('/students/extended-profile'),
  getProfileCompletion: () => API.get('/students/extended-profile/completion'),
  updateAcademicExtended: (data) => API.put('/students/extended-profile/academic', data),
  updatePhysicalDetails: (data) => API.put('/students/extended-profile/physical', data),
  updateFamilyDetails: (data) => API.put('/students/extended-profile/family', data),
  updatePersonalDetails: (data) => API.put('/students/extended-profile/personal', data),
  updateDocuments: (data) => API.put('/students/extended-profile/documents', data),
  updateEducationPreferences: (data) => API.put('/students/extended-profile/education-preferences', data),

  // Enhanced Application APIs
  checkApplicationReadiness: (jobId) => API.post(`/students/jobs/${jobId}/check-readiness`),
  getMissingFields: (jobId) => API.get(`/students/jobs/${jobId}/missing-fields`),
  applyEnhanced: (jobId, data) => API.post(`/students/jobs/${jobId}/apply-enhanced`, data),

  // Resume APIs
  getResume: () => API.get('/students/resume'),
  updateResume: (data) => API.put('/students/resume', data),
  downloadResume: () => API.get('/students/resume/download', { responseType: 'blob' }),

  // CGPA Lock Status
  getCgpaLockStatus: () => API.get('/students/cgpa-lock-status'),

  // Backlog Lock Status
  getBacklogLockStatus: () => API.get('/students/backlog-lock-status'),
};

// Placement Officer APIs
export const placementOfficerAPI = {
  getDashboard: () => API.get('/placement-officer/dashboard'),
  getProfile: () => API.get('/placement-officer/profile'),
  updateProfile: (data) => API.put('/placement-officer/profile', data),
  getStudents: (filters) => API.get('/placement-officer/students', { params: filters }),
  approveStudent: (studentId) => API.put(`/placement-officer/students/${studentId}/approve`),
  rejectStudent: (studentId, reason) => API.put(`/placement-officer/students/${studentId}/reject`, { reason }),
  blacklistStudent: (studentId, reason) => API.put(`/placement-officer/students/${studentId}/blacklist`, { reason }),
  requestWhitelist: (studentId, reason) => API.post(`/placement-officer/students/${studentId}/whitelist-request`, { reason }),
  sendNotification: (data) => API.post('/placement-officer/send-notification', data),
  exportStudents: (queryString) => API.get(`/placement-officer/students/export${queryString}`, { responseType: 'blob' }),
  createJobRequest: (data) => API.post('/placement-officer/job-requests', data),
  getMyJobRequests: () => API.get('/placement-officer/job-requests'),
  createJobRequestRequirements: (jobRequestId, data) => API.post(`/placement-officer/job-requests/${jobRequestId}/requirements`, data),
  getJobRequestRequirements: (jobRequestId) => API.get(`/placement-officer/job-requests/${jobRequestId}/requirements`),
  getJobs: () => API.get('/placement-officer/jobs'),
  getJobApplicants: (jobId) => API.get(`/placement-officer/jobs/${jobId}/applicants`),
  exportJobApplicants: (jobId, format = 'excel', excludeAlreadyPlaced = false) => API.get(`/placement-officer/jobs/${jobId}/applicants/export`, {
    params: { format, exclude_already_placed: excludeAlreadyPlaced },
    responseType: 'blob'
  }),

  // Enhanced Job Applicants Management (College-Scoped)
  getDetailedStudentProfile: (studentId) => API.get(`/placement-officer/students/${studentId}/detailed-profile`),
  updateApplicationStatus: (applicationId, data) => API.put(`/placement-officer/applications/${applicationId}/status`, data),
  bulkUpdateApplicationStatus: (data) => API.post('/placement-officer/applications/bulk-update-status', data),
  updatePlacementDetails: (applicationId, data) => API.put(`/placement-officer/applications/${applicationId}/placement`, data),
  notifyApplicationStatus: (data) => API.post('/placement-officer/applications/notify', data),
  getJobPlacementStats: (jobId) => API.get(`/placement-officer/jobs/${jobId}/placement-stats`),
  createOrUpdateJobDrive: (jobId, data) => API.post(`/placement-officer/jobs/${jobId}/drive`, data),
  getJobDrive: (jobId) => API.get(`/placement-officer/jobs/${jobId}/drive`),
  enhancedExportJobApplicants: (jobId, data) => API.post(`/placement-officer/jobs/${jobId}/applicants/enhanced-export`, data, { responseType: 'blob' }),

  // PRN Range Management
  getPRNRanges: () => API.get('/placement-officer/prn-ranges'),
  addPRNRange: (data) => API.post('/placement-officer/prn-ranges', data),
  updatePRNRange: (id, data) => API.put(`/placement-officer/prn-ranges/${id}`, data),
  deletePRNRange: (id) => API.delete(`/placement-officer/prn-ranges/${id}`),
  getStudentsByPRNRange: (rangeId) => API.get(`/placement-officer/prn-ranges/${rangeId}/students`),
  exportStudentsByPRNRange: (rangeId) => API.get(`/placement-officer/prn-ranges/${rangeId}/students/export`, { responseType: 'blob' }),
  // Profile Photo Management
  uploadOwnPhoto: (data) => API.post('/placement-officer/profile/photo', data),
  deleteOwnPhoto: () => API.delete('/placement-officer/profile/photo'),
  // Custom Export
  customExportStudents: (data) => API.post('/placement-officer/students/custom-export', data, { responseType: 'blob' }),

  // Branches Management
  getBranches: () => API.get('/placement-officer/branches'), // Get branches for notifications
  getCollegeBranches: () => API.get('/placement-officer/college/branches'), // Get all college branches

  // College Branch Management
  getOwnCollegeBranches: () => API.get('/placement-officer/college-branches'),
  updateOwnCollegeBranches: (branches) => API.put('/placement-officer/college-branches', { branches }),
  getBranchTemplates: () => API.get('/placement-officer/branch-templates'),

  // District Management
  getAvailableDistricts: () => API.get('/super-admin/districts'),

  // Placement Poster
  getPlacementPosterStats: () => API.get('/placement-officer/placement-poster/stats'),
  generatePlacementPoster: () => API.post('/placement-officer/placement-poster/generate', {}, { responseType: 'blob' }),

  // Manual Student Addition
  validateStudentForManualAddition: (data) => API.post('/placement-officer/validate-student-for-manual-addition', data),
  manuallyAddStudentToJob: (data) => API.post('/placement-officer/manually-add-student-to-job', data),

  // Student Resume Download
  getStudentResumeStatus: (studentId) => API.get(`/placement-officer/students/${studentId}/resume/status`),
  downloadStudentResume: (studentId) => API.get(`/placement-officer/students/${studentId}/resume/download`, { responseType: 'blob' }),

  // CGPA Lock/Unlock Management
  getCgpaLockStatus: () => API.get('/placement-officer/cgpa-lock-status'),
  unlockCgpa: (data) => API.post('/placement-officer/cgpa-unlock', data),
  lockCgpa: () => API.post('/placement-officer/cgpa-lock'),

  // Backlog Lock/Unlock Management
  getBacklogLockStatus: () => API.get('/placement-officer/backlog-lock-status'),
  unlockBacklog: (data) => API.post('/placement-officer/backlog-unlock', data),
  lockBacklog: () => API.post('/placement-officer/backlog-lock'),
};

// Super Admin APIs
export const superAdminAPI = {
  getDashboard: () => API.get('/super-admin/dashboard'),
  getProfile: () => API.get('/super-admin/profile'),
  updateProfile: (data) => API.put('/super-admin/profile', data),

  // PRN Management
  getPRNRanges: () => API.get('/super-admin/prn-ranges'),
  addPRNRange: (data) => API.post('/super-admin/prn-ranges', data),
  updatePRNRange: (id, data) => API.put(`/super-admin/prn-ranges/${id}`, data),
  deletePRNRange: (id) => API.delete(`/super-admin/prn-ranges/${id}`),

  // Placement Officer Management
  getPlacementOfficers: () => API.get('/super-admin/placement-officers'),
  getOfficerHistory: (collegeId) => API.get(`/super-admin/placement-officers/history/${collegeId}`),
  addPlacementOfficer: (data) => API.post('/super-admin/placement-officers', data),
  updatePlacementOfficer: (id, data) => API.put(`/super-admin/placement-officers/${id}`, data),
  resetPlacementOfficerPassword: (id) => API.put(`/super-admin/placement-officers/${id}/reset-password`),
  deletePlacementOfficer: (id) => API.delete(`/super-admin/placement-officers/${id}`),
  clearOfficerHistory: (collegeId) => API.delete(`/super-admin/placement-officers/history/${collegeId}`),

  // Job Management
  getJobs: () => API.get('/super-admin/jobs'),
  getJobApplicants: (jobId) => API.get(`/super-admin/jobs/${jobId}/applicants`),
  exportJobApplicants: (jobId, data) => API.post(`/super-admin/jobs/${jobId}/applicants/export`, data, {
    responseType: 'blob'
  }),
  getPendingJobRequests: () => API.get('/super-admin/jobs/pending-requests'),
  createJob: (data) => API.post('/super-admin/jobs', data),
  updateJob: (id, data) => API.put(`/super-admin/jobs/${id}`, data),
  deleteJob: (id) => API.delete(`/super-admin/jobs/${id}`),
  toggleJobStatus: (id) => API.put(`/super-admin/jobs/${id}/toggle-status`),
  approveJobRequest: (id) => API.put(`/super-admin/jobs/requests/${id}/approve`),
  rejectJobRequest: (id) => API.put(`/super-admin/jobs/requests/${id}/reject`),
  createJobRequirements: (jobId, data) => API.post(`/super-admin/jobs/${jobId}/requirements`, data),
  getJobRequirements: (jobId) => API.get(`/super-admin/jobs/${jobId}/requirements`),
  updateJobRequirements: (jobId, data) => API.put(`/super-admin/jobs/${jobId}/requirements`, data),
  getRequirementTemplates: () => API.get('/super-admin/requirement-templates'),

  // Whitelist Requests
  getWhitelistRequests: () => API.get('/super-admin/whitelist-requests'),
  approveWhitelistRequest: (id, comment) => API.put(`/super-admin/whitelist-requests/${id}/approve`, { review_comment: comment }),
  rejectWhitelistRequest: (id, comment) => API.put(`/super-admin/whitelist-requests/${id}/reject`, { review_comment: comment }),

  // Activity Logs
  getActivityLogs: (filters) => API.get('/super-admin/activity-logs', { params: filters }),
  exportActivityLogs: (filters, format = 'csv') => API.get('/super-admin/activity-logs', {
    params: { ...filters, export: format },
    responseType: 'blob'
  }),

  // Student Management
  getAllStudents: (queryString = '') => API.get(`/super-admin/students${queryString ? `?${queryString}` : ''}`),
  searchStudentByPRN: (prn) => API.get(`/super-admin/students/search/${prn}`),
  blacklistStudent: (studentId, reason) => API.put(`/super-admin/students/${studentId}/blacklist`, { reason }),
  whitelistStudent: (studentId) => API.put(`/super-admin/students/${studentId}/whitelist`),
  deleteStudent: (id) => API.delete(`/super-admin/students/${id}`),
  customExportStudents: (data) => API.post('/super-admin/students/custom-export', data, { responseType: 'blob' }),
  enhancedCustomExport: (data) => API.post('/super-admin/students/enhanced-export', data, { responseType: 'blob' }),
  bulkDeleteStudentPhotos: (data) => API.post('/super-admin/students/bulk-delete-photos', data),

  togglePRNRange: (id) => API.put(`/super-admin/prn-ranges/${id}/toggle`),

  // Profile Photo Management
  uploadOfficerPhoto: (officerId, formData) => API.post(`/super-admin/placement-officers/${officerId}/photo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteOfficerPhoto: (officerId) => API.delete(`/super-admin/placement-officers/${officerId}/photo`),

  // Job Permanent Deletion
  permanentlyDeleteJob: (jobId, reason) => API.delete(`/super-admin/jobs/${jobId}/permanent`, { data: { reason } }),
  getDeletedJobsHistory: () => API.get('/super-admin/jobs/deleted-history'),
  clearDeletedJobsHistory: () => API.delete('/super-admin/jobs/deleted-history'),

  // Branch Management
  getNormalizedBranches: () => API.get('/super-admin/branches'),
  getCollegeBranches: (collegeId) => API.get(`/super-admin/colleges/${collegeId}/branches`),

  // District Management
  getAvailableDistricts: () => API.get('/super-admin/districts'),

  // College Branch Management
  getAllCollegeBranches: (regionId) => API.get(`/super-admin/college-branches${regionId ? `?region_id=${regionId}` : ''}`),
  updateCollegeBranches: (collegeId, branches) => API.put(`/super-admin/college-branches/${collegeId}`, { branches }),
  getBranchTemplates: () => API.get('/super-admin/branch-templates'),

  // PRN Range Students
  getStudentsByPRNRange: (rangeId) => API.get(`/super-admin/prn-ranges/${rangeId}/students`),
  exportStudentsByPRNRange: (rangeId, format = 'excel') => API.get(`/super-admin/prn-ranges/${rangeId}/students/export`, {
    params: { format },
    responseType: 'blob'
  }),

  // Super Admin Management
  getSuperAdmins: () => API.get('/super-admin/admins'),
  createSuperAdmin: (data) => API.post('/super-admin/admins', data),
  deactivateSuperAdmin: (id) => API.put(`/super-admin/admins/${id}/deactivate`),
  activateSuperAdmin: (id) => API.put(`/super-admin/admins/${id}/activate`),
  deleteSuperAdmin: (id) => API.delete(`/super-admin/admins/${id}`),

  // Requirement Templates APIs
  getRequirementTemplates: () => API.get('/super-admin/requirement-templates'),
  createRequirementTemplate: (data) => API.post('/super-admin/requirement-templates', data),
  updateRequirementTemplate: (id, data) => API.put(`/super-admin/requirement-templates/${id}`, data),
  deleteRequirementTemplate: (id) => API.delete(`/super-admin/requirement-templates/${id}`),

  // Job Requirements APIs (for jobs created by super admin)
  createJobRequirements: (jobId, data) => API.post(`/super-admin/jobs/${jobId}/requirements`, data),
  updateJobRequirements: (jobId, data) => API.put(`/super-admin/jobs/${jobId}/requirements`, data),
  getJobRequirements: (jobId) => API.get(`/super-admin/jobs/${jobId}/requirements`),

  // Enhanced Job Applicants Management
  getDetailedStudentProfile: (studentId) => API.get(`/super-admin/students/${studentId}/detailed-profile`),
  updateApplicationStatus: (applicationId, data) => API.put(`/super-admin/applications/${applicationId}/status`, data),
  bulkUpdateApplicationStatus: (data) => API.post('/super-admin/applications/bulk-update-status', data),
  updatePlacementDetails: (applicationId, data) => API.put(`/super-admin/applications/${applicationId}/placement`, data),
  notifyApplicationStatus: (data) => API.post('/super-admin/applications/notify', data),
  getJobPlacementStats: (jobId) => API.get(`/super-admin/jobs/${jobId}/placement-stats`),

  // Drive Scheduling
  createOrUpdateJobDrive: (jobId, data) => API.post(`/super-admin/jobs/${jobId}/drive`, data),
  getJobDrive: (jobId) => API.get(`/super-admin/jobs/${jobId}/drive`),

  // Enhanced Export
  enhancedExportJobApplicants: (jobId, data) => API.post(`/super-admin/jobs/${jobId}/applicants/enhanced-export`, data, {
    responseType: 'blob'
  }),

  // Notification Management
  getCollegesForNotifications: () => API.get('/super-admin/colleges-for-notifications'),
  getBranchesForColleges: (college_ids) => API.post('/super-admin/branches-for-colleges', { college_ids }),
  sendNotification: (data) => API.post('/super-admin/send-notification', data),

  // Placement Poster
  getPlacementPosterStatsForCollege: (collegeId) => API.get(`/super-admin/placement-poster/stats/${collegeId}`),
  generatePlacementPosterForCollege: (collegeId) => API.post(`/super-admin/placement-poster/generate/${collegeId}`, {}, { responseType: 'blob' }),
  generateMultiCollegePlacementPoster: (collegeIds) => API.post('/super-admin/placement-poster/generate-multi', { collegeIds }, { responseType: 'blob' }),

  // Manual Student Addition
  validateStudentForManualAddition: (data) => API.post('/super-admin/validate-student-for-manual-addition', data),
  manuallyAddStudentToJob: (data) => API.post('/super-admin/manually-add-student-to-job', data),

  // Admin Notifications (auto-approved jobs, system alerts)
  getAdminNotifications: (params) => API.get('/super-admin/admin-notifications', { params }),
  getAdminNotificationUnreadCount: () => API.get('/super-admin/admin-notifications/unread-count'),
  markAdminNotificationRead: (id) => API.put(`/super-admin/admin-notifications/${id}/read`),
  markAllAdminNotificationsRead: () => API.put('/super-admin/admin-notifications/mark-all-read'),

  // Student Resume Download
  getStudentResumeStatus: (studentId) => API.get(`/super-admin/students/${studentId}/resume/status`),
  downloadStudentResume: (studentId) => API.get(`/super-admin/students/${studentId}/resume/download`, { responseType: 'blob' }),

  // CGPA Lock/Unlock Management
  getGlobalCgpaLockStatus: () => API.get('/super-admin/cgpa-global-lock-status'),
  getCgpaLockStatus: (collegeId) => API.get(`/super-admin/cgpa-lock-status/${collegeId}`),
  unlockCgpa: (data) => API.post('/super-admin/cgpa-unlock', data),
  lockCgpa: (data) => API.post('/super-admin/cgpa-lock', data),

  // Backlog Lock/Unlock Management
  getGlobalBacklogLockStatus: () => API.get('/super-admin/backlog-global-lock-status'),
  getBacklogLockStatus: (collegeId) => API.get(`/super-admin/backlog-lock-status/${collegeId}`),
  unlockBacklog: (data) => API.post('/super-admin/backlog-unlock', data),
  lockBacklog: (data) => API.post('/super-admin/backlog-lock', data),

  // Academic Year Reset
  getResetPreview: () => API.get('/super-admin/academic-year-reset/preview'),
  performAcademicYearReset: (data) => API.post('/super-admin/academic-year-reset/execute', data),
};

export default API;
