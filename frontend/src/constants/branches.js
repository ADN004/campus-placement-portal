// Kerala Polytechnic Diploma Engineering and Technology Branches
export const KERALA_POLYTECHNIC_BRANCHES = [
  'Architecture',
  'Automobile Engineering',
  'Biomedical Engineering',
  'Chemical Engineering',
  'Civil Engineering',
  'Civil Engineering (Hearing Impaired)',
  'Commercial Practice',
  'Computer Application and Business Management',
  'Computer Applications',
  'Computer Engineering',
  'Computer Engineering (Hearing Impaired)',
  'Computer Hardware Engineering',
  'Computer Science and Engineering',
  'Cyber Forensics and Information Security',
  'Electrical and Electronics Engineering',
  'Electronics and Communication Engineering',
  'Electronics Engineering',
  'Information Technology',
  'Instrumentation Engineering',
  'Mechanical Engineering',
  'Polymer Technology',
  'Printing Technology',
  'Robotic Process Automation',
  'Textile Technology',
  'Tool and Die Engineering',
  'Wood and Paper Technology',
];

// Standardized Short Names for Branches (for exports and posters)
// Format: 2-4 letters (excluding brackets for Hearing Impaired variants)
const RAW_BRANCH_SHORT_NAMES = {
  'Architecture': 'AR',
  'Automobile Engineering': 'AE',
  'Biomedical Engineering': 'BME',
  'Chemical Engineering': 'CHEM',
  'Civil Engineering': 'CE',
  'Civil Engineering (Hearing Impaired)': 'CE(HI)',
  'Commercial Practice': 'CP',
  'Computer Application and Business Management': 'CABM',
  'Computer Application & Business Management': 'CABM',  // Alternative format used in database
  'Computer Applications': 'CA',
  'Computer Engineering': 'COE',
  'Computer Engineering (Hearing Impaired)': 'COE(HI)',
  'Computer Hardware Engineering': 'CHE',
  'Computer Science and Engineering': 'CSE',
  'Cyber Forensics and Information Security': 'CFIS',
  'Electrical and Electronics Engineering': 'EEE',
  'Electrical & Electronics Engineering': 'EEE',  // Alternative format used in database
  'Electronics and Communication Engineering': 'ECE',
  'Electronics & Communication Engineering': 'ECE',  // Alternative format used in database
  'Electronics Engineering': 'ELE',
  'Information Technology': 'IT',
  'Instrumentation Engineering': 'INE',
  'Mechanical Engineering': 'ME',
  'Polymer Technology': 'POLY',
  'Printing Technology': 'PRT',
  'Robotic Process Automation': 'RPA',
  'Textile Technology': 'TEX',
  'Tool and Die Engineering': 'TDE',
  'Tool & Die Engineering': 'TDE',  // Alternative format used in database
  'Wood and Paper Technology': 'WPT',
};

/*
 * Looking a branch up by whatever spelling it was stored under.
 *
 * Every call site reads this object directly — BRANCH_SHORT_NAMES[student.branch]
 * — and the keys are exact strings, so a student registered as "Bio-Medical
 * Engineering" fell through to the full name while everyone around them showed
 * a code. The map had already started collecting hand-added variants ("Tool &
 * Die Engineering", marked "alternative format used in database"), which is the
 * same problem being solved one spelling at a time.
 *
 * The object below answers exact keys exactly as it always did; only a key it
 * does not hold is retried on letters and digits alone. Nothing that worked
 * before changes, and no call site needs to know.
 */
const BRANCH_KEY = (b) =>
  String(b ?? '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');

const SHORT_BY_KEY = new Map(
  Object.entries(RAW_BRANCH_SHORT_NAMES).map(([full, short]) => [BRANCH_KEY(full), short])
);

export const BRANCH_SHORT_NAMES = new Proxy(RAW_BRANCH_SHORT_NAMES, {
  get(target, prop, receiver) {
    if (typeof prop === 'string' && !Object.prototype.hasOwnProperty.call(target, prop)) {
      const viaKey = SHORT_BY_KEY.get(BRANCH_KEY(prop));
      if (viaKey !== undefined) return viaKey;
    }
    return Reflect.get(target, prop, receiver);
  },
});


// Helper function to get short name for a branch
export const getBranchShortName = (branchName) => {
  return BRANCH_SHORT_NAMES[branchName] || branchName;
};

// Helper function to get full name from short name
export const getBranchFullName = (shortName) => {
  const entry = Object.entries(BRANCH_SHORT_NAMES).find(([_, short]) => short === shortName);
  return entry ? entry[0] : shortName;
};

export default KERALA_POLYTECHNIC_BRANCHES;
