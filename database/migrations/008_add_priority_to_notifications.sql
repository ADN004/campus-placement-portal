-- Migration: Add Priority Field to Notifications Table
-- Date: 2025-12-31
-- Description: Adds priority field to notifications table to support urgent email notifications

-- ============================================
-- ADD PRIORITY COLUMN TO NOTIFICATIONS TABLE
-- ============================================

-- Add priority column with default value 'normal'
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent'));

-- Create index for better performance when filtering by priority
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- Add comment for documentation
COMMENT ON COLUMN notifications.priority IS 'Priority level of the notification (normal, high, urgent). Urgent notifications are sent via email as well.';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: Added priority field to notifications table';
END $$;
