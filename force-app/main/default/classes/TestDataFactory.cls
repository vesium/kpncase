/**
 * Created by Omer on 21/02/2022.
 */

@IsTest
public class TestDataFactory {

    public static List<Account> createAccount(Boolean doInsert, Integer size) {

        List<Account> accounts = new List<Account>();
        for (Integer i = 0; i < size; i++) {
            Account account = new Account();
            account.Name = 'TestAccount' + i;
            accounts.add(account);
        }

        if (doInsert) {
            insert accounts;
        }
        return accounts;
    }

    public static List<Product2> createProduct(Boolean doInsert, Integer size) {
        List<Product2> products = new List<Product2>();
        for (Integer i = 0; i < size; i++) {
            Product2 product = new Product2();
            product.Name = 'Test Product' + i;
            product.ProductCode = '000' + i;
            products.add(product);
        }
        if (doInsert) {
            insert products;
        }
        return products;
    }

    public static Pricebook2 activateStandardPriceBook() {
        Pricebook2 standardPricebook2 = new Pricebook2(Id = Test.getStandardPricebookId());
        standardPricebook2.IsActive = true;
        update standardPricebook2;
        return standardPricebook2;
    }

    public static List<Pricebook2> createPriceBooks(Boolean doInsert, Integer size) {
        List<Pricebook2> priceBooks = new List<Pricebook2>();
        for (Integer i = 0; i < size; i++) {
            Pricebook2 customPriceBook = new Pricebook2();
            customPriceBook.Name = 'CustomPriceBook' + i;
            customPriceBook.IsActive = true;
            priceBooks.add(customPriceBook);
        }
        if (doInsert) {
            insert priceBooks;
        }
        return priceBooks;
    }


}