import { Activity, CheckCircle, Loader } from 'lucide-react';

const PhysicalDetailsSection = ({ formData, setFormData, onSave, saving, isCompleted, mode = 'full' }) => {
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
              <Activity className="text-spc-teal" size={28} />
            </div>
            <h2 className="text-spc-h1-lg font-extrabold text-spc-ink">Physical Details</h2>
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
            <Activity className="text-spc-teal" size={22} />
          </div>
          <h3 className="text-spc-h1 font-extrabold text-spc-ink">Physical Details</h3>
        </div>
      )}

      <div className="rounded-spc bg-spc-surface-2 p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              Height (cm)
            </label>
            <input
              type="number"
              name="height_cm"
              value={formData.height_cm}
              onChange={handleChange}
              min="100"
              max="250"
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm border border-spc-control outline-none transition-colors focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25"
              placeholder="170"
            />
          </div>
          <div>
            <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              Weight (kg)
            </label>
            <input
              type="number"
              name="weight_kg"
              value={formData.weight_kg}
              onChange={handleChange}
              min="30"
              max="200"
              step="0.1"
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm border border-spc-control outline-none transition-colors focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25"
              placeholder="65.5"
            />
          </div>
        </div>
      </div>

      <div className="rounded-spc bg-spc-surface-2 p-5 mb-6">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            name="physically_handicapped"
            checked={formData.physically_handicapped}
            onChange={handleChange}
            className="h-5 w-5 rounded border-spc-line-strong text-spc-teal focus:ring-spc-teal flex-shrink-0"
          />
          <span className="text-spc-sm font-semibold text-spc-ink">
            I have a physical disability
          </span>
        </label>

        {formData.physically_handicapped && (
          <div className="mt-5">
            <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              Disability Details
            </label>
            <textarea
              name="handicap_details"
              value={formData.handicap_details}
              onChange={handleChange}
              rows="4"
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm border border-spc-control outline-none transition-colors focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25"
              placeholder="Please describe your disability..."
            />
          </div>
        )}
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
                <span>{isCompleted ? 'Update Saved Data' : 'Save Physical Details'}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default PhysicalDetailsSection;
