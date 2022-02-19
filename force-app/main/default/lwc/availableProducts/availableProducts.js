/**
 * Created by Omer on 18/02/2022.
 */

import {api, LightningElement} from 'lwc';
import getAvailableProducts from '@salesforce/apex/AvailableProductsController.getAvailableProducts'
import getPriceBooks from '@salesforce/apex/AvailableProductsController.getPriceBooks'
import checkPriceBookSelectionAvailable
    from '@salesforce/apex/AvailableProductsController.checkPriceBookSelectionAvailable'
import setPriceBook
    from '@salesforce/apex/AvailableProductsController.setPriceBook';
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
    pricebookOptions = [];
    selectedPriceBookId = null;

    isPriceBookSelectionAvailable = false;
    showProductListButton = false;
    showProductListDataTable = false;
    showPriceBookSelectionLayout = false;

    get priceBookSaveButtonDisabled() {
        return this.selectedPriceBookId === null;
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