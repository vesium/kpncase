/**
 * Created by Omer on 18/02/2022.
 */

import {api, LightningElement, track, wire} from 'lwc';
import getAvailableProductList from '@salesforce/apex/AvailableProductsController.getAvailableProductList';
import getPriceBooks from '@salesforce/apex/AvailableProductsController.getPriceBooks';
import getOrder
    from '@salesforce/apex/AvailableProductsController.getOrder';
import setPriceBook from '@salesforce/apex/AvailableProductsController.setPriceBook';
import updateOrderItems from '@salesforce/apex/AvailableProductsController.updateOrderItems';
import {getErrorMessage} from "c/utility";
import {ShowToastEvent} from "lightning/platformShowToastEvent";
import {publish, MessageContext} from 'lightning/messageService';
import ORDER_ITEM_UPSERT_CHANNEL from '@salesforce/messageChannel/OrderItemUpsert__c';

import ADD_PRODUCT_BUTTON_LABEL from '@salesforce/label/c.AvailableProductsAddProductButtonLabel';
import HIDE_PRODUCT_LIST_BUTTON_LABEL from '@salesforce/label/c.AvailableProductsHideProductListButtonLabel';
import SHOW_PRODUCT_LIST_BUTTON_LABEL from '@salesforce/label/c.AvailableProductsShowProductListButtonLabel';
import LIST_PRICE_FIELD_LABEL from '@salesforce/label/c.AvailableProductsListPriceColumnName';
import NAME_FIELD_LABEL from '@salesforce/label/c.AvailableProductsProductNameColumnName';
import CARD_TITLE from '@salesforce/label/c.AvailableProductsCardLabel';
import SUCCESS_MESSAGE_TITLE from '@salesforce/label/c.ShowToastEventSuccessMessageTitle';
import FAIL_MESSAGE_TITLE from '@salesforce/label/c.ShowToastEventFailMessageTitle';
import LOADING_LABEL from '@salesforce/label/c.OrderProductsSpinnerLoadingLabel';


const COLUMNS = [
    {
        label: NAME_FIELD_LABEL,
        fieldName: 'Name',
        type: 'text',
        cellAttributes: {alignment: 'left'}
    },
    {
        label: LIST_PRICE_FIELD_LABEL,
        fieldName: 'UnitPrice',
        type: 'currency',
        cellAttributes: {alignment: 'left'}
    },
]
const RECORD_LIMIT = 10;

export default class AvailableProducts extends LightningElement {

    @api recordId;
    columns = COLUMNS;
    isLoading = false;
    productList = [];
    pricebookOptions = [];
    selectedPriceBookId = null;
    selectedRows = [];
    order;
    loadMoreStatus = '';
    totalRecordSize = null;
    showedProductIds = [];
    addProductButtonLabel = ADD_PRODUCT_BUTTON_LABEL;
    showProductListButtonLabel = SHOW_PRODUCT_LIST_BUTTON_LABEL;
    hideProductListButtonLabel = HIDE_PRODUCT_LIST_BUTTON_LABEL;

    isPriceBookSelectionAvailable = false;
    showProductListButton = false;
    showProductListDataTable = false;
    showPriceBookSelectionLayout = false;

    @wire(MessageContext)
    messageContext;

    get cardLabel() {
        if (this.totalRecordSize !== null) {
            return `${CARD_TITLE} ( ${this.totalRecordSize} )`;
        } else {
            return `${CARD_TITLE}`;
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

    handleShowProductList() {
        this.showProductListButton = true;
        this.isLoading = true;
        getOrder({
            orderId: this.recordId
        }).then(order => {
            this.order = order;
            this.isPriceBookSelectionAvailable = this?.order?.Pricebook2Id === undefined;
            if (this.isPriceBookSelectionAvailable === false) {
                return getAvailableProductList({
                    productSearchRequestModel: {
                        orderId: this.recordId,
                        recordLimit: RECORD_LIMIT,
                        showedProductIds: this.showedProductIds
                    }
                });
            } else {
                // Get Price Book List
                return getPriceBooks({});
            }
        }).then(data => {
            if (this.isPriceBookSelectionAvailable === true) {
                this.preparePricePriceBookOptions(data);
            } else {
                this.prepareProductListToDataTable(data);
            }
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

    loadProductList() {
        this.showProductListDataTable = true;
        this.isLoading = true;
        getAvailableProductList({
            productSearchRequestModel: {
                orderId: this.recordId,
                recordLimit: RECORD_LIMIT,
                showedProductIds: this.showedProductIds
            }
        }).then(data => {
            this.prepareProductListToDataTable(data);
        }).catch(error => {
            const errorMessage = getErrorMessage(error);
            this.dispatchEvent(new ShowToastEvent({
                variant: 'error',
                title: FAIL_MESSAGE_TITLE,
                message: errorMessage
            }));
        }).finally(() => {
            this.isLoading = false;
            this.template.querySelector('lightning-datatable').isLoading = false;
            this.loadMoreStatus = '';
        })
    }

    handleHideProductList() {
        this.productList = [];
        this.showPriceBookSelectionLayout = false;
        this.showProductListButton = false;
    }

    handleSavePriceBookChange() {
        this.isLoading = true;
        setPriceBook({
            orderId: this.recordId,
            selectedPriceBook2Id: this.selectedPriceBookId
        }).then(data => {
            // Get Available Products By Selected Price Book
            return getAvailableProductList({
                productSearchRequestModel: {
                    orderId: this.recordId,
                    recordLimit: RECORD_LIMIT,
                    showedProductIds: this.showedProductIds
                }
            })
        }).then(data => {
            this.showPriceBookSelectionLayout = false;
            this.prepareProductListToDataTable(data);
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
            this.refreshAvailableProductList();
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

    handleRowSelection(event) {
        this.selectedRows = event.detail.selectedRows;
    }

    refreshAvailableProductList() {
        this.showProductListDataTable = false;
        this.productList = [];
        this.showedProductIds = [];
        this.template.querySelector('lightning-datatable').enableInfiniteLoading = true;
        this.loadProductList();
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
                this.loadMoreStatus = LOADING_LABEL;
                this.loadProductList();
            }
        }


    }

    prepareProductListToDataTable(data) {
        this.showProductListButton = true;
        this.showProductListDataTable = true;
        this.totalRecordSize = data.totalRecordSize;
        if (data.entries.length > 0) {
            if (this.productList.length > 0) {
                this.productList = [...this.productList, ...data.entries];
            } else {
                this.productList = data.entries;
            }
            this.productList = [...new Map(this.productList.map(item => [item["Id"], item])).values()];
        }
    }


}