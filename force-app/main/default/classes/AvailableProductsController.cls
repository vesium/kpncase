/**
 * Created by Omer on 18/02/2022.
 */

public with sharing class AvailableProductsController {

    @AuraEnabled
    public static AvailableProductListResult getAvailableProducts(ProductSearchRequestModel productSearchRequestModel) {
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

        List<PricebookEntry> pricebookEntries = getPricebookEntries(order, productSearchRequestModel);
        Integer totalRecordSize = getTotalRecordSize(order, productSearchRequestModel);

        AvailableProductListResult result = new AvailableProductListResult();
        result.totalRecordSize = totalRecordSize;
        PriceBookEntryModel priceBookEntryModel = new PriceBookEntryModel();
        for (PricebookEntry pricebookEntry : pricebookEntries) {
            priceBookEntryModel = new PriceBookEntryModel();
            Boolean isExistingOrderProduct = existingProductIds.contains(pricebookEntry.Product2Id);
            priceBookEntryModel.pricebookEntry = pricebookEntry;
            priceBookEntryModel.isExistingOrderProduct = isExistingOrderProduct;
            priceBookEntryModels.add(priceBookEntryModel);
        }
        result.entries = priceBookEntryModels;
        return result;

    }

    private static Integer getTotalRecordSize(Order order, ProductSearchRequestModel productSearchRequestModel) {
        String query = '{0} {1} {2}';
        String querySelect = 'SELECT Count(Id) totalRecordSize';
        String queryFrom = ' FROM PriceBookEntry';
        String queryWhere = 'WHERE Id!=NULL ';
        Id priceBook2Id = order.Pricebook2Id;
        queryWhere += 'AND PriceBook2Id=:priceBook2Id ';
        queryWhere += 'AND IsActive=TRUE';

        query = String.format(query, new List<String>{
                querySelect,
                queryFrom,
                queryWhere
        });
        System.debug(query);
        List<AggregateResult> countResults = Database.query(query);
        Integer totalRecordSize = 0;
        if (countResults != null && !countResults.isEmpty()) {
            totalRecordSize = (Integer) countResults.get(0).get('totalRecordSize');
        }
        System.debug(totalRecordSize);
        return totalRecordSize;
    }

    private static List<PricebookEntry> getPricebookEntries(Order order, ProductSearchRequestModel productSearchRequestModel) {
        String query = '{0} {1} {2} {3} {4}';
        String querySelect = 'SELECT Id,Name,UnitPrice,Product2Id';
        String queryFrom = ' FROM PriceBookEntry';
        String queryWhere = 'WHERE Id!=NULL ';
        String queryLimit = 'LIMIT 50';

        Integer offset = productSearchRequestModel.offset;
        System.debug(offset);
        String queryOffset = 'OFFSET :offset';

        Id priceBook2Id = order.Pricebook2Id;
        queryWhere += 'AND PriceBook2Id=:priceBook2Id ';

        query = String.format(query, new List<String>{
                querySelect,
                queryFrom,
                queryWhere,
                queryLimit,
                queryOffset
        });
        System.debug(query);
        return Database.query(query);
    }

    @AuraEnabled
    public static Order getOrder(Id orderId) {
        return [
                SELECT Id,Pricebook2Id,Status
                FROM Order
                WHERE Id = :orderId
        ];
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
        @AuraEnabled public Integer offset { get; set; }
        @AuraEnabled public String searchTerm { get; set; } // TODO
    }

    class AvailableProductListResult {
        @AuraEnabled public Integer totalRecordSize { get; set; }
        @AuraEnabled public List<PriceBookEntryModel> entries { get; set; }

    }

    class PriceBookEntryModel {
        @AuraEnabled public PricebookEntry pricebookEntry { get; set; }
        @AuraEnabled public Boolean isExistingOrderProduct { get; set; }
    }

}