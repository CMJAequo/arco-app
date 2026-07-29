#!/bin/bash
cp ~/Downloads/arco-prototype.html ~/arco-app/public/index.html
cd ~/arco-app
git add -A
git commit -m "update: $(date '+%H:%M %d/%m')"
git push
echo "✓ deployed"
