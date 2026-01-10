import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { commonAPI } from '../../services/api';
import { UserPlus, CheckCircle, XCircle, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { BRANCH_SHORT_NAMES } from '../../constants/branches';

export default function StudentRegisterPage() {
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [branches, setBranches] = useState([]);
  const [prnValid, setPrnValid] = useState(null);
  const [prnChecking, setPrnChecking] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [formData, setFormData] = useState({
    prn: '',
    student_name: '',
    branch: '',
    region_id: '',
    college_id: '',
    email: '',
    mobile_number: '',
    date_of_birth: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    complete_address: '',
    cgpa_sem1: '',
    cgpa_sem2: '',
    cgpa_sem3: '',
    cgpa_sem4: '',
    cgpa_sem5: '',
    cgpa_sem6: '',
    programme_cgpa: '',
    has_driving_license: false,
    has_pan_card: false,
    has_aadhar_card: false,
    has_passport: false,
    cgpa: '',
    backlog_count: '0',
    backlog_details: '',
    photo_base64: '',
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

  const fetchBranches = async (collegeId) => {
    try {
      console.log('Fetching branches for college:', collegeId);
      const response = await commonAPI.getCollegeBranches(collegeId);
      console.log('Branches API response:', response.data);
      const branchesData = response.data.data.branches || [];
      console.log('Setting branches:', branchesData);
      setBranches(branchesData);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      toast.error('Failed to fetch branches');
      setBranches([]);
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

  // Calculate age from date of birth
  const calculateAge = (dob) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Calculate programme CGPA from sem1-4
  const calculateProgrammeCGPA = (sem1, sem2, sem3, sem4) => {
    const semesters = [sem1, sem2, sem3, sem4].filter(val => val && !isNaN(parseFloat(val)));
    if (semesters.length === 0) return '';
    const sum = semesters.reduce((acc, val) => acc + parseFloat(val), 0);
    return (sum / semesters.length).toFixed(2);
  };

  // Handle photo upload
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 500KB)
    if (file.size > 500 * 1024) {
      toast.error('Photo size must be less than 500KB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
      setFormData((prev) => ({ ...prev, photo_base64: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setFormData((prev) => ({ ...prev, photo_base64: '' }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;

    setFormData((prev) => {
      const updated = { ...prev, [name]: fieldValue };

      // Auto-calculate age when DOB changes
      if (name === 'date_of_birth') {
        updated.age = calculateAge(value);
      }

      // Auto-calculate programme CGPA when sem1-4 changes
      if (['cgpa_sem1', 'cgpa_sem2', 'cgpa_sem3', 'cgpa_sem4'].includes(name)) {
        updated.programme_cgpa = calculateProgrammeCGPA(
          name === 'cgpa_sem1' ? value : prev.cgpa_sem1,
          name === 'cgpa_sem2' ? value : prev.cgpa_sem2,
          name === 'cgpa_sem3' ? value : prev.cgpa_sem3,
          name === 'cgpa_sem4' ? value : prev.cgpa_sem4
        );
      }

      // Reset branch when college changes
      if (name === 'college_id') {
        updated.branch = '';
      }

      return updated;
    });

    if (name === 'prn') {
      setPrnValid(null);
    }

    // Fetch branches when college changes
    if (name === 'college_id' && value) {
      fetchBranches(value);
    } else if (name === 'college_id' && !value) {
      setBranches([]);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 py-12 px-4 relative overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-12 border border-white/20">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl mb-5 shadow-xl transform hover:scale-110 hover:rotate-3 transition-all duration-300">
              <UserPlus className="text-white" size={40} />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-3">
              Student Registration
            </h1>
            <p className="text-gray-600 text-lg font-medium">
              State Placement Cell, Kerala Polytechnics
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Fill in your details to create your placement portal account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Information Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-100">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent mb-6 flex items-center gap-2">
                <span className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg px-3 py-1 text-sm">1</span>
                Personal Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* PRN Field with Validation */}
                <div className="md:col-span-2">
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
                <div className="md:col-span-2">
                  <label htmlFor="student_name" className="label">
                    Full Name *
                  </label>
                  <input
                    id="student_name"
                    type="text"
                    name="student_name"
                    value={formData.student_name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
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

                {/* Age (Auto-calculated) */}
                <div>
                  <label htmlFor="age" className="label">
                    Age
                  </label>
                  <input
                    id="age"
                    type="number"
                    name="age"
                    value={formData.age}
                    className="input bg-gray-50"
                    disabled
                    placeholder="Auto-calculated"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label htmlFor="gender" className="label">
                    Gender *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="input"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Height */}
                <div>
                  <label htmlFor="height" className="label">
                    Height (cm) *
                  </label>
                  <select
                    id="height"
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    className="input"
                    required
                  >
                    <option value="">Select Height</option>
                    {Array.from({ length: 81 }, (_, i) => 140 + i).map(h => (
                      <option key={h} value={h}>{h} cm</option>
                    ))}
                  </select>
                </div>

                {/* Weight */}
                <div>
                  <label htmlFor="weight" className="label">
                    Weight (kg) *
                  </label>
                  <select
                    id="weight"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    className="input"
                    required
                  >
                    <option value="">Select Weight</option>
                    {Array.from({ length: 121 }, (_, i) => 30 + i).map(w => (
                      <option key={w} value={w}>{w} kg</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-100">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-pink-700 bg-clip-text text-transparent mb-6 flex items-center gap-2">
                <span className="bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-lg px-3 py-1 text-sm">2</span>
                Contact Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                {/* Complete Address */}
                <div className="md:col-span-2">
                  <label htmlFor="complete_address" className="label">
                    Complete Address *
                  </label>
                  <textarea
                    id="complete_address"
                    name="complete_address"
                    value={formData.complete_address}
                    onChange={handleChange}
                    placeholder="Enter your complete address"
                    className="input"
                    rows="3"
                    required
                  />
                </div>
              </div>
            </div>

            {/* College Information Section */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 border-2 border-emerald-100">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent mb-6 flex items-center gap-2">
                <span className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-lg px-3 py-1 text-sm">3</span>
                College Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                {/* College Selection */}
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
                      {formData.region_id ? 'Select College' : 'Select region first'}
                    </option>
                    {colleges.map((college) => (
                      <option key={college.id} value={college.id}>
                        {college.college_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Branch */}
                <div className="md:col-span-2">
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
                    disabled={!formData.college_id || branches.length === 0}
                  >
                    <option value="">
                      {!formData.college_id
                        ? 'Select college first'
                        : branches.length === 0
                        ? 'Loading branches...'
                        : 'Select your branch'}
                    </option>
                    {branches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch} {BRANCH_SHORT_NAMES[branch] ? `(${BRANCH_SHORT_NAMES[branch]})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Academic Information Section */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-100">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent mb-6 flex items-center gap-2">
                <span className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-lg px-3 py-1 text-sm">4</span>
                Academic Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Semester 1 CGPA */}
                <div>
                  <label htmlFor="cgpa_sem1" className="label">
                    Semester 1 CGPA *
                  </label>
                  <input
                    id="cgpa_sem1"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    name="cgpa_sem1"
                    value={formData.cgpa_sem1}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="input"
                    required
                  />
                </div>

                {/* Semester 2 CGPA */}
                <div>
                  <label htmlFor="cgpa_sem2" className="label">
                    Semester 2 CGPA *
                  </label>
                  <input
                    id="cgpa_sem2"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    name="cgpa_sem2"
                    value={formData.cgpa_sem2}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="input"
                    required
                  />
                </div>

                {/* Semester 3 CGPA */}
                <div>
                  <label htmlFor="cgpa_sem3" className="label">
                    Semester 3 CGPA *
                  </label>
                  <input
                    id="cgpa_sem3"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    name="cgpa_sem3"
                    value={formData.cgpa_sem3}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="input"
                    required
                  />
                </div>

                {/* Semester 4 CGPA */}
                <div>
                  <label htmlFor="cgpa_sem4" className="label">
                    Semester 4 CGPA *
                  </label>
                  <input
                    id="cgpa_sem4"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    name="cgpa_sem4"
                    value={formData.cgpa_sem4}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="input"
                    required
                  />
                </div>

                {/* Semester 5 CGPA */}
                <div>
                  <label htmlFor="cgpa_sem5" className="label">
                    Semester 5 CGPA
                  </label>
                  <input
                    id="cgpa_sem5"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    name="cgpa_sem5"
                    value={formData.cgpa_sem5}
                    onChange={handleChange}
                    placeholder="0.00 (optional)"
                    className="input"
                  />
                </div>

                {/* Semester 6 CGPA */}
                <div>
                  <label htmlFor="cgpa_sem6" className="label">
                    Semester 6 CGPA
                  </label>
                  <input
                    id="cgpa_sem6"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    name="cgpa_sem6"
                    value={formData.cgpa_sem6}
                    onChange={handleChange}
                    placeholder="0.00 (optional)"
                    className="input"
                  />
                </div>

                {/* Programme CGPA (Auto-calculated) */}
                <div className="md:col-span-3">
                  <label htmlFor="programme_cgpa" className="label">
                    Programme CGPA (Average of Sem 1-4)
                  </label>
                  <input
                    id="programme_cgpa"
                    type="text"
                    name="programme_cgpa"
                    value={formData.programme_cgpa}
                    className="input bg-gray-50 font-semibold"
                    disabled
                    placeholder="Auto-calculated"
                  />
                </div>
              </div>
            </div>

            {/* Backlogs Section */}
            <div className="bg-gradient-to-r from-rose-50 to-red-50 rounded-2xl p-6 border-2 border-rose-100">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-rose-700 to-red-700 bg-clip-text text-transparent mb-6 flex items-center gap-2">
                <span className="bg-gradient-to-br from-rose-500 to-red-600 text-white rounded-lg px-3 py-1 text-sm">5</span>
                Backlogs
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <option value="0">No Backlogs</option>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>

                {/* Backlog Details */}
                {formData.backlog_count !== '0' && (
                  <div className="md:col-span-2">
                    <label htmlFor="backlog_details" className="label">
                      Backlog Details
                    </label>
                    <textarea
                      id="backlog_details"
                      name="backlog_details"
                      value={formData.backlog_details}
                      onChange={handleChange}
                      placeholder="Specify subject names and details"
                      className="input"
                      rows="3"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Documents Section */}
            <div className="bg-gradient-to-r from-cyan-50 to-sky-50 rounded-2xl p-6 border-2 border-cyan-100">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-700 to-sky-700 bg-clip-text text-transparent mb-6 flex items-center gap-2">
                <span className="bg-gradient-to-br from-cyan-500 to-sky-600 text-white rounded-lg px-3 py-1 text-sm">6</span>
                Documents
              </h2>

              <div className="space-y-4">
                {/* Driving License */}
                <div className="flex items-center">
                  <input
                    id="has_driving_license"
                    type="checkbox"
                    name="has_driving_license"
                    checked={formData.has_driving_license}
                    onChange={handleChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="has_driving_license" className="ml-2 block text-sm text-gray-700">
                    I have a valid Driving License
                  </label>
                </div>

                {/* PAN Card */}
                <div className="flex items-center">
                  <input
                    id="has_pan_card"
                    type="checkbox"
                    name="has_pan_card"
                    checked={formData.has_pan_card}
                    onChange={handleChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="has_pan_card" className="ml-2 block text-sm text-gray-700">
                    I have a PAN Card
                  </label>
                </div>

                {/* Aadhar Card */}
                <div className="flex items-center">
                  <input
                    id="has_aadhar_card"
                    type="checkbox"
                    name="has_aadhar_card"
                    checked={formData.has_aadhar_card}
                    onChange={handleChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="has_aadhar_card" className="ml-2 block text-sm text-gray-700">
                    I have an Aadhar Card
                  </label>
                </div>

                {/* Passport */}
                <div className="flex items-center">
                  <input
                    id="has_passport"
                    type="checkbox"
                    name="has_passport"
                    checked={formData.has_passport}
                    onChange={handleChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="has_passport" className="ml-2 block text-sm text-gray-700">
                    I have a Passport
                  </label>
                </div>
              </div>
            </div>

            {/* Photo Upload Section */}
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl p-6 border-2 border-violet-100">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-700 to-purple-700 bg-clip-text text-transparent mb-6 flex items-center gap-2">
                <span className="bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-lg px-3 py-1 text-sm">7</span>
                Photo Upload
              </h2>

              <div className="space-y-4">
                {!photoPreview ? (
                  <div>
                    <label className="label">
                      Upload Your Photo * (Max 500KB, JPG/PNG)
                    </label>
                    <label htmlFor="photo_upload" className="flex items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Click to upload photo</p>
                        <p className="text-xs text-gray-500">JPG, PNG (MAX 500KB)</p>
                      </div>
                      <input
                        id="photo_upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                        required
                      />
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                    <p className="text-sm text-green-600 mt-2">Photo uploaded successfully!</p>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !prnValid || !formData.photo_base64}
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Complete Registration
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="mt-8 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-600 font-semibold">Already have an account?</span>
              </div>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-8 py-3 border-2 border-blue-600 text-blue-600 bg-blue-50 hover:bg-blue-100 font-bold rounded-xl transition-all shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
            >
              Login to your account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
