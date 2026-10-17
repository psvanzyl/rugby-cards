#!/bin/bash
# Launch the Wikidata harvest detached, so the ssh session can return immediately.
cd /root/projects/rugby-cards/scripts || exit 1
: > /root/projects/rugby-cards/data/harvest.log
setsid python3 -u harvest.py "$@" >> /root/projects/rugby-cards/data/harvest.log 2>&1 < /dev/null &
echo "harvest started (pid $!)"
