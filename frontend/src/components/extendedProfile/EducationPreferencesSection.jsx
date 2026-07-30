import { Lightbulb, GraduationCap, CheckCircle, Loader } from 'lucide-react';

const EducationPreferencesSection = ({ formData, setFormData, onSave, saving, isCompleted, mode = 'full' }) => {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div>
      {mode === 'full' && (
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-spc-teal-soft rounded-spc-sm p-2.5">
              <Lightbulb className="text-spc-teal" size={28} />
            </div>
            <h2 className="text-spc-h1-lg font-extrabold text-spc-ink">Education Preferences</h2>
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
            <Lightbulb className="text-spc-teal" size={22} />
          </div>
          <h3 className="text-spc-h1 font-extrabold text-spc-ink">Education Preferences</h3>
        </div>
      )}

      <div className="rounded-spc bg-spc-surface-2 p-5 mb-6">
        <h3 className="text-spc-h2 font-bold text-spc-ink mb-5 flex items-center">
          <div className="bg-spc-teal-soft rounded-spc-sm p-2 mr-3">
            <GraduationCap size={20} className="text-spc-teal" />
          </div>
          Higher Education Interest
        </h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3 min-h-[56px] px-4 cursor-pointer rounded-spc-sm bg-spc-surface border border-spc-line hover:border-spc-line-strong transition-colors">
            <input
              type="checkbox"
              name="interested_in_btech"
              checked={formData.interested_in_btech}
              onChange={handleChange}
              className="h-5 w-5 rounded border-spc-line-strong text-spc-teal focus:ring-spc-teal flex-shrink-0"
            />
            <span className="text-spc-sm font-semibold text-spc-ink flex-1">
              Interested in B.Tech
            </span>
            {formData.interested_in_btech && (
              <div className="bg-spc-ok rounded-full p-1">
                <CheckCircle className="text-white" size={18} />
              </div>
            )}
          </label>
          <label className="flex items-center gap-3 min-h-[56px] px-4 cursor-pointer rounded-spc-sm bg-spc-surface border border-spc-line hover:border-spc-line-strong transition-colors">
            <input
              type="checkbox"
              name="interested_in_mtech"
              checked={formData.interested_in_mtech}
              onChange={handleChange}
              className="h-5 w-5 rounded border-spc-line-strong text-spc-teal focus:ring-spc-teal flex-shrink-0"
            />
            <span className="text-spc-sm font-semibold text-spc-ink flex-1">
              Interested in M.Tech
            </span>
            {formData.interested_in_mtech && (
              <div className="bg-spc-ok rounded-full p-1">
                <CheckCircle className="text-white" size={18} />
              </div>
            )}
          </label>
          <label className="flex items-center gap-3 min-h-[56px] px-4 cursor-pointer rounded-spc-sm bg-spc-surface border border-spc-line hover:border-spc-line-strong transition-colors">
            <input
              type="checkbox"
              name="not_interested_in_higher_education"
              checked={formData.not_interested_in_higher_education}
              onChange={handleChange}
              className="h-5 w-5 rounded border-spc-line-strong text-spc-teal focus:ring-spc-teal flex-shrink-0"
            />
            <span className="text-spc-sm font-semibold text-spc-ink flex-1">
              Not Interested in Higher Education
            </span>
            {formData.not_interested_in_higher_education && (
              <div className="bg-spc-ok rounded-full p-1">
                <CheckCircle className="text-white" size={18} />
              </div>
            )}
          </label>
        </div>
      </div>

      {(formData.interested_in_btech || formData.interested_in_mtech) && (
        <div className="mb-6">
          <label className="block text-spc-label font-bold uppercase text-spc-muted mb-2">
            Preferred Study Mode
          </label>
          <select
            name="preferred_study_mode"
            value={formData.preferred_study_mode}
            onChange={handleChange}
            className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm border border-spc-line-strong outline-none transition-colors focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25"
          >
            <option value="">Select Study Mode</option>
            <option value="full-time">Full Time</option>
            <option value="part-time">Part Time</option>
            <option value="distance">Distance Education</option>
          </select>
        </div>
      )}

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
                <span>{isCompleted ? 'Update Saved Data' : 'Save Education Preferences'}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default EducationPreferencesSection;
