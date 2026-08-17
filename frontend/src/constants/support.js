/**
 * Where a student goes when the portal itself is the problem.
 *
 * Verification links and password resets both depend on email, and there is no
 * staff-side password reset for students — an officer cannot do it, only the
 * forgot-password flow can. So when mail is not arriving, a student is not
 * merely inconvenienced, they are locked out with nothing else to try. This is
 * the human channel for exactly that.
 *
 * One definition for every screen that offers it. Three copies of a URL is
 * three places to miss when it changes.
 */

export const SUPPORT_LINKEDIN_URL = 'https://www.linkedin.com/in/adityan-nair';

export const SUPPORT_LINKEDIN_NAME = 'Adityan Nair';
