# Production Deployment Guide

## Prerequisites
- Kubernetes cluster
- Helm 3+
- kubectl configured

## Installation Steps

1. Add required repositories:
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
```

2. Install monitoring stack:
```bash
helm install monitoring prometheus-community/kube-prometheus-stack
```

3. Create namespaces:
```bash
kubectl create namespace surferseo-prod
kubectl create namespace monitoring
```

4. Create secrets:
```bash
kubectl create secret generic surfer-credentials \
  --from-literal=api-key=YOUR_API_KEY \
  --namespace surferseo-prod

kubectl create secret generic google-credentials \
  --from-file=credentials.json \
  --namespace surferseo-prod
```

5. Deploy Redis cluster:
```bash
kubectl apply -f kubernetes/manifests/redis-cluster.yaml
```

6. Deploy application:
```bash
kubectl apply -f kubernetes/manifests/app-deployment.yaml
kubectl apply -f kubernetes/manifests/monitoring.yaml
kubectl apply -f kubernetes/manifests/ingress.yaml
kubectl apply -f kubernetes/manifests/hpa.yaml
```

## Monitoring Setup

1. Access Grafana:
```bash
kubectl port-forward svc/monitoring-grafana 3000:80
```

2. Import dashboards:
- Navigate to Dashboards -> Import
- Upload the JSON from config/monitoring/grafana-dashboard.json

## Scaling

The HPA will automatically scale based on:
- CPU utilization > 70%
- Memory utilization > 80%

Manual scaling if needed:
```bash
kubectl scale deployment surferseo-app --replicas=5
```

## Backup

Automatic backups are configured for:
- Redis data
- Application logs
- Metrics data

## Troubleshooting

1. Check application logs:
```bash
kubectl logs -l app=surferseo -f
```

2. Monitor resource usage:
```bash
kubectl top pods
```

3. Check service health:
```bash
kubectl describe deployment surferseo-app
```