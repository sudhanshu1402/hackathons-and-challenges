import sys
import subprocess
import asyncio
import pytest
from src.inventory import InventoryManager

def test_app_bootstraps():
    """Ensure the application can boot without cyclical import crashes."""
    try:
        from src import main
        assert True
    except ImportError as e:
        pytest.fail(f"Boot failed - ImportError: {e}")

@pytest.mark.asyncio
async def test_inventory_concurrent_checkout():
    """Test that concurrent inventory checkout strictly prevents overselling."""
    manager = InventoryManager()
    manager.set_stock("laptop", 5)
    
    # Try to buy 15 laptops concurrently
    async def buy_laptop():
        return await manager.decrement_stock("laptop", 1)
        
    results = await asyncio.gather(*(buy_laptop() for _ in range(15)))
    
    success_count = sum(1 for r in results if r)
    assert success_count == 5, f"Expected 5 successful orders, got {success_count}."
    assert manager.get_stock("laptop") == 0, f"Stock should be 0, but is {manager.get_stock('laptop')}."

def test_graceful_shutdown_and_no_oversell_e2e():
    """Run main.py and ensure it terminates within 5 seconds without hanging and output is correct."""
    try:
        result = subprocess.run(
            [sys.executable, "src/main.py"],
            capture_output=True,
            text=True,
            timeout=5.0  # If it hangs, this will throw TimeoutExpired
        )
        
        assert result.returncode == 0, f"Process cleanly exited but got return code {result.returncode}. Stderr: {result.stderr}"
        
        output = result.stdout + result.stderr
        assert "Data integrity compromised:" not in output, "Overselling occurred in end-to-end test."
        assert "Laptops remaining: 0" in output, f"Final stock was incorrect. Output: {output}"
        
    except subprocess.TimeoutExpired:
        pytest.fail("The application hung indefinitely and failed to shut down elegantly.")
