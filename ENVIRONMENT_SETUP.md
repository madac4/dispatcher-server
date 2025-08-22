# Environment Setup

This document describes the required environment variables for the dispatcher-server.

## Required Environment Variables

Create a `.env` file in the root directory of the dispatcher-server with the following variables:

### Database Configuration

```bash
MONGODB_URI=mongodb://localhost:27017/dispatcher
```

### JWT Configuration

```bash
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key
```

### Email Configuration

```bash
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Frontend Configuration

```bash
FRONTEND_ORIGINS=http://localhost:3000,https://yourdomain.com
```

**Note:** The `FRONTEND_ORIGINS` variable is used for:

-   CORS configuration (multiple origins separated by commas)
-   Invitation email links (uses the first origin for registration links)

### Server Configuration

```bash
PORT=5000
NODE_ENV=development
```

## Example .env File

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/dispatcher

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend Configuration
FRONTEND_ORIGINS=http://localhost:3000,https://yourdomain.com

# Server Configuration
PORT=5000
NODE_ENV=development
```

## Important Notes

1. **Never commit your `.env` file** - it's already in `.gitignore`
2. **FRONTEND_ORIGINS** should include all domains that need access to your API
3. **The first origin in FRONTEND_ORIGINS** will be used for invitation email links
4. **JWT secrets** should be long, random strings for security
5. **Email credentials** should use app-specific passwords for Gmail

## Development vs Production

-   **Development**: Use `http://localhost:3000` for frontend origins
-   **Production**: Use your actual domain(s) for frontend origins
-   **Email**: Use real email credentials in production
-   **JWT Secrets**: Use strong, unique secrets in production
