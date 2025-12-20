#!/usr/bin/env python3
"""
Plaud Sync Agent
Syncs Plaud recordings to Ninja OS
Can work with:
1. Local Plaud app exports
2. Plaud API via Zapier MCP
3. Manual file uploads
"""

import os
import json
import base64
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional

from sync_client import NinjaOSSyncClient
from config import NINJA_OS_URL, PLAUD_DATA_PATH, LOOKBACK_HOURS, MAX_ITEMS_PER_SYNC


class PlaudSyncAgent:
    """Syncs Plaud recordings to Ninja OS"""
    
    SUPPORTED_FORMATS = {'.m4a', '.mp3', '.wav', '.ogg', '.webm', '.mp4'}
    
    def __init__(self, ninja_url: str, data_path: Optional[str] = None):
        self.client = NinjaOSSyncClient(ninja_url)
        self.data_path = os.path.expanduser(data_path) if data_path else None
        self.synced_ids_file = os.path.expanduser("~/.ninja_os_plaud_synced.json")
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
    
    def _generate_external_id(self, file_path: str) -> str:
        """Generate unique ID from file"""
        stat = os.stat(file_path)
        unique_str = f"plaud_{os.path.basename(file_path)}_{stat.st_size}_{stat.st_mtime}"
        return hashlib.md5(unique_str.encode()).hexdigest()
    
    def _find_recordings(self, directory: str) -> List[str]:
        """Find audio recordings in directory"""
        recordings = []
        path = Path(directory)
        
        if not path.exists():
            print(f"Directory not found: {directory}")
            return []
        
        for file in path.rglob("*"):
            if file.suffix.lower() in self.SUPPORTED_FORMATS:
                recordings.append(str(file))
        
        # Sort by modification time (newest first)
        recordings.sort(key=lambda f: os.path.getmtime(f), reverse=True)
        return recordings
    
    def sync_file(self, file_path: str, person_name: Optional[str] = None) -> Dict[str, Any]:
        """Sync a single audio file"""
        if not os.path.exists(file_path):
            return {"error": f"File not found: {file_path}"}
        
        external_id = self._generate_external_id(file_path)
        
        if external_id in self.synced_ids:
            return {"status": "skipped", "message": "Already synced"}
        
        # Read and encode audio
        print(f"Reading audio file: {file_path}")
        with open(file_path, 'rb') as f:
            audio_data = f.read()
        
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        
        # Get file timestamp
        timestamp = datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
        
        # Prepare person hint
        person_hint = None
        if person_name:
            person_hint = {"name": person_name}
        
        print(f"Transcribing and uploading ({len(audio_data) / 1024:.1f} KB)...")
        
        try:
            result = self.client.transcribe_audio(
                audio_base64=audio_base64,
                external_id=external_id,
                source="plaud",
                timestamp=timestamp,
                person_hint=person_hint
            )
            
            if result.get('status') in ['created', 'skipped']:
                self.synced_ids.add(external_id)
                self._save_synced_ids()
            
            print(f"Result: {result.get('status', 'unknown')}")
            if result.get('transcriptLength'):
                print(f"Transcript length: {result['transcriptLength']} characters")
            
            return result
        except Exception as e:
            print(f"Failed: {e}")
            return {"error": str(e)}
    
    def sync_directory(self, directory: Optional[str] = None, force: bool = False) -> Dict[str, Any]:
        """Sync all recordings in a directory"""
        dir_path = directory or self.data_path
        
        if not dir_path:
            return {"error": "No directory specified"}
        
        print(f"Scanning directory: {dir_path}")
        recordings = self._find_recordings(dir_path)
        print(f"Found {len(recordings)} audio files")
        
        if force:
            self.synced_ids = set()
        
        # Filter to unsynced and recent
        to_sync = []
        cutoff = datetime.now() - timedelta(hours=LOOKBACK_HOURS * 24)  # Default to 24 days
        
        for recording in recordings:
            external_id = self._generate_external_id(recording)
            if external_id in self.synced_ids:
                continue
            
            mtime = datetime.fromtimestamp(os.path.getmtime(recording))
            if mtime < cutoff:
                continue
            
            to_sync.append(recording)
            if len(to_sync) >= MAX_ITEMS_PER_SYNC:
                break
        
        if not to_sync:
            print("No new recordings to sync")
            return {"synced": 0, "message": "No new recordings"}
        
        print(f"Syncing {len(to_sync)} recordings...")
        
        results = []
        for recording in to_sync:
            result = self.sync_file(recording)
            results.append({
                "file": os.path.basename(recording),
                "result": result
            })
        
        synced = sum(1 for r in results if r['result'].get('status') == 'created')
        failed = sum(1 for r in results if 'error' in r['result'])
        
        return {
            "synced": synced,
            "failed": failed,
            "total": len(results),
            "results": results
        }
    
    def sync_from_export(self, export_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sync from Plaud app export or Zapier webhook data
        
        Expected format:
        {
            "recordings": [
                {
                    "id": "unique-id",
                    "title": "Recording title",
                    "audioUrl": "https://...",
                    "timestamp": "2024-01-01T12:00:00Z",
                    "transcript": "Optional transcript if already done by Plaud",
                    "summary": "Optional summary",
                    "duration": 300  # seconds
                }
            ]
        }
        """
        recordings = export_data.get('recordings', [])
        
        items = []
        for rec in recordings:
            external_id = f"plaud_{rec.get('id', hashlib.md5(str(rec).encode()).hexdigest())}"
            
            if external_id in self.synced_ids:
                continue
            
            # If Plaud already has transcript, use it
            if rec.get('transcript'):
                items.append({
                    "externalId": external_id,
                    "type": "call",
                    "title": rec.get('title', 'Plaud Recording'),
                    "transcript": rec.get('transcript'),
                    "summary": rec.get('summary'),
                    "timestamp": rec.get('timestamp', datetime.now().isoformat()),
                    "duration": rec.get('duration', 0) // 60 if rec.get('duration') else None,
                    "externalLink": rec.get('audioUrl'),
                })
        
        if not items:
            return {"synced": 0, "message": "No new recordings in export"}
        
        result = self.client.push_items(
            source="plaud",
            items=items,
            sync_type="incremental"
        )
        
        for item_result in result.get('results', []):
            if item_result.get('status') in ['created', 'skipped']:
                self.synced_ids.add(item_result.get('id'))
        
        self._save_synced_ids()
        return result


def main():
    """Run Plaud sync"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Sync Plaud recordings to Ninja OS")
    parser.add_argument("--file", help="Sync a single audio file")
    parser.add_argument("--directory", help="Sync all recordings in directory")
    parser.add_argument("--person", help="Person name for the recording")
    parser.add_argument("--force", action="store_true", help="Force full sync")
    parser.add_argument("--url", default=NINJA_OS_URL, help="Ninja OS URL")
    
    args = parser.parse_args()
    
    agent = PlaudSyncAgent(args.url, args.directory or PLAUD_DATA_PATH)
    
    if args.file:
        result = agent.sync_file(args.file, args.person)
    elif args.directory:
        result = agent.sync_directory(args.directory, force=args.force)
    else:
        print("Please specify --file or --directory")
        print("\nExamples:")
        print("  python sync_plaud.py --file ~/Downloads/recording.m4a --person 'John Smith'")
        print("  python sync_plaud.py --directory ~/Plaud/Recordings")
        return
    
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
