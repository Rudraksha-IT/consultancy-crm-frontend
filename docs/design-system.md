# Design system

Status: draft, from the approved prototype (the product docs' `docs/prototype/first/crm-demo.html`). Revised 2026-11-14 from the prototype approved that day (tickets 67 to 69): sidebar width and swipes, swipe between pages, centred search, the confirm popup, the Activity timeline, money on number cards and the keyboard rule. Revised 2026-11-16 (tickets 94 to 97): the phone breakpoint is 640, and phones follow the new "Phones (640 and below)" section (tab bar, iOS / Material sizes, lean lists, pill filters, bottom sheets, settings pages one section at a time). Revised 2026-11-25 (UI revamp, ticket 03) from the owner-approved prototype `docs/prototype/v2.0.0/journey/` (its `engine/looks.js`, `ivory`, and `engine/polish.css`): one look for every office, the Ivory theme in light and dark, no box around everything (lines and words instead), the Geist font, and a type scale for computers and a tighter one for phones. The office colour feature went on 2026-11-26 (ticket 04): the colour editor, the stored office colours and their API are gone.
Applies to the frontend repository. Terminology follows the glossary (`docs/GLOSSARY.md` in the workspace repository).

The product is used all day by non-technical office staff, often with a Student sitting across the desk. Every rule below serves that: big, calm, one job per screen, and the same look and behaviour everywhere.

## Non-negotiable rules

1. **Components use tokens only.** No hex, rgb or named colours, pixel sizes or shadows written inside a component. Everything comes from the tokens below. CI fails on a raw colour outside the token file.
2. **One theme for every office: Ivory**, light and dark (see Theming). Cream pages and burgundy actions, the colours of a rudraksha bead. Offices no longer choose colours; each person still chooses light or dark.
3. **Status colours are fixed.** Good (green), warning (amber) and problem (red) have one light set and one dark set, so "Rejected" or "Overdue" means the same everywhere. Money and progress bars use the good green.
4. **Readable text is guaranteed, not hoped for.** Every text token reaches WCAG 2.2 AA (4.5:1) on the panel and on the page itself (sections have no box, so most text sits on the page colour). A test checks it; the Ivory caption grey was darkened from the prototype's `#8f847c` to `#766c65` to pass.
5. **Dark mode has its own values.** A warm near-black page (`#121110`) and panel (`#1a1817`), cream text and a soft burgundy accent. It is never a saturated dark blue or brown.
6. **Colour is never the only signal.** Every status also has a word or an icon (for example a "Rejected" chip, an "Overdue" label).
7. **Line icons from one set.** No emoji in the interface.
8. **An action never moves the person.** Approving, saving, deleting, switching a tab, ticking a box or closing a dialog keeps the page where it was: same scroll position, and focus back on the control that was used (or, if it is gone, the nearest control for the same item). Update data in place (React Query cache, local state); never remount the page, reset scroll or navigate for an action that stays on the same page. The same holds inside dialogs and sheets: redrawing a dialog (switching its tabs, ticking, removing an item, coming back after "Are you sure?") keeps each scrolled area where it was. Only opening another page starts at the top. Component tests check that focus stays after the action (product owner, 2026-11-18).
9. **No box around everything** (Ivory, 2026-11-24). One filled button per screen area, for the main action; every other button is words with an icon and no box. Sections are split by space and lines, not cards. Tabs and switches are words with an underline. A status is a dot and a word, never a filled badge. Boxes are only for popups, menus and the fields you type into.

## Tokens

All tokens are CSS custom properties set on `<html>`. Tailwind 4 maps them through `@theme inline`, so classes such as `bg-paper` and `text-ink-2` resolve to tokens.

### Colour (semantic, themed)

| Token                                                                                                          | Used for                                                                                       |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `--paper`                                                                                                      | Panels, dialogs, inputs                                                                        |
| `--canvas`                                                                                                     | Page background                                                                                |
| `--fill`, `--fill-2`                                                                                           | Table headers, hovers, quiet backgrounds, empty progress tracks                                |
| `--rule`, `--rule-2`                                                                                           | Lines between rows (ink 15% light, 17% dark); `rule-2` for inputs                              |
| `--rule-strong`                                                                                                | The line under a section title (2px, ink 55%)                                                  |
| `--ink`, `--ink-2`, `--ink-3`                                                                                  | Main text, secondary text, captions (each at least 4.5:1 on `--paper` and `--canvas`)          |
| `--accent`, `--accent-hover`, `--accent-ink`, `--tint`                                                         | Primary buttons, links, progress, selected items; text on the accent; light accent backgrounds |
| `--side-bg`, `--side-ink`, `--side-muted`, `--side-hover`, `--side-active`, `--side-active-ink`, `--side-rule` | Sidebar                                                                                        |

### Colour (fixed, not themed)

`--good`, `--good-tint`, `--warn`, `--warn-tint`, `--bad`, `--bad-tint`, `--note`, `--note-rule`, and `--gold` (a small mark of value, such as beside a high-priority Student). These have one light set and one dark set (Ivory: good `#3f6b3a` / `#8fbf85`, warning `#94570f` / `#e0a85c`, problem `#9b2226` / `#e88a85`).

### Colour (charts, fixed, not themed)

`--c1` blue `#2a78d6`, `--c2` orange `#eb6834`, `--c3` green `#1baf7a`. Dark mode: `#3987e5`, `#d95926`, `#199e70`. Always used in this order. They passed colour-blind separation checks on white and on the dark panel. Charts never use the theme accent or the status colours for series. A single-series bar list may use `--accent`. Every chart has a legend (two or more series), a hover/focus tooltip with exact values, and a "Show as a table" view. One y-axis only.

### Type

One family: Geist (fallback: system UI). Figures use tabular numbers. Page titles, dialog titles and big figures use weight 500 with slightly tight letter spacing (-0.025em). Bold in the content is at most 600; a task's title is 500. Sizes come from `--size-*` tokens that take their phone values at 640 and below, so components never pick a size per width.

| Role                                   | Computers (above 640) | Phones (640 and below) | Weight |
| -------------------------------------- | --------------------- | ---------------------- | ------ |
| Page title                             | 28 / 34               | 24 / 30                | 500    |
| Section title                          | 17 / 23               | 16.5 / 22              | 600    |
| Dialog title                           | 23 / 29               | 23 / 29                | 500    |
| Page text, table cells                 | 16 / 24               | 15 / 22                | 400    |
| A name in a list (`text-name`)         | 17 / 24               | 16 / 22                | 600    |
| The line under it, chips, small text   | 15 / 22               | 13.5 / 19              | 400    |
| Column heads                           | 14.5 / 20             | 13 / 18                | 500    |
| Buttons (small buttons)                | 15.5 (15)             | 14.5 (14)              | 500    |
| Figures                                | 32 / 40               | 24 / 30                | 500    |
| Email list: the Student's name         | 19                    | 17                     | 650    |
| Configuration › Universities: the name | 21 / 28               | 16 / 22                | 600    |
| Fields you type into (`text-input`)    | 16                    | 16 (iOS never zooms)   | 400    |

Labels never look like their values: a field's label is 15 (13.5 on phones), weight 500, in `--ink-2`.

Sentence case everywhere. No all-caps labels.

### Spacing, size and shape

- **Spacing scale:** 4, 8, 12, 16, 20, 24, 32, 40, 48. Sections are 32 apart; items in a group are 16 apart.
- **Control height:** 44 (buttons, inputs, selects, segmented controls). Small buttons are also 44 tall, with less padding and smaller text. Large primary actions 52. Sidebar items 48. Icon buttons (sidebar collapse, Log out, theme, notifications) are 44 square. A checkbox or radio may draw at 22, but the area that toggles it is at least 44 square (a row checkbox fills its table cell). Link buttons and breadcrumbs are 44 tall too.
- **Table rows:** at least 56. List rows have 20 vertical padding.
- **Radius:** 6 (chips), 8 (controls), 12 (menus), 14 (dialogs).
- **Elevation:** nothing is raised (`--raise` is none: sections have no box); `--lift` for dialogs, menus and popovers only.
- **Row gutter:** rows and table cells have 12 inside (8 on phones), and a section's content is pulled out by the same, so the text lines up with the section title above and a hover shade or a marked row still has room (`--size-gutter`, classes `px-gutter`, `-mx-gutter`).
- **Content width:** 1080 max. Line length under 75 characters for prose.
- **Page margin:** 26 on each side of the page content, beside the sidebar and on tablets (was 40; reduced on 2026-11-14 when the sidebar grew to 300, so the content area keeps the same width). 16 on phones (see Phones). The safe area of a phone with a notch is added on top.

### Lines

- **Under a section title** (the top of its content, `ui/Panel`): 2px at ink 55% (`--rule-strong`), so the title and its rows read apart.
- **Between rows:** 1px `--rule` (ink 15% light, 17% dark).
- **No strong line** under mini tabs or a switch (Transfer requests; Tasks' To do / Given to others / Done), after a toolbar that holds tabs, after figure boxes (Accounts' table under its figures: no second line), or above the Home Pipeline. In code: a Panel right after a tab strip, a toolbar holding one, or a `TileGrid` drops its top line (`globals.css`, "Section lines"); `data-no-line` on a Panel drops it anywhere else.
- **Settings** has no line under its title and no subtitle.

## Components

Build each once in `src/components/ui`, with tests, and reuse them. Screens never restyle a component.

- **Button:** primary (one per screen area, filled burgundy), secondary and ghost (words in `--ink-2` with an icon, no box, a soft fill on hover), danger (red words, no box); sizes small, default and large, all 44 tall; side padding 12 (16 for the main button, 10 small; 14 and 10 on phones); icon-left optional; disabled and loading states. A button in a table row stays in its cell, right-aligned, on computers (Accounts "Details", Employees "Manage", "Send the code again", "Cancel invite").
- **Field:** label always visible, optional hint, error text below. Wraps text, email, tel, date, number, select and textarea.
- **Segmented control:** two to five choices that switch a view (Light/Dark, New/Returning visitor, report picker), drawn as words with an underline: the chosen one in `--ink` over a 2px accent line, the others in `--ink-3`, with a 1px line under the strip. It is a tab strip: it never wraps onto a second line. On phones it fills the width and scrolls sideways (no scrollbar) when the choices don't fit. On every width, when the strip is drawn after a choice, it scrolls so the chosen one is in view, centred where possible, and never jumps back to the first; this happens once per drawing, so a later small update (the clock timer, typing) never moves a strip the person has swiped. Tabs and the settings section strip on tablets follow the same rule. A choice of one value (Attendance: Present / Absent / Late / Leave) fills the width with equal buttons on one line on phones.
- **Tabs:** sections of one record (Student profile), words with an underline like the segmented control; a count is a quiet number after the word, not a pill.
- **Panel:** a section's content for lists, tables and forms, with no box: the strong title line on top (see Lines). A section title sits above the panel, not inside it.
- **Row item:** title (a name, `text-name`), secondary line, right-side actions or status. The standard list row. A marked row (the Chosen Offer) has a 3px good line on its left and a faint good tint.
- **Chip:** status with a 7px dot and a word in the status colour, no filled badge. Colour comes from the status, never from the theme.
- **Progress bar:** 12 high, green (`--good`) whether done or not, with the percentage written next to it.
- **Journey:** Lead → Counselling → Applying → Offer → Visa (Onboarded and Completed are gone). A Granted Visa ticks the last step ("Visa ✓ Granted"); there is no country or plane at the end of the bar. A Lost Student shows the Lost Stage with its reason. For a Student who was ever Lost, a small ⓘ button sits next to the Stage name: on hover, keyboard focus or tap it shows when they were Lost (with the reason) and when they came back. It is a real button (44 target), never hover-only. Across the panel above 640px (scrolling inside its panel if it must, never widening the page). At 640 and below it is a compact horizontal stepper: five dots in a row with the Stage names in 12 under them, never top to bottom. A Stage that can be clicked has a 44 tall target.
- **Note:** fixed note colour with a 3px note line on its left, no outline, always at the top of a Student.
- **Banner:** info, warning or problem message across the page.
- **Figure tile:** label, big number, one-line footnote. No card: figures stand in a row (`TileGrid`) with a line above and below and thin lines between them, never before the first of a row; on phones no side lines. Money: "NPR" is a small label in front of the amount on the same line (smaller, lighter, never wrapped onto its own line); a big number shrinks a little to fit a narrow card rather than touching its edge.
- **Dialog:** title (dialog title size), body, footer with the actions on the right (no fill or line above it). Escape and the close button both close it. Focus goes to the first field. On phones it is a bottom sheet (see Phones).
- **Confirm dialog:** one shared dialog for every delete or remove in the app; nothing is removed without it. The title names the thing ("Remove the Grade 12 Transcript?"), the body says what will happen, and the footer has Cancel and a red button that names the action ("Remove", "Delete", "End session"), never "OK" or "Yes". Focus starts on Cancel; Escape cancels. Where a delete needs a reason (a Document put in the Bin), the reason is asked in the same dialog: quick picks plus "Other" with a text box. Removing a row on an edit page that saves later (Edit details, a University's edit page) needs no popup: the row is only marked, with Undo, until Save.
- **Menu:** the "More" menu for rare actions. Destructive items sit last, in red.
- **Activity timeline:** a vertical line, newest at the top. Each Stage change is a big dot on the line with the Stages in bold ("**Counselling → Lost**") and the reason, if any, on the line underneath. The line between two Stage dots carries the time spent there ("12 days in Counselling"); the top dot says "in Applying for 5 days so far"; one line above the timeline gives the total ("2 months 4 days since they became a Lead"). Other entries (Payments, Note edits, Visits, Emails) are small dots along the line with their time. Lost and Came back (Lost → Counselling) rows get a mild background (a soft red from `--bad`, a soft green from `--good`, a few per cent strength) and a small tag with the word ("Marked Lost", "Came back"), so the colour never stands alone. Screen readers hear the entries in order; reduced motion is respected.
- **Toast:** confirms an action, using the same verb as the button ("Save visit" → "Visit saved").
- **Empty state:** says what is missing and offers the next action.
- **Settings pages:** Configuration (office-wide, Admins only), a person's own Settings, the Platform account and a Student's Edit details show one section at a time, on every width, from one shared section menu. Above 1024 the menu is on the left with only the chosen section beside it. From 641 to 1024 the menu is a sideways strip above the section that keeps the chosen section in view (the segmented-control rule). At 640 and below it is the iOS Settings pattern: the page opens on a list of sections (rows at least 56 tall, with arrows); tapping one shows it alone with "← All of {page}" ("← All sections" on Edit details) above it, and arriving at the page always starts at the list. Configuration's sections are General, Documents, Working hours, Exports and Platform controls (tickets 96, 97; Email and SMS removed 2026-11-19, ADR 0023).
- **Sidebar:** 300 wide when open (was 272; widened 2026-11-14), 80 when collapsed to the icon strip, and min(320, 86% of the screen width) as the slide-out menu on phones and tablets. The office logo (or initials) and name at the top. The name is a label, not a link. A sidebar icon button beside the name collapses the sidebar to an 80px icon strip, and the browser remembers the choice. In the strip, the logo is the button that opens the sidebar again; on hover or keyboard focus it shows the sidebar icon. The bottom of the sidebar shows who is logged in (avatar, name and job title, linking to My account), with a row of icon buttons underneath: My account settings, light/dark, and Log out. The top bar has the search, Settings and notifications (see Top bar). The open page is marked with a line on the left edge in the accent colour (no fill). At 1024px and below, the sidebar becomes a slide-out menu opened from the ☰ button in the top bar (Menu in the tab bar on phones), with an × to close it. On phones the light/dark button sits in this row, since the top bar drops it. It also closes on navigation, on Escape, or by tapping outside it. Swipes are described under Gestures; ☰, × and the collapse button always stay.
- **Top bar:** above 1024, the search box sits centred over the page content area (not the whole window) at its usual width, with the top bar's icon buttons (Settings and notifications) on the right. At 1024 and below, a search line icon (a magnifier, 44 square) opens a full-width search over the top bar, with focus moved into the box and an × to close it; Escape closes it too. Results work the same at every width.
- **Column chart and bar list:** see the chart colours above.

## Gestures

Gestures are extra ways to do what a button already does; every button stays, for the keyboard and screen readers. The gesture rules are pure functions with unit tests (thresholds, direction, starting point, off conditions). With "reduce motion" on, everything snaps or switches without animation. A plain mouse wheel never triggers a gesture; telling a touchpad (small smooth steps) from a mouse wheel (fixed steps) is a best guess, and when unsure nothing happens. The browser's own swipe back and forward is turned off inside the app; the Back button and keyboard shortcuts still work.

- **Sidebar swipe.** On phones and tablets (1024 and below), a finger swipe right from the left edge opens the slide-out menu and a swipe left on it closes it; the menu follows the finger and snaps back if let go less than halfway. On laptops, one two-finger sideways swipe on the touchpad collapses the sidebar to the icon strip (left) or opens it (right), exactly like the collapse button, and the browser remembers it. One gesture changes the sidebar once; continuing or reversing in the same gesture does nothing more, and a new gesture is needed to switch back. A swipe that starts over something that scrolls sideways (a wide table) scrolls it instead.
- **Swipe between pages.** Off unless the person switches it on in their own Settings → Preferences ("Swipe between pages", only for them, on every device; moved from Configuration on 2026-11-17; off at first because pages changed by accident). When on, on the main sidebar pages, pulling past the bottom of the page goes to the next page in that person's own sidebar, and pulling past the top goes to the previous one. The page itself slides with the finger or touchpad like a rubber band (easy at first, firmer further out). The gap it opens is a little darker than the page, the page's moving edge has a soft shadow, and the gap says what will happen: "↓ Keep pulling to go to Students", then "Release to go to Students", with a small bar that fills and turns green (`--good`) when ready. Nothing happens until release; pushing back before release cancels. On release the page slides away in the pulled direction and fades (about 0.2 s), and the new page slides in from the other side and fades in (about 0.3 s). At the first page (Home) the top pull does nothing; at the last page the bottom pull does nothing and shows no hint.
  - Only on purpose: the page must already be resting at the top or bottom for about 0.8 s (was half a second until 2026-11-16) before the gesture starts. A scroll, or its momentum, that runs into the end always stops there and never changes the page; a touch swipe must start while the page is already at the edge; a touchpad gesture is one burst of wheel events, and only a burst that began at the edge can pull. A very long pull passes the threshold: 360 of two-finger scrolling or 480 of finger travel, by which point the rubber-band page has moved about 210 (lengthened on 2026-11-16 from about 80 and again on 2026-11-17 from about 145, because pages still changed by mistake); the page never moves more than 300. One gesture pulls one end only: on a page too short to scroll, going back past where it started cancels instead of pulling the other end. The page and the gap ease after each scroll step (0.15 s) and close together (0.2 s) when let go early. On a short page the page area still fills the screen, so the bottom gap opens at the bottom of the screen, never under the content.
  - Off while editing: a dialog is open, an edit page or the Note is open, there are unsaved changes, or a field has focus. Filter bars do not turn it off. Off on detail pages such as one Student.
  - There is no pull to reload: arriving on a page always loads its data fresh.

## Keyboard

- In any text box of several lines (the Student's Note, reasons in dialogs, the Inbox), Enter makes a new line and Ctrl + Enter (⌘ + Enter on a Mac) saves or submits the form. A small hint beside the Save button says so ("Ctrl + Enter to save"), and the text box is described by it for screen readers. Typing in another language (text composition) never submits.
- Escape cancels editing the Note, as it closes dialogs.
- In the Inbox, Enter sends and Shift + Enter makes a new line.
- One shared hook does this for every multi-line text box; screens never handle these keys themselves.

## Screen sizes

Every screen is checked at 1440, 1024, 820 and 390 pixels wide.

- **Above 1024:** sidebar (300, or 80 collapsed) plus content, max width 1080, with the search centred over the content.
- **1024 and below:** single column with the slide-out menu (opened by ☰ or a swipe from the left edge) and the search icon in the top bar. Two-column layouts stack. Progress rows put the document button beside the name and the bar underneath.
- **640 and below (phones):** everything in the Phones section below. The top bar keeps icons only (search, Settings, notifications) and the tab bar replaces ☰. Lists keep only what matters and every other table shows as cards, never scrolling sideways; only a chart scrolls sideways inside its own panel.
- **Scrollbars are hidden** everywhere (`scrollbar-width: none` and `::-webkit-scrollbar`). Content still scrolls with the wheel, touch and keyboard.
- **Tables fit their panel** (asked 2026-11-17). A list table never scrolls sideways because of a long name: its main text (the Student's name, the university and course, an employee's name and email, a payment's purpose) stays on one line and is cut with "…", with the whole text on hover and for screen readers, while short columns (dates, Status) keep their full width. A table with many columns (Applications and Visas, seven each) keeps every column as a table: the Student, the university or country and the counsellor each get a fixed share of the width and are cut with "…", cells have 12 side padding, and a date or intake may wrap onto two lines when it is tight. Every other table fits too: Reports → Staff Progress cuts the name with "…" and wraps its headings, and a Catalogue card's course table has no minimum width (intakes and documents wrap). Only a chart scrolls sideways, inside its own panel. In code: `DataCell shrinks` (or `shrinks="small" | "medium" | "large"` with `DataTable wraps`; a row heading cell takes `data-shrinks` too) with `OneLine` inside.
- **No horizontal page scroll at any width.** Anything wide scrolls inside its own box: every grid or flex child that holds one has `min-width: 0`, so it can shrink below its content. Touch targets are at least 44px, with no exceptions for "small" sizes.

## Phones (640 and below)

Decided 2026-11-16, after the product owner reviewed the prototype on a phone ("the mobile version is not nice at all and not friendly"). Phones follow the common rules of Apple's Human Interface Guidelines and Google's Material 3, so the app feels native, not like the laptop layout shrunk down. The reference is the phone blocks at the end of the product docs' `docs/prototype/first/crm-demo/styles.css` and the product docs' `docs/prototype/first/crm-demo/mobile.js`. Nothing in this section changes anything above 640, apart from tab strips keeping the chosen tab in view.

### Shell

- **Bottom tab bar:** Home, Students (Classes for a Teacher), Tasks, Inbox and Menu, each only if the person's sidebar has it. Menu opens the slide-out sidebar. Badges show the same counts as the sidebar. The current page has a tinted pill (`--tint`) behind its icon and the accent colour on its word; on pages that aren't in the bar, Menu shows as current. It respects the phone's safe area, and the page leaves room under its content for it.
- **Top bar:** 60 tall, with no ☰ (Menu replaces it) and no light/dark button (it moves to the sidebar's bottom row). Search, Settings and notifications stay.
- **Translucency:** the top bar and the tab bar are slightly see-through (the panel colour at 88%) with a blur behind them.

### Sizes and look

- **Layout:** 16 side margins and an 8 spacing rhythm.
- **Type scale:** one step smaller than on computers (see Type): page text 15, names 16 (Email names 17), sub-lines, chips and small text 13.5, table cells 15, column heads 13, page titles 24, section titles 16.5, Note text 15 / 23, Settings rows 16, buttons 14.5 with 14 side padding (small 14 / 10), figures 24, Pipeline counts 21, a Student's name 22 with a 52 avatar. Fields stay 16. Secondary text uses `--ink-2`.
- **Touch targets:** every tap target is at least 44 tall. Main page actions are 48. Fields are 48 tall with 16 text, so phones never zoom in on them.
- **Sections:** no box, as on computers; the row gutter is 8.
- **Feedback:** everything tappable has a pressed state (a `--fill` background on rows, a slight shrink on buttons).

### Page actions

- The main action is full width on top; the other actions share one row under it.

### Tab strips

- Segmented controls, Tabs and the settings section strip stay on one line, fill the width and scroll sideways (no scrollbar) when they don't fit. The chosen one is kept in view (see Segmented control).
- Attendance (Present / Absent / Late / Leave) is four equal buttons on one line.

### Dialogs

- Dialogs are bottom sheets: full width, rounded top corners (20) and a grab handle.
- The content scrolls; the header and the buttons stay in view. The buttons share the width.
- They rise from the bottom (about 0.2 s), with no animation when reduced motion is on.

### Lists, filters and busy boxes (ticket 95)

- **Filters:** a slim search box on its own line; under it every other filter is a small pill (36 tall, rounded) in one row that scrolls sideways. It never wraps, and the last pill keeps the same gap from the edge as the first. Students' "More filters" are pills too (the name in grey, then the choice). A filter row keeps its sideways position when the list under it redraws.
- **Lists:** a row is the name, one short line under it, one key fact on the right, then an arrow (if the row opens a page) or the row's own button. Everything else is on the page the row opens. Rows are at least 64 tall; checkboxes stay on the left. Each list declares which columns are its line and its fact; nothing is guessed from column headings.
  - Students: Going to · Stage. Applications: the university · Status. Visas: Going to · Visa status. Employees: job title · Manage (two buttons go on their own line). Student fees: progress bar · Still to pay · Details. Payments: Student or what it was for · Amount, with Receipt and Edit on their own line.
- **Every other table** keeps all its columns as cards (column name, then value), never scrolling sideways.
- **Number tiles:** two per row, an odd first tile takes the whole row, no side lines; the small grey line under the number is dropped; numbers shrink to fit. "Waiting on you" tiles are two per row, visa appointments full width.
- **Busy boxes keep only what matters:** Documents (name, only the "to check" and "rejected" chips, "5 of 13", Open checklist); Transfer requests (who asked on one line, the reason on two); Email (name and status, time, the subject line on two lines); Tasks (the task, its Student, the date); Classes (name, time, how many Students, status, Who's in it); the Counsellor's Students' progress (name, Stage, next step, documents button); bar lists (name and amount on one line, the bar under them); Platform Consultancies (name, status, address, paid-until, buttons in a two-column grid); the clock-in card (status and calendar icon on top, Clock in/out full width under them, Work from home beside it).
- **Student page:** the Stage journey is a compact horizontal stepper, the next-step hint is cut to two lines, and fees drop "Added by". **Inbox:** with a conversation open, "New message" is hidden.

### Settings pages (ticket 96)

- At 640 and below, settings pages open on a list of sections and show one section at a time with a back link (see Settings pages under Components).

## Theming

### One theme: Ivory

Every office shows the same theme, Ivory (owner, 2026-11-24): almost white, burgundy only where it matters, the menu part of the page. Each Staff member chooses light or dark for themselves (stored per person); nothing else about the colours is chosen. The office logo still shows in the menu and on the login screens.

| Token                           | Light                                                                                   | Dark                       |
| ------------------------------- | --------------------------------------------------------------------------------------- | -------------------------- |
| `canvas` (page)                 | `#faf8f4`                                                                               | `#121110`                  |
| `paper` (panels)                | `#ffffff`                                                                               | `#1a1817`                  |
| `fill`, `fill-2`                | `#f4f1eb`, `#ece7df`                                                                    | `#211f1d`, `#292624`       |
| `ink`                           | `#1f1916`                                                                               | `#f1e8dd`                  |
| `ink-2`                         | `#625750`                                                                               | `#bcae9f`                  |
| `ink-3`                         | `#766c65`                                                                               | `#8f8174`                  |
| `accent`, hover                 | `#6e1a26`, `#57141e`                                                                    | `#d98a8f`, `#e7a2a6`       |
| `accent-ink`                    | `#ffffff`                                                                               | `#1d1012`                  |
| `tint`                          | `#f3e6e3`                                                                               | `#3a1d1f`                  |
| `rule`, `rule-2`, `rule-strong` | ink 15%, 26%, 55% into the panel                                                        | ink 17%, 27%, 55%          |
| Menu (`side-*`)                 | the page colour, page text, `fill` hover, `fill-2` for the open page, no line beside it | the same from the dark set |

### How it becomes tokens

A pure function `buildThemeTokens()` in `src/lib/theme` returns the `{ light, dark }` token maps (`ivory.ts` holds the values). It is unit-tested. The same values are written in `globals.css` for the first paint, and a test keeps the two equal. The shell writes the tokens onto `<html>` when it loads and again when the person switches light or dark. The function takes nothing: there are no office colours to pass in (removed in ticket 04), and emails use the same burgundy (`#6e1a26`).

### Tests the function must pass

- The Ivory values, light and dark, as in the table above.
- Every text token (`ink`, `ink-2`, `ink-3`, `accent`) at least 4.5:1 on `paper` and on `canvas`; `accent-ink` on `accent`, the menu text on the menu, at least 4.5:1.
- Lines at the documented mixes; every token a six-digit hex, so nothing else can reach the page's CSS.

## Enforcement

- A lint check (a custom ESLint rule or a CI grep) rejects hex/rgb/hsl literals and Tailwind arbitrary colour values outside `src/lib/theme` and `globals.css`.
- A component test renders each `ui` component in Ivory light and Ivory dark.
- New screens are reviewed against this page before merging.
