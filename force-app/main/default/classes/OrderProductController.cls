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
    public static OrderActivationResult activateOrder(Id orderId) {

        OrderService.OrderServiceIntegrationResult orderServiceIntegrationResult = OrderService.sendOrderToExternalSystem(orderId);

        OrderActivationResult orderActivationResult = new OrderActivationResult();
        orderActivationResult.message = orderServiceIntegrationResult.message;
        orderActivationResult.isSuccess = orderServiceIntegrationResult.isSuccess;
        if (orderActivationResult.isSuccess) {
            orderActivationResult.message = 'The order has been activated';
        }

        Order order = new Order(Id = orderId);
        if (orderServiceIntegrationResult.isSuccess) {
            order.Status = 'Activated';
            order.IntegrationStatus__c = 'Success';
            update order;
        } else {
            order.IntegrationStatus__c = 'Fail';
            update order;
        }

        return orderActivationResult;

    }

    public class OrderActivationResult {
        @AuraEnabled public Boolean isSuccess { get; set; }
        @AuraEnabled public String message { get; set; }
    }


}