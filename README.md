
---

## Share Statement Feature (Person Accounts)

Allows you to share a read-only link of any person's statement — no login needed for the recipient.

### One-time Setup

**Step 1 — Run SQL migration**

Supabase Dashboard → SQL Editor → New query → paste and run `share_tokens_migration.sql` (included in the project root).

This creates the `share_tokens` table and a `SECURITY DEFINER` function. The function is what makes it work without needing `SUPABASE_SERVICE_ROLE_KEY`.

**That's it.** No extra env var needed. The feature uses the anon key you already have.

### How to Share

1. Go to Accounts page
2. On any **Person** account card, tap **🔗 Share**
3. A shareable link is copied to clipboard
4. Paste it in WhatsApp, SMS, email — anything

The recipient opens the link in any browser — no account, no login required. They see:
- Account balance and summary
- Full transaction list with date/time grouping
- Filter by All / Lent / Received
- Read-only — nothing can be edited

### Security

- Link is a UUID token — unguessable
- Only exposes that single account's data — nothing else
- Powered by a `SECURITY DEFINER` Postgres function so no admin key is needed
- To revoke: delete the token row from `share_tokens` table in Supabase

---

## Change Email

Settings ⚙ → **Change Email** → enter new address → Send Confirmation.

Supabase sends a confirmation link to the new email. The address updates after clicking that link.
