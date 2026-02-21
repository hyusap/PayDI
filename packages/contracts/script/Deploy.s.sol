// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/PaymentProcessor.sol";

contract DeployPaymentProcessor is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying PaymentProcessor...");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        PaymentProcessor processor = new PaymentProcessor();

        vm.stopBroadcast();

        console.log("PaymentProcessor deployed at:", address(processor));
        console.log("Owner:", processor.owner());
        console.log("SESSION_TTL:", processor.SESSION_TTL());

        // Write deployment address to file for other packages to consume
        string memory chainId = vm.toString(block.chainid);
        string memory deploymentJson = string.concat(
            '{"chainId":',
            chainId,
            ',"address":"',
            vm.toString(address(processor)),
            '","deployer":"',
            vm.toString(deployer),
            '","blockNumber":',
            vm.toString(block.number),
            "}"
        );
        vm.writeFile(
            string.concat("deployments/", chainId, ".json"),
            deploymentJson
        );
        console.log("Deployment saved to deployments/", chainId, ".json");
    }
}
