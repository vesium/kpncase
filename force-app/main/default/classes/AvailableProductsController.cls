/**
 * Created by Omer on 18/02/2022.
 */

public with sharing class AvailableProductsController {

    @AuraEnabled
    public static AvailableProductListResult getAvailableProductList(ProductSearchRequestModel productSearchRequestModel) {

        Integer recordLimit = productSearchRequestModel.recordLimit;

        Order order = [
                SELECT Id,Pricebook2Id, (
                        SELECT Id,Product2Id,PricebookEntryId
                        FROM OrderItems
                )
                FROM Order
                WHERE Id = :productSearchRequestModel.orderId
        ];

        List<PricebookEntry> pricebookEntries = new List<PricebookEntry>();


        List<PricebookEntry> existPriceBookEntries = getOrderItemPriceBookEntries(productSearchRequestModel);
        if (!existPriceBookEntries.isEmpty()) {
            pricebookEntries.addAll(existPriceBookEntries);
        }
        if (existPriceBookEntries.size() != 0 && existPriceBookEntries.size() < recordLimit) {
            recordLimit = recordLimit - existPriceBookEntries.size();
            productSearchRequestModel.recordLimit = recordLimit;
        }

        List<PricebookEntry> newPriceBookEntries = getPricebookEntries(order, productSearchRequestModel);
        if (!newPriceBookEntries.isEmpty()) {
            pricebookEntries.addAll(newPriceBookEntries);
        }

        Integer totalRecordSize = getTotalRecordSize(order, productSearchRequestModel);
        AvailableProductListResult result = new AvailableProductListResult();
        result.totalRecordSize = totalRecordSize;
        result.entries = pricebookEntries;
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

    private static List<PricebookEntry> getPricebookEntries(
            Order order,
            ProductSearchRequestModel productSearchRequestModel) {
        String query = '{0} {1} {2} {3}';
        String querySelect = 'SELECT Id,Name,UnitPrice,Product2Id,PriceBook2Id';
        String queryFrom = ' FROM PriceBookEntry';
        String queryWhere = 'WHERE Id!=NULL ';
        Integer recordLimit = productSearchRequestModel.recordLimit;
        String queryLimit = 'LIMIT :recordLimit';

        Id priceBook2Id = order.Pricebook2Id;
        queryWhere += 'AND PriceBook2Id=:priceBook2Id ';

        Set<Id> productIds = new Set<Id>();
        if (order.OrderItems != null && !order.OrderItems.isEmpty()) {
            for (OrderItem orderItem : order.OrderItems) {
                productIds.add(orderItem.Product2Id);
            }
        }

        if (productSearchRequestModel.showedProductIds != null && !productSearchRequestModel.showedProductIds.isEmpty()) {
            for (Id showProductId : productSearchRequestModel.showedProductIds) {
                productIds.add(showProductId);
            }
        }

        if (!productIds.isEmpty()) {
            queryWhere += 'AND Product2Id NOT IN : productIds';
        }


        query = String.format(query, new List<String>{
                querySelect,
                queryFrom,
                queryWhere,
                queryLimit
        });
        System.debug(query);
        List<PricebookEntry> pricebookEntries = Database.query(query);
        return pricebookEntries;
    }

    private static List<PricebookEntry> getOrderItemPriceBookEntries(ProductSearchRequestModel productSearchRequestModel) {
        List<PricebookEntry> orderItemPricebookEntries = new List<PricebookEntry>();

        String query = '{0} {1} {2} {3}';
        String querySelect = 'SELECT Id,PricebookEntry.Id,PriceBookEntry.PriceBook2Id,PricebookEntry.Product2Id,PricebookEntry.Name,PricebookEntry.UnitPrice';
        String queryFrom = 'FROM OrderItem';
        String queryWhere = 'WHERE Id!=NULL ';

        Integer recordLimit = productSearchRequestModel.recordLimit;
        String queryLimit = 'LIMIT :recordLimit ';

        Id orderId = productSearchRequestModel.orderId;
        queryWhere += 'AND OrderId=:orderId ';

        if (productSearchRequestModel.showedProductIds != null && !productSearchRequestModel.showedProductIds.isEmpty()) {
            List<String> showedProductIds = productSearchRequestModel.showedProductIds;
            queryWhere += 'AND Product2Id NOT IN :showedProductIds';
        }

        query = String.format(query, new List<String>{
                querySelect,
                queryFrom,
                queryWhere,
                queryLimit
        });

        System.debug(query);
        List<OrderItem> orderItems = Database.query(query);
        for (OrderItem orderItem : orderItems) {
            orderItemPricebookEntries.add(orderItem.PricebookEntry);
        }
        return orderItemPricebookEntries;
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

    public class ProductSearchRequestModel {
        @AuraEnabled public Id orderId { get; set; }
        @AuraEnabled public Integer recordLimit { get; set; }
        @AuraEnabled public String searchTerm { get; set; } // TODO
        @AuraEnabled public List<String> showedProductIds { get; set; }
    }

    public class AvailableProductListResult {
        @AuraEnabled public Integer totalRecordSize { get; set; }
        @AuraEnabled public List<PricebookEntry> entries { get; set; }
    }

}