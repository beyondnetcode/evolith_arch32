#!/bin/bash
# Evolith CI Validation Script
# Run this in your CI pipeline to validate satellite repository compliance

set -e

REPO_ROOT="${REPO_ROOT:-$(pwd)}"
EVOLITH_CORE="${EVOLITH_CORE:-../evolith}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-json}"
OUTPUT_FILE="${OUTPUT_FILE:-evolith-validation-report.json}"

echo "=============================================="
echo " Evolith Repository Validation"
echo "=============================================="
echo " Repository: $REPO_ROOT"
echo " Core Ref: $EVOLITH_CORE"
echo " Output: $OUTPUT_FORMAT"
echo "=============================================="

# Check if evolith CLI is available
if ! command -v evolith &> /dev/null; then
    echo "Installing Evolith CLI..."
    npm install -g @evolith/cli
fi

# Run validation
echo ""
echo "Running validation..."
evolith validate \
    --satellite "$REPO_ROOT" \
    --core "$EVOLITH_CORE" \
    --format "$OUTPUT_FORMAT" \
    --output "$OUTPUT_FILE"

# Check exit code
EXIT_CODE=$?

echo ""
echo "=============================================="
if [ $EXIT_CODE -eq 0 ]; then
    echo "✓ Validation PASSED"
    echo " Report saved to: $OUTPUT_FILE"
else
    echo "✗ Validation FAILED"
    echo " Check report at: $OUTPUT_FILE"
    echo "=============================================="
    cat "$OUTPUT_FILE"
fi
echo "=============================================="

exit $EXIT_CODE