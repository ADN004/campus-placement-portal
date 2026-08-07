import JobRequestBody from './JobRequestBody';

/**
 * Mobile presenter. The page's shape is identical across devices; only the
 * stat-block columns and whether the requests are a table or a ruled list
 * change, so both live in JobRequestBody behind a `layout` prop.
 */
export default function MobileCreateJobRequest(props) {
  return <JobRequestBody layout="mobile" {...props} />;
}
