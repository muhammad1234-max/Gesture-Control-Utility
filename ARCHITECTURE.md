# Gesture Control Command Center V2 — Software Architecture Specification

This document defines the production-grade, multi-process software architecture for the **Gesture Control Command Center V2 (GCCC_V2)**, a commercial-quality Windows desktop gesture control application.

---

## 1. System Topology & Process Model

GCCC_V2 adopts a decoupled, multi-process desktop architecture to isolate heavy camera tracking and kernel-level system input emulation from the high-refresh user interface.

```
+-----------------------------------------------------------------------------------+
|                                 WINDOWS HOST OS                                   |
+-----------------------------------------------------------------------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                                                   |
        v                                                                   v
+-----------------------+       Local High-Speed IPC        +-----------------------+
|  FRONTEND PROCESS     | <===============================> |  CORE BACKEND DEAMON  |
|  (React & Vite)       |       WebSocket / Named Pipe      |  (Express, Node, C++) |
+-----------------------+                                   +-----------------------+
| - UI Rendering        |                                   | - DirectShow Cam Src  |
| - Config Management   |                                   | - MediaPipe Skeleton  |
| - Sandbox Playground  |                                   | - Input Injection     |
| - Calibration Tools   |                                   | - Logging & Telemetry |
+-----------------------+                                   +-----------------------+
```

### 1.1 Process Boundaries
1. **Frontend Renderer (React / Vite UI):** Operates inside a secure, sandboxed rendering frame. It communicates with the backend exclusively via an asynchronous IPC channel (WebSocket / Node-API bridge).
2. **Core Backend Daemon (Node.js & C++ Core):** Executes with elevated permissions to perform DirectShow webcam interactions, load C++ MediaPipe skeletal tracking nodes, and call Windows API primitives for global keystroke injections.

---

## 2. Directory Structure

The project layout adheres to a modular, domain-driven structure dividing frontend UI, backend controller daemon, native core bindings, and continuous testing:

```
/
├── .env.example                # Example environment settings
├── ARCHITECTURE.md             # This complete architecture specification
├── index.html                  # Main Webpack/Vite HTML entry point
├── package.json                # Project dependencies and workspace configurations
├── tsconfig.json               # TypeScript compilation guidelines
├── vite.config.ts              # Vite configuration
├── src/
│   ├── main.tsx                # Frontend entry point
│   ├── App.tsx                 # Core App Shell containing navigation & state engine
│   ├── types.ts                # Strong typed global definitions
│   ├── index.css               # CSS file housing fonts and Tailwind design tokens
│   ├── components/             # Reusable UI component modules
│   │   ├── Sidebar.tsx         # Connection status & primary navigation panel
│   │   ├── DashboardView.tsx   # Real-time diagnostics console & system charts
│   │   ├── GestureLibraryView.tsx # Gesture CRUD, modifier recorder & thresholds
│   │   ├── SandboxView.tsx     # Canvas drawing gesture recognizer & video preview
│   │   ├── CalibrationView.tsx # Bezier curve configuration & dead-zone controls
│   │   └── ProfileView.tsx     # App profile JSON import/export & database syncer
│   ├── db/
│   │   └── schema.ts           # Storage and schema definitions
│   └── utils/
│       └── audio.ts            # Sound feedback synthesizer utilizing Web Audio API
```

---

## 3. Module Responsibilities

### 3.1 Frontend Modules
* **App Shell (`App.tsx`):** Coordinates application tab states, maintains the active profile configuration, handles diagnostic log aggregation, and executes the central telemetry loops.
* **Sandbox View (`SandboxView.tsx`):** Implements an algorithmic vector stroke gesture recognizer on a standard HTML5 Canvas using relative direction deltas. It also overlays a real-time canvas preview of simulated skeletal hand wireframes.
* **Calibration View (`CalibrationView.tsx`):** Houses the interactive Cubic Bezier Easing curve editor, enabling the customization of non-linear hand acceleration ratios.
* **Profile View (`ProfileView.tsx`):** Coordinates local storage synchronization, validates profile JSON schemas, and facilitates full settings backup/restore.

### 3.2 Backend & Native Modules
* **Skeletal Tracking Pipe:** Wraps MediaPipe Hands. It queries DirectShow webcam devices, runs tracking inference at 60 FPS, extracts 21 standard skeletal landmarks, and computes coordinates relative to user configurations.
* **System Action Injector:** Converts gesture events into host system actions:
  * *Keystrokes:* Uses the Windows `SendInput` API for virtual keypresses (e.g. `Ctrl+Z`).
  * *Volume/Media:* Calls standard audio endpoint interface wrappers (`IAudioEndpointVolume`).
  * *App Launcher:* Emulates process spawning using Node's `child_process.exec`.

---

## 4. Data Flow

```
[Webcam Hardware Frame]
          |
          v (DirectShow / MediaPipe capture pipeline)
[Skeletal Landmark Coordinates Extraction (X, Y, Z)]
          |
          v (Calibration Filter: Dead Zone -> Smoothing)
[Normalized Coordinate Vector]
          |
          v (Acceleration Curve Engine: Cubic Bezier applied)
[Motion Vector Delta]
          |
          v (Gesture Processor: Pattern Matching & Trigger Validation)
[Gesture Recognized Event]
          |
          +------------------------+------------------------+
          | (IPC Trigger)                                   | (IPC Diagnostic Signal)
          v                                                 v
[Host System Injection]                             [Diagnostic Pipeline Console]
- SendInput Keystroke                                - Append Trace Stream
- Vol/Media Adjustment                               - UI Dashboard Telemetry Updates
- Process App Spawning                               - Audio Synthesizer Beeps Fired
```

---

## 5. Calibration & Acceleration Pipeline

Calibration ensures high precision tracking irrespective of the webcam frame rates or hand distances.

### 5.1 Dead Zone Filter
Calculates position changes compared to the preceding stable coordinate frame.
$$\Delta = \sqrt{(X_{new} - X_{old})^2 + (Y_{new} - Y_{old})^2}$$
If $\Delta < \text{DeadZoneThreshold}$, the coordinates are flagged as stable, preventing cursor micro-jittering and muscular tremors.

### 5.2 Coordinate Smoothing (Savitzky-Golay / Moving Average)
Performs moving average filtering to attenuate high-frequency tracking noise:
$$X_{smoothed} = \frac{1}{N} \sum_{i=0}^{N-1} X_{new-i}$$
Adjusting the smoothing factor slider scales the window $N$ from 1 (low latency, raw telemetry) to 10 (high latency, ultra-smooth movement).

### 5.3 Motion Acceleration (Cubic Bezier Easing)
Maps input velocity to output cursor translation ratios using a customizable 1D cubic Bezier curve defined by control coordinates $[(x_1, y_1), (x_2, y_2)]$:

$$P(t) = (1-t)^3 P_0 + 3(1-t)^2 t P_1 + 3(1-t) t^2 P_2 + t^3 P_3$$

This yields non-linear tracking: slow hand motion allows fine control (sub-pixel selection), while quick movements accelerate system-wide desktop navigation.

---

## 6. Profiles & Data Storage

GCCC_V2 employs structured client-side persistence with robust error guarding.

### 6.1 Schema (TypeScript Reference)
```typescript
interface GestureMapping {
  id: string;
  name: string;
  trigger: string;
  actionType: 'keystroke' | 'launch-app' | 'volume-control' | 'media-control' | 'system';
  targetAction: string;
  isActive: boolean;
  confidenceThreshold: number;
  isSystemDefault?: boolean;
}

interface CalibrationSettings {
  deadZone: number;
  smoothing: number;
  minConfidence: number;
  accelerationCurve: [number, number, number, number];
  webcamResolution: '640x480' | '1280x720' | '1920x1080';
  trackingFPS: number;
}

interface AppProfile {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  gestures: GestureMapping[];
  calibration: CalibrationSettings;
}
```

### 6.2 Schema Validation Guard
When importing configurations, GCCC_V2 acts as an active firewall, validating files against strict criteria:
* Contains a root `name` string.
* Includes a valid `gestures` array.
* Verifies `trigger` coordinates belong to supported identifiers (`swipe-left`, `swipe-right`, etc.).
* Invalid configurations are instantly quarantined, triggering warning dialogues and keeping active operations safe.

---

## 7. Performance Targets & Resource Allocation

| Metric | Target | Peak Allowance | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Skeletal Processing Latency** | $\le 4.5\text{ ms}$ | $10\text{ ms}$ | DirectCompute shader execution & MediaPipe thread scheduling. |
| **CPU Overhead** | $\le 2.0\%$ | $5.0\%$ | Lazy rendering frame pools & frame rate clipping bounds. |
| **Memory Footprint** | $\le 120\text{ MB}$ | $180\text{ MB}$ | Active garbage collection & image capture frame buffer limits. |
| **Keystroke Delay** | $\le 1.0\text{ ms}$ | $3.0\text{ ms}$ | Event-driven kernel callback hooks bypassing UI main-loops. |

---

## 8. Error Handling & Fail-Safe Mechanics

### 8.1 Tracking Pipeline Fail-Safe
If the hardware tracking engine suffers precision loss (e.g. low ambient illumination), the application triggers:
1. An elegant status light change on the Sidebar (telemetry degradation warning).
2. Diagnostic console trace injection with timestamped warnings.
3. Gradual calibration threshold adjustments to compensate for signal-to-noise ratios.

### 8.2 UI Isolation (React Error Boundary)
All primary tabs are isolated via declarative error bounds. If a custom draw action crashes the sandbox, the error is isolated to the Sandbox View. The user can recover instantly without dropping active background keyboard shortcut processes or restarting the main desktop tray daemon.

---

## 9. Testing & Quality Assurance

1. **Unit Testing:** Validates math libraries (Cubic Bezier curve generators) and profile import validation algorithms.
2. **Integration Testing:** Direct evaluation of mock IPC pipeline commands, state transitions, and configuration switching.
3. **Hardware Simulation Testing:** Simulates high-latency hardware cameras, degraded FPS conditions, and raw mock mouse inputs to ensure consistent system behaviour under constrained conditions.
