---
layout: post
title: "Odoo OWL Complete Guide: Building Modern Odoo Frontends"
date: 2025-02-15 10:00:00 +0000
categories: [Odoo Dev, OWL, JavaScript]
tags: [odoo, odoo-owl, javascript, frontend, components, tutorial]
reading_time: 25
excerpt: "The definitive guide to Odoo Web Library (OWL). From basic components to complex forms, RPC calls, and testing - everything you need to build modern Odoo frontends."
---

# Odoo OWL Complete Guide: Building Modern Odoo Frontends

If you're developing for Odoo 17 or later, you need to know OWL. Period.

Odoo Web Library (OWL) is the new JavaScript framework that powers Odoo's web client starting from version 17. It's not just "another React clone" - it's specifically designed for business applications, with patterns that map naturally to Odoo's data model.

I've been building OWL components for about a year now, and this guide covers everything I wish I knew when I started.

## Table of Contents

1. [Why OWL Matters](#why-owl)
2. [Module Setup](#module-setup)
3. [Component Basics](#component-basics)
4. [The Template System](#templates)
5. [Understanding Hooks](#hooks-deep)
6. [Working with Odoo Services](#services)
7. [Props and Events](#props-events)
8. [Building Forms](#forms)
9. [Lists and Relational Data](#lists)
10. [Dialogs and Modals](#dialogs)
11. [Widget System](#widgets)
12. [Testing](#testing)
13. [Migration Guide](#migration)
14. [Common Pitfalls](#pitfalls)

---

## Why OWL Matters {#why-owl}

Before we dive in, let's understand why OWL was created:

### The Old Way: Legacy Web Client

```javascript
// This is what we had before OWL
var MyWidget = Widget.extend({
    start: function() {
        this._super();
        this.$el.find('.btn').click(this.do_something);
    },
    do_something: function() {
        // DOM manipulation everywhere
        // No clear data flow
        // Hard to test
    }
});
```

### The OWL Way

```javascript
// This is OWL
import { Component, useState } from "@odoo/owl";

export class MyComponent extends Component {
    static template = "my.component";
    
    setup() {
        this.state = useState({ clicked: false });
    }
    
    doSomething() {
        this.state.clicked = true;
        // UI updates automatically!
    }
}
```

The difference? OWL gives you:
- **Reactive data binding** - changes to state automatically update the UI
- **Component isolation** - no more spaghetti code
- **Cleaner mental model** - data flows one way
- **Better performance** - optimized rendering

---

## Module Setup {#module-setup}

First, you need a properly configured module. Here's the minimum you need:

### Directory Structure

```
my_module/
├── __init__.py
├── __manifest__.py
├── controllers/
│   └── __init__.py
├── models/
│   └── __init__.py
└── static/
    └── src/
        ├── js/
        │   ├── component.js
        │   └── component.xml
        └── scss/
            └── component.scss
```

### Manifest Configuration

```python
# __manifest__.py
{
    'name': 'My OWL Module',
    'description': 'My first OWL module',
    'category': 'Manufacturing',
    'version': '1.0',
    'depends': ['web'],
    'data': [
        # qweb views
        'views/templates.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'my_module/static/src/js/component.js',
            'my_module/static/src/scss/component.scss',
        ],
    },
    'license': 'LGPL-3',
}
```

### The JavaScript Entry Point

```javascript
/** @odoo-module alias=my_module.components */
import { registry } from "@web/core/registry";
import { MyComponent } from "./my_component";

registry.category("webComponents").add("my.component", MyComponent);
```

The `@odoo-module` annotation is critical - it tells Odoo's build system to process this file. The `alias` lets you import this module from elsewhere.

---

## Component Basics {#component-basics}

Let's build a real component step by step.

### The Simplest Component

```javascript
// my_component.js
/** @odoo-module */
import { Component, useState } from "@odoo/owl";

export class HelloWorld extends Component {
    static template = "hello.world";
    
    setup() {
        // This is the constructor - initialize state here
        this.message = "Hello, World!";
    }
}
```

```xml
<!-- my_component.xml -->
<templates>
    <t t-name="hello.world">
        <div class="hello-world">
            <p><t t-esc="message"/></p>
        </div>
    </t>
</templates>
```

### Adding Interactivity

Here's a counter with buttons:

```javascript
/** @odoo-module */
import { Component, useState } from "@odoo/owl";

export class Counter extends Component {
    static template = "counter.template";
    
    setup() {
        this.state = useState({ count: 0 });
    }
    
    increment() {
        this.state.count++;
    }
    
    decrement() {
        this.state.count--;
    }
    
    reset() {
        this.state.count = 0;
    }
}
```

```xml
<templates>
    <t t-name="counter.template">
        <div class="counter d-flex align-items-center gap-2">
            <button class="btn btn-secondary" t-on-click="decrement">-</button>
            <span class="h3 mb-0" t-esc="state.count"/>
            <button class="btn btn-secondary" t-on-click="increment">+</button>
            <button class="btn btn-link" t-on-click="reset">Reset</button>
        </div>
    </t>
</templates>
```

Key things to notice:
- `useState()` creates reactive state
- `t-on-click` binds click events to methods
- `t-esc` displays escaped text
- When `state.count` changes, the UI updates automatically

---

## The Template System {#templates}

OWL's template system is powerful but has a learning curve. Let's cover the essentials.

### Template Syntax

| Syntax | Description |
|--------|-------------|
| `t-esc` | Display escaped text |
| `t-raw` | Display raw HTML |
| `t-if` | Conditional rendering |
| `t-foreach` | Loop over arrays/objects |
| `t-on-click` | Event handler |
| `t-att` | Dynamic attributes |
| `t-ref` | DOM element reference |
| `t-slot` | Slot for composition |

### Conditionals

```xml
<t t-if="state.isLoggedIn">
    <span>Welcome, <t t-esc="state.userName"/>!</span>
</t>
<t t-else="">
    <a href="/login">Please log in</a>
</t>
```

### Loops

```xml
<!-- Loop over partners -->
<t t-foreach="partners" t-as="partner" t-key="partner.id">
    <div class="partner-card">
        <span t-esc="partner.name"/>
    </div>
</t>
```

### Dynamic Attributes

```xml
<!-- Add class conditionally -->
<button t-att-class="state.isActive ? 'btn btn-primary' : 'btn btn-secondary'">
    Click me
</button>

<!-- Multiple attributes -->
<input 
    type="text"
    t-att-value="state.inputValue"
    t-att-disabled="state.isDisabled"
/>
```

### Event Modifiers

```xml
<!-- Prevent default -->
<form t-on-submit.prevent="handleSubmit">

<!-- Stop propagation -->
<button t-on-click.stop="handleClick">

<!-- Capture mode -->
<div t-on-click.capture="handleCapture">

<!-- Once -->
<button t-on-click.once="handleOnce">
```

### Slots (Component Composition)

This is huge for building reusable components:

```javascript
// Modal.js
export class Modal extends Component {
    static template = "modal.template";
    static props = {
        title: String,
        slots: Object,  // Contains named slots
    };
}
```

```xml
<t t-name="modal.template">
    <div class="modal-backdrop">
        <div class="modal-content">
            <header class="modal-header">
                <h4 t-esc="props.title"/>
                <button t-on-click="props.slots.default()">Close</button>
            </header>
            <div class="modal-body">
                <t t-slot="default"/>
            </div>
            <footer class="modal-footer">
                <t t-slot="footer"/>
            </footer>
        </div>
    </div>
</templates>
```

```javascript
// Using the modal
import { Modal } from "./modal";

export class ParentComponent extends Component {
    static template = "parent.template";
    static components = { Modal };
    
    setup() {
        this.state = useState({ showModal: false });
    }
    
    openModal() {
        this.state.showModal = true;
    }
    
    closeModal() {
        this.state.showModal = false;
    }
}
```

```xml
<t t-name="parent.template">
    <button t-on-click="openModal">Open Modal</button>
    
    <t t-if="state.showModal">
        <Modal title="Confirm Action">
            <p>Are you sure?</p>
            <button t-on-click="closeModal">Yes</button>
            <button t-on-click="closeModal">No</button>
        </Modal>
    </t>
</templates>
```

---

## Understanding Hooks Deeply {#hooks-deep}

Hooks are the heart of OWL. Let's cover each one in detail.

### useState - Reactive State

```javascript
import { Component, useState } from "@odoo/owl";

export class MyComponent extends Component {
    setup() {
        // Simple value
        this.state = useState({ value: 0 });
        
        // Array
        this.items = useState([]);
        
        // Nested object - still reactive!
        this.form = useState({
            name: '',
            email: '',
            address: {
                street: '',
                city: ''
            }
        });
        
        // Updating triggers re-render
        this.state.value = 5;  // UI updates
        this.form.address.city = 'London';  // Also reactive!
    }
}
```

### useRef - DOM Access

When you need direct DOM access:

```javascript
import { Component, useState, useRef } from "@odoo/owl";

export class InputFocus extends Component {
    setup() {
        this.inputRef = useRef("myInput");
    }
    
    focusInput() {
        this.inputRef.el.focus();
    }
    
    getInputValue() {
        return this.inputRef.el.value;
    }
}
```

```xml
<t t-name="input.focus">
    <input type="text" t-ref="myInput"/>
    <button t-on-click="focusInput">Focus</button>
</t>
```

### useEffect - Side Effects

For operations that happen outside the render cycle:

```javascript
import { Component, useState, useEffect } from "@odoo/owl";

export class DataLoader extends Component {
    setup() {
        this.state = useState({ data: null, loading: true });
        
        // Runs after render
        useEffect(() => {
            this.loadData();
        }, []);
        
        // Runs when dependencies change
        useEffect(() => {
            console.log("Search term changed:", this.state.searchTerm);
            this.search();
        }, () => [this.state.searchTerm]);
    }
    
    async loadData() {
        // Load something
    }
}
```

The callback function can return a cleanup function:

```javascript
useEffect(() => {
    const handleResize = () => {
        this.windowWidth = window.innerWidth;
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup when component unmounts
    return () => {
        window.removeEventListener('resize', handleResize);
    };
}, []);
```

### useCallback - Memoized Functions

Prevent recreating functions on every render:

```javascript
import { Component, useState, useCallback } from "@odoo/owl";

export class CallbackExample extends Component {
    setup() {
        this.state = useState({ count: 0 });
        
        // Recreated on every render - may cause child re-renders
        this.handleClick = () => {
            console.log("Clicked");
        };
        
        // Memoized - same function reference
        this.handleClickMemo = useCallback(() => {
            console.log("Clicked");
        }, []);  // dependencies
    }
}
```

### useStore - Global State

For sharing state across components:

```javascript
import { Component, useStore } from "@web/core/store/store";

export class UserInfo extends Component {
    setup() {
        // Access global user state
        this.user = useStore((state) => state.user);
    }
}
```

### useService - Using Odoo Services

This is how you access Odoo's internal services:

```javascript
import { Component, useState } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

export class PartnerList extends Component {
    static template = "partner.list";
    
    setup() {
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.dialog = useService("dialog");
        this.action = useService("action");
    }
    
    async loadPartners() {
        try {
            const partners = await this.orm.searchRead(
                "res.partner",
                [["customer", "=", true]],
                ["name", "email", "phone"],
                { limit: 100 }
            );
            this.partners = partners;
        } catch (error) {
            this.notification.add("Failed to load partners", {
                type: "danger"
            });
        }
    }
    
    openPartnerForm(partnerId) {
        this.action.doAction({
            type: "ir.actions.act_window",
            res_model: "res.partner",
            res_id: partnerId,
            views: [[false, "form"]],
        });
    }
}
```

---

## Working with Odoo Services {#services}

Odoo provides many services you can use in OWL components.

### ORM Service

The main service for database operations:

```javascript
this.orm = useService("orm");

// Search records
const partners = await this.orm.searchRead(
    "res.partner",  // Model
    [["customer", "=", true], ["country_id", "=", 1]],  // Domain
    ["name", "email", "country_id"],  // Fields
    { limit: 50, order: "name" }  // Options
);

// Create
const newId = await this.orm.create("res.partner", {
    name: "New Partner",
    customer: true
});

// Write
await this.orm.write("res.partner", [id], {
    name: "Updated Name"
});

// Delete
await this.orm.unlink("res.partner", [id]);

// Call a method
const result = await this.orm.call(
    "res.partner",
    "compute_something",
    [id],
    { arg1: "value" }
);

// Search count
const count = await this.orm.searchCount(
    "res.partner",
    [["customer", "=", true]]
);
```

### Notification Service

```javascript
this.notification = useService("notification");

// Success
this.notification.add("Record saved!", { type: "success" });

// Error
this.notification.add("Something went wrong", { type: "danger" });

// Warning
this.notification.add("Please check the form", { type: "warning" });

// Info
this.notification.add("Processing...", { type: "info" });
```

### Dialog Service

```javascript
this.dialog = useService("dialog");

// Open a confirmation dialog
this.dialog.add(ConfirmationDialog, {
    title: "Confirm Delete",
    body: "Are you sure you want to delete this record?",
    confirm: () => {
        // Handle confirm
    },
    cancel: () => {
        // Handle cancel
    }
});

// Open a form dialog
this.dialog.add(FormController, {
    resModel: "res.partner",
    resId: this.partnerId,
    onSaved: () => {
        this.loadData();
    }
});
```

### Action Service

```javascript
this.action = useService("action");

// Open a window action
await this.action.doAction({
    type: "ir.actions.act_window",
    name: "Partners",
    res_model: "res.partner",
    views: [
        [false, "list"],
        [false, "form"]
    ],
    domain: [["customer", "=", true]]
});

// Execute a server action
await this.action.doAction("my.server.action.xml_id");

// Go back
this.action.back();
```

---

## Props and Events {#props-events}

### Defining Props

Props are how parents pass data to children:

```javascript
export class PartnerCard extends Component {
    static props = {
        partner: Object,
        onSelect: Function,
    };
    
    static template = "partner.card";
    
    select() {
        this.props.onSelect(this.props.partner.id);
    }
}
```

```xml
<t t-name="partner.card">
    <div class="partner-card" t-on-click="select">
        <span t-esc="props.partner.name"/>
    </div>
</t>
```

### Prop Types and Validation

```javascript
export class MyComponent extends Component {
    // Define expected props with types
    static props = {
        // Required primitive
        title: String,
        
        // Optional with default
        size: {
            type: String,
            default: "medium"
        },
        
        // Multiple types
        value: [String, Number],
        
        // Object with shape validation
        config: {
            type: Object,
            optional: true,
            shape: {
                editable: Boolean,
                deletable: { type: Boolean, optional: true }
            }
        },
        
        // Array of specific type
        items: {
            type: Array,
            element: {
                type: Object,
                shape: {
                    id: Number,
                    name: String
                }
            }
        },
        
        // Callback function
        onChange: Function,
        
        // Boolean flag
        isActive: {
            type: Boolean,
            default: true
        }
    };
}
```

### Emitting Events

```javascript
export class ChildComponent extends Component {
    static template = "child.template";
    static props = ["onData"];
    
    sendData() {
        this.props.onData({ 
            id: 1, 
            name: "Test" 
        });
    }
}
```

```xml
<t t-name="child.template">
    <button t-on-click="sendData">Send</button>
</t>
```

```javascript
// Parent usage
<ChildComponent onData="(data) => handleData(data)"/>
```

---

## Building Forms {#forms}

Forms are the most common component. Here's how to build them properly.

### Basic Form Pattern

```javascript
import { Component, useState } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

export class PartnerForm extends Component {
    static template = "partner.form";
    static props = {
        partnerId: { type: Number, optional: true },
        onSave: { type: Function, optional: true },
        onCancel: { type: Function, optional: true },
    };
    
    setup() {
        this.orm = useService("orm");
        this.notification = useService("notification");
        
        this.state = useState({
            name: "",
            email: "",
            phone: "",
            loading: false,
            saving: false
        });
        
        if (this.props.partnerId) {
            this.loadPartner();
        }
    }
    
    async loadPartner() {
        this.state.loading = true;
        try {
            const partners = await this.orm.read(
                "res.partner",
                [this.props.partnerId],
                ["name", "email", "phone"]
            );
            if (partners.length) {
                const p = partners[0];
                this.state.name = p.name;
                this.state.email = p.email || "";
                this.state.phone = p.phone || "";
            }
        } catch (error) {
            this.notification.add("Failed to load partner", { type: "danger" });
        } finally {
            this.state.loading = false;
        }
    }
    
    async save() {
        if (!this.state.name) {
            this.notification.add("Name is required", { type: "warning" });
            return;
        }
        
        this.state.saving = true;
        try {
            const data = {
                name: this.state.name,
                email: this.state.email,
                phone: this.state.phone,
            };
            
            let partnerId;
            if (this.props.partnerId) {
                await this.orm.write("res.partner", [this.props.partnerId], data);
                partnerId = this.props.partnerId;
            } else {
                partnerId = await this.orm.create("res.partner", data);
            }
            
            this.notification.add("Partner saved!", { type: "success" });
            if (this.props.onSave) {
                this.props.onSave(partnerId);
            }
        } catch (error) {
            this.notification.add("Failed to save", { type: "danger" });
        } finally {
            this.state.saving = false;
        }
    }
    
    cancel() {
        if (this.props.onCancel) {
            this.props.onCancel();
        }
    }
}
```

### Form Validation

```javascript
validate() {
    const errors = {};
    
    if (!this.state.name || this.state.name.trim() === "") {
        errors.name = "Name is required";
    }
    
    if (this.state.email && !this.isValidEmail(this.state.email)) {
        errors.email = "Invalid email format";
    }
    
    if (this.state.phone && !this.isValidPhone(this.state.phone)) {
        errors.phone = "Invalid phone format";
    }
    
    this.errors = errors;
    return Object.keys(errors).length === 0;
}

isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

isValidPhone(phone) {
    return /^\+?[\d\s\-()]+$/.test(phone);
}
```

### Form Template

```xml
<t t-name="partner.form">
    <div class="partner-form">
        <div t-if="state.loading" class="text-center">
            <span class="spinner-border"></span> Loading...
        </div>
        
        <t t-else="">
            <div class="form-group">
                <label>Name *</label>
                <input type="text" 
                       t-model="state.name"
                       t-att-class="errors.name ? 'is-invalid' : ''"/>
                <small t-if="errors.name" class="text-danger" 
                        t-esc="errors.name"/>
            </div>
            
            <div class="form-group">
                <label>Email</label>
                <input type="email" 
                       t-model="state.email"
                       t-att-class="errors.email ? 'is-invalid' : ''"/>
                <small t-if="errors.email" class="text-danger"
                        t-esc="errors.email"/>
            </div>
            
            <div class="form-group">
                <label>Phone</label>
                <input type="tel" t-model="state.phone"/>
            </div>
            
            <div class="form-actions">
                <button type="button" 
                        class="btn btn-secondary"
                        t-on-click="cancel">
                    Cancel
                </button>
                <button type="button"
                        class="btn btn-primary"
                        t-att-disabled="state.saving"
                        t-on-click="save">
                    <span t-if="state.saving">Saving...</span>
                    <span t-else="">Save</span>
                </button>
            </div>
        </t>
    </div>
</t>
```

---

## Lists and Relational Data {#lists}

Rendering lists of data is fundamental. Here's how to do it right.

### Basic List

```javascript
export class PartnerList extends Component {
    static template = "partner.list";
    
    setup() {
        this.orm = useService("orm");
        this.state = useState({
            partners: [],
            loading: true
        });
        
        this.loadPartners();
    }
    
    async loadPartners() {
        this.state.loading = true;
        try {
            this.state.partners = await this.orm.searchRead(
                "res.partner",
                [["customer", "=", true]],
                ["id", "name", "email", "phone"],
                { limit: 100, order: "name" }
            );
        } finally {
            this.state.loading = false;
        }
    }
}
```

```xml
<t t-name="partner.list">
    <div class="partner-list">
        <table class="table table-hover">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr t-foreach="state.partners" t-as="partner" t-key="partner.id">
                    <td t-esc="partner.name"/>
                    <td t-esc="partner.email"/>
                    <td t-esc="partner.phone"/>
                    <td>
                        <button class="btn btn-sm btn-primary"
                                t-on-click="() => editPartner(partner.id)">
                            Edit
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
        
        <div t-if="state.partners.length === 0" class="text-muted">
            No partners found.
        </div>
    </div>
</t>
```

### List with Pagination

```javascript
export class PaginatedList extends Component {
    static template = "paginated.list";
    
    setup() {
        this.orm = useService("orm");
        this.notification = useService("notification");
        
        this.state = useState({
            partners: [],
            total: 0,
            page: 1,
            limit: 20,
            loading: false
        });
        
        this.loadPartners();
    }
    
    async loadPartners() {
        this.state.loading = true;
        try {
            const offset = (this.state.page - 1) * this.state.limit;
            
            this.state.partners = await this.orm.searchRead(
                "res.partner",
                [["customer", "=", true]],
                ["name", "email"],
                { 
                    limit: this.state.limit, 
                    offset: offset,
                    order: "name" 
                }
            );
            
            this.state.total = await this.orm.searchCount(
                "res.partner",
                [["customer", "=", true]]
            );
        } finally {
            this.state.loading = false;
        }
    }
    
    get totalPages() {
        return Math.ceil(this.state.total / this.state.limit);
    }
    
    nextPage() {
        if (this.state.page < this.totalPages) {
            this.state.page++;
            this.loadPartners();
        }
    }
    
    prevPage() {
        if (this.state.page > 1) {
            this.state.page--;
            this.loadPartners();
        }
    }
}
```

---

## Dialogs and Modals {#dialogs}

Odoo has built-in support for dialogs.

### Using the Dialog Service

```javascript
import { useService } from "@web/core/utils/hooks";
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";

export class MyComponent extends Component {
    static template = "my.component";
    
    setup() {
        this.dialog = useService("dialog");
    }
    
    confirmDelete(recordId) {
        this.dialog.add(ConfirmationDialog, {
            title: "Confirm Deletion",
            body: "Are you sure you want to delete this record? This action cannot be undone.",
            confirm: async () => {
                await this.deleteRecord(recordId);
            },
        });
    }
    
    async deleteRecord(id) {
        // Delete logic
    }
}
```

### Creating Custom Dialogs

```javascript
// MyDialog.js
export class MyDialog extends Component {
    static template = "my.dialog";
    static props = {
        title: String,
        initialValue: String,
        onConfirm: Function,
        onCancel: Function,
    };
    
    setup() {
        this.state = useState({ value: this.props.initialValue || "" });
    }
    
    confirm() {
        this.props.onConfirm(this.state.value);
    }
}
```

```javascript
// Usage
this.dialog.add(MyDialog, {
    title: "Enter Name",
    initialValue: this.currentName,
    onConfirm: (value) => {
        this.currentName = value;
    }
});
```

---

## Widget System {#widgets}

OWL integrates with Odoo's widget system.

### Using Widgets in OWL

```xml
<t t-name="widget.example">
    <!-- Field with widget -->
    <div class="o_field_widget" name="phone">
        <span t-esc="record.phone.value" 
               t-attf-class="o_phone #{record.phone_incoming ? 'ringing' : ''}"/>
    </div>
    
    <!-- Many2one -->
    <div class="o_field_many2one">
        <span t-esc="record.partner_id[1]"/>
    </div>
    
    <!-- Binary (image) -->
    <img t-if="record.image_128.value" 
         t-att-src="record.image_128.value"/>
</t>
```

### Creating Custom Widgets

```javascript
/** @odoo-module */
import { registry } from "@web/core/registry";

export class RatingWidget extends Component {
    static template = "rating.widget";
    static props = {
        value: Number,
        maxRating: { type: Number, default: 5 },
        onChange: { type: Function, optional: true }
    };
    
    setup() {
        this.state = useState({
            hoverRating: 0
        });
    }
    
    setRating(rating) {
        if (this.props.onChange) {
            this.props.onChange(rating);
        }
    }
}

registry.category("webComponents").add("rating.widget", RatingWidget);
```

---

## Testing {#testing}

Testing OWL components is crucial for maintainability.

### Basic Test

```javascript
// my_module/tests/my_component_tests.js
import { expect, describe, it } from "@odoo/hoot";
import { mount } from "@web/core/utils/render_service_mocks";
import { MyComponent } from "../my_component";

describe("MyComponent", () => {
    it("renders correctly", async () => {
        const component = await mount(MyComponent, {
            props: {}
        });
        
        expect(component.el.textContent).toContain("Hello");
    });
    
    it("responds to click", async () => {
        const component = await mount(MyComponent, {
            props: {}
        });
        
        expect(component.state.count).toBe(0);
        
        // Click the increment button
        component.el.querySelector(".increment").click();
        
        expect(component.state.count).toBe(1);
    });
});
```

### Testing RPC Calls

```javascript
import { patch } from "@web/core/utils/render_service_mocks";
import { ormService } from "@web/core/orm_service";

describe("PartnerForm", () => {
    it("creates a partner", async () => {
        // Mock the ORM service
        patch(ormService, {
            create: (model, data) => {
                expect(model).toBe("res.partner");
                expect(data.name).toBe("Test Partner");
                return Promise.resolve(1);  // Return new ID
            }
        });
        
        const component = await mount(PartnerForm, {
            props: {}
        });
        
        component.state.name = "Test Partner";
        await component.save();
        
        // Verify notification was called
    });
});
```

---

## Migration Guide {#migration}

If you're migrating from legacy web client to OWL:

### Key Differences

| Legacy | OWL |
|--------|-----|
| `Widget.extend()` | `class extends Component` |
| `this.$el` | `useRef` or direct DOM |
| `this.do_action()` | `useService("action")` |
| `this.orm` | `useService("orm")` |
| `def setup()` | `setup() { }` |
| `start()` | No needed - setup is async |

### Common Migration Patterns

```javascript
// OLD: Widget
var MyWidget = Widget.extend({
    start: function() {
        this.$el.find('.btn').on('click', this.onClick.bind(this));
    },
    onClick: function() {
        this.do_action({
            type: 'ir.actions.act_window',
            res_model: 'res.partner',
        });
    }
});

// NEW: OWL Component
export class MyComponent extends Component {
    static template = "my.component";
    static components = {};
    
    setup() {
        this.action = useService("action");
    }
    
    async onClick() {
        await this.action.doAction({
            type: 'ir.actions.act_window',
            res_model: 'res.partner',
        });
    }
}
```

---

## Common Pitfalls {#pitfalls}

A few things that trip people up:

### 1. Forgetting useState

```javascript
// ❌ WRONG - won't trigger re-render
this.count = 0;

// ✅ CORRECT
this.state = useState({ count: 0 });
this.state.count = 0;
```

### 2. Not Using the Right Service

```javascript
// ❌ WRONG - using fetch or axios
fetch('/api/partner').then(...)

// ✅ CORRECT - use Odoo's ORM
this.orm = useService("orm");
this.orm.searchRead("res.partner", ...);
```

### 3. Mutating Arrays Incorrectly

```javascript
// ❌ WRONG - won't trigger re-render
this.state.items.push(newItem);

// ✅ CORRECT - replace the array
this.state.items = [...this.state.items, newItem];

// Or use reactive array methods in OWL 2.0
this.state.items.push(newItem);  // Works in OWL 2.0!
```

### 4. Not Handling Loading States

```javascript
setup() {
    this.state = useState({ loading: true });
    
    useEffect(() => {
        this.loadData();
    }, []);
}
```

---

## Conclusion

OWL is a significant improvement over Odoo's legacy web client. The learning curve is worth it:

- Cleaner, more maintainable code
- Better performance out of the box
- Easier to test
- More enjoyable development experience

Start with simple components, then gradually add complexity. The patterns in this guide will take you from beginner to confident OWL developer.

The best way to learn is by building. Start with a simple form, then add lists, then dialogs. You'll get comfortable with OWL before you know it.

What's your experience with OWL been like? Let me know in the comments!
