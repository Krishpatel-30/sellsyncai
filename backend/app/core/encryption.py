import base64
import json
import os
from typing import Any, Dict
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from app.core.config import settings


def _get_fernet() -> Fernet:
    """Derive a 32-byte key from the configured ENCRYPTION_KEY or SECRET_KEY."""
    raw_key = (settings.ENCRYPTION_KEY or settings.SECRET_KEY).encode("utf-8")
    salt = b"sellsync_fixed_salt_v1"  # Constant salt for reproducible key derivation
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(raw_key))
    return Fernet(key)


def encrypt_data(data: Dict[str, Any]) -> str:
    """Encrypt a dictionary into a secure Fernet token string."""
    fernet = _get_fernet()
    json_bytes = json.dumps(data).encode("utf-8")
    encrypted = fernet.encrypt(json_bytes)
    return encrypted.decode("utf-8")


def decrypt_data(encrypted_str: str) -> Dict[str, Any]:
    """Decrypt a Fernet token string back into a dictionary."""
    fernet = _get_fernet()
    try:
        decrypted_bytes = fernet.decrypt(encrypted_str.encode("utf-8"))
        return json.loads(decrypted_bytes.decode("utf-8"))
    except (InvalidToken, Exception):
        return {}


def mask_credential(val: str) -> str:
    """Mask a sensitive string like an API key (e.g. shpat_123456789 -> shpat_***6789)."""
    if not val:
        return ""
    if len(val) <= 8:
        return "****"
    return f"{val[:6]}***{val[-4:]}"
