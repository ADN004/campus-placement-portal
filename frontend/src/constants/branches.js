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
export const BRANCH_SHORT_NAMES = {
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
