
# ER Diagram

```mermaid
erDiagram
USERS {
  int id PK
  string name
  string email
  string password
  string role
}

GUIDES {
  int id PK
  int user_id FK
  string certification_status
}

BOOKINGS {
  int id PK
  int traveler_id FK
  int guide_id FK
  string status
}

REVIEWS {
  int id PK
  int traveler_id FK
  int guide_id FK
  int rating
  string comment
}

USERS ||--o{ BOOKINGS : makes
USERS ||--o{ REVIEWS : writes
GUIDES ||--o{ BOOKINGS : receives
GUIDES ||--o{ REVIEWS : gets
