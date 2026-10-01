---
layout: post
title: "Upgrading Odoo 14 to 16: How I Actually Do It"
date: 2024-01-05 09:00:00 +0000
categories: [Odoo Dev, Migration, Best Practices]
tags: [odoo, migration, upgrade, best-practices, database, odoo upgrade, odoo migration service, odoo consultant, odoo specialist]
reading_time: 17
excerpt: "The process I follow to take an Odoo 14 database to 16: a staging copy that can't email anyone, the upgrade service or OpenUpgrade for standard modules, porting custom code, migration scripts, and a cutover I can roll back."
---

I've taken several client databases from Odoo 14 to 16 now, and by this point I follow the same process every time. This post walks through it, with the commands and code I actually use.

First, a ground rule. You don't upgrade an Odoo database by editing its tables. The standard modules get migrated by tooling: Odoo's upgrade service if you're on Enterprise, OCA's OpenUpgrade if you're on Community. Your custom modules get migrated by you, with ported code and migration scripts that Odoo runs while it updates the module. If a guide tells you to run `UPDATE` statements against `ir_module_module` or search-and-replace inside `ir_ui_view`, ignore it.

## Set up a 16 environment

Odoo 16 itself runs on Python 3.7 and later. I still build the 16 environment on Python 3.10, because 17 needs it, so the next upgrade starts with the interpreter already sorted. On Ubuntu 22.04 it's the system Python anyway.

```bash
python3.10 -m venv ~/venvs/odoo16
source ~/venvs/odoo16/bin/activate

git clone --depth 1 -b 16.0 https://github.com/odoo/odoo.git /opt/odoo16/odoo
# Enterprise only (needs access to the private repo)
git clone --depth 1 -b 16.0 git@github.com:odoo/enterprise.git /opt/odoo16/enterprise

pip install --upgrade pip wheel
pip install -r /opt/odoo16/odoo/requirements.txt
```

Install the requirements from the 16.0 checkout, not from a URL. The `requirements.txt` on `master` pins versions for whatever Odoo is currently developing, which isn't 16. `psycopg2` and `python-ldap` are compiled from source, so on Debian or Ubuntu install `gcc`, `python3.10-dev`, `libpq-dev`, `libldap2-dev` and `libsasl2-dev` first.

Then point `addons_path` in `odoo16.conf` at the 16.0 core addons, Enterprise if you have it, the 16.0 branches of any OCA repos you depend on, and the folder your ported modules will live in. `odoo-bin` is in the root of the 16.0 checkout; every command below assumes that config.

## Find out how much work it is

Before I give anyone an estimate, I grep the custom addons for the patterns I know will need work going from 14 to 16. It's crude, but it turns "how big is this upgrade?" into a list of files.

```bash
cd /opt/odoo14/custom

# Assets declared through XML templates (moved to the manifest's 'assets' key in 15)
grep -rnE --include='*.xml' 'inherit_id="[a-z_]+\.[a-z_]*assets' .
grep -rnE --include='__manifest__.py' "[\"']qweb[\"']" .

# Legacy JS that will probably need rewriting as OWL
grep -rnE --include='*.js' "odoo\.define\(|web\.(AbstractField|Widget|field_registry|basic_fields)" .

# View manipulation in Python (deprecated in 16, and silently ignored by the web client)
grep -rn --include='*.py' 'fields_view_get' .

# Accounting code that the 16 refactor removed
grep -rnE --include='*.py' --include='*.xml' \
    'exclude_from_invoice_tab|_recompute_dynamic_lines|_recompute_tax_lines|_recompute_payment_terms_lines' .

# Deprecated QWeb directive (use t-out)
grep -rn --include='*.xml' 't-raw' .
```

In a 14 codebase the `odoo.define` pattern matches nearly every JS file. Every hit is a file someone has to look at.

The other half of the audit is dependencies. Every module in every `depends` list has to exist in 16. Some standard modules were renamed or merged between 14 and 16 (`sale_coupon` is gone, for example; 16 replaced it with `sale_loyalty`), and an OCA module only exists in 16 once somebody has ported it. This script lists the dependencies it can't find:

```python
#!/usr/bin/env python3
"""Print manifest dependencies that don't exist in the given Odoo 16 addons paths.

Usage: check_deps.py CUSTOM_DIR ADDONS_PATH [ADDONS_PATH ...]
"""
import ast
import sys
from pathlib import Path

custom_dir = Path(sys.argv[1])
search_paths = [custom_dir] + [Path(p) for p in sys.argv[2:]]

available = {
    manifest.parent.name
    for path in search_paths
    for manifest in path.glob('*/__manifest__.py')
}

for manifest in sorted(custom_dir.glob('*/__manifest__.py')):
    depends = ast.literal_eval(manifest.read_text()).get('depends', [])
    missing = sorted(set(depends) - available)
    if missing:
        print(f"{manifest.parent.name}: {', '.join(missing)}")
```

```bash
python3 check_deps.py /opt/odoo14/custom \
    /opt/odoo16/odoo/odoo/addons /opt/odoo16/odoo/addons \
    /opt/odoo16/enterprise /opt/odoo16/oca/*
```

Note the two core paths: `base` lives in `odoo/odoo/addons`, everything else in `odoo/addons`. For OCA, clone each repo you use at its 16.0 branch. If a module isn't there, search that repo's pull requests for `[16.0][MIG] module_name`. Quite often someone has a port in progress that you can test or help finish.

## Port the code

This is where most of the hours go. These are the changes I end up making on nearly every 14 to 16 port.

### Assets move into the manifest

In 14, you added JS and SCSS to the backend by inheriting the asset template:

```xml
<odoo>
    <template id="assets_backend" inherit_id="web.assets_backend">
        <xpath expr="." position="inside">
            <script type="text/javascript" src="/my_module/static/src/js/my_widget.js"/>
            <link rel="stylesheet" type="text/scss" href="/my_module/static/src/scss/my_module.scss"/>
        </xpath>
    </template>
</odoo>
```

In 16, that file goes away (remove it from `data` too) and the bundle is declared in `__manifest__.py`:

```python
{
    'name': 'My Module',
    'version': '16.0.1.0.0',
    'license': 'LGPL-3',
    'depends': ['web'],
    'assets': {
        'web.assets_backend': [
            'my_module/static/src/**/*',
        ],
    },
}
```

Paths start with the module name, not a slash. The old `qweb` manifest key is gone as well. In 16, XML templates go in the same bundle as the JS that uses them.

### `fields_view_get` becomes `_get_view`

This one is sneaky because nothing errors. `fields_view_get` still exists in 16 as a deprecated method, but the web client loads views through `get_views`, which never calls it. Your override just stops having any effect.

A typical 14 override, including the `modifiers` JSON dance you needed to make `readonly` actually stick:

```python
import json

from lxml import etree

from odoo import api, models


class ResPartner(models.Model):
    _inherit = 'res.partner'

    @api.model
    def fields_view_get(self, view_id=None, view_type='form', toolbar=False, submenu=False):
        res = super().fields_view_get(
            view_id=view_id, view_type=view_type, toolbar=toolbar, submenu=submenu
        )
        if view_type == 'form':
            doc = etree.XML(res['arch'])
            for node in doc.xpath("//field[@name='ref']"):
                node.set('readonly', '1')
                modifiers = json.loads(node.get('modifiers') or '{}')
                modifiers['readonly'] = True
                node.set('modifiers', json.dumps(modifiers))
            res['arch'] = etree.tostring(doc, encoding='unicode')
        return res
```

The 16 version is shorter. `_get_view` hands you the arch as an lxml element before Odoo post-processes it, so a plain attribute is enough:

```python
from odoo import api, models


class ResPartner(models.Model):
    _inherit = 'res.partner'

    @api.model
    def _get_view(self, view_id=None, view_type='form', **options):
        arch, view = super()._get_view(view_id, view_type, **options)
        if view_type == 'form':
            for node in arch.xpath("//field[@name='ref']"):
                node.set('readonly', '1')
        return arch, view
```

One catch: 16 caches the result of `_get_view` per view, language and a few context keys. If your old override looked at the current user or a context value, that result now gets cached and served to everyone. For user-dependent changes, set a `groups` attribute on the node and let Odoo strip it per user. For context-dependent ones, extend `_get_view_cache_key`.

### Invoice lines: `exclude_from_invoice_tab` is gone

16 reworked `account.move.line`. Every journal item now has a `display_type`: `product`, `tax`, `payment_term`, `rounding`, `line_section`, `line_note`, plus `cogs` and `epd` for cost of goods sold and early payment discounts. Code that picked out the product lines in 14:

```python
product_lines = move.line_ids.filtered(
    lambda l: not l.exclude_from_invoice_tab and not l.display_type
)
```

becomes this in 16:

```python
product_lines = move.line_ids.filtered(lambda l: l.display_type == 'product')
```

Domains in views and `search()` calls need the same change. If you want exactly what the Invoice Lines tab shows (products plus sections and notes), use `('display_type', 'in', ('product', 'line_section', 'line_note'))`.

The real work is any override of `_recompute_dynamic_lines`, `_recompute_tax_lines` or the invoice onchanges that added or adjusted lines. That mechanism no longer exists. In 16, tax and payment term lines come from computed fields and `_sync_dynamic_lines`, so those overrides need rewriting against the new compute methods; you can't translate them line by line. Test them with real documents from the copy: credit notes, foreign currency invoices, cash rounding.

### Legacy JS field widgets need rewriting in OWL

On every 14 to 16 upgrade I've done, this was the biggest chunk of work. In 16 the form, list and kanban views are OWL components, and they look up field widgets in the new `fields` registry. A widget that extends `AbstractField` and registers in `web.field_registry` simply isn't found there, so it has to be rewritten as an OWL component. Legacy client actions still run in 16 through a compatibility layer, but I usually port them in the same pass rather than maintain two frameworks.

I've since written a [separate post on OWL]({% post_url 2025-02-15-odoo-owl-tutorial-beginner-to-advanced %}). It targets 17, where the field API changed again, but the component basics carry over to 16.

### QWeb: `t-raw` becomes `t-out`

```xml
<!-- 14 -->
<div t-raw="doc.note"/>

<!-- 16 -->
<div t-out="doc.note"/>
```

`t-raw` still renders in 16, but every template that uses it logs a deprecation warning. `t-out` escapes its value unless it's `Markup`. Html fields (like `sale.order.note` in 16) already return `Markup`, so they render as before. If you build an HTML string in Python and pass it to a report, wrap it in `markupsafe.Markup`, or it'll show up as escaped tags in the PDF.

What you can leave alone: `attrs` and `states` in views still work in 16. They're removed in 17, so don't rewrite them now unless you're going straight to 17.

Before going anywhere near a copy of production, I install each ported module on an empty 16 database:

```bash
odoo-bin -c odoo16.conf -d empty16 -i my_module --stop-after-init
```

That catches broken xpaths against changed standard views, references to fields that no longer exist and bad manifests, without waiting on a full update of a production-sized database every time.

## Get a safe copy of production

Never upgrade production in place. Every run happens on a copy, and production stays on 14 until cutover.

A backup is two things: the PostgreSQL database and the filestore. Attachments are stored on disk, not in the database, so a dump without the filestore restores into a system where every PDF, image and attached document is missing.

```bash
pg_dump -Fc -d prod_db -f prod_db_$(date +%Y%m%d).dump
tar -czf filestore_$(date +%Y%m%d).tar.gz -C ~/.local/share/Odoo/filestore prod_db
```

`~/.local/share/Odoo/filestore/<dbname>` is the default, for the system user Odoo runs as. If `data_dir` is set in your config, the filestore is under that instead.

Restore both on the staging server. The filestore folder has to be named after the database, hence the `mv`:

```bash
createdb staging_db
pg_restore --no-owner -d staging_db prod_db_20240105.dump

mkdir -p ~/.local/share/Odoo/filestore
tar -xzf filestore_20240105.tar.gz -C ~/.local/share/Odoo/filestore
mv ~/.local/share/Odoo/filestore/prod_db ~/.local/share/Odoo/filestore/staging_db
```

Now make it harmless before anything else touches it. Odoo 16 has `odoo-bin neutralize`, which archives the mail servers (and adds a fake one, so Odoo can't fall back to the SMTP server from your config), disables crons, disables payment providers, switches shipping connectors to test mode, and so on. It works by running a `neutralize.sql` from each installed module, though, and those files expect 16 tables. So on the restored 14 copy I do the minimum by hand:

```sql
-- staging_db only
UPDATE ir_mail_server SET active = false;
UPDATE ir_cron SET active = false;
```

Add `UPDATE fetchmail_server SET active = false;` if the fetchmail module is installed. Also keep in mind that with every mail server archived, Odoo falls back to `smtp_server` in the config file, which defaults to localhost. I point `smtp_server` and `smtp_port` in the staging config at a Mailpit instance, so nothing leaves the box and I can still see what would have been sent.

After the database is on 16 and your modules are updated, run the real thing. A module update can switch records from data files back on, so it's worth doing even if you neutralized before:

```bash
odoo-bin neutralize -c odoo16.conf -d staging_db
```

`--stdout` prints the SQL instead of running it, if you want to see what it touches. What it doesn't know about is your own stuff: API keys and endpoints that custom modules keep in `ir.config_parameter` or their own models, automated actions that call external services on create or write (those fire when users click, not on a cron), and OCA's `queue_job` if it's in `server_wide_modules`, because its job runner ignores crons entirely. I go through those by hand and point integrations at the partner's sandbox where there is one.

## Upgrade the standard modules

### Enterprise: Odoo's upgrade service

With an Enterprise subscription, Odoo migrates the standard modules for you. From the staging server:

```bash
python <(curl -s https://upgrade.odoo.com/upgrade) test -d staging_db -t 16.0
```

The script dumps the database, uploads it and restores the upgraded result as a new local database (`--restore-name` sets the name; below I'll keep calling it `staging_db`). Your attachments are never uploaded. The service only sends back files the upgrade itself created, and the script merges those into a copy of your filestore if it finds the original in the default location; otherwise that merge is manual. Test databases come back neutralized.

Custom modules come through installed but not upgraded, with their tables and columns waiting for your 16 code.

### Community: OpenUpgrade

On Community, OCA's OpenUpgrade does the same job, one major version at a time: 14 to 15, then 15 to 16. You can't skip 15. Each step runs that version of Odoo with the matching OpenUpgrade branch, with `openupgrade_framework` and `openupgrade_scripts` in the addons path and `openupgradelib` installed in the venv:

```bash
pip install git+https://github.com/OCA/openupgradelib.git@master

# Step 1: Odoo 15 code, OpenUpgrade 15.0
odoo-bin -c odoo15.conf -d staging_db \
    --upgrade-path=/opt/OpenUpgrade-15.0/openupgrade_scripts/scripts \
    --load=base,web,openupgrade_framework \
    -u all --stop-after-init

# Step 2: Odoo 16 code, OpenUpgrade 16.0
odoo-bin -c odoo16.conf -d staging_db \
    --upgrade-path=/opt/OpenUpgrade-16.0/openupgrade_scripts/scripts \
    --load=base,web,openupgrade_framework \
    -u all --stop-after-init
```

Check OpenUpgrade's coverage list for both 15.0 and 16.0 before you promise anyone a date. A standard module without migration scripts still gets updated, but nothing migrates its data if its models changed. That part becomes your job.

## Upgrade your own modules

With the standard modules on 16, add your ported modules to the addons path and update everything:

```bash
odoo-bin -c odoo16.conf -d staging_db -u all --stop-after-init --logfile=upgrade.log
grep -E ' (ERROR|CRITICAL|WARNING) ' upgrade.log
```

Read the warnings as well as the errors. Deprecated calls, leftover `t-raw`, and fields that share a label all show up as warnings, and they're much cheaper to fix now than after go-live.

### Migration scripts

Ported code makes the module work on 16. Migration scripts take care of its data. Odoo runs them during the update when the version in `__manifest__.py` is higher than the version recorded as installed, and it looks for them in a `migrations` folder:

```text
my_module/
├── __manifest__.py        # 'version': '16.0.1.1.0'
└── migrations/
    └── 16.0.1.1.0/
        ├── pre-migrate.py
        └── post-migrate.py
```

A folder runs when its version is above the installed one (14.0.something here) and no higher than the manifest version. `pre-` scripts run before the module's Python code and data files are loaded, so the ORM hasn't touched its tables yet. `post-` scripts run after the models are set up and the data files are loaded. Each file defines `migrate(cr, version)`, where `version` is the version that was installed before the update. I start every script with `if not version: return` so it does nothing if there's no previous install to migrate from.

Say the 16 version of a module renames `delivery_note` on `sale.order` to `delivery_instructions`. Without a pre script, the ORM creates an empty `delivery_instructions` column and the old data sits unused in `delivery_note`. Renaming the column first keeps it:

```python
# my_module/migrations/16.0.1.1.0/pre-migrate.py
from odoo.tools.sql import column_exists, rename_column


def migrate(cr, version):
    if not version:
        return
    if column_exists(cr, 'sale_order', 'delivery_note') and not column_exists(
        cr, 'sale_order', 'delivery_instructions'
    ):
        rename_column(cr, 'sale_order', 'delivery_note', 'delivery_instructions')
```

A raw column rename moves the data, but the old field's `ir.model.fields` record is left behind. Odoo deletes it at the end of the update, and the chatter's tracking history for that field gets deleted with it. If that history matters, or you'd just rather not write SQL, OCA's `openupgradelib` has `rename_fields`, which renames the column and updates the field record and the references to it. It also has `rename_columns`, `rename_models` and `rename_xmlids`. It's a plain library, so you can use it in your own scripts without running OpenUpgrade.

Post scripts are where you use the ORM. Brand-new stored computed fields get computed when Odoo creates the column, so they don't need anything. What does need a script is an existing stored field whose formula changed during the port, because Odoo has no idea the stored values are stale:

```python
# my_module/migrations/16.0.1.1.0/post-migrate.py
from odoo import SUPERUSER_ID, api


def migrate(cr, version):
    if not version:
        return
    env = api.Environment(cr, SUPERUSER_ID, {})
    orders = env['sale.order'].search([('state', 'in', ('sale', 'done'))])
    env.add_to_compute(env['sale.order']._fields['commission_amount'], orders)
    orders.flush_recordset(['commission_amount'])
```

On a table with hundreds of thousands of rows, do it in batches or in SQL. Loading everything into one recordset is a good way to run the upgrade out of memory.

## Tests, then real people

A migrated copy of production has no demo data, so tests that lean on `env.ref('product.product_product_1')` and friends fail for the wrong reason. Create what the test needs:

```python
from odoo import Command
from odoo.tests import TransactionCase, tagged


@tagged('post_install', '-at_install')
class TestAfterUpgrade(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.partner = cls.env['res.partner'].create({'name': 'Upgrade Test Customer'})
        cls.product = cls.env['product.product'].create({
            'name': 'Upgrade Test Product',
            'list_price': 100.0,
        })

    def test_sale_order_confirms(self):
        order = self.env['sale.order'].create({
            'partner_id': self.partner.id,
            'order_line': [Command.create({
                'product_id': self.product.id,
                'product_uom_qty': 1,
            })],
        })
        order.action_confirm()
        self.assertEqual(order.state, 'sale')
```

This lives in `my_module/tests/` (imported from `tests/__init__.py`), and `my_module` has to depend on `sale`. Run it against the staging copy:

```bash
odoo-bin -c odoo16.conf -d staging_db --test-enable --test-tags /my_module \
    -u my_module --stop-after-init
```

`TransactionCase` rolls back after each test, so nothing is left behind in the database.

Automated tests catch crashes. They don't catch the report whose layout shifted, or the button someone uses all day that's now tucked away somewhere else. UAT is the part that actually finds problems. I ask each key user to run their real day on staging, with real customers and products from the copy. A test script I wrote myself never finds as much as someone doing their actual job.

## Database housekeeping and speed

The upgrade rewrites a lot of rows, and a database restored from a dump starts with no planner statistics at all. Stale statistics mean bad query plans. Once the upgrade is done:

```sql
VACUUM (ANALYZE);
```

Plain `VACUUM` doesn't take exclusive locks, so it's fine to run with Odoo up. You don't need `REINDEX DATABASE`, which locks tables and buys you nothing here. You don't need to reset sequences either, because `pg_dump` and `pg_restore` carry them over. And don't delete "orphaned" `ir_attachment` rows with no `res_model` or a `res_id` of 0. Plenty of legitimate files look like that, including the compiled web assets.

For speed, I time the screens and reports people use most during UAT and compare them with the 14 server, which is still running. Anything noticeably slower gets looked at before go-live. PostgreSQL's slow query log is the quickest way to find the cause:

```sql
ALTER DATABASE staging_db SET log_min_duration_statement = 500;
```

That logs every statement over 500 ms on new connections, so restart Odoo afterwards. It needs a superuser. Run `ALTER DATABASE staging_db RESET log_min_duration_statement;` when UAT is over.

## Dry runs and cutover

The first dry run always fails. That's what it's for. The loop:

1. Restore a fresh production dump to staging.
2. Run the standard upgrade, then `-u all` with the current state of the ported modules.
3. Fix whatever broke, in the code or in a migration script. Never by hand in the staging database.
4. Throw the staging database away and go back to step 1.

Step 4 is the one people skip. A fix made by hand in staging isn't a fix for production, and you find that out on cutover night. I keep going until a run from a fresh dump goes through clean with nothing done manually, and then UAT happens on that database.

Once UAT is signed off, I rehearse the whole cutover on staging and time it from final backup to first login. That's the downtime window, and it's the number the client really cares about.

On the night:

1. Put up a maintenance page or stop the 14 service, so nobody can write.
2. Take the final backup, database and filestore.
3. Run the upgrade on that copy. With the upgrade service that means `production` instead of `test`; with OpenUpgrade it's the same steps as the dry runs. Then `-u all` with your modules.
4. Check crons, mail servers and integrations on the upgraded database. They should match what was live on 14, and nothing from staging (sandbox endpoints, the Mailpit settings) should have leaked into the production config.
5. Run `VACUUM (ANALYZE)`, have a key user smoke-test, then switch the proxy to the 16 server.

## Rollback

My rollback plan is deliberately boring. The 14 server and its database stay exactly as they were at cutover, untouched and runnable, until 16 has been live for a while. I like to see at least one month-end close go through first. If something goes badly wrong, rolling back means pointing the reverse proxy (or DNS) back at the 14 server.

The catch is that anything entered in 16 after go-live doesn't flow back to 14. There's no reverse migration. That's why writes are frozen during cutover and the go-live window is kept short: the earlier you decide to roll back, the less there is to re-enter. Agree with the client beforehand on how long rollback stays a realistic option.

If the 14 database itself is lost or damaged, the cutover backup is the last resort:

```bash
createdb prod_db
pg_restore --no-owner -d prod_db prod_db_20240105.dump
mkdir -p ~/.local/share/Odoo/filestore
tar -xzf filestore_20240105.tar.gz -C ~/.local/share/Odoo/filestore
```

I restore it once on a scratch server before cutover, so I know it works.

## Go-live checklist

- All custom modules install on an empty 16 database and upgrade on the staging copy with no errors in the log
- Warnings in the upgrade log are fixed or understood
- The last dry run went from a fresh production dump to a working database with no manual fixes
- Automated tests pass on staging
- Key users have run their daily work on staging and signed off
- Reports and PDFs render, especially customised invoices and delivery slips, with a patched-Qt wkhtmltopdf build on the 16 server
- Outgoing mail tested from production after cutover
- Incoming mail (aliases, fetchmail) arrives on production
- Crons active on production as they were on 14, and still off on staging
- Integrations, webhooks and payment providers point at live endpoints on production and sandboxes on staging
- `VACUUM (ANALYZE)` run on the upgraded production database
- The 14 server, database and filestore kept untouched, and the cutover backup has been test-restored

## Wrapping up

Most of the effort in a 14 to 16 upgrade goes into custom code, not Odoo itself, so the sooner you've grepped your modules and checked your dependencies, the more honest your estimate will be. After that it's repetition: dry runs from fresh dumps until one goes through clean, and a 14 server you can fall back to.

If you're planning one and want a second pair of eyes on it, email me at contact@babatopeajepe.com.
