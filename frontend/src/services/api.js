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
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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
};

// Common APIs
export const commonAPI = {
  getRegions: () => API.get('/common/regions'),
  getColleges: (regionId) => API.get(`/common/colleges${regionId ? `?region_id=${regionId}` : ''}`),
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
  exportStudents: (format) => API.get(`/placement-officer/students/export?format=${format}`, { responseType: 'blob' }),
  createJobRequest: (data) => API.post('/placement-officer/job-requests', data),
  getMyJobRequests: () => API.get('/placement-officer/job-requests'),
  getJobs: () => API.get('/placement-officer/jobs'),
  getJobApplicants: (jobId) => API.get(`/placement-officer/jobs/${jobId}/applicants`),
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
  deletePlacementOfficer: (id) => API.delete(`/super-admin/placement-officers/${id}`),
  clearOfficerHistory: (collegeId) => API.delete(`/super-admin/placement-officers/history/${collegeId}`),

  // Job Management
  getJobs: () => API.get('/super-admin/jobs'),
  getJobApplicants: (jobId) => API.get(`/super-admin/jobs/${jobId}/applicants`),
  getPendingJobRequests: () => API.get('/super-admin/jobs/pending-requests'),
  createJob: (data) => API.post('/super-admin/jobs', data),
  updateJob: (id, data) => API.put(`/super-admin/jobs/${id}`, data),
  deleteJob: (id) => API.delete(`/super-admin/jobs/${id}`),
  toggleJobStatus: (id) => API.put(`/super-admin/jobs/${id}/toggle-status`),
  approveJobRequest: (id) => API.put(`/super-admin/jobs/requests/${id}/approve`),
  rejectJobRequest: (id) => API.put(`/super-admin/jobs/requests/${id}/reject`),

  // Whitelist Requests
  getWhitelistRequests: () => API.get('/super-admin/whitelist-requests'),
  approveWhitelistRequest: (id, comment) => API.put(`/super-admin/whitelist-requests/${id}/approve`, { review_comment: comment }),
  rejectWhitelistRequest: (id, comment) => API.put(`/super-admin/whitelist-requests/${id}/reject`, { review_comment: comment }),

  // Activity Logs
  getActivityLogs: (filters) => API.get('/super-admin/activity-logs', { params: filters }),
  exportActivityLogs: (filters) => API.get('/super-admin/activity-logs', {
    params: { ...filters, export: 'csv' },
    responseType: 'blob'
  }),

  // Student Management
  getAllStudents: () => API.get('/super-admin/students'),
  deleteStudent: (id) => API.delete(`/super-admin/students/${id}`),

  togglePRNRange: (id) => API.put(`/super-admin/prn-ranges/${id}/toggle`),
};

export default API;
