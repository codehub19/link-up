# DateU growth & money playbook

What's already built in the app, and how to use it.

## 1. Campus ambassadors
**Goal:** one or two ambassadors per college. They bring the first 50 to 100 people, which makes Discover, Groups and Events feel alive.

- **Who to pick:** people who run a club, fest team, hostel group or a popular Instagram page. Aim for a mix of men and women.
- **What they do:**
  - Share their invite link (Profile → Invite, or Friends → Invite card).
  - Post one Story a week.
  - Host one small meetup a month, set up as a DateU event.
- **What they get:**
  - Free Premium for as long as they are active.
  - A certificate (the app has `/certificates`).
  - ₹10–20 per friend who completes sign-up. You can see this in Admin → Referrals.
  - The top ambassador each month gets a fest pass or merch.
- **Tracking:**
  - Admin → Referrals shows referrals per code.
  - PostHog shows `referral_shared` events split by `where`.
- **Rule:** no spam in college groups, no fake accounts. Remove ambassadors who break this.

## 2. Fest partnerships
Fests want footfall and engagement. DateU gives them a "find-a-buddy" layer.

- **Offer to fest teams, free:**
  - A DateU event page for their fest, with "Find a fest buddy" turned on.
  - A shareable link: `dateu.in/events/<id>`.
  - Stories about it on DateU's Instagram.
- **In return:**
  - Logo placement or a stall.
  - A mention in their posts.
  - A QR code on their standees that opens the event page.
- **In Admin → Events:**
  - Use the **🎪 Fest meetup** template.
  - Add **Ticket link**, which points to their Unstop, Insider or BookMyShow page.
  - Add **Sponsor**, if a brand is paying.
- **After the fest:** send the "who you met" push, and invite people to Groups (for example, *Music & jamming*).

## 3. Event tickets & sponsorships (revenue)
- **Ticket commission:** ask organisers for a referral or affiliate link, or 5–10% of tickets sold through DateU. Put that link in **Ticket link**.
- **Sponsored events:**
  - Brands such as cafés, energy drinks, ed-tech and coding bootcamps pay to "present" a DateU event.
  - This appears as "Presented by <brand>" with their logo and link.
  - **Suggested starting prices:**

    | Scope | Price per event |
    |---|---|
    | Single college | ₹3k–10k |
    | City-wide | ₹15k–50k |

  - Add the numbers (going count, views) once PostHog is live.
- **Own events:** run small ticketed DateU nights at partner cafés, such as a Garba partner night, a board-game night or a trek. Split the profit with the café.

## 4. Premium (already in the app)
Premium includes:
- **See who viewed your profile.** This is the strongest hook, because free users see "12 people viewed you" but not who.
- **Boost in Friends suggestions** (ranked higher on the server).
- Priority in dating rounds and random calls, and more calls a day.
- Keep chatting after the 24-hour random-call window.

**Tips:**
- Keep one cheap plan: ₹49–99 for 7 days, alongside ₹199 for 30 days.
- Run a "Fest week" discount.
- Watch `premium_purchased` in PostHog.

## 5. Instagram Reels (content plan)
Post 3–4 a week. Keep them short (7–20 s), use trending audio, and add on-screen text.

| Series | Idea |
|---|---|
| "Rate my campus" | Street interviews: "Best chai spot at DU North?" → ends with "Find people to go with on DateU" |
| "POV: you found a Garba partner on DateU" | Skit |
| Group plan of the week | Screen-record a real Groups post ("Badminton Sun 6pm? 2 more!") and the "I'm in" replies |
| Icebreaker answers | Funny prompt answers from real profiles (only with permission) |
| Event recap | 10-second montage from DateU events and fests |
| Ambassador takeovers | One college per week |

Every Reel ends with "Link in bio → dateu.in". Put the college name in the caption.

## 6. Email (Brevo)
- **Promotional campaigns:** use the cleaned lists from the relaunch (at most about 290 a day per batch) and `marketing/emails/relaunch.html`.
- **Activity alerts:** friend requests, accepted requests and event reminders are sent automatically once you set up Admin → App Controls → Email alerts.

## 7. What to watch weekly (PostHog funnel)
The funnel steps are:

`signed_up → profile_completed → friend_request_sent → friend_request_accepted → message_sent → event_joined / group_joined`

- If `profile_completed` drops, simplify sign-up.
- If `friend_request_accepted` is low, you need more active people per college, which means more ambassadors and events.
- Check the connect rate in Admin → Calls. It should be above 85%; if it's lower, set up TURN in Call settings.
