import json
import urllib.request

# 1. Login
login_data = json.dumps({'email': 'demo_seller@sellsync.ai', 'password': 'SellerPassword123!'}).encode('utf-8')
req = urllib.request.Request('http://127.0.0.1:8002/api/v1/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode())
    token = res['access_token']
    tenant_id = res['active_tenant']['id']
    print('Logged in as demo seller. Tenant:', tenant_id)

headers = {'Authorization': f'Bearer {token}', 'X-Tenant-ID': tenant_id, 'Content-Type': 'application/json'}

# 2. Get Subscription
req = urllib.request.Request('http://127.0.0.1:8002/api/v1/billing/subscription', headers=headers)
with urllib.request.urlopen(req) as resp:
    sub = json.loads(resp.read().decode())
    print('Subscription:', sub['plan']['name'], '| Status:', sub['status'], '| Days remaining:', sub['days_remaining'])
    print('Usage summary:', sub['usage'])

# 3. Get Products
req = urllib.request.Request('http://127.0.0.1:8002/api/v1/products', headers=headers)
with urllib.request.urlopen(req) as resp:
    prods = json.loads(resp.read().decode())
    print('Products in catalog:', len(prods))
    for p in prods:
        print(' - Product:', p['name'], '| SKU:', p['sku'], '| Total stock:', p['total_stock'])

# 4. Get Connections
req = urllib.request.Request('http://127.0.0.1:8002/api/v1/marketplaces/connections', headers=headers)
with urllib.request.urlopen(req) as resp:
    conns = json.loads(resp.read().decode())
    print('Marketplace connections count:', len(conns))
    for c in conns:
        print(' - Connection:', c['marketplace_code'], '|', c['account_name'], '| Status:', c['status'])

# 5. One-Click Multi-Marketplace Publish
if prods and conns:
    target_prod_id = prods[0]['id']
    conn_ids = [c['id'] for c in conns]
    pub_data = json.dumps({'connection_ids': conn_ids, 'use_ai_listing': True}).encode('utf-8')
    req = urllib.request.Request(f'http://127.0.0.1:8002/api/v1/products/{target_prod_id}/publish', data=pub_data, headers=headers)
    with urllib.request.urlopen(req) as resp:
        pub_res = json.loads(resp.read().decode())
        print('\nOne-Click Multi-Marketplace Publishing Output:')
        print('Product SKU:', pub_res['product_sku'])
        for r in pub_res['results']:
            print(f" -> Channel: {r['marketplace_code']} | Status: {r['status']} | External ID: {r.get('external_id')} | Msg: {r.get('message')}")

