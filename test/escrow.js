import "babel-polyfill";
var EscrowEngine = artifacts.require("EscrowEngine");
var Escrow = artifacts.require("Escrow");

contract('EscrowEngine', function(accounts) {

  it("buyer wants to make 1 eth transaction with seller", async function(){
    let buyer = accounts[1]
    let seller = accounts[2]
    let buyerBalanceBefore = web3.fromWei(web3.eth.getBalance(buyer).toNumber(), "ether")
    let sellerBalanceBefore = web3.fromWei(web3.eth.getBalance(seller).toNumber(), "ether")
    let escrowEngine = await EscrowEngine.deployed()

    // Make transaction
    await escrowEngine.createContract(seller, "Buy a shoe from this seller", {
      from: buyer, value: web3.toWei(1, "ether")
    })
    let contractAddress = await escrowEngine.escrowContractAddress()
    let escrowContract = Escrow.at(contractAddress)

    let buyerFromContract = await escrowContract.buyer()
    assert.equal(buyerFromContract, buyer, "Buyers are not the same")

    let sellerFromContract = await escrowContract.seller()
    assert.equal(sellerFromContract, seller, "Sellers are not the same")

    let contractValue = await escrowContract.value()
    assert.equal(web3.fromWei(contractValue.toNumber(), "ether"), 1, "Invalid contract value")

    // Make sure buyer balance change at least 1 eth
    let buyerBalanceAfter = web3.fromWei(web3.eth.getBalance(buyer).toNumber(), "ether")
    assert(buyerBalanceBefore > buyerBalanceAfter, "Buyer balance does not change after transaction was made")

    // Buyer accept the contract
    let latestContract = await escrowEngine.getContract(buyer) // There is only one contract atm
    // Accept contract
    let buyerContract = Escrow.at(latestContract[0])
    await buyerContract.buyerAccept({from: buyer})
    let sellerBalanceAfter = web3.fromWei(web3.eth.getBalance(seller).toNumber(), "ether")
    assert(sellerBalanceAfter == parseFloat(sellerBalanceBefore) + 1, "Seller doesnot get the fund")
  })
});
