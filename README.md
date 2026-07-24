PROJECT: Hotel Management System (Coconut Republik Villa & Restaurant)
STACK: MERN (MongoDB, Express, React(Vite), Node)
REPO STRUCTURE: /frontend and /backend only
RUN COMMANDS: `npm run dev` in both frontend and backend terminals

SOURCE REQUIREMENTS (from documents):
- Functional modules: Employee Management, Room Reservation & Booking, Payment Management & Customer Feedback, Cleaning Management, Restaurant Management
- Out of scope (by decision): Vehicle Rental Management
- Minor functions: User login/authentication, Profile management, Notifications/alerts, Search/filter options, Backup & data recovery
- Payments: handle room/restaurant/reservation payments, support cash + digital, generate receipts, maintain records
- Customer payment portal: server-calculated totals + pay endpoints for bookings, orders, and table reservations
- Feedback: ratings + comments stored for management review

ROLES (RBAC):
- ADMIN (Hotel Manager)
- RECEPTION
- RESTAURANT_STAFF
- HOUSEKEEPING
- CUSTOMER (Guest)

NON-FUNCTIONAL:
- Secure authentication
- Data privacy/confidentiality
- Reliability & error handling
- Fast response, scalable

FRONTEND (React + Vite):
- Pages: Login, Dashboard, Employees, Rooms, Bookings, Payments, Feedback, Vehicles, Cleaning, Restaurant, Reports, Settings/Profile
- State/data: React Query + Axios
- Forms: React Hook Form + Zod validation
- Routing: React Router
- UI: Clean, mobile-friendly responsive layout

BACKEND (Express):
- Architecture: feature-based modules (routes/controller/service/validation), centralized error handling, API response wrapper
- Security: helmet, CORS, rate limiting, mongo sanitize, xss-clean, hpp, input validation
- Auth: JWT access+refresh, password hashing (bcrypt), role-based access middleware
- Logging: winston (or equivalent)

DATABASE (MongoDB):
Required collections and key fields:
1) users: name, email/phone, passwordHash, role, isActive, lastLogin
2) employees: empNo, name, role, phone, address, salary(optional), attendance[], schedules[]
3) rooms: roomNo, type, pricePerNight, status(AVAILABLE/OCCUPIED/MAINTENANCE), features[]
4) bookings: customerName, customerContact, roomId, checkIn, checkOut, status(BOOKED/CANCELLED/CHECKED_IN/CHECKED_OUT), createdBy
5) payments: payableType(ROOM/RESTAURANT/RESERVATION), refId, amount, method(CASH/CARD/ONLINE), paidAt, receiptNo, createdBy
6) feedback: customerName(optional), bookingId(optional), rating(1-5), comment, createdAt
9) cleaningTasks: roomId, assignedTo(employeeId), scheduledAt, status(PENDING/DONE), notes
10) menuItems: name, category, price, isAvailable
11) orders: orderType(DINE_IN/ROOM_SERVICE), items[{menuItemId, qty, price}], status(PLACED/PREPARING/SERVED/PAID), tableNo(optional), roomId(optional)
12) tableReservations: customerName, phone, dateTime, partySize, status

Implementation notes (done):
- bookings.paymentId and tableReservations.paymentId link back to payments (prevents double-pay + enables “Paid” UI)
- Stripe Checkout + webhook confirmation (card payments)
- Email receipt after successful Stripe payment (SMTP optional)

API REQUIREMENTS (REST):
- Auth: /api/auth/register (admin only), /api/auth/login, /api/auth/refresh, /api/auth/logout, /api/auth/me
- Employees CRUD
- Rooms CRUD + availability endpoint
- Bookings CRUD + cancel + check-in/out
- Payments CRUD + generate receipt number + list by date range
- Feedback CRUD + list/filter by rating/date
- Vehicles CRUD
- Rentals CRUD + return + damage report
- Cleaning tasks CRUD + mark done
- Menu items CRUD
- Orders CRUD + status update
- Table reservations CRUD

REPORTS:
- Occupancy rate, revenue summaries, top ordered items, vehicle rental income, feedback rating trends

TODO CHECKLIST (track progress):
[x] Setup repo with frontend/backend, both run with `npm run dev`
[x] Implement auth + RBAC middleware
[x] Implement module CRUD (employees, rooms, bookings, payments, feedback, cleaning, restaurant/menu, orders, table reservations)
[x] Implement receipt generation + payment records
[x] Implement feedback rating+comment storage
[ ] Add search/filter endpoints (where missing)
[x] Add notifications scaffold (basic)
[x] Add backup/export (basic JSON export endpoint)
[x] Add Swagger docs (OpenAPI)
[ ] Add Postman collection
[x] Add production configs, env example, logging
[x] Add UI pages + API integration (staff + customer)
[x] Security hardening (Express 5 compatible XSS sanitization + other middleware)
[x] Add basic API smoke tests (Vitest + Supertest + mongodb-memory-server)
[x] Email receipts on Stripe payments (SMTP via nodemailer)
