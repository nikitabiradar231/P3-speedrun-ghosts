// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ISpeedrunGhosts.sol";
import "./LevelConstants.sol";

/**
 * @title SpeedrunGhosts
 * @notice Onchain deterministic physics simulation and leaderboard for Speedrun platformer.
 * @dev Replays submitted inputs onchain with integer fixed-point physics.
 */
contract SpeedrunGhosts is ISpeedrunGhosts {
    struct PlayerState {
        int32 x;
        int32 y;
        int32 vx;
        int32 vy;
        bool onGround;
    }

    bytes32 public immutable levelHash;
    uint16 public immutable levelVersion;

    RunRecord[] private _runs;
    mapping(address => uint16) private _personalBestTicks;
    mapping(address => uint256) private _playerBestRunId;

    constructor() {
        levelHash = LevelConstants.LEVEL_HASH;
        levelVersion = LevelConstants.LEVEL_VERSION;
    }

    /**
     * @notice Submits player input log, executes onchain verification, and updates leaderboard.
     * @param inputs Raw input byte stream (1 byte per tick, bitmask).
     * @return finishTick Authoritative finish tick.
     * @return runId Unique index of the verified run.
     */
    function submitRun(bytes calldata inputs) external override returns (uint16 finishTick, uint256 runId) {
        if (inputs.length == 0) {
            revert EmptyInputLog();
        }
        if (inputs.length > LevelConstants.MAX_TICKS) {
            revert InputExceedsMaxTicks(inputs.length, LevelConstants.MAX_TICKS);
        }

        // Run full authoritative simulation
        finishTick = _executeVerification(inputs);

        runId = _runs.length;
        uint32 currentTimestamp = uint32(block.timestamp);

        _runs.push(RunRecord({
            player: msg.sender,
            finishTick: finishTick,
            timestamp: currentTimestamp,
            inputs: inputs
        }));

        emit RunVerified(msg.sender, runId, finishTick, currentTimestamp, inputs);

        // Update Personal Best if strictly faster (or first valid run)
        uint16 oldBest = _personalBestTicks[msg.sender];
        if (oldBest == 0 || finishTick < oldBest) {
            _personalBestTicks[msg.sender] = finishTick;
            _playerBestRunId[msg.sender] = runId;
            emit PersonalBestUpdated(msg.sender, oldBest, finishTick, runId);
        }

        return (finishTick, runId);
    }

    /**
     * @notice Pure simulation function for offchain pre-checks or read-only testing.
     */
    function simulate(bytes calldata inputs)
        external
        pure
        override
        returns (
            uint16 finishTick,
            bool completed,
            bool died,
            uint16 deathTick,
            int32 finalX,
            int32 finalY
        )
    {
        if (inputs.length == 0 || inputs.length > LevelConstants.MAX_TICKS) {
            return (0, false, false, 0, LevelConstants.SPAWN_X, LevelConstants.SPAWN_Y);
        }

        PlayerState memory p = PlayerState({
            x: LevelConstants.SPAWN_X,
            y: LevelConstants.SPAWN_Y,
            vx: 0,
            vy: 0,
            onGround: true
        });

        Rect[SOLIDS_COUNT] memory solids = LevelConstants.getSolids();
        Rect[HAZARDS_COUNT] memory hazards = LevelConstants.getHazards();

        for (uint256 t = 0; t < inputs.length; t++) {
            uint8 inp = uint8(inputs[t]);
            if ((inp & 0xF8) != 0) {
                return (0, false, true, uint16(t), p.x, p.y);
            }

            _applyTickPhysics(p, inp, solids);

            // Hazard check
            if (_checkHazards(p.x, p.y, hazards)) {
                return (0, false, true, uint16(t), p.x, p.y);
            }

            // Goal check
            if (_intersects(p.x, p.y, LevelConstants.PLAYER_WIDTH, LevelConstants.PLAYER_HEIGHT, LevelConstants.GOAL_X, LevelConstants.GOAL_Y, LevelConstants.GOAL_W, LevelConstants.GOAL_H)) {
                return (uint16(t + 1), true, false, 0, p.x, p.y);
            }
        }

        return (0, false, false, 0, p.x, p.y);
    }

    /**
     * @dev Authoritative simulation that reverts if run is invalid or incomplete.
     */
    function _executeVerification(bytes calldata inputs) internal pure returns (uint16) {
        PlayerState memory p = PlayerState({
            x: LevelConstants.SPAWN_X,
            y: LevelConstants.SPAWN_Y,
            vx: 0,
            vy: 0,
            onGround: true
        });

        Rect[SOLIDS_COUNT] memory solids = LevelConstants.getSolids();
        Rect[HAZARDS_COUNT] memory hazards = LevelConstants.getHazards();

        for (uint256 t = 0; t < inputs.length; t++) {
            uint8 inp = uint8(inputs[t]);
            if ((inp & 0xF8) != 0) {
                revert InvalidInputByte(t, inp);
            }

            _applyTickPhysics(p, inp, solids);

            if (_checkHazards(p.x, p.y, hazards)) {
                revert PlayerDied(t, p.x, p.y);
            }

            if (_intersects(p.x, p.y, LevelConstants.PLAYER_WIDTH, LevelConstants.PLAYER_HEIGHT, LevelConstants.GOAL_X, LevelConstants.GOAL_Y, LevelConstants.GOAL_W, LevelConstants.GOAL_H)) {
                return uint16(t + 1);
            }
        }

        revert RunDidNotFinish(inputs.length, p.x, p.y);
    }

    function _applyTickPhysics(
        PlayerState memory p,
        uint8 inp,
        Rect[SOLIDS_COUNT] memory solids
    ) internal pure {
        bool left = (inp & 0x01) != 0;
        bool right = (inp & 0x02) != 0;
        bool jump = (inp & 0x04) != 0;

        if (left && right) {
            p.vx = 0;
        } else if (left) {
            p.vx = -LevelConstants.MOVE_SPEED;
        } else if (right) {
            p.vx = LevelConstants.MOVE_SPEED;
        } else {
            p.vx = 0;
        }

        if (jump && p.onGround) {
            p.vy = LevelConstants.JUMP_VELOCITY;
            p.onGround = false;
        }

        p.vy += LevelConstants.GRAVITY;
        if (p.vy > LevelConstants.MAX_FALL_SPEED) {
            p.vy = LevelConstants.MAX_FALL_SPEED;
        }

        // Horizontal step & collision
        int32 xNext = p.x + p.vx;
        if (xNext < 0) xNext = 0;
        if (xNext > LevelConstants.WORLD_WIDTH - LevelConstants.PLAYER_WIDTH) {
            xNext = LevelConstants.WORLD_WIDTH - LevelConstants.PLAYER_WIDTH;
        }

        for (uint256 i = 0; i < SOLIDS_COUNT; i++) {
            if (_intersects(xNext, p.y, LevelConstants.PLAYER_WIDTH, LevelConstants.PLAYER_HEIGHT, solids[i].x, solids[i].y, solids[i].w, solids[i].h)) {
                if (p.vx > 0) {
                    xNext = solids[i].x - LevelConstants.PLAYER_WIDTH;
                } else if (p.vx < 0) {
                    xNext = solids[i].x + solids[i].w;
                }
            }
        }
        p.x = xNext;

        // Vertical step & collision
        int32 yNext = p.y + p.vy;
        bool landed = false;

        for (uint256 i = 0; i < SOLIDS_COUNT; i++) {
            if (_intersects(p.x, yNext, LevelConstants.PLAYER_WIDTH, LevelConstants.PLAYER_HEIGHT, solids[i].x, solids[i].y, solids[i].w, solids[i].h)) {
                if (p.vy > 0) {
                    if (p.y + LevelConstants.PLAYER_HEIGHT <= solids[i].y) {
                        yNext = solids[i].y - LevelConstants.PLAYER_HEIGHT;
                        p.vy = 0;
                        landed = true;
                    }
                } else if (p.vy < 0) {
                    if (p.y >= solids[i].y + solids[i].h) {
                        yNext = solids[i].y + solids[i].h;
                        p.vy = 0;
                    }
                }
            }
        }
        p.y = yNext;
        p.onGround = landed;
    }

    function _checkHazards(
        int32 px,
        int32 py,
        Rect[HAZARDS_COUNT] memory hazards
    ) internal pure returns (bool) {
        for (uint256 i = 0; i < HAZARDS_COUNT; i++) {
            if (_intersects(px, py, LevelConstants.PLAYER_WIDTH, LevelConstants.PLAYER_HEIGHT, hazards[i].x, hazards[i].y, hazards[i].w, hazards[i].h)) {
                return true;
            }
        }
        if (py + LevelConstants.PLAYER_HEIGHT >= LevelConstants.DEATH_Y) {
            return true;
        }
        return false;
    }

    function _intersects(
        int32 ax,
        int32 ay,
        int32 aw,
        int32 ah,
        int32 bx,
        int32 by,
        int32 bw,
        int32 bh
    ) internal pure returns (bool) {
        return (ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by);
    }

    // --- Read Methods ---

    function getRun(uint256 runId) external view override returns (RunRecord memory) {
        if (runId >= _runs.length) revert RunNotFound(runId);
        return _runs[runId];
    }

    function getRunInputs(uint256 runId) external view override returns (bytes memory) {
        if (runId >= _runs.length) revert RunNotFound(runId);
        return _runs[runId].inputs;
    }

    function getRunCount() external view override returns (uint256) {
        return _runs.length;
    }

    function getPersonalBest(address player) external view override returns (uint16 bestTick, uint256 runId) {
        return (_personalBestTicks[player], _playerBestRunId[player]);
    }

    function getLeaderboard(uint256 offset, uint256 limit) external view returns (RunRecord[] memory records) {
        uint256 total = _runs.length;
        if (offset >= total) {
            return new RunRecord[](0);
        }
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        uint256 count = end - offset;
        records = new RunRecord[](count);
        for (uint256 i = 0; i < count; i++) {
            records[i] = _runs[offset + i];
        }
        return records;
    }
}
