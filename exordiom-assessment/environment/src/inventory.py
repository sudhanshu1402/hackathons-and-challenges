"""
Centralized state manager for product inventory.
Responsible for maintaining transactional atomicity and stock thresholds.
"""
import asyncio
import logging
from src.main import Config

logger = logging.getLogger(__name__)

class InventoryManager:
    """Manages the in-memory cache for warehouse stock values."""
    
    def __init__(self):
        self._stock: dict[str, int] = {}
        logger.debug(f"InventoryManager initialized with strict ruleset")
        
    def set_stock(self, item: str, amount: int) -> None:
        """Seed initial static catalog sizes."""
        self._stock[item] = amount
        logger.debug(f"Stock set for {item}: {amount}")
        
    def get_stock(self, item: str) -> int:
        """Query current item pool limit."""
        return self._stock.get(item, 0)

    async def decrement_stock(self, item: str, amount: int) -> bool:
        """
        Attempts to decrement current stock asynchronously.
        Simulates an external call to Postgres/Redis.
        """
        logger.debug(f"Attempting to checkout {amount} of {item}")
        
        if self._stock.get(item, 0) >= amount:
            # Simulate a database network call (adds non-deterministic latency)
            await asyncio.sleep(0.05)
            self._stock[item] -= amount
            logger.info(f"Successfully deducted {amount} from {item} inventory.")
            return True
        
        logger.warning(f"Could not deduct {amount} of {item} - insufficient stock!")
        return False
