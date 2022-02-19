/**
 * Created by Omer on 18/02/2022.
 */

import {api, LightningElement, wire} from 'lwc';
import getOrderItems from '@salesforce/apex/OrderProductController.getOrderItems'
import {getErrorMessage} from "c/utility";
import {ShowToastEvent} from "lightning/platformShowToastEvent";

const COLUMNS = [
    {label: 'Name', fieldName: 'ProductName', cellAttributes: {alignment: 'left'}},
    {label: 'Unit Price', fieldName: 'UnitPrice', type: 'currency', cellAttributes: {alignment: 'left'}},
    {label: 'Quantity', fieldName: 'Quantity', type: 'number', cellAttributes: {alignment: 'left'}},
    {label: 'Total Price', fieldName: 'TotalPrice', type: 'currency', cellAttributes: {alignment: 'left'}},
]

export default class OrderProducts extends LightningElement {

    @api recordId;
    columns = COLUMNS;
    isLoading = false;
    orderItems = [];


    connectedCallback() {
        this.getOrderItems();
    }

    handleActivate() {
        // TODO:
    }

    getOrderItems() {
        this.isLoading = true;
        getOrderItems({
            orderId: this.recordId
        }).then(data => {
            const clone = JSON.parse(JSON.stringify(data));
            clone.forEach(item => {
                item.ProductName = item.Product2.Name;
            });
            this.orderItems = clone;
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