---
layout: post
title: "Odoo OWL: A Practical Guide for Odoo 17"
date: 2025-02-15 10:00:00 +0000
categories: [Odoo Dev, OWL, JavaScript]
tags: [odoo, odoo-owl, javascript, frontend, components, tutorial, odoo 17, odoo developer, odoo customization, web development]
reading_time: 18
excerpt: "How I build frontend pieces in Odoo 17 with OWL: module setup, templates, hooks, services, forms, dialogs, field widgets and tests, plus the mistakes that cost me the most time."
---

If you write frontend code for Odoo 17, you're writing OWL. There isn't really another option anymore.

OWL (Odoo Web Library) has been around since Odoo 14. In 16, most of the web client moved over to OWL 2, and by 17 the old widget framework is essentially gone. It looks a lot like React or Vue at first glance: components, reactive state, templates. But it's built around Odoo's needs, and it plugs straight into Odoo's services, registries and views.

I've been building OWL components for about a year. This guide is what I wish I'd had at the start. It's long, so here's the map:

1. [Why OWL](#why-owl)
2. [Module setup](#module-setup)
3. [Component basics](#component-basics)
4. [Templates](#templates)
5. [Hooks](#hooks-deep)
6. [Odoo services](#services)
7. [Props and events](#props-events)
8. [Forms](#forms)
9. [Lists](#lists)
10. [Dialogs](#dialogs)
11. [Custom field widgets](#widgets)
12. [Testing](#testing)
13. [Coming from the legacy widgets](#migration)
14. [Mistakes I keep seeing](#pitfalls)

---

## Why OWL {#why-owl}

If you've only seen the old web client, here's what a widget used to look like:

```javascript
// Legacy widget (Odoo 14 and earlier)
var MyWidget = Widget.extend({
    events: {
        'click .btn': '_onClick',
    },
    _onClick: function () {
        this.$('.counter').text(++this.count);
    },
});
```

You held the state yourself and updated the DOM by hand with jQuery. Once a widget got big, keeping the two in sync turned into most of the work.

The same idea in OWL:

```javascript
import { Component, useState } from "@odoo/owl";

export class MyComponent extends Component {
    static template = "my_module.MyComponent";

    setup() {
        this.state = useState({ count: 0 });
    }

    onClick() {
        this.state.count++;   // the template re-renders on its own
    }
}
```

You change the state and the template takes care of the DOM. Data goes down through props, changes go up through callbacks, and every component is a class you can test on its own. That's most of the pitch.

---

## Module setup {#module-setup}

Here's the module layout I'll use for the rest of this post:

```text
my_module/
├── __init__.py
├── __manifest__.py
├── views/
│   └── actions.xml
└── static/
    ├── src/
    │   ├── components/
    │   │   ├── counter.js
    │   │   └── counter.xml
    │   └── dashboard/
    │       ├── dashboard.js
    │       ├── dashboard.xml
    │       └── dashboard.scss
    └── tests/
        └── counter_tests.js
```

### The manifest

```python
# __manifest__.py
{
    'name': 'My OWL Module',
    'version': '17.0.1.0.0',
    'category': 'Tools',
    'depends': ['web'],
    'data': [
        'views/actions.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'my_module/static/src/**/*',
        ],
        'web.qunit_suite_tests': [
            'my_module/static/tests/**/*',
        ],
    },
    'license': 'LGPL-3',
}
```

The glob picks up the JS, the XML templates and the SCSS in one line. That matters more than it looks. If you list your `.js` files one by one and forget the `.xml`, you get a "Missing template" error and spend twenty minutes convinced your component is broken.

### Getting a component on screen

A component needs a way into the UI. The simplest is a client action: register the component under a tag, then point an `ir.actions.client` record and a menu at that tag.

```javascript
/** @odoo-module */
// static/src/dashboard/dashboard.js
import { Component } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { Counter } from "@my_module/components/counter";

export class Dashboard extends Component {
    static template = "my_module.Dashboard";
    static components = { Counter };
    static props = ["*"];   // client actions receive a few props from the action service
}

registry.category("actions").add("my_module.dashboard", Dashboard);
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- static/src/dashboard/dashboard.xml -->
<templates xml:space="preserve">
    <t t-name="my_module.Dashboard">
        <div class="o_my_dashboard p-3">
            <h2>My Dashboard</h2>
            <Counter/>
        </div>
    </t>
</templates>
```

```xml
<?xml version="1.0" encoding="utf-8"?>
<!-- views/actions.xml -->
<odoo>
    <record id="action_my_dashboard" model="ir.actions.client">
        <field name="name">My Dashboard</field>
        <field name="tag">my_module.dashboard</field>
    </record>

    <menuitem id="menu_my_dashboard" name="My Dashboard" action="action_my_dashboard"/>
</odoo>
```

The `/** @odoo-module */` comment tells Odoo's asset bundler to treat the file as an ES module, so `import` and `export` work. Imports between Odoo modules use `@module_name/path`, where the path is relative to `static/src`. That's why `static/src/components/counter.js` is imported as `@my_module/components/counter`.

---

## Component basics {#component-basics}

### The smallest useful component

```javascript
/** @odoo-module */
import { Component } from "@odoo/owl";

export class Hello extends Component {
    static template = "my_module.Hello";
    static props = {};

    setup() {
        this.message = "Hello from OWL";
    }
}
```

```xml
<t t-name="my_module.Hello">
    <p class="o_hello" t-esc="message"/>
</t>
```

`setup()` is where you initialise things. Use it instead of the constructor, because hooks only work inside `setup()`. Inside a template you can refer to anything on the component directly: `message` here means `this.message`.

`static props = {}` says this component takes no props. In dev mode (`?debug=assets`), OWL checks props against that definition and complains loudly when they don't match. It catches a lot of silly mistakes, so I always declare props.

### Adding state

The counter used in the dashboard above:

```javascript
/** @odoo-module */
// static/src/components/counter.js
import { Component, useState } from "@odoo/owl";

export class Counter extends Component {
    static template = "my_module.Counter";
    static props = {};

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
<?xml version="1.0" encoding="UTF-8"?>
<!-- static/src/components/counter.xml -->
<templates xml:space="preserve">
    <t t-name="my_module.Counter">
        <div class="o_counter d-flex align-items-center gap-2">
            <button class="btn btn-secondary o_counter_decrement" t-on-click="decrement">-</button>
            <span class="h3 mb-0 o_counter_value" t-esc="state.count"/>
            <button class="btn btn-secondary o_counter_increment" t-on-click="increment">+</button>
            <button class="btn btn-link" t-on-click="reset">Reset</button>
        </div>
    </t>
</templates>
```

`useState()` wraps the object in a reactive proxy. When `state.count` changes, OWL re-renders the parts of the template that use it. `t-on-click="increment"` calls the component's `increment` method, already bound to the component.

---

## Templates {#templates}

OWL templates are QWeb, the same XML template language Odoo uses for reports and the website, with a few OWL-specific additions.

### The directives you'll use most

| Directive | What it does |
|-----------|--------------|
| `t-esc` | Output a value as escaped text |
| `t-out` | Output a value; HTML is only rendered if it was wrapped with `markup()` |
| `t-if` / `t-elif` / `t-else` | Conditional rendering |
| `t-foreach` + `t-as` + `t-key` | Loops (the key is required) |
| `t-on-*` | Event handlers, e.g. `t-on-click` |
| `t-att-*` / `t-attf-*` | Dynamic attributes / string-formatted attributes |
| `t-model` | Two-way binding between an input and state |
| `t-ref` | Name an element so `useRef` can find it |
| `t-slot` / `t-set-slot` | Render and fill slots |

If you see `t-raw` in older code, it's deprecated in OWL 2. Use `t-out` instead. Only wrap HTML in `markup()` if you trust where it came from.

### Conditionals

```xml
<t t-if="state.user">
    <span>Welcome back, <t t-esc="state.user.name"/></span>
</t>
<t t-else="">
    <a href="/web/login">Log in</a>
</t>
```

### Loops

```xml
<t t-foreach="state.partners" t-as="partner" t-key="partner.id">
    <div class="o_partner_card">
        <span t-esc="partner.name"/>
    </div>
</t>
```

`t-key` is how OWL tells items apart when the list changes. Use a real id, not the loop index, or you'll get strange bugs when rows are added or removed.

### Dynamic attributes

{% raw %}
```xml
<button class="btn" t-att-class="state.active ? 'btn-primary' : 'btn-secondary'">
    Toggle
</button>

<input type="text" class="form-control"
       t-att-disabled="state.readonly"
       t-attf-placeholder="Search {{ props.modelLabel }}..."/>
```
{% endraw %}

A static `class` and a `t-att-class` get merged, so you can keep fixed classes in one and conditional ones in the other.

### Event modifiers

```xml
<form t-on-submit.prevent="onSubmit">...</form>

<button t-on-click.stop="onClick">Don't bubble</button>

<div t-on-click.self="onBackdropClick">Only clicks on this element itself</div>
```

The modifiers OWL supports are `.prevent`, `.stop`, `.self`, `.capture` and `.synthetic`. There's no `.once`.

### Slots

Slots let a parent pass a chunk of template into a child. They're what make reusable wrappers (cards, panels, modals) possible.

```javascript
/** @odoo-module */
import { Component } from "@odoo/owl";

export class Modal extends Component {
    static template = "my_module.Modal";
    static props = {
        title: String,
        onClose: Function,
        slots: { type: Object, optional: true },
    };
}
```

```xml
<t t-name="my_module.Modal">
    <div class="o_my_modal_backdrop">
        <div class="o_my_modal">
            <header class="d-flex justify-content-between">
                <h4 t-esc="props.title"/>
                <button class="btn-close" t-on-click="props.onClose"/>
            </header>
            <div class="o_my_modal_body">
                <t t-slot="default"/>
            </div>
            <footer>
                <t t-slot="footer"/>
            </footer>
        </div>
    </div>
</t>
```

And the parent:

```javascript
/** @odoo-module */
import { Component, useState } from "@odoo/owl";
import { Modal } from "@my_module/components/modal";

export class Parent extends Component {
    static template = "my_module.Parent";
    static components = { Modal };
    static props = {};

    setup() {
        this.state = useState({ showModal: false });
    }

    openModal() {
        this.state.showModal = true;
    }

    closeModal() {
        this.state.showModal = false;
    }

    confirm() {
        // do the thing
        this.closeModal();
    }
}
```

```xml
<t t-name="my_module.Parent">
    <button class="btn btn-primary" t-on-click="openModal">Open</button>

    <Modal t-if="state.showModal" title="'Confirm action'" onClose.bind="closeModal">
        <p>Are you sure?</p>
        <t t-set-slot="footer">
            <button class="btn btn-primary" t-on-click="confirm">Yes</button>
            <button class="btn btn-secondary" t-on-click="closeModal">No</button>
        </t>
    </Modal>
</t>
```

Two details here trip up almost everyone at first. Prop values are JavaScript expressions, so a literal string needs quotes inside the quotes: `title="'Confirm action'"`. And `.bind` on a prop binds the parent's method to the parent, so `this` still works when the child calls it.

In real Odoo code you'd usually use the built-in `Dialog` component instead of writing your own modal. More on that [below](#dialogs).

---
## Hooks {#hooks-deep}

Hooks are functions you call in `setup()` to plug into OWL's reactivity and the component lifecycle. They have to be called in `setup()` (or in a function `setup()` calls), never later inside an event handler.

### useState

```javascript
setup() {
    this.state = useState({
        count: 0,
        items: [],
        form: { name: "", address: { city: "" } },
    });
}

addItem(item) {
    this.state.items.push(item);           // re-renders
}

setCity(city) {
    this.state.form.address.city = city;   // nested changes re-render too
}
```

The reactivity goes deep. Pushing to arrays and changing nested objects all trigger a re-render. What doesn't work is replacing `this.state` itself, or copying values out of it and changing the copies. More on that in the [mistakes section](#pitfalls).

### Lifecycle hooks

These are the ones I use all the time:

```javascript
/** @odoo-module */
import { Component, useState, onWillStart, onMounted, onWillUnmount } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

export class CustomerCount extends Component {
    static template = "my_module.CustomerCount";
    static props = {};

    setup() {
        this.orm = useService("orm");
        this.state = useState({ count: 0 });

        onWillStart(async () => {
            // Runs before the first render, and OWL waits for it
            this.state.count = await this.orm.searchCount("res.partner", [["customer_rank", ">", 0]]);
        });

        onMounted(() => {
            // The DOM exists now: safe to measure elements or start a chart library
        });

        onWillUnmount(() => {
            // Clean up whatever onMounted started
        });
    }
}
```

`onWillStart` is where initial data loading belongs. Because OWL waits for it, the component never renders half-empty, and you often don't need a loading flag at all. There's also `onWillUpdateProps(async (nextProps) => ...)` for reloading data when a parent passes new props.

### useRef

For the rare times you need the actual DOM element:

```javascript
/** @odoo-module */
import { Component, useRef, onMounted } from "@odoo/owl";

export class SearchBox extends Component {
    static template = "my_module.SearchBox";
    static props = {};

    setup() {
        this.inputRef = useRef("searchInput");
        onMounted(() => this.inputRef.el.focus());
    }
}
```

```xml
<t t-name="my_module.SearchBox">
    <input type="text" class="form-control" t-ref="searchInput"/>
</t>
```

`this.inputRef.el` is `null` until the component is mounted, so don't touch it in `setup()` directly.

### useEffect

`useEffect` runs code after rendering, whenever its dependencies change. Unlike React, the dependencies are passed as a function that returns an array, not as an array:

```javascript
/** @odoo-module */
import { Component, useState, useEffect } from "@odoo/owl";

export class PartnerSearch extends Component {
    static template = "my_module.PartnerSearch";
    static props = {};

    setup() {
        this.state = useState({ term: "", results: [] });

        useEffect(
            (term) => {
                // Debounce: search 300ms after the user stops typing
                const timer = setTimeout(() => this.search(term), 300);
                return () => clearTimeout(timer);   // cleanup before the next run and on unmount
            },
            () => [this.state.term]
        );
    }

    async search(term) {
        // ...
    }
}
```

The effect receives the dependency values as arguments. If you return a function, it runs as cleanup.

### useExternalListener

For listening to something outside your component, like `window` or `document`:

```javascript
/** @odoo-module */
import { Component, useState, useExternalListener } from "@odoo/owl";

export class WidthWatcher extends Component {
    static template = "my_module.WidthWatcher";
    static props = {};

    setup() {
        this.state = useState({ width: window.innerWidth });
        useExternalListener(window, "resize", () => {
            this.state.width = window.innerWidth;
        });
    }
}
```

It removes the listener for you when the component goes away, which saves you from a classic memory leak.

---

## Odoo services {#services}

Services are where Odoo keeps everything shared: talking to the server, notifications, dialogs, actions, the current user, and so on. You get one with `useService` from `@web/core/utils/hooks`.

### orm

This is how you talk to models. Use it instead of `fetch`.

```javascript
this.orm = useService("orm");

// Search and read in one call
const partners = await this.orm.searchRead(
    "res.partner",
    [["customer_rank", ">", 0], ["is_company", "=", true]],   // domain
    ["name", "email", "country_id"],                          // fields
    { limit: 50, order: "name" }
);

// create takes a list of records and returns a list of ids
const [partnerId] = await this.orm.create("res.partner", [{ name: "New Partner" }]);

await this.orm.write("res.partner", [partnerId], { phone: "+1 555 0100" });

const [partner] = await this.orm.read("res.partner", [partnerId], ["name", "phone"]);

const count = await this.orm.searchCount("res.partner", [["customer_rank", ">", 0]]);

// Call any public model method: orm.call(model, method, args, kwargs)
await this.orm.call("res.partner", "action_archive", [[partnerId]]);

await this.orm.unlink("res.partner", [partnerId]);
```

That `create` signature catches a lot of people coming from older versions. Since 16 it takes an array and gives you back an array.

### notification

```javascript
this.notification = useService("notification");

this.notification.add("Partner saved", { type: "success" });
this.notification.add("Couldn't reach the shipping API", { type: "danger" });
this.notification.add("Some lines have no product", { type: "warning" });
this.notification.add("Import started", { type: "info" });
```

### dialog

```javascript
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { FormViewDialog } from "@web/views/view_dialogs/form_view_dialog";

this.dialog = useService("dialog");

// Ask before doing something destructive
this.dialog.add(ConfirmationDialog, {
    title: "Delete partner",
    body: "Are you sure? This can't be undone.",
    confirm: async () => {
        await this.orm.unlink("res.partner", [partnerId]);
    },
    cancel: () => {},
});

// Open a record's normal form view in a dialog
this.dialog.add(FormViewDialog, {
    resModel: "res.partner",
    resId: partnerId,
    onRecordSaved: () => this.loadPartners(),
});
```

`FormViewDialog` is very handy. You get the full form view, with all its fields, onchanges and access rules, without writing any of it yourself.

### action

```javascript
this.action = useService("action");

// Open a list/form of records
await this.action.doAction({
    type: "ir.actions.act_window",
    name: "Customers",
    res_model: "res.partner",
    views: [[false, "list"], [false, "form"]],
    domain: [["customer_rank", ">", 0]],
});

// Or run any existing action by its XML id
await this.action.doAction("contacts.action_contacts");
```

### Your own service for shared state

Sooner or later two components that aren't parent and child need to share state. In Odoo you do that with a service that returns a `reactive()` object:

```javascript
/** @odoo-module */
// static/src/services/cart_service.js
import { reactive } from "@odoo/owl";
import { registry } from "@web/core/registry";

export const cartService = {
    start() {
        return reactive({ items: [] });
    },
};

registry.category("services").add("my_cart", cartService);
```

Then in any component:

```javascript
setup() {
    this.cart = useState(useService("my_cart"));
}

addToCart(product) {
    this.cart.items.push(product);   // every component using the cart re-renders
}
```

Wrapping the shared object in `useState` is what subscribes this component to its changes. Without it, the data still changes but your component won't re-render.

---

## Props and events {#props-events}

### Passing props

Props are how a parent hands data to a child:

```javascript
/** @odoo-module */
import { Component } from "@odoo/owl";

export class PartnerCard extends Component {
    static template = "my_module.PartnerCard";
    static props = {
        partner: Object,
        onSelect: Function,
    };

    select() {
        this.props.onSelect(this.props.partner.id);
    }
}
```

```xml
<t t-name="my_module.PartnerCard">
    <div class="o_partner_card" t-on-click="select">
        <span t-esc="props.partner.name"/>
    </div>
</t>
```

In the parent:

```xml
<PartnerCard t-foreach="state.partners" t-as="partner" t-key="partner.id"
             partner="partner"
             onSelect.bind="selectPartner"/>
```

The child never changes its props. It calls a callback, and the parent decides what happens. That's what OWL means by "events" in practice: callbacks passed down as props.

### Validating props

Prop definitions can get quite specific. Defaults go in `defaultProps`, not inside the prop definition:

```javascript
export class MyComponent extends Component {
    static template = "my_module.MyComponent";

    static props = {
        title: String,                                  // required
        size: { type: String, optional: true },
        value: [String, Number],                        // either type
        config: {
            type: Object,
            optional: true,
            shape: {
                editable: Boolean,
                deletable: { type: Boolean, optional: true },
            },
        },
        items: {
            type: Array,
            element: {
                type: Object,
                shape: { id: Number, name: String },
            },
        },
        onChange: { type: Function, optional: true },
        isActive: { type: Boolean, optional: true },
    };

    static defaultProps = {
        size: "medium",
        isActive: true,
    };
}
```

OWL only checks these in dev mode, so there's no cost in production. Be generous with them.

---
## Forms {#forms}

Before writing a custom form, check whether the standard form view or a `FormViewDialog` already does what you need. Usually it does. When you do need one (a wizard-like screen, a simplified entry page), this is the shape I use.

```javascript
/** @odoo-module */
import { Component, useState, onWillStart } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

export class PartnerForm extends Component {
    static template = "my_module.PartnerForm";
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
            errors: {},
            saving: false,
        });

        onWillStart(async () => {
            if (this.props.partnerId) {
                const [partner] = await this.orm.read(
                    "res.partner",
                    [this.props.partnerId],
                    ["name", "email", "phone"]
                );
                this.state.name = partner.name;
                this.state.email = partner.email || "";
                this.state.phone = partner.phone || "";
            }
        });
    }

    validate() {
        const errors = {};
        if (!this.state.name.trim()) {
            errors.name = "Name is required";
        }
        if (this.state.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.state.email)) {
            errors.email = "That doesn't look like an email address";
        }
        this.state.errors = errors;
        return Object.keys(errors).length === 0;
    }

    async save() {
        if (!this.validate()) {
            return;
        }
        this.state.saving = true;
        const values = {
            name: this.state.name,
            email: this.state.email,
            phone: this.state.phone,
        };
        try {
            let partnerId = this.props.partnerId;
            if (partnerId) {
                await this.orm.write("res.partner", [partnerId], values);
            } else {
                [partnerId] = await this.orm.create("res.partner", [values]);
            }
            this.notification.add("Partner saved", { type: "success" });
            this.props.onSave?.(partnerId);
        } finally {
            this.state.saving = false;
        }
    }

    cancel() {
        this.props.onCancel?.();
    }
}
```

There's no `catch` in `save()` on purpose. If the server raises a `ValidationError` or `UserError`, Odoo's error service already shows the message in a dialog. Catching it here would just hide a useful message from the user. The `finally` makes sure the button comes back either way.

The errors live in `state` too. If they lived on `this.errors`, the template wouldn't re-render when they changed, and on the first render they'd be `undefined`.

```xml
<t t-name="my_module.PartnerForm">
    <div class="o_partner_form">
        <div class="mb-3">
            <label class="form-label" for="partner_name">Name</label>
            <input id="partner_name" type="text" class="form-control"
                   t-att-class="{ 'is-invalid': state.errors.name }"
                   t-model="state.name"/>
            <div t-if="state.errors.name" class="invalid-feedback" t-esc="state.errors.name"/>
        </div>

        <div class="mb-3">
            <label class="form-label" for="partner_email">Email</label>
            <input id="partner_email" type="email" class="form-control"
                   t-att-class="{ 'is-invalid': state.errors.email }"
                   t-model="state.email"/>
            <div t-if="state.errors.email" class="invalid-feedback" t-esc="state.errors.email"/>
        </div>

        <div class="mb-3">
            <label class="form-label" for="partner_phone">Phone</label>
            <input id="partner_phone" type="tel" class="form-control" t-model="state.phone"/>
        </div>

        <div class="d-flex gap-2">
            <button type="button" class="btn btn-primary"
                    t-att-disabled="state.saving" t-on-click="save">
                <t t-if="state.saving">Saving...</t>
                <t t-else="">Save</t>
            </button>
            <button type="button" class="btn btn-secondary" t-on-click="cancel">Cancel</button>
        </div>
    </div>
</t>
```

`t-model` keeps the input and the state in sync both ways, so there's no `onInput` handler to write.

---

## Lists {#lists}

A paginated list of customers with an edit button on each row:

```javascript
/** @odoo-module */
import { Component, useState, onWillStart } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

export class PartnerList extends Component {
    static template = "my_module.PartnerList";
    static props = {};

    setup() {
        this.orm = useService("orm");
        this.action = useService("action");
        this.limit = 20;
        this.state = useState({ partners: [], total: 0, page: 1 });

        onWillStart(() => this.load());
    }

    async load() {
        const domain = [["customer_rank", ">", 0]];
        const [partners, total] = await Promise.all([
            this.orm.searchRead("res.partner", domain, ["name", "email", "phone"], {
                limit: this.limit,
                offset: (this.state.page - 1) * this.limit,
                order: "name, id",
            }),
            this.orm.searchCount("res.partner", domain),
        ]);
        this.state.partners = partners;
        this.state.total = total;
    }

    get pageCount() {
        return Math.max(1, Math.ceil(this.state.total / this.limit));
    }

    async goToPage(page) {
        this.state.page = Math.min(Math.max(1, page), this.pageCount);
        await this.load();
    }

    editPartner(partnerId) {
        this.action.doAction({
            type: "ir.actions.act_window",
            res_model: "res.partner",
            res_id: partnerId,
            views: [[false, "form"]],
        });
    }
}
```

```xml
<t t-name="my_module.PartnerList">
    <div class="o_partner_list">
        <table class="table table-hover">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th/>
                </tr>
            </thead>
            <tbody>
                <tr t-foreach="state.partners" t-as="partner" t-key="partner.id">
                    <td t-esc="partner.name"/>
                    <td t-esc="partner.email || ''"/>
                    <td t-esc="partner.phone || ''"/>
                    <td class="text-end">
                        <button class="btn btn-sm btn-primary"
                                t-on-click="() => this.editPartner(partner.id)">
                            Edit
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>

        <p t-if="!state.partners.length" class="text-muted">No customers found.</p>

        <div class="d-flex align-items-center gap-2">
            <button class="btn btn-secondary" t-att-disabled="state.page === 1"
                    t-on-click="() => this.goToPage(state.page - 1)">Previous</button>
            <span>Page <t t-esc="state.page"/> of <t t-esc="pageCount"/></span>
            <button class="btn btn-secondary" t-att-disabled="state.page === pageCount"
                    t-on-click="() => this.goToPage(state.page + 1)">Next</button>
        </div>
    </div>
</t>
```

A few notes:

- The records and the count load in parallel with `Promise.all`, so you wait for one round trip instead of two.
- Empty char fields come back from the server as `false`, not `""`. That's what the `|| ''` is for.
- When you need to pass an argument to a handler, use an inline arrow function, as in `t-on-click="() => this.editPartner(partner.id)"`.
- Odoo has its own `Pager` component (`@web/core/pager/pager`). Use it if you want the list to look like the rest of the backend. I built the buttons by hand here to keep the example readable.

---

## Dialogs {#dialogs}

For yes/no questions, use `ConfirmationDialog` as shown in the [services section](#services). For anything custom, build on Odoo's `Dialog` component rather than writing your own modal. You get the right markup, keyboard handling and stacking for free.

```javascript
/** @odoo-module */
import { Component, useState } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";

export class RenameDialog extends Component {
    static template = "my_module.RenameDialog";
    static components = { Dialog };
    static props = {
        title: String,
        initialValue: { type: String, optional: true },
        onConfirm: Function,
        close: Function,   // passed in automatically by the dialog service
    };

    setup() {
        this.state = useState({ value: this.props.initialValue || "" });
    }

    async confirm() {
        await this.props.onConfirm(this.state.value);
        this.props.close();
    }
}
```

```xml
<t t-name="my_module.RenameDialog">
    <Dialog title="props.title" size="'md'">
        <input type="text" class="form-control" t-model="state.value"/>
        <t t-set-slot="footer">
            <button class="btn btn-primary" t-on-click="confirm">Save</button>
            <button class="btn btn-secondary" t-on-click="props.close">Cancel</button>
        </t>
    </Dialog>
</t>
```

Opening it:

```javascript
this.dialog.add(RenameDialog, {
    title: "Rename partner",
    initialValue: partner.name,
    onConfirm: (name) => this.orm.write("res.partner", [partner.id], { name }),
});
```

The dialog service always passes a `close` prop to the component it opens. If your props definition doesn't include it, dev mode will tell you right away.

---

## Custom field widgets {#widgets}

This is where OWL connects to normal Odoo views. A field widget is a component that renders one field of a record in a form or list view. Here's a simple star rating for an integer field:

```javascript
/** @odoo-module */
import { Component } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { standardFieldProps } from "@web/views/fields/standard_field_props";

export class RatingField extends Component {
    static template = "my_module.RatingField";
    static props = { ...standardFieldProps };

    get value() {
        return this.props.record.data[this.props.name] || 0;
    }

    setRating(value) {
        if (this.props.readonly) {
            return;
        }
        this.props.record.update({ [this.props.name]: value });
    }
}

registry.category("fields").add("rating_stars", {
    component: RatingField,
    supportedTypes: ["integer"],
});
```

```xml
<t t-name="my_module.RatingField">
    <div class="o_rating_stars d-inline-flex gap-1">
        <t t-foreach="[1, 2, 3, 4, 5]" t-as="star" t-key="star">
            <i class="fa"
               t-att-class="star &lt;= value ? 'fa-star text-warning' : 'fa-star-o'"
               t-on-click="() => this.setRating(star)"/>
        </t>
    </div>
</t>
```

Then in any form or list view:

```xml
<field name="satisfaction" widget="rating_stars"/>
```

`standardFieldProps` gives you `record`, `name`, `readonly` and the rest of what every field receives. You read the value from `record.data` and write it back with `record.update()`. The view takes care of saving, dirty state and onchanges.

Two caveats. In Odoo 16 you register the component class directly, not the `{ component }` object; the object form is new in 17. And Odoo already ships a `priority` widget that does stars, so treat this as a pattern to copy, not something you need to build.

---

## Testing {#testing}

Odoo 17 runs its JavaScript tests with QUnit. Test files go in the `web.qunit_suite_tests` bundle (the manifest earlier already does this) and you run them by opening `/web/tests` in the browser.

A test for the counter:

```javascript
/** @odoo-module */
// static/tests/counter_tests.js
import { getFixture, mount, click } from "@web/../tests/helpers/utils";
import { makeTestEnv } from "@web/../tests/helpers/mock_env";
import { Counter } from "@my_module/components/counter";

QUnit.module("my_module.Counter", (hooks) => {
    let target;

    hooks.beforeEach(() => {
        target = getFixture();
    });

    QUnit.test("increments on click", async (assert) => {
        const env = await makeTestEnv();
        await mount(Counter, target, { env });

        assert.strictEqual(target.querySelector(".o_counter_value").textContent, "0");
        await click(target, ".o_counter_increment");
        assert.strictEqual(target.querySelector(".o_counter_value").textContent, "1");
    });
});
```

The `o_counter_*` classes in the template are there for exactly this: selectors that won't break when someone changes the styling.

For components that call the server, you pass a `mockRPC` function to `makeTestEnv` and return fake responses for the routes you care about. The best reference I've found is Odoo's own tests under `addons/web/static/tests/`. There are examples for nearly every situation.

One heads-up: Odoo 18 replaced QUnit with its own framework, Hoot. Expect to rewrite these tests when you upgrade.

---

## Coming from the legacy widgets {#migration}

If you're porting old `Widget.extend` code, this is roughly how things map:

| Legacy widget | OWL |
|---------------|-----|
| `Widget.extend({ ... })` | `class MyThing extends Component` |
| `init()` / `willStart()` | `setup()` + `onWillStart()` |
| `start()` | `onMounted()` |
| `this.$el` / jQuery lookups | `t-ref` + `useRef()` |
| `events: { 'click .btn': '_onClick' }` | `t-on-click="onClick"` in the template |
| `this._rpc(...)` | `useService("orm")` |
| `this.do_action(...)` | `useService("action").doAction(...)` |

```javascript
// Before: legacy widget
var MyWidget = Widget.extend({
    events: {
        'click .o_open_partners': '_onOpenPartners',
    },
    _onOpenPartners: function () {
        this.do_action({
            type: 'ir.actions.act_window',
            res_model: 'res.partner',
            views: [[false, 'list']],
        });
    },
});

// After: OWL component
export class MyComponent extends Component {
    static template = "my_module.MyComponent";
    static props = {};

    setup() {
        this.action = useService("action");
    }

    async openPartners() {
        await this.action.doAction({
            type: "ir.actions.act_window",
            res_model: "res.partner",
            views: [[false, "list"]],
        });
    }
}
```

Don't port line by line. The jQuery DOM-patching code usually disappears completely once the state lives in `useState` and the template does the rendering.

---

## Mistakes I keep seeing {#pitfalls}

### 1. The template isn't in the assets bundle

"Missing template: my_module.Something" almost always means the `.xml` file isn't listed in the manifest's `assets`. Use the `static/src/**/*` glob and this one goes away.

### 2. Passing a string prop without quotes

```xml
<!-- Wrong: OWL tries to evaluate Hello as a variable -->
<MyComponent title="Hello"/>

<!-- Right -->
<MyComponent title="'Hello'"/>
```

### 3. State that isn't reactive

```javascript
// Wrong: plain property, changing it won't re-render
this.count = 0;

// Wrong: replacing the reactive object after setup breaks the link
this.state = { count: 1 };

// Wrong: count is now a plain number, disconnected from state
const { count } = this.state;

// Right: create it once with useState, then mutate it
this.state = useState({ count: 0 });
this.state.count++;
```

### 4. Loading data in setup() without onWillStart

If you call an async load from `setup()` without `onWillStart`, the component renders first with empty data, then again when the data arrives. Sometimes you want that, if you're showing a spinner on purpose. Usually you don't.

### 5. Using fetch instead of the orm service

```javascript
// Wrong: no session handling, no error dialogs, no context
fetch("/web/dataset/call_kw/res.partner/search_read", { method: "POST", body: payload });

// Right
const partners = await this.orm.searchRead("res.partner", domain, fields);
```

For your own controllers, use the `rpc` service, which goes through the same error handling.

---

## Wrapping up

OWL takes a few days to click, mostly because of the Odoo-specific parts: registries, services, assets, and the way templates evaluate expressions. Once it does, frontend work in Odoo becomes a lot less painful than it used to be.

If you're starting out, build the counter and the client action first, then a list that loads real data, then a field widget. By the time those three work, you've touched most of what's in this post.

If you get stuck on something OWL-related, send me an email at contact@babatopeajepe.com. I'm always curious what trips people up.
