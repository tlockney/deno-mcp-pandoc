# Authorization System Implementation Plan

## Executive Summary

This document outlines the implementation plan for adding OAuth 2.1-based authorization to the HTTP transport mode of the deno-mcp-pandoc MCP server. The implementation follows the Model Context Protocol (MCP) specification updated in March 2025, which mandates OAuth 2.1 as the standard authorization mechanism for HTTP-based MCP servers.

## Background

### Current State

The deno-mcp-pandoc server currently supports two transport modes:

1. **Stdio Transport** (`src/server.ts`) - Used by Claude Desktop (no auth required, local process)
2. **HTTP Transport** (`src/http-server.ts`) - Used by web applications (currently **no authentication**)

The HTTP server (`src/http-server.ts:182-259`) currently has:
- **Open CORS**: `Access-Control-Allow-Origin: "*"` allowing any domain
- **No Authentication**: No API keys, tokens, or session validation
- **Basic Validation**: Input format/parameter validation only
- **Public Endpoints**: `/health`, `/sse`, `/mcp` endpoints are publicly accessible

### Security Gaps

1. Any client can access the server and execute Pandoc conversions
2. No rate limiting or abuse prevention
3. File system access controlled only by OS permissions
4. No audit trail of who performed conversions
5. Cannot restrict access by organization or user

### MCP Authorization Standards (2025)

According to the MCP specification (March 2025) and June 2025 updates:

- **MUST** implement OAuth 2.1 for HTTP-based MCP servers
- **MUST** use PKCE (Proof Key for Code Exchange) for all clients
- **MUST** serve authorization endpoints over HTTPS in production
- **MUST** securely store tokens following OAuth 2.0 best practices
- **SHOULD** enforce token expiration and rotation
- **SHOULD** implement Resource Indicators to prevent token misuse across servers
- **SHOULD** support both confidential (server-side) and public (client-side) clients

## Goals

### Primary Goals

1. **Secure HTTP Endpoints**: Protect `/sse` and `/mcp` endpoints with OAuth 2.1 authentication
2. **MCP Compliance**: Follow MCP specification requirements for authorization
3. **Flexible Deployment**: Support both single-tenant (API keys) and multi-tenant (OAuth) scenarios
4. **Zero Stdio Impact**: Keep stdio transport unchanged (no auth required)
5. **Developer Experience**: Maintain ease of setup for development and testing

### Secondary Goals

1. Rate limiting per client/token
2. Audit logging for compliance
3. Token scope management (future: per-tool authorization)
4. Integration with popular identity providers (Auth0, Okta, etc.)

## Architecture Design

### Authorization Modes

The system will support **three authorization modes** (configured via environment variable):

```typescript
type AuthMode = "none" | "api-key" | "oauth2.1";
```

#### Mode 1: None (Development Only)
- **Use Case**: Local development, testing
- **Security**: No authentication required
- **Config**: `AUTH_MODE=none` (default for backward compatibility)

#### Mode 2: API Key (Simple Single-Tenant)
- **Use Case**: Single organization, server-to-server, simple deployments
- **Security**: Bearer token authentication with static API keys
- **Config**: `AUTH_MODE=api-key`
- **Implementation**: Custom middleware validating `Authorization: Bearer <api-key>`

#### Mode 3: OAuth 2.1 (Production Multi-Tenant)
- **Use Case**: Multi-tenant SaaS, enterprise deployments
- **Security**: Full OAuth 2.1 with PKCE, token introspection
- **Config**: `AUTH_MODE=oauth2.1`
- **Implementation**: Integration with external OAuth 2.1 provider

### Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   HTTP Request                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│               CORS Middleware                           │
│  - Configurable allowed origins                         │
│  - Credential support for auth                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Authorization Middleware                      │
│  ┌───────────────────────────────────────────────┐     │
│  │  Mode Router                                   │     │
│  │  - none: Skip auth                            │     │
│  │  - api-key: API Key Validator                 │     │
│  │  - oauth2.1: OAuth Token Validator            │     │
│  └────────────────┬──────────────────────────────┘     │
│                   │                                      │
│                   ▼                                      │
│  ┌───────────────────────────────────────────────┐     │
│  │  Token Validation                             │     │
│  │  - Signature verification                     │     │
│  │  - Expiration check                           │     │
│  │  - Scope validation                           │     │
│  │  - Introspection (OAuth only)                 │     │
│  └────────────────┬──────────────────────────────┘     │
└───────────────────┼──────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Request Context                            │
│  - User/Client ID                                       │
│  - Token scopes                                         │
│  - Rate limit bucket                                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Rate Limiting Middleware                      │
│  - Per-client token bucket                              │
│  - Configurable limits                                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Audit Logging                              │
│  - Request metadata                                     │
│  - User/client identity                                 │
│  - Action performed                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│          Existing MCP Handler                           │
│  - StreamableHTTPServerTransport                        │
│  - Tool execution                                       │
└─────────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── http-server.ts              # Main HTTP server (modified)
├── auth/
│   ├── middleware.ts           # Main auth middleware router
│   ├── types.ts                # Auth types and interfaces
│   ├── config.ts               # Auth configuration
│   ├── api-key/
│   │   ├── validator.ts        # API key validation logic
│   │   ├── manager.ts          # API key management (CRUD)
│   │   └── storage.ts          # API key storage (file/env/db)
│   ├── oauth/
│   │   ├── validator.ts        # OAuth token validation
│   │   ├── introspection.ts    # Token introspection client
│   │   ├── pkce.ts             # PKCE verification utilities
│   │   └── provider.ts         # OAuth provider configuration
│   ├── rate-limit.ts           # Rate limiting implementation
│   └── audit.ts                # Audit logging
└── server.ts                   # Stdio server (unchanged)
```

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal**: Set up auth infrastructure and API key mode

**Tasks**:

1. **Auth Configuration System**
   - Create `src/auth/config.ts` with environment-based configuration
   - Add `AUTH_MODE` environment variable support
   - Define auth configuration interfaces

2. **Auth Middleware Framework**
   - Create `src/auth/middleware.ts` with mode routing
   - Implement pass-through for `AUTH_MODE=none`
   - Add request context type definitions

3. **API Key Authentication**
   - Implement `src/auth/api-key/validator.ts`
   - Support `Authorization: Bearer <token>` header parsing
   - Create API key storage interface (start with environment variables)
   - Add API key hashing/comparison (use crypto.subtle)

4. **Integration**
   - Modify `src/http-server.ts` to use auth middleware
   - Exempt `/health` endpoint from authentication
   - Add auth error responses (401, 403)

5. **Testing**
   - Unit tests for API key validation
   - Integration tests for protected endpoints
   - Test all three auth modes

**Deliverables**:
- Working API key authentication
- Configuration system
- Tests passing
- Documentation update

### Phase 2: OAuth 2.1 Support (Week 2)

**Goal**: Implement OAuth 2.1 token validation

**Tasks**:

1. **OAuth Configuration**
   - Create `src/auth/oauth/provider.ts` for provider config
   - Support Auth0, Okta, generic OAuth 2.1 providers
   - Add JWKS endpoint configuration
   - Define required environment variables

2. **Token Validation**
   - Implement `src/auth/oauth/validator.ts`
   - JWT signature verification using JWKS
   - Token expiration and issuer validation
   - Scope validation framework

3. **Token Introspection**
   - Implement `src/auth/oauth/introspection.ts`
   - Support RFC 7662 token introspection
   - Caching layer for introspection results
   - Fallback to introspection if JWT validation fails

4. **PKCE Support**
   - Document PKCE requirements for clients
   - Add PKCE verification utilities (if server acts as OAuth provider)
   - Client library examples

5. **Testing**
   - Mock OAuth provider for tests
   - JWT validation tests with various scenarios
   - Token introspection tests
   - Integration tests with real OAuth provider (Auth0 test tenant)

**Deliverables**:
- Working OAuth 2.1 token validation
- Support for major OAuth providers
- PKCE documentation
- Tests passing

### Phase 3: Rate Limiting & Audit (Week 3)

**Goal**: Add rate limiting and audit logging

**Tasks**:

1. **Rate Limiting**
   - Implement `src/auth/rate-limit.ts`
   - Token bucket algorithm per client ID
   - Configurable limits via environment variables
   - Rate limit headers (X-RateLimit-*)
   - 429 Too Many Requests responses

2. **Audit Logging**
   - Implement `src/auth/audit.ts`
   - Structured logging format (JSON)
   - Log authentication attempts (success/failure)
   - Log tool invocations with client ID
   - Configurable log levels and outputs

3. **Enhanced Security**
   - Update CORS configuration to restrict origins
   - Add security headers (HSTS, CSP, etc.)
   - Implement request ID tracking
   - Add timeout configuration

4. **Monitoring**
   - Add metrics endpoint (optional)
   - Health check includes auth system status
   - Token validation performance monitoring

**Deliverables**:
- Rate limiting working
- Audit logs generating
- Security headers implemented
- Tests passing

### Phase 4: Tooling & Documentation (Week 4)

**Goal**: Developer tools and comprehensive documentation

**Tasks**:

1. **API Key Management CLI**
   - Create `scripts/manage-api-keys.ts`
   - Commands: generate, list, revoke
   - Store in encrypted file or database
   - Support key rotation

2. **Documentation**
   - Update README.md with auth setup instructions
   - Create SECURITY.md with security best practices
   - OAuth provider setup guides (Auth0, Okta, generic)
   - Client integration examples
   - Troubleshooting guide

3. **Example Configurations**
   - Docker Compose setup with Auth0
   - Kubernetes deployment manifests with secrets
   - Environment variable templates
   - Client code examples (TypeScript, Python)

4. **Migration Guide**
   - Backward compatibility notes
   - Upgrade path from no-auth to API key
   - Upgrade path from API key to OAuth
   - Rollback procedures

**Deliverables**:
- CLI tool for API key management
- Complete documentation
- Example configurations
- Migration guide

## Configuration

### Environment Variables

```bash
# Auth Mode Configuration
AUTH_MODE=none|api-key|oauth2.1  # Default: none

# API Key Mode
API_KEYS=key1,key2,key3           # Comma-separated API keys
API_KEY_STORAGE=env|file|redis    # Storage backend (default: env)
API_KEY_FILE=/path/to/keys.json   # If storage=file

# OAuth 2.1 Mode
OAUTH_ISSUER=https://auth.example.com/
OAUTH_AUDIENCE=https://mcp-pandoc.example.com
OAUTH_JWKS_URI=https://auth.example.com/.well-known/jwks.json
OAUTH_INTROSPECTION_URI=https://auth.example.com/oauth/introspect
OAUTH_CLIENT_ID=server-client-id
OAUTH_CLIENT_SECRET=server-secret  # For introspection
OAUTH_REQUIRED_SCOPES=mcp:convert  # Comma-separated scopes

# CORS Configuration
CORS_ALLOWED_ORIGINS=https://app.example.com,https://other.example.com
CORS_ALLOW_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100          # Requests per window
RATE_LIMIT_WINDOW=60             # Window in seconds

# Audit Logging
AUDIT_LOG_ENABLED=true
AUDIT_LOG_LEVEL=info|debug
AUDIT_LOG_OUTPUT=console|file|remote
AUDIT_LOG_FILE=/var/log/mcp-pandoc/audit.log

# Security
REQUIRE_HTTPS=true               # Reject HTTP in production
REQUEST_TIMEOUT=30               # Request timeout in seconds
```

### Example: API Key Setup

```bash
# Generate API key
deno run --allow-all scripts/manage-api-keys.ts generate --name "production-app"
# Output: Generated API key: mcp_abc123def456...

# Start server with API key auth
export AUTH_MODE=api-key
export API_KEYS=mcp_abc123def456...
deno task start:http
```

### Example: OAuth 2.1 with Auth0

```bash
# Configure Auth0 provider
export AUTH_MODE=oauth2.1
export OAUTH_ISSUER=https://dev-abc123.us.auth0.com/
export OAUTH_AUDIENCE=https://mcp-pandoc.example.com
export OAUTH_JWKS_URI=https://dev-abc123.us.auth0.com/.well-known/jwks.json
export OAUTH_REQUIRED_SCOPES=mcp:convert
export CORS_ALLOWED_ORIGINS=https://app.example.com
export CORS_ALLOW_CREDENTIALS=true

# Start server
deno task start:http
```

## Security Considerations

### Token Storage

**API Keys**:
- Store hashed (SHA-256) in database/file, never plaintext
- Use constant-time comparison to prevent timing attacks
- Rotate keys periodically (at least annually)

**OAuth Tokens**:
- Clients MUST store access tokens securely (browser: memory only, no localStorage)
- Refresh tokens MUST be stored encrypted
- Use short-lived access tokens (15-60 minutes)
- Use refresh token rotation

### Transport Security

- **Production MUST use HTTPS**: Reject HTTP requests in production (`REQUIRE_HTTPS=true`)
- Use TLS 1.2+ with strong cipher suites
- Consider mTLS for server-to-server scenarios

### Attack Prevention

1. **Token Replay**: Use jti (JWT ID) claim and track revoked tokens
2. **Token Theft**: Short expiration times, token binding
3. **CORS Bypass**: Strict origin validation, no wildcards in production
4. **DDoS**: Rate limiting, request size limits, timeouts
5. **Path Traversal**: Already validated in existing code, maintain this
6. **Command Injection**: Pandoc is trusted, but validate all file paths

### Compliance

- **GDPR**: Audit logs may contain PII, implement retention policies
- **SOC 2**: Audit logging supports compliance requirements
- **HIPAA**: If processing health data, ensure OAuth provider is HIPAA-compliant

## Testing Strategy

### Unit Tests

- Auth middleware routing
- API key validation (valid, invalid, expired)
- JWT parsing and validation
- Token introspection
- Rate limiting algorithm
- Audit log formatting

### Integration Tests

- End-to-end request flow with API key
- End-to-end request flow with OAuth token
- CORS preflight with auth
- Rate limit enforcement
- Error responses (401, 403, 429)

### Security Tests

- Invalid token formats
- Expired tokens
- Wrong signature tokens
- Missing authorization header
- Scope validation
- Rate limit bypass attempts

### Performance Tests

- Token validation latency
- JWKS caching effectiveness
- Rate limiting overhead
- Audit logging performance impact

## Migration Path

### Backward Compatibility

**Default Behavior**: `AUTH_MODE=none` maintains current behavior (no breaking changes)

**Adoption Path**:
1. **v1.1.0**: Add auth system, default to `none`
2. **v1.2.0**: Encourage API key mode via documentation
3. **v2.0.0**: Consider making auth required, deprecate `none` mode

### Rollout Strategy

1. **Development**: Test with `AUTH_MODE=none` and `AUTH_MODE=api-key`
2. **Staging**: Deploy with OAuth 2.1 using test identity provider
3. **Production**: Deploy with OAuth 2.1 and production identity provider
4. **Monitoring**: Watch error rates, latency, auth failures

### Rollback Plan

If issues arise:
1. Set `AUTH_MODE=none` via environment variable
2. Restart service (no code changes needed)
3. Investigate and fix issues
4. Re-enable auth mode

## Success Metrics

- **Security**: Zero unauthorized access incidents
- **Performance**: <10ms auth overhead per request
- **Reliability**: 99.9% auth validation success rate
- **Adoption**: 100% of production deployments use auth
- **Compliance**: Audit logs meet SOC 2 requirements

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| OAuth provider downtime | Service unavailable | Medium | Cache introspection results, implement circuit breaker |
| Breaking existing clients | Production outage | Low | Default to `AUTH_MODE=none`, phased rollout |
| Performance degradation | Poor UX | Medium | JWKS caching, optimized validation, load testing |
| Complex configuration | Adoption barrier | High | Comprehensive docs, examples, sensible defaults |
| Token leakage | Security breach | Low | Short expiration, HTTPS enforcement, security scanning |

## Open Questions

1. **API Key Persistence**: Should we implement a database backend for API keys or start with file-based storage?
   - **Recommendation**: Start with file-based, add database support later

2. **OAuth Provider**: Should we provide a built-in minimal OAuth server or require external provider?
   - **Recommendation**: Require external provider (Auth0, Okta, etc.) to reduce complexity

3. **Scope Granularity**: Should scopes be per-tool (`mcp:convert:markdown`, `mcp:convert:pdf`) or server-level (`mcp:convert`)?
   - **Recommendation**: Start with server-level, add tool-level in future version

4. **Token Revocation**: Should we implement a token revocation list (blocklist)?
   - **Recommendation**: Yes, for API keys. For OAuth, rely on introspection endpoint.

5. **Stdio Auth**: Should stdio transport ever require auth?
   - **Recommendation**: No, stdio is inherently local and trusted

## References

- [MCP Authorization Specification (March 2025)](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization)
- [OAuth 2.1 Specification](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-08)
- [RFC 7636: PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [RFC 7662: Token Introspection](https://datatracker.ietf.org/doc/html/rfc7662)
- [Auth0 MCP Guide](https://auth0.com/blog/an-introduction-to-mcp-and-authorization/)
- [Stytch MCP Implementation Guide](https://stytch.com/blog/MCP-authentication-and-authorization-guide/)

## Next Steps

1. **Review**: Team review of this plan
2. **Approval**: Security team sign-off
3. **Environment Setup**: Provision Auth0 test tenant
4. **Sprint Planning**: Break down Phase 1 into stories
5. **Kickoff**: Begin Phase 1 implementation

---

**Document Version**: 1.0
**Author**: Claude (AI Assistant)
**Date**: 2025-10-21
**Status**: Draft - Awaiting Review
