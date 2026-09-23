import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { placementOfficerAPI, commonAPI } from '../../services/api';
import toast from 'react-hot-toast';
import StudentDetailModal from '../../components/StudentDetailModal';
import DriveScheduleModal from '../../components/DriveScheduleModal';
import PlacementDetailsForm from '../../components/PlacementDetailsForm';
import PDFFieldSelector from '../../components/PDFFieldSelector';
import { NOT_APPLIED_FIELD_OPTIONS, NOT_APPLIED_DEFAULT_FIELDS } from '../../components/exportFieldOptions';
import ManualStudentAdditionModal from '../../components/ManualStudentAdditionModal';
import { RoundClosureWarning, RevertDialog } from '../../components/RoundClosure';
import AutoRefreshIndicator from '../../components/AutoRefreshIndicator';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import useSkeletonLoading from '../../hooks/useSkeletonLoading';
import useDeviceType from '../../hooks/useDeviceType';
import DesktopJobEligibleStudents from './jobEligible/DesktopJobEligibleStudents';
import TabletJobEligibleStudents from './jobEligible/TabletJobEligibleStudents';
import MobileJobEligibleStudents from './jobEligible/MobileJobEligibleStudents';
import {
  ExportOptionsModal,
  CollegePickerModal,
  EditJobModal,
  ConfirmRemoveJobModal,
  ConfirmRemoveApplicantModal,
} from './jobEligible/JobEligibleModals';
import {
  DesktopJobEligibleSkeleton,
  TabletJobEligibleSkeleton,
  MobileJobEligibleSkeleton,
} from './jobEligible/JobEligibleSkeleton';
import { barredReason } from './jobEligible/jobEligibleShared';
import { utcToLocalInput, localInputToUtc } from '../../utils/deadline';
import { compareStudents } from '../../utils/studentOrder';
import {
  exportFilterPayload, exportFilterParams, describeExportFilters,
} from '../../utils/exportFilters';

/*
 * A drive whose students have already been told, changed since.
 *
 * Not sent automatically: adding a venue can mean hundreds of emails, and an
 * officer part-way through entering five of them would fire that off four
 * times over. Offered instead, right after the save, because the alternative
 * is an officer who never realises the people already told are holding a
 * message that no longer matches the venues.
 */
const offerRenotify = (venueCount, notify) => {
  toast((t) => (
    <span className="text-spc-sm text-spc-ink">
      Students were already told about this drive.
      {venueCount > 1 ? ` It now has ${venueCount} venues.` : ''}
      {' Send them the update?'}
      <button
        type="button"
        onClick={() => { toast.dismiss(t.id); notify(); }}
        className="ml-3 font-bold underline underline-offset-2"
      >
        Notify students
      </button>
    </span>
  ), { duration: 12000 });
};

export default function JobApplicants() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobResolved, setJobResolved] = useState(false);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [isHost, setIsHost] = useState(false);
  // The selected job's own custom questions, which arrive with its applicants.
  const [jobCustomFields, setJobCustomFields] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Enhanced Features State
  const [selectedStudents, setSelectedStudents] = useState([]);
  /*
   * Closing a round: the countdown, the warning shown before a marking starts
   * one, and the undo for the marking just made. `pendingMarking` holds the
   * click while the warning is open, so the dialog confirms a decision already
   * expressed rather than asking for it again.
   */
  const [roundClosures, setRoundClosures] = useState([]);
  const [outstandingColleges, setOutstandingColleges] = useState([]);
  const [graceDays, setGraceDays] = useState(5);
  /*
   * Which colleges the host is looking at. The page opens on their own, and
   * these widen it: `scopeColleges` for a picked few, `viewAllColleges` for the lot.
   * Both are ignored for a non-host, who only ever gets their own college.
   */
  const [ownCollegeId, setOwnCollegeId] = useState(null);
  const [collegeOptions, setCollegeOptions] = useState([]);
  const [scopeColleges, setScopeColleges] = useState([]);
  const [viewAllColleges, setViewAllColleges] = useState(false);
  const [viewing, setViewing] = useState('own');
  const [pendingMarking, setPendingMarking] = useState(null);
  const [closureBusy, setClosureBusy] = useState(false);
  const [lastBatch, setLastBatch] = useState(null);
  // Open while the host is putting a batch of students back to an earlier
  // stage. Host only -- an officer whose college was merely included on this
  // job has Undo for their own click and nothing beyond it.
  const [reverting, setReverting] = useState(false);
  const [showStudentDetail, setShowStudentDetail] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveData, setDriveData] = useState(null);
  /*
   * Every venue, and whether the students already told are now holding a
   * message that no longer matches. `driveData` stays the earliest venue,
   * which is what the screens showing a single drive read.
   */
  const [driveSlots, setDriveSlots] = useState([]);
  const [driveNeedsRenotify, setDriveNeedsRenotify] = useState(false);
  const [placementStats, setPlacementStats] = useState(null);
  const [showEnhancedFilters, setShowEnhancedFilters] = useState(false);
  const [enhancedFilters, setEnhancedFilters] = useState({
    applicationStatuses: [],
    sslcMin: '',
    twelfthMin: '',
    district: '',
    hasPassport: null,
    hasAadhar: null,
    hasDrivingLicense: null,
    hasPan: null,
    heightMin: '',
    weightMin: '',
    physicallyHandicapped: null,
  });
  const [showPlacementForm, setShowPlacementForm] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showPDFFieldSelector, setShowPDFFieldSelector] = useState(false);
  /*
   * Which format the field chooser is standing in front of. One dialog serves
   * both: the columns a reader wants are the same question whether the answer
   * is printed or opened in Excel.
   */
  const [fieldPickerFormat, setFieldPickerFormat] = useState('pdf');
  /*
   * Which list the chooser is standing in front of. The applicants sheet and
   * the not-applied sheet come from different queries, so they can offer
   * different columns, and the dialog has to be told which set to show.
   */
  const [fieldPickerTarget, setFieldPickerTarget] = useState('applicants');
  const [pdfExportType, setPdfExportType] = useState('basic'); // 'basic' or 'enhanced'
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [includePlacedInExport, setIncludePlacedInExport] = useState(false);

  // Edit Job modal state (host POs only)
  const [showEditJobModal, setShowEditJobModal] = useState(false);
  const [confirmRemoveJob, setConfirmRemoveJob] = useState(false);
  const [removingJob, setRemovingJob] = useState(false);
  const [removingApplicant, setRemovingApplicant] = useState(null);
  const [removingApplicantBusy, setRemovingApplicantBusy] = useState(false);
  const [editJobData, setEditJobData] = useState({});
  const [editJobLoading, setEditJobLoading] = useState(false);
  const [lockedBranches, setLockedBranches] = useState([]);

  // College selection for host-job export
  const [allColleges, setAllColleges] = useState([]);
  const [exportCollegeIds, setExportCollegeIds] = useState([]);
  const [showCollegeModal, setShowCollegeModal] = useState(false);

  // Advanced Filters (legacy)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    cgpaMin: '',
    cgpaMax: '',
    maxBacklogs: '',
    dobFrom: '',
    dobTo: '',
  });

  useEffect(() => {
    fetchJobs();
    commonAPI.getColleges().then((res) => setAllColleges(res.data.data || [])).catch(() => {});
  }, []);

  // The job is identified by the URL, so a bookmark or a refresh lands on the
  // same drive.
  //
  // `jobResolved` is tracked explicitly rather than inferring "missing" from a
  // null selectedJob. Effects run after the commit, so for one render after the
  // list arrives selectedJob is still null while the job is perfectly valid —
  // inferring it would flash "no longer available" at someone whose job is
  // fine. Nothing but the skeleton's timing would have hidden that, and timing
  // is not a guarantee.
  useEffect(() => {
    if (loading) return;
    const match = jobs.find((job) => String(job.id) === String(jobId)) || null;
    setSelectedJob(match);
    setJobResolved(true);
  }, [jobs, jobId, loading]);

  useEffect(() => {
    if (selectedJob) {
      setStudents([]);
      fetchJobApplicants();
      fetchDriveSchedule();
      fetchPlacementStats();
      fetchRoundClosures();
    }
  }, [selectedJob]);

  // The host widening or narrowing which colleges they are looking at. Separate
  // from the effect above so changing the scope refetches the list without
  // pulling the drive and the statistics down with it.
  useEffect(() => {
    if (selectedJob && isHost) fetchJobApplicants();
  }, [scopeColleges, viewAllColleges]);

  useEffect(() => {
    if (selectedJob && students.length > 0) {
      filterEligibleStudents();
    }
  }, [students, advancedFilters, enhancedFilters]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await placementOfficerAPI.getJobs();
      const activeJobs = response.data.data.filter((job) => job.is_active);
      setJobs(activeJobs);
    } catch (error) {
      toast.error('Failed to load jobs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Whichever colleges the host has asked to see.
   *
   * The page opens on their own college, so this is empty and `viewAllColleges` is
   * false until they open the picker. A non-host never sends either — the
   * server scopes them to their own college regardless.
   */
  const applicantScopeParams = () => {
    if (!isHost) return undefined;
    if (viewAllColleges) return { all_colleges: true };
    if (scopeColleges.length > 0) return { college_ids: scopeColleges.join(',') };
    return undefined;
  };

  const absorbApplicants = (payload) => {
    setStudents(payload.data || []);
    setIsHost(payload.is_host || false);
    setOwnCollegeId(payload.own_college_id ?? null);
    setCollegeOptions(payload.college_options || []);
    setViewing(payload.viewing || 'own');
    setJobCustomFields(payload.custom_fields || []);
  };

  const fetchJobApplicants = async () => {
    try {
      setLoadingStudents(true);
      const response = await placementOfficerAPI.getJobApplicants(
        selectedJob.id, applicantScopeParams()
      );
      absorbApplicants(response.data);
    } catch (error) {
      toast.error('Failed to load job applicants');
      console.error('Failed to load applicants:', error);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchDriveSchedule = async () => {
    try {
      const response = await placementOfficerAPI.getJobDrive(selectedJob.id);
      setDriveData(response.data.data);
      setDriveSlots(response.data.slots || []);
      setDriveNeedsRenotify(response.data.needsRenotify === true);
    } catch (error) {
      console.error('Failed to fetch drive schedule:', error);
      setDriveData(null);
      setDriveSlots([]);
      setDriveNeedsRenotify(false);
    }
  };

  const fetchPlacementStats = async () => {
    try {
      const response = await placementOfficerAPI.getJobPlacementStats(selectedJob.id);
      setPlacementStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch placement stats:', error);
      setPlacementStats(null);
    }
  };

  // Silent refresh for auto-refresh (no loading spinners / toasts)
  const silentRefresh = useCallback(async () => {
    if (!selectedJob) return;
    try {
      const [applicantsRes, statsRes] = await Promise.all([
        placementOfficerAPI.getJobApplicants(selectedJob.id, applicantScopeParams()),
        placementOfficerAPI.getJobPlacementStats(selectedJob.id),
      ]);
      absorbApplicants(applicantsRes.data);
      setPlacementStats(statsRes.data.data);
    } catch (e) {
      // Silently fail on auto-refresh
    }
  }, [selectedJob]);

  const { lastRefreshed, autoRefreshEnabled, toggleAutoRefresh, manualRefresh, refreshing } =
    useAutoRefresh(silentRefresh, 300000, true); // 5 min

  const showSkeleton = useSkeletonLoading(loading);

  const filterEligibleStudents = () => {
    if (jobResolved && !selectedJob) {
      setFilteredStudents([]);
      return;
    }

    let filtered = [...students];

    // Apply legacy advanced filters
    if (advancedFilters.cgpaMin) {
      const minCGPA = parseFloat(advancedFilters.cgpaMin);
      filtered = filtered.filter((s) => parseFloat(s.cgpa) >= minCGPA);
    }

    if (advancedFilters.cgpaMax) {
      const maxCGPA = parseFloat(advancedFilters.cgpaMax);
      filtered = filtered.filter((s) => parseFloat(s.cgpa) <= maxCGPA);
    }

    if (advancedFilters.maxBacklogs !== '') {
      const maxBacklogs = parseInt(advancedFilters.maxBacklogs);
      filtered = filtered.filter((s) => parseInt(s.backlog_count || 0) <= maxBacklogs);
    }

    if (advancedFilters.dobFrom) {
      filtered = filtered.filter(
        (s) => s.date_of_birth && new Date(s.date_of_birth) >= new Date(advancedFilters.dobFrom)
      );
    }

    if (advancedFilters.dobTo) {
      filtered = filtered.filter(
        (s) => s.date_of_birth && new Date(s.date_of_birth) <= new Date(advancedFilters.dobTo)
      );
    }

    // Apply enhanced filters
    if (enhancedFilters.applicationStatuses.length > 0) {
      filtered = filtered.filter((s) => enhancedFilters.applicationStatuses.includes(s.application_status));
    }

    if (enhancedFilters.sslcMin) {
      const sslcMin = parseFloat(enhancedFilters.sslcMin);
      filtered = filtered.filter((s) => parseFloat(s.sslc_marks || 0) >= sslcMin);
    }

    if (enhancedFilters.twelfthMin) {
      const twelfthMin = parseFloat(enhancedFilters.twelfthMin);
      filtered = filtered.filter((s) => parseFloat(s.twelfth_marks || 0) >= twelfthMin);
    }

    if (enhancedFilters.district) {
      filtered = filtered.filter((s) => s.district === enhancedFilters.district);
    }

    if (enhancedFilters.hasPassport !== null) {
      filtered = filtered.filter((s) => s.has_passport === enhancedFilters.hasPassport);
    }

    if (enhancedFilters.hasAadhar !== null) {
      filtered = filtered.filter((s) => s.has_aadhar_card === enhancedFilters.hasAadhar);
    }

    if (enhancedFilters.hasDrivingLicense !== null) {
      filtered = filtered.filter((s) => s.has_driving_license === enhancedFilters.hasDrivingLicense);
    }

    if (enhancedFilters.hasPan !== null) {
      filtered = filtered.filter((s) => s.has_pan_card === enhancedFilters.hasPan);
    }

    if (enhancedFilters.heightMin) {
      const heightMin = parseFloat(enhancedFilters.heightMin);
      filtered = filtered.filter((s) => parseFloat(s.height_cm || 0) >= heightMin);
    }

    if (enhancedFilters.weightMin) {
      const weightMin = parseFloat(enhancedFilters.weightMin);
      filtered = filtered.filter((s) => parseFloat(s.weight_kg || 0) >= weightMin);
    }

    if (enhancedFilters.physicallyHandicapped !== null) {
      filtered = filtered.filter((s) => s.physically_handicapped === enhancedFilters.physicallyHandicapped);
    }

    /*
     * The same order the server returns, so filtering does not re-order the
     * list under the reader. Shared rather than repeated: this comparison also
     * folds the two spellings of a branch together, which a plain compare on
     * the branch text does not.
     */
    filtered.sort((a, b) => compareStudents(a, b, { byCollege: true }));

    setFilteredStudents(filtered);
  };

  const handleAdvancedFilterChange = (field, value) => {
    setAdvancedFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      cgpaMin: '',
      cgpaMax: '',
      maxBacklogs: '',
      dobFrom: '',
      dobTo: '',
    });
  };

  const hasActiveFilters = () => {
    return Object.values(advancedFilters).some((value) => value !== '');
  };

  const handleEnhancedFiltersChange = (newFilters) => {
    setEnhancedFilters(newFilters);
  };

  const clearEnhancedFilters = () => {
    setEnhancedFilters({
      applicationStatuses: [],
      sslcMin: '',
      twelfthMin: '',
      district: '',
      hasPassport: null,
      hasAadhar: null,
      hasDrivingLicense: null,
      hasPan: null,
      heightMin: '',
      weightMin: '',
      physicallyHandicapped: null,
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Applicants who have since been blacklisted or lost their approval are
      // shown so the officer can see them, but they are not selectable one by
      // one, so "select all" must not sweep them in either.
      setSelectedStudents(
        filteredStudents.filter((s) => !barredReason(s)).map((s) => s.application_id)
      );
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (applicationId) => {
    setSelectedStudents((prev) =>
      prev.includes(applicationId)
        ? prev.filter((id) => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  const fetchRoundClosures = async () => {
    if (!selectedJob) return;
    try {
      const response = await placementOfficerAPI.getRoundClosures(selectedJob.id);
      setRoundClosures(response.data.data.cascades || []);
      setOutstandingColleges(response.data.data.outstanding_colleges || []);
      setGraceDays(response.data.data.grace_days || 5);
    } catch (error) {
      // Not worth blocking the page over: the panel simply does not appear.
      console.error('Round closure fetch failed:', error);
      setRoundClosures([]);
      setOutstandingColleges([]);
    }
  };

  /**
   * How many people this marking would leave behind.
   *
   * Counted from the list on screen, which for an officer of a joint college is
   * already only their own students — so the number they are warned about is
   * exactly the number their marking can close, and never includes somebody at
   * another college they cannot see.
   */
  const remainingAfterMarking = (status) => {
    const from = status === 'shortlisted'
      ? ['under_review', 'submitted']
      : status === 'selected' ? ['shortlisted'] : null;
    if (!from) return 0;
    return students.filter(
      (s) => from.includes(s.application_status) && !selectedStudents.includes(s.application_id)
    ).length;
  };

  const handleBulkStatusUpdate = async (status) => {
    if (selectedStudents.length === 0) {
      toast.error('No students selected');
      return;
    }

    // Shortlisting or selecting starts a countdown that rejects everyone left
    // below it, so it is confirmed first. Rejecting says nothing about anybody
    // else and applies straight away.
    const stage = status === 'shortlisted' ? 'shortlist' : status === 'selected' ? 'select' : null;
    if (stage) {
      setPendingMarking({
        status,
        stage,
        count: selectedStudents.length,
        remaining: remainingAfterMarking(status),
      });
      return;
    }

    await commitBulkStatusUpdate(status);
  };

  const commitBulkStatusUpdate = async (status) => {
    setClosureBusy(true);
    const loadingToast = toast.loading(`Updating ${selectedStudents.length} applications...`);
    try {
      const response = await placementOfficerAPI.bulkUpdateApplicationStatus({
        application_ids: selectedStudents,
        status,
      });
      toast.dismiss(loadingToast);
      const count = response.data.data?.length ?? selectedStudents.length;
      toast.success(`Updated ${count} ${count === 1 ? 'application' : 'applications'}`);
      if (response.data.batch_id) {
        setLastBatch({
          id: response.data.batch_id,
          count,
          label: status === 'under_review' ? 'Under review'
            : status.charAt(0).toUpperCase() + status.slice(1),
        });
      }
      setSelectedStudents([]);
      setPendingMarking(null);
      await fetchJobApplicants();
      await fetchPlacementStats();
      await fetchRoundClosures();
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Bulk update error:', error);
      toast.error('Failed to update applications');
    } finally {
      setClosureBusy(false);
    }
  };

  /**
   * Put the ticked students back to an earlier stage.
   *
   * The case Undo cannot reach: anything marked before this feature existed has
   * no batch id, so without this there is no way to correct it from the
   * interface at all. Goes through the ordinary bulk endpoint, which records
   * the change as a correction rather than a decision because it moves people
   * backwards.
   */
  const handleRevert = async (target) => {
    setClosureBusy(true);
    try {
      const response = await placementOfficerAPI.bulkUpdateApplicationStatus({
        application_ids: selectedStudents,
        status: target,
      });
      const count = response.data.data?.length ?? selectedStudents.length;
      toast.success(`${count} moved back to ${target === 'under_review' ? 'under review' : target}`);
      if (response.data.batch_id) {
        setLastBatch({
          id: response.data.batch_id,
          count,
          label: target === 'under_review' ? 'Under review' : 'Shortlisted',
        });
      }
      setSelectedStudents([]);
      setReverting(false);
      await fetchJobApplicants();
      await fetchPlacementStats();
      await fetchRoundClosures();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not move those students back');
    } finally {
      setClosureBusy(false);
    }
  };

  /** The stages the ticked students are at now, for the dialog to name. */
  const selectedStages = () => [...new Set(
    students
      .filter((s) => selectedStudents.includes(s.application_id))
      .map((s) => (s.application_status === 'submitted'
        ? 'under review'
        : String(s.application_status).replace(/_/g, ' ')))
  )];

  const handleUndoBatch = async () => {
    if (!lastBatch) return;
    setClosureBusy(true);
    try {
      const response = await placementOfficerAPI.undoStatusBatch(lastBatch.id);
      toast.success(response.data.message);
      setLastBatch(null);
      await fetchJobApplicants();
      await fetchPlacementStats();
      await fetchRoundClosures();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not undo that change');
    } finally {
      setClosureBusy(false);
    }
  };

  /** Extend, call off, or run one of this job's countdowns. */
  const handleClosureAction = async (action, cascade) => {
    setClosureBusy(true);
    try {
      const call = {
        extend: placementOfficerAPI.extendRoundClosure,
        cancel: placementOfficerAPI.cancelRoundClosure,
        run: placementOfficerAPI.runRoundClosure,
      }[action];
      const response = await call(cascade.id);
      toast.success(response.data.message);
      await fetchRoundClosures();
      if (action === 'run') {
        await fetchJobApplicants();
        await fetchPlacementStats();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'That did not work');
    } finally {
      setClosureBusy(false);
    }
  };

  /**
   * Which message the ticked students should get.
   *
   * Their current stage, because that is what notifying means here: tell these
   * people what has just been decided about them. A selection spanning two
   * stages has no single answer and is refused rather than guessed.
   */
  const notifyTypeForSelection = () => {
    const statuses = new Set(
      students
        .filter((s) => selectedStudents.includes(s.application_id))
        .map((s) => (s.application_status === 'submitted' ? 'under_review' : s.application_status))
    );

    if (statuses.size === 0) return { error: 'No students selected' };
    if (statuses.size > 1) {
      return {
        error: 'Those students are at different stages — select one stage at a time to notify them',
      };
    }

    const [status] = [...statuses];
    if (!['shortlisted', 'selected', 'rejected'].includes(status)) {
      return { error: 'There is nothing to tell students who are still under review' };
    }
    return { type: status };
  };

  const handleNotifyStudents = async (notificationType) => {
    // Called with no argument from the bulk bar: the type comes from the
    // selection, and only the ticked students are told.
    let selectionOnly = false;
    if (typeof notificationType !== 'string') {
      const derived = notifyTypeForSelection();
      if (derived.error) {
        toast.error(derived.error);
        return;
      }
      notificationType = derived.type;
      selectionOnly = true;
    }

    if (!driveData && notificationType === 'drive_scheduled') {
      toast.error('Please schedule a drive first');
      return;
    }

    let applicationsToNotify = [];

    if (selectionOnly) {
      applicationsToNotify = selectedStudents;
    } else if (notificationType === 'drive_scheduled') {
      applicationsToNotify = filteredStudents.map((s) => s.application_id);
    } else if (notificationType === 'shortlisted' || notificationType === 'rejected' || notificationType === 'selected') {
      applicationsToNotify = filteredStudents
        .filter((s) => s.application_status === notificationType)
        .map((s) => s.application_id);
    }

    if (applicationsToNotify.length === 0) {
      toast.error(`No students to notify for ${notificationType}`);
      return;
    }

    try {
      const loadingToast = toast.loading(`Sending notifications to ${applicationsToNotify.length} students...`);
      await placementOfficerAPI.notifyApplicationStatus({
        application_ids: applicationsToNotify,
        notification_type: notificationType,
      });
      toast.dismiss(loadingToast);
      toast.success(`Sent ${applicationsToNotify.length} notifications`);
    } catch (error) {
      console.error('Notification error:', error);
      toast.error('Failed to send notifications');
    }
  };

  const handleUpdatePlacement = async (applicationId, placementData) => {
    try {
      await placementOfficerAPI.updatePlacementDetails(applicationId, placementData);
      toast.success('Placement details updated');
      setShowPlacementForm(false);
      setSelectedApplication(null);
      await fetchJobApplicants();
      await fetchPlacementStats();
    } catch (error) {
      console.error('Update placement error:', error);
      toast.error('Failed to update placement details');
    }
  };

  /*
   * The undo for a manual addition. Only offered on rows the officer typed in
   * themselves — a student's own application has no Remove button and the
   * server refuses it regardless.
   */
  const handleRemoveApplicant = async () => {
    if (!removingApplicant) return;
    try {
      setRemovingApplicantBusy(true);
      await placementOfficerAPI.removeManualApplicant(
        selectedJob.id,
        removingApplicant.application_id
      );
      toast.success(`${removingApplicant.name || removingApplicant.prn} removed from this job`);
      setRemovingApplicant(null);
      await fetchJobApplicants();
      await fetchPlacementStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove applicant');
    } finally {
      setRemovingApplicantBusy(false);
    }
  };

  const handleDriveSubmit = async (driveFormData) => {
    try {
      const response = await placementOfficerAPI.createOrUpdateJobDrive(selectedJob.id, driveFormData);
      const saved = response.data.slots || [];
      toast.success(saved.length > 1
        ? `Drive saved at ${saved.length} venues`
        : (driveData ? 'Drive updated successfully' : 'Drive scheduled successfully'));
      setShowDriveModal(false);
      await fetchDriveSchedule();
      if (response.data.needsRenotify) {
        offerRenotify(saved.length, () => handleNotifyStudents('drive_scheduled'));
      }
    } catch (error) {
      console.error('Drive submit error:', error);
      toast.error('Failed to save drive schedule');
    }
  };

  /*
   * Eligibility is only sent while the job has no applicants.
   *
   * The dialog holds the whole job, so every save used to post min_cgpa,
   * max_backlogs, the backlog semesters and the branches back whether or not
   * they had been touched. The server refuses those once anyone has applied,
   * which would have turned a title correction into "cannot be changed" on any
   * job with a single applicant. Leaving them out means the officer edits what
   * they are allowed to edit and the guard never fires on a change they did not
   * make.
   */
  const handleEditJobSave = async () => {
    const payload = { ...editJobData };
    // Converted on the way out, so the deadline means the same moment
    // whatever zone the server reading it happens to be in.
    payload.application_deadline = localInputToUtc(editJobData.application_deadline);
    /*
     * The whole form is sent, including eligibility.
     *
     * The server compares each value against what is stored and refuses only a
     * real tightening, so an unchanged field is no longer a problem and a rule
     * the company has agreed to relax can actually be relaxed. Deleting fields
     * here used to be what made either of those work.
     */

    try {
      setEditJobLoading(true);
      await placementOfficerAPI.updateJob(selectedJob.id, payload);
      toast.success('Job updated successfully');
      setShowEditJobModal(false);
      // Refresh jobs list and update selectedJob
      const response = await placementOfficerAPI.getJobs();
      const activeJobs = response.data.data.filter((job) => job.is_active);
      setJobs(activeJobs);
      const updated = activeJobs.find((j) => j.id === selectedJob.id);
      if (updated) setSelectedJob(updated);
    } catch (error) {
      console.error('Edit job error:', error);
      toast.error(error.response?.data?.message || 'Failed to update job');
    } finally {
      setEditJobLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (filteredStudents.length === 0) {
      toast.error('No applicants to export');
      return;
    }

    try {
      setExporting(true);
      setShowExportModal(false);

      const loadingToast = toast.loading(`Preparing ${format === 'pdf' ? 'PDF' : 'Excel'} export...`);

      /*
       * Whatever the officer has narrowed the list to.
       *
       * This handler is what the dialog's Basic Excel and Basic PDF buttons
       * call, and it sent no filters at all -- so an officer who filtered to
       * Shortlisted and pressed Basic got every applicant on the job, while the
       * Enhanced buttons beside it correctly returned the filtered set. Two
       * buttons in one dialog disagreeing about what "export" means is worse
       * than neither of them filtering.
       */
      const filters = exportFilterPayload(advancedFilters, enhancedFilters);

      // Host POs with college selection use enhanced export to support college_ids
      const useEnhanced = isHost && exportCollegeIds.length > 0;
      const response = useEnhanced
        ? await placementOfficerAPI.enhancedExportJobApplicants(selectedJob.id, {
            format,
            college_ids: exportCollegeIds,
            exclude_already_placed: !includePlacedInExport,
            ...filters,
          })
        : await placementOfficerAPI.exportJobApplicants(
          selectedJob.id, format, !includePlacedInExport,
          exportFilterParams(advancedFilters, enhancedFilters),
        );

      const mimeType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const fileExt = format === 'pdf' ? 'pdf' : 'xlsx';

      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `job_applicants_${selectedJob.job_title.replace(/\s+/g, '_')}_${
        new Date().toISOString().split('T')[0]
      }.${fileExt}`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success(`Exported ${filteredStudents.length} applicants as ${format === 'pdf' ? 'PDF' : 'Excel'}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export as ${format === 'pdf' ? 'PDF' : 'Excel'}`);
    } finally {
      setExporting(false);
    }
  };

  const handleEnhancedExport = async () => {
    if (filteredStudents.length === 0) {
      toast.error('No applicants to export');
      return;
    }

    setPdfExportType('enhanced');
    setFieldPickerFormat('pdf');
    setFieldPickerTarget('applicants');
    setShowPDFFieldSelector(true);
    setShowExportModal(false);
  };

  /*
   * The spreadsheet, with only the columns asked for. Beside the basic Excel
   * export rather than replacing it: that one is a single click for the whole
   * sheet, which is what most exports want.
   */
  const handleEnhancedExcelExport = async () => {
    if (filteredStudents.length === 0) {
      toast.error('No applicants to export');
      return;
    }
    setPdfExportType('enhanced');
    setFieldPickerFormat('excel');
    setFieldPickerTarget('applicants');
    setShowPDFFieldSelector(true);
    setShowExportModal(false);
  };

  /* The not-applied list, with the columns an officer actually needs to chase. */
  const handleNotAppliedWithFields = () => {
    setFieldPickerFormat('excel');
    setFieldPickerTarget('not-applied');
    setShowPDFFieldSelector(true);
    setShowExportModal(false);
  };

  const handleExportWithFields = async ({ fields: selectedFields, includeSignature, headerLine1, headerLine2 }) => {
    // A different list entirely, and its own endpoint.
    if (fieldPickerTarget === 'not-applied') {
      setShowPDFFieldSelector(false);
      return handleExportEligibleNotApplied('excel', selectedFields);
    }
    const asExcel = fieldPickerFormat === 'excel';
    try {
      setExporting(true);
      setShowPDFFieldSelector(false);
      const loadingToast = toast.loading(`Preparing ${asExcel ? 'Excel' : 'PDF'} export...`);

      const exportData = {
        format: asExcel ? 'excel' : 'pdf',
        // The same chosen list, under the name the format reads it by. The
        // server translates the picker's PDF-shaped keys for the sheet.
        ...(asExcel ? { excel_fields: selectedFields } : { pdf_fields: selectedFields }),
        include_signature: includeSignature || false,
        header_line1: headerLine1 || '',
        header_line2: headerLine2 || null,
        exclude_already_placed: !includePlacedInExport,
        college_ids: isHost && exportCollegeIds.length > 0 ? exportCollegeIds : [],
      };

      /*
       * Every filter on screen, whichever export this is.
       *
       * These used to be attached only on the "enhanced" branch, so an officer
       * who narrowed the list to Shortlisted and then chose the ordinary export
       * got every applicant on the job back — in a file that looked exactly
       * like a filtered one, and that goes to a company. The CGPA, backlog and
       * date-of-birth filters reached no export at all.
       */
      Object.assign(exportData, exportFilterPayload(advancedFilters, enhancedFilters));

      if (pdfExportType === 'selected_only') {
        // A deliberate choice of list rather than a filter, so it overrides
        // whatever stage filter happens to be set.
        Object.assign(exportData, { application_statuses: ['selected'] });
      }

      const response = (pdfExportType === 'enhanced' || pdfExportType === 'selected_only')
        ? await placementOfficerAPI.enhancedExportJobApplicants(selectedJob.id, exportData)
        : await placementOfficerAPI.exportJobApplicants(
          selectedJob.id, asExcel ? 'excel' : 'pdf', !includePlacedInExport,
          exportFilterParams(advancedFilters, enhancedFilters),
        );

      const blob = new Blob([response.data], {
        type: asExcel
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `job_applicants_${pdfExportType}_${selectedJob.job_title.replace(/\s+/g, '_')}_${
        new Date().toISOString().split('T')[0]
      }.${asExcel ? 'xlsx' : 'pdf'}`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success(`Exported ${filteredStudents.length} applicants as ${asExcel ? 'Excel' : 'PDF'}`);
    } catch (error) {
      console.error('Field-selected export error:', error);
      toast.error(`Failed to export as ${asExcel ? 'Excel' : 'PDF'}`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportEligibleNotApplied = async (format = 'pdf', fields) => {
    if (!selectedJob) {
      toast.error('Please select a job first');
      return;
    }
    try {
      setExporting(true);
      setShowExportModal(false);
      const isExcel = format === 'excel';
      const loadingToast = toast.loading(
        `Preparing ${isExcel ? 'Excel' : 'PDF'} export of not-applied students...`
      );
      const response = await placementOfficerAPI.exportEligibleNotApplied(selectedJob.id, format, fields);
      const blob = new Blob([response.data], {
        type: isExcel
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `eligible_not_applied_${selectedJob.job_title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${isExcel ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss(loadingToast);
      toast.success('Exported eligible-not-applied students');
    } catch (error) {
      console.error('Eligible-not-applied export error:', error);
      if (error.response?.status === 404) {
        toast.error('No eligible students who have not applied yet');
      } else {
        toast.error('Failed to export eligible-not-applied students');
      }
    } finally {
      setExporting(false);
    }
  };

  const deviceType = useDeviceType();

  if (showSkeleton || !jobResolved) {
    if (deviceType === 'mobile') return <MobileJobEligibleSkeleton />;
    if (deviceType === 'tablet') return <TabletJobEligibleSkeleton />;
    return <DesktopJobEligibleSkeleton />;
  }

  if (!selectedJob) {
    return (
      <div>
        <Link
          to="/placement-officer/job-eligible-students"
          className="inline-flex items-center gap-1.5 min-h-[44px] text-spc-xs font-bold
            text-spc-accent hover:underline underline-offset-4"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          <span>All jobs</span>
        </Link>
        <div className="mt-4 bg-spc-surface border border-spc-line-strong rounded-spc-panel px-4 py-12 text-center">
          <p className="text-spc-sm font-bold text-spc-ink">This job is no longer available.</p>
          <p className="text-spc-xs text-spc-muted mt-1">
            It may have closed, been deleted, or belong to another college. Pick a drive from the
            list to carry on.
          </p>
        </div>
      </div>
    );
  }

  const currentApplicants = filteredStudents.filter((s) => !s.is_already_placed);
  const selectedSummary = filteredStudents.filter((s) => s.application_status === 'selected');

  // Same rule as before: with every ticked application already `selected`,
  // there is nothing left for the bulk buttons to apply.
  const selectedRows = filteredStudents.filter((s) => selectedStudents.includes(s.application_id));
  const allSelectedAreSelected =
    selectedRows.length > 0 && selectedRows.every((s) => s.application_status === 'selected');

  const hasEnhancedFilters =
    enhancedFilters.applicationStatuses.length > 0 ||
    Boolean(enhancedFilters.sslcMin) ||
    Boolean(enhancedFilters.twelfthMin) ||
    Boolean(enhancedFilters.district) ||
    enhancedFilters.hasPassport !== null ||
    enhancedFilters.hasAadhar !== null ||
    enhancedFilters.hasDrivingLicense !== null ||
    enhancedFilters.hasPan !== null ||
    Boolean(enhancedFilters.heightMin) ||
    Boolean(enhancedFilters.weightMin) ||
    enhancedFilters.physicallyHandicapped !== null;

  const placementStatCards = placementStats
    ? [
        { label: 'Total applications', value: placementStats.total_applications || 0 },
        // "Submitted" and "Under review" were two tiles counting one state, so
        // the pair always read like a split that meant something. One tile now.
        { label: 'Under review', value: placementStats.under_review || 0 },
        { label: 'Shortlisted', value: placementStats.shortlisted || 0 },
        { label: 'Selected', value: placementStats.selected || 0 },
        { label: 'Rejected', value: placementStats.rejected || 0 },
        { label: 'Already placed', value: filteredStudents.filter((s) => s.is_already_placed).length },
      ]
    : null;

  // The colleges this drive actually targets — used by both the export dialog
  // and the college picker it opens.
  const targetCollegeIds = Array.isArray(selectedJob?.target_colleges)
    ? selectedJob.target_colleges.map(Number)
    : [];
  const jobColleges = allColleges.filter((c) => targetCollegeIds.includes(Number(c.id)));

  const handleViewStudent = (student) => {
    setSelectedStudentId(student.id);
    setSelectedApplicationId(student.application_id);
    setShowStudentDetail(true);
  };

  const handleEditPlacement = (student) => {
    setSelectedApplication({ ...student, id: student.application_id });
    setShowPlacementForm(true);
  };

  /*
   * Removing a job, in whichever of the two ways is legitimate.
   *
   * With no applicants the job is deleted — a soft delete server-side, so the
   * record survives for history while leaving every list. With applicants it is
   * unpublished instead: their applications point at this job, and deleting it
   * would cascade those away. The button offered is decided the same way, so an
   * officer is never shown an action that will be refused.
   */
  const handleDeleteJob = async () => {
    try {
      setRemovingJob(true);
      await placementOfficerAPI.deleteJob(selectedJob.id);
      toast.success('Job deleted');
      setConfirmRemoveJob(false);
      navigate('/placement-officer/job-eligible-students');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete job');
    } finally {
      setRemovingJob(false);
    }
  };

  const handleUnpublishJob = async () => {
    try {
      setRemovingJob(true);
      await placementOfficerAPI.updateJob(selectedJob.id, { is_active: false });
      toast.success('Job unpublished — students can no longer see it');
      setConfirmRemoveJob(false);
      navigate('/placement-officer/job-eligible-students');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to unpublish job');
    } finally {
      setRemovingJob(false);
    }
  };

  const handleOpenEditJob = () => {
    /*
     * The branches the job had when the dialog opened. Once anyone has applied
     * these can be added to but not removed, so their boxes stay ticked and
     * disabled. Snapshotted rather than read from editJobData, which is the
     * thing being edited — comparing against that would make every branch the
     * officer ticks immediately un-tickable.
     */
    setLockedBranches(
      Array.isArray(selectedJob.allowed_branches) ? selectedJob.allowed_branches : []
    );
    setEditJobData({
      title: selectedJob.job_title,
      company_name: selectedJob.company_name,
      description: selectedJob.job_description,
      location: selectedJob.job_location,
      salary_package: selectedJob.salary_package || '',
      no_of_vacancies: selectedJob.no_of_vacancies || '',
      // The box holds Indian wall-clock; the API carries a UTC instant.
      application_deadline: utcToLocalInput(selectedJob.application_deadline),
      application_form_url: selectedJob.application_form_url || '',
      min_cgpa: selectedJob.min_cgpa || '',
      max_backlogs:
        selectedJob.max_backlogs !== null && selectedJob.max_backlogs !== undefined
          ? String(selectedJob.max_backlogs)
          : '',
      allowed_backlog_semesters: Array.isArray(selectedJob.allowed_backlog_semesters)
        ? selectedJob.allowed_backlog_semesters.map(Number)
        : [],
      allowed_branches: Array.isArray(selectedJob.allowed_branches)
        ? selectedJob.allowed_branches
        : [],
      // A DATE arrives as a full ISO timestamp; the picker wants YYYY-MM-DD.
      dob_on_or_before: selectedJob.dob_on_or_before
        ? String(selectedJob.dob_on_or_before).slice(0, 10)
        : '',
      dob_on_or_after: selectedJob.dob_on_or_after
        ? String(selectedJob.dob_on_or_after).slice(0, 10)
        : '',
      gender_requirement: selectedJob.gender_requirement || 'all',
    });
    setShowEditJobModal(true);
  };

  const handleOpenExport = () => {
    setShowExportModal(true);
    setShowEnhancedFilters(false);
    setShowAdvancedFilters(false);
  };

  const refreshControl = (
    <AutoRefreshIndicator
      variant="officer"
      lastRefreshed={lastRefreshed}
      autoRefreshEnabled={autoRefreshEnabled}
      onToggle={toggleAutoRefresh}
      onManualRefresh={manualRefresh}
      refreshing={refreshing}
    />
  );

  // Identical props for all three presenters — same values, same functions.
  const presenterProps = {
    job: selectedJob,
    jobs,
    selectedJob,
    isHost,
    /*
     * Whether this officer may set the drive: only the officer who posted the
     * job. A job with no officer behind it was posted by the Super Admin, and
     * its drive is arranged centrally, so no officer sees the button there.
     */
    canManageDrive: isHost,
    placementStats: placementStatCards,
    driveData,
    driveSlots,
    onScheduleDrive: () => setShowDriveModal(true),
    onNotifyDrive: () => handleNotifyStudents('drive_scheduled'),
    onEditJob: handleOpenEditJob,
    applicantCount: students.length,
    onDeleteJob: () => setConfirmRemoveJob(true),
    onRemoveApplicant: (student) => setRemovingApplicant(student),
    onUnpublishJob: () => setConfirmRemoveJob(true),
    onExport: handleOpenExport,
    exporting,
    filteredStudents,
    selectedSummary,
    loadingStudents,
    selectedStudents,
    allSelectedAreSelected,
    onBulkStatusUpdate: handleBulkStatusUpdate,
    onNotifySelected: () => handleNotifyStudents(),
    onRevert: () => {
      if (selectedStudents.length === 0) { toast.error('No students selected'); return; }
      setReverting(true);
    },
    onClearSelection: () => setSelectedStudents([]),
    ownCollegeId,
    collegeOptions,
    scopeColleges,
    viewing,
    outstandingColleges,
    // Changing what is on screen clears the ticks: the selection refers to
    // application ids that may no longer be listed, and a bulk action carrying
    // students the officer can no longer see is exactly what must not happen.
    onScopeApply: (ids) => { setSelectedStudents([]); setViewAllColleges(false); setScopeColleges(ids); },
    onScopeAll: () => { setSelectedStudents([]); setScopeColleges([]); setViewAllColleges(true); },
    onScopeOwn: () => { setSelectedStudents([]); setScopeColleges([]); setViewAllColleges(false); },
    roundClosures,
    closureBusy,
    onClosureAction: handleClosureAction,
    lastBatch,
    onUndoBatch: handleUndoBatch,
    onDismissBatch: () => setLastBatch(null),
    onSelectStudent: handleSelectStudent,
    onSelectAll: handleSelectAll,
    onViewStudent: handleViewStudent,
    onEditPlacement: handleEditPlacement,
    onManualAdd: () => setShowManualAddModal(true),
    showEnhancedFilters,
    onToggleEnhancedFilters: () => setShowEnhancedFilters(!showEnhancedFilters),
    hasEnhancedFilters,
    enhancedFilters,
    onEnhancedFiltersChange: handleEnhancedFiltersChange,
    onClearEnhancedFilters: clearEnhancedFilters,
    showAdvancedFilters,
    onToggleAdvancedFilters: () => setShowAdvancedFilters(!showAdvancedFilters),
    hasAdvancedFilters: hasActiveFilters(),
    advancedFilters,
    onAdvancedFilterChange: handleAdvancedFilterChange,
    onClearAdvancedFilters: clearAdvancedFilters,
    refreshControl,
  };

  return (
    <>
      {deviceType === 'mobile' ? (
        <MobileJobEligibleStudents {...presenterProps} />
      ) : deviceType === 'tablet' ? (
        <TabletJobEligibleStudents {...presenterProps} />
      ) : (
        <DesktopJobEligibleStudents {...presenterProps} />
      )}

      {/* Shared components — these keep their original styling until the
          dedicated officer-variant pass after all ten pages. */}
      <StudentDetailModal
        isOpen={showStudentDetail}
        onClose={() => {
          setShowStudentDetail(false);
          setSelectedStudentId(null);
          setSelectedApplicationId(null);
        }}
        studentId={selectedStudentId}
        applicationId={selectedApplicationId}
        userRole="placement-officer"
        variant="officer"
      />

      {reverting && (
        <RevertDialog
          variant="officer"
          count={selectedStudents.length}
          currentStages={selectedStages()}
          busy={closureBusy}
          onConfirm={handleRevert}
          onCancel={() => setReverting(false)}
        />
      )}

      {/* Shown before a marking that will start a countdown, so the officer
          learns what it does to everybody else while they can still act. */}
      {pendingMarking && (
        <RoundClosureWarning
          variant="officer"
          stage={pendingMarking.stage}
          count={pendingMarking.count}
          remaining={pendingMarking.remaining}
          graceDays={graceDays}
          busy={closureBusy}
          onConfirm={() => commitBulkStatusUpdate(pendingMarking.status)}
          onCancel={() => setPendingMarking(null)}
        />
      )}

      <DriveScheduleModal
        isOpen={showDriveModal}
        onClose={() => setShowDriveModal(false)}
        onSave={handleDriveSubmit}
        existingDrive={driveData}
        existingSlots={driveSlots}
        jobTitle={selectedJob?.job_title}
        variant="officer"
      />

      <PlacementDetailsForm
        isOpen={showPlacementForm}
        onClose={() => {
          setShowPlacementForm(false);
          setSelectedApplication(null);
        }}
        onSubmit={handleUpdatePlacement}
        application={selectedApplication}
        variant="officer"
      />

      {showPDFFieldSelector && (
        <PDFFieldSelector
          customFields={jobCustomFields}
          onExport={handleExportWithFields}
          format={fieldPickerFormat}
          fieldOptions={fieldPickerTarget === 'not-applied' ? NOT_APPLIED_FIELD_OPTIONS : undefined}
          defaultFields={fieldPickerTarget === 'not-applied' ? NOT_APPLIED_DEFAULT_FIELDS : undefined}
          onClose={() => setShowPDFFieldSelector(false)}
          applicantCount={
            pdfExportType === 'selected_only'
              ? filteredStudents.filter((s) => s.application_status === 'selected').length
              : filteredStudents.length
          }
          exportType={pdfExportType}
          variant="officer"
        />
      )}

      <ManualStudentAdditionModal
        isOpen={showManualAddModal}
        onClose={() => setShowManualAddModal(false)}
        job={selectedJob}
        onSuccess={() => {
          fetchJobApplicants();
          fetchPlacementStats();
        }}
        api={placementOfficerAPI}
        userRole="placement-officer"
        variant="officer"
      />

      {/* Page-local dialogs — converted. */}
      {showExportModal && !exporting && (
        <ExportOptionsModal
          isHost={isHost}
          jobCollegeCount={jobColleges.length}
          exportCollegeIds={exportCollegeIds}
          onOpenCollegePicker={() => {
            setShowCollegeModal(true);
            setShowExportModal(false);
          }}
          onExportExcel={() => handleExport('excel')}
          onExportPdf={() => handleExport('pdf')}
          onEnhancedExport={handleEnhancedExport}
          onEnhancedExcelExport={handleEnhancedExcelExport}
          onExportNotApplied={(format) => handleExportEligibleNotApplied(format)}
          onExportNotAppliedFields={handleNotAppliedWithFields}
          placedCount={filteredStudents.filter((s) => s.is_already_placed).length}
          barredCount={filteredStudents.filter((s) => barredReason(s)).length}
          filterSummary={describeExportFilters(advancedFilters, enhancedFilters)}
          shownCount={filteredStudents.length}
          totalCount={students.length}
          onClearFilters={() => { clearEnhancedFilters(); clearAdvancedFilters(); }}
          includePlaced={includePlacedInExport}
          onIncludePlacedChange={(e) => setIncludePlacedInExport(e.target.checked)}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showCollegeModal && selectedJob && (
        <CollegePickerModal
          jobColleges={jobColleges}
          exportCollegeIds={exportCollegeIds}
          onToggle={(id) =>
            setExportCollegeIds((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
            )
          }
          onSelectAll={() => setExportCollegeIds(jobColleges.map((c) => Number(c.id)))}
          onClear={() => setExportCollegeIds([])}
          onApply={() => setShowCollegeModal(false)}
          onResetAndClose={() => {
            setExportCollegeIds([]);
            setShowCollegeModal(false);
          }}
        />
      )}

      {confirmRemoveJob && selectedJob && (
        <ConfirmRemoveJobModal
          job={selectedJob}
          applicantCount={students.length}
          busy={removingJob}
          onConfirm={students.length === 0 ? handleDeleteJob : handleUnpublishJob}
          onClose={() => setConfirmRemoveJob(false)}
        />
      )}

      {removingApplicant && selectedJob && (
        <ConfirmRemoveApplicantModal
          student={removingApplicant}
          job={selectedJob}
          busy={removingApplicantBusy}
          onConfirm={handleRemoveApplicant}
          onClose={() => setRemovingApplicant(null)}
        />
      )}

      {showEditJobModal && (
        <EditJobModal
          data={editJobData}
          onChange={setEditJobData}
          onSave={handleEditJobSave}
          saving={editJobLoading}
          applicantCount={students.length}
          lockedBranches={lockedBranches}
          onClose={() => setShowEditJobModal(false)}
        />
      )}
    </>
  );
}
