## Register
```bash
TOKEN=$(curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}' | jq -r '.token')
echo $TOKEN
```

## Login
```bash
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}' | jq -r '.token')
echo $TOKEN
```

## Get all recordings
```bash
curl http://localhost:3000/recordings \
  -H "Authorization: Bearer $TOKEN"
```

## Create recording
```bash
curl -X POST http://localhost:3000/recordings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Recording"}'
```

## Update recording
```bash
curl -X PUT http://localhost:3000/recordings/RECORDING_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title","size":1024,"duration":60}'
```

## Delete recording
```bash
curl -X DELETE http://localhost:3000/recordings/RECORDING_ID \
  -H "Authorization: Bearer $TOKEN"
```
