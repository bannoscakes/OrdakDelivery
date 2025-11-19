# Authentication Module

JWT-based authentication system for OrdakDelivery API.

## Features

- User registration with role-based access (Admin, Dispatcher, Driver)
- Secure password hashing with bcrypt
- JWT access/refresh token pairs
- Password strength validation
- Token refresh mechanism
- Change password functionality
- Role-based access control middleware

## Environment Variables

Add these to your `.env` file:

```env
JWT_ACCESS_SECRET=your-secret-key-for-access-tokens-change-in-production
JWT_REFRESH_SECRET=your-secret-key-for-refresh-tokens-change-in-production
```

**Important**: Use strong, random secrets in production. Generate with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## API Endpoints

### POST /api/v1/auth/register
Register a new user.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "role": "DRIVER"
}
```

**Response:**
```json
{
  "user": {
    "id": "clxxx...",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "DRIVER",
    "isActive": true
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### POST /api/v1/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "user": {
    "id": "clxxx...",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "DRIVER",
    "isActive": true
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### POST /api/v1/auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### GET /api/v1/auth/me
Get current user details (requires authentication).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "clxxx...",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "DRIVER",
  "isActive": true
}
```

### POST /api/v1/auth/change-password
Change current user's password (requires authentication).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Response:**
```json
{
  "message": "Password changed successfully"
}
```

### POST /api/v1/auth/logout
Logout (requires authentication).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

## Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## Token Expiry

- **Access Token**: 15 minutes
- **Refresh Token**: 7 days

## Middleware Usage

### Require Authentication

```typescript
import { authenticate } from '@/middleware/auth.middleware';

router.get('/protected', authenticate, (req, res) => {
  // req.user is available here
  res.json({ user: req.user });
});
```

### Require Specific Roles

```typescript
import { authenticate } from '@/middleware/auth.middleware';
import { requireAdmin, requireDispatcher } from '@/middleware/role.middleware';

// Only admins
router.post('/admin-only', authenticate, requireAdmin, handler);

// Admins and dispatchers
router.get('/dispatch-panel', authenticate, requireDispatcher, handler);

// Custom roles
import { requireRole } from '@/middleware/role.middleware';
router.get('/custom', authenticate, requireRole(['ADMIN', 'DRIVER']), handler);
```

## User Roles

- **ADMIN**: Full system access
- **DISPATCHER**: Manage orders, runs, assignments
- **DRIVER**: View assigned runs, update delivery status

## Security Notes

1. **Password Storage**: Passwords are hashed using bcrypt with 10 salt rounds
2. **Token Security**:
   - Access tokens are short-lived (15 min)
   - Refresh tokens are long-lived (7 days)
   - Tokens include user role for authorization
3. **Account Status**: Deactivated users cannot authenticate
4. **Token Validation**: Every request validates user exists and is active

## Driver Auto-Creation

When a user is registered with role `DRIVER`, a corresponding `Driver` record is automatically created in the database with the same details.

## Error Responses

All endpoints return appropriate HTTP status codes:

- `200`: Success
- `201`: Created (registration)
- `400`: Bad request (validation errors)
- `401`: Unauthorized (invalid credentials or token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not found

Error format:
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```
