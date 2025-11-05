#!/bin/bash
# Initialize a new VSA example project

set -e

EXAMPLE_NAME=$1
LANGUAGE=${2:-typescript}

if [ -z "$EXAMPLE_NAME" ]; then
    echo "Usage: ./init-example.sh <example-name> [language]"
    echo "Example: ./init-example.sh my-example typescript"
    exit 1
fi

echo "🚀 Initializing VSA example: $EXAMPLE_NAME"
echo "Language: $LANGUAGE"

# Create directory
mkdir -p "$EXAMPLE_NAME"
cd "$EXAMPLE_NAME"

# Initialize VSA
vsa init --language "$LANGUAGE" --non-interactive

# Create standard directories
mkdir -p src/infrastructure
mkdir -p tests/unit
mkdir -p tests/integration
mkdir -p tests/e2e
mkdir -p docs

# Create README template
cat > README.md <<EOF
# $EXAMPLE_NAME

## Overview

[Describe your example application]

## Features

- Feature 1
- Feature 2
- Feature 3

## Architecture

[Describe bounded contexts and integration events]

## Getting Started

### Prerequisites

- Node.js 18+ (for TypeScript) or Python 3.11+ (for Python)
- Docker and Docker Compose
- VSA CLI

### Installation

\`\`\`bash
# Install dependencies
npm install  # or pip install -r requirements.txt

# Start infrastructure
docker-compose up -d

# Run application
npm start  # or python src/main.py
\`\`\`

### Running Tests

\`\`\`bash
npm test  # or pytest
\`\`\`

## Project Structure

\`\`\`
$EXAMPLE_NAME/
├── vsa.yaml
├── src/
│   ├── contexts/
│   ├── _shared/
│   ├── infrastructure/
│   └── api/
├── tests/
└── docs/
\`\`\`

## Documentation

See \`docs/\` for detailed documentation.

## License

MIT
EOF

# Create basic docker-compose
cat > docker-compose.yml <<EOF
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
    depends_on:
      - postgres
    volumes:
      - .:/app
      - /app/node_modules

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: eventstore
      POSTGRES_USER: eventstore
      POSTGRES_PASSWORD: eventstore_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
EOF

# Create .gitignore
cat > .gitignore <<EOF
node_modules/
dist/
build/
*.log
.env
.env.local
*.pyc
__pycache__/
.pytest_cache/
coverage/
.vscode/
.idea/
*.swp
*.swo
EOF

echo "✅ Example initialized: $EXAMPLE_NAME"
echo ""
echo "Next steps:"
echo "  1. cd $EXAMPLE_NAME"
echo "  2. Edit vsa.yaml to configure bounded contexts"
echo "  3. Generate features: vsa generate <context> <feature>"
echo "  4. Implement business logic"
echo "  5. Run tests: npm test"

