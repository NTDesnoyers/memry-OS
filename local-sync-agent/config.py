"""
Ninja OS Local Sync Agent Configuration
Update NINJA_OS_URL to your Replit app URL
"""

# Your Ninja OS URL (update this after deployment)
# For development: use the Replit dev URL
# For production: use your deployed URL
NINJA_OS_URL = "https://your-ninja-os.replit.app"

# Granola cache path (default macOS location)
GRANOLA_CACHE_PATH = "~/Library/Application Support/Granola/cache-v3.json"

# Plaud app data directory (if available locally)
PLAUD_DATA_PATH = "~/Library/Application Support/Plaud"

# iMessage database path (requires Full Disk Access)
IMESSAGE_DB_PATH = "~/Library/Messages/chat.db"

# WhatsApp data path (if using WhatsApp Desktop)
WHATSAPP_DATA_PATH = "~/Library/Application Support/WhatsApp"

# Sync settings
SYNC_INTERVAL_MINUTES = 15  # How often to run automatic sync
MAX_ITEMS_PER_SYNC = 100    # Maximum items per sync batch
LOOKBACK_HOURS = 24         # How far back to look for new items
