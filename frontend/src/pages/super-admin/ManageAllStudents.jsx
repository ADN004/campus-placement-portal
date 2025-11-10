import { useEffect, useState } from 'react';
import { superAdminAPI } from '../../services/api';
import {
  Users,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  XCircle,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function ManageAllStudents() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterCollege, setFilterCollege] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [regions, setRegions] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    filterStudents();
    // Extract unique regions and colleges whenever students change
    if (students.length > 0) {
      const regionsSet = new Set();
      const collegesSet = new Set();

      students.forEach(student => {
        if (student.region_name) regionsSet.add(student.region_name);
        if (student.college_name) collegesSet.add(student.college_name);
      });

      setRegions(Array.from(regionsSet).sort());
      setColleges(Array.from(collegesSet).sort());
    }
  }, [searchQuery, filterRegion, filterCollege, filterStatus, students]);

  const fetchStudents = async () => {
    try {
      const response = await superAdminAPI.getAllStudents();
      setStudents(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = students;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (student) =>
          student.prn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.mobile_number?.includes(searchQuery)
      );
    }

    // Region filter
    if (filterRegion) {
      filtered = filtered.filter((student) => student.region_name === filterRegion);
    }

    // College filter
    if (filterCollege) {
      filtered = filtered.filter((student) => student.college_name === filterCollege);
    }

    // Status filter
    if (filterStatus) {
      if (filterStatus === 'blacklisted') {
        filtered = filtered.filter((student) => student.is_blacklisted);
      } else {
        filtered = filtered.filter(
          (student) => student.registration_status === filterStatus
        );
      }
    }

    setFilteredStudents(filtered);
  };

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setShowDetailsModal(true);
  };

  const handleDeleteClick = (student) => {
    setSelectedStudent(student);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedStudent) return;

    setDeleting(true);
    try {
      await superAdminAPI.deleteStudent(selectedStudent.id);
      toast.success('Student deleted successfully');
      setShowDeleteModal(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete student');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = () => {
    // Create CSV
    const headers = ['PRN', 'Name', 'Email', 'Mobile', 'College', 'Region', 'CGPA', 'Backlogs', 'Status'];
    const csvData = filteredStudents.map(student => [
      student.prn,
      student.name,
      student.email,
      student.mobile_number,
      student.college_name,
      student.region_name,
      student.cgpa,
      student.backlog_count,
      student.is_blacklisted ? 'Blacklisted' : student.registration_status
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Students exported successfully');
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage All Students</h1>
          <p className="text-gray-600 mt-2">
            Total: {students.length} | Showing: {filteredStudents.length}
          </p>
        </div>
        <button onClick={handleExport} className="btn btn-primary flex items-center space-x-2">
          <Download size={18} />
          <span>Export to CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search PRN, name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Region Filter */}
          <div>
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="input"
            >
              <option value="">All Regions</option>
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>

          {/* College Filter */}
          <div>
            <select
              value={filterCollege}
              onChange={(e) => setFilterCollege(e.target.value)}
              className="input"
            >
              <option value="">All Colleges</option>
              {colleges.map((college) => (
                <option key={college} value={college}>
                  {college}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="blacklisted">Blacklisted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PRN
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                College
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Region
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CGPA
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  <Users className="mx-auto mb-4 text-gray-400" size={48} />
                  <p>No students found</p>
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.prn}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.college_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.region_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.cgpa}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.is_blacklisted ? (
                      <span className="badge badge-danger flex items-center space-x-1 w-fit">
                        <XCircle size={14} />
                        <span>Blacklisted</span>
                      </span>
                    ) : student.registration_status === 'approved' ? (
                      <span className="badge badge-success flex items-center space-x-1 w-fit">
                        <CheckCircle size={14} />
                        <span>Approved</span>
                      </span>
                    ) : student.registration_status === 'pending' ? (
                      <span className="badge badge-warning flex items-center space-x-1 w-fit">
                        <AlertTriangle size={14} />
                        <span>Pending</span>
                      </span>
                    ) : (
                      <span className="badge badge-danger flex items-center space-x-1 w-fit">
                        <XCircle size={14} />
                        <span>Rejected</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleViewDetails(student)}
                      className="text-primary-600 hover:text-primary-900"
                      title="View Details"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(student)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Student"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Student Details Modal */}
      {showDetailsModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Student Details</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedStudent(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">PRN</label>
                  <p className="text-gray-900 font-medium">{selectedStudent.prn}</p>
                </div>
                <div>
                  <label className="label">Name</label>
                  <p className="text-gray-900 font-medium">{selectedStudent.name}</p>
                </div>
                <div>
                  <label className="label">Email</label>
                  <p className="text-gray-900">{selectedStudent.email}</p>
                </div>
                <div>
                  <label className="label">Mobile Number</label>
                  <p className="text-gray-900">{selectedStudent.mobile_number}</p>
                </div>
                <div>
                  <label className="label">College</label>
                  <p className="text-gray-900">{selectedStudent.college_name}</p>
                </div>
                <div>
                  <label className="label">Region</label>
                  <p className="text-gray-900">{selectedStudent.region_name}</p>
                </div>
                <div>
                  <label className="label">Branch</label>
                  <p className="text-gray-900">{selectedStudent.branch}</p>
                </div>
                <div>
                  <label className="label">CGPA</label>
                  <p className="text-gray-900 font-medium">{selectedStudent.cgpa}</p>
                </div>
                <div>
                  <label className="label">Backlogs</label>
                  <p className="text-gray-900">{selectedStudent.backlog_count}</p>
                </div>
                <div>
                  <label className="label">Status</label>
                  <p className="text-gray-900">
                    {selectedStudent.is_blacklisted
                      ? 'Blacklisted'
                      : selectedStudent.registration_status}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedStudent(null);
                }}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-red-600">Delete Student</h2>
            <p className="text-gray-600 mb-2">
              Are you sure you want to permanently delete this student?
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm">
                <span className="font-semibold">PRN:</span> {selectedStudent.prn}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Name:</span> {selectedStudent.name}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Email:</span> {selectedStudent.email}
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This action cannot be undone. All student data including
                applications and records will be permanently deleted. The student can register again
                with the same PRN.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="btn bg-red-600 hover:bg-red-700 text-white flex-1"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedStudent(null);
                }}
                disabled={deleting}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
