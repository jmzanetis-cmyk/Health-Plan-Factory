# Sentry Error Tracking Setup

Health Plan Factory uses `@sentry/react-native` for crash reporting and error tracking.
Sentry is **disabled in development** (`__DEV__ === true`) and only activates in production
builds when a DSN is provided.

---

## 1. Create a Sentry project

1. Go to https://sentry.io and log in (or create a free account).
2. Create a new project → Platform: **React Native**.
3. Copy the **DSN** from the project settings (looks like
   `https://abc123@o000000.ingest.sentry.io/0000000`).

---

## 2. Set the DSN in EAS Secrets (required before production build)

The DSN must be set as an EAS secret so it is injected at build time:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://your-dsn@o000000.ingest.sentry.io/0000000"
```

> **Why `EXPO_PUBLIC_`?** The `EXPO_PUBLIC_` prefix makes the variable available in the
> JavaScript bundle at runtime via `process.env.EXPO_PUBLIC_SENTRY_DSN`. Without this prefix
> the variable is build-time only and not accessible in JS.

---

## 3. Configure the Sentry Expo plugin (already in app.config.js)

The `@sentry/react-native/expo` plugin is already declared in `app.config.js` and configures
native SDKs (Sentry Cocoa on iOS, Sentry Android) for native crash capture. It reads two
environment variables for source map uploading:

| Variable | Purpose | Default |
|---|---|---|
| `SENTRY_ORG` | Sentry organization slug | `"healthplanfactory"` (placeholder) |
| `SENTRY_PROJECT` | Sentry project slug | `"health-plan-mobile"` (placeholder) |

**Before running `eas build --platform ios --profile production`:**

1. Find your Sentry **organization slug** and **project slug** in your Sentry dashboard URL:
   `https://sentry.io/organizations/<org-slug>/projects/<project-slug>/`

2. Set them as EAS secrets (so they're available during the build):
   ```bash
   eas secret:create --scope project --name SENTRY_ORG --value "your-actual-org-slug"
   eas secret:create --scope project --name SENTRY_PROJECT --value "your-actual-project-slug"
   ```
   If you leave the defaults, source map uploads will fail but crash capture still works.

3. Rebuild: `eas build --platform ios --profile production`

---

## 4. Verify the integration (development)

To test that Sentry is wired up without a production build, temporarily set
`enabled: true` and add a test throw in `_layout.tsx`, then revert:

```ts
// Temporary test — revert before committing
throw new Error("Sentry test error");
```

You should see the event appear in your Sentry project dashboard within ~30 seconds.

---

## 5. What is captured

| Error type | Captured? | How |
|---|---|---|
| Unhandled JS errors | Yes | Sentry patches the global error handler on `Sentry.init()` |
| Unhandled Promise rejections | Yes | Sentry patches `Promise` on `Sentry.init()` |
| React render errors | Yes | `ErrorBoundary.componentDidCatch()` calls `Sentry.captureException()` |
| Native crashes (iOS) | Yes, with plugin | Requires `@sentry/react-native/expo` plugin in `app.config.js` |
| Performance traces | No | Out of scope for v1.0 |
| Source maps | No | Add EAS build hooks later for de-obfuscated stack traces |

---

## 6. Privacy note

Sentry event payloads may include:
- Stack traces (JS file paths, line numbers)
- Device type and OS version
- App version and build number
- Error message text (which may contain user-entered data in edge cases)

Sentry's data residency can be configured (EU servers available). Review your Sentry
project's data scrubbing settings and update the Privacy Policy / PRIVACY.md if
enabling PII scrubbing or custom data collection.
