var templateEngine = new ko.nativeTemplateEngine();

$('head').append('<style type="text/css">\
        .header:after {content: "";float: right;margin-top: 7px;visibility: hidden;}\
        .sortDown:after {border-width: 0 4px 4px;border-style: solid;border-color: #000 transparent;visibility: visible;}\
        .sortUp:after {border-bottom: none;border-left: 4px solid transparent;border-right: 4px solid transparent;border-top: 4px solid #000;visibility: visible;}\
        .selectedItem {background-color: #f5f5f5}\
    </style>');

templateEngine.addTemplate = function (templateName, templateMarkup) {
    document.write("<script type='text/html' id='" + templateName + "'>" + templateMarkup + "<" + "/script>");
};

templateEngine.addTemplate("ko_table_header", '\
                        <thead>\
                            <tr>\
                            <td data-bind="attr: {colspan: $root.getPagerColSpan()}">\
                             <form class="form-inline">\
                                  <button class="btn btn-primary btn-sm" data-bind="click: $root.add">\
                                    <span class="glyphicon glyphicon-plus-sign" aria-hidden="true"><strong>  Create New Record</strong></span>\
                                  </button>\
                             </form>\
                            </td>\
                            </tr>\
                            <tr>\
                            <td data-bind="attr: {colspan: $root.getPagerColSpan()}">\
                            <div data-bind="template: { name : \'ko_table_filters\'}"></div>\
                            </td>\
                          </tr>\
                          <tr>\
                            <!-- ko if: $root.hasCheckboxColumn -->\
                            <th style="width: 5px; text-align: center"><input type="checkbox" data-bind="checked: selectAll" /></th>\
                             <!-- /ko -->\
                             <!-- ko foreach: columns --> \
                               <!-- ko if: $data.sortable -->\
                                   <th class="header" data-bind="text: header, css: cssClass, style: { width: width }, click: $root.sort"></th>\
                               <!-- /ko -->\
                               <!-- ko ifnot: $data.sortable -->\
                                   <th class="header" data-bind="text: header, css: cssClass, style: { width: width }"></th>\
                               <!-- /ko -->\
                            <!-- /ko -->\
                            <!-- ko if: $root.hasActionColumn -->\
                            <th style="width: 10px; text-align: center"></th>\
                            <!-- /ko -->\
                            </tr>\
                        </thead>');

templateEngine.addTemplate("ko_table_body", '\
                        <tbody data-bind="foreach: paginatedRows">\
                            <tr class="grid" data-bind="attr: {dataId: $data.id, dataParent: $data.parent, dataDescents: $data.descents}">\
                            <!-- ko if: $root.hasCheckboxColumn -->\
                                <td style="width: 5px; text-align: center"><input type="checkbox" data-bind="checkedValue: $data, checked: $parent.selectedItems" />\
                                </td>\
                             <!-- /ko -->\
                                <!-- ko foreach: $parent.columns -->\
                                       <!-- ko if: $data.columnType == "simple" -->\
                                        <td><div data-bind="html: $root.getFormattedValue($parent,$data)"></div></td>\
                                        <!-- /ko -->\
                                        <!-- ko if: $data.columnType == "link" -->\
                                        <td><span class="branch" data-bind="html: $root.getIndentStr($parent,$data)"></span><a href="#" data-bind="click: function() {$root.edit($parent);},clickBubble: false"><span data-bind="text: $root.getColumnValue($parent,$data)"></span></a></td>\
                                        <!-- /ko -->\
                                <!-- /ko -->\
                                <!-- ko if: $root.hasActionColumn -->\
                                 <td style="width:5px; text-align:center">\
                                 <div data-bind="template: {name:\'ko_table_actions\'}"></div>\
                                </td>\
                                <!-- /ko -->\
                            </tr>\
                        </tbody>');

templateEngine.addTemplate("ko_table_pager", '\
        <tfoot>\
        <tr>\
        <td data-bind="attr: {colspan: $root.getPagerColSpan()}">\
            <div class="row">\
            <div class="col col-md-6">\
            <!-- ko if: $root.hasToolbar -->\
                <div data-bind="template : {name:\'ko_table_toolbar\'}">\
                </div> \
            <!-- /ko -->\
            </div>\
            <div class="col col-md-3">\
               Show :\
              <span class="" data-bind="foreach: [10, 25, 50, 100,200,500]">\
                <!-- ko if: $data == $root.pageSize() -->\
                    <span data-bind="text: $data + \' \'"/>\
                <!-- /ko -->\
                <!-- ko if: $data != $root.pageSize() -->\
                    <a href="#" data-bind="text: $data + \' \', click: function() { $root.pageSize($data); $root.pageIndex(0);}"/>\
                <!-- /ko -->\
               </span>\
            </div>\
            <div class="col col-md-3" class="form-inline" data-bind="if: totalPages() > 1">\
                <ul class="pagination">\
                    <li data-bind="css: { disabled: isFirstPage() }">\
                        <a href="#" data-bind="click: prevPage">«</a>\
                    </li>\
                    <!-- ko foreach: pages() -->\
                        <!-- ko if: $data == "ellipsis" -->\
                            <li>\
                                <span>...</span>\
                            </li>\
                        <!-- /ko -->\
                        <!-- ko if: $data != "ellipsis" -->\
                            <li data-bind="css: { active: $data === ($root.pageIndex() + 1)}">\
                                <a href="#" data-bind="text: $data, click: $root.moveToPage"/>\
                            </li>\
                        <!-- /ko -->\
                    <!-- /ko -->\
                    <li data-bind="css: { disabled: isLastPage() }">\
                        <a href="#" data-bind="click: nextPage">»</a>\
                    </li>\
                </ul>\
            </div>\
            </div>\
        </td>\
        </tr>\
    </tfoot>\
');

templateEngine.addTemplate("ko_table_toolbar", '\
                            <div class="btn-toolbar" role="toolbar">\
                               <button class="btn btn-primary btn-sm" data-bind="click: $root.copy, disable: $root.selectedItems().length == 0">\
                                    <span class="glyphicon glyphicon-plus-sign" aria-hidden="true"></span>\
                               </button>\
                               <button class="btn btn-primary btn-sm" data-bind="click: $root.delete, disable: $root.selectedItems().length == 0">\
                                    <span class="glyphicon glyphicon-remove-sign" aria-hidden="true"></span>\
                               </button>\
                            </div>\
');

templateEngine.addTemplate("ko_table_actions", '\
                            <button class="btn btn-primary btn-sm" data-bind="{click:$parent.edit}">\
                                <i class="glyphicon glyphicon-pencil"></i>\
                            </button>\
                            <button class="btn btn-primary btn-sm" data-bind="{click:$parent.deleteSingle}">\
                                <i class="glyphicon glyphicon-remove"></i>\
                            </button>\
');

templateEngine.addTemplate(("ko_table_filters"), '\
                            <form class="form-inline">\
                                <div class="form-group">\
                                    <label for="txtAge">Filter by age : </label>\
                                    <input type="number" class="form-control" id="txtAge" data-bind="textInput: vm.tableViewModel.filterHash" placeholder="0">\
                                </div>\
                                <div class="input-group pull-right">\
                                    <span class="input-group-addon"><i class="glyphicon glyphicon-search"></i> Search</span>\
                                    <input type="text" id="txtSearch" class="form-control" data-bind="textInput:vm.tableViewModel.searchTerm" placeholder="Press enter to search...">\
                                </div>\
                            </form>\
');

$(document).ready(function(){
    $(window).load(function () {
        if (vm.tableViewModel.hierarchySort()) {
            var $trs = $("tr.grid").filter(function(index, ele) {
                return $(ele).attr("dataparent") != '0';
            }).hide();
        }
    });

    $("body").on("click", "td span.tree", function(event) {
        if ($(this).is(".glyphicon-plus-sign")) {
            $(this).removeClass("glyphicon-plus-sign");
            $(this).addClass("glyphicon-minus-sign");
            var $tr = $(this).closest("tr");
            var idsAry = $tr.attr("dataDescents").split(",");
            idsAry.forEach(function(id) {
                var $tr = $("tr").filter(function(index, ele) {
                    return $(ele).attr("dataId") == id;
                });
                $tr.find("span.tree").removeClass("glyphicon-plus-sign").addClass("glyphicon-minus-sign");
                $tr.show();
            })} else {
            $(this).removeClass("glyphicon-minus-sign");
            $(this).addClass("glyphicon-plus-sign");
            var $tr = $(this).closest("tr");
            var idsAry = $tr.attr("dataDescents").split(",");
            idsAry.forEach(function(id) {
                var $tr = $("tr").filter(function(index, ele) {
                    return $(ele).attr("dataId") == id;
                });
                $tr.find("span.tree").removeClass("glyphicon-minus-sign").addClass("glyphicon-plus-sign");
                $tr.hide();
            })
        }
    })
});