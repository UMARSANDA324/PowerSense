# PowerSense Authentication System Guide

## Overview
This guide covers the complete authentication system for PowerSense, including user registration, login, password management, and database seeding.

## Features
- ✅ Secure user registration with email validation
- ✅ Password hashing with bcrypt (10 salt rounds)
- ✅ JWT token-based authentication
- ✅ Role-based access control (user, admin, super-admin)
- ✅ Password reset with OTP
- ✅ Account activation/deactivation
- ✅ Automatic database seeding for testing
- ✅ Comprehensive error handling and logging
- ✅ Input validation and sanitization

## API Endpoints

### Registration
```
POST /api/auth/register
Content-Type: application/json

Request Body:
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "state": "Lagos",
  "lga": "Ikeja",
  "ward": "Ward 1",
  "feeder": "Feeder A"
}

Response (201):
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "_id": "user_id",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "user",
    // ... other user fields
  },
  "token": "jwt_token"
}
```

### Login
```
POST /api/auth/login
Content-Type: application/json

Request Body:
{
  "email": "john@example.com",
  "password": "password123"
}

Response (200):
{
  "success": true,
  "message": "Login successful",
  "user": {
    "_id": "user_id",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "lastLogin": "2024-03-30T12:00:00.000Z"
  },
  "token": "jwt_token"
}
```

### Get User Profile
```
GET /api/auth/profile
Authorization: Bearer <jwt_token>

Response (200):
{
  "_id": "user_id",
  "fullName": "John Doe",
  "email": "john@example.com",
  "role": "user",
  // ... other user fields
}
```

## Default Users (Seeded)

### Test User
- **Email:** test@example.com
- **Password:** 123456
- **Role:** user

### Admin User
- **Email:** admin@powersense.com
- **Password:** admin123
- **Role:** admin

## Database Seeding

The system automatically seeds default users when:
- Running in development mode (`NODE_ENV=development`)
- `SEED_DATABASE=true` environment variable is set

### Seeding Logic
```javascript
// In server.js
setTimeout(async () => {
  await verifyDatabase();
  
  if (process.env.NODE_ENV === "development" || process.env.SEED_DATABASE === "true") {
    await seedDatabase();
  }
}, 2000);
```

## Security Features

### Password Security
- All passwords are hashed using bcrypt with 10 salt rounds
- Passwords are never stored in plain text
- Minimum password length: 6 characters

### JWT Tokens
- Tokens are generated using user ID
- Tokens expire based on JWT configuration
- Tokens are required for protected routes

### Input Validation
- Email format validation using regex
- Required field validation
- SQL injection prevention through MongoDB ODM
- XSS prevention through input sanitization

### Error Handling
- Different error codes for different scenarios:
  - `USER_NOT_FOUND`: User does not exist
  - `INVALID_PASSWORD`: Password is incorrect
  - `ACCOUNT_DEACTIVATED`: User account is disabled
  - `SERVER_ERROR`: Internal server error

## Testing

### Run Authentication Tests
```bash
cd backend
npm test
```

### Manual Testing
```bash
# Start the server
npm run dev

# Test registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"test@example.com","password":"123456"}'

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'
```

## Environment Variables

### Required
- `MONGO_URI` or `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token signing

### Optional
- `NODE_ENV`: Environment (development/production)
- `SEED_DATABASE`: Enable database seeding (true/false)
- `EMAIL_HOST`: SMTP server for password reset emails
- `EMAIL_USER`: SMTP username
- `EMAIL_PASS`: SMTP password

## User Model Schema

```javascript
{
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  role: { type: String, enum: ["super-admin", "admin", "user"], default: "user" },
  state: String,
  lga: String,
  ward: String,
  feeder: String,
  isActive: { type: Boolean, default: true },
  notificationPreference: { type: String, enum: ["email", "push", "in-app", "off"], default: "push" },
  deviceTokens: [{ token: String, deviceType: String, lastUpdated: Date }],
  lastLogin: Date,
  // ... password reset fields
}
```

## Troubleshooting

### Common Issues

1. **"Found 0 users in 'users' collection"**
   - Solution: The database is empty. Register a user or enable seeding

2. **"401 Unauthorized" on login**
   - Check if user exists in database
   - Verify password is correct
   - Ensure user account is active

3. **"User already exists" error**
   - Email is already registered
   - Use a different email or check if user already exists

4. **Database connection issues**
   - Verify MONGO_URI is correct
   - Check network connectivity
   - Ensure MongoDB credentials are valid

### Debug Mode
Enable detailed logging by setting:
```bash
DEBUG=* npm run dev
```

## Production Deployment

### Security Checklist
- [ ] Change default user passwords
- [ ] Set strong JWT_SECRET
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable helmet.js security headers
- [ ] Configure proper environment variables

### Performance Considerations
- Use connection pooling for MongoDB
- Implement proper indexing on email field
- Consider Redis for session storage
- Enable compression for API responses

## Next Steps

1. **Frontend Integration**: Implement login/register forms in React
2. **Role-Based UI**: Show different features based on user role
3. **Password Policy**: Implement stronger password requirements
4. **Two-Factor Authentication**: Add 2FA for enhanced security
5. **Session Management**: Implement refresh tokens
6. **Audit Logging**: Track user actions for security

## Support

For issues or questions:
1. Check the server logs for detailed error messages
2. Verify environment variables are set correctly
3. Test with the provided test script
4. Check MongoDB connection and user collection
