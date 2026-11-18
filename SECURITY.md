# Security

## Reporting

Open a private security advisory on GitHub, or contact the maintainer through their GitHub profile. Please do not open a
public issue for a vulnerability.

## What Winnow protects

- **No admin keys in the app.** The app holds only the server-side Flagsmith environment key and the LLM key, both from
  environment variables. Admin work happens on a developer's machine through the Flagsmith CLI.
- **Untrusted input.** README text is capped at 12,000 characters, wrapped in `<readme>` tags, and the prompts tell the
  model to ignore instructions inside it. Output is rendered as plain text.
- **SSRF.** Repo-link input accepts only `https://github.com/<owner>/<repo>`.
- **Identity.** The anonymous ID is an HMAC-signed, HTTP-only, SameSite=Lax cookie. Votes require a signed, expiring roast
  token that must match the cookie's identity.
- **CSRF and abuse.** POST routes refuse cross-site origins and oversized bodies, and cap roasts per visitor and per IP.
  A `roasts_enabled` flag is the kill switch.
- **Headers.** A strict Content-Security-Policy, `X-Frame-Options: DENY`, `nosniff`, a referrer policy and a permissions
  policy are set on every response.
- **Vote integrity.** Anonymous voting can be gamed by someone who clears cookies. Results are indicative, not proof;
  the write-up says so.

## Limits

Rate-limit counters live in memory, so on serverless they are best effort. The kill switch is the hard stop.
