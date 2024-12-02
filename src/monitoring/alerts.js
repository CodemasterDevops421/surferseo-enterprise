const axios = require('axios');
const winston = require('winston');

class AlertManager {
  constructor(options = {}) {
    this.slackWebhook = options.slackWebhook || process.env.SLACK_WEBHOOK_URL;
    this.pagerDutyKey = options.pagerDutyKey || process.env.PAGERDUTY_KEY;
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: 'alert-manager' },
      transports: [
        new winston.transports.File({ filename: 'logs/alerts.log' })
      ]
    });
  }

  async sendSlackAlert(message, severity = 'warning') {
    try {
      await axios.post(this.slackWebhook, {
        text: message,
        attachments: [{
          color: severity === 'critical' ? '#ff0000' : '#ffaa00',
          fields: [{
            title: 'Severity',
            value: severity,
            short: true
          }, {
            title: 'Timestamp',
            value: new Date().toISOString(),
            short: true
          }]
        }]
      });

      this.logger.info('Slack alert sent', { message, severity });
    } catch (error) {
      this.logger.error('Failed to send Slack alert', { error: error.message });
    }
  }

  async sendPagerDutyAlert(incident) {
    try {
      await axios.post('https://events.pagerduty.com/v2/enqueue', {
        routing_key: this.pagerDutyKey,
        event_action: 'trigger',
        payload: {
          summary: incident.summary,
          severity: incident.severity,
          source: 'SurferSEO Enterprise',
          timestamp: new Date().toISOString(),
          custom_details: incident.details
        }
      });

      this.logger.info('PagerDuty alert sent', { incident });
    } catch (error) {
      this.logger.error('Failed to send PagerDuty alert', { error: error.message });
    }
  }

  async handleSystemAlert(type, details) {
    switch (type) {
      case 'error_rate':
        await this.sendSlackAlert(
          `High error rate detected: ${details.rate}% errors in the last 5 minutes`,
          'critical'
        );
        if (details.rate > 20) {
          await this.sendPagerDutyAlert({
            summary: 'Critical: High Error Rate',
            severity: 'critical',
            details
          });
        }
        break;

      case 'rate_limit':
        await this.sendSlackAlert(
          `Rate limiting threshold exceeded: ${details.count} requests blocked`,
          'warning'
        );
        break;

      case 'processing_failure':
        await this.sendSlackAlert(
          `Document processing failure: ${details.documentId}\nError: ${details.error}`,
          'critical'
        );
        await this.sendPagerDutyAlert({
          summary: 'Document Processing Failure',
          severity: 'error',
          details
        });
        break;
    }
  }
}

module.exports = new AlertManager();