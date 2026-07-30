import { User, CheckCircle, Loader } from 'lucide-react';

const PersonalDetailsSection = ({ formData, setFormData, onSave, saving, isCompleted, mode = 'full' }) => {
  const districts = [
    'Thiruvananthapuram', 'Kollam', 'Alappuzha', 'Pathanamthitta', 'Kottayam',
    'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram',
    'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      {mode === 'full' && (
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-spc-teal-soft rounded-spc-sm p-2.5">
              <User className="text-spc-teal" size={28} />
            </div>
            <h2 className="text-spc-h1-lg font-extrabold text-spc-ink">Personal Details</h2>
          </div>
          {isCompleted && (
            <span className="inline-flex items-center gap-2 rounded-spc-sm bg-spc-ok-bg text-spc-ok text-spc-xs font-bold px-3 py-1.5">
              <CheckCircle className="mr-2" size={20} />
              Completed
            </span>
          )}
        </div>
      )}

      {mode === 'compact' && (
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-spc-teal-soft rounded-spc-sm p-2">
            <User className="text-spc-teal" size={22} />
          </div>
          <h3 className="text-spc-h1 font-extrabold text-spc-ink">Personal Details</h3>
        </div>
      )}

      <div className="mb-6">
        <div className="space-y-5">
          <div>
            <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              District
            </label>
            <select
              name="district"
              value={formData.district}
              onChange={handleChange}
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm border border-spc-line-strong outline-none transition-colors focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25"
            >
              <option value="">Select District</option>
              {districts.map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              Permanent Address
            </label>
            <textarea
              name="permanent_address"
              value={formData.permanent_address}
              onChange={handleChange}
              rows="4"
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm border border-spc-line-strong outline-none transition-colors focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25"
              placeholder="Enter your complete address..."
            />
          </div>

          <div>
            <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              Interests & Hobbies
            </label>
            <textarea
              name="interests_hobbies"
              value={formData.interests_hobbies}
              onChange={handleChange}
              rows="4"
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm border border-spc-line-strong outline-none transition-colors focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25"
              placeholder="e.g., Reading, Coding, Sports, Music..."
            />
          </div>
        </div>
      </div>

      {mode === 'full' && onSave && (
        <div className="flex justify-end">
          <button
            onClick={onSave}
            disabled={saving}
            className={`inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-spc-sm text-spc-sm font-bold transition-opacity ${
              saving
                ? 'bg-spc-muted text-white cursor-not-allowed'
                : 'bg-spc-teal text-spc-on-teal hover:opacity-95'
            }`}
          >
            {saving ? (
              <>
                <Loader className="animate-spin" size={20} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                {isCompleted && <CheckCircle size={20} />}
                <span>{isCompleted ? 'Update Saved Data' : 'Save Personal Details'}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default PersonalDetailsSection;
