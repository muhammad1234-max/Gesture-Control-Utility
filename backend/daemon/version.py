# version.py

APP_VERSION = "1.0.0-rc1"
BUILD_DATE = "2026-07-22"
COMMIT_HASH = "b577eae"
PROTOCOL_VERSION = "2.0"
CONFIG_VERSION = 3
API_VERSION = "v1"

def get_version_info():
    return {
        "app_version": APP_VERSION,
        "build_date": BUILD_DATE,
        "commit_hash": COMMIT_HASH,
        "protocol_version": PROTOCOL_VERSION,
        "config_version": CONFIG_VERSION,
        "api_version": API_VERSION
    }
