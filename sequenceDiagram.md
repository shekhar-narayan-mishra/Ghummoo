
# Sequence Diagram – Guide Booking Flow

```mermaid
sequenceDiagram
participant Traveler
participant System
participant Guide
participant Admin

Traveler->>System: Login
System-->>Traveler: Auth Success

Traveler->>System: Search Certified Guides
System-->>Traveler: Show Guide List

Traveler->>System: Request Booking
System->>Guide: Booking Request
Guide-->>System: Accept Booking

System-->>Traveler: Booking Confirmed
System-->>Admin: Log Booking Activity
