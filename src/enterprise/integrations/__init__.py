"""
Git Provider Integration Module

Provides stable integration with GitHub/GitLab including:
- Webhook Receiver with signature verification
- Anti-replay protection (timestamp/nonce)
- Rate limiting and backpressure
- Provider App/OAuth installation management
- Check Run / Status / Comment write-back
"""

from enterprise.integrations.webhook import (
    WebhookReceiver,
    WebhookEvent,
    WebhookValidationError,
)

from enterprise.integrations.providers import (
    GitProviderManager,
    GitProvider,
    ProviderInstallation,
    ProviderAuth,
)

from enterprise.integrations.writeback import (
    CheckRunWriter,
    CheckRunStatus,
    CheckRunConclusion,
    StatusWriter,
    CommentWriter,
)

__all__ = [
    # Webhook
    "WebhookReceiver",
    "WebhookEvent",
    "WebhookValidationError",
    # Providers
    "GitProviderManager",
    "GitProvider",
    "ProviderInstallation",
    "ProviderAuth",
    # Write-back
    "CheckRunWriter",
    "CheckRunStatus",
    "CheckRunConclusion",
    "StatusWriter",
    "CommentWriter",
]
