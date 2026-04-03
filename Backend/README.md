# SSC Navigation Backend API

Node.js/Express REST API for the SSC Campus Navigation system.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env` file:
```env
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ssc_navigation

# JWT
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=*
```

### 3. Setup Database
```bash
# Create database and tables
mysql -u root -p < src/database/schema.sql

# Seed sample data
npm run seed
```

### 4. Run Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs at `http://localhost:3000`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Admin login |
| GET | /api/buildings | Get all buildings |
| GET | /api/poi | Get all POIs |
| GET | /api/poi/search | Search POIs |
| GET | /api/routes | Get navigation routes |

See `Documentation/API_DOCUMENTATION.md` for full API reference.

## Default Credentials

After seeding:
- Email: `admin@ssc.edu.ph`
- Password: `admin123`

⚠️ Change password in production!

## Project Structure

```
Backend/
├── src/
│   ├── index.js           # Entry point
│   ├── routes/            # API routes
│   │   ├── auth.js
│   │   ├── buildings.js
│   │   ├── poi.js
│   │   └── routes.js
│   ├── middleware/        # Express middleware
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── logger.js
│   └── database/          # Database files
│       ├── connection.js
│       ├── schema.sql
│       └── seed.js
├── package.json
└── .env
```

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start with nodemon (auto-reload)
- `npm run seed` - Seed database with sample data
- `npm test` - Run tests

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment | development |
| DB_HOST | MySQL host | localhost |
| DB_PORT | MySQL port | 3306 |
| DB_USER | MySQL user | root |
| DB_PASSWORD | MySQL password | - |
| DB_NAME | Database name | ssc_navigation |
| JWT_SECRET | JWT signing key | - |
| JWT_EXPIRES_IN | Token expiry | 7d |
| CORS_ORIGIN | Allowed origins | * |

