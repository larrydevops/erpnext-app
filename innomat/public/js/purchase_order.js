frappe.ui.form.on('Purchase Order', {
    refresh(frm) {
        if (frm.doc.docstatus === 0) {
            frm.add_custom_button(__("Order Planning"), function() {
                if (frm.doc.supplier) {
                    get_items_from_order_planning(frm);
                }
            }, __("Get items from"));
            frm.add_custom_button(__("Bulk Import"), function() {
                bulk_import(frm);
            },__("Get items from"));
        }
    },
    before_save(frm) {
       // assure each item has a project assigned
       if (frm.doc.project) {
           for (var i = 0; i < frm.doc.items.length; i++) {
               if (!frm.doc.items[i].project) {
                   frappe.model.set_value(frm.doc.items[i].doctype, frm.doc.items[i].name, "project", frm.doc.project);
               }
           }
       } 
    }
});

// this function will get all items that have negative projected quanitites for the selected supplier
function get_items_from_order_planning(frm) {
    var filters = {'supplier': frm.doc.supplier};
    frappe.call({
        "method": "innomat.innomat.report.order_planning.order_planning.get_data",
        "args": {
            "filters": filters
        },
        "callback": function(response) {
            var data = response.message;
            if (data) {
                for (var i = 0; i < data.length; i++) {
                    var child = cur_frm.add_child('items');
                    frappe.model.set_value(child.doctype, child.name, 'item_code', data[i].item_code);
                    frappe.model.set_value(child.doctype, child.name, 'qty', (data[i].to_order));
                }
                cur_frm.refresh_field('items');
                frappe.show_alert(__("Updated"));
            } 
        }
    });
}

function bulk_import(frm) {
    var d = new frappe.ui.Dialog({
        'fields': [
            {'fieldname': 'raw', 
             'fieldtype': 'Long Text', 
             'label': __('Code'), 
             'reqd': 1, 
             'description': __("Enter semi-colon separated items, one per line") 
            }
        ],
        primary_action: function() {
            d.hide();
            var values = d.get_values();
            var lines = values.raw.split("\n");
            for (var i = 0; i < lines.length; i++) {
                var fields = [];
                try {
                    fields = lines[i].split(";");
                    var child = cur_frm.add_child('items');
                    frappe.model.set_value(child.doctype, child.name, 'item_code', fields[0]);
                    frappe.model.set_value(child.doctype, child.name, 'qty', fields[1]);
                } catch {
                    console.log("failed to parse field");
                }

            }
            cur_frm.refresh_field('items');
            // clean up uom and rates
            for (var i = 0; i < frm.doc.items.length; i++) {
                if (!frm.doc.items[i].uom) {
                    frappe.call({
                        "method": "frappe.client.get",
                        "args": {
                            "doctype": "Item",
                            "name": frm.doc.items[i].item_code
                        },
                        "async": false,
                        "callback": function(response) {
                            var item = response.message;
                            frappe.model.set_value(frm.doc.items[i].doctype, frm.doc.items[i].name, 'uom', item.stock_uom);
                        }
                    });
                }
            }
            cur_frm.refresh_field('items');
        },
        primary_action_label: __('OK'),
        title: __('Bulk Import')
    });
    d.show();
}