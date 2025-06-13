import logging

def get_logger(name: str, emoji: str = "🔧") -> logging.Logger:
    """Get a logger with the specified name and emoji prefix"""
    logger = logging.getLogger(name)
    
    # Configure if not already configured
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler()
        formatter = logging.Formatter(f'{emoji} %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    return logger 