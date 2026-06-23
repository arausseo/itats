#!/usr/bin/env python3
import subprocess
import sys
import os

os.chdir('/vercel/share/v0-project')

try:
    print('[v0] Fetching latest changes from remote...')
    subprocess.run(['git', 'fetch', 'origin', 'main'], check=True)
    
    print('[v0] Current branch:')
    subprocess.run(['git', 'branch', '-v'], check=True)
    
    print('[v0] Pulling changes from main...')
    subprocess.run(['git', 'pull', 'origin', 'main'], check=True)
    
    print('[v0] Pull completed successfully')
    subprocess.run(['git', 'log', '--oneline', '-5'], check=True)
except subprocess.CalledProcessError as e:
    print(f'[v0] Error pulling changes: {e}', file=sys.stderr)
    sys.exit(1)
