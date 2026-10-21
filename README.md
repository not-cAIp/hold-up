# Hold Up

Post what's in your cart. People swipe **Get it** or **Skip it** before you buy.

A static website (plain HTML, CSS and JS, with no build step) backed by [Supabase](https://supabase.com) for sign-in, data and photos. Visitors can browse right away. Their first swipe, post or survey answer signs them in as a guest, so no email is needed.

## Features
- Swipe deck on the Feed, with an optional comment and Undo after each swipe
- Results as a two-column pin grid; tap a pin for votes and comments
- Posts with a photo, price, reason, "already own" note and shop link (TikTok Shop, Amazon…)
- Circles: private groups you join with a 6-letter code
- Me tab: money kept by skipping, your posts, muted words, account settings
- Story card for screenshots
- Report and hide-a-person buttons; a post is hidden automatically after 3 reports
- A 6-question feedback survey (answers are visible only to you, in Supabase)
- Labeled sample posts so the feed isn't empty on day one

## Setup (about 10 minutes)

### 1. Supabase
1. Create a project at supabase.com (the free tier is fine).
2. **SQL Editor → New query**: paste all of `supabase/schema.sql` and click **Run**.
3. Run `supabase/seed.sql` the same way to add the labeled sample posts. Remove them later with `delete from profiles where is_sample;`
4. **Authentication → Sign In / Providers**: turn on **Allow anonymous sign-ins**. Keep **Email** on so guests can add an email later.
5. **Authentication → URL Configuration**: set **Site URL** to your live site, e.g. `https://holdup.vercel.app`.
6. **Project Settings → API**: copy the **Project URL** and the **anon public** key into `config.js`. Never use the `service_role` key here.

### 2. Hosting on Vercel (free)
1. Sign in at vercel.com with GitHub → **Add New → Project** → import this repo.
2. Framework preset: **Other**. Leave the build command empty and keep the output directory as the root.
3. Click **Deploy**. Every push to `main` redeploys.

GitHub Pages works too: **Settings → Pages → Deploy from branch → main / root**.

### 3. Run it locally
```bash
python -m http.server 5181
```
Then open http://localhost:5181.

## Reading survey results
In Supabase → SQL Editor:
```sql
select answers->>'use' as likely, answers->>'regret' as regret, answers->>'who' as who,
       answers->>'feature' as feature, answers->>'pay' as pay, answers->>'note' as note, updated_at
from survey_responses order by updated_at desc;

-- counts for one question
select answers->>'feature' as feature, count(*) from survey_responses group by 1 order by 2 desc;
```

## Before posting on Reddit
- Turn on **CAPTCHA protection** (Authentication → Attack Protection, with hCaptcha or Cloudflare Turnstile) to stop bots creating guest accounts. This also needs a small code change to pass the captcha token.
- Check reports now and then: `select * from reports order by created_at desc;`
- Add a privacy policy page before collecting emails at scale. It should mention that photos are stored in a public bucket under random file names: anyone with a photo's exact link can open it, even on a circle-only post.

## Shared backend
The iPhone app (Expo) uses this same Supabase project and `supabase/schema.sql`, so posts and votes show up in both.
