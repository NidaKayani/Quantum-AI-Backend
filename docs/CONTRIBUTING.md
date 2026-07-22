# Contributing to Quantum AI Backend

Thanks for contributing to the QuantumAI API (Express + TypeScript).

## Before you start

1. Follow the [Code of Conduct](CODE_OF_CONDUCT.md).
2. For messenger E2E rules when integrating with QuantumChat, see [`REQUIREMENTS.md`](https://github.com/QuantumLogicsLabs/QuantumChat/blob/main/docs/REQUIREMENTS.md).
3. Report vulnerabilities via [SECURITY.md](SECURITY.md).

## Development setup

```bash
cp .env.example .env   # GROQ_API_KEY, MONGODB_URI, JWT_SECRET
npm ci
npm run typecheck
npm run dev            # http://localhost:5001
```

API reference: [API.md](API.md).

## Pull requests

1. Keep PRs focused.
2. Never commit `.env`, API keys, or user conversation dumps.
3. Update [API.md](API.md) when endpoints change.
4. Ensure `npm run typecheck` and CI pass.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](../LICENSE).
