# Cloudflare 530 / error 1033 investigation

Observed on 2026-10-19:

- HTTPS reaches Cloudflare and returns HTTP 530 with the plain body `error code: 1033`.
- DNS resolves the hostname to Cloudflare anycast addresses.
- The same response occurs for `/`, `/api/tenants/public/active`, and `/actuator/health`, so the failure happens before an HTTP request reaches Nginx or Spring Boot.
- GitHub Actions completed successfully, but the workflow only builds and pushes Docker images. It contains no host deployment, container restart, or Cloudflare Tunnel step.
- This workstation has no Cloudflare tunnel management certificate/configuration and no authorized origin shell connection. Local Docker has no production containers.

Cloudflare documents 1033 as the state where its network cannot find a healthy `cloudflared` connector for the configured tunnel:
https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1033/

The confirmed failure boundary is therefore the tunnel route/connector, not the application response. The remaining root cause inside that boundary requires either Cloudflare Zero Trust access or origin-host access.

## Authorized operator checks

1. In Cloudflare Zero Trust, open **Networks > Tunnels** and record the tunnel status and connector IDs.
2. Verify the public hostname route for `mawrid.cloudbase.website` targets the intended tunnel and service.
3. On the origin, run `systemctl status cloudflared` (or inspect the cloudflared container) and review logs around the first 1033 occurrence.
4. If stopped, determine why before restarting it. Check host uptime, service exit status, disk pressure, and outbound connectivity to Cloudflare.
5. From the origin, verify Nginx directly and then the backend:
   - `curl -fsS http://127.0.0.1:3000/`
   - `curl -fsS http://127.0.0.1:8080/actuator/health`
6. Verify running image digests against the intended Docker Hub images before changing containers.
7. Restart only the failed connector/service, then repeat public HTTPS checks.

Do not rotate tunnel credentials, change DNS, or recreate the tunnel until its current status and logs have been captured.
