"""
Order Processing Entrypoint.
Initializes the system, spins up worker tasks, and manages the producer lifecycle.
"""
import asyncio
import logging
from src.processor import OrderProcessor
from src.inventory import InventoryManager

# Application Configuration
class Config:
    LOG_LEVEL = "DEBUG"
    DEFAULT_ITEM = "laptop"

# Setup standard logging
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

async def produce_orders(processor: OrderProcessor):
    """Generates synthetic bulk order traffic for the queue."""
    # Produce normal orders to simulate user traffic
    for i in range(15):
        await processor.add_order({"item": Config.DEFAULT_ITEM, "amount": 1, "id": f"ord_{i}"})
    
    # Allow background processing to catch up
    await asyncio.sleep(0.2)
    
    # Simulate a corrupted or negative-value transaction
    await processor.add_order({"item": Config.DEFAULT_ITEM, "amount": -1, "id": "tx_bad_1"})

async def main():
    logger.info("Application bootstrap started.")
    
    inventory_manager = InventoryManager()
    
    # Provide highly constrained inventory
    inventory_manager.set_stock(Config.DEFAULT_ITEM, 5)
    
    processor = OrderProcessor(inventory_manager)
    
    # Setup background processing fleet
    workers = [asyncio.create_task(processor.process_queue()) for _ in range(5)]
    
    try:
        producer_task = asyncio.create_task(produce_orders(processor))
        await producer_task
    except Exception:
        logger.exception("Producer task encountered a fatal error")
    
    logger.info("Producer finished. Waiting for queue to drain...")
    await processor.queue.join()
    
    logger.info("All orders processed. Tearing down workers...")
    for worker in workers:
        worker.cancel()
    
    # Output final state
    final_stock = inventory_manager.get_stock(Config.DEFAULT_ITEM)
    logger.info(f"Final Inventory State - {Config.DEFAULT_ITEM.capitalize()}s remaining: {final_stock}")
    
    if final_stock < 0:
        logger.critical(f"Data integrity compromised: Inventory went below 0! Stock={final_stock}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.warning("Application interrupted by user.")
