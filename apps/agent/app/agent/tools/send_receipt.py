"""Tool contract and implementation: send_receipt."""

from typing import Any, Literal
import asyncpg
from pydantic import BaseModel, Field
from app.config import settings
from app.db.client import with_clinic, log_audit
from app.llm.base import ToolSpec

TOOL_NAME = "send_receipt"
TOOL_DESCRIPTION = "Issue and dispatch a payment receipt or invoice document link to a patient."

ConversationChannel = Literal["whatsapp", "voice", "instagram", "facebook", "google"]
FileKind = Literal["xray", "photo", "document", "receipt"]


class SendReceiptInput(BaseModel):
    """Input parameters for send_receipt tool."""

    patient_id: str = Field(..., description="UUID of the patient")
    invoice_id: str = Field(..., description="UUID or identifier of the invoice/receipt to dispatch")
    channel: ConversationChannel = Field(
        ...,
        description="Delivery channel (matches DB conversation_channel enum: whatsapp, voice, instagram, facebook, google)",
    )


class SendReceiptOutput(BaseModel):
    """Output results for send_receipt tool."""

    receipt_id: str
    file_kind: FileKind = "receipt"
    sent: bool = True
    delivery_channel: ConversationChannel
    message: str = "Receipt link dispatched to patient."


TOOL_SPEC = ToolSpec(
    name=TOOL_NAME,
    description=TOOL_DESCRIPTION,
    parameters=SendReceiptInput.model_json_schema(),
)


async def execute(input_data: SendReceiptInput, context: dict[str, Any]) -> SendReceiptOutput:
    """Verify invoice and receipt PDF in clinic scope, log outbox message, and record audit log."""
    clinic_id = context.get("clinic_id") or settings.default_clinic_id
    patient_phone = context.get("sender") or "+923001234500"

    async def _execute(conn: asyncpg.Connection) -> SendReceiptOutput:
        # 1. Verify invoice belongs to the patient and clinic
        invoice_row = await conn.fetchrow(
            """
            SELECT id, invoice_number, patient_id
            FROM invoices
            WHERE id = $1::uuid AND clinic_id = $2::uuid AND patient_id = $3::uuid
            LIMIT 1
            """,
            input_data.invoice_id,
            clinic_id,
            input_data.patient_id,
        )
        if not invoice_row:
            raise ValueError(
                f"Invoice '{input_data.invoice_id}' does not exist or does not belong to specified patient/clinic."
            )

        # 2. Verify receipt exists with storage_key
        receipt_row = await conn.fetchrow(
            """
            SELECT id, receipt_number, storage_key
            FROM receipts
            WHERE invoice_id = $1::uuid AND clinic_id = $2::uuid
            LIMIT 1
            """,
            input_data.invoice_id,
            clinic_id,
        )
        if not receipt_row or not receipt_row["storage_key"]:
            raise ValueError(
                f"Receipt with generated PDF storage key not found for invoice '{input_data.invoice_id}'."
            )

        receipt_id = str(receipt_row["id"])
        storage_key = receipt_row["storage_key"]

        # 3. Dispatch receipt link to dev_outbox (mock adapter)
        body = f"Receipt link: {storage_key}"
        await conn.execute(
            """
            INSERT INTO dev_outbox (
                id, channel, "from", "to", body, provider, direction, created_at
            ) VALUES (
                gen_random_uuid(), $1, 'system', $2, $3, 'mock', 'outbound', NOW()
            )
            """,
            input_data.channel,
            patient_phone,
            body,
        )

        # 4. Write immutable audit log
        await log_audit(
            conn=conn,
            clinic_id=clinic_id,
            action="receipt.dispatched",
            entity="receipt",
            entity_id=receipt_id,
            meta={
                "invoice_id": input_data.invoice_id,
                "channel": input_data.channel,
                "storage_key": storage_key,
            },
        )

        return SendReceiptOutput(
            receipt_id=receipt_id,
            file_kind="receipt",
            sent=True,
            delivery_channel=input_data.channel,
            message="Receipt link dispatched to patient.",
        )

    return await with_clinic(clinic_id, _execute)
