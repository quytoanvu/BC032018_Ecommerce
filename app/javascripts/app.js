// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'
const ipfsAPI = require('ipfs-api');

const ipfs = ipfsAPI('/ip4/127.0.0.1/tcp/5001')

// Import our contract artifacts and turn them into usable abstractions.
import escrowengine_artifacts from '../../build/contracts/EscrowEngine.json'
import escrow_artifacts from '../../build/contracts/Escrow.json'
import store_artifacts from '../../build/contracts/Store.json'

// MetaCoin is our usable abstraction, which we'll use through the code below.
var EscrowEngine = contract(escrowengine_artifacts);
var Escrow = contract(escrow_artifacts);
var Store = contract(store_artifacts);

// The following code is simple to show off interacting with your contracts.
// As your needs grow you will likely need to change its form and structure.
// For application bootstrapping, check out window.addEventListener below.
var accounts;
var account;

// accounts[0] is always the store owner, he ownes only 1 store atm
var storeOwner;
var storeName;
var storeCI;
var escrowEngineCI;
var reader;
var accountOrders = {};
var sellerOrders = {};

window.App = {
  start: async function() {
    var self = this;

    // Bootstrap the all contract abstraction for Use.
    EscrowEngine.setProvider(web3.currentProvider);
    Escrow.setProvider(web3.currentProvider);
    Store.setProvider(web3.currentProvider);

    // Get the initial account balance so it can be displayed.
    web3.eth.getAccounts(function(err, accs) {
      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      accounts = accs;
      storeOwner = accounts[0];
      account = accounts[1];

    });
    storeCI = await Store.deployed();
    escrowEngineCI = await EscrowEngine.deployed();
    await getStoreInfo();
    await getBuyerOrders();
    await indexTasks();
    addProductPageBinding();
    $("#add-result").hide();
  },
};

window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://127.0.0.1:9545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:9545"));
  }

  App.start();
});

async function getStoreInfo() {
  let accountStore = await storeCI.getAccountStore(storeOwner)
  let storeInfo = await storeCI.getAccountStore(storeOwner)
  storeName = storeInfo[2]
  $("#store-name").empty().append(storeName)
  return storeInfo[0]
}

async function indexTasks() {
  // Expose fixed buyer to accounts[1]
  $("#account-address").append("Buyer address: " + account)
  $("#account-balance").append("Balance: " + web3.fromWei(web3.eth.getBalance(account), "ether").toNumber() + " ETH")
  // Render store of store owner
  let storeId = await getStoreInfo()
  // get products
  let productIds = await storeCI.getStoreProductIds(storeId.toNumber())
  for (var i = 0; i < productIds.length; i++) {
      let productInfo = await storeCI.getProduct(productIds[i])
      renderProduct(storeId, productIds[i], productInfo)
  }
  // Bind buy buttons
}

function renderProduct(storeId, productId, productInfo) {
  var productStatus = "Available"
  if (productInfo[4].toLocaleString() == "1") {
    productStatus = "Sold"
    $(productHTML, "button").attr("disabled", "disabled");
  } else if (productInfo[4].toLocaleString() == "2") {
    productStatus = "Delivery"
    $(productHTML, "button").attr("disabled", "disabled");
  }

  var productHTML = $(`
    <div class="col-md-4">
    <div class="card mb-4 box-shadow">
    <img class="card-img-top" height="278" width="278" src="http://localhost:8081/ipfs/${productInfo[2]}" data-holder-rendered="true">
    <div class="card-body">
    <h4 class="text-left" max-height="28.8" min-height="28.8" height="28.8"> ${productInfo[0]}</h4>
    <p class="card-text" max-height="96" min-height="96" height="96">${productInfo[1]}</p>
    <span class="text-right label label-success">Status: ${productStatus}</span>
    <div class="d-flex justify-content-between align-items-center">
    <div id="${productId}-button-group" class="btn-toolbar">
      <button type="button" class="btn btn-primary">Buy</button>
    </div>
    <small class="text-muted">${web3.fromWei(productInfo[3], "ether")} ETH</small>
    </div>
    </div>
    </div>
    </div>
  `)
  if (productInfo[4].toLocaleString() == "0") {
    console.log("Product price: ", productInfo[3].toNumber())
    $(productHTML).find("button").click(
      {
        storeId: storeId,
        productId: productId,
        price: productInfo[3].toNumber()
      }, buyProduct);
  } else if (productInfo[4].toLocaleString() == "2") {
    if (productId in accountOrders[account]) {
      $(productHTML).find("#" + productId + "-button-group").empty()
        .append(
          $("<button class=\"btn-info btn\" style=\"margin-right: 5px;\">Accept</buton>")
          .click(accountOrders[account][productId], buyerAcceptOrder)
        )
        .append(
          $("<button class=\"btn-info btn\">Reject</buton>")
          .click(accountOrders[account][productId], buyerRejectOrder)
        );
    }
  } else if (productInfo[4].toLocaleString() == "1") {
    $(productHTML).find("#" + productId + "-button-group").empty()
  }

  $("#product-list").append($(productHTML))
}

async function getBuyerOrders () {
  let orderIds = await storeCI.getAccountOrderIds(account)
  if (!(account in accountOrders)) accountOrders[account] = {}
  for (var i = 0; i < orderIds.length; i++) {
    let orderInfo = await storeCI.getOrder(orderIds[i].toNumber())
    console.log(orderInfo)
    accountOrders[account][orderInfo[0].toNumber()] = {
      contractAddress: orderInfo[2],
      orderId: orderIds[i].toNumber()
    } // Mapp productId with contract address
  }
}

async function buyerAcceptOrder(e) {
  let buyerContract = Escrow.at(e.data.contractAddress)
  await buyerContract.buyerAccept({
    from: account, gas: 800000
  })
  await storeCI.buyerAcceptOrder(e.data.orderId, {
    from: account
  })
  location.reload();
}

async function buyerRejectOrder(e) {
  let buyerContract = Escrow.at(e.data.contractAddress)
  console.log("Rejecting contract")
  await buyerContract.buyerReject({
    from: account, gas: 800000
  })
  console.log("Rejected")
  await storeCI.buyerRejectOrder(e.data.orderId, {
    from: account
  })
  location.reload();
}

async function buyProduct(e) {
  console.log("product price: ", e.data.price)
  await escrowEngineCI.createContract(storeOwner, e.data.productId, {
    from: account, value: e.data.price, gas: 500000})
  let contractAddress = await escrowEngineCI.escrowContractAddress()
  console.log("telling the store to buy product")
  await storeCI.buyProduct(e.data.productId, contractAddress, {
    from: account,
    gas: 500000
  })
  location.reload();
}

function addProductPageBinding() {
  $("#seller-address").append("Seller address: " + storeOwner)
  $("#seller-balance").append("Balance: " + web3.fromWei(web3.eth.getBalance(storeOwner), "ether").toNumber() + " ETH")
  // Price validation
  $("#productPrice").keydown(function (e) {
      // Allow: backspace, delete, tab, escape, enter and .
      if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110, 190]) !== -1 ||
          // Allow: Ctrl/cmd+A
          (e.keyCode == 65 && (e.ctrlKey === true || e.metaKey === true)) ||
          // Allow: Ctrl/cmd+C
          (e.keyCode == 67 && (e.ctrlKey === true || e.metaKey === true)) ||
          // Allow: Ctrl/cmd+X
          (e.keyCode == 88 && (e.ctrlKey === true || e.metaKey === true)) ||
          // Allow: home, end, left, right
          (e.keyCode >= 35 && e.keyCode <= 39)) {
              // let it happen, don't do anything
              return;
      }
      // Ensure that it is a number and stop the keypress
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
          e.preventDefault();
      }
  });

  $("#productImage").on('change', function(e){
    const file = e.target.files[0]
    reader = new window.FileReader();
    reader.readAsArrayBuffer(file);
  })

  $("#add-product-form").on('submit', function(e){
    e.preventDefault();
    saveProduct(reader, $("#productName").val(), $("#productDesc").val(), $("#productPrice").val())
  })
}

async function saveProduct(fileReader, productName, productDesc, productPrice) {
  let response = await saveImageOnIpfs(fileReader);
  let imageId = response[0].hash;
  productPrice = web3.toWei(productPrice, "ether")
  // Check store existance
  await getCurrentStore();
  let storeId = await getStoreInfo()
  let addResult = await storeCI.addProduct(storeId.toNumber(), productName,
    productDesc, imageId, productPrice, {from: storeOwner, gas: 400000})
  if (addResult != 'undefined') {
    $("#add-result").show();
  }
}

function saveImageOnIpfs(reader){
  const buffer = Buffer.from(reader.result);
  return ipfs.add(buffer)
}

async function getCurrentStore() {
  let createdStore = await storeCI.getAccountStore(storeOwner)

  if (createdStore[1] != storeOwner) {
    createOwnerStore()
  }
}

async function createOwnerStore(){
  await storeCI.addStore(
    "Amazon", "This person sells everything",
    {from: storeOwner, gas: 400000})
}