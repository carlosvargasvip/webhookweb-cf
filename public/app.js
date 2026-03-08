// Webhook Tester Application
document.addEventListener('DOMContentLoaded', () => {
    // ===== SEND WEBHOOK TAB =====
    const form = document.getElementById('webhookForm');
    const statusDiv = document.getElementById('status');
    const payloadDisplay = document.getElementById('payloadDisplay');
    const togglePayloadBtn = document.getElementById('togglePayload');
    const submitBtn = document.getElementById('submitBtn');

    // Response display elements
    const responseSection = document.getElementById('responseSection');
    const responseBodyPre = document.getElementById('responseBody');
    const responseHeadersPre = document.getElementById('responseHeaders');
    const copyResponseBodyBtn = document.getElementById('copyResponseBody');
    const copyResponseHeadersBtn = document.getElementById('copyResponseHeaders');

    // Store last response for copying
    let lastResponseBody = '';
    let lastResponseHeaders = '';

    // ===== RECEIVE WEBHOOK TAB =====
    const receiverUrlInput = document.getElementById('receiverUrl');
    const copyUrlBtn = document.getElementById('copyUrlBtn');
    const newSessionBtn = document.getElementById('newSessionBtn');
    const clearWebhooksBtn = document.getElementById('clearWebhooksBtn');
    const webhooksList = document.getElementById('webhooksList');
    const pollingDot = document.getElementById('pollingDot');
    const pollingText = document.getElementById('pollingText');

    // ===== TAB NAVIGATION =====
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Receiver state
    let sessionId = localStorage.getItem('webhookSessionId') || generateSessionId();
    let receivedWebhooks = [];
    let pollingInterval = null;
    let isPolling = false;

    // Payload template
    const payloadTemplate = {
        "data": {
            "id": 8820,
            "offer": {
                "id": 740,
                "name": "{{ $json.offername }}",
                "status": "live",
                "team_id": 6748,
                "type_id": "digital",
                "help_url": null,
                "created_at": "2025-03-11T13:30:28.416Z",
                "updated_at": "2025-09-12T18:42:26.127Z",
                "brand_color": "",
                "website_url": null,
                "button_shape": null,
                "display_mode": null,
                "icon_asset_id": null,
                "featured_asset_id": null,
                "refund_policy_url": null,
                "return_policy_url": "https://carlosvargas.com/terms",
                "privacy_policy_url": "https://carlosvargas.com/privacy",
                "published_to_colab": false,
                "getting_started_url": null,
                "uses_tiered_pricing": false,
                "published_to_network": false,
                "welcome_message_text": null,
                "has_custom_legal_terms": false,
                "welcome_message_header": null,
                "cancellation_policy_url": null,
                "published_sales_page_id": 13344,
                "terms_and_conditions_url": "https://carlosvargas.com/terms",
                "welcome_message_asset_id": null,
                "requires_shipping_address": false,
                "getting_started_button_text": null,
                "create_shopify_order_after_purchase": false
            },
            "status": "paid",
            "team_id": 6748,
            "currency": "usd",
            "customer": {
                "id": 597,
                "name": "{{ $json.name }}",
                "email": "{{ $json.email }}",
                "phone": null,
                "team_id": 6748,
                "person_id": 566,
                "created_at": "2025-09-15T22:25:19.396Z",
                "updated_at": "2025-09-15T22:25:19.396Z",
                "stripe_customer_id": "[REDACTED]"
            },
            "offer_id": 740,
            "created_at": "2025-09-15T22:25:19.768Z",
            "line_items": [
                {
                    "id": 8712,
                    "product": {
                        "id": 547,
                        "name": "{{ $json.productname }}",
                        "team_id": 6748,
                        "created_at": "2025-03-13T22:27:42.019Z",
                        "updated_at": "2025-03-13T22:27:42.019Z",
                        "description": "",
                        "tax_code_id": null,
                        "integration_data": {},
                        "integrations_external_id": "[REDACTED]",
                        "requires_shipping_address": false,
                        "integrations_installation_id": 113,
                        "integrations_installation_type": "Integrations::ClickFunnelsInstallation",
                        "variants_locked_by_integration": false
                    },
                    "order_id": 8820,
                    "created_at": "2025-09-15T22:25:19.781Z",
                    "product_id": 547,
                    "updated_at": "2025-09-15T22:25:19.781Z",
                    "variant_sku": null,
                    "variant_name": null,
                    "products_variant_id": null,
                    "variant_integrations_external_id": null
                }
            ],
            "updated_at": "2025-09-15T22:25:25.401Z",
            "customer_id": 597,
            "promoter_id": 6748,
            "purchasable_id": 19293,
            "purchasable_type": "Stacks::Step",
            "shipping_address": [],
            "stripe_charge_id": "[REDACTED]",
            "stripe_invoice_id": null
        },
        "event_id": "952904460dd6446314853b6edd67e1da",
        "event_type": "order.completed",
        "subject_id": 8820,
        "subject_type": "Order"
    };

    // ===== HELPER FUNCTIONS =====

    function generateSessionId() {
        const id = 'wh_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('webhookSessionId', id);
        return id;
    }

    function getWebhookUrl() {
        return `${window.location.origin}/api/receive-webhook/${sessionId}`;
    }

    function replaceTemplateVariables(payload, values) {
        const jsonString = JSON.stringify(payload);
        const replacedString = jsonString
            .replace(/\{\{\s*\$json\.name\s*\}\}/g, values.name)
            .replace(/\{\{\s*\$json\.email\s*\}\}/g, values.email)
            .replace(/\{\{\s*\$json\.offername\s*\}\}/g, values.offerName)
            .replace(/\{\{\s*\$json\.productname\s*\}\}/g, values.productName);
        return JSON.parse(replacedString);
    }

    function showStatus(message, type = 'info') {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        statusDiv.classList.remove('hidden');
    }

    function updatePayloadPreview(values) {
        const payload = replaceTemplateVariables(payloadTemplate, values);
        payloadDisplay.textContent = JSON.stringify(payload, null, 2);
    }

    async function sendWebhook(webhookUrl, payload) {
        const response = await fetch('/api/send-webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ webhookUrl, payload })
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to send webhook');
        }
        return {
            status: result.status,
            statusText: result.statusText,
            ok: result.success,
            responseBody: result.responseBody,
            responseHeaders: result.responseHeaders
        };
    }

    function displayResponse(result) {
        let formattedBody = result.responseBody || '';
        try {
            const parsed = JSON.parse(formattedBody);
            formattedBody = JSON.stringify(parsed, null, 2);
        } catch (e) {
            // Not JSON, keep as-is
        }

        const formattedHeaders = JSON.stringify(result.responseHeaders || {}, null, 2);

        lastResponseBody = formattedBody;
        lastResponseHeaders = formattedHeaders;

        responseBodyPre.textContent = formattedBody || '(empty response)';
        responseHeadersPre.textContent = formattedHeaders;
        responseSection.classList.remove('hidden');
    }

    function hideResponse() {
        responseSection.classList.add('hidden');
    }

    async function copyText(text, btn) {
        try {
            await navigator.clipboard.writeText(text);
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = 'Copy';
                btn.classList.remove('copied');
            }, 2000);
        } catch (err) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = 'Copy';
                btn.classList.remove('copied');
            }, 2000);
        }
    }

    // ===== TAB SWITCHING =====

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');

            if (tabId === 'receive') {
                startPolling();
            } else {
                stopPolling();
            }
        });
    });

    // ===== SEND WEBHOOK HANDLERS =====

    togglePayloadBtn.addEventListener('click', () => {
        const isHidden = payloadDisplay.classList.contains('hidden');
        payloadDisplay.classList.toggle('hidden');
        togglePayloadBtn.textContent = isHidden ? 'Hide Payload' : 'Show Payload';
    });

    form.addEventListener('input', () => {
        const formData = new FormData(form);
        const values = {
            name: formData.get('name') || '[NAME]',
            email: formData.get('email') || '[EMAIL]',
            offerName: formData.get('offerName') || '[OFFER_NAME]',
            productName: formData.get('productName') || '[PRODUCT_NAME]'
        };
        updatePayloadPreview(values);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const webhookUrl = formData.get('webhookUrl');
        const values = {
            name: formData.get('name'),
            email: formData.get('email'),
            offerName: formData.get('offerName'),
            productName: formData.get('productName')
        };

        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        showStatus('Sending webhook...', 'info');
        hideResponse();

        try {
            const payload = replaceTemplateVariables(payloadTemplate, values);
            const result = await sendWebhook(webhookUrl, payload);
            if (result.ok) {
                showStatus(`Webhook sent successfully! (${result.status} ${result.statusText})`, 'success');
            } else {
                showStatus(`Webhook failed: ${result.status} ${result.statusText}`, 'error');
            }
            displayResponse(result);
        } catch (error) {
            showStatus(`Error: ${error.message}`, 'error');
            hideResponse();
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Webhook';
        }
    });

    copyResponseBodyBtn.addEventListener('click', () => {
        copyText(lastResponseBody, copyResponseBodyBtn);
    });

    copyResponseHeadersBtn.addEventListener('click', () => {
        copyText(lastResponseHeaders, copyResponseHeadersBtn);
    });

    // ===== RECEIVE WEBHOOK HANDLERS =====

    function updateReceiverUrl() {
        receiverUrlInput.value = getWebhookUrl();
    }

    copyUrlBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(receiverUrlInput.value);
            copyUrlBtn.textContent = 'Copied!';
            setTimeout(() => { copyUrlBtn.textContent = 'Copy'; }, 2000);
        } catch (err) {
            receiverUrlInput.select();
            document.execCommand('copy');
            copyUrlBtn.textContent = 'Copied!';
            setTimeout(() => { copyUrlBtn.textContent = 'Copy'; }, 2000);
        }
    });

    newSessionBtn.addEventListener('click', () => {
        sessionId = generateSessionId();
        updateReceiverUrl();
        receivedWebhooks = [];
        renderWebhooks();
    });

    clearWebhooksBtn.addEventListener('click', () => {
        receivedWebhooks = [];
        renderWebhooks();
    });

    function renderWebhooks() {
        if (receivedWebhooks.length === 0) {
            webhooksList.innerHTML = `
                <div class="empty-state">
                    <p>No webhooks received yet</p>
                    <p class="hint">Send a POST request to your webhook URL to see it here</p>
                </div>
            `;
            return;
        }

        webhooksList.innerHTML = receivedWebhooks.map((webhook, index) => `
            <div class="webhook-item">
                <div class="webhook-header" onclick="toggleWebhookDetails(${index})">
                    <div class="webhook-info">
                        <span class="webhook-method">${webhook.method}</span>
                        <span class="webhook-time">${new Date(webhook.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <span class="webhook-expand" id="webhook-expand-${index}">+</span>
                </div>
                <div class="webhook-details" id="webhook-details-${index}">
                    <div class="webhook-section">
                        <div class="section-header">
                            <h4>Payload</h4>
                            <button class="copy-btn" onclick="event.stopPropagation(); copyToClipboard(${index}, 'payload', this)">Copy</button>
                        </div>
                        <pre id="payload-${index}">${JSON.stringify(webhook.payload, null, 2)}</pre>
                    </div>
                    <div class="webhook-section">
                        <div class="section-header">
                            <h4>Headers</h4>
                            <button class="copy-btn" onclick="event.stopPropagation(); copyToClipboard(${index}, 'headers', this)">Copy</button>
                        </div>
                        <pre id="headers-${index}">${JSON.stringify(webhook.headers, null, 2)}</pre>
                    </div>
                    ${Object.keys(webhook.queryParams || {}).length > 0 ? `
                        <div class="webhook-section">
                            <div class="section-header">
                                <h4>Query Parameters</h4>
                                <button class="copy-btn" onclick="event.stopPropagation(); copyToClipboard(${index}, 'query', this)">Copy</button>
                            </div>
                            <pre id="query-${index}">${JSON.stringify(webhook.queryParams, null, 2)}</pre>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    window.copyToClipboard = async function(index, type, btn) {
        const webhook = receivedWebhooks[index];
        let content;

        switch(type) {
            case 'payload':
                content = JSON.stringify(webhook.payload, null, 2);
                break;
            case 'headers':
                content = JSON.stringify(webhook.headers, null, 2);
                break;
            case 'query':
                content = JSON.stringify(webhook.queryParams, null, 2);
                break;
        }

        try {
            await navigator.clipboard.writeText(content);
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = 'Copy';
                btn.classList.remove('copied');
            }, 2000);
        } catch (err) {
            const textarea = document.createElement('textarea');
            textarea.value = content;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = 'Copy';
                btn.classList.remove('copied');
            }, 2000);
        }
    };

    window.toggleWebhookDetails = function(index) {
        const details = document.getElementById(`webhook-details-${index}`);
        const expandIcon = document.getElementById(`webhook-expand-${index}`);
        if (details) {
            details.classList.toggle('expanded');
            if (expandIcon) {
                expandIcon.textContent = details.classList.contains('expanded') ? '−' : '+';
            }
        }
    };

    async function pollForWebhooks() {
        if (!isPolling) return;

        try {
            pollingDot.classList.add('active');
            const response = await fetch(`/api/receive-webhook/${sessionId}`);
            const data = await response.json();

            if (data.webhooks && data.webhooks.length > 0) {
                receivedWebhooks = [...data.webhooks, ...receivedWebhooks].slice(0, 50);
                renderWebhooks();
            }

            pollingText.textContent = 'Listening for webhooks...';
        } catch (error) {
            pollingText.textContent = 'Connection error, retrying...';
        } finally {
            pollingDot.classList.remove('active');
        }
    }

    function startPolling() {
        if (pollingInterval) return;
        isPolling = true;
        pollingDot.classList.add('listening');
        pollForWebhooks();
        pollingInterval = setInterval(pollForWebhooks, 2000);
    }

    function stopPolling() {
        isPolling = false;
        pollingDot.classList.remove('listening');
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }

    // ===== INITIALIZATION =====

    updatePayloadPreview({
        name: '[NAME]',
        email: '[EMAIL]',
        offerName: '[OFFER_NAME]',
        productName: '[PRODUCT_NAME]'
    });

    updateReceiverUrl();
});
