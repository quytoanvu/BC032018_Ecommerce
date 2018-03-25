var Store = artifacts.require("Store");
var EscrowEngine = artifacts.require("EscrowEngine");

module.exports = function(deployer) {
  deployer.deploy([Store, EscrowEngine]);
};