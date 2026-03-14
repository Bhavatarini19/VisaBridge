# VisaBridge

A Chrome extension that highlights visa and sponsorship-related keywords in job descriptions — built for F1/OPT international students who are tired of manually Ctrl+F-ing through every job posting.

---

## Demo

<video src="assets/Demo.mp4" width="700" controls autoplay loop muted></video>

---

## The Problem

As an international student on F1/OPT, every job application comes with an extra step — scanning the description for words like "visa sponsorship", "US citizen only", "security clearance", "must be authorized to work permanently." Missing these costs you time writing a cover letter, customizing a resume, and filling out a long application — only to get auto-rejected.

Existing tools handled this for a while, then went behind paywalls or stopped working entirely. So I built my own.

**Before:** ~5 job applications per hour, lots of accidental applications to non-sponsoring companies.
**After:** ~10 applications per hour, zero accidental non-sponsor applications.

---

## What It Does

- Scans the job description when you open a listing
- Highlights keywords with distinct colors directly in the LinkedIn UI
- Shows a live count of each keyword in a floating panel
- Works dynamically — no page reload needed as you click through jobs
- Lets you add or remove keywords based on your own needs

### Default Keywords

| Keyword | Matches |
|---|---|
| `visa*` | visa, visas |
| `sponsor*` | sponsor, sponsorship, sponsored |
| `citizen*` | citizen, citizens, citizenship |
| `security*` | security |
| `clearance*` | clearance |
| `graduat*` | graduate, graduation, graduating |

All keywords use prefix matching — `sponsor` automatically catches `sponsorship`.

---

## You Don't Always Need AI

This project is intentionally simple — and that is the point.

There is a tendency to reach for machine learning models, LLMs, or paid APIs the moment a problem involves text. But this problem does not need any of that. A regex pattern scan over a DOM element, triggered by a MutationObserver, solves it completely — for free, instantly, with no API calls, no latency, no subscription, and no data leaving your browser.

The result is more reliable than an ML model (no false negatives from a hallucinating model), faster than an API call (runs in milliseconds locally), and free forever (no tokens, no rate limits, no keys to manage).

Not every problem needs a neural network. Sometimes the right tool is a well-placed regular expression.

---

## Technical Highlights

- **MutationObserver** to detect LinkedIn's SPA navigation without page reloads
- **URL polling** to reset state when switching between job listings
- **Text-content comparison** instead of DOM flags to avoid processing empty containers before content loads
- **Chrome Storage API** for persistent, user-editable keyword lists
- **Debounced re-scanning** to handle LinkedIn's rapid DOM mutation bursts
- **Dynamic selector fallback** — tries specific selectors first, falls back to largest text block if LinkedIn changes their class names

---

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the project folder
5. Navigate to a LinkedIn job listing — the panel appears automatically

---

## Usage

- Open any job listing on LinkedIn
- Highlighted keywords appear instantly in the description
- A floating panel (bottom-right) shows the count of each keyword
- Click the extension icon to see counts in the popup
- Go to **Manage Keywords** tab in the popup to add or remove keywords

---

## Future Ideas

- Support for Indeed, Glassdoor, and other job boards
- Sentence-level context preview (show the full sentence around each match)
- Color dot indicators on the job list before you even click a listing
- Save + export matched jobs to a local list

---

## Built With

- Vanilla JavaScript
- Chrome Extensions Manifest V3
- Chrome Storage API
- Zero dependencies, zero frameworks, zero cost

---

## Why I Built This

I am an international student navigating the US job market on F1 visa. Every application is a calculated risk — applying to a company that does not sponsor is wasted effort. The Ctrl+F workflow works but it is slow, easy to forget, and does not show you counts or context at a glance.

VisaBridge solves a real, personal problem. It doubled my application throughput and removed the anxiety of accidentally applying to positions that would never move forward. Sometimes the best tools are the ones you build yourself because nobody else built exactly what you needed.

---

## License

MIT — free to use, modify, and share.
