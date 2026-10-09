// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/SpeedrunGhosts.sol";
import "../contracts/LevelConstants.sol";

contract DeploySpeedrunGhosts is Script {
    function run() external returns (address deployedAddress) {
        uint256 chainId = block.chainid;
        console.log("Current Chain ID:", chainId);

        // Enforce chain ID check: 84532 (Base Sepolia) or 31337 (Local Anvil)
        require(
            chainId == 84532 || chainId == 31337,
            "Deploy rejected: Must target Base Sepolia (84532) or Local Anvil (31337)"
        );

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        SpeedrunGhosts speedrun = new SpeedrunGhosts();
        deployedAddress = address(speedrun);

        vm.stopBroadcast();

        // Sanity verify deployed contract level hash
        require(
            speedrun.levelHash() == LevelConstants.LEVEL_HASH,
            "Deployment sanity failed: Level hash mismatch"
        );

        console.log("==========================================");
        console.log("SpeedrunGhosts successfully deployed!");
        console.log("Contract Address:", deployedAddress);
        console.log("Level Version:", speedrun.levelVersion());
        console.log("Chain ID:", chainId);
        console.log("==========================================");

        return deployedAddress;
    }
}
