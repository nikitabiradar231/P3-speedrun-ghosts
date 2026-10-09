# Speedrun Ghosts: A Leaderboard That Checks Your Run

> **Road to Devcon VIII — Problem 3 Submission**  
> **Target Network:** Base Sepolia Testnet (Chain ID `84532`)  
> **Repository:** `speedrun-ghosts`

---

## 1. Project Overview

**Speedrun Ghosts** is a playable, deterministic 2D browser platformer where **the smart contract independently simulates submitted raw button presses onchain, verifies level completion, computes the official finish time, and maintains the leaderboard**.

There is **zero client trust**:
- Players submit an encoded byte log of their per-tick inputs (`LEFT`, `RIGHT`, `JUMP`).
- The EVM smart contract (`SpeedrunGhosts.sol`) replays the input log step-by-step using pure integer fixed-point physics against the level geometry.
- If the player dies on a hazard, falls into a pit, or fails to reach the goal, the transaction reverts.
- Upon completion, the contract records the official finish tick and stores the raw inputs onchain.
- Players can select any verified run on the leaderboard to **race against its ghost**, which is reconstructed and animated using the exact same deterministic physics engine.

---

## 2. Repository Architecture

```
speedrun-ghosts/
├── contracts/
│   ├── ISpeedrunGhosts.sol     # Interface defining types, events, errors & views
│   ├── LevelConstants.sol      # AUTO-GENERATED level geometry & physics constants
│   └── SpeedrunGhosts.sol      # Authoritative onchain verification & leaderboard
├── script/
│   └── Deploy.s.sol            # Foundry deployment script with chain ID validation
├── test/
│   └── SpeedrunGhosts.t.sol    # 11 comprehensive Foundry tests covering verification
├── src/
│   ├── game/
│   │   ├── audio.ts            # Web Audio procedural retro sound synthesizer
│   │   ├── engine.ts           # Fixed-step game loop (30 ticks/sec)
│   │   ├── ghost.ts            # Ghost replay trajectory player
│   │   ├── input.ts            # Input sampler & bitmask encoder
│   │   ├── physics.ts          # Deterministic integer physics engine (TS)
│   │   └── renderer.ts         # High-DPI Canvas renderer with neon cyberpunk FX
│   ├── level/
│   │   ├── canonical_level.json # Canonical single source of truth for level geometry
│   │   └── generated_level.ts   # AUTO-GENERATED TypeScript level constants
│   ├── wallet/
│   │   ├── account.ts          # Viem wallet client & onchain submission helper
│   │   └── config.ts           # Base Sepolia Viem chain definition (84532)
│   ├── contracts/
│   │   ├── SpeedrunGhostsABI.ts # TypeScript contract ABI
│   │   └── addresses.ts        # Contract deployment address resolver
│   ├── styles/
│   │   └── index.css           # Modern cyberpunk glassmorphic design system
│   ├── ui/
│   │   └── App.ts              # Interactive UI controller & Leaderboard view
│   └── main.ts                 # App entry point
├── scripts/
│   ├── check-level-sync.ts     # CI check verifying generated artifacts match canonical JSON
│   ├── check-no-secrets.ts     # Security scan ensuring zero tracked keys/credentials
│   ├── generate-level.ts       # Generator script creating LevelConstants.sol & TS data
│   └── solve-run.ts            # Deterministic A* solver finding winning input runs
├── tests/
│   ├── config.test.ts          # Base Sepolia config and security acceptance tests
│   ├── level-sync.test.ts      # Canonical level sync acceptance tests
│   ├── physics.test.ts         # Integer-only arithmetic & physics tests
│   └── simulation.test.ts      # Goal verification, death tests & ghost replay tests
├── foundry.toml                # Foundry configuration (solc 0.8.24, via_ir, optimizer)
├── vitest.config.ts            # Vitest unit & integration test runner config
├── vite.config.ts              # Vite frontend bundler config
└── .env.example                # Environment template with placeholders only
```

---

## 3. Game Rules & Deterministic Physics

Authoritative game simulation runs at **30 ticks per second** (dt = 33.33ms per tick).

### Physics Constants (in milliunits: 1,000 subunits = 1 pixel)
- **World Dimensions:** `800,000 x 500,000` (800 x 500 px).
- **Player Hitbox:** `20,000 x 28,000` (20 x 28 px).
- **Spawn Coordinates:** `(40,000, 372,000)` (Floor top at Y=400,000).
- **Move Speed:** `4,000` subunits/tick (120 px/s).
- **Jump Impulse:** `-11,000` subunits/tick (upwards velocity).
- **Gravity:** `700` subunits/tick².
- **Max Fall Speed:** `14,000` subunits/tick.
- **Max Permitted Run Duration:** `600` ticks (20.00 seconds).

### Input Bitmask Encoding (1 Byte per Tick)
| Bit | Hex | Action |
|:---|:---|:---|
| Bit 0 | `0x01` | Move Left |
| Bit 1 | `0x02` | Move Right |
| Bit 2 | `0x04` | Jump |

- If both `LEFT` and `RIGHT` are active (`0x03`), horizontal velocity is `0`.
- Jumps can only initiate when `onGround == true`.
- Solid collision adjusts player boundaries and sets `vy = 0` on landing or bonking ceilings.
- Touching any hazard AABB or exceeding `DEATH_Y` triggers instant failure (`PlayerDied`).
- Overlapping the Goal AABB triggers victory (`finishTick = currentTick`).

---

## 4. Canonical Level Data Pipeline

Neither the contract nor the frontend maintains ad-hoc copies of the level layout.

1. **Source of Truth:** [`src/level/canonical_level.json`](file:///c:/Users/nikita/OneDrive/Desktop/D3/src/level/canonical_level.json).
2. **Artifact Generator:** [`scripts/generate-level.ts`](file:///c:/Users/nikita/OneDrive/Desktop/D3/scripts/generate-level.ts) parses the JSON, calculates the SHA-256 hash, and generates:
   - `contracts/LevelConstants.sol`
   - `src/level/generated_level.ts`
3. **CI Sync Verification:** [`scripts/check-level-sync.ts`](file:///c:/Users/nikita/OneDrive/Desktop/D3/scripts/check-level-sync.ts) is executed during every test and build. If generated files are stale or modified manually, the build fails immediately.

---

## 5. Onchain Verification & Security Model

The smart contract [`SpeedrunGhosts.sol`](file:///c:/Users/nikita/OneDrive/Desktop/D3/contracts/SpeedrunGhosts.sol) operates under adversarial assumptions:

1. **No Trusted Offchain Signatures:** Time is never supplied as a parameter. The contract calculates time as the count of ticks until the player enters the goal rectangle.
2. **Strict Gas & Loop Limits:** Submissions are bounded at `600` bytes (`MAX_TICKS`). Runs exceeding 600 ticks revert with `InputExceedsMaxTicks`.
3. **Integer-Only EVM Math:** Position and velocity use standard `int32` fixed-point arithmetic, ensuring bit-for-bit parity across EVM implementations and client JavaScript.
4. **Strict PB Update:** Personal best updates if and only if `finishTick < currentPB`. Submitting a slower run leaves the existing record unchanged.
5. **Storage & Replayability:** Every verified run stores its raw inputs in contract storage and emits a `RunVerified` event, enabling instant ghost reconstruction.

---

## 6. How Verified Ghosts Work

1. The client fetches verified run records via `getLeaderboard(offset, limit)` or reads emitted `RunVerified` events.
2. The ghost's raw `inputs` byte array is fed into the local deterministic physics engine (`src/game/physics.ts`).
3. The engine simulates the ghost along the exact same level geometry from spawn.
4. During rendering, the ghost appears as a translucent neon silhouette with a name tag, racing alongside the player.

---

## 7. Installation & Development Commands

### Prerequisites
- **Node.js 22 LTS**
- **Foundry (`forge`)**

### 1. Install Dependencies
```bash
npm install
forge install foundry-rs/forge-std --no-git --no-commit
```

### 2. Check Level Artifacts & Security
```bash
npm run level:check
npm run security:check
```

### 3. Run Foundry Contract Tests (11 Tests)
```bash
forge test -vvv
```

### 4. Run Frontend & Physics Tests (15 Tests)
```bash
npm test
```

### 5. Run Full Test Suite
```bash
npm run test:all
```

### 6. Start Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 7. Build Production Bundle
```bash
npm run build
```

---

## 8. Base Sepolia Deployment

### Step 1: Configure `.env`
Copy `.env.example` to `.env` and fill in your deployer key and Base Sepolia RPC:
```bash
cp .env.example .env
```
```env
BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
PRIVATE_KEY="YOUR_BASE_SEPOLIA_PRIVATE_KEY"
BASESCAN_API_KEY="YOUR_BASESCAN_API_KEY"
```

### Step 2: Deploy Contract
```bash
forge script script/Deploy.s.sol:DeploySpeedrunGhosts \
  --rpc-url base_sepolia \
  --broadcast \
  --verify
```

### Step 3: Configure Frontend Contract Address
Set `VITE_CONTRACT_ADDRESS="<DEPLOYED_ADDRESS>"` in your `.env` or in [`src/contracts/addresses.ts`](file:///c:/Users/nikita/OneDrive/Desktop/D3/src/contracts/addresses.ts).

---

## 9. Challenge Acceptance Test Matrix

| Test Criterion | Requirement | Result | Verified By |
|:---|:---|:---:|:---|
| **Test 1** | Base Sepolia frontend configuration (Chain ID `84532`) | **PASS** | `tests/config.test.ts` |
| **Test 2** | No tracked credentials, `.env` ignored, `.env.example` placeholder | **PASS** | `scripts/check-no-secrets.ts` & `tests/config.test.ts` |
| **Test 3** | Contract independently computes official finish time | **PASS** | `test/SpeedrunGhosts.t.sol` (`test_ContractComputesLeaderboardTime`) |
| **Test 4** | Enforce maximum input length constraint (600 ticks) | **PASS** | `test/SpeedrunGhosts.t.sol` (`test_RevertIfExceedsMaxTicks`) |
| **Test 5** | Simulation reads platforms, obstacles, and hazard geometry | **PASS** | `test/SpeedrunGhosts.t.sol` & `tests/physics.test.ts` |
| **Test 6** | Incomplete and dead runs are rejected (no records created) | **PASS** | `test/SpeedrunGhosts.t.sol` (`test_RevertIfPlayerDiesInHazard`, `test_RevertIfRunDidNotFinish`) |
| **Test 7** | Authoritative integer-only physics (no floats or frame deltas) | **PASS** | `tests/physics.test.ts` |
| **Test 8** | Single canonical level data source with CI sync check | **PASS** | `scripts/check-level-sync.ts` & `tests/level-sync.test.ts` |
| **Test 9** | Verified input logs are retrievable and replayable as ghosts | **PASS** | `test/SpeedrunGhosts.t.sol` & `tests/simulation.test.ts` |
| **Test 10** | Personal best only updates when strictly faster | **PASS** | `test/SpeedrunGhosts.t.sol` (`test_PersonalBestOnlyImproves`) |

---

## 10. Honest Deployment & Limitations Notice

- **Unrestricted Local Practice:** Anyone can play without connecting a wallet or spending ETH.
- **Onchain Verification Requirement:** Submitting runs to the Base Sepolia leaderboard requires a wallet with Base Sepolia testnet ETH to pay gas for EVM simulation and storage.
- **Gas Sponsorship:** Account Abstraction / Paymaster sponsorship is supported via standard ERC-4337 bundlers if configured; when unconfigured, the application gracefully falls back to direct Base Sepolia wallet transactions.
