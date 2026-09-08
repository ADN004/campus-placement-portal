/**
 * What each export can actually offer, and what it shows when nothing is asked.
 *
 * A list is only as wide as the query behind it. Offering a column the server
 * never selected would hand the reader a blank one, which is worse than not
 * offering it at all — an empty cell reads as missing data rather than as a
 * column nobody asked for. So each export carries its own set, mirroring the
 * SELECT that feeds it.
 *
 * The keys are the server's field ids. The applicants chooser is the exception:
 * it keeps the PDF generator's older spellings (`mobile`, `cgpa`, `dob`) and
 * the server translates them, because renaming them there would change what
 * `pdf_fields` means for every existing caller.
 */

/** Students in a PRN range — both roles run the same query. */
export const PRN_RANGE_FIELD_OPTIONS = [
  { key: 'prn', label: 'PRN' },
  { key: 'student_name', label: 'Student Name' },
  { key: 'email', label: 'Email' },
  { key: 'mobile_number', label: 'Mobile' },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'age', label: 'Age' },
  { key: 'gender', label: 'Gender' },
  { key: 'college_name', label: 'College' },
  { key: 'region_name', label: 'Region' },
  { key: 'branch', label: 'Branch' },
  { key: 'programme_cgpa', label: 'CGPA' },
  { key: 'backlog_count', label: 'Backlogs' },
  { key: 'created_at', label: 'Registered On' },
];

/** The columns that sheet prints when nobody chooses. */
export const PRN_RANGE_DEFAULT_FIELDS = PRN_RANGE_FIELD_OPTIONS.map((f) => f.key);

/**
 * Eligible students who have not applied.
 *
 * Wider than the six columns the sheet prints by default: this is the list an
 * officer uses to chase people, and it carried no way to reach any of them.
 * Contact details are selectable now, but stay off by default so the file an
 * officer downloads today is unchanged.
 */
export const NOT_APPLIED_FIELD_OPTIONS = [
  { key: 'prn', label: 'PRN' },
  { key: 'student_name', label: 'Student Name' },
  { key: 'college_name', label: 'College' },
  { key: 'region_name', label: 'Region' },
  { key: 'branch', label: 'Branch' },
  { key: 'programme_cgpa', label: 'CGPA' },
  { key: 'email', label: 'Email' },
  { key: 'mobile_number', label: 'Mobile' },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'gender', label: 'Gender' },
  { key: 'backlog_count', label: 'Backlogs' },
  { key: 'height_cm', label: 'Height (cm)' },
  { key: 'weight_kg', label: 'Weight (kg)' },
];

/** The six this sheet has always printed. */
export const NOT_APPLIED_DEFAULT_FIELDS = [
  'prn', 'student_name', 'college_name', 'region_name', 'branch', 'programme_cgpa',
];
