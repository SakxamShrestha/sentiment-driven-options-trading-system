"""
Shared Flask-Limiter instance.
Initialized with the app in main.py, imported by blueprints for per-route limits.
"""
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(get_remote_address)
