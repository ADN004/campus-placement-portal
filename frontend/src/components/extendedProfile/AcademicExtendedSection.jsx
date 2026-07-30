import { GraduationCap, CheckCircle, Loader } from 'lucide-react';

const AcademicExtendedSection = ({ formData, setFormData, onSave, saving, isCompleted, mode = 'full' }) => {
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
              <GraduationCap className="text-spc-teal" size={28} />
            </div>
            <h2 className="text-spc-h1-lg font-extrabold text-spc-ink">Academic Extended Details</h2>
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
            <GraduationCap className="text-spc-teal" size={22} />
          </div>
          <h3 className="text-spc-h1 font-extrabold text-spc-ink">Academic Extended Details</h3>
        </div>
      )}

      {/* SSLC Section */}
      <div className="rounded-spc bg-spc-surface-2 p-5 mb-6">
        <h3 className="text-spc-h2 font-bold text-spc-ink mb-5 flex items-center">
          <div className="bg-spc-teal-soft rounded-spc-sm p-2 mr-3">
            <GraduationCap size={20} className="text-spc-teal" />
          </div>
          SSLC Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              SSLC Marks (%)
            </label>
            <input
              type="number"
              name="sslc_marks"
              value={formData.sslc_marks}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.01"
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm border border-spc-line-strong outline-none transition-colors focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25"
              placeholder="85.5"
            />
          </div>
          <div>
            <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              SSLC Year
            </label>
            <input
              type="number"
              name="sslc_year"
              value={formData.sslc_year}
              onChange={handleChange}
              min="2000"
              max="2030"
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm border border-spc-line-strong outline-none transition-colors focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25"
              placeholder="2020"
            />
          </div>
          <div>
            <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              Board
            </label>
            <input
              type="text"
              name="sslc_board"
              value={formData.sslc_board}
              onChange={handleChange}
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm border border-spc-line-strong outline-none transition-colors focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25"
              placeholder="CBSE"
            />
          </div>
        </div>
      </div>

      {/* 12th Section */}
      <div className="mb-6">
        <h3 className="text-spc-h2 font-bold text-spc-ink mb-2 flex items-center">
          <div className="bg-spc-teal-soft rounded-spc-sm p-2 mr-3">
            <GraduationCap size={20} className="text-spc-teal" />
          </div>
          12th Details
        </h3>
        <p className="text-spc-xs text-spc-muted mb-5 ml-11">Optional - If applicable</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              12th Marks (%)
            </label>
            <input
              type="number"
              name="twelfth_marks"
              value={formData.twelfth_marks}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.01"
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm border border-spc-line-strong outline-none transition-colors focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25"
              placeholder="82.0"
            />
          </div>
          <div>
            <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              12th Year
            </label>
            <input
              type="number"
              name="twelfth_year"
              value={formData.twelfth_year}
              onChange={handleChange}
              min="2000"
              max="2030"
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm border border-spc-line-strong outline-none transition-colors focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25"
              placeholder="2022"
            />
          </div>
          <div>
            <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
              Board
            </label>
            <input
              type="text"
              name="twelfth_board"
              value={formData.twelfth_board}
              onChange={handleChange}
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm border border-spc-line-strong outline-none transition-colors focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25"
              placeholder="State Board"
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
                <span>{isCompleted ? 'Update Saved Data' : 'Save Academic Details'}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default AcademicExtendedSection;
