#!/usr/bin/env python3
"""
iMessage Sync Agent
Reads from macOS iMessage database and pushes to Ninja OS

REQUIREMENTS:
- macOS only
- Full Disk Access permission for Terminal or the running app
- iMessage database at ~/Library/Messages/chat.db
"""

import os
import sqlite3
import json
import hashlib
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple

from sync_client import NinjaOSSyncClient
from config import NINJA_OS_URL, IMESSAGE_DB_PATH, LOOKBACK_HOURS, MAX_ITEMS_PER_SYNC


class IMessageSyncAgent:
    """Syncs iMessage conversations to Ninja OS"""
    
    def __init__(self, ninja_url: str, db_path: str = IMESSAGE_DB_PATH):
        self.client = NinjaOSSyncClient(ninja_url)
        self.db_path = os.path.expanduser(db_path)
        self.synced_ids_file = os.path.expanduser("~/.ninja_os_imessage_synced.json")
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
    
    def _check_database_access(self) -> bool:
        """Check if we can access the iMessage database"""
        if not os.path.exists(self.db_path):
            print(f"iMessage database not found at: {self.db_path}")
            return False
        
        try:
            conn = sqlite3.connect(f"file:{self.db_path}?mode=ro", uri=True)
            conn.execute("SELECT 1 FROM message LIMIT 1")
            conn.close()
            return True
        except sqlite3.OperationalError as e:
            print(f"Cannot access iMessage database: {e}")
            print("\nTo fix this:")
            print("1. Open System Settings > Privacy & Security > Full Disk Access")
            print("2. Add Terminal.app (or your IDE)")
            print("3. Restart Terminal/IDE")
            return False
    
    def _apple_time_to_datetime(self, apple_time: int) -> datetime:
        """Convert Apple's timestamp to datetime"""
        # Apple uses nanoseconds since 2001-01-01
        apple_epoch = datetime(2001, 1, 1)
        seconds = apple_time / 1e9
        return apple_epoch + timedelta(seconds=seconds)
    
    def _get_handle_info(self, conn: sqlite3.Connection) -> Dict[int, Dict[str, str]]:
        """Get phone/email info for all handles"""
        cursor = conn.execute("""
            SELECT ROWID, id, service
            FROM handle
        """)
        
        handles = {}
        for row in cursor:
            handles[row[0]] = {
                "identifier": row[1],
                "service": row[2],
                "phone": row[1] if row[1].startswith('+') or row[1].replace('-', '').isdigit() else None,
                "email": row[1] if '@' in row[1] else None,
            }
        
        return handles
    
    def _get_conversations(
        self, 
        conn: sqlite3.Connection, 
        handles: Dict[int, Dict[str, str]],
        since: datetime
    ) -> List[Dict[str, Any]]:
        """Get conversations with messages since the given date"""
        
        # Convert datetime to Apple timestamp
        apple_epoch = datetime(2001, 1, 1)
        since_apple = int((since - apple_epoch).total_seconds() * 1e9)
        
        # Get messages grouped by chat/handle
        cursor = conn.execute("""
            SELECT 
                m.ROWID as message_id,
                m.guid,
                m.text,
                m.date,
                m.is_from_me,
                m.handle_id,
                c.ROWID as chat_id,
                c.chat_identifier,
                c.display_name
            FROM message m
            LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
            LEFT JOIN chat c ON cmj.chat_id = c.ROWID
            WHERE m.date > ?
            ORDER BY m.date DESC
            LIMIT ?
        """, (since_apple, MAX_ITEMS_PER_SYNC * 10))
        
        # Group messages by chat/conversation
        conversations: Dict[str, Dict[str, Any]] = {}
        
        for row in cursor:
            message_id = row[0]
            guid = row[1]
            text = row[2]
            date = row[3]
            is_from_me = row[4]
            handle_id = row[5]
            chat_id = row[6]
            chat_identifier = row[7]
            display_name = row[8]
            
            if not text:
                continue
            
            # Create conversation key
            conv_key = chat_identifier or f"handle_{handle_id}"
            
            if conv_key not in conversations:
                handle_info = handles.get(handle_id, {})
                conversations[conv_key] = {
                    "chatIdentifier": conv_key,
                    "displayName": display_name,
                    "phone": handle_info.get("phone"),
                    "email": handle_info.get("email"),
                    "messages": [],
                    "latestDate": date,
                }
            
            conversations[conv_key]["messages"].append({
                "id": guid,
                "text": text,
                "date": date,
                "isFromMe": bool(is_from_me),
            })
            
            if date > conversations[conv_key]["latestDate"]:
                conversations[conv_key]["latestDate"] = date
        
        return list(conversations.values())
    
    def sync(self, since_hours: Optional[int] = None, force: bool = False) -> Dict[str, Any]:
        """Sync recent iMessage conversations to Ninja OS"""
        
        if not self._check_database_access():
            return {"error": "Cannot access iMessage database"}
        
        if force:
            self.synced_ids = set()
        
        hours = since_hours or LOOKBACK_HOURS
        since = datetime.now() - timedelta(hours=hours)
        
        print(f"Reading iMessages since {since}...")
        
        try:
            conn = sqlite3.connect(f"file:{self.db_path}?mode=ro", uri=True)
            handles = self._get_handle_info(conn)
            conversations = self._get_conversations(conn, handles, since)
            conn.close()
        except Exception as e:
            return {"error": f"Database error: {e}"}
        
        print(f"Found {len(conversations)} conversations with recent messages")
        
        # Prepare items for sync
        items = []
        for conv in conversations:
            # Create external ID from chat identifier and date range
            external_id = f"imessage_{conv['chatIdentifier']}_{conv['latestDate']}"
            external_id = hashlib.md5(external_id.encode()).hexdigest()
            
            if external_id in self.synced_ids:
                continue
            
            # Build transcript
            messages = sorted(conv['messages'], key=lambda m: m['date'])
            transcript_lines = []
            for msg in messages:
                sender = "Me" if msg['isFromMe'] else (conv['displayName'] or conv['phone'] or "Them")
                timestamp = self._apple_time_to_datetime(msg['date']).strftime("%H:%M")
                transcript_lines.append(f"[{timestamp}] {sender}: {msg['text']}")
            
            transcript = "\n".join(transcript_lines)
            
            # Prepare participant info
            participants = []
            if conv['phone']:
                participants.append({"phone": conv['phone'], "name": conv['displayName']})
            elif conv['email']:
                participants.append({"email": conv['email'], "name": conv['displayName']})
            elif conv['displayName']:
                participants.append({"name": conv['displayName']})
            
            items.append({
                "externalId": external_id,
                "type": "text",
                "title": f"iMessage with {conv['displayName'] or conv['phone'] or conv['email'] or 'Unknown'}",
                "transcript": transcript,
                "timestamp": self._apple_time_to_datetime(conv['latestDate']).isoformat(),
                "participants": participants,
            })
            
            if len(items) >= MAX_ITEMS_PER_SYNC:
                break
        
        if not items:
            print("No new conversations to sync")
            return {"synced": 0, "message": "No new conversations"}
        
        print(f"Syncing {len(items)} conversations...")
        
        try:
            result = self.client.push_items(
                source="imessage",
                items=items,
                sync_type="incremental" if not force else "full"
            )
            
            for item_result in result.get('results', []):
                if item_result.get('status') in ['created', 'skipped']:
                    self.synced_ids.add(item_result.get('id'))
            
            self._save_synced_ids()
            
            print(f"Sync complete: {result.get('processed', 0)} processed, {result.get('failed', 0)} failed")
            return result
        except Exception as e:
            return {"error": str(e)}
    
    def search_messages(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Search iMessage database for messages containing query"""
        
        if not self._check_database_access():
            return []
        
        try:
            conn = sqlite3.connect(f"file:{self.db_path}?mode=ro", uri=True)
            cursor = conn.execute("""
                SELECT 
                    m.text,
                    m.date,
                    m.is_from_me,
                    h.id as handle_id
                FROM message m
                LEFT JOIN handle h ON m.handle_id = h.ROWID
                WHERE m.text LIKE ?
                ORDER BY m.date DESC
                LIMIT ?
            """, (f"%{query}%", limit))
            
            results = []
            for row in cursor:
                results.append({
                    "text": row[0],
                    "date": self._apple_time_to_datetime(row[1]).isoformat(),
                    "isFromMe": bool(row[2]),
                    "contact": row[3],
                })
            
            conn.close()
            return results
        except Exception as e:
            print(f"Search error: {e}")
            return []


def main():
    """Run iMessage sync"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Sync iMessages to Ninja OS")
    parser.add_argument("--hours", type=int, default=24, help="Hours of history to sync")
    parser.add_argument("--force", action="store_true", help="Force full sync")
    parser.add_argument("--search", help="Search messages instead of syncing")
    parser.add_argument("--url", default=NINJA_OS_URL, help="Ninja OS URL")
    
    args = parser.parse_args()
    
    agent = IMessageSyncAgent(args.url)
    
    if args.search:
        results = agent.search_messages(args.search)
        print(json.dumps(results, indent=2))
    else:
        result = agent.sync(since_hours=args.hours, force=args.force)
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
