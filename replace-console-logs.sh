#!/bin/bash
# Backup original files
cp src/App.tsx src/App.tsx.backup

# Import logger at the top of App.tsx if not already present
if ! grep -q "import { logger }" src/App.tsx; then
  # Add import after other imports
  sed -i.tmp '7a\
import { logger } from '\''./lib/logger'\'';
' src/App.tsx
  rm src/App.tsx.tmp
fi

echo "Logger import added to App.tsx"
echo "Manual replacement required - script completed setup"
