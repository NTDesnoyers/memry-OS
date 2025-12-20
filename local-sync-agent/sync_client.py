"""
Ninja OS Sync Client
Base client for pushing data to Ninja OS sync API
"""

import requests
from typing import List, Dict, Any, Optional
from datetime import datetime


class NinjaOSSyncClient:
    """Client for syncing data to Ninja OS"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
    
    def push_items(
        self, 
        source: str, 
        items: List[Dict[str, Any]], 
        sync_type: str = "incremental",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Push items to Ninja OS sync API
        
        Args:
            source: One of 'granola', 'plaud', 'imessage', 'whatsapp'
            items: List of items to sync, each with:
                - externalId: Unique ID for deduplication
                - type: 'meeting', 'call', 'text', 'email'
                - title: Optional title
                - content: Message/note content
                - summary: AI-generated summary if available
                - transcript: Full transcript if available
                - timestamp: ISO datetime string
                - duration: Duration in minutes
                - participants: List of {name?, phone?, email?}
                - personHint: {id?, name?, phone?, email?} to help match
            sync_type: 'full', 'incremental', or 'single'
            metadata: Optional metadata about the sync
        
        Returns:
            Response with syncId, received, processed, failed, results
        """
        response = self.session.post(
            f"{self.base_url}/api/sync/push",
            json={
                "source": source,
                "syncType": sync_type,
                "items": items,
                "metadata": metadata
            }
        )
        response.raise_for_status()
        return response.json()
    
    def transcribe_audio(
        self,
        audio_base64: Optional[str] = None,
        audio_url: Optional[str] = None,
        external_id: str = None,
        source: str = "plaud",
        timestamp: Optional[str] = None,
        person_hint: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Send audio for transcription and create interaction
        
        Args:
            audio_base64: Base64-encoded audio data
            audio_url: URL to audio file
            external_id: Unique ID for deduplication
            source: Source identifier (default: 'plaud')
            timestamp: ISO datetime of recording
            person_hint: {id?, name?, phone?} to help match
        
        Returns:
            Response with status, interactionId, personId, transcriptLength
        """
        response = self.session.post(
            f"{self.base_url}/api/sync/transcribe",
            json={
                "audioBase64": audio_base64,
                "audioUrl": audio_url,
                "externalId": external_id,
                "source": source,
                "timestamp": timestamp,
                "personHint": person_hint
            }
        )
        response.raise_for_status()
        return response.json()
    
    def search_person(
        self,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for a person in Ninja OS
        
        Args:
            phone: Phone number to search
            email: Email to search
            name: Name to search
        
        Returns:
            List of matching people
        """
        params = {}
        if phone:
            params['phone'] = phone
        elif email:
            params['email'] = email
        elif name:
            params['name'] = name
        
        response = self.session.get(
            f"{self.base_url}/api/sync/search-person",
            params=params
        )
        response.raise_for_status()
        return response.json().get('matches', [])
    
    def get_sync_logs(self, source: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get sync logs, optionally filtered by source"""
        params = {}
        if source:
            params['source'] = source
        
        response = self.session.get(
            f"{self.base_url}/api/sync/logs",
            params=params
        )
        response.raise_for_status()
        return response.json()


if __name__ == "__main__":
    # Test the client
    from config import NINJA_OS_URL
    
    client = NinjaOSSyncClient(NINJA_OS_URL)
    
    # Test search
    print("Testing search...")
    matches = client.search_person(name="test")
    print(f"Found {len(matches)} matches")
    
    # Test getting sync logs
    print("Getting sync logs...")
    logs = client.get_sync_logs()
    print(f"Found {len(logs)} sync logs")
