# Deploy n8n on AWS EKS

This guide deploys n8n on Amazon EKS with production-oriented external services:

- EKS for Kubernetes
- RDS PostgreSQL for n8n data
- ElastiCache Redis for queue mode
- AWS Load Balancer Controller for HTTPS ingress
- AWS Secrets Manager or Kubernetes Secrets for credentials
- EBS-backed persistent storage for n8n binary data when needed

The commands below are examples. Replace every `<PLACEHOLDER>` before running them.

## 1. Prerequisites

Install and configure:

- AWS CLI
- `kubectl`
- `eksctl`
- Helm
- `openssl`

Authenticate AWS:

```powershell
aws configure
aws sts get-caller-identity
```

Set the deployment variables:

```powershell
$env:AWS_REGION = "us-east-1"
$env:CLUSTER_NAME = "staywise-eks"
$env:N8N_NAMESPACE = "n8n"
$env:N8N_HOST = "n8n.example.com"
```

## 2. Create the EKS cluster

For a small development cluster:

```powershell
eksctl create cluster `
  --name $env:CLUSTER_NAME `
  --region $env:AWS_REGION `
  --nodegroup-name app-nodes `
  --node-type t3.medium `
  --nodes 2 `
  --nodes-min 2 `
  --nodes-max 4 `
  --managed
```

Configure kubectl:

```powershell
aws eks update-kubeconfig `
  --region $env:AWS_REGION `
  --name $env:CLUSTER_NAME

kubectl get nodes
```

For production, use private worker subnets, multiple Availability Zones, managed node groups, and a separate node group for stateful workloads if required.

## 3. Prepare AWS networking

n8n should use managed data services rather than PostgreSQL and Redis pods in the application cluster.

Create or provision:

1. An RDS PostgreSQL instance in private subnets.
2. An ElastiCache Redis replication group in private subnets.
3. Security-group rules allowing EKS nodes or pod security groups to connect to:
   - RDS PostgreSQL port `5432`
   - Redis port `6379`
4. A Route 53 DNS record for `$N8N_HOST`.
5. An ACM certificate covering `$N8N_HOST`.

Keep the RDS and Redis endpoints private. Do not expose either service directly to the internet.

## 4. Install the AWS Load Balancer Controller

Associate an IAM OIDC provider:

```powershell
eksctl utils associate-iam-oidc-provider `
  --cluster $env:CLUSTER_NAME `
  --region $env:AWS_REGION `
  --approve
```

Install the controller using the official AWS instructions for your cluster version. The controller must have an IAM role allowing it to create and manage ALB resources.

Then verify it:

```powershell
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
```

## 5. Create the namespace and application secret

Create the namespace:

```powershell
kubectl create namespace $env:N8N_NAMESPACE
```

Generate a strong encryption key and database password. Store them in AWS Secrets Manager in production. For a first test deployment, create a Kubernetes Secret directly:

```powershell
$n8nKey = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

kubectl -n $env:N8N_NAMESPACE create secret generic n8n-secrets `
  --from-literal=DB_POSTGRESDB_USER='<RDS_USERNAME>' `
  --from-literal=DB_POSTGRESDB_PASSWORD='<RDS_PASSWORD>' `
  --from-literal=DB_POSTGRESDB_DATABASE='n8n' `
  --from-literal=DB_POSTGRESDB_HOST='<RDS_ENDPOINT>' `
  --from-literal=DB_POSTGRESDB_PORT='5432' `
  --from-literal=QUEUE_BULL_REDIS_HOST='<REDIS_ENDPOINT>' `
  --from-literal=QUEUE_BULL_REDIS_PORT='6379' `
  --from-literal=N8N_ENCRYPTION_KEY="$n8nKey"
```

Do not commit this command with real passwords or keys. For a production cluster, sync the values from AWS Secrets Manager using External Secrets Operator or another approved secrets integration.

## 6. Deploy n8n in queue mode

Create `k8s/n8n.yaml` outside this guide with the following resources:

- `ServiceAccount`
- `Deployment` for the n8n main process
- `Deployment` for n8n workers
- `Service` for the main process
- `Ingress` using the AWS Load Balancer Controller
- `PodDisruptionBudget`
- `NetworkPolicy`, if your CNI and security model support it

The main deployment needs these environment variables:

```yaml
env:
  - name: DB_TYPE
    value: postgresdb
  - name: DB_POSTGRESDB_USER
    valueFrom:
      secretKeyRef:
        name: n8n-secrets
        key: DB_POSTGRESDB_USER
  - name: DB_POSTGRESDB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: n8n-secrets
        key: DB_POSTGRESDB_PASSWORD
  - name: DB_POSTGRESDB_DATABASE
    valueFrom:
      secretKeyRef:
        name: n8n-secrets
        key: DB_POSTGRESDB_DATABASE
  - name: DB_POSTGRESDB_HOST
    valueFrom:
      secretKeyRef:
        name: n8n-secrets
        key: DB_POSTGRESDB_HOST
  - name: DB_POSTGRESDB_PORT
    valueFrom:
      secretKeyRef:
        name: n8n-secrets
        key: DB_POSTGRESDB_PORT
  - name: N8N_ENCRYPTION_KEY
    valueFrom:
      secretKeyRef:
        name: n8n-secrets
        key: N8N_ENCRYPTION_KEY
  - name: EXECUTIONS_MODE
    value: queue
  - name: QUEUE_BULL_REDIS_HOST
    valueFrom:
      secretKeyRef:
        name: n8n-secrets
        key: QUEUE_BULL_REDIS_HOST
  - name: QUEUE_BULL_REDIS_PORT
    valueFrom:
      secretKeyRef:
        name: n8n-secrets
        key: QUEUE_BULL_REDIS_PORT
  - name: N8N_HOST
    value: n8n.example.com
  - name: N8N_PROTOCOL
    value: https
  - name: WEBHOOK_URL
    value: https://n8n.example.com/
  - name: N8N_EDITOR_BASE_URL
    value: https://n8n.example.com/
  - name: N8N_SECURE_COOKIE
    value: "true"
```

Use the same database, Redis, and `N8N_ENCRYPTION_KEY` variables for the worker deployment. The worker command should be:

```yaml
command: ["n8n"]
args: ["worker"]
```

Use the official n8n image version explicitly, for example:

```yaml
image: docker.n8n.io/n8nio/n8n:<PINNED_VERSION>
```

Do not use `latest` in production.

## 7. Configure the ALB ingress

The ingress should terminate HTTPS at an ACM certificate:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: n8n
  namespace: n8n
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP":80},{"HTTPS":443}]'
    alb.ingress.kubernetes.io/ssl-redirect: "443"
    alb.ingress.kubernetes.io/certificate-arn: <ACM_CERTIFICATE_ARN>
    alb.ingress.kubernetes.io/healthcheck-path: /healthz
spec:
  ingressClassName: alb
  rules:
    - host: n8n.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: n8n
                port:
                  number: 5678
```

Point the Route 53 record for `n8n.example.com` to the ALB hostname created by the controller.

## 8. Apply and verify

```powershell
kubectl apply -f k8s/n8n.yaml
kubectl rollout status deployment/n8n -n n8n
kubectl rollout status deployment/n8n-worker -n n8n
kubectl get pods -n n8n
kubectl get ingress -n n8n
```

Inspect logs if the pod is not ready:

```powershell
kubectl logs deployment/n8n -n n8n
kubectl logs deployment/n8n-worker -n n8n
kubectl describe pod -n n8n -l app=n8n
```

Open:

```text
https://n8n.example.com
```

Create the initial n8n owner account through the web interface. Do not put owner credentials in Kubernetes manifests.

## 9. Production checklist

- Pin the n8n image version.
- Use RDS PostgreSQL, not an in-cluster SQLite database.
- Use ElastiCache Redis for queue mode.
- Keep `N8N_ENCRYPTION_KEY` stable forever; changing it can make saved credentials unreadable.
- Store secrets in AWS Secrets Manager and sync them into Kubernetes.
- Use HTTPS and `N8N_SECURE_COOKIE=true`.
- Restrict RDS and Redis to private subnets and security groups.
- Configure backups and deletion protection for RDS.
- Add CPU and memory requests/limits.
- Add liveness/readiness probes and a PodDisruptionBudget.
- Configure centralized logs, metrics, and alerts.
- Restrict n8n user sign-up and protect the editor with SSO or an identity-aware proxy when appropriate.
- Back up n8n database data and test restoration.

## 10. Cleanup

```powershell
kubectl delete namespace n8n
```

This deletes Kubernetes resources in the namespace, but it does not automatically delete external RDS, Redis, ACM, Route 53, or ALB resources. Remove those separately only after confirming that all data and workflows are backed up.
