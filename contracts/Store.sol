pragma solidity ^0.4.18;


contract Store {
    uint StoreIndex;
    uint ProductIndex;
    uint OrderIndex;
    enum ProductStatus { Available, Unavailable, Delivery }
    enum OrderStatus { InProgress, Fullfilled, Rejected }

    mapping(uint => StoreObj) public stores;
    mapping(uint => Product) public products;
    mapping(uint => Order) public orders;
    mapping(address => uint[]) public accountOrders;
    mapping(address => uint) public accountStore;

    struct StoreObj {
        address owner;
        string name;
        string description;
        uint[] productIds;
    }

    struct Product {
        string name;
        string description;
        string image;
        uint price;
        ProductStatus status;
    }

    struct Order {
        uint productId;
        uint value;
        address contractAddress;
        OrderStatus status;
    }

    function addStore(string _name, string _description) public {
        StoreIndex += 1;
        stores[StoreIndex] = StoreObj({
            owner: msg.sender,
            name: _name,
            description: _description,
            productIds: new uint[](0)
        });
        accountStore[msg.sender] = StoreIndex;
    }

    function getStore(uint _storeId) public constant returns (uint, address, string, string) {
        return (_storeId, stores[_storeId].owner, stores[_storeId].name, stores[_storeId].description);
    }

    function getAccountStore(address _owner) public constant returns (uint, address, string, string) {
        return getStore(accountStore[_owner]);
    }

    function addProduct(uint _storeId, string _name, string _description, string _image, uint _price) public {
        require(msg.sender == stores[_storeId].owner);
        ProductIndex += 1;
        products[ProductIndex] = Product({
            name: _name,
            description: _description,
            image: _image,
            price: _price,
            status: ProductStatus.Available
        });
        stores[_storeId].productIds.push(ProductIndex);
    }

    function getProduct(uint _productId) public constant returns (string, string, string, uint, ProductStatus) {
        return (products[_productId].name, products[_productId].description,
            products[_productId].image, products[_productId].price, products[_productId].status);
    }

    function getStoreProductIds(uint _storeId) public constant returns (uint[]) {
        return stores[_storeId].productIds;
    }

    function buyProduct(uint _productId, address _contractAddress) public {
        OrderIndex += 1;
        // Set product status
        products[_productId].status = ProductStatus.Delivery;
        // Store order info
        orders[OrderIndex] = Order({
            productId: _productId,
            value: products[_productId].price,
            contractAddress: _contractAddress,
            status: OrderStatus.InProgress
        });
        accountOrders[msg.sender].push(OrderIndex);
    }

    function getAccountOrderIds(address _buyer) public view returns (uint[]) {
        return accountOrders[_buyer];
    }

    function getOrder(uint _orderId) public view returns (uint, uint, address, OrderStatus) {
        return (orders[_orderId].productId,
            orders[_orderId].value,
            orders[_orderId].contractAddress,
            orders[_orderId].status);
    }

    function buyerRejectOrder(uint _orderId) public {
        products[orders[_orderId].productId].status = ProductStatus.Available;
        orders[_orderId].status = OrderStatus.Rejected;
    }

    function buyerAcceptOrder(uint _orderId) public {
        products[orders[_orderId].productId].status = ProductStatus.Unavailable;
        orders[_orderId].status = OrderStatus.Fullfilled;
    }

    function checkBalanceVersusProductPrice(uint _productId) private returns (bool) {
        return msg.value >= products[_productId].price;
    }
}
