/**
 * Knockout bootstrap pageable and sortable data table
 * https://github.com/labory/knockout-bootstrap-sortable-data-table
 */
(function () {

    function TableColumn(column) {
        var self = this;
        self.field = column.field;
        self.template = column.template;
        self.sortable = column.sortable;
        self.width = column.width;
        self.header = column.header || "";
        self.cssClass = ko.observable("");
        self.dataType = column.dataType || "string";
        self.formatter = column.formatter;
        self.valueProvider = column.valueProvider;
        self.columnType = column.columnType || "simple"; //simple, link
    }

    ko.dataTable = {
        ViewModel: function (config) {
            var self = this;
            self.sortable = config.sortable || false;
            self.throttle = config.throttle || 100;
            self.loader = config.loader;
            self.entityId = config.entityId || "id";
            self.filterHash = ko.observable('');
            self.filters = config.filters || [];
            self.searchTerm = ko.observable("");
            self.doSearch = config.search;
            self.entityBuilder = config.entityBuilder;
            self.hasCheckboxColumn = config.hasCheckboxColumn || false;
            self.hasActionColumn = config.hasActionColumn || false;
            self.hasToolbar = config.hasToolbar || false;
            self.hierarchySort = ko.observable(config.hierarchySort || false);
            self.defaultSortField = config.defaultSortField || "";

            self.sortOnServer = ko.observable(config.sortOnServer || false);

            self.pagingOnServer = ko.observable(config.pagingOnServer || false);

            self.selectedItem = ko.observable("");

            self.selectedItems = ko.observableArray([]);

            self.items = ko.observableArray([]);

            self.originItems = [];

            self.currentSortColumn = ko.observable("");

            self.cssMap = {"": "", "asc": "sortDown", "desc": "sortUp"};

            self.sorting = {sortColumn: null, sortOrder: ""};

            self.restApiConfig = {
                create: config.restApi ? config.restApi.create : "",
                update: config.restApi ? config.restApi.update : "",
                post: config.restApi ? config.restApi.post : "",
                delete: config.restApi ? config.restApi.delete : ""
            };

            if (config.items) {
                ko.mapping.fromJS(
                    config.items,
                    {
                        key: function (data) {
                            return ko.utils.unwrapObservable(data[self.entityId]);
                        },
                        create: function (options) {
                            return new self.entityBuilder(options.data);
                        }
                    },
                    self.items
                );

                self.originItems = config.items;
            };

            self.columns = [];

            for (var i = 0; i < config.columns.length; i++) {
                var column = config.columns[i];
                column.sortable = column.sortable || self.sortable;
                var _column = new TableColumn(column);

                if (_column.field === self.defaultSortField) {
                    self.sorting.sortColumn = _column;
                    self.sorting.sortOrder = self.sorting.sortOrder == "" ? "asc" : (self.sorting.sortOrder == "desc" ? "asc" : "desc");
                    _column.cssClass(self.cssMap[self.sorting.sortOrder]);
                    self.currentSortColumn(_column.field + ":" + self.sorting.sortOrder);
                }
                self.columns.push(_column);
            }

            self.pageIndex = ko.observable(0);
            self.pageSize = ko.observable(config.pageSize || 5);

            self.pageRadius = ko.observable(config.pageRadius || 20);

            self.getIndentStr = function(entity, column) {
                var temp = '';
                if (self.hierarchySort() && column.field == self.defaultSortField) {
                    for(var i=0; i < parseInt(entity["deep"]()); i++ ) {
                        temp = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + temp;
                    };

                    if (entity.hasChildren()) {
                        temp = temp + '<span class="tree glyphicon glyphicon-plus-sign" aria-hidden="true"></span>'
                            + '&nbsp;&nbsp;';
                    } else {
                        temp = temp + '&nbsp;&nbsp;&nbsp;&nbsp;';
                    }
                };
                return temp;
            };

            self.getFormattedValue = function(entity, column) {
                var result = self.getColumnValue(entity, column);

                if (column.field == "name") {
                    var temp = '';
                    for(var i=0; i < parseInt(entity["deep"]()); i++ ) {
                        temp = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + temp;
                    };

                    if (entity.hasChildren()) {
                        result = temp + '<span class="tree glyphicon glyphicon-plus-sign" aria-hidden="true"></span>'
                                 + '&nbsp;&nbsp;' + result;
                    } else {
                        result = temp + '&nbsp;&nbsp;&nbsp;&nbsp;' + result;
                    }
                };
                return result;
            };

            self.getColumnValue = function (entity, column) {
                var value = null;
                if (column.valueProvider) {
                    value = column.valueProvider(entity);
                } else {
                    value = entity[column.field]();
                }

                if (column.dataType) {
                    switch (column.dataType) {
                        case "number" :
                            value = new Number(value);
                            break;
                        case "date" :
                            value = new Date(value);
                            break;
                        case "string":
                        default:
                            value = value.toString();
                    }
                } else {
                    value = value.toString();
                }
                return value;
            }

            // Sort strings
            self.stringSort = function (column, items) { // Pass in the column object
                items.sort(function (a, b) {
                    // Set strings to lowercase to sort in a predictive way
                    var left = self.getColumnValue(a, column).toLowerCase(),
                        right = self.getColumnValue(b, column).toLowerCase();
                    if (left < right) {
                        return (self.sorting.sortOrder === "asc") ? -1 : 1;
                    }
                    else if (left > right) {
                        return (self.sorting.sortOrder === "asc") ? 1 : -1;
                    }
                    else {
                        return 0
                    }
                });
            };

            // Sort numbers and dates
            self.valueSort = function (column, items) { // Pass in the column object
                items.sort(function (a, b) {
                    var left = self.getColumnValue(a, column),
                        right = self.getColumnValue(b, column);

                    if (self.sorting.sortOrder === "asc") {
                        return left - right;
                    } else {
                        return right - left;
                    }
                });
            };

            self.generateComparer = function() {
                var column = self.sorting.sortColumn;

                return function(a, b) {
                    var left, right;
                    if (column.dataType) {
                        switch (column.dataType) {
                            case "number" :
                                left = new Number(a[column.field]);
                                right = new Number(b[column.field]);
                                break;
                            case "date" :
                                left = new Date(a[column.field]);
                                right = new date(b[column.field]);
                                break;
                            case "string":
                            default:
                                left = a[column.field].toString();
                                right = b[column.field].toString();
                        }
                    } else {
                        column.dataType = "string";
                        left = a[column.field].toString();
                        right = b[column.field].toString();
                    };

                    if (column.dataType == "number" || column.dataType == "date") {
                        return left - right;
                    } else {
                        return left.localeCompare(right);
                    }
                }
            };

            self.depthFirstTreeSort = function (arr, cmp) {
                var nativeJSArray = ko.mapping.toJS(arr);

                //todo: replace with lodash _.find method
                function findNodeById(array, nodeId) {
                    return _.find(array, {id: nodeId});
                };

                function findNearestParentId(array, node) {
                    var temp = node;
                    while (temp) {
                        if (findNodeById(array,temp.parent)) {
                            return temp.parent;
                        } else {
                            temp = findNodeById(self.originItems,temp.parent); //
                        }
                    };
                    return 0;
                }

                function findNodeLevel(array, node) {
                    var temp = node;
                    if (temp.parent == 0) {
                        return 0;
                    } else {
                        var i = 0,
                            temp = findNodeById(array, temp.parent);
                        while (temp) {
                            i++;
                            temp = findNodeById(array, temp.parent);
                        };
                        return i;
                    }
                }

                function hasChildren(array, node) {
                    return _.find(array, {parent: node.id});
                };

                function findDescents(array, node) {
                    var descents = [],
                        originalNode = null;
                        temp = null;
                    for (var i = 0; i < array.length; i++) {
                        temp = array[i];
                        if (temp.id === node.id) {
                            continue;
                        };
                        if (temp.parent == node.id) {
                            descents.push(temp.id);
                        } else {
                            originalNode = temp;
                            while(temp) {
                                temp = findNodeById(array, temp.parent);
                                if (temp && temp.parent == node.id) {
                                    descents.push(originalNode.id);
                                }
                            }
                        }
                    };
                    return descents;
                }

                for (var i=0; i<nativeJSArray.length; i++) {
                    nativeJSArray[i].parent = findNearestParentId(nativeJSArray,
                                                                  nativeJSArray[i]);
                };

                for (var i=0; i<nativeJSArray.length; i++) {
                    nativeJSArray[i].deep = findNodeLevel(nativeJSArray, nativeJSArray[i]);
                    nativeJSArray[i].hasChildren = hasChildren(nativeJSArray, nativeJSArray[i]);
                    nativeJSArray[i].descents = findDescents(nativeJSArray, nativeJSArray[i]);
                };

                // Returns an object, where each key is a node number, and its value
                // is an array of child nodes.
                function makeTree(arr) {
                    var tree = {};
                    for (var i = 0; i < arr.length; i++) {
                        if (!tree[arr[i].parent]) tree[arr[i].parent] = [];
                        tree[arr[i].parent].push(arr[i]);
                    }
                    return tree;
                }

                // For each node in the tree, starting at the given id and proceeding
                // depth-first (pre-order), sort the child nodes based on cmp, and
                // call the callback with each child node.
                function depthFirstTraversal(tree, id, cmp, callback) {
                    var children = tree[id];
                    if (children) {
                        children.sort(cmp);
                        for (var i = 0; i < children.length; i++) {
                            callback(children[i]);
                            depthFirstTraversal(tree, children[i].id, cmp, callback);
                        }
                    }
                }

                // Overwrite arr with the reordered result
                var i = 0;
                depthFirstTraversal(makeTree(nativeJSArray), 0, cmp, function(node) {
                    nativeJSArray[i++] = node;
                });

                return ko.mapping.fromJS(
                    nativeJSArray,
                    {
                        key: function (data) {
                            return ko.utils.unwrapObservable(data[self.entityId]);
                        },
                        create: function (options) {
                            return new self.entityBuilder(options.data);
                        }
                    }
                );
            };

            self.hideNoneTopNode =  function () {
                if (self.hierarchySort()) {
                    var $trs = $("tr.grid").filter(function(index, ele) {
                        return $(ele).attr("dataparent") != '0';
                    }).hide();
                }
            };

            self.filteredItems = ko.computed(function () {
                var items = self.items();

                if (self.filterHash().length > 0) {
                    self.filters.forEach(function (func) {
                        items = ko.utils.arrayFilter(items, func);
                    })
                };

                if (self.searchTerm().length > 0) {
                    if (self.doSearch) {
                        //Invoke the callback method to do some specified search
                        items = ko.utils.arrayFilter(items, self.doSearch);
                    } else {
                        //Otherwise we have to travel the object to search
                        //so far just for simplicity just search the name filed
                        items = ko.utils.arrayFilter(items, function (entity) {
                            return entity.first().indexOf(self.searchTerm().trim()) > -1;
                        })
                    }
                }

                if (self.currentSortColumn()) {
                    //If is hierarchySort
                    if (self.hierarchySort()) {
                        if (self.sorting.sortOrder == "asc") {
                            items = self.depthFirstTreeSort(items, self.generateComparer());  // ascending sort
                        } else {
                            items = self.depthFirstTreeSort(items, function(a, b) { return self.generateComparer()(b, a); });  // descending sort
                        }
                    } else {
                        if (self.sorting.sortColumn) {
                            switch (self.sorting.sortColumn.dataType) {
                                case "number":
                                    self.valueSort(self.sorting.sortColumn, items);
                                    break;
                                case "date":
                                    self.valueSort(self.sorting.sortColumn, items);
                                    break;
                                case "string":
                                default:
                                    self.stringSort(self.sorting.sortColumn, items);
                                    break;
                            }
                        }
                    }
                }
                self.pageIndex(0);
                return items;
            });

            self.totalPages = ko.computed(function () {
                var len = 0;
                if (self.hierarchySort()) {
                    for (var i = 0; i < self.filteredItems()().length; i++) {
                        if (self.filteredItems()()[i].parent() == 0) {
                            len++;
                        }
                    }
                } else {
                    len = self.filteredItems().length;
                }
                return self.pageSize() == 0 ? 0 : Math.ceil(len / self.pageSize());
            });

            //Check whether the 2 objects are same entity
            self.comparator = config.comparator || function (a, b) {
                    return a && b && a[self.entityId] && b[self.entityId] ? a[self.entityId] === b[self.entityId] : a === b;
                };


            self.isFirstPage = ko.computed(function () {
                return self.pageIndex() === 0
            });

            self.isLastPage = ko.computed(function () {
                return self.pageIndex() === self.totalPages() - 1
            });

            self.paginatedRows = ko.computed(function () {
                var len = 0,
                    topNodes = [];
                if (!self.hierarchySort()){
                    var size = self.pageSize() == 0 ? self.filteredItems().length : self.pageSize();
                    var start = self.pageIndex() * size;
                    return self.filteredItems().slice(start, start + size);
                } else {
                    for (var i = 0; i < self.filteredItems()().length; i++) {
                        if (self.filteredItems()()[i].parent() == 0) {
                            len++;
                            topNodes.push(self.filteredItems()()[i]);
                        }
                    };
                    var size = self.pageSize() == 0 ? topNodes.length : self.pageSize();
                    var start = self.pageIndex() * size;
                    var selectedTopNodes = topNodes.slice(start, start + size);

                    window.setTimeout(self.hideNoneTopNode, 0);

                    return ko.utils.arrayFilter(self.filteredItems()(), function(entity) {
                        var bResult = false;
                        selectedTopNodes.forEach(function(topNode){
                            if (entity.id() == topNode.id()) {
                                bResult = true;
                                return true;
                            } else {
                                topNode.descents.forEach(function(id) {
                                    if (entity.id() == id) {
                                        bResult = true;
                                        return true;
                                    }
                                })
                            }
                        });
                        return bResult;
                    })
                };
            });

            self.pages = ko.computed(function () {
                var pages = [];
                var page, elem, last;
                for (page = 1; page <= self.totalPages(); page++) {
                    var activePage = self.pageIndex() + 1;
                    var totalPage = self.totalPages();
                    var radius = self.pageRadius();
                    if (page == 1 || page == totalPage) {
                        elem = page;
                    } else if (activePage < 2 * radius + 1) {
                        elem = (page <= 2 * radius + 1) ? page : "ellipsis";
                    } else if (activePage > totalPage - 2 * radius) {
                        elem = (totalPage - 2 * radius <= page) ? page : "ellipsis";
                    } else {
                        elem = (Math.abs(activePage - page) <= radius ? page : "ellipsis");
                    }
                    if (elem != "ellipsis" || last != "ellipsis") {
                        pages.push(elem);
                    }
                    last = elem;
                }
                return pages;
            });

            self.prevPage = function () {
                if (self.pageIndex() > 0) {
                    self.pageIndex(self.pageIndex() - 1);
                }
            };

            self.nextPage = function () {
                if (self.pageIndex() < self.totalPages() - 1) {
                    self.pageIndex(self.pageIndex() + 1);
                }
            };

            self.moveToPage = function (index) {
                self.pageIndex(index - 1);
                self.hideNoneTopNode();
            };

            // self.reload = function(preserveSelection) {
            //     self.loader(self.pageIndex() + 1, self.pageSize(), (self.sorting.sortColumn ? self.sorting.sortColumn.sortField : ""), self.sorting.sortOrder, function (data) {
            //         self.items(data.content);
            //         if (preserveSelection === true) {
            //             self.restoreSelection();
            //         }
            //         self.pageIndex(Math.min(data.number, data.totalPages - 1));
            //         self.totalPages(data.totalPages);
            //         self.pageSize(data.size);
            //     });
            // };
            //
            // self.restoreSelection = function() {
            //     var selection = self.selectedItem(), items = self.items(), newSelection = null;
            //     if (selection) {
            //         for (i = 0; i < items.length; i++) {
            //             if (self.comparator(items[i], selection)) { newSelection = items[i]; break;}
            //         }
            //     }
            //     self.selectItem(newSelection)
            // };
            //
            // self.content = ko.computed(self.reload).extend({ throttle:self.throttle });

            self.selectItem = function selectItem(item) {
                self.selectedItem(item);
                if (config.selectItem) {
                    config.selectItem(item);
                }
            };

            self.selectAll = ko.pureComputed({
                read: function () {
                    return this.selectedItems().length >= this.paginatedRows().length;
                },
                write: function (value) {
                    if (value) {
                        var pagedRows = this.paginatedRows().map(function (obj) {
                            return obj;
                        });

                        this.selectedItems(pagedRows);
                        return;
                    }
                    this.selectedItems([]);
                },
                owner: self
            });

            self.getPagerColSpan = function () {
                var result = self.columns.length;
                if (self.hasCheckboxColumn) {
                    result ++;
                };
                if (self.hasActionColumn) {
                    result ++;
                };
                return result;
            }

            self.sort = function (column) {
                if (self.sorting.sortColumn && self.sorting.sortColumn != column)
                    self.sorting.sortColumn.cssClass("");

                self.sorting.sortColumn = column;
                self.sorting.sortOrder = self.sorting.sortOrder == "" ? "asc" : (self.sorting.sortOrder == "desc" ? "asc" : "desc");
                column.cssClass(self.cssMap[self.sorting.sortOrder]);

                self.currentSortColumn(column.field + ":" + self.sorting.sortOrder);
            };

            //Add entity
            self.add = function () {
                self.selectItem(new self.entityBuilder());//Create a new empty instance
                //ToDo: According the template name in the config to open the modal dialog

                self.selectedItem()[self.entityId](30);

                self.items.push(self.selectedItem());

                console.log("The new created item is : " + self.selectedItem);
            }

            //Edit entity
            self.edit = function (entity, event) {
                //console.log("event: " + event);
                self.selectItem(entity); //Create a new empty instance
                //ToDo: According the template name in the config to open the modal dialog
                // self.selectedItem().name(self.selectedItem().name() + " - (Updated)");
                self.selectedItem()[self.defaultSortField](self.selectedItem()[self.defaultSortField]() + " - (Updated)");
            }

            //Delete single entity
            self.deleteSingle = function (entity) {
                window.alert(self.selectedItem().toString() + " will be deleted!");
            }

            //Delete selected entities
            self.delete = function () {
                window.alert(self.selectedItems().length + " will be deleted!");
            }

            //Copy entities
            self.copy = function () {
                window.alert(self.selectedItems().length + " will be copied!");
            }

            //Save entity
            self.save = function (entity) {
                window.alert(self.selectedItems().length + " will be saved!");
            }
        }
    };

    ko.bindingHandlers.dataTable = {
        init: function (element, valueAccessor) {
            return {'controlsDescendantBindings': true};
        },
        update: function (element, valueAccessor, allBindingsAccessor) {
            var viewModel = valueAccessor(), allBindings = allBindingsAccessor();

            var tableHeaderTemplateName = allBindings.tableHeaderTemplate || "ko_table_header",
                tableBodyTemplateName = allBindings.tableBodyTemplate || "ko_table_body",
                tablePagerTemplateName = allBindings.tablePagerTemplate || "ko_table_pager";

            var table = $(document.createElement('table')).addClass("table table-bordered table-hover table-condensed table-striped")[0];

            // Render table header
            var headerContainer = table.appendChild(document.createElement("DIV"));
            ko.renderTemplate(tableHeaderTemplateName, viewModel, {templateEngine: templateEngine}, headerContainer, "replaceNode");

            // Render table body
            var bodyContainer = table.appendChild(document.createElement("DIV"));
            ko.renderTemplate(tableBodyTemplateName, viewModel, {templateEngine: templateEngine}, bodyContainer, "replaceNode");

            // Render table pager
            var pagerContainer = table.appendChild(document.createElement("DIV"));
            ko.renderTemplate(tablePagerTemplateName, viewModel, {templateEngine: templateEngine}, pagerContainer, "replaceNode");

            $(element).replaceWith($(table));
        }
    };
})();
