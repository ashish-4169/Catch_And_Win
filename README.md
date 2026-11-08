# 🎮 Gesture Catch - College Fest Edition

A fast, responsive, and beginner-friendly browser arcade game built with **React**, **Vite**, **TypeScript**, and **HTML5 Canvas**.

Designed specifically for a college fest gaming stall where participants have **60 seconds** to catch falling goodies with a bucket and score as high as possible while dodging bombs!

---

## 🌟 Game Highlights

- **🖐️ AI Hand Gesture Tracking (MediaPipe)**: Slide your hand left and right in the air in front of your webcam to steer the bucket!
- **🖱️ Instant Mouse Backup**: Full mouse and touch controls remain active at all times. If the camera is unavailable or denied, you can play seamlessly with your mouse.
- **🎨 Canvas Rendering**: High-performance 60fps game loop powered by `requestAnimationFrame`, featuring dynamic particle bursts, glowing auras, and floating score popups.
- **⏱️ 60-Second Challenge**: Real-time countdown timer with urgency alerts during the final 10 seconds.
- **🔊 Built-in Web Audio API**: Crisp retro sound effects for fruits, star chime arpeggio, bomb rumbles, and countdown ticks—no external audio files required.
- **🏆 High Score Tracker**: Saves the stall's record in browser `localStorage`.
- **📊 Performance Breakdown**: Detailed end-of-game summary showing counts of apples, bananas, stars, and bombs hit.
- **🔒 Privacy Safe**: 100% client-side gesture recognition via WebAssembly. Zero video frames or data are uploaded anywhere.

---

## 🍎 Scoring Rules

| Object | Visual | Points | Description |
| :--- | :---: | :---: | :--- |
| **Apple** | 🍎 | **+10** | Standard juicy fruit |
| **Banana** | 🍌 | **+15** | Fast falling fruit |
| **Golden Star** | ⭐ | **+30** | Rare high-value bonus reward |
| **Bomb** | 💣 | **-20** | Hazardous obstacle! Deducts points and shakes screen |

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js (version 18 or newer installed)
- npm

### 1. Open Terminal in the project directory
```bash
cd c:\Users\ashis\OneDrive\Desktop\bucket_game
```

### 2. Install dependencies (if not already done)
```bash
npm install
```

### 3. Start the Vite development server
```bash
npm run dev
```

### 4. Open the game in your browser
Open your browser and navigate to the local address displayed in the terminal:
```
http://localhost:5173
```

---

## 📷 New Game Start Flow & Testing

1. **Start Screen**:
   - When you load the game, the welcome stall screen is displayed.
   - Click the **START GAME** button.
2. **Camera Initialization Screen**:
   - The game enters the camera setup stage (timer and falling fruits do NOT start yet).
   - If requesting permission: displays `"Starting camera..."`.
   - Once connected: displays `"Camera connected! Show your hand."` and `"Show your hand in front of the camera."`.
   - Your live mirrored camera feed appears centered on screen with hand tracking indicators.
3. **Hand Detection**:
   - Raise your open hand in view of the webcam.
   - The status updates immediately to `"Hand detected! Get ready."`.
4. **3-Second Countdown**:
   - The game triggers a dramatic `3... 2... 1... GO!` countdown accompanied by audio beeps and a start chime.
   - Once countdown concludes, the 60-second timer begins and fruits start falling!
5. **Testing Camera Permission Denial**:
   - When the browser asks for camera permission, click **Block**.
   - The screen shows `"Camera unavailable. You can play using mouse controls."` with a **"Continue with Mouse Controls"** button.
   - Clicking the button allows you to play with mouse controls without getting stuck.
6. **Webcam Teardown**:
   - When the round ends or you click **"Back to Menu"**, all camera tracks stop and the webcam hardware light turns off.

---

## 🛠️ Project Structure

```
bucket_game/
├── index.html               # Entry HTML shell
├── package.json             # Scripts & dependencies (React, Vite, TS)
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite bundler settings
├── src/
│   ├── main.tsx             # React DOM root entry
│   ├── App.tsx              # Main state machine (start, playing, gameover) & timer
│   ├── types.ts             # TypeScript interfaces & types
│   ├── constants.ts         # Easy-to-edit game config (speeds, points, sizes)
│   ├── index.css            # Responsive dark arcade fest styling
│   ├── utils/
│   │   └── audio.ts         # Zero-asset Web Audio API sound synthesizer
│   └── components/
│       ├── GameCanvas.tsx   # Canvas loop, bucket physics, item fall & collision
│       ├── ScoreBoard.tsx   # Top HUD (score, 60s timer, high score, mute toggle)
│       ├── StartScreen.tsx  # Stall welcome card & point system guide
│       └── GameOverScreen.tsx # Final score, breakdown stats & "Play Again" button
```

---

## ⚙️ Easy Customization Guide

You can easily adjust game difficulty and stall rules directly in [`src/constants.ts`](file:///c:/Users/ashis/OneDrive/Desktop/bucket_game/src/constants.ts):

- **Change Round Duration**: Change `GAME_DURATION_SECONDS` (e.g., set to `45` or `90`).
- **Change Bucket Width**: Change `BUCKET_CONFIG.width` (e.g., set to `140` for easier play or `90` for harder play).
- **Change Point Values**: Modify `ITEM_CONFIGS.apple.points`, `ITEM_CONFIGS.star.points`, etc.
- **Change Fall Speed**: Tweak `BASE_FALL_SPEED` (default `210`).
- **Change Item Frequency**: Tweak `BASE_SPAWN_INTERVAL_MS` (default `750`ms).

