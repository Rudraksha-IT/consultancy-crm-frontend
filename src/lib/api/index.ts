export {
  addApplication,
  addOfferLetter,
  changeApplicationStatus,
  chooseOffer,
  fetchPickableUniversities,
  type NewOfferLetter,
} from "./applications/applications";
export { fetchStaffContext, logIn, logOut } from "./auth/auth";
export {
  addHoliday,
  addMissedTime,
  ClockRefusedError,
  clockIn,
  clockOut,
  fetchClockMonth,
  fetchHolidays,
  fetchMyClock,
  fetchTeamMonth,
  fetchTeamNow,
  fetchWorkingDay,
  removeHoliday,
  saveWeeklyOff,
  saveWorkingDay,
  setMissingClockOut,
} from "./staff/clock";
export type {
  ClockAnywhere,
  ClockCorrection,
  ClockDay,
  ClockMonth,
  ClockSession,
  ClockStaff,
  Holiday,
  MonthFigures,
  MyClock,
  NewHoliday,
  OfficeNetworkState,
  PersonNow,
  TeamMonth,
  TeamMonthRow,
  TeamNow,
  WorkingDay,
} from "./staff/clock";
export {
  answerWorkFromHome,
  askForWorkFromHome,
  cancelWorkFromHome,
  endWorkFromHome,
  fetchMyWorkFromHome,
  fetchPersonWorkFromHome,
  setWorkFromHome,
  WorkFromHomeRefusedError,
} from "./staff/workFromHome";
export type {
  MyWorkFromHome,
  NewWorkFromHome,
  PersonWorkFromHome,
  WorkFromHomeDates,
} from "./staff/workFromHome";
export {
  fetchApplicationFilterChoices,
  fetchApplications,
} from "./applications/officeApplications";
export { fetchVisaFilterChoices, fetchVisas } from "./applications/officeVisas";
export {
  addOfficeNetwork,
  fetchCurrentNetwork,
  fetchOfficeNetworks,
  OfficeNetworkRefusedError,
  removeOfficeNetwork,
} from "./office/officeNetworks";
export type {
  CurrentNetwork,
  OfficeNetwork,
  OfficeNetworkLimits,
  OfficeNetworkList,
} from "./office/officeNetworks";
export type { OfficeVisa, OfficeVisaPage, VisaFilterChoices } from "./applications/officeVisas";
export type {
  ApplicationFilterChoices,
  OfficeApplication,
  OfficeApplicationPage,
} from "./applications/officeApplications";
export {
  addCourse,
  addUniversity,
  fetchUniversities,
  importCatalogue,
} from "./catalogue/catalogue";
export type {
  CatalogueImportResult,
  Course,
  CourseField,
  CourseInput,
  University,
  UniversityField,
  UniversityInput,
  UniversityPage,
} from "./catalogue/catalogueTypes";
export {
  binCourseFile,
  COURSE_FILE_API_FIELDS,
  deleteCourseFileForGood,
  fetchBinCourseFileLink,
  fetchCourseFileLink,
  renameCourseFile,
  restoreCourseFile,
  uploadCourseFile,
} from "./catalogue/courseFiles";
export type { CourseFileField } from "./catalogue/courseFiles";
export type { BinnedCourseFile, CourseFile } from "./catalogue/courseFileTypes";
export {
  CatalogueRefusedError,
  deleteUniversity,
  fetchUniversity,
  fetchUpcomingIntakes,
  saveUniversityEdit,
  setCourseIntakes,
  UniversityEditRefusedError,
} from "./catalogue/catalogueEdit";
export type {
  CourseEditField,
  CourseEditInput,
  UniversityEditField,
  UniversityEditInput,
} from "./catalogue/catalogueEdit";
export {
  getJson,
  patchJson,
  postForm,
  postJson,
  postWithoutBody,
  putJson,
  sendWithoutBody,
} from "./core/client";
export {
  FilesNotFetchedError,
  NoContactEmailError,
  fetchChoosable,
  fetchMessages,
  fetchStudentMessages,
  sendBulkEmail,
  sendEmail,
} from "./office/communication";
export type {
  BulkEmailField,
  BulkResult,
  Choosable,
  Message,
  MessagePage,
  NewEmail,
  NewEmailField,
  PreTickSource,
} from "./office/communication";
export { fetchAttachable, refsOf } from "./office/attachments";
export type { Attachable, AttachableFiles, AttachmentRef } from "./office/attachments";
export { fetchReadyMade, fetchReadyMadeDraft } from "./office/readyMade";
export type { ReadyMadeDraft, ReadyMadeEntry, ReadyMadeTarget } from "./office/readyMade";
export {
  removeLogo,
  saveOfficeDetails,
  setShowNameBesideLogo,
  updateDateDisplay,
  uploadLogo,
} from "./office/configuration";
export type { SavedOfficeDetails } from "./office/configuration";
export {
  addCountryDocument,
  addDocumentType,
  addPickedDocumentType,
  checkDocument,
  deleteForGood,
  dropStudentDocument,
  fetchBin,
  fetchBinFileLink,
  fetchChecklist,
  putInBin,
  restoreFromBin,
  takeOutOfBin,
  addDocumentFiles,
  fetchCountryLists,
  fetchDocumentLink,
  fetchDocumentTypes,
  fetchPaperwork,
  fetchPickableDocumentTypes,
  removeDocumentType,
  requirementRefusal,
  setCountryList,
  setNeededByEveryone,
  setStudentDocuments,
  uploadDocument,
} from "./documents/documents";
export type { UploadField } from "./documents/documents";
export {
  addDocumentExample,
  deleteDocumentExampleForGood,
  ExampleRefusedError,
  fetchBinDocumentExampleLink,
  fetchDocumentExampleLink,
  removeDocumentExample,
  replaceDocumentExample,
  restoreDocumentExample,
  setDocumentInstruction,
} from "./documents/documentExamples";
export type { ExampleField } from "./documents/documentExamples";
export type {
  BinEntry,
  BinItem,
  BinNote,
  BinPage,
  BinTarget,
  BinnedDocument,
  BinnedDocumentExample,
  BinnedFile,
  Checklist,
  ChecklistItem,
  ConfiguredDocumentType,
  NewCountryDocument,
  CountryList,
  CountryListRow,
  DocumentCheck,
  DocumentExample,
  DocumentLinkedTo,
  DocumentLinkOption,
  DocumentType,
  LinkedDocument,
  NamedFile,
  DocumentFile,
  NamedDocumentType,
  PaperworkCounts,
  PaperworkPage,
  PaperworkRow,
  StoredDocument,
} from "./documents/documentsTypes";
export { fetchCurrentConsultancy } from "./office/consultancy";
export { fetchPipeline, fetchProgress, fetchWaiting } from "./workspace/home";
export {
  fetchClassReport,
  fetchMoneyReport,
  fetchSourceReport,
  fetchStaffProgressReport,
  fetchStudentReport,
} from "./workspace/reports";
export type {
  ClassReportRow,
  CountryCount,
  DateRange,
  MoneyMonth,
  MoneyReport,
  MonthCount,
  SourceReport,
  StaffProgressReport,
  StaffProgressRow,
  StudentMonth,
  StudentReport,
} from "./workspace/reports";
export type { ProgressList, ProgressRow, Waiting } from "./workspace/home";
export { fetchStaffProgress } from "./staff/staffProgress";
export type { ProgressCard, ProgressChange, StaffProgress } from "./staff/staffProgress";
export {
  ApiRequestError,
  restrictionOfError,
  InvalidCodeError,
  InvalidCredentialsError,
  InvalidFieldsError,
  NotLoggedInError,
  PasswordRulesNotMetError,
  TooManyCodesError,
  TooManyPasswordTriesError,
  WrongCurrentPasswordError,
} from "./core/errors";
export { checkJoinCode, completeJoin, requestJoinCode } from "./core/join";
export {
  changeMyPassword,
  fetchMyDetails,
  fetchSignedInDevices,
  saveColourMode,
  savePageSwipe,
  saveMyDetails,
  saveNotificationChoices,
  signOutOtherDevices,
} from "./staff/mySettings";
export type {
  MyDetails,
  MyDetailsChange,
  MyDetailsField,
  PasswordChange,
  SignedInDevice,
} from "./staff/mySettings";
export { askForEmailChange, confirmEmailChange, WorkEmailRefusedError } from "./staff/workEmail";
export type { EmailChangeRequest, WorkEmailField } from "./staff/workEmail";
export { checkResetCode, completePasswordReset, requestResetCode } from "./auth/passwordReset";
export {
  checkPlatformResetCode,
  completePlatformPasswordReset,
  requestPlatformResetCode,
} from "./platform/platformPasswordReset";
export { requestOfficeLinks } from "./auth/centralLogin";
export {
  changeConsultancyStatus,
  createConsultancy,
  retryConsultancySetup,
  fetchConsultancies,
  fetchPlatformAdmin,
  logInToPlatform,
  logOutOfPlatform,
  updateConsultancyTheme,
  updateModules,
} from "./platform/platform";
export type { PlatformLoginOutcome, StatusChange, StatusChangeField } from "./platform/platform";
export { changePlatformPassword, savePlatformName } from "./platform/platformAccount";
export { addConsultancyAdmin, fetchProductDomain } from "./staff/officeAdmins";
export type { InvitedAdmin, NewOfficeAdmin, OfficeAdminField } from "./staff/officeAdmins";
export {
  confirmTwoFactorSetup,
  fetchMyTwoFactor,
  makeNewRecoveryCodes,
  StartAgainError,
  startTwoFactorSetup,
  switchTwoFactorOff,
  switchTwoFactorOn,
  TooManyTriesError,
  verifyStaffTwoFactor,
  verifyTwoFactor,
  WrongNumberError,
} from "./auth/twoFactor";
export type { StaffLoginOutcome } from "./auth/staffLogin";
export type {
  SecondStepAnswer,
  TwoFactorSide,
  TwoFactorState,
  TwoFactorStep,
} from "./auth/twoFactor";
export type { PlatformAccountField } from "./platform/platformAccount";
export {
  isReadOnlyRestriction,
  onRestriction,
  restrictionOf,
  type Restriction,
} from "./core/restriction";
export {
  cancelInvite,
  changeEmployeeRole,
  deactivateEmployee,
  fetchAssignedStudents,
  fetchCounsellorChoices,
  fetchEmployees,
  inviteEmployee,
  resendInvite,
  resetEmployeeTwoFactor,
  setEmployeeTwoFactor,
} from "./staff/staff";
export {
  fetchStudentHistory,
  fetchStudentProfile,
  saveNote,
  saveStudentPriority,
} from "./students/studentProfile";
export {
  EDIT_LISTS,
  saveEditDetails,
  type EditDetailsInput,
  type EditList,
} from "./students/editDetails";
export { assignCounsellor, setStage, transferStudent } from "./students/studentJourney";
export { addVisaLetter, changeVisaStatus, setVisaDates, startVisa } from "./applications/visas";
export type { NewVisaLetter } from "./applications/visas";
export type { VisaDatesChange } from "./applications/visas";
export {
  changePayment,
  deletePayment,
  fetchPayments,
  paymentFilterQuery,
  fetchReceipt,
  recordPayments,
} from "./money/payments";
export {
  addFee,
  changeFee,
  deleteFee,
  fetchCountedOwingStudents,
  fetchOwingStudents,
  fetchStudentFees,
} from "./money/fees";
export { fetchFeesByType, fetchFeeTypeStudents } from "./money/feesByType";
export type {
  FeesByType,
  FeeTypeMoney,
  FeeTypePart,
  FeeTypeStudent,
  FeeTypeStudents,
} from "./money/feesByType";
export {
  addFeeType,
  changeFeeType,
  deleteFeeType,
  describeFeeType,
  feeTypeRefusal,
  fetchFeeTypes,
  reorderFeeTypes,
} from "./money/feeTypes";
export type { FeeType, FeeTypeChange, FeeTypeRef } from "./money/feeTypes";
export type { Fee, NewFee, OwingPage, OwingStudent, StudentFees } from "./money/fees";
export { addExpense, changeExpense, deleteExpense, fetchExpenses } from "./money/expenses";
export type { Expense, ExpensePage, NewExpense } from "./money/expenses";
export {
  addCommission,
  changeCommissionStatus,
  fetchCommission,
  fetchReceivedCommission,
} from "./money/commission";
export type {
  Commission,
  CommissionPage,
  NewCommission,
  ReceivedCommission,
} from "./money/commission";
export type {
  NewPayment,
  NewPaymentLine,
  NewPayments,
  Payment,
  PaymentFilters,
  PaymentPage,
  Receipt,
  ReceiptLine,
} from "./money/payments";
export {
  addStudent,
  fetchHighPriorityStudents,
  fetchStudents,
  fetchStudentsByName,
} from "./students/students";
export { fetchAttendanceDay, fetchStudentClasses, saveAttendanceDay } from "./classes/attendance";
export type { AttendanceDay, DayMarks, StudentClass } from "./classes/attendance";
export {
  addStudentToBatch,
  createBatch,
  fetchBatch,
  fetchBatches,
  fetchBatchTeachers,
  fetchEnrolledStudents,
  removeStudentFromBatch,
  saveBatch,
} from "./classes/batches";
export type {
  Batch,
  BatchForm,
  BatchMember,
  BatchPage,
  BatchTeacher,
  BatchWithStudents,
  EnrolledStudent,
  EnrolledStudentPage,
} from "./classes/batches";
export {
  createTask,
  fetchMyTasks,
  fetchStudentTasks,
  fetchTaskAssignees,
  fetchTaskCount,
  setTaskDone,
} from "./workspace/tasks";
export type { NewTask, Task, TaskAssignee, TaskFilters, TaskPage } from "./workspace/tasks";
export {
  fetchNotifications,
  markAllNotificationsRead,
  setNotificationRead,
} from "./workspace/notifications";
export type { AppNotification, NotificationPage } from "./workspace/notifications";
export { DetailAnswerSchema, NO_OFFICE_DETAILS, StaffStatus } from "./core/types";
export type {
  Application,
  DocumentProgress,
  NewApplication,
  Visa,
  AssignedStudent,
  StageChange,
  Consultancy,
  OfficeDetails,
  OfficeLogo,
  CounsellorChoice,
  Employee,
  NewEmployee,
  NewEmployeeField,
  ConsultancyOverview,
  Credentials,
  NewConsultancy,
  NewConsultancyField,
  PasswordReset,
  PlatformAdmin,
  ResetCode,
  StaffContext,
  NewStudent,
  NewStudentField,
  Student,
  StudentPage,
  StudentRow,
  AcademicRecord,
  AcademicRecordField,
  AcademicRecordInput,
  HistoryEntry,
  HistoryPage,
  Address,
  AddressInput,
  StudentDetails,
  StudentDetailsChange,
  StudentDetailsField,
  StudentProfile,
  TestScore,
  TestScoreField,
  TestScoreInput,
  WorkExperience,
  WorkExperienceField,
  WorkExperienceInput,
} from "./core/types";
export {
  fetchStudentProgress,
  fetchStudentVisits,
  fetchTodaysVisits,
  logVisit,
} from "./students/visits";
export type {
  NewVisit,
  NewVisitField,
  StudentProgress,
  TimelineVisit,
  TodaysVisits,
  Visit,
  VisitPage,
} from "./students/visits";
export {
  downloadOfficeData,
  enterSupportVisit,
  fetchSupportVisits,
  isEntryCode,
  sendResetCodeTo,
  signOutStaff,
  startSupportVisit,
  switchOfficeModules,
} from "./platform/supportAccess";
export type { StartedVisit, SupportField, SupportVisit } from "./platform/supportAccess";
export { searchEverything, SEARCH_MAX_LENGTH, SEARCH_MIN_LENGTH } from "./workspace/search";
export type {
  FoundBatch,
  FoundClassStudent,
  FoundStudent,
  SearchResults,
} from "./workspace/search";
export { downloadExport, fetchExportRecords } from "./office/exports";
export type { ExportRecord, ExportRecordPage } from "./office/exports";
export {
  approveTransferRequest,
  askToTakeStudent,
  cancelTransferRequest,
  declineTransferRequest,
  fetchTransferRequestCount,
  fetchTransferRequests,
} from "./students/transferRequests";
export type { TransferRequestPage } from "./students/transferRequests";
export type { TransferRequest } from "./students/transferRequestTypes";
export { onUnexpectedError, reportUnexpectedError, unexpectedErrorOf } from "./core/unexpected";
export { onLoginEnded, reportLoginEnded } from "./core/loginEnded";
export {
  isAppUpdating,
  isUpdatingError,
  onUpdatingChange,
  reportServerAnswer,
  updatingOr,
} from "./core/updating";
export {
  PLATFORM_ADMIN_STATUSES,
  checkPlatformJoinCode,
  completePlatformJoin,
  deactivatePlatformAdmin,
  fetchPlatformAdmins,
  fetchProductLogo,
  invitePlatformAdmin,
  reactivatePlatformAdmin,
  requestPlatformJoinCode,
  resendPlatformAdminCode,
  uploadProductLogo,
} from "./platform/platformTeam";
export { saveProductName } from "./platform/productName";
export { fetchSavedLogos, pickSavedLogo, removeSavedLogo } from "./platform/savedLogos";
export type { SavedLogo, SavedLogos } from "./platform/savedLogos";
export type {
  NewPlatformAdmin,
  PlatformAdminRow,
  PlatformAdminStatus,
  PlatformTeamField,
} from "./platform/platformTeam";
export {
  fetchPlatformEmail,
  sendTestEmail,
  TooManyTestEmailsError,
} from "./platform/platformEmail";
export type { EmailState, PlatformEmail } from "./platform/platformEmail";
export { nextLoginStep } from "./auth/loginStep";
export type { LoginNext } from "./auth/loginStep";
export {
  fetchConversation,
  fetchConversations,
  fetchInboxCheck,
  fetchInboxPeople,
  sendInboxMessage,
} from "./workspace/inbox";
export type {
  InboxCheck,
  InboxContact,
  InboxConversation,
  InboxMessage,
  InboxPerson,
  InboxThread,
} from "./workspace/inbox";
