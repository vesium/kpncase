/**
 * Created by Omer on 21/02/2022.
 */

@IsTest
private class AvailableProductsControllerTest {

    @TestSetup
    static void setup() {

        List<Account> accounts = TestDataFactory.createAccount(true, 1);
        Account account = accounts.get(0);
        List<Product2> products = TestDataFactory.createProduct(true, 1);
        Product2 product = products.get(0);

        TestDataFactory.activateStandardPriceBook();
        PricebookEntry pricebookEntryForStandardPriceBook = new PricebookEntry();
        pricebookEntryForStandardPriceBook.Product2Id = product.Id;
        pricebookEntryForStandardPriceBook.Pricebook2Id = Test.getStandardPricebookId();
        pricebookEntryForStandardPriceBook.UnitPrice = 20;
        pricebookEntryForStandardPriceBook.IsActive = true;
        insert pricebookEntryForStandardPriceBook;

        List<Pricebook2> priceBooks = TestDataFactory.createPriceBooks(true, 1);
        Pricebook2 customPriceBook = priceBooks.get(0);
        PricebookEntry pricebookEntryForCustomPriceBook = new PricebookEntry();
        pricebookEntryForCustomPriceBook.Product2Id = product.Id;
        pricebookEntryForCustomPriceBook.Pricebook2Id = customPriceBook.Id;
        pricebookEntryForCustomPriceBook.UnitPrice = 20;
        pricebookEntryForCustomPriceBook.IsActive = true;
        insert pricebookEntryForCustomPriceBook;

        Order order = new Order();
        order.AccountId = account.Id;
        order.Status = 'Draft';
        order.Pricebook2Id = customPriceBook.Id;
        order.EffectiveDate = Date.today();
        insert order;

        OrderItem orderItem = new OrderItem();
        orderItem.PricebookEntryId = pricebookEntryForCustomPriceBook.Id;
        orderItem.UnitPrice = pricebookEntryForCustomPriceBook.UnitPrice;
        orderItem.Product2Id = product.Id;
        orderItem.Quantity = 2;
        orderItem.OrderId = order.Id;
        insert orderItem;


    }

    @IsTest
    static void test() {
        AvailableProductsController.ProductSearchRequestModel requestModel = new AvailableProductsController.ProductSearchRequestModel();
        Order order = [SELECT Id, (SELECT Id,Product2Id FROM OrderItems) FROM Order LIMIT 1];
        List<String> product2Ids = new List<String>();
        for (OrderItem orderItem : order.OrderItems) {
            product2Ids.add(orderItem.Product2Id);
        }
        Test.startTest();
        {
            requestModel.orderId = order.Id;
            requestModel.recordLimit = 5;
            requestModel.showedProductIds = product2Ids;
            AvailableProductsController.AvailableProductListResult result = AvailableProductsController.getAvailableProductList(requestModel);
            System.assertEquals(1, result.totalRecordSize);
        }
        Test.stopTest();
    }

    @IsTest
    static void testUpdateOrderItems() {

        Account account = [SELECT Id FROM Account LIMIT 1];
        Pricebook2 customPriceBook = [SELECT Id FROM Pricebook2 WHERE IsStandard = FALSE];
        Order order = new Order();
        order.AccountId = account.Id;
        order.Status = 'Draft';
        order.Pricebook2Id = customPriceBook.Id;
        order.EffectiveDate = Date.today();
        insert order;

        List<PricebookEntry> pricebookEntries = [SELECT Id,Product2Id,UnitPrice FROM PricebookEntry WHERE Pricebook2Id = :customPriceBook.Id];

        Test.startTest();
        {
            AvailableProductsController.updateOrderItems(order.Id, pricebookEntries);
            List<OrderItem> orderItems = [SELECT Id FROM OrderItem WHERE OrderId = :order.Id];
            System.assertEquals(1, orderItems.size());
        }
        Test.stopTest();
    }

    @IsTest
    static void testGetPriceBooks() {
        Test.startTest();
        {
            List<Pricebook2> pricebook2s = AvailableProductsController.getPriceBooks();
            System.assertEquals(2, pricebook2s.size());
        }
        Test.stopTest();
    }

    @IsTest
    static void testGetOrder() {
        Order orderRecord = [SELECT Id FROM Order LIMIT 1];
        Test.startTest();
        {
            Order foundOrder = AvailableProductsController.getOrder(orderRecord.Id);
            System.assertEquals(orderRecord.Id, foundOrder.Id);
        }
        Test.stopTest();
    }

    @IsTest
    static void testSetPriceBook() {
        Account account = [SELECT Id FROM Account LIMIT 1];
        Pricebook2 customPricebook = [SELECT Id FROM Pricebook2 WHERE IsStandard = FALSE];
        Order order = new Order();
        order.AccountId = account.Id;
        order.Status = 'Draft';
        order.EffectiveDate = Date.today();
        insert order;
        Test.startTest();
        {
            AvailableProductsController.setPriceBook(order.Id, customPricebook.Id);
            order = [SELECT Id,Pricebook2Id FROM Order WHERE Id = :order.Id];
            System.assertEquals(customPricebook.Id, order.Pricebook2Id);
        }
        Test.stopTest();
    }


}