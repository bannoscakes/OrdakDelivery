# OrdakDelivery Test Suite

This directory contains integration and security tests for the OrdakDelivery API.

## Setup

### 1. Configure Test Environment

Copy `.env.test` and update the `DATABASE_URL` to match your PostgreSQL setup:

```bash
# In .env.test file
DATABASE_URL=postgresql://your-user:your-password@localhost:5432/ordakdelivery
```

**Note:** Tests use unique identifiers (timestamps + random strings) for test data, so you can safely use the same database as development. Test data is automatically cleaned up after each test.

Alternatively, create a separate test database:

```bash
createdb ordakdelivery_test
# Then update DATABASE_URL in .env.test
DATABASE_URL=postgresql://your-user:your-password@localhost:5432/ordakdelivery_test
```

### 2. Run Database Migrations

Ensure your test database has the latest schema:

```bash
# If using a separate test database
DATABASE_URL=postgresql://your-user:your-password@localhost:5432/ordakdelivery_test npm run db:migrate

# If using the same database as dev, migrations should already be applied
npm run db:migrate
```

### 3. Install Dependencies

```bash
npm install
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
npm test -- tests/drivers.security.test.ts
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

## Test Structure

### Files

- **`setup.ts`** - Jest setup file that loads environment variables and initializes Prisma
- **`helpers.ts`** - Test utilities for creating test data and asserting security
- **`drivers.security.test.ts`** - Security tests for drivers API endpoints

### Test Utilities

#### Creating Test Data

```typescript
import { createTestDriver, createTestVehicle, createTestUser } from './helpers';

// Create a test driver with associated user
const driver = await createTestDriver();

// Create with overrides
const driver = await createTestDriver({
  userOverrides: { firstName: 'John' },
  driverOverrides: { status: 'on_leave' },
});

// Create test vehicle
const vehicle = await createTestVehicle({ make: 'Toyota' });
```

#### Authentication

```typescript
import { generateTestToken } from './helpers';

// Generate admin token
const adminToken = generateTestToken('user-id', 'ADMIN');

// Use in request
const response = await request(app)
  .get('/api/v1/drivers')
  .set('Authorization', `Bearer ${adminToken}`);
```

#### Security Assertions

```typescript
import { assertNoSensitiveUserFields, assertNoSensitiveFieldsRecursive } from './helpers';

// Assert single user object has no sensitive fields
assertNoSensitiveUserFields(driver.user);

// Recursively check entire response
assertNoSensitiveFieldsRecursive(response.body);
```

#### Cleanup

```typescript
import { cleanupTestData } from './helpers';

afterEach(async () => {
  await cleanupTestData(); // Removes all test data
});
```

## Security Tests

### Drivers API Security (`drivers.security.test.ts`)

This test suite verifies that **NO sensitive user fields are ever exposed** in driver API responses.

**Critical security fields that must NEVER appear in responses:**
- `passwordHash` - User password hashes
- `emailVerified` - Email verification status
- `lastLoginAt` - Last login timestamp

**Endpoints tested:**
- `POST /api/v1/drivers` - Create driver
- `GET /api/v1/drivers/:id` - Get driver by ID
- `GET /api/v1/drivers` - List drivers
- `GET /api/v1/drivers/available` - Get available drivers
- `PUT /api/v1/drivers/:id` - Update driver

**What tests verify:**
1. Driver responses include safe user fields (id, email, firstName, lastName, phone, role, isActive, createdAt, updatedAt)
2. Driver responses NEVER include sensitive fields (passwordHash, emailVerified, lastLoginAt)
3. No sensitive data leaks through error messages
4. Security is maintained with query parameters (includeRuns, status filters, pagination)
5. Security is maintained when responses include related data (vehicles, delivery runs)

**If any security test fails:**
This indicates a **CRITICAL SECURITY VULNERABILITY** where password hashes or other sensitive data could be exposed to API clients. The issue must be fixed immediately before deploying.

## Writing New Tests

### Basic Structure

```typescript
import request from 'supertest';
import createApp from '@/app';
import { generateTestToken, createTestDriver, cleanupTestData } from './helpers';

describe('Feature Name', () => {
  let app;
  let authToken;

  beforeAll(async () => {
    app = createApp();
    authToken = generateTestToken('test-user-id', 'ADMIN');
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it('should do something', async () => {
    const response = await request(app)
      .get('/api/v1/some-endpoint')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

### Best Practices

1. **Always clean up test data** - Use `afterEach` with `cleanupTestData()`
2. **Use unique identifiers** - Test data uses timestamps and random strings to avoid conflicts
3. **Test security** - Always verify sensitive data is not exposed
4. **Use descriptive test names** - Clearly describe what is being tested
5. **Isolate tests** - Each test should be independent and not rely on others
6. **Mock external services** - Mock Mapbox, Shopify, etc. to avoid API costs and ensure deterministic tests

## Troubleshooting

### Database Connection Errors

Verify your DATABASE_URL in `.env.test` is correct:

```bash
# Test database connection
psql postgresql://your-user:your-password@localhost:5432/ordakdelivery
```

### Environment Variable Errors

Ensure `.env.test` has all required variables. Check `src/config/env.ts` for the complete list.

### Test Timeouts

Tests have a 30-second timeout. If tests are timing out:
1. Check database connection
2. Verify cleanup is happening (test data should be removed after each test)
3. Look for hanging promises or unclosed connections

### Port Already in Use

Tests use port 3001 by default. If occupied, update `PORT` in `.env.test`.

## CI/CD Integration

Tests are designed to run in CI environments:

```yaml
# GitHub Actions example
- name: Run tests
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ordakdelivery_test
  run: |
    npm run db:migrate
    npm test
```

## Coverage

Generate code coverage reports:

```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.

## Contributing

When adding new features:
1. Write tests for new API endpoints
2. Include security tests if handling user data
3. Ensure all tests pass before creating PR
4. Aim for >80% code coverage
