import urllib.request
import json

# 1. Login
login_data = json.dumps({'email': 'demo_seller@sellsync.ai', 'password': 'SellerPassword123!'}).encode('utf-8')
req = urllib.request.Request('http://127.0.0.1:8002/api/v1/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode())
    token = res['access_token']
    tenant_id = res['active_tenant']['id']
    print('Logged in. Tenant ID:', tenant_id)

# 2. Prepare sample CSV multipart
csv_text = """name,sku,brand,category,mrp,selling_price,stock,hsn_code,gst_rate,size,color,material
Imported Linen Shirt,LINEN-IMP-001,SellSync Essentials,Apparel,2499,1499,40,62052000,12,M,Olive,Pure Linen
Imported Cotton Tee,TEE-IMP-002,SellSync Essentials,Apparel,1299,699,60,61091000,18,L,Navy,Cotton
"""

boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
body = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="file"; filename="products.csv"\r\n'
    f'Content-Type: text/csv\r\n\r\n'
    f'{csv_text}\r\n'
    f'--{boundary}--\r\n'
).encode('utf-8')

req = urllib.request.Request(
    'http://127.0.0.1:8002/api/v1/products/bulk-import',
    data=body,
    headers={
        'Authorization': f'Bearer {token}',
        'X-Tenant-ID': tenant_id,
        'Content-Type': f'multipart/form-data; boundary={boundary}'
    }
)

with urllib.request.urlopen(req) as resp:
    print('Bulk import HTTP status:', resp.status)
    result = json.loads(resp.read().decode())
    print('Import Result:', result)

