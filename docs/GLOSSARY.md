# Consultancy CRM

A CRM for education (study-abroad) consultancies. Every tenant is an education consultancy; other kinds of consultancy are out of scope.

## Language

### People and access

**Consultancy**:
An education consultancy business that helps students study abroad, and the customer of this product. Each Consultancy's data is fully separate from every other's. All offices of one business belong to the same Consultancy.
_Avoid_: Agency, company, client (ambiguous), organisation; "tenant" is acceptable only in technical discussion

**Consultancy Status**:
Where a Consultancy is with us as a customer, set by a Platform Admin with a reason: Evaluation (a trial with an end date), Active (paid), Past due or Suspended (read-only: Staff can look but not change), or Terminated (blocked for good, data kept). It decides what its Staff can do.
_Avoid_: Plan, subscription state, tenant status (outside technical discussion), deactivated

**Central login**:
The shared login address where a Staff member types their email and is emailed links to the offices they belong to.
_Avoid_: Tenant lookup, SSO, login portal

**Staff**:
A person who works for a Consultancy and logs in to the product. Each Staff member belongs to exactly one Consultancy and has exactly one Role.
_Avoid_: User (ambiguous), employee, member

**Role**:
One of a fixed set of job types that decides what a Staff member can see and do: Admin, Counsellor, Front Desk or Teacher. The same for every Consultancy. Admins can also be Assigned Counsellors.
_Avoid_: Permission group, profile

**Assigned Counsellor**:
The single Counsellor responsible for a Student. Only the Assigned Counsellor or an Admin may change that Student.
_Avoid_: Owner, handler, case officer

**Transfer**:
Handing a Student from one Assigned Counsellor to another, after which only the new Counsellor (and Admins) may change the Student.
_Avoid_: Reassign, handover

**Transfer Request**:
A Counsellor's request, with a reason, to take over a Student assigned to someone else (or to no one). The current Assigned Counsellor or an Admin approves or declines it (Admin or Front Desk for an unassigned Student); approving makes the Transfer. At most one is waiting per Student.
_Avoid_: Claim, handover request, transfer ticket

**Platform Admin**:
A member of the team that runs this product. Platform Admins create Consultancies and choose which Modules each one has, and they are not Staff of any Consultancy.
_Avoid_: Super admin, base tenant, root user

**Module**:
A feature area of the product that a Platform Admin can switch on or off for a Consultancy: Batches, Communication, Accounts, Reports or Clock-in. Switching a Module off hides its data; it never deletes it. Shown to Platform Admins as "Features".
_Avoid_: Feature flag, plugin, add-on

**Support Access**:
A Platform Admin opening a Consultancy as themselves (never through a Staff account), with a recorded reason, to investigate or fix a problem. They can do everything an Admin can plus Module switches, Staff password resets and sign-outs, and a data export. Viewing is not shown to the Consultancy; any change appears in its History under the Platform Admin's own name, marked Platform Admin. Shown as "Open as Platform Admin".
_Avoid_: Impersonation, log in as, act as, backdoor

**Invite**:
How a new Staff member joins: an Admin adds them, they receive a 6-digit Code by email, enter it, and choose their own password. Until then they are shown as invited.
_Avoid_: Sign-up, registration, activation link

**Code**:
A 6-digit one-time number sent by email to join a Consultancy or reset a password. Valid for 30 minutes and only on that Consultancy's address (a Platform Admin's reset Code only on the Platform address).
_Avoid_: OTP (in the interface), token, PIN

**Two-step login**:
After the password, a 6-digit number from the person's authenticator app (such as Google Authenticator or 1Password), or a Recovery code. Shown as "Two-step login"; `two_factor` in code. Platform Admins switch their own on and off; for Staff, an Admin switches it on or off for each person, and a Staff member may switch their own on.
_Avoid_: 2FA, MFA, OTP (in the interface), second factor

**Recovery code**:
One of 10 single-use codes shown once when Two-step login is set up, used in place of the number when the phone is lost.
_Avoid_: Backup code, Code (that's the emailed one)

**Configuration**:
The Consultancy's own settings, managed by Admins: date display, Document Types and requirements, email and SMS accounts, logo, Office Networks and Export Records. Different from a Staff member's personal Settings (their details, password and notifications).
_Avoid_: Office settings, admin settings (for this page)

**Office Network**:
An internet address (or small range) of the Consultancy's own office connection, added by an Admin in Configuration. Clock-in only works from an Office Network, except for Admins and on a Staff member's Work From Home dates.
_Avoid_: Office wifi (in code), whitelist, allowed IP, trusted network

**Work From Home**:
Dates, approved or set by an Admin, on which one Staff member may clock in from any network. Asked for by the Staff member with a reason, or set directly by an Admin; it may have no end date. Days worked this way are labelled "Home" in Working hours.
_Avoid_: WFH (on screen), remote access, exemption

**Work Session**:
One stretch of work by a Staff member, from clocking in to clocking out, taken from the server clock. A session left open is marked "not clocked out" at the next clock-in. Only an Admin can correct a day, with a reason, and only when it is short of the Working Day or missing a clock-out; recorded times never change. Shown as "Clock in" and "Clock out"; the Module is shown as "Clock-in", and the Admin's view is "Working hours" under Employees. Not Attendance, which is for Batches.

**Working Day**:
How long a full day of work is for the office (8 hours unless an Admin changes it in Configuration). A day under it is a short day, and corrections can never go past it.
_Avoid_: Shift, work hours (as a setting name)

**Weekly days off**:
The days the office closes every week: Saturday unless an Admin chooses Sunday, Saturday and Sunday, or None (Working hours, 2026-11-17). Like a Holiday, a day off is never "not in" or short and can't be corrected; it shows as "Day off". In code: `weekly_off`, and a day's `day_off`.
_Avoid_: Weekend (offices in Nepal close on Saturday only), rest day
_Avoid_: Attendance (reserved for Batches), shift, timesheet, check-in

**Export Record**:
The permanent record of one CSV export: who made it, which list, its filters, how many rows, and when. Listed in Configuration.
_Avoid_: Download log, audit log

**Theme**:
A Consultancy's colours (page, sidebar and accent, with separate dark-mode choices), from which every screen colour is derived. Chosen only by a Platform Admin, on the Platform; not part of Configuration. Each Staff member separately chooses light or dark.
_Avoid_: Skin, branding (alone)

**Staff Progress**:
What one Staff member has done for Students over a chosen period, as counts and a day-by-day list of their actions. Shown as the "Progress" tab on their page under Employees. Not the progress of a Student through their Stages.
_Avoid_: Performance, staff activity log, work report, tracking

### Catalogue

**University**:
An institution a Consultancy sends Students to, identified by name and country. Each Consultancy keeps its own list.
_Avoid_: Institution, college, school

**Course**:
A study programme at a University, with a level (e.g. Bachelor, Master, Diploma) and the Intakes it runs in.
_Avoid_: Program, programme

**Intake**:
A start period for a Course (e.g. Feb 2027).
_Avoid_: Session, semester, term

### Students

**Student**:
A person who has engaged with a Consultancy, from first enquiry onward. One record per person for their whole history, including people who only attend test-prep classes.
_Avoid_: Lead (as a separate entity), customer, client, applicant

**Lead**:
The earliest Stage of a Student: someone who has enquired but not yet committed to the Consultancy's service. Not a separate record. Shown to Front Desk as a "new visitor".
_Avoid_: Enquiry, prospect

**Visit**:
One time a Student came to the office, logged by Front Desk as New (their first visit) or Follow-up, with its purpose.
_Avoid_: Walk-in (that's a Source), appointment, check-in

**Source**:
How a Student first came to the Consultancy: Walk-in, Phone call, Facebook, Website, Referral, Sub-agent, Event/Fair or Other.
_Avoid_: Channel, origin, lead source

**Sub-agent**:
An outside agent who refers Students to the Consultancy. For now, recorded only as a name on a Student whose Source is Sub-agent.
_Avoid_: Partner, referrer, agent

**Stage**:
Where a Student currently is in their overall journey with the Consultancy. One of: Lead, Counselling, Applying, Offer, Visa, Lost. Lead, Counselling and Lost are set by staff; Applying, Offer and Visa follow from the Student's Applications, Offer Letters and Visas. Test-prep-only Students stay in Counselling.
_Avoid_: Status (reserved for Applications and Visas), Onboarded, Completed

**Offer**:
The Stage that starts when a Student's first Offer Letter is added. The Student chooses one Offer Letter here and the Visa and Statements Documents are prepared, until a Visa is applied for.
_Avoid_: Accepted, deposit stage

**Lost**:
The Stage of a Student who has stopped pursuing the Consultancy's services, always recorded with a reason. A visa refusal is not Lost; it returns the Student to Offer, or to Counselling if they have no offers left.
_Avoid_: Dead, closed, inactive

**Application**:
One Student's application to one Course at one University for one Intake. A Student may have several Applications at once, but goes ahead with only one Chosen Offer at a time.
_Avoid_: Admission, file, case

**Application Status**:
Where an Application currently is. One of: Applied (set by hand when it is sent), Offer (set by adding an Offer Letter) or Rejected (set by hand). An offer the Student does not take stays Offer.
_Avoid_: Application stage, Draft, Withdrawn

**Offer Letter**:
A University's offer on one Application, Conditional or Unconditional, uploaded as a Document linked to that Application. Adding one makes the Application's Status Offer.
_Avoid_: Admission letter, acceptance

**Chosen Offer**:
The one Offer Letter a Student decides to go ahead with. Only one at a time; it decides which Country's Visa and Statements Documents the Student needs.
_Avoid_: Accepted offer, final offer, selected application

**CoE**:
The confirmation of enrolment a University issues after the deposit, kept as a Document in the Visa group. Covers the country-specific equivalents (CoE, I-20, CAS).
_Avoid_: I-20, CAS, enrolment letter (as separate terms)

**Visa**:
One visa application by a Student, for their Chosen Offer, that has been sent to the embassy. A Student may have several Visas over time. Biometrics, medical and interview are dates on a Visa, not Statuses.
_Avoid_: Visa file, visa case

**Visa Status**:
Where a Visa currently is. One of: Applied, Granted or Refused; set by hand, or by uploading the visa letter and choosing Granted or Refused. A Granted Visa is the end of the Student's journey; Refused returns them to Offer, or to Counselling if they have no offers left.
_Avoid_: Lodged, Preparing, Completed

**Document**:
One or more files belonging to a Student, of one Document Type, optionally tied to a specific Application or Visa (e.g. an offer letter or visa grant). A passport's front and back pages are one Document; its Verification covers all its files together.
_Avoid_: File (for the whole Document), attachment, upload

**Document Type**:
A kind of Document a Consultancy expects from Students (e.g. Passport, Transcript, IELTS Score Card). A Document Type is either needed by every Student, or asked for only through a Document Requirement. In Configuration the two kinds are shown as "Always needed" and "Extra documents" (not the Student page's "Other documents", which are older uploads no longer on the checklist).
_Avoid_: Category, checklist item

**Document Requirement**:
A Document Type asked for by a Country, a Course or one Student, on top of those every Student needs, placed in one Document Group. A Country's requirements apply through the Student's Applications, or through their preferred country before they have any. A Student's checklist is the needed-by-everyone Document Types plus every Document Requirement that applies to them.
_Avoid_: Extra document, custom checklist

**Document Group**:
Which step of the journey a Document is needed for: Applying (the University application), Visa (the visa lodgement) or Statements (a Country's own written statements, such as Australia's GS or Canada's SOP). Set per Country, starting from the Document Type's usual group.
_Avoid_: Category, phase, section

**Bin**:
Where a Document waits, unusable, after a non-Admin asks for it to be deleted with a reason. An Admin either deletes it for good or restores it; the person who asked may take it back out before then. An Admin's own deletions skip the Bin.
_Avoid_: Trash, recycle bin, deletion request, removal request

**Verification**:
The Assigned Counsellor's (or an Admin's) judgment on a Document: Pending, Verified, or Rejected with a reason. A Rejected Document must be replaced.
_Avoid_: Approval, review

**Task**:
A piece of work with a due date and a priority (High, Normal or Low), assigned to one Staff member, usually about a Student (e.g. "Call Sita about her IELTS score by Friday"). A Task someone gives themselves can be "Only me": nobody else sees it and it has no Student.
_Avoid_: Reminder, to-do, follow-up

**Note**:
A single, editable piece of free text on a Student holding whatever is worth knowing at a glance. There is one Note per Student, and adding information means editing it.
_Avoid_: Summary, remarks, comments

**Payment**:
Money received from a Student, always recorded with what it was for (e.g. PTE class fee, application processing fee).
_Avoid_: Transaction, fee, invoice

**Fee**:
An amount a Student is expected to pay for one service (e.g. Visa processing NPR 40,000).
_Avoid_: Charge, invoice, price

**Balance**:
What a Student still owes: their total Fees minus their total Payments. Always calculated, never typed in.
_Avoid_: Due, outstanding (as separate fields)

**Expense**:
Money the Consultancy pays out (e.g. office rent, salaries, marketing), recorded with a category, who it was paid to and the method.
_Avoid_: Cost, spending, bill

**Commission**:
Money a University pays the Consultancy for a Student who enrols. Its status is Waiting for enrolment, Claim sent or Received.
_Avoid_: Referral fee, bonus, incentive

**History**:
The automatically recorded trail of important changes to a Student: Payment changes, Stage changes, Note edits and Transfers. Staff never write History themselves.
_Avoid_: Log, audit log, activity

### Communication

**Email & SMS**:
An email or SMS sent to a Student from the Consultancy's own accounts. Email comes first wherever both are offered.
_Avoid_: Messages (ambiguous with Inbox), outreach, notifications

**Inbox**:
Where one Staff member writes one-to-one to another Staff member of the same Consultancy. Never reaches Students, and never crosses into another Consultancy.
_Avoid_: Chat, messages, DMs, staff messages

### Test preparation

**Batch**:
A group of Students taking a test-prep course together: one test type (e.g. IELTS, PTE), one Teacher, a daily time slot and start and end dates. Shown to Staff as a "class" (e.g. "IELTS Morning"); in code and documents it stays Batch.
_Avoid_: Course (reserved for University courses), group

**Attendance**:
A Teacher's daily record of each Student in a Batch: Present, Absent, Late or Leave.
_Avoid_: Roll call, check-in
