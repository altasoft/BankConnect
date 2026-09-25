# BankConnect Client Guide

Static HTML/JS site for external clients integrating with `B7.BankConnect.Api`. No build step, no framework — just serve this folder.

## Running it locally

The API Explorer fetches `swagger.json` via `fetch()`, which browsers block on `file://` pages. Serve the folder over HTTP, e.g.:

```
cd ClientGuide
python -m http.server 8080
```

Then open `http://localhost:8080/index.html`.

## Updating `swagger.json`

`swagger.json` is a checked-in snapshot, generated **offline** from the built API assembly (no running server, no mTLS certificate needed). Regenerate it whenever the API's public contract changes:

```powershell
dotnet build B7.BankConnect.Api/B7.BankConnect.Api.csproj -c Debug --no-dependencies
dotnet tool install -g Swashbuckle.AspNetCore.Cli --version 10.2.3   # once
copy certs\root.pfx, certs\signing.pfx into B7.BankConnect.Api\bin\Debug\certs\ (relative paths Program.cs expects)
cd B7.BankConnect.Api\bin\Debug\net10.0
$env:ASPNETCORE_ENVIRONMENT = "Development"
swagger tofile --output ..\..\..\..\ClientGuide\swagger.json B7.BankConnect.Api.dll v1
```

Swagger generation (`AddSwaggerGen`/`UseSwagger`) is only wired up under `#if DEBUG` in `Program.cs`, so this only works against a Debug build.

## Structure

- `index.html` — landing page
- `guide/*.html` — written integration guide (authentication, enrollment, payments, messages)
- `explorer/` — renders `swagger.json` as a browsable API reference
- `assets/` — shared stylesheet and nav script
- `swagger.json` — checked-in OpenAPI spec snapshot
