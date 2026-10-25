import csv
import sqlite3
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd


ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "shiptivity.db"
CHARTS = ROOT / "charts"
CHARTS.mkdir(exist_ok=True)

with sqlite3.connect(DB_PATH) as connection:
    daily_users = pd.read_sql_query(
        """
        SELECT
            date(login_timestamp, 'unixepoch') AS activity_date,
            COUNT(DISTINCT user_id) AS active_users
        FROM login_history
        GROUP BY activity_date
        ORDER BY activity_date
        """,
        connection,
        parse_dates=["activity_date"],
    )
    card_changes = pd.read_sql_query(
        """
        SELECT cardID AS card_id, COUNT(*) AS status_changes
        FROM card_change_history
        WHERE oldStatus IS NOT NULL
          AND oldStatus <> newStatus
        GROUP BY cardID
        ORDER BY status_changes DESC, cardID
        """,
        connection,
    )

daily_users["release_period"] = daily_users["activity_date"].map(
    lambda date: "Before release" if date < pd.Timestamp("2018-06-02") else "After release"
)
period_means = daily_users.groupby("release_period")["active_users"].mean()

fig, ax = plt.subplots(figsize=(13, 6))
ax.plot(
    daily_users["activity_date"],
    daily_users["active_users"],
    color="#2f6690",
    linewidth=1.2,
    alpha=0.65,
    label="Daily active users",
)
ax.axvline(
    pd.Timestamp("2018-06-02"),
    color="#d1495b",
    linestyle="--",
    linewidth=1.5,
    label="Kanban release (2018-06-02)",
)
ax.axhline(
    period_means["Before release"],
    color="#2f6690",
    linestyle=":",
    linewidth=1.4,
    label=f"Before mean: {period_means['Before release']:.2f}",
)
ax.axhline(
    period_means["After release"],
    color="#00798c",
    linestyle=":",
    linewidth=1.4,
    label=f"After mean: {period_means['After release']:.2f}",
)
ax.set_title("Daily active users before and after Kanban Board release")
ax.set_xlabel("Date")
ax.set_ylabel("Distinct users with at least one login")
ax.grid(axis="y", alpha=0.25)
ax.legend(loc="upper left")
fig.tight_layout()
fig.savefig(CHARTS / "daily_active_users_before_after.png", dpi=180)
plt.close(fig)

fig, ax = plt.subplots(figsize=(10, max(6, len(card_changes) * 0.13)))
ordered = card_changes.sort_values(["status_changes", "card_id"])
ax.barh(ordered["card_id"].astype(str), ordered["status_changes"], color="#edae49")
ax.set_title("Status changes by card")
ax.set_xlabel("Status changes")
ax.set_ylabel("Card ID")
ax.grid(axis="x", alpha=0.25)
fig.tight_layout()
fig.savefig(CHARTS / "status_changes_by_card.png", dpi=180)
plt.close(fig)

print(f"Daily rows: {len(daily_users)}")
print(f"Changed cards: {len(card_changes)}")
print(f"Before mean: {period_means['Before release']:.2f}")
print(f"After mean: {period_means['After release']:.2f}")
