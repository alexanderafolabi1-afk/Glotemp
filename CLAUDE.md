# Glotemp Project Guidelines

## STANDING RULE - Assets Directory

**Never generate, overwrite, replace, convert or delete any file in `/assets/`.**

Everything in `/assets/` is artwork uploaded by hand. It cannot be regenerated. Previous sessions have overwritten barometer artwork with placeholder rectangles, destroying originals.

### Prohibited Actions
- Do not create WebP, AVIF or resized variants of anything in `/assets/`
- Do not write placeholder or stand-in images anywhere, ever
- Do not optimise uploaded artwork

### When an Image is Missing
If an image referenced by the code does not exist:
1. Report it immediately
2. Stop all work
3. Do not create a substitute

### Verification
After any work session, verify:
- `git diff --stat -- assets/` returns nothing
- No files were created, modified, or deleted in `/assets/`
