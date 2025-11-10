import { useState, useEffect } from 'react';
import { placementOfficerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Briefcase, Users, Download, Filter, ChevronDown, ChevronUp, Check, X } from 'lucide-react';

export default function JobEligibleStudents() {
  const [jobs, setJobs] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    cgpaMin: '',
    cgpaMax: '',
    maxBacklogs: '',
    dobFrom: '',
    dobTo: '',
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      fetchJobApplicants();
    }
  }, [selectedJob]);

  useEffect(() => {
    if (selectedJob && students.length > 0) {
      filterEligibleStudents();
    }
  }, [students, advancedFilters]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await placementOfficerAPI.getJobs();
      // Filter to show only active jobs
      const activeJobs = response.data.data.filter((job) => job.is_active);
      setJobs(activeJobs);
    } catch (error) {
      toast.error('Failed to load jobs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobApplicants = async () => {
    try {
      setLoadingStudents(true);
      const response = await placementOfficerAPI.getJobApplicants(selectedJob.id);
      // These are students who have APPLIED to this job
      setStudents(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load job applicants');
      console.error('Failed to load applicants:', error);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const filterEligibleStudents = () => {
    if (!selectedJob) {
      setFilteredStudents([]);
      return;
    }

    // Students are already filtered as applicants who meet basic job criteria
    // Now apply additional advanced filters
    let filtered = [...students];

    // Apply advanced filters
    if (advancedFilters.cgpaMin) {
      const minCGPA = parseFloat(advancedFilters.cgpaMin);
      filtered = filtered.filter((s) => parseFloat(s.cgpa) >= minCGPA);
    }

    if (advancedFilters.cgpaMax) {
      const maxCGPA = parseFloat(advancedFilters.cgpaMax);
      filtered = filtered.filter((s) => parseFloat(s.cgpa) <= maxCGPA);
    }

    if (advancedFilters.maxBacklogs !== '') {
      const maxBacklogs = parseInt(advancedFilters.maxBacklogs);
      filtered = filtered.filter((s) => parseInt(s.backlog_count || 0) <= maxBacklogs);
    }

    if (advancedFilters.dobFrom) {
      filtered = filtered.filter(
        (s) => s.date_of_birth && new Date(s.date_of_birth) >= new Date(advancedFilters.dobFrom)
      );
    }

    if (advancedFilters.dobTo) {
      filtered = filtered.filter(
        (s) => s.date_of_birth && new Date(s.date_of_birth) <= new Date(advancedFilters.dobTo)
      );
    }

    setFilteredStudents(filtered);
  };

  const handleAdvancedFilterChange = (field, value) => {
    setAdvancedFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      cgpaMin: '',
      cgpaMax: '',
      maxBacklogs: '',
      dobFrom: '',
      dobTo: '',
    });
  };

  const hasActiveFilters = () => {
    return Object.values(advancedFilters).some((value) => value !== '');
  };

  const handleExportCSV = () => {
    try {
      if (filteredStudents.length === 0) {
        toast.error('No applicants to export');
        return;
      }

      // Create CSV header
      const headers = [
        'PRN',
        'Name',
        'Email',
        'Mobile Number',
        'Branch',
        'Date of Birth',
        'CGPA',
        'Backlog Count',
        'Application Date',
        'Job Title',
        'Company Name',
      ];

      // Create CSV rows
      const rows = filteredStudents.map((student) => [
        student.prn || '',
        student.name || '',
        student.email || '',
        student.mobile_number || '',
        student.branch || '',
        student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : '',
        student.cgpa || '',
        student.backlog_count !== undefined ? student.backlog_count : '',
        student.applied_date ? new Date(student.applied_date).toLocaleDateString() : 'N/A',
        selectedJob?.job_title || '',
        selectedJob?.company_name || '',
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `job_applicants_${selectedJob?.job_title?.replace(/\s+/g, '_')}_${
        new Date().toISOString().split('T')[0]
      }.csv`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${filteredStudents.length} applicants to CSV`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export students');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Job Applicants</h1>
        <p className="text-gray-600 mt-1">
          View and download list of students who have applied to each job
        </p>
      </div>

      {/* Job Selection */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Briefcase className="mr-2" size={20} />
          Select a Job
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.length === 0 ? (
            <p className="text-gray-500 col-span-full">No active jobs available</p>
          ) : (
            jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  selectedJob?.id === job.id
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                <h3 className="font-semibold text-gray-900">{job.job_title}</h3>
                <p className="text-sm text-gray-600">{job.company_name}</p>
                <div className="mt-2 space-y-1 text-xs text-gray-500">
                  {job.min_cgpa && <p>Min CGPA: {job.min_cgpa}</p>}
                  {job.max_backlogs !== null && <p>Max Backlogs: {job.max_backlogs}</p>}
                  <p className="text-primary-600 font-medium">
                    Deadline: {new Date(job.application_deadline).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {selectedJob && (
        <>
          {/* Selected Job Info */}
          <div className="card mb-6 bg-gradient-to-r from-primary-50 to-blue-50">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedJob.job_title}</h2>
                <p className="text-gray-700">{selectedJob.company_name}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  {selectedJob.min_cgpa && (
                    <span className="badge badge-info">Min CGPA: {selectedJob.min_cgpa}</span>
                  )}
                  {selectedJob.max_backlogs !== null && (
                    <span className="badge badge-info">Max Backlogs: {selectedJob.max_backlogs}</span>
                  )}
                  {selectedJob.allowed_branches && selectedJob.allowed_branches.length > 0 && (
                    <span className="badge badge-info">
                      {selectedJob.allowed_branches.length} Branch(es)
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleExportCSV}
                disabled={filteredStudents.length === 0}
                className="btn btn-primary flex items-center space-x-2"
              >
                <Download size={18} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="mb-6">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="btn btn-secondary flex items-center space-x-2 mb-3"
            >
              <Filter size={18} />
              <span>Additional Filters</span>
              {hasActiveFilters() && (
                <span className="bg-primary-600 text-white px-2 py-0.5 text-xs rounded-full">
                  Active
                </span>
              )}
              {showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showAdvancedFilters && (
              <div className="card p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* CGPA Range */}
                  <div>
                    <label className="label text-sm">Additional Min CGPA</label>
                    <input
                      type="number"
                      value={advancedFilters.cgpaMin}
                      onChange={(e) => handleAdvancedFilterChange('cgpaMin', e.target.value)}
                      placeholder="e.g., 7.0"
                      min="0"
                      max="10"
                      step="0.1"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label text-sm">Additional Max CGPA</label>
                    <input
                      type="number"
                      value={advancedFilters.cgpaMax}
                      onChange={(e) => handleAdvancedFilterChange('cgpaMax', e.target.value)}
                      placeholder="e.g., 9.0"
                      min="0"
                      max="10"
                      step="0.1"
                      className="input"
                    />
                  </div>

                  {/* Backlog Count */}
                  <div>
                    <label className="label text-sm">Max Backlogs (Stricter)</label>
                    <input
                      type="number"
                      value={advancedFilters.maxBacklogs}
                      onChange={(e) => handleAdvancedFilterChange('maxBacklogs', e.target.value)}
                      placeholder="e.g., 0 for no backlogs"
                      min="0"
                      className="input"
                    />
                  </div>

                  {/* DOB Range */}
                  <div>
                    <label className="label text-sm">Date of Birth (From)</label>
                    <input
                      type="date"
                      value={advancedFilters.dobFrom}
                      onChange={(e) => handleAdvancedFilterChange('dobFrom', e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label text-sm">Date of Birth (To)</label>
                    <input
                      type="date"
                      value={advancedFilters.dobTo}
                      onChange={(e) => handleAdvancedFilterChange('dobTo', e.target.value)}
                      className="input"
                    />
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    onClick={clearAdvancedFilters}
                    className="btn btn-secondary"
                    disabled={!hasActiveFilters()}
                  >
                    Clear Filters
                  </button>
                  <div className="text-sm text-gray-600 self-center">
                    Showing {filteredStudents.length} applicants
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Job Applicants Table */}
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center">
                <Users className="mr-2" size={20} />
                Job Applicants ({filteredStudents.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>PRN</th>
                    <th>Name</th>
                    <th>Branch</th>
                    <th>CGPA</th>
                    <th>Backlogs</th>
                    <th>DOB</th>
                    <th>Email</th>
                    <th>Mobile</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center text-gray-500 py-8">
                        No students have applied to this job yet
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.id}>
                        <td className="font-mono font-semibold">{student.prn}</td>
                        <td className="font-medium">{student.name}</td>
                        <td className="text-sm">{student.branch}</td>
                        <td className="font-semibold text-green-600">{student.cgpa}</td>
                        <td>
                          {student.backlog_count > 0 ? (
                            <span className="text-orange-600 font-semibold">{student.backlog_count}</span>
                          ) : (
                            <span className="text-green-600 font-semibold flex items-center">
                              <Check size={16} className="mr-1" /> 0
                            </span>
                          )}
                        </td>
                        <td className="text-sm">
                          {student.date_of_birth
                            ? new Date(student.date_of_birth).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="text-sm">{student.email}</td>
                        <td className="text-sm">{student.mobile_number || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
