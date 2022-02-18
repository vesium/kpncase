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


}