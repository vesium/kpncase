/**
 * Created by Omer on 18/02/2022.
 */

public with sharing class AvailableProductsController {

    @AuraEnabled
    public static List<PriceBookEntryModel> getAvailableProducts(ProductSearchRequestModel productSearchRequestModel) {
        List<PriceBookEntryModel> priceBookEntryModels = new List<PriceBookEntryModel>();
        Set<Id> existingProductIds = new Set<Id>();
        Order order = [
                SELECT Id,Pricebook2Id, (
                        SELECT Id,Product2Id
                        FROM OrderItems
                )
                FROM Order
                WHERE Id = :productSearchRequestModel.orderId
        ];
        List<OrderItem> orderItems = order.OrderItems;
        if (orderItems != null && !orderItems.isEmpty()) {
            for (OrderItem orderItem : orderItems) {
                existingProductIds.add(orderItem.Product2Id);
            }
        }

        String query = '{0} {1} {2}';
        String querySelect = 'SELECT Id,Name,UnitPrice,Product2Id';
        String queryFrom = ' FROM PriceBookEntry';
        String queryWhere = 'WHERE Id!=NULL ';

        Id priceBook2Id = order.Pricebook2Id;
        queryWhere += 'AND PriceBook2Id=:priceBook2Id ';

        query = String.format(query, new List<String>{
                querySelect,
                queryFrom,
                queryWhere
        });
        System.debug(query);
        List<PricebookEntry> pricebookEntries = Database.query(query);

        PriceBookEntryModel priceBookEntryModel = new PriceBookEntryModel();
        for (PricebookEntry pricebookEntry : pricebookEntries) {
            priceBookEntryModel = new PriceBookEntryModel();
            Boolean isExistingOrderProduct = existingProductIds.contains(pricebookEntry.Product2Id);
            priceBookEntryModel.pricebookEntry = pricebookEntry;
            priceBookEntryModel.isExistingOrderProduct = isExistingOrderProduct;
            priceBookEntryModels.add(priceBookEntryModel);
        }

        return priceBookEntryModels;

    }

    @AuraEnabled
    public static Boolean checkPriceBookSelectionAvailable(Id orderId) {
        Order orderRecord = [SELECT Id,Pricebook2Id FROM Order WHERE Id = :orderId];
        return orderRecord.Pricebook2Id == null;
    }

    @AuraEnabled
    public static List<Pricebook2> getPriceBooks() {
        return [
                SELECT Id,Name
                FROM Pricebook2
                WHERE IsActive = TRUE
        ];
    }

    @AuraEnabled
    public static void updateOrderItems(Id orderId, List<PricebookEntry> selectedRows) {

        Map<Id, OrderItem> productToOrderItemMap = new Map<Id, OrderItem>();
        List<OrderItem> orderItemsToUpsert = new List<OrderItem>();

        List<OrderItem> orderItems = [
                SELECT Id,Product2Id,Quantity
                FROM OrderItem
                WHERE OrderId = :orderId
        ];
        if (!orderItems.isEmpty()) {
            for (OrderItem orderItem : orderItems) {
                productToOrderItemMap.put(orderItem.Product2Id, orderItem);
            }
        }

        for (PricebookEntry pricebookEntry : selectedRows) {
            OrderItem orderItem = productToOrderItemMap.get(pricebookEntry.Product2Id);
            if (orderItem == null) {
                orderItem = new OrderItem();
                orderItem.OrderId = orderId;
                orderItem.UnitPrice = pricebookEntry.UnitPrice;
                orderItem.PricebookEntryId = pricebookEntry.Id;
                orderItem.Quantity = 1;
            } else {
                orderItem.Quantity++;
            }
            orderItemsToUpsert.add(orderItem);
        }
        if (!orderItemsToUpsert.isEmpty()) {
            upsert orderItemsToUpsert;
        }


    }

    @AuraEnabled
    public static void setPriceBook(Id orderId, Id selectedPriceBook2Id) {
        Order order = new Order(Id = orderId, Pricebook2Id = selectedPriceBook2Id);
        update order;
    }

    class ProductSearchRequestModel {
        @AuraEnabled public Id orderId { get; set; }
        @AuraEnabled public String searchTerm { get; set; } // TODO
    }

    class PriceBookEntryModel {
        @AuraEnabled public PricebookEntry pricebookEntry { get; set; }
        @AuraEnabled public Boolean isExistingOrderProduct { get; set; }
    }

}