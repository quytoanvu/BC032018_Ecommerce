pragma solidity ^0.4.18;

/*
EscrowEngine.deployed().then(function(i){ return i.createContract(web3.eth.accounts[1],"shoes") })

EscrowEngine.deployed().then(function(i){ return i.getContract();})
*/


contract EscrowEngine {
    address public escrowContractAddress;
    mapping(address => address[]) public contractList;
    event EscrowCreate(address newAddress);

    function createContract(address _seller, bytes32 _description) public payable {
        escrowContractAddress = address((new Escrow).value(msg.value)(_seller, msg.sender, _description));
        contractList[msg.sender].push(escrowContractAddress);
        EscrowCreate(escrowContractAddress);
    }

    function getContract(address _maker) public view returns (address[]) {
        return contractList[_maker];
    }
}


contract Escrow {
    address public buyer;
    address public seller;
    uint public time;
    uint public value;
    bytes32 public description;
    uint public buyerOk;
    uint public sellerOk;
    uint public buyerReject;
    uint public sellerReject;

    function Escrow(address _seller, address _buyer, bytes32 _description) public payable {
        buyer = _buyer;
        seller = _seller;
        time = block.timestamp;
        description = _description;
        value = this.balance;
    }

    function buyerAccept() public {
        // require(msg.sender == buyer);
        seller.transfer(value);
        buyerOk = block.timestamp;
    }

    function buyerReject() public {
        // require(msg.sender == buyer);
        buyer.transfer(value);
        buyerReject = block.timestamp;
    }

    function sellerReject() public {
        // require(msg.sender == seller);
        buyer.transfer(value);
        sellerReject = block.timestamp;
    }
}
