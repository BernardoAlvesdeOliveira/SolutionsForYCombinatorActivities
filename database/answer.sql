-- TYPE YOUR SQL QUERY BELOW

-- PART 1: Create a SQL query that maps out the daily average users before and after the feature change




-- PART 2: Create a SQL query that indicates the number of status changes by card





-- Shiptivity analytics: Kanban Board release on 2018-06-02.
-- Timestamps are Unix seconds. Queries do not modify the source database.

-- 1. Database structure and row counts.
SELECT name, type
FROM sqlite_master
WHERE type IN ('table', 'view')
ORDER BY type, name;

SELECT 'user' AS table_name, COUNT(*) AS row_count FROM user
UNION ALL
SELECT 'login_history', COUNT(*) FROM login_history
UNION ALL
SELECT 'card', COUNT(*) FROM card
UNION ALL
SELECT 'card_change_history', COUNT(*) FROM card_change_history;

-- 2. Daily active users, with release-period label.
WITH daily_active_users AS (
    SELECT
        date(login_timestamp, 'unixepoch') AS activity_date,
        COUNT(DISTINCT user_id) AS active_users
    FROM login_history
    GROUP BY activity_date
)
SELECT
    activity_date,
    CASE
        WHEN activity_date < '2018-06-02' THEN 'before'
        ELSE 'after'
    END AS release_period,
    active_users
FROM daily_active_users
ORDER BY activity_date;

-- 3. Mean daily active users before and after release.
WITH daily_active_users AS (
    SELECT
        date(login_timestamp, 'unixepoch') AS activity_date,
        COUNT(DISTINCT user_id) AS active_users
    FROM login_history
    GROUP BY activity_date
)
SELECT
    CASE
        WHEN activity_date < '2018-06-02' THEN 'before'
        ELSE 'after'
    END AS release_period,
    MIN(activity_date) AS first_date,
    MAX(activity_date) AS last_date,
    COUNT(*) AS active_days,
    ROUND(AVG(active_users), 2) AS average_daily_active_users,
    MIN(active_users) AS minimum_daily_active_users,
    MAX(active_users) AS maximum_daily_active_users
FROM daily_active_users
GROUP BY release_period
ORDER BY release_period;

-- 4. Daily status changes by card for the status-change chart.
SELECT
    cardID AS card_id,
    COUNT(*) AS status_changes
FROM card_change_history
WHERE oldStatus IS NOT NULL
  AND oldStatus <> newStatus
GROUP BY cardID
ORDER BY status_changes DESC, cardID;

-- 5. Overall status-transition counts.
SELECT
    oldStatus,
    newStatus,
    COUNT(*) AS transition_count
FROM card_change_history
WHERE oldStatus IS NOT NULL
  AND oldStatus <> newStatus
GROUP BY oldStatus, newStatus
ORDER BY transition_count DESC;

-- 6. Card-change activity after release.
SELECT
    date(timestamp, 'unixepoch') AS change_date,
    COUNT(*) AS status_changes,
    COUNT(DISTINCT cardID) AS cards_changed
FROM card_change_history
WHERE oldStatus IS NOT NULL
  AND oldStatus <> newStatus
GROUP BY change_date
ORDER BY change_date;

-- ============================================================
-- RESOLUTION AND DATA-DRIVEN ENGAGEMENT IDEAS
-- ============================================================
--
-- Scope:
-- The Kanban Board released on 2018-06-02. This analysis compares daily active
-- users before and after release and examines card status transitions.
-- The source database is read only.
--
-- Database summary:
-- user: 100 rows.
-- login_history: 4,060 rows.
-- card: 200 rows.
-- card_change_history: 486 rows.
-- 200 card_change_history rows are initial card insertions with oldStatus NULL.
-- Status-transition analysis excludes those rows.
--
-- Daily active user resolution:
-- Before release: 2018-02-03 to 2018-06-01, 110 active days, mean DAU 3.63,
-- minimum 1, maximum 10.
-- After release: 2018-06-02 to 2019-02-01, 245 active days, mean DAU 11.79,
-- minimum 5, maximum 23.
-- Change: +8.16 users, or +225.1%.
-- Unique users with any login: 38 before release, 99 after release, 100 total.
-- This supports a strong association with higher activity, but does not prove
-- causation because the data has no control group.
--
-- Status-change resolution:
-- Actual status transitions: 286 across 162 cards.
-- backlog -> in-progress: 167.
-- in-progress -> complete: 103.
-- in-progress -> backlog: 11.
-- complete -> in-progress: 5.
-- Forward transitions total 270 (94.4%). Reverse transitions total 16 (5.6%).
-- Card 187 changed status 5 times. Cards 137, 143, 147, and 189 changed 4
-- times each.
--
-- Engagement idea 1: Daily board digest.
-- Hypothesis: A daily summary of cards moved into in-progress or complete will
-- increase repeat logins and DAU.
-- Expected impact: Increase 7-day return rate, notification click-through,
-- and DAU. Compare against a randomized holdout. Baseline: 11.79 mean DAU.
-- Feature: Send an optional morning or evening digest with each user's recent
-- card movements, blocked backlog cards, and one suggested next action.
--
-- Engagement idea 2: Stalled-card reminders.
-- Hypothesis: Cards with no movement in backlog or in-progress are actionable
-- re-entry points; reminders will increase board visits.
-- Expected impact: Increase return sessions and reduce time between status
-- changes. Measure open rate, status changes within 24 hours, and 7-day
-- retention against a holdout.
-- Feature: Detect cards without recent status changes. Notify the owner with
-- actions to move the card, change priority, or snooze the reminder.
--
-- Engagement idea 3: Rework and collaboration prompts.
-- Hypothesis: Reverse transitions signal uncertainty or rework; structured
-- prompts will increase collaboration and reduce repeated reversals.
-- Expected impact: Increase productive sessions, comments, and collaborator
-- actions. Measure time to next forward transition and reversal rate.
-- Feature: When a card moves backward, request an optional reason, notify
-- relevant collaborators, and show a checklist or suggested next step.
