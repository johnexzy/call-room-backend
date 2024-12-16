# Call Room Backend

A real-time customer service call management system built with NestJS, featuring WebRTC signaling, WebSocket communication, and queue management.

## Features

### Real-time Communication
- WebRTC audio calls between customers and representatives
- WebSocket-based signaling server
- Real-time queue management
- Live notifications system

### Call Management
- Automatic call assignment
- Call quality monitoring
- Call history tracking
- Call feedback system

### Queue System
- Dynamic queue position management
- Wait time estimation
- Callback requests
- Automatic representative assignment

### User Management
- Role-based access control (Customer, Representative, Admin)
- Representative availability management
- User profiles and settings

### Analytics
- Real-time call metrics
- Queue statistics
- Quality metrics tracking
- System performance monitoring

## Tech Stack

- NestJS
- TypeScript
- PostgreSQL
- TypeORM
- Socket.IO
- JWT Authentication
- WebRTC
- Swagger/OpenAPI

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- pnpm (recommended) or npm

## Environment Setup

Create a `.env` file in the root directory:

```env
# Server
PORT=5200
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=callroom

# JWT
JWT_SECRET=your_jwt_secret_key

# CORS
CORS_ORIGINS=http://localhost:3344
```

## Installation

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm typeorm migration:run

# Seed the database
pnpm seed

# Start development server
pnpm start:dev

# Build for production
pnpm build

# Start production server
pnpm start:prod
```

## Project Structure

```
src/
├── constants/          # Application constants and enums
├── entities/          # Database entities
├── interceptors/      # Global interceptors
├── modules/          # Feature modules
│   ├── admin/       # Admin management
│   ├── analytics/   # Analytics and metrics
│   ├── auth/        # Authentication and authorization
│   ├── calls/       # Call management
│   ├── notifications/ # Real-time notifications
│   ├── queue/       # Queue management
│   └── users/       # User management
└── database/        # Database migrations and seeds
```

## API Documentation

Swagger documentation is available at `/api/docs` when running the server.

### Main Endpoints

#### Authentication
- POST `/api/v1/auth/login` - User login
- POST `/api/v1/auth/register` - User registration
- POST `/api/v1/auth/refresh` - Refresh token

#### Calls
- GET `/api/v1/calls/active` - Get active call
- POST `/api/v1/calls/start/:customerId` - Start a call
- PUT `/api/v1/calls/:id/end` - End a call
- GET `/api/v1/calls/history` - Get call history

#### Queue
- POST `/api/v1/queue/join` - Join the queue
- GET `/api/v1/queue/position` - Get queue position
- POST `/api/v1/queue/callback` - Request callback

#### Users
- GET `/api/v1/users/profile` - Get user profile
- PUT `/api/v1/users/availability` - Update availability
- PUT `/api/v1/users/profile` - Update profile

## WebSocket Events

### Namespaces
- `calls` - Call-related events
- `queue` - Queue updates
- `notifications` - System notifications
- `analytics` - Real-time metrics

### Main Events
```typescript
WS_EVENTS = {
  CALLS: {
    CALL_ASSIGNED: 'call_assigned',
    CALL_ENDED: 'call_ended',
    CALL_UPDATE: 'call_update',
    QUALITY_UPDATE: 'quality_update',
  },
  QUEUE: {
    POSITION_UPDATE: 'position_update',
    QUEUE_UPDATE: 'queue_update',
    YOUR_TURN: 'your_turn',
  },
  // ... other events
}
```

## Database Schema

### Core Entities

#### User
- Role-based user model (customer, representative, admin)
- Availability tracking for representatives
- Call history relationships

#### Call
- Real-time call status tracking
- Quality metrics storage
- Feedback integration
- Duration tracking

#### QueueEntry
- Dynamic position management
- Status tracking
- Callback request handling

#### Feedback
- Call rating system
- Customer comments
- Quality metrics association

## Development

### Code Style
- ESLint configuration
- Prettier formatting
- TypeScript strict mode

### Testing
```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov
```

### Debugging
- Source maps enabled
- Detailed logging
- Error tracking

## Production Deployment

### Requirements
- Node.js 18+
- PostgreSQL 12+
- PM2 or similar process manager
- SSL certificate for WebSocket security

### Environment Variables
Additional production variables:
```env
NODE_ENV=production
SSL_KEY_PATH=/path/to/ssl/key
SSL_CERT_PATH=/path/to/ssl/cert
```

### Security Features
- JWT authentication
- WebSocket authentication
- Rate limiting
- CORS protection
- Input validation

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
