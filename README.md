# Vertolio

Next.js + Sanity CMS + Vercel portfolio.

## Routes
- `/` Home
- `/work` Work (grouped by Organization)
- `/work/[slug]` Project detail
- `/blog` Blog
- `/blog/[slug]` Blog post
- `/about` About
- `/studio` Sanity Studio (admin)

## Vercel env vars
Set these in Vercel Project → Settings → Environment Variables (Production + Preview + Development):
- `NEXT_PUBLIC_SANITY_PROJECT_ID=iq6vjwu7`
- `NEXT_PUBLIC_SANITY_DATASET=production`

### Protect Studio (only you)
This repo includes `middleware.js` that protects `/studio/*` with **Basic Auth**.

Add these env vars in Vercel (Production + Preview + Development):
- `STUDIO_USER` (example: `farhan`)
- `STUDIO_PASS` (set a password only you know)

After saving env vars, **Redeploy** once.

**Where do you login?**
- Open `https://<your-domain>/studio`
- Your browser will show a small username/password popup.
- Use the values from `STUDIO_USER` / `STUDIO_PASS`.

## What to do in Studio (CMS)
Open `/studio` and create:

1) **Organizations**
- AstraPay
- TU/e
- Telkom Indonesia
- Others

2) **Projects**
- create portfolio items
- assign an Organization
- fill summary, tags, optional role/timeline/tools
- write your case study body (rich text + images)

3) **Posts**
- create blog posts

4) **Site Settings**
- create a single `Site Settings` document
- set your name/tagline/subtitle
- pick `Featured work` (references to projects)

## Notes
- Vercel auto-deploys on every push to GitHub (no Jenkins needed).
- Sanity is your CMS; invite only your email in Sanity Members to keep it private.
