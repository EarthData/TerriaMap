'use strict';

/*global require,ga*/
var createCatalogItemFromUrl = require('./createCatalogItemFromUrl');
var loadView = require('../Core/loadView');
var WebFeatureServiceGroupViewModel = require('./WebFeatureServiceGroupViewModel');
var WebMapServiceGroupViewModel = require('./WebMapServiceGroupViewModel');

var defined = require('../../third_party/cesium/Source/Core/defined');
var DeveloperError = require('../../third_party/cesium/Source/Core/DeveloperError');
var knockout = require('../../third_party/cesium/Source/ThirdParty/knockout');

var AddDataPanelViewModel = function(options) {
    if (!defined(options) || !defined(options.application)) {
        throw new DeveloperError('options.application is required.');
    }

    this.application = options.application;
    this.destinationGroup = options.destinationGroup;

    this._domNodes = undefined;

    this.webLink = '';

    knockout.track(this, ['webLink']);
};

AddDataPanelViewModel.prototype.show = function(container) {
    this._domNodes = loadView(require('fs').readFileSync(__dirname + '/../Views/AddDataPanel.html', 'utf8'), container, this);
};

AddDataPanelViewModel.prototype.close = function() {
    for (var i = 0; i < this._domNodes.length; ++i) {
        var node = this._domNodes[i];
        node.parentElement.removeChild(node);
    }
};

AddDataPanelViewModel.prototype.closeIfClickOnBackground = function(viewModel, e) {
    if (e.target.className === 'modal-background') {
        this.close();
    }
    return true;
};

AddDataPanelViewModel.prototype.selectFileToUpload = function() {
    var element = document.getElementById('add-data-panel-upload-file');
    element.click();
};

AddDataPanelViewModel.prototype.addUploadedFile = function() {
    var uploadFileElement = document.getElementById('add-data-panel-upload-file');
    var files = uploadFileElement.files;
    for (var i = 0; i < files.length; ++i) {
        var file = files[i];
        ga('send', 'event', 'uploadFile', 'browse', file.name);

        //addFile(file);
    }
};

AddDataPanelViewModel.prototype.addWebLink = function() {
    ga('send', 'event', 'addDataUrl', this.webLink);

    var that = this;

    // First try to interpret the URL as a WMS.
    var wms = new WebMapServiceGroupViewModel(this.application);
    wms.name = this.webLink;
    wms.url = this.webLink;

    wms.load().then(function() {
        // WMS GetCapabilities was successful, so add this WMS to the catalog.
        that.application.catalog.userAddedDataGroup.items.push(wms);
        wms.isOpen = true;
        that.application.catalog.userAddedDataGroup.isOpen = true;
        that.close();
    }).otherwise(function() {
        // WMS GetCapabilities failed, try WFS
        var wfs = new WebFeatureServiceGroupViewModel(that.application);
        wfs.name = that.webLink;
        wfs.url = that.webLink;

        return wfs.load().then(function() {
            // WFS GetCapabilities was successful, so add this WFS to the catalog.
            that.application.catalog.userAddedDataGroup.items.push(wfs);
            wfs.isOpen = true;
            that.application.catalog.userAddedDataGroup.isOpen = true;

            that.close();
        }).otherwise(function() {
            // WFS GetCapabilities failed too, try treating this as a single data file.
            var dataFile = createCatalogItemFromUrl(that.webLink, that.application);

            var lastSlashIndex = that.webLink.lastIndexOf('/');

            var name = that.webLink;
            if (lastSlashIndex >= 0) {
                name = name.substring(lastSlashIndex + 1);
            }

            dataFile.name = name;

            var catalog = that.application.catalog;
            catalog.userAddedDataGroup.items.push(dataFile);
            catalog.userAddedDataGroup.isOpen = true;
            dataFile.isEnabled = true;
            dataFile.zoomToAndUseClock();

            that.close();
        });
    });
};

AddDataPanelViewModel.open = function(container, options) {
    var viewModel = new AddDataPanelViewModel(options);
    viewModel.show(container);
    return viewModel;
};

module.exports = AddDataPanelViewModel;
