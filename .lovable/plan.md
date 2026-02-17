
# Redesign Drag-to-Fill as "Hour Block" System

This redesign replaces the current cell-by-cell drag fill with a visual block-based hour entry system.

---

## Concept

When a user drags across multiple day cells in a project row, instead of auto-filling 8 hours per cell, a **floating rounded-rectangle block** appears spanning those cells. The block:
- Uses the discipline's color scheme (rounded corners, colored background)
- Has no initial value -- prompts user to type a total
- Displays the total hours centered on the block
- On single-click, opens a dropdown dialog with individual day inputs for hour distribution

---

## Implementation Steps

### 1. New Data Structure: Hour Blocks

Create a new component `src/components/panels/HourBlock.tsx` that represents a contiguous block of hours across multiple days for one project row.

A block is defined by:
- `projectId`, `startDate`, `endDate` (contiguous range)
- `totalHours` (user-entered)
- `distribution`: record of date -> hours (for manual per-day breakdown)

### 2. Rework Drag State in PersonalSchedule

Replace the current `dragState` (which stores a fill value) with a new model:
- On mousedown on an empty cell, begin tracking a drag range (start column index, current column index) within one project row
- On mouseup, create an "hour block" spanning those columns
- Immediately show an inline input on the block for the user to type the total hours
- Once total is entered (Enter or blur), distribute hours evenly across the days and persist to the database

### 3. Hour Block Visual Component (`HourBlock.tsx`)

- Rendered as an absolutely-positioned rounded rectangle overlaying the day cells it spans
- Background color from the discipline color palette (with opacity)
- Border using the discipline border color
- Displays total hours centered
- On single-click: opens a Popover (using Radix Popover) anchored to the block, containing N input fields (one per covered day) pre-filled with the current distribution
- User can adjust individual day values; the total updates accordingly
- On closing the popover, persists all values to the database

### 4. Modify HourCell for Block Awareness

- HourCell still handles individual cell clicks for single-day edits
- Cells that are part of a block show as "covered" (the block overlay handles display)
- Drag handlers remain but now create blocks instead of filling values

### 5. Block Detection from Existing Data

To render blocks from persisted data, we need to detect contiguous runs of hours for the same project within a week. Logic:
- Scan each project row's days left-to-right
- Group consecutive days that have hours > 0 into a "block"
- Render each group as an HourBlock overlay
- Individual cells with hours that aren't part of a contiguous run render normally via HourCell

### 6. Block Distribution Dialog

The popover that appears on block click contains:
- A header showing the date range (e.g., "Mon 3 - Wed 5")
- N input boxes labeled with day names, each editable
- A "Total" display that sums the inputs in real-time
- Changes are saved on blur/close, persisting each day's value individually to the hours table

---

## Technical Details

### Files to Create
- `src/components/panels/HourBlock.tsx` -- The floating block component with popover

### Files to Modify
- `src/components/panels/PersonalSchedule.tsx` -- Replace drag-fill logic with block creation; add block detection and rendering with relative positioning on project rows
- `src/components/panels/HourCell.tsx` -- Simplify: remove drag highlight styling for cells covered by blocks; keep single-cell click-to-edit for non-block cells

### Positioning Strategy
- Each project row (the 7-day cell area) gets `position: relative`
- Hour blocks are `position: absolute` overlays calculated from grid column positions
- Block left/width derived from which day columns it spans (each column is `1fr` within the 7-column area)

### Data Flow
1. User drags across cells -> creates a temporary block (no value yet)
2. User types total hours into the block's inline input -> distributes evenly, persists via `handleHourChange` for each date
3. User clicks existing block -> popover opens with per-day inputs -> edits persist on close
4. Blocks are reconstructed from `hoursMap` data on each render by detecting contiguous non-zero runs
