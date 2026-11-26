/**
 * Clock-in (spec 103-111, issue 56). On screen: "Clock in", "Clock out", "Clock-in" for the
 * Module, "Working hours" for the Admin's view and "My working hours" for one's own month.
 * Never "Attendance", which is for classes.
 */

/** The Working Day, in minutes: 4 to 12 hours in half hours, 8 unless an Admin changes it. */
export const WORKING_DAY = { min: 240, max: 720, step: 30, standard: 480 } as const;

/** How many months back the month pickers offer. */
export const CLOCK_MONTHS_SHOWN = 12;

/** How often the Home clock's timer moves on, in milliseconds. */
export const CLOCK_TICK_MS = 30_000;

/** The office's own time zone: days split at midnight here (spec 106). */
export const OFFICE_TIME_ZONE = "Asia/Kathmandu";

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** The office's weekly days off; values match the API (asked 2026-11-17). Saturday at first. */
export const WEEKLY_OFF_CHOICES = ["saturday", "sunday", "both", "none"] as const;
export type WeeklyOff = (typeof WEEKLY_OFF_CHOICES)[number];

const plural = (count: number, one: string, many: string): string =>
  `${String(count)} ${count === 1 ? one : many}`;

export const CLOCK_TEXT = {
  // The clock in the Home heading
  region: "Clock in and out",
  clockIn: "Clock in",
  clockOut: "Clock out",
  inSince: (time: string) => `In since ${time}`,
  forgotten: (day: string) => `No clock-out on ${day}`,
  adminCanFix: "Your Admin can fix it",
  outAt: (time: string) => `Out at ${time}`,
  today: (duration: string) => `${duration} today`,
  notIn: "Not clocked in",
  clockInWhenYouStart: "Clock in when you start work",
  onNetwork: "Office network",
  offNetwork: "Not a saved office network",
  noNetwork: "No office network set up",
  loadFailed: "The clock couldn't be loaded.",
  clockedIn: (time: string) => `Clocked in at ${time}.`,
  markedNotOut: (day: string) =>
    ` Your session on ${day} is marked Not clocked out. Your Admin can fix it.`,
  clockedOut: (time: string, duration: string) => `Clocked out at ${time}. ${duration} this time.`,
  failed: "That didn't work. Try again.",
  // When the server refuses
  cantYetTitle: "You can't clock in yet",
  notOnNetworkTitle: "Not a saved office network",
  nothingRecorded: "Nothing was recorded. Phones on mobile data can't clock in.",
  nothingRecordedShort: "Nothing was recorded.",
  ok: "OK",
  // My working hours
  myHoursTitle: "My working hours",
  home: "Home",
  myHoursIntro: (month: string) => `Your clock-ins for ${month}.`,
  everyonesHours: "Everyone's hours",
  month: "Month",
  monthLoading: "Loading the month…",
  monthFailed: "The month couldn't be loaded. Try again later.",
  // Figures and the calendar
  daysWorked: "Days worked",
  hours: "Hours",
  aboutADay: (duration: string) => `about ${duration} a day`,
  shortDays: "Short days",
  under: (hours: string) => `under ${hours}`,
  noClockOut: "No clock-out",
  calendarLabel: (month: string) => `Clock-ins, ${month}`,
  dayOff: "Day off",
  holiday: "Holiday",
  notInDay: "Not in",
  noOut: "No out",
  stillIn: "still in",
  noClockOutShort: "no clock-out",
  outMissing: "out: missing",
  corrected: "Corrected",
  shortDay: "Short day",
  legendFull: (hours: string) => `Full day (${hours} or more)`,
  legendLabel: "What the days show",
  corrections: "Corrections",
  daysToCorrect: "Days that can be corrected",
  correct: "Correct",
  correctDay: (day: string) => `Correct ${day}`,
  correctionLine: (day: string, before: string, after: string) => `${day}: ${before} → ${after}.`,
  correctionBy: (by: string, at: string) => `${by}, ${at}`,
  adminHelp: (hours: string) =>
    `Only days that are short of the ${hours} working day, or missing a clock-out, can be opened. Times the clock recorded never change.`,
  staffHelp: "Forgot to clock out, or missed a clock-in? Ask your Admin to correct it.",
  dayLabel: {
    later: (day: string) => `${day}, not yet`,
    dayOff: (day: string) => `${day}, day off`,
    holiday: (day: string, name: string) => `${day}, holiday: ${name}`,
    notIn: (day: string) => `${day}, not in`,
    openToCorrect: ". Open to correct.",
  },
  // Employees → Working hours
  people: "People",
  workingHours: "Working hours",
  show: "Show",
  workingHoursIntro:
    "When everyone started and finished work. Clocking in only works from the office network, except for Admins and on Work from home dates, and no location is recorded.",
  whoIsIn: "Who's in now",
  byMonth: "Hours by month",
  inNowCount: (count: number, of: number) => `${String(count)} of ${String(of)}`,
  areClockedIn: " are clocked in now",
  leftAt: (time: string) => `Left at ${time}`,
  notInToday: "Not in today",
  inNowGroup: "In now",
  leftTodayGroup: "Left today",
  groupLabel: (title: string, count: number) => `${title}, ${String(count)}`,
  sinceTime: (time: string) => `since ${time}`,
  atTime: (time: string) => `at ${time}`,
  nobodyInGroup: "No one",
  seeMonth: "Month",
  seeDays: "See days",
  hasLeft: "(left)",
  employee: "Employee",
  averageDay: "Average day",
  teamFoot: (month: string, hours: string) =>
    `${month}. The working day is ${hours}. Days split at midnight, Nepal time.`,
  noOne: "Nobody works here yet.",
  networkOn: "On the office network",
  networkOff: "This network isn't saved as an office network.",
  networkNone: "Your Admin hasn't added the office network yet",
  personMonth: (name: string, month: string) => `${name}, ${month}`,
  done: "Done",
  // Correcting a day
  dayTitle: (name: string, day: string) => `${name}, ${day}`,
  missing: "A clock-out is missing.",
  workedOf: (worked: string, hours: string) => `Worked ${worked} of the ${hours} working day.`,
  noClockIn: "No clock-in on this working day.",
  sessionLine: (start: string) => `In ${start}, `,
  outLine: (end: string) => `out ${end}`,
  recordedByClock: "Recorded by the clock",
  setClockOut: "Set clock-out",
  addMissedTime: "Add missed time",
  upTo: (left: string, hours: string) => `Up to ${left}, so the day reaches ${hours}.`,
  neverChanged:
    "Times the clock recorded can't be changed. You can only add time that's missing, and never past the working day.",
  backToMonth: "Back to the month",
  setTitle: (name: string) => `Set the clock-out for ${name}`,
  addTitle: (name: string) => `Add missed time for ${name}`,
  correctionIntro: (day: string, first: string) =>
    `${day}. The correction is kept with your name and the reason, and ${first} sees it on their month.`,
  clockedInField: "Clocked in",
  clockedInValue: (time: string) => `${time}, recorded by the clock`,
  clockedOutField: "Clocked out",
  from: "From",
  to: "To",
  why: "Why are you correcting it?",
  whyPlaceholder: "For example, forgot to clock out, left at 5:30 PM",
  required: "Required.",
  back: "Back",
  save: "Save correction",
  saved: "Correction saved",
  enterTime: "Enter the time.",
  sayWhy: "Say why you're correcting it.",
  // Configuration → Working day
  workingDay: "Working day",
  workingDayHelp:
    "How long a full day is. A day shorter than this shows as a short day, and an Admin can only add missing time up to it.",
  hoursInADay: "Hours in a working day",
  hoursHint: "Between 4 and 12, in half hours.",
  hoursSuffix: "hours",
  hoursRefused: "Enter between 4 and 12 hours, in half hours.",
  saveWorkingDay: "Save",
  workingDaySaved: (hours: string) => `The working day is now ${hours}`,
  workingDayChange: (from: string, to: string) => `Changed the working day from ${from} to ${to}`,
  workingDayLoadFailed: "The working day couldn't be loaded. Try again later.",
  workingDaySaveFailed: "The working day couldn't be saved. Try again.",
  days: (count: number) => plural(count, "day", "days"),
  // Working hours → Weekly days off (asked 2026-11-17)
  weeklyOff: "Weekly days off",
  weeklyOffHelp:
    "The days the office closes every week. Like holidays, they never count as not in or a short day, and anyone who works can still clock in.",
  weeklyOffLabels: {
    saturday: "Saturday",
    sunday: "Sunday",
    both: "Saturday and Sunday",
    none: "None",
  } satisfies Record<WeeklyOff, string>,
  weeklyOffSaved: (days: string) => `Days off are now ${days}`,
  weeklyOffSaveFailed: "The days off couldn't be saved. Try again.",
  noWeeklyOff: "No weekly days off now",
  dayClosed: "Closed",
  dayOpen: "Open",
} as const;

/** Configuration → Holidays (asked 2026-11-16). */
export const HOLIDAY_TEXT = {
  title: "Holidays",
  help: "Days the office is closed. They never count as a short day or as not in, and anyone who works can still clock in.",
  listLabel: "Holidays",
  none: "No holidays yet.",
  loading: "Loading holidays…",
  loadFailed: "The holidays couldn't be loaded. Try again later.",
  saveFailed: "The holiday couldn't be saved. Try again later.",
  calendarLabel: "Choose the days on the calendar",
  calendarHelp: "Tap each day the office is closed, for example every day of Dashain.",
  chooseBy: "How to choose",
  chooseByDays: "Days",
  chooseByRange: "From – to",
  tapFirst: "Tap the first day.",
  tapLast: "Now tap the last day.",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  isHoliday: (day: string, name: string) => `${day}, ${name}`,
  chosen: (count: number) => `${String(count)} ${count === 1 ? "day" : "days"} chosen`,
  nameLabel: "Name",
  namePlaceholder: "For example, Dashain",
  chooseDay: "Choose the days on the calendar.",
  enterName: "Give the holiday a name.",
  add: "Add holiday",
  added: (name: string, days = 1) =>
    days === 1 ? `${name} added` : `${name} added on ${String(days)} days`,
  remove: "Remove",
  removeFor: (name: string) => `Remove ${name}`,
  removeTitle: (name: string) => `Remove ${name}?`,
  removeBody: (day: string) => `${day} will count as an ordinary working day again.`,
  removed: (name: string) => `${name} removed`,
  removeFailed: "The holiday couldn't be removed. Try again later.",
} as const;
