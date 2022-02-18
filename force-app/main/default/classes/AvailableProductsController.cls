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

    class ProductSearchRequestModel {
        @AuraEnabled public Id orderId { get; set; }
        @AuraEnabled public String searchTerm { get; set; } // TODO
    }

    class PriceBookEntryModel {
        @AuraEnabled public PricebookEntry pricebookEntry { get; set; }
        @AuraEnabled public Boolean isExistingOrderProduct { get; set; }
    }

}