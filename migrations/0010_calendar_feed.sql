-- カレンダー連携: one secret feed URL per account (/cal/<token>.ics) that Google カレンダー / iPhone subscribe to.
-- Making a new one replaces the old, so a leaked URL can be shut off.
CREATE TABLE calendar_feeds (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
