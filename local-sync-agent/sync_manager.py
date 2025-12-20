#!/usr/bin/env python3
"""
Ninja OS Unified Sync Manager
Runs all sync agents together, either once or continuously
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime
from typing import List, Dict, Any

from config import NINJA_OS_URL, SYNC_INTERVAL_MINUTES


def run_all_syncs(url: str, sources: List[str] = None, force: bool = False) -> Dict[str, Any]:
    """Run all sync agents and return combined results"""
    
    results = {}
    enabled_sources = sources or ['granola', 'imessage']  # Default to these two
    
    # Granola
    if 'granola' in enabled_sources:
        try:
            from sync_granola import GranolaSyncAgent
            from config import GRANOLA_CACHE_PATH
            
            print("\n" + "="*50)
            print("SYNCING GRANOLA")
            print("="*50)
            
            agent = GranolaSyncAgent(url, GRANOLA_CACHE_PATH)
            results['granola'] = agent.sync(force=force)
        except ImportError as e:
            results['granola'] = {"error": f"Import error: {e}"}
        except Exception as e:
            results['granola'] = {"error": str(e)}
    
    # iMessage
    if 'imessage' in enabled_sources:
        try:
            from sync_imessage import IMessageSyncAgent
            
            print("\n" + "="*50)
            print("SYNCING IMESSAGE")
            print("="*50)
            
            agent = IMessageSyncAgent(url)
            results['imessage'] = agent.sync(force=force)
        except ImportError as e:
            results['imessage'] = {"error": f"Import error: {e}"}
        except Exception as e:
            results['imessage'] = {"error": str(e)}
    
    # Plaud (only if directory exists)
    if 'plaud' in enabled_sources:
        try:
            from sync_plaud import PlaudSyncAgent
            from config import PLAUD_DATA_PATH
            
            plaud_path = os.path.expanduser(PLAUD_DATA_PATH)
            if os.path.exists(plaud_path):
                print("\n" + "="*50)
                print("SYNCING PLAUD")
                print("="*50)
                
                agent = PlaudSyncAgent(url, PLAUD_DATA_PATH)
                results['plaud'] = agent.sync_directory(force=force)
            else:
                results['plaud'] = {"skipped": True, "message": f"Directory not found: {plaud_path}"}
        except ImportError as e:
            results['plaud'] = {"error": f"Import error: {e}"}
        except Exception as e:
            results['plaud'] = {"error": str(e)}
    
    # WhatsApp (only if directory exists)
    if 'whatsapp' in enabled_sources:
        try:
            from sync_whatsapp import WhatsAppSyncAgent
            from config import WHATSAPP_DATA_PATH
            
            whatsapp_path = os.path.expanduser(WHATSAPP_DATA_PATH)
            if os.path.exists(whatsapp_path):
                print("\n" + "="*50)
                print("SYNCING WHATSAPP")
                print("="*50)
                
                agent = WhatsAppSyncAgent(url)
                results['whatsapp'] = agent.sync_directory(whatsapp_path, force=force)
            else:
                results['whatsapp'] = {"skipped": True, "message": f"Directory not found: {whatsapp_path}"}
        except ImportError as e:
            results['whatsapp'] = {"error": f"Import error: {e}"}
        except Exception as e:
            results['whatsapp'] = {"error": str(e)}
    
    return results


def print_summary(results: Dict[str, Any]):
    """Print a summary of sync results"""
    print("\n" + "="*50)
    print("SYNC SUMMARY")
    print("="*50)
    
    for source, result in results.items():
        if 'error' in result:
            print(f"  {source}: ERROR - {result['error']}")
        elif result.get('skipped'):
            print(f"  {source}: SKIPPED - {result.get('message', '')}")
        else:
            synced = result.get('synced', result.get('processed', 0))
            failed = result.get('failed', 0)
            print(f"  {source}: {synced} synced, {failed} failed")


def run_daemon(url: str, sources: List[str], interval_minutes: int):
    """Run sync continuously at specified interval"""
    print(f"Starting sync daemon (interval: {interval_minutes} minutes)")
    print(f"Sources: {', '.join(sources)}")
    print(f"URL: {url}")
    print(f"Press Ctrl+C to stop\n")
    
    while True:
        print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Starting sync...")
        
        try:
            results = run_all_syncs(url, sources)
            print_summary(results)
        except KeyboardInterrupt:
            raise
        except Exception as e:
            print(f"Sync failed: {e}")
        
        print(f"\nNext sync in {interval_minutes} minutes...")
        time.sleep(interval_minutes * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Ninja OS Unified Sync Manager",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python sync_manager.py                    # Run all syncs once
  python sync_manager.py --daemon           # Run continuously
  python sync_manager.py --sources granola imessage  # Only specific sources
  python sync_manager.py --force            # Force re-sync all

Available sources: granola, plaud, imessage, whatsapp
        """
    )
    parser.add_argument("--url", default=NINJA_OS_URL, help="Ninja OS URL")
    parser.add_argument("--sources", nargs="+", 
                        choices=['granola', 'plaud', 'imessage', 'whatsapp'],
                        help="Sources to sync (default: all)")
    parser.add_argument("--daemon", action="store_true", help="Run continuously")
    parser.add_argument("--interval", type=int, default=SYNC_INTERVAL_MINUTES,
                        help=f"Sync interval in minutes (default: {SYNC_INTERVAL_MINUTES})")
    parser.add_argument("--force", action="store_true", help="Force full sync")
    
    args = parser.parse_args()
    
    # Check URL is configured
    if args.url == "https://your-ninja-os.replit.app":
        print("ERROR: Please update NINJA_OS_URL in config.py with your actual Ninja OS URL")
        print("\nYou can find your URL in the Replit webview or after deployment.")
        sys.exit(1)
    
    sources = args.sources or ['granola', 'plaud', 'imessage', 'whatsapp']
    
    if args.daemon:
        try:
            run_daemon(args.url, sources, args.interval)
        except KeyboardInterrupt:
            print("\n\nSync daemon stopped.")
    else:
        results = run_all_syncs(args.url, sources, force=args.force)
        print_summary(results)
        print(f"\nFull results:\n{json.dumps(results, indent=2, default=str)}")


if __name__ == "__main__":
    main()
