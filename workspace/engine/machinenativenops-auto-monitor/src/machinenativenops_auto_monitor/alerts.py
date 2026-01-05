"""
MachineNativeOps Auto-Monitor - Alert Management
警報管理模組

Manages alert rules, evaluation, and notification delivery.
Handles alert rules, alert generation, and alert routing for MachineNativeOps monitoring.
"""

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels."""
    CRITICAL = "critical"
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class AlertState(Enum):
    """Alert states."""
    PENDING = "pending"
    FIRING = "firing"
    RESOLVED = "resolved"


class AlertStatus(Enum):
    """Alert status."""
    FIRING = "firing"
    RESOLVED = "resolved"
    SILENCED = "silenced"


@dataclass
class Alert:
    """Represents an alert instance."""
    name: str
    severity: AlertSeverity
    state: AlertState
    message: str
    id: str = ""
    labels: Dict[str, str] = field(default_factory=dict)
    annotations: Dict[str, str] = field(default_factory=dict)
    started_at: datetime = field(default_factory=datetime.now)
    resolved_at: Optional[datetime] = None
    source: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if not self.id:
            self.id = f"{self.name}_{datetime.now().timestamp()}"
    
    def resolve(self):
        """Mark alert as resolved"""
        self.state = AlertState.RESOLVED
        self.resolved_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert alert to dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'severity': self.severity.value,
            'state': self.state.value,
            'message': self.message,
            'labels': self.labels,
            'annotations': self.annotations,
            'started_at': self.started_at.isoformat(),
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'source': self.source,
            'metadata': self.metadata
        }


class AlertManager:
    """Manages alerts and alert rules"""
    
    def __init__(self, config: Dict[str, Any] = None):
        """Initialize alert manager"""
        self.config = config or {}
        self.active_alerts: List[Alert] = []
        self.alert_history: List[Alert] = []
        self.alert_rules = self._load_alert_rules()
    
    def _load_alert_rules(self) -> Dict[str, Any]:
        """Load alert rules from configuration"""
        return self.config.get("alert_rules", {
            "cpu_threshold": 80.0,
            "memory_threshold": 85.0,
            "disk_threshold": 90.0,
            "service_down_threshold": 1
        })
    
    def check_metric(self, metric_name: str, value: float, threshold: float = None) -> Optional[Alert]:
        """
        Check if a metric exceeds threshold and create alert if needed
        
        Args:
            metric_name: Name of the metric
            value: Current metric value
            threshold: Alert threshold (uses configured default if not provided)
        
        Returns:
            Alert object if threshold exceeded, None otherwise
        """
        if threshold is None:
            threshold = self.alert_rules.get(f"{metric_name}_threshold", 100.0)
        
        if value >= threshold:
            severity = self._determine_severity(metric_name, value, threshold)
            alert = Alert(
                name=f"{metric_name}_high",
                severity=severity,
                state=AlertState.FIRING,
                message=f"{metric_name} is at {value:.1f}% (threshold: {threshold}%)",
                source="auto-monitor",
                metadata={
                    "metric": metric_name,
                    "value": value,
                    "threshold": threshold
                }
            )
            return alert
        
        return None
    
    def _determine_severity(self, metric_name: str, value: float, threshold: float) -> AlertSeverity:
        """Determine alert severity based on how much threshold is exceeded"""
        if value >= threshold * 1.2:  # 20% over threshold
            return AlertSeverity.CRITICAL
        elif value >= threshold * 1.1:  # 10% over threshold
            return AlertSeverity.ERROR
        elif value >= threshold:
            return AlertSeverity.WARNING
        else:
            return AlertSeverity.INFO
    
    def add_alert(self, alert: Alert):
        """Add a new alert"""
        # Check if similar alert already exists
        existing = self._find_similar_alert(alert)
        if existing:
            logger.debug(f"Alert {alert.name} already exists, updating...")
            existing.timestamp = alert.timestamp
            existing.metadata = alert.metadata
        else:
            logger.info(f"New alert: {alert.name} - {alert.severity.value} - {alert.message}")
            self.active_alerts.append(alert)
            self._notify_alert(alert)
    
    def _find_similar_alert(self, alert: Alert) -> Optional[Alert]:
        """Find existing similar alert"""
        for existing_alert in self.active_alerts:
            if (existing_alert.name == alert.name and 
                existing_alert.source == alert.source and
                not existing_alert.resolved):
                return existing_alert
        return None
    
    def resolve_alert(self, alert_name: str, source: str = ""):
        """Resolve an active alert"""
        for alert in self.active_alerts:
            if alert.name == alert_name and (not source or alert.source == source):
                if not alert.resolved:
                    alert.resolve()
                    logger.info(f"Resolved alert: {alert_name}")
                    self.alert_history.append(alert)
                    self.active_alerts.remove(alert)
                    return True
        return False
    
    def _notify_alert(self, alert: Alert):
        """Send alert notifications"""
        # TODO: Implement notification channels (email, slack, webhook, etc.)
        logger.warning(f"ALERT: [{alert.severity.value}] {alert.message}")
    
    def get_active_alerts(self, severity: AlertSeverity = None) -> List[Alert]:
        """Get all active alerts, optionally filtered by severity"""
        if severity:
            return [a for a in self.active_alerts if a.severity == severity]
        return self.active_alerts.copy()
    
    def get_alert_summary(self) -> Dict[str, int]:
        """Get summary of active alerts by severity"""
        summary = {
            "total": len(self.active_alerts),
            "critical": 0,
            "error": 0,
            "warning": 0,
            "info": 0
        }
        
        for alert in self.active_alerts:
            summary[alert.severity.value] += 1
        
        return summary
    
    def clear_resolved_alerts(self):
        """Move all resolved alerts to history"""
        resolved = [a for a in self.active_alerts if a.resolved]
        for alert in resolved:
            self.alert_history.append(alert)
            self.active_alerts.remove(alert)
        
        logger.info(f"Cleared {len(resolved)} resolved alerts")


@dataclass
class AlertRule:
    """Defines an alert rule."""
    name: str
    description: str
    severity: AlertSeverity
    condition: str
    threshold: float
    duration: int = 60  # seconds
    labels: Dict[str, str] = field(default_factory=dict)
    annotations: Dict[str, str] = field(default_factory=dict)
    enabled: bool = True
    
    def evaluate(self, value: float) -> bool:
        """
        Evaluate the alert rule against a value.
        
        Args:
            value: The metric value to evaluate
            
        Returns:
            True if the alert condition is met, False otherwise
        """
        # Simple threshold comparison
        # In production, this would support complex expressions
        if '>' in self.condition:
            return value > self.threshold
        elif '<' in self.condition:
            return value < self.threshold
        elif '=' in self.condition:
            return value == self.threshold
        elif '!=' in self.condition:
            return value != self.threshold
        else:
            return False


# Pre-defined alert rules for common scenarios
def create_default_rules() -> List[AlertRule]:
    """Create default alert rules for MachineNativeOps monitoring."""
    return [
        AlertRule(
            name="high_cpu_usage",
            condition=lambda m: m.get('cpu_percent', 0) > 80,
            severity=AlertSeverity.WARNING,
            message_template="CPU usage is high: {cpu_percent}%",
            labels={'component': 'system', 'resource': 'cpu'},
        ),
        AlertRule(
            name="high_memory_usage",
            condition=lambda m: m.get('memory_percent', 0) > 85,
            severity=AlertSeverity.WARNING,
            message_template="Memory usage is high: {memory_percent}%",
            labels={'component': 'system', 'resource': 'memory'},
        ),
        AlertRule(
            name="disk_space_low",
            condition=lambda m: m.get('disk_percent', 0) > 90,
            severity=AlertSeverity.CRITICAL,
            message_template="Disk space is critically low: {disk_percent}%",
            labels={'component': 'system', 'resource': 'disk'},
        ),
        AlertRule(
            name="service_down",
            condition=lambda m: not m.get('service_healthy', True),
            severity=AlertSeverity.CRITICAL,
            message_template="Service is down: {service_name}",
            labels={'component': 'service', 'health': 'down'},
        ),
    ]

