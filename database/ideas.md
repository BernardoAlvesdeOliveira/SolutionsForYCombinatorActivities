# Data-driven engagement upgrades

## 1. Daily board digest

### Hypothesis

A daily summary of cards moved into `in-progress` or `complete` will increase
repeat logins and daily active users.

### Expected impact

Increase seven-day return rate, notification click-through rate, and DAU.
Measure results against a randomized holdout group. Use the post-release mean
of 11.79 DAU as the baseline.

### Feature

Send an optional morning or evening digest showing each user's recent card
movements, cards blocked in backlog, and one suggested next action. Deep-link
each item to its board card.

## 2. Stalled-card reminders

### Hypothesis

Cards that remain in `backlog` or `in-progress` without movement are actionable
re-entry points. Reminders will increase board visits.

### Expected impact

Increase return sessions and reduce time between status changes. Measure
reminder open rate, status changes within 24 hours, and seven-day retention
against a holdout group.

### Feature

Detect cards without recent status changes. Notify the owner with actions to
move the card, change its priority, or snooze the reminder. Start with a low
frequency to limit notification fatigue.

## 3. Rework and collaboration prompts

### Hypothesis

Reverse transitions signal uncertainty or rework. Structured prompts will
increase collaboration and reduce repeated reversals.

### Expected impact

Increase productive sessions, comments, and collaborator actions. Measure time
to the next forward transition and the card reversal rate.

### Feature

When a card moves backward, request an optional reason such as blocked, scope
change, or quality issue. Notify relevant collaborators and show a checklist or
suggested next step. Keep the prompt dismissible.