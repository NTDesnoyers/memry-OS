# Ninja OS Local Sync Agent

This folder contains Python scripts that run on your Mac to sync data from local apps into Ninja OS.

## Supported Sources

| Source | What it syncs | Requirements |
|--------|---------------|--------------|
| **Granola** | Meeting notes and transcripts | Granola app installed |
| **Fathom.video** | Zoom/Meet recordings & transcripts | Fathom API key |
| **Plaud** | Voice recordings (transcribed by Ninja OS) | Audio files from Plaud |
| **iMessage** | Text conversations | Full Disk Access permission |
| **WhatsApp** | Chat exports | Manual export from phone |

## Quick Start

### 1. Install Dependencies

```bash
cd local-sync-agent
pip install -r requirements.txt
```

### 2. Configure Your Ninja OS URL

Edit `config.py` and update `NINJA_OS_URL` with your actual Ninja OS URL:

```python
NINJA_OS_URL = "https://your-app-name.replit.app"
```

### 3. Run Sync

**Sync all sources once:**
```bash
python sync_manager.py
```

**Run continuously (every 15 minutes):**
```bash
python sync_manager.py --daemon
```

**Sync specific sources:**
```bash
python sync_manager.py --sources granola imessage
```

## Individual Sync Scripts

### Granola

Reads from Granola's local cache file.

```bash
python sync_granola.py
python sync_granola.py --force  # Re-sync all
```

### Fathom.video

Automatically syncs meeting recordings and transcripts from Fathom.

**Setup:**
1. Get your API key from [fathom.video](https://fathom.video) > Settings > API
2. Add to `config.py`:
   ```python
   FATHOM_API_KEY = "your_api_key_here"
   ```

```bash
python sync_fathom.py --api-key YOUR_KEY
python sync_fathom.py --api-key YOUR_KEY --force  # Re-sync all
```

Or via sync_manager (after configuring config.py):
```bash
python sync_manager.py --sources fathom
```

### Plaud

Transcribes audio recordings and syncs to Ninja OS.

```bash
# Sync a single file
python sync_plaud.py --file ~/Downloads/recording.m4a --person "John Smith"

# Sync a directory of recordings
python sync_plaud.py --directory ~/Plaud/Recordings
```

### iMessage

Reads from the macOS Messages database.

**Requires Full Disk Access:**
1. Open System Settings > Privacy & Security > Full Disk Access
2. Add Terminal.app (or your IDE)
3. Restart Terminal

```bash
python sync_imessage.py
python sync_imessage.py --hours 48  # Sync last 48 hours
python sync_imessage.py --search "coffee"  # Search messages
```

### WhatsApp

Syncs from exported chat files.

**How to export WhatsApp chats:**
1. Open WhatsApp on your phone
2. Open a chat > Menu (3 dots) > More > Export chat
3. Choose "Without media"
4. Save/share the .txt file to your Mac

```bash
python sync_whatsapp.py --file "~/Downloads/WhatsApp Chat with John.txt"
python sync_whatsapp.py --directory ~/Downloads/WhatsApp
```

## How It Works

1. **Local scripts read** from local app data/exports
2. **Push to Ninja OS** via the `/api/sync/push` endpoint
3. **Ninja OS matches** messages to people by phone/email/name
4. **Creates interactions** that can be processed by AI for FORD extraction
5. **Updates last contact** dates automatically

## Deduplication

All synced items have unique `externalId` values. The sync API prevents duplicates automatically, so you can run syncs repeatedly without creating duplicate entries.

## Configuration Options

Edit `config.py` to customize:

```python
NINJA_OS_URL = "https://..."  # Your Ninja OS URL
SYNC_INTERVAL_MINUTES = 15    # For daemon mode
MAX_ITEMS_PER_SYNC = 100      # Batch size limit
LOOKBACK_HOURS = 24           # How far back to look
```

## Troubleshooting

### "Cannot access iMessage database"
- Grant Full Disk Access to Terminal in System Settings
- Restart Terminal after granting access

### "Granola cache not found"
- Make sure Granola app is installed
- Check the cache path in config.py matches your installation

### "Connection refused"
- Make sure your Ninja OS app is running
- Check the URL in config.py is correct

### Sync taking too long
- Reduce `MAX_ITEMS_PER_SYNC` in config.py
- Use `--sources` to sync only specific sources

## Running as a Background Service

To run the sync agent automatically on your Mac:

1. Create a Launch Agent plist:

```bash
mkdir -p ~/Library/LaunchAgents
```

2. Create `~/Library/LaunchAgents/com.ninjaos.sync.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ninjaos.sync</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/path/to/local-sync-agent/sync_manager.py</string>
        <string>--daemon</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/ninjaos-sync.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/ninjaos-sync.error.log</string>
</dict>
</plist>
```

3. Load the agent:
```bash
launchctl load ~/Library/LaunchAgents/com.ninjaos.sync.plist
```

4. To stop:
```bash
launchctl unload ~/Library/LaunchAgents/com.ninjaos.sync.plist
```
