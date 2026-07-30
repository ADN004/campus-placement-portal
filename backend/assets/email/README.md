# Email banner images (CID-embedded)

Drop a banner here and the matching email uses it as a full-width header,
embedded via `cid:` — always shown, never blocked, no external hosting. Until a
file exists, that email falls back to the 🎓 emblem + wordmark header.

**Specs for every banner:** header art only (logo + title + illustration — no
feature cards / footer, those are HTML). ~**1280 × 511** (2.5:1). Keep **under
~150 KB** (JPG q80 is ideal). Extension may be `.png`, `.jpg`, or `.jpeg` — the
code auto-detects.

| Email | File base name |
|---|---|
| Welcome / verify account | `welcome-header` |
| Password reset | `reset-header` |
| Notification (generic) | `notification-header` |
| Registration rejected | `registration-rejected-header` |
| Correction requested | `correction-header` |
| Drive scheduled | `drive-header` |
| Selected / placed | `selected-header` |
| Shortlisted | `shortlist-header` |
| Application rejected | `rejection-header` |
