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

## Recovery checklist

### Cloudflare dashboard access required

1. Open **Zero Trust > Networks > Tunnels** and record the tunnel status, tunnel ID, connector IDs, and last-seen times.
2. Open the tunnel's **Public Hostnames** configuration and verify that `mawrid.cloudbase.website` targets the intended local Nginx service.
3. Check the DNS record for the hostname and confirm its tunnel target matches the tunnel inspected above.

### Run on the production host

Capture evidence before restarting anything:

```bash
sudo systemctl status cloudflared --no-pager -l
sudo journalctl -u cloudflared --since "24 hours ago" --no-pager
sudo systemctl show cloudflared -p ActiveState -p SubState -p ExecMainStatus -p FragmentPath
docker ps -a --no-trunc
docker compose ps
docker logs --since 24h cloudflared
df -h
uptime
```

If `cloudflared` runs as a system service, the Docker log command may report that no such container exists; if it runs as a container, the systemd unit may not exist. Use the applicable output rather than restarting both.

Verify the origin independently of Cloudflare:

```bash
curl -fsS -D- http://127.0.0.1:3000/ -o /dev/null
curl -fsS http://127.0.0.1:8080/actuator/health
docker ps -q | xargs -r docker inspect --format '{{.Name}} {{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}} {{.Image}}'
docker images --digests --no-trunc minipcer/mawrid-frontend minipcer/mawrid-backend
```

If the connector is confirmed stopped after its logs and exit status are captured, restart only its actual runtime and inspect the new logs:

```bash
sudo systemctl restart cloudflared
sudo systemctl status cloudflared --no-pager -l
sudo journalctl -u cloudflared --since "10 minutes ago" --no-pager
```

Or, when it is managed by the production Compose project:

```bash
docker compose restart cloudflared
docker compose logs --since 10m cloudflared
```

Finally, from an external machine:

```bash
curl -fsS -D- https://mawrid.cloudbase.website/ -o /dev/null
curl -fsS https://mawrid.cloudbase.website/actuator/health
```

Before changing application containers, compare their image IDs/digests with the intended release commit and registry images.

Do not rotate tunnel credentials, change DNS, or recreate the tunnel until its current status and logs have been captured.
