/** Fees by type and one Fee Type's Students (spec 79-93; GLOSSARY: Fee Type, Balance, Lost). */

const students = (count: number) => (count === 1 ? "1 Student" : `${String(count)} Students`);

export const FEES_BY_TYPE_TEXT = {
  title: "Fees by type",
  intro:
    "Where the money comes from, for all time. To collect is what has been received plus what Students still have to pay.",
  home: "Home",
  failed: "We couldn't load Fees by type. Please refresh the page.",
  toCollect: "To collect",
  receivedPlusRemaining: "Received plus Remaining",
  received: "Received",
  everyPayment: "Every Payment, all time",
  remaining: "Remaining",
  haveFeesLeft: (count: number) =>
    count === 1 ? "1 Student has fees left to pay" : `${students(count)} have fees left to pay`,
  byFeeType: "By Fee Type",
  feeType: "Fee Type",
  feesAdded: "Fees added",
  total: "Total",
  hidden: "Hidden",
  nothingYet: "No Fees or Payments yet.",
  oneBalance:
    "What a Student still has to pay is one amount for all their fees together: money paid for one Fee Type also counts toward the others, so Remaining is shown only in total.",
  lostLeftOut: (notCounted: string | null) =>
    notCounted === null
      ? "Lost Students are left out of Remaining; what they paid still counts in Received."
      : `Lost Students are left out of Remaining (${notCounted} not counted); what they paid still counts in Received.`,
  // The Admin's Home card.
  seeByType: (count: number) =>
    `${count === 1 ? "1 Student owes" : `${students(count)} owe`} money. See it by Fee Type`,
} as const;

export const FEE_TYPE_STUDENTS_TEXT = {
  backToAll: "Fees by type",
  intro: (name: string, isHidden: boolean) =>
    `Every Student with a Fee or Payment for ${name}, for all time, most left to pay first.${
      isHidden ? " This Fee Type is hidden, so it isn't offered for new Fees and Payments." : ""
    }`,
  notFound: "We couldn't find this Fee Type.",
  failed: "We couldn't load this Fee Type's Students. Please refresh the page.",
  students: "Students",
  student: "Student",
  fee: "Fee",
  paidForIt: "Paid for it",
  stillToPayAll: "Still to pay, all fees",
  paidInFull: "Paid in full",
  nobodyCounted: "Nobody is counted here.",
  count: students,
  openToAct: "Open a Student to see their Fees tab.",
  wholeBalance:
    '"Still to pay" is the Student\'s whole balance (all fees minus all payments), so money paid ahead for one Fee Type is already taken off.',
  lostTitle: "Lost, not counted",
  lostIntro:
    "These Students stopped their process. What they paid counts in Received; what they still had to pay is left out of Remaining.",
  lost: "Lost",
  leftNotCounted: "Left, not counted",
} as const;
