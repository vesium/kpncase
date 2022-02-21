/**
 * Created by Omer on 21/02/2022.
 */

@IsTest
public class RESTMockServiceResponseGenerator implements HttpCalloutMock {


    Integer statusCode;

    public RESTMockServiceResponseGenerator(Integer statusCode) {
        this.statusCode = statusCode;
    }

    public HttpResponse respond(HttpRequest req) {
        HttpResponse response = new HttpResponse();
        System.debug(req.getEndpoint());
        if (req.getEndpoint().contains('callout:OrderExternalSystemNamedCredential/test')) {
            response = new HttpResponse();
            //response.setBody(JSON.serialize(data));
            response.setStatusCode(statusCode);
            return response;
        } else {
            System.assert(false, 'unexpected endpoint ' + req.getEndpoint());
            return null;
        }
    }

}