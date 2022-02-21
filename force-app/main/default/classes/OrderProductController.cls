/**
 * Created by Omer on 18/02/2022.
 */

public with sharing class OrderProductController {

    @AuraEnabled
    public static List<OrderItem> getOrderItems(Id orderId) {
        String query = '{0} {1} {2}';
        String querySelect = 'SELECT Id,Product2.Name,UnitPrice,Quantity,TotalPrice';
        String queryFrom = 'FROM OrderItem';
        String queryWhere = 'WHERE Id!=NULL ';
        queryWhere += 'AND OrderId=:orderId';
        query = String.format(query, new List<String>{
                querySelect,
                queryFrom,
                queryWhere
        });
        System.debug(query);
        return Database.query(query);
    }

    @AuraEnabled
    public static Order getOrder(Id orderId) {
        return [
                SELECT Id,Status
                FROM Order
                WHERE Id = :orderId
        ];
    }

    @AuraEnabled
    public static void activateOrder(Id orderId) {
        OrderService.OrderServiceIntegrationResult orderServiceIntegrationResult = OrderService.sendOrderToExternalSystem(orderId);
        Order order = new Order(Id = orderId);
        if (orderServiceIntegrationResult.isSuccess) {
            order.Status = 'Activated';
            order.IntegrationStatus__c = 'Success';
            update order;
        } else {
            order.IntegrationStatus__c = 'Fail';
            update order;
            throw new AuraHandledException(orderServiceIntegrationResult.message);
        }
    }


}