/** The test a Batch prepares for; values match the API's `test_type`. */
export const TestType = {
  Ielts: "ielts",
  Pte: "pte",
  Toefl: "toefl",
  Duolingo: "duolingo",
  Japanese: "japanese",
  Sat: "sat",
} as const;

export type TestType = (typeof TestType)[keyof typeof TestType];

export const TEST_TYPES = Object.values(TestType);

export const TEST_TYPE_LABELS: Record<TestType, string> = {
  ielts: "IELTS",
  pte: "PTE",
  toefl: "TOEFL",
  duolingo: "Duolingo",
  japanese: "Japanese (NAT/JLPT)",
  sat: "SAT",
};

/** Where a class stands against today, as the API works it out in the office's time zone. */
export const BatchTiming = {
  Upcoming: "upcoming",
  Running: "running",
  Finished: "finished",
} as const;

export type BatchTiming = (typeof BatchTiming)[keyof typeof BatchTiming];

export const BATCH_TIMINGS = Object.values(BatchTiming);

/** A Student's Attendance on one class day; values match the API's `mark` (GLOSSARY). */
export const AttendanceMark = {
  Present: "present",
  Absent: "absent",
  Late: "late",
  Leave: "leave",
} as const;

export type AttendanceMark = (typeof AttendanceMark)[keyof typeof AttendanceMark];

/** In the order a Teacher picks them. */
export const ATTENDANCE_MARKS = Object.values(AttendanceMark);

export const ATTENDANCE_MARK_LABELS: Record<AttendanceMark, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  leave: "Leave",
};

/** The fixed status colour each mark is shown in, always beside its word. */
export const ATTENDANCE_MARK_TONES = {
  present: "good",
  absent: "bad",
  late: "warn",
  leave: "accent",
} as const satisfies Record<AttendanceMark, string>;

/** The longest name and time slot the API accepts. */
export const BATCH_NAME_MAX_LENGTH = 80;
export const BATCH_TIME_SLOT_MAX_LENGTH = 40;

/** Which view the Classes section shows. */
export const ClassesTab = { Classes: "classes", Students: "students" } as const;

export type ClassesTab = (typeof ClassesTab)[keyof typeof ClassesTab];

const studentCount = (count: number) => (count === 1 ? "1 Student" : `${String(count)} Students`);

/** Batches are shown as "classes" everywhere on screen (GLOSSARY). */
export const BATCH_TEXT = {
  title: "Classes",
  intro: "Test-prep classes. They run Sunday to Friday.",
  teacherIntro: "The classes you teach.",
  newClass: "New class",
  enroll: "Enroll a Student",
  editTitle: "Edit class",
  editClass: "Edit class details",
  create: "Create class",
  save: "Save",
  saved: "Class saved",
  name: "Name",
  namePlaceholder: "e.g. IELTS Morning",
  testType: "Test type",
  teacher: "Teacher",
  noTeachers: "Add a Teacher on the Employees page first.",
  timeSlot: "Time slot",
  timeFrom: "From",
  timeTo: "To",
  timeSlotWas: (old: string) => `It was "${old}". Choose the times again.`,
  starts: "Starts",
  ends: "Ends",
  startsOn: (date: string) => `Starts ${date}`,
  running: "Running",
  finished: "Finished",
  dates: (from: string, to: string) => `${from} to ${to}`,
  studentCount,
  whosInIt: "Who's in it",
  /** Read after "Who's in it" by screen readers, naming the class. */
  whosInItOf: (name: string) => `: ${name}`,
  noClasses: "No classes yet.",
  teacherNoClasses: "You don't teach any classes yet.",
  nobodyInClass: "Nobody in this class yet.",
  nobodyEnrolled: "Nobody is in a class yet.",
  noClassesYet: "No classes yet",
  attended: (percent: number) => `Attended ${String(percent)}%`,
  remove: "Remove",
  /** Read after "Remove" by screen readers. */
  removeStudent: (name: string) => `${name} from the class`,
  removeTitle: (student: string, batch: string) => `Remove ${student} from ${batch}?`,
  removeBody: "Their attendance so far stays in the class record.",
  removed: "Removed from the class",
  removeFailed: "We couldn't remove them. Please try again.",
  noMatches: "No Students match.",
  add: "Add",
  /** Read after "Add" by screen readers. */
  addStudent: (name: string) => `${name} to the class`,
  findStudent: "Find a Student",
  findStudentPlaceholder: "Type a name or phone",
  chooseStudent: "Choose a Student",
  chooseStudentFirst: "Choose a Student from the list.",
  added: (student: string, batch: string) => `${student} added to ${batch}`,
  enrollTitle: "Enroll a Student in a class",
  enrollButton: "Enroll",
  student: "Student",
  class: "Class",
  classWithSlot: (name: string, slot: string) => `${name} (${slot})`,
  enrolled: (student: string, batch: string) => `${student} enrolled in ${batch}`,
  noClassToEnroll: "Create a class first.",
  done: "Done",
  show: "Show",
  tabClasses: (count: number) => `Classes ${String(count)}`,
  tabStudents: (count: number) => `Students and their classes ${String(count)}`,
  classesHeading: "Classes",
  attendedHeading: "Attended",
  noAttendance: "No classes yet",
  attendedOfClasses: (percent: number) => `Attended ${String(percent)}% of classes`,
  allClasses: "All classes",
  addStudents: "Add Students",
  students: "Students",
  withTeacher: (slot: string, teacher: string) => `${slot} with ${teacher}`,
  notFound: "Class not found.",
  listFailed: "We couldn't load the classes. Please try again.",
  classFailed: "We couldn't load this class. Please try again.",
  enrolledFailed: "We couldn't load who is in which class. Please try again.",
  teachersFailed: "We couldn't load the teachers. Please try again.",
  classesCount: (count: number) => (count === 1 ? "1 class" : `${String(count)} classes`),
  studentsCount: studentCount,
  attendance: "Attendance",
  day: "Day",
  chooseDay: (from: string, to: string) => `Choose a day from ${from} to ${to}.`,
  loadingDay: "Loading the day…",
  saving: "Saving…",
  saturday: "This is a Saturday. There's usually no class.",
  marksFor: (name: string) => `Attendance for ${name}`,
  notMarked: "Not marked",
  everyonePresent: "Everyone is present",
  saveAttendance: "Save attendance",
  attendanceSaved: (day: string) => `Attendance saved for ${day}`,
  onlyTeacherOrAdmin: "Only this class's teacher or an Admin can take attendance.",
  dayFailed: "We couldn't load this day's attendance. Please try again.",
  saveFailed: "We couldn't save the attendance. Please try again.",
  classesToday: "Your classes today",
  noClassesToday: "No classes today.",
  takeAttendance: "Take attendance",
  attendanceDone: "Attendance done",
  view: "View",
  classesAttended: "classes attended",
  noShare: "—",
  percent: (percent: number) => `${String(percent)}%`,
  studentClassesFailed: "We couldn't load this Student's classes. Please try again.",
  /** E.g. "Last 4 class days: 1 present, 1 late, 1 absent, 1 not marked". */
  recentDays: (count: number, parts: readonly string[]) =>
    `Last ${count === 1 ? "class day" : `${String(count)} class days`}: ${parts.join(", ")}`,
  markCount: (count: number, word: string) => `${String(count)} ${word}`,
} as const;
