/**
 * Who counts as a currently-registered student.
 *
 * Three places answer "how many students are there" — the Super Admin
 * dashboard, the officer's dashboard, and the consolidated count export — and
 * they answered it three different ways. The dashboards counted every student
 * whose login row was flagged active, whatever their registration status, which
 * meant a rejected registration was counted as a student: somebody the officer
 * had explicitly turned away, sitting in a statewide "Total Students" figure
 * that gets quoted in reports. On production that was 67 people and growing,
 * since nothing ever removes them.
 *
 * It also had the reverse problem. An approved student whose account is
 * switched off — by a disabled PRN range, say — dropped out of the count
 * entirely, even though they are plainly still a student of that college.
 *
 * Approved and pending, not archived. Registration status is the fact being
 * asked about; the login flag is a separate matter and was never the right
 * proxy for it. Rejected registrations are not students, and students archived
 * by a year-end reset have passed out, so counting last year's intake in this
 * year's roll overstates every college.
 *
 * A useful consequence: Total now equals Approved plus Pending on both
 * dashboards. It did not before — the total included rejections while the two
 * tiles beside it did not — which is why the discrepancy went unnoticed.
 *
 * @param {string} alias the students table alias in the caller's query
 */
export const REGISTERED_STUDENT_SQL = (alias = 's') => `
  ${alias}.registration_status IN ('approved', 'pending')
  AND ${alias}.archived_academic_year IS NULL
`;

export default REGISTERED_STUDENT_SQL;
