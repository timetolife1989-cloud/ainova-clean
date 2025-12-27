This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment Setup

### Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database Configuration
DB_SERVER=your_server
DB_DATABASE=your_database
DB_USER=your_user
DB_PASSWORD=your_password

# Weather Widget (Optional - OpenWeatherMap API)
WEATHER_API_KEY=your_openweathermap_api_key
WEATHER_LOCATION=Budapest,HU
WEATHER_UNITS=metric
WEATHER_LANGUAGE=hu
```

### Weather Widget Setup

The dashboard includes a real-time weather widget in the header. To enable it:

1. **Get a free API key:**
   - Sign up at: https://home.openweathermap.org/users/sign_up
   - Free tier: 1,000 calls/day (more than enough for this app)

2. **Configure environment variables:**
   - Copy `.env.local.example` to `.env.local`
   - Add your `WEATHER_API_KEY`
   - Optionally customize location, units, and language

3. **Restart the dev server:**
   ```bash
   npm run dev
   ```

**Note:** The widget displays a fallback state ("N/A") if the API key is not configured. The application works fine without it.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
