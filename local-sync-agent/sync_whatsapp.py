#!/usr/bin/env python3
"""
WhatsApp Sync Agent
Syncs WhatsApp messages to Ninja OS

METHODS:
1. WhatsApp Chat Export (manual export from phone)
2. WhatsApp Web bridge (if using whatsmeow/whatsapp-mcp locally)
3. Direct database access (Android only, requires root)

This script primarily supports the chat export method.
"""

import os
import re
import json
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional

from sync_client import NinjaOSSyncClient
from config import NINJA_OS_URL, WHATSAPP_DATA_PATH, LOOKBACK_HOURS, MAX_ITEMS_PER_SYNC


class WhatsAppSyncAgent:
    """Syncs WhatsApp conversations to Ninja OS"""
    
    def __init__(self, ninja_url: str, data_path: Optional[str] = None):
        self.client = NinjaOSSyncClient(ninja_url)
        self.data_path = os.path.expanduser(data_path) if data_path else None
        self.synced_ids_file = os.path.expanduser("~/.ninja_os_whatsapp_synced.json")
        self.synced_ids = self._load_synced_ids()
    
    def _load_synced_ids(self) -> set:
        if os.path.exists(self.synced_ids_file):
            try:
                with open(self.synced_ids_file, 'r') as f:
                    return set(json.load(f))
            except:
                pass
        return set()
    
    def _save_synced_ids(self):
        with open(self.synced_ids_file, 'w') as f:
            json.dump(list(self.synced_ids), f)
    
    def _parse_export_file(self, file_path: str) -> Dict[str, Any]:
        """
        Parse WhatsApp chat export file (.txt)
        
        Format: "MM/DD/YY, HH:MM - Contact Name: Message"
        or: "[DD/MM/YYYY, HH:MM:SS] Contact Name: Message"
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Try to extract chat name from filename
        filename = os.path.basename(file_path)
        chat_name = filename.replace("WhatsApp Chat with ", "").replace(".txt", "").replace("_", " ")
        
        # Parse messages with various date formats
        patterns = [
            # US format: 1/15/24, 3:45 PM - Name: Message
            r'(\d{1,2}/\d{1,2}/\d{2,4}, \d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?) - ([^:]+): (.+?)(?=\n\d{1,2}/\d{1,2}/|\Z)',
            # EU format: 15/01/2024, 15:45 - Name: Message  
            r'(\d{1,2}/\d{1,2}/\d{2,4}, \d{1,2}:\d{2}(?::\d{2})?) - ([^:]+): (.+?)(?=\n\d{1,2}/\d{1,2}/|\Z)',
            # Bracket format: [15/01/2024, 15:45:30] Name: Message
            r'\[(\d{1,2}/\d{1,2}/\d{2,4}, \d{1,2}:\d{2}(?::\d{2})?)\] ([^:]+): (.+?)(?=\n\[|\Z)',
        ]
        
        messages = []
        latest_date = None
        
        for pattern in patterns:
            matches = re.findall(pattern, content, re.DOTALL)
            if matches:
                for match in matches:
                    date_str, sender, text = match
                    text = text.strip()
                    
                    # Skip media messages
                    if '<Media omitted>' in text or 'image omitted' in text.lower():
                        continue
                    
                    # Parse date
                    parsed_date = None
                    for fmt in [
                        '%m/%d/%y, %I:%M %p',
                        '%m/%d/%Y, %I:%M %p',
                        '%d/%m/%y, %H:%M',
                        '%d/%m/%Y, %H:%M',
                        '%d/%m/%Y, %H:%M:%S',
                    ]:
                        try:
                            parsed_date = datetime.strptime(date_str.strip(), fmt)
                            break
                        except ValueError:
                            continue
                    
                    if parsed_date:
                        messages.append({
                            "date": parsed_date,
                            "sender": sender.strip(),
                            "text": text,
                        })
                        if not latest_date or parsed_date > latest_date:
                            latest_date = parsed_date
                break
        
        # Extract participant names (everyone except "You")
        participants = set()
        for msg in messages:
            if msg['sender'].lower() not in ['you', 'me']:
                participants.add(msg['sender'])
        
        return {
            "chatName": chat_name,
            "participants": list(participants),
            "messages": messages,
            "latestDate": latest_date,
            "messageCount": len(messages),
        }
    
    def sync_export(self, file_path: str, force: bool = False) -> Dict[str, Any]:
        """Sync a WhatsApp chat export file"""
        
        if not os.path.exists(file_path):
            return {"error": f"File not found: {file_path}"}
        
        print(f"Parsing WhatsApp export: {file_path}")
        
        try:
            chat_data = self._parse_export_file(file_path)
        except Exception as e:
            return {"error": f"Failed to parse export: {e}"}
        
        if not chat_data['messages']:
            return {"error": "No messages found in export"}
        
        print(f"Found {chat_data['messageCount']} messages with {len(chat_data['participants'])} participants")
        
        # Generate external ID
        external_id = hashlib.md5(
            f"whatsapp_{chat_data['chatName']}_{chat_data['latestDate']}".encode()
        ).hexdigest()
        
        if external_id in self.synced_ids and not force:
            return {"status": "skipped", "message": "Already synced"}
        
        # Build transcript
        transcript_lines = []
        for msg in sorted(chat_data['messages'], key=lambda m: m['date']):
            timestamp = msg['date'].strftime("%H:%M")
            transcript_lines.append(f"[{timestamp}] {msg['sender']}: {msg['text']}")
        
        transcript = "\n".join(transcript_lines)
        
        # Prepare item
        item = {
            "externalId": external_id,
            "type": "text",
            "title": f"WhatsApp: {chat_data['chatName']}",
            "transcript": transcript,
            "timestamp": chat_data['latestDate'].isoformat() if chat_data['latestDate'] else datetime.now().isoformat(),
            "participants": [{"name": p} for p in chat_data['participants']],
        }
        
        print("Syncing to Ninja OS...")
        
        try:
            result = self.client.push_items(
                source="whatsapp",
                items=[item],
                sync_type="single"
            )
            
            if result.get('processed', 0) > 0:
                self.synced_ids.add(external_id)
                self._save_synced_ids()
            
            return result
        except Exception as e:
            return {"error": str(e)}
    
    def sync_directory(self, directory: str, force: bool = False) -> Dict[str, Any]:
        """Sync all WhatsApp exports in a directory"""
        
        path = Path(directory)
        if not path.exists():
            return {"error": f"Directory not found: {directory}"}
        
        exports = list(path.glob("*.txt")) + list(path.glob("**/*.txt"))
        print(f"Found {len(exports)} text files in {directory}")
        
        results = []
        synced = 0
        failed = 0
        
        for export_file in exports[:MAX_ITEMS_PER_SYNC]:
            # Check if it looks like a WhatsApp export
            try:
                with open(export_file, 'r', encoding='utf-8') as f:
                    first_line = f.readline()
                    if not any(pattern in first_line for pattern in ['- ', '] ', ':']):
                        continue
            except:
                continue
            
            result = self.sync_export(str(export_file), force=force)
            results.append({
                "file": str(export_file),
                "result": result
            })
            
            if result.get('processed', 0) > 0 or result.get('status') == 'skipped':
                synced += 1
            elif 'error' in result:
                failed += 1
        
        return {
            "synced": synced,
            "failed": failed,
            "total": len(results),
            "results": results
        }
    
    def sync_from_bridge(self, bridge_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sync from WhatsApp Web bridge (whatsmeow/whatsapp-mcp)
        
        Expected format:
        {
            "messages": [
                {
                    "id": "message-id",
                    "chatId": "phone@s.whatsapp.net",
                    "chatName": "Contact Name",
                    "sender": "Me" or "Contact Name",
                    "text": "Message content",
                    "timestamp": 1704067200  # Unix timestamp
                }
            ]
        }
        """
        messages = bridge_data.get('messages', [])
        
        if not messages:
            return {"synced": 0, "message": "No messages provided"}
        
        # Group by chat
        chats: Dict[str, List[Dict]] = {}
        for msg in messages:
            chat_id = msg.get('chatId', 'unknown')
            if chat_id not in chats:
                chats[chat_id] = []
            chats[chat_id].append(msg)
        
        items = []
        for chat_id, chat_messages in chats.items():
            # Sort by timestamp
            chat_messages.sort(key=lambda m: m.get('timestamp', 0))
            
            if not chat_messages:
                continue
            
            latest = max(m.get('timestamp', 0) for m in chat_messages)
            external_id = hashlib.md5(f"whatsapp_{chat_id}_{latest}".encode()).hexdigest()
            
            if external_id in self.synced_ids:
                continue
            
            # Build transcript
            transcript_lines = []
            participants = set()
            chat_name = None
            
            for msg in chat_messages:
                sender = msg.get('sender', 'Unknown')
                if sender.lower() not in ['me', 'you']:
                    participants.add(sender)
                    if not chat_name:
                        chat_name = msg.get('chatName', sender)
                
                ts = datetime.fromtimestamp(msg.get('timestamp', 0)).strftime("%H:%M")
                transcript_lines.append(f"[{ts}] {sender}: {msg.get('text', '')}")
            
            items.append({
                "externalId": external_id,
                "type": "text",
                "title": f"WhatsApp: {chat_name or chat_id}",
                "transcript": "\n".join(transcript_lines),
                "timestamp": datetime.fromtimestamp(latest).isoformat(),
                "participants": [{"name": p} for p in participants],
            })
        
        if not items:
            return {"synced": 0, "message": "No new messages"}
        
        result = self.client.push_items(
            source="whatsapp",
            items=items,
            sync_type="incremental"
        )
        
        for item_result in result.get('results', []):
            if item_result.get('status') in ['created', 'skipped']:
                self.synced_ids.add(item_result.get('id'))
        
        self._save_synced_ids()
        return result


def main():
    """Run WhatsApp sync"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Sync WhatsApp messages to Ninja OS")
    parser.add_argument("--file", help="Sync a single WhatsApp export file")
    parser.add_argument("--directory", help="Sync all exports in directory")
    parser.add_argument("--force", action="store_true", help="Force re-sync")
    parser.add_argument("--url", default=NINJA_OS_URL, help="Ninja OS URL")
    
    args = parser.parse_args()
    
    agent = WhatsAppSyncAgent(args.url)
    
    if args.file:
        result = agent.sync_export(args.file, force=args.force)
    elif args.directory:
        result = agent.sync_directory(args.directory, force=args.force)
    else:
        print("Please specify --file or --directory")
        print("\nExamples:")
        print("  python sync_whatsapp.py --file '~/Downloads/WhatsApp Chat with John.txt'")
        print("  python sync_whatsapp.py --directory ~/Downloads/WhatsApp")
        print("\nHow to export WhatsApp chats:")
        print("1. Open WhatsApp on your phone")
        print("2. Open a chat > Menu (3 dots) > More > Export chat")
        print("3. Choose 'Without media' and save/share the file")
        print("4. Transfer to your Mac and run this script")
        return
    
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
