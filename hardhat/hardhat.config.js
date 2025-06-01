require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// console.log("SEPOLIA_RPC_URL:", process.env.SEPOLIA_RPC_URL);
// console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY);
// console.log("ETHERSCAN_API_KEY:", process.env.ETHERSCAN_API_KEY);


module.exports = {
  defaultNetwork: "sepolia",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL, 
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY, // for contract verification
  },
};
