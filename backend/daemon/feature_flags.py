# feature_flags.py

class FeatureFlags:
    # Production Flags
    ENABLE_RELIABILITY_ENGINE = True
    ENABLE_AUTOCALIBRATION = True
    ENABLE_HUD = True
    
    # Experimental Flags
    ENABLE_EXPERIMENTAL_GESTURES = False
    ENABLE_BETA_SMOOTHING = False
    ENABLE_GPU_ACCELERATION = False

    # Developer Flags
    ENABLE_DIAGNOSTICS = True
    ENABLE_DEBUG_HUD = False
    ENABLE_PERFORMANCE_PROFILER = True
    ENABLE_VERBOSE_IPC = False
