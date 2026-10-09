// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/SpeedrunGhosts.sol";
import "../contracts/ISpeedrunGhosts.sol";
import "../contracts/LevelConstants.sol";

contract SpeedrunGhostsTest is Test {
    SpeedrunGhosts public game;

    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);

    // Fast winning input sequence (174 ticks) computed by deterministic engine
    bytes public fastWinningInputs = hex"060202020202020202020202020202020202020202020202020202020202050602020202020202020202020202020202020202020202020202020602020202020202020202020202020202020202020202020202020202020202020602020202020202020202020202020202020202020202020202020602020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202";

    // Slower winning inputs (starts with 30 ticks of idle at spawn)
    bytes public slowWinningInputs;

    function setUp() public {
        game = new SpeedrunGhosts();

        // Construct slower run: 30 idle ticks followed by winning inputs
        bytes memory idlePrefix = new bytes(30);
        for (uint256 i = 0; i < 30; i++) {
            idlePrefix[i] = bytes1(0x00);
        }
        slowWinningInputs = bytes.concat(idlePrefix, fastWinningInputs);
    }

    /// @notice Test 1: Level hash and constants parity
    function test_LevelHashAndVersion() public view {
        assertEq(game.levelHash(), LevelConstants.LEVEL_HASH, "Level hash mismatch");
        assertEq(game.levelVersion(), LevelConstants.LEVEL_VERSION, "Level version mismatch");
        assertEq(LevelConstants.TICKS_PER_SECOND, 30, "Ticks per second must be 30");
        assertEq(LevelConstants.MAX_TICKS, 600, "Max ticks must be 600");
    }

    /// @notice Test 3: Contract computes the leaderboard time independently
    function test_ContractComputesLeaderboardTime() public {
        vm.prank(alice);
        (uint16 finishTick, uint256 runId) = game.submitRun(fastWinningInputs);

        assertEq(finishTick, 174, "Contract must calculate finish tick as 174");
        assertEq(runId, 0, "First runId must be 0");

        (uint16 pbTick, uint256 pbRunId) = game.getPersonalBest(alice);
        assertEq(pbTick, 174, "Personal best must equal computed finish tick");
        assertEq(pbRunId, 0, "Personal best run ID must be 0");
    }

    /// @notice Test 4: Maximum input length enforcement
    function test_RevertIfExceedsMaxTicks() public {
        bytes memory oversized = new bytes(601);
        for (uint256 i = 0; i < 601; i++) {
            oversized[i] = bytes1(0x02);
        }

        vm.expectRevert(
            abi.encodeWithSelector(
                ISpeedrunGhosts.InputExceedsMaxTicks.selector,
                601,
                LevelConstants.MAX_TICKS
            )
        );
        vm.prank(alice);
        game.submitRun(oversized);
    }

    /// @notice Edge case: Empty input log reverts
    function test_RevertIfEmptyInputLog() public {
        bytes memory empty = new bytes(0);
        vm.expectRevert(ISpeedrunGhosts.EmptyInputLog.selector);
        vm.prank(alice);
        game.submitRun(empty);
    }

    /// @notice Edge case: Invalid input bitmask reverts
    function test_RevertIfInvalidInputByte() public {
        bytes memory badInputs = hex"02020802"; // 0x08 has invalid bit 3 set
        vm.expectRevert(
            abi.encodeWithSelector(
                ISpeedrunGhosts.InvalidInputByte.selector,
                2,
                0x08
            )
        );
        vm.prank(alice);
        game.submitRun(badInputs);
    }

    /// @notice Test 5 & 6: Simulation rejects runs that hit hazards or die in pits
    function test_RevertIfPlayerDiesInHazard() public {
        // Walk right directly off starting platform into spike pit without jumping
        bytes memory walkIntoPit = new bytes(60);
        for (uint256 i = 0; i < 60; i++) {
            walkIntoPit[i] = bytes1(0x02); // RIGHT only
        }

        vm.expectRevert();
        vm.prank(alice);
        game.submitRun(walkIntoPit);

        // Verify no runs stored
        assertEq(game.getRunCount(), 0, "Dead run must not create records");
    }

    /// @notice Test 6: Simulation rejects incomplete runs that never reach the goal
    function test_RevertIfRunDidNotFinish() public {
        // Stand still for 50 ticks
        bytes memory idleRun = new bytes(50);

        vm.expectRevert();
        vm.prank(alice);
        game.submitRun(idleRun);

        assertEq(game.getRunCount(), 0, "Incomplete run must not create records");
    }

    /// @notice Test 9: Verified inputs are retrievable from storage and replayable
    function test_VerifiedInputsRetrievableAndDeterministic() public {
        vm.prank(alice);
        (, uint256 runId) = game.submitRun(fastWinningInputs);

        ISpeedrunGhosts.RunRecord memory record = game.getRun(runId);
        assertEq(record.player, alice, "Record player mismatch");
        assertEq(record.finishTick, 174, "Record finish tick mismatch");
        assertEq(record.inputs, fastWinningInputs, "Stored inputs must match submission exactly");

        bytes memory retrievedInputs = game.getRunInputs(runId);
        assertEq(retrievedInputs, fastWinningInputs, "getRunInputs must match submission exactly");

        // Re-simulate retrieved inputs via pure function
        (uint16 simFinishTick, bool simCompleted, bool simDied,,,) = game.simulate(retrievedInputs);
        assertTrue(simCompleted, "Re-simulated run must complete");
        assertFalse(simDied, "Re-simulated run must not die");
        assertEq(simFinishTick, record.finishTick, "Replay simulation must yield identical finish tick");
    }

    /// @notice Test 10: Personal best only updates when strictly faster
    function test_PersonalBestOnlyImproves() public {
        // Step 1: Alice submits slow run (204 ticks)
        vm.prank(alice);
        (uint16 slowFinish, uint256 slowRunId) = game.submitRun(slowWinningInputs);
        assertEq(slowFinish, 204, "Slow run finish tick mismatch");
        assertEq(slowRunId, 0);

        (uint16 pbAfterSlow, uint256 pbIdAfterSlow) = game.getPersonalBest(alice);
        assertEq(pbAfterSlow, 204, "PB should be 204 after first run");
        assertEq(pbIdAfterSlow, 0);

        // Step 2: Alice submits fast run (174 ticks) -> PB should update
        vm.prank(alice);
        (uint16 fastFinish, uint256 fastRunId) = game.submitRun(fastWinningInputs);
        assertEq(fastFinish, 174, "Fast run finish tick mismatch");
        assertEq(fastRunId, 1);

        (uint16 pbAfterFast, uint256 pbIdAfterFast) = game.getPersonalBest(alice);
        assertEq(pbAfterFast, 174, "PB must update to 174 for strictly faster run");
        assertEq(pbIdAfterFast, 1);

        // Step 3: Alice submits slow run again (204 ticks) -> PB must NOT change
        vm.prank(alice);
        (uint16 slowFinish2, uint256 slowRunId2) = game.submitRun(slowWinningInputs);
        assertEq(slowFinish2, 204);
        assertEq(slowRunId2, 2);

        (uint16 pbAfterRepeatSlow, uint256 pbIdAfterRepeatSlow) = game.getPersonalBest(alice);
        assertEq(pbAfterRepeatSlow, 174, "PB must remain 174 when submitting slower run");
        assertEq(pbIdAfterRepeatSlow, 1);
    }

    /// @notice Test: Multiple players track personal bests independently
    function test_MultiplePlayersIndependentPB() public {
        vm.prank(alice);
        game.submitRun(slowWinningInputs); // Alice PB = 204

        vm.prank(bob);
        game.submitRun(fastWinningInputs); // Bob PB = 174

        (uint16 alicePB,) = game.getPersonalBest(alice);
        (uint16 bobPB,) = game.getPersonalBest(bob);

        assertEq(alicePB, 204, "Alice PB mismatch");
        assertEq(bobPB, 174, "Bob PB mismatch");
        assertEq(game.getRunCount(), 2, "Total runs count must be 2");
    }

    /// @notice Test: Leaderboard pagination
    function test_LeaderboardPagination() public {
        vm.prank(alice);
        game.submitRun(slowWinningInputs);
        vm.prank(bob);
        game.submitRun(fastWinningInputs);

        ISpeedrunGhosts.RunRecord[] memory page = game.getLeaderboard(0, 10);
        assertEq(page.length, 2, "Page length mismatch");
        assertEq(page[0].player, alice);
        assertEq(page[1].player, bob);

        ISpeedrunGhosts.RunRecord[] memory singleItem = game.getLeaderboard(1, 1);
        assertEq(singleItem.length, 1);
        assertEq(singleItem[0].player, bob);
    }
}
