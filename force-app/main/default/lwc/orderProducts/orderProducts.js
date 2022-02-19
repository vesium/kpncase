/**
 * Created by Omer on 18/02/2022.
 */

import {api, LightningElement, wire} from 'lwc';
import getOrderItems from '@salesforce/apex/OrderProductController.getOrderItems'
import activateOrder from '@salesforce/apex/OrderProductController.activateOrder'
import {getErrorMessage} from "c/utility";
import {ShowToastEvent} from "lightning/platformShowToastEvent";
import {subscribe, MessageContext} from 'lightning/messageService';
import ORDER_ITEM_UPSERT_CHANNEL from '@salesforce/messageChannel/OrderItemUpsert__c';
import {getRecord} from 'lightning/uiRecordApi';

const COLUMNS = [
    {label: 'Name', fieldName: 'ProductName', cellAttributes: {alignment: 'left'}},
    {label: 'Unit Price', fieldName: 'UnitPrice', type: 'currency', cellAttributes: {alignment: 'left'}},
    {label: 'Quantity', fieldName: 'Quantity', type: 'number', cellAttributes: {alignment: 'left'}},
    {label: 'Total Price', fieldName: 'TotalPrice', type: 'currency', cellAttributes: {alignment: 'left'}},
]

const ORDER_FIELDS = ['Order.Status'];

export default class OrderProducts extends LightningElement {

    @api recordId;
    columns = COLUMNS;
    isLoading = false;
    orderItems = [];
    subscription = null;
    order;

    @wire(getRecord, {recordId: '$recordId', fields: ORDER_FIELDS})
    wiredRecord({error, data}) {
        if (error) {
            const errorMessage = getErrorMessage(error);
            // TODO: Custom Label
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error loading order',
                    errorMessage,
                    variant: 'error',
                }),
            );
        } else if (data) {
            this.order = data;
        }
    }

    @wire(MessageContext)
    messageContext;

    subscribeToMessageChannel() {
        this.subscription = subscribe(
            this.messageContext,
            ORDER_ITEM_UPSERT_CHANNEL,
            (message) => this.handleMessage(message)
        );
    }

    connectedCallback() {
        this.subscribeToMessageChannel();
        this.getOrderItems();
    }

    handleMessage(message) {
        // message is not required - only the component will be refreshed, not all lightning page
        this.getOrderItems();
    }

    handleActivate() {
        this.isLoading = true;
        activateOrder({
            orderId: this.recordId
        }).then(data => {
            eval("$A.get('e.force:refreshView').fire();");
            this.dispatchEvent(new ShowToastEvent({
                variant: 'success',
                title: "Success",
                message: "The order has been activated"
            }));
        }).catch(error => {
            // TODO : Custom Label
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
            // TODO : Custom Label
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

    get activeButtonDisabled() {
        return this?.order?.fields?.Status?.value === 'Activated';
    }


}