# PayDI

Stripe-like payment stack for ADI Chain. Price in fiat (AED/USD), settle in ADI on-chain.

## Monorepo packages

```
adistripe/
├── packages/contracts/   # Foundry contracts (PaymentProcessor)
├── packages/api/         # Bun + Hono API (sessions, auth, pricing)
├── packages/dashboard/   # Next.js merchant dashboard
├── packages/widget/      # React checkout widget package (paydi-widget)
└── packages/testsite/    # Next.js demo storefront using paydi-widget
```

## ADI networks

| Network | Chain ID | RPC |
| --- | --- | --- |
| Testnet | `99999` | `https://rpc.ab.testnet.adifoundation.ai/` |
| Mainnet | `36900` | `https://rpc.adifoundation.ai/` |

## Quick start

1) Install workspace dependencies

```bash
bun install
```

2) Configure and run API

```bash
cp packages/api/.env.example packages/api/.env
bun run --cwd packages/api dev
```

Set at least these values in `packages/api/.env`:

- `PAYMENT_PROCESSOR_ADDRESS`
- `PRIVATE_KEY`
- `CORS_ORIGINS`

3) Run dashboard

```bash
bun run --cwd packages/dashboard dev
```

4) Run demo storefront (widget integration)

```bash
bun run --cwd packages/testsite dev
```

## Contracts (testnet deploy)

```bash
cd packages/contracts
forge build
forge script script/Deploy.s.sol --rpc-url https://rpc.ab.testnet.adifoundation.ai/ --broadcast --private-key $PRIVATE_KEY
```

After deploy, copy the contract address into `packages/api/.env` as `PAYMENT_PROCESSOR_ADDRESS`.

## Widget package

The checkout widget is published from `packages/widget` as `paydi-widget`.

```bash
bun run build:widget
```

Widget docs: `packages/widget/README.md`.

## API surface

Auth:

- `GET /auth/nonce`
- `POST /auth/verify`
- `POST /auth/logout`

Merchant:

- `GET /merchants/me`
- `PUT /merchants/config`

Payments:

- `POST /payments/sessions`
- `GET /payments/sessions/:id`
- `GET /payments/sessions`

Prices:

- `GET /prices/ADI`
- `GET /prices/_cache`

System:

- `GET /health`

## Explorers

- Testnet: `https://explorer.ab.testnet.adifoundation.ai/`
- Mainnet: `https://explorer.adifoundation.ai/`
