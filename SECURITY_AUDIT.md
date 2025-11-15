# Security & Code Quality Audit - Issue Tracker

**Generated:** 2024-01-15
**Last Updated:** 2024-11-15 (HIGH priority complete + 4 MEDIUM issues resolved)
**Status:** ✅ All CRITICAL & HIGH issues RESOLVED | 🟢 MEDIUM priority in progress
**Total Issues:** 31 (14 resolved, 17 remaining)

---

## 🚨 CRITICAL SEVERITY (Must fix before production)

### Security - SQL Injection

- [x] **CRITICAL-001: SQL Injection in Order Creation** ✅ FIXED
  - **File:** `src/modules/orders/orders.service.ts:104`
  - **Issue:** Using `Prisma.raw()` with string interpolation for PostGIS geometry
  - **Current Code:**
    ```typescript
    location: Prisma.raw(`ST_GeomFromText('${locationWKT}', 4326)`)
    ```
  - **Fix Required:**
    ```typescript
    location: Prisma.sql`ST_GeomFromText(${locationWKT}, 4326)`
    ```
  - **Impact:** Attacker can inject SQL through address fields
  - **Estimated Time:** 15 minutes

- [x] **CRITICAL-002: SQL Injection in Shopify Order Import** ✅ FIXED
  - **File:** `src/modules/orders/shopify.service.ts:146`
  - **Issue:** Same as CRITICAL-001 but in Shopify webhook handler
  - **Fix Required:** Use `Prisma.sql` instead of `Prisma.raw`
  - **Impact:** Attacker can inject SQL through Shopify webhook payloads
  - **Estimated Time:** 15 minutes

- [x] **CRITICAL-003: SQL Injection in Route Optimization** ✅ FIXED
  - **File:** `src/modules/runs/runs.service.ts:260-263`
  - **Issue:** Using template literals in `$queryRaw` without proper parameterization
  - **Current Code:**
    ```typescript
    const result = await prisma.$queryRaw`
      SELECT ST_X(location::geometry) as lon, ST_Y(location::geometry) as lat
      FROM orders
      WHERE id = ${order.id} AND location IS NOT NULL
    `;
    ```
  - **Fix Required:**
    ```typescript
    const result = await prisma.$queryRaw(
      Prisma.sql`SELECT ST_X(location::geometry) as lon,
                 ST_Y(location::geometry) as lat
                 FROM orders
                 WHERE id = ${order.id} AND location IS NOT NULL`
    );
    ```
  - **Impact:** SQL injection through order IDs
  - **Estimated Time:** 15 minutes

**Total Critical: 3 issues | Estimated Time: 45 minutes**

---

## 🔴 HIGH SEVERITY (Fix within 1 week)

### Security - Authentication & Authorization

- [x] **HIGH-001: Missing Authentication Middleware** ✅ FIXED
  - **Files:** All route files in `src/modules/*/routes.ts`
  - **Issue:** No authentication implemented despite routes marked as "Private"
  - **Fix Required:**
    1. Create `src/middleware/authenticate.ts`
    2. Implement JWT verification using `env.JWT_SECRET`
    3. Add to all protected routes
  - **Impact:** Complete unauthorized access to all API endpoints
  - **Estimated Time:** 1-2 hours
  - **Dependencies:** Need to install `jsonwebtoken` package
  - **Steps:**
    ```bash
    npm install jsonwebtoken
    npm install --save-dev @types/jsonwebtoken
    ```

- [x] **HIGH-002: Missing Rate Limiting** ✅ FIXED
  - **File:** `src/app.ts`
  - **Issue:** Environment variables configured but no middleware implemented
  - **Fix Required:**
    1. Install `express-rate-limit`
    2. Configure middleware with env vars
    3. Apply to all `/api/` routes
  - **Impact:** Vulnerable to DoS attacks, brute force, API abuse
  - **Estimated Time:** 30 minutes
  - **Steps:**
    ```bash
    npm install express-rate-limit
    npm install --save-dev @types/express-rate-limit
    ```

### Security - Webhook Verification

- [x] **HIGH-003: Broken Shopify Webhook HMAC Verification** ✅ FIXED
  - **File:** `src/utils/shopify.ts:17`
  - **Issue:** Body is JSON-parsed then re-stringified - won't match original
  - **Fix Required:**
    1. Modify `app.ts` to use `express.raw()` for webhook endpoint
    2. Update HMAC verification to use raw buffer
    3. Add timing-safe comparison
  - **Impact:** Webhook verification could fail or be bypassed
  - **Estimated Time:** 45 minutes
  - **Reference:** See detailed fix in audit report

### Database - Performance

- [x] **HIGH-004: N+1 Query in Batch Geocoding** ✅ FIXED
  - **File:** `src/modules/geocoding/geocoding.service.ts:102-121`
  - **Issue:** Checking cache individually for each address in loop
  - **Fix Required:** Fetch all cached addresses in single query
  - **Impact:** 100 addresses = 100+ queries instead of 1
  - **Estimated Time:** 1 hour

### Database - Data Integrity

- [x] **HIGH-005: Missing Transaction for Order Assignment** ✅ FIXED
  - **File:** `src/modules/runs/runs.service.ts:190-212`
  - **Issue:** Two separate DB operations without transaction
  - **Fix Required:** Wrap in `prisma.$transaction()`
  - **Impact:** Inconsistent state if second operation fails
  - **Estimated Time:** 30 minutes

- [x] **HIGH-006: Missing Transaction for Solution Application** ✅ FIXED
  - **File:** `src/modules/runs/runs.service.ts:318-356`
  - **Issue:** Updating run and multiple orders without transaction
  - **Fix Required:** Wrap entire method in transaction
  - **Impact:** Data inconsistency on partial failures
  - **Estimated Time:** 45 minutes

### Database - Indexing

- [x] **HIGH-007: Missing Database Indexes** ✅ FIXED
  - **File:** `prisma/schema.prisma`
  - **Issue:** Missing indexes on frequently queried fields
  - **Fix Required:** Add indexes:
    ```prisma
    model Order {
      @@index([assignedRunId])
      @@index([geocoded])
      @@index([scheduledDate, geocoded])
    }
    ```
  - **Impact:** Slow queries on order filtering
  - **Estimated Time:** 30 minutes
  - **Steps:**
    1. Update schema
    2. Run `npm run db:migrate`
    3. Test query performance

**Total High: 7 issues | Estimated Time: 6-7 hours**

---

## 🟡 MEDIUM SEVERITY (Fix within 2 weeks)

### TypeScript - Type Safety

- [x] **MEDIUM-001: Unsafe Type Assertions in Geocoding** ✅ FIXED
  - **File:** `src/services/mapbox/geocoding.service.ts:52,53,117,118`
  - **Issue:** Using `as number` without runtime validation
  - **Fix Required:** Add runtime type checks before assertions
  - **Estimated Time:** 30 minutes

- [x] **MEDIUM-002: Unsafe Type Assertions in Matrix Service** ✅ FIXED
  - **File:** `src/services/mapbox/matrix.service.ts:32,46`
  - **Issue:** Type casting without validation
  - **Fix Required:** Add validation
  - **Estimated Time:** 20 minutes

- [x] **MEDIUM-003: Unsafe Type Assertions in Directions** ✅ FIXED
  - **File:** `src/services/mapbox/directions.service.ts:25,55`
  - **Issue:** Type casting without validation
  - **Fix Required:** Add validation
  - **Estimated Time:** 20 minutes

- [x] **MEDIUM-004: Unknown Type for Order Items** ✅ FIXED
  - **Files:** `src/modules/orders/orders.service.ts:27`, `orders.controller.ts:34`
  - **Issue:** Items typed as `unknown` without proper schema
  - **Fix Required:** Create proper OrderItem interface and Zod schema
  - **Estimated Time:** 45 minutes

### Security - Token Handling

- [ ] **MEDIUM-005: Mapbox Token in URL Query Parameter**
  - **File:** `src/services/mapbox/optimization.service.ts:26`
  - **Issue:** Token in URL could be logged
  - **Fix Required:** Investigate if Mapbox supports header auth, or document risk
  - **Estimated Time:** 15 minutes

- [ ] **MEDIUM-006: Sensitive Information in Logs**
  - **File:** `src/utils/shopify.ts:26-29`
  - **Issue:** Logging HMAC values could expose secrets
  - **Fix Required:** Remove HMAC values from logs
  - **Estimated Time:** 10 minutes

### Security - CORS Configuration

- [ ] **MEDIUM-007: CORS Configuration Limitations**
  - **File:** `src/app.ts:24-29`
  - **Issue:** Single static origin, no multi-environment support
  - **Fix Required:** Support comma-separated origins with validation
  - **Estimated Time:** 30 minutes

### Performance - Pagination

- [ ] **MEDIUM-008: No Maximum Pagination Limit**
  - **Files:** All service files with `listX` methods
  - **Issue:** Users can request unlimited records (`?limit=999999`)
  - **Fix Required:** Add `MAX_LIMIT = 100` constant
  - **Estimated Time:** 30 minutes

- [ ] **MEDIUM-009: Unnecessary Data Fetching in Driver Get**
  - **File:** `src/modules/drivers/drivers.service.ts:76-85`
  - **Issue:** Always fetching related delivery runs
  - **Fix Required:** Make it optional via parameter
  - **Estimated Time:** 20 minutes

- [ ] **MEDIUM-010: Unnecessary Data Fetching in Vehicle Get**
  - **File:** `src/modules/vehicles/vehicles.service.ts:82-91`
  - **Issue:** Always fetching related delivery runs
  - **Fix Required:** Make it optional via parameter
  - **Estimated Time:** 20 minutes

### Error Handling

- [ ] **MEDIUM-011: Synchronous Error in Async Middleware**
  - **File:** `src/middleware/shopifyWebhook.ts:9`
  - **Issue:** Throwing error synchronously in async context
  - **Fix Required:** Use `next(error)` instead of `throw`
  - **Estimated Time:** 10 minutes

- [ ] **MEDIUM-012: Generic Error Messages**
  - **Files:** Multiple service files
  - **Issue:** Catching errors and throwing generic 500s
  - **Fix Required:** Preserve error details in development mode
  - **Estimated Time:** 1 hour

### Code Quality - Duplication

- [ ] **MEDIUM-013: Duplicate Geocoding Logic**
  - **Files:** `orders.service.ts:66-88`, `shopify.service.ts:105-120`
  - **Issue:** Same geocoding + WKT creation code duplicated
  - **Fix Required:** Extract to shared utility function
  - **Estimated Time:** 30 minutes

- [ ] **MEDIUM-014: Duplicate Available Resource Logic**
  - **Files:** `drivers.service.ts:170-201`, `vehicles.service.ts:182-212`
  - **Issue:** Nearly identical availability checking code
  - **Fix Required:** Create generic helper function
  - **Estimated Time:** 45 minutes

**Total Medium: 14 issues | Estimated Time: 6-7 hours**

---

## 🟢 LOW SEVERITY (Fix within 1 month)

### Code Quality - Magic Numbers

- [ ] **LOW-001: Magic Numbers in Service Duration**
  - **File:** `src/modules/runs/runs.service.ts:273`
  - **Issue:** Hardcoded `300` seconds
  - **Fix Required:** Create named constant `DEFAULT_SERVICE_DURATION_SECONDS`
  - **Estimated Time:** 5 minutes

- [ ] **LOW-002: Magic Numbers in Date Calculations**
  - **Files:** Multiple locations with `7 * 24 * 60 * 60 * 1000`
  - **Issue:** Hardcoded millisecond calculations
  - **Fix Required:** Use constants or `date-fns` library
  - **Estimated Time:** 15 minutes

### Code Quality - Validation

- [ ] **LOW-003: Inconsistent Validation Patterns**
  - **Files:** Various controller files
  - **Issue:** Mix of inline validation and Zod schemas
  - **Fix Required:** Standardize on Zod for all validation
  - **Estimated Time:** 1 hour

### Code Quality - Function Complexity

- [ ] **LOW-004: Complex optimizeRun Function**
  - **File:** `src/modules/runs/runs.service.ts:248-313`
  - **Issue:** Single 65-line function with multiple responsibilities
  - **Fix Required:** Break into smaller functions:
    - `extractOrderLocations()`
    - `buildOptimizationRequest()`
    - `executeOptimization()`
  - **Estimated Time:** 1 hour

### Error Handling - Consistency

- [ ] **LOW-005: Inconsistent Error Handling Patterns**
  - **Files:** Multiple service files
  - **Issue:** Different patterns for catching and re-throwing errors
  - **Fix Required:** Standardize error handling approach
  - **Estimated Time:** 1 hour

### Documentation

- [ ] **LOW-006: Missing JSDoc Comments**
  - **Files:** All service files
  - **Issue:** Public methods lack documentation
  - **Fix Required:** Add JSDoc comments for all public methods
  - **Estimated Time:** 2 hours

- [ ] **LOW-007: Missing API Error Response Examples**
  - **File:** `API.md`
  - **Issue:** Limited error response examples
  - **Fix Required:** Add examples for common error scenarios
  - **Estimated Time:** 30 minutes

**Total Low: 7 issues | Estimated Time: 6 hours**

---

## 📊 Summary Statistics

| Severity | Total Issues | Estimated Time | Status |
|----------|--------------|----------------|--------|
| 🚨 Critical | 3 | 45 minutes | ✅ **COMPLETE** (3/3) |
| 🔴 High | 7 | 6-7 hours | ✅ **COMPLETE** (7/7) |
| 🟡 Medium | 14 | 6-7 hours | 🟢 **IN PROGRESS** (4/14) |
| 🟢 Low | 7 | 6 hours | ⏳ Pending (0/7) |
| **TOTAL** | **31** | **~20 hours** | **45% Complete (14/31)** |

---

## 🎯 Recommended Action Plan

### Phase 1: Critical Security Fixes (Day 1)
**Time: 45 minutes - 1 hour**

1. Fix all 3 SQL injection vulnerabilities
2. Test with malicious input
3. Commit and push immediately

**Deliverable:** No SQL injection vulnerabilities

---

### Phase 2: Essential Security (Day 1-2)
**Time: 4-5 hours**

1. Implement JWT authentication middleware
2. Add rate limiting
3. Fix Shopify webhook verification
4. Test authentication flow

**Deliverable:** Secure API with authentication

---

### Phase 3: Database Integrity (Day 2-3)
**Time: 2-3 hours**

1. Add database transactions
2. Add missing indexes
3. Fix N+1 queries
4. Test under load

**Deliverable:** Reliable database operations

---

### Phase 4: Type Safety & Code Quality (Week 2)
**Time: 8-10 hours**

1. Fix TypeScript type assertions
2. Refactor duplicate code
3. Add proper validation
4. Improve error handling

**Deliverable:** Maintainable, type-safe codebase

---

### Phase 5: Polish & Documentation (Week 3-4)
**Time: 6-8 hours**

1. Remove magic numbers
2. Add JSDoc comments
3. Standardize patterns
4. Update documentation

**Deliverable:** Production-ready, documented system

---

## 📝 Progress Tracking

- **Started:** [x] ✅ 2024-01-15
- **Phase 1 Complete:** [x] ✅ All critical SQL injection vulnerabilities fixed
- **Phase 2 Complete:** [x] ✅ Authentication, rate limiting, webhook verification implemented
- **Phase 3 Complete:** [x] ✅ Database transactions and indexes added, N+1 queries fixed
- **Phase 4 Complete:** [ ] 🟢 IN PROGRESS - Type safety improvements (4/14 medium issues resolved)
- **Phase 5 Complete:** [ ] ⏳ Pending

---

## 🔧 Quick Fix Checklist

Before deploying to production, ensure:

- [x] All CRITICAL issues resolved ✅
- [x] All HIGH issues resolved ✅
- [x] Authentication implemented and tested ✅
- [x] Rate limiting enabled ✅
- [x] Database transactions in place ✅
- [x] SQL injection tests pass ✅
- [ ] Load testing completed
- [ ] Security scan performed
- [ ] Error handling tested
- [ ] Documentation updated

---

## 📚 References

- **Full Audit Report:** See agent output above
- **Prisma Best Practices:** https://www.prisma.io/docs/guides/performance-and-optimization
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **TypeScript Best Practices:** https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
- **Express Security:** https://expressjs.com/en/advanced/best-practice-security.html

---

**Last Updated:** 2024-11-15
**Next Review:** After Phase 4 completion (remaining MEDIUM and LOW priority issues)
