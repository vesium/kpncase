/**
 * Created by Omer on 18/02/2022.
 */

import {api, LightningElement, track, wire} from 'lwc';
import getAvailableProductLast from '@salesforce/apex/AvailableProductsController.getAvailableProductLast';
import getPriceBooks from '@salesforce/apex/AvailableProductsController.getPriceBooks';
import getOrder
    from '@salesforce/apex/AvailableProductsController.getOrder';
import setPriceBook from '@salesforce/apex/AvailableProductsController.setPriceBook';
import updateOrderItems from '@salesforce/apex/AvailableProductsController.updateOrderItems';
import {getErrorMessage} from "c/utility";
import {ShowToastEvent} from "lightning/platformShowToastEvent";
import {publish, MessageContext} from 'lightning/messageService';
import ORDER_ITEM_UPSERT_CHANNEL from '@salesforce/messageChannel/OrderItemUpsert__c';

const COLUMNS = [
    {label: 'Name', fieldName: 'Name', cellAttributes: {alignment: 'left'}},
    {label: 'List Price', fieldName: 'UnitPrice', type: 'currency', cellAttributes: {alignment: 'left'}},
    {label: 'PriceBook2Id', fieldName: 'Pricebook2Id', type: 'text', cellAttributes: {alignment: 'left'}},
]
const RECORD_LIMIT = 5;

export default class AvailableProducts extends LightningElement {

    @api recordId;
    columns = COLUMNS;
    isLoading = false;
    productList = [];
    pricebookOptions = [];
    selectedPriceBookId = null;
    selectedRows = [];
    order;
    offset = 0;
    loadMoreStatus = '';
    totalRecordSize = null;
    existingPriceBookEntries = [];
    newPriceBookEntries = [];
    showedProductIds = [];

    isPriceBookSelectionAvailable = false;
    showProductListButton = false;
    showProductListDataTable = false;
    showPriceBookSelectionLayout = false;

    @wire(MessageContext)
    messageContext;

    get cardLabel() {
        if (this.totalRecordSize !== null) {
            return `Available Products ( ${this.totalRecordSize} )`; // TODO : Custom Label
        } else {
            return "Available Products";
        }
    }

    get priceBookSaveButtonDisabled() {
        return this.selectedPriceBookId === null;
    }

    get hideCheckBoxColumn() {
        return this.order.Status === 'Activated';
    }

    get addProductButtonClass() {
        return this.order.Status === 'Activated' ? 'slds-hide' : '';
    }

    get addProductButtonDisabled() {
        return this.selectedRows.length === 0;
    }

    connectedCallback() {
        this.isLoading = true;
        getOrder({
            orderId: this.recordId
        }).then(order => {
            this.order = order;
            this.isPriceBookSelectionAvailable = this.order.Pricebook2Id === null;
            if (this.isPriceBookSelectionAvailable === false) {
                return Promise.resolve();
            } else {
                // Get Price Book List
                return getPriceBooks({});
            }
        }).then(data => {
            if (this.isPriceBookSelectionAvailable === true) {
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

    handleShowProductList() {
        this.loadProductList();
    }

    loadProductList() {
        this.showProductListDataTable = true;
        this.isLoading = true;
        getAvailableProductLast({
            productSearchRequestModel: {
                orderId: this.recordId,
                recordLimit: RECORD_LIMIT,
                showedProductIds: this.showedProductIds
            }
        }).then(data => {
            this.addProductListToTable(data);
        }).catch(error => {
            const errorMessage = getErrorMessage(error);
            this.dispatchEvent(new ShowToastEvent({
                variant: 'error',
                title: "Error",
                message: errorMessage
            }));
        }).finally(() => {
            this.isLoading = false;
            this.template.querySelector('lightning-datatable').isLoading = false;
            this.loadMoreStatus = ''; // TODO : Custom Label
        })
    }

    handleHideProductList() {
        this.productList = [];
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
                    searchTerm: "", // TODO
                    offset: this.offset,
                    recordLimit: RECORD_LIMIT
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

    prepareProductList(data) {
        this.showProductListDataTable = true;
        this.totalRecordSize = data.totalRecordSize;
        this.totalOrderItemSize = data.totalOrderItemSize;
        if (this.productList.length > 0) {
            this.productList = [...this.productList, ...data.entries];
        } else {
            this.productList = data.entries;
        }
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


    handleLoadMore(event) {
        event.preventDefault();
        if (this.productList.length === 2000) {
            this.template.querySelector('lightning-datatable').enableInfiniteLoading = false;
            this.loadMoreStatus = 'We currently do not support viewing more than 2000 records in a list'
        } else {
            if (this.totalRecordSize === this.productList.length) {
                this.template.querySelector('lightning-datatable').enableInfiniteLoading = false;
                this.loadMoreStatus = 'No data to load more'
            } else if (this.totalRecordSize > this.productList.length) {
                this.showedProductIds = [];
                this.productList.forEach(item => {
                    this.showedProductIds.push(item.Product2Id);
                })
                this.template.querySelector('lightning-datatable').isLoading = true;
                this.loadMoreStatus = 'Loading...'; // TODO : Custom Label
                this.loadProductList();
            }
        }


    }

    addProductListToTable(data) {
        this.showProductListButton = true;
        this.showProductListDataTable = true;
        this.totalRecordSize = data.totalRecordSize;
        if (data.entries.length > 0) {
            if (this.productList.length > 0) {
                this.productList = [...this.productList, ...data.entries];
            } else {
                this.productList = data.entries;
            }
        }
    }


}