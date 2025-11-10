import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { commonAPI } from '../../services/api';
import { UserPlus, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { KERALA_POLYTECHNIC_BRANCHES } from '../../constants/branches';

export default function StudentRegisterPage() {
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [prnValid, setPrnValid] = useState(null);
  const [prnChecking, setPrnChecking] = useState(false);

  const [formData, setFormData] = useState({
    prn: '',
    name: '',
    branch: '',
    region_id: '',
    college_id: '',
    email: '',
    mobile_number: '',
    cgpa: '',
    date_of_birth: '',
    backlog_count: 'All cleared',
    backlog_details: '',
  });

  const { registerStudent } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRegions();
  }, []);

  useEffect(() => {
    if (formData.region_id) {
      fetchColleges(formData.region_id);
    } else {
      setColleges([]);
      setFormData((prev) => ({ ...prev, college_id: '' }));
    }
  }, [formData.region_id]);

  const fetchRegions = async () => {
    try {
      const response = await commonAPI.getRegions();
      setRegions(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch regions');
    }
  };

  const fetchColleges = async (regionId) => {
    try {
      const response = await commonAPI.getColleges(regionId);
      setColleges(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch colleges');
    }
  };

  const validatePRN = async (prn) => {
    if (!prn) {
      setPrnValid(null);
      return;
    }

    setPrnChecking(true);
    try {
      const response = await commonAPI.validatePRN(prn);
      setPrnValid(response.data.valid);
    } catch (error) {
      setPrnValid(false);
      toast.error(error.response?.data?.message || 'PRN validation failed');
    } finally {
      setPrnChecking(false);
    }
  };

  const handlePRNBlur = () => {
    validatePRN(formData.prn);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'prn') {
      setPrnValid(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!prnValid) {
      toast.error('Please enter a valid PRN');
      return;
    }

    setLoading(true);

    const result = await registerStudent(formData);

    setLoading(false);

    if (result.success) {
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <UserPlus className="text-primary-600" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Student Registration
            </h1>
            <p className="text-gray-600">
              Register for Campus Placement Portal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* PRN Field with Validation */}
            <div>
              <label htmlFor="prn" className="label">
                PRN (Personal Registration Number) *
              </label>
              <div className="relative">
                <input
                  id="prn"
                  type="text"
                  name="prn"
                  value={formData.prn}
                  onChange={handleChange}
                  onBlur={handlePRNBlur}
                  placeholder="Enter your PRN"
                  className="input pr-10"
                  required
                />
                {prnChecking && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full"></div>
                  </div>
                )}
                {!prnChecking && prnValid === true && (
                  <CheckCircle className="absolute right-3 top-3 text-green-500" size={20} />
                )}
                {!prnChecking && prnValid === false && (
                  <XCircle className="absolute right-3 top-3 text-red-500" size={20} />
                )}
              </div>
              {prnValid === false && (
                <p className="text-sm text-red-600 mt-1">
                  PRN is not valid or already registered
                </p>
              )}
            </div>

            {/* Student Name */}
            <div>
              <label htmlFor="name" className="label">
                Full Name *
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="input"
                required
              />
            </div>

            {/* Branch */}
            <div>
              <label htmlFor="branch" className="label">
                Branch/Department *
              </label>
              <select
                id="branch"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Select your branch</option>
                {KERALA_POLYTECHNIC_BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>

            {/* Region Selection */}
            <div>
              <label htmlFor="region_id" className="label">
                Region *
              </label>
              <select
                id="region_id"
                name="region_id"
                value={formData.region_id}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Select Region</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.region_name}
                  </option>
                ))}
              </select>
            </div>

            {/* College Selection (Filtered by Region) */}
            <div>
              <label htmlFor="college_id" className="label">
                College *
              </label>
              <select
                id="college_id"
                name="college_id"
                value={formData.college_id}
                onChange={handleChange}
                className="input"
                required
                disabled={!formData.region_id}
              >
                <option value="">
                  {formData.region_id
                    ? 'Select College'
                    : 'Select region first'}
                </option>
                {colleges.map((college) => (
                  <option key={college.id} value={college.id}>
                    {college.college_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="label">
                Email ID *
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                className="input"
                required
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label htmlFor="mobile_number" className="label">
                Mobile Number *
              </label>
              <input
                id="mobile_number"
                type="tel"
                name="mobile_number"
                value={formData.mobile_number}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                pattern="[0-9]{10}"
                className="input"
                required
              />
            </div>

            {/* CGPA */}
            <div>
              <label htmlFor="cgpa" className="label">
                CGPA (up to 4th semester) *
              </label>
              <input
                id="cgpa"
                type="number"
                step="0.01"
                min="0"
                max="10"
                name="cgpa"
                value={formData.cgpa}
                onChange={handleChange}
                placeholder="e.g., 8.50"
                className="input"
                required
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="date_of_birth" className="label">
                Date of Birth *
              </label>
              <input
                id="date_of_birth"
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            {/* Backlog Count */}
            <div>
              <label htmlFor="backlog_count" className="label">
                Backlog Count *
              </label>
              <select
                id="backlog_count"
                name="backlog_count"
                value={formData.backlog_count}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="All cleared">All cleared</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Backlog Details (if Other selected) */}
            {formData.backlog_count === 'Other' && (
              <div>
                <label htmlFor="backlog_details" className="label">
                  Backlog Details *
                </label>
                <textarea
                  id="backlog_details"
                  name="backlog_details"
                  value={formData.backlog_details}
                  onChange={handleChange}
                  placeholder="Specify number of backlogs and details"
                  className="input"
                  rows="3"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !prnValid}
              className="btn btn-primary w-full py-3 text-lg"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
