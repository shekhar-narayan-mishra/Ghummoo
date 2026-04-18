# Use Case Diagram

```mermaid
flowchart LR

Traveler[Traveler]
Guide[Guide]
Admin[Admin]

Register[Register]
Login[Login]
Search[Search Guides]
Book[Book Guide]
Cancel[Cancel Booking]
Review[Submit Review]

Cert[Apply for Certification]
Avail[Manage Availability]
Accept[Accept Booking]
Reject[Reject Booking]

Verify[Verify Guide]
Approve[Approve Certification]
Manage[Manage Users]
Monitor[Monitor Bookings]

Traveler --> Register
Traveler --> Login
Traveler --> Search
Traveler --> Book
Traveler --> Cancel
Traveler --> Review

Guide --> Register
Guide --> Login
Guide --> Cert
Guide --> Avail
Guide --> Accept
Guide --> Reject

Admin --> Verify
Admin --> Approve
Admin --> Manage
Admin --> Monitor
