# TypeArcade - Responsive Dual-Mode Typing Challenge Game

A modern, responsive typing challenge game built with **HTML5, CSS3, JavaScript (ES6+)**, and **Tailwind CSS**. Built following Clean Architecture principles with complete separation of concerns between game engines, user interface, audio synthesis, and persistent storage.

---

## 🎮 Game Modes

### Mode A: Bubbles (Letter Recognition)
- **Mechanics**: Five or more floating bubbles continuously ascend from the arena. Each contains a target letter.
- **Rules**:
  - Strike the matching key on your keyboard (or tap the bubble / virtual key) to pop it before it reaches the upper danger ceiling.
  - Correct strikes award points scaled by your active combo streak multiplier.
  - Incorrect strikes incur a score penalty and reset your streak.
  - If a bubble escapes past the top border, a **Miss** is recorded with visual/audio warnings.
  - **No Early Game Over on Misses**: Misses are tracked in your stats, but will **not** stop the session.
- **Time Limits**:
  - Selectable session length: **1 Minute, 3 Minutes, 5 Minutes, or 10 Minutes**.
- **Difficulty Scaling**:
  - Bubble float speed increases dynamically as your score rises.
  - Number of simultaneous bubbles scales up.
  - **Easy**: uppercase letters, base speed 70 px/s.
  - **Medium**: all alphabet letters, base speed 105 px/s.
  - **Hard**: alphanumeric characters (letters + numbers `0-9`), base speed 150 px/s.
- **Session End Condition**: The game concludes when the session timer reaches `00:00`, displaying your full diagnostic breakdown.

---

### Mode B: KeyMagnet (Keyboard Precision)
- **Mechanics**: A central magnetic focal pod targets keys sequentially with a precision countdown timer. An interactive virtual keyboard mirrors and highlights targets in real-time.
- **Practice Sets**:
  - **Home Row Practice**: `A, S, D, F, J, K, L, ;` (standard touch-typing anchor set).
  - **Top Row**: `Q, W, E, R, T, Y, U, I, O, P`.
  - **Bottom Row**: `Z, X, C, V, B, N, M`.
  - **Full Alphabet**: Complete `A-Z`.
  - **Numbers & Symbols**: `0-9` with punctuation.
- **Performance Diagnostics**:
  - Real-time millisecond reaction timer tracking your exact latency for each keypress.
  - Speed bonus awarded for sub-second reaction times.
  - Tracks correct strikes, incorrect strikes, timeout misses, and average response time.
- **Difficulty Settings**:
  - **Easy**: 4.0s countdown window, 25-key sprint sequence.
  - **Medium**: 2.4s countdown window, 35-key sprint sequence.
  - **Hard**: 1.4s rapid-fire countdown window, 45-key sprint sequence.
- **Completion Condition**: Successfully typing the full target sequence completes the challenge and generates a performance grade badge (`S`, `A`, `B`, `C`, `D`).

---

## 🏗️ Clean Architecture Overview

```
c:\Users\shahzadgull054\Desktop\Game\
├── index.html              # Semantic HTML5 layout, HUD, Modals & Arena containers
├── css/
│   └── style.css           # Glassmorphism, animations, keycap tactile states & particle glows
├── js/
│   ├── audio.js            # Native Web Audio API sound synthesizer (zero external audio files)
│   ├── storage.js          # LocalStorage manager for high scores & lifetime session stats
│   ├── particles.js        # Canvas-based 60fps particle physics engine for hit bursts & shocks
│   ├── keyboard.js         # Interactive Virtual Keyboard component with active target highlights
│   ├── modes/
│   │   ├── bubbles.js      # Mode A Engine (Bubble lifecycle, RAF loop, boundary collision, scoring)
│   │   ├── keymagnet.js    # Mode B Engine (Precision timing, sequence arrays, reaction tracking)
│   │   └── ...
│   └── app.js              # Application Orchestrator, view router, global keyboard dispatcher
└── README.md
```

### Architectural Highlights:
1. **Single Animation Loop Safety**: Both game modes strictly manage `requestAnimationFrame` and cancellation handles (`cancelAnimationFrame`), preventing memory leaks and overlapping timers.
2. **Web Audio API Synth**: Sound effects (bubble pops, combo streaks, error buzzes, victory fanfares) are synthesized programmatically at runtime using oscillators, eliminating external `.mp3` loading failures or network dependencies.
3. **Dual Input Support**: Fully responsive across mobile, tablet, and desktop screens with seamless dual support for physical hardware keyboards and on-screen touch typing.
4. **No-Reload State Management**: Start, Pause, Resume, Restart, and Reset operations function entirely within client-side memory without refreshing the page.

---

## 🕹️ Controls & Hotkeys

| Action | Control |
| :--- | :--- |
| **Type Characters** | Physical Keyboard keys or Click Virtual Keyboard keys |
| **Pop Bubbles Directly** | Touch / Click on floating bubble |
| **Pause / Resume** | `Spacebar` or in-game **PAUSE** button |
| **Toggle Audio** | `M` key or **SOUND: ON/OFF** button in navbar |
| **Dismiss Modals / Quit**| `Esc` key |
| **Restart Session** | In-game **RESTART** button or **PLAY AGAIN** in results modal |

---

## 🚀 How to Run

1. Open `index.html` directly in any modern web browser (Google Chrome, Microsoft Edge, Firefox, Safari).
2. No Node.js build step or web server configuration is required.
