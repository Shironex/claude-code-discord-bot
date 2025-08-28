# TODO: Image Service & Project Improvements

This document outlines the comprehensive improvements needed for the image service API and overall project structure. The tasks are organized by priority and complexity.

## 🔧 High Priority - Configuration & Architecture Fixes

### Image Service Configuration Issues

#### 1. Unused Configuration Files in main.ts
**Problem**: Multiple config files exist but are not being used in `apps/image-service/src/main.ts`

**Tasks:**
- [x] **CORS Configuration** (`apps/image-service/src/config/cors.config.ts`) ✅ **COMPLETED**
  - ~~Currently duplicated in main.ts (lines 38-75)~~ ✅ Fixed
  - ~~Export CORS options directly from config file~~ ✅ Created `createCorsConfig()` function
  - ~~Import and use in main.ts: `app.enableCors(corsConfig())`~~ ✅ Implemented
  - ~~Remove inline CORS configuration~~ ✅ Removed 38 lines of duplicate code

- [x] **Startup Configuration** (`apps/image-service/src/config/startup.config.ts`) ✅ **COMPLETED**
  - ~~Move all console.log statements from main.ts to startup configuration~~ ✅ Fixed
  - ~~Implement startup service that handles application initialization logging~~ ✅ Created StartupService class
  - ~~Use startup config for enabling/disabling features (Swagger, Scalar, etc.)~~ ✅ Implemented conditional setup
  - ~~use proper IMAGE_SERVICE_BASE_URL env instead of hardcoded localhost endpoint in console logs~~ ✅ Uses configurable baseUrl

- [x] **Swagger Configuration** (`apps/image-service/src/config/swagger.config.ts`) ✅ **COMPLETED**
  - ~~Replace inline DocumentBuilder in main.ts (lines 90-109)~~ ✅ Created SwaggerService class
  - ~~Import and use: `SwaggerModule.createDocument(app, swaggerConfig())`~~ ✅ Implemented static methods
  - ~~Move Scalar API reference setup to swagger config~~ ✅ Centralized in SwaggerService
  - **✨ Enhanced**: Added ENABLE_SWAGGER and ENABLE_SCALAR env variables for fine control
  - **✨ Enhanced**: Moved Scalar from devDependencies to dependencies for production use

- [x] **Helmet Configuration** (`apps/image-service/src/config/helmet.config.ts`) ✅ **COMPLETED**
  - ~~Replace inline helmet setup in main.ts (lines 19-36)~~ ✅ Created createHelmetConfig() function
  - ~~Import and use: `app.use(helmet(helmetConfig()))`~~ ✅ Implemented with single line
  - ~~Utilize proper CSP directives from config~~ ✅ Environment-aware CSP with Swagger/Scalar support
  - **✨ Enhanced**: Configurable HSTS, referrer policy, and security headers via env variables
  - **✨ Enhanced**: Dynamic CSP that adapts to enabled documentation tools

- [x] **Multer Configuration** (`apps/image-service/src/config/multer.config.ts`) ✅ **COMPLETED**
  - ~~Currently not used anywhere in the application~~ ✅ Added to app.module.ts ConfigModule
  - ~~Integrate with file upload endpoints~~ ✅ Created createMulterConfig() function with ConfigService
  - ~~Replace manual file validation with multer config~~ ✅ Replaced hardcoded limits with configuration constants
  - **✨ Enhanced**: Environment-aware file size and count limits from configuration
  - **✨ Enhanced**: Proper integration with upload.module.ts using function instead of fallback

#### 2. Configuration Validation ✅ **COMPLETED**
**Problem**: No validation of environment variables at startup

**Tasks:**
- [x] **Add Joi Validation** (`apps/image-service/src/app.module.ts`) ✅ **COMPLETED**
  - ~~Install `joi` and `@nestjs/config` validation~~ ✅ Added joi ^18.0.1 dependency
  - ~~Create comprehensive validation schema for all env variables~~ ✅ Created validation.schema.ts with 30+ variables
  - ~~Add to ConfigModule.forRoot({ validationSchema })~~ ✅ Integrated with ConfigModule
  - ~~Ensure application fails fast with clear error messages~~ ✅ Validated with custom error messages
  - **✨ Enhanced**: Custom validation rules for TTL relationships and production security requirements
  - **✨ Enhanced**: Comprehensive validation covering core, auth, Redis, uploads, TTL, rate limiting, CORS, security
  - **✨ Enhanced**: Production-specific validation for API keys and HMAC configuration

- [x] **Environment Documentation** ✅ **COMPLETED**
  - ~~Update `apps/image-service/.env.example` with all config options~~ ✅ Comprehensive 30+ variable documentation
  - ~~Organize into REQUIRED and OPTIONAL sections~~ ✅ Clear section headers and organization
  - ~~Add descriptions for each variable~~ ✅ Detailed descriptions with validation rules and defaults
  - ~~Document validation rules and limits~~ ✅ Complete validation notes and production guidance
  - **✨ Enhanced**: Redis username support added to validation schema and service
  - **✨ Enhanced**: Production deployment guidance and security recommendations
  - **✨ Enhanced**: Examples for complex configurations (CORS, MIME types, TTL relationships)

## 🔄 Medium Priority - Shared Package Refactoring

### 3. Shared Types Package Improvements

#### Package Structure & Naming
**Problem**: Package name doesn't reflect full scope of shared utilities

**Tasks:**
- [x] **Rename Package** 
  - Rename `packages/shared-types` to `packages/shared` ✅ Completed
  - Update package.json name to `@claude-code/shared` ✅ Completed
  - Update all imports in discord-bot and image-service ✅ Completed
  - Update turbo.json references ✅ Completed

#### Logger Migration
**Problem**: Excellent logger system only exists in discord-bot, should be shared

**Tasks:**
- [x] **Move Logger to Shared Package** ✅ **COMPLETED**
  - ~~Copy entire `apps/discord-bot/src/logger/` to `packages/shared/src/logger/`~~ ✅ Migrated with full Winston-based system
  - ~~Export logger modules from shared package index~~ ✅ LoggerService, LoggerFactory, and LoggerModule exported
  - ~~Update discord-bot to import from `@claude-code/shared`~~ ✅ Updated to use shared logger package
  - ~~Integrate logger into image-service for consistent logging~~ ✅ Full integration with NestJS internal logging
  - ~~Update both services to use shared logger configuration~~ ✅ Peer dependencies and ConfigService integration
  - **✨ Enhanced**: Security filtering for sensitive data (tokens, passwords, API keys)
  - **✨ Enhanced**: Performance monitoring with timing, memory tracking, and slow operation detection
  - **✨ Enhanced**: Multiple transports (console, error files, combined files, service-specific files)
  - **✨ Enhanced**: Optional ConfigService with fallback to environment variables
  - **✨ Enhanced**: Custom logger configured as NestJS internal logger via LoggerFactory

#### Duplicate Constants Resolution
**Problem**: IMAGE_CONSTANTS exists in both shared-types and image-service

**Current Duplicates:**
- `packages/shared-types/src/constants.ts` - SHARED_IMAGE_CONSTANTS
- `apps/image-service/src/common/constants/image.constants.ts` - IMAGE_CONSTANTS

**Tasks:**
- [ ] **Consolidate Image Constants**
  - Compare both constant files and merge all unique values
  - Keep single source in `packages/shared/src/constants/`
  - Remove image-service local constants
  - Update all imports to use shared constants
  - Ensure consistent naming (SHARED_IMAGE_CONSTANTS vs IMAGE_CONSTANTS)

- [ ] **Add Missing Constants to Shared**
  - Redis key patterns
  - API endpoint paths
  - Security headers
  - Rate limiting values
  - Error codes and messages

## 🧹 Code Quality & Cleanup

### 4. Remove Duplicate & Unused Code

#### Type Definitions
**Tasks:**
- [ ] **Audit Type Definitions**
  - Find duplicate interface definitions across services
  - Consolidate shared types in packages/shared
  - Remove service-specific duplicate types
  - Ensure consistent type naming conventions

#### Import Cleanup
**Tasks:**  
- [ ] **Remove Unused Imports**
  - Run automated import cleanup on all TypeScript files
  - Use `ts-unused-exports` to find unused exports
  - Clean up circular dependencies
  - Organize imports by type (3rd party, internal, relative)

#### Validation Logic
**Problem**: File validation logic duplicated across multiple files

**Current Locations:**
- `apps/image-service/src/config/multer.config.ts`
- `apps/image-service/src/common/utils/file-validation.util.ts`
- `apps/image-service/src/modules/upload/validators/file.validator.ts`

**Tasks:**
- [ ] **Consolidate Validation**
  - Move all validation logic to shared package
  - Create unified file validation utilities
  - Remove duplicate validation functions
  - Use shared validation in both multer config and upload services

### 5. Enhanced Swagger Documentation

#### Swagger Decorators
**Tasks:**
- [ ] **Create Common Swagger Decorators**
  - `@ApiImageUpload()` - Standard file upload documentation
  - `@ApiImageResponse()` - Standard image response format
  - `@ApiErrorResponses()` - Common error response formats
  - `@ApiAuthRequired()` - API key + HMAC auth documentation

#### Module-Specific Documentation
**Tasks:**
- [ ] **Create Module Swagger Files**
  - `apps/image-service/src/modules/upload/upload.swagger.ts`
  - `apps/image-service/src/modules/storage/storage.swagger.ts`
  - `apps/image-service/src/modules/auth/auth.swagger.ts`
  - `apps/image-service/src/modules/health/health.swagger.ts`
  - Import and use in respective controllers

## 🔍 Additional Improvements Found

### 6. Environment & Configuration Improvements

#### Environment File Updates
**Problem**: .env.example is outdated and missing sections

**Current Issues:**
- Missing many configuration variables from configuration.config.ts
- No organization of required vs optional
- Inconsistent naming with actual environment variables used

**Tasks:**
- [ ] **Update .env.example**
  ```bash
  # === REQUIRED CONFIGURATION ===
  PORT=3001
  NODE_ENV=development
  
  # Authentication (Required)
  DISCORD_BOT_API_KEY=discord_AbCdEf1234567890_base64url_encoded_key
  CLAUDE_CODE_API_KEY=claude_XyZ9876543210_base64url_encoded_key  
  HMAC_SECRET=base64_encoded_hmac_secret_for_signature_validation
  
  # Redis Configuration (Required)
  REDIS_HOST=localhost
  REDIS_PORT=6379
  REDIS_DB=0
  
  # === OPTIONAL CONFIGURATION ===
  # ... continue with all optional configs
  ```

#### Missing Integration Checks
**Tasks:**
- [ ] **Verify Shared Types Usage**
  - Audit if image-service actually uses types from shared-types package
  - Add missing imports where appropriate
  - Remove local type definitions that exist in shared package

### 7. Build & Development Improvements

#### Package Dependencies
**Tasks:**
- [ ] **Update Package Dependencies**
  - Ensure image-service includes @claude-code/shared as dependency
  - Update Discord bot imports to use shared logger
  - Verify turbo.json includes proper build dependencies
  - Test build pipeline after refactoring

#### Development Scripts
**Tasks:**
- [ ] **Add Development Helpers**
  - Script to validate configuration completeness
  - Script to check for duplicate constants/types
  - Script to verify shared package usage
  - Update package.json scripts for common tasks

## 📋 Implementation Order

### Phase 1: Critical Fixes
1. Fix unused config files in main.ts
2. Add configuration validation with joi
3. Update .env.example file

### Phase 2: Shared Package Refactoring  
1. Rename shared-types to shared
2. Move logger to shared package
3. Consolidate duplicate constants
4. Update all imports

### Phase 3: Code Cleanup
1. Remove duplicate validation logic
2. Clean unused imports and exports
3. Consolidate type definitions
4. Create swagger decorators and module docs

### Phase 4: Verification
1. Verify all services use shared package correctly
2. Test build pipeline
3. Validate configuration loading
4. Test development and production modes

## 🧪 Testing Considerations

### Before Starting Refactoring
- [ ] Verify current functionality works as expected
- [ ] Document current API behavior for regression testing
- [ ] Create backup of current working state

### During Refactoring
- [ ] Test configuration changes incrementally
- [ ] Verify shared package imports work correctly
- [ ] Test both development and production builds
- [ ] Validate environment variable loading

### After Completion
- [ ] Full integration test between discord-bot and image-service
- [ ] Verify all configuration options work as expected
- [ ] Test error handling and validation
- [ ] Performance testing with shared logger

---

**Priority Legend:**
- 🔧 High Priority - Critical functionality fixes
- 🔄 Medium Priority - Architecture improvements  
- 🧹 Code Quality - Cleanup and maintenance

**Estimated Complexity:**
- **Phase 1**: 4-6 hours (straightforward config fixes)
- **Phase 2**: 8-12 hours (package restructuring, import updates)
- **Phase 3**: 6-8 hours (code cleanup and documentation)
- **Phase 4**: 2-4 hours (testing and verification)

**Total Estimated Time**: 20-30 hours