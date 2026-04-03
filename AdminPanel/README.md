# SSC Navigation Admin Panel

React-based admin dashboard for managing the SSC Campus Navigation system.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API URL
Create `.env` file:
```env
VITE_API_URL=http://localhost:3000/api
```

### 3. Run Development Server
```bash
npm run dev
```

Open `http://localhost:5173`

## Features

- 📊 **Dashboard** - Overview of buildings, POIs, and routes
- 🏢 **Buildings** - Add, edit, delete campus buildings
- 📍 **POIs** - Manage points of interest
- 🗺️ **Routes** - Create navigation routes
- ⚙️ **Settings** - User profile and system configuration

## Login

Use your admin credentials or default:
- Email: `admin@ssc.edu.ph`
- Password: `admin123`

## Build for Production

```bash
npm run build
```

Output in `dist/` folder.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Axios** - HTTP client
- **Lucide React** - Icons
- **Vite** - Build tool

## Project Structure

```
AdminPanel/
├── src/
│   ├── main.tsx           # Entry point
│   ├── App.tsx            # Root component
│   ├── index.css          # Global styles
│   ├── context/           # React context
│   │   └── AuthContext.tsx
│   ├── services/          # API services
│   │   └── api.ts
│   ├── components/        # Reusable components
│   │   └── Layout.tsx
│   └── pages/             # Page components
│       ├── Login.tsx
│       ├── Dashboard.tsx
│       ├── Buildings.tsx
│       ├── POIs.tsx
│       ├── Routes.tsx
│       └── Settings.tsx
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Customization

### Colors
Edit `tailwind.config.js` to customize the color scheme:
```js
colors: {
  primary: { ... },
  accent: { ... }
}
```

### Fonts
Default fonts (Google Fonts):
- Display: Outfit
- Body: DM Sans

## Deployment

### Vercel
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm run build
# Upload dist/ folder
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "run", "preview"]
```

