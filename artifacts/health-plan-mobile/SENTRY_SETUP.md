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

## 3. Add the Sentry Expo plugin (required for native crash reporting)

For full native crash capture (not just JS errors), add the Sentry plugin to `app.config.js`
**before running `eas build`**:

1. Find your Sentry **organization slug** and **project slug** in your Sentry dashboard URL:
   `https://sentry.io/organizations/<org-slug>/projects/<project-slug>/`

2. Add the plugin to `app.config.js`:

```js
plugins: [
  // ... existing plugins ...
  [
    "@sentry/react-native/expo",
    {
      organization: "your-org-slug",
      project: "your-project-slug",
    },
  ],
],
```

3. Rebuild with EAS: `eas build --platform ios --profile production`

> **Note:** The plugin is optional for JS-only error tracking (ErrorBoundary, unhandled
> promise rejections). It is required for native crash reports (C++/ObjC crashes).

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
