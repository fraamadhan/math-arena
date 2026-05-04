# PvP Mini Game Specification (Next.js)

## Project Overview
A real-time player-vs-player (PvP) web minigame where two players compete by answering questions. Correct and faster answers trigger a spear throw animation that damages the opponent.

---

## Suggested Project Names
- Spear Clash
- Zephyr Arena
- Answer Duel
- Arcane Duel
- Clash of Answers

---

## Core Concept
- Two players compete in real-time
- Same question appears for both players
- Correct + faster answer = attack opponent
- First player to reduce opponent HP to 0 wins

---

## Core Features

### 1. PvP System
- Random matchmaking
- Invite via room code
- Real-time gameplay

---

### 2. Answer Mechanics
- Correct answer → attack
- Wrong answer → penalty (delay or self-damage)
- Faster answer → bonus damage

---

### 3. Dual Calculator UI
- Left: Player A
- Right: Player B
- Each has input/calculator interface

---

### 4. Combat System
Damage formula:
```
damage = base + speedBonus + comboBonus
```

---

### 5. Health System
- Each player has HP bar
- Game ends when HP reaches 0

---

### 6. Timer System
- Each round has countdown (e.g. 10s)
- Fastest correct answer wins round

---

### 7. Animation System
States:
- Idle
- Attack (throw spear)
- Hit
- Win / Lose

---

### 8. Combo System
- Consecutive correct answers increase damage
- Visual effects (glow, speed boost)

---

### 9. UX Feedback
- Speech bubbles:
  - "Too slow!"
  - "Nice shot!"
  - "Oops!"

---

### 10. Ranking System
- Casual & Ranked mode
- ELO rating
- Leaderboard

---

## Advanced Features

### Multiplayer Tech
- WebSocket required
- Options:
  - Socket.io
  - Supabase Realtime

---

### Game Modes
- 1v1 duel
- Best of 3
- Blitz mode
- Survival mode

---

### Customization
- Character skins
- Weapon skins
- Emotes

---

### Anti-Cheat
- Server-side validation
- Randomized questions
- Time limits

---

## Tech Architecture

### Frontend
- Next.js (App Router)
- Animation via DOM / Canvas

### Backend
- Node.js server or Supabase Realtime

---

## Game State Example
```ts
type GameState = {
  players: [Player, Player]
  question: string
  correctAnswer: number
  timer: number
  status: "waiting" | "playing" | "result"
}
```

---

## UX Flow
1. Player enters lobby
2. Matchmaking / invite
3. Countdown
4. Question appears
5. Players answer
6. Attack animation triggers
7. Repeat until HP = 0
8. Show winner

---

## Development Advice
- Start with local multiplayer or mock opponent
- Then implement real-time multiplayer
- And Create Option 1 vs 1 in one page so playing in the same laptop (is it possible?)

---

## Future Improvements
- Leaderboards
- Daily challenges
- Multiplayer tournaments
- Sound effects & animation polish
