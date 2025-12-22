#!/usr/bin/env python3
"""
Fathom.video Sync Agent
Fetches meeting recordings and transcripts from Fathom API and pushes to Ninja OS
"""

import os
import json
import hashlib
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from sync_client import NinjaOSSyncClient
from config import NINJA_OS_URL, LOOKBACK_HOURS, MAX_ITEMS_PER_SYNC

FATHOM_API_URL = "https://api.fathom.ai/external/v1"


class FathomSyncAgent:
    """Syncs Fathom.video meetings to Ninja OS"""
    
    def __init__(self, ninja_url: str, api_key: str):
        self.client = NinjaOSSyncClient(ninja_url)
        self.api_key = api_key
        self.synced_ids_file = os.path.expanduser("~/.ninja_os_fathom_synced.json")
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
        meeting_url = meeting.get('url', '')
        meeting_id = meeting_url.split('/')[-1] if meeting_url else ''
        unique_str = f"fathom_{meeting_id}{meeting.get('title', '')}{meeting.get('created_at', '')}"
        return hashlib.md5(unique_str.encode()).hexdigest()
    
    def _fetch_meetings(self, created_after: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch meetings from Fathom API"""
        headers = {
            "X-Api-Key": self.api_key,
            "Content-Type": "application/json"
        }
        
        params = {
            "include_transcript": "true"
        }
        
        if created_after:
            params["created_after"] = created_after
        
        all_meetings = []
        cursor = None
        
        while True:
            if cursor:
                params["cursor"] = cursor
            
            try:
                response = requests.get(
                    f"{FATHOM_API_URL}/meetings",
                    headers=headers,
                    params=params,
                    timeout=30
                )
                response.raise_for_status()
                data = response.json()
                
                meetings = data.get("items", [])
                all_meetings.extend(meetings)
                
                cursor = data.get("cursor")
                if not cursor or len(all_meetings) >= MAX_ITEMS_PER_SYNC:
                    break
                    
            except requests.exceptions.RequestException as e:
                print(f"Error fetching Fathom meetings: {e}")
                break
        
        return all_meetings
    
    def _parse_meeting(self, meeting: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Parse a Fathom meeting into sync format"""
        try:
            external_id = self._generate_external_id(meeting)
            
            if external_id in self.synced_ids:
                return None
            
            timestamp = meeting.get('created_at') or meeting.get('recording_start_time')
            if not timestamp:
                timestamp = datetime.now().isoformat()
            
            try:
                meeting_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00').replace('+00:00', ''))
                if datetime.now() - meeting_time > timedelta(hours=LOOKBACK_HOURS * 24 * 7):
                    return None
            except:
                pass
            
            transcript_data = meeting.get('transcript', [])
            transcript_lines = []
            for entry in transcript_data:
                speaker = entry.get('speaker', {})
                speaker_name = speaker.get('display_name', 'Unknown')
                text = entry.get('text', '')
                timestamp_str = entry.get('timestamp', '')
                transcript_lines.append(f"[{timestamp_str}] {speaker_name}: {text}")
            
            transcript = '\n'.join(transcript_lines)
            
            summary_data = meeting.get('default_summary', {})
            summary = summary_data.get('markdown_formatted', '') if isinstance(summary_data, dict) else str(summary_data)
            
            participants = []
            calendar_invitees = meeting.get('calendar_invitees', [])
            for invitee in calendar_invitees:
                name = invitee.get('name', '')
                email = invitee.get('email', '')
                if name:
                    participants.append({
                        "name": name,
                        "email": email,
                        "isExternal": invitee.get('is_external', True)
                    })
            
            recorded_by = meeting.get('recorded_by', {})
            if recorded_by.get('name'):
                host_name = recorded_by.get('name')
                if not any(p.get('name') == host_name for p in participants):
                    participants.insert(0, {
                        "name": host_name,
                        "email": recorded_by.get('email', ''),
                        "isHost": True
                    })
            
            start_time = meeting.get('recording_start_time') or meeting.get('scheduled_start_time')
            end_time = meeting.get('recording_end_time') or meeting.get('scheduled_end_time')
            duration = None
            if start_time and end_time:
                try:
                    start = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                    end = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                    duration = int((end - start).total_seconds())
                except:
                    pass
            
            return {
                "externalId": external_id,
                "title": meeting.get('title') or meeting.get('meeting_title') or "Fathom Meeting",
                "summary": summary,
                "transcript": transcript,
                "timestamp": timestamp,
                "duration": duration,
                "participants": participants,
                "externalLink": meeting.get('share_url') or meeting.get('url'),
                "metadata": {
                    "meetingType": meeting.get('meeting_type'),
                    "transcriptLanguage": meeting.get('transcript_language'),
                    "fathomUrl": meeting.get('url')
                }
            }
        except Exception as e:
            print(f"Error parsing meeting: {e}")
            return None
    
    def sync(self, force: bool = False) -> Dict[str, Any]:
        """Sync Fathom meetings to Ninja OS"""
        print("Connecting to Fathom API...")
        
        if force:
            self.synced_ids = set()
        
        created_after = None
        if not force:
            lookback = datetime.now() - timedelta(hours=LOOKBACK_HOURS * 24 * 7)
            created_after = lookback.isoformat() + "Z"
        
        meetings = self._fetch_meetings(created_after)
        print(f"Found {len(meetings)} meetings from Fathom")
        
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
                source="fathom",
                items=items,
                sync_type="incremental" if not force else "full",
                metadata={"api_version": "v1"}
            )
            
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
    """Run Fathom sync from command line"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Sync Fathom.video meetings to Ninja OS")
    parser.add_argument("--url", default=NINJA_OS_URL, help="Ninja OS URL")
    parser.add_argument("--api-key", required=True, help="Fathom API key")
    parser.add_argument("--force", action="store_true", help="Force full sync (ignore previous syncs)")
    
    args = parser.parse_args()
    
    agent = FathomSyncAgent(args.url, args.api_key)
    result = agent.sync(force=args.force)
    
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
