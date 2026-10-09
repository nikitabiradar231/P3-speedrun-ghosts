// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISpeedrunGhosts {
    struct RunRecord {
        address player;
        uint16 finishTick;
        uint32 timestamp;
        bytes inputs;
    }

    event RunVerified(
        address indexed player,
        uint256 indexed runId,
        uint16 finishTick,
        uint32 timestamp,
        bytes inputs
    );

    event PersonalBestUpdated(
        address indexed player,
        uint16 oldBestTick,
        uint16 newBestTick,
        uint256 indexed runId
    );

    error InputExceedsMaxTicks(uint256 length, uint256 maxAllowed);
    error EmptyInputLog();
    error InvalidInputByte(uint256 tickIndex, uint8 inputByte);
    error PlayerDied(uint256 tickIndex, int32 x, int32 y);
    error RunDidNotFinish(uint256 ticksSimulated, int32 finalX, int32 finalY);
    error RunNotFound(uint256 runId);

    function submitRun(bytes calldata inputs) external returns (uint16 finishTick, uint256 runId);

    function simulate(bytes calldata inputs)
        external
        pure
        returns (
            uint16 finishTick,
            bool completed,
            bool died,
            uint16 deathTick,
            int32 finalX,
            int32 finalY
        );

    function getRun(uint256 runId) external view returns (RunRecord memory);
    function getRunInputs(uint256 runId) external view returns (bytes memory);
    function getRunCount() external view returns (uint256);
    function getPersonalBest(address player) external view returns (uint16 bestTick, uint256 runId);
}
