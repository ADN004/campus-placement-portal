# Email image assets (CID-embedded)

Drop banner/header PNGs here and they're embedded into the matching email via
`cid:` — always shown, never blocked, no external hosting needed.

## Welcome / verification banner

- **File name:** `welcome-header.png` (exact name — the code looks for this)
- **Design size:** ~**1200 × 480 px** (2.5:1), header art only — logo + "Welcome
  to State Placement Cell" + illustration. **No** feature cards or footer (those
  are HTML in the email).
- **File size:** keep **under ~120 KB** (run through tinypng.com, or export JPG q80
  and name it `welcome-header.jpg` — update the filename in
  `config/emailService.js` if you use `.jpg`).

Until a file named `welcome-header.png` exists here, the email automatically
falls back to the 🎓 emblem + wordmark header — nothing breaks.
