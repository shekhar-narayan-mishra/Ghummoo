
# Class Diagram

```mermaid
classDiagram
class User {
  +String userId
  +String name
  +String email
  +login()
  +logout()
}

class Traveler {
  +bookGuide()
  +submitReview()
}

class Guide {
  +certificationStatus
  +applyCertification()
  +manageAvailability()
}

class Admin {
  +verifyGuide()
  +approveCertification()
}

class Booking {
  +bookingId
  +status
  +confirm()
  +cancel()
}

class Review {
  +rating
  +comment
}

User <|-- Traveler
User <|-- Guide
User <|-- Admin

Traveler "1" --> "*" Booking
Guide "1" --> "*" Booking
Traveler "1" --> "*" Review
Guide "1" --> "*" Review
