/**
 * Created by Omer on 18/02/2022.
 */

import {api, LightningElement, track, wire} from 'lwc';
import getAvailableProducts from '@salesforce/apex/AvailableProductsController.getAvailableProducts';
import getPriceBooks from '@salesforce/apex/AvailableProductsController.getPriceBooks';
import checkPriceBookSelectionAvailable
    from '@salesforce/apex/AvailableProductsController.checkPriceBookSelectionAvailable';
import setPriceBook from '@salesforce/apex/AvailableProductsController.setPriceBook';
import updateOrderItems from '@salesforce/apex/AvailableProductsController.updateOrderItems';
import {getErrorMessage} from "c/utility";
import {ShowToastEvent} from "lightning/platformShowToastEvent";
import {publish, MessageContext} from 'lightning/messageService';
import ORDER_ITEM_UPSERT_CHANNEL from '@salesforce/messageChannel/OrderItemUpsert__c';

const COLUMNS = [
    {label: 'Name', fieldName: 'Name', cellAttributes: {alignment: 'left'}},
    {label: 'List Price', fieldName: 'UnitPrice', type: 'currency', cellAttributes: {alignment: 'left'}},
]

export default class AvailableProducts extends LightningElement {

    @api recordId;
    columns = COLUMNS;
    isLoading = false;
    productList = [];
    pricebookOptions = [];
    selectedPriceBookId = null;
    selectedRows = [];

    isPriceBookSelectionAvailable = false;
    showProductListButton = false;
    showProductListDataTable = false;
    showPriceBookSelectionLayout = false;

    @wire(MessageContext)
    messageContext;

    get priceBookSaveButtonDisabled() {
        return this.selectedPriceBookId === null;
    }

    get addProductButtonDisabled() {
        return this.selectedRows.length === 0;
    }

    handleShowProductList() {
        this.isLoading = true;
        checkPriceBookSelectionAvailable({
            orderId: this.recordId
        }).then(isPriceBookSelectionAvailable => {
            this.isPriceBookSelectionAvailable = isPriceBookSelectionAvailable;
            if (this.isPriceBookSelectionAvailable === false) {
                // Get Available Products
                return getAvailableProducts({
                    productSearchRequestModel: {
                        orderId: this.recordId,
                        searchTerm: "" // TODO
                    }
                })
            } else {
                // Get Price Book List
                return getPriceBooks({});
            }
        }).then(data => {
            this.showProductListButton = true;
            if (this.isPriceBookSelectionAvailable === false) {
                this.prepareProductList(data);
            } else {
                this.preparePricePriceBookOptions(data);
            }
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

    handleHideProductList() {
        this.showProductListButton = false;
    }

    handleSavePriceBookChange() {
        this.isLoading = true;
        setPriceBook({
            orderId: this.recordId,
            selectedPriceBook2Id: this.selectedPriceBookId
        }).then(data => {
            // Get Available Products By Selected Price Book
            return getAvailableProducts({
                productSearchRequestModel: {
                    orderId: this.recordId,
                    searchTerm: "" // TODO
                }
            })
        }).then(data => {
            this.showPriceBookSelectionLayout = false;
            this.prepareProductList(data);
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

    handleAddProduct() {
        this.isLoading = true;
        this.selectedRows.forEach(item => {
            delete item.isExistingOrderProduct;
        });
        updateOrderItems({
            orderId: this.recordId,
            selectedRows: this.selectedRows
        }).then(data => {
            this.selectedRows = [];
            this.template.querySelector('lightning-datatable').selectedRows = [];
            const payload = {};
            publish(this.messageContext, ORDER_ITEM_UPSERT_CHANNEL, payload);
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

    handleRowSelection(event) {
        this.selectedRows = event.detail.selectedRows;
    }

    getAvailableProducts() {
        this.isLoading = true;
        getAvailableProducts({
            productSearchRequestModel: {
                orderId: this.recordId,
                searchTerm: "" // TODO
            }
        }).then(data => {
            this.prepareProductList(data);
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

    prepareProductList(data) {
        const clone = JSON.parse(JSON.stringify(data));
        this.productList = clone.map((item) => {
            return {
                Id: item.pricebookEntry.Id,
                Product2Id: item.pricebookEntry.Product2Id,
                Name: item.pricebookEntry.Name,
                UnitPrice: item.pricebookEntry.UnitPrice,
                isExistingOrderProduct: item.isExistingOrderProduct
            }
        });
        this.showProductListDataTable = true;
    }

    preparePricePriceBookOptions(data) {
        this.showPriceBookSelectionLayout = true;
        this.pricebookOptions = data.map(item => {
            return {
                label: item.Name,
                value: item.Id
            }
        });
    }

    handlePriceBookChange(event) {
        this.selectedPriceBookId = event.detail.value;
    }

}