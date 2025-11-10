# Caloria Deployment Guide

## Environment Configuration

Caloria has three environments:
- **Development (dev)**: Local development with localhost
- **Staging**: Pre-production testing environment
- **Production (prod)**: Live production environment

## Mobile App Configuration

### Development
```bash
# Uses localhost by default
npm start
```

### Staging Build
```bash
# Update app.json
"extra": {
  "environment": "staging"
}

# Build with EAS
eas build --profile preview
```

### Production Build
```bash
# Update app.json
"extra": {
  "environment": "prod"
}

# Build with EAS
eas build --profile production
```

## Backend Configuration

### Node Backend (Port 3001)

1. Copy environment file:
```bash
cd backend
cp .env.example .env
```

2. Update `.env` for your environment:
```env
# Development
NODE_ENV=development
DB_HOST=127.0.0.1
CORS_ORIGIN=http://localhost:3001

# Production
NODE_ENV=production
DB_HOST=your-production-db-host
CORS_ORIGIN=https://caloria.app
```

3. Start server:
```bash
npm start
```

### Python Backend (Port 5001)

1. Copy environment file:
```bash
cd python-backend
cp .env.example .env
```

2. Update `.env` for your environment:
```env
# Development
FLASK_DEBUG=True
HOST=0.0.0.0
PORT=5001

# Production
FLASK_DEBUG=False
HOST=0.0.0.0
PORT=5001
```

3. Start server:
```bash
python app.py
```

## API Endpoints

### Development
- Node API: `http://localhost:3001/api`
- Python API: `http://localhost:5001`

### Staging
- Node API: `https://api-staging.caloria.app/api`
- Python API: `https://ai-staging.caloria.app`

### Production
- Node API: `https://api.caloria.app/api`
- Python API: `https://ai.caloria.app`

## Database Setup

### Development
```bash
# Create database
mysql -u root -p
CREATE DATABASE caloria_db;

# Run migrations
cd backend
node setup-database.js
```

### Production
1. Create production database
2. Update connection strings in `.env` files
3. Run migrations on production database
4. Ensure JWT_SECRET matches between Node and Python backends

## Security Checklist

- [ ] Change JWT_SECRET in production
- [ ] Use strong database passwords
- [ ] Enable HTTPS for all API endpoints
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable database backups
- [ ] Use environment variables for secrets
- [ ] Never commit `.env` files to git

## Monitoring

### Health Checks
- Node API: `GET /api/health`
- Python API: `GET /health`

### Logs
- Node: Check console output or use PM2
- Python: Check Flask logs or use Gunicorn

## Troubleshooting

### Mobile app can't connect to backend
1. Check if backend is running
2. Verify API URLs in `lib/config.ts`
3. Check CORS configuration
4. Ensure JWT_SECRET matches

### AI model not loading
1. Check Python backend logs
2. Verify transformers library is installed
3. Ensure sufficient disk space for model download
4. Check internet connection for first-time download

### Database connection errors
1. Verify database credentials in `.env`
2. Check if database server is running
3. Ensure database exists
4. Check firewall rules
