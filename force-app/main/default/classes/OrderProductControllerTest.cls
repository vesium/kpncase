/**
 * Created by Omer on 21/02/2022.
 */

@IsTest
public class OrderProductControllerTest {

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
    static void testActivateOrder_success() {

        Order order = [SELECT Id FROM Order LIMIT 1];
        Test.setMock(HttpCalloutMock.class, new RESTMockServiceResponseGenerator(200));
        Test.startTest();
        {
            OrderProductController.activateOrder(order.Id);
            order = [SELECT Id,IntegrationStatus__c FROM Order LIMIT 1];
            System.assertEquals('Success', order.IntegrationStatus__c);
        }
        Test.stopTest();


    }

    @IsTest
    static void testGetOrderItems() {

        Order order = [SELECT Id,IntegrationStatus__c, (SELECT Id FROM OrderItems) FROM Order LIMIT 1];
        Test.startTest();
        {
            List<OrderItem> orderItems = OrderProductController.getOrderItems(order.Id);
            System.assertEquals(order.OrderItems.size(), orderItems.size());
        }
        Test.stopTest();

    }


    @IsTest
    static void testActivateOrder_fail() {

        Order order = [SELECT Id,IntegrationStatus__c FROM Order LIMIT 1];
        Test.setMock(HttpCalloutMock.class, new RESTMockServiceResponseGenerator(400));
        Test.startTest();
        {
            OrderProductController.activateOrder(order.Id);
            order = [SELECT Id,IntegrationStatus__c FROM Order LIMIT 1];
            System.assertEquals('Fail', order.IntegrationStatus__c);
        }
        Test.stopTest();


    }

}