#!/bin/bash
# The Harbor framework runs this from the environment working directory (/app)
uv pip install --system pytest pytest-asyncio

# Run the test suite located in the tests/ directory
PYTHONPATH=/app pytest /tests/test_outputs.py > /logs/verifier/pytest.log 2>&1
EXIT_CODE=$?

# Write the reward file depending on pytest's exit code
if [ $EXIT_CODE -eq 0 ]; then
    echo 1 > /logs/verifier/reward.txt
else
    echo 0 > /logs/verifier/reward.txt
fi
