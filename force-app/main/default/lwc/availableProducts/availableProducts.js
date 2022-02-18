/**
 * Created by Omer on 18/02/2022.
 */

import {api, LightningElement} from 'lwc';
import getAvailableProducts from '@salesforce/apex/AvailableProductsController.getAvailableProducts'
import {getErrorMessage} from "c/utility";
import {ShowToastEvent} from "lightning/platformShowToastEvent";

const COLUMNS = [
    {label: 'Name', fieldName: 'Name', cellAttributes: {alignment: 'left'}},
    {label: 'List Price', fieldName: 'UnitPrice', type: 'currency', cellAttributes: {alignment: 'left'}},
]

export default class AvailableProducts extends LightningElement {

    @api recordId;
    columns = COLUMNS;
    isLoading = false;
    productList = [];

    connectedCallback() {
        this.getAvailableProducts();
    }

    getAvailableProducts() {
        this.isLoading = true;
        getAvailableProducts({
            productSearchRequestModel: {
                orderId: this.recordId,
                searchTerm: "" // TODO
            }
        }).then(data => {
            const clone = JSON.parse(JSON.stringify(data));
            this.productList = clone.map((item) => {
                return {
                    Id: item.pricebookEntry.Id,
                    Name: item.pricebookEntry.Name,
                    UnitPrice: item.pricebookEntry.UnitPrice,
                    isExistingOrderProduct: item.isExistingOrderProduct
                }
            });
        }).catch(error => {
            const errorMessage = getErrorMessage(error);
            this.dispatchEvent(new ShowToastEvent({
                variant: 'error',
                title: "Error",
                message: errorMessage
            }));
        }).finally(() => {
            this.isLoading = false;
        })
    }


}