# Release Process

This document describes how to create a new release of deno-mcp-pandoc.

## Prerequisites

- Git repository is clean (no uncommitted changes)
- All tests pass: `deno task test`
- Code is formatted and linted: `deno task fmt && deno task lint`
- You have push access to the repository

## Release Steps

### 1. Bump Version

Use the version bump script to update version numbers across the codebase:

```bash
# For a patch release (1.0.0 → 1.0.1)
deno task version-bump patch

# For a minor release (1.0.1 → 1.1.0)
deno task version-bump minor

# For a major release (1.1.0 → 2.0.0)
deno task version-bump major
```

The script will:

- Update `deno.json` version field
- Update version in `src/mcp.ts` (MCP server version)
- Update version in `src/main.ts` (health check response)
- Run tests to ensure everything works
- Format and lint the code
- Create a git commit with the changes
- Create a git tag (e.g., `v1.0.1`)

### 2. Push Changes

Push the commit and tag to GitHub:

```bash
# Push the commit
git push

# Push the tag (this triggers the release workflow)
git push origin v1.0.1  # Replace with your version
```

### 3. Automated Release

When you push the tag, GitHub Actions will automatically:

- Build binaries for all supported platforms:
  - macOS x86_64
  - macOS ARM64 (Apple Silicon)
  - Linux x86_64
  - Linux ARM64
  - Windows x86_64
- Package the binaries (tar.gz for Linux, zip for macOS/Windows)
- Create a GitHub release with auto-generated release notes
- Attach all binary packages to the release

### 4. Verify Release

1. Go to https://github.com/YOUR_USERNAME/deno-mcp-pandoc/releases
2. Verify the release was created successfully
3. Check that all binary artifacts are attached
4. Review the auto-generated release notes
5. Edit the release notes if needed to add additional context

## Manual Release (if needed)

If the automated release fails or you need to create a release manually:

```bash
# Build binaries for all platforms
deno task build-mac-x86_64
deno task build-mac-arm64
deno task build-linux-x86_64
deno task build-linux-arm64
deno task build-windows-x86_64

# Package the binaries
cd build
zip mcp-pandoc-mac-x86_64-v1.0.1.zip mcp-pandoc-mac-x86_64
zip mcp-pandoc-mac-arm64-v1.0.1.zip mcp-pandoc-mac-arm64
tar -czf mcp-pandoc-linux-x86_64-v1.0.1.tar.gz mcp-pandoc-linux-x86_64
tar -czf mcp-pandoc-linux-arm64-v1.0.1.tar.gz mcp-pandoc-linux-arm64
zip mcp-pandoc-windows-x86_64-v1.0.1.zip mcp-pandoc-windows-x86_64.exe

# Create GitHub release manually and upload artifacts
```

## Dry Run

You can test the version bump process without making any changes:

```bash
deno task version-bump patch --dry-run
```

This will show you what would be changed without actually modifying any files or creating commits.

## Troubleshooting

### Version bump fails: "Working directory is not clean"

Ensure all changes are committed:

```bash
git status
git add .
git commit -m "your changes"
```

### Tests fail during version bump

Fix the failing tests before attempting the version bump:

```bash
deno task test
```

### Release workflow doesn't trigger

Ensure you pushed the tag:

```bash
git push origin v1.0.1  # Replace with your version
```

Check the Actions tab on GitHub to see if the workflow is running.

### Binary build fails in CI

Check the GitHub Actions logs for errors. Common issues:

- Missing dependencies
- TypeScript errors (use `--no-check` flag)
- Permission issues

## Version Scheme

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for added functionality in a backward compatible manner
- **PATCH** version for backward compatible bug fixes

## Questions?

If you encounter issues with the release process, please open an issue on GitHub.
