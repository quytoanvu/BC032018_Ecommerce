import "babel-polyfill";
var EscrowEngine = artifacts.require("EscrowEngine");
var Escrow = artifacts.require("Escrow");
var Store = artifacts.require("Store");
var storeCI;
var escrowEngineCI;

contract("Store", function(accounts) {
  before(async function() {
    storeCI = await Store.deployed();
    escrowEngineCI = await EscrowEngine.deployed();
  });

  it("test add new store", async function() {
    let storeName = "SPhone"
    let storeDescription = "This store sells phones and phone accessories"
    //   Store owner is accounts[0]
    await storeCI.addStore(storeName, storeDescription)
    let storeInfo = await storeCI.getAccountStore(accounts[0])
    // console.log("New store id: ", storeInfo)
    assert(storeInfo[2] == storeName, "Store name mismatch")
    assert(storeInfo[3] == storeDescription, "Store description mismatch")
  });

  it("test add new products", async function() {
    let productName_1 = "Samsung Galaxy Note 8"
    let productDesc_1 = "Samsung Galaxy Note 8 Description"
    let productPrice_1 = web3.toWei(1.5, "ether")
    let productImage_1 = "https://g.vatgia.vn/gallery_img/4/fmm1521620821.png"

    let productName_2 = "Samsung Galaxy S9"
    let productDesc_2 = "Samsung Galaxy S9 Description"
    let productPrice_2 = web3.toWei(2.5, "ether")
    let productImage_2 = "https://thumbor.forbes.com/thumbor/960x0/smart/https%3A%2F%2Fblogs-images.forbes.com%2Fgordonkelly%2Ffiles%2F2018%2F02%2FScreenshot-2018-02-26-at-02.15.08.jpg"


    //   Store owner is accounts[0]
    let storeInfo = await storeCI.getAccountStore(accounts[0])
    let storeId = storeInfo[0]
    // Add product 1
    await storeCI.addProduct(storeId, productName_1, productDesc_1,
        productImage_1, productPrice_1)
    await storeCI.addProduct(storeId, productName_2, productDesc_2,
        productImage_2, productPrice_2)
    let storeProducts = await storeCI.getStoreProductIds(storeId)
    assert.equal(storeProducts.length, 2, "No product added")
  });

  it("test buy products", async function() {
    let storeInfo = await storeCI.getAccountStore(accounts[0])
    let storeId = storeInfo[0]
    let storeProducts = await storeCI.getStoreProductIds(storeId)
    let productInfo = await storeCI.getProduct(storeProducts[0].toNumber())
    await escrowEngineCI.createContract(accounts[0], productInfo[0], {
        from: accounts[2], value: productInfo[3]
    })
    let contractAddress = await escrowEngineCI.escrowContractAddress()
    await storeCI.buyProduct(storeId, storeProducts[0].toNumber(), contractAddress,
        { from: accounts[2], value: productInfo[3].toNumber(), gas: 700000 })
    let accountOrderIds = await storeCI.getAccountOrderIds(accounts[2])
    assert.equal(accountOrderIds.length, 1)
    let orderInfo = await storeCI.getOrder(accountOrderIds[0])
    assert.equal(orderInfo[1].toNumber(), productInfo[3].toNumber())
    // Reject order
    let buyerContract = Escrow.at(orderInfo[2])
    buyerContract.buyerReject({from: accounts[2]})
  });
});
