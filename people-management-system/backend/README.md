# People Management System Backend

## Features
- Secure JWT authentication, role-based access
- User management (max 3 users, admin only)
- People CRUD, search, filter
- Import/export (Excel/CSV), reports (Excel/PDF)
- Google Drive backup/restore
- Production-ready, strong typing, error handling

## Setup

1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Configure environment:**
   - Copy `.env.example` to `.env` and fill in values
3. **Prisma setup:**
   ```sh
   npx prisma generate
   npx prisma migrate dev --name init
   npm run seed
   ```
4. **Run locally:**
   ```sh
   npm run dev
   ```
5. **Build for production:**
   ```sh
   npm run build
   npm start
   ```

## Deployment
- Use Nginx as reverse proxy
- Use PM2 to manage the Node process
- PostgreSQL must be running and accessible

## Folder Structure
- `src/` - All source code
- `prisma/` - Prisma schema and seed

## Security
- Passwords hashed with bcrypt
- JWT for authentication
- Role-based API access
- SQL injection protected via Prisma

## Backup/Restore
- Uses Google Drive API (service account or OAuth)
- See `.env.example` for required credentials

---
