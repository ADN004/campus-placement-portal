import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { superAdminAPI, commonAPI } from '../../services/api';
import useSkeleton from '../../hooks/useSkeleton';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { compareStudents } from '../../utils/studentOrder';
import {
  exportFilterPayload, describeExportFilters, EXPORT_STAGES,
} from '../../utils/exportFilters';
import { runExport, downloadBlob } from '../../utils/exportProgress';
import useDeviceType from '../../hooks/useDeviceType';
import StudentDetailModal from '../../components/StudentDetailModal';
import DriveScheduleModal from '../../components/DriveScheduleModal';
import EnhancedFilterPanel from '../../components/EnhancedFilterPanel';
import PDFFieldSelector from '../../components/PDFFieldSelector';
import ManualStudentAdditionModal from '../../components/ManualStudentAdditionModal';
import { RoundClosureWarning, RevertDialog } from '../../components/RoundClosure';
import ApplicantsBody from './jobEligible/ApplicantsBody';
import ApplicantsSkeleton from './jobEligible/ApplicantsSkeleton';

/** The cleared state of the extended filters — one definition, so the initial
 *  value and "clear all" cannot drift apart. */
const EMPTY_ENHANCED_FILTERS = {
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
};

/**
 * One drive's applicants — container.
 *
 * Every piece of state, effect and handler from the page this was split out of,
 * carried over rather than retyped. `ApplicantsBody` draws them and owns no
 * logic.
 *
 * Three handlers were dropped because nothing called them, and they are worth
 * naming because each represents something a super admin cannot do that a
 * placement officer can:
 *
 *   - `handleStatusUpdate` — set one application's status. Only the bulk bar
 *     works here; there is no per-row control and never was.
 *   - `handlePlacementUpdate` — record a package, joining date and location.
 *     `PlacementDetailsForm` was imported and never rendered.
 *   - `handleSelectAll` — superseded by the header checkbox's own inline logic.
 *
 * They were dead on the page before this and are dead code here; removing them
 * does not change what the page does. Whether super admin *should* have those
 * two abilities is a question for the user, not something to add quietly.
 */
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

export default function SuperAdminJobApplicants() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const deviceType = useDeviceType();
  const [jobs, setJobs] = useState([]);
  const [students, setStudents] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [exportRegions, setExportRegions] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
  const [loadingStudents, setLoadingStudents] = useState(false);
  /*
   * Set once a load has been running long enough to look stuck. A statewide
   * drive returns a few thousand applicants and can take ten seconds; silence
   * that long is indistinguishable from a page that has failed.
   */
  const [loadingSlow, setLoadingSlow] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportFilters, setShowExportFilters] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    selectedColleges: [],
    selectedRegion: '',
  });

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    cgpaMin: '',
    cgpaMax: '',
    maxBacklogs: '',
    dobFrom: '',
    dobTo: '',
    collegeId: '',
  });

  // New State for Enhanced Features
  const [selectedStudents, setSelectedStudents] = useState([]);
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
  const [enhancedFilters, setEnhancedFilters] = useState(EMPTY_ENHANCED_FILTERS);
  const [showPDFFieldSelector, setShowPDFFieldSelector] = useState(false);
  /*
   * Which format the field chooser is standing in front of.
   *
   * One dialog serves both: the columns a reader wants are the same question
   * whether the answer is printed or opened in Excel, and asking it twice with
   * two dialogs would let the two lists drift apart.
   */
  const [fieldPickerFormat, setFieldPickerFormat] = useState('pdf');
  const [pdfExportType, setPdfExportType] = useState('basic'); // 'basic' or 'enhanced'
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  /*
   * Closing a round: the countdown, the warning shown before a marking starts
   * one, and the undo for the marking just made.
   *
   * `pendingMarking` holds the click while the warning is open — the status the
   * officer asked for and the number of people it will leave behind — so the
   * dialog is a confirmation of a decision already expressed rather than a
   * second form to fill in.
   */
  const [roundClosures, setRoundClosures] = useState([]);
  const [graceDays, setGraceDays] = useState(5);
  const [pendingMarking, setPendingMarking] = useState(null);
  const [closureBusy, setClosureBusy] = useState(false);
  const [lastBatch, setLastBatch] = useState(null);
  // Open when the Console is putting a batch of students back to an earlier
  // stage. Holds nothing but the fact that the dialog is open -- what it acts
  // on is the current selection.
  const [reverting, setReverting] = useState(false);
  const [includePlacedInExport, setIncludePlacedInExport] = useState(false);
  /*
   * Which stages the next export covers, chosen in the Export scope panel.
   * Seeded from the page's stage filter when the panel opens, and
   * authoritative for the export from then on.
   */
  const [exportStages, setExportStages] = useState([]);
  // The selected job's own custom questions, which arrive with its applicants.
  const [jobCustomFields, setJobCustomFields] = useState([]);

  useEffect(() => {
    fetchJobs();
    fetchColleges();
    fetchExportRegions();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      fetchJobApplicants();
    }
  }, [selectedJob]);

  useEffect(() => {
    if (selectedJob) {
      /*
       * Cleared, not left to be overwritten. The statistics block kept showing
       * the previous drive's figures until the new ones arrived, which on a
       * slow drive is several seconds of confident, wrong numbers about a
       * different company.
       */
      setPlacementStats(null);
      fetchDriveSchedule();
      fetchPlacementStats();
      fetchRoundClosures();
    }
  }, [selectedJob]);

  // One effect, one writer. Both filter sets go through applyFilters, so they
  // compose instead of overwriting each other.
  useEffect(() => {
    filterEligibleStudents();
  }, [students, advancedFilters, enhancedFilters]);

  /*
   * The job is whichever one the URL names. It used to be whichever card was
   * clicked, and the click set it directly; now the page is opened at the job's
   * own address, so it is looked up once the list arrives.
   */
  const selectJobFromRoute = (list) => {
    const job = list.find((j) => String(j.id) === String(jobId));
    if (job) {
      setSelectedJob(job);
    } else {
      toast.error('That drive could not be found');
      navigate('/super-admin/job-eligible-students');
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await superAdminAPI.getJobs();
      // Filter to show only active jobs
      const activeJobs = response.data.data.filter((job) => job.is_active);
      setJobs(activeJobs);
      selectJobFromRoute(activeJobs);
    } catch (error) {
      toast.error('Failed to load jobs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchColleges = async () => {
    try {
      const response = await commonAPI.getColleges();
      setColleges(response.data.data || []);
    } catch (error) {
      console.error('Failed to load colleges:', error);
    }
  };

  const fetchExportRegions = async () => {
    try {
      const response = await commonAPI.getRegions();
      setExportRegions(response.data.data || []);
    } catch (error) {
      console.error('Failed to load regions:', error);
    }
  };

  const fetchJobApplicants = async () => {
    setLoadingStudents(true);
    setLoadingSlow(false);
    // Four seconds: past this, a person has started wondering.
    const slow = window.setTimeout(() => setLoadingSlow(true), 4000);
    try {
      const response = await superAdminAPI.getJobApplicants(selectedJob.id);
      // These are students who have APPLIED to this job across all colleges
      setStudents(response.data.data || []);
      setJobCustomFields(response.data.custom_fields || []);
    } catch (error) {
      // The server's own reason where there is one: "failed to load" is the
      // same sentence for an expired session and a drive that was deleted.
      const reason = error.response?.data?.message;
      toast.error(reason || 'Could not load the applicants for this drive.');
      console.error('Failed to load applicants:', error);
      setStudents([]);
    } finally {
      window.clearTimeout(slow);
      setLoadingSlow(false);
      setLoadingStudents(false);
    }
  };


  /*
   * Every filter in one pass.
   *
   * There used to be two of these -- one for the "Narrow the list" fields and
   * one for the stage -- and each wrote filteredStudents from its own effect.
   * Whichever ran last won, so setting a CGPA floor discarded the stage filter
   * and setting a stage discarded the CGPA floor. The two never composed, and
   * on screen that reads as a filter that silently stopped working.
   *
   * `ignoreStatus` leaves the stage out, so the export panel can count how many
   * applicants each stage holds after the other filters have been applied.
   */
  const applyFilters = (list, { ignoreStatus = false } = {}) => {
    if (!selectedJob) return [];

    let filtered = [...list];

    // Apply advanced filters
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

    if (advancedFilters.collegeId) {
      filtered = filtered.filter((s) => s.college_id === parseInt(advancedFilters.collegeId));
    }

    if (!ignoreStatus && enhancedFilters.applicationStatuses?.length > 0) {
      filtered = filtered.filter((s) =>
        enhancedFilters.applicationStatuses.includes(s.application_status)
      );
    }

    /*
     * The same order the server returns, so filtering does not re-order the
     * list under the reader. Shared rather than repeated: this comparison also
     * folds the two spellings of a branch together, which a plain compare on
     * the branch text does not.
     */
    filtered.sort((a, b) => compareStudents(a, b, { byCollege: true }));

    return filtered;
  };

  const filterEligibleStudents = () => setFilteredStudents(applyFilters(students));

  /** The page's filters, with the stage list replaced by the panel's choice. */
  const exportEnhancedFilters = () => ({
    ...enhancedFilters,
    applicationStatuses: exportStages,
  });

  /** How many applicants each stage holds, after every other filter. */
  const stageCounts = () => {
    const base = applyFilters(students, { ignoreStatus: true });
    return Object.fromEntries(EXPORT_STAGES.map(([stage]) => [
      stage,
      base.filter((s) => (s.application_status === 'submitted' ? 'under_review' : s.application_status) === stage).length,
    ]));
  };

  const nonStageFilterSummary = () =>
    describeExportFilters(advancedFilters, { ...enhancedFilters, applicationStatuses: [] });

  const handleAdvancedFilterChange = (field, value) => {
    setAdvancedFilters((prev) => ({ ...prev, [field]: value }));
  };

  // New Handler Functions for Enhanced Features
  const fetchDriveSchedule = async () => {
    if (!selectedJob) return;
    try {
      const response = await superAdminAPI.getJobDrive(selectedJob.id);
      setDriveData(response.data.data);
      setDriveSlots(response.data.slots || []);
      setDriveNeedsRenotify(response.data.needsRenotify === true);
    } catch (error) {
      console.error('Error fetching drive schedule:', error);
    }
  };

  const fetchPlacementStats = async () => {
    if (!selectedJob) return;
    try {
      const response = await superAdminAPI.getJobPlacementStats(selectedJob.id);
      setPlacementStats(response.data.data);
    } catch (error) {
      console.error('Error fetching placement stats:', error);
    }
  };

  // Silent refresh for auto-refresh (no loading spinners / toasts)
  const silentRefresh = useCallback(async () => {
    if (!selectedJob) return;
    try {
      const [applicantsRes, statsRes] = await Promise.all([
        superAdminAPI.getJobApplicants(selectedJob.id),
        superAdminAPI.getJobPlacementStats(selectedJob.id),
      ]);
      setStudents(applicantsRes.data.data || []);
      setPlacementStats(statsRes.data.data);
    } catch (e) {
      // Silently fail on auto-refresh
    }
  }, [selectedJob]);

  const { lastRefreshed, autoRefreshEnabled, toggleAutoRefresh, manualRefresh, refreshing } =
    useAutoRefresh(silentRefresh, 300000, true); // 5 min


  const handleSelectStudent = (applicationId) => {
    setSelectedStudents((prev) =>
      prev.includes(applicationId)
        ? prev.filter((id) => id !== applicationId)
        : [...prev, applicationId]
    );
  };


  const handleViewStudentDetail = (student) => {
    setSelectedStudentId(student.id);
    setSelectedApplicationId(student.application_id);
    setShowStudentDetail(true);
  };

  const fetchRoundClosures = async () => {
    if (!selectedJob) return;
    try {
      const response = await superAdminAPI.getRoundClosures(selectedJob.id);
      setRoundClosures(response.data.data.cascades || []);
      setGraceDays(response.data.data.grace_days || 5);
    } catch (error) {
      // A countdown that cannot be read is not worth blocking the page over:
      // the panel simply does not appear and everything else still works.
      console.error('Round closure fetch failed:', error);
      setRoundClosures([]);
    }
  };

  /**
   * How many people this marking would leave behind.
   *
   * Counted from the list already on screen rather than asked of the server,
   * which makes it exactly the set this user can see — and therefore exactly
   * the set their marking is allowed to close. It is also the number they can
   * check with their own eyes, which matters for a warning about rejecting
   * people automatically.
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
      toast.error('Please select students first');
      return;
    }

    // Shortlisting or selecting starts a countdown that will reject everybody
    // left below it, so it is confirmed first. Every other marking applies
    // straight away — rejecting one person says nothing about anybody else.
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
    try {
      const response = await superAdminAPI.bulkUpdateApplicationStatus({
        application_ids: selectedStudents,
        status,
      });
      const count = response.data.count ?? selectedStudents.length;
      toast.success(`${count} ${count === 1 ? 'application' : 'applications'} updated`);
      // Kept so the bar can offer an undo while the page is still open. A bulk
      // click can move three hundred rows and used to be unrecoverable.
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
      fetchJobApplicants();
      fetchPlacementStats();
      fetchRoundClosures();
    } catch (error) {
      toast.error('Failed to update application status');
      console.error(error);
    } finally {
      setClosureBusy(false);
    }
  };

  /**
   * Put the ticked students back to an earlier stage.
   *
   * Goes through the ordinary bulk endpoint, which records the change and marks
   * it as a correction rather than a decision because it moves people
   * backwards. That matters for the two hundred applications nobody can reach
   * with Undo -- anything marked before this feature existed has no batch id,
   * so this is the only way to correct it, and the history should say plainly
   * that it was a correction.
   */
  const handleRevert = async (target) => {
    setClosureBusy(true);
    try {
      const response = await superAdminAPI.bulkUpdateApplicationStatus({
        application_ids: selectedStudents,
        status: target,
      });
      const count = response.data.count ?? selectedStudents.length;
      toast.success(`${count} moved back to ${target === 'under_review' ? 'under review' : target}`);
      if (response.data.batch_id) {
        setLastBatch({ id: response.data.batch_id, count, label: target === 'under_review' ? 'Under review' : 'Shortlisted' });
      }
      setSelectedStudents([]);
      setReverting(false);
      fetchJobApplicants();
      fetchPlacementStats();
      fetchRoundClosures();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not move those students back');
    } finally {
      setClosureBusy(false);
    }
  };

  /** The stages the ticked students are currently at, for the dialog to name. */
  const selectedStages = () => [...new Set(
    students
      .filter((s) => selectedStudents.includes(s.application_id))
      .map((s) => (s.application_status === 'submitted' ? 'under review' : String(s.application_status).replace(/_/g, ' ')))
  )];

  const handleUndoBatch = async () => {
    if (!lastBatch) return;
    setClosureBusy(true);
    try {
      const response = await superAdminAPI.undoStatusBatch(lastBatch.id);
      toast.success(response.data.message);
      setLastBatch(null);
      fetchJobApplicants();
      fetchPlacementStats();
      fetchRoundClosures();
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
        extend: superAdminAPI.extendRoundClosure,
        cancel: superAdminAPI.cancelRoundClosure,
        run: superAdminAPI.runRoundClosure,
      }[action];
      const response = await call(cascade.id);
      toast.success(response.data.message);
      fetchRoundClosures();
      if (action === 'run') {
        fetchJobApplicants();
        fetchPlacementStats();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'That did not work');
    } finally {
      setClosureBusy(false);
    }
  };


  const handleScheduleDrive = async (driveDetails) => {
    try {
      const response = await superAdminAPI.createOrUpdateJobDrive(selectedJob.id, driveDetails);
      const saved = response.data.slots || [];
      toast.success(saved.length > 1
        ? `Drive scheduled at ${saved.length} venues`
        : 'Drive scheduled successfully');
      setShowDriveModal(false);
      fetchDriveSchedule();
      if (response.data.needsRenotify) {
        offerRenotify(saved.length, () => handleNotifyStudents('drive_scheduled'));
      }
    } catch (error) {
      toast.error('Failed to schedule drive');
      console.error(error);
    }
  };

  /**
   * Which message the ticked students should get.
   *
   * Their current status, because that is what "notify" means here — tell these
   * people what has just been decided about them. A selection spanning two
   * statuses has no single answer, so it is refused rather than guessed: the
   * previous version guessed 'shortlisted' for everybody, which told people
   * marked Selected that they had been shortlisted.
   */
  const notifyTypeForSelection = () => {
    const statuses = new Set(
      students
        .filter((s) => selectedStudents.includes(s.application_id))
        .map((s) => (s.application_status === 'submitted' ? 'under_review' : s.application_status))
    );

    if (statuses.size === 0) return { error: 'Please select students first' };
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

  /**
   * Tell students where their application stands.
   *
   * `notificationType` used to arrive as a click event: the bulk bar passed
   * this handler straight to a button's onClick, so what reached the server was
   * a serialised SyntheticEvent and the whitelist rejected every one of them.
   * Called with no argument it now derives the type from the selection.
   */
  const handleNotifyStudents = async (notificationType) => {
    if (typeof notificationType !== 'string') {
      const derived = notifyTypeForSelection();
      if (derived.error) {
        toast.error(derived.error);
        return;
      }
      notificationType = derived.type;
    }

    const applicationsToNotify =
      notificationType === 'drive_scheduled'
        ? filteredStudents.filter((s) => s.application_status === 'shortlisted').map((s) => s.application_id)
        : selectedStudents;

    if (applicationsToNotify.length === 0) {
      toast.error(
        notificationType === 'drive_scheduled'
          ? 'No shortlisted students to notify'
          : 'Please select students first'
      );
      return;
    }

    try {
      const response = await superAdminAPI.notifyApplicationStatus({
        application_ids: applicationsToNotify,
        notification_type: notificationType,
      });
      toast.success(`Sent ${response.data.notificationsCreated} notifications and ${response.data.emailsSent} emails`);
      if (notificationType !== 'drive_scheduled') {
        setSelectedStudents([]);
      }
    } catch (error) {
      toast.error('Failed to send notifications');
      console.error(error);
    }
  };


  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      cgpaMin: '',
      cgpaMax: '',
      maxBacklogs: '',
      dobFrom: '',
      dobTo: '',
      collegeId: '',
    });
  };

  const hasActiveFilters = () => {
    return Object.values(advancedFilters).some((value) => value !== '');
  };

  const handleExport = async () => {
    if (filteredStudents.length === 0) {
      toast.error('No applicants to export');
      return;
    }

    setPdfExportType('enhanced');
    setFieldPickerFormat('pdf');
    setShowPDFFieldSelector(true);
    setShowExportDropdown(false);
    setShowExportFilters(false);
  };

  /*
   * The spreadsheet, with only the columns asked for.
   *
   * Beside handleExcelExport rather than replacing it: that one is a single
   * click for the whole sheet, which is what most exports want, and turning it
   * into a dialog would tax every officer who just needs the file.
   */
  const handleExcelExportWithFields = async () => {
    if (filteredStudents.length === 0) {
      toast.error('No applicants to export');
      return;
    }
    setPdfExportType('enhanced');
    setFieldPickerFormat('excel');
    setShowPDFFieldSelector(true);
    setShowExportDropdown(false);
    setShowExportFilters(false);
  };

  /*
   * The same applicant list as a spreadsheet.
   *
   * Goes through the plain export rather than the enhanced one: the enhanced
   * route exists to let a PDF be built from chosen fields, which a spreadsheet
   * does not need — every column is there and the reader hides what they do not
   * want. The endpoint has accepted a format all along and defaults to excel;
   * nothing on this page had ever called it.
   */
  const handleExcelExport = async () => {
    if (filteredStudents.length === 0) {
      toast.error('No applicants to export');
      return;
    }
    try {
      setExporting(true);
      setShowExportDropdown(false);
      setShowExportFilters(false);
      /*
       * The college filter applies here exactly as it does to the PDF.
       *
       * Both formats are the same list; only the container differs. An empty
       * selection is left out rather than sent as [], because the endpoint
       * reads an empty array as "no college filter" — which is the same thing,
       * but saying nothing is clearer than saying nothing-shaped.
       */
      const selectedColleges = exportFilters.selectedColleges;

      await runExport({
        label: selectedColleges.length > 0
          ? `Excel from ${selectedColleges.length} college${selectedColleges.length === 1 ? '' : 's'}`
          : 'Excel',
        count: filteredStudents.length,
        run: () => superAdminAPI.exportJobApplicants(selectedJob.id, {
          format: 'excel',
          use_short_names: true,
          exclude_already_placed: !includePlacedInExport,
          college_ids: selectedColleges.length > 0 ? selectedColleges : undefined,
          // Whatever the reader has narrowed the list to. This export used to
          // take the college list and nothing else, so a screen filtered to
          // "Shortlisted" produced a file containing everybody.
          ...exportFilterPayload(advancedFilters, exportEnhancedFilters()),
        }),
        onFile: (response) => downloadBlob(
          response,
          `applicants_${String(selectedJob.job_title).replace(/\s+/g, '_')}_${Date.now()}.xlsx`,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ),
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportWithFields = async ({ fields: selectedFields, includeSignature, headerLine1, headerLine2 }) => {
    const asExcel = fieldPickerFormat === 'excel';
    try {
      setExporting(true);
      setShowPDFFieldSelector(false);

      const exportData = {
        format: asExcel ? 'excel' : 'pdf',
        // The same chosen list, under the name the format reads it by. The
        // server translates the picker's PDF-shaped keys for the sheet.
        ...(asExcel ? { excel_fields: selectedFields } : { pdf_fields: selectedFields }),
        include_signature: includeSignature || false,
        header_line1: headerLine1 || '',
        header_line2: headerLine2 || null,
        exclude_already_placed: !includePlacedInExport,
        college_ids: exportFilters.selectedColleges.length > 0 ? exportFilters.selectedColleges : undefined,
        // Every filter on screen, from the shared builder — the CGPA, backlog
        // and date-of-birth filters were missing from this list and reached no
        // export in either role.
        ...exportFilterPayload(advancedFilters, exportEnhancedFilters()),
        // "Selected only" is a deliberate choice of list rather than a filter,
        // so it overrides whatever stage filter happens to be set.
        ...(pdfExportType === 'selected_only' ? { application_statuses: ['selected'] } : {}),
      };

      await runExport({
        label: asExcel ? 'Excel' : 'PDF',
        count: filteredStudents.length,
        run: () => superAdminAPI.enhancedExportJobApplicants(selectedJob.id, exportData),
        onFile: (response) => downloadBlob(
          response,
          `job_applicants_${selectedJob.job_title.replace(/\s+/g, '_')}_${
            new Date().toISOString().split('T')[0]}.${asExcel ? 'xlsx' : 'pdf'}`,
          asExcel
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf'
        ),
      });
      setShowExportFilters(false);
    } finally {
      setExporting(false);
    }
  };

  const toggleCollegeSelection = (collegeId) => {
    setExportFilters((prev) => {
      const isSelected = prev.selectedColleges.includes(collegeId);
      return {
        ...prev,
        selectedColleges: isSelected
          ? prev.selectedColleges.filter((id) => id !== collegeId)
          : [...prev.selectedColleges, collegeId],
      };
    });
  };

  const handleRegionSelect = (regionId) => {
    if (!regionId) {
      setExportFilters((prev) => ({ ...prev, selectedRegion: '', selectedColleges: [] }));
      return;
    }
    const regionColleges = colleges
      .filter((c) => String(c.region_id) === String(regionId))
      .map((c) => c.id);
    setExportFilters((prev) => ({
      ...prev,
      selectedRegion: regionId,
      selectedColleges: regionColleges,
    }));
  };

  const clearExportFilters = () => {
    setExportFilters({
      selectedColleges: [],
      selectedRegion: '',
    });
  };

  const hasExportFilters = () => {
    return exportFilters.selectedColleges.length > 0 || !!exportFilters.selectedRegion;
  };

  if (showSkeleton || !selectedJob) return <ApplicantsSkeleton layout={deviceType} />;

  const currentApplicants = filteredStudents.filter((s) => !s.is_already_placed);
  const placedApplicants = filteredStudents.filter((s) => s.is_already_placed);
  const selectedSummary = filteredStudents.filter((s) => s.application_status === 'selected');

  const hasAdvancedFilters = Object.values(advancedFilters).some(Boolean);
  const hasEnhancedFilters = Object.entries(enhancedFilters).some(([, v]) => (
    Array.isArray(v) ? v.length > 0 : v !== '' && v !== null
  ));

  return (
    <>
      <ApplicantsBody
        layout={deviceType}
        selectedJob={selectedJob}
        students={students}
        filteredStudents={filteredStudents}
        currentApplicants={currentApplicants}
        placedApplicants={placedApplicants}
        selectedSummary={selectedSummary}
        colleges={colleges}
        placementStats={placementStats}
        driveData={driveData}
        driveSlots={driveSlots}
        loadingStudents={loadingStudents}
        loadingSlow={loadingSlow}
        exporting={exporting}
        selectedStudents={selectedStudents}
        onSelectStudent={handleSelectStudent}
        onSelectAll={() => {
          const ids = currentApplicants.map((s) => s.application_id);
          const all = ids.length > 0 && ids.every((id) => selectedStudents.includes(id));
          setSelectedStudents(all ? [] : ids);
        }}
        onClearSelection={() => setSelectedStudents([])}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        onNotifyStudents={handleNotifyStudents}
        exportFilterSummary={nonStageFilterSummary()}
        exportStages={exportStages}
        stageCounts={stageCounts()}
        onExportStagesChange={setExportStages}
        onClearAllFilters={() => {
          setEnhancedFilters(EMPTY_ENHANCED_FILTERS);
          setAdvancedFilters({
            cgpaMin: '', cgpaMax: '', maxBacklogs: '', dobFrom: '', dobTo: '', collegeId: '',
          });
        }}
        onRevert={() => {
          if (selectedStudents.length === 0) { toast.error('Please select students first'); return; }
          setReverting(true);
        }}
        roundClosures={roundClosures}
        closureBusy={closureBusy}
        onClosureAction={handleClosureAction}
        lastBatch={lastBatch}
        onUndoBatch={handleUndoBatch}
        onDismissBatch={() => setLastBatch(null)}
        onViewStudent={handleViewStudentDetail}
        onScheduleDrive={() => setShowDriveModal(true)}
        onNotifyDrive={() => handleNotifyStudents('drive_scheduled')}
        onManualAdd={() => setShowManualAddModal(true)}
        onExportExcel={() => handleExcelExport()}
        onExportPdf={handleExport}
        onExportExcelFields={handleExcelExportWithFields}
        exportRegions={exportRegions}
        exportFilters={exportFilters}
        showExportFilters={showExportFilters}
        onToggleExportScope={() => {
          // Opening the panel seeds the stage boxes from the page, so they
          // start out agreeing with the list behind them.
          if (!showExportFilters) setExportStages(enhancedFilters.applicationStatuses || []);
          setShowExportFilters(!showExportFilters);
        }}
        onRegionSelect={handleRegionSelect}
        onToggleCollege={toggleCollegeSelection}
        onClearExportScope={() => setExportFilters({ selectedColleges: [], selectedRegion: '' })}
        showAdvancedFilters={showAdvancedFilters}
        onToggleAdvancedFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
        advancedFilters={advancedFilters}
        onAdvancedFilterChange={handleAdvancedFilterChange}
        onClearAdvancedFilters={() => setAdvancedFilters({
          cgpaMin: '', cgpaMax: '', maxBacklogs: '', dobFrom: '', dobTo: '', collegeId: '',
        })}
        hasAdvancedFilters={hasAdvancedFilters}
        showEnhancedFilters={showEnhancedFilters}
        onToggleEnhancedFilters={() => setShowEnhancedFilters(!showEnhancedFilters)}
        enhancedFilters={enhancedFilters}
        hasEnhancedFilters={hasEnhancedFilters}
        enhancedFilterPanel={showEnhancedFilters ? (
          <div className="mb-4">
            {/*
              `onChange` and `onClear`, not `onFilterChange` and `onClose`.
              The panel calls `onChange({ ...filters, ...patch })` on every
              keystroke and tick, so passing the wrong name left it undefined
              and every control in the panel threw.
            */}
            <EnhancedFilterPanel
              filters={enhancedFilters}
              onChange={setEnhancedFilters}
              onClear={() => setEnhancedFilters(EMPTY_ENHANCED_FILTERS)}
              variant="admin"
            />
          </div>
        ) : null}
      />

      {reverting && (
        <RevertDialog
          variant="admin"
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
          variant="admin"
          stage={pendingMarking.stage}
          count={pendingMarking.count}
          remaining={pendingMarking.remaining}
          graceDays={graceDays}
          busy={closureBusy}
          onConfirm={() => commitBulkStatusUpdate(pendingMarking.status)}
          onCancel={() => setPendingMarking(null)}
        />
      )}

      <StudentDetailModal
        isOpen={showStudentDetail}
        onClose={() => setShowStudentDetail(false)}
        studentId={selectedStudentId}
        applicationId={selectedApplicationId}
        userRole="super-admin"
        variant="admin"
      />

      <DriveScheduleModal
        isOpen={showDriveModal}
        onClose={() => setShowDriveModal(false)}
        onSave={handleScheduleDrive}
        existingDrive={driveData}
        existingSlots={driveSlots}
        jobTitle={selectedJob?.job_title}
        variant="admin"
      />

      {showPDFFieldSelector && (
        <PDFFieldSelector
          onExport={handleExportWithFields}
          format={fieldPickerFormat}
          onClose={() => setShowPDFFieldSelector(false)}
          applicantCount={filteredStudents.length}
          exportType={pdfExportType}
          customFields={jobCustomFields}
          variant="admin"
        />
      )}

      <ManualStudentAdditionModal
        isOpen={showManualAddModal}
        onClose={() => setShowManualAddModal(false)}
        job={selectedJob}
        api={superAdminAPI}
        userRole="super-admin"
        onSuccess={() => { setShowManualAddModal(false); fetchJobApplicants(selectedJob.id); }}
        variant="admin"
      />
    </>
  );
}
