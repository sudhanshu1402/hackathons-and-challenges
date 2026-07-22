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
                
            self.queue.task_done()
