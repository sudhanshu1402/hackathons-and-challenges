#!/bin/bash
set -ex

# Fix the InventoryManager by removing circular import and adding a Lock
cat << 'EOF' > /app/src/inventory.py
"""
Centralized state manager for product inventory.
Responsible for maintaining transactional atomicity and stock thresholds.
"""
import asyncio
import logging

logger = logging.getLogger(__name__)

class InventoryManager:
    """Manages the in-memory cache for warehouse stock values."""
    
    def __init__(self):
        self._stock: dict[str, int] = {}
        self.lock = asyncio.Lock()
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
        
        async with self.lock:
            if self._stock.get(item, 0) >= amount:
                # Simulate a database network call
                await asyncio.sleep(0.05)
                self._stock[item] -= amount
                logger.info(f"Successfully deducted {amount} from {item} inventory.")
                return True
            
        logger.warning(f"Could not deduct {amount} of {item} - insufficient stock!")
        return False
EOF

# Fix processor missing task_done() in finally block
cat << 'EOF' > /app/src/processor.py
"""
Background workers for consuming async order events.
Listens to queue events and dispatches database inventory updates.
"""
from __future__ import annotations
import asyncio
import logging
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from src.inventory import InventoryManager

logger = logging.getLogger(__name__)

class OrderProcessor:
    """Manages scaling out parallel workers handling purchase workloads."""
    
    def __init__(self, inventory: InventoryManager):
        self.inventory: InventoryManager = inventory
        self.queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        
    async def add_order(self, order: dict[str, Any]) -> None:
        """Push external rest payload onto local queue."""
        logger.debug(f"Queuing payload for order {order.get('id')}")
        await self.queue.put(order)
        
    async def process_queue(self) -> None:
        """Persistent loop bound to a single asyncio thread."""
        logger.info("Worker thread initialized. Awaiting orders...")
        
        while True:
            order = await self.queue.get()
            
            try:
                amount = order.get("amount", 1)
                item = order.get("item", "unknown")
                order_id = order.get("id", "n/a")
                
                if amount < 0:
                    logger.error(f"Integrity check failed. Negative quantity provided for {order_id}")
                    raise ValueError(f"Corrupted or malicious amount '{amount}' observed on transaction '{order_id}'.")
                    
                success = await self.inventory.decrement_stock(item, amount)
                if success:
                    logger.debug(f"Transaction ID {order_id} committed.")
                else:
                    logger.warning(f"Transaction ID {order_id} rejected. Out of bounds.")
            except ValueError:
                pass
            finally:
                self.queue.task_done()
EOF

echo "Fixes applied successfully."
