# Test fixtures — NOT production secrets

Every key and certificate in this directory is a **generated, self-signed
test fixture** created solely so the Wallet signing code can be tested
without real credentials. None of them are issued by Apple or Google, none
grant access to anything, and none may be used in production.

| File                  | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| `apple-test-cert.pem` | Self-signed stand-in for an Apple Pass Type ID cert    |
| `apple-test-key.pem`  | Matching test private key                              |
| `apple-test-wwdr.pem` | Self-signed stand-in for the WWDR intermediate cert    |
| `google-test-key.pem` | Test RSA key standing in for a GCP service account key |

Regenerate with OpenSSL:

```sh
openssl req -x509 -newkey rsa:2048 -keyout apple-test-key.pem \
  -out apple-test-cert.pem -days 3650 -nodes \
  -subj "/CN=BYZCARD TEST Pass Certificate - NOT FOR PRODUCTION"
openssl req -x509 -newkey rsa:2048 -keyout /dev/null \
  -out apple-test-wwdr.pem -days 3650 -nodes \
  -subj "/CN=BYZCARD TEST Fake WWDR Intermediate - NOT FOR PRODUCTION"
openssl genrsa -out google-test-key.pem 2048
```
