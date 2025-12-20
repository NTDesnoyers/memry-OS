#!/usr/bin/env python3
"""
Granola Sync Agent
Reads from Granola's local cache and pushes meeting notes to Ninja OS
"""

import os
import json
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional

from sync_client import NinjaOSSyncClient
from config import NINJA_OS_URL, GRANOLA_CACHE_PATH, LOOKBACK_HOURS, MAX_ITEMS_PER_SYNC


class GranolaSyncAgent:
    """Syncs Granola meeting notes to Ninja OS"""
    
    def __init__(self, ninja_url: str, cache_path: str):
        self.client = NinjaOSSyncClient(ninja_url)
        self.cache_path = os.path.expanduser(cache_path)
        self.synced_ids_file = os.path.expanduser("~/.ninja_os_granola_synced.json")
        self.synced_ids = self._load_synced_ids()
    
    def _load_synced_ids(self) -> set:
        """Load previously synced IDs to avoid duplicates"""
        if os.path.exists(self.synced_ids_file):
            try:
                with open(self.synced_ids_file, 'r') as f:
                    return set(json.load(f))
            except:
                pass
        return set()
    
    def _save_synced_ids(self):
        """Save synced IDs"""
        with open(self.synced_ids_file, 'w') as f:
            json.dump(list(self.synced_ids), f)
    
    def _generate_external_id(self, meeting: Dict[str, Any]) -> str:
        """Generate a unique ID for a meeting"""
        unique_str = f"granola_{meeting.get('id', '')}{meeting.get('title', '')}{meeting.get('startTime', '')}"
        return hashlib.md5(unique_str.encode()).hexdigest()
    
    def _read_cache(self) -> List[Dict[str, Any]]:
        """Read Granola's cache file"""
        if not os.path.exists(self.cache_path):
            print(f"Granola cache not found at: {self.cache_path}")
            return []
        
        try:
            with open(self.cache_path, 'r') as f:
                data = json.load(f)
            
            # Granola uses a complex double-JSON structure
            # Handle various cache formats
            meetings = []
            
            if isinstance(data, list):
                meetings = data
            elif isinstance(data, dict):
                # Try common keys
                for key in ['meetings', 'notes', 'documents', 'items']:
                    if key in data:
                        meetings = data[key]
                        break
                # If still empty, check if values are meetings
                if not meetings:
                    meetings = list(data.values())
            
            return meetings if isinstance(meetings, list) else []
        except json.JSONDecodeError as e:
            print(f"Error parsing Granola cache: {e}")
            return []
        except Exception as e:
            print(f"Error reading Granola cache: {e}")
            return []
    
    def _parse_meeting(self, meeting: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Parse a Granola meeting into sync format"""
        try:
            external_id = self._generate_external_id(meeting)
            
            # Skip if already synced
            if external_id in self.synced_ids:
                return None
            
            # Extract meeting time
            start_time = meeting.get('startTime') or meeting.get('start_time') or meeting.get('date')
            if start_time:
                if isinstance(start_time, str):
                    timestamp = start_time
                else:
                    timestamp = datetime.fromtimestamp(start_time / 1000 if start_time > 1e10 else start_time).isoformat()
            else:
                timestamp = datetime.now().isoformat()
            
            # Check if within lookback window
            try:
                meeting_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00').replace('+00:00', ''))
                if datetime.now() - meeting_time > timedelta(hours=LOOKBACK_HOURS * 24 * 7):  # 1 week default
                    return None
            except:
                pass
            
            # Extract transcript
            transcript = meeting.get('transcript', '')
            if isinstance(transcript, list):
                transcript = '\n'.join([
                    f"{seg.get('speaker', 'Unknown')}: {seg.get('text', '')}"
                    for seg in transcript
                ])
            elif isinstance(transcript, dict):
                transcript = transcript.get('text', str(transcript))
            
            # Extract summary
            summary = meeting.get('summary') or meeting.get('ai_summary') or meeting.get('notes', '')
            if isinstance(summary, dict):
                summary = summary.get('text', str(summary))
            
            # Extract participants
            participants = []
            raw_participants = meeting.get('participants') or meeting.get('attendees') or []
            for p in raw_participants:
                if isinstance(p, str):
                    participants.append({"name": p})
                elif isinstance(p, dict):
                    participants.append({
                        "name": p.get('name') or p.get('displayName', ''),
                        "email": p.get('email', ''),
                    })
            
            # Calculate duration
            end_time = meeting.get('endTime') or meeting.get('end_time')
            duration = None
            if start_time and end_time:
                try:
                    start = datetime.fromisoformat(str(start_time).replace('Z', '+00:00'))
                    end = datetime.fromisoformat(str(end_time).replace('Z', '+00:00'))
                    duration = int((end - start).total_seconds() / 60)
                except:
                    pass
            
            return {
                "externalId": external_id,
                "type": "meeting",
                "title": meeting.get('title') or meeting.get('name') or "Granola Meeting",
                "summary": summary if summary else None,
                "transcript": transcript if transcript else None,
                "timestamp": timestamp,
                "duration": duration,
                "participants": participants,
                "externalLink": meeting.get('link') or meeting.get('url'),
            }
        except Exception as e:
            print(f"Error parsing meeting: {e}")
            return None
    
    def sync(self, force: bool = False) -> Dict[str, Any]:
        """Sync Granola meetings to Ninja OS"""
        print(f"Reading Granola cache from: {self.cache_path}")
        meetings = self._read_cache()
        print(f"Found {len(meetings)} meetings in cache")
        
        if force:
            self.synced_ids = set()
        
        # Parse meetings
        items = []
        for meeting in meetings:
            parsed = self._parse_meeting(meeting)
            if parsed:
                items.append(parsed)
            if len(items) >= MAX_ITEMS_PER_SYNC:
                break
        
        if not items:
            print("No new meetings to sync")
            return {"synced": 0, "message": "No new meetings"}
        
        print(f"Syncing {len(items)} new meetings...")
        
        try:
            result = self.client.push_items(
                source="granola",
                items=items,
                sync_type="incremental" if not force else "full",
                metadata={"cache_path": self.cache_path}
            )
            
            # Mark synced items
            for item_result in result.get('results', []):
                if item_result.get('status') in ['created', 'skipped']:
                    self.synced_ids.add(item_result.get('id'))
            
            self._save_synced_ids()
            
            print(f"Sync complete: {result.get('processed', 0)} processed, {result.get('failed', 0)} failed")
            return result
        except Exception as e:
            print(f"Sync failed: {e}")
            return {"error": str(e)}


def main():
    """Run Granola sync"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Sync Granola meetings to Ninja OS")
    parser.add_argument("--force", action="store_true", help="Force full sync (ignore previously synced)")
    parser.add_argument("--url", default=NINJA_OS_URL, help="Ninja OS URL")
    parser.add_argument("--cache", default=GRANOLA_CACHE_PATH, help="Granola cache path")
    
    args = parser.parse_args()
    
    agent = GranolaSyncAgent(args.url, args.cache)
    result = agent.sync(force=args.force)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
