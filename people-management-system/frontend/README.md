# People Management System Frontend

## Features
- Secure login, JWT auth, role-based UI
- Admin/user roles
- People CRUD, search, filter
- User management (admin only)
- Reports (alphabetical, by age, qualification, location)
- Clean, responsive UI (desktop only)
- Strong typing, error handling

## Setup

1. Install dependencies:
   ```sh
   npm install
   ```
2. Start dev server:
   ```sh
   npm run dev
   ```
3. Build for production:
   ```sh
   npm run build
   ```

## Configuration
- API base URL is `/api` (use Nginx to proxy to backend)
- Uses localStorage for JWT/user
