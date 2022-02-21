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

import ORDER_ITEM_PRODUCT_NAME_FIELD_NAME from '@salesforce/label/c.OrderItemProductNameColumn';
import ORDER_ITEM_UNIT_PRICE_FIELD_NAME from '@salesforce/label/c.OrderItemUnitPriceColumnName';
import ORDER_ITEM_QUANTITY_FIELD_NAME from '@salesforce/label/c.OrderItemQuantityColumnName';
import ORDER_ITEM_TOTAL_PRICE_FIELD_NAME from '@salesforce/label/c.OrderItemTotalPriceColumnName';
import CARD_LABEL from '@salesforce/label/c.OrderProductsCardLabel';
import ACTIVATE_BUTTON_LABEL from '@salesforce/label/c.OrderProductsActivateButtonLabel';

import SUCCESS_MESSAGE_TITLE from '@salesforce/label/c.ShowToastEventSuccessMessageTitle';
import FAIL_MESSAGE_TITLE from '@salesforce/label/c.ShowToastEventFailMessageTitle';
import LOADING_LABEL from '@salesforce/label/c.OrderProductsSpinnerLoadingLabel';

const COLUMNS = [
    {
        label: ORDER_ITEM_PRODUCT_NAME_FIELD_NAME,
        fieldName: 'ProductName',
        type: 'text',
        cellAttributes: {alignment: 'left'}
    },
    {
        label: ORDER_ITEM_UNIT_PRICE_FIELD_NAME,
        fieldName: 'UnitPrice',
        type: 'currency',
        cellAttributes: {alignment: 'left'}
    },
    {
        label: ORDER_ITEM_QUANTITY_FIELD_NAME,
        fieldName: 'Quantity',
        type: 'number',
        cellAttributes: {alignment: 'left'}
    },
    {
        label: ORDER_ITEM_TOTAL_PRICE_FIELD_NAME,
        fieldName: 'TotalPrice',
        type: 'currency',
        cellAttributes: {alignment: 'left'}
    },
]

const ORDER_FIELDS = ['Order.Status'];

export default class OrderProducts extends LightningElement {

    @api recordId;
    columns = COLUMNS;
    isLoading = false;
    orderItems = [];
    subscription = null;
    order;
    cardLabel = CARD_LABEL;
    activateButtonLabel = ACTIVATE_BUTTON_LABEL;

    @wire(getRecord, {recordId: '$recordId', fields: ORDER_FIELDS})
    wiredRecord({error, data}) {
        if (error) {
            const errorMessage = getErrorMessage(error);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: FAIL_MESSAGE_TITLE,
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
                variant: data.isSuccess ? 'success' : 'error',
                title: data.isSuccess ? SUCCESS_MESSAGE_TITLE : FAIL_MESSAGE_TITLE,
                message: data.message
            }));
        }).catch(error => {
            const errorMessage = getErrorMessage(error);
            this.dispatchEvent(new ShowToastEvent({
                variant: 'error',
                title: FAIL_MESSAGE_TITLE,
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
            const errorMessage = getErrorMessage(error);
            this.dispatchEvent(new ShowToastEvent({
                variant: 'error',
                title: FAIL_MESSAGE_TITLE,
                message: errorMessage
            }));
        }).finally(() => {
            this.isLoading = false;
        })
    }

    get activeButtonDisabled() {
        return this?.order?.fields?.Status?.value === 'Activated';
    }

    get activateButtonClass() {
        return this.orderItems.length === 0 ? 'slds-hide' : '';
    }


}