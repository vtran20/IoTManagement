# IntelliJ HTTP Client Suite

Open the repository root (`IoTManagement/`) as the IntelliJ IDEA project, then open a request from the `http/` directory. In the request editor's **Run with** selector, choose `local` or `kubernetes` before running requests. The environment file is stored at the repository root as `http-client.env.json`; opening `http/` as a separate project hides that parent file from the HTTP Client.

1. Copy `http-client.private.env.json.example` to `http-client.private.env.json` when URLs, users, passwords, reset/invitation tokens, or bearer tokens differ from the committed demo values. The private file is ignored by Git and overrides the matching environment values.
2. Start the API and run `00-system-auth.http` first. Its response handlers save `ownerToken`, `managerToken`, `viewerToken`, and `southOwnerToken` as HTTP Client global variables.
3. Run `10-portfolio-meters.http` to create and capture `testBuildingId`, `testFloorId`, `testUnitId`, `testMeterId`, and `testMeterExternalId`.
4. Run the remaining files in numeric order. Requests that mutate data are marked `MUTATES DATA`; they use captured fixture IDs where possible. Run `99-auth-cleanup.http` only when you want to invalidate the owner session.

All requests use bearer tokens. Re-run the owner login request whenever a token expires. The password-reset and invitation acceptance requests intentionally require a token copied from the development email outbox.

The suite contains every REST endpoint currently exposed by the API. Run `pnpm validate:http-client` to compare the request files directly with Nest controller decorators after controller changes.

Fixture meter IDs, moisture-sensor IDs, member emails, and invitation emails include IntelliJ's `$random.uuid` dynamic variable. That keeps normal create flows runnable more than once without colliding with a previous test run.

## Environment troubleshooting

If `local` is not listed, confirm that IntelliJ opened the `IoTManagement/` repository root, not only the nested `http/` directory. Open `http/00-system-auth.http`, click the **Run with** selector above the request, and look under **For File**. Reopen the project after pulling changes if the selector was already open when `http-client.env.json` was added.
