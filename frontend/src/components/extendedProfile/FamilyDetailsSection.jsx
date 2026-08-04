import { Users, User, CheckCircle, Loader } from 'lucide-react';

const FamilyDetailsSection = ({ formData, setFormData, onSave, saving, isCompleted, mode = 'full' }) => {
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
              <Users className="text-spc-teal" size={28} />
            </div>
            <h2 className="text-spc-h1-lg font-extrabold text-spc-ink">Family Details</h2>
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
            <Users className="text-spc-teal" size={22} />
          </div>
          <h3 className="text-spc-h1 font-extrabold text-spc-ink">Family Details</h3>
        </div>
      )}

      {/* Father Details */}
      <div className="rounded-spc bg-spc-surface-2 p-5 mb-6">
        <h3 className="text-spc-h2 font-bold text-spc-ink mb-5 flex items-center">
          <div className="bg-spc-teal-soft rounded-spc-sm p-2 mr-3">
            <User size={20} className="text-spc-teal" />
          </div>
          Father's Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              Name
            </label>
            <input
              type="text"
              name="father_name"
              value={formData.father_name}
              onChange={handleChange}
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm border border-spc-control outline-none transition-colors focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              Occupation
            </label>
            <input
              type="text"
              name="father_occupation"
              value={formData.father_occupation}
              onChange={handleChange}
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm border border-spc-control outline-none transition-colors focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25"
              placeholder="Engineer"
            />
          </div>
          <div>
            <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              Annual Income (₹)
            </label>
            <input
              type="number"
              name="father_annual_income"
              value={formData.father_annual_income}
              onChange={handleChange}
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm border border-spc-control outline-none transition-colors focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25"
              placeholder="500000"
            />
          </div>
        </div>
      </div>

      {/* Mother Details */}
      <div className="rounded-spc bg-spc-surface-2 p-5 mb-6">
        <h3 className="text-spc-h2 font-bold text-spc-ink mb-5 flex items-center">
          <div className="bg-spc-teal-soft rounded-spc-sm p-2 mr-3">
            <User size={20} className="text-spc-teal" />
          </div>
          Mother's Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              Name
            </label>
            <input
              type="text"
              name="mother_name"
              value={formData.mother_name}
              onChange={handleChange}
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm border border-spc-control outline-none transition-colors focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25"
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              Occupation
            </label>
            <input
              type="text"
              name="mother_occupation"
              value={formData.mother_occupation}
              onChange={handleChange}
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm border border-spc-control outline-none transition-colors focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25"
              placeholder="Teacher"
            />
          </div>
          <div>
            <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              Annual Income (₹)
            </label>
            <input
              type="number"
              name="mother_annual_income"
              value={formData.mother_annual_income}
              onChange={handleChange}
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm border border-spc-control outline-none transition-colors focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25"
              placeholder="400000"
            />
          </div>
        </div>
      </div>

      {/* Siblings */}
      <div className="mb-6">
        <h3 className="text-spc-h2 font-bold text-spc-ink mb-5 flex items-center">
          <div className="bg-spc-teal-soft rounded-spc-sm p-2 mr-3">
            <Users size={20} className="text-spc-teal" />
          </div>
          Siblings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              Number of Siblings
            </label>
            <input
              type="number"
              name="siblings_count"
              value={formData.siblings_count}
              onChange={handleChange}
              min="0"
              max="10"
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm border border-spc-control outline-none transition-colors focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25"
            />
          </div>
          <div>
            <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              Siblings Details
            </label>
            <input
              type="text"
              name="siblings_details"
              value={formData.siblings_details}
              onChange={handleChange}
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm border border-spc-control outline-none transition-colors focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25"
              placeholder="1 brother (engineer), 1 sister (doctor)"
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
                <span>{isCompleted ? 'Update Saved Data' : 'Save Family Details'}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default FamilyDetailsSection;
