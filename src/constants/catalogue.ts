/** How advanced a Course is; values match the API (GLOSSARY: Course). */
export const CourseLevel = {
  Bachelor: "bachelor",
  Master: "master",
  Diploma: "diploma",
  GraduateCertificate: "graduate_certificate",
  Foundation: "foundation",
} as const;

export type CourseLevel = (typeof CourseLevel)[keyof typeof CourseLevel];

export const COURSE_LEVELS = Object.values(CourseLevel);

export const COURSE_LEVEL_LABELS: Record<CourseLevel, string> = {
  bachelor: "Bachelor",
  master: "Master",
  diploma: "Diploma",
  graduate_certificate: "Graduate Certificate",
  foundation: "Foundation",
};

/** "1 university", "3 universities". */
function universityCount(count: number): string {
  return `${String(count)} ${count === 1 ? "university" : "universities"}`;
}

/** "1 course", "3 courses". */
function courseCount(count: number): string {
  return `${String(count)} ${count === 1 ? "course" : "courses"}`;
}

/** "1 application", "3 applications". */
function applicationCount(count: number): string {
  return `${String(count)} ${count === 1 ? "application" : "applications"}`;
}

/** The words of the Catalogue screens (prototype `#catalogue` and `#uni-3-edit`; issue 92). */
export const CATALOGUE_TEXT = {
  title: "Catalogue",
  intro: "Universities, their courses and intakes, which counsellors choose from.",
  addUniversity: "Add university",
  addCourse: "Add a course",
  addCourseTitle: "Add course",
  edit: "Edit",
  editUniversityAndCourses: (name: string) => `Edit ${name} and its courses`,
  archived: "Archived",
  showArchived: "Show archived",
  search: "Search universities or courses",
  name: "Name",
  country: "Country",
  courseName: "Course name",
  level: "Level",
  intakes: "Intakes",
  courseCount,
  universityCount,
  countryLine: (country: string) =>
    `${country} · Documents follow ${country}'s list in Configuration`,
  course: "Course",
  requiredDocuments: "Required documents",
  requiredDocumentsHint: "On top of what everyone brings and the country's list.",
  onlyCountryList: "Only the country's list",
  noCourses: "No courses yet.",
  noCoursesNow: (archived: number) =>
    `No courses offered now. ${String(archived)} archived, shown with "Show archived".`,
  noIntakes: "No intakes yet",
  noIntakesPicked: "No intakes yet. Pick months above.",
  addIntake: "Add intake",
  addIntakeFor: (course: string) => `Add intake to ${course}`,
  removeIntake: (intake: string) => `Remove intake ${intake}`,
  removeIntakeFrom: (intake: string, course: string) => `Remove intake ${intake} from ${course}`,
  removeIntakeTitle: (intake: string, course: string) => `Remove ${intake} from ${course}?`,
  removeIntakeBody:
    "Counsellors can no longer pick it for new applications. Applications already made keep it.",
  remove: "Remove",
  intakeRemoved: (intake: string, course: string) => `${intake} removed from ${course}`,
  keepOneIntake: "Keep at least one intake, or archive the course.",
  needsIntake: "Add at least one intake, or archive the course.",
  intakesTitle: (course: string) => `Intakes for ${course}`,
  intakesLead: "Click a month to add it, click again to remove it.",
  saveIntakes: "Save intakes",
  intakesSaved: (course: string) => `Intakes saved for ${course}`,
  previousYear: "Previous year",
  nextYear: "Next year",
  intakesIn: (year: number) => `Intakes in ${String(year)}`,
  courseAdded: (course: string) => `${course} added`,
  universitySaved: "University saved",
  noUniversities: "No universities yet. Add the first one counsellors can choose from.",
  noMatches: "No universities match.",
  loadFailed: "We couldn't load the Catalogue. Please refresh the page.",
  changeFailed: "We couldn't save the change. Please try again.",
  notAdmin: "Only an Admin can change the Catalogue.",
  intakesEmpty: "Add at least one intake.",
  enterCourseName: "Enter the course's name.",
  courseNameTaken: "This university already has a course with this name.",
  enterUniversityName: "Enter the university's name.",
  // The edit page (issue 92).
  editTitle: (name: string) => `Edit ${name}`,
  editIntro:
    "The university, every course and every intake on one page. Nothing is saved until you press Save.",
  university: "University",
  courses: "Courses",
  archiveUniversity: "Archive university",
  restoreUniversity: "Restore university",
  deleteUniversity: "Delete university",
  archiveCourse: "Archive course",
  restoreCourse: "Restore course",
  deleteCourse: "Delete course",
  undo: "Undo",
  removeNewCourse: "Remove",
  universityArchivedNote: "Archived: hidden when adding applications.",
  courseArchivedNote: "Archived: hidden when adding applications. Past applications keep it.",
  willBeDeleted: "Will be deleted when you save.",
  usedBy: (count: number) => `Used by ${applicationCount(count)}, so it stays archived.`,
  coursesInUseNote:
    "Courses already used by an application can be archived, not removed, so past applications keep their course.",
  deleteCourseTitle: (name: string) => `Delete ${name}?`,
  deleteCourseBody:
    "It is removed from the Catalogue for good when you save. No application uses it.",
  deleteUniversityTitle: (name: string) => `Delete ${name}?`,
  deleteUniversityBody: (courses: number) =>
    `It and its ${courseCount(courses)} are removed from the Catalogue for good. No application uses them. Unsaved changes on this page are dropped.`,
  universityDeleted: (name: string) => `${name} deleted`,
  deleteFailed: "We couldn't delete it. Please try again.",
  saveAll: "Save all changes",
  editSaved: (name: string) => `${name} saved`,
  needsFixing: "Some details need fixing. They are marked below.",
  universityNotFound: "This university isn't in the Catalogue.",
  backToCatalogue: "Catalogue",
  leaveTitle: "Leave without saving?",
  leaveBody: "Your changes on this page will be lost.",
  leave: "Leave without saving",
  keepEditing: "Keep editing",
  newCourse: "New course",
  importButton: "Import from a file",
  importTitle: "Import Catalogue from CSV",
  importIntro: "One row per course. Columns:",
  importSample:
    'university,country,course,level,intakes\nDeakin University,Australia,Master of Data Science,Master,"Mar 2027;Jul 2027"',
  importSampleLabel: "Example of a CSV file",
  importFormatHint:
    "Levels: Bachelor, Master, Diploma, Graduate Certificate or Foundation. Intakes are always AD, separated by semicolons.",
  importFile: "CSV file",
  importMatched:
    "Existing universities and courses are matched by name, so importing again doesn't create duplicates.",
  importSave: "Import",
  importing: "Importing…",
  importNoFile: "Choose a CSV file.",
  importNotCsv: "Choose a .csv file. Save a spreadsheet as CSV first.",
  importEmpty: "The file is empty.",
  importTooBig: "The file is too big. Import at most 400 KB at a time.",
  importUnreadable: "We couldn't read this file. Please choose it again.",
  importFailed: "We couldn't import the file. Please try again.",
  importFinished: "Import finished",
  imported: "Imported",
  alreadyThere: "Already there",
  failed: "Failed",
  failedRows: "Rows that failed",
  row: "Row",
  problem: "Problem",
  fixRows: "Fix these rows and import the file again.",
  noFailures: "No rows failed.",
  done: "Done",
} as const;
