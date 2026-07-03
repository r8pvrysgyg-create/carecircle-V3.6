# CareCircle v3.9 Release Notes

## New features

- Maple Ridge pickup end time automatically defaults to 30 minutes after pickup start.
- Appointment-location pickup end time automatically defaults to 30 minutes after pickup start.
- Auto-filled pickup end times can still be manually changed.
- Edit buttons added for:
  - Appointments
  - Tasks
  - Notes
  - Medications
  - Directory contacts
- Print Center now supports:
  - Single-day printout
  - Date range printout
- App footer updated to v3.9.

## Recommended test plan

1. Add an appointment and set Maple Ridge pickup start.
2. Confirm Maple Ridge pickup end auto-fills 30 minutes later.
3. Manually change the pickup end and confirm it stays changed.
4. Repeat for appointment-location pickup.
5. Edit an appointment, task, note, medication, and directory contact.
6. Test Print Center single day.
7. Test Print Center date range.
