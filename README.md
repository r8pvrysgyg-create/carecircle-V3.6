# CareCircle v3.7 - Smart Directory

This version builds on v3.6 and improves the Directory so it can become the central hub for contacts and appointment auto-fill.

## New in v3.7

- Favorite contacts appear first
- Link directory contacts to Grandma and/or Grandpa
- Organization, email, website, and structured address fields
- Appointment defaults: type, default location, typical duration, preferred driver, transportation notes
- Quick action links: Call, Email, Maps, Website
- Smarter appointment auto-fill from directory contacts
- Directory improvements included in global search

## Deploy

Upload the contents of this folder to the root of your GitHub Pages repository.

## Firebase Rules

No new rule structure is required if v3.6 was already working. The included `firestore.rules` is still safe to publish.

## Test Checklist

1. Add a favorite directory contact.
2. Link it to Grandma or Grandpa.
3. Add phone, email, website, and address.
4. Add appointment defaults.
5. Create a new appointment and select that directory contact.
6. Confirm appointment type, visit details, location, driver, duration, and notes auto-fill.
7. Confirm phone/email/maps/website quick action buttons appear on the directory card.
